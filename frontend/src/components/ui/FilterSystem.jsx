import React, { useState } from 'react';
import { Plus, X, Save, Share2, Filter, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { Input } from './Input';

/**
 * FilterSystem Props:
 *  fields: [{ id, label, type, options? }]
 *  onApply: (filters) => void
 *  onSavePreset: (name, filters) => void
 *  presets: [{ name, filters }]
 */
const FilterSystem = ({ fields = [], onApply, onSavePreset, presets = [], className, isExpanded: externalExpanded, onToggle, onSearch }) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
    const setIsExpanded = (val) => {
        if (onToggle) {
            onToggle(val);
        } else {
            setInternalExpanded(val);
        }
    };

    const [conditions, setConditions] = useState([
        { id: Date.now(), field: fields[0]?.id, operator: 'equals', value: '', logic: 'AND' }
    ]);
    const [presetName, setPresetName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        onSearch?.(value);
    };

    const clearSearch = () => {
        setSearchTerm('');
        onSearch?.('');
    };

    const addCondition = () => {
        setConditions([...conditions, { id: Date.now(), field: fields[0]?.id, operator: 'equals', value: '', logic: 'AND' }]);
    };

    const removeCondition = (id) => {
        if (conditions.length === 1) return;
        setConditions(conditions.filter(c => c.id !== id));
    };

    const updateCondition = (id, updates) => {
        setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const handleApply = () => {
        onApply?.(conditions);
    };

    const handleSave = () => {
        if (!presetName) return;
        onSavePreset?.(presetName, conditions);
        setPresetName('');
    };

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <div className="flex items-center justify-between">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(isExpanded && 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30')}
                >
                    <Filter size={14} />
                    Advanced Filters
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </Button>

                {presets.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {presets.map((p, idx) => (
                            <button
                                key={`${p.name}-${idx}`}
                                onClick={() => { setConditions(p.filters); onApply?.(p.filters); }}
                                className="px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[10px] font-bold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap"
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="glass-card p-5 animate-slide-up space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                        <Input
                            placeholder="Search across all fields..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-10 pr-10"
                        />
                        {searchTerm && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {conditions.map((c, index) => (
                            <div key={c.id} className="flex items-center gap-2">
                                {index > 0 && (
                                    <select
                                        value={c.logic}
                                        onChange={e => updateCondition(c.id, { logic: e.target.value })}
                                        className="w-20 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
                                    >
                                        <option value="AND">AND</option>
                                        <option value="OR">OR</option>
                                    </select>
                                )}

                                <select
                                    value={c.field}
                                    onChange={e => updateCondition(c.id, { field: e.target.value })}
                                    className="flex-1 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
                                >
                                    {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                </select>

                                <select
                                    value={c.operator}
                                    onChange={e => updateCondition(c.id, { operator: e.target.value })}
                                    className="w-32 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
                                >
                                    <option value="equals">Equals</option>
                                    <option value="contains">Contains</option>
                                    <option value="gt">Greater Than</option>
                                    <option value="lt">Less Than</option>
                                    <option value="between">Between</option>
                                </select>

                                <Input
                                    className="flex-1 h-9 text-xs"
                                    placeholder="Value..."
                                    value={c.value}
                                    onChange={e => updateCondition(c.id, { value: e.target.value })}
                                />

                                <button
                                    onClick={() => removeCondition(c.id)}
                                    className="p-2 text-[var(--red)] hover:bg-[var(--red)]/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-base)]">
                        <Button variant="ghost" size="sm" onClick={addCondition}>
                            <Plus size={14} /> Add Condition
                        </Button>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 border-r border-[var(--border-base)] pr-3 mr-1">
                                <Input
                                    className="w-40 h-8 text-[11px]"
                                    placeholder="Preset Name..."
                                    value={presetName}
                                    onChange={e => setPresetName(e.target.value)}
                                />
                                <Button variant="secondary" size="xs" onClick={handleSave} disabled={!presetName}>
                                    <Save size={12} /> Save
                                </Button>
                            </div>

                            <Button variant="outline" size="sm" onClick={() => { setConditions([{ id: Date.now(), field: fields[0]?.id, operator: 'equals', value: '', logic: 'AND' }]); onApply?.([]); }}>
                                Clear All
                            </Button>
                            <Button size="sm" onClick={handleApply}>
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterSystem;
