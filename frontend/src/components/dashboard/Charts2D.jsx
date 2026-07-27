// Professional 2D Charts Component - Solar OS Dashboard
// Grid, dots, column charts with proper names and labels
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart,
  ScatterChart, Scatter, ZAxis, ReferenceLine, LabelList
} from 'recharts';

// Colors palette
const COLORS = {
  blue: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  cyan: ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75'],
  green: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  amber: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  purple: ['#a855f7', '#9333ea', '#7c3aed', '#6d28d9', '#5b21b6'],
  red: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  pink: ['#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
  orange: ['#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  multi: ['#3b82f6', '#22d3ee', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#ec4899', '#f97316']
};

const chartTooltipStyle = {
  backgroundColor: 'var(--bg-raised)',
  border: '1px solid var(--border-base)',
  borderRadius: '8px',
  color: 'var(--text-primary)'
};

//                                                                                
// 1. PROJECT PIPELINE - Column Chart with Grid and Dots
//                                                                                
export function ProjectPipeline2D({ data, height = 320 }) {
  return (
    <div className="w-full h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
            angle={-30}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
          />
          <Tooltip 
            contentStyle={chartTooltipStyle}
            formatter={(value, name) => [value, 'Count']}
            labelFormatter={(label) => `Stage: ${label}`}
          />
          <Bar 
            dataKey="value" 
            fill="url(#pipelineGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          >
            <LabelList dataKey="value" position="top" fill="var(--text-primary)" fontSize={12} />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || COLORS.multi[index % COLORS.multi.length]} />
            ))}
          </Bar>
          <defs>
            <linearGradient id="pipelineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

//                                                                                
// 2. INSTALLATION STATUS - Simple Clean Column Chart with Grid
//                                                                                
export function InstallationStatus2D({ data, height = 320 }) {
  return (
    <div className="w-full h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={true} horizontal={true} />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-muted)" 
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
            interval={0}
            height={50}
          />
          <YAxis 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
          />
          <Tooltip 
            contentStyle={chartTooltipStyle}
            formatter={(value) => [`${value} Projects`, 'Count']}
            labelFormatter={(label) => `Status: ${label}`}
          />
          <Bar 
            dataKey="value" 
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          >
            <LabelList dataKey="value" position="top" fill="var(--text-primary)" fontSize={13} fontWeight="bold" />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || COLORS.cyan[index % COLORS.cyan.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Simple Legend Below */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-3 justify-center">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-base)]">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.fill || COLORS.cyan[i] }} />
            <span className="text-sm text-[var(--text-muted)] font-medium">{item.name}: <strong className="text-[var(--text-primary)]">{item.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

//                                                                                
// 3. SERVICE TICKETS - Horizontal Bar Chart
//                                                                                
export function ServiceTickets2D({ data, height = 320 }) {
  return (
    <div className="w-full h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 20, right: 50, left: 80, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="var(--text-muted)" 
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
            width={70}
          />
          <Tooltip 
            contentStyle={chartTooltipStyle}
            formatter={(value) => [value, 'Tickets']}
          />
          <Bar 
            dataKey="value" 
            radius={[0, 6, 6, 0]}
            maxBarSize={35}
          >
            <LabelList dataKey="value" position="right" fill="var(--text-primary)" fontSize={12} />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || COLORS.red[index % COLORS.red.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

//                                                                                
// 4. QUOTATION STATUS - Pie Chart with Labels
//                                                                                
export function QuotationStatus2D({ data, height = 320 }) {
  return (
    <div className="w-full h-full relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
            labelLine={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || COLORS.green[index % COLORS.green.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={chartTooltipStyle}
            formatter={(value, name) => [value, name]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Label */}
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-2xl font-bold text-[var(--text-primary)]">
          {data.reduce((sum, d) => sum + d.value, 0)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Total</p>
      </div>
    </div>
  );
}

//                                                                                
// 5. PROCUREMENT STATUS - Side by Side Column Chart (NOT stacked)
//                                                                                
export function ProcurementStatus2D({ data, height = 320 }) {
  return (
    <div className="w-full h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-muted)" 
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
            height={50}
          />
          <YAxis 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
          />
          <Tooltip 
            contentStyle={chartTooltipStyle}
            formatter={(value, name) => [value, 'Count']}
            labelFormatter={(label) => `Status: ${label}`}
          />
          <Bar 
            dataKey="value" 
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          >
            <LabelList dataKey="value" position="top" fill="var(--text-primary)" fontSize={12} fontWeight="bold" />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || COLORS.orange[index % COLORS.orange.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Summary Stats Below */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 justify-center">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-elevated)] rounded border border-[var(--border-base)]">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.fill || COLORS.orange[i] }} />
            <span className="text-xs text-[var(--text-muted)]">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

//                                                                                
// 6. INVENTORY BY CATEGORY - Grouped Column Chart with Dots
//                                                                                
export function InventoryCategory2D({ data, height = 320 }) {
  return (
    <div className="w-full h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
            angle={-30}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-base)' }}
          />
          <Tooltip 
            contentStyle={chartTooltipStyle}
            formatter={(value) => [value, 'Quantity']}
          />
          <Bar 
            dataKey="value" 
            radius={[6, 6, 0, 0]}
            maxBarSize={45}
          >
            <LabelList dataKey="value" position="top" fill="var(--text-primary)" fontSize={12} />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || COLORS.purple[index % COLORS.purple.length]} />
            ))}
          </Bar>
          <Scatter dataKey="value" fill="var(--primary)">
            {data.map((entry, index) => (
              <Cell key={`scatter-${index}`} fill="#fff" />
            ))}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Category Names Below */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 justify-center">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-elevated)] rounded">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.fill || COLORS.purple[i] }} />
            <span className="text-xs text-[var(--text-muted)]">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Backward compatibility
export const DonutChart3D = QuotationStatus2D;
export const BarChart3D = InventoryCategory2D;

export default { 
  ProjectPipeline2D, 
  InstallationStatus2D, 
  QuotationStatus2D, 
  ServiceTickets2D, 
  ProcurementStatus2D, 
  InventoryCategory2D,
  DonutChart3D,
  BarChart3D
};
