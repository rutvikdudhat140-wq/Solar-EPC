// Solar OS �’� EPC Edition �’ProjectPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
 FolderOpen, Plus, Calendar, CheckCircle, Zap, TrendingUp, BarChart2,
 LayoutGrid, List, User, Clock, Trash2, Edit2, Clock3, History,
 Eye, Check, EyeOff, Layers, Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { PROJECT_STAGE_TREND } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import { Stepper } from '../components/ui/Stepper';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import CanAccess, { CanCreate } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';
import { api } from '../lib/apiClient';
import ImportExport from '../components/ui/ImportExport';
import CompactCalendarFilter from '../components/ui/CompactCalendarFilter';
import { leadsApi } from '../services/leadsApi';
import { employeeApi, departmentApi } from '../services/hrmApi';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const fmt = CURRENCY.format;

const TENANT_ID = localStorage.getItem('tenantId') || 'solarcorp'; // Default tenant for seed data

const KANBAN_STAGES = [
 { id: 'Logistics', label: 'Logistics', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
 { id: 'Installation', label: 'Installation', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
 { id: 'Commissioned', label: 'Commissioned', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
 { id: 'On Hold', label: 'On Hold', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
 { id: 'Cancelled', label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
];

const COLUMNS = [
 { key: 'id', header: 'Project ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
 { key: 'customerName', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
 { key: 'site', header: 'Site', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
 { key: 'systemSize', header: 'Size', sortable: true, render: v => <span className="text-xs font-bold text-[var(--solar)]">{v} kW</span> },
 { key: 'pm', header: 'PM', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
 {
 key: 'progress', header: 'Progress', sortable: true, render: (v, row) => {
 // Calculate progress based on stage
 const getStageProgress = (status) => {
 switch (status) {
 case 'Logistics': return 0;
 case 'Installation': return 50;
 case 'Commissioned': return 100;
 case 'On Hold': return row?.progress || 0;
 case 'Cancelled': return 0;
 default: return row?.progress || 0;
 }
 };
 const displayProgress = getStageProgress(row?.status);
 return (
 <div className="flex items-center gap-2 min-w-[90px]">
 <Progress value={displayProgress} className="h-1.5 flex-1" />
 <span className="text-xs text-[var(--text-muted)] w-8 text-right">{displayProgress}%</span>
 </div>
 );
 }
 },
 { key: 'status', header: 'Status', render: v => <StatusBadge domain="project" value={v} /> },
 { key: 'estEndDate', header: 'Est. End', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '�’'}</span> },
 { key: 'value', header: 'Value', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span> },
];

const STATUS_FILTERS = ['All', 'Logistics', 'Installation', 'Commissioned'];

const PROGRESS_FILTERS = [
 { label: 'All', value: 'all' },
 { label: '0-25%', value: { min: 0, max: 25 } },
 { label: '26-50%', value: { min: 26, max: 50 } },
 { label: '51-75%', value: { min: 51, max: 75 } },
 { label: '76-100%', value: { min: 76, max: 100 } },
];

/* �’�’Kanban Card �’�’*/
const ProjectCard = ({ project, onDragStart, onClick }) => {
 // Calculate progress based on stage
 const getStageProgress = (status) => {
 switch (status) {
 case 'Logistics': return 0;
 case 'Installation': return 50;
 case 'Commissioned': return 100;
 case 'On Hold': return project.progress || 0;
 case 'Cancelled': return 0;
 default: return project.progress || 0;
 }
 };
 
 const displayProgress = getStageProgress(project.status);
 
 return (
 <div draggable onDragStart={onDragStart} onClick={onClick}
 className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-[10px] font-mono text-[var(--accent-light)]">{project.id}</span>
 <span className="text-[10px] font-bold text-[var(--solar)]">{project.systemSize} kW</span>
 </div>
 <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5 leading-tight">{project.customerName}</p>
 <p className="text-[10px] text-[var(--text-muted)] mb-2 truncate">{project.site}</p>
 <Progress value={displayProgress} className="h-1 mb-2" />
 <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
 <span className="flex items-center gap-1"><User size={9} />{project.pm}</span>
 <span>{displayProgress}%</span>
 </div>
 {project.estEndDate && (
 <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[var(--text-faint)]">
 <Clock size={9} />{project.estEndDate}
 </div>
 )}
 <div className="mt-1.5 text-[10px] font-bold text-[var(--text-secondary)]">{fmt(project.value)}</div>
 </div>
 );
};

/* �’�’Kanban Board �’�’*/
const KanbanBoard = ({ projects, onStageChange, onCardClick }) => {
 const draggingId = useRef(null);
 const [dragOver, setDragOver] = useState(null);
 return (
 <div className="overflow-x-auto pb-3 -mx-2 px-2">
 <div className="flex gap-3 min-w-max">
 {KANBAN_STAGES.map(stage => {
 const cards = projects.filter(p => p.status === stage.id);
 const kw = cards.reduce((a, p) => a + p.systemSize, 0);
 return (
 <div key={stage.id}
 className={`flex flex-col w-72 sm:w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
 onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
 onDragLeave={() => setDragOver(null)}
 onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}>
 <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
 <div className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
 <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
 </div>
 <div className="flex items-center gap-1.5">
 {kw > 0 && <span className="text-[10px] text-[var(--solar)] font-bold hidden sm:inline">{kw}kW</span>}
 <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
 style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
 </div>
 </div>
 <div className="flex flex-col gap-2 p-2 flex-1 min-h-[180px]">
 {cards.map(p => (
 <ProjectCard key={p.id} project={p}
 onDragStart={() => { draggingId.current = p.id; }}
 onClick={() => onCardClick(p)} />
 ))}
 {cards.length === 0 && (
 <div className="flex-1 flex items-center justify-center">
 <p className="text-[11px] text-[var(--text-faint)]">Drop here</p>
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
};

/* �’�’Main Page �’�’*/
const ProjectPage = () => {
 const { user: authUser } = useAuth();
 const perm = usePermissions('project');
 const canView = perm.canView();
 const canCreate = perm.canCreate();
 const canEdit = perm.canEdit();
 const canDelete = perm.canDelete();
 const canExport = perm.canExport();
 const canAssign = perm.canAssign();
 const { logStatusChange } = useAuditLog('project');

 const getEmployeeDisplayName = (e) => {
 const firstName =
 e?.firstName || e?.firstname || e?.first_name ||
 e?.user?.firstName || e?.user?.firstname || e?.user?.first_name ||
 e?.personalDetails?.firstName || e?.personalDetails?.firstname || e?.personalDetails?.first_name ||
 '';
 const lastName =
 e?.lastName || e?.lastname || e?.last_name ||
 e?.user?.lastName || e?.user?.lastname || e?.user?.last_name ||
 e?.personalDetails?.lastName || e?.personalDetails?.lastname || e?.personalDetails?.last_name ||
 '';
 const name = e?.name || e?.fullName || e?.user?.name || e?.user?.fullName || '';
 const empId = e?.employeeId || e?.employee_id || e?.empId || e?.id || e?._id || '';
 const email = e?.email || e?.user?.email || '';
 return `${firstName} ${lastName}`.trim() || name || email || (empId ? String(empId) : '') || 'Unnamed';
 };

 // Permission guard helper
 const guardCreate = () => {
 if (!canCreate) {
 toast.error('Permission denied: Cannot create projects');
 return false;
 }
 return true;
 };

 const [view, setView] = useState('dashboard');
 const [search, setSearch] = useState('');
 const [statusFilter, setFilter] = useState('All');
 const [progressFilter, setProgressFilter] = useState('all');
 const [showNonCompletedOnly, setShowNonCompletedOnly] = useState(false);
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
 const [showAdd, setShowAdd] = useState(false);
 const [showEdit, setShowEdit] = useState(false);
 const [showCardsInViews, setShowCardsInViews] = useState(true);
 const [showBackwardsConfirm, setShowBackwardsConfirm] = useState(false);
 const [backwardsMoveData, setBackwardsMoveData] = useState(null);
 const [showTimeline, setShowTimeline] = useState(false);
 const [showStatus, setShowStatus] = useState(false);
 const [showActivity, setShowActivity] = useState(false);
 const [timelineProject, setTimelineProject] = useState(null);
 const [activityProject, setActivityProject] = useState(null);
 const [statusProject, setStatusProject] = useState(null);
 const [newStatus, setNewStatus] = useState('');
 const [editingProject, setEditingProject] = useState(null);
 const [selected, setSelected] = useState(null);
 const [projects, setProjects] = useState([]);
 const [selectedProjects, setSelectedProjects] = useState(new Set()); // For bulk selection
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [form, setForm] = useState({ customerName: '', site: '', systemSize: '', pm: '', department: '', value: '', estEndDate: '', email: '', mobileNumber: '', paymentTerms: '', visitsPerMonth: '', totalVisits: '', materials: [] });
 const [items, setItems] = useState([]); // Items for material selection
 const [itemsLoading, setItemsLoading] = useState(false);
 const [projectReservations, setProjectReservations] = useState([]);
 const [loadingProjectReservations, setLoadingProjectReservations] = useState(false);
 const [editForm, setEditForm] = useState({ customerName: '', site: '', systemSize: '', pm: '', department: '', value: '', estEndDate: '', email: '', mobileNumber: '', paymentTerms: '', visitsPerMonth: '', totalVisits: '', materials: [] });
 const [submitting, setSubmitting] = useState(false);
 const [users, setUsers] = useState([]);
 const [usersLoading, setUsersLoading] = useState(false);
 const [departments, setDepartments] = useState([]);
 const [departmentsLoading, setDepartmentsLoading] = useState(false);
 const [employeesByDept, setEmployeesByDept] = useState([]);
 const [employeesLoading, setEmployeesLoading] = useState(false);
 const [hiddenCols, setHiddenCols] = useState(new Set());
 const { milestones: settingsMilestones, getMilestones } = useSettings();
 const [colToggleOpen, setColToggleOpen] = useState(false);
 const [projectStats, setProjectStats] = useState(null);
 const [projectsByStage, setProjectsByStage] = useState([]);
 const [customers, setCustomers] = useState([]);
 const [customersLoading, setCustomersLoading] = useState(false);

 // Use dynamic milestones from settings, fallback to hardcoded if not available
 const DEFAULT_MILESTONES = useMemo(() => {
 const dynamicMilestones = settingsMilestones || getMilestones?.() || [];
 if (dynamicMilestones.length > 0) {
 return dynamicMilestones.map(m => ({
 name: m.name,
 status: 'Pending',
 date: null
 }));
 }
 // Fallback default milestones
 return [
 { name: 'Material Ready', status: 'Pending', date: null },
 { name: 'Installation', status: 'Pending', date: null },
 { name: 'Commission', status: 'Pending', date: null },
 { name: 'Billing', status: 'Pending', date: null },
 { name: 'Closure', status: 'Pending', date: null },
 ];
 }, [settingsMilestones, getMilestones]);

 // Month filter state
 const [monthFilter, setMonthFilter] = useState('all');

 // Dynamic month options based on project dates
 const monthOptions = useMemo(() => {
 const options = [{ value: 'all', label: 'All Time' }];
 if (!projects || projects.length === 0) return options;
 
 // Find earliest and latest dates from projects
 const dates = projects
 .map(p => p.startDate || p.createdAt || p.date)
 .filter(d => d)
 .map(d => new Date(d));
 
 if (dates.length === 0) return options;
 
 const earliestDate = new Date(Math.min(...dates));
 const now = new Date();
 
 // Start from earliest project month, go till current month + 3 future months
 const startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
 const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
 
 const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
 
 // Generate all months in range
 const current = new Date(startDate);
 while (current <= endDate) {
 const year = current.getFullYear();
 const month = current.getMonth();
 const value = `${year}-${String(month + 1).padStart(2, '0')}`;
 const label = `${monthNames[month]} ${year}`;
 options.push({ value, label });
 current.setMonth(current.getMonth() + 1);
 }
 
 // Reverse to show newest first
 return options.reverse();
 }, [projects]);

 // Fetch projects stats from backend
 useEffect(() => {
 // Don't fetch if no token
 const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
 if (!token) return;

 const fetchStats = async () => {
 try {
 const res = await api.get('/projects/stats', { tenantId: TENANT_ID });
 const data = res?.data ?? res;
 setProjectStats(data?.data || data);
 } catch (err) {
 console.error('Error fetching project stats:', err);
 }
 };
 fetchStats();
 }, []);

 // Fetch projects by stage for chart
 useEffect(() => {
 // Don't fetch if no token
 const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
 if (!token) return;

 const fetchByStage = async () => {
 try {
 const res = await api.get('/projects/by-stage', { tenantId: TENANT_ID });
 const data = res?.data ?? res;
 setProjectsByStage(data?.data || data || []);
 } catch (err) {
 console.error('Error fetching projects by stage:', err);
 }
 };
 fetchByStage();
 }, []);

 // Fetch projects from backend
 useEffect(() => {
 // Don't fetch if no token
 const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
 if (!token) return;

 const fetchProjects = async () => {
 try {
 setLoading(true);
 const res = await api.get('/projects', { tenantId: TENANT_ID });
 const data = res?.data ?? res;
 console.log('API Response:', data); // Debug log
 const projectsArray = Array.isArray(data) ? data : (data?.data || []);
 const transformedProjects = projectsArray.map(p => ({
 ...p,
 id: p.projectId,
 }));
 setProjects(transformedProjects);
 setError(null);
 } catch (err) {
 console.error('Error fetching projects:', err);
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 fetchProjects();
 }, []);

 // Fetch project managers from HRM for PM dropdown
 useEffect(() => {
 // Don't fetch if no token
 const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
 if (!token) return;

 const fetchProjectManagers = async () => {
 setUsersLoading(true);
 try {
 // Fetch all employees from HRM
 const res = await employeeApi.getAll();
 const result = res?.data ?? res;
 const employees = result?.data || result || [];
 console.log('[DEBUG] Employees fetched:', employees.length, employees);
 // Filter to get project managers - check roleId (string), designation, or department
 const projectManagers = employees.filter(e => {
 const roleId = (e.roleId || '').toString().toLowerCase();
 const designation = (e.designation || '').toLowerCase();
 const department = (e.department || '').toLowerCase();
 const isManager = roleId.includes('manager') ||
 designation.includes('project manager') ||
 designation.includes('manager') ||
 department.includes('project');
 console.log('[DEBUG] Employee:', e.firstName, e.lastName, 'roleId:', roleId, 'isManager:', isManager);
 return isManager;
 });
 console.log('[DEBUG] Project managers found:', projectManagers.length);
 // If no project managers found, show all active employees as fallback
 const employeesToShow = projectManagers.length > 0 ? projectManagers : employees.filter(e => e.status === 'active' || !e.status);
 if (projectManagers.length === 0) {
 console.log('[DEBUG] No PMs found, showing all employees:', employeesToShow.length);
 }
 // Map to format needed for dropdown
 const pmList = employeesToShow.map(e => {
 const firstName =
 e.firstName || e.firstname || e.first_name ||
 e.user?.firstName || e.user?.firstname || e.user?.first_name ||
 e.personalDetails?.firstName || e.personalDetails?.firstname || e.personalDetails?.first_name ||
 '';
 const lastName =
 e.lastName || e.lastname || e.last_name ||
 e.user?.lastName || e.user?.lastname || e.user?.last_name ||
 e.personalDetails?.lastName || e.personalDetails?.lastname || e.personalDetails?.last_name ||
 '';
 const name = e.name || e.fullName || e.user?.name || e.user?.fullName || '';
 const fullName = `${firstName} ${lastName}`.trim() || name || 'Unnamed';
 return {
 id: e._id || e.id,
 name: fullName,
 department: e.department,
 role: e.roleId || e.designation || e.role || 'Staff'
 };
 });
 setUsers(pmList);
 } catch (err) {
 console.error('Error fetching project managers from HRM:', err);
 } finally {
 setUsersLoading(false);
 }
 };
 fetchProjectManagers();
 }, []);

 // Fetch departments from HRM
 useEffect(() => {
 const fetchDepartments = async () => {
 setDepartmentsLoading(true);
 try {
 console.log('[DEBUG] Fetching departments...');
 const res = await departmentApi.getAll();
 console.log('[DEBUG] Departments API response:', res);
 const result = res?.data ?? res;
 console.log('[DEBUG] Departments result:', result);
 const deptsArray = Array.isArray(result) ? result : (result?.data || []);
 console.log('[DEBUG] Departments array:', deptsArray);
 setDepartments(deptsArray);
 } catch (err) {
 console.error('[DEBUG] Error fetching departments:', err);
 } finally {
 setDepartmentsLoading(false);
 }
 };
 fetchDepartments();
 }, []);

 // Fetch employees when department is selected (for add form)
 useEffect(() => {
 const fetchEmployeesByDept = async () => {
 if (!showAdd) return;
 if (!form.department) {
 setEmployeesByDept([]);
 return;
 }
 setEmployeesLoading(true);
 try {
 console.log('[DEBUG] Fetching employees for department:', form.department);
 const res = await employeeApi.getByDepartment(form.department);
 console.log('[DEBUG] Employees API response:', res);
 const result = res?.data ?? res;
 const employees = Array.isArray(result) ? result : (result?.data || []);
 console.log('[DEBUG] Employees array:', employees);
 console.log('[DEBUG] First employee fields:', employees[0] ? Object.keys(employees[0]) : 'none');
 setEmployeesByDept(employees);
 } catch (err) {
 console.error('[DEBUG] Error fetching employees by department:', err);
 } finally {
 setEmployeesLoading(false);
 }
 };
 fetchEmployeesByDept();
 }, [form.department, showAdd]);

 // Fetch employees when department is selected (for edit form)
 useEffect(() => {
 const fetchEditEmployeesByDept = async () => {
 if (!showEdit) return;
 if (!editForm.department) {
 setEmployeesByDept([]);
 return;
 }
 setEmployeesLoading(true);
 try {
 const res = await employeeApi.getByDepartment(editForm.department);
 const result = res?.data ?? res;
 const employees = Array.isArray(result) ? result : (result?.data || []);
 setEmployeesByDept(employees);
 } catch (err) {
 console.error('Error fetching employees by department:', err);
 } finally {
 setEmployeesLoading(false);
 }
 };
 fetchEditEmployeesByDept();
 }, [editForm.department, showEdit]);

 // Fetch items for material selection
 useEffect(() => {
 // Don't fetch if no token
 const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
 if (!token) return;

 const fetchItems = async () => {
 setItemsLoading(true);
 try {
 const res = await api.get('/items', { tenantId: TENANT_ID });
 const result = res?.data ?? res;
 const itemsArray = Array.isArray(result) ? result : (result?.data || []);
 setItems(itemsArray);
 } catch (err) {
 console.error('Error fetching items:', err);
 } finally {
 setItemsLoading(false);
 }
 };
 fetchItems();
 }, []);

 // Fetch project reservations from inventory when project is selected
 useEffect(() => {
 const fetchProjectReservations = async () => {
 const pid = selected?.projectId || selected?.id;
 if (!pid) {
 setProjectReservations([]);
 return;
 }
 setLoadingProjectReservations(true);
 try {
 const res = await api.get(`/inventory/reservations/by-project/${pid}`);
 const data = res?.data ?? res;
 setProjectReservations(data?.data || data || []);
 } catch (err) {
 console.error('Error fetching project reservations:', err);
 setProjectReservations([]);
 } finally {
 setLoadingProjectReservations(false);
 }
 };
 fetchProjectReservations();
 }, [selected?.projectId, selected?.id]);

 useEffect(() => {
 const fetchFullProjectDetails = async () => {
 const pid = selected?.projectId || selected?.id;
 if (!pid) return;
 if (selected?._fullDetailsLoaded) return;
 try {
 const res = await api.get(`/projects/${pid}`);
 const result = res?.data ?? res;
 const projectData = result?.data || result;
 if (!projectData) return;
 setSelected((prev) => ({
 ...prev,
 ...projectData,
 id: projectData.projectId || prev?.id,
 _fullDetailsLoaded: true,
 }));
 } catch (err) {
 console.error('Error fetching full project details:', err);
 }
 };
 fetchFullProjectDetails();
 }, [selected?.projectId, selected?.id, selected?._fullDetailsLoaded]);

 // Fetch customers from CRM module for dropdown
 useEffect(() => {
 const fetchCustomers = async () => {
 setCustomersLoading(true);
 try {
 const res = await leadsApi.getCustomers({ tenantId: TENANT_ID });
 const result = res?.data ?? res;
 const customersArray = Array.isArray(result) ? result : (result?.data || []);
 setCustomers(customersArray);
 } catch (err) {
 console.error('Error fetching customers from CRM:', err);
 } finally {
 setCustomersLoading(false);
 }
 };
 fetchCustomers();
 }, []);

 // Stage order for detecting backwards moves
 const STAGE_ORDER = ['Logistics', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'];

 // Import/Export fields definition
 const PROJECT_IMPORT_FIELDS = [
 { id: 'projectId', label: 'Project ID', required: false },
 { id: 'customerName', label: 'Customer Name', required: true },
 { id: 'site', label: 'Site Address', required: true },
 { id: 'systemSize', label: 'System Size (kW)', required: true },
 { id: 'pm', label: 'Project Manager', required: true },
 { id: 'value', label: 'Project Value', required: false },
 { id: 'status', label: 'Status', required: false },
 { id: 'progress', label: 'Progress (%)', required: false },
 { id: 'email', label: 'Email', required: false },
 { id: 'mobileNumber', label: 'Mobile Number', required: false },
 { id: 'estEndDate', label: 'Estimated End Date', required: false },
 { id: 'startDate', label: 'Start Date', required: false },
 ];

 // Export handler
 const handleExport = (format) => {
 const dataToExport = filtered.map(p => ({
 projectId: p.id,
 customerName: p.customerName,
 site: p.site,
 systemSize: p.systemSize,
 pm: p.pm,
 value: p.value,
 status: p.status,
 progress: p.progress,
 email: p.email || '',
 mobileNumber: p.mobileNumber || '',
 estEndDate: p.estEndDate || '',
 startDate: p.startDate || '',
 }));

 if (format === 'csv') {
 const headers = PROJECT_IMPORT_FIELDS.map(f => f.label).join(',');
 const rows = dataToExport.map(row => 
 PROJECT_IMPORT_FIELDS.map(f => {
 const val = row[f.id] ?? '';
 // Escape values with commas or quotes
 if (String(val).includes(',') || String(val).includes('"')) {
 return `"${String(val).replace(/"/g, '""')}"`;
 }
 return val;
 }).join(',')
 ).join('\n');
 
 const csvContent = [headers, rows].join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download', `projects_${new Date().toISOString().split('T')[0]}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 }
 };

 // Import handler
 const handleImport = async ({ file, mapping }) => {
 try {
 const Papa = await import('papaparse');
 const text = await file.text();
 
 const { data } = Papa.parse(text, {
 header: true,
 skipEmptyLines: true,
 dynamicTyping: true
 });

 // Filter valid rows
 const validRows = data.filter(row => 
 Object.values(row).some(v => v && String(v).trim() !== '')
 );

 // Process each row and create projects
 const importedProjects = [];
 for (const row of validRows) {
 const newProject = {
 projectId: row.projectId || `P${Date.now().toString().slice(-4)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
 customerName: row.customerName || row.customer || '',
 site: row.site || row.siteAddress || '',
 systemSize: parseFloat(row.systemSize) || 0,
 pm: row.pm || row.projectManager || '',
 value: parseFloat(row.value) || 0,
 status: row.status || 'Logistics',
 progress: parseInt(row.progress) || 0,
 email: row.email || '',
 mobileNumber: row.mobileNumber || row.phone || '',
 estEndDate: row.estEndDate || '',
 startDate: row.startDate || new Date().toISOString().split('T')[0],
 milestones: DEFAULT_MILESTONES,
 materials: []
 };

 try {
 const created = await api.post(`/projects?tenantId=${TENANT_ID}`, newProject);
 const projectData = created?.data ?? created;
 importedProjects.push({ ...projectData, id: projectData.projectId });
 } catch (err) {
 console.error('Failed to import project:', row, err);
 }
 }

 // Update local state with imported projects
 if (importedProjects.length > 0) {
 setProjects(prev => [...prev, ...importedProjects]);
 alert(`Successfully imported ${importedProjects.length} projects!`);
 } else {
 alert('No projects were imported. Please check your CSV file.');
 }
 } catch (err) {
 console.error('Import error:', err);
 alert('Failed to import projects: ' + err.message);
 }
 };

 const handleStageChange = async (id, newStage) => {
 if (newStage === 'Cancelled' && !canEdit) {
 alert('You do not have permission to cancel a project');
 return;
 }

 const project = projects.find(p => p.id === id);
 const currentStage = project?.status;
 
 // Check if this is a backwards move
 const currentIndex = STAGE_ORDER.indexOf(currentStage);
 const newIndex = STAGE_ORDER.indexOf(newStage);
 const isBackwardsMove = newIndex < currentIndex;

 // If backwards move, show confirmation dialog
 if (isBackwardsMove && currentStage !== newStage) {
 setBackwardsMoveData({ id, newStage, currentStage, projectName: project?.customerName });
 setShowBackwardsConfirm(true);
 return;
 }

 // Proceed with stage change
 await executeStageChange(id, newStage);
 };

 const executeStageChange = async (id, newStage) => {
 const project = projects.find(p => p.id === id);
 const currentStage = project?.status;
 
 // Validation: Commissioned status requires 100% progress
 if (newStage === 'Commissioned' && project?.progress < 100) {
 alert('Project progress must be 100% before marking as Commissioned. Please complete all milestones first.');
 return;
 }
 
 // Calculate progress based on stage movement
 const totalStages = STAGE_ORDER.length - 2; // Exclude On Hold and Cancelled
 const currentIndex = STAGE_ORDER.indexOf(newStage);
 let newProgress = project?.progress || 0;
 
 if (currentIndex >= 0 && currentIndex < totalStages) {
 // Calculate percentage based on stage position (Logistics=33%, Installation=50%, Commissioned=100%)
 newProgress = Math.round(((currentIndex + 1) / totalStages) * 100);
 } else if (newStage === 'Commissioned') {
 newProgress = 100;
 } else if (newStage === 'On Hold') {
 // Keep existing progress when on hold
 newProgress = project?.progress || 0;
 }
 
 // Sync milestones based on new status
 let updatedMilestones = project?.milestones || DEFAULT_MILESTONES;
 
 const today = new Date().toISOString().split('T')[0];
 
 // Update milestones based on status
 const milestoneNames = updatedMilestones.map(m => m.name);
 const firstMilestone = milestoneNames[0];
 const secondMilestone = milestoneNames[1];
 const thirdMilestone = milestoneNames[2];
 
 if (newStage === 'Logistics') {
 // First milestone in progress
 updatedMilestones = updatedMilestones.map(m => 
 m.name === firstMilestone ? { ...m, status: 'In Progress', date: null } :
 { ...m, status: 'Pending', date: null }
 );
 } else if (newStage === 'Installation') {
 // First milestone done, second in progress
 updatedMilestones = updatedMilestones.map(m => 
 m.name === firstMilestone ? { ...m, status: 'Done', date: m.date || today } :
 m.name === secondMilestone ? { ...m, status: 'In Progress', date: null } :
 { ...m, status: 'Pending', date: null }
 );
 } else if (newStage === 'Commissioned') {
 // First 3 milestones done
 updatedMilestones = updatedMilestones.map(m => 
 m.name === firstMilestone || m.name === secondMilestone || m.name === thirdMilestone
 ? { ...m, status: 'Done', date: m.date || today } :
 { ...m, status: 'Pending', date: null }
 );
 }
 
 // Optimistic update
 setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStage, progress: newProgress, milestones: updatedMilestones } : p));
 logStatusChange(project, project.status, newStage);

 // API call to update status
 try {
 await api.patch(`/projects/${id}/status?tenantId=${TENANT_ID}`, {
 status: newStage,
 progress: newProgress,
 milestones: updatedMilestones,
 userRole: perm.userRole,
 });
 } catch (err) {
 console.error('Error updating project status:', err);
 alert(err.message || 'Failed to update project status');
 // Revert the change
 setProjects(prev => prev.map(p => p.id === id ? { ...p, status: project.status, progress: project.progress, milestones: project.milestones } : p));
 }
 };

 const handleConfirmBackwardsMove = async () => {
 if (backwardsMoveData) {
 await executeStageChange(backwardsMoveData.id, backwardsMoveData.newStage);
 }
 setShowBackwardsConfirm(false);
 setBackwardsMoveData(null);
 };

 const handleCancelBackwardsMove = () => {
 setShowBackwardsConfirm(false);
 setBackwardsMoveData(null);
 };

 // Sort projects by stage according to the defined order
 const sortedProjectsByStage = useMemo(() => {
 const ordered = [];
 STAGE_ORDER.forEach(stageName => {
 const stageData = projectsByStage.find(s => s._id === stageName);
 if (stageData) {
 ordered.push(stageData);
 }
 });
 // Add any stages not in the defined order at the end
 projectsByStage.forEach(s => {
 if (!STAGE_ORDER.includes(s._id)) {
 ordered.push(s);
 }
 });
 return ordered;
 }, [projectsByStage]);

 // Filter out cancelled projects from calculations and kanban view
 const activeProjects = useMemo(() =>
 projects.filter(p => p.status !== 'Cancelled'),
 [projects]
 );

 // Filter projects for dashboard by selected month
 const dashboardProjects = useMemo(() => {
 if (monthFilter === 'all') return projects;
 
 const [year, month] = monthFilter.split('-');
 return projects.filter(p => {
 const projectDate = p.startDate || p.createdAt || p.date;
 if (!projectDate) return true; // Include projects without dates
 const date = new Date(projectDate);
 return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
 });
 }, [projects, monthFilter]);

 const dashboardActiveProjects = useMemo(() =>
 dashboardProjects.filter(p => p.status !== 'Cancelled'),
 [dashboardProjects]
 );

 const filtered = useMemo(() =>
 projects.filter(p => {
 let matchesStatus = statusFilter === 'All' || p.status === statusFilter;
 // If showNonCompletedOnly is true, exclude Commissioned projects
 if (showNonCompletedOnly && p.status === 'Commissioned') {
 matchesStatus = false;
 }
 const matchesSearch = p.customerName.toLowerCase().includes(search.toLowerCase());
 let matchesProgress = true;
 if (progressFilter !== 'all') {
 const { min, max } = progressFilter;
 matchesProgress = p.progress >= min && p.progress <= max;
 }
 return matchesStatus && matchesSearch && matchesProgress;
 }), [search, statusFilter, progressFilter, projects, showNonCompletedOnly]);

 const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

 // Exclude cancelled from capacity/progress calculations
 const totalKW = activeProjects.reduce((a, p) => a + p.systemSize, 0);
 const active = activeProjects.filter(p => p.status !== 'Commissioned').length;
 const commissioned = activeProjects.filter(p => p.status === 'Commissioned').length;
 const avgProgress = activeProjects.length > 0
 ? Math.round(activeProjects.reduce((a, p) => a + p.progress, 0) / activeProjects.length)
 : 0;

 const ROW_ACTIONS = [
 ...(canView ? [{ label: 'View Details', icon: FolderOpen, onClick: row => setSelected(row) }] : []),
 ...(canEdit ? [{ label: 'Edit', icon: Edit2, onClick: row => handleEditClick(row) }] : []),
 ...(canAssign ? [{ label: 'Update Status', icon: CheckCircle, onClick: row => handleUpdateStatusClick(row) }] : []),
 ...(canView ? [{ label: 'Timeline', icon: Clock3, onClick: row => handleViewTimeline(row) }] : []),
 ...(canView ? [{ label: 'Activity Log', icon: History, onClick: row => handleViewActivity(row) }] : []),
 ...(canDelete ? [{ label: 'Delete', icon: Trash2, onClick: row => handleDeleteProject(row.id), danger: true }] : []),
 ];

 // Use dynamic milestone names from settings, but map status from stored project milestones
 const effectiveMilestones = useMemo(() => {
 const dynamicMilestones = settingsMilestones || getMilestones?.() || [];
 const storedMilestones = selected?.milestones || [];
 
 // DEBUG: Log all values for diagnosis
 console.log('[DEBUG effectiveMilestones] settingsMilestones:', settingsMilestones);
 console.log('[DEBUG effectiveMilestones] dynamicMilestones:', dynamicMilestones);
 console.log('[DEBUG effectiveMilestones] storedMilestones:', storedMilestones);
 console.log('[DEBUG effectiveMilestones] dynamicMilestones.length:', dynamicMilestones.length);
 
 if (dynamicMilestones.length > 0) {
 // Map dynamic names with stored status (by index)
 const result = dynamicMilestones.map((m, idx) => {
 const stored = storedMilestones[idx];
 return {
 name: m.name,
 status: stored?.status || 'Pending',
 date: stored?.date || null
 };
 });
 console.log('[DEBUG effectiveMilestones] Using dynamic milestones:', result);
 return result;
 }
 
 // Fallback: use stored milestones or defaults
 const fallback = storedMilestones.length > 0 ? storedMilestones : [
 { name: 'Material Ready', status: 'Pending', date: null },
 { name: 'Installation', status: 'Pending', date: null },
 { name: 'Commission', status: 'Pending', date: null },
 { name: 'Billing', status: 'Pending', date: null },
 { name: 'Closure', status: 'Pending', date: null }
 ];
 console.log('[DEBUG effectiveMilestones] Using fallback milestones:', fallback);
 return fallback;
 }, [settingsMilestones, getMilestones, selected?.milestones]);
 
 const STEPPER_STEPS = effectiveMilestones.map(m => ({ name: m.name, status: m.status, date: m.date }));

 // Debug logging
 console.log('[DEBUG Mark Stage] selected:', selected);
 console.log('[DEBUG Mark Stage] STEPPER_STEPS:', STEPPER_STEPS);
 console.log('[DEBUG Mark Stage] selected?.pm:', selected?.pm);
 console.log('[DEBUG Mark Stage] selected?.assignedTo:', selected?.assignedTo);

 const firstPendingIndex = STEPPER_STEPS.findIndex(s => s.status === 'Pending' || s.status === 'In Progress');
 const canMarkComplete = firstPendingIndex !== -1;

 const isAdminLike = (() => {
 const r = String(authUser?.role || '').toLowerCase();
 return authUser?.isSuperAdmin === true || r === 'admin' || r === 'superadmin' || r === 'super admin';
 })();

 const isAssignedToMe = (() => {
 if (!authUser) return false;
 if (isAdminLike) return true;
 const myId = String(authUser?.id || authUser?._id || '');
 const assignedToRaw = selected?.assignedTo?._id || selected?.assignedTo;
 const assignedToStr = assignedToRaw ? String(assignedToRaw) : '';
 if (myId && assignedToStr && myId === assignedToStr) return true;
 const email = String(authUser?.email || '');
 const emailPrefix = email.includes('@') ? email.split('@')[0] : '';
 const firstName = String(authUser?.firstName || '');
 const lastName = String(authUser?.lastName || '');
 const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
 const pm = String(selected?.pm || '').toLowerCase();
 if (emailPrefix && pm.includes(emailPrefix.toLowerCase())) return true;
 if (firstName && pm.includes(firstName.toLowerCase())) return true;
 if (fullName && pm.includes(fullName)) return true;
 return false;
 })();

 // Check if any employee is assigned to the project
 const hasEmployeeAssigned = (() => {
 const pm = String(selected?.pm || '').trim();
 const assignedTo = selected?.assignedTo;
 // Check if PM exists and is not TBD/Unassigned/empty
 const hasPM = pm && pm !== 'TBD' && pm !== 'Unassigned' && pm !== '';
 // Check if assignedTo exists (ObjectId or string)
 const hasAssignedTo = assignedTo && (assignedTo._id || assignedTo);
 return hasPM || hasAssignedTo;
 })();

 console.log('[DEBUG Mark Stage] firstPendingIndex:', firstPendingIndex, 'canMarkComplete:', canMarkComplete);

 const handleMarkStageComplete = async () => {
 if (!selected || !canMarkComplete) return;
 if (!isAssignedToMe) return;

 const milestoneName = STEPPER_STEPS[firstPendingIndex].name;

 try {
 // Update the milestone status in backend
 const updatedMilestones = effectiveMilestones.map((m, idx) =>
 idx === firstPendingIndex
 ? { ...m, status: 'Done', date: new Date().toISOString().split('T')[0] }
 : m
 );

 // Calculate new progress based on completed milestones
 const completedCount = updatedMilestones.filter(m => m.status === 'Done').length;
 const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);

 // Determine new project status based on milestone position
 let newStatus = selected.status;
 const totalMilestones = updatedMilestones.length;
 
 // If all milestones complete, project is Commissioned
 if (completedCount === totalMilestones) {
 newStatus = 'Commissioned';
 } else {
 // Map milestone position to project status
 // First 1/3 of milestones -> Logistics
 // Middle 1/3 of milestones -> Installation 
 // Last 1/3 of milestones -> Commissioned
 const milestonePosition = firstPendingIndex + 1; // 1-based position after completing this milestone
 if (milestonePosition <= Math.ceil(totalMilestones / 3)) {
 newStatus = 'Logistics';
 } else if (milestonePosition <= Math.ceil((2 * totalMilestones) / 3)) {
 newStatus = 'Installation';
 } else {
 newStatus = 'Commissioned';
 }
 }

 await api.patch(`/projects/${selected.id}/status?tenantId=${TENANT_ID}`, {
 status: newStatus,
 progress: newProgress,
 milestones: updatedMilestones.map(m => ({ name: m.name, status: m.status, date: m.date })),
 userRole: perm.userRole
 });

 // Update local state
 const updatedProject = {
 ...selected,
 status: newStatus,
 progress: newProgress,
 milestones: updatedMilestones
 };

 setProjects(prev => prev.map(p => p.id === selected.id ? updatedProject : p));
 setSelected(updatedProject);

 // Show success message or close modal
 // setSelected(null); // Optional: close modal after update
 } catch (err) {
 console.error('Error marking stage complete:', err);
 alert('Failed to mark stage complete. Please try again.');
 }
 };

 const handleDeleteProject = async (id) => {
 if (!window.confirm('Are you sure you want to delete this project?')) return;

 try {
 await api.delete(`/projects/${id}?tenantId=${TENANT_ID}`);

 setProjects(prev => prev.filter(p => p.id !== id));
 } catch (err) {
 console.error('Error deleting project:', err);
 alert('Failed to delete project. Please try again.');
 }
 };

 const handleCreateProject = async () => {
 setSubmitting(true);
 try {
 const newProject = {
 projectId: `P${Date.now().toString().slice(-4)}`,
 customerName: form.customerName,
 site: form.site,
 systemSize: parseFloat(form.systemSize) || 0,
 value: parseFloat(form.value) || 0,
 pm: form.pm,
 estEndDate: form.estEndDate,
 email: form.email,
 mobileNumber: form.mobileNumber,
 paymentTerms: form.paymentTerms ? parseFloat(form.paymentTerms) : undefined,
 visitsPerMonth: form.visitsPerMonth ? parseInt(form.visitsPerMonth) : undefined,
 totalVisits: form.totalVisits ? parseInt(form.totalVisits) : undefined,
 startDate: new Date().toISOString().split('T')[0],
 status: 'Logistics',
 progress: 0,
 milestones: DEFAULT_MILESTONES,
 materials: form.materials.map(m => ({
 itemId: m.itemId,
 itemName: m.itemName,
 quantity: parseInt(m.quantity) || 0,
 issuedDate: m.issuedDate,
 remarks: m.remarks
 }))
 };

 const createdProject = await api.post(`/projects?tenantId=${TENANT_ID}`, newProject);
 const projectData = createdProject?.data ?? createdProject;
 setProjects(prev => [...prev, { ...projectData, id: projectData.projectId }]);
 setShowAdd(false);
 setForm({ customerName: '', site: '', systemSize: '', pm: '', department: '', value: '', estEndDate: '', email: '', mobileNumber: '', paymentTerms: '', visitsPerMonth: '', totalVisits: '', materials: [] });
 alert('Project created successfully!');
 } catch (err) {
 console.error('Error creating project:', err);
 alert(err.message || 'Failed to create project. Please try again.');
 } finally {
 setSubmitting(false);
 }
 };

 // Helper functions for managing materials
 const addMaterial = () => {
 setForm(f => ({
 ...f,
 materials: [...f.materials, { itemId: '', itemName: '', quantity: '', issuedDate: '', remarks: '' }]
 }));
 };

 const removeMaterial = (index) => {
 setForm(f => ({
 ...f,
 materials: f.materials.filter((_, i) => i !== index)
 }));
 };

 const updateMaterial = (index, field, value) => {
 setForm(f => {
 const updatedMaterials = [...f.materials];
 if (field === 'itemId') {
 const selectedItem = items.find(i => i._id === value || i.id === value);
 updatedMaterials[index] = {
 ...updatedMaterials[index],
 itemId: value,
 itemName: selectedItem?.description || selectedItem?.name || ''
 };
 } else {
 updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
 }
 return { ...f, materials: updatedMaterials };
 });
 };

 const handleViewTimeline = (project) => {
 setTimelineProject(project);
 setShowTimeline(true);
 };

 const handleViewActivity = (project) => {
 setActivityProject(project);
 setShowActivity(true);
 };

 // Handle customer selection from dropdown - auto-fill email and mobile
 const handleCustomerSelect = (customerId, isEdit = false) => {
 const selectedCustomer = customers.find(c => c._id === customerId || c.id === customerId);
 if (selectedCustomer) {
 if (isEdit) {
 setEditForm(f => ({
 ...f,
 customerName: selectedCustomer.name || '',
 email: selectedCustomer.email || '',
 mobileNumber: selectedCustomer.phone || selectedCustomer.mobileNumber || ''
 }));
 } else {
 setForm(f => ({
 ...f,
 customerName: selectedCustomer.name || '',
 email: selectedCustomer.email || '',
 mobileNumber: selectedCustomer.phone || selectedCustomer.mobileNumber || ''
 }));
 }
 }
 };

 // Helper functions for managing materials
 const addEditMaterial = () => {
 setEditForm(f => ({
 ...f,
 materials: [...(f.materials || []), { itemId: '', itemName: '', quantity: '', issuedDate: '', remarks: '' }]
 }));
 };

 const removeEditMaterial = (index) => {
 setEditForm(f => ({
 ...f,
 materials: (f.materials || []).filter((_, i) => i !== index)
 }));
 };

 const updateEditMaterial = (index, field, value) => {
 setEditForm(f => {
 const updatedMaterials = [...(f.materials || [])];
 if (field === 'itemId') {
 const selectedItem = items.find(i => i._id === value || i.id === value);
 updatedMaterials[index] = {
 ...updatedMaterials[index],
 itemId: value,
 itemName: selectedItem?.description || selectedItem?.name || ''
 };
 } else {
 updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
 }
 return { ...f, materials: updatedMaterials };
 });
 };

 const handleEditClick = (project) => {
 setEditingProject(project);
 setEditForm({
 customerName: project.customerName || '',
 site: project.site || '',
 systemSize: project.systemSize || '',
 pm: project.pm || '',
 value: project.value || '',
 estEndDate: project.estEndDate || '',
 email: project.email || '',
 mobileNumber: project.mobileNumber || '',
 paymentTerms: project.paymentTerms || '',
 visitsPerMonth: project.visitsPerMonth || '',
 totalVisits: project.totalVisits || '',
 materials: project.materials || []
 });
 setShowEdit(true);
 };

 const handleUpdateStatusClick = (project) => {
 setStatusProject(project);
 setNewStatus(project.status);
 setShowStatus(true);
 };

 const handleStatusUpdateConfirm = async () => {
 if (!statusProject || !newStatus) return;
 await handleStageChange(statusProject.id, newStatus);
 setShowStatus(false);
 setStatusProject(null);
 setNewStatus('');
 };

 const handleUpdateProject = async () => {
 if (!editingProject) return;

 setSubmitting(true);
 try {
 const updateData = {
 customerName: editForm.customerName,
 site: editForm.site,
 systemSize: parseFloat(editForm.systemSize) || 0,
 value: parseFloat(editForm.value) || 0,
 pm: editForm.pm,
 estEndDate: editForm.estEndDate,
 email: editForm.email,
 mobileNumber: editForm.mobileNumber,
 paymentTerms: editForm.paymentTerms ? parseFloat(editForm.paymentTerms) : undefined,
 visitsPerMonth: editForm.visitsPerMonth ? parseInt(editForm.visitsPerMonth) : undefined,
 totalVisits: editForm.totalVisits ? parseInt(editForm.totalVisits) : undefined,
 materials: (editForm.materials || []).map(m => ({
 itemId: m.itemId,
 itemName: m.itemName,
 quantity: parseInt(m.quantity) || 0,
 issuedDate: m.issuedDate,
 remarks: m.remarks
 }))
 };

 const updatedProject = await api.patch(`/projects/${editingProject.id}?tenantId=${TENANT_ID}`, updateData);
 const projectData = updatedProject?.data ?? updatedProject;

 setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...projectData } : p));
 setShowEdit(false);
 setEditingProject(null);
 setEditForm({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '', email: '', mobileNumber: '', materials: [], paymentTerms: '', visitsPerMonth: '', totalVisits: '' });
 alert('Project updated successfully!');
 } catch (err) {
 console.error('Error updating project:', err);
 alert(err.message || 'Failed to update project. Please try again.');
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="animate-fade-in space-y-5">
 <PageHeader
 title="Project Management"
 subtitle="Track all EPC projects �’�¡· milestones �’�¡· progress �’�¡· delivery"
 tabs={[
 { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
 { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
 { id: 'table', label: 'Table', icon: List }
 ]}
 activeTab={view}
 onTabChange={setView}
 preTabsContent={
 view === 'dashboard' && (
 <CompactCalendarFilter
 onDateChange={(dateInfo) => {
 if (dateInfo === null) {
 setMonthFilter('all');
 } else if (dateInfo.isToday) {
 const today = new Date();
 setMonthFilter(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
 } else if (dateInfo.month !== undefined && dateInfo.month !== null) {
 setMonthFilter(`${dateInfo.year}-${String(dateInfo.month + 1).padStart(2, '0')}`);
 } else {
 // Full year selected - filter by year
 setMonthFilter(`${dateInfo.year}`);
 }
 }}
 />
 )
 }
 actions={[
 ...(canCreate ? [{ type: 'button', label: 'New Project', icon: Plus, variant: 'primary', onClick: () => { if (guardCreate()) setShowAdd(true); } }] : []),
 view !== 'dashboard' && { type: 'button', label: showCardsInViews ? 'Hide Cards' : 'Show Cards', icon: Layers, variant: 'ghost', onClick: () => setShowCardsInViews(!showCardsInViews) }
 ].filter(Boolean)}
 />

 {(view === 'dashboard' || showCardsInViews) && (
 <>
 {/* Summary Cards with Modern Attractive Design */}
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
 <div 
 className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-200 border border-violet-200 cursor-pointer hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300"
 onClick={() => { 
 setView('table'); 
 setFilter('All');
 setShowNonCompletedOnly(false);
 }}
 >
 <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
 <div className="relative flex items-start justify-between">
 <div>
 <span className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">TOTAL PROJECTS</span>
 <div className="text-3xl font-bold text-gray-800 mt-2">{projectStats?.totalProjects ?? projects.length}</div>
 <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
 <TrendingUp size={10} className="text-violet-600" /> All projects
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-violet-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
 <Layers size={24} className="text-violet-700" />
 </div>
 </div>
 </div>

 <div 
 className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-200 border border-blue-200 cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300"
 onClick={() => { 
 setView('table'); 
 setFilter('All');
 setShowNonCompletedOnly(true);
 }}
 >
 <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
 <div className="relative flex items-start justify-between">
 <div>
 <span className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">ACTIVE PROJECTS</span>
 <div className="text-3xl font-bold text-gray-800 mt-2">{projectStats?.active ?? active}</div>
 <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
 <Zap size={10} className="text-blue-600" /> Currently executing
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
 <FolderOpen size={24} className="text-blue-700" />
 </div>
 </div>
 </div>

 <div 
 className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-200 border border-emerald-200 cursor-pointer hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300"
 onClick={() => { 
 setView('table'); 
 setFilter('Commissioned');
 setShowNonCompletedOnly(false);
 }}
 >
 <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
 <div className="relative flex items-start justify-between">
 <div>
 <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">COMPLETED</span>
 <div className="text-3xl font-bold text-gray-800 mt-2">{projectStats?.commissioned ?? commissioned}</div>
 <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
 <CheckCircle size={10} className="text-emerald-600" /> Finished projects
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
 <CheckCircle size={24} className="text-emerald-700" />
 </div>
 </div>
 </div>

 <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 border border-amber-200 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300">
 <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
 <div className="relative flex items-start justify-between">
 <div>
 <span className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">TOTAL CAPACITY</span>
 <div className="text-3xl font-bold text-gray-800 mt-2">{Math.round(projectStats?.totalCapacity ?? totalKW)} <span className="text-lg font-normal text-[var(--text-secondary)]">kW</span></div>
 <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
 <Zap size={10} className="text-amber-600" /> Pipeline capacity
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
 <Zap size={24} className="text-amber-700" />
 </div>
 </div>
 </div>

 <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-200 border border-rose-200 hover:shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300">
 <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
 <div className="relative flex items-start justify-between">
 <div>
 <span className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">AVG PROGRESS</span>
 <div className="text-3xl font-bold text-gray-800 mt-2">{Math.round(projectStats?.avgProgress ?? avgProgress)}%</div>
 <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
 <BarChart2 size={10} className="text-rose-600" /> Across all projects
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-rose-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
 <TrendingUp size={24} className="text-rose-700" />
 </div>
 </div>
 </div>
 </div>
 </>
 )}

 {/* Dashboard View - Comprehensive Charts */}
 {view === 'dashboard' && (
 <div className="space-y-4">
 {/* No Data Message */}
 {dashboardProjects.length === 0 && monthFilter !== 'all' && (
 <div className="glass-card p-8 text-center">
 <div className="flex flex-col items-center gap-3">
 <Calendar size={48} className="text-[var(--text-muted)]" />
 <h3 className="text-lg font-semibold text-[var(--text-primary)]">No Data Found</h3>
 <p className="text-sm text-[var(--text-muted)]">
 No projects found for the selected period. Try selecting a different time range.
 </p>
 </div>
 </div>
 )}

 {/* Charts - Only show if data exists */}
 {(dashboardProjects.length > 0 || monthFilter === 'all') && (
 <>
 {/* Row 1: Projects by Stage & Status Distribution */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {/* Projects by Stage Bar Chart */}
 <div className="glass-card p-4">
 <div className="flex items-center mb-3">
 <div className="flex items-center gap-2">
 <BarChart2 size={15} className="text-[var(--accent)]" />
 <h3 className="text-sm font-semibold text-[var(--text-primary)]">Projects by Stage</h3>
 </div>
 </div>
 <ResponsiveContainer width="100%" height={220}>
 <BarChart data={STAGE_ORDER.map(stage => {
 const stageData = projectsByStage.find(s => s._id === stage);
 return { stage, count: stageData?.count || 0, capacity: Math.round(stageData?.capacity || 0) };
 })} barSize={20} barGap={3}>
 <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
 <XAxis dataKey="stage" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} interval={0} />
 <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
 <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
 <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Projects" />
 <Bar dataKey="capacity" fill="#06b6d4" radius={[3, 3, 0, 0]} name="Capacity (kW)" />
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Status Distribution Pie Chart */}
 <div className="glass-card p-4">
 <div className="flex items-center gap-2 mb-3">
 <TrendingUp size={15} className="text-[var(--accent)]" />
 <h3 className="text-sm font-semibold text-[var(--text-primary)]">Status Distribution</h3>
 </div>
 <ResponsiveContainer width="100%" height={220}>
 <PieChart>
 <Pie
 data={[
 { name: 'Active', value: dashboardActiveProjects.filter(p => p.status !== 'Commissioned' && p.status !== 'On Hold' && p.status !== 'Cancelled').length, color: '#3b82f6' },
 { name: 'Commissioned', value: dashboardActiveProjects.filter(p => p.status === 'Commissioned').length, color: '#22c55e' },
 { name: 'On Hold', value: dashboardActiveProjects.filter(p => p.status === 'On Hold').length, color: '#f59e0b' },
 { name: 'Cancelled', value: dashboardProjects.filter(p => p.status === 'Cancelled').length, color: '#ef4444' },
 ].filter(d => d.value > 0)}
 cx="50%"
 cy="50%"
 innerRadius={50}
 outerRadius={80}
 paddingAngle={3}
 dataKey="value"
 >
 {[
 { name: 'Active', value: dashboardActiveProjects.filter(p => p.status !== 'Commissioned' && p.status !== 'On Hold' && p.status !== 'Cancelled').length, color: '#3b82f6' },
 { name: 'Commissioned', value: dashboardActiveProjects.filter(p => p.status === 'Commissioned').length, color: '#22c55e' },
 { name: 'On Hold', value: dashboardActiveProjects.filter(p => p.status === 'On Hold').length, color: '#f59e0b' },
 { name: 'Cancelled', value: dashboardProjects.filter(p => p.status === 'Cancelled').length, color: '#ef4444' },
 ].filter(d => d.value > 0).map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
 <Legend wrapperStyle={{ fontSize: 11 }} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Row 2: Performance Overview */}
 <div className="glass-card p-5">
 <div className="flex items-center gap-2 mb-5">
 <TrendingUp size={18} className="text-[var(--accent)]" />
 <h3 className="text-base font-semibold text-[var(--text-primary)]">Performance Overview</h3>
 </div>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 { label: 'Completion Rate', value: Math.round((dashboardActiveProjects.filter(p => p.progress === 100).length / (dashboardActiveProjects.length || 1)) * 100), target: 85, color: '#22c55e', bgColor: 'bg-green-50', iconColor: 'text-green-500', hint: 'Finished projects' },
 { label: 'Avg Progress', value: dashboardActiveProjects.length > 0 ? Math.round(dashboardActiveProjects.reduce((a, p) => a + p.progress, 0) / dashboardActiveProjects.length) : 0, target: 75, color: '#3b82f6', bgColor: 'bg-blue-50', iconColor: 'text-blue-500', hint: 'How far along' },
 { label: 'On Track', value: Math.round((dashboardActiveProjects.filter(p => p.progress >= 50).length / (dashboardActiveProjects.length || 1)) * 100), target: 80, color: '#8b5cf6', bgColor: 'bg-purple-50', iconColor: 'text-purple-500', hint: 'Going well' },
 { label: 'Delayed Risk', value: Math.round((dashboardActiveProjects.filter(p => p.progress < 25 && p.status !== 'Commissioned').length / (dashboardActiveProjects.length || 1)) * 100), target: 15, color: '#f59e0b', bgColor: 'bg-amber-50', iconColor: 'text-amber-500', reverse: true, hint: 'Needs attention' },
 ].map((metric) => {
 const circumference = 2 * Math.PI * 36;
 const strokeDashoffset = circumference - (Math.min(metric.value, 100) / 100) * circumference;
 const isGood = metric.reverse ? metric.value <= metric.target : metric.value >= metric.target;
 
 return (
 <div key={metric.label} className="flex items-center gap-4">
 {/* Circular Chart */}
 <div className="relative w-20 h-20 flex-shrink-0">
 <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
 {/* Background circle */}
 <circle
 cx="40"
 cy="40"
 r="36"
 fill="none"
 stroke={metric.color + '20'}
 strokeWidth="8"
 />
 {/* Progress circle */}
 <circle
 cx="40"
 cy="40"
 r="36"
 fill="none"
 stroke={metric.color}
 strokeWidth="8"
 strokeLinecap="round"
 strokeDasharray={circumference}
 strokeDashoffset={strokeDashoffset}
 className="transition-all duration-1000 ease-out"
 />
 </svg>
 {/* Percentage in center */}
 <div className="absolute inset-0 flex items-center justify-center">
 <span className="text-sm font-bold" style={{ color: metric.color }}>{metric.value}%</span>
 </div>
 </div>
 
 {/* Text Info */}
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{metric.label}</p>
 <div className="flex items-center gap-1.5 mb-1">
 <span className="text-xs text-[var(--text-muted)]">Target: {metric.target}%</span>
 </div>
 <div className="flex items-center gap-1.5 mb-1">
 <span className={`text-xs font-medium ${isGood ? 'text-green-500' : metric.reverse ? 'text-amber-500' : 'text-red-500'}`}>
 {isGood ? '�’�“œ On Track' : metric.reverse ? '�’ High Risk' : '�’� Below Target'}
 </span>
 </div>
 <p className="text-[10px] text-[var(--text-faint)] italic">{metric.hint}</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Row 3: Project Manager Performance - Charts */}
 <div className="glass-card p-5">
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-2">
 <User size={18} className="text-[var(--accent)]" />
 <h3 className="text-base font-semibold text-[var(--text-primary)]">Project Manager Performance</h3>
 </div>
 <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" /> Active</span>
 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" /> Completed</span>
 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" /> Progress</span>
 </div>
 </div>
 
 {/* PM Charts Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
 {/* Chart 1: Projects Distribution Bar Chart */}
 <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
 <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Projects by Manager</h4>
 <div className="space-y-3">
 {Array.from(new Set(dashboardProjects.map(p => p.pm))).filter(pm => pm).slice(0, 6).map((pm, index) => {
 const pmProjects = dashboardProjects.filter(p => p.pm === pm);
 const maxProjects = Math.max(...Array.from(new Set(dashboardProjects.map(p => p.pm))).filter(pm => pm).map(pm => dashboardProjects.filter(p => p.pm === pm).length));
 const barWidth = maxProjects > 0 ? (pmProjects.length / maxProjects) * 100 : 0;
 const colors = [
 'from-violet-400 to-purple-600',
 'from-blue-400 to-blue-600',
 'from-cyan-400 to-teal-500',
 'from-amber-400 to-orange-500',
 'from-rose-400 to-pink-500',
 'from-emerald-400 to-green-500'
 ];
 return (
 <div key={pm} className="flex items-center gap-3">
 <div className="w-24 text-xs font-medium text-[var(--text-primary)] truncate">{pm}</div>
 <div className="flex-1 h-6 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
 <div 
 className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2`}
 style={{ width: `${Math.max(barWidth, 8)}%` }}
 >
 <span className="text-[10px] text-white font-semibold">{pmProjects.length}</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Chart 2: Active vs Completed Stacked Bar */}
 <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
 <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Active vs Completed Projects</h4>
 <div className="space-y-3">
 {Array.from(new Set(dashboardProjects.map(p => p.pm))).filter(pm => pm).slice(0, 6).map((pm, index) => {
 const pmProjects = dashboardProjects.filter(p => p.pm === pm);
 const completed = pmProjects.filter(p => p.status === 'Commissioned').length;
 const active = pmProjects.filter(p => p.status !== 'Commissioned' && p.status !== 'Cancelled').length;
 const total = active + completed;
 const activePct = total > 0 ? (active / total) * 100 : 0;
 const completedPct = total > 0 ? (completed / total) * 100 : 0;
 
 return (
 <div key={pm} className="flex items-center gap-3">
 <div className="w-24 text-xs font-medium text-[var(--text-primary)] truncate">{pm.split(' ')[0]}</div>
 <div className="flex-1 h-5 flex rounded-full overflow-hidden">
 <div 
 className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000 ease-out"
 style={{ width: `${activePct}%` }}
 title={`Active: ${active}`}
 />
 <div 
 className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out"
 style={{ width: `${completedPct}%` }}
 title={`Completed: ${completed}`}
 />
 </div>
 <div className="w-16 text-[10px] text-right">
 <span className="text-blue-600 font-semibold">{active}</span>
 <span className="text-[var(--text-muted)] mx-1">|</span>
 <span className="text-[var(--green)] font-semibold">{completed}</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Chart 3: Average Progress Circular Indicators */}
 <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
 <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Average Progress</h4>
 <div className="grid grid-cols-3 gap-4">
 {Array.from(new Set(dashboardProjects.map(p => p.pm))).filter(pm => pm).slice(0, 6).map((pm, index) => {
 const pmProjects = dashboardProjects.filter(p => p.pm === pm);
 const avgProgress = pmProjects.length > 0 ? Math.round(pmProjects.reduce((a, p) => a + (p.progress || 0), 0) / pmProjects.length) : 0;
 const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e'];
 const color = colors[index % colors.length];
 const circumference = 2 * Math.PI * 28;
 const strokeDashoffset = circumference - (avgProgress / 100) * circumference;
 
 return (
 <div key={pm} className="flex flex-col items-center">
 <div className="relative w-16 h-16">
 <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
 <circle cx="32" cy="32" r="28" fill="none" stroke={color + '20'} strokeWidth="6" />
 <circle 
 cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="6" 
 strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
 className="transition-all duration-1000 ease-out"
 />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center">
 <span className="text-xs font-bold" style={{ color }}>{avgProgress}%</span>
 </div>
 </div>
 <span className="text-[10px] text-[var(--text-muted)] mt-1 text-center truncate w-full">{pm.split(' ')[0]}</span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Chart 4: Project Value Comparison */}
 <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
 <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Total Project Value</h4>
 <div className="space-y-3">
 {Array.from(new Set(dashboardProjects.map(p => p.pm))).filter(pm => pm).slice(0, 6).map((pm, index) => {
 const pmProjects = dashboardProjects.filter(p => p.pm === pm);
 const totalValue = pmProjects.reduce((a, p) => a + (p.value || 0), 0);
 const maxValue = Math.max(...Array.from(new Set(dashboardProjects.map(p => p.pm))).filter(pm => pm).map(pm => dashboardProjects.filter(p => p.pm === pm).reduce((a, p) => a + (p.value || 0), 0)));
 const barWidth = maxValue > 0 ? (totalValue / maxValue) * 100 : 0;
 const colors = [
 'from-violet-400 to-purple-600',
 'from-blue-400 to-blue-600',
 'from-cyan-400 to-teal-500',
 'from-amber-400 to-orange-500',
 'from-rose-400 to-pink-500',
 'from-emerald-400 to-green-500'
 ];
 
 return (
 <div key={pm} className="flex items-center gap-3">
 <div className="w-24 text-xs font-medium text-[var(--text-primary)] truncate">{pm.split(' ')[0]}</div>
 <div className="flex-1 h-5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
 <div 
 className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-1000 ease-out`}
 style={{ width: `${Math.max(barWidth, 5)}%` }}
 />
 </div>
 <div className="w-16 text-[10px] font-semibold text-[var(--text-primary)] text-right">
 �’{(totalValue / 100000).toFixed(1)}L
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 )}

 {/* Table View */}
 {view === 'table' && (
 <>
 <div className="flex flex-wrap gap-2 items-center mb-2">
 <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
 {STATUS_FILTERS.map(s => (
 <button key={s} onClick={() => { setFilter(s); setPage(1); setShowNonCompletedOnly(false); }}
 className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
 ))}
 </div>
 <div className="flex flex-wrap gap-2 items-center mb-2 justify-between">
 <div className="flex flex-wrap gap-2 items-center">
 <Input placeholder="Search projects�’" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
 <span className="text-xs text-[var(--text-muted)] mr-1 ml-2">Progress:</span>
 {PROGRESS_FILTERS.map(p => (
 <button key={p.label} onClick={() => { setProgressFilter(p.value); setPage(1); }}
 className={`filter-chip ${progressFilter === p.value ? 'filter-chip-active' : ''}`}>{p.label}</button>
 ))}
 </div>
 <div className="flex items-center gap-2">
 <ImportExport 
 moduleName="Projects" 
 fields={PROJECT_IMPORT_FIELDS}
 onExport={handleExport}
 onImport={handleImport}
 />
 <Button size="sm" variant="secondary" onClick={() => setColToggleOpen(p => !p)}>
 <Eye size={12} /> Columns
 </Button>
 </div>
 {colToggleOpen && (
 <>
 <div className="fixed inset-0 z-30" onClick={() => setColToggleOpen(false)} />
 <div className="absolute right-0 top-9 z-40 w-44 glass-card shadow-2xl shadow-black/40 py-1.5 animate-slide-up">
 {COLUMNS.map(col => (
 <button
 key={col.key}
 onClick={() => {
 setHiddenCols(prev => {
 const next = new Set(prev);
 next.has(col.key) ? next.delete(col.key) : next.add(col.key);
 return next;
 });
 }}
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
 <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
 page={page} pageSize={pageSize} onPageChange={setPage}
 onPageSizeChange={s => { setPageSize(s); setPage(1); }}
 hiddenCols={hiddenCols}
 onHiddenColsChange={setHiddenCols}
 hideColumnToggle={true}
 rowActions={ROW_ACTIONS} emptyText="No projects found."
 onRowClick={row => setSelected(row)}
 selectedRows={selectedProjects}
 onSelectRows={setSelectedProjects}
 bulkActions={[
 { 
 label: 'Export Selected', 
 icon: Download, 
 onClick: (selectedIds) => {
 const selectedData = filtered.filter(p => selectedIds.has(p.id));
 const dataToExport = selectedData.map(p => ({
 projectId: p.id,
 customerName: p.customerName,
 site: p.site,
 systemSize: p.systemSize,
 pm: p.pm,
 value: p.value,
 status: p.status,
 progress: p.progress,
 email: p.email || '',
 mobileNumber: p.mobileNumber || '',
 estEndDate: p.estEndDate || '',
 startDate: p.startDate || '',
 }));
 const headers = PROJECT_IMPORT_FIELDS.map(f => f.label).join(',');
 const rows = dataToExport.map(row => 
 PROJECT_IMPORT_FIELDS.map(f => {
 const val = row[f.id] ?? '';
 if (String(val).includes(',') || String(val).includes('"')) {
 return `"${String(val).replace(/"/g, '""')}"`;
 }
 return val;
 }).join(',')
 ).join('\n');
 const csvContent = [headers, rows].join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download', `projects_selected_${new Date().toISOString().split('T')[0]}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 setSelectedProjects(new Set()); // Clear selection after export
 }
 },
 ...(canDelete ? [{
 label: 'Delete Selected',
 icon: Trash2,
 danger: true,
 onClick: async (selectedIds) => {
 if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected projects?`)) return;
 
 try {
 const deletePromises = Array.from(selectedIds).map(id => 
 api.delete(`/projects/${id}?tenantId=${TENANT_ID}`)
 );
 await Promise.all(deletePromises);
 
 setProjects(prev => prev.filter(p => !selectedIds.has(p.id)));
 setSelectedProjects(new Set());
 alert(`Successfully deleted ${selectedIds.size} projects!`);
 } catch (err) {
 console.error('Error deleting projects:', err);
 alert('Failed to delete some projects. Please try again.');
 }
 }
 }] : [])
 ]} />
 </>
 )}

 {/* Kanban View */}
 {view === 'kanban' && (
 <>
 <div className="flex flex-wrap gap-2 items-center">
 <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
 {STATUS_FILTERS.map(s => (
 <button key={s} onClick={() => { setFilter(s); setShowNonCompletedOnly(false); }}
 className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
 ))}
 <div className="ml-auto">
 <Input placeholder="Search projects�’" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
 </div>
 </div>
 {loading ? (
 <div className="glass-card p-8 text-center">
 <div className="animate-pulse text-[var(--text-muted)]">Loading projects...</div>
 </div>
 ) : error ? (
 <div className="glass-card p-8 text-center text-red-500">
 <p>Error loading projects: {error}</p>
 <p className="text-xs mt-2 text-[var(--text-muted)]">Make sure the backend server is running on port 8000</p>
 </div>
 ) : (
 <KanbanBoard projects={filtered} onStageChange={handleStageChange} onCardClick={setSelected} />
 )}
 </>
 )}

 {/* Add Modal */}
 <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Project"
 footer={<div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
 <Button onClick={handleCreateProject} disabled={!form.customerName || !form.site || !form.systemSize || !form.pm || !form.department}>
 <Plus size={13} /> Create Project
 </Button>
 </div>}>
 <div className="space-y-3 max-h-[70vh] overflow-y-auto">
 <FormField label="Select Customer">
 <Select 
 value={customers.find(c => c.name === form.customerName)?._id || ''} 
 onChange={e => handleCustomerSelect(e.target.value, false)}
 >
 <option value="">{customersLoading ? 'Loading customers...' : 'Select a customer'}</option>
 {customers.map(c => (
 <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
 ))}
 </Select>
 </FormField>
 <div className="grid grid-cols-2 gap-3">
 <FormField label="Email"><Input type="email" placeholder="customer@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
 <FormField label="Mobile Number"><Input type="tel" placeholder="+91 98765 43210" value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} /></FormField>
 </div>
 <FormField label="Site Address"><Input placeholder="Installation site" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} /></FormField>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <FormField label="System Size (kW)"><Input type="number" placeholder="50" value={form.systemSize} onChange={e => setForm(f => ({ ...f, systemSize: e.target.value }))} /></FormField>
 <FormField label="Project Value (�’)"><Input type="number" placeholder="280000" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></FormField>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <FormField label="Department">
 <Select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value, pm: '' }))}>
 <option value="">{departmentsLoading ? 'Loading...' : 'Select Department'}</option>
 {departments.map(d => <option key={d._id || d.id} value={d.name}>{d.name}</option>)}
 </Select>
 </FormField>
 <FormField label="Assign Employee">
 <Select value={form.pm} onChange={e => setForm(f => ({ ...f, pm: e.target.value }))} disabled={!form.department || employeesLoading}>
 <option value="">{employeesLoading ? 'Loading...' : form.department ? 'Select Employee' : 'First select department'}</option>
 {employeesByDept.map(e => {
 const fullName = getEmployeeDisplayName(e);
 const designation = e.designation || e.role || e.roleId || e.position || '';
 const empId = e.employeeId || e.employee_id || e.empId || e.id || '';
 return (
 <option key={e._id || e.id} value={fullName}>
 {fullName}{empId ? ` (${empId})` : ''}{designation ? ` - ${designation}` : ''}
 </option>
 );
 })}
 </Select>
 </FormField>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <FormField label="Estimated End Date"><Input type="date" value={form.estEndDate} onChange={e => setForm(f => ({ ...f, estEndDate: e.target.value }))} /></FormField>
 </div>
 <div className="grid grid-cols-3 gap-3">
 <FormField label="Payment Terms %"><Input type="number" placeholder="e.g., 50" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} /></FormField>
 <FormField label="Visit in Month"><Input type="number" placeholder="e.g., 2" value={form.visitsPerMonth} onChange={e => setForm(f => ({ ...f, visitsPerMonth: e.target.value }))} /></FormField>
 <FormField label="Total Visit"><Input type="number" placeholder="e.g., 24" value={form.totalVisits} onChange={e => setForm(f => ({ ...f, totalVisits: e.target.value }))} /></FormField>
 </div>
 </div>
 </Modal>

 {/* Edit Modal */}
 <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit Project �’${editingProject?.id}`}
 footer={<div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
 <Button onClick={handleUpdateProject} disabled={submitting || !editForm.customerName || !editForm.site}>
 {submitting ? 'Saving...' : 'Save Changes'}
 </Button>
 </div>}>
 <div className="space-y-3">
 <FormField label="Select Customer">
 <Select 
 value={customers.find(c => c.name === editForm.customerName)?._id || ''} 
 onChange={e => handleCustomerSelect(e.target.value, true)}
 >
 <option value="">{customersLoading ? 'Loading customers...' : 'Select a customer'}</option>
 {customers.map(c => (
 <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
 ))}
 </Select>
 </FormField>
 <div className="grid grid-cols-2 gap-3">
 <FormField label="Email"><Input type="email" placeholder="customer@email.com" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></FormField>
 <FormField label="Mobile Number"><Input type="tel" placeholder="+91 98765 43210" value={editForm.mobileNumber} onChange={e => setEditForm(f => ({ ...f, mobileNumber: e.target.value }))} /></FormField>
 </div>
 <FormField label="Site Address"><Input placeholder="Installation site" value={editForm.site} onChange={e => setEditForm(f => ({ ...f, site: e.target.value }))} /></FormField>
 <div className="grid grid-cols-2 gap-3">
 <FormField label="System Size (kW)"><Input type="number" placeholder="50" value={editForm.systemSize} onChange={e => setEditForm(f => ({ ...f, systemSize: e.target.value }))} /></FormField>
 <FormField label="Project Value (�’)"><Input type="number" placeholder="280000" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} /></FormField>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <FormField label="Department">
 <Select value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value, pm: '' }))}>
 <option value="">{departmentsLoading ? 'Loading...' : 'Select Department'}</option>
 {departments.map(d => <option key={d._id || d.id} value={d.name}>{d.name}</option>)}
 </Select>
 </FormField>
 <FormField label="Assign Employee">
 <Select value={editForm.pm} onChange={e => setEditForm(f => ({ ...f, pm: e.target.value }))} disabled={!editForm.department || employeesLoading}>
 <option value="">{employeesLoading ? 'Loading...' : editForm.department ? 'Select Employee' : 'First select department'}</option>
 {employeesByDept.map(e => {
 const fullName = getEmployeeDisplayName(e);
 const designation = e.designation || e.role || e.roleId || e.position || '';
 const empId = e.employeeId || e.employee_id || e.empId || e.id || '';
 return (
 <option key={e._id || e.id} value={fullName}>
 {fullName}{empId ? ` (${empId})` : ''}{designation ? ` - ${designation}` : ''}
 </option>
 );
 })}
 </Select>
 </FormField>
 </div>
 <FormField label="Estimated End Date"><Input type="date" value={editForm.estEndDate} onChange={e => setEditForm(f => ({ ...f, estEndDate: e.target.value }))} /></FormField>
 <div className="grid grid-cols-3 gap-3">
 <FormField label="Payment Terms %"><Input type="number" placeholder="e.g., 50" value={editForm.paymentTerms} onChange={e => setEditForm(f => ({ ...f, paymentTerms: e.target.value }))} /></FormField>
 <FormField label="Visit in Month"><Input type="number" placeholder="e.g., 2" value={editForm.visitsPerMonth} onChange={e => setEditForm(f => ({ ...f, visitsPerMonth: e.target.value }))} /></FormField>
 <FormField label="Total Visit"><Input type="number" placeholder="e.g., 24" value={editForm.totalVisits} onChange={e => setEditForm(f => ({ ...f, totalVisits: e.target.value }))} /></FormField>
 </div>
 </div>
 </Modal>

 {/* Status Update Modal */}
 {statusProject && (
 <Modal open={showStatus} onClose={() => { setShowStatus(false); setStatusProject(null); }} title={`Update Status �’${statusProject.id}`}
 footer={<div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowStatus(false); setStatusProject(null); }}>Cancel</Button>
 <Button onClick={handleStatusUpdateConfirm} disabled={!newStatus || newStatus === statusProject.status}>
 Update Status
 </Button>
 </div>}>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3 text-xs">
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Customer</div>
 <div className="font-semibold text-[var(--text-primary)]">{statusProject.customerName}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Email</div>
 <div className="font-semibold text-[var(--text-primary)]">{statusProject.email || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Mobile</div>
 <div className="font-semibold text-[var(--text-primary)]">{statusProject.mobileNumber || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Site</div>
 <div className="font-semibold text-[var(--text-primary)]">{statusProject.site}</div>
 </div>
 </div>
 <div className="text-xs text-[var(--text-muted)] mb-4">
 Current Status: <span className="font-semibold text-[var(--accent-light)]">{statusProject.status}</span>
 </div>
 <FormField label="New Status">
 <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
 <option value="">Select Status</option>
 {['Logistics', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'].map(s => (
 <option key={s} value={s}>{s}</option>
 ))}
 </Select>
 </FormField>
 {newStatus === 'Cancelled' && (
 <div className="text-xs text-amber-500 bg-amber-500/10 p-2 rounded">
 Only Admin and Project Manager can cancel projects.
 </div>
 )}
 </div>
 </Modal>
 )}

 {/* Detail Modal */}
 {selected && (
 <Modal open={!!selected} onClose={() => setSelected(null)} title={`Project �’${selected.id}`}
 footer={<div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
 {canMarkComplete && isAssignedToMe && hasEmployeeAssigned && (
 <Button onClick={handleMarkStageComplete}>
 <CheckCircle size={13} /> Mark Stage Complete
 </Button>
 )}
 </div>}>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3 text-xs">
 {[['Customer', selected.customerName], ['Email', selected.email || '�’'], ['Mobile', selected.mobileNumber || '�’'], ['Site', selected.site], ['System Size', `${selected.systemSize} kW`], ['Project Manager', selected.pm],
 ['Status', <StatusBadge domain="project" value={selected.status} />], ['Value', fmt(selected.value)],
 ['Payment Terms %', selected.paymentTerms || '�’'], ['Visit in Month', selected.visitsPerMonth || '�’'], ['Total Visit', selected.totalVisits || '�’'],
 // ...
 ].map(([k, v]) => (
 <div key={k} className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
 <div className="font-semibold text-[var(--text-primary)]">{v}</div>
 </div>
 ))}
 </div>
 <div>
 <div className="text-xs flex items-center justify-between mb-1">
 <span className="font-semibold text-[var(--text-primary)]">Overall Progress</span>
 <span className="text-[var(--text-muted)]">{selected.progress}%</span>
 </div>
 <Progress value={selected.progress} className="h-2" />
 </div>
 {/* Milestone Tracker - Always show with defaults if none exist */}
 <div>
 <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Milestone Tracker</div>
 <Stepper steps={STEPPER_STEPS.length > 0 ? STEPPER_STEPS : [
 { name: 'Material Ready', status: 'Pending', date: null },
 { name: 'Installation', status: 'Pending', date: null },
 { name: 'Commission', status: 'Pending', date: null },
 { name: 'Billing', status: 'Pending', date: null },
 { name: 'Closure', status: 'Pending', date: null }
 ]} />
 </div>
 {(selected.materials?.length > 0 || projectReservations.length > 0) && (
 <div>
 <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Reserved Materials</div>
 {loadingProjectReservations ? (
 <p className="text-xs text-[var(--text-muted)]">Loading reservations...</p>
 ) : (
 <div className="space-y-2">
 {/* Project materials from project schema */}
 {selected.materials?.map((m, idx) => (
 <div key={`mat-${idx}`} className="glass-card p-2 flex items-center justify-between">
 <div>
 <div className="text-xs font-medium text-[var(--text-primary)]">{m.itemName}</div>
 <div className="text-[10px] text-[var(--text-muted)]">Qty: {m.quantity} | Issued: {m.issuedDate || '�’'}</div>
 </div>
 {m.remarks && (
 <div className="text-[10px] text-[var(--text-faint)] max-w-[150px] truncate" title={m.remarks}>
 {m.remarks}
 </div>
 )}
 </div>
 ))}
 {/* Reservations from inventory-reservation collection */}
 {projectReservations.map((res, idx) => {
 const item = items.find(i => i.itemId === res.itemId || i._id === res.itemId);
 const itemName = item?.description || item?.name || res.itemId;
 const category = item?.category || 'Item';
 // Extract date from notes (format: "Stock issued on YYYY-MM-DD")
 const dateMatch = res.notes?.match(/(\d{4}-\d{2}-\d{2})/);
 const issuedDate = dateMatch ? dateMatch[1] : (res.createdAt ? res.createdAt.split('T')[0] : '�’');
 return (
 <div key={`res-${idx}`} className="glass-card p-2 flex items-center justify-between border-l-2 border-amber-400">
 <div className="flex-1">
 <div className="text-xs font-semibold text-[var(--text-primary)]">{itemName} ({category})</div>
 <div className="text-[10px] text-[var(--text-muted)]">Qty: {res.quantity} | Issued: {issuedDate}</div>
 </div>
 <div className="text-right">
 <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400">{res.status}</span>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>
 </Modal>
 )}

 {/* Timeline Modal */}
 {timelineProject && (
 <Modal open={showTimeline} onClose={() => { setShowTimeline(false); setTimelineProject(null); }} title={`Timeline �’${timelineProject.id}`}
 footer={<div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowTimeline(false); setTimelineProject(null); }}>Close</Button>
 </div>}>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3 text-xs">
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Customer</div>
 <div className="font-semibold text-[var(--text-primary)]">{timelineProject.customerName}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Email</div>
 <div className="font-semibold text-[var(--text-primary)]">{timelineProject.email || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Mobile</div>
 <div className="font-semibold text-[var(--text-primary)]">{timelineProject.mobileNumber || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Site</div>
 <div className="font-semibold text-[var(--text-primary)]">{timelineProject.site}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Payment Terms %</div>
 <div className="font-semibold text-[var(--text-primary)]">{timelineProject.paymentTerms || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Visit in Month</div>
 <div className="font-semibold text-[var(--text-primary)]">{timelineProject.visitsPerMonth || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Total Visit</div>
 <div className="font-semibold text-[var(--text-primary)]">{timelineProject.totalVisits || '�’'}</div>
 </div>
 </div>
 <div className="relative pl-4 border-l-2 border-[var(--border-base)] space-y-4">
 {[
 { label: 'Project Created', date: timelineProject.startDate, status: 'Done', icon: Plus },
 { label: 'Current Status', date: null, status: timelineProject.status, icon: Clock3 },
 ...(timelineProject.milestones || []).map(m => ({ label: m.name, date: m.date, status: m.status, icon: CheckCircle })),
 { label: 'Estimated Completion', date: timelineProject.estEndDate, status: timelineProject.status === 'Commissioned' ? 'Done' : 'Pending', icon: Calendar }
 ].map((item, idx) => (
 <div key={idx} className="relative flex items-start gap-3">
 <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 ${item.status === 'Done' ? 'bg-green-500 border-green-500' :
 item.status === 'In Progress' ? 'bg-blue-500 border-blue-500' :
 'bg-[var(--bg-surface)] border-[var(--border-base)]'
 }`} />
 <div className="flex-1">
 <div className="text-xs font-semibold text-[var(--text-primary)]">{item.label}</div>
 <div className="text-[10px] text-[var(--text-muted)]">{item.date || '�’'}</div>
 <div className={`text-[10px] font-medium ${item.status === 'Done' ? 'text-green-500' :
 item.status === 'In Progress' ? 'text-blue-500' :
 item.status === 'Pending' ? 'text-amber-500' :
 'text-[var(--text-muted)]'
 }`}>{item.status}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </Modal>
 )}

 {/* Activity Log Modal */}
 {activityProject && (
 <Modal open={showActivity} onClose={() => { setShowActivity(false); setActivityProject(null); }} title={`Activity Log �’${activityProject.id}`}
 footer={<div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowActivity(false); setActivityProject(null); }}>Close</Button>
 </div>}>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3 text-xs">
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Customer</div>
 <div className="font-semibold text-[var(--text-primary)]">{activityProject.customerName}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Email</div>
 <div className="font-semibold text-[var(--text-primary)]">{activityProject.email || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Mobile</div>
 <div className="font-semibold text-[var(--text-primary)]">{activityProject.mobileNumber || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Site</div>
 <div className="font-semibold text-[var(--text-primary)]">{activityProject.site}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Payment Terms %</div>
 <div className="font-semibold text-[var(--text-primary)]">{activityProject.paymentTerms || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Visit in Month</div>
 <div className="font-semibold text-[var(--text-primary)]">{activityProject.visitsPerMonth || '�’'}</div>
 </div>
 <div className="glass-card p-2">
 <div className="text-[var(--text-muted)] mb-0.5">Total Visit</div>
 <div className="font-semibold text-[var(--text-primary)]">{activityProject.totalVisits || '�’'}</div>
 </div>
 </div>
 <div className="space-y-3 max-h-[400px] overflow-y-auto">
 {[
 { action: 'Project created', date: activityProject.startDate, user: activityProject.pm || 'System', type: 'create' },
 { action: `Status updated to ${activityProject.status}`, date: new Date().toISOString().split('T')[0], user: 'Admin', type: 'update' },
 ...(activityProject.milestones || []).filter(m => m.date).map(m => ({
 action: `Milestone completed: ${m.name}`,
 date: m.date,
 user: activityProject.pm || 'PM',
 type: 'milestone'
 })),
 { action: 'Last modified', date: new Date().toISOString().split('T')[0], user: 'System', type: 'system' }
 ].map((log, idx) => (
 <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-[var(--bg-tertiary)]">
 <div className={`w-2 h-2 rounded-full mt-1 ${log.type === 'create' ? 'bg-green-500' :
 log.type === 'update' ? 'bg-blue-500' :
 log.type === 'milestone' ? 'bg-purple-500' :
 'bg-[var(--primary)]'
 }`} />
 <div className="flex-1">
 <div className="text-xs font-medium text-[var(--text-primary)]">{log.action}</div>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-[10px] text-[var(--text-muted)]">{log.date}</span>
 <span className="text-[10px] text-[var(--accent-light)]">�’{log.user}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </Modal>
 )}

 {/* Backwards Move Confirmation Modal */}
 <Modal open={showBackwardsConfirm} onClose={handleCancelBackwardsMove} title="Confirm Backwards Move"
 footer={<div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={handleCancelBackwardsMove}>Cancel</Button>
 <Button variant="primary" onClick={handleConfirmBackwardsMove}>Yes, Move Backwards</Button>
 </div>}>
 <div className="space-y-3">
 <p className="text-sm text-[var(--text-secondary)]">
 Are you sure you want to move project <strong>{backwardsMoveData?.projectName}</strong> backwards?
 </p>
 <div className="flex items-center gap-2 text-sm">
 <span className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">{backwardsMoveData?.currentStage}</span>
 <span>�’�¢</span>
 <span className="px-2 py-1 rounded bg-[var(--primary)]/10 text-[var(--primary)]">{backwardsMoveData?.newStage}</span>
 </div>
 <p className="text-xs text-[var(--text-faint)]">This action will revert the project to an earlier stage.</p>
 </div>
 </Modal>

 </div>
 );
};

export default ProjectPage;
