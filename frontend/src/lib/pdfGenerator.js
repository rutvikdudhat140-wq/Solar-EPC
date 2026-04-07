import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Default PDF Header Configuration - Can be overridden via API
export const DEFAULT_PDF_HEADER_CONFIG = {
  // Colors (RGB arrays)
  colors: {
    primary: [0, 128, 128],      // Teal - Header background
    accent: [218, 165, 32],      // Gold - Accent line
    text: [51, 51, 51],          // Dark text
    lightText: [220, 220, 220],  // Light text for dark backgrounds
    border: [200, 200, 200],     // Border color
    white: [255, 255, 255]       // White
  },

  // Header Layout
  header: {
    height: 45,
    accentLineHeight: 3,
    showLogo: true,
    logoPosition: { x: 15, y: 8, size: 12 }
  },

  // Document Box (right side)
  documentBox: {
    show: true,
    width: 65,
    height: 40,
    position: { x: -80, y: 55 }, // x is offset from pageWidth
    borderRadius: 3,
    leftBorderWidth: 4
  },

  // Text Content - All customizable
  text: {
    documentType: 'ESTIMATE',     // Can be: PROPOSAL, QUOTATION, INVOICE, etc.
    documentLabel: 'ESTIMATE',    // Label shown in document box
    validDaysText: 'Valid: 30 days',
    dateLabel: 'Date:',
    documentNumberPrefix: '#'
  },

  // Fonts
  fonts: {
    companyName: { size: 20, style: 'bold', color: 'white' },
    tagline: { size: 9, style: 'italic', color: 'light' },
    contact: { size: 8, style: 'normal', color: 'light' },
    documentType: { size: 14, style: 'bold', color: 'primary' },
    documentNumber: { size: 9, style: 'normal', color: 'text' },
    date: { size: 8, style: 'normal', color: 'gray' }
  },

  // Dynamic Fields - Can add/remove fields
  // Format: { key: 'fieldName', label: 'Display Label', value: 'dataKey', position: 'header|documentBox|custom' }
  dynamicFields: [
    // Header fields (shown in teal header bar)
    { key: 'phone', label: '', value: 'phone', position: 'header', format: '{{phone}} | {{tollfree}}' },
    { key: 'email', label: '', value: 'email', position: 'header' },
    { key: 'website', label: '', value: 'website', position: 'header' },
    { key: 'gstin', label: 'GSTIN:', value: 'gstin', position: 'header' },

    // Document box fields
    { key: 'documentNumber', label: '', value: 'documentNumber', position: 'documentBox', prefix: '#' },
    { key: 'date', label: 'Date:', value: 'date', position: 'documentBox' },
    { key: 'validity', label: 'Valid:', value: 'validDays', position: 'documentBox', suffix: ' days' }
  ],

  // Positions (relative coordinates)
  positions: {
    companyName: { x: 32, y: 18 },
    tagline: { x: 32, y: 26 },
    contactInfo: {
      x: -15, // Negative = from right edge
      y: 15,
      lineHeight: 7
    }
  }
};

// Sunvora Energy - Company Data
const SUNVORA_COMPANY = {
  name: 'Sunvora Energy Pvt. Ltd.',
  tagline: 'Best Value & Quality Solar Solution',
  subTagline: 'Shaping a Better Future',
  address: '104 to 1117, 11th Floor, Millennium Business Hub-1',
  city: 'Opp. Sarthana Nature Park, Surat - 395006, Gujarat - India',
  phone: '+91 96380 00461',
  phone2: '+91 96380 00462',
  tollfree: '1800 123 1232',
  email: 'epc@sunvoraenergy.com',
  website: 'www.sunvoraenergy.com',
  gstin: '24AABCU9603R1ZX',
  manufacturing: {
    name: 'Sunvora Solar Pvt. Ltd.',
    address: 'Block No. 105, B/H Aron Pipes B/H Hariya Talav, Karanj Kim - Mandavi Road',
    city: 'Gujarat 394110',
    email: 'contact@sunvoraenergies.com',
    website: 'www.sunvorasolar.com'
  }
};

/**
 * Generate a professional PDF estimate
 * @param {Object} estimate - The estimate data
 * @param {Object} company - Company details (optional)
 * @param {Object} headerConfig - Custom header configuration (optional)
 * @returns {Blob} PDF blob
 */
