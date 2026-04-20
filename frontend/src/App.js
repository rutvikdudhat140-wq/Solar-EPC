import React, { useState, useEffect, useCallback } from 'react';

import './App.css';

import { AuthProvider, useAuth } from './context/AuthContext';

import { ThemeProvider } from './context/ThemeContext';

import { SettingsProvider, useSettings } from './context/SettingsContext';

import { ReminderProvider } from './context/ReminderContext';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import SolarOSDashboard from './pages/SolarOSDashboard';

import CRMPage from './pages/CRMPage';

import SurveyPage from './pages/SurveyPage';

import SiteSurveyPage from './pages/SiteSurveyPage';

import DesignPage from './pages/DesignPage';

import ProjectPage from './pages/ProjectPage';

import InventoryPage from './pages/InventoryPage';

import ProcurementPage from './pages/ProcurementPage';

import LogisticsPage from './pages/LogisticsPage';

import DocumentPage from './pages/DocumentPage';

import CommissioningPage from './pages/CommissioningPage';

import InstallationPage from './pages/InstallationPage';

import FinancePage from './pages/FinancePage';

import FinanceDashboardPage from './pages/FinanceDashboardPage';

import ServicePage from './pages/ServicePage';

import ServiceDashboardPage from './pages/ServiceDashboardPage';

import CompliancePage from './pages/CompliancePage';

import SettingsPage from './pages/SettingsPage';

import HRMPage from './pages/HRMPage';

import QuotationBuilderPage from './pages/QuotationBuilderPage';

import EmployeesPage from './pages/EmployeesPage';

import AttendancePageHRM from './pages/AttendancePageHRM';

import LeavesPage from './pages/LeavesPage';

import PayrollPage from './pages/PayrollPage';

import IncrementsPage from './pages/IncrementsPage';

import DepartmentsPage from './pages/DepartmentsPage';

import AttendancePage from './pages/AttendancePage';

import AttendancePageV3 from './pages/AttendancePageV3';

import IntelligenceDashboardPage from './pages/IntelligenceDashboardPage';

import RemindersPage from './pages/RemindersPage';
import HrmPermissionsPage from './pages/HRMPermissionsPage';
import ProfilePage from './pages/ProfilePage';
import TasksPage from './pages/TasksPage';
import NotificationSystem from './components/NotificationSystem';
import UserManagementPage from './pages/UserManagementPage';
import TeamManagementPage from './pages/TeamManagementPage';



// ── Page Map ──────────────────────────────────────────────────────────────────

const PAGE_MAP = {

  dashboard: { component: SolarOSDashboard, title: 'Solar OS Dashboard' },

  hrm: { component: HRMPage, title: 'Human Resource Management' },

  'hrm-employees': { component: EmployeesPage, title: 'Employees' },

  'hrm-attendance': { component: AttendancePageV3, title: 'Attendance V3.0' },

  'hrm-leaves': { component: LeavesPage, title: 'Leaves' },

  'hrm-payroll': { component: PayrollPage, title: 'Payroll' },

  'hrm-increments': { component: IncrementsPage, title: 'Increments' },

  'hrm-departments': { component: DepartmentsPage, title: 'Departments' },

  'hrm-role-permissions': { component: HRMPage, title: 'Role Permissions', props: { activeTab: 'hrm-role-permissions' } },

  'hrm-attendance-policy': { component: HRMPage, title: 'Attendance Policy', props: { activeTab: 'hrm-attendance-policy' } },

  quotation: { component: QuotationBuilderPage, title: 'Quotation Builder' },

  attendance: { component: AttendancePageV3, title: 'Attendance Management V3.0' },

  reminders: { component: RemindersPage, title: 'Reminder Center' },

  crm: { component: CRMPage, title: 'CRM & Sales' },

  survey: { component: SiteSurveyPage, title: 'Site Survey Management' },

  design: { component: DesignPage, title: 'Design & BOQ' },

  project: { component: ProjectPage, title: 'Projects' },

  inventory: { component: InventoryPage, title: 'Inventory' },

  procurement: { component: ProcurementPage, title: 'Procurement' },

  logistics: { component: LogisticsPage, title: 'Logistics' },

  installation: { component: InstallationPage, title: 'Installation' },

  commissioning: { component: CommissioningPage, title: 'Commissioning' },

  finance: { component: FinancePage, title: 'Finance' },

  'finance-dashboard': { component: FinanceDashboardPage, title: 'Finance Dashboard' },

  service: { component: ServicePage, title: 'Service & AMC' },

  'service-dashboard': { component: ServiceDashboardPage, title: 'Service & AMC Dashboard' },

  compliance: { component: CompliancePage, title: 'Compliance' },
  settings: { component: SettingsPage, title: 'Settings' },
  'hrm-permissions': { component: HrmPermissionsPage, title: 'HRM Permissions' },
  intelligence: { component: IntelligenceDashboardPage, title: 'AI Intelligence' },
  documents: { component: DocumentPage, title: 'Documents' },
  profile: { component: ProfilePage, title: 'My Profile' },
  tasks: { component: TasksPage, title: 'Tasks' },
  'user-management': { component: UserManagementPage, title: 'User Management' },
  'team-management': { component: TeamManagementPage, title: 'Team Management' },
};



