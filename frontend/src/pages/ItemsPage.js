// Solar OS †â€™“ EPC Edition †â€™ItemsPage.js
import React, { useState, useMemo, useEffect } from 'react';
import {
 List, Plus, Search, Download, Trash2, Package, Tag,
 ChevronDown, X, Check, MoreHorizontal, Edit2, Copy, Eye
} from 'lucide-react';
import apiClient, { api } from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { toast } from '../components/ui/Toast';

const fmt = CURRENCY.format;

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';
const TENANT_ID = 'solarcorp';

// Tax options
const TAX_OPTIONS = [
 { value: 0, label: 'No Tax' },
 { value: 5, label: 'GST 5%' },
 { value: 12, label: 'GST 12%' },
 { value: 18, label: 'GST 18%' },
 { value: 28, label: 'GST 28%' },
];

const UNIT_OPTIONS = [
 'PCS', 'SET', 'KG', 'MTR', 'LTR', 'BOX', 'BAG', 'ROLL', 'PAIR', 'DOZEN'
];

const ITEM_GROUPS = [
 { id: '1', name: 'Services' },
 { id: '2', name: 'Products' },
 { id: '3', name: 'Materials' },
 { id: '4', name: 'Labor' },
];

// Default categories - will be stored in localStorage and can be extended
const DEFAULT_CATEGORIES = [
 'Panel', 'Inverter', 'BOS', 'Battery', 'Mounting', 'Electrical', 'Services', 'Labor'
];

const ITEM_COLUMNS = [
 {
 key: 'description',
 header: 'Description',
 sortable: true,
 render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span>
 },
 {
 key: 'longDescription',
 header: 'Long Description',
 render: v => <span className="text-xs text-[var(--text-muted)] line-clamp-2 max-w-xs">{v || '†â€™'}</span>
 },
 {
 key: 'rate',
 header: 'Rate',
 sortable: true,
 render: v => <span className="text-xs font-bold text-[var(--text-primary)]">${v?.toFixed(2)}</span>
 },
 {
 key: 'tax1',
 header: 'Tax 1',
 render: v => <span className="text-xs text-[var(--text-muted)]">{v ? `${v}%` : '0.00%'}</span>
 },
 {
 key: 'tax2',
 header: 'Tax 2',
 render: v => <span className="text-xs text-[var(--text-muted)]">{v ? `${v}%` : '0.00%'}</span>
 },
 {
 key: 'unit',
 header: 'Unit',
 render: v => <span className="text-xs text-[var(--text-secondary)]">{v || '†â€™'}</span>
 },
 {
 key: 'itemGroupName',
 header: 'Group Name',
 render: v => <span className="text-xs text-[var(--text-secondary)]">{v || '†â€™'}</span>
 },
];