export const generateEstimatePDF = (estimate, company = SUNVORA_COMPANY, headerConfig = {}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Merge default config with custom config
  const config = {
    ...DEFAULT_PDF_HEADER_CONFIG,
    ...headerConfig,
    colors: { ...DEFAULT_PDF_HEADER_CONFIG.colors, ...(headerConfig.colors || {}) },
    text: { ...DEFAULT_PDF_HEADER_CONFIG.text, ...(headerConfig.text || {}) },
    fonts: { ...DEFAULT_PDF_HEADER_CONFIG.fonts, ...(headerConfig.fonts || {}) },
    header: { ...DEFAULT_PDF_HEADER_CONFIG.header, ...(headerConfig.header || {}) },
    documentBox: { ...DEFAULT_PDF_HEADER_CONFIG.documentBox, ...(headerConfig.documentBox || {}) }
  };

  // Extract colors for easier access
  const primaryColor = config.colors.primary;
  const accentColor = config.colors.accent;
  const textColor = config.colors.text;
  const lightGray = [248, 249, 250];
  const borderColor = config.colors.border;

  let y = 10;

  // === CUSTOMIZABLE HEADER ===
  // Header background bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, config.header.height, 'F');

  // Accent line
  doc.setFillColor(...accentColor);
  doc.rect(0, config.header.height, pageWidth, config.header.accentLineHeight, 'F');

  // Logo Area (if enabled)
  if (config.header.showLogo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(
      config.header.logoPosition.x,
      config.header.logoPosition.y,
      config.header.logoPosition.size,
      config.header.logoPosition.size,
      2, 2, 'F'
    );
    doc.setFillColor(...primaryColor);
    doc.circle(
      config.header.logoPosition.x + config.header.logoPosition.size / 2,
      config.header.logoPosition.y + config.header.logoPosition.size / 2,
      config.header.logoPosition.size / 3, 'F'
    );
  }

  // Company Name
  doc.setFontSize(config.fonts.companyName.size);
  doc.setFont('helvetica', config.fonts.companyName.style);
  doc.setTextColor(255, 255, 255);
  doc.text(company.name, config.positions.companyName.x, config.positions.companyName.y);

  // Tagline
  doc.setFontSize(config.fonts.tagline.size);
  doc.setFont('helvetica', config.fonts.tagline.style);
  doc.setTextColor(220, 220, 220);
  doc.text(company.tagline || '', config.positions.tagline.x, config.positions.tagline.y);

  // Contact info on right side of header
  doc.setFontSize(config.fonts.contact.size);
  doc.setFont('helvetica', config.fonts.contact.style);
  doc.setTextColor(230, 230, 230);

  // Dynamic contact fields
  let contactY = config.positions.contactInfo.y;
  const contactX = pageWidth + config.positions.contactInfo.x;

  config.dynamicFields
    .filter(field => field.position === 'header')
    .forEach(field => {
      let text = '';
      if (field.format) {
        text = field.format
          .replace('{{phone}}', company.phone || '')
          .replace('{{tollfree}}', company.tollfree || '');
      } else {
        text = `${field.label} ${company[field.value] || ''}`.trim();
      }
      if (text) {
        doc.text(text, contactX, contactY, { align: 'right' });
        contactY += config.positions.contactInfo.lineHeight;
      }
    });

  // Document Title Box (if enabled)
  if (config.documentBox.show) {
    const boxX = pageWidth + config.documentBox.position.x;
    const boxY = config.documentBox.position.y;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(boxX, boxY, config.documentBox.width, config.documentBox.height,
      config.documentBox.borderRadius, config.documentBox.borderRadius, 'FD');

    // Left border on document box
    doc.setFillColor(...primaryColor);
    doc.roundedRect(boxX, boxY, config.documentBox.leftBorderWidth,
      config.documentBox.height, 2, 2, 'F');

    // Document type label
    doc.setFontSize(config.fonts.documentType.size);
    doc.setFont('helvetica', config.fonts.documentType.style);
    doc.setTextColor(...primaryColor);
    doc.text(config.text.documentLabel, boxX + 10, boxY + 10);

    // Dynamic document box fields
    let docBoxY = boxY + 18;
    config.dynamicFields
      .filter(field => field.position === 'documentBox')
      .forEach(field => {
        doc.setFontSize(config.fonts.documentNumber.size);
        doc.setTextColor(...textColor);

        let value = '';
        if (field.value === 'documentNumber') {
          value = estimate.estimateNumber || '';
        } else if (field.value === 'date') {
          value = new Date(estimate.createdAt || Date.now()).toLocaleDateString('en-IN');
        } else if (field.value === 'validDays') {
          value = '30';
        }

        const prefix = field.prefix || '';
        const suffix = field.suffix || '';
        const text = `${field.label} ${prefix}${value}${suffix}`.trim();

        doc.text(text, boxX + 10, docBoxY);
        docBoxY += 7;
      });
  }

  y = 100;

  // === CUSTOMER INFO SECTION ===
  // Gray header bar
  doc.setFillColor(...lightGray);
  doc.rect(15, y - 8, pageWidth - 30, 10, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('CUSTOMER DETAILS', 18, y - 1);

  y += 12;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(15, y - 5, pageWidth - 30, 35, 2, 2, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text(estimate.customerName, 20, y + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let customerY = y + 12;
  if (estimate.companyName) {
    doc.text(estimate.companyName, 20, customerY);
    customerY += 6;
  }
  if (estimate.customerAddress) {
    doc.text(estimate.customerAddress, 20, customerY);
    customerY += 6;
  }
  doc.text(`Project Location: ${estimate.projectLocation}`, 20, customerY);

  y += 45;

  // === PROJECT DETAILS ===
  doc.setFillColor(...lightGray);
  doc.rect(15, y - 8, pageWidth - 30, 10, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('PROJECT DETAILS', 18, y - 1);

  y += 8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(15, y - 5, pageWidth - 30, 22, 2, 2, 'FD');

  // Two column layout for project details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);

  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Project Name:', leftCol, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(estimate.projectName || '', leftCol + 35, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.text('System Capacity:', rightCol, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(`${estimate.systemCapacity} kW`, rightCol + 35, y + 4);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Project Type:', leftCol, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(estimate.projectType?.charAt(0).toUpperCase() + estimate.projectType?.slice(1) || '', leftCol + 35, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Installation:', rightCol, y + 12);
  doc.setFont('helvetica', 'normal');
  const installType = estimate.installationType?.replace('_', ' ');
  doc.text(installType?.charAt(0).toUpperCase() + installType?.slice(1) || '', rightCol + 35, y + 12);

  if (estimate.projectDescription) {
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', leftCol, y + 20);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(estimate.projectDescription, pageWidth - 80);
    doc.text(descLines, leftCol + 35, y + 20);
  }

  y += 28;

  // === EQUIPMENT TABLE (Left Side - 65% width) ===
  doc.setFillColor(...lightGray);
  doc.rect(15, y - 8, pageWidth - 120, 10, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('EQUIPMENT & MATERIALS', 18, y - 1);

  y += 5;

  // Table headers with better column configuration
  const headers = [['Item', 'Description', 'Qty', 'Unit Price', 'Total']];

  // Table data with better formatting and text wrapping
  const data = estimate.items?.map(item => [
    item.name || '',
    `${item.brand || ''} ${item.model || ''}${item.description ? ' - ' + item.description : ''}`.trim(),
    item.quantity?.toString() || '0',
    `₹ ${item.unitPrice?.toLocaleString('en-IN') || '0'}`,
    `₹ ${item.total?.toLocaleString('en-IN') || '0'}`
  ]) || [];

  autoTable(doc, {
    startY: y,
    head: headers,
    body: data,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      lineColor: borderColor,
      lineWidth: 0.5,
      minCellHeight: 10,
      halign: 'left',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', minCellHeight: 10, halign: 'left' },
      1: { cellWidth: 'auto', minCellHeight: 10, halign: 'left' },
      2: { cellWidth: 14, halign: 'center', minCellHeight: 10 },
      3: { cellWidth: 28, halign: 'right', minCellHeight: 10 },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold', minCellHeight: 10 }
    },
    margin: { left: 15, right: 95 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didParseCell: function (data) {
      // Add text wrapping for description column
      if (data.section === 'body' && data.column.index === 1) {
        const text = data.cell.raw;
        const splitText = doc.splitTextToSize(text, 50);
        data.cell.styles.minCellHeight = splitText.length * 4 + 6;
      }
    },
    didDrawCell: function (data) {
      // Ensure proper text alignment in cells
      if (data.section === 'head') {
        data.cell.styles.halign = 'center';
      }
    }
  });

  // Get the final Y position after table
  const tableEndY = doc.lastAutoTable.finalY + 10;

  // === COST SUMMARY (Right Side - 35% width) ===
  // Position cost summary on the right side, aligned with the table start
  const summaryX = pageWidth - 90;
  const summaryWidth = 75;
  const summaryY = y; // Align with table start

  // Box header
  doc.setFillColor(...primaryColor);
  doc.roundedRect(summaryX, summaryY, summaryWidth, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('COST SUMMARY', summaryX + summaryWidth / 2, summaryY + 8, { align: 'center' });

  // Box body
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(summaryX, summaryY + 12, summaryWidth, 85, 2, 2, 'FD');

  const costs = [
    { label: 'Equipment Cost:', value: estimate.equipmentCost || 0 },
    { label: 'Installation Cost:', value: estimate.installationCost || 0 },
    { label: 'Engineering Cost:', value: estimate.engineeringCost || 0 },
    { label: 'Transportation:', value: estimate.transportationCost || 0 },
    { label: 'Miscellaneous:', value: estimate.miscellaneousCost || 0 },
  ];

  let costY = summaryY + 20;
  costs.forEach(cost => {
    if (cost.value > 0) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(cost.label, summaryX + 6, costY);

      doc.setTextColor(...textColor);
      doc.text(`₹${cost.value?.toLocaleString('en-IN')}`, summaryX + summaryWidth - 6, costY, { align: 'right' });
      costY += 8;
    }
  });

  // Subtotal line
  costY += 3;
  doc.setDrawColor(...borderColor);
  doc.line(summaryX + 5, costY - 3, summaryX + summaryWidth - 5, costY - 3);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Subtotal:', summaryX + 6, costY + 4);
  doc.text(`₹${estimate.subtotal?.toLocaleString('en-IN')}`, summaryX + summaryWidth - 6, costY + 4, { align: 'right' });

  // GST
  costY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`GST (${estimate.gstRate || 18}%):`, summaryX + 8, costY);
  doc.setTextColor(...textColor);
  doc.text(`₹${estimate.gstAmount?.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, costY, { align: 'right' });

  // Grand Total - Highlighted
  costY += 10;
  doc.setFillColor(...accentColor);
  doc.roundedRect(summaryX + 3, costY - 5, summaryWidth - 6, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('GRAND TOTAL:', summaryX + 8, costY + 3);
  doc.setFontSize(11);
  doc.text(`₹${estimate.total?.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, costY + 3, { align: 'right' });

  y += 100;

  // === TERMS & CONDITIONS ===
  if (y > pageHeight - 70) {
    doc.addPage();
    y = 25;
  }

  // Section header
  doc.setFillColor(...lightGray);
  doc.rect(15, y - 8, pageWidth - 30, 10, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TERMS & CONDITIONS', 18, y - 1);

  y += 5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(15, y - 5, pageWidth - 30, 25, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const terms = estimate.terms || '50% advance, 50% on completion. 5 year warranty on installation.';
  const termLines = doc.splitTextToSize(terms, pageWidth - 40);
  doc.text(termLines, 20, y + 3);

  y += 35;

  // === NOTES ===
  if (estimate.notes) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 25;
    }

    doc.setFillColor(...lightGray);
    doc.rect(15, y - 8, pageWidth - 30, 10, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('NOTES', 18, y - 1);

    y += 5;
    doc.setFillColor(255, 251, 240); // Light amber background
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(15, y - 5, pageWidth - 30, 20, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 53, 15);
    const noteLines = doc.splitTextToSize(estimate.notes, pageWidth - 40);
    doc.text(noteLines, 20, y + 3);

    y += 28;
  }

  // === AUTHORIZATION ===
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 25;
  }

  doc.setDrawColor(...borderColor);
  doc.line(20, y, 70, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Authorized Signature', 20, y + 5);
  doc.text('For Sunvora Energy Pvt. Ltd.', 20, y + 10);

  doc.line(pageWidth - 70, y, pageWidth - 20, y);
  doc.text('Customer Acceptance', pageWidth - 70, y + 5);
  doc.text('Date & Stamp', pageWidth - 70, y + 10);

  // === FOOTER ===
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(
    `This estimate is valid for 30 days from date of issue. | Sunvora Energy Pvt. Ltd. | ${company.phone} | ${company.email}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  // Return as blob
  return doc.output('blob');
};

/**
 * Download estimate PDF
 * @param {Object} estimate - The estimate data
 * @param {Object} company - Company details (optional)
 */
export const downloadEstimatePDF = (estimate, company) => {
  const blob = generateEstimatePDF(estimate, company);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Estimate_${estimate.estimateNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Print estimate
 * @param {Object} estimate - The estimate data
 * @param {Object} company - Company details (optional)
 */
export const printEstimate = (estimate, company) => {
  const blob = generateEstimatePDF(estimate, company);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  printWindow?.addEventListener('load', () => {
    printWindow.print();
  });
};

let surveyReportDownloadQueue = Promise.resolve();

export const generateSurveyReportPDF = (survey) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const primaryColor = [15, 23, 42];
  const borderColor = [226, 232, 240];
  const textColor = [15, 23, 42];
  const mutedColor = [100, 116, 139];

  const activeData = survey?.activeData || {};
  const completeData = survey?.completeData || {};

  const safeText = (v, fallback = '—') => {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s ? s : fallback;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const safeCapacity = (() => {
    const val = (survey?.projectCapacity ?? '').toString().trim();
    if (!val) return '—';
    return val.toLowerCase().includes('kw') ? val : `${val} kWp`;
  })();

  const normalizeDrawing = (d) => {
    if (!d || typeof d !== 'object') return null;
    return {
      lines: Array.isArray(d.lines) ? d.lines : [],
      rects: Array.isArray(d.rects) ? d.rects : [],
      circles: Array.isArray(d.circles) ? d.circles : [],
      freehand: Array.isArray(d.freehand) ? d.freehand : [],
      dimensions: Array.isArray(d.dimensions) ? d.dimensions : [],
      textLabels: Array.isArray(d.textLabels) ? d.textLabels : [],
    };
  };

  const getDrawingBounds = (drawingData) => {
    const allPoints = [];

    drawingData.lines.forEach((l) => {
      if (typeof l?.startX === 'number' && typeof l?.startY === 'number') allPoints.push({ x: l.startX, y: l.startY });
      if (typeof l?.endX === 'number' && typeof l?.endY === 'number') allPoints.push({ x: l.endX, y: l.endY });
    });

    drawingData.rects.forEach((r) => {
      if (typeof r?.x === 'number' && typeof r?.y === 'number') allPoints.push({ x: r.x, y: r.y });
      if (typeof r?.x2 === 'number' && typeof r?.y2 === 'number') allPoints.push({ x: r.x2, y: r.y2 });
    });

    drawingData.circles.forEach((c) => {
      if (typeof c?.cx === 'number' && typeof c?.cy === 'number') allPoints.push({ x: c.cx, y: c.cy });
      if (typeof c?.r === 'number' && typeof c?.cx === 'number' && typeof c?.cy === 'number') {
        allPoints.push({ x: c.cx + c.r, y: c.cy + c.r });
        allPoints.push({ x: c.cx - c.r, y: c.cy - c.r });
      }
    });

    drawingData.freehand.forEach((stroke) => {
      if (Array.isArray(stroke?.points)) {
        stroke.points.forEach((p) => {
          if (typeof p?.x === 'number' && typeof p?.y === 'number') allPoints.push({ x: p.x, y: p.y });
        });
      }
    });

    drawingData.textLabels.forEach((t) => {
      if (typeof t?.x === 'number' && typeof t?.y === 'number') allPoints.push({ x: t.x, y: t.y });
    });

    if (allPoints.length === 0) return null;

    const minX = Math.min(...allPoints.map((p) => p.x));
    const minY = Math.min(...allPoints.map((p) => p.y));
    const maxX = Math.max(...allPoints.map((p) => p.x));
    const maxY = Math.max(...allPoints.map((p) => p.y));

    return { minX, minY, maxX, maxY };
  };

  const safeHexToRgb = (hex) => {
    if (typeof hex !== 'string') return null;
    const h = hex.trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(h);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const setStrokeColor = (color, fallback = [37, 99, 235]) => {
    const rgb = safeHexToRgb(color);
    if (rgb) {
      doc.setDrawColor(...rgb);
      return;
    }
    doc.setDrawColor(...fallback);
  };

  const setTextFillColor = (color, fallback = [15, 23, 42]) => {
    const rgb = safeHexToRgb(color);
    if (rgb) {
      doc.setTextColor(...rgb);
      return;
    }
    doc.setTextColor(...fallback);
  };

  const renderDrawingToPdf = (drawingData, boxX, boxY, boxW, boxH) => {
    const bounds = getDrawingBounds(drawingData);
    if (!bounds) return false;

    const pad = 20;
    const minX = bounds.minX - pad;
    const minY = bounds.minY - pad;
    const srcW = (bounds.maxX - bounds.minX) + pad * 2;
    const srcH = (bounds.maxY - bounds.minY) + pad * 2;
    const safeSrcW = Math.max(1, srcW);
    const safeSrcH = Math.max(1, srcH);

    const scale = Math.min(boxW / safeSrcW, boxH / safeSrcH);

    const tx = boxX + (boxW - safeSrcW * scale) / 2;
    const ty = boxY + (boxH - safeSrcH * scale) / 2;

    const mapX = (x) => tx + (x - minX) * scale;
    const mapY = (y) => ty + (y - minY) * scale;

    doc.setDrawColor(...borderColor);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'FD');

    drawingData.lines.forEach((l) => {
      if (typeof l?.startX !== 'number' || typeof l?.startY !== 'number' || typeof l?.endX !== 'number' || typeof l?.endY !== 'number') return;
      setStrokeColor(l?.color);
      doc.setLineWidth(Math.max(0.15, Math.min(1.2, ((l?.strokeWidth || 2) * scale) / 2)));
      doc.line(mapX(l.startX), mapY(l.startY), mapX(l.endX), mapY(l.endY));
    });

    drawingData.rects.forEach((r) => {
      if (typeof r?.x !== 'number' || typeof r?.y !== 'number') return;
      const x2 = (typeof r?.x2 === 'number') ? r.x2 : r.x;
      const y2 = (typeof r?.y2 === 'number') ? r.y2 : r.y;
      const x = Math.min(r.x, x2);
      const y = Math.min(r.y, y2);
      const w = Math.abs(x2 - r.x);
      const h = Math.abs(y2 - r.y);
      setStrokeColor(r?.color);
      doc.setLineWidth(Math.max(0.15, Math.min(1.2, ((r?.strokeWidth || 2) * scale) / 2)));
      doc.rect(mapX(x), mapY(y), w * scale, h * scale);
    });

    drawingData.circles.forEach((c) => {
      if (typeof c?.cx !== 'number' || typeof c?.cy !== 'number' || typeof c?.r !== 'number') return;
      setStrokeColor(c?.color);
      doc.setLineWidth(Math.max(0.15, Math.min(1.2, ((c?.strokeWidth || 2) * scale) / 2)));
      doc.circle(mapX(c.cx), mapY(c.cy), Math.max(0.2, c.r * scale));
    });

    const downsamplePoints = (points, maxPoints = 1200) => {
      if (!Array.isArray(points) || points.length <= maxPoints) return points;
      const step = Math.ceil(points.length / maxPoints);
      const out = [];
      for (let i = 0; i < points.length; i += step) out.push(points[i]);
      if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
      return out;
    };

    drawingData.freehand.forEach((stroke) => {
      const pts = downsamplePoints(Array.isArray(stroke?.points) ? stroke.points : []);
      if (pts.length < 2) return;
      setStrokeColor(stroke?.color);
      doc.setLineWidth(Math.max(0.15, Math.min(1.0, ((stroke?.strokeWidth || 2) * scale) / 2)));
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        if (typeof p0?.x !== 'number' || typeof p0?.y !== 'number' || typeof p1?.x !== 'number' || typeof p1?.y !== 'number') continue;
        doc.line(mapX(p0.x), mapY(p0.y), mapX(p1.x), mapY(p1.y));
      }
    });

    drawingData.textLabels.forEach((t) => {
      if (typeof t?.x !== 'number' || typeof t?.y !== 'number') return;
      const txt = safeText(t?.text, '');
      if (!txt) return;
      setTextFillColor(t?.color);
      doc.setFont('helvetica', 'normal');
      const fontSize = typeof t?.fontSize === 'number' ? t.fontSize : 12;
      doc.setFontSize(Math.max(6, Math.min(16, fontSize * Math.max(0.35, scale))));
      doc.text(txt, mapX(t.x), mapY(t.y));
      doc.setTextColor(...textColor);
    });

    return true;
  };

  const addFooter = (pageNumber) => {
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text('Generated by Solar EPC', 15, pageHeight - 8);
    doc.text(String(pageNumber), pageWidth - 15, pageHeight - 8, { align: 'right' });
  };

  const addSectionTitle = (title, y) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(15, y - 6, pageWidth - 30, 10, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    doc.text(title, 19, y);
    return y + 10;
  };

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Site Survey Report', 15, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Survey ID: ${safeText(survey?.surveyId, '')}`, 15, 23);
  doc.text(`Report Date: ${formatDate(completeData?.completionDate || survey?.updatedAt || survey?.createdAt)}`, pageWidth - 15, 23, { align: 'right' });

  let y = 42;
  y = addSectionTitle('Customer & Project', y);

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, lineColor: borderColor, lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
    margin: { left: 15, right: 15 },
    body: [
      ['Customer', safeText(survey?.clientName)],
      ['City', safeText(survey?.city)],
      ['Capacity', safeCapacity],
      ['Floors', safeText(survey?.floors)],
      ['Engineer', safeText(survey?.engineer)],
      ['Survey Date', formatDate(activeData?.scheduledDate || survey?.createdAt)],
    ],
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;
  y = addSectionTitle('Pre-Sales Site Assessment', y);

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, lineColor: borderColor, lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
    margin: { left: 15, right: 15 },
    body: [
      ['Roof Type', safeText(survey?.roofType ? String(survey.roofType).replaceAll('_', ' ') : '')],
      ['Structure Type', safeText(survey?.structureType ? String(survey.structureType).replaceAll('_', ' ') : '')],
      ['Structure Height', safeText(survey?.structureHeight ? `${survey.structureHeight}${survey?.customHeight ? ` (${survey.customHeight})` : ''}` : '')],
      ['Module Type', safeText(survey?.moduleType)],
      ['Solar Consultant', safeText(survey?.solarConsultant)],
    ],
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;

  if (y > pageHeight - 55) {
    addFooter(doc.internal.getNumberOfPages());
    doc.addPage();
    y = 20;
  }

  y = addSectionTitle('Survey Completion', y);

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, lineColor: borderColor, lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
    margin: { left: 15, right: 15 },
    body: [
      ['Completion Date', formatDate(completeData?.completionDate)],
      ['Engineer Approval', completeData?.engineerApproval ? 'Approved' : 'Not Approved'],
      ['Engineer Name', safeText(completeData?.engineerName || survey?.engineer)],
      ['Panel Placement Details', safeText(completeData?.panelPlacementDetails)],
      ['Final Notes', safeText(completeData?.finalNotes)],
    ],
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;

  const notes = safeText(survey?.notes, '');
  if (notes && notes !== '—') {
    if (y > pageHeight - 40) {
      addFooter(doc.internal.getNumberOfPages());
      doc.addPage();
      y = 20;
    }
    y = addSectionTitle('Notes', y + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    const wrapped = doc.splitTextToSize(notes, pageWidth - 30);
    doc.text(wrapped, 15, y);
    y += wrapped.length * 5 + 6;
  }

  const drawingData = normalizeDrawing(completeData?.finalDrawing) || normalizeDrawing(activeData?.roofDrawing);
  if (drawingData) {
    const currentY = y + 18;
    const needsNewPage = currentY > pageHeight - 130;
    if (needsNewPage) {
      addFooter(doc.internal.getNumberOfPages());
      doc.addPage();
      y = 20;
    } else {
      y = currentY;
    }

    y = addSectionTitle('Final Roof Layout', y);

    const boxX = 15;
    const boxW = pageWidth - 30;
    const boxH = 95;
    const boxY = y;
    const rendered = renderDrawingToPdf(drawingData, boxX, boxY, boxW, boxH);
    if (!rendered) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...mutedColor);
      doc.text('No drawing available', 15, y + 10);
      doc.setTextColor(...textColor);
    }
    y = boxY + boxH + 12;
  }

  const finalImages = Array.isArray(completeData?.finalImages) ? completeData.finalImages : [];
  const topImages = finalImages.slice(0, 3);
  if (topImages.length > 0) {
    if (y > pageHeight - 85) {
      addFooter(doc.internal.getNumberOfPages());
      doc.addPage();
      y = 20;
    }

    y = addSectionTitle('Final Site Photos', y);

    const gap = 4;
    const imgW = (pageWidth - 30 - gap * 2) / 3;
    const imgH = 40;
    const imgY = y;
    topImages.forEach((src, idx) => {
      const x = 15 + idx * (imgW + gap);
      doc.setDrawColor(...borderColor);
      doc.setFillColor(255, 255, 255);
      doc.rect(x, imgY, imgW, imgH, 'FD');

      if (typeof src === 'string' && src.startsWith('data:image/')) {
        const type = src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        try {
          doc.addImage(src, type, x + 1, imgY + 1, imgW - 2, imgH - 2);
        } catch {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...mutedColor);
          doc.text('Image not available', x + imgW / 2, imgY + imgH / 2, { align: 'center' });
          doc.setTextColor(...textColor);
        }
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...mutedColor);
        doc.text('Image skipped', x + imgW / 2, imgY + imgH / 2, { align: 'center' });
        doc.setTextColor(...textColor);
      }
    });

    y = imgY + imgH + 12;
  }

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    addFooter(i);
  }

  return doc.output('blob');
};

export const downloadSurveyReportPDF = (survey) => {
  const task = async () => {
    await new Promise((r) => setTimeout(r, 0));
    const blob = generateSurveyReportPDF(survey);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const id = (survey?.surveyId || 'SURVEY').toString().replaceAll(' ', '_');
    link.download = `SiteSurveyReport_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  surveyReportDownloadQueue = surveyReportDownloadQueue
    .then(task)
    .catch(() => { });

  return surveyReportDownloadQueue;
};

// Professional Color Palette
const COLORS = {
  primary: [0, 128, 128],      // Teal
  primaryDark: [0, 100, 100],  // Dark Teal
  primaryLight: [0, 160, 160], // Light Teal
  accent: [255, 193, 7],       // Gold/Amber
  accentDark: [255, 160, 0],   // Dark Gold
  white: [255, 255, 255],
  black: [0, 0, 0],
  gray: [100, 100, 100],
  grayLight: [240, 240, 240],
  grayDark: [60, 60, 60],
  green: [34, 197, 94],
  greenLight: [220, 252, 231],
  blue: [59, 130, 246],
  purple: [139, 92, 246],
  orange: [245, 158, 11],
};

// Helper: Draw Solar Icon
const drawSolarIcon = (doc, x, y, size = 20) => {
  // Draw sun rays
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.5);
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 * Math.PI) / 180;
    const x1 = x + Math.cos(angle) * (size * 0.3);
    const y1 = y + Math.sin(angle) * (size * 0.3);
    const x2 = x + Math.cos(angle) * (size * 0.5);
    const y2 = y + Math.sin(angle) * (size * 0.5);
    doc.line(x1, y1, x2, y2);
  }
  // Draw sun center
  doc.setFillColor(...COLORS.accent);
  doc.circle(x, y, size * 0.25, 'F');

  // Draw solar panel
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(x - size * 0.6, y + size * 0.2, size * 1.2, size * 0.6, 2, 2, 'F');

  // Panel grid lines
  doc.setDrawColor(...COLORS.white);
  doc.setLineWidth(0.3);
  for (let i = 1; i < 3; i++) {
    doc.line(x - size * 0.6 + (i * size * 0.4), y + size * 0.2, x - size * 0.6 + (i * size * 0.4), y + size * 0.8);
  }
  doc.line(x - size * 0.6, y + size * 0.5, x + size * 0.6, y + size * 0.5);
};

// Helper: Draw Decorative Header Bar
const drawHeaderBar = (doc, y, height = 4) => {
  const pageWidth = doc.internal.pageSize.width;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, y, pageWidth, height, 'F');

  // Gold accent
  doc.setFillColor(...COLORS.accent);
  doc.rect(pageWidth - 60, y, 60, height, 'F');
};

// Helper: Draw Benefits Box
const drawBenefitBox = (doc, x, y, value, label, color, iconChar = '') => {
  const boxWidth = 42;
  const boxHeight = 35;

  // Box background
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'F');

  // Top color strip
  doc.setFillColor(...color);
  doc.roundedRect(x, y, boxWidth, 5, 2, 2, 'F');

  // Value
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(value, x + boxWidth / 2, y + 18, { align: 'center' });

  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(label, x + boxWidth / 2, y + 28, { align: 'center' });
};

/**
 * Generate Professional Solar Proposal PDF
 * @param {Object} proposal - The proposal data
 * @param {Object} company - Company details (optional)
 * @returns {Blob} PDF blob
 */
export const generateProposalPDF = (proposal, company = SUNVORA_COMPANY) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  let y = 0;

  const addNewPage = () => {
    doc.addPage();
    return 15;
  };

  // ========== PAGE 1: PROFESSIONAL COVER PAGE ==========
  // Background gradient effect
  doc.setFillColor(240, 248, 250);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top decorative bar
  drawHeaderBar(doc, 0, 8);

  // Solar decoration on top right
  drawSolarIcon(doc, pageWidth - 40, 35, 25);

  // Company Logo Area
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, 25, 70, 45, 3, 3, 'FD');

  // Sun icon in logo
  drawSolarIcon(doc, 35, 42, 15);

  // Company Name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('SUNVORA', 55, 40);
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accentDark);
  doc.text('ENERGY', 55, 48);
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray);
  doc.text('PVT. LTD.', 55, 54);

  // Main Title Area
  y = 95;

  // Decorative gold line
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(2);
  doc.line(20, y, 60, y);

  y += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text('BEST VALUE & QUALITY', 20, y);

  y += 18;
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('SOLAR', 20, y);
  doc.setTextColor(...COLORS.accentDark);
  doc.text('SOLUTION', 65, y);

  y += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.gray);
  doc.text('Shaping a Better Future with Clean Energy', 20, y);

  // Proposal Details Box
  y = pageHeight - 110;
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.primaryLight);
  doc.roundedRect(20, y, pageWidth - 40, 65, 5, 5, 'FD');

  // Teal accent bar
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(20, y, 5, 65, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('PROPOSAL', 32, y + 15);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.grayDark);
  doc.text(proposal.proposalNumber || proposal.estimateNumber || 'PROP-001', 32, y + 32);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(`Prepared for: ${proposal.customerName || 'Client'}`, 32, y + 45);
  doc.text(`Capacity: ${proposal.systemCapacity || '0'} kW Solar System`, 32, y + 55);
  doc.text(`Date: ${new Date(proposal.createdAt || Date.now()).toLocaleDateString('en-IN')}`, 32, y + 65);

  // Benefits preview at bottom
  y = pageHeight - 35;
  drawBenefitBox(doc, 20, y, `${proposal.systemCapacity || '0'}`, 'kW Capacity', COLORS.primary);
  drawBenefitBox(doc, 67, y, '25', 'Years Warranty', COLORS.green);
  drawBenefitBox(doc, 114, y, '30', 'Years Life', COLORS.accentDark);
  drawBenefitBox(doc, 161, y, '5', 'Year O&M', COLORS.blue);

  // Footer
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.white);
  doc.text(`Sunvora Energy Pvt. Ltd. | ${company.website} | ${company.phone}`, pageWidth / 2, pageHeight - 6, { align: 'center' });

  // ========== PAGE 2: EXECUTIVE SUMMARY ==========
  y = addNewPage();
  drawHeaderBar(doc, 0, 4);

  // Page header with icon
  drawSolarIcon(doc, 20, 25, 12);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('EXECUTIVE SUMMARY', 40, 28);

  // Gold decorative line
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(1);
  doc.line(40, 32, 120, 32);

  y = 50;

  // Greeting box with teal background
  doc.setFillColor(245, 250, 250);
  doc.roundedRect(20, y - 5, pageWidth - 40, 25, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('To, Our Esteemed Customer', 25, y + 8);

  y += 35;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grayDark);

  const introText = `Sunvora Solar is one of the largest solar panel manufacturers in India, with cutting-edge technology and state-of-art production facility of 6.0GW in the vibrant state of Gujarat. The company was founded in 2016 with the belief that sunlight should be used more efficiently to create a carbon-free globe.`;
  const introLines = doc.splitTextToSize(introText, pageWidth - 50);
  doc.text(introLines, 25, y);
  y += introLines.length * 5 + 15;

  const commitmentText = `Sunvora Solar is committed to sustainability and has contributed to Government-administered Solar Power Projects in rooftop and commercial setups. Has also expanded globally with exports to five countries, including USA and Europe.`;
  const commitmentLines = doc.splitTextToSize(commitmentText, pageWidth - 50);
  doc.text(commitmentLines, 25, y);
  y += commitmentLines.length * 5 + 20;

  // Quote box with green background
  doc.setFillColor(...COLORS.greenLight);
  doc.roundedRect(25, y - 5, pageWidth - 50, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.green);
  doc.text('"To make our future more vibrant and sustainable by using green energy to save the earth."', 30, y + 8);

  y += 35;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grayDark);
  const subsidiaryText = `Sunvora Green, a dedicated service subsidiary, manages EPC projects for Sunvora Solar, ensuring all operations at peak potential with cost-effective and resource-efficient practices.`;
  const subsidiaryLines = doc.splitTextToSize(subsidiaryText, pageWidth - 50);
  doc.text(subsidiaryLines, 25, y);
  y += subsidiaryLines.length * 5 + 20;

  doc.text('We look forward to serve you better in the near future.', 25, y);

  y += 25;
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.gray);
  doc.text('Thanking Yours,', pageWidth - 60, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Team - Sunvora Solar', pageWidth - 60, y);

  // ========== PAGE 3: PROJECT SYNOPSIS ==========
  y = addNewPage();
  drawHeaderBar(doc, 0, 4);
  drawSolarIcon(doc, 20, 25, 12);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('PROJECT SYNOPSIS', 40, 28);

  y = 50;

  const synopsisData = [
    ['Client Name', proposal.customerName || ''],
    ['Customer Address', proposal.customerAddress || 'Surat, Gujarat'],
    ['Proposal Number', proposal.proposalNumber || proposal.estimateNumber || ''],
    ['System Capacity', proposal.systemCapacity ? `${proposal.systemCapacity} kWp (DC)` : ''],
    ['Date', new Date(proposal.createdAt || Date.now()).toLocaleDateString('en-GB')],
    ['Type of Offer', `Design, Engineering, Supply, Installation, Testing & Commissioning of ${proposal.systemCapacity || '0'} kWp Rooftop Solar PV Power Plant`],
    ['Sunvora Contact', 'Bhavin Goti'],
    ['Contact Number', '+91 7096481293'],
    ['Email', 'epc@sunvoraenergy.com'],
    ['Website', 'www.sunvorasolar.com']
  ];

  autoTable(doc, {
    startY: y,
    body: synopsisData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 6,
      font: 'helvetica',
      lineColor: COLORS.primaryLight,
      lineWidth: 0.5
    },
    columnStyles: {
      0: {
        cellWidth: 50,
        fontStyle: 'bold',
        fillColor: COLORS.primary,
        textColor: COLORS.white
      },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 20, right: 20 }
  });

  // ========== PAGE 4: SOLAR SYSTEM SPECIFICATION ==========
  y = addNewPage();
  drawHeaderBar(doc, 0, 4);
  drawSolarIcon(doc, 20, 25, 12);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('SOLAR SYSTEM SPECIFICATION', 40, 28);

  y = 50;

  const specHeaders = [['SR. NO.', 'EQUIPMENT', 'DESCRIPTION', 'MAKE']];
  const specData = proposal.equipmentItems && proposal.equipmentItems.length > 0
    ? proposal.equipmentItems.map((item, index) => [
      (index + 1).toString(),
      item.component?.toUpperCase() || '',
      item.description || '',
      item.brand || 'SUNVORA'
    ])
    : proposal.items && proposal.items.length > 0
      ? proposal.items.map((item, index) => [
        (index + 1).toString(),
        item.name?.toUpperCase() || '',
        item.description || `${item.brand} ${item.model}`,
        item.brand || 'SUNVORA'
      ])
      : [
        ['1', 'SOLAR PV MODULE', '625 Wp TopCon Glass-to-Glass Bifacial Module\nProduct Warranty: 15 years | Performance Warranty: 30 Years', 'SUNVORA'],
        ['2', 'MODULE MOUNTING STRUCTURE', 'Fixed Tilt - Hot Dip GI Galvalum material\nDesigned for high wind loads', 'As per design'],
        ['3', 'GRID TIED INVERTER', 'String Inverter with remote monitoring\n5-7 years warranty', 'SOLIS / Growatt'],
        ['4', 'DC CABLE', '1C X 4 Sq. mm Copper UV protected\nHigh temperature resistance', 'Apar / Polycab'],
        ['5', 'AC CABLE', '3.5C X 4 sq mm Aluminum armored cable\nISI marked', 'RR Kabel / Finolex'],
        ['6', 'ACCB PANEL', 'MCB/MCCB of L&T / ABB / SCHNEIDER\nIP65 Enclosure', 'Reputed Make'],
        ['7', 'EARTHING SYSTEM', 'HDGI Earthing Rod 48MM X 2 Mtr with accessories\nLightning protection included', 'Reputed'],
        ['8', 'LIGHTNING ARRESTOR', 'SS ROD (304), 14mm, 1 Meter\nComplete protection kit', 'Reputed'],
        ['9', 'BALANCE OF SYSTEM', 'Cable trays, connectors, junction boxes\nMC4 connectors, DC/AC protection', 'Reputed Make']
      ];

  autoTable(doc, {
    startY: y,
    head: specHeaders,
    body: specData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 5,
      font: 'helvetica',
      valign: 'middle',
      lineColor: COLORS.primaryLight,
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold', fillColor: COLORS.grayLight },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 },
    alternateRowStyles: { fillColor: [250, 250, 250] }
  });

  // ========== PAGE 5: PROJECT SCOPE ==========
  y = addNewPage();
  drawHeaderBar(doc, 0, 4);
  drawSolarIcon(doc, 20, 25, 12);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('PROJECT SCOPE OF WORK', 40, 28);

  y = 50;

  // Delivery Period Box
  doc.setFillColor(245, 250, 250);
  doc.roundedRect(20, y - 5, pageWidth - 40, 22, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Delivery Period', 25, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grayDark);
  doc.text('Duration of 2 months shall be sufficient for completion of the Solar PV Power Plant.', 25, y + 16);

  y += 35;

  // Sunvora Scope Header
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(20, y - 5, pageWidth - 40, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('Scope of Work by Sunvora Solar', 25, y + 3);

  y += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grayDark);
  const sunvoraScope = [
    '• Detail Site analysis, design of system including civil, structural, electrical and mechanical',
    '• Supply and installation of complete system with required protection devices',
    '• Providing FRP walkway, GI Walkway, peripheral safety railing as per design',
    '• Output Power @ 415 V AC, 3-phase ready for grid connection',
    '• Liaisoning for all approvals and clearances including net metering',
    '• Testing, commissioning and handover with complete documentation',
    '• Training to client personnel on system operation and monitoring'
  ];

  sunvoraScope.forEach(item => {
    doc.text(item, 25, y);
    y += 7;
  });

  y += 10;

  // Client Scope Header
  doc.setFillColor(...COLORS.accent);
  doc.roundedRect(20, y - 5, pageWidth - 40, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('Scope of Work by Client', 25, y + 3);

  y += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grayDark);
  const clientScope = [
    '• Spare MCCB/feeder/switch if needed for termination at distribution panel',
    '• Providing encumbrance free area for Solar PV Plant installation',
    '• Provide WiFi/SIM-card for online monitoring system connectivity',
    '• Availability of pressurized water at the roof for module cleaning',
    '• Access ladder to the roof and safe working conditions during installation'
  ];

  clientScope.forEach(item => {
    doc.text(item, 25, y);
    y += 7;
  });

  // ========== PAGE 6: O&M & WARRANTY ==========
  y = addNewPage();
  drawHeaderBar(doc, 0, 4);
  drawSolarIcon(doc, 20, 25, 12);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('O&M AND WARRANTY', 40, 28);

  y = 50;

  // O&M Header
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(20, y - 5, pageWidth - 40, 12, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('Operation & Maintenance (O&M)', 25, y + 3);

  y += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grayDark);
  const omItems = [
    '• O&M support for first 5 years after commissioning is included in the price',
    '• All costs associated with design related defects shall be borne by Sunvora',
    '• Continuous remote monitoring of the SPV power system via cloud platform',
    '• Quarterly preventive maintenance visits by trained technicians',
    '• Priority customer support with dedicated helpline',
    '• Module cleaning to be done by client with guidance from Sunvora team'
  ];

  omItems.forEach(item => {
    doc.text(item, 25, y);
    y += 8;
  });

  y += 15;

  // Warranty Header
  doc.setFillColor(...COLORS.green);
  doc.roundedRect(20, y - 5, pageWidth - 40, 12, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('Warranty Terms', 25, y + 3);

  y += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grayDark);

  const warrantyItems = [
    ['Solar PV Module', '30 Years Performance', '90% output for 10 years, 80% up to 30 years'],
    ['Module Product', '15 Years Product', 'Against manufacturing defects'],
    ['Grid Tied Inverter', '5-7 Years', 'As per manufacturer terms'],
    ['Complete System', '5 Years O&M', 'Includes preventive maintenance'],
    ['Installation Work', '2 Years Workmanship', 'Against installation defects'],
    ['Performance', '75% PR Guarantee', 'System output guarantee']
  ];

  autoTable(doc, {
    startY: y,
    body: warrantyItems,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: COLORS.primaryLight,
      lineWidth: 0.5
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: COLORS.grayLight },
      1: { cellWidth: 45, fontStyle: 'bold', fillColor: [255, 248, 225] },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 20, right: 20 }
  });

  // ========== PAGE 7: COMMERCIAL PROPOSAL ==========
  y = addNewPage();
  drawHeaderBar(doc, 0, 4);
  drawSolarIcon(doc, 20, 25, 12);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('COMMERCIAL PROPOSAL', 40, 28);

  y = 50;

  const costData = [
    ['Equipment & Material Cost', `₹${(proposal.equipmentCost || 0).toLocaleString('en-IN')}`],
    ['Installation & Commissioning', `₹${(proposal.installationCost || 0).toLocaleString('en-IN')}`],
    ['Engineering & Design', `₹${(proposal.engineeringCost || 0).toLocaleString('en-IN')}`],
    ['Transportation & Logistics', `₹${(proposal.transportationCost || 0).toLocaleString('en-IN')}`],
    ['Miscellaneous & Contingency', `₹${(proposal.miscellaneousCost || 0).toLocaleString('en-IN')}`],
    ['Subtotal (Before Tax)', `₹${(proposal.subtotal || 0).toLocaleString('en-IN')}`],
    [`GST @ ${proposal.gstRate || 18}%`, `₹${(proposal.gstAmount || 0).toLocaleString('en-IN')}`],
    ['TOTAL PROJECT COST', `₹${(proposal.total || 0).toLocaleString('en-IN')}`]
  ];

  autoTable(doc, {
    startY: y,
    body: costData,
    theme: 'grid',
    styles: {
      fontSize: 11,
      cellPadding: 8,
      lineColor: COLORS.primaryLight,
      lineWidth: 0.5
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      if (data.row.index === 5) {
        data.cell.styles.fillColor = [255, 248, 225];
      }
      if (data.row.index === 7) {
        data.cell.styles.fillColor = COLORS.primary;
        data.cell.styles.textColor = COLORS.white;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
      }
    }
  });

  y = doc.lastAutoTable.finalY + 25;

  // Terms Section
  if (proposal.terms) {
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(20, y - 5, pageWidth - 40, 12, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text('Terms & Conditions', 25, y + 3);

    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.grayDark);
    const termLines = doc.splitTextToSize(proposal.terms, pageWidth - 50);
    doc.text(termLines, 25, y);
  }

  // ========== PAGE 8: BENEFITS & BACK PAGE ==========
  y = addNewPage();

  // Full page teal background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative diagonal lines
  doc.setDrawColor(0, 100, 100);
  doc.setLineWidth(0.3);
  for (let i = 0; i < 15; i++) {
    doc.line(0, i * 25, pageWidth, i * 25 + 40);
  }

  // Benefits section
  y = 40;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('PROJECT BENEFITS', pageWidth / 2, y, { align: 'center' });

  // Gold underline
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(2);
  doc.line(pageWidth / 2 - 40, y + 8, pageWidth / 2 + 40, y + 8);

  // Benefits boxes
  const benefits = [
    { value: proposal.benefits?.yearlySavings ? `₹${(proposal.benefits.yearlySavings / 1000).toFixed(0)}K` : '₹0', label: 'Yearly Savings', color: COLORS.green },
    { value: proposal.benefits?.co2Reduction ? `${proposal.benefits.co2Reduction}T` : '0T', label: 'CO₂ Reduction/yr', color: COLORS.blue },
    { value: proposal.benefits?.paybackPeriod ? `${proposal.benefits.paybackPeriod}Y` : '0Y', label: 'Payback Period', color: COLORS.orange },
    { value: '25+', label: 'Years Life', color: COLORS.purple }
  ];

  let benefitX = 20;
  benefits.forEach(benefit => {
    // White box
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(benefitX, y + 20, 42, 50, 5, 5, 'F');

    // Color circle
    doc.setFillColor(...benefit.color);
    doc.circle(benefitX + 21, y + 38, 12, 'F');

    // Value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text(benefit.value, benefitX + 21, y + 42, { align: 'center' });

    // Label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...benefit.color);
    doc.text(benefit.label, benefitX + 21, y + 62, { align: 'center' });

    benefitX += 47;
  });

  // Contact section at bottom
  y = pageHeight - 100;

  // White box for contact
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(20, y, pageWidth - 40, 85, 5, 5, 'F');

  // Sunvora logo in contact
  drawSolarIcon(doc, 35, y + 20, 15);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('SUNVORA ENERGY PVT. LTD.', 60, y + 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(company.address, 60, y + 28);
  doc.text(company.city, 60, y + 36);
  doc.text(`Phone: ${company.tollfree} | ${company.phone}`, 60, y + 44);
  doc.text(`Email: ${company.email} | Website: ${company.website}`, 60, y + 52);

  // Manufacturing unit
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Manufacturing Unit:', 60, y + 65);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(company.manufacturing.name, 60, y + 73);
  doc.text(company.manufacturing.address, 60, y + 81);

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Skip last page (back page has different design)
    if (i < pageCount) {
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.white);
      doc.text(`Proposal valid for 30 days | Sunvora Energy Pvt. Ltd. | ${company.website}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }
  }

  return doc.output('blob');
};

/**
 * Download Proposal PDF
 * @param {Object} proposal - The proposal data
 * @param {Object} company - Company details (optional)
 */
export const downloadProposalPDF = (proposal, company) => {
  const blob = generateProposalPDF(proposal, company);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = proposal.proposalNumber
    ? `Proposal_${proposal.proposalNumber}.pdf`
    : `Proposal_${proposal.estimateNumber || 'Sunvora'}.pdf`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Print Proposal
 * @param {Object} proposal - The proposal data
 * @param {Object} company - Company details (optional)
 */
export const printProposal = (proposal, company) => {
  const blob = generateProposalPDF(proposal, company);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  printWindow?.addEventListener('load', () => {
    printWindow.print();
  });
};

export default {
  generateProposalPDF,
  downloadProposalPDF,
  printProposal,
  generateEstimatePDF,
  downloadEstimatePDF,
  printEstimate
};
