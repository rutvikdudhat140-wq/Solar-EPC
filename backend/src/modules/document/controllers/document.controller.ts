import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DocumentService } from '../services/document.service';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentDto, BulkActionDto, SendDocumentDto } from '../dto/document.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  @Get('dashboard/stats')
  async getDashboardStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.documentService.getDashboardStats(tenantId);
    } catch (error: any) {
      this.logger.error(`Get documents dashboard stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // TAB 1: Estimates, Proposals, Quotations
  // ============================================
  @Get('estimates-proposals-quotations')
  async getEstimatesProposalsQuotations(@Query() query: QueryDocumentDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] getEstimatesProposalsQuotations - tenantId: ${tenantId}`);
      const result = await this.documentService.findByTypes(
        ['estimate', 'proposal', 'quotation'],
        query,
        tenantId,
      );
      return { success: true, data: result.data, total: result.total };
    } catch (error: any) {
      this.logger.error(`Get estimates/proposals/quotations failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('estimates-proposals-quotations/stats')
  async getEstimatesProposalsQuotationsStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.documentService.getStatsByTypes(['estimate', 'proposal', 'quotation'], tenantId);
    } catch (error: any) {
      this.logger.error(`Get EPQ stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // TAB 2: Contracts
  // ============================================
  @Get('contracts')
  async getContracts(@Query() query: QueryDocumentDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] getContracts - tenantId: ${tenantId}`);
      const result = await this.documentService.findByTypes(['contract'], query, tenantId);
      return { success: true, data: result.data, total: result.total };
    } catch (error: any) {
      this.logger.error(`Get contracts failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('contracts/stats')
  async getContractsStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.documentService.getStatsByTypes(['contract'], tenantId);
    } catch (error: any) {
      this.logger.error(`Get contracts stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // TAB 3: Invoices
  // ============================================
  @Get('invoices')
  async getInvoices(@Query() query: QueryDocumentDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] getInvoices - tenantId: ${tenantId}`);
      const result = await this.documentService.findByTypes(['invoice'], query, tenantId);
      return { success: true, data: result.data, total: result.total };
    } catch (error: any) {
      this.logger.error(`Get invoices failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('invoices/stats')
  async getInvoicesStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.documentService.getStatsByTypes(['invoice'], tenantId);
    } catch (error: any) {
      this.logger.error(`Get invoices stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // TAB 4: All Documents
  // ============================================
  @Get('all')
  async getAllDocuments(@Query() query: QueryDocumentDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] getAllDocuments - tenantId: ${tenantId}`);
      const result = await this.documentService.findAll(query, tenantId);
      return { success: true, data: result.data, total: result.total };
    } catch (error: any) {
      this.logger.error(`Get all documents failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('all/stats')
  async getAllDocumentsStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.documentService.getStats(tenantId);
    } catch (error: any) {
      this.logger.error(`Get all documents stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // CRUD Operations
  // ============================================
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateDocumentDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] create document - tenantId: ${tenantId}`);
      const result = await this.documentService.create(createDto, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Create document failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.documentService.findOne(id, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Find document ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDocumentDto, @Request() req: any) {
    try {
      this.logger.log(`Updating document ${id} with data: ${JSON.stringify(updateDto)}`);
      const tenantId = req.tenant?.id;
      const result = await this.documentService.update(id, updateDto, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Update document ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      await this.documentService.remove(id, tenantId);
    } catch (error: any) {
      this.logger.error(`Remove document ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // Document Actions
  // ============================================
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  async send(@Param('id') id: string, @Body() sendDto: SendDocumentDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.documentService.send(id, sendDto, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Send document ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.documentService.duplicate(id, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Duplicate document ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/convert/:targetType')
  @HttpCode(HttpStatus.OK)
  async convert(
    @Param('id') id: string,
    @Param('targetType') targetType: string,
    @Request() req: any,
  ) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.documentService.convert(id, targetType, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Convert document ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // Bulk Actions
  // ============================================
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDto: BulkActionDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.documentService.bulkDelete(bulkDto.ids, tenantId);
    } catch (error: any) {
      this.logger.error(`Bulk delete failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('bulk/status/:status')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStatus(
    @Body() bulkDto: BulkActionDto,
    @Param('status') status: string,
    @Request() req: any,
  ) {
    try {
      const tenantId = req.tenant?.id;
      return await this.documentService.bulkUpdateStatus(bulkDto.ids, status, tenantId);
    } catch (error: any) {
      this.logger.error(`Bulk update status failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // Canvas Operations
  // ============================================
  @Post(':id/canvas')
  @HttpCode(HttpStatus.OK)
  async saveCanvas(
    @Param('id') id: string,
    @Body() canvasData: any,
    @Request() req: any,
  ) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.documentService.saveCanvas(id, canvasData, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Save canvas for document ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // Send with PDF
  // ============================================
  @Post(':id/send-pdf')
  @HttpCode(HttpStatus.OK)
  async sendWithPdf(
    @Param('id') id: string,
    @Body() body: { sendDto: SendDocumentDto; pdfBase64: string },
    @Request() req: any,
  ) {
    try {
      this.logger.log(`[sendWithPdf] Request received for document: ${id}`);
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[sendWithPdf] tenantId: ${tenantId}`);
      this.logger.log(`[sendWithPdf] sendDto: ${JSON.stringify(body.sendDto)}`);
      this.logger.log(`[sendWithPdf] pdfBase64 length: ${body.pdfBase64?.length}`);
      
      if (!body.pdfBase64) {
        throw new BadRequestException('PDF base64 is required');
      }
      
      // Convert base64 PDF to buffer
      const pdfBuffer = Buffer.from(body.pdfBase64, 'base64');
      this.logger.log(`[sendWithPdf] PDF buffer created, size: ${pdfBuffer.length}`);
      
      const result = await this.documentService.sendWithPdf(id, body.sendDto, pdfBuffer, tenantId);
      this.logger.log(`[sendWithPdf] Success! Document updated.`);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Send with PDF for document ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }
}
