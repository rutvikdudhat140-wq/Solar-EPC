// Site Survey Management Module - Solar EPC Edition
// URL: http://localhost:8000/survey
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import SiteSurveyDashboard from '../components/dashboards/SiteSurveyDashboard';
import {
 MapPin, Calendar, CheckCircle, Clock, Search, Filter,
 Plus, Eye, Play, CheckSquare, Upload, X, ChevronLeft,
 ChevronRight, Building2, Home, Ruler, Sun, FileText,
 Image as ImageIcon, LayoutGrid, List, MoreVertical,
 ArrowRight, Trash2, Edit2, Download, Phone, Mail,
 User, HardHat, StickyNote, Compass, Layers, Zap,
 TrendingUp, TrendingDown, BarChart3, PenTool, Dashboard as DashboardIcon
} from 'lucide-react';
import { format } from 'date-fns';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { siteSurveysApi } from '../services/siteSurveysApi';
import { leadsApi } from '../services/leadsApi';
import { employeeApi } from '../services/hrmApi';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Textarea, Select } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/Badge';
import { toast } from '../components/ui/Toast';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { downloadSurveyReportPDF } from '../lib/pdfGenerator';

// †â€™†â€™Constants & Config †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const STATUS_TABS = [
 { id: 'all', label: 'All Surveys' },
 { id: 'pending', label: 'Pending' },
 { id: 'active', label: 'Active' },
 { id: 'complete', label: 'Complete' },
];

const ROOF_TYPES = [
 { id: 'metal_shed', label: 'Metal Shed' },
 { id: 'rcc', label: 'RCC' },
 { id: 'combination', label: 'Combination' },
];

const STRUCTURE_TYPES = [
 { id: 'aluminum_rail', label: 'Aluminum Rail' },
 { id: 'pre_fab', label: 'Pre-fab' },
 { id: 'welded', label: 'Welded' },
];

const STRUCTURE_HEIGHTS = [
 { id: '7ft', label: '7 Ft' },
 { id: '9ft', label: '9 Ft' },
 { id: '10ft', label: '10 Ft' },
];

const MODULE_TYPES = [
 { id: 'bifacial', label: 'Bifacial' },
 { id: 'topcon', label: 'Topcon' },
];

// Table columns definition
const getColumns = ({ onStartSurvey, onFillForm }) => [
 {
 key: 'surveyId',
 header: 'Survey ID',
 render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span>,
 },
 {
 key: 'clientName',
 header: 'Client',
 sortable: true,
 render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span>,
 },
 {
 key: 'city',
 header: 'City',
 render: v => (
 <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
 <MapPin size={11} /> {v}
 </span>
 ),
 },
 {
 key: 'projectCapacity',
 header: 'Capacity',
 render: v => <span className="text-xs font-bold text-[var(--solar)]">{v}</span>,
 },
 {
 key: 'engineer',
 header: 'Engineer',
 render: v => <span className="text-xs text-[var(--text-secondary)]">{v || '†â€™'}</span>,
 },
 {
 key: 'roofType',
 header: 'Roof Type',
 render: v => <span className="text-xs capitalize text-[var(--text-muted)]">{v?.replace('_', ' ') || '†â€™'}</span>,
 },
 {
 key: 'status',
 header: 'Status',
 render: v => <SurveyStatusBadge status={v} />,
 },
 {
 key: 'createdAt',
 header: 'Created',
 sortable: true,
 render: v => (
 <span className="text-xs text-[var(--text-muted)]">
 {v ? format(new Date(v), 'dd MMM yyyy') : '†â€™'}
 </span>
 ),
 },
 {
 key: '__action',
 header: '',
 render: (_v, row) => {
 if (row?.status === 'pending') {
 return (
 <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
 <Button
 size="sm"
 variant="outline"
 onClick={() => onStartSurvey(row)}
 className="h-7 px-2 text-xs"
 >
 <Play size={14} className="mr-1" />
 Start
 </Button>
 </div>
 );
 }
 if (row?.status === 'active') {
 return (
 <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
 <Button
 size="sm"
 variant="outline"
 onClick={() => onFillForm(row)}
 className="h-7 px-2 text-xs"
 >
 <FileText size={14} className="mr-1" />
 Fill Form
 </Button>
 </div>
 );
 }
 return null;
 },
 },
];

