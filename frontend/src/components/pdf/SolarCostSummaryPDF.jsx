import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================
// SOLAR PROJECT COST SUMMARY - MODERN PROFESSIONAL PDF TEMPLATE
// Clean, minimal, and corporate design with teal/gold theme
// ============================================================

// Modern Color Palette
const THEME = {
  primary: [0, 128, 128],       // Teal - #008080
  primaryDark: [0, 102, 102],   // Dark Teal - #006666
  primaryLight: [0, 150, 136], // Light Teal
  accent: [218, 165, 32],       // Gold - #DAA520
  accentLight: [255, 215, 0],   // Light Gold
  white: [255, 255, 255],
  black: [0, 0, 0],
  gray: [97, 97, 97],
  lightGray: [250, 250, 250],
  mediumGray: [224, 224, 224],
  darkGray: [80, 80, 80],
  border: [200, 200, 200],
  text: [51, 51, 51],
};

// Default Company Data
const DEFAULT_COMPANY = {
  name: 'RAYZON GREEN PVT. LTD.',
  tagline: 'Best Value & Quality Solar Solution',
  address: '104 to 1117, 11th Floor, Millennium Business Hub-1',
  city: 'Opp. Sarthana Nature Park, Surat - 395006, Gujarat - India',
  phone: '+91 96380 00461 / 62',
  email: 'epc@rayzongreen.com',
  website: 'www.rayzongreen.com',
  gstin: '24AABCU9603R1ZX',
  logo: null, // Base64 logo string
};

// Currency formatter
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0.00';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ============================================================
// MAIN PDF GENERATOR FUNCTION
// ============================================================

