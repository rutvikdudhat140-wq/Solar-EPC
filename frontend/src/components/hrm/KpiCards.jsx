import React from 'react';
import { TrendingUp, Users, AlertTriangle, Wallet, Activity, CheckCircle, Clock, Calendar, CreditCard, Flame } from 'lucide-react';

const CURRENCY = {
  format: (value) => {
    if (value === null || value === undefined || value === 0) return ' ';
    return ` ${Number(value).toLocaleString('en-IN')}`;
  }
};

const KpiCards = ({ role, metrics }) => {
  console.log('[KpiCards] role:', role, 'metrics:', metrics);
  
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[var(--bg-elevated)] rounded-xl p-5 border border-[var(--border)] animate-pulse">
            <div className="h-4 bg-[var(--border)] rounded w-24 mb-3"></div>
            <div className="h-8 bg-[var(--border)] rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (Object.keys(metrics).length === 0) {
    return (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
        <strong>Debug:</strong> Metrics received but empty. Role: {role}
      </div>
    );
  }

  // Admin KPIs
  if (role === 'admin' || role === 'ADMIN') {
    const { attendance, leaves, payroll, employees, alerts } = metrics;
    
    const kpiData = [
      {
        title: "Workforce Status",
        value: `${attendance?.percentage || 0}%`,
        subtext: `${attendance?.presentToday || 0}/${attendance?.totalToday || 0} present today`,
        color: 'blue',
        icon: Users,
        tags: attendance?.percentage >= 90 ? ['Excellent'] : attendance?.percentage >= 75 ? ['Good'] : ['Needs attention'],
      },
      {
        title: "Action Required",
        value: (leaves?.pending || 0) + (payroll?.unpaidCount || 0),
        subtext: `${leaves?.pending || 0} leaves + ${payroll?.unpaidCount || 0} payrolls`,
        color: 'amber',
        icon: AlertTriangle,
        tags: (leaves?.pending || 0) + (payroll?.unpaidCount || 0) > 0 ? ['Pending'] : ['All clear'],
      },
      {
        title: "Cost Pulse",
        value: CURRENCY.format(payroll?.totalPayroll || 0),
        subtext: payroll?.lastMonthComparison ? `${payroll.lastMonthComparison > 0 ? '+' : ''}${payroll.lastMonthComparison}% vs last month` : 'This month',
        color: 'purple',
        icon: Wallet,
        tags: ['Monthly payroll'],
      },
      {
        title: "Risk Alerts",
        value: employees?.atRiskCount || 0,
        subtext: employees?.atRiskCount > 0 ? 'Employees with issues' : 'No issues detected',
        color: employees?.atRiskCount > 0 ? 'red' : 'emerald',
        icon: Activity,
        tags: employees?.atRiskCount > 0 ? ['Attention needed'] : ['All safe'],
      },
    ];

    const colorMap = {
      blue: { from: 'from-blue-100', to: 'to-sky-200', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-200', iconColor: 'text-blue-700', tagBg: 'bg-blue-100', tagText: 'text-blue-700' },
      emerald: { from: 'from-emerald-100', to: 'to-green-200', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-200', iconColor: 'text-emerald-700', tagBg: 'bg-emerald-100', tagText: 'text-emerald-700' },
      amber: { from: 'from-amber-100', to: 'to-orange-200', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-200', iconColor: 'text-amber-700', tagBg: 'bg-amber-100', tagText: 'text-amber-700' },
      red: { from: 'from-red-100', to: 'to-rose-200', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-200', iconColor: 'text-red-700', tagBg: 'bg-red-100', tagText: 'text-red-700' },
      purple: { from: 'from-violet-100', to: 'to-purple-200', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-200', iconColor: 'text-violet-700', tagBg: 'bg-violet-100', tagText: 'text-violet-700' },
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi, index) => {
          const colors = colorMap[kpi.color] || colorMap.blue;
          return (
            <div
              key={index}
              className={`group relative overflow-hidden bg-gradient-to-br ${colors.from} ${colors.to} border ${colors.border} rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:shadow-${kpi.color}-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${colors.text} font-bold`}>{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{kpi.value}</p>
                  <p className={`text-xs text-gray-600 mt-1 flex items-center gap-1`}>
                    {kpi.subtext}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <kpi.icon size={24} className={colors.iconColor} />
                </div>
              </div>
              <div className="relative mt-3 flex gap-2 flex-wrap">
                {kpi.tags.map((tag, i) => (
                  <span key={i} className={`text-[10px] px-2 py-1 ${colors.tagBg} rounded ${colors.tagText} font-medium`}>{tag}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Employee KPIs
  if (role === 'employee' || role === 'EMPLOYEE') {
    const { attendance, leaves, payroll, alerts } = metrics;
    
    const kpiData = [
      {
        title: "Today's Status",
        value: attendance?.todayStatus === 'present' ? 'Present' : 
               attendance?.todayStatus === 'absent' ? 'Absent' : 
               attendance?.todayStatus === 'late' ? 'Late' : 'Not marked',
        subtext: attendance?.checkIn ? `Checked in at ${new Date(attendance.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'No check-in recorded',
        color: attendance?.todayStatus === 'present' ? 'emerald' : attendance?.todayStatus === 'late' ? 'amber' : 'red',
        icon: CheckCircle,
        tags: attendance?.todayStatus === 'present' ? ['On time'] : ['Action needed'],
      },
      {
        title: "My Performance",
        value: `${attendance?.percentage || 0}%`,
        subtext: attendance?.percentage >= 90 ? 'Excellent!' : attendance?.percentage >= 75 ? 'Good, keep it up!' : 'Needs improvement',
        color: attendance?.percentage >= 90 ? 'emerald' : attendance?.percentage >= 75 ? 'blue' : 'amber',
        icon: Flame,
        tags: [attendance?.percentage >= 90 ? 'Excellent' : 'Keep trying'],
      },
      {
        title: "Leave Balance",
        value: leaves?.balance || 0,
        subtext: `${leaves?.used || 0} used this month`,
        color: (leaves?.balance || 0) > 10 ? 'emerald' : (leaves?.balance || 0) > 5 ? 'blue' : 'amber',
        icon: Calendar,
        tags: [`${leaves?.pending || 0} pending`],
      },
      {
        title: "Salary Status",
        value: payroll?.status === 'paid' ? 'Paid' : 'Pending',
        subtext: payroll?.netSalary ? CURRENCY.format(payroll.netSalary) : 'Not generated',
        color: payroll?.status === 'paid' ? 'emerald' : 'amber',
        icon: CreditCard,
        tags: payroll?.status === 'paid' ? ['Received'] : ['Awaiting'],
      },
    ];

    const colorMap = {
      blue: { from: 'from-blue-100', to: 'to-sky-200', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-200', iconColor: 'text-blue-700', tagBg: 'bg-blue-100', tagText: 'text-blue-700' },
      emerald: { from: 'from-emerald-100', to: 'to-green-200', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-200', iconColor: 'text-emerald-700', tagBg: 'bg-emerald-100', tagText: 'text-emerald-700' },
      amber: { from: 'from-amber-100', to: 'to-orange-200', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-200', iconColor: 'text-amber-700', tagBg: 'bg-amber-100', tagText: 'text-amber-700' },
      red: { from: 'from-red-100', to: 'to-rose-200', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-200', iconColor: 'text-red-700', tagBg: 'bg-red-100', tagText: 'text-red-700' },
      purple: { from: 'from-violet-100', to: 'to-purple-200', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-200', iconColor: 'text-violet-700', tagBg: 'bg-violet-100', tagText: 'text-violet-700' },
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi, index) => {
          const colors = colorMap[kpi.color] || colorMap.blue;
          return (
            <div
              key={index}
              className={`group relative overflow-hidden bg-gradient-to-br ${colors.from} ${colors.to} border ${colors.border} rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:shadow-${kpi.color}-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${colors.text} font-bold`}>{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{kpi.value}</p>
                  <p className={`text-xs text-gray-600 mt-1 flex items-center gap-1`}>
                    {kpi.subtext}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <kpi.icon size={24} className={colors.iconColor} />
                </div>
              </div>
              <div className="relative mt-3 flex gap-2 flex-wrap">
                {kpi.tags.map((tag, i) => (
                  <span key={i} className={`text-[10px] px-2 py-1 ${colors.tagBg} rounded ${colors.tagText} font-medium`}>{tag}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};

export default KpiCards;