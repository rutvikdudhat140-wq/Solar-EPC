import React from 'react';
import { LayoutDashboard, Users, TrendingUp, DollarSign, Activity, Zap } from 'lucide-react';

// DashboardNew - Main Dashboard Component (Recreated after merge cleanup)
const DashboardNew = () => {
  const stats = [
    { label: 'Total Leads', value: '45', change: '+12%', icon: Users, color: 'bg-[var(--primary)]' },
    { label: 'Active Projects', value: '18', change: '+5%', icon: Zap, color: 'bg-amber-500' },
    { label: 'Revenue', value: '₹21L', change: '+8%', icon: DollarSign, color: 'bg-green-500' },
    { label: 'Conversion', value: '24%', change: '+2%', icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Overview of your solar EPC operations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Activity size={16} />
          <span>Last updated: Just now</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-card p-5 rounded-xl border border-[var(--border-base)] hover:border-[var(--primary)]/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</p>
                  <span className="text-xs text-[var(--green)] font-medium">{stat.change}</span>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.color}/20 flex items-center justify-center`}>
                  <Icon size={20} className={`${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6 rounded-xl border border-[var(--border-base)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {['New Lead', 'Create Quotation', 'Schedule Survey', 'Add Project'].map((action) => (
            <button
              key={action}
              className="px-4 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors text-sm font-medium"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Placeholder for more dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl border border-[var(--border-base)] min-h-[300px]">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Recent Leads</h3>
          <p className="text-sm text-[var(--text-muted)]">No recent leads to display</p>
        </div>
        <div className="glass-card p-6 rounded-xl border border-[var(--border-base)] min-h-[300px]">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Project Pipeline</h3>
          <p className="text-sm text-[var(--text-muted)]">No active projects to display</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardNew;
