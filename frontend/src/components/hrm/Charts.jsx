import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const Charts = ({ role, metrics }) => {
  if (!metrics) return null;

  const COLORS = {
    present: '#22c55e',
    absent: '#ef4444',
    late: '#f59e0b',
    halfDay: '#3b82f6',
  };

  // Admin Charts
  if (role === 'admin' || role === 'ADMIN') {
    const { attendance } = metrics;
    const weeklyTrend = attendance?.weeklyTrend || [];
    
    const pieData = [
      { name: 'Present', value: attendance?.presentToday || 0, color: COLORS.present },
      { name: 'Absent', value: attendance?.absentToday || 0, color: COLORS.absent },
      { name: 'Late', value: attendance?.lateToday || 0, color: COLORS.late },
      { name: 'Half Day', value: attendance?.halfDayToday || 0, color: COLORS.halfDay },
    ].filter(d => d.value > 0);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Attendance Trend Chart */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Attendance Trend (Last 7 Days)
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value}%`, 'Attendance']}
                />
                <Area 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorAttendance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Distribution Chart */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Today's Attendance Distribution
          </h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs text-[var(--text-muted)]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Employee Charts
  if (role === 'employee' || role === 'EMPLOYEE') {
    const { attendance } = metrics;
    const monthlyTrend = attendance?.monthlyTrend || [];
    
    // Calculate leave distribution (simplified)
    const leaveData = [
      { name: 'Present', value: attendance?.presentDays || 0, color: COLORS.present },
      { name: 'Absent', value: attendance?.absentDays || 0, color: COLORS.absent },
      { name: 'Late', value: attendance?.lateDays || 0, color: COLORS.late },
    ].filter(d => d.value > 0);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* My Attendance Trend */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            My Attendance (Last 30 Days)
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend.slice(-30)}>
                <defs>
                  <linearGradient id="colorMyAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }} 
                  axisLine={false}
                  tickFormatter={(value) => new Date(value).getDate()}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [value === 'present' ? 'Present' : value === 'absent' ? 'Absent' : value === 'late' ? 'Late' : 'No Record', 'Status']}
                />
                <Area 
                  type="monotone" 
                  dataKey="status"
                  stroke="#22c55e" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorMyAttendance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* My Status Distribution */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-5 border border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            My Attendance Breakdown
          </h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            {leaveData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs text-[var(--text-muted)]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Charts;
