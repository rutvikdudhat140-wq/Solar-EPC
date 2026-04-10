const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'PayrollPage.js');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Check if download button already added
if (content.includes('handleDownloadReceipt')) {
  console.log('Receipt button already added!');
  process.exit(0);
}

// Add handler functions before the ViewSlipModal function or other functions
const handlerCode = `
  // Handle receipt download
  const handleDownloadReceipt = (payroll) => {
    downloadPayrollReceipt(payroll);
  };

  const handleViewReceipt = (payroll) => {
    setSelectedPayrollForReceipt(payroll);
    setReceiptModalOpen(true);
  };
`;

// Find a good place to add the handlers - before ViewSlipModal or first function
const insertPoint = content.indexOf('const PayrollViewModal');
if (insertPoint > 0) {
  content = content.slice(0, insertPoint) + handlerCode + '\n' + content.slice(insertPoint);
}

// Add download button in the actions section
// Find the delete button and add download button after it
const deleteButtonPattern = `{canDelete\(\) && \(
          <button
            onClick=\{\(e\) => \{
              e\.stopPropagation\(\);
              handleDeletePayroll\(record\._id\);
            \}\}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete"
          >
            <X size=\{14\} />
          </button>
        \)\}`;

const newActionButton = `{canDelete() && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePayroll(record._id);
            }}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete"
          >
            <X size={14} />
          </button>
        )}
        {/* Receipt Download Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadReceipt(record);
          }}
          className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
          title="Download Receipt"
        >
          <Download size={14} />
        </button>`;

content = content.replace(new RegExp(deleteButtonPattern), newActionButton);

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Receipt download button added successfully!');