const ItemsPage = () => {
 const [items, setItems] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
 const [selectedRows, setSelectedRows] = useState(new Set());

 // Modals
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDetailModal, setShowDetailModal] = useState(false);
 const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
 const [showCategoryModal, setShowCategoryModal] = useState(false);
 const [editingItem, setEditingItem] = useState(null);
 const [selectedItem, setSelectedItem] = useState(null);

 // Categories state - load from localStorage or use defaults
 const [categories, setCategories] = useState(() => {
 const saved = localStorage.getItem('itemCategories');
 return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
 });
 const [newCategory, setNewCategory] = useState('');
 const [editingCategory, setEditingCategory] = useState(null);
 const [editCategoryValue, setEditCategoryValue] = useState('');

 // Form state
 const [newItem, setNewItem] = useState({
 itemId: '',
 description: '',
 longDescription: '',
 category: '',
 warehouse: '',
 unit: 'PCS',
 stock: 0,
 minStock: 0,
 rate: '',
 tax1: 0,
 tax2: 0,
 itemGroupId: '',
 itemGroupName: ''
 });

 // Save categories to localStorage whenever they change
 useEffect(() => {
 localStorage.setItem('itemCategories', JSON.stringify(categories));
 }, [categories]);

 // Fetch items
 useEffect(() => {
 fetchItems();
 }, []);

 const fetchItems = async () => {
 try {
 setLoading(true);
 const data = await api.get('/items', { tenantId: TENANT_ID });
 console.log('Raw API response:', data);

 // Handle different response formats
 let itemsArray = [];
 if (Array.isArray(data)) {
 itemsArray = data;
 } else if (data.data && Array.isArray(data.data)) {
 itemsArray = data.data;
 } else if (data.items && Array.isArray(data.items)) {
 itemsArray = data.items;
 } else if (data.results && Array.isArray(data.results)) {
 itemsArray = data.results;
 } else {
 // If single object, wrap in array
 itemsArray = data._id ? [data] : [];
 }

 console.log('Parsed items array:', itemsArray);
 setItems(itemsArray);
 } catch (err) {
 console.error('Error fetching items:', err);
 toast.error('Failed to fetch items');
 } finally {
 setLoading(false);
 }
 };

 // Filter and paginate
 const filteredItems = useMemo(() => {
 let result = items;
 if (search) {
 const searchLower = search.toLowerCase();
 result = result.filter(item =>
 item.description?.toLowerCase().includes(searchLower) ||
 item.longDescription?.toLowerCase().includes(searchLower) ||
 item.itemGroupName?.toLowerCase().includes(searchLower)
 );
 }
 return result;
 }, [items, search]);

 const paginatedItems = useMemo(() => {
 return filteredItems.slice((page - 1) * pageSize, page * pageSize);
 }, [filteredItems, page, pageSize]);

 const totalPages = Math.ceil(filteredItems.length / pageSize);

 // Handlers
 const handleCreateItem = async () => {
 try {
 const payload = {
 ...newItem,
 rate: Number(newItem.rate) || 0,
 tax1: Number(newItem.tax1) || 0,
 tax2: Number(newItem.tax2) || 0,
 };

 const created = await api.post('/items', payload);
 console.log('Created item:', created);
 // Refetch all items to ensure consistency
 await fetchItems();
 setShowAddModal(false);
 setNewItem({
 itemId: '',
 description: '',
 longDescription: '',
 category: '',
 warehouse: '',
 unit: 'PCS',
 stock: 0,
 minStock: 0,
 rate: '',
 tax1: 0,
 tax2: 0,
 itemGroupId: '',
 itemGroupName: ''
 });
 toast.success('Item created successfully');
 } catch (err) {
 console.error('Error creating item:', err);
 toast.error(err.message || 'Failed to create item');
 }
 };

 const handleEditClick = (item) => {
 setEditingItem(item);
 setNewItem({
 itemId: item.itemId || '',
 description: item.description || '',
 longDescription: item.longDescription || '',
 category: item.category || '',
 warehouse: item.warehouse || '',
 unit: item.unit || 'PCS',
 stock: item.stock || 0,
 minStock: item.minStock || 0,
 rate: item.rate?.toString() || '',
 tax1: item.tax1 || 0,
 tax2: item.tax2 || 0,
 itemGroupId: item.itemGroupId || '',
 itemGroupName: item.itemGroupName || ''
 });
 setShowEditModal(true);
 };

 const handleUpdateItem = async () => {
 if (!editingItem || !editingItem._id) {
 toast.error('No item selected for update');
 return;
 }

 try {
 const payload = {
 ...newItem,
 rate: Number(newItem.rate) || 0,
 tax1: Number(newItem.tax1) || 0,
 tax2: Number(newItem.tax2) || 0,
 };

 console.log('Updating item:', editingItem._id, payload);

 const updated = await api.patch(`/items/${editingItem._id}`, payload);
 console.log('Updated item:', updated);

 setItems(prev => prev.map(item =>
 item._id === editingItem._id ? (updated.data || updated) : item
 ));
 setShowEditModal(false);
 setShowAddModal(false);
 setEditingItem(null);
 toast.success('Item updated successfully');
 } catch (err) {
 console.error('Error updating item:', err);
 toast.error(err.message || 'Failed to update item');
 }
 };

 const handleViewClick = (item) => {
 setSelectedItem(item);
 setShowDetailModal(true);
 };

 const handleDeleteItem = async (item) => {
 if (!window.confirm(`Are you sure you want to delete "${item.description}"?`)) return;

 try {
 await api.delete(`/items/${item._id}`);

 setItems(prev => prev.filter(i => i._id !== item._id));
 toast.success('Item deleted successfully');
 } catch (err) {
 console.error('Error deleting item:', err);
 toast.error(err.message || 'Failed to delete item');
 }
 };

 const handleBulkDelete = async () => {
 if (!window.confirm(`Are you sure you want to delete ${selectedRows.size} items?`)) return;

 try {
 const ids = Array.from(selectedRows);
 await apiClient.delete('/items/bulk/delete', { data: { ids }, params: { tenantId: TENANT_ID } });

 setItems(prev => prev.filter(item => !selectedRows.has(item._id)));
 setSelectedRows(new Set());
 setShowBulkActionsModal(false);
 toast.success(`${ids.length} items deleted successfully`);
 } catch (err) {
 console.error('Error bulk deleting items:', err);
 toast.error(err.message || 'Failed to delete items');
 }
 };

 const handleExport = () => {
 const headers = ['Description', 'Long Description', 'Rate', 'Tax 1', 'Tax 2', 'Unit', 'Group'];
 const csvContent = [
 headers.join(','),
 ...filteredItems.map(item => [
 `"${item.description || ''}"`,
 `"${item.longDescription || ''}"`,
 item.rate || 0,
 item.tax1 || 0,
 item.tax2 || 0,
 `"${item.unit || ''}"`,
 `"${item.itemGroupName || ''}"`
 ].join(','))
 ].join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download', `items_export_${new Date().toISOString().split('T')[0]}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 toast.success(`Exported ${filteredItems.length} items to CSV`);
 };

 const handleAddCategory = () => {
 if (!newCategory.trim()) {
 toast.error('Please enter a category name');
 return;
 }
 if (categories.includes(newCategory.trim())) {
 toast.error('Category already exists');
 return;
 }
 setCategories([...categories, newCategory.trim()]);
 setNewCategory('');
 toast.success('Category added successfully');
 };

 const handleEditCategory = (oldCategory) => {
 if (!editCategoryValue.trim()) {
 toast.error('Please enter a category name');
 return;
 }
 if (categories.includes(editCategoryValue.trim()) && editCategoryValue.trim() !== oldCategory) {
 toast.error('Category already exists');
 return;
 }
 setCategories(categories.map(cat => cat === oldCategory ? editCategoryValue.trim() : cat));
 // Also update items that use this category
 setItems(items.map(item => 
 item.category === oldCategory ? { ...item, category: editCategoryValue.trim() } : item
 ));
 setEditingCategory(null);
 setEditCategoryValue('');
 toast.success('Category updated successfully');
 };

 const handleDeleteCategory = (categoryToDelete) => {
 if (!window.confirm(`Are you sure you want to delete "${categoryToDelete}" category?\n\nItems using this category will have their category cleared.`)) {
 return;
 }
 setCategories(categories.filter(cat => cat !== categoryToDelete));
 // Clear category from items that use it
 setItems(items.map(item => 
 item.category === categoryToDelete ? { ...item, category: '' } : item
 ));
 toast.success('Category deleted successfully');
 };

 const toggleRowSelection = (id) => {
 const newSelected = new Set(selectedRows);
 if (newSelected.has(id)) {
 newSelected.delete(id);
 } else {
 newSelected.add(id);
 }
 setSelectedRows(newSelected);
 };

 const toggleAllSelection = () => {
 if (selectedRows.size === paginatedItems.length) {
 setSelectedRows(new Set());
 } else {
 setSelectedRows(new Set(paginatedItems.map(item => item._id)));
 }
 };

 const ROW_ACTIONS = [
 { label: 'View', icon: Eye, onClick: handleViewClick },
 { label: 'Edit', icon: Edit2, onClick: handleEditClick },
 {
 label: 'Duplicate', icon: Copy, onClick: (item) => {
 setNewItem({
 itemId: item.itemId ? item.itemId + '-COPY' : '',
 description: item.description + ' (Copy)',
 longDescription: item.longDescription || '',
 category: item.category || '',
 warehouse: item.warehouse || '',
 unit: item.unit || 'PCS',
 stock: item.stock || 0,
 minStock: item.minStock || 0,
 rate: item.rate?.toString() || '',
 tax1: item.tax1 || 0,
 tax2: item.tax2 || 0,
 itemGroupId: item.itemGroupId || '',
 itemGroupName: item.itemGroupName || ''
 });
 setShowAddModal(true);
 }
 },
 { label: 'Delete', icon: Trash2, onClick: handleDeleteItem, danger: true },
 ];

 const pageSizeOptions = [10, 25, 50, 100];

 return (
 <div className="animate-fade-in space-y-4">
 {/* Header */}
 <div className="page-header">
 <div>
 <h1 className="heading-page flex items-center gap-2">
 <List size={20} className="text-[var(--primary)]" />
 Items and Category
 </h1>
 <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage products, services, materials and categories</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
 <Tag size={14} /> Add Category
 </Button>
 <Button variant="outline" onClick={handleExport}>
 <Download size={14} /> Export
 </Button>
 <Button onClick={() => setShowAddModal(true)}>
 <Plus size={14} /> New Item
 </Button>
 </div>
 </div>

 {/* Toolbar */}
 <div className="flex flex-wrap items-center gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl">
 {/* Page Size */}
 <div className="flex items-center gap-2">
 <select
 value={pageSize}
 onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
 className="h-8 px-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg"
 >
 {pageSizeOptions.map(size => (
 <option key={size} value={size}>{size}</option>
 ))}
 </select>
 </div>

 {/* Export Button */}
 <Button variant="ghost" size="sm" onClick={handleExport}>
 <Download size={14} /> Export
 </Button>

 {/* Bulk Actions */}
 {selectedRows.size > 0 && (
 <Button variant="ghost" size="sm" onClick={() => setShowBulkActionsModal(true)}>
 Bulk Actions ({selectedRows.size})
 </Button>
 )}

 <div className="flex-1" />

 {/* Search */}
 <div className="flex items-center gap-2">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
 <Input
 placeholder="Search items..."
 value={search}
 onChange={(e) => { setSearch(e.target.value); setPage(1); }}
 className="h-8 pl-9 text-xs w-64"
 />
 </div>
 </div>
 </div>

 {/* Table */}
 <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl overflow-hidden">
 <table className="w-full text-left">
 <thead>
 <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
 <th className="px-4 py-3 w-10">
 <input
 type="checkbox"
 checked={selectedRows.size === paginatedItems.length && paginatedItems.length > 0}
 onChange={toggleAllSelection}
 className="w-4 h-4 accent-[var(--primary)]"
 />
 </th>
 {ITEM_COLUMNS.map(col => (
 <th key={col.key} className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
 {col.header}
 </th>
 ))}
 <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-right">
 Actions
 </th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr>
 <td colSpan={ITEM_COLUMNS.length + 2} className="px-4 py-8 text-center text-[var(--text-muted)]">
 <div className="flex items-center justify-center gap-2">
 <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
 Loading items...
 </div>
 </td>
 </tr>
 ) : paginatedItems.length === 0 ? (
 <tr>
 <td colSpan={ITEM_COLUMNS.length + 2} className="px-4 py-8 text-center text-[var(--text-muted)]">
 <Package size={32} className="mx-auto mb-2 text-[var(--text-faint)]" />
 <p>No items found</p>
 <p className="text-xs mt-1">Create a new item to get started</p>
 </td>
 </tr>
 ) : (
 paginatedItems.map((item, index) => (
 <tr key={item._id || index} 
 className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)] cursor-pointer"
 onClick={() => setSelectedItem(item)}>
 <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
 <input
 type="checkbox"
 checked={selectedRows.has(item._id)}
 onChange={() => toggleRowSelection(item._id)}
 className="w-4 h-4 accent-[var(--primary)]"
 />
 </td>
 {ITEM_COLUMNS.map(col => (
 <td key={col.key} className="px-4 py-3">
 {col.render
 ? col.render(item[col.key], item)
 : <span className="text-xs text-[var(--text-primary)]">{item[col.key]}</span>
 }
 </td>
 ))}
 <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-end gap-1">
 {ROW_ACTIONS.map((action, idx) => (
 <button
 key={idx}
 onClick={() => action.onClick(item)}
 className={`p-1.5 rounded-lg transition-colors ${action.danger
 ? 'text-red-400 hover:bg-red-500/10'
 : 'text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
 }`}
 title={action.label}
 >
 <action.icon size={14} />
 </button>
 ))}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>

 {/* Pagination */}
 <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-base)]">
 <div className="text-xs text-[var(--text-muted)]">
 Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length} entries
 </div>
 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setPage(p => Math.max(1, p - 1))}
 disabled={page === 1}
 >
 Previous
 </Button>
 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
 const pageNum = i + 1;
 return (
 <button
 key={pageNum}
 onClick={() => setPage(pageNum)}
 className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === pageNum
 ? 'bg-[var(--primary)] text-white'
 : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
 }`}
 >
 {pageNum}
 </button>
 );
 })}
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
 disabled={page === totalPages}
 >
 Next
 </Button>
 </div>
 </div>
 </div>

 {/* Add Item Modal */}
 <Modal
 open={showAddModal}
 onClose={() => { setShowAddModal(false); setEditingItem(null); }}
 title={editingItem ? 'Edit Item' : 'Add New Item'}
 size="md"
 footer={
 <div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowAddModal(false); setEditingItem(null); }}>
 Close
 </Button>
 <Button onClick={editingItem ? handleUpdateItem : handleCreateItem}>
 {editingItem ? 'Update' : 'Save'}
 </Button>
 </div>
 }
 >
 <div className="space-y-4">
 <FormField label="Item ID" required>
 <Input
 placeholder="Enter unique item ID (e.g., INV001)"
 value={newItem.itemId}
 onChange={(e) => setNewItem({ ...newItem, itemId: e.target.value })}
 />
 </FormField>

 <FormField label="Description" required>
 <Input
 placeholder="Enter item description"
 value={newItem.description}
 onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
 />
 </FormField>

 <FormField label="Long Description">
 <Textarea
 placeholder="Enter detailed description"
 rows={3}
 value={newItem.longDescription}
 onChange={(e) => setNewItem({ ...newItem, longDescription: e.target.value })}
 />
 </FormField>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Category">
 <Select
 value={newItem.category}
 onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
 >
 <option value="">Select Category</option>
 {categories.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Warehouse">
 <Select
 value={newItem.warehouse}
 onChange={(e) => setNewItem({ ...newItem, warehouse: e.target.value })}
 >
 <option value="">Select Warehouse</option>
 <option value="WH-Mumbai">WH-Mumbai</option>
 <option value="WH-Delhi">WH-Delhi</option>
 <option value="WH-Bangalore">WH-Bangalore</option>
 <option value="WH-Surat">WH-Surat</option>
 </Select>
 </FormField>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Unit">
 <Select
 value={newItem.unit}
 onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
 >
 {UNIT_OPTIONS.map(unit => (
 <option key={unit} value={unit}>{unit}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Item Group">
 <Select
 value={newItem.itemGroupId}
 onChange={(e) => {
 const group = ITEM_GROUPS.find(g => g.id === e.target.value);
 setNewItem({
 ...newItem,
 itemGroupId: e.target.value,
 itemGroupName: group?.name || ''
 });
 }}
 >
 <option value="">Nothing selected</option>
 {ITEM_GROUPS.map(group => (
 <option key={group.id} value={group.id}>{group.name}</option>
 ))}
 </Select>
 </FormField>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Stock Quantity">
 <Input
 type="number"
 placeholder="0"
 value={newItem.stock}
 onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) || 0 })}
 />
 </FormField>

 <FormField label="Min Stock Level">
 <Input
 type="number"
 placeholder="0"
 value={newItem.minStock}
 onChange={(e) => setNewItem({ ...newItem, minStock: Number(e.target.value) || 0 })}
 />
 </FormField>
 </div>

 <FormField label="Rate - INR (Base Currency)" required>
 <Input
 type="number"
 placeholder="0.00"
 value={newItem.rate}
 onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
 />
 </FormField>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Tax 1">
 <Select
 value={newItem.tax1}
 onChange={(e) => setNewItem({ ...newItem, tax1: Number(e.target.value) })}
 >
 {TAX_OPTIONS.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Tax 2">
 <Select
 value={newItem.tax2}
 onChange={(e) => setNewItem({ ...newItem, tax2: Number(e.target.value) })}
 >
 {TAX_OPTIONS.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </Select>
 </FormField>
 </div>
 </div>
 </Modal>

 {/* Edit Modal - using same as Add with different handler */}
 <Modal
 open={showEditModal}
 onClose={() => { setShowEditModal(false); setEditingItem(null); }}
 title="Edit Item"
 size="md"
 footer={
 <div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowEditModal(false); setEditingItem(null); }}>
 Close
 </Button>
 <Button onClick={handleUpdateItem}>
 Save
 </Button>
 </div>
 }
 >
 <div className="space-y-4">
 <FormField label="Item ID" required>
 <Input
 placeholder="Enter unique item ID (e.g., INV001)"
 value={newItem.itemId}
 onChange={(e) => setNewItem({ ...newItem, itemId: e.target.value })}
 />
 </FormField>

 <FormField label="Description" required>
 <Input
 placeholder="Enter item description"
 value={newItem.description}
 onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
 />
 </FormField>

 <FormField label="Long Description">
 <Textarea
 placeholder="Enter detailed description"
 rows={3}
 value={newItem.longDescription}
 onChange={(e) => setNewItem({ ...newItem, longDescription: e.target.value })}
 />
 </FormField>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Category">
 <Select
 value={newItem.category}
 onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
 >
 <option value="">Select Category</option>
 {categories.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Warehouse">
 <Select
 value={newItem.warehouse}
 onChange={(e) => setNewItem({ ...newItem, warehouse: e.target.value })}
 >
 <option value="">Select Warehouse</option>
 <option value="WH-Mumbai">WH-Mumbai</option>
 <option value="WH-Delhi">WH-Delhi</option>
 <option value="WH-Bangalore">WH-Bangalore</option>
 <option value="WH-Surat">WH-Surat</option>
 </Select>
 </FormField>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Unit">
 <Select
 value={newItem.unit}
 onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
 >
 {UNIT_OPTIONS.map(unit => (
 <option key={unit} value={unit}>{unit}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Item Group">
 <Select
 value={newItem.itemGroupId}
 onChange={(e) => {
 const group = ITEM_GROUPS.find(g => g.id === e.target.value);
 setNewItem({
 ...newItem,
 itemGroupId: e.target.value,
 itemGroupName: group?.name || ''
 });
 }}
 >
 <option value="">Nothing selected</option>
 {ITEM_GROUPS.map(group => (
 <option key={group.id} value={group.id}>{group.name}</option>
 ))}
 </Select>
 </FormField>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Stock Quantity">
 <Input
 type="number"
 placeholder="0"
 value={newItem.stock}
 onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) || 0 })}
 />
 </FormField>

 <FormField label="Min Stock Level">
 <Input
 type="number"
 placeholder="0"
 value={newItem.minStock}
 onChange={(e) => setNewItem({ ...newItem, minStock: Number(e.target.value) || 0 })}
 />
 </FormField>
 </div>

 <FormField label="Rate - INR (Base Currency)" required>
 <Input
 type="number"
 placeholder="0.00"
 value={newItem.rate}
 onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
 />
 </FormField>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Tax 1">
 <Select
 value={newItem.tax1}
 onChange={(e) => setNewItem({ ...newItem, tax1: Number(e.target.value) })}
 >
 {TAX_OPTIONS.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Tax 2">
 <Select
 value={newItem.tax2}
 onChange={(e) => setNewItem({ ...newItem, tax2: Number(e.target.value) })}
 >
 {TAX_OPTIONS.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </Select>
 </FormField>
 </div>
 </div>
 </Modal>

 {/* Detail Modal - Inventory like UI */}
 <Modal
 open={showDetailModal}
 onClose={() => { setShowDetailModal(false); setSelectedItem(null); }}
 title={selectedItem?.description || 'Item Details'}
 size="lg"
 footer={
 <div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowDetailModal(false); setSelectedItem(null); }}>
 Close
 </Button>
 <Button onClick={() => { setShowDetailModal(false); handleEditClick(selectedItem); }}>
 <Edit2 size={14} /> Edit
 </Button>
 </div>
 }
 >
 {selectedItem && (
 <div className="space-y-6">
 {/* Info Cards Grid */}
 <div className="grid grid-cols-2 gap-3">
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Item ID</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.itemId || '†â€™'}</p>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Category</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.category || selectedItem.itemGroupName || '†â€™'}</p>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Warehouse</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.warehouse || '†â€™'}</p>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Unit</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.unit || '†â€™'}</p>
 </div>
 </div>

 {/* Stock Info */}
 <div className="grid grid-cols-2 gap-3">
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Total Stock</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.stock || 0} {selectedItem.unit || ''}</p>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Reserved</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.reserved || 0} {selectedItem.unit || ''}</p>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Available</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{(selectedItem.stock || 0) - (selectedItem.reserved || 0)} {selectedItem.unit || ''}</p>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Min Stock</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.minStock || 0} {selectedItem.unit || ''}</p>
 </div>
 </div>

 {/* Pricing Info */}
 <div className="grid grid-cols-2 gap-3">
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Unit Rate</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{fmt(selectedItem.rate || 0)}</p>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Total Value</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{fmt((selectedItem.rate || 0) * (selectedItem.stock || 0))}</p>
 </div>
 </div>

 {/* Status & Dates */}
 <div className="grid grid-cols-2 gap-3">
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
 <div className="flex items-center gap-2">
 <span className={`w-2 h-2 rounded-full ${(selectedItem.stock || 0) === 0 ? 'bg-red-500' :
 ((selectedItem.stock || 0) - (selectedItem.reserved || 0)) <= (selectedItem.minStock || 0) ? 'bg-amber-500' :
 (selectedItem.reserved || 0) > 0 ? 'bg-[var(--blue)]' : 'bg-[var(--green)]'
 }`} />
 <span className="text-sm font-semibold text-[var(--text-primary)]">
 {(selectedItem.stock || 0) === 0 ? 'Out of Stock' :
 ((selectedItem.stock || 0) - (selectedItem.reserved || 0)) <= (selectedItem.minStock || 0) ? 'Low Stock' :
 (selectedItem.reserved || 0) > 0 ? 'Reserved' : 'In Stock'}
 </span>
 </div>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Last Updated</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">
 {selectedItem.updatedAt ? new Date(selectedItem.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
 </p>
 </div>
 </div>

 {/* Tax Info */}
 <div className="grid grid-cols-2 gap-3">
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Tax 1</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.tax1 || 0}%</p>
 </div>
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Tax 2</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedItem.tax2 || 0}%</p>
 </div>
 </div>

 {/* Long Description */}
 {selectedItem.longDescription && (
 <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl">
 <p className="text-xs text-[var(--text-muted)] mb-1">Long Description</p>
 <p className="text-sm text-[var(--text-primary)]">{selectedItem.longDescription}</p>
 </div>
 )}

 {/* Reserved for Projects Section */}
 <div className="border-t border-[var(--border-base)] pt-4">
 <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Reserved for Projects</h4>
 {selectedItem.reserved && selectedItem.reserved > 0 ? (
 <div className="space-y-2">
 <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-amber-500" />
 <span className="text-sm font-medium text-amber-400">Active Reservation</span>
 </div>
 <span className="text-sm font-bold text-amber-400">{selectedItem.reserved} {selectedItem.unit || ''}</span>
 </div>
 </div>
 ) : (
 <p className="text-sm text-[var(--text-muted)]">No active reservations</p>
 )}
 </div>
 </div>
 )}
 </Modal>

 {/* Add Category Modal */}
 <Modal
 open={showCategoryModal}
 onClose={() => { setShowCategoryModal(false); setNewCategory(''); }}
 title="Add New Category"
 size="sm"
 footer={
 <div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowCategoryModal(false); setNewCategory(''); }}>
 Cancel
 </Button>
 <Button onClick={handleAddCategory}>
 Add Category
 </Button>
 </div>
 }
 >
 <div className="space-y-4">
 <FormField label="Category Name" required>
 <Input
 placeholder="Enter category name (e.g., Cables, Connectors)"
 value={newCategory}
 onChange={(e) => setNewCategory(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleAddCategory();
 }
 }}
 />
 </FormField>

 {/* Existing Categories List with CRUD */}
 <div className="mt-4">
 <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Existing Categories:</p>
 <div className="flex flex-wrap gap-2">
 {categories.map((cat) => (
 <div
 key={cat}
 className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg text-[var(--text-secondary)] group"
 >
 {editingCategory === cat ? (
 <>
 <Input
 value={editCategoryValue}
 onChange={(e) => setEditCategoryValue(e.target.value)}
 className="h-6 w-24 text-xs px-1"
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleEditCategory(cat);
 }
 if (e.key === 'Escape') {
 setEditingCategory(null);
 setEditCategoryValue('');
 }
 }}
 autoFocus
 />
 <button
 onClick={() => handleEditCategory(cat)}
 className="p-0.5 text-[var(--green)] hover:bg-[var(--green)]/10 rounded"
 >
 <Check size={12} />
 </button>
 <button
 onClick={() => { setEditingCategory(null); setEditCategoryValue(''); }}
 className="p-0.5 text-red-500 hover:bg-red-500/10 rounded"
 >
 <X size={12} />
 </button>
 </>
 ) : (
 <>
 <span>{cat}</span>
 <button
 onClick={() => { setEditingCategory(cat); setEditCategoryValue(cat); }}
 className="p-0.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] rounded transition-opacity"
 >
 <Edit2 size={12} />
 </button>
 <button
 onClick={() => handleDeleteCategory(cat)}
 className="p-0.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded transition-opacity"
 >
 <Trash2 size={12} />
 </button>
 </>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 </Modal>
 </div>
 );
};

export default ItemsPage;
