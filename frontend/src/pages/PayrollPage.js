import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Plus, RefreshCw, Search, Wallet, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { toast } from '../components/ui/Toast';
import { PayrollReceipt } from '../components/hrm';
import { employeeApi, payrollApi } from '../services/hrmApi';
import {
  downloadPayrollReceipt,
  formatInr,
  formatPayPeriod,
  normalizePayrollData,
} from '../lib/payrollReceiptGenerator';

const currentDate = new Date();

const createInitialForm = () => ({
  selectedEmployeeId: '',
  employeeName: '',
  employeeCode: '',
  department: '',
  designation: '',
  month: currentDate.getMonth() + 1,
  year: currentDate.getFullYear(),
  workingDays: 30,
  daysPresent: 30,
  basicSalary: 0,
  hra: 0,
  bonus: 0,
  otherAllowances: 0,
  pf: 0,
  tax: 0,
  otherDeductions: 0,
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  transactionId: '',
  status: 'pending',
});

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: formatPayPeriod(index + 1, currentDate.getFullYear()).split(' ')[0],
}));

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildPayrollFromForm = (form, source = 'manual') => {
  const workingDays = toNumber(form.workingDays);
  const daysPresent = Math.min(workingDays, toNumber(form.daysPresent));
  const grossSalary = toNumber(form.basicSalary) + toNumber(form.hra) + toNumber(form.bonus) + toNumber(form.otherAllowances);
  const totalDeductions = toNumber(form.pf) + toNumber(form.tax) + toNumber(form.otherDeductions);

  return normalizePayrollData({
    id: `${form.employeeCode || 'EMP'}-${form.month}-${form.year}-${Date.now()}`,
    source,
    employeeName: form.employeeName,
    employeeCode: form.employeeCode,
    department: form.department,
    designation: form.designation,
    month: form.month,
    year: form.year,
    workingDays,
    daysPresent,
    basicSalary: form.basicSalary,
    hra: form.hra,
    bonus: form.bonus,
    otherAllowances: form.otherAllowances,
    pf: form.pf,
    tax: form.tax,
    otherDeductions: form.otherDeductions,
    grossSalary,
    totalDeductions,
    netSalary: grossSalary - totalDeductions,
    bankName: form.bankName,
    accountNumber: form.accountNumber,
    ifscCode: form.ifscCode,
    transactionId: form.transactionId,
    status: form.status,
    date: new Date().toISOString(),
  });
};

