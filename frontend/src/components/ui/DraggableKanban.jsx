import React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Brain, Clock, Zap, Sparkles } from 'lucide-react';

const ITEM_TYPE = 'KANBAN_CARD';

// Color map for status
const STATUS_CONFIG = {
  Pending: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Pending' },
  'In Progress': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'In Progress' },
  Active: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  Flagged: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Flagged' },
};

// Draggable Card Component - CRM Style
const KanbanCard = ({ item, onClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: item.id, status: item.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const prGood = item.pr && item.pr >= (item.expectedPR || 78);

  return (
    <div
      ref={drag}
      onClick={() => onClick(item)}
      className={`glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all ${isDragging ? 'opacity-50 scale-95' : ''
        }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
            {item.customer?.[0] || 'U'}
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[140px]">{item.customer}</p>
            <p className="text-[9px] text-[var(--text-muted)]">{item.site || 'Unknown'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {item.pr && item.pr < (item.expectedPR || 78) && (
            <div className="w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" title="PR Below Target" />
          )}
          {item.notes && (
            <Sparkles size={10} className="text-[var(--amber)]" title="Has notes" />
          )}
        </div>
      </div>

      {/* Card Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--accent)]">{item.systemSize} kW</span>
          <div className="flex items-center gap-1">
            <Zap size={8} className="text-[var(--text-muted)]" />
            <span className={`text-[9px] font-black ${prGood ? 'text-[var(--green)]' : 'text-[var(--amber)]'}`}>
              {item.pr || 0}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
            {item.id}
          </span>
          <span className="text-[9px] text-[var(--text-muted)]">•</span>
          <span className="text-[9px] text-[var(--text-muted)]">{item.inverterSerial ? 'Inv: ' + item.inverterSerial.slice(-4) : 'No serial'}</span>
        </div>

        {item.commissionDate && (
          <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
            <Clock size={8} />
            <span>{item.commissionDate}</span>
          </div>
        )}

        {/* Warranty Tags */}
        <div className="flex flex-wrap gap-1">
          {item.warrantyPanel && (
            <span className="px-1.5 py-0.5 rounded text-[8px] bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
              Panel
            </span>
          )}
          {item.warrantyInverter && (
            <span className="px-1.5 py-0.5 rounded text-[8px] bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Inverter
            </span>
          )}
          {item.warrantyInstall && (
            <span className="px-1.5 py-0.5 rounded text-[8px] bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/20">
              Install
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Droppable Column Component - CRM Style
const KanbanColumn = ({ status, items, onDrop, onCardClick }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (draggedItem) => {
      if (draggedItem.status !== status) {
        onDrop(draggedItem.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  const totalKW = items.reduce((sum, item) => sum + (item.systemSize || 0), 0);

  return (
    <div className="flex flex-col w-64 rounded-xl border transition-colors h-[600px]">
      {/* Column Header */}
      <div className="p-2.5 border-b border-[var(--border-base)]">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: config.color }} />
            <span className="text-xs font-semibold text-[var(--text-primary)]">{config.label}</span>
          </div>
          <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: config.bg, color: config.color }}>
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)] pl-4">
          <span>{items.length} systems</span><span>·</span><span>{totalKW} kW</span>
        </div>
      </div>

      {/* Column Body - scrollable, max 5 cards visible */}
      <div
        ref={drop}
        className={`flex flex-col gap-2 p-2 h-[500px] overflow-y-auto transition-colors ${isOver ? 'bg-[var(--primary)]/5' : ''
          }`}
      >
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} onClick={onCardClick} />
        ))}
        {items.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-[var(--text-faint)]">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Kanban Board - CRM Style Horizontal Scroll
export const DraggableKanban = ({ data, onStatusChange, onCardClick }) => {
  const columns = ['Pending', 'In Progress', 'Delayed', 'Completed'];

  const handleDrop = (cardId, newStatus) => {
    onStatusChange(cardId, newStatus);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Kanban Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Commissioning Pipeline</h3>
            <span className="text-xs text-[var(--text-muted)]">{data.length} total systems</span>
          </div>
        </div>

        {/* Kanban Board - White container with fixed height */}
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)] p-4 shadow-sm">
          <div className="overflow-x-auto pb-3 max-h-[calc(100vh-220px)]">
            <div className="flex gap-3 min-w-max">
              {columns.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  items={data.filter((item) => item.status === status)}
                  onDrop={handleDrop}
                  onCardClick={onCardClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default DraggableKanban;
