// Solar OS | Document Management Module
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
 Plus, FileText, Send, DollarSign,
 LayoutGrid, List, Search, Filter,
 Copy, Trash2,
 FileSpreadsheet,
 User, Calendar, Clock,
 Brain,
 FileCheck, FileSignature, Receipt, FolderOpen,
 ChevronDown, ChevronUp, Mail, Phone,
 TrendingUp, TrendingDown, ArrowUpRight,
 Activity, PieChart as PieChartIcon,
 BarChart3, Target, Zap,
 Sun, Hammer,
 MoreVertical, CheckCircle, Eye, RefreshCw,
} from 'lucide-react';
import {
 BarChart, Bar, PieChart, Pie, Cell,
 XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
 AreaChart, Area, LineChart, Line,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { CURRENCY } from '../config/app.config';
import { cn } from '../lib/utils';
import api from '../lib/apiClient';
import { downloadQuotationPDF } from '../lib/pdfTemplate';
import QuotationBuilderPage from './QuotationBuilderPage';
import EquipmentPage from './EquipmentPage';
import EstimatePage from './EstimatePage';
import ProposalPage from './ProposalPage';
import { toast } from '../components/ui/Toast';
import { documentsApi } from '../services/documentsApi';

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Live Counts Component �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
const LiveCountCard = ({ label, count, color = 'blue', onClick, isLoading }) => {
 const [displayCount, setDisplayCount] = useState(count);
 const [isPulsing, setIsPulsing] = useState(false);

 useEffect(() => {
 if (count !== displayCount) {
 setIsPulsing(true);
 setDisplayCount(count);
 setTimeout(() => setIsPulsing(false), 500);
 }
 }, [count]);

 const colorClasses = {
 blue: 'bg-blue-50 border-blue-200 text-blue-700',
 green: 'bg-green-50 border-green-200 text-green-700',
 orange: 'bg-orange-50 border-orange-200 text-orange-700',
 purple: 'bg-purple-50 border-purple-200 text-purple-700',
 red: 'bg-red-50 border-red-200 text-red-700',
 teal: 'bg-teal-50 border-teal-200 text-teal-700',
 };

 return (
 <button
 onClick={onClick}
 disabled={isLoading}
 className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${colorClasses[color]
 } ${isPulsing ? 'scale-105 shadow-lg' : 'hover:shadow-md'} ${isLoading ? 'opacity-70' : ''
 }`}
 >
 <div className="text-left">
 <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{label}</p>
 <p className={`text-2xl font-bold ${isPulsing ? 'animate-pulse' : ''}`}>
 {isLoading ? <RefreshCw className="animate-spin" size={24} /> : displayCount}
 </p>
 </div>
 </button>
 );
};

const fmt = CURRENCY.format;

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Mock Data for Documents �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
// No mock data - real API only

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Status Configurations �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
const DOCUMENT_STATUS = {
 draft: { label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
 sent: { label: 'Sent', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
 viewed: { label: 'Viewed', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
 accepted: { label: 'Accepted', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
 rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
 expired: { label: 'Expired', color: '#475569', bg: 'rgba(71,85,105,0.10)' },
 signed: { label: 'Signed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
 paid: { label: 'Paid', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
 pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Status Cell Component (for using hooks in table column) �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
const StatusCell = ({ status, doc, isProcessing, onUpdateStatus }) => {
 const [statusMenuOpen, setStatusMenuOpen] = useState(false);
 const config = DOCUMENT_STATUS[status] || DOCUMENT_STATUS.draft;

 return (
 <div className="relative">
 <button
 onClick={(e) => {
 e.stopPropagation();
 setStatusMenuOpen(!statusMenuOpen);
 }}
 disabled={isProcessing}
 className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all hover:opacity-80"
 style={{ background: config.bg, color: config.color }}
 >
 {config.label}
 </button>

 {statusMenuOpen && (
 <div className="absolute left-0 mt-1 w-32 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg shadow-lg z-50 py-1">
 {Object.entries(DOCUMENT_STATUS).map(([statusKey, statusConfig]) => (
 <button
 key={statusKey}
 onClick={(e) => {
 e.stopPropagation();
 onUpdateStatus(doc, statusKey);
 setStatusMenuOpen(false);
 }}
 disabled={isProcessing || status === statusKey}
 className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
 >
 <span
 className="w-2 h-2 rounded-full"
 style={{ background: statusConfig.color }}
 />
 <span>{statusConfig.label}</span>
 </button>
 ))}
 </div>
 )}
 </div>
 );
};

const DOCUMENT_TYPES = {
 estimate: { label: 'Estimate', icon: FileText, color: '#3b82f6' },
 proposal: { label: 'Proposal', icon: FileCheck, color: '#8b5cf6' },
 quotation: { label: 'Quotation', icon: FileSpreadsheet, color: '#22c55e' },
};

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Dashboard KPI Component �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
const DashboardKPI = ({ title, value, change, icon: Icon, color, subtitle }) => (
 <div className="glass-card p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer">
 <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
 <Icon size={20} style={{ color }} />
 </div>
 <div className="flex-1">
 <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{title}</p>
 <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
 {subtitle && <p className="text-[9px] text-[var(--text-muted)]">{subtitle}</p>}
 {change !== undefined && (
 <p className={`text-[10px] font-bold ${change >= 0 ? 'text-[var(--green)]' : 'text-red-500'}`}>
 {change >= 0 ? '�’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡ �’�� �¢�’�¡f��f�’�¡f��¹�’�' : '�’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡ �’�� �¢�’�¡f��f�’�¡f��¦�’�“'} {Math.abs(change)}%
 </p>
 )}
 </div>
 </div>
);

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Document Card Component �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
const DocumentCard = ({ document, onClick, onSend, onDuplicate, onDelete }) => {
 const TypeIcon = DOCUMENT_TYPES[document.type]?.icon || FileText;
 const typeColor = DOCUMENT_TYPES[document.type]?.color || '#64748b';
 const statusConfig = DOCUMENT_STATUS[document.status] || DOCUMENT_STATUS.draft;

 return (
 <div
 onClick={() => onClick(document)}
 className="glass-card p-4 cursor-pointer hover:scale-[1.01] transition-all space-y-3"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2">
 <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${typeColor}20` }}>
 <TypeIcon size={20} style={{ color: typeColor }} />
 </div>
 <div>
 <p className="text-xs font-semibold text-[var(--text-primary)]">{document.id}</p>
 <p className="text-[10px] text-[var(--text-muted)] capitalize">{DOCUMENT_TYPES[document.type]?.label}</p>
 </div>
 </div>
 <div
 className="px-2 py-1 rounded-full text-[10px] font-medium"
 style={{ background: statusConfig.bg, color: statusConfig.color }}
 >
 {statusConfig.label}
 </div>
 </div>

 <div>
 <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2">{document.title}</p>
 <p className="text-xs text-[var(--text-muted)] mt-0.5">{document.customerName}</p>
 </div>

 <div className="grid grid-cols-2 gap-2 text-[10px]">
 <div className="glass-card p-2 text-center">
 <p className="text-[var(--text-muted)]">Total Value</p>
  <p className="font-bold text-[var(--text-primary)]">{CURRENCY.formatExact(document.total)}</p>
 </div>
 <div className="glass-card p-2 text-center">
 <p className="text-[var(--text-muted)]">Items</p>
 <p className="font-bold text-[var(--solar)]">{document.items?.length || 0}</p>
 </div>
 </div>

 <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
 <span>Created: {new Date(document.createdAt).toLocaleDateString()}</span>
 {document.validUntil && (
 <span>Valid till: {new Date(document.validUntil).toLocaleDateString()}</span>
 )}
 </div>

 <div className="flex items-center gap-1 pt-2 border-t border-[var(--border-base)]">
 <button
 onClick={(e) => { e.stopPropagation(); onSend(document); }}
 className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-medium hover:bg-[var(--primary)]/20 transition-colors"
 >
 <Send size={12} />
 Send
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); onDuplicate(document); }}
 className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
 >
 <Copy size={14} />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); onDelete(document); }}
 className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-red-400 hover:bg-red-400/10 transition-colors"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 );
};

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Main Document Page Component �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
const DocumentPage = () => {
 const [activeTab, setActiveTab] = useState('estimate');
 const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
 const [searchQuery, setSearchQuery] = useState('');
 const [scoringEnabled, setScoringEnabled] = useState(true);
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [selectedDocument, setSelectedDocument] = useState(null);
 const [documents, setDocuments] = useState([]);
 const [realQuotations, setRealQuotations] = useState([]);
 const [dashboardStats, setDashboardStats] = useState(null);
 const [solarQuoteKey, setSolarQuoteKey] = useState(0);
 const [actionMenuOpen, setActionMenuOpen] = useState(null);
 const [isProcessing, setIsProcessing] = useState(false);

 const [lastUpdated, setLastUpdated] = useState(new Date());
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [autoRefresh, setAutoRefresh] = useState(true);

 // Live counts state
 const [liveCounts, setLiveCounts] = useState({
 estimates: 0,
 proposals: 0,
 quotations: 0,
 total: 0,
 draft: 0,
 sent: 0,
 accepted: 0
 });

 // Fetch live counts function
 const fetchLiveCounts = useCallback(async () => {
 try {
 setIsRefreshing(true);
 const [statsRes, quotRes, docsRes] = await Promise.all([
 documentsApi.getDashboardStats(),
 api.get('/quotations'),
 api.get('/documents/all')
 ]);

 const statsData = statsRes?.data?.data || statsRes?.data;

 const rawQuots = quotRes?.data || quotRes || [];
 const quotationsCount = Array.isArray(rawQuots) ? rawQuots.length : 0;

 const rawDocs = docsRes?.data?.data || docsRes?.data || [];
 const estimates = rawDocs.filter(d => d.type === 'estimate').length;
 const proposals = rawDocs.filter(d => d.type === 'proposal').length;
 const draft = [...rawDocs, ...(Array.isArray(rawQuots) ? rawQuots : [])]
 .filter(d => (d.status || 'draft').toString().toLowerCase() === 'draft').length;
 const sent = [...rawDocs, ...(Array.isArray(rawQuots) ? rawQuots : [])]
 .filter(d => (d.status || '').toString().toLowerCase() === 'sent').length;
 const accepted = [...rawDocs, ...(Array.isArray(rawQuots) ? rawQuots : [])]
 .filter(d => ['accepted', 'approved'].includes((d.status || '').toString().toLowerCase())).length;

 setLiveCounts({
 estimates,
 proposals,
 quotations: quotationsCount,
 total: estimates + proposals + quotationsCount,
 draft,
 sent,
 accepted
 });

 setLastUpdated(new Date());
 setDashboardStats(statsData);
 } catch (err) {
 console.error('Error fetching live counts:', err);
 } finally {
 setIsRefreshing(false);
 }
 }, []);

 // Initial load
 useEffect(() => {
 let cancelled = false;
 const loadData = async () => {
 try {
 const [statsRes, quotRes, docsRes] = await Promise.all([
 documentsApi.getDashboardStats(),
 api.get('/quotations'),
 api.get('/documents/all')
 ]);

 const statsData = statsRes?.data?.data || statsRes?.data;
 if (!cancelled) setDashboardStats(statsData);

 // Extract real quotations
 const rawQuots = quotRes?.data || quotRes || [];
 const formattedQuots = (Array.isArray(rawQuots) ? rawQuots : []).map(q => {
 const statusRaw = (q.status ?? 'draft').toString().toLowerCase();
 const status = statusRaw === 'approved' ? 'accepted' : statusRaw;

 return ({
 id: q.quotationId || q._id,
 dbId: q._id,
 type: 'quotation',
 title: q.notes || `Solar Quote - ${q.customerName}`,
 customerName: q.customerName,
 customerEmail: q.customerEmail,
 customerPhone: q.customerPhone,
 total: q.finalQuotationPrice,
 status,
 createdAt: q.createdAt,
 validUntil: q.validUntil,
 paymentTerms: q.paymentTerms || '',
 visitInMonth: q.visitInMonth || '',
 totalVisit: q.totalVisit || '',
 items: (q.materials || []).map(m => ({
 name: m.name,
 quantity: m.quantity,
 unitPrice: m.unitPrice,
 total: m.totalPrice
 }))
 });
 });

 // Extract real documents (Estimates, Proposals, etc.)
 const rawDocs = docsRes?.data?.data || docsRes?.data || [];
 const formattedDocs = (Array.isArray(rawDocs) ? rawDocs : []).map(d => {
 const statusRaw = (d.status ?? 'draft').toString().toLowerCase();
 const status = statusRaw === 'approved' ? 'accepted' : statusRaw;

 return ({
 id: d.documentId || d.id || d._id,
 dbId: d._id,
 type: d.type || 'estimate',
 title: d.title || d.projectName || `Document - ${d.customerName}`,
 customerName: d.customerName,
 customerEmail: d.customerEmail,
 customerPhone: d.customerPhone,
 total: d.total || d.totalValue || 0,
 status,
 createdAt: d.createdAt,
 validUntil: d.validUntil,
 paymentTerms: d.paymentTerms || '',
 visitInMonth: d.visitInMonth || '',
 totalVisit: d.totalVisit || '',
 items: (d.items || []).map(i => ({
 name: i.name,
 quantity: i.quantity,
 unitPrice: i.unitPrice,
 total: i.total
 }))
 });
 });

 if (!cancelled) {
 setRealQuotations(formattedQuots);
 setDocuments(formattedDocs);

 // Update live counts
 const estimates = formattedDocs.filter(d => d.type === 'estimate').length;
 const proposals = formattedDocs.filter(d => d.type === 'proposal').length;
 const quotationsCount = formattedQuots.length;
 const draft = [...formattedDocs, ...formattedQuots].filter(d => d.status === 'draft').length;
 const sent = [...formattedDocs, ...formattedQuots].filter(d => d.status === 'sent').length;
 const accepted = [...formattedDocs, ...formattedQuots].filter(d => d.status === 'accepted').length;

 setLiveCounts({
 estimates,
 proposals,
 quotations: quotationsCount,
 total: estimates + proposals + quotationsCount,
 draft,
 sent,
 accepted
 });
 setLastUpdated(new Date());
 }
 } catch (err) {
 console.error('Error loading documents data:', err);
 }
 };
 loadData();
 return () => {
 cancelled = true;
 };
 }, [solarQuoteKey]);

 // Auto-refresh every 30 seconds
 useEffect(() => {
 if (!autoRefresh) return;

 const interval = setInterval(() => {
 fetchLiveCounts();
 }, 30000); // 30 seconds

 return () => clearInterval(interval);
 }, [autoRefresh, fetchLiveCounts]);

 // Merge real documents with real quotations for the 'All' view
 const allDocuments = useMemo(() => {
 console.log('[DocumentPage] Merging documents for All view:', { documents, realQuotations });
 return [...documents, ...realQuotations].sort((a, b) =>
 new Date(b.createdAt) - new Date(a.createdAt)
 );
 }, [documents, realQuotations]);

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Filter Documents by Tab �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const filteredDocuments = useMemo(() => {
 // Filter by tab
 switch (activeTab) {
 case 'dashboard':
 return [];
 case 'estimate':
 return allDocuments.filter(d => d.type === 'estimate');
 case 'proposal':
 return allDocuments.filter(d => d.type === 'proposal');
 case 'quotation':
 return realQuotations;
 case 'all':
 default:
 let filtered = allDocuments;
 if (searchQuery) {
 const query = searchQuery.toLowerCase();
 filtered = filtered.filter(d =>
 (d.id && d.id.toLowerCase().includes(query)) ||
 (d.title && d.title.toLowerCase().includes(query)) ||
 (d.customerName && d.customerName.toLowerCase().includes(query)) ||
 (d.customerEmail && d.customerEmail.toLowerCase().includes(query))
 );
 }
 return filtered;
 }
 }, [allDocuments, realQuotations, activeTab, searchQuery]);

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Stats Calculations �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const stats = useMemo(() => {
 const epq = documents.filter(d => ['estimate', 'proposal', 'quotation'].includes(d.type));

 return {
 epq: {
 total: epq.length,
 value: epq.reduce((a, d) => a + d.total, 0),
 draft: epq.filter(d => d.status === 'draft').length,
 sent: epq.filter(d => d.status === 'sent').length,
 accepted: epq.filter(d => d.status === 'accepted').length,
 },
 total: {
 documents: documents.length,
 value: documents.reduce((a, d) => a + d.total, 0),
 },
 };
 }, [documents]);

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Handlers �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const handleCreateDocument = (data) => {
 const newDoc = {
 id: `DOC-${String(documents.length + 1).padStart(3, '0')}`,
 ...data,
 status: 'draft',
 createdAt: new Date().toISOString().split('T')[0],
 };
 setDocuments([newDoc, ...documents]);
 setIsCreateModalOpen(false);
 };

 const handleSendDocument = (doc) => {
 setDocuments(docs => docs.map(d =>
 d.id === doc.id ? { ...d, status: 'sent', sentAt: new Date().toISOString() } : d
 ));
 };

 const handleDuplicateDocument = (doc) => {
 const newDoc = {
 ...doc,
 id: `DOC-${String(documents.length + 1).padStart(3, '0')}`,
 title: `${doc.title} (Copy)`,
 status: 'draft',
 createdAt: new Date().toISOString().split('T')[0],
 sentAt: null,
 acceptedAt: null,
 };
 setDocuments([newDoc, ...documents]);
 };

 const handleDeleteDocument = (doc) => {
 if (window.confirm(`Delete document ${doc.id}?`)) {
 setDocuments(docs => docs.filter(d => d.id !== doc.id));
 }
 };

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Status Update Handler �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const handleUpdateStatus = async (doc, newStatus) => {
 setIsProcessing(true);
 try {
 // Use different endpoints based on document type
 let endpoint;
 if (doc.type === 'quotation') {
 endpoint = `/quotations/${doc.dbId || doc.id}`;
 } else {
 endpoint = `/documents/${doc.dbId || doc.id}`;
 }

 // API call to update document/quotation status
 await api.put(endpoint, { status: newStatus });

 // Update local state
 setDocuments(docs => docs.map(d =>
 d.id === doc.id ? { ...d, status: newStatus } : d
 ));
 setRealQuotations(quots => quots.map(q =>
 q.id === doc.id ? { ...q, status: newStatus } : q
 ));

 toast.success(`Status updated to ${newStatus}`);
 } catch (error) {
 console.error('Error updating status:', error);
 toast.error('Failed to update status');
 } finally {
 setIsProcessing(false);
 setActionMenuOpen(null);
 }
 };

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡New Action Handlers �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const handleApproveDocument = async (doc) => {
 if (!window.confirm(`Approve ${doc.id} and create project?`)) return;

 setIsProcessing(true);
 try {
 // Create project from document/quotation
 const projectData = {
 projectId: `PRJ-${Date.now()}`, // Required by DTO
 customerName: doc.customerName,
 email: doc.customerEmail, // Mapped from customerEmail
 mobileNumber: doc.customerPhone, // Mapped from customerPhone
 site: 'TBD', // Required by DTO
 systemSize: 0, // Required by DTO
 status: 'Logistics', // Must be one of the Enum values
 pm: 'Unassigned', // Required by DTO
 startDate: new Date().toISOString(),
 progress: 0, // Required by DTO
 value: doc.total, // Mapped from total
 notes: doc.title,
 items: doc.items?.map(item => ({
 itemId: `item-${Math.random().toString(36).substr(2, 9)}`,
 category: 'Miscellaneous',
 itemName: item.name,
 quantity: item.quantity,
 unitPrice: item.unitPrice,
 totalPrice: item.total
 })) || [],
 // Copy payment terms and visit details from quotation
 paymentTerms: doc.paymentTerms || '',
 visitsPerMonth: doc.visitInMonth || '',
 totalVisits: doc.totalVisit || '',
 };

 console.log('Creating project with data:', projectData);

 // API call to create project
 const response = await api.post('/projects', projectData);

 if (response.data) {
 // Update document status to approved
 setDocuments(docs => docs.map(d =>
 d.id === doc.id ? { ...d, status: 'accepted', approvedAt: new Date().toISOString() } : d
 ));

 alert(`�’�� �¢�’�¢�’��f�¡f�� �¢�’�’��f�’��’�� �¢�’�¡f��f�’�¡f��f�¡¦ Project created successfully from ${doc.id}!`);
 }
 } catch (error) {
 console.error('Error creating project:', error);
 alert('�’�� �¢�’�¢�’��f�¡f�� �¢�’�’��f�¡f�� �¢�’�’��f�’�Failed to create project. Please try again.');
 } finally {
 setIsProcessing(false);
 setActionMenuOpen(null);
 }
 };

 const handleSendEmailAndComplete = async (doc) => {
 if (!window.confirm(`Send email to ${doc.customerEmail} and mark as completed?`)) return;

 setIsProcessing(true);
 try {
 // Prepare document data for PDF generation
 const emailData = {
 to: doc.customerEmail,
 documentId: doc.id,
 documentType: doc.type,
 customerName: doc.customerName,
 items: doc.items?.map(item => ({
 name: item.name,
 quantity: item.quantity,
 unitPrice: item.unitPrice,
 total: item.total
 })) || [],
 total: doc.total,
 notes: doc.notes || `Document sent from Documents module`,
 };

 console.log('Sending email with data:', emailData);

 // Send email with PDF attachment
 const response = await api.post('/email/send-document', emailData);

 console.log('Email API response:', response);

 // Check if response has data and success flag
 const result = response.data || response;

 if (!result.success) {
 throw new Error(result.message || 'Failed to send email');
 }

 // Mark document as completed after successful email send
 setDocuments(docs => docs.map(d =>
 d.id === doc.id ? {
 ...d,
 status: 'completed',
 completedAt: new Date().toISOString(),
 emailSent: true,
 emailSentAt: new Date().toISOString()
 } : d
 ));

 alert(`�’�� �¢�’�¢�’��f�¡f�� �¢�’�’��f�’��’�� �¢�’�¡f��f�’�¡f��f�¡¦ Email with PDF sent to ${doc.customerEmail} successfully!`);
 } catch (error) {
 console.error('Error sending email:', error);
 // Show detailed error message
 const errorMsg = error?.message || error?.data?.message || 'Unknown error';
 alert(`�’�� �¢�’�¢�’��f�¡f�� �¢�’�’��f�¡f�� �¢�’�’��f�’�Failed to send email:\n${errorMsg}`);
 } finally {
 setIsProcessing(false);
 setActionMenuOpen(null);
 }
 };

 const handleMarkAsCompleted = async (doc) => {
 if (!window.confirm(`Mark ${doc.id} as completed and create project?`)) return;

 setIsProcessing(true);
 try {
 // Reuse handleApproveDocument logic as /projects/quotations endpoint doesn't exist
 await handleApproveDocument(doc);

 // The local state update is handled within handleApproveDocument
 } catch (error) {
 console.error('Error marking as completed:', error);
 } finally {
 setIsProcessing(false);
 setActionMenuOpen(null);
 }
 };

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Table Columns �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const tableColumns = [
 {
 key: 'id',
 header: 'Proposal #',
 render: v => <span className="text-xs font-medium text-red-500 hover:text-red-600 cursor-pointer">{v}</span>,
 },
 {
 key: 'customerName',
 header: 'Customer',
 render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span>,
 },
 {
 key: 'title',
 header: 'Project',
 render: v => <span className="text-xs text-[var(--text-muted)] line-clamp-1">{v}</span>,
 },
 {
 key: 'total',
 header: 'Total',
      render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{CURRENCY.formatExact(v)}</span>,
 },
 {
 key: 'status',
 header: 'Status',
 render: (v, doc) => (
 <StatusCell
 status={v}
 doc={doc}
 isProcessing={isProcessing}
 onUpdateStatus={handleUpdateStatus}
 />
 ),
 },
 {
 key: 'actions',
 header: 'Actions',
 render: (v, doc) => (
 <div className="relative">
 <button
 onClick={(e) => {
 e.stopPropagation();
 setActionMenuOpen(actionMenuOpen === doc.id ? null : doc.id);
 }}
 disabled={isProcessing}
 className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
 >
 <MoreVertical size={16} />
 </button>

 {actionMenuOpen === doc.id && (
 <>
 {/* Backdrop to close menu when clicking outside */}
 <div
 className="fixed inset-0 z-[9998]"
 onClick={(e) => {
 e.stopPropagation();
 setActionMenuOpen(null);
 }}
 />
 <div 
 className="action-menu-container fixed z-[9999] w-56 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg shadow-2xl py-2"
 style={{
 right: '20px',
 top: '50%',
 transform: 'translateY(-50%)',
 }}
 >
 {/* Status Update Submenu */}
 <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-base)]">
 Change Status
 </div>
 <div className="py-1">
 {Object.entries(DOCUMENT_STATUS).map(([statusKey, statusConfig]) => (
 <button
 key={statusKey}
 onClick={(e) => {
 e.stopPropagation();
 handleUpdateStatus(doc, statusKey);
 }}
 disabled={isProcessing || doc.status === statusKey}
 className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
 >
 <span
 className="w-3 h-3 rounded-full flex-shrink-0"
 style={{ background: statusConfig.color }}
 />
 <span className="flex-1">{statusConfig.label}</span>
 {doc.status === statusKey && (
 <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">Current</span>
 )}
 </button>
 ))}
 </div>

 <div className="border-t border-[var(--border-base)] my-1" />

 <button
 onClick={(e) => {
 e.stopPropagation();
 handleApproveDocument(doc);
 }}
 disabled={isProcessing || doc.status === 'accepted'}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
 >
 <CheckCircle size={14} className="text-emerald-500" />
 <span>Approve & Create Project</span>
 </button>

 <button
 onClick={(e) => {
 e.stopPropagation();
 handleSendEmailAndComplete(doc);
 }}
 disabled={isProcessing || !doc.customerEmail}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
 >
 <Mail size={14} className="text-blue-500" />
 <span>Send Email & Complete</span>
 </button>

 <button
 onClick={(e) => {
 e.stopPropagation();
 handleMarkAsCompleted(doc);
 }}
 disabled={isProcessing}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
 >
 <FileCheck size={14} className="text-purple-500" />
 <span>Mark as Completed</span>
 </button>

 <div className="border-t border-[var(--border-base)] my-1" />

 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteDocument(doc);
 setActionMenuOpen(null);
 }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-red-50 text-red-500 transition-colors"
 >
 <Trash2 size={14} />
 <span>Delete</span>
 </button>
 </div>
 </>
 )}
 </div>
 ),
 },
 ];

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Dashboard View �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const DashboardView = () => {
 const [timeFilter, setTimeFilter] = useState('6months');

 // Filtered monthly data based on time period
 const getFilteredData = () => {
 // Calculate real monthly data from allDocuments
 const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
 const currentMonth = new Date().getMonth();
 const last6Months = [];

 for (let i = 5; i >= 0; i--) {
 const monthIndex = (currentMonth - i + 12) % 12;
 last6Months.push({
 month: months[monthIndex],
 estimates: 0,
 proposals: 0,
 quotations: 0,
 value: 0,
 monthNum: monthIndex
 });
 }

 allDocuments.forEach(doc => {
 const date = new Date(doc.createdAt);
 const monthName = months[date.getMonth()];
 const entry = last6Months.find(m => m.month === monthName);

 if (entry) {
 if (doc.type === 'estimate') entry.estimates++;
 else if (doc.type === 'proposal') entry.proposals++;
 else if (doc.type === 'quotation') entry.quotations++;
 entry.value += (doc.total || 0);
 }
 });

 switch (timeFilter) {
 case '7days':
 return last6Months.slice(-1);
 case '30days':
 return last6Months.slice(-1);
 case '3months':
 return last6Months.slice(-3);
 case '6months':
 default:
 return last6Months;
 }
 };

 const monthlyData = getFilteredData();

 // Document type distribution for pie chart
 const typeDistribution = [
 { name: 'Estimates', value: allDocuments.filter(d => d.type === 'estimate').length, color: '#3b82f6' },
 { name: 'Proposals', value: allDocuments.filter(d => d.type === 'proposal').length, color: '#8b5cf6' },
 { name: 'Quotations', value: allDocuments.filter(d => d.type === 'quotation').length, color: '#22c55e' },
 ].filter(item => item.value > 0);

 // Status distribution
 const statusData = [
 { status: 'Draft', count: allDocuments.filter(d => d.status === 'draft').length, color: '#64748b' },
 { status: 'Sent', count: allDocuments.filter(d => d.status === 'sent').length, color: '#3b82f6' },
 { status: 'Accepted', count: allDocuments.filter(d => d.status === 'accepted').length, color: '#22c55e' },
 { status: 'Signed', count: allDocuments.filter(d => d.status === 'signed').length, color: '#10b981' },
 { status: 'Paid', count: allDocuments.filter(d => d.status === 'paid').length, color: '#059669' },
 ].filter(item => item.count > 0);

 // Top customers by value
 const topCustomers = useMemo(() => {
 const customerTotals = {};
 allDocuments.forEach(doc => {
 if (!customerTotals[doc.customerName]) {
 customerTotals[doc.customerName] = { name: doc.customerName, value: 0, count: 0 };
 }
 customerTotals[doc.customerName].value += (doc.total || 0);
 customerTotals[doc.customerName].count += 1;
 });
 return Object.values(customerTotals)
 .sort((a, b) => b.value - a.value)
 .slice(0, 5);
 }, [allDocuments]);

 return (
 <div className="space-y-4 animate-fade-in">
 {/* Live Counts Section */}
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <Activity size={18} className="text-blue-500" />
 <h3 className="text-sm font-bold text-[var(--text-primary)]">Live Document Counts</h3>
 <span className="text-[10px] text-[var(--text-muted)]">
 Last updated: {lastUpdated.toLocaleTimeString()}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setAutoRefresh(!autoRefresh)}
 className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)]'
 }`}
 title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}
 >
 <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
 {autoRefresh ? 'Live' : 'Paused'}
 </button>
 <button
 onClick={fetchLiveCounts}
 disabled={isRefreshing}
 className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors disabled:opacity-50"
 title="Refresh Now"
 >
 <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
 <LiveCountCard
 label="Total"
 count={liveCounts.total}
 color="blue"
 isLoading={isRefreshing}
 onClick={() => setActiveTab('all')}
 />
 <LiveCountCard
 label="Estimates"
 count={liveCounts.estimates}
 color="purple"
 isLoading={isRefreshing}
 onClick={() => setActiveTab('estimate')}
 />
 <LiveCountCard
 label="Proposals"
 count={liveCounts.proposals}
 color="orange"
 isLoading={isRefreshing}
 onClick={() => setActiveTab('proposal')}
 />
 <LiveCountCard
 label="Quotations"
 count={liveCounts.quotations}
 color="green"
 isLoading={isRefreshing}
 onClick={() => setActiveTab('quotation')}
 />
 <LiveCountCard
 label="Draft"
 count={liveCounts.draft}
 color="red"
 isLoading={isRefreshing}
 />
 <LiveCountCard
 label="Sent"
 count={liveCounts.sent}
 color="teal"
 isLoading={isRefreshing}
 />
 <LiveCountCard
 label="Accepted"
 count={liveCounts.accepted}
 color="green"
 isLoading={isRefreshing}
 />
 </div>
 </div>

 {/* Filter Bar */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-xs text-[var(--text-muted)]">Time Period:</span>
 <select
 value={timeFilter}
 onChange={(e) => setTimeFilter(e.target.value)}
 className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
 >
 <option value="7days">Last 7 Days</option>
 <option value="30days">Last 30 Days</option>
 <option value="3months">Last 3 Months</option>
 <option value="6months">Last 6 Months</option>
 </select>
 </div>
 <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
 <span>Last updated: Just now</span>
 <button
 onClick={() => window.location.reload()}
 className="p-1 rounded hover:bg-[var(--bg-hover)]"
 >
 <TrendingUp size={12} />
 </button>
 </div>
 </div>

 {/* Compact KPI Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <div className="glass-card p-3">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
 <FolderOpen size={16} className="text-[var(--primary)]" />
 </div>
 <div>
 <p className="text-lg font-bold text-[var(--text-primary)]">{dashboardStats?.totalDocuments ?? stats.total.documents}</p>
 <p className="text-[10px] text-[var(--text-muted)] uppercase">Total Documents</p>
 </div>
 </div>
 <div className="flex items-center gap-1 mt-2">
 <TrendingUp size={10} className="text-[var(--green)]" />
 <span className="text-[10px] text-[var(--green)]">{`${dashboardStats?.documentsMoMPercent ?? 0}%`}</span>
 <span className="text-[10px] text-[var(--text-muted)]">vs last month</span>
 </div>
 </div>

 <div className="glass-card p-3">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
 <FileCheck size={16} className="text-purple-500" />
 </div>
 <div>
 <p className="text-lg font-bold text-[var(--text-primary)]">{dashboardStats?.epq?.active ?? (stats.epq.sent + stats.epq.draft)}</p>
 <p className="text-[10px] text-[var(--text-muted)] uppercase">Active EPQ</p>
 </div>
 </div>
 <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 mt-2">
 <div
 className="h-full bg-purple-500 rounded-full"
 style={{ width: `${Math.round(dashboardStats?.epq?.conversionPercent ?? ((stats.epq.accepted / (stats.epq.sent + stats.epq.draft || 1)) * 100))}%` }}
 />
 </div>
 </div>

 <div className="glass-card p-3">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
 <Target size={16} className="text-amber-500" />
 </div>
 <div>
 <p className="text-lg font-bold text-[var(--text-primary)]">{`${Math.round(dashboardStats?.epq?.conversionPercent ?? ((documents.filter(d => ['accepted', 'signed', 'paid'].includes(d.status)).length / (documents.length || 1)) * 100))}%`}</p>
 <p className="text-[10px] text-[var(--text-muted)] uppercase">Conversion</p>
 </div>
 </div>
 <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 mt-2">
 <div
 className="h-full bg-amber-500 rounded-full"
 style={{ width: `${dashboardStats?.epq?.conversionPercent ?? ((documents.filter(d => ['accepted', 'signed', 'paid'].includes(d.status)).length / (documents.length || 1)) * 100)}%` }}
 />
 </div>
 </div>
 </div>

 {/* Charts Row 1 */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {/* Monthly Trend */}
 <div className="glass-card p-4 lg:col-span-2">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-bold text-[var(--text-primary)]">Monthly Document Flow</h3>
 <div className="flex items-center gap-3">
 <span className="flex items-center gap-1 text-[10px] text-[var(--primary)]">
 <div className="w-2 h-2 rounded-full bg-blue-500" /> Estimates
 </span>
 <span className="flex items-center gap-1 text-[10px] text-purple-500">
 <div className="w-2 h-2 rounded-full bg-purple-500" /> Proposals
 </span>
 <span className="flex items-center gap-1 text-[10px] text-[var(--green)]">
 <div className="w-2 h-2 rounded-full bg-[var(--green)]" /> Quotations
 </span>
 </div>
 </div>
 <ResponsiveContainer width="100%" height={200}>
 <AreaChart data={monthlyData}>
 <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
 <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
 <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
 <Tooltip
 contentStyle={{
 backgroundColor: 'var(--bg-elevated)',
 border: '1px solid var(--border-base)',
 borderRadius: '6px',
 fontSize: '11px'
 }}
 />
 <Area type="monotone" dataKey="estimates" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
 <Area type="monotone" dataKey="proposals" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
 <Area type="monotone" dataKey="quotations" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
 </AreaChart>
 </ResponsiveContainer>
 </div>

 {/* Document Types */}
 <div className="glass-card p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Document Types</h3>
 <div className="space-y-2">
 {typeDistribution.map((type) => {
 const percentage = documents.length > 0 ? Math.round((type.value / documents.length) * 100) : 0;
 return (
 <div key={type.name} className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full" style={{ background: type.color }} />
 <span className="text-xs text-[var(--text-muted)] flex-1">{type.name}</span>
 <span className="text-xs font-bold text-[var(--text-primary)]">{type.value}</span>
 <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">{percentage}%</span>
 </div>
 );
 })}
 </div>
 <div className="mt-3 pt-3 border-t border-[var(--border-base)]">
 <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
 <span>Total</span>
 <span className="font-bold text-[var(--text-primary)]">{documents.length}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Charts Row 2 */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {/* Monthly Value */}
 <div className="glass-card p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Monthly Value (�’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��¦�’�¡f�� �¢�’�’��f�¡¹ Lakhs)</h3>
 <ResponsiveContainer width="100%" height={180}>
 <BarChart data={monthlyData}>
 <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
 <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
 <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" tickFormatter={(value) => `�’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��¦�’�¡f�� �¢�’�’��f�¡¹${(value / 100000).toFixed(0)}`} />
 <Tooltip
 contentStyle={{
 backgroundColor: 'var(--bg-elevated)',
 border: '1px solid var(--border-base)',
 borderRadius: '6px',
 fontSize: '11px'
 }}
  formatter={(value) => CURRENCY.formatExact(value)}
 />
 <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Status Breakdown */}
 <div className="glass-card p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Status Distribution</h3>
 <div className="space-y-2">
 {statusData.map((status) => {
 const percentage = documents.length > 0 ? Math.round((status.count / documents.length) * 100) : 0;
 return (
 <div key={status.status}>
 <div className="flex items-center justify-between mb-1">
 <span className="text-xs text-[var(--text-primary)]">{status.status}</span>
 <span className="text-[10px] text-[var(--text-muted)]">{status.count} ({percentage}%)</span>
 </div>
 <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, background: status.color }} />
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Bottom Row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {/* Top Customers */}
 <div className="glass-card p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Top Customers</h3>
 <table className="w-full">
 <thead>
 <tr className="border-b border-[var(--border-base)]">
 <th className="text-left py-2 text-[10px] font-medium text-[var(--text-muted)]">Rank</th>
 <th className="text-left py-2 text-[10px] font-medium text-[var(--text-muted)]">Customer</th>
 <th className="text-right py-2 text-[10px] font-medium text-[var(--text-muted)]">Docs</th>
 <th className="text-right py-2 text-[10px] font-medium text-[var(--text-muted)]">Value</th>
 </tr>
 </thead>
 <tbody>
 {topCustomers.map((customer, index) => (
 <tr key={customer.name} className="border-b border-[var(--border-base)]/50">
 <td className="py-2">
 <span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold flex items-center justify-center">
 {index + 1}
 </span>
 </td>
 <td className="py-2">
 <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[150px]">{customer.name}</p>
 </td>
 <td className="py-2 text-right text-xs text-[var(--text-muted)]">{customer.count}</td>
 <td className="py-2 text-right text-xs font-bold text-[var(--green)]">{(customer.value / 100000).toFixed(1)}L</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Recent Activity */}
 <div className="glass-card p-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Recent Activity</h3>
 <div className="space-y-2 max-h-[220px] overflow-y-auto">
 {documents.slice(0, 6).map((doc, i) => (
 <div key={doc.id} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-elevated)]/50">
 <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: `${DOCUMENT_TYPES[doc.type]?.color}15` }}>
 {React.createElement(DOCUMENT_TYPES[doc.type]?.icon || FileText, { size: 14, style: { color: DOCUMENT_TYPES[doc.type]?.color } })}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs text-[var(--text-primary)] truncate">{doc.title}</p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-[10px] text-[var(--text-muted)]">{doc.customerName}</span>
 <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: DOCUMENT_STATUS[doc.status]?.bg, color: DOCUMENT_STATUS[doc.status]?.color }}>
 {DOCUMENT_STATUS[doc.status]?.label}
 </span>
 </div>
 </div>
 <div className="text-right">
 <p className="text-xs font-bold text-[var(--green)]">{(doc.total / 100000).toFixed(1)}L</p>
 <p className="text-[9px] text-[var(--text-muted)]">
 {i === 0 ? 'Just now' : i === 1 ? '2m' : i === 2 ? '5m' : i === 3 ? '15m' : i === 4 ? '1h' : '2h'}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 };

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Document List View �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const DocumentListView = () => {
 const [selectedDocForView, setSelectedDocForView] = useState(null);
 const [statusFilter, setStatusFilter] = useState('all');

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Table Columns �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 const tableColumns = [
 {
 key: 'id',
 header: 'Proposal #',
 render: v => <span className="text-xs font-medium text-red-500 hover:text-red-600 cursor-pointer">{v}</span>,
 },
 {
 key: 'customerName',
 header: 'Customer',
 render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span>,
 },
 {
 key: 'title',
 header: 'Project',
 render: v => <span className="text-xs text-[var(--text-muted)] line-clamp-1">{v}</span>,
 },
 {
 key: 'total',
 header: 'Total',
      render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{CURRENCY.formatExact(v)}</span>,
 },
 {
 key: 'status',
 header: 'Status',
 render: v => {
 const config = DOCUMENT_STATUS[v] || DOCUMENT_STATUS.draft;
 return (
 <span
 className="px-2.5 py-1 rounded-full text-[10px] font-medium"
 style={{ background: config.bg, color: config.color }}
 >
 {config.label}
 </span>
 );
 },
 },
 {
 key: 'actions',
 header: 'Actions',
 render: (v, doc) => (
 <div className="flex items-center gap-1">
 {/* View Button */}
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedDocForView(doc);
 }}
 disabled={isProcessing}
 className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
 title="View Document"
 >
 <Eye size={16} />
 </button>

 {/* Email Button */}
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleSendEmailAndComplete(doc);
 }}
 disabled={isProcessing || !doc.customerEmail}
 className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors disabled:opacity-40"
 title={doc.customerEmail ? `Send PDF to ${doc.customerEmail}` : 'No email available'}
 >
 <Mail size={16} />
 </button>

 {/* More Options Dropdown */}
 <div className="relative">
 <button
 onClick={(e) => {
 e.stopPropagation();
 setActionMenuOpen(actionMenuOpen === doc.id ? null : doc.id);
 }}
 disabled={isProcessing}
 className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
 >
 <MoreVertical size={16} />
 </button>

 {actionMenuOpen === doc.id && (
 <div className="action-menu-container absolute right-0 mt-1 w-48 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg shadow-lg z-50 py-1">
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleApproveDocument(doc);
 }}
 disabled={isProcessing || doc.status === 'approved'}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
 >
 <CheckCircle size={14} className="text-[var(--green)]" />
 <span>Approve & Create Project</span>
 </button>

 <button
 onClick={(e) => {
 e.stopPropagation();
 handleSendEmailAndComplete(doc);
 }}
 disabled={isProcessing || !doc.customerEmail}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
 >
 <Mail size={14} className="text-[var(--primary)]" />
 <span>Send Email & Complete</span>
 </button>

 <button
 onClick={(e) => {
 e.stopPropagation();
 handleMarkAsCompleted(doc);
 }}
 disabled={isProcessing}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
 >
 <FileCheck size={14} className="text-purple-500" />
 <span>Mark as Completed</span>
 </button>

 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteDocument(doc);
 setActionMenuOpen(null);
 }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-red-50 text-red-500 transition-colors"
 >
 <Trash2 size={14} />
 <span>Delete</span>
 </button>
 </div>
 )}
 </div>
 </div>
 ),
 },
 ];

 const filteredByStatus = useMemo(() => {
 if (statusFilter === 'all') return filteredDocuments;
 return filteredDocuments.filter(d => d.status === statusFilter);
 }, [filteredDocuments, statusFilter]);

 return (
 <div className="space-y-4 animate-fade-in">
 {/* Clean Toolbar - Matching Proposal Page */}
 <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-base)]">
 <div className="flex items-center gap-3">
 {/* Search */}
 <div className="relative">
 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
 <input
 type="text"
 placeholder="Search..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-[200px] pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-base)]"
 />
 </div>

 {/* Status Filter Dropdown */}
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-base)]"
 >
 <option value="all">All Status</option>
 <option value="draft">Draft</option>
 <option value="sent">Sent</option>
 <option value="accepted">Accepted</option>
 <option value="rejected">Rejected</option>
 </select>
 </div>

 <div className="flex items-center gap-2">
 {/* View Toggle */}
 <div className="flex items-center p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
 <button
 onClick={() => setViewMode('list')}
 className={cn(
 'p-1.5 rounded-md transition-colors',
 viewMode === 'list' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
 )}
 >
 <List size={16} />
 </button>
 <button
 onClick={() => setViewMode('grid')}
 className={cn(
 'p-1.5 rounded-md transition-colors',
 viewMode === 'grid' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
 )}
 >
 <LayoutGrid size={16} />
 </button>
 </div>

 {/* Convert from Estimate Button */}
 <button
 onClick={() => {
 if (window.openEstimateModal) {
 window.openEstimateModal();
 } else {
 setIsCreateModalOpen(true);
 }
 }}
 className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium transition-colors"
 >
 <span>Convert from Estimate</span>
 </button>

 {/* Create Proposal Button - Red */}
 <button
 onClick={() => setIsCreateModalOpen(true)}
 className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
 >
 <Plus size={16} />
 <span>Create Proposal</span>
 </button>
 </div>
 </div>

 {/* Documents Display */}
 {filteredByStatus.length === 0 ? (
 <div className="bg-[var(--bg-surface)] p-12 text-center rounded-lg border border-[var(--border-base)]">
 <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
 <FileText size={32} className="text-[var(--text-muted)]" />
 </div>
 <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No proposals found</h3>
 <p className="text-sm text-[var(--text-muted)] mb-4">Create your first proposal to get started</p>
 <button
 onClick={() => setIsCreateModalOpen(true)}
 className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors mx-auto"
 >
 <Plus size={16} />
 Create Proposal
 </button>
 </div>
 ) : viewMode === 'grid' ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {filteredByStatus.map(doc => (
 <DocumentCard
 key={doc.id}
 document={doc}
 onClick={setSelectedDocForView}
 onSend={handleSendDocument}
 onDuplicate={handleDuplicateDocument}
 onDelete={handleDeleteDocument}
 />
 ))}
 </div>
 ) : (
 <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-base)] overflow-hidden">
 <DataTable
 columns={tableColumns}
 data={filteredByStatus}
 onRowClick={(doc) => setSelectedDocForView(doc)}
 />
 </div>
 )}

 {/* View Modal */}
 <Modal
 isOpen={!!selectedDocForView}
 onClose={() => setSelectedDocForView(null)}
 title={selectedDocForView?.title || 'Document Details'}
 size="lg"
 >
 {selectedDocForView && (
 <DocumentDetail
 document={selectedDocForView}
 onClose={() => setSelectedDocForView(null)}
 onSend={() => handleSendDocument(selectedDocForView)}
 onDuplicate={() => handleDuplicateDocument(selectedDocForView)}
 onDelete={() => handleDeleteDocument(selectedDocForView)}
 />
 )}
 </Modal>
 </div>
 );
 };

 // �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Render �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
 return (
 <div className="space-y-6">
 {/* Page Header with Tabs - Side by Side Layout */}
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
 <PageHeader
 title="Documents"
 subtitle="Manage estimates, proposals & quotations"
 />

 {/* Navigation Bar - Side by Side */}
 <div className="flex flex-wrap items-center gap-3">
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList className="flex-wrap">
 <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
 <LayoutGrid size={14} />
 Dashboard
 </TabsTrigger>
 <TabsTrigger value="estimate" className="flex items-center gap-1.5">
 <FileText size={14} />
 Estimates
 </TabsTrigger>
 <TabsTrigger value="proposal" className="flex items-center gap-1.5">
 <FileCheck size={14} />
 Proposals
 </TabsTrigger>
 <TabsTrigger value="quotation" className="flex items-center gap-1.5">
 <Sun size={14} />
 Solar Quote
 </TabsTrigger>
 <TabsTrigger value="all" className="flex items-center gap-1.5">
 <FolderOpen size={14} />
 All
 </TabsTrigger>
 </TabsList>
 </Tabs>

 {/* Add Button - Context Aware */}
 {activeTab === 'estimate' ? (
 <button
 onClick={() => {
 console.log('Button clicked - calling global function');
 // @ts-ignore
 if (window.openEstimateModal) {
 // @ts-ignore
 window.openEstimateModal();
 } else {
 alert('Estimate modal function not ready yet');
 }
 }}
 className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors"
 >
 <Plus size={16} />
 Create Estimate
 </button>
 ) : activeTab === 'quotation' ? (
 <button
 onClick={() => {
 // Force re-render of SolarQuotationPage to reset form
 setSolarQuoteKey(Date.now());
 }}
 className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
 >
 <Plus size={16} />
 Create Solar Quote
 </button>
 ) : (
 <button
 onClick={() => setIsCreateModalOpen(true)}
 className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors"
 >
 <Plus size={16} />
 Add Document
 </button>
 )}
 </div>
 </div>

 {/* Content */}
 {activeTab === 'dashboard' && <DashboardView />}
 {activeTab === 'estimate' && <EstimatePage />}
 {activeTab === 'proposal' && <ProposalPage />}
 {activeTab === 'quotation' && <QuotationBuilderPage key={solarQuoteKey} />}
 {activeTab === 'all' && <DocumentListView />}

 {/* Create Document Modal */}
 <Modal
 isOpen={isCreateModalOpen}
 onClose={() => setIsCreateModalOpen(false)}
 title="Create New Document"
 size="lg"
 >
 <CreateDocumentForm
 onSubmit={handleCreateDocument}
 onCancel={() => setIsCreateModalOpen(false)}
 />
 </Modal>

 {/* Document Detail Modal */}
 <Modal
 isOpen={!!selectedDocument}
 onClose={() => setSelectedDocument(null)}
 title={selectedDocument?.title || 'Document Details'}
 size="lg"
 >
 {selectedDocument && (
 <DocumentDetail
 document={selectedDocument}
 onClose={() => setSelectedDocument(null)}
 onSend={() => handleSendDocument(selectedDocument)}
 onDuplicate={() => handleDuplicateDocument(selectedDocument)}
 onDelete={() => handleDeleteDocument(selectedDocument)}
 />
 )}
 </Modal>
 </div>
 );
};

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Create Document Form �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
const CreateDocumentForm = ({ onSubmit, onCancel }) => {
 const [formData, setFormData] = useState({
 type: 'estimate',
 title: '',
 customerName: '',
 customerEmail: '',
 customerPhone: '',
 items: [{ name: '', description: '', quantity: 1, unitPrice: 0, total: 0 }],
 notes: '',
 terms: '',
 });

 const addItem = () => {
 setFormData(prev => ({
 ...prev,
 items: [...prev.items, { name: '', description: '', quantity: 1, unitPrice: 0, total: 0 }],
 }));
 };

 const updateItem = (index, field, value) => {
 setFormData(prev => {
 const items = [...prev.items];
 items[index] = { ...items[index], [field]: value };
 if (field === 'quantity' || field === 'unitPrice') {
 items[index].total = items[index].quantity * items[index].unitPrice;
 }
 return { ...prev, items };
 });
 };

 const removeItem = (index) => {
 setFormData(prev => ({
 ...prev,
 items: prev.items.filter((_, i) => i !== index),
 }));
 };

 const total = formData.items.reduce((a, item) => a + item.total, 0);

 const handleSubmit = (e) => {
 e.preventDefault();
 onSubmit({ ...formData, total });
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <FormField label="Document Type" required>
 <Select
 value={formData.type}
 onChange={(v) => setFormData({ ...formData, type: v })}
 options={[
 { value: 'estimate', label: 'Estimate' },
 { value: 'proposal', label: 'Proposal' },
 { value: 'quotation', label: 'Quotation' },
 ]}
 />
 </FormField>

 <FormField label="Title" required>
 <Input
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 placeholder="e.g., Solar Installation Quote"
 />
 </FormField>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <FormField label="Customer Name" required>
 <Input
 value={formData.customerName}
 onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
 placeholder="Customer name"
 />
 </FormField>

 <FormField label="Email">
 <Input
 type="email"
 value={formData.customerEmail}
 onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
 placeholder="customer@email.com"
 />
 </FormField>

 <FormField label="Phone">
 <Input
 value={formData.customerPhone}
 onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
 placeholder="+91 9876543210"
 />
 </FormField>
 </div>

 {/* Items Section */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="text-sm font-medium text-[var(--text-primary)]">Line Items</h4>
 <Button type="button" variant="secondary" size="sm" onClick={addItem}>
 <Plus size={14} className="mr-1" />
 Add Item
 </Button>
 </div>

 {formData.items.map((item, index) => (
 <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-[var(--bg-elevated)]">
 <div className="col-span-4">
 <Input
 value={item.name}
 onChange={(e) => updateItem(index, 'name', e.target.value)}
 placeholder="Item name"
 className="text-sm"
 />
 </div>
 <div className="col-span-2">
 <Input
 type="number"
 value={item.quantity}
 onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
 placeholder="Qty"
 className="text-sm"
 />
 </div>
 <div className="col-span-3">
 <Input
 type="number"
 value={item.unitPrice}
 onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
 placeholder="Unit Price"
 className="text-sm"
 />
 </div>
 <div className="col-span-2">
 <Input
  value={CURRENCY.formatExact(item.total)}
 disabled
 className="text-sm font-medium"
 />
 </div>
 <div className="col-span-1">
 <button
 type="button"
 onClick={() => removeItem(index)}
 className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
 >
 <Trash2 size={16} />
 </button>
 </div>
 </div>
 ))}

 <div className="flex justify-end">
 <div className="text-right">
 <p className="text-sm text-[var(--text-muted)]">Total Amount</p>
  <p className="text-xl font-bold text-[var(--text-primary)]">{CURRENCY.formatExact(total)}</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <FormField label="Notes">
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 placeholder="Additional notes..."
 rows={3}
 />
 </FormField>

 <FormField label="Terms & Conditions">
 <Textarea
 value={formData.terms}
 onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
 placeholder="Terms and conditions..."
 rows={3}
 />
 </FormField>
 </div>

 <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-base)]">
 <Button type="button" variant="secondary" onClick={onCancel}>
 Cancel
 </Button>
 <Button type="submit">
 Create Document
 </Button>
 </div>
 </form>
 );
};

// �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡Document Detail View �’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡f�� �¢�’�¡f��f�’�’��f�¡
const DocumentDetail = ({ document, onClose, onSend, onDuplicate, onDelete }) => {
 const TypeIcon = DOCUMENT_TYPES[document.type]?.icon || FileText;
 const typeColor = DOCUMENT_TYPES[document.type]?.color || '#64748b';
 const statusConfig = DOCUMENT_STATUS[document.status] || DOCUMENT_STATUS.draft;

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${typeColor}20` }}>
 <TypeIcon size={28} style={{ color: typeColor }} />
 </div>
 <div>
 <p className="text-xs font-mono text-[var(--accent-light)]">{document.id}</p>
 <h3 className="text-lg font-bold text-[var(--text-primary)]">{document.title}</h3>
 <div className="flex items-center gap-2 mt-1">
 <span
 className="px-2 py-0.5 rounded-full text-[10px] font-medium"
 style={{ background: statusConfig.bg, color: statusConfig.color }}
 >
 {statusConfig.label}
 </span>
 <span className="text-xs text-[var(--text-muted)] capitalize">{document.type}</span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {document.type === 'quotation' && (
 <button
 onClick={() => downloadQuotationPDF(document)}
 className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--green)] text-white text-sm font-medium hover:bg-[var(--green)] transition-colors"
 >
 <FileSpreadsheet size={14} />
 Download PDF
 </button>
 )}
 <button
 onClick={onSend}
 className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
 >
 <Send size={14} />
 Send
 </button>
 <button
 onClick={onDuplicate}
 className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] text-sm font-medium hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
 >
 <Copy size={14} />
 Duplicate
 </button>
 <button
 onClick={onDelete}
 className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-400/10 text-red-400 text-sm font-medium hover:bg-red-400/20 transition-colors"
 >
 <Trash2 size={14} />
 Delete
 </button>
 </div>
 </div>

 {/* Customer Info */}
 <div className="glass-card p-4 space-y-3">
 <h4 className="text-sm font-bold text-[var(--text-primary)]">Customer Information</h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="flex items-center gap-2">
 <User size={16} className="text-[var(--text-muted)]" />
 <span className="text-sm text-[var(--text-primary)]">{document.customerName}</span>
 </div>
 <div className="flex items-center gap-2">
 <Mail size={16} className="text-[var(--text-muted)]" />
 <span className="text-sm text-[var(--text-primary)]">{document.customerEmail || '�’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡'}</span>
 </div>
 <div className="flex items-center gap-2">
 <Phone size={16} className="text-[var(--text-muted)]" />
 <span className="text-sm text-[var(--text-primary)]">{document.customerPhone || '�’�� �¢�’�¢�’��f�¡f�� �¢�’�¡f��f�’�’��f�¡f�� �¢�’�¡f��f�’�¡f��f�¡'}</span>
 </div>
 </div>
 </div>

 {/* Line Items */}
 <div className="glass-card p-4 space-y-3">
 <h4 className="text-sm font-bold text-[var(--text-primary)]">Line Items</h4>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-[var(--border-base)]">
 <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Item</th>
 <th className="text-center py-2 text-xs font-medium text-[var(--text-muted)]">Qty</th>
 <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Unit Price</th>
 <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Total</th>
 </tr>
 </thead>
 <tbody>
 {document.items?.map((item, index) => (
 <tr key={index} className="border-b border-[var(--border-base)]/50">
 <td className="py-2">
 <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
 {item.description && <p className="text-xs text-[var(--text-muted)]">{item.description}</p>}
 </td>
 <td className="text-center py-2 text-sm text-[var(--text-primary)]">{item.quantity}</td>
  <td className="text-right py-2 text-sm text-[var(--text-primary)]">{CURRENCY.formatExact(item.unitPrice)}</td>
  <td className="text-right py-2 text-sm font-medium text-[var(--text-primary)]">{CURRENCY.formatExact(item.total)}</td>
  </tr>
  ))}
  </tbody>
  <tfoot>
  <tr className="border-t-2 border-[var(--border-base)]">
  <td colSpan={3} className="text-right py-3 text-sm font-bold text-[var(--text-primary)]">Total</td>
  <td className="text-right py-3 text-lg font-bold text-[var(--primary)]">{CURRENCY.formatExact(document.total)}</td>
  </tr>
  </tfoot>
 </table>
 </div>
 </div>

 {/* Timeline */}
 <div className="glass-card p-4 space-y-3">
 <h4 className="text-sm font-bold text-[var(--text-primary)]">Document Timeline</h4>
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
 <span className="text-sm text-[var(--text-primary)]">Created on {new Date(document.createdAt).toLocaleDateString()}</span>
 </div>
 {document.sentAt && (
 <div className="flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-blue-500" />
 <span className="text-sm text-[var(--text-primary)]">Sent on {new Date(document.sentAt).toLocaleDateString()}</span>
 </div>
 )}
 {document.acceptedAt && (
 <div className="flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
 <span className="text-sm text-[var(--text-primary)]">Accepted on {new Date(document.acceptedAt).toLocaleDateString()}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default DocumentPage;