export const generateSolarCostSummaryPDF = (data, companyData = DEFAULT_COMPANY) => {
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
    quotationNumber = 'QTN-001',
    quotationDate = new Date().toISOString().split('T')[0],
    customerName = 'Customer Name',
    customerAddress = 'Address not provided',
    projectName = 'Solar Project',
    systemCapacity = 5,
    projectType = 'Residential',
    installationType = 'Rooftop',
    items = [],
    equipmentCost = 174000,
    installationCost = 120,
    engineeringCost = 1300,
    transportationCost = 500,
    miscellaneousCost = 200,
    gstRate = 18,
  } = data;

  // Calculate totals
  const subtotal = equipmentCost + installationCost + engineeringCost + transportationCost + miscellaneousCost;
  const gstAmount = (subtotal * gstRate) / 100;
  const grandTotal = subtotal + gstAmount;

  // ============================================================
  // HEADER SECTION
  // ============================================================
  
  // Teal header bar
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Company name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(companyData.name, margin, 18);

  // Tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(companyData.tagline, margin, 26);

  // Contact info on right
  doc.setFontSize(8);
  const contactX = pageWidth - margin;
  doc.text(`${companyData.phone}`, contactX, 12, { align: 'right' });
  doc.text(companyData.email, contactX, 18, { align: 'right' });
  doc.text(`GSTIN: ${companyData.gstin}`, contactX, 24, { align: 'right' });

  // ============================================================
  // DOCUMENT INFO BOX (Right side)
  // ============================================================
  
  const docBoxWidth = 65;
  const docBoxX = pageWidth - margin - docBoxWidth;
  const docBoxY = 42;

  // White card with shadow effect
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(docBoxX, docBoxY, docBoxWidth, 32, 3, 3, 'FD');

  // Teal left accent bar
  doc.setFillColor(...C.primary);
  doc.roundedRect(docBoxX, docBoxY, 4, 32, 2, 2, 'F');

  // Document title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('QUOTATION', docBoxX + 10, docBoxY + 10);

  // Document number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text(`#${quotationNumber}`, docBoxX + 10, docBoxY + 18);

  // Date
  doc.setFontSize(8);
  doc.setTextColor(...C.gray);
  doc.text(`Date: ${quotationDate}`, docBoxX + 10, docBoxY + 26);

  // ============================================================
  // CUSTOMER DETAILS BOX (Left side)
  // ============================================================
  
  const custBoxWidth = 115;
  const custBoxY = 42;

  // Section title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('CUSTOMER DETAILS', margin, custBoxY - 3);

  // Customer card background
  doc.setFillColor(...C.lightGray);
  doc.setDrawColor(...C.border);
  doc.roundedRect(margin, custBoxY, custBoxWidth, 32, 2, 2, 'FD');

  // Customer name
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(customerName, margin + 5, custBoxY + 10);

  // Customer address
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.darkGray);
  doc.text(customerAddress, margin + 5, custBoxY + 18);

  // Project location
  doc.text(`Project: ${projectName}`, margin + 5, custBoxY + 26);

  // ============================================================
  // PROJECT DETAILS BAR
  // ============================================================
  
  const projY = 82;

  // Gray header bar
  doc.setFillColor(...C.lightGray);
  doc.rect(margin, projY, pageWidth - margin * 2, 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('PROJECT DETAILS', margin + 5, projY + 7);

  // Project info grid
  const projInfoY = projY + 18;
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.roundedRect(margin, projInfoY - 8, pageWidth - margin * 2, 22, 2, 2, 'FD');

  const col1X = margin + 8;
  const col2X = pageWidth / 2;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gray);
  doc.text('Project Type:', col1X, projInfoY);
  doc.text('System Capacity:', col2X, projInfoY);
  doc.text('Installation:', col1X, projInfoY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  doc.text(projectType, col1X + 30, projInfoY);
  doc.text(`${systemCapacity} kW`, col2X + 32, projInfoY);
  doc.text(installationType, col1X + 24, projInfoY + 8);

  // ============================================================
  // MAIN CONTENT AREA - Two Column Layout
  // ============================================================
  
  const contentY = 115;
  const leftColWidth = 115;
  const rightColWidth = 65;
  const gap = 8;

  // --- LEFT COLUMN: EQUIPMENT & MATERIALS ---
  
  // Section header - teal text on light background (matching image)
  doc.setFillColor(...C.lightGray);
  doc.rect(margin, contentY - 5, leftColWidth, 10, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('EQUIPMENT & MATERIALS', margin + 5, contentY + 1);

  // Equipment items
  const equipmentItems = items.length > 0 ? items : [
    { name: 'steel pipes', description: 'W e b e r a - A A A', quantity: 12, unitPrice: 14500 },
  ];

  const tableBody = equipmentItems.map((item) => [
    item.name || '',
    item.description || '',
    String(item.quantity || ''),
    `  ${formatCurrency(item.unitPrice || 0)}`,
    `  ${formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}`,
  ]);

  // Calculate total
  const itemsTotal = equipmentItems.reduce((sum, item) =>
    sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  // Add total row
  tableBody.push([
    '',
    '',
    '',
    '',
    `  ${formatCurrency(itemsTotal)}`,
  ]);

  // Render table with custom header (matching image)
  autoTable(doc, {
    startY: contentY + 8,
    head: [['Item', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 4,
      lineColor: C.border,
      lineWidth: 0.3,
      textColor: C.black,
      valign: 'middle',
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold', halign: 'left' },
      1: { cellWidth: 12, halign: 'left' },
      2: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: margin, right: pageWidth - margin - leftColWidth },
    tableWidth: leftColWidth,
    willDrawCell: function (data) {
      // Hide the default text for Description header - we'll draw it manually
      if (data.section === 'head' && data.column.index === 1) {
        data.cell.text = '';
      }
    },
    didDrawCell: function (data) {
      // Add vertical text for Description header only
      if (data.section === 'head' && data.column.index === 1) {
        const cell = data.cell;
        doc.setFillColor(...C.primary);
        doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
        doc.setTextColor(...C.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);

        // Draw vertical text letter by letter - D e s c r i p t i o n
        const label = 'Description';
        const startX = cell.x + cell.width / 2 + 0.5;
        const startY = cell.y + cell.height - 6;
        const letterSpacing = 3.5;
        label.split('').forEach((letter, i) => {
          doc.text(letter, startX, startY - i * letterSpacing, { align: 'center' });
        });
      }
    },
    didParseCell: function (data) {
      // Highlight total row
      if (data.section === 'body' && data.row.index === tableBody.length - 1) {
        data.cell.styles.fillColor = [250, 250, 250];
        data.cell.styles.fontStyle = 'bold';
      }
      // Lowercase styling for body cells (like in image)
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fontStyle = 'normal';
        data.cell.styles.fontSize = 8;
      }
    },
  });

  const tableEndY = doc.lastAutoTable.finalY;

  // --- RIGHT COLUMN: COST SUMMARY ---
  
  const summaryX = margin + leftColWidth + gap;
  const summaryY = contentY - 5;

  // Cost summary card - rounded teal header matching image
  const summaryHeaderHeight = 16;
  doc.setFillColor(...C.primary);
  doc.roundedRect(summaryX, summaryY, rightColWidth, summaryHeaderHeight, 4, 4, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('COST SUMMARY', summaryX + rightColWidth / 2, summaryY + 10, { align: 'center' });

  // Cost summary card body - white with border matching image
  const cardBodyY = summaryY + summaryHeaderHeight;
  const cardHeight = 100;

  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX, summaryY, rightColWidth, summaryHeaderHeight + cardHeight, 4, 4, 'S');

  // Cost items with proper spacing matching image
  const costItems = [
    { label: 'Equipment Cost:', value: equipmentCost },
    { label: 'Installation Cost:', value: installationCost },
    { label: 'Engineering Cost:', value: engineeringCost },
    { label: 'Transportation:', value: transportationCost },
    { label: 'Miscellaneous:', value: miscellaneousCost },
  ];

  let costRowY = cardBodyY + 12;

  costItems.forEach((cost) => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.darkGray);
    doc.text(cost.label, summaryX + 8, costRowY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.black);
    // Format with rupee symbol and proper spacing like in image
    doc.text(` ${formatCurrency(cost.value)}`, summaryX + rightColWidth - 8, costRowY, { align: 'right' });

    costRowY += 11;
  });

  // Divider line
  costRowY += 2;
  doc.setDrawColor(...C.border);
  doc.line(summaryX + 8, costRowY - 4, summaryX + rightColWidth - 8, costRowY - 4);
  costRowY += 4;

  // Subtotal
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('Subtotal:', summaryX + 8, costRowY);
  doc.text(` ${formatCurrency(subtotal)}`, summaryX + rightColWidth - 8, costRowY, { align: 'right' });
  costRowY += 10;

  // GST
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.darkGray);
  doc.text(`GST (${gstRate}%):`, summaryX + 8, costRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(` ${formatCurrency(gstAmount)}`, summaryX + rightColWidth - 8, costRowY, { align: 'right' });
  costRowY += 14;

  // Grand Total - Gold highlight with rounded corners
  const grandTotalY = costRowY - 2;
  const grandTotalHeight = 18;
  doc.setFillColor(...C.accent);
  doc.roundedRect(summaryX + 4, grandTotalY, rightColWidth - 8, grandTotalHeight, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('GRAND TOTAL:', summaryX + 10, grandTotalY + 11);

  doc.setFontSize(12);
  doc.text(` ${formatCurrency(grandTotal)}`, summaryX + rightColWidth - 10, grandTotalY + 11, { align: 'right' });

  // ============================================================
  // FOOTER
  // ============================================================
  
  const footerY = pageHeight - 20;

  // Teal footer bar
  doc.setFillColor(...C.primary);
  doc.rect(0, footerY, pageWidth, 20, 'F');

  // Footer text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.white);
  doc.text(
    `${companyData.name} | ${companyData.phone} | ${companyData.email} | ${companyData.website}`,
    pageWidth / 2,
    footerY + 8,
    { align: 'center' }
  );

  doc.setFontSize(7);
  doc.text('This quotation is valid for 30 days from the date of issue.', pageWidth / 2, footerY + 14, { align: 'center' });

  // Return as blob
  return doc.output('blob');
};

// ============================================================
// DOWNLOAD FUNCTION
// ============================================================

export const downloadSolarCostSummaryPDF = (data, filename = null, companyData = DEFAULT_COMPANY) => {
  const pdfBlob = generateSolarCostSummaryPDF(data, companyData);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(pdfBlob);
  link.download = filename || `Cost_Summary_${data.quotationNumber || Date.now()}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// ============================================================
// PRINT FUNCTION
// ============================================================

export const printSolarCostSummaryPDF = (data, companyData = DEFAULT_COMPANY) => {
  const pdfBlob = generateSolarCostSummaryPDF(data, companyData);
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, '_blank');
  printWindow?.addEventListener('load', () => {
    printWindow.print();
  });
};

// ============================================================
// REACT COMPONENT FOR PREVIEW
// ============================================================

const SolarCostSummaryPDF = ({ data, companyData, onDownload, onPrint }) => {
  const handleDownload = () => {
    const filename = `Cost_Summary_${data?.quotationNumber || 'QTN'}.pdf`;
    downloadSolarCostSummaryPDF(data, filename, companyData);
    onDownload?.();
  };

  const handlePrint = () => {
    printSolarCostSummaryPDF(data, companyData);
    onPrint?.();
  };

  return (
    <div className="solar-cost-summary-pdf">
      <div className="pdf-actions">
        <button onClick={handleDownload} className="btn-download">
          Download PDF
        </button>
        <button onClick={handlePrint} className="btn-print">
          Print
        </button>
      </div>
    </div>
  );
};

export default SolarCostSummaryPDF;
