import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../settings/guards/permission.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CommissioningService, UserContext } from '../services/commissioning.service';
import {
  CreateCommissioningDto,
  UpdateCommissioningDto,
  UpdateCommissioningStatusDto,
  UpdateCommissioningTasksDto,
  AddPhotoDto,
  QualityCheckDto,
  CustomerSignOffUpdateDto,
} from '../dto/commissioning.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    tenantId: string;
    dataScope: 'ALL' | 'ASSIGNED' | 'NONE';
    role: string;
  };
}

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'enacle-crm';

@Controller('commissionings')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class CommissioningController {
  constructor(private readonly commissioningService: CommissioningService) {}

  private getUserContext(req: AuthenticatedRequest): UserContext {
    const user = req.user as any;
    return {
      userId: user.userId,
      id: user.id,
      tenantId: user.tenantId,
      dataScope: user.dataScope,
      role: user.role,
    };
  }

  /**
   * Get all Commissionings
   */
  @Get()
  @RequirePermission('commissioning', 'view')
  async getCommissionings(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('technicianId') technicianId?: string,
    @Query('search') search?: string,
  ) {
    return this.commissioningService.getCommissionings(this.getUserContext(req), {
      status,
      projectId,
      technicianId,
      search,
    });
  }

  /**
   * Get Commissioning statistics
   */
  @Get('statistics')
  @RequirePermission('commissioning', 'view')
  async getStatistics(@Request() req: AuthenticatedRequest) {
    return this.commissioningService.getStatistics(this.getUserContext(req));
  }

  /**
   * Get Commissioning stats (alias for statistics - used by dashboard)
   */
  @Get('stats')
  @RequirePermission('commissioning', 'view')
  async getStats(@Request() req: AuthenticatedRequest) {
    return this.commissioningService.getStatistics(this.getUserContext(req));
  }

  /**
   * Get single Commissioning by ID
   */
  @Get(':id')
  @RequirePermission('commissioning', 'view')
  async getCommissioningById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commissioningService.getCommissioningById(id, this.getUserContext(req));
  }

  /**
   * Get Commissioning by project ID
   */
  @Get('by-project/:projectId')
  @RequirePermission('commissioning', 'view')
  async getCommissioningByProjectId(
    @Param('projectId') projectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commissioningService.getCommissioningByProjectId(projectId, this.getUserContext(req));
  }

  /**
   * Create new Commissioning
   */
  @Post()
  @RequirePermission('commissioning', 'create')
  async createCommissioning(
    @Body() createDto: CreateCommissioningDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commissioningService.createCommissioning(createDto, this.getUserContext(req));
  }

  /**
   * Update Commissioning
   */
  @Patch(':id')
  @RequirePermission('commissioning', 'edit')
  async updateCommissioning(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommissioningDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commissioningService.updateCommissioning(id, updateDto, this.getUserContext(req));
  }

  /**
   * Update Commissioning status
   * Technicians can update status even without edit permission
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateCommissioningStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Check if user is technician or employee - allow status update even without edit permission
    const user = req.user as any;
    const userId = user.id || user.userId;
    const role = user.role?.toLowerCase();
    
    const isTechnicianOrEmployee = role === 'technician' || 
                                   role === 'employee' ||
                                   role === 'admin' ||
                                   user.dataScope === 'ALL' ||
                                   user.dataScope === 'ASSIGNED' ||
                                   await this.commissioningService.isAssignedTechnician(id, userId);
    
    if (!isTechnicianOrEmployee && !user.can?.('Commissioning', 'edit')) {
      throw new ForbiddenException('Permission denied');
    }
    
    return this.commissioningService.updateStatus(id, statusDto, this.getUserContext(req));
  }

  /**
   * Update Commissioning tasks
   * Technicians can update tasks even without edit permission
   */
  @Patch(':id/tasks')
  async updateTasks(
    @Param('id') id: string,
    @Body() tasksDto: UpdateCommissioningTasksDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Check if user is technician or employee - allow tasks update even without edit permission
    const user = req.user as any;
    const userId = user.id || user.userId; // Support both formats
    const role = user.role?.toLowerCase();
    
    const isTechnicianOrEmployee = role === 'technician' || 
                                   role === 'employee' ||
                                   role === 'admin' || // Explicitly allow admin
                                   user.dataScope === 'ALL' || // Allow if has broad data scope
                                   user.dataScope === 'ASSIGNED' ||
                                   await this.commissioningService.isAssignedTechnician(id, userId);
    
    // Fallback: If not explicitly allowed above, check broad permission
    if (!isTechnicianOrEmployee && !user.can?.('Commissioning', 'edit')) {
      throw new ForbiddenException('Permission denied');
    }
    
    return this.commissioningService.updateTasks(id, tasksDto, this.getUserContext(req));
  }

  /**
   * Add photo to Commissioning
   */
  @Post(':id/photos')
  @RequirePermission('commissioning', 'edit')
  async addPhoto(
    @Param('id') id: string,
    @Body() photoDto: AddPhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commissioningService.addPhoto(id, photoDto, this.getUserContext(req));
  }

  /**
   * Update quality check
   */
  @Patch(':id/quality-check')
  @RequirePermission('commissioning', 'edit')
  async updateQualityCheck(
    @Param('id') id: string,
    @Body() qualityDto: QualityCheckDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commissioningService.updateQualityCheck(id, qualityDto, this.getUserContext(req));
  }

  /**
   * Update customer sign-off
   */
  @Patch(':id/customer-signoff')
  @RequirePermission('commissioning', 'edit')
  async updateCustomerSignOff(
    @Param('id') id: string,
    @Body() signOffDto: CustomerSignOffUpdateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commissioningService.updateCustomerSignOff(id, signOffDto, this.getUserContext(req));
  }

  /**
   * Delete Commissioning (soft delete)
   */
  @Delete(':id')
  @RequirePermission('commissioning', 'delete')
  async deleteCommissioning(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.commissioningService.deleteCommissioning(id, this.getUserContext(req));
    return { message: 'Commissioning deleted successfully' };
  }

  /**
   * Get timeline events for a single Commissioning
   */
  @Get(':id/timeline')
  @RequirePermission('commissioning', 'view')
  async getTimeline(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commissioningService.getTimeline(id, this.getUserContext(req));
  }

  /**
   * Calendar view events across Commissionings
   * Accepts query params: from,to,technicianId,projectId,status
   */
  @Get('calendar')
  @RequirePermission('commissioning', 'view')
  async getCalendar(
    @Request() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('technicianId') technicianId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.commissioningService.getCalendarEvents(this.getUserContext(req), {
      from,
      to,
      technicianId,
      projectId,
      status,
    });
  }

  /**
   * Upload photos for Commissioning tasks
   */
  @Post('upload/task-photos')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('commissioning', 'edit')
  async uploadTaskPhotos(@Request() req: any, @Body() body: any) {
    // Check if image data is provided (base64 encoded)
    const imageData = body?.image;
    
    if (!imageData) {
      throw new BadRequestException('No image data found. Please send image as base64 string in "image" field');
    }

    // Get task info from body fields
    const taskName = body?.taskName || 'general';
    const commissioningId = body?.commissioningId || body?.CommissioningId;

    // Validate and decode base64 image
    let base64Data: string;
    let fileMimetype: string;
    
    try {
      // Remove data URL prefix if present
      base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      
      // Determine mime type from base64 header or default to jpeg
      if (imageData.startsWith('data:image/png')) {
        fileMimetype = 'image/png';
      } else if (imageData.startsWith('data:image/webp')) {
        fileMimetype = 'image/webp';
      } else {
        fileMimetype = 'image/jpeg';
      }
    } catch (error) {
      throw new BadRequestException('Invalid base64 image format');
    }
    
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Validate mime type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimes.includes(fileMimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    // Upload to S3
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = fileMimetype === 'image/png' ? '.png' : fileMimetype === 'image/webp' ? '.webp' : '.jpg';
    const key = `Commissionings/${commissioningId || 'unknown'}/${taskName}-${uniqueSuffix}${ext}`;

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: fileMimetype,
      }));
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      throw new BadRequestException('Failed to upload image to S3');
    }

    const photoUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${key}`;
    console.log('Generated S3 URL:', photoUrl);
    console.log('Bucket:', BUCKET_NAME, 'Region:', process.env.AWS_REGION || 'ap-southeast-2');

    // Save photo reference to database
    const userContext = this.getUserContext(req);
    const updatedCommissioning = await this.commissioningService.addPhoto(
      commissioningId,
      {
        url: photoUrl,
        key: key,
        caption: `Photo for task: ${taskName}`,
        category: 'during',
      },
      userContext,
    );

    return {
      success: true,
      urls: [photoUrl],
      taskName,
      commissioningId,
      photoCount: updatedCommissioning.photos?.length || 1,
    };
  }

  /**
   * Delete photo from Commissioning
   * Removes photo reference and unchecks associated task if photoRequired
   */
  @Delete(':id/photos/:photoKey')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('commissioning', 'edit')
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoKey') photoKey: string,
    @Request() req: any,
  ) {
    const userContext = this.getUserContext(req);
    
    // Decode photoKey from URL-safe format
    const decodedKey = decodeURIComponent(photoKey);
    
    // Get Commissioning to find task name from photo
    const commissioning = await this.commissioningService.getCommissioningById(id, userContext);
    const photo = commissioning.photos?.find(p => p.key === decodedKey) as any;
    
    console.log('DEBUG - Photo found:', photo ? 'YES' : 'NO');
    console.log('DEBUG - Photo caption:', photo?.caption);
    console.log('DEBUG - Photo keys:', commissioning.photos?.map((p: any) => p.key));
    console.log('DEBUG - Looking for key:', decodedKey);
    
    const taskName = photo?.taskName || photo?.caption?.replace('Photo for task: ', '') || null;
    console.log('DEBUG - Extracted taskName:', taskName);
    
    // Delete photo from database
    const updated = await this.commissioningService.removePhoto(id, decodedKey, userContext);
    
    // If photo was associated with a task, uncheck that task
    let taskUnchecked = false;
    console.log('DEBUG - Commissioning tasks:', commissioning.tasks?.map((t: any) => ({ name: t.name, done: t.done })));
    if (taskName && commissioning.tasks) {
      const taskIndex = commissioning.tasks.findIndex(t => t.name === taskName && t.done);
      console.log('DEBUG - Task index found:', taskIndex);
      if (taskIndex >= 0) {
        // Task found and is done, uncheck it
        const updatedTasks = commissioning.tasks.map((t: any, idx) => 
          idx === taskIndex ? { ...t, done: false } : t
        );
        
        await this.commissioningService.updateTasks(id, { tasks: updatedTasks as any }, userContext);
        taskUnchecked = true;
        console.log('DEBUG - Task unchecked successfully');
      }
    }
    
    return {
      success: true,
      photoCount: updated.photos?.length || 0,
      taskUnchecked,
      taskName,
    };
  }

  /**
   * Check overdue Commissionings and mark as Delayed
   * Automatically runs to find Commissionings past due date
   */
  @Post('check-overdue')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('commissioning', 'edit')
  async checkOverdue(@Request() req: any) {
    return this.commissioningService.checkOverdueCommissionings(this.getUserContext(req));
  }

  /**
   * Assign Commissioning to a user
   * Updates assignedTo and tracks who made the assignment (assignedBy)
   */
  @Patch(':id/assign')
  @RequirePermission('commissioning', 'edit')
  async assignCommissioning(
    @Param('id') id: string,
    @Body() body: { assignedTo: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.commissioningService.assignCommissioning(
      id,
      body.assignedTo,
      this.getUserContext(req),
    );
    return {
      success: true,
      message: 'Commissioning assigned successfully',
      data: result,
    };
  }
}
