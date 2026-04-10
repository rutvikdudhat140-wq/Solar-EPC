import { jsPDF } from 'jspdf';

const COMPANY = {
  name: 'SUNOVA ENERGY PVT. LTD.',
  subtitle: 'Salary Slip / Payroll Receipt',
  address: '104 to 1117, 11th Floor, Millennium Business Hub-1',
  city: 'Opp. Sarthana Nature Park, Surat - 395006, Gujarat - India',
  gstin: '24AABCU9603R1ZX',
  phone: '+91 96380 00461',
  email: 'epc@sunovaenergy.com',
};

const COLORS = {
  header: [15, 118, 110],
  headerDark: [12, 74, 70],
  greenBg: [236, 253, 245],
  greenBorder: [16, 185, 129],
  redBg: [254, 242, 242],
  redBorder: [248, 113, 113],
  netBg: [16, 185, 129],
  text: [17, 24, 39],
  muted: [100, 116, 139],
  border: [203, 213, 225],
  white: [255, 255, 255],
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatInr = (value) => `₹${toNumber(value).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('en-GB');
  return date.toLocaleDateString('en-GB');
};

export const formatPayPeriod = (month, year) => `${MONTH_NAMES[(toNumber(month) || 1) - 1] || MONTH_NAMES[0]} ${year || new Date().getFullYear()}`;

export const numberToWords = (value) => {
  const num = Math.floor(toNumber(value));
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const belowThousand = (n) => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`.trim();
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${belowThousand(n % 100)}` : ''}`.trim();
  };

  const chunks = [
    { value: 10000000, label: 'Crore' },
    { value: 100000, label: 'Lakh' },
    { value: 1000, label: 'Thousand' },
  ];

  let remainder = num;
  const parts = [];

  chunks.forEach(({ value: divisor, label }) => {
    if (remainder >= divisor) {
      const chunk = Math.floor(remainder / divisor);
      parts.push(`${belowThousand(chunk)} ${label}`);
      remainder %= divisor;
    }
  });

  if (remainder > 0) {
    parts.push(belowThousand(remainder));
  }

  return parts.join(' ').trim();
};

export const buildReceiptNo = (payload) => {
  if (payload?.receiptNo) return payload.receiptNo;

  const year = payload?.year || new Date().getFullYear();
  const month = String(payload?.month || new Date().getMonth() + 1).padStart(2, '0');
  const employeeCode = payload?.employee?.employeeId
    || payload?.employeeId?.employeeId
    || payload?.employeeId
    || '000';
  return `PAY-${year}-${month}-${employeeCode}`;
};

