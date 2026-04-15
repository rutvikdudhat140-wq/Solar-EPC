// Universal DataTable   fully schema-driven, server-side pagination, column toggle, 3-dot menu, bulk actions

import React, { useState, useMemo, useRef, useCallback } from 'react';

import { Search, ChevronDown, ChevronUp, MoreHorizontal, ChevronLeft, ChevronRight, Eye, EyeOff, Check } from 'lucide-react';

import { cn } from '../../lib/utils';

import { Button } from './Button';

import { Input } from './Input';



/**

 * DataTable props:

 *  columns           [{ key, header, render?, sortable?, width? }]

 *  data              current page rows

 *  total             total records (server-side)

 *  page              current page (1-based)

 *  pageSize          rows per page

 *  onPageChange      (page) => void

 *  onPageSizeChange  (size) => void

 *  onSort            ({ key, dir }) => void

 *  search            string

 *  onSearch          (val) => void

 *  rowActions        [{ label, icon, onClick(row), danger?, show?: (row) => boolean }]

 *  bulkActions       [{ label, icon, onClick(selectedRows) }]

 *  loading           bool

 *  emptyText         string

 *  selectedRows      Set<id>

 *  onSelectRows      (Set) => void

 *  rowKey            field name (default 'id')

 *  toolbar           React node (injected right side of toolbar)

 */

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];



