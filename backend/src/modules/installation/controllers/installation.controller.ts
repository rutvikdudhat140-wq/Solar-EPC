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
import { InstallationService, UserContext } from '../services/installation.service';
import {
  CreateInstallationDto,
  UpdateInstallationDto,
  UpdateInstallationStatusDto,
  UpdateInstallationTasksDto,
  AddPhotoDto,
  QualityCheckDto,
  CustomerSignOffUpdateDto,
} from '../dto/installation.dto';

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

@Controller('installations')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class InstallationController {
  constructor(private readonly installationService: InstallationService) {}

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
   * Get all installations
   */
  @Get()
  @RequirePermission('installation', 'view')
  async getInstallations(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('technicianId') technicianId?: string,
    @Query('search') search?: string,
  ) {
    return this.installationService.getInstallations(this.getUserContext(req), {
      status,
      projectId,
      technicianId,
      search,
    });
  }

  /**
   * Get installation statistics
   */
  @Get('statistics')
  @RequirePermission('installation', 'view')
  async getStatistics(@Request() req: AuthenticatedRequest) {
    return this.installationService.getStatistics(this.getUserContext(req));
  }

  /**
   * Get installation stats (alias for statistics - used by dashboard)
   */
  @Get('stats')
  @RequirePermission('installation', 'view')
  async getStats(@Request() req: AuthenticatedRequest) {
    return this.installationService.getStatistics(this.getUserContext(req));
  }

  /**
   * Get single installation by ID
   */
  @Get(':id')
  @RequirePermission('installation', 'view')
  async getInstallationById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.getInstallationById(id, this.getUserContext(req));
  }

  /**
   * Get installation by project ID
   */
  @Get('by-project/:projectId')
  @RequirePermission('installation', 'view')
  async getInstallationByProjectId(
    @Param('projectId') projectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.getInstallationByProjectId(projectId, this.getUserContext(req));
  }

  /**
   * Create new installation
   */
  @Post()
  @RequirePermission('installation', 'create')
  async createInstallation(
    @Body() createDto: CreateInstallationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.createInstallation(createDto, this.getUserContext(req));
  }

  /**
   * Update installation
   */
  @Patch(':id')
  @RequirePermission('installation', 'edit')
  async updateInstallation(
    @Param('id') id: string,
    @Body() updateDto: UpdateInstallationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.updateInstallation(id, updateDto, this.getUserContext(req));
  }

  /**
   * Update installation status
   * Technicians can update status even without edit permission
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateInstallationStatusDto,
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
                                   await this.installationService.isAssignedTechnician(id, userId);
    
    if (!isTechnicianOrEmployee && !user.can?.('installation', 'edit')) {
      throw new ForbiddenException('Permission denied');
    }
    
    return this.installationService.updateStatus(id, statusDto, this.getUserContext(req));
  }

  /**
   * Update installation tasks
   * Technicians can update tasks even without edit permission
   */
  @Patch(':id/tasks')
  async updateTasks(
    @Param('id') id: string,
    @Body() tasksDto: UpdateInstallationTasksDto,
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
                                   await this.installationService.isAssignedTechnician(id, userId);
    
    // Fallback: If not explicitly allowed above, check broad permission
    if (!isTechnicianOrEmployee && !user.can?.('installation', 'edit')) {
      throw new ForbiddenException('Permission denied');
    }
    
    return this.installationService.updateTasks(id, tasksDto, this.getUserContext(req));
  }

  /**
   * Add photo to installation
   */
  @Post(':id/photos')
  @RequirePermission('installation', 'edit')
  async addPhoto(
    @Param('id') id: string,
    @Body() photoDto: AddPhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.addPhoto(id, photoDto, this.getUserContext(req));
  }

  /**
   * Update quality check
   */
  @Patch(':id/quality-check')
  @RequirePermission('installation', 'edit')
  async updateQualityCheck(
    @Param('id') id: string,
    @Body() qualityDto: QualityCheckDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.updateQualityCheck(id, qualityDto, this.getUserContext(req));
  }

  /**
   * Update customer sign-off
   */
  @Patch(':id/customer-signoff')
  @RequirePermission('installation', 'edit')
  async updateCustomerSignOff(
    @Param('id') id: string,
    @Body() signOffDto: CustomerSignOffUpdateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.updateCustomerSignOff(id, signOffDto, this.getUserContext(req));
  }

  /**
   * Delete installation (soft delete)
   */
  @Delete(':id')
  @RequirePermission('installation', 'delete')
  async deleteInstallation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.installationService.deleteInstallation(id, this.getUserContext(req));
    return { message: 'Installation deleted successfully' };
  }

  /**
   * Get timeline events for a single installation
   */
  @Get(':id/timeline')
  @RequirePermission('installation', 'view')
  async getTimeline(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.getTimeline(id, this.getUserContext(req));
  }

  /**
   * Calendar view events across installations
   * Accepts query params: from,to,technicianId,projectId,status
   */
  @Get('calendar')
  @RequirePermission('installation', 'view')
  async getCalendar(
    @Request() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('technicianId') technicianId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.installationService.getCalendarEvents(this.getUserContext(req), {
      from,
      to,
      technicianId,
      projectId,
      status,
    });
  }

  /**
   * Upload photos for installation tasks
   */
  @Post('upload/task-photos')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('installation', 'edit')
  async uploadTaskPhotos(@Request() req: any, @Body() body: any) {
    // Check if image data is provided (base64 encoded)
    const imageData = body?.image;
    
    if (!imageData) {
      throw new BadRequestException('No image data found. Please send image as base64 string in "image" field');
    }

    // Get task info from body fields
    const taskName = body?.taskName || 'general';
    const installationId = body?.installationId;

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
    const key = `installations/${installationId || 'unknown'}/${taskName}-${uniqueSuffix}${ext}`;

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
    const updatedInstallation = await this.installationService.addPhoto(
      installationId,
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
      installationId,
      photoCount: updatedInstallation.photos?.length || 1,
    };
  }

  /**
   * Delete photo from installation
   * Removes photo reference and unchecks associated task if photoRequired
   */
  @Delete(':id/photos')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('installation', 'edit')
  async deletePhoto(
    @Param('id') id: string,
    @Query('photoKey') photoKey: string,
    @Request() req: any,
  ) {
    if (!photoKey) {
      throw new BadRequestException('photoKey query parameter is required');
    }
    const userContext = this.getUserContext(req);
    
    // photoKey from query is automatically decoded by NestJS/Express
    const decodedKey = photoKey;
    
    // Get installation to find task name from photo
    const installation = await this.installationService.getInstallationById(id, userContext);
    const photo = installation.photos?.find(p => p.key === decodedKey) as any;
    
    console.log('DEBUG - Photo found:', photo ? 'YES' : 'NO');
    console.log('DEBUG - Photo caption:', photo?.caption);
    console.log('DEBUG - Photo keys:', installation.photos?.map(p => p.key));
    console.log('DEBUG - Looking for key:', decodedKey);
    
    const taskName = photo?.taskName || photo?.caption?.replace('Photo for task: ', '') || null;
    console.log('DEBUG - Extracted taskName:', taskName);
    
    // Delete photo from database
    const updated = await this.installationService.removePhoto(id, decodedKey, userContext);
    
    // If photo was associated with a task, uncheck that task
    let taskUnchecked = false;
    console.log('DEBUG - Installation tasks:', installation.tasks?.map(t => ({ name: t.name, done: t.done })));
    if (taskName && installation.tasks) {
      const taskIndex = installation.tasks.findIndex(t => t.name === taskName && t.done);
      console.log('DEBUG - Task index found:', taskIndex);
      if (taskIndex >= 0) {
        // Task found and is done, uncheck it
        const updatedTasks = installation.tasks.map((t, idx) => 
          idx === taskIndex ? { ...t, done: false } : t
        );
        
        await this.installationService.updateTasks(id, { tasks: updatedTasks as any }, userContext);
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
   * Check overdue installations and mark as Delayed
   * Automatically runs to find installations past due date
   */
  @Post('check-overdue')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('installation', 'edit')
  async checkOverdue(@Request() req: any) {
    return this.installationService.checkOverdueInstallations(this.getUserContext(req));
  }
}