export const normalizePayrollData = (payload = {}) => {
  const fallbackPayroll = payload.fallbackPayroll || {};
  const fallbackEmployee = fallbackPayroll.employee || {};
  const fallbackEarnings = fallbackPayroll.earnings || {};
  const fallbackDeductions = fallbackPayroll.deductions || {};
  const fallbackPaymentDetails = fallbackPayroll.paymentDetails || {};
  const rawEmployee = payload.employee || payload.employeeId || {};
  const employeeName = payload.employeeName
    || rawEmployee.name
    || [rawEmployee.firstName, rawEmployee.lastName].filter(Boolean).join(' ')
    || fallbackEmployee.name
    || 'N/A';

  const employeeId = payload.employeeCode || rawEmployee.employeeId || payload.employeeIdCode || fallbackEmployee.employeeId || 'N/A';
  const department = payload.department || rawEmployee.department || fallbackEmployee.department || 'N/A';
  const designation = payload.designation || rawEmployee.designation || rawEmployee.role || fallbackEmployee.designation || 'N/A';

  const month = toNumber(payload.month || payload.payPeriodMonth || new Date().getMonth() + 1);
  const year = toNumber(payload.year || payload.payPeriodYear || new Date().getFullYear());
  const workingDays = toNumber(payload.workingDays || payload.attendance?.workingDays || 30);
  const daysPresent = Math.min(workingDays, toNumber(payload.daysPresent || payload.attendance?.daysPresent || workingDays));
  const daysAbsent = Math.max(workingDays - daysPresent, 0);

  const earningsSource = payload.earnings || {};
  const deductionsSource = payload.deductions || {};
  const paymentSource = payload.paymentDetails || payload.bankDetails || {};

  const earnings = {
    basicSalary: toNumber(payload.basicSalary ?? earningsSource.basicSalary ?? earningsSource.basic ?? payload.baseSalary ?? fallbackEarnings.basicSalary),
    hra: toNumber(payload.hra ?? earningsSource.hra ?? fallbackEarnings.hra),
    bonus: toNumber(payload.bonus ?? earningsSource.bonus ?? fallbackEarnings.bonus),
    otherAllowances: toNumber(payload.otherAllowances ?? earningsSource.otherAllowances ?? earningsSource.allowances ?? earningsSource.other ?? payload.allowances ?? fallbackEarnings.otherAllowances),
  };

  const deductions = {
    pf: toNumber(payload.pf ?? deductionsSource.pf ?? fallbackDeductions.pf),
    tax: toNumber(payload.tax ?? deductionsSource.tax ?? deductionsSource.tds ?? deductionsSource.professionalTax ?? fallbackDeductions.tax),
    otherDeductions: toNumber(payload.otherDeductions ?? deductionsSource.otherDeductions ?? deductionsSource.other ?? payload.deductions ?? fallbackDeductions.otherDeductions),
  };

  const grossSalary = toNumber(payload.grossSalary ?? (
    earnings.basicSalary
    + earnings.hra
    + earnings.bonus
    + earnings.otherAllowances
  ));

  const totalDeductions = toNumber(payload.totalDeductions ?? (
    deductions.pf
    + deductions.tax
    + deductions.otherDeductions
  ));

  const netSalary = toNumber(payload.netSalary ?? (grossSalary - totalDeductions));

  const employee = {
    name: employeeName,
    employeeId,
    department,
    designation,
  };

  const paymentDetails = {
    bankName: payload.bankName || paymentSource.bankName || fallbackPaymentDetails.bankName || 'N/A',
    accountNumber: payload.accountNumber || paymentSource.accountNumber || fallbackPaymentDetails.accountNumber || 'N/A',
    ifscCode: payload.ifscCode || paymentSource.ifscCode || fallbackPaymentDetails.ifscCode || 'N/A',
    transactionId: payload.transactionId || paymentSource.transactionId || payload.paymentReference || fallbackPaymentDetails.transactionId || 'N/A',
  };

  const status = (payload.status || payload.paymentStatus || (payload.isPaid ? 'paid' : 'pending')).toLowerCase();
  const date = payload.date || payload.paymentDate || payload.paidAt || payload.generatedAt || payload.createdAt || new Date().toISOString();

  return {
    id: payload.id || payload._id || `${employeeId}-${month}-${year}`,
    employee,
    month,
    year,
    payPeriodLabel: formatPayPeriod(month, year),
    workingDays,
    daysPresent,
    daysAbsent,
    earnings,
    deductions,
    grossSalary,
    totalDeductions,
    netSalary,
    paymentDetails,
    receiptNo: buildReceiptNo({
      receiptNo: payload.receiptNo,
      month,
      year,
      employee,
    }),
    date,
    status,
    amountInWords: `${numberToWords(netSalary)} rupees only`,
    source: payload.source || fallbackPayroll.source || 'system',
    raw: payload,
  };
};

const renderFieldRow = (doc, label, value, x, y, width) => {
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(label, x, y);
  doc.setTextColor(...COLORS.text);
  doc.text(String(value), x + width, y, { align: 'right' });
};

