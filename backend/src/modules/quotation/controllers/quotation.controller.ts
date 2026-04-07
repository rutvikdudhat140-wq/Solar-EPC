import { Controller, Get, Post, Put, Body, Param, UseGuards, Req, Res } from '@nestjs/common';
import { QuotationService } from '../services/quotation.service';
import { CreateQuotationDto, UpdateQuotationDto } from '../dto/quotation.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    tenantId: string;
    [key: string]: any;
  };
}

@Controller('quotations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  create(@Body() createDto: CreateQuotationDto, @Req() req: RequestWithUser) {
    return this.quotationService.create(createDto, req.user.id, req.user.tenantId);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.quotationService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.quotationService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateQuotationDto, @Req() req: RequestWithUser) {
    return this.quotationService.update(id, updateDto, req.user.id, req.user.tenantId);
  }

  @Post(':id/send')
  send(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.quotationService.send(id, req.user.id, req.user.tenantId);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Req() req: RequestWithUser, @Res() res: any) {
    const pdfBuffer = await this.quotationService.generatePdf(id, req.user.tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Quotation_${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Post(':id/email')
  async sendEmail(
    @Param('id') id: string, 
    @Body('email') email: string,
    @Body('subject') subject: string,
    @Body('message') message: string,
    @Req() req: RequestWithUser
  ) {
    return this.quotationService.sendEmail(id, email, subject, message, req.user.tenantId);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.quotationService.approve(id, req.user.id, req.user.tenantId);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string, @Req() req: RequestWithUser) {
    return this.quotationService.reject(id, req.user.id, req.user.tenantId, reason);
  }

  @Post(':id/convert-project')
  convertToProject(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.quotationService.convertToProject(id, req.user.id, req.user.tenantId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.quotationService.getHistory(id, req.user.tenantId);
  }

  @Get('stats')
  getStats(@Req() req: RequestWithUser) {
    return this.quotationService.getStats(req.user.tenantId);
  }
}