// †â€™†â€™Grid Drawing Canvas Component †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const GridDrawingCanvas = ({ drawingData, onChange, readOnly = false }) => {
 const canvasRef = useRef(null);

 // Elements: lines, rects, circles, freehand, dimensions, textLabels
 const [elements, setElements] = useState(() => ({
 lines: drawingData?.lines || [],
 rects: drawingData?.rects || [],
 circles: drawingData?.circles || [],
 freehand: drawingData?.freehand || [],
 dimensions: drawingData?.dimensions || [],
 textLabels: drawingData?.textLabels || [],
 }));
 const [history, setHistory] = useState([]);
 const [redoStack, setRedoStack] = useState([]);
 const [tool, setTool] = useState('line');
 const [color, setColor] = useState('#2563eb');
 const [strokeWidth, setStrokeWidth] = useState(2);
 const [snapGrid, setSnapGrid] = useState(true);
 const [isDrawing, setIsDrawing] = useState(false);
 const [currentEl, setCurrentEl] = useState(null);
 const [freePoints, setFreePoints] = useState([]);
 const [inputPos, setInputPos] = useState(null);
 const [inputText, setInputText] = useState('');
 const [selected, setSelected] = useState(null); // { type, index }
 const [editingLabel, setEditingLabel] = useState(null); // { index, text }

 const GRID = 20;
 const W = 600; const H = 450;

 // Notify parent on elements change
 useEffect(() => { if (onChange) onChange(elements); }, [elements]);

 // Draw everything
 useEffect(() => { draw(); }, [elements, currentEl, freePoints, selected]);

 const snap = (v) => snapGrid ? Math.round(v / GRID) * GRID : v;

 const getPos = (e) => {
 const rect = canvasRef.current.getBoundingClientRect();
 const scaleX = W / rect.width;
 const scaleY = H / rect.height;
 return {
 x: snap((e.clientX - rect.left) * scaleX),
 y: snap((e.clientY - rect.top) * scaleY),
 };
 };

 const pushHistory = (els) => {
 setHistory(h => [...h.slice(-30), els]);
 setRedoStack([]);
 };

 const undo = () => {
 if (!history.length) return;
 const prev = history[history.length - 1];
 setRedoStack(r => [...r, elements]);
 setElements(prev);
 setHistory(h => h.slice(0, -1));
 setSelected(null);
 };

 const redo = () => {
 if (!redoStack.length) return;
 const next = redoStack[redoStack.length - 1];
 setHistory(h => [...h, elements]);
 setElements(next);
 setRedoStack(r => r.slice(0, -1));
 setSelected(null);
 };

 const clearAll = () => {
 pushHistory(elements);
 setElements({ lines: [], rects: [], circles: [], freehand: [], dimensions: [], textLabels: [] });
 setSelected(null);
 };

 // Hit detection helpers
 const distToSegment = (px, py, x1, y1, x2, y2) => {
 const dx = x2 - x1; const dy = y2 - y1;
 const len2 = dx * dx + dy * dy;
 if (len2 === 0) return Math.hypot(px - x1, py - y1);
 const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
 return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
 };

 const hitTest = (x, y) => {
 const THR = 8;
 // textLabels
 for (let i = elements.textLabels.length - 1; i >= 0; i--) {
 const l = elements.textLabels[i];
 if (Math.abs(x - l.x) < 60 && Math.abs(y - l.y) < 20) return { type: 'textLabels', index: i };
 }
 // lines
 for (let i = elements.lines.length - 1; i >= 0; i--) {
 const l = elements.lines[i];
 if (distToSegment(x, y, l.startX, l.startY, l.endX, l.endY) < THR) return { type: 'lines', index: i };
 }
 // rects
 for (let i = elements.rects.length - 1; i >= 0; i--) {
 const r = elements.rects[i];
 const x1 = Math.min(r.x, r.x + r.w); const x2 = Math.max(r.x, r.x + r.w);
 const y1 = Math.min(r.y, r.y + r.h); const y2 = Math.max(r.y, r.y + r.h);
 if (x >= x1 - THR && x <= x2 + THR && y >= y1 - THR && y <= y2 + THR) return { type: 'rects', index: i };
 }
 // circles
 for (let i = elements.circles.length - 1; i >= 0; i--) {
 const c = elements.circles[i];
 const dist = Math.hypot(x - c.cx, y - c.cy);
 if (Math.abs(dist - c.r) < THR) return { type: 'circles', index: i };
 }
 // dimensions
 for (let i = elements.dimensions.length - 1; i >= 0; i--) {
 const d = elements.dimensions[i];
 if (distToSegment(x, y, d.lineStartX, d.lineStartY, d.lineEndX, d.lineEndY) < THR) return { type: 'dimensions', index: i };
 }
 // freehand
 for (let i = elements.freehand.length - 1; i >= 0; i--) {
 const pts = elements.freehand[i].points;
 for (let j = 0; j < pts.length - 1; j++) {
 if (distToSegment(x, y, pts[j].x, pts[j].y, pts[j+1].x, pts[j+1].y) < THR) return { type: 'freehand', index: i };
 }
 }
 return null;
 };

 const deleteSelected = () => {
 if (!selected) return;
 pushHistory(elements);
 setElements(prev => {
 const arr = [...prev[selected.type]];
 arr.splice(selected.index, 1);
 return { ...prev, [selected.type]: arr };
 });
 setSelected(null);
 };

 // †â€™†â€™Rotation helpers †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
 // Get bounding center for each element type
 const getCenter = (type, el) => {
 if (type === 'lines' || type === 'dimensions') {
 const sx = type === 'lines' ? el.startX : el.lineStartX;
 const sy = type === 'lines' ? el.startY : el.lineStartY;
 const ex = type === 'lines' ? el.endX : el.lineEndX;
 const ey = type === 'lines' ? el.endY : el.lineEndY;
 return { cx: (sx + ex) / 2, cy: (sy + ey) / 2 };
 }
 if (type === 'rects') return { cx: el.x + el.w / 2, cy: el.y + el.h / 2 };
 if (type === 'circles') return { cx: el.cx, cy: el.cy };
 if (type === 'textLabels') return { cx: el.x, cy: el.y };
 if (type === 'freehand') {
 const xs = el.points.map(p => p.x); const ys = el.points.map(p => p.y);
 return {
 cx: (Math.min(...xs) + Math.max(...xs)) / 2,
 cy: (Math.min(...ys) + Math.max(...ys)) / 2,
 };
 }
 return { cx: 0, cy: 0 };
 };

 const rotateSelected = (deg) => {
 if (!selected) return;
 pushHistory(elements);
 const rad = (deg * Math.PI) / 180;
 setElements(prev => {
 const arr = [...prev[selected.type]];
 const el = { ...arr[selected.index] };
 const { cx, cy } = getCenter(selected.type, el);
 const rotatePoint = (x, y) => ({
 x: cx + (x - cx) * Math.cos(rad) - (y - cy) * Math.sin(rad),
 y: cy + (x - cx) * Math.sin(rad) + (y - cy) * Math.cos(rad),
 });

 if (selected.type === 'lines') {
 const s = rotatePoint(el.startX, el.startY);
 const e2 = rotatePoint(el.endX, el.endY);
 arr[selected.index] = { ...el, startX: s.x, startY: s.y, endX: e2.x, endY: e2.y };
 } else if (selected.type === 'dimensions') {
 const s = rotatePoint(el.lineStartX, el.lineStartY);
 const e2 = rotatePoint(el.lineEndX, el.lineEndY);
 arr[selected.index] = {
 ...el, lineStartX: s.x, lineStartY: s.y, lineEndX: e2.x, lineEndY: e2.y,
 x: (s.x + e2.x) / 2 - 10, y: (s.y + e2.y) / 2 - 6,
 };
 } else if (selected.type === 'rects') {
 // Store rotation angle for drawing
 arr[selected.index] = { ...el, rotation: ((el.rotation || 0) + deg) % 360 };
 } else if (selected.type === 'circles') {
 arr[selected.index] = { ...el, rotation: ((el.rotation || 0) + deg) % 360 };
 } else if (selected.type === 'textLabels') {
 arr[selected.index] = { ...el, rotation: ((el.rotation || 0) + deg) % 360 };
 } else if (selected.type === 'freehand') {
 const newPts = el.points.map(p => rotatePoint(p.x, p.y));
 arr[selected.index] = { ...el, points: newPts };
 }
 return { ...prev, [selected.type]: arr };
 });
 };

 // Drawing
 const draw = () => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 ctx.clearRect(0, 0, W, H);

 // Grid
 ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5;
 for (let x = 0; x <= W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
 for (let y = 0; y <= H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

 const drawArrow = (ctx, x1, y1, x2, y2) => {
 const angle = Math.atan2(y2 - y1, x2 - x1);
 const hl = 10;
 ctx.beginPath(); ctx.moveTo(x2, y2);
 ctx.lineTo(x2 - hl * Math.cos(angle - Math.PI/6), y2 - hl * Math.sin(angle - Math.PI/6));
 ctx.moveTo(x2, y2);
 ctx.lineTo(x2 - hl * Math.cos(angle + Math.PI/6), y2 - hl * Math.sin(angle + Math.PI/6));
 ctx.stroke();
 };

 const highlight = (idx, type) => selected?.type === type && selected?.index === idx;

 // Lines
 elements.lines.forEach((l, i) => {
 ctx.strokeStyle = highlight(i, 'lines') ? '#f59e0b' : (l.color || '#2563eb');
 ctx.lineWidth = highlight(i, 'lines') ? (l.sw || 2) + 2 : (l.sw || 2);
 ctx.setLineDash([]);
 ctx.beginPath(); ctx.moveTo(l.startX, l.startY); ctx.lineTo(l.endX, l.endY); ctx.stroke();
 if (l.arrow) drawArrow(ctx, l.startX, l.startY, l.endX, l.endY);
 });

 // Rects
 elements.rects.forEach((r, i) => {
 const cx = r.x + r.w / 2; const cy = r.y + r.h / 2;
 ctx.save();
 ctx.translate(cx, cy);
 if (r.rotation) ctx.rotate((r.rotation * Math.PI) / 180);
 ctx.translate(-cx, -cy);
 ctx.strokeStyle = highlight(i, 'rects') ? '#f59e0b' : (r.color || '#2563eb');
 ctx.lineWidth = highlight(i, 'rects') ? (r.sw || 2) + 2 : (r.sw || 2);
 ctx.setLineDash(r.dashed ? [6, 3] : []);
 ctx.strokeRect(r.x, r.y, r.w, r.h);
 if (r.fill) { ctx.fillStyle = (r.color || '#2563eb') + '20'; ctx.fillRect(r.x, r.y, r.w, r.h); }
 if (highlight(i, 'rects') && r.rotation) {
 ctx.fillStyle = '#f59e0b'; ctx.font = '10px Arial';
 ctx.fillText(`${Math.round(r.rotation)}†â€™…Â¡`, cx - 10, cy - r.h / 2 - 4);
 }
 ctx.restore();
 });

 // Circles
 elements.circles.forEach((c, i) => {
 ctx.strokeStyle = highlight(i, 'circles') ? '#f59e0b' : (c.color || '#2563eb');
 ctx.lineWidth = highlight(i, 'circles') ? (c.sw || 2) + 2 : (c.sw || 2);
 ctx.setLineDash([]);
 ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); ctx.stroke();
 });

 // Freehand
 elements.freehand.forEach((fp, i) => {
 if (!fp.points.length) return;
 ctx.strokeStyle = highlight(i, 'freehand') ? '#f59e0b' : (fp.color || '#111827');
 ctx.lineWidth = highlight(i, 'freehand') ? (fp.sw || 2) + 1 : (fp.sw || 2);
 ctx.setLineDash([]);
 ctx.lineJoin = 'round'; ctx.lineCap = 'round';
 ctx.beginPath(); ctx.moveTo(fp.points[0].x, fp.points[0].y);
 fp.points.forEach(p => ctx.lineTo(p.x, p.y));
 ctx.stroke();
 });

 // Dimensions
 elements.dimensions.forEach((d, i) => {
 ctx.strokeStyle = highlight(i, 'dimensions') ? '#f59e0b' : '#dc2626';
 ctx.lineWidth = highlight(i, 'dimensions') ? 3 : 1.5;
 ctx.setLineDash([4, 3]);
 ctx.beginPath(); ctx.moveTo(d.lineStartX, d.lineStartY); ctx.lineTo(d.lineEndX, d.lineEndY); ctx.stroke();
 ctx.setLineDash([]);
 ctx.fillStyle = highlight(i, 'dimensions') ? '#f59e0b' : '#dc2626';
 ctx.font = 'bold 11px Arial';
 ctx.fillText(d.value, d.x, d.y);
 });

 // Text labels
 elements.textLabels.forEach((l, i) => {
 ctx.save();
 if (l.rotation) {
 ctx.translate(l.x, l.y);
 ctx.rotate((l.rotation * Math.PI) / 180);
 ctx.translate(-l.x, -l.y);
 }
 ctx.fillStyle = highlight(i, 'textLabels') ? '#f59e0b' : (l.color || '#111827');
 ctx.font = `bold ${l.size || 14}px Arial`;
 ctx.fillText(l.text, l.x, l.y);
 if (highlight(i, 'textLabels')) {
 const w = ctx.measureText(l.text).width;
 ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]);
 ctx.strokeRect(l.x - 2, l.y - (l.size || 14), w + 4, (l.size || 14) + 4);
 ctx.setLineDash([]);
 if (l.rotation) {
 ctx.fillStyle = '#f59e0b'; ctx.font = '10px Arial';
 ctx.fillText(`${Math.round(l.rotation)}†â€™…Â¡`, l.x + w + 6, l.y);
 }
 }
 ctx.restore();
 });

 // Current drawing preview
 if (currentEl) {
 ctx.strokeStyle = color; ctx.lineWidth = strokeWidth; ctx.setLineDash([4, 3]);
 if (currentEl.type === 'line' || currentEl.type === 'arrow') {
 ctx.beginPath(); ctx.moveTo(currentEl.startX, currentEl.startY); ctx.lineTo(currentEl.endX, currentEl.endY); ctx.stroke();
 } else if (currentEl.type === 'rect') {
 ctx.strokeRect(currentEl.x, currentEl.y, currentEl.w, currentEl.h);
 } else if (currentEl.type === 'circle') {
 ctx.beginPath(); ctx.arc(currentEl.cx, currentEl.cy, currentEl.r, 0, Math.PI * 2); ctx.stroke();
 } else if (currentEl.type === 'dimension') {
 ctx.beginPath(); ctx.moveTo(currentEl.startX, currentEl.startY); ctx.lineTo(currentEl.endX, currentEl.endY); ctx.stroke();
 }
 ctx.setLineDash([]);
 }

 // Freehand in progress
 if (freePoints.length > 1) {
 ctx.strokeStyle = color; ctx.lineWidth = strokeWidth; ctx.setLineDash([]);
 ctx.lineJoin = 'round'; ctx.lineCap = 'round';
 ctx.beginPath(); ctx.moveTo(freePoints[0].x, freePoints[0].y);
 freePoints.forEach(p => ctx.lineTo(p.x, p.y));
 ctx.stroke();
 }
 };

 const handleMouseDown = (e) => {
 if (readOnly) return;
 const { x, y } = getPos(e);

 if (tool === 'select') {
 const hit = hitTest(x, y);
 setSelected(hit);
 return;
 }
 if (tool === 'eraser') {
 const hit = hitTest(x, y);
 if (hit) {
 pushHistory(elements);
 setElements(prev => {
 const arr = [...prev[hit.type]]; arr.splice(hit.index, 1);
 return { ...prev, [hit.type]: arr };
 });
 }
 return;
 }
 if (tool === 'text') { setInputPos({ x, y }); return; }
 if (tool === 'freehand') { setIsDrawing(true); setFreePoints([{ x, y }]); return; }
 setIsDrawing(true);
 if (tool === 'line' || tool === 'arrow') setCurrentEl({ type: tool, startX: x, startY: y, endX: x, endY: y });
 else if (tool === 'rect') setCurrentEl({ type: 'rect', x, y, w: 0, h: 0 });
 else if (tool === 'circle') setCurrentEl({ type: 'circle', cx: x, cy: y, r: 0 });
 else if (tool === 'dimension') setCurrentEl({ type: 'dimension', startX: x, startY: y, endX: x, endY: y });
 };

 const handleMouseMove = (e) => {
 if (!isDrawing || readOnly) return;
 const { x, y } = getPos(e);
 if (tool === 'freehand') { setFreePoints(prev => [...prev, { x, y }]); return; }
 setCurrentEl(prev => {
 if (!prev) return prev;
 if (prev.type === 'line' || prev.type === 'arrow' || prev.type === 'dimension')
 return { ...prev, endX: x, endY: y };
 if (prev.type === 'rect') return { ...prev, w: x - prev.x, h: y - prev.y };
 if (prev.type === 'circle') return { ...prev, r: Math.hypot(x - prev.cx, y - prev.cy) };
 return prev;
 });
 };

 const handleMouseUp = () => {
 if (!isDrawing || readOnly) return;
 setIsDrawing(false);
 pushHistory(elements);
 if (tool === 'freehand') {
 if (freePoints.length > 2) {
 setElements(prev => ({ ...prev, freehand: [...prev.freehand, { points: freePoints, color, sw: strokeWidth }] }));
 }
 setFreePoints([]);
 return;
 }
 if (!currentEl) return;
 if (tool === 'line') {
 setElements(prev => ({ ...prev, lines: [...prev.lines, { startX: currentEl.startX, startY: currentEl.startY, endX: currentEl.endX, endY: currentEl.endY, color, sw: strokeWidth, arrow: false }] }));
 } else if (tool === 'arrow') {
 setElements(prev => ({ ...prev, lines: [...prev.lines, { startX: currentEl.startX, startY: currentEl.startY, endX: currentEl.endX, endY: currentEl.endY, color, sw: strokeWidth, arrow: true }] }));
 } else if (tool === 'rect') {
 if (Math.abs(currentEl.w) > 5 || Math.abs(currentEl.h) > 5)
 setElements(prev => ({ ...prev, rects: [...prev.rects, { x: currentEl.x, y: currentEl.y, w: currentEl.w, h: currentEl.h, color, sw: strokeWidth }] }));
 } else if (tool === 'circle') {
 if (currentEl.r > 5)
 setElements(prev => ({ ...prev, circles: [...prev.circles, { cx: currentEl.cx, cy: currentEl.cy, r: currentEl.r, color, sw: strokeWidth }] }));
 } else if (tool === 'dimension') {
 const len = Math.round(Math.hypot(currentEl.endX - currentEl.startX, currentEl.endY - currentEl.startY) / GRID);
 if (len > 0) {
 setElements(prev => ({ ...prev, dimensions: [...prev.dimensions, {
 lineStartX: currentEl.startX, lineStartY: currentEl.startY,
 lineEndX: currentEl.endX, lineEndY: currentEl.endY,
 x: (currentEl.startX + currentEl.endX) / 2 - 10,
 y: (currentEl.startY + currentEl.endY) / 2 - 6,
 value: `${len}'`,
 }] }));
 }
 }
 setCurrentEl(null);
 };

 const handleTextSubmit = (e) => {
 e.preventDefault();
 if (!inputText.trim() || !inputPos) return;
 pushHistory(elements);
 setElements(prev => ({ ...prev, textLabels: [...prev.textLabels, { text: inputText.trim(), x: inputPos.x, y: inputPos.y, color, size: 14 }] }));
 setInputText(''); setInputPos(null);
 };

 const saveEditLabel = () => {
 if (!editingLabel) return;
 pushHistory(elements);
 setElements(prev => {
 const arr = [...prev.textLabels];
 arr[editingLabel.index] = { ...arr[editingLabel.index], text: editingLabel.text };
 return { ...prev, textLabels: arr };
 });
 setEditingLabel(null); setSelected(null);
 };

 const TOOLS = [
 { id: 'select', icon: '†â€™', label: 'Select' },
 { id: 'line', icon: '/', label: 'Line' },
 { id: 'arrow', icon: '†â€™¾Ã‚Â¢', label: 'Arrow' },
 { id: 'rect', icon: '†â€™', label: 'Rect' },
 { id: 'circle', icon: '†â€™', label: 'Circle' },
 { id: 'freehand', icon: '†â€™…â€œÂ¦½', label: 'Draw' },
 { id: 'dimension', icon: '†â€™', label: 'Measure' },
 { id: 'text', icon: 'T', label: 'Text' },
 { id: 'eraser', icon: '†â€™žÂ¢Â«', label: 'Erase' },
 ];

 if (readOnly) {
 return (
 <div className="border border-[var(--border-base)] bg-[var(--bg-surface)] overflow-hidden rounded">
 <canvas ref={canvasRef} width={W} height={H} className="cursor-default block w-full" />
 </div>
 );
 }

 const selectedEl = selected ? elements[selected.type]?.[selected.index] : null;

 return (
 <div className="space-y-1.5">
 {/* †â€™†â€™Toolbar †â€™†â€™*/}
 <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg">
 {/* Tools */}
 <div className="flex items-center gap-0.5 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg p-0.5">
 {TOOLS.map(t => (
 <button
 key={t.id}
 title={t.label}
 onClick={() => { setTool(t.id); setSelected(null); }}
 className={`w-7 h-7 rounded text-sm font-medium transition-all flex items-center justify-center
 ${tool === t.id ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
 >
 {t.icon}
 </button>
 ))}
 </div>

 {/* Divider */}
 <div className="w-px h-6 bg-[var(--bg-hover)]" />

 {/* Color */}
 <div className="flex items-center gap-1">
 <span className="text-[10px] text-[var(--text-muted)]">Color</span>
 <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-[var(--border-base)] p-0.5" title="Color" />
 </div>

 {/* Stroke width */}
 <div className="flex items-center gap-1">
 <span className="text-[10px] text-[var(--text-muted)]">Size</span>
 <select value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="h-7 text-xs border border-[var(--border-base)] rounded px-1 bg-[var(--bg-surface)]">
 {[1, 2, 3, 4, 6].map(v => <option key={v} value={v}>{v}px</option>)}
 </select>
 </div>

 {/* Divider */}
 <div className="w-px h-6 bg-[var(--bg-hover)]" />

 {/* Snap grid */}
 <label className="flex items-center gap-1 cursor-pointer text-[10px] text-[var(--text-secondary)]">
 <input type="checkbox" checked={snapGrid} onChange={e => setSnapGrid(e.target.checked)} className="w-3 h-3" />
 Snap
 </label>

 {/* Divider */}
 <div className="w-px h-6 bg-[var(--bg-hover)]" />

 {/* Undo / Redo */}
 <button onClick={undo} disabled={!history.length} title="Undo" className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded disabled:opacity-30 text-sm">†â€™</button>
 <button onClick={redo} disabled={!redoStack.length} title="Redo" className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded disabled:opacity-30 text-sm">†â€™ª</button>

 {/* Clear */}
 <button onClick={clearAll} className="ml-auto px-2.5 py-1 text-xs text-[var(--red-bg)]0 border border-red-200 hover:bg-[var(--red-bg)] rounded-lg transition-colors flex items-center gap-1">
 <X size={11} /> Clear All
 </button>
 </div>

 {/* †â€™†â€™Selected element actions †â€™†â€™*/}
 {selected && selectedEl && (
 <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs flex-wrap">
 <span className="text-amber-600 font-medium capitalize">
 †â€™…â€œÂ¦ {selected.type?.replace('textLabels','text').replace('freehand','drawing') || 'Unknown'}
 {selectedEl.rotation ? <span className="ml-1 text-amber-500">({Math.round(selectedEl.rotation)}†â€™…Â¡)</span> : null}
 </span>

 {/* Rotate controls */}
 <div className="flex items-center gap-0.5 bg-[var(--bg-surface)] border border-amber-200 rounded px-1 py-0.5">
 <span className="text-[10px] text-amber-500 mr-1">†â€™» Rotate:</span>
 {[
 { label: '†â€™¾Ã‚Â¢90†â€™…Â¡', deg: -90 },
 { label: '†â€™¾Ã‚Â¢45†â€™…Â¡', deg: -45 },
 { label: '†â€™¾Ã‚Â¢15†â€™…Â¡', deg: -15 },
 { label: '†â€™¾Ã‚Â¢5†â€™…Â¡', deg: -5 },
 { label: '+5†â€™…Â¡', deg: 5 },
 { label: '+15†â€™…Â¡', deg: 15 },
 { label: '+45†â€™…Â¡', deg: 45 },
 { label: '+90†â€™…Â¡', deg: 90 },
 ].map(btn => (
 <button
 key={btn.label}
 onClick={() => rotateSelected(btn.deg)}
 className="px-1.5 py-0.5 text-[10px] font-mono rounded hover:bg-amber-100 text-amber-700 transition-colors"
 >
 {btn.label}
 </button>
 ))}
 {/* Reset rotation */}
 {(selectedEl.rotation || (selected.type === 'lines' || selected.type === 'freehand' || selected.type === 'dimensions')) && (
 <button
 onClick={() => {
 if (selected.type === 'rects' || selected.type === 'circles' || selected.type === 'textLabels') {
 pushHistory(elements);
 setElements(prev => {
 const arr = [...prev[selected.type]];
 arr[selected.index] = { ...arr[selected.index], rotation: 0 };
 return { ...prev, [selected.type]: arr };
 });
 }
 }}
 className="px-1.5 py-0.5 text-[10px] rounded hover:bg-red-100 text-red-400 transition-colors ml-1 border-l border-amber-200"
 title="Reset rotation"
 >
 0†â€™…Â¡
 </button>
 )}
 </div>

 <div className="flex items-center gap-1 ml-auto">
 {selected.type === 'textLabels' && (
 <button
 onClick={() => setEditingLabel({ index: selected.index, text: elements.textLabels[selected.index].text })}
 className="flex items-center gap-1 px-2 py-0.5 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary)] transition-colors"
 >
 <Edit2 size={10} /> Edit Text
 </button>
 )}
 <button
 onClick={deleteSelected}
 className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
 >
 <Trash2 size={10} /> Delete
 </button>
 <button onClick={() => setSelected(null)} className="px-2 py-0.5 border border-[var(--border-base)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-elevated)]">
 <X size={10} />
 </button>
 </div>
 </div>
 )}

 {/* †â€™†â€™Edit label inline †â€™†â€™*/}
 {editingLabel && (
 <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
 <span className="text-xs text-[var(--primary)] font-medium">Edit text:</span>
 <input
 autoFocus
 value={editingLabel.text}
 onChange={e => setEditingLabel(prev => ({ ...prev, text: e.target.value }))}
 onKeyDown={e => { if (e.key === 'Enter') saveEditLabel(); if (e.key === 'Escape') setEditingLabel(null); }}
 className="flex-1 px-2 py-0.5 border border-blue-300 rounded text-sm focus:outline-none"
 />
 <button onClick={saveEditLabel} className="px-2 py-0.5 bg-[var(--primary)] text-white text-xs rounded hover:bg-[var(--primary)]">Save</button>
 <button onClick={() => setEditingLabel(null)} className="px-2 py-0.5 text-[var(--text-muted)] text-xs">Cancel</button>
 </div>
 )}

 {/* †â€™†â€™Text input on canvas click †â€™†â€™*/}
 {inputPos && (
 <form onSubmit={handleTextSubmit} className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg">
 <span className="text-xs text-[var(--text-muted)]">Text at ({inputPos.x}, {inputPos.y}):</span>
 <input autoFocus type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Enter text..." className="flex-1 px-2 py-1 border border-[var(--border-base)] rounded text-sm focus:outline-none focus:border-[var(--primary)]" />
 <button type="submit" className="px-2.5 py-1 bg-[var(--primary)] text-white rounded text-xs hover:bg-blue-700">Add</button>
 <button type="button" onClick={() => { setInputPos(null); setInputText(''); }} className="px-2.5 py-1 text-[var(--text-secondary)] text-xs border border-[var(--border-base)] rounded hover:bg-[var(--bg-elevated)]">†â€™…â€œ</button>
 </form>
 )}

 {/* †â€™†â€™Canvas †â€™†â€™*/}
 <div className="border-2 border-[var(--border-muted)] rounded bg-[var(--bg-surface)] overflow-hidden relative">
 <canvas
 ref={canvasRef}
 width={W}
 height={H}
 onMouseDown={handleMouseDown}
 onMouseMove={handleMouseMove}
 onMouseUp={handleMouseUp}
 onMouseLeave={handleMouseUp}
 className={`block w-full ${
 tool === 'text' ? 'cursor-text' :
 tool === 'select' ? 'cursor-default' :
 tool === 'eraser' ? 'cursor-crosshair' :
 'cursor-crosshair'
 }`}
 style={{ aspectRatio: `${W}/${H}` }}
 />
 {/* Tool hint */}
 <div className="absolute bottom-1 right-2 text-[10px] text-[var(--text-muted)] pointer-events-none">
 {tool === 'select' ? 'Click to select †â€™…Â¡Â· Delete key to remove' :
 tool === 'eraser' ? 'Click on element to erase' :
 tool === 'text' ? 'Click on canvas to place text' :
 tool === 'freehand' ? 'Hold and drag to draw freely' :
 'Click and drag to draw'}
 </div>
 </div>

 {/* †â€™†â€™Status bar †â€™†â€™*/}
 <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] px-1">
 <span>Lines: {elements.lines.length}</span>
 <span>Shapes: {elements.rects.length + elements.circles.length}</span>
 <span>Drawings: {elements.freehand.length}</span>
 <span>Dims: {elements.dimensions.length}</span>
 <span>Text: {elements.textLabels.length}</span>
 </div>
 </div>
 );
};

// †â€™†â€™Status Badge †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const SurveyStatusBadge = ({ status }) => {
 const map = {
 pending: 'bg-amber-100 text-amber-700 border-amber-300',
 active: 'bg-blue-100 text-blue-700 border-blue-300',
 complete: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30',
 };
 const labels = { pending: 'Pending', active: 'Active', complete: 'Complete' };
 return (
 <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[status] || map.pending}`}>
 {labels[status] || status}
 </span>
 );
};

// †â€™†â€™Survey Card (Grid View) †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const SurveyCard = ({ survey, onView, onStart, onComplete, onDelete }) => {
 const statusConfig = {
 pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
 active: { label: 'Active', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: Play },
 complete: { label: 'Completed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle },
 }[survey.status] || { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock };
 
 const StatusIcon = statusConfig.icon;

 return (
 <div className="glass-card p-4 space-y-3 hover:scale-[1.01] transition-all cursor-pointer" onClick={() => onView(survey)}>
 {/* Header */}
 <div className="flex items-start justify-between">
 <div>
 <div className="flex items-center gap-2">
 <p className="text-xs font-mono text-[var(--primary)] font-semibold">{survey.surveyId}</p>
 {survey.isFromLead && (
 <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
 From Lead
 </span>
 )}
 </div>
 <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">{survey.clientName}</p>
 </div>
 <div
 className="px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1"
 style={{ background: statusConfig.bg, color: statusConfig.color }}
 >
 <StatusIcon size={10} />
 {statusConfig.label}
 </div>
 </div>

 {/* Location Info */}
 <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
 <MapPin size={12} />
 <span className="line-clamp-1">{survey.city}</span>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-2 gap-2">
 <div className="glass-card p-2 text-center">
 <p className="text-[10px] text-[var(--text-muted)]">System</p>
 <p className="text-sm font-bold text-[var(--text-primary)]">{survey.projectCapacity || '†â€™'}</p>
 </div>
 <div className="glass-card p-2 text-center">
 <p className="text-[10px] text-[var(--text-muted)]">Engineer</p>
 <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{survey.engineer || 'Unassigned'}</p>
 </div>
 </div>

 {/* Date */}
 <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
 <Calendar size={10} />
 {survey.createdAt ? format(new Date(survey.createdAt), 'dd MMM yyyy') : '†â€™'}
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1 pt-2 border-t border-[var(--border-base)]">
 {survey.status === 'pending' && (
 <button
 onClick={(e) => { e.stopPropagation(); onStart(survey); }}
 className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
 >
 <Play size={10} />
 Start
 </button>
 )}
 {survey.status === 'active' && (
 <button
 onClick={(e) => { e.stopPropagation(); onComplete(survey); }}
 className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--primary)] text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
 >
 <FileText size={10} />
 Fill
 </button>
 )}
 {survey.status === 'complete' && (
 <div className="flex-1 text-center text-[10px] text-[var(--text-muted)] py-1.5">
 <span className="flex items-center justify-center gap-1 text-[var(--green)]">
 <CheckCircle size={14} />
 Completed
 </span>
 </div>
 )}
 <button
 onClick={(e) => { e.stopPropagation(); onView(survey); }}
 className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
 title="View"
 >
 <Eye size={14} />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); /* download handler */ }}
 className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
 title="Download"
 >
 <Download size={14} />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); /* edit handler */ }}
 className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
 title="Edit"
 >
 <Edit2 size={14} />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); onDelete(survey); }}
 className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-red-400 hover:bg-red-400/10 transition-colors"
 title="Delete"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 );
};

