const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'PayrollPage.js');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Fix encoding issues
content = content.replace(/[âÃæÆï¿½]/g, '');

// Add import for Download and receipt generator if not present
if (!content.includes('downloadPayrollReceipt')) {
  content = content.replace(
    "import { Search, RefreshCw, Plus, Wallet, X, User, Calendar, TrendingUp, DollarSign, CheckCircle, Clock } from 'lucide-react';",
    "import { Search, RefreshCw, Plus, Wallet, X, User, Calendar, TrendingUp, DollarSign, CheckCircle, Clock, Download, FileText } from 'lucide-react';\nimport { downloadPayrollReceipt } from '../lib/payrollReceiptGenerator';\nimport { PayrollReceipt } from '../components/hrm';"
  );
}

// Find the PayrollViewModal and add download button
if (!content.includes('handleDownloadReceipt')) {
  // Add state for receipt modal
  content = content.replace(
    /const\s+\[\s*payrolls,\s*setPayrolls\s*\]\s*=\s*useState\(\[\]\);/,
    `const [payrolls, setPayrolls] = useState([]);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPayrollForReceipt, setSelectedPayrollForReceipt] = useState(null);`
  );

  // Add handler function after fetchPayrolls or similar function
  const handlerCode = `
  // Handle receipt download
  const handleDownloadReceipt = (payroll) => {
    downloadPayrollReceipt(payroll);
  };

  const handleViewReceipt = (payroll) => {
    setSelectedPayrollForReceipt(payroll);
    setReceiptModalOpen(true);
  };`;

  // Insert before the return statement or at appropriate place
  if (content.includes('// Render helpers')) {
    content = content.replace('// Render helpers', handlerCode + '\n\n  // Render helpers');
  }
}

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('PayrollPage.js updated successfully!');
