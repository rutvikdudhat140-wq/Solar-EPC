import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Request,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { TicketsService } from '../services/tickets.service';
import { AmcContractsService } from '../services/amc-contracts.service';
import { VisitsService } from '../services/visits.service';
import { CreateTicketDto, UpdateTicketDto, QueryTicketDto } from '../dto/ticket.dto';
import { CreateAmcContractDto, UpdateAmcContractDto, QueryAmcContractDto } from '../dto/amc-contract.dto';
import { CreateVisitDto, UpdateVisitDto, QueryVisitDto } from '../dto/visit.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { RequirePermission } from '../../../modules/settings/decorators/permissions.decorator';

@Controller('service-amc')
export class ServiceAmcController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly amcContractsService: AmcContractsService,
    private readonly visitsService: VisitsService,
  ) {}

  // ============ TICKETS ============
  @Get('tickets')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  findAllTickets(@Query() query: QueryTicketDto, @Request() req: any) {
    try {
      const user = req?.user;
      const tenantId = req.tenant?.id;
      return this.ticketsService.findAll(query, tenantId, user);
    } catch (error: any) {
      console.error('Error finding all tickets:', error.message, error.stack);
      throw error;
    }
  }

  @Get('tickets/stats')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  getTicketStats(@Request() req: any) {
    try {
      const user = req?.user;
      const tenantId = req.tenant?.id;
      return this.ticketsService.getDashboardStats(tenantId, user);
    } catch (error: any) {
      console.error('Error getting ticket stats:', error.message, error.stack);
      throw error;
    }
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  findOneTicket(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return this.ticketsService.findOne(id, tenantId);
    } catch (error: any) {
      console.error('Error finding one ticket:', error.message, error.stack);
      throw error;
    }
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  async createTicket(@Body() createDto: CreateTicketDto, @Request() req: any) {
    try {
      console.log('POST /tickets received:', createDto);
      const user = req?.user;
      const tenantId = req.tenant?.id;
      const result = await this.ticketsService.create(createDto, tenantId, user);
      console.log('Ticket created, returning:', result);
      return result;
    } catch (error: any) {
      console.error('Error creating ticket:', error.message, error.stack);
      throw error;
    }
  }

  @Patch('tickets/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  async updateTicket(@Param('id') id: string, @Body() updateDto: UpdateTicketDto, @Request() req: any) {
    try {
      console.log('PATCH /tickets/' + id, 'body:', updateDto);
      const tenantId = req.tenant?.id;
      const result = await this.ticketsService.update(id, updateDto, tenantId);
      console.log('PATCH success:', result);
      return result;
    } catch (error: any) {
      console.error('Error updating ticket:', error.message, error.stack);
      throw error;
    }
  }

  @Delete('tickets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  removeTicket(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return this.ticketsService.remove(id, tenantId);
    } catch (error: any) {
      console.error('Error removing ticket:', error.message, error.stack);
      throw error;
    }
  }

  @Get('engineers')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  getEngineers(@Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.ticketsService.getEngineers(tenantId);
  }

  @Get('customers')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  getCustomersFromProjects(@Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.amcContractsService.getCustomersFromProjects(tenantId);
  }

  // ============ AMC CONTRACTS ============
  @Get('contracts')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  findAllContracts(@Query() query: QueryAmcContractDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.amcContractsService.findAll(query, tenantId);
  }

  @Get('contracts/stats')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  getContractStats(@Request() req: any) {
    const tenantId = req.tenant?.id;
    console.log('DEBUG - contracts/stats endpoint, tenantId:', tenantId);
    return this.amcContractsService.getStats(tenantId);
  }

  @Get('contracts/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  findOneContract(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.amcContractsService.findOne(id, tenantId);
  }

  @Post('contracts')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  createContract(@Body() createDto: CreateAmcContractDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.amcContractsService.create(createDto, tenantId);
  }

  @Patch('contracts/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  async updateContract(@Param('id') id: string, @Body() updateDto: UpdateAmcContractDto, @Request() req: any) {
    try {
      console.log('Controller: Updating contract', id, 'with data:', updateDto);
      const tenantId = req.tenant?.id;
      const result = await this.amcContractsService.update(id, updateDto, tenantId);
      console.log('Controller: Update successful');
      return result;
    } catch (error: any) {
      console.error('Controller: Update error:', error.message);
      console.error('Controller: Error stack:', error.stack);
      throw error;
    }
  }

  @Delete('contracts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  removeContract(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.amcContractsService.remove(id, tenantId);
  }

  @Post('contracts/auto-generate')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  async autoGenerateContracts(@Request() req: any) {
    try {
      console.log('POST /contracts/auto-generate called');
      const tenantId = req.tenant?.id;
      const result = await this.amcContractsService.autoGenerateFromProjects(tenantId);
      console.log('Auto-generated contracts:', result.created);
      return result;
    } catch (error: any) {
      console.error('Error auto-generating contracts:', error.message, error.stack);
      throw error;
    }
  }

  @Post('contracts/remove-duplicates')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  async removeDuplicateContracts() {
    try {
      console.log('POST /contracts/remove-duplicates called');
      const result = await this.amcContractsService.forceRemoveDuplicates();
      console.log('Removed duplicates:', result.deleted, 'Remaining:', result.remaining);
      return result;
    } catch (error: any) {
      console.error('Error removing duplicates:', error.message, error.stack);
      throw error;
    }
  }

  // ============ AI INSIGHT ============
  @Get('ai-insight')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  getAiInsight() {
    return {
      insight: 'No critical issues detected. All systems operational.',
      recommendations: [
        'Schedule preventive maintenance for high-priority systems',
        'Review AMC contracts expiring in next 30 days',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  // ============ VISITS ============
  @Get('visits')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  findAllVisits(@Query() query: QueryVisitDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.visitsService.findAll(query, tenantId, user);
  }

  @Get('visits/stats')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  getVisitStats(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    console.log('DEBUG - visits/stats endpoint, tenantId:', tenantId);
    return this.visitsService.getStats(tenantId, user);
  }

  @Get('visits/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  findOneVisit(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.visitsService.findOne(id, tenantId);
  }

  @Post('visits')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  async createVisit(@Body() createDto: CreateVisitDto, @Request() req: any) {
    try {
      // Validate required fields
      if (!createDto.contract_id || !createDto.scheduled_date || !createDto.scheduled_time || !createDto.engineer_id) {
        return {
          success: false,
          message: 'Missing required fields: contract_id, scheduled_date, scheduled_time, engineer_id'
        };
      }
      const tenantId = req.tenant?.id;
      const visit = await this.visitsService.create(createDto, tenantId);
      return {
        success: true,
        message: 'Visit Scheduled Successfully',
        data: visit
      };
    } catch (error: any) {
      console.error('Error creating visit:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to schedule visit'
      };
    }
  }

  @Patch('visits/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  updateVisit(@Param('id') id: string, @Body() updateDto: UpdateVisitDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.visitsService.update(id, updateDto, tenantId);
  }

  @Delete('visits/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  removeVisit(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.visitsService.remove(id, tenantId);
  }

  // ============ STATS ============
  @Get('stats')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  async getStats(
    @Request() req: any,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    try {
      const user = req?.user;
      const tenantId = headerTenantId || req.tenant?.id;
      console.log('[Service Stats] tenantId:', tenantId);
      
      const [ticketStats, contracts, visits] = await Promise.all([
        this.ticketsService.getDashboardStats(tenantId, user),
        this.amcContractsService.findAll({}, tenantId),
        this.visitsService.findAll({}, tenantId),
      ]);
      
      return {
        success: true,
        data: {
          ...ticketStats,
          totalContracts: contracts.total,
          totalVisits: visits.total,
        },
      };
    } catch (error: any) {
      console.error('Error getting service-amc stats:', error.message, error.stack);
      throw error;
    }
  }
}