// †â€™†â€™Assign Survey Modal (Pending †â€™¾Ã‚Â¢ Active) †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const PendingToActiveModal = ({ isOpen, onClose, survey, onSubmit, onAssign }) => {
 const [formData, setFormData] = useState({ engineerId: '', engineerName: '', surveyDate: format(new Date(), 'yyyy-MM-dd'), notes: '' });
 const [employees, setEmployees] = useState([]);
 const [empLoading, setEmpLoading] = useState(false);

 // Fetch employees from HRM when modal opens
 useEffect(() => {
 if (!isOpen) return;
 const fetchEmployees = async () => {
 setEmpLoading(true);
 try {
 const res = await employeeApi.getAll();
 const data = res?.data || res || [];
 setEmployees(Array.isArray(data) ? data : []);
 } catch (err) {
 console.error('Failed to fetch employees:', err);
 setEmployees([]);
 } finally {
 setEmpLoading(false);
 }
 };
 fetchEmployees();
 }, [isOpen]);

 useEffect(() => {
 if (!survey) return;
 setFormData(prev => ({
 ...prev,
 engineerId: '',
 engineerName: survey.engineer || '',
 surveyDate: format(new Date(), 'yyyy-MM-dd'),
 }));
 }, [survey]);

 const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

 // Group employees by department for optgroup
 const employeesByDept = employees.reduce((acc, emp) => {
 const dept = emp.department || 'Other';
 if (!acc[dept]) acc[dept] = [];
 acc[dept].push(emp);
 return acc;
 }, {});

 const engineerLabel = employees.find(e => e._id === formData.engineerId);

 return (
 <Modal open={isOpen} onClose={onClose} title="Assign Survey" size="md"
 footer={
 <div className="flex justify-end gap-3">
 <Button variant="ghost" onClick={onClose}>Cancel</Button>
 <Button
 onClick={async () => {
 if (!formData.engineerId) {
 toast.error('Please select an engineer');
 return;
 }
 try {
 await onSubmit({
 assignedTo: formData.engineerId,
 engineer: formData.engineerName,
 solarConsultant: formData.engineerName,
 scheduledDate: formData.surveyDate,
 notes: formData.notes,
 activeData: { assignedAt: new Date().toISOString(), scheduledDate: formData.surveyDate }
 });
 } catch (e) {
 toast.error(e?.response?.data?.message || e?.message || 'Failed to start survey');
 }
 }}
 disabled={!formData.engineerId}
 className="bg-amber-500 hover:bg-amber-600"
 >
 <Play size={16} className="mr-2" /> Assign & Start
 </Button>
 </div>
 }
 >
 <div className="space-y-4">
 {/* Lead Details */}
 <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-4">
 <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2"><User size={15} /> Lead Details</h4>
 <div className="grid grid-cols-2 gap-3 text-sm">
 {[['Client', survey?.clientName], ['City', survey?.city], ['Capacity', survey?.projectCapacity || 'N/A'], ['Survey ID', survey?.surveyId]].map(([label, val]) => (
 <div key={label}>
 <span className="text-[var(--text-muted)]">{label}:</span>
 <p className="font-medium text-[var(--text-primary)]">{val}</p>
 </div>
 ))}
 </div>
 </div>

 <div className="space-y-4">
 {/* Assign Engineer Dropdown */}
 <div>
 <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
 <HardHat size={14} className="inline mr-1" /> Assign Engineer *
 </label>
 <select
 value={formData.engineerId}
 onChange={e => {
 const id = e.target.value;
 const emp = employees.find(x => x._id === id);
 const fullName = emp ? `${emp.firstName} ${emp.lastName}`.trim() : '';
 setFormData(prev => ({ ...prev, engineerId: id, engineerName: fullName }));
 }}
 disabled={empLoading}
 className="w-full border border-[var(--border-base)] bg-[var(--bg-elevated)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--text-primary)] disabled:opacity-50"
 >
 <option value="">
 {empLoading ? 'Loading employees...' : '†â€™Select Engineer †â€™'}
 </option>
 {Object.entries(employeesByDept).map(([dept, emps]) => (
 <optgroup key={dept} label={dept}>
 {emps.map(emp => {
 const fullName = `${emp.firstName} ${emp.lastName}`.trim();
 return (
 <option key={emp._id} value={emp._id}>
 {fullName}{emp.designation ? ` (${emp.designation})` : ''}
 </option>
 );
 })}
 </optgroup>
 ))}
 </select>
 {empLoading && (
 <p className="text-[11px] text-[var(--text-faint)] mt-1 flex items-center gap-1">
 <span className="inline-block w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
 Fetching from HRM...
 </p>
 )}
 </div>

 {/* Survey Date */}
 <div>
 <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
 <Calendar size={14} className="inline mr-1" /> Survey Date *
 </label>
 <input
 type="date"
 value={formData.surveyDate}
 onChange={e => set('surveyDate', e.target.value)}
 className="w-full border border-[var(--border-base)] bg-[var(--bg-elevated)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--text-primary)]"
 />
 </div>

 {/* Notes */}
 <div>
 <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
 <FileText size={14} className="inline mr-1" /> Notes (Optional)
 </label>
 <textarea
 value={formData.notes}
 onChange={e => set('notes', e.target.value)}
 rows={2}
 placeholder="Any additional notes..."
 className="w-full border border-[var(--border-base)] bg-[var(--bg-elevated)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--text-primary)]"
 />
 </div>
 </div>
 </div>
 </Modal>
 );
};