const StatCard = ({ title, value, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    teal: 'border-teal-200 bg-teal-50 text-teal-900',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
};

const Field = ({ label, children, note }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {note ? <span className="mt-1 block text-xs text-slate-400">{note}</span> : null}
  </label>
);

const inputClassName = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10';

const PayrollFormModal = ({ employees, form, setForm, onClose, onGenerate, preview }) => {
  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [key]: ['month', 'year', 'workingDays', 'daysPresent', 'basicSalary', 'hra', 'bonus', 'otherAllowances', 'pf', 'tax', 'otherDeductions'].includes(key)
        ? toNumber(value)
        : value,
    }));
  };

  const handleEmployeeSelect = (event) => {
    const selectedEmployeeId = event.target.value;
    const employee = employees.find((item) => item._id === selectedEmployeeId);

    setForm((current) => ({
      ...current,
      selectedEmployeeId,
      employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : current.employeeName,
      employeeCode: employee?.employeeId || current.employeeCode,
      department: employee?.department || current.department,
      designation: employee?.designation || employee?.role || current.designation,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-[32px] bg-slate-100 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Generate Payroll</h2>
            <p className="text-sm text-slate-500">Every field entered here is reflected in the salary slip and PDF.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Employee Details</h3>
                  <p className="text-sm text-slate-500">Fill manually or load an existing employee profile.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Load From Employee">
                  <select value={form.selectedEmployeeId} onChange={handleEmployeeSelect} className={inputClassName}>
                    <option value="">Select employee (optional)</option>
                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {`${employee.firstName || ''} ${employee.lastName || ''}`.trim()} {employee.employeeId ? `(${employee.employeeId})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <div />
                <Field label="Name">
                  <input value={form.employeeName} onChange={handleChange('employeeName')} className={inputClassName} placeholder="Employee full name" />
                </Field>
                <Field label="Employee ID">
                  <input value={form.employeeCode} onChange={handleChange('employeeCode')} className={inputClassName} placeholder="EMP005" />
                </Field>
                <Field label="Department">
                  <input value={form.department} onChange={handleChange('department')} className={inputClassName} placeholder="Operations" />
                </Field>
                <Field label="Designation">
                  <input value={form.designation} onChange={handleChange('designation')} className={inputClassName} placeholder="Site Engineer" />
                </Field>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Payroll Details</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Month">
                  <select value={form.month} onChange={handleChange('month')} className={inputClassName}>
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Year">
                  <input type="number" value={form.year} onChange={handleChange('year')} className={inputClassName} />
                </Field>
                <Field label="Working Days">
                  <input type="number" value={form.workingDays} onChange={handleChange('workingDays')} className={inputClassName} />
                </Field>
                <Field label="Days Present">
                  <input type="number" value={form.daysPresent} onChange={handleChange('daysPresent')} className={inputClassName} />
                </Field>
                <Field label="Days Absent" note="Auto calculated">
                  <input value={preview.daysAbsent} readOnly className={`${inputClassName} bg-slate-50`} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={handleChange('status')} className={inputClassName}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-emerald-800">Earnings</h3>
                <div className="mt-5 grid gap-4">
                  <Field label="Basic Salary">
                    <input type="number" value={form.basicSalary} onChange={handleChange('basicSalary')} className={inputClassName} />
                  </Field>
                  <Field label="HRA">
                    <input type="number" value={form.hra} onChange={handleChange('hra')} className={inputClassName} />
                  </Field>
                  <Field label="Bonus">
                    <input type="number" value={form.bonus} onChange={handleChange('bonus')} className={inputClassName} />
                  </Field>
                  <Field label="Other Allowances">
                    <input type="number" value={form.otherAllowances} onChange={handleChange('otherAllowances')} className={inputClassName} />
                  </Field>
                </div>
              </div>

              <div className="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-rose-800">Deductions</h3>
                <div className="mt-5 grid gap-4">
                  <Field label="PF">
                    <input type="number" value={form.pf} onChange={handleChange('pf')} className={inputClassName} />
                  </Field>
                  <Field label="Tax">
                    <input type="number" value={form.tax} onChange={handleChange('tax')} className={inputClassName} />
                  </Field>
                  <Field label="Other Deductions">
                    <input type="number" value={form.otherDeductions} onChange={handleChange('otherDeductions')} className={inputClassName} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Payment Details</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Bank Name">
                  <input value={form.bankName} onChange={handleChange('bankName')} className={inputClassName} placeholder="HDFC Bank" />
                </Field>
                <Field label="Account Number">
                  <input value={form.accountNumber} onChange={handleChange('accountNumber')} className={inputClassName} placeholder="XXXX1234" />
                </Field>
                <Field label="IFSC Code">
                  <input value={form.ifscCode} onChange={handleChange('ifscCode')} className={inputClassName} placeholder="HDFC0001234" />
                </Field>
                <Field label="Transaction ID">
                  <input value={form.transactionId} onChange={handleChange('transactionId')} className={inputClassName} placeholder="UTR/NEFT/IMPS reference" />
                </Field>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] bg-[#0f4a46] p-6 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Live Summary</p>
              <h3 className="mt-3 text-2xl font-semibold">Salary Slip Totals</h3>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Gross Salary</span>
                  <span className="font-semibold">{formatInr(preview.grossSalary)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Total Deductions</span>
                  <span className="font-semibold">{formatInr(preview.totalDeductions)}</span>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-100">Net Salary</p>
                  <p className="mt-2 text-3xl font-bold">{formatInr(preview.netSalary)}</p>
                  <p className="mt-2 text-xs text-emerald-100">{preview.amountInWords}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Slip Preview Snapshot</h3>
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="rounded-[20px] bg-[#0f4a46] p-4 text-white">
                  <p className="text-lg font-semibold">SUNOVA ENERGY PVT. LTD.</p>
                  <p className="text-xs text-emerald-100">Salary Slip / Payroll Receipt</p>
                  <div className="mt-3 grid gap-1 text-xs text-emerald-50">
                    <p>Receipt No: {preview.receiptNo}</p>
                    <p>Period: {preview.payPeriodLabel}</p>
                    <p>Status: {preview.status.toUpperCase()}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p><span className="font-medium">Name:</span> {preview.employee.name}</p>
                  <p><span className="font-medium">Employee ID:</span> {preview.employee.employeeId}</p>
                  <p><span className="font-medium">Department:</span> {preview.employee.department}</p>
                  <p><span className="font-medium">Designation:</span> {preview.employee.designation}</p>
                  <p><span className="font-medium">Bank Name:</span> {preview.paymentDetails.bankName}</p>
                  <p><span className="font-medium">Transaction ID:</span> {preview.paymentDetails.transactionId}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={onGenerate}
                className="rounded-2xl bg-[#0F766E] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#115e59]"
              >
                Create Payroll
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PayrollPage = () => {
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [manualPayrolls, setManualPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      const data = response?.data?.data || response?.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getAll();
      const data = response?.data?.data || response?.data || [];
      setPayrolls(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch payroll records');
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchPayrolls();
  }, []);

  const previewPayroll = useMemo(() => buildPayrollFromForm(form), [form]);

  const records = useMemo(() => {
    const normalizedApi = payrolls.map((item) => normalizePayrollData(item));
    const apiById = new Map(normalizedApi.map((item) => [item.id, item]));
    const mergedManual = manualPayrolls.map((item) => ({
      ...(apiById.get(item.id) || {}),
      ...item,
    }));
    const manualIds = new Set(mergedManual.map((item) => item.id));
    const remainingApi = normalizedApi.filter((item) => !manualIds.has(item.id));
    return [...mergedManual, ...remainingApi];
  }, [manualPayrolls, payrolls]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const query = search.toLowerCase();
    return records.filter((record) => (
      record.employee.name.toLowerCase().includes(query)
      || record.employee.employeeId.toLowerCase().includes(query)
      || record.employee.department.toLowerCase().includes(query)
      || record.payPeriodLabel.toLowerCase().includes(query)
    ));
  }, [records, search]);

  const stats = useMemo(() => {
    const totalNet = records.reduce((sum, item) => sum + item.netSalary, 0);
    const totalGross = records.reduce((sum, item) => sum + item.grossSalary, 0);
    const paidCount = records.filter((item) => item.status === 'paid').length;
    const pendingCount = records.filter((item) => item.status !== 'paid').length;

    return { totalNet, totalGross, paidCount, pendingCount };
  }, [records]);

  const getPayrollDetails = async (record) => {
    if (!record || record.source === 'manual') return record;

    const payrollId = record.raw?._id || record.id;
    if (!payrollId) return record;

    const response = await payrollApi.getById(payrollId);
    const fullRecord = response?.data?.data || response?.data || {};

    return normalizePayrollData({ ...fullRecord, fallbackPayroll: record, source: record.source });
  };

  const handleOpenPayroll = async (record, mode = 'preview') => {
    try {
      setActionLoadingId(record.id);
      const detailedRecord = await getPayrollDetails(record);
      if (mode === 'download') {
        downloadPayrollReceipt(detailedRecord);
        return;
      }
      setSelectedPayroll(detailedRecord);
    } catch (error) {
      toast.error('Failed to load payroll details');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!form.selectedEmployeeId) {
      toast.error('Select an employee to create payroll');
      return;
    }

    if (!form.employeeName || !form.employeeCode || !form.department || !form.designation) {
      toast.error('Fill all employee details before creating payroll');
      return;
    }

    if (!form.bankName || !form.accountNumber || !form.ifscCode || !form.transactionId) {
      toast.error('Fill all payment details before creating payroll');
      return;
    }

    try {
      const payload = {
        employeeId: form.selectedEmployeeId,
        month: form.month,
        year: form.year,
        baseSalary: toNumber(form.basicSalary),
        allowances: toNumber(form.hra) + toNumber(form.otherAllowances),
        deductions: toNumber(form.pf) + toNumber(form.tax) + toNumber(form.otherDeductions),
        bonus: toNumber(form.bonus),
      };

      const response = await payrollApi.create(payload);
      const createdPayroll = response?.data?.data || response?.data || {};

      const record = normalizePayrollData({
        ...createdPayroll,
        employeeName: form.employeeName,
        employeeCode: form.employeeCode,
        department: form.department,
        designation: form.designation,
        workingDays: form.workingDays,
        daysPresent: form.daysPresent,
        hra: form.hra,
        otherAllowances: form.otherAllowances,
        pf: form.pf,
        tax: form.tax,
        otherDeductions: form.otherDeductions,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode,
        transactionId: form.transactionId,
        source: 'manual',
      });

      setManualPayrolls((current) => [record, ...current]);
      setSelectedPayroll(record);
      setShowFormModal(false);
      setForm(createInitialForm());
      toast.success('Payroll created successfully');
      fetchPayrolls();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create payroll');
    }
  };

  const handleDeleteRecord = (record) => {
    if (record.source !== 'manual') {
      toast.error('Only newly generated local payrolls can be removed from this screen');
      return;
    }

    setManualPayrolls((current) => current.filter((item) => item.id !== record.id));
  };

  const tableColumns = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (_value, record) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{record.employee.name}</span>
          <span className="text-xs text-slate-500">{record.employee.employeeId}</span>
        </div>
      ),
    },
    {
      key: 'payPeriod',
      header: 'Pay Period',
      render: (_value, record) => record.payPeriodLabel,
    },
    {
      key: 'grossSalary',
      header: 'Gross Salary',
      render: (_value, record) => formatInr(record.grossSalary),
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      render: (_value, record) => <span className="font-semibold text-emerald-700">{formatInr(record.netSalary)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (_value, record) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {record.status.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, record) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleOpenPayroll(record, 'preview');
            }}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            title="Preview slip"
            disabled={actionLoadingId === record.id}
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleOpenPayroll(record, 'download');
            }}
            className="rounded-xl p-2 text-emerald-600 transition hover:bg-emerald-50"
            title="Download PDF"
            disabled={actionLoadingId === record.id}
          >
            <Download size={16} />
          </button>
          {record.source === 'manual' ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteRecord(record);
              }}
              className="rounded-xl p-2 text-rose-600 transition hover:bg-rose-50"
              title="Remove local record"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Management"
        subtitle="Manage employee salaries, generate payslips, and track payments"
        icon={Wallet}
        action={(
          <button
            onClick={() => setShowFormModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#115e59]"
          >
            <Plus size={16} />
            Create Payroll
          </button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard title="Total Payroll" value={formatInr(stats.totalNet)} tone="green" />
        <StatCard title="Gross Processed" value={formatInr(stats.totalGross)} tone="teal" />
        <StatCard title="Paid Slips" value={String(stats.paidCount)} tone="amber" />
        <StatCard title="Pending Slips" value={String(stats.pendingCount)} tone="slate" />
      </div>

      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search payrolls..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10"
            />
          </div>
          <button
            onClick={fetchPayrolls}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            title="Refresh payrolls"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="rounded-[28px] bg-white p-4 shadow-sm">
        <DataTable
          columns={tableColumns}
          data={filteredRecords}
          loading={loading}
          rowKey="id"
          emptyText="No payroll records found."
          hideSearch
          onRowClick={(record) => handleOpenPayroll(record, 'preview')}
        />
      </div>

      {showFormModal ? (
        <PayrollFormModal
          employees={employees}
          form={form}
          setForm={setForm}
          onClose={() => setShowFormModal(false)}
          onGenerate={handleGeneratePayroll}
          preview={previewPayroll}
        />
      ) : null}

      {selectedPayroll ? (
        <PayrollReceipt
          payroll={selectedPayroll}
          onClose={() => setSelectedPayroll(null)}
        />
      ) : null}
    </div>
  );
};

export default PayrollPage;