export const generatePayrollReceiptPDF = (payload, companyData = COMPANY) => {
  const payroll = normalizePayrollData(payload);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setFillColor(...COLORS.headerDark);
  doc.rect(0, 0, pageWidth, 46, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.text(companyData.name, margin, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(companyData.subtitle || COMPANY.subtitle, margin, 23);
  doc.setFontSize(7.5);
  doc.text(companyData.address, margin, 31);
  doc.text(companyData.city, margin, 35);
  doc.text(`GSTIN: ${companyData.gstin}`, margin, 39);
  doc.text(`${companyData.phone} | ${companyData.email}`, margin, 43);

  doc.setFontSize(8);
  doc.text(`Receipt No: ${payroll.receiptNo}`, pageWidth - margin, 25, { align: 'right' });
  doc.text(`Date: ${formatDate(payroll.date)}`, pageWidth - margin, 31, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${payroll.status.toUpperCase()}`, pageWidth - margin, 37, { align: 'right' });

  let y = 56;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 32, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.header);
  doc.setFontSize(10);
  doc.text('EMPLOYEE DETAILS', margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(8.5);
  doc.text(`Name: ${payroll.employee.name}`, margin + 5, y + 15);
  doc.text(`Employee ID: ${payroll.employee.employeeId}`, margin + 5, y + 21);
  doc.text(`Department: ${payroll.employee.department}`, margin + 5, y + 27);
  doc.text(`Designation: ${payroll.employee.designation}`, margin + 5, y + 33);

  const rightColX = pageWidth / 2 + 8;
  doc.text(`Pay Period: ${payroll.payPeriodLabel}`, rightColX, y + 15);
  doc.text(`Working Days: ${payroll.workingDays}`, rightColX, y + 21);
  doc.text(`Days Present: ${payroll.daysPresent}`, rightColX, y + 27);
  doc.text(`Days Absent: ${payroll.daysAbsent}`, rightColX, y + 33);

  y += 42;

  const boxGap = 10;
  const boxWidth = (pageWidth - margin * 2 - boxGap) / 2;
  const boxHeight = 70;

  doc.setFillColor(...COLORS.greenBg);
  doc.setDrawColor(...COLORS.greenBorder);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.header);
  doc.setFontSize(10);
  doc.text('EARNINGS', margin + 6, y + 10);
  doc.line(margin + 6, y + 18, margin + boxWidth - 6, y + 18);

  let earningsY = y + 26;
  renderFieldRow(doc, 'Basic Salary', formatInr(payroll.earnings.basicSalary), margin + 6, earningsY, boxWidth - 12);
  earningsY += 7;
  renderFieldRow(doc, 'HRA', formatInr(payroll.earnings.hra), margin + 6, earningsY, boxWidth - 12);
  earningsY += 7;
  renderFieldRow(doc, 'Bonus', formatInr(payroll.earnings.bonus), margin + 6, earningsY, boxWidth - 12);
  earningsY += 7;
  renderFieldRow(doc, 'Other Allowances', formatInr(payroll.earnings.otherAllowances), margin + 6, earningsY, boxWidth - 12);
  earningsY += 9;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.header);
  renderFieldRow(doc, 'GROSS SALARY', formatInr(payroll.grossSalary), margin + 6, earningsY, boxWidth - 12);

  const dedX = margin + boxWidth + boxGap;
  doc.setFillColor(...COLORS.redBg);
  doc.setDrawColor(...COLORS.redBorder);
  doc.roundedRect(dedX, y, boxWidth, boxHeight, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(10);
  doc.text('DEDUCTIONS', dedX + 6, y + 10);
  doc.line(dedX + 6, y + 18, dedX + boxWidth - 6, y + 18);

  let deductionsY = y + 26;
  renderFieldRow(doc, 'PF', formatInr(payroll.deductions.pf), dedX + 6, deductionsY, boxWidth - 12);
  deductionsY += 7;
  renderFieldRow(doc, 'Tax', formatInr(payroll.deductions.tax), dedX + 6, deductionsY, boxWidth - 12);
  deductionsY += 7;
  renderFieldRow(doc, 'Other Deductions', formatInr(payroll.deductions.otherDeductions), dedX + 6, deductionsY, boxWidth - 12);
  deductionsY += 9;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  renderFieldRow(doc, 'TOTAL DEDUCTIONS', formatInr(payroll.totalDeductions), dedX + 6, deductionsY, boxWidth - 12);

  y += 82;

  doc.setFillColor(...COLORS.netBg);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.text('NET SALARY PAYABLE', margin + 10, y + 12);
  doc.setFontSize(18);
  doc.text(formatInr(payroll.netSalary), pageWidth - margin - 10, y + 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`(${payroll.amountInWords})`, margin + 10, y + 21);

  y += 38;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.header);
  doc.setFontSize(10);
  doc.text('PAYMENT DETAILS', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(8.5);
  doc.text(`Bank Name: ${payroll.paymentDetails.bankName}`, margin, y + 8);
  doc.text(`Account Number: ${payroll.paymentDetails.accountNumber}`, margin, y + 15);
  doc.text(`IFSC Code: ${payroll.paymentDetails.ifscCode}`, margin, y + 22);
  doc.text(`Transaction ID: ${payroll.paymentDetails.transactionId}`, margin, y + 29);

  const footerY = pageHeight - 26;
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, footerY, margin + 48, footerY);
  doc.line(pageWidth - margin - 48, footerY, pageWidth - margin, footerY);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text('Employer Signature', margin, footerY + 5);
  doc.text('Employee Signature', pageWidth - margin - 48, footerY + 5);
  doc.text('This is a computer generated salary slip', pageWidth / 2, footerY + 15, { align: 'center' });

  return doc.output('blob');
};

export const downloadPayrollReceipt = (payload, filename = null, companyData = COMPANY) => {
  const payroll = normalizePayrollData(payload);
  const blob = generatePayrollReceiptPDF(payroll, companyData);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Salary_Slip_${payroll.employee.employeeId}_${payroll.month}_${payroll.year}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printPayrollReceipt = (payload, companyData = COMPANY) => {
  const blob = generatePayrollReceiptPDF(payload, companyData);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  printWindow?.addEventListener('load', () => {
    printWindow.print();
  });
};

export default {
  COMPANY,
  normalizePayrollData,
  generatePayrollReceiptPDF,
  downloadPayrollReceipt,
  printPayrollReceipt,
};