// †â€™†â€™Complete Survey Modal (Active †â€™¾Ã‚Â¢ Complete) †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const ActiveToCompleteModal = ({ isOpen, onClose, survey, onSubmit, isAdmin, onSaveSurvey }) => {
 const [formData, setFormData] = useState({ finalImages: [], finalNotes: '', engineerApproval: false, engineerName: '', completionDate: format(new Date(), 'yyyy-MM-dd'), panelPlacementDetails: '', finalDrawing: { lines: [], dimensions: [], textLabels: [] } });
 const [uploading, setUploading] = useState(false);

 // Edit mode state for Pre-Sales form
 const [editMode, setEditMode] = useState(false);
 const [editForm, setEditForm] = useState({});
 const [saving, setSaving] = useState(false);
 // Dynamic custom fields
 const [customFields, setCustomFields] = useState([]);
 const [newFieldLabel, setNewFieldLabel] = useState('');
 const [newFieldType, setNewFieldType] = useState('text');
 const [showAddField, setShowAddField] = useState(false);

 useEffect(() => {
 if (survey) {
 const completeData = survey?.completeData || {};
 setFormData(prev => ({
 ...prev,
 engineerName: survey.solarConsultant || '',
 finalImages: Array.isArray(completeData.finalImages) ? completeData.finalImages : prev.finalImages,
 finalNotes: completeData.finalNotes ?? prev.finalNotes,
 engineerApproval: typeof completeData.engineerApproval === 'boolean' ? completeData.engineerApproval : prev.engineerApproval,
 completionDate: completeData.completionDate
 ? format(new Date(completeData.completionDate), 'yyyy-MM-dd')
 : prev.completionDate,
 panelPlacementDetails: completeData.panelPlacementDetails ?? prev.panelPlacementDetails,
 finalDrawing: completeData.finalDrawing || prev.finalDrawing,
 }));
 setEditForm({
 clientName: survey.clientName || '',
 city: survey.city || '',
 projectCapacity: survey.projectCapacity || '',
 roofType: survey.roofType || '',
 structureType: survey.structureType || '',
 structureHeight: survey.structureHeight || '',
 customHeight: survey.customHeight || '',
 moduleType: survey.moduleType || '',
 solarConsultant: survey.solarConsultant || '',
 floors: survey.floors || '',
 notes: survey.notes || '',
 });
 // Load existing custom fields from survey
 setCustomFields(survey.customFields || []);
 }
 }, [survey]);

 const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
 const setEdit = (field, value) => setEditForm(prev => ({ ...prev, [field]: value }));

 // Custom field handlers
 const addCustomField = () => {
 if (!newFieldLabel.trim()) return;
 setCustomFields(prev => [...prev, { id: Date.now(), label: newFieldLabel.trim(), value: '', type: newFieldType }]);
 setNewFieldLabel('');
 setNewFieldType('text');
 setShowAddField(false);
 };
 const updateCustomField = (id, key, val) => setCustomFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
 const removeCustomField = (id) => setCustomFields(prev => prev.filter(f => f.id !== id));

 const handleSaveEdit = async () => {
 setSaving(true);
 try {
 await onSaveSurvey(survey._id || survey.surveyId, { ...editForm, customFields });
 setEditMode(false);
 toast.success('Survey details updated');
 } catch { toast.error('Failed to save changes'); }
 finally { setSaving(false); }
 };

 const handleImageUpload = async (e) => {
 const files = Array.from(e.target.files);
 if (!files.length) return;
 setUploading(true);
 try {
 const urls = files.map(f => URL.createObjectURL(f));
 setFormData(prev => ({ ...prev, finalImages: [...prev.finalImages, ...urls] }));
 toast.success(`${files.length} images uploaded`);
 } catch { toast.error('Failed to upload images'); }
 finally { setUploading(false); }
 };

 const activeData = survey?.activeData || {};
 const roofDrawing = activeData.roofDrawing || { lines: [], dimensions: [], textLabels: [] };

 // Reusable checkbox group for read-only view
 const CheckboxGroup = ({ label, value, options }) => (
 <div className="flex items-start gap-2 mb-2">
 <span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">{label}</span>
 <div className="flex flex-wrap items-center gap-3">
 {options.map(opt => (
 <div key={opt.id} className="flex items-center gap-1">
 <div className={`w-4 h-4 border border-[var(--border-base)] flex items-center justify-center ${value === opt.id ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-[var(--bg-surface)]'}`}>
 {value === opt.id && <CheckCircle size={12} className="text-white" />}
 </div>
 <span className="text-sm text-[var(--text-secondary)]">{opt.label}</span>
 </div>
 ))}
 </div>
 </div>
 );

 // Editable checkbox group
 const EditCheckboxGroup = ({ label, field, options }) => (
 <div className="flex items-start gap-2 mb-3">
 <span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap w-36">{label}</span>
 <div className="flex flex-wrap items-center gap-3">
 {options.map(opt => (
 <label key={opt.id} className="flex items-center gap-1 cursor-pointer">
 <div
 onClick={() => setEdit(field, editForm[field] === opt.id ? '' : opt.id)}
 className={`w-4 h-4 border-2 flex items-center justify-center cursor-pointer transition-colors ${editForm[field] === opt.id ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-[var(--bg-surface)] border-[var(--border-base)] hover:border-[var(--primary)]'}`}
 >
 {editForm[field] === opt.id && <CheckCircle size={11} className="text-white" />}
 </div>
 <span className="text-sm text-[var(--text-secondary)]">{opt.label}</span>
 </label>
 ))}
 </div>
 </div>
 );

 return (
 <Modal open={isOpen} onClose={onClose} title="" size="xl"
 footer={
 <div className="flex justify-end gap-3">
 <Button variant="ghost" onClick={onClose}>{survey?.status === 'complete' ? 'Close' : 'Cancel'}</Button>
 {survey?.status !== 'complete' && (
 <Button
 onClick={() => onSubmit({ completeData: { ...formData, completionDate: new Date().toISOString() } })}
 disabled={uploading || !formData.engineerApproval}
 className="bg-[var(--green)] hover:bg-[var(--green)]"
 >
 <CheckCircle size={16} className="mr-2" /> Complete Survey
 </Button>
 )}
 </div>
 }
 >
 <div className="bg-[var(--bg-surface)] p-6 max-h-[75vh] overflow-y-auto space-y-6">

 {/* †â€™†â€™PART 1: Pre-Sales Site Assessment Form †â€™†â€™*/}
 <div className={`border-2 p-4 bg-[var(--bg-surface)] transition-colors ${editMode ? 'border-[var(--primary)]' : 'border-[var(--border-base)]'}`}>
 {/* Header */}
 <div className="flex items-start justify-between border-b-2 border-[var(--border-base)] pb-3 mb-4">
 <div className="text-center flex-1"><h2 className="text-lg font-bold text-[var(--text-primary)] border-2 border-[var(--border-base)] inline-block px-4 py-1">Pre-Sales Site Assessment Form</h2></div>
 <div className="text-right">
 <p className="text-sm text-[var(--text-secondary)]">Date: <span className="border-b border-[var(--border-muted)] px-2">{survey?.createdAt ? format(new Date(survey.createdAt), 'dd/MM/yy') : '†â€™'}</span></p>
 <p className="text-xs text-[var(--text-muted)] mt-1">Survey ID: {survey?.surveyId}</p>
 <div className="mt-2 flex items-center gap-2 justify-end">
 <SurveyStatusBadge status={survey?.status} />
 {/* Admin Edit Toggle */}
 {isAdmin && !editMode && (
 <button
 onClick={() => setEditMode(true)}
 className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary)] transition-colors"
 >
 <Edit2 size={11} /> Edit
 </button>
 )}
 {isAdmin && editMode && (
 <div className="flex items-center gap-1">
 <button
 onClick={handleSaveEdit}
 disabled={saving}
 className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--green)] text-white hover:bg-[var(--green)] transition-colors disabled:opacity-60"
 >
 <CheckCircle size={11} /> {saving ? 'Saving...' : 'Save'}
 </button>
 <button
 onClick={() => { setEditMode(false); setEditForm({ clientName: survey?.clientName || '', city: survey?.city || '', projectCapacity: survey?.projectCapacity || '', roofType: survey?.roofType || '', structureType: survey?.structureType || '', structureHeight: survey?.structureHeight || '', customHeight: survey?.customHeight || '', moduleType: survey?.moduleType || '', solarConsultant: survey?.solarConsultant || '', floors: survey?.floors || '', notes: survey?.notes || '' }); }}
 className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-[var(--border-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
 >
 <X size={11} /> Cancel
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

 {editMode ? (
 /* †â€™†â€™EDIT MODE †â€™†â€™*/
 <div className="space-y-3">
 {isAdmin && (
 <div className="flex items-center gap-1.5 mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
 <Edit2 size={13} className="text-blue-500" />
 <p className="text-xs text-[var(--primary)] font-medium">Admin Edit Mode †â€™Make changes and click Save</p>
 </div>
 )}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Client Name</label>
 <input value={editForm.clientName} onChange={e => setEdit('clientName', e.target.value)} className="w-full border border-[var(--border-base)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]" />
 </div>
 <div>
 <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">City</label>
 <input value={editForm.city} onChange={e => setEdit('city', e.target.value)} className="w-full border border-[var(--border-base)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]" />
 </div>
 <div>
 <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Project Capacity</label>
 <input value={editForm.projectCapacity} onChange={e => setEdit('projectCapacity', e.target.value)} placeholder="e.g. 10 kW" className="w-full border border-[var(--border-base)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]" />
 </div>
 <div>
 <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Floors</label>
 <input type="number" value={editForm.floors} onChange={e => setEdit('floors', e.target.value)} className="w-full border border-[var(--border-base)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]" />
 </div>
 <div>
 <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Solar Consultant</label>
 <input value={editForm.solarConsultant} onChange={e => setEdit('solarConsultant', e.target.value)} className="w-full border border-[var(--border-base)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]" />
 </div>
 <div>
 <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Custom Height</label>
 <input value={editForm.customHeight} onChange={e => setEdit('customHeight', e.target.value)} placeholder="e.g. 12 ft" className="w-full border border-[var(--border-base)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]" />
 </div>
 </div>
 <div className="border-t border-[var(--border-base)] pt-3">
 <EditCheckboxGroup label="Roof Type:" field="roofType" options={ROOF_TYPES} />
 <EditCheckboxGroup label="Structure Type:" field="structureType" options={STRUCTURE_TYPES} />
 <EditCheckboxGroup label="Structure Height:" field="structureHeight" options={STRUCTURE_HEIGHTS} />
 <EditCheckboxGroup label="Module:" field="moduleType" options={MODULE_TYPES} />
 </div>
 <div>
 <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Notes</label>
 <textarea value={editForm.notes} onChange={e => setEdit('notes', e.target.value)} rows={2} className="w-full border border-[var(--border-base)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]" placeholder="Additional notes..." />
 </div>

 {/* †â€™†â€™Dynamic Custom Fields †â€™†â€™*/}
 <div className="border-t border-dashed border-blue-300 pt-3">
 <div className="flex items-center justify-between mb-2">
 <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide flex items-center gap-1">
 <Plus size={12} /> Custom Fields
 </p>
 {!showAddField && (
 <button
 onClick={() => setShowAddField(true)}
 className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border-2 border-dashed border-blue-400 text-blue-500 hover:bg-blue-50 transition-colors"
 >
 <Plus size={11} /> Add Field
 </button>
 )}
 </div>

 {/* Add new field form */}
 {showAddField && (
 <div className="flex items-end gap-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
 <div className="flex-1">
 <label className="text-[10px] font-semibold text-[var(--primary)] block mb-1">Field Label *</label>
 <input
 value={newFieldLabel}
 onChange={e => setNewFieldLabel(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && addCustomField()}
 placeholder="e.g. Inverter Brand, Panel Watt, Location..."
 className="w-full border border-blue-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--bg-surface)]"
 autoFocus
 />
 </div>
 <div className="w-28">
 <label className="text-[10px] font-semibold text-[var(--primary)] block mb-1">Field Type</label>
 <select
 value={newFieldType}
 onChange={e => setNewFieldType(e.target.value)}
 className="w-full border border-blue-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--bg-surface)]"
 >
 <option value="text">Text</option>
 <option value="number">Number</option>
 <option value="textarea">Textarea</option>
 <option value="date">Date</option>
 </select>
 </div>
 <button onClick={addCustomField} disabled={!newFieldLabel.trim()} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary)] disabled:opacity-40 transition-colors whitespace-nowrap">
 <CheckCircle size={11} /> Add
 </button>
 <button onClick={() => { setShowAddField(false); setNewFieldLabel(''); }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">
 <X size={11} />
 </button>
 </div>
 )}

 {/* Existing custom fields */}
 {customFields.length === 0 && !showAddField && (
 <p className="text-xs text-[var(--text-muted)] italic py-2">No custom fields yet. Click "Add Field" to add one.</p>
 )}
 <div className="space-y-2">
 {customFields.map((field) => (
 <div key={field.id} className="flex items-start gap-2 p-2.5 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg group">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <input
 value={field.label}
 onChange={e => updateCustomField(field.id, 'label', e.target.value)}
 className="text-xs font-semibold text-[var(--text-secondary)] bg-transparent border-b border-dashed border-[var(--border-base)] focus:outline-none focus:border-blue-400 w-full"
 placeholder="Field label..."
 />
 <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded whitespace-nowrap">{field.type}</span>
 </div>
 {field.type === 'textarea' ? (
 <textarea value={field.value} onChange={e => updateCustomField(field.id, 'value', e.target.value)} rows={2} className="w-full border border-[var(--border-base)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--primary)]" placeholder="Enter value..." />
 ) : (
 <input type={field.type} value={field.value} onChange={e => updateCustomField(field.id, 'value', e.target.value)} className="w-full border border-[var(--border-base)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--primary)]" placeholder="Enter value..." />
 )}
 </div>
 <button onClick={() => removeCustomField(field.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded transition-colors mt-5">
 <X size={13} />
 </button>
 </div>
 ))}
 </div>
 </div>
 </div>
 ) : (
 /* †â€™†â€™VIEW MODE †â€™†â€™*/
 <>
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div className="flex items-center gap-2"><span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">Client Name/City:</span><span className="flex-1 border-b border-[var(--border-base)] px-2 py-1 text-sm">{survey?.clientName} / {survey?.city}</span></div>
 <div className="flex items-center gap-2"><span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">Project Capacity:</span><span className="w-32 border-b border-[var(--border-base)] px-2 py-1 text-sm">{survey?.projectCapacity || '†â€™'}</span></div>
 </div>
 <div className="mb-3 border-b border-[var(--border-base)] pb-2"><CheckboxGroup label="Roof Type:" value={survey?.roofType} options={ROOF_TYPES} /></div>
 <div className="mb-3 border-b border-[var(--border-base)] pb-2"><CheckboxGroup label="Structure Type:" value={survey?.structureType} options={STRUCTURE_TYPES} /></div>
 <div className="mb-3 border-b border-[var(--border-base)] pb-2">
 <CheckboxGroup label="Structure Height:" value={survey?.structureHeight} options={STRUCTURE_HEIGHTS} />
 {survey?.customHeight && <div className="flex items-center gap-2 ml-20 mt-1"><span className="text-sm text-[var(--text-muted)]">Custom:</span><span className="border-b border-[var(--border-base)] px-2 py-0.5 text-sm">{survey.customHeight}</span></div>}
 </div>
 <div className="mb-3 border-b border-[var(--border-base)] pb-2"><CheckboxGroup label="Module:" value={survey?.moduleType} options={MODULE_TYPES} /></div>
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div className="flex items-center gap-2"><span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">Solar Consultant:</span><span className="flex-1 border-b border-[var(--border-base)] px-2 py-1 text-sm">{survey?.solarConsultant || '†â€™'}</span></div>
 <div className="flex items-center gap-2"><span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">Floors:</span><span className="w-16 border-b border-[var(--border-base)] px-2 py-1 text-sm text-center">{survey?.floors || '†â€™'}</span></div>
 </div>
 <div className="mb-4"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-[var(--text-secondary)]">Client Signature:</span><div className="flex-1 border-b-2 border-[var(--border-base)] h-8" /></div></div>
 {roofDrawing.lines?.length > 0 && (
 <div className="mb-4"><p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Roof Layout Drawing:</p><GridDrawingCanvas drawingData={roofDrawing} readOnly /></div>
 )}
 {activeData.siteImages?.length > 0 && (
 <div className="mb-4">
 <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Site Photos:</p>
 <div className="grid grid-cols-4 gap-2">{activeData.siteImages.map((img, idx) => <div key={idx} className="aspect-square border border-[var(--border-base)]"><img src={img} alt={`Site ${idx + 1}`} className="w-full h-full object-cover" /></div>)}</div>
 </div>
 )}
 {survey?.notes && <div className="mb-2"><p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Notes:</p><div className="border border-[var(--border-base)] p-2 text-sm bg-[var(--bg-elevated)]">{survey.notes}</div></div>}

 {/* Custom Fields (view mode) */}
 {(survey?.customFields?.length > 0 || customFields.length > 0) && (
 <div className="mt-3 pt-3 border-t border-dashed border-[var(--border-base)]">
 <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Additional Fields:</p>
 <div className="grid grid-cols-2 gap-2">
 {(survey?.customFields || customFields).filter(f => f.value).map((field, idx) => (
 <div key={field.id || idx} className="flex items-start gap-2 border-b border-[var(--border-base)] pb-1">
 <span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">{field.label}:</span>
 <span className="flex-1 border-b border-[var(--border-base)] px-2 py-0.5 text-sm">{field.value}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </>
 )}
 </div>

 {/* †â€™†â€™PART 2: Survey Completion Form †â€™†â€™*/}
 <div className="border-2 border-[var(--border-base)] p-4 bg-[var(--bg-surface)]">
 <div className="flex items-start justify-between border-b-2 border-[var(--border-base)] pb-3 mb-4">
 <div className="text-center flex-1"><h2 className="text-lg font-bold text-[var(--text-primary)] border-2 border-[var(--border-base)] inline-block px-4 py-1">Survey Completion Form</h2></div>
 <div className="text-right">
 <p className="text-sm text-[var(--text-secondary)]">Date: <span className="border-b border-[var(--border-muted)] px-2">{format(new Date(), 'dd/MM/yy')}</span></p>
 <p className="text-xs text-[var(--text-muted)] mt-1">ID: {survey?.surveyId}</p>
 </div>
 </div>
 <div className="mb-4 p-3 bg-[var(--bg-elevated)] border border-[var(--border-base)]">
 <p className="text-sm"><span className="font-semibold">Client:</span> {survey?.clientName} | <span className="font-semibold">City:</span> {survey?.city}</p>
 <p className="text-sm"><span className="font-semibold">Capacity:</span> {survey?.projectCapacity}</p>
 </div>
 <div className="mb-4">
 <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Final Roof Layout Drawing:</p>
 <GridDrawingCanvas drawingData={formData.finalDrawing} onChange={d => set('finalDrawing', d)} />
 </div>
 <div className="mb-4">
 <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Panel Placement Details:</p>
 <textarea value={formData.panelPlacementDetails} onChange={e => set('panelPlacementDetails', e.target.value)} className="w-full border border-[var(--border-base)] p-2 text-sm focus:outline-none focus:border-[var(--primary)]" rows={3} placeholder="Describe panel placement..." />
 </div>
 <div className="mb-4">
 <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Final Site Photos:</p>
 <div className="border-2 border-dashed border-[var(--border-base)] p-4 text-center">
 <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="final-images-form" />
 <label htmlFor="final-images-form" className="cursor-pointer"><Upload size={24} className="mx-auto mb-2 text-[var(--text-muted)]" /><p className="text-sm text-[var(--text-secondary)]">Upload final site images</p></label>
 </div>
 {formData.finalImages.length > 0 && (
 <div className="grid grid-cols-4 gap-2 mt-3">
 {formData.finalImages.map((img, idx) => (
 <div key={idx} className="relative aspect-square border border-[var(--border-base)]">
 <img src={img} alt={`Final ${idx + 1}`} className="w-full h-full object-cover" />
 <button onClick={() => setFormData(prev => ({ ...prev, finalImages: prev.finalImages.filter((_, i) => i !== idx) }))} className="absolute top-0 right-0 p-1 bg-red-500 text-white"><X size={12} /></button>
 </div>
 ))}
 </div>
 )}
 </div>
 <div className="mb-4">
 <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Final Notes:</p>
 <textarea value={formData.finalNotes} onChange={e => set('finalNotes', e.target.value)} className="w-full border border-[var(--border-base)] p-2 text-sm focus:outline-none focus:border-[var(--primary)]" rows={3} placeholder="Final observations..." />
 </div>
 <div className="border-t-2 border-[var(--border-base)] pt-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><HardHat size={16} /> Engineer Approval</h3>
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">Engineer Name:</span>
 <input type="text" value={formData.engineerName} onChange={e => set('engineerName', e.target.value)} className="flex-1 border-b border-[var(--border-base)] px-2 py-1 text-sm focus:outline-none" placeholder="Enter name" />
 </div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">Completion Date:</span>
 <input type="date" value={formData.completionDate} onChange={e => set('completionDate', e.target.value)} className="border border-[var(--border-base)] px-2 py-1 text-sm focus:outline-none" />
 </div>
 </div>
 <label className="flex items-start gap-3 cursor-pointer p-3 border-2 border-[var(--border-base)] bg-[var(--bg-elevated)]">
 <div className={`w-5 h-5 border-2 border-[var(--border-muted)] flex items-center justify-center mt-0.5 flex-shrink-0 ${formData.engineerApproval ? 'bg-[var(--green)] border-[var(--green)]' : 'bg-[var(--bg-surface)]'}`}>
 {formData.engineerApproval && <CheckCircle size={14} className="text-white" />}
 </div>
 <input type="checkbox" checked={formData.engineerApproval} onChange={e => set('engineerApproval', e.target.checked)} className="hidden" />
 <div><p className="text-sm font-semibold text-[var(--text-primary)]">I confirm that the survey is complete and accurate</p><p className="text-xs text-[var(--text-muted)]">All measurements verified and documented.</p></div>
 </label>
 </div>
 </div>

 </div>
 </Modal>
 );
};

// †â€™†â€™Survey Details Modal (Paper Form Style) †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// †â€™†â€™VIEW DETAILS MODAL (Read-only) †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const SurveyDetailsModal = ({ isOpen, onClose, survey }) => {
 if (!survey || !isOpen) return null;
 
 const activeData = survey.activeData || {};
 const completeData = survey.completeData || {};

 return (
 <Modal
 open={isOpen}
 onClose={onClose}
 title="Survey Details"
 size="lg"
 footer={
 <div className="flex justify-end">
 <Button variant="ghost" onClick={onClose}>
 Close
 </Button>
 </div>
 }
 >
 <div className="space-y-4 max-h-[70vh] overflow-y-auto">
 {/* Header Section */}
 <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-lg border border-primary/20">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{survey.clientName}</h3>
 <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
 <MapPin size={14} /> {survey.city}
 </p>
 </div>
 <div className="text-right">
 <SurveyStatusBadge status={survey.status} />
 <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">{survey.surveyId}</p>
 </div>
 </div>
 </div>

 {/* Key Information Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Customer Name */}
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Customer Name</p>
 <p className="text-sm font-medium text-[var(--text-primary)]">{survey.clientName}</p>
 </div>

 {/* Location */}
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Location</p>
 <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
 <MapPin size={14} className="text-[var(--text-muted)]" /> {survey.city}
 </p>
 </div>

 {/* Capacity */}
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Project Capacity</p>
 <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
 <Zap size={14} className="text-yellow-500" /> {survey.projectCapacity || '†â€™'} kWp
 </p>
 </div>

 {/* Assigned Engineer */}
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Assigned Engineer</p>
 <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
 <User size={14} className="text-[var(--text-muted)]" /> {survey.engineer || 'Not Assigned'}
 </p>
 </div>

 {/* Survey ID */}
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Survey ID</p>
 <p className="text-sm font-medium text-[var(--text-primary)] font-mono">{survey.surveyId}</p>
 </div>

 {/* Survey Date */}
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Survey Date</p>
 <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
 <Calendar size={14} className="text-[var(--text-muted)]" />
 {survey.createdAt ? format(new Date(survey.createdAt), 'dd MMM yyyy') : '†â€™'}
 </p>
 </div>
 </div>

 {/* Technical Details */}
 {(survey.roofType || survey.structureType || survey.moduleType) && (
 <div className="border-t border-[var(--border-base)] pt-4">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3">Technical Specifications</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {survey.roofType && (
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Roof Type</p>
 <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{survey.roofType?.replace('_', ' ')}</p>
 </div>
 )}
 {survey.structureType && (
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Structure Type</p>
 <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{survey.structureType?.replace('_', ' ')}</p>
 </div>
 )}
 {survey.structureHeight && (
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Structure Height</p>
 <p className="text-sm font-medium text-[var(--text-primary)]">{survey.structureHeight}{survey.customHeight ? ` (${survey.customHeight})` : ''}</p>
 </div>
 )}
 {survey.moduleType && (
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Module Type</p>
 <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{survey.moduleType}</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Additional Details for Active/Complete Surveys */}
 {survey.status === 'active' && activeData && (
 <div className="border-t border-[var(--border-base)] pt-4">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3">Active Survey Details</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {activeData.engineerName && (
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Engineer Name</p>
 <p className="text-sm font-medium text-[var(--text-primary)]">{activeData.engineerName}</p>
 </div>
 )}
 {activeData.installationDate && (
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Installation Date</p>
 <p className="text-sm font-medium text-[var(--text-primary)]">
 {format(new Date(activeData.installationDate), 'dd MMM yyyy')}
 </p>
 </div>
 )}
 </div>
 </div>
 )}

 {survey.status === 'complete' && completeData && (
 <div className="border-t border-[var(--border-base)] pt-4">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3">Completion Details</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {completeData.completionDate && (
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Completion Date</p>
 <p className="text-sm font-medium text-[var(--text-primary)]">
 {format(new Date(completeData.completionDate), 'dd MMM yyyy')}
 </p>
 </div>
 )}
 {completeData.actualCapacity && (
 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg">
 <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Actual Capacity</p>
 <p className="text-sm font-medium text-[var(--text-primary)]">{completeData.actualCapacity} kWp</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Notes */}
 {survey.notes && (
 <div className="border-t border-[var(--border-base)] pt-4">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-2">Notes</h4>
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
 <p className="text-sm text-[var(--text-secondary)]">{survey.notes}</p>
 </div>
 </div>
 )}
 </div>
 </Modal>
 );
};

const CompletedSurveyPdfModal = ({ isOpen, onClose, survey }) => {
 if (!survey || !isOpen) return null;

 const activeData = survey.activeData || {};
 const completeData = survey.completeData || {};

 const displayDate = (d) => {
 if (!d) return '†â€™';
 try {
 return format(new Date(d), 'dd MMM yyyy');
 } catch {
 return '†â€™';
 }
 };

 const handleDownloadPdf = () => {
 try {
 downloadSurveyReportPDF(survey);
 } catch {
 toast.error('Download failed');
 }
 };

 const safeCapacity = (() => {
 const val = (survey.projectCapacity ?? '').toString();
 if (!val) return '†â€™';
 return val.toLowerCase().includes('kw') ? val : `${val} kWp`;
 })();

 const normalizeDrawing = (d) => {
 if (!d || typeof d !== 'object') return null;
 return {
 lines: Array.isArray(d.lines) ? d.lines : [],
 rects: Array.isArray(d.rects) ? d.rects : [],
 circles: Array.isArray(d.circles) ? d.circles : [],
 freehand: Array.isArray(d.freehand) ? d.freehand : [],
 dimensions: Array.isArray(d.dimensions) ? d.dimensions : [],
 textLabels: Array.isArray(d.textLabels) ? d.textLabels : [],
 };
 };

 const drawingData = normalizeDrawing(completeData.finalDrawing) || normalizeDrawing(activeData.roofDrawing);

 const renderDrawingSvg = () => {
 if (!drawingData) return null;

 const allPoints = [];
 drawingData.lines.forEach(l => {
 if (typeof l?.startX === 'number' && typeof l?.startY === 'number') allPoints.push({ x: l.startX, y: l.startY });
 if (typeof l?.endX === 'number' && typeof l?.endY === 'number') allPoints.push({ x: l.endX, y: l.endY });
 });
 drawingData.rects.forEach(r => {
 if (typeof r?.x === 'number' && typeof r?.y === 'number') allPoints.push({ x: r.x, y: r.y });
 if (typeof r?.x2 === 'number' && typeof r?.y2 === 'number') allPoints.push({ x: r.x2, y: r.y2 });
 });
 drawingData.circles.forEach(c => {
 if (typeof c?.cx === 'number' && typeof c?.cy === 'number') allPoints.push({ x: c.cx, y: c.cy });
 if (typeof c?.r === 'number') {
 allPoints.push({ x: c.cx + c.r, y: c.cy + c.r });
 allPoints.push({ x: c.cx - c.r, y: c.cy - c.r });
 }
 });
 drawingData.freehand.forEach(stroke => {
 if (Array.isArray(stroke?.points)) {
 stroke.points.forEach(p => {
 if (typeof p?.x === 'number' && typeof p?.y === 'number') allPoints.push({ x: p.x, y: p.y });
 });
 }
 });
 drawingData.textLabels.forEach(t => {
 if (typeof t?.x === 'number' && typeof t?.y === 'number') allPoints.push({ x: t.x, y: t.y });
 });

 if (allPoints.length === 0) return null;

 const minX = Math.min(...allPoints.map(p => p.x));
 const minY = Math.min(...allPoints.map(p => p.y));
 const maxX = Math.max(...allPoints.map(p => p.x));
 const maxY = Math.max(...allPoints.map(p => p.y));
 const pad = 20;
 const w = Math.max(1, (maxX - minX) + pad * 2);
 const h = Math.max(1, (maxY - minY) + pad * 2);
 const viewBox = `${minX - pad} ${minY - pad} ${w} ${h}`;

 return (
 <svg viewBox={viewBox} className="w-full h-64 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-md">
 <defs>
 <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
 <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
 </pattern>
 </defs>
 <rect x={minX - pad} y={minY - pad} width={w} height={h} fill="url(#grid)" />

 {drawingData.lines.map((l, idx) => (
 <line
 key={`l-${idx}`}
 x1={l.startX}
 y1={l.startY}
 x2={l.endX}
 y2={l.endY}
 stroke={l.color || '#2563eb'}
 strokeWidth={l.strokeWidth || 2}
 />
 ))}

 {drawingData.rects.map((r, idx) => {
 const x = r.x;
 const y = r.y;
 const width = (r.x2 ?? x) - x;
 const height = (r.y2 ?? y) - y;
 return (
 <rect
 key={`r-${idx}`}
 x={x}
 y={y}
 width={width}
 height={height}
 fill="transparent"
 stroke={r.color || '#2563eb'}
 strokeWidth={r.strokeWidth || 2}
 />
 );
 })}

 {drawingData.circles.map((c, idx) => (
 <circle
 key={`c-${idx}`}
 cx={c.cx}
 cy={c.cy}
 r={c.r}
 fill="transparent"
 stroke={c.color || '#2563eb'}
 strokeWidth={c.strokeWidth || 2}
 />
 ))}

 {drawingData.freehand.map((stroke, idx) => {
 const pts = Array.isArray(stroke?.points) ? stroke.points : [];
 if (pts.length < 2) return null;
 const d = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
 return (
 <path
 key={`f-${idx}`}
 d={d}
 fill="none"
 stroke={stroke.color || '#2563eb'}
 strokeWidth={stroke.strokeWidth || 2}
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 );
 })}

 {drawingData.textLabels.map((t, idx) => (
 <text key={`t-${idx}`} x={t.x} y={t.y} fontSize={t.fontSize || 14} fill={t.color || '#0f172a'}>
 {t.text}
 </text>
 ))}
 </svg>
 );
 };

 const finalImages = Array.isArray(completeData.finalImages) ? completeData.finalImages : [];
 const topImages = finalImages.slice(0, 3);

 return (
 <Modal
 open={isOpen}
 onClose={onClose}
 title="Survey Report Preview"
 size="xl"
 footer={
 <div className="flex justify-end gap-2">
 <Button variant="ghost" onClick={onClose}>Close</Button>
 <Button variant="outline" onClick={handleDownloadPdf}>
 <Download size={16} /> Download PDF
 </Button>
 </div>
 }
 >
 <style>{`
 @media print {
 body * { visibility: hidden !important; }
 #survey-pdf-preview, #survey-pdf-preview * { visibility: visible !important; }
 #survey-pdf-preview { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
 }

 @page {
 size: A4;
 margin: 12mm;
 }

 #survey-pdf-preview {
 -webkit-print-color-adjust: exact;
 print-color-adjust: exact;
 }

 #survey-pdf-preview .no-print {
 display: block;
 }

 @media print {
 #survey-pdf-preview { box-shadow: none !important; border: none !important; }
 #survey-pdf-preview .no-print { display: none !important; }
 }
 `}</style>

 <div className="max-h-[75vh] overflow-y-auto bg-[var(--bg-surface)] p-4">
 <div id="survey-pdf-preview" className="mx-auto bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-base)] overflow-hidden" style={{ maxWidth: 900 }}>
 <div className="p-6 border-b border-[var(--border-base)] bg-gradient-to-r from-slate-900 to-slate-700 text-white">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="text-xs font-semibold text-white/80">Solar EPC</p>
 <h2 className="text-2xl font-bold tracking-tight">Site Survey Report</h2>
 <p className="text-sm text-white/90 mt-1">Survey ID: <span className="font-mono text-white">{survey.surveyId || '†â€™'}</span></p>
 </div>
 <div className="text-right">
 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-surface)]/10 border border-white/20 backdrop-blur-sm">{(survey.status || 'complete').toString().toUpperCase()}</span>
 <p className="text-sm text-white/90 mt-2">Report Date: <span className="font-semibold text-white">{displayDate(completeData.completionDate || survey.updatedAt || survey.createdAt)}</span></p>
 </div>
 </div>
 </div>

 <div className="p-6 space-y-5">
 <div className="grid grid-cols-2 gap-4">
 <div className="rounded-xl p-4 border border-[var(--border-base)] bg-[var(--bg-surface)]">
 <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Customer</p>
 <p className="text-base font-bold text-[var(--text-primary)] mt-1">{survey.clientName || '†â€™'}</p>
 <p className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1"><MapPin size={14} className="text-[var(--text-muted)]" /> {survey.city || '†â€™'}</p>
 </div>
 <div className="rounded-xl p-4 border border-[var(--border-base)] bg-[var(--bg-surface)]">
 <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Project</p>
 <div className="mt-2 grid grid-cols-2 gap-3">
 <div>
 <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Capacity</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{safeCapacity}</p>
 </div>
 <div>
 <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Floors</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{survey.floors ?? '†â€™'}</p>
 </div>
 <div>
 <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Engineer</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{survey.engineer || '†â€™'}</p>
 </div>
 <div>
 <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Survey Date</p>
 <p className="text-sm font-semibold text-[var(--text-primary)]">{displayDate(activeData.scheduledDate || survey.createdAt)}</p>
 </div>
 </div>
 </div>
 </div>

 <div className="border border-[var(--border-base)] rounded-xl p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)]">Pre-Sales Site Assessment</h3>
 <div className="grid grid-cols-2 gap-3 mt-3">
 <div className="bg-slate-50 rounded-lg p-3">
 <p className="text-[11px] font-semibold text-slate-500 uppercase">Roof Type</p>
 <p className="text-sm font-semibold text-slate-900 mt-1">{survey.roofType ? survey.roofType.replace('_', ' ') : '†â€™'}</p>
 </div>
 <div className="bg-slate-50 rounded-lg p-3">
 <p className="text-[11px] font-semibold text-slate-500 uppercase">Structure Type</p>
 <p className="text-sm font-semibold text-slate-900 mt-1">{survey.structureType ? survey.structureType.replace('_', ' ') : '†â€™'}</p>
 </div>
 <div className="bg-slate-50 rounded-lg p-3">
 <p className="text-[11px] font-semibold text-slate-500 uppercase">Structure Height</p>
 <p className="text-sm font-semibold text-slate-900 mt-1">{survey.structureHeight ? `${survey.structureHeight}${survey.customHeight ? ` (${survey.customHeight})` : ''}` : '†â€™'}</p>
 </div>
 <div className="bg-slate-50 rounded-lg p-3">
 <p className="text-[11px] font-semibold text-slate-500 uppercase">Module Type</p>
 <p className="text-sm font-semibold text-slate-900 mt-1">{survey.moduleType || '†â€™'}</p>
 </div>
 <div className="bg-slate-50 rounded-lg p-3 col-span-2">
 <p className="text-[11px] font-semibold text-slate-500 uppercase">Solar Consultant</p>
 <p className="text-sm font-semibold text-slate-900 mt-1">{survey.solarConsultant || '†â€™'}</p>
 </div>
 </div>
 </div>

 <div className="border border-[var(--border-base)] rounded-xl p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)]">Survey Completion</h3>
 <div className="grid grid-cols-2 gap-3 mt-3">
 <div className="bg-[var(--green)]/10 rounded-lg p-3 border border-[var(--green)]/20">
 <p className="text-[11px] font-semibold text-[var(--green)] uppercase">Completion Date</p>
 <p className="text-sm font-semibold text-[var(--green)] mt-1">{displayDate(completeData.completionDate)}</p>
 </div>
 <div className="bg-[var(--green)]/10 rounded-lg p-3 border border-[var(--green)]/20">
 <p className="text-[11px] font-semibold text-[var(--green)] uppercase">Engineer Approval</p>
 <p className="text-sm font-semibold text-[var(--green)] mt-1">{completeData.engineerApproval ? 'Approved' : 'Not Approved'}</p>
 </div>
 <div className="bg-slate-50 rounded-lg p-3 col-span-2">
 <p className="text-[11px] font-semibold text-slate-500 uppercase">Engineer Name</p>
 <p className="text-sm font-semibold text-slate-900 mt-1">{completeData.engineerName || survey.engineer || '†â€™'}</p>
 </div>
 <div className="bg-slate-50 rounded-lg p-3 col-span-2">
 <p className="text-[11px] font-semibold text-slate-500 uppercase">Panel Placement Details</p>
 <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{completeData.panelPlacementDetails || '†â€™'}</p>
 </div>
 <div className="bg-slate-50 rounded-lg p-3 col-span-2">
 <p className="text-[11px] font-semibold text-slate-500 uppercase">Final Notes</p>
 <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{completeData.finalNotes || '†â€™'}</p>
 </div>
 </div>
 </div>

 <div className="border border-[var(--border-base)] rounded-xl p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)]">Final Roof Layout</h3>
 <div className="mt-3">
 {renderDrawingSvg() || (
 <div className="h-64 flex items-center justify-center text-sm text-[var(--text-muted)] bg-slate-50 border border-[var(--border-base)] rounded-md">
 No drawing available
 </div>
 )}
 </div>
 </div>

 {topImages.length > 0 && (
 <div className="border border-[var(--border-base)] rounded-xl p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)]">Final Site Photos</h3>
 <div className="grid grid-cols-3 gap-3 mt-3">
 {topImages.map((src, idx) => (
 <div key={idx} className="border border-[var(--border-base)] rounded-lg overflow-hidden bg-[var(--bg-surface)]">
 <img src={src} alt={`final-${idx}`} className="w-full h-40 object-cover" />
 <div className="px-3 py-2 bg-slate-50 border-t border-[var(--border-base)]">
 <p className="text-xs font-semibold text-[var(--text-secondary)]">Image {idx + 1}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {survey.notes && (
 <div className="border border-[var(--border-base)] rounded-lg p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)]">Notes</h3>
 <p className="text-sm text-[var(--text-primary)] mt-2 whitespace-pre-wrap">{survey.notes}</p>
 </div>
 )}
 </div>

 <div className="px-6 py-4 border-t border-[var(--border-base)] text-xs text-[var(--text-muted)] flex items-center justify-between">
 <span>Generated by Solar EPC</span>
 <span>{survey.surveyId || ''}</span>
 </div>
 </div>
 </div>
 </Modal>
 );
};

// †â€™†â€™Survey KPI List Modal †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const SurveyKpiModal = ({ title, surveys, filter, onClose, onView }) => {
 const statusColor = {
 pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
 active: 'bg-[var(--primary)]/10 text-blue-500 border-[var(--primary)]/20',
 complete: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
 };
 const actionHint = {
 pending: { label: 'Click to Assign', color: 'text-amber-500', icon: Play },
 active: { label: 'Click to Fill Form', color: 'text-blue-500', icon: FileText },
 complete: { label: 'Click to View', color: 'text-[var(--green)]', icon: Eye },
 all: { label: 'Click to View', color: 'text-[var(--text-muted)]', icon: Eye },
 };
 const hint = actionHint[filter] || actionHint.all;
 const HintIcon = hint.icon;
 return (
 <Modal open={true} onClose={onClose} title={title} size="md"
 footer={<button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><X size={13}/> Close</button>}
 >
 {surveys.length > 0 && (
 <p className={`text-xs mb-3 flex items-center gap-1.5 ${hint.color}`}>
 <HintIcon size={12} /> {hint.label}
 </p>
 )}
 <div className="space-y-2 max-h-[60vh] overflow-y-auto">
 {surveys.length === 0 ? (
 <p className="text-center text-sm text-[var(--text-muted)] py-8">No surveys found</p>
 ) : surveys.map(s => (
 <div key={s._id || s.surveyId} onClick={() => onView(s)}
 className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-elevated)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 cursor-pointer transition-all">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
 {s.clientName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{s.clientName}</p>
 <p className="text-xs text-[var(--text-muted)] flex items-center gap-1"><MapPin size={10}/>{s.city} †â€™…Â¡Â· {s.projectCapacity || '†â€™'}</p>
 </div>
 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor[s.status] || statusColor.pending}`}>{s.status}</span>
 </div>
 ))}
 </div>
 </Modal>
 );
};

// †â€™†â€™Main Site Survey Page †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const SiteSurveyPage = () => {
 const { user } = useAuth();
 const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin';

 const [view, setView] = useState('table');
 const [activeTab, setActiveTab] = useState('all');
 const [surveys, setSurveys] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, complete: 0 });

 // Modal States
 const [pendingModalOpen, setPendingModalOpen] = useState(false);
 const [completeModalOpen, setCompleteModalOpen] = useState(false);
 const [detailsModalOpen, setDetailsModalOpen] = useState(false);
 const [pdfModalOpen, setPdfModalOpen] = useState(false);
 const [calendarModalOpen, setCalendarModalOpen] = useState(false);
 const [createModalOpen, setCreateModalOpen] = useState(false);
 const [editModalOpen, setEditModalOpen] = useState(false);
 const [assignModalOpen, setAssignModalOpen] = useState(false);
 const [selectedSurvey, setSelectedSurvey] = useState(null);
 
 // Pagination State
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 12;
 
 // Calendar State
 const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
 const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
 const calendarRef = useRef(null);

 // Fetch surveys
 const fetchSurveys = useCallback(async () => {
 try {
 setLoading(true);
 // Build params - only send status if not 'all'
 const params = { search: searchQuery, limit: 100 };
 if (activeTab !== 'all') {
 params.status = activeTab;
 }
 
 // Fetch regular surveys
 const response = await siteSurveysApi.getAll(params);
 const surveyData = response.data?.data || response.data || [];

 const existingSurveyLeadIds = new Set(
 (Array.isArray(surveyData) ? surveyData : [])
 .map((s) => (s?.leadId?._id ? s.leadId._id : s?.leadId))
 .filter(Boolean)
 .map((v) => v.toString())
 );
 
 // Also fetch leads with 'survey' stage from CRM
 let leadsAsSurveys = [];
 try {
 console.log('[SiteSurvey] Fetching leads with statusKey=survey...');
 let leadsResponse = await leadsApi.getAll({ 
 statusKey: 'survey', 
 limit: 100,
 search: searchQuery 
 });
 console.log('[SiteSurvey] Leads API response:', leadsResponse);
 
 let leadsData = leadsResponse.data?.data || leadsResponse.data || [];
 console.log('[SiteSurvey] Leads with statusKey filter:', leadsData.length);
 
 // If no leads returned, try fetching all and filter client-side
 if (leadsData.length === 0) {
 console.log('[SiteSurvey] No leads with statusKey filter, trying to fetch all leads...');
 leadsResponse = await leadsApi.getAll({ limit: 200 });
 const allLeads = leadsResponse.data?.data || leadsResponse.data || [];
 console.log('[SiteSurvey] All leads count:', allLeads.length);
 
 // Filter leads with survey stage client-side
 leadsData = allLeads.filter(lead => {
 const status = (lead.statusKey || lead.status || lead.stage || '').toString().toLowerCase();
 return status === 'survey';
 });
 console.log('[SiteSurvey] Filtered survey leads:', leadsData.length);
 }

 // If a real site-survey already exists for the lead, do not show LEAD-* placeholder
 leadsData = leadsData.filter((lead) => {
 const leadId = (lead?._id || lead?.id)?.toString();
 if (!leadId) return false;
 return !existingSurveyLeadIds.has(leadId);
 });
 
 // Convert leads to survey format (placeholders are always pending)
 const leadsAsSurveysAll = leadsData.map(lead => ({
 _id: lead._id || lead.id,
 surveyId: `LEAD-${lead._id || lead.id}`,
 clientName: lead.name,
 city: lead.city || 'Unknown',
 projectCapacity: lead.value ? `${lead.value} kWp` : 'To be determined',
 engineer: lead.assignedTo?.name || 'Unassigned',
 roofType: null,
 status: 'pending',
 notes: lead.notes || '',
 createdAt: lead.createdAt,
 isFromLead: true,
 leadData: lead
 }));

 // Only include placeholders in list for all/pending tabs
 leadsAsSurveys = (activeTab === 'all' || activeTab === 'pending') ? leadsAsSurveysAll : [];
 
 console.log('[SiteSurvey] Converted leads to surveys:', leadsAsSurveys.length);
 } catch (err) {
 console.error('[SiteSurvey] Could not fetch leads:', err);
 }
 
 // Combine both sources
 const combinedSurveys = [...surveyData, ...leadsAsSurveys];
 setSurveys(combinedSurveys);

 const statsResponse = await siteSurveysApi.getStats();
 const statsData = statsResponse.data || {};
 
 // Update stats to include leads with survey stage
 const totalSurveyLeads = (activeTab === 'all' || activeTab === 'pending')
 ? leadsAsSurveys.length
 : 0;
 setStats({ 
 total: (statsData.total || 0) + totalSurveyLeads, 
 pending: (statsData.pending || 0) + totalSurveyLeads, 
 active: statsData.active || 0, 
 complete: statsData.complete || 0 
 });
 } catch (error) {
 console.error('[SiteSurvey] Failed to fetch surveys:', error);
 toast.error('Failed to load surveys');
 } finally {
 setLoading(false);
 }
 }, [activeTab, searchQuery]);

 useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

 useEffect(() => {
 const onLeadStageUpdated = () => {
 fetchSurveys();
 };

 if (typeof window !== 'undefined' && window?.addEventListener) {
 window.addEventListener('leadStageUpdated', onLeadStageUpdated);
 }

 return () => {
 if (typeof window !== 'undefined' && window?.removeEventListener) {
 window.removeEventListener('leadStageUpdated', onLeadStageUpdated);
 }
 };
 }, [fetchSurveys]);

 const handleMoveToActive = async (formData) => {
 try {
 await siteSurveysApi.moveToActive(selectedSurvey._id || selectedSurvey.surveyId, formData);
 toast.success('Survey assigned and moved to Active');
 setPendingModalOpen(false); setSelectedSurvey(null); fetchSurveys();
 } catch { toast.error('Failed to update survey'); }
 };

 const handleMoveToComplete = async (formData) => {
 try {
 await siteSurveysApi.moveToComplete(selectedSurvey._id || selectedSurvey.surveyId, formData);
 toast.success('Survey completed successfully');
 setCompleteModalOpen(false); setSelectedSurvey(null); fetchSurveys();
 } catch { toast.error('Failed to complete survey'); }
 };

 const handleDelete = async (survey) => {
 if (!window.confirm(`Delete ${survey.isFromLead ? 'lead' : 'survey'} for ${survey.clientName}?`)) return;
 try {
 // If this is a lead from CRM (has isFromLead flag), delete via leadsApi
 if (survey.isFromLead) {
 await leadsApi.delete(survey._id || survey.surveyId.replace('LEAD-', ''));
 } else {
 // Regular survey - delete via siteSurveysApi
 await siteSurveysApi.delete(survey._id || survey.surveyId);
 }
 toast.success(`${survey.isFromLead ? 'Lead' : 'Survey'} deleted`);
 fetchSurveys();
 } catch (err) {
 console.error('Delete error:', err);
 toast.error(err?.response?.data?.message || `Failed to delete ${survey.isFromLead ? 'lead' : 'survey'}`);
 }
 };

 const openPendingModal = (s) => { setSelectedSurvey(s); setPendingModalOpen(true); };
 const openCompleteModal = (s) => { setSelectedSurvey(s); setCompleteModalOpen(true); };
 const openDetailsModal = (s) => {
 setSelectedSurvey(s);
 const normalizedStatus = (s?.status ?? '').toString().trim().toLowerCase();
 if (normalizedStatus === 'complete') {
 setPdfModalOpen(true);
 return;
 }
 setDetailsModalOpen(true);
 };
 const openEditModal = (s) => { setSelectedSurvey(s); setEditModalOpen(true); };
 const openAssignModal = (s) => { setSelectedSurvey(s); setAssignModalOpen(true); };

 const handleSaveSurvey = async (id, data) => {
 await siteSurveysApi.update(id, data);
 fetchSurveys();
 };

 const handleAssignSurvey = async (id, data) => {
 await siteSurveysApi.assign(id, data);
 fetchSurveys();
 };

 // Table row actions
 const ROW_ACTIONS = [
 { label: 'View Details', icon: Eye, onClick: row => openDetailsModal(row) },
 {
 label: 'Edit',
 icon: Edit2,
 onClick: row => (((row?.status ?? '').toString().trim().toLowerCase() === 'complete') ? openCompleteModal(row) : openEditModal(row))
 },
 { label: 'Start Survey', icon: Play, onClick: row => openPendingModal(row), show: row => (row?.status ?? '').toString().trim().toLowerCase() === 'pending' },
 { label: 'Fill Form', icon: FileText, onClick: row => openCompleteModal(row), show: row => (row?.status ?? '').toString().trim().toLowerCase() === 'active' },
 { label: 'Delete', icon: Trash2, onClick: row => handleDelete(row), danger: true },
 ];

 // Filtered surveys for current tab
 const filteredSurveys = activeTab === 'all'
 ? surveys
 : surveys.filter(s => (s?.status ?? '').toString().trim().toLowerCase() === activeTab);

 // Pagination Logic
 const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
 const paginatedSurveys = filteredSurveys.slice(
 (currentPage - 1) * itemsPerPage,
 currentPage * itemsPerPage
 );

 // Reset to page 1 when filters change
 useEffect(() => {
 setCurrentPage(1);
 }, [activeTab, searchQuery, view]);

 const statusCountMap = { all: stats.total, pending: stats.pending, active: stats.active, complete: stats.complete };

 return (
 <div className="animate-fade-in space-y-5">
 {/* Page Header */}
 <PageHeader
 title="Site Survey Management"
 subtitle="Manage site surveys †â€™…Â¡Â· from lead assignment to completion"
 tabs={[
 { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
 { id: 'grid', label: 'Grid', icon: LayoutGrid },
 { id: 'table', label: 'Table', icon: List },
 ]}
 activeTab={view}
 onTabChange={setView}
 actions={[
 {
 type: 'button',
 label: 'Create Survey',
 icon: Plus,
 variant: 'primary',
 onClick: () => setCreateModalOpen(true),
 },
 {
 type: 'button',
 label: 'View Calendar',
 icon: Calendar,
 variant: 'outline',
 onClick: () => setCalendarModalOpen(true),
 },
 ]}
 />

 {/* KPI Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <KPICard
 label="Total Surveys"
 value={stats.total}
 icon={FileText}
 variant="indigo"
 sub="All surveys"
 onClick={() => setActiveTab('all')}
 />
 <KPICard
 label="Pending"
 value={stats.pending}
 icon={Clock}
 variant="amber"
 sub="Awaiting assignment"
 onClick={() => setActiveTab('pending')}
 />
 <KPICard
 label="Active"
 value={stats.active}
 icon={Play}
 variant="blue"
 sub="In progress"
 onClick={() => setActiveTab('active')}
 />
 <KPICard
 label="Completed"
 value={stats.complete}
 icon={CheckCircle}
 variant="emerald"
 sub="Surveys done"
 onClick={() => setActiveTab('complete')}
 />
 </div>

 {/* Toolbar: Status Filter Tabs + Search */}
 <div className="glass-card p-4">
 <div className="flex flex-wrap items-center justify-between gap-3">
 {/* Status Tabs */}
 <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
 {STATUS_TABS.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
 activeTab === tab.id
 ? 'bg-[var(--primary)] text-white shadow-sm'
 : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
 }`}
 >
 {tab.label}
 <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
 activeTab === tab.id ? 'bg-[var(--bg-surface)]/20 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
 }`}>
 {statusCountMap[tab.id]}
 </span>
 </button>
 ))}
 </div>

 {/* Search */}
 <div className="relative">
 <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
 <input
 placeholder="Search by client name..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 pr-4 py-2 text-sm border border-[var(--border-base)] bg-[var(--bg-elevated)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--text-primary)] w-60"
 />
 </div>
 </div>
 </div>

 {/* Content Area */}
 {view === 'dashboard' ? (
 /* Advanced Dashboard View */
 <SiteSurveyDashboard 
 surveys={surveys}
 loading={loading}
 onRefresh={fetchSurveys}
 />
 ) : loading ? (
 <div className="glass-card p-12 text-center">
 <div className="animate-spin w-8 h-8 border-2 border-[var(--border-muted)] border-t-[var(--primary)] rounded-full mx-auto mb-4" />
 <p className="text-sm text-[var(--text-muted)]">Loading surveys...</p>
 </div>
 ) : filteredSurveys.length === 0 ? (
 <div className="glass-card p-12 text-center">
 <FileText size={48} className="mx-auto mb-4 text-[var(--text-faint)]" />
 <p className="text-[var(--text-secondary)] font-medium mb-1">No surveys found</p>
 <p className="text-sm text-[var(--text-faint)]">
 {activeTab === 'all'
 ? 'Surveys appear here when leads are moved to Site Survey stage'
 : `No ${activeTab} surveys at the moment`}
 </p>
 </div>
 ) : view === 'grid' ? (
 /* Grid / Card View */
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {paginatedSurveys.map(survey => (
 <SurveyCard
 key={survey._id || survey.surveyId}
 survey={survey}
 onView={openDetailsModal}
 onStart={openPendingModal}
 onComplete={openCompleteModal}
 onDelete={handleDelete}
 />
 ))}
 </div>
 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between glass-card p-3">
 <div className="text-sm text-[var(--text-muted)]">
 Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSurveys.length)} of {filteredSurveys.length} surveys
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
 disabled={currentPage === 1}
 className="p-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronLeft size={16} />
 </button>
 <div className="flex items-center gap-1">
 {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
 <button
 key={page}
 onClick={() => setCurrentPage(page)}
 className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
 currentPage === page
 ? 'bg-[var(--primary)] text-white'
 : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-base)]'
 }`}
 >
 {page}
 </button>
 ))}
 </div>
 <button
 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
 disabled={currentPage === totalPages}
 className="p-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronRight size={16} />
 </button>
 </div>
 </div>
 )}
 </div>
 ) : (
 /* Table View - DataTable has built-in pagination */
 <div className="glass-card overflow-hidden">
 <DataTable
 columns={getColumns({
 onStartSurvey: openPendingModal,
 onFillForm: openCompleteModal,
 })}
 data={paginatedSurveys}
 total={filteredSurveys.length}
 page={currentPage}
 pageSize={itemsPerPage}
 onPageChange={setCurrentPage}
 rowKey={row => row._id || row.surveyId}
 rowActions={ROW_ACTIONS}
 loading={loading}
 emptyMessage="No surveys found"
 onRowClick={(row) => openDetailsModal(row)}
 />
 </div>
 )}

 {/* Modals */}
 <PendingToActiveModal
 isOpen={pendingModalOpen}
 onClose={() => { setPendingModalOpen(false); setSelectedSurvey(null); }}
 survey={selectedSurvey}
 onSubmit={handleMoveToActive}
 onAssign={handleAssignSurvey}
 />
 <ActiveToCompleteModal
 isOpen={completeModalOpen}
 onClose={() => { setCompleteModalOpen(false); setSelectedSurvey(null); }}
 survey={selectedSurvey}
 onSubmit={handleMoveToComplete}
 isAdmin={isAdmin}
 onSaveSurvey={handleSaveSurvey}
 />
 <SurveyDetailsModal
 isOpen={detailsModalOpen}
 onClose={() => { setDetailsModalOpen(false); setSelectedSurvey(null); }}
 survey={selectedSurvey}
 />

 <CompletedSurveyPdfModal
 isOpen={pdfModalOpen}
 onClose={() => { setPdfModalOpen(false); setSelectedSurvey(null); }}
 survey={selectedSurvey}
 />

 {/* ==================== CALENDAR MODAL ==================== */}
 {calendarModalOpen && (
 <Modal
 open={calendarModalOpen}
 onClose={() => setCalendarModalOpen(false)}
 title="Site Survey Calendar"
 size="xl"
 >
 <div className="p-4">
 {/* Month/Year Filter Controls */}
 <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border-base)]">
 <Select
 value={calendarMonth}
 onChange={(e) => {
 const newMonth = parseInt(e.target.value);
 setCalendarMonth(newMonth);
 if (calendarRef.current) {
 calendarRef.current.getApi().gotoDate(new Date(calendarYear, newMonth, 1));
 }
 }}
 className="h-9 flex-1"
 >
 {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
 <option key={idx} value={idx}>{month}</option>
 ))}
 </Select>
 <Select
 value={calendarYear}
 onChange={(e) => {
 const newYear = parseInt(e.target.value);
 setCalendarYear(newYear);
 if (calendarRef.current) {
 calendarRef.current.getApi().gotoDate(new Date(newYear, calendarMonth, 1));
 }
 }}
 className="h-9 w-24"
 >
 {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
 <option key={year} value={year}>{year}</option>
 ))}
 </Select>
 <div className="ml-auto text-sm text-[var(--text-muted)]">
 {surveys.filter(r => {
 const date = new Date(r.createdAt || r.surveyDate || Date.now());
 return date.getMonth() === calendarMonth && date.getFullYear() === calendarYear;
 }).length} surveys this month
 </div>
 </div>

 <style>{`
 .fc {
 font-family: inherit;
 font-size: 0.75rem;
 }
 .fc .fc-toolbar-title {
 font-size: 0.875rem;
 font-weight: 600;
 color: var(--primary);
 }
 .fc .fc-button {
 background: #f3f4f6;
 border: 1px solid #d1d5db;
 color: #374151;
 font-weight: 500;
 padding: 0.25rem 0.5rem;
 border-radius: 0.25rem;
 font-size: 0.75rem;
 }
 .fc .fc-button:hover {
 background: #e5e7eb;
 }
 .fc .fc-button-primary {
 background: var(--primary);
 border-color: var(--primary);
 color: white;
 }
 .fc .fc-button-primary:hover {
 background: var(--primary-hover, var(--primary));
 }
 .fc .fc-col-header-cell {
 padding: 0.25rem 0;
 font-weight: 600;
 color: #374151;
 font-size: 0.7rem;
 }
 .fc .fc-col-header-cell.fc-day-sun {
 color: #ef4444;
 }
 .fc .fc-daygrid-day {
 border: 1px solid #e5e7eb;
 }
 .fc .fc-daygrid-day-number {
 font-size: 0.75rem;
 color: #6b7280;
 padding: 0.25rem;
 }
 .fc .fc-day-today {
 background: #fef3c7 !important;
 }
 .fc .fc-event {
 font-size: 0.65rem;
 padding: 0.0625rem 0.125rem;
 border-radius: 0.125rem;
 cursor: pointer;
 }
 .fc .fc-h-event .fc-event-main {
 font-weight: 500;
 }
 .fc .fc-daygrid-event-harness {
 margin: 1px 0;
 }
 .fc .fc-daygrid-day-events {
 min-height: 1.5em;
 }
 `}</style>
 <FullCalendar
 ref={calendarRef}
 plugins={[dayGridPlugin, interactionPlugin]}
 initialView="dayGridMonth"
 initialDate={new Date(calendarYear, calendarMonth, 1)}
 headerToolbar={{
 left: 'title',
 center: '',
 right: 'prev,next'
 }}
 datesSet={(dateInfo) => {
 setCalendarMonth(dateInfo.view.currentStart.getMonth());
 setCalendarYear(dateInfo.view.currentStart.getFullYear());
 }}
 events={surveys.map(survey => {
 const surveyDate = new Date(survey.createdAt || survey.surveyDate || Date.now());
 const statusConfig = {
 pending: { bg: '#fde68a', border: '#f59e0b', text: '#92400e' },
 active: { bg: '#86efac', border: '#22c55e', text: '#166534' },
 complete: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e40af' }
 };
 const config = statusConfig[survey.status] || statusConfig.pending;
 return {
 id: survey._id || survey.surveyId,
 title: `${survey.clientName || 'Survey'} - ${survey.city || ''}`,
 start: surveyDate,
 allDay: true,
 backgroundColor: config.bg,
 borderColor: config.border,
 textColor: config.text,
 extendedProps: {
 status: survey.status,
 client: survey.clientName,
 city: survey.city,
 capacity: survey.projectCapacity
 }
 };
 })}
 height="auto"
 dayMaxEvents={3}
 eventClick={(info) => {
 const survey = surveys.find(s => 
 (s._id === info.event.id) || (s.surveyId === info.event.id)
 );
 if (survey) {
 setSelectedSurvey(survey);
 setDetailsModalOpen(true);
 setCalendarModalOpen(false);
 }
 }}
 eventMouseEnter={(info) => {
 info.el.title = `${info.event.extendedProps.client} (${info.event.extendedProps.city})\nStatus: ${info.event.extendedProps.status}`;
 }}
 />

 {/* Calendar Legend */}
 <div className="pt-3 border-t border-[var(--border-base)] mt-3 space-y-2">
 <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Survey Status</p>
 <div className="grid grid-cols-3 gap-2">
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-full bg-[#fde68a] border border-[#f59e0b]" />
 <span className="text-xs text-[var(--text-secondary)]">Pending</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-full bg-[#86efac] border border-[#22c55e]" />
 <span className="text-xs text-[var(--text-secondary)]">Active</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-full bg-[#bfdbfe] border border-[#3b82f6]" />
 <span className="text-xs text-[var(--text-secondary)]">Complete</span>
 </div>
 </div>
 </div>

 {/* Survey Stats Summary */}
 <div className="pt-3 border-t border-[var(--border-base)] mt-3 grid grid-cols-3 gap-2">
 <div className="bg-amber-50 border border-amber-200 rounded p-2 text-center">
 <p className="text-lg font-bold text-amber-600">{surveys.filter(s => s.status === 'pending').length}</p>
 <p className="text-xs text-amber-600">Pending</p>
 </div>
 <div className="bg-[var(--green)]/10 border border-[var(--green)]/20 rounded p-2 text-center">
 <p className="text-lg font-bold text-[var(--green)]">{surveys.filter(s => s.status === 'active').length}</p>
 <p className="text-xs text-[var(--green)]">Active</p>
 </div>
 <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
 <p className="text-lg font-bold text-[var(--primary)]">{surveys.filter(s => s.status === 'complete').length}</p>
 <p className="text-xs text-[var(--primary)]">Complete</p>
 </div>
 </div>
 </div>
 </Modal>
 )}

 <EditSurveyModal
 isOpen={editModalOpen}
 onClose={() => { setEditModalOpen(false); setSelectedSurvey(null); }}
 survey={selectedSurvey}
 onSave={handleSaveSurvey}
 />

 <AssignSurveyModal
 isOpen={assignModalOpen}
 onClose={() => { setAssignModalOpen(false); setSelectedSurvey(null); }}
 survey={selectedSurvey}
 onAssign={handleAssignSurvey}
 />

 {/* ==================== CREATE SURVEY MODAL ==================== */}
 {createModalOpen && (
 <CreateSurveyModal
 isOpen={createModalOpen}
 onClose={() => {
 setCreateModalOpen(false);
 setSelectedSurvey(null);
 }}
 onCreate={async (formData) => {
 try {
 // Generate unique survey ID
 const timestamp = Date.now().toString(36).toUpperCase();
 const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
 const surveyId = `SUR-${timestamp}-${randomPart}`;
 
 // Prepare survey data with defaults
 const newSurvey = {
 surveyId, // Auto-generated unique ID
 clientName: formData.clientName,
 city: formData.city,
 projectCapacity: formData.projectCapacity || 'To be determined',
 engineer: formData.engineer || 'Unassigned',
 roofType: formData.roofType,
 structureType: formData.structureType,
 structureHeight: formData.structureHeight,
 moduleType: formData.moduleType,
 notes: formData.notes,
 status: 'pending', // Default to pending status
 floors: 1,
 solarConsultant: user?.name || 'System',
 createdAt: new Date().toISOString(),
 };
 
 console.log('Creating new survey:', newSurvey);
 
 // Call API to create survey
 const response = await siteSurveysApi.create(newSurvey);
 const createdSurvey = response.data?.data || response.data;
 
 console.log('Survey created successfully:', createdSurvey);
 
 toast.success(`Survey ${surveyId} created and added to Pending list`);
 setCreateModalOpen(false);
 setSelectedSurvey(null);
 
 // Refresh the surveys list to show the new survey
 await fetchSurveys();
 
 } catch (error) {
 console.error('Error creating survey:', error);
 const errorMsg = error.response?.data?.message || error.message || 'Failed to create survey';
 toast.error(errorMsg);
 }
 }}
 />
 )}
 </div>
 );
};

