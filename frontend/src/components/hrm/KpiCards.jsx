import React from 'react';
import { TrendingUp, TrendingDown, Users, Clock, Wallet, AlertTriangle, CheckCircle, Calendar, Flame, Activity, CreditCard, PieChart } from 'lucide-react';

const CURRENCY = {
  format: (value) => {
    if (value === null || value === undefined || value === 0) return '—';
    return `₹${Number(value).toLocaleString('en-IN')}`;
  }
};

const KpiCards = ({ role, metrics }) => {
  // Debug output
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

  // If metrics exists but is empty, show debug info
  if (Object.keys(metrics).length === 0) {
    return (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
        <strong>Debug:</strong> Metrics received but empty. Role: {role}
      </div>
    );
  }

  const getCardStyle = (color) => {
    const styles = {
      green: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
      red: 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20',
      yellow: 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20',
      blue: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20',
      purple: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20',
    };
    return styles[color] || styles.blue;
  };

  // Admin KPIs
  if (role === 'admin' || role === 'ADMIN') {
    const { attendance, leaves, payroll, employees, alerts } = metrics;
    
    const kpiData = [
      {
        title: "Workforce Status",
        value: `${attendance?.percentage || 0}%`,
        subtext: `${attendance?.presentToday || 0}/${attendance?.totalToday || 0} present today`,
        trend: attendance?.percentage >= 90 ? 'up' : attendance?.percentage >= 75 ? 'neutral' : 'down',
        color: attendance?.percentage >= 90 ? 'green' : attendance?.percentage >= 75 ? 'blue' : 'yellow',
        icon: Users,
        emotion: attendance?.percentage >= 90 ? '🔥' : attendance?.percentage >= 75 ? '👍' : '⚠️',
      },
      {
        title: "Action Required",
        value: (leaves?.pending || 0) + (payroll?.unpaidCount || 0),
        subtext: `${leaves?.pending || 0} leaves + ${payroll?.unpaidCount || 0} payrolls pending`,
        trend: (leaves?.pending || 0) + (payroll?.unpaidCount || 0) > 0 ? 'down' : 'up',
        color: (leaves?.pending || 0) + (payroll?.unpaidCount || 0) > 5 ? 'red' : (leaves?.pending || 0) + (payroll?.unpaidCount || 0) > 0 ? 'yellow' : 'green',
        icon: AlertTriangle,
        emotion: (leaves?.pending || 0) + (payroll?.unpaidCount || 0) > 0 ? '⏰' : '✅',
      },
      {
        title: "Cost Pulse",
        value: CURRENCY.format(payroll?.totalPayroll || 0),
        subtext: payroll?.lastMonthComparison ? `${payroll.lastMonthComparison > 0 ? '+' : ''}${payroll.lastMonthComparison}% vs last month` : 'This month',
        trend: (payroll?.lastMonthComparison || 0) > 10 ? 'down' : 'up',
        color: 'purple',
        icon: Wallet,
        emotion: '💰',
      },
      {
        title: "Risk Alerts",
        value: employees?.atRiskCount || 0,
        subtext: employees?.atRiskCount > 0 ? 'Employees with attendance issues' : 'No issues detected',
        trend: employees?.atRiskCount > 0 ? 'down' : 'up',
        color: employees?.atRiskCount > 0 ? 'red' : 'green',
        icon: Activity,
        emotion: employees?.atRiskCount > 0 ? '🚨' : '✅',
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl p-5 border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${getCardStyle(kpi.color)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{kpi.title}</p>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpi.value}</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">{kpi.emotion}</span>
                <kpi.icon size={20} className="text-[var(--text-muted)] opacity-60" />
              </div>
            </div>
            
            <p className="text-sm text-[var(--text-secondary)]">{kpi.subtext}</p>
            
            {kpi.trend && (
              <div className="flex items-center gap-1 mt-2">
                {kpi.trend === 'up' ? (
                  <TrendingUp size={14} className="text-emerald-500" />
                ) : kpi.trend === 'down' ? (
                  <TrendingDown size={14} className={kpi.color === 'green' ? 'text-emerald-500' : 'text-red-500'} />
                ) : null}
                <span className={`text-xs ${kpi.trend === 'up' ? 'text-emerald-500' : kpi.trend === 'down' ? (kpi.color === 'green' ? 'text-emerald-500' : 'text-red-500') : 'text-[var(--text-muted)]'}`}>
                  {kpi.trend === 'up' ? 'Good' : kpi.trend === 'down' ? 'Needs attention' : 'Stable'}
                </span>
              </div>
            )}
          </div>
        ))}
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
        trend: attendance?.todayStatus === 'present' ? 'up' : 'down',
        color: attendance?.todayStatus === 'present' ? 'green' : attendance?.todayStatus === 'late' ? 'yellow' : 'red',
        icon: CheckCircle,
        emotion: attendance?.todayStatus === 'present' ? '✅' : '⚠️',
      },
      {
        title: "My Performance",
        value: `${attendance?.percentage || 0}%`,
        subtext: attendance?.percentage >= 90 ? 'Excellent attendance!' : 
                 attendance?.percentage >= 75 ? 'Good, keep it up!' : 
                 'Needs improvement',
        trend: attendance?.percentage >= 75 ? 'up' : 'down',
        color: attendance?.percentage >= 90 ? 'green' : attendance?.percentage >= 75 ? 'blue' : 'yellow',
        icon: Flame,
        emotion: attendance?.percentage >= 90 ? '🔥' : attendance?.percentage >= 75 ? '👍' : '⚠️',
      },
      {
        title: "Leave Balance",
        value: leaves?.balance || 0,
        subtext: `${leaves?.used || 0} used this month • ${leaves?.pending || 0} pending`,
        trend: (leaves?.balance || 0) > 5 ? 'up' : 'neutral',
        color: (leaves?.balance || 0) > 10 ? 'green' : (leaves?.balance || 0) > 5 ? 'blue' : 'yellow',
        icon: Calendar,
        emotion: '📅',
      },
      {
        title: "Salary Status",
        value: payroll?.status === 'paid' ? 'Paid' : 'Pending',
        subtext: payroll?.netSalary ? CURRENCY.format(payroll.netSalary) : 'Not generated',
        trend: payroll?.status === 'paid' ? 'up' : 'neutral',
        color: payroll?.status === 'paid' ? 'green' : 'yellow',
        icon: CreditCard,
        emotion: payroll?.status === 'paid' ? '💰' : '⏳',
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl p-5 border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${getCardStyle(kpi.color)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{kpi.title}</p>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpi.value}</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">{kpi.emotion}</span>
                <kpi.icon size={20} className="text-[var(--text-muted)] opacity-60" />
              </div>
            </div>
            
            <p className="text-sm text-[var(--text-secondary)]">{kpi.subtext}</p>
            
            {kpi.trend && (
              <div className="flex items-center gap-1 mt-2">
                {kpi.trend === 'up' ? (
                  <TrendingUp size={14} className="text-emerald-500" />
                ) : kpi.trend === 'down' ? (
                  <TrendingDown size={14} className="text-red-500" />
                ) : null}
                <span className={`text-xs ${kpi.trend === 'up' ? 'text-emerald-500' : kpi.trend === 'down' ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                  {kpi.trend === 'up' ? 'On track' : kpi.trend === 'down' ? 'Needs attention' : 'Stable'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default KpiCards;
