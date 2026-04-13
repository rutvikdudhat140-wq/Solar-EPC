import React from 'react';
import { Download, Printer, X } from 'lucide-react';
import {
  downloadPayrollReceipt,
  formatDate,
  formatInr,
  normalizePayrollData,
  printPayrollReceipt,
} from '../../lib/payrollReceiptGenerator';

const statusClasses = {
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  processing: 'bg-sky-100 text-sky-700 border-sky-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 py-2 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-800">{value}</span>
  </div>
);

const PayrollReceipt = ({ payroll, onClose }) => {
  if (!payroll) return null;

  const slip = normalizePayrollData(payroll);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Salary Slip Preview</h2>
            <p className="text-sm text-slate-500">A4-ready preview with exact PDF content.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printPayrollReceipt(slip)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={() => downloadPayrollReceipt(slip)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#115e59]"
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="bg-slate-100 p-5 md:p-8">
          <div className="mx-auto w-full max-w-[794px] rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <div className="rounded-t-[24px] bg-[#0f4a46] px-6 py-6 text-white md:px-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-[32px] font-bold leading-none">SUNOVA ENERGY PVT. LTD.</h3>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-100">Salary Slip / Payroll Receipt</p>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-emerald-50/90">
                    <p>104 to 1117, 11th Floor, Millennium Business Hub-1</p>
                    <p>Opp. Sarthana Nature Park, Surat - 395006, Gujarat - India</p>
                    <p>GSTIN: 24AABCU9603R1ZX</p>
                    <p>+91 96380 00461 | epc@sunovaenergy.com</p>
                  </div>
                </div>
                <div className="space-y-2 text-right text-xs text-emerald-50">
                  <p>Receipt No: {slip.receiptNo}</p>
                  <p>Date: {formatDate(slip.date)}</p>
                  <p>Status: {slip.status.toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 px-6 py-6 md:px-8 md:py-7">
              <section className="rounded-2xl bg-[#f0fdfa] px-5 py-4">
                <h4 className="text-sm font-bold uppercase tracking-wide text-[#0F766E]">Employee Details</h4>
                <div className="mt-4 grid gap-2 text-sm text-slate-800 md:grid-cols-2">
                  <p>Name: {slip.employee.name}</p>
                  <p>Pay Period: {slip.payPeriodLabel}</p>
                  <p>Employee ID: {slip.employee.employeeId}</p>
                  <p>Working Days: {slip.workingDays}</p>
                  <p>Department: {slip.employee.department}</p>
                  <p>Days Present: {slip.daysPresent}</p>
                  <p>Designation: {slip.employee.designation}</p>
                  <p>Days Absent: {slip.daysAbsent}</p>
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-5">
                  <h4 className="text-lg font-bold text-[#0F766E]">EARNINGS</h4>
                  <div className="mt-4 border-t border-emerald-300 pt-3">
                    <DetailRow label="Basic Salary" value={formatInr(slip.earnings.basicSalary)} />
                    <DetailRow label="HRA" value={formatInr(slip.earnings.hra)} />
                    <DetailRow label="Bonus" value={formatInr(slip.earnings.bonus)} />
                    <DetailRow label="Other Allowances" value={formatInr(slip.earnings.otherAllowances)} />
                    <div className="mt-3 border-t border-emerald-300 pt-3">
                      <DetailRow label="GROSS SALARY" value={formatInr(slip.grossSalary)} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-5">
                  <h4 className="text-lg font-bold text-rose-700">DEDUCTIONS</h4>
                  <div className="mt-4 border-t border-rose-300 pt-3">
                    <DetailRow label="PF" value={formatInr(slip.deductions.pf)} />
                    <DetailRow label="Tax" value={formatInr(slip.deductions.tax)} />
                    <DetailRow label="Other Deductions" value={formatInr(slip.deductions.otherDeductions)} />
                    <div className="mt-3 border-t border-rose-300 pt-3">
                      <DetailRow label="TOTAL DEDUCTIONS" value={formatInr(slip.totalDeductions)} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl bg-[#10b981] px-6 py-5 text-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold tracking-wide">NET SALARY PAYABLE</p>
                    <p className="mt-2 text-sm text-emerald-50">({slip.amountInWords})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold md:text-4xl">{formatInr(slip.netSalary)}</p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-base font-bold text-[#0F766E]">PAYMENT DETAILS</h4>
                <div className="mt-4 grid gap-3 text-sm text-slate-800 md:grid-cols-2">
                  <p>Bank Name: {slip.paymentDetails.bankName}</p>
                  <p>Account Number: {slip.paymentDetails.accountNumber}</p>
                  <p>IFSC Code: {slip.paymentDetails.ifscCode}</p>
                  <p>Transaction ID: {slip.paymentDetails.transactionId}</p>
                </div>
              </section>

              <section className="pt-6">
                <div className="grid gap-8 text-xs text-slate-500 md:grid-cols-2">
                  <div>
                    <div className="h-px bg-slate-300" />
                    <p className="pt-2">Employer Signature</p>
                  </div>
                  <div>
                    <div className="h-px bg-slate-300" />
                    <p className="pt-2">Employee Signature</p>
                  </div>
                </div>
                <p className="mt-6 text-center text-xs text-slate-400">This is a computer generated salary slip</p>
              </section>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-3 text-xs text-slate-400">
          <span className={`inline-flex rounded-full border px-2.5 py-1 font-medium ${statusClasses[slip.status] || statusClasses.pending}`}>
            {slip.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PayrollReceipt;
