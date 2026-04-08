import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Flame, Info } from 'lucide-react';

const Alerts = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
        <CheckCircle size={20} className="text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-400">All Good!</p>
          <p className="text-xs text-[var(--text-muted)]">No alerts or issues detected</p>
        </div>
      </div>
    );
  }

  const getAlertStyles = (type) => {
    const styles = {
      critical: 'bg-red-500/10 border-red-500/20 text-red-400',
      warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      positive: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    };
    return styles[type] || styles.info;
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return <XCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500" />;
      case 'positive':
        return <Flame size={18} className="text-emerald-500" />;
      default:
        return <Info size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <Clock size={16} className="text-[var(--primary)]" />
        Alerts & Notifications
      </h3>
      <div className="grid gap-2">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${getAlertStyles(alert.type)}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{alert.emoji}</span>
              <span className={alert.type === 'critical' ? 'text-red-400' : alert.type === 'warning' ? 'text-amber-400' : alert.type === 'positive' ? 'text-emerald-400' : 'text-blue-400'}>
                {alert.message}
              </span>
            </div>
            {alert.priority === 'high' && (
              <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">High Priority</span>
            )}
            {alert.priority === 'medium' && (
              <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">Medium</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Alerts;