// †â€™†â€™CREATE SURVEY MODAL †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const CreateSurveyModal = ({ isOpen, onClose, onCreate }) => {
 const [formData, setFormData] = useState({
 clientName: '',
 city: '',
 projectCapacity: '',
 engineer: '',
 roofType: '',
 structureType: '',
 structureHeight: '',
 moduleType: '',
 notes: '',
 });

 const handleSubmit = (e) => {
 e.preventDefault();
 // Validate required fields
 if (!formData.clientName || !formData.city || !formData.projectCapacity) {
 toast.error('Please fill in all required fields');
 return;
 }
 onCreate(formData);
 };

 return (
 <Modal
 open={isOpen}
 onClose={onClose}
 title="Create New Site Survey"
 size="lg"
 footer={
 <div className="flex justify-end gap-2">
 <Button variant="ghost" onClick={onClose}>
 Cancel
 </Button>
 <Button variant="primary" onClick={handleSubmit}>
 <Plus size={16} /> Create Survey
 </Button>
 </div>
 }
 >
 <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
 {/* Basic Information */}
 <div className="space-y-3">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] border-b border-[var(--border-base)] pb-2">Basic Information</h4>
 
 <FormField label="Customer Name *" required>
 <Input
 value={formData.clientName}
 onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
 placeholder="Enter customer name"
 required
 />
 </FormField>

 <FormField label="Location / City *" required>
 <Input
 value={formData.city}
 onChange={(e) => setFormData({ ...formData, city: e.target.value })}
 placeholder="Enter city name"
 required
 />
 </FormField>

 <FormField label="Project Capacity (kWp) *" required>
 <Input
 type="number"
 value={formData.projectCapacity}
 onChange={(e) => setFormData({ ...formData, projectCapacity: e.target.value })}
 placeholder="e.g., 10"
 required
 />
 </FormField>

 <FormField label="Assigned Engineer">
 <Input
 value={formData.engineer}
 onChange={(e) => setFormData({ ...formData, engineer: e.target.value })}
 placeholder="Engineer name"
 />
 </FormField>
 </div>

 {/* Technical Specifications */}
 <div className="space-y-3 pt-3">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] border-b border-[var(--border-base)] pb-2">Technical Specifications</h4>
 
 <FormField label="Roof Type">
 <Select
 value={formData.roofType}
 onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
 >
 <option value="">Select roof type</option>
 {ROOF_TYPES.map(type => (
 <option key={type.id} value={type.id}>{type.label}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Structure Type">
 <Select
 value={formData.structureType}
 onChange={(e) => setFormData({ ...formData, structureType: e.target.value })}
 >
 <option value="">Select structure type</option>
 {STRUCTURE_TYPES.map(type => (
 <option key={type.id} value={type.id}>{type.label}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Structure Height">
 <Select
 value={formData.structureHeight}
 onChange={(e) => setFormData({ ...formData, structureHeight: e.target.value })}
 >
 <option value="">Select height</option>
 {STRUCTURE_HEIGHTS.map(height => (
 <option key={height.id} value={height.id}>{height.label}</option>
 ))}
 </Select>
 </FormField>

 <FormField label="Module Type">
 <Select
 value={formData.moduleType}
 onChange={(e) => setFormData({ ...formData, moduleType: e.target.value })}
 >
 <option value="">Select module type</option>
 {MODULE_TYPES.map(type => (
 <option key={type.id} value={type.id}>{type.label}</option>
 ))}
 </Select>
 </FormField>
 </div>

 {/* Additional Notes */}
 <div className="space-y-3 pt-3">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] border-b border-[var(--border-base)] pb-2">Additional Information</h4>
 
 <FormField label="Notes">
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 placeholder="Any additional notes or instructions..."
 rows={3}
 />
 </FormField>
 </div>
 </form>
 </Modal>
 );
};

// †â€™†â€™EDIT SURVEY MODAL †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const EditSurveyModal = ({ isOpen, onClose, survey, onSave }) => {
 const [formData, setFormData] = useState({
 clientName: '',
 city: '',
 projectCapacity: '',
 engineer: '',
 roofType: '',
 structureType: '',
 structureHeight: '',
 moduleType: '',
 notes: '',
 });
 const [saving, setSaving] = useState(false);
 const [employees, setEmployees] = useState([]);
 const [empLoading, setEmpLoading] = useState(false);

 // Fetch employees from HRM when modal opens
 useEffect(() => {
 if (!isOpen) return;
 const fetchEmployees = async () => {
 setEmpLoading(true);
 try {
 const res = await employeeApi.getAll();
 const data = res?.data || res || [];
 setEmployees(Array.isArray(data) ? data : []);
 } catch (err) {
 console.error('Failed to fetch employees:', err);
 setEmployees([]);
 } finally {
 setEmpLoading(false);
 }
 };
 fetchEmployees();
 }, [isOpen]);

 useEffect(() => {
 if (survey) {
 setFormData({
 clientName: survey.clientName || '',
 city: survey.city || '',
 projectCapacity: survey.projectCapacity || '',
 engineer: survey.engineer || '',
 roofType: survey.roofType || '',
 structureType: survey.structureType || '',
 structureHeight: survey.structureHeight || '',
 moduleType: survey.moduleType || '',
 notes: survey.notes || '',
 });
 }
 }, [survey]);

 // Group employees by department
 const employeesByDept = employees.reduce((acc, emp) => {
 const dept = emp.department || 'Other';
 if (!acc[dept]) acc[dept] = [];
 acc[dept].push(emp);
 return acc;
 }, {});

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!formData.clientName || !formData.city) {
 toast.error('Please fill in required fields');
 return;
 }
 setSaving(true);
 try {
 await onSave(survey._id || survey.surveyId, formData);
 toast.success('Survey updated successfully');
 onClose();
 } catch (error) {
 toast.error('Failed to update survey');
 } finally {
 setSaving(false);
 }
 };

 return (
 <Modal
 open={isOpen}
 onClose={onClose}
 title="Edit Site Survey"
 size="lg"
 footer={
 <div className="flex justify-end gap-2">
 <Button variant="ghost" onClick={onClose} disabled={saving}>
 Cancel
 </Button>
 <Button variant="primary" onClick={handleSubmit} disabled={saving}>
 {saving ? 'Saving...' : <><CheckCircle size={16} /> Save Changes</>}
 </Button>
 </div>
 }
 >
 <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
 {/* Basic Information */}
 <div className="space-y-3">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] border-b border-[var(--border-base)] pb-2">Basic Information</h4>
 <FormField label="Customer Name *" required>
 <Input
 value={formData.clientName}
 onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
 placeholder="Enter customer name"
 required
 />
 </FormField>
 <FormField label="Location / City *" required>
 <Input
 value={formData.city}
 onChange={(e) => setFormData({ ...formData, city: e.target.value })}
 placeholder="Enter city name"
 required
 />
 </FormField>
 <FormField label="Project Capacity (kWp)">
 <Input
 value={formData.projectCapacity}
 onChange={(e) => setFormData({ ...formData, projectCapacity: e.target.value })}
 placeholder="e.g., 10 kWp"
 />
 </FormField>
 <FormField label="Assigned Engineer">
 <select
 value={formData.engineer}
 onChange={(e) => setFormData({ ...formData, engineer: e.target.value })}
 disabled={empLoading}
 className="w-full border border-[var(--border-base)] bg-[var(--bg-elevated)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--text-primary)] disabled:opacity-50"
 >
 <option value="">{empLoading ? 'Loading employees...' : '†â€™Select Engineer †â€™'}</option>
 {Object.entries(employeesByDept).map(([dept, emps]) => (
 <optgroup key={dept} label={dept}>
 {emps.map(emp => {
 const fullName = `${emp.firstName} ${emp.lastName}`.trim();
 return (
 <option key={emp._id} value={fullName}>
 {fullName}{emp.designation ? ` (${emp.designation})` : ''}
 </option>
 );
 })}
 </optgroup>
 ))}
 </select>
 {empLoading && (
 <p className="text-[11px] text-[var(--text-faint)] mt-1 flex items-center gap-1">
 <span className="inline-block w-3 h-3 border border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
 Fetching from HRM...
 </p>
 )}
 </FormField>
 </div>
 {/* Technical Specifications */}
 <div className="space-y-3 pt-3">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] border-b border-[var(--border-base)] pb-2">Technical Specifications</h4>
 <FormField label="Roof Type">
 <Select
 value={formData.roofType}
 onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
 >
 <option value="">Select roof type</option>
 {ROOF_TYPES.map(type => (
 <option key={type.id} value={type.id}>{type.label}</option>
 ))}
 </Select>
 </FormField>
 <FormField label="Structure Type">
 <Select
 value={formData.structureType}
 onChange={(e) => setFormData({ ...formData, structureType: e.target.value })}
 >
 <option value="">Select structure type</option>
 {STRUCTURE_TYPES.map(type => (
 <option key={type.id} value={type.id}>{type.label}</option>
 ))}
 </Select>
 </FormField>
 <FormField label="Structure Height">
 <Select
 value={formData.structureHeight}
 onChange={(e) => setFormData({ ...formData, structureHeight: e.target.value })}
 >
 <option value="">Select height</option>
 {STRUCTURE_HEIGHTS.map(height => (
 <option key={height.id} value={height.id}>{height.label}</option>
 ))}
 </Select>
 </FormField>
 <FormField label="Module Type">
 <Select
 value={formData.moduleType}
 onChange={(e) => setFormData({ ...formData, moduleType: e.target.value })}
 >
 <option value="">Select module type</option>
 {MODULE_TYPES.map(type => (
 <option key={type.id} value={type.id}>{type.label}</option>
 ))}
 </Select>
 </FormField>
 </div>
 {/* Additional Notes */}
 <div className="space-y-3 pt-3">
 <h4 className="text-sm font-bold text-[var(--text-secondary)] border-b border-[var(--border-base)] pb-2">Additional Information</h4>
 <FormField label="Notes">
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 placeholder="Any additional notes or instructions..."
 rows={3}
 />
 </FormField>
 </div>
 </form>
 </Modal>
 );
};