const DataTable = ({

    columns = [], data = [], total: propTotal = 0,

    page: propPage = 1, pageSize: propPageSize = 25,

    onPageChange: propOnPageChange, onPageSizeChange: propOnPageSizeChange,

    pagination, // Support old pagination object format

    onSort,

    search = '', onSearch,

    rowActions = [], bulkActions = [],

    loading = false, emptyText = 'No records found',

    selectedRows: controlledSelected,

    onSelectRows,

    rowKey = 'id',

    toolbar,

    className,

    sort: controlledSort,

    onRowClick,

    hideColumnToggle = false,

    hideSearch = false,

    expandedRowKey = null,      // key of the currently expanded row

    renderExpanded = null,      // (row) => ReactNode   content to show inside expanded row
    
    hiddenCols: controlledHiddenCols,  // Controlled hidden columns from parent
    
    onHiddenColsChange,        // Callback when columns are toggled

}) => {

    // Support both flat props and pagination object for backward compatibility

    const total = pagination?.total != null ? pagination.total : propTotal;

    const page = pagination?.page != null ? pagination.page : propPage;

    const pageSize = pagination?.pageSize != null ? pagination.pageSize : propPageSize;

    const onPageChange = pagination?.onChange != null ? pagination.onChange : propOnPageChange;

    const onPageSizeChange = pagination?.onPageSizeChange != null ? pagination.onPageSizeChange : propOnPageSizeChange;

    const [internalSort, setInternalSort] = useState({ key: null, dir: 'asc' });

    const [internalHiddenCols, setInternalHiddenCols] = useState(new Set());
    
    // Use controlled hiddenCols if provided, otherwise internal state
    const isControlledHiddenCols = controlledHiddenCols !== undefined;
    const hiddenCols = isControlledHiddenCols ? controlledHiddenCols : internalHiddenCols;
    const setHiddenCols = isControlledHiddenCols && onHiddenColsChange ? onHiddenColsChange : setInternalHiddenCols;

    const [openMenuIndex, setOpenMenuIndex] = useState(null);

    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    const menuRef = useRef(null);

    const buttonRefs = useRef({});

    const [colToggleOpen, setColToggleOpen] = useState(false);

    const [jumpPage, setJumpPage] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mobileView, setMobileView] = useState(false);



    const [internalSelected, setInternalSelected] = useState(new Set());

    const selectedRows = controlledSelected != null ? controlledSelected : internalSelected;

    const setSelected = onSelectRows != null ? onSelectRows : setInternalSelected;

    const selectionEnabled = useMemo(() => {
        return Boolean(onSelectRows != null || controlledSelected != null);
    }, [onSelectRows, controlledSelected]);



    // Use controlled sort if provided, otherwise use internal

    const isControlledSort = controlledSort !== undefined;

    const sort = isControlledSort ? controlledSort : internalSort;

    const setSort = isControlledSort ? null : setInternalSort;



    const visibleColumns = useMemo(() => columns.filter(c => !hiddenCols.has(c.key)), [columns, hiddenCols]);

    const totalPages = Math.ceil(total / pageSize) || 1;



    const buttonRef = useRef(null);



    // Standard rulebook actions to be injected if not present

    const standardActions = [];



    const allRowActions = useMemo(() => {

        const existingLabels = new Set(rowActions.map(a => a.label));

        const filteredStandards = standardActions.filter(a => !existingLabels.has(a.label));

        return [...rowActions, ...filteredStandards];

    }, [rowActions]);



    const handleSort = (key) => {

        if (!onSort) return;

        const dir = sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc';

        if (!isControlledSort) {

            setInternalSort({ key, dir });

        }

        onSort({ key, dir });

    };

    const getSortKey = useCallback((col) => col?.sortKey ?? col?.key, []);



    const handleJump = (e) => {

        if (e.key === 'Enter') {

            const p = parseInt(jumpPage);

            if (p >= 1 && p <= totalPages) {

                onPageChange?.(p);

                setJumpPage('');

            }

        }

    };



    const toggleCol = (key) => {
        // Create new Set based on current hiddenCols
        const next = new Set(hiddenCols);
        next.has(key) ? next.delete(key) : next.add(key);
        
        // Call the setter (either internal setState or parent callback)
        setHiddenCols(next);
    };



    const toggleRow = (id) => {

        setSelected(prev => {

            const next = new Set(prev);

            next.has(id) ? next.delete(id) : next.add(id);

            return next;

        });

    };



    const toggleAll = () => {

        if (selectedRows.size === data.length) setSelected(new Set());

        else setSelected(new Set(data.map(r => r[rowKey])));

    };



    const handleMenuOpen = useCallback((e, index) => {

        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();

        const menuWidth = 176;



        let left = rect.left - menuWidth - 8;

        let top = rect.top;



        if (left < 8) left = rect.right + 8;

        if (top + 200 > window.innerHeight) top = window.innerHeight - 200 - 8;

        if (top < 8) top = 8;



        setMenuPosition({ top, left });

        setOpenMenuIndex(openMenuIndex === index ? null : index);

    }, [openMenuIndex]);



    const handleMenuClose = useCallback(() => {

        setOpenMenuIndex(null);

    }, []);



    const SortIcon = ({ col }) => {

        const sortKey = getSortKey(col);

        if (sort.key !== sortKey) return <ChevronDown size={11} className="text-[var(--text-faint)] opacity-50" />;

        return sort.dir === 'asc'

            ? <ChevronUp size={11} className="text-[var(--primary)]" />

            : <ChevronDown size={11} className="text-[var(--primary)]" />;

    };



    return (

        <div className={cn('flex flex-col gap-3', className)}>

            {/*    Toolbar    */}

            <div className="flex items-center gap-2 flex-wrap">




                {/* Bulk actions */}

                {selectedRows.size > 0 && bulkActions.map(a => (

                    <Button key={a.label} size="sm" variant="secondary" onClick={() => a.onClick([...selectedRows])}>

                        {a.icon && <a.icon size={12} />} {a.label} ({selectedRows.size})

                    </Button>

                ))}



                <div className="ml-auto flex items-center gap-2">

                    {/* Search bar - LEFT of Columns button */}

                    {!hideSearch && onSearch !== undefined && (

                        <div className="relative w-48">

                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />

                            <Input

                                placeholder="Search "

                                value={search}

                                onChange={e => onSearch(e.target.value)}

                                className="pl-8 h-8 text-xs w-48"

                            />

                        </div>

                    )}
                    {toolbar}



                    {/* Column visibility toggle */}
                    {!hideColumnToggle && (
                        <div className="relative">

                            <Button size="sm" variant="secondary" onClick={() => setColToggleOpen(p => !p)}>

                                <Eye size={12} /> Columns

                            </Button>

                            {colToggleOpen && (

                                <>

                                    <div className="fixed inset-0 z-30" onClick={() => setColToggleOpen(false)} />

                                    <div className="absolute right-0 top-9 z-40 w-44 glass-card shadow-2xl shadow-black/40 py-1.5 animate-slide-up">

                                        {columns.map((col, idx) => (

                                            <button

                                                key={`${col.key}-${idx}`}

                                                onClick={() => toggleCol(col.key)}

                                                className="flex items-center justify-between w-full px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"

                                            >

                                                {col.header}

                                                {!hiddenCols.has(col.key)

                                                    ? <Check size={11} className="text-[var(--primary)]" />

                                                    : <EyeOff size={11} className="text-[var(--text-faint)]" />}

                                            </button>

                                        ))}

                                    </div>

                                </>

                            )}

                        </div>
                    )}

                </div>

            </div>



            {/*    Table    */}

            <div className="rounded-xl border border-[var(--border-base)] overflow-hidden">

                <div className="overflow-x-auto">

                    <table className="w-full !whitespace-nowrap border-collapse">

                        <thead>

                            <tr className="border-b border-[var(--border-base)] bg-[var(--bg-raised)]">

                                {selectionEnabled && (

                                    <th className="w-10 px-3 py-3 sticky left-0 z-10 bg-[var(--bg-raised)]">

                                        <input

                                            type="checkbox"

                                            checked={data.length > 0 && selectedRows.size === data.length}

                                            onChange={toggleAll}

                                            className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"

                                        />

                                    </th>

                                )}

                                {visibleColumns.map((col, idx) => (

                                    <th

                                        key={`${col.key}-${idx}`}

                                        className={cn(

                                            'px-3 py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] whitespace-nowrap',

                                            col.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)]'

                                        )}

                                        style={col.width ? { width: col.width } : undefined}

                                        onClick={() => col.sortable && handleSort(getSortKey(col))}

                                    >

                                        <span className="inline-flex items-center gap-1">

                                            {col.header}

                                            {col.sortable && <SortIcon col={col} />}

                                        </span>

                                    </th>

                                ))}

                                {allRowActions.length > 0 && (

                                    <th className="w-10 px-2 py-2.5 sticky right-0 z-10 bg-[var(--bg-raised)] border-l border-[var(--border-base)]" />

                                )}

                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                Array.from({ length: 5 }).map((_, i) => (

                                    <tr key={i} className="border-b border-[var(--border-base)]">

                                        {selectionEnabled && (

                                            <td className="px-3 py-3.5">

                                                <div className="h-3 rounded animate-shimmer" />

                                            </td>

                                        )}

                                        {visibleColumns.map(col => (

                                            <td key={`${i}-${col.key}`} className="px-4 py-3.5">

                                                <div className="h-3 rounded animate-shimmer" style={{ width: `${40 + Math.random() * 40}%` }} />

                                            </td>

                                        ))}

                                    </tr>

                                ))

                            ) : data.length === 0 ? (

                                <tr>

                                    <td colSpan={visibleColumns.length + (selectionEnabled ? 1 : 0) + (allRowActions.length ? 1 : 0)}

                                        className="text-center py-16 text-[var(--text-faint)] text-sm">

                                        {emptyText}

                                    </td>

                                </tr>

                            ) : data.map((row, index) => {
                                if (!row) return null;
                                return (
                                    <React.Fragment key={row[rowKey] || index}>
                                    <tr
                                        className="table-row border-b border-[var(--border-base)] last:border-0 group cursor-pointer bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus:ring-0"
                                        onClick={() => onRowClick?.(row)}
                                    >

                                        {selectionEnabled && (
                                            <td className="px-3 py-3.5 sticky left-0 z-10 bg-[var(--bg-surface)] group-hover:bg-[var(--bg-hover)] transition-colors"
                                                onClick={e => e.stopPropagation()}>

                                                <input

                                                    type="checkbox"

                                                    checked={selectedRows.has(row[rowKey])}

                                                    onChange={() => toggleRow(row[rowKey])}

                                                    className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"

                                                />

                                            </td>

                                        )}

                                        {visibleColumns.map((col, colIdx) => (

                                            <td key={`${row[rowKey] ?? index}-${col.key}-${colIdx}`} className="px-3 py-2 text-[12px] text-[var(--text-primary)] bg-[var(--bg-surface)] group-hover:bg-[var(--bg-hover)] transition-colors">

                                                {col.render ? col.render(row[col.key], row) : row[col.key] ?? ' '}

                                            </td>

                                        ))}

                                        {allRowActions.length > 0 && (

                                            <td

                                                className="px-2 py-2 sticky right-0 z-10 bg-[var(--bg-surface)] group-hover:bg-[var(--bg-hover)] transition-colors border-l border-[var(--border-base)]"

                                                onClick={e => e.stopPropagation()}

                                            >

                                                <button

                                                    ref={el => buttonRefs.current[index] = el}

                                                    onClick={e => handleMenuOpen(e, index)}

                                                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"

                                                >

                                                    <MoreHorizontal size={14} />

                                                </button>
                                            </td>

                                        )}

                                    </tr>

                                    {/*    Inline expanded detail row    */}
                                    {renderExpanded && expandedRowKey === (row[rowKey] || index) && (
                                        <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
                                            <td colSpan={visibleColumns.length + (selectionEnabled ? 1 : 0) + (allRowActions.length ? 1 : 0)} className="px-0 py-0">
                                                <div className="animate-fade-in">
                                                    {renderExpanded(row)}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/*    Floating Menu    */}

            {openMenuIndex !== null && data[openMenuIndex] && (

                <>

                    <div className="fixed inset-0 z-40" onClick={handleMenuClose} />

                    <div

                        ref={menuRef}

                        className="fixed z-50 w-44 glass-card shadow-2xl shadow-black/50 py-1.5 animate-slide-up"

                        style={{

                            top: `${menuPosition.top}px`,

                            left: `${menuPosition.left}px`,

                        }}

                    >

                        {allRowActions

                            .filter((a) => (typeof a.show === 'function' ? a.show(data[openMenuIndex]) : true))

                            .map((a, actionIdx) => (

                                <button

                                    key={`menu-${openMenuIndex}-${a.label}-${actionIdx}`}

                                    onClick={() => {

                                        a.onClick(data[openMenuIndex]);

                                        handleMenuClose();

                                    }}

                                    className={cn(

                                        'flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors',

                                        a.danger

                                            ? 'text-[var(--red)] hover:bg-[var(--red)]/10'

                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'

                                    )}

                                >

                                    {a.icon && <a.icon size={12} />} {a.label}

                                </button>

                            ))}

                    </div>

                </>

            )}



            {/*    Pagination    */}

            <div className="flex items-center justify-between gap-3 flex-wrap">

                <div className="flex items-center gap-4 text-[11px] text-[var(--text-faint)]">

                    <div className="flex items-center gap-2">

                        <span className='whitespace-nowrap'>Rows per page:</span>

                        <select

                            value={pageSize}

                            onChange={e => onPageSizeChange?.(Number(e.target.value))}

                            className="h-7 px-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-secondary)] text-[11px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"

                        >

                            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}

                        </select>

                    </div>



                    <div className="flex items-center gap-2">

                        <span>Jump to:</span>

                        <input

                            type="number"

                            value={jumpPage}

                            onChange={e => setJumpPage(e.target.value)}

                            onKeyDown={handleJump}

                            placeholder="Page "

                            className="w-12 h-7 px-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-secondary)] text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all"

                        />

                    </div>



                    <span>

                        {total === 0 ? '0' : `${(page - 1) * pageSize + 1} ${Math.min(page * pageSize, total)}`} of {total}

                    </span>

                </div>



                <div className="flex items-center gap-1">

                    <Button size="xs" variant="secondary" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>

                        <ChevronLeft size={12} />

                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {

                        let p;

                        if (totalPages <= 5) {

                            p = i + 1;

                        } else {

                            p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;

                        }

                        return (

                            <Button

                                key={p} size="xs"

                                variant={p === page ? 'primary' : 'secondary'}

                                onClick={() => onPageChange?.(p)}

                            >

                                {p}

                            </Button>

                        );

                    })}

                    <Button size="xs" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>

                        <ChevronRight size={12} />

                    </Button>

                </div>

            </div>

        </div>


    );

};



export default DataTable;
