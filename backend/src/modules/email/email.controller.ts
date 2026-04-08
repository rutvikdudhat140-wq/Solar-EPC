import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { EmailService } from './email.service';
import { PdfService } from '../quotation/services/pdf.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

interface SendEmailDto {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SendDocumentEmailDto {
  to: string;
  documentId: string;
  documentType: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  projectName?: string;
  projectLocation?: string;
  systemCapacity?: number;
  projectType?: string;
  installationType?: string;
  inverterType?: string;
  batteryOption?: string;
  items: Array<{
    name?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category?: string;
    unit?: string;
    brand?: string;
    model?: string;
  }>;
  subtotal?: number;
  gstAmount?: number;
  taxAmount?: number;
  total: number;
  gstRate?: number;
  taxRate?: number;
  installationCost?: number;
  engineeringCost?: number;
  transportationCost?: number;
  transportCost?: number;
  miscellaneousCost?: number;
  notes?: string;
  terms?: string;
  from?: string;
}

@Controller('email')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('test')
  async testEmail() {
    return this.emailService.testConnection();
  }

  @Post('send')
  async sendEmail(@Body() dto: SendEmailDto) {
    const result = await this.emailService.sendEmail(dto.to, dto.subject, dto.text, dto.html);
    return result;
  }

  @Post('send-document')
  async sendDocumentEmail(@Body() dto: SendDocumentEmailDto) {
    try {
      // Use provided totals or fallback to calculations
      const subtotal = dto.subtotal || dto.total;
      const taxRate = dto.gstRate || dto.taxRate || 18;
      const taxAmount = dto.gstAmount || dto.taxAmount || Math.round((subtotal) * taxRate / 100);
      const finalTotal = dto.total || (subtotal + taxAmount);

      // Calculate valid until date (30 days from now)
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 30);

      // Generate PDF from document data with ALL details
      const pdfData = {
        quotationId: dto.documentId,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        validUntil: validDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: dto.documentType === 'quotation' ? 'Quotation' : 'Estimate',
        customerName: dto.customerName || 'N/A',
        customerEmail: dto.customerEmail || '',
        customerPhone: dto.customerPhone || '',
        customerAddress: dto.customerAddress || '',
        projectName: dto.projectName || '',
        projectLocation: dto.projectLocation || '',
        systemCapacity: dto.systemCapacity || 0,
        projectType: dto.projectType || 'Residential',
        installationType: dto.installationType || 'Rooftop',
        materials: dto.items && dto.items.length > 0 ? dto.items.map(item => ({
          name: item.name || item.description || 'Item',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.total || (item.quantity * item.unitPrice),
          category: item.category || 'Solar Equipment',
          unit: item.unit || 'Piece',
          brand: item.brand || '',
          model: item.model || ''
        })) : [
          { name: 'Solar Panel 550W', quantity: 10, unitPrice: 14500, totalPrice: 145000, category: 'Solar Panel', unit: 'Piece' }
        ],
        materialTotal: subtotal,
        installationCost: dto.installationCost || 0,
        engineeringCost: dto.engineeringCost || 0,
        transportCost: dto.transportCost || dto.transportationCost || 0,
        miscellaneousCost: dto.miscellaneousCost || 0,
        gstPercentage: taxRate,
        tax: taxAmount,
        subtotal: subtotal,
        finalQuotationPrice: finalTotal,
        notes: dto.notes || '',
        terms: dto.terms || '',
        systemConfig: {
          systemSize: dto.systemCapacity || 5,
          panelCount: Math.ceil((dto.systemCapacity || 5) * 2) || 10,
          inverterType: dto.inverterType || 'String Inverter',
          batteryOption: dto.batteryOption || 'Grid-Tied (No Battery)',
          mountingStructure: dto.installationType === 'ground_mounted' ? 'Ground Mount' : 'Rooftop Mount',
          projectType: dto.projectType || 'Residential'
        }
      };

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateQuotationPdf(pdfData);

      // Send email with PDF attachment
      const subject = dto.documentType === 'quotation' 
        ? `Solar Quotation - ${dto.documentId}` 
        : `Solar Estimate - ${dto.documentId}`;
      
      const text = `Dear ${dto.customerName || 'Customer'},

Thank you for your interest in our solar solutions!

Please find attached your ${dto.documentType} for:
${dto.projectName ? `Project: ${dto.projectName}` : ''}
${dto.projectLocation ? `Location: ${dto.projectLocation}` : ''}
${dto.systemCapacity ? `System Capacity: ${dto.systemCapacity} kW` : ''}

Estimate Total: ₹${finalTotal.toLocaleString('en-IN')}
Validity: ${validDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

This estimate includes GST (${taxRate}%).

If you have any questions or would like to proceed, please don't hesitate to contact us.

Best regards,
Solar EPC Team`;

      const result = await this.emailService.sendEmail(
        dto.to,
        subject,
        text,
        undefined,
        [{
          filename: `${dto.documentType}_${dto.documentId}.pdf`,
          content: pdfBuffer,
        }],
        dto.from // Dynamic sender email
      );

      return {
        ...result,
        pdfGenerated: true,
        documentId: dto.documentId,
      };
    } catch (error: any) {
      console.error('Error sending document email:', error);
      return {
        success: false,
        message: `Failed to send document email: ${error?.message || 'Unknown error'}`,
        pdfGenerated: false,
      };
    }
  }
}