// †â€™†â€™ASSIGN SURVEY MODAL †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const AssignSurveyModal = ({ isOpen, onClose, survey, onAssign }) => {
 const [selectedUser, setSelectedUser] = useState('');
 const [notes, setNotes] = useState('');
 const [employees, setEmployees] = useState([]);
 const [empLoading, setEmpLoading] = useState(false);
 const [assigning, setAssigning] = useState(false);

 // Fetch employees from HRM when modal opens
 useEffect(() => {
 if (!isOpen) return;
 setSelectedUser('');
 setNotes('');
 const fetchEmployees = async () => {
 setEmpLoading(true);
 try {
 const res = await employeeApi.getAll();
 const data = res?.data || res || [];
 setEmployees(Array.isArray(data) ? data : []);
 } catch (err) {
 console.error('Failed to fetch employees:', err);
 setEmployees([]);
 } finally {
 setEmpLoading(false);
 }
 };
 fetchEmployees();
 }, [isOpen]);

 // Pre-select current assignee if exists
 useEffect(() => {
 if (survey?.assignedTo && employees.length > 0) {
 const assigned = employees.find(e => e._id === survey.assignedTo);
 if (assigned) {
 setSelectedUser(assigned._id);
 }
 }
 }, [survey, employees]);

 // Group employees by department
 const employeesByDept = employees.reduce((acc, emp) => {
 const dept = emp.department || 'Other';
 if (!acc[dept]) acc[dept] = [];
 acc[dept].push(emp);
 return acc;
 }, {});

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!selectedUser) {
 toast.error('Please select a user to assign');
 return;
 }
 setAssigning(true);
 try {
 await onAssign(survey._id || survey.surveyId, { assignedTo: selectedUser, notes });
 toast.success('Survey assigned successfully');
 onClose();
 } catch (error) {
 toast.error('Failed to assign survey');
 } finally {
 setAssigning(false);
 }
 };

 return (
 <Modal
 open={isOpen}
 onClose={onClose}
 title="Assign Survey"
 size="md"
 footer={
 <div className="flex justify-end gap-2">
 <Button variant="ghost" onClick={onClose} disabled={assigning}>
 Cancel
 </Button>
 <Button variant="primary" onClick={handleSubmit} disabled={assigning || !selectedUser}>
 {assigning ? 'Assigning...' : <><User size={16} /> Assign Survey</>}
 </Button>
 </div>
 }
 >
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="bg-blue-50 p-3 rounded-lg mb-4">
 <p className="text-sm text-blue-700">
 <strong>Survey:</strong> {survey?.surveyId} - {survey?.clientName}
 </p>
 <p className="text-sm text-[var(--primary)] mt-1">
 <strong>Current Status:</strong> {survey?.status}
 </p>
 </div>

 <FormField label="Assign To *" required>
 <select
 value={selectedUser}
 onChange={(e) => setSelectedUser(e.target.value)}
 disabled={empLoading}
 className="w-full border border-[var(--border-base)] bg-[var(--bg-elevated)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--text-primary)] disabled:opacity-50"
 >
 <option value="">{empLoading ? 'Loading employees...' : '†â€™Select Engineer †â€™'}</option>
 {Object.entries(employeesByDept).map(([dept, emps]) => (
 <optgroup key={dept} label={dept}>
 {emps.map(emp => {
 const fullName = `${emp.firstName} ${emp.lastName}`.trim();
 return (
 <option key={emp._id} value={emp._id}>
 {fullName}{emp.designation ? ` (${emp.designation})` : ''}
 </option>
 );
 })}
 </optgroup>
 ))}
 </select>
 {empLoading && (
 <p className="text-[11px] text-[var(--text-faint)] mt-1 flex items-center gap-1">
 <span className="inline-block w-3 h-3 border border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
 Fetching from HRM...
 </p>
 )}
 </FormField>

 <FormField label="Notes (Optional)">
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Add any notes about this assignment..."
 rows={3}
 />
 </FormField>
 </form>
 </Modal>
 );
};

export default SiteSurveyPage;
