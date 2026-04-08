import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  async generateQuotationPdf(data: any): Promise<Buffer> {
    try {
      const templatePath = path.join(process.cwd(), 'templates', 'quotation-template.html');
      const templateHtml = fs.readFileSync(templatePath, 'utf-8');
      
      // Register Handlebars helper for formatting numbers
      handlebars.registerHelper('formatNumber', function(number) {
        return Number(number || 0).toLocaleString('en-IN');
      });
      
      const template = handlebars.compile(templateHtml);
      const html = template(data);

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-remote-fonts',
          '--disable-clipboard',
          '--disable-floating-point-decimal',
        ],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      throw new InternalServerErrorException('Failed to generate PDF: ' + (error?.message || error));
    }
  }
}
