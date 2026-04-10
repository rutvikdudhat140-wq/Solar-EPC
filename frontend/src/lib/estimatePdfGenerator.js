import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================
// PROFESSIONAL ESTIMATE PDF GENERATOR
// Clean Invoice Style Design - Matching Reference Template
// ============================================================

// Color Palette - Professional Invoice Style
const THEME = {
  headerBg: [71, 85, 105],       // Dark Slate Gray - #475569
  headerText: [255, 255, 255],   // White
  subHeaderBg: [100, 116, 139], // Lighter Slate
  text: [51, 51, 51],            // Dark text
  textLight: [100, 100, 100],    // Light text
  white: [255, 255, 255],
  border: [200, 200, 200],
  lightGray: [248, 249, 250],
  accent: [0, 128, 128],         // Teal for highlights
};

// Default Company Data
const DEFAULT_COMPANY = {
  name: 'SUNOVA ENERGY PVT. LTD.',
  address: '104 to 1117, 11th Floor, Millennium Business Hub-1',
  city: 'Opp. Sarthana Nature Park, Surat - 395006',
  state: 'Gujarat - India',
  phone: '+91 96380 00461',
  email: 'epc@sunovaenergy.com',
  website: 'www.sunovaenergy.com',
  gstin: '24AABCU9603R1ZX',
};