const APP_NAME = 'Solar OS';



const queryClient = new QueryClient({

  defaultOptions: {

    queries: {

      staleTime: 30_000,

      refetchOnWindowFocus: false,

      retry: 1,

    },

  },

});



// ── 404 / Unauthorized Fallback ───────────────────────────────────────────────

const NotFoundPage = ({ onNavigate, type = '404' }) => (

  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-fade-in">

    <div className="w-20 h-20 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center text-4xl">

      {type === 'unauthorized' ? '🔒' : '🛸'}

    </div>

    <div className="text-center">

      <h2 className="text-2xl font-black text-[var(--text-primary)]">

        {type === 'unauthorized' ? 'Access Denied' : 'Page Not Found'}

      </h2>

      <p className="text-sm text-[var(--text-muted)] mt-1">

        {type === 'unauthorized'

          ? "You don't have permission to view this page."

          : "This route doesn't exist in Solar OS."}

      </p>

    </div>

    <button

      onClick={() => onNavigate('dashboard')}

      className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 transition-opacity"

    >

      ← Go to Dashboard

    </button>

  </div>

);



// ── Read initial page from URL pathname ──────────────────────────────────────────

const getInitialPage = () => {

  const path = window.location.pathname.replace('/', '').trim();

  return (path && PAGE_MAP[path]) ? path : 'dashboard';

};



// ── Main App Inner ────────────────────────────────────────────────────────────

const AppInner = () => {

  const { user } = useAuth();

  const { resolvePermission, isModuleEnabled } = useSettings();

  const [currentPage, setCurrentPage] = useState(() => getInitialPage());



  // ── Sync URL pathname on page change ──

  const navigate = useCallback((page) => {

    if (!PAGE_MAP[page]) return; // guard unknown routes

    setCurrentPage(page);

    window.history.pushState({}, '', `/${page}`);

  }, []);



  // ── Listen for browser back/forward ──

  useEffect(() => {

    const handlePopState = () => {

      const path = window.location.pathname.replace('/', '').trim();

      if (PAGE_MAP[path]) setCurrentPage(path);

    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);

  }, []);



  // ── Update document title on navigation ──

  useEffect(() => {

    const entry = PAGE_MAP[currentPage];

    document.title = entry ? `${entry.title} — ${APP_NAME}` : APP_NAME;

  }, [currentPage]);



  // ── Auth guard: redirect to login if no user ──

  // Check for forgot password / reset password pages first (no auth needed)
  const path = window.location.pathname.replace('/', '').trim();
  if (path === 'forgot-password') {
    return <ForgotPasswordPage />;
  }
  if (path === 'reset-password') {
    return <ResetPasswordPage />;
  }

  if (!user) return <LoginPage />;



  // ── Module access guard ──

  // Admin / superadmin: full access to all enabled modules

  // Custom role / employee: only modules where view = true in Role Builder

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || user?.isSuperAdmin;

  const hasAccess = (page) => {
    if (!isModuleEnabled(page)) return false;
    // Admin bypass - admins can access all enabled modules
    if (isAdmin) return true;
    return resolvePermission(page, 'view') === true;
  };



  const entry = PAGE_MAP[currentPage];

  if (!entry) {

    return (

      <Layout currentPage={currentPage} onNavigate={navigate}>

        <NotFoundPage onNavigate={navigate} type="404" />

      </Layout>

    );

  }



  if (!hasAccess(currentPage)) {

    return (

      <Layout currentPage="dashboard" onNavigate={navigate}>

        <NotFoundPage onNavigate={navigate} type="unauthorized" />

      </Layout>

    );

  }



  const PageComponent = entry.component;



  if (!PageComponent) {

    console.error(`[AppInner] PAGE_MAP component is undefined for key: ${currentPage}`, entry);

    return (

      <Layout currentPage="dashboard" onNavigate={navigate}>

        <NotFoundPage onNavigate={navigate} type="404" />

      </Layout>

    );

  }



  const NotificationComponent = NotificationSystem;



  return (

    <Layout currentPage={currentPage} onNavigate={navigate}>

      <PageComponent onNavigate={navigate} {...(entry.props || {})} />

      {NotificationComponent ? <NotificationComponent /> : null}

    </Layout>

  );

};



// ── Root ──────────────────────────────────────────────────────────────────────

function App() {

  return (

    <QueryClientProvider client={queryClient}>

      <ThemeProvider>

        <AuthProvider>

          <SettingsProvider>

            <ReminderProvider>

              <AppInner />

            </ReminderProvider>

          </SettingsProvider>

        </AuthProvider>

      </ThemeProvider>

    </QueryClientProvider>

  );

}



export default App;

