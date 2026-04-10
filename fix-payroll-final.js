const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'PayrollPage.js');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Find the position after the modal component closing (before the first export default)
const modalEndPattern = '  );\n};';
const modalEndIndex = content.indexOf(modalEndPattern);

if (modalEndIndex === -1) {
  console.error('Could not find modal end pattern');
  process.exit(1);
}

// Cut content up to and including the modal component
let cleanContent = content.substring(0, modalEndIndex + modalEndPattern.length);

// Add the remaining necessary code
const remainingCode = `

  // Handler functions for receipt
  const handleDownloadReceipt = (payroll) => {
    downloadPayrollReceipt(payroll);
  };

  const handleViewReceipt = (payroll) => {
    setSelectedPayrollForReceipt(payroll);
    setReceiptModalOpen(true);
  };

  // Permission helpers
  const canEdit = () => isAdmin || user?.permissions?.payroll?.edit !== false;
  const canDelete = () => isAdmin || user?.permissions?.payroll?.delete !== false;
  const canCreate = () => isAdmin || user?.permissions?.payroll?.create !== false;

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Payroll Management"
        subtitle="Manage employee salaries, generate payslips, and track payments"
        icon={Wallet}
        action={canCreate() && (
          <button
            onClick={() => setShowPayrollModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Generate Payroll
          </button>
        )}
      />

      {/* Payroll Modal */}
      {showPayrollModal && (
        <PayrollModal
          onClose={() => setShowPayrollModal(false)}
          employees={employees}
          onGenerate={handleGeneratePayroll}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingPayroll && (
        <PayrollEditModal
          payroll={editingPayroll}
          onClose={() => {
            setShowEditModal(false);
            setEditingPayroll(null);
          }}
          onUpdate={handleUpdatePayroll}
        />
      )}

      {/* Receipt Modal */}
      {receiptModalOpen && selectedPayrollForReceipt && (
        <PayrollReceipt
          payroll={selectedPayrollForReceipt}
          onClose={() => {
            setReceiptModalOpen(false);
            setSelectedPayrollForReceipt(null);
          }}
        />
      )}

      {/* View Modal */}
      {viewPayroll && (
        <PayrollViewModal
          payroll={viewPayroll}
          onClose={() => setViewPayroll(null)}
        />
      )}

      {/* Table */}
      <DataTable
        columns={tableColumns}
        data={filteredPayrolls}
        loading={loading}
        emptyState={{
          icon: Wallet,
          title: 'No payroll records found',
          subtitle: 'Generate payroll for employees to see records here'
        }}
      />
    </div>
  );
};

export default PayrollPage;
`;

// Combine the clean content with the remaining code
cleanContent = cleanContent + remainingCode;

// Write the fixed content
fs.writeFileSync(filePath, cleanContent, 'utf8');
console.log('PayrollPage.js fixed successfully!');