// Currency formatter
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0.00';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Format date - DD/MM/YYYY format
const formatDate = (dateString) => {
  if (!dateString) return new Date().toLocaleDateString('en-GB');
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ============================================================
// MAIN ESTIMATE PDF GENERATOR
// ============================================================

export const generateProfessionalEstimatePDF = (estimate, companyData = DEFAULT_COMPANY) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const C = THEME;

  // Extract data with defaults
  const {
    estimateNumber = 'EST-2026-0001',
    createdAt = new Date(),
    customerName = 'Customer Name',
    customerAddress = 'Address not provided',
    customerEmail = '',
    customerPhone = '',
    projectName = 'Solar Project',
    systemCapacity = 5,
    projectType = 'Residential',
    installationType = 'Rooftop',
    projectLocation = '',
    items = [],
    equipmentCost = 0,
    installationCost = 0,
    engineeringCost = 0,
    transportationCost = 0,
    miscellaneousCost = 0,
    subtotal = 0,
    discount = 0,
    discountType = 'percentage',
    gstRate = 18,
    gstAmount = 0,
    total = 0,
    status = 'draft',
    terms = '50% advance, 50% on completion. 5 year warranty on installation.',
    notes = '',
    validUntil = null,
  } = estimate;

  // Calculate derived values (using nullish coalescing to respect 0 values)
  const calculatedSubtotal = subtotal ?? (equipmentCost + installationCost + engineeringCost + transportationCost + miscellaneousCost);
  const calculatedGst = gstAmount ?? (calculatedSubtotal * gstRate / 100);
  const calculatedTotal = total ?? (calculatedSubtotal + calculatedGst);

  // Status colors
  const statusColors = {
    draft: [100, 116, 139],
    sent: [59, 130, 246],
    accepted: [34, 197, 94],
    rejected: [239, 68, 68],
    pending: [245, 158, 11],
  };
  const statusColor = statusColors[status] || C.gray;

  // ============================================================
  // HEADER - Dark Slate Professional Style
  // ============================================================

  // Dark header background
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Company name - Left side
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.headerText);
  doc.text(companyData.name, margin, 25);

  // ESTIMATE title - Right side
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('ESTIMATE', pageWidth - margin, 20, { align: 'right' });
  doc.setFontSize(8);
  doc.text('Tax Invoice', pageWidth - margin, 26, { align: 'right' });

  // Contact info under title - Right side
  doc.setFontSize(7);
  doc.text(`+${companyData.phone}`, pageWidth - margin, 32, { align: 'right' });
  doc.text(companyData.email, pageWidth - margin, 36, { align: 'right' });
  doc.text(companyData.website, pageWidth - margin, 40, { align: 'right' });

  // ============================================================
  // INFO BAR - Estimate No, Date, Valid Until
  // ============================================================

  const infoBarY = 50;
  doc.setFillColor(...C.subHeaderBg);
  doc.rect(0, infoBarY, pageWidth, 18, 'F');

  // Info columns
  const colWidth = pageWidth / 3;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.headerText);

  // Column 1: Estimate No
  doc.text('ESTIMATE NO.', margin, infoBarY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(estimateNumber, margin, infoBarY + 13);

  // Column 2: Issue Date
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUE DATE', margin + colWidth, infoBarY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(createdAt), margin + colWidth, infoBarY + 13);

  // Column 3: Valid Until
  doc.setFont('helvetica', 'bold');
  doc.text('VALID UNTIL', margin + colWidth * 2, infoBarY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(validUntil ? formatDate(validUntil) : formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), margin + colWidth * 2, infoBarY + 13);

  // ============================================================
  // FROM / TO SECTION - Clean Layout
  // ============================================================

  const fromToY = 75;

  // FROM (Company) Section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.textLight);
  doc.text('FROM', margin, fromToY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(companyData.name, margin, fromToY + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textLight);
  doc.text(companyData.address, margin, fromToY + 12);
  doc.text(`${companyData.city}, ${companyData.state}`, margin, fromToY + 17);
  doc.text(`GSTIN: ${companyData.gstin}`, margin, fromToY + 22);

  // TO (Customer) Section
  const toX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.textLight);
  doc.text('TO', toX, fromToY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(customerName, toX, fromToY + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textLight);
  if (customerAddress) {
    doc.text(customerAddress, toX, fromToY + 12);
  }
  if (projectLocation) {
    doc.text(`Location: ${projectLocation}`, toX, fromToY + 17);
  }
  if (customerEmail || customerPhone) {
    const contactInfo = customerEmail || customerPhone;
    doc.text(contactInfo, toX, fromToY + 22);
  }

  // Divider line
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.line(margin, fromToY + 30, pageWidth - margin, fromToY + 30);

  // ============================================================
  // ITEMS TABLE - Clean Professional Layout
  // ============================================================

  const tableY = 115;

  // Table headers - Clean style
  const tableHeaders = [['DESCRIPTION', 'QUANTITY', 'UNIT PRICE (₹)', 'AMOUNT (₹)']];

  // Table body
  const tableBody = items.length > 0
    ? items.map(item => [
        item.name || item.itemName || item.description || 'Item',
        String(item.quantity || '1'),
        formatCurrency(item.unitPrice || 0),
        formatCurrency((item.quantity || 0) * (item.unitPrice || 0)),
      ])
    : [['No items added', '', '', '0.00']];

  // Render clean table
  autoTable(doc, {
    startY: tableY,
    head: tableHeaders,
    body: tableBody,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      lineColor: C.border,
      lineWidth: 0.2,
      textColor: C.text,
      valign: 'middle',
    },
    headStyles: {
      fillColor: C.lightGray,
      textColor: C.text,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  const tableEndY = doc.lastAutoTable.finalY;

  // ============================================================
  // TOTALS SECTION
  // ============================================================

  const totalsY = tableEndY + 15;
  const totalsX = pageWidth - margin - 80;

  // Divider line above totals
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.line(totalsX, totalsY - 5, pageWidth - margin, totalsY - 5);

  // Subtotal
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text('Subtotal:', totalsX, totalsY);
  doc.text(`₹${formatCurrency(calculatedSubtotal)}`, pageWidth - margin, totalsY, { align: 'right' });

  // GST
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text(`GST (${gstRate}%):`, totalsX, totalsY + 10);
  doc.text(`₹${formatCurrency(calculatedGst)}`, pageWidth - margin, totalsY + 10, { align: 'right' });

  // Total line
  doc.setDrawColor(...C.text);
  doc.setLineWidth(0.8);
  doc.line(totalsX, totalsY + 18, pageWidth - margin, totalsY + 18);

  // Grand Total
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text('Total (INR):', totalsX, totalsY + 30);
  doc.text(`₹${formatCurrency(calculatedTotal)}`, pageWidth - margin, totalsY + 30, { align: 'right' });

  // ============================================================
  // TERMS & SIGNATURE SECTION
  // ============================================================

  let footerContentY = totalsY + 50;

  // Check if we need a new page
  if (footerContentY > pageHeight - 60) {
    doc.addPage();
    footerContentY = 30;
  }

  // Terms section - Simple text
  if (terms) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text('Terms & Conditions:', margin, footerContentY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textLight);
    const termLines = doc.splitTextToSize(terms, pageWidth - margin * 2);
    doc.text(termLines, margin, footerContentY + 5);

    footerContentY += 20;
  }

  // ============================================================
  // SIGNATURE SECTION
  // ============================================================

  const signY = pageHeight - 30;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  // Signature line for company
  doc.line(margin, signY, margin + 60, signY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textLight);
  doc.text('Issued by, signature:', margin, signY - 3);

  // Signature line for customer
  doc.line(pageWidth - margin - 60, signY, pageWidth - margin, signY);
  doc.text('Accepted by, signature:', pageWidth - margin - 60, signY - 3);

  // ============================================================
  // FOOTER
  // ============================================================

  const footerY = pageHeight - 10;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textLight);
  doc.text(
    `This estimate is valid for 30 days from date of issue | ${companyData.name} | ${companyData.phone} | ${companyData.email}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Return as blob
  return doc.output('blob');
};

// ============================================================
// DOWNLOAD & PRINT FUNCTIONS
// ============================================================

export const downloadProfessionalEstimatePDF = (estimate, filename = null, companyData = DEFAULT_COMPANY) => {
  const pdfBlob = generateProfessionalEstimatePDF(estimate, companyData);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(pdfBlob);
  link.download = filename || `Estimate_${estimate.estimateNumber || Date.now()}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const printProfessionalEstimatePDF = (estimate, companyData = DEFAULT_COMPANY) => {
  const pdfBlob = generateProfessionalEstimatePDF(estimate, companyData);
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, '_blank');
  printWindow?.addEventListener('load', () => {
    printWindow.print();
  });
};

export default {
  generateProfessionalEstimatePDF,
  downloadProfessionalEstimatePDF,
  printProfessionalEstimatePDF,
};
