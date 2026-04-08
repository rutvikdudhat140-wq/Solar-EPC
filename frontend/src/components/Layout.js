import React, { useState, useCallback, useEffect } from 'react';
import { Sun, Bell, Search, ChevronDown, LogOut, Menu, X, Zap, Settings, User, Palette, AlertTriangle, Package, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useReminders } from '../context/ReminderContext';
import { useSettings } from '../context/SettingsContext';
import { NAV_CONFIG } from '../config/nav.config';
import { APP_CONFIG } from '../config/app.config';
import { ALERTS, ACTIVITY_FEED } from '../data/mockData';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import ThemeCustomizer from './ThemeCustomizer';
import ReminderSidebar from './Reminder/ReminderSidebar';
import { api } from '../lib/apiClient';
import DataScopeBanner from './DataScopeBanner';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';
const TENANT_ID = 'solarcorp';

const Layout = ({ currentPage, onNavigate, children }) => {
  const { user, logout, can } = useAuth();
  const { theme, setTheme, themes, currentLabel, customization } = useTheme();
  const { activeNotifications, upcomingCount, overdueCount } = useReminders();
  const { isModuleEnabled, resolvePermission, getDataScope } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ hrm: false });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [reminderSidebarOpen, setReminderSidebarOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [notifTab, setNotifTab] = useState('alerts');
  const [badgeCounts, setBadgeCounts] = useState({
    inventory: 0,
    project: 0,
    crm: 0,
    quotation: 0,
    service: 0,
  });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch dynamic badge counts
  useEffect(() => {
    // Don't fetch if no user/token
    const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token || !user) return;

    const resolveTenantId = () => localStorage.getItem('tenantId') || TENANT_ID;

    const fetchBadgeCounts = async () => {
      try {
        const tenantId = resolveTenantId();

        // Fetch inventory stats (via central api client to reuse auth + tenant headers)
        const inventoryData = await api.get('/inventory/stats', { tenantId }).catch(() => null);

        // Fetch project stats (avoid /projects list which may be permission-gated)
        const projectsStats = await api.get('/projects/stats', { tenantId }).catch(() => null);

        // Fetch survey stats (only if user has survey view permission)
        const canViewSurvey = resolvePermission('survey', 'view');
        let surveyStats = null;
        if (canViewSurvey) {
          surveyStats = await api.get('/surveys/stats', { tenantId }).catch(() => null);
        }

        // Calculate counts
        const lowStockCount =
          inventoryData?.data?.lowStockItems ??
          inventoryData?.lowStockItems ??
          inventoryData?.data?.lowStock ??
          inventoryData?.lowStock ??
          0;
        const activeProjects =
          projectsStats?.data?.activeProjects ??
          projectsStats?.activeProjects ??
          projectsStats?.data?.active ??
          projectsStats?.active ??
          0;

        setBadgeCounts({
          inventory: lowStockCount,
          project: activeProjects,
          crm: 0,
          quotation: 0,
          service: 0,
        });
      } catch (err) {
        console.error('Error fetching badge counts:', err);
        // Set default values on error
        setBadgeCounts({
          inventory: 0,
          project: 0,
          crm: 0,
          quotation: 0,
          service: 0,
        });
      }
    };

    fetchBadgeCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const close = useCallback(() => setSidebarOpen(false), []);

  const unreadCount = ALERTS.filter(a => a.severity === 'critical' || a.severity === 'warning').length;
  const totalReminderAlerts = activeNotifications.length + upcomingCount + overdueCount;

  const userRole = (user?.role || '').toLowerCase();

  const canViewSettings = resolvePermission('settings', 'view') === true;

  // Sidebar visibility - strict Redis permissions (via /auth/me)
  const visibleSections = NAV_CONFIG.map(section => {
    const items = (section.items || []).map((item) => {
      if (!isModuleEnabled(item.id)) return null;

      // HRM parent: must have hrm.view, then children filtered by their own view
      if (Array.isArray(item.children) && item.children.length > 0) {
        if (resolvePermission('hrm', 'view') !== true) return null;

        const visibleChildren = item.children.filter((child) => {
          if (!isModuleEnabled(child.id)) return false;
          // Admin bypass for adminOnly items
          if (child.adminOnly && userRole === 'admin') return true;
          return resolvePermission(child.id, 'view') === true;
        });

        if (!visibleChildren.length) return null;
        return { ...item, children: visibleChildren };
      }

      if (resolvePermission(item.id, 'view') !== true) return null;
      return item;
    }).filter(Boolean);

    return { ...section, items };
  }).filter(s => (s.items || []).length > 0);

  /* â”€â”€ Derive layout dimensions from customization â”€â”€ */
  const c = customization || {};
  const isHorizontal = c.layout === 'horizontal';
  const isMini = c.layout === 'mini' || c.sidebarSize === 'compact';
  const isOverlay = c.layout === 'overlay';
  const isHoverView = c.sidebarSize === 'hover';
  const isDetached = c.layout === 'detached';
  const isTwoColumn = c.layout === 'twocolumn';

  // Sidebar width
  const getSidebarWidth = () => {
    if (isHorizontal) return 0;
    if (isHoverView) return sidebarHovered ? 220 : 64;
    if (isMini || isTwoColumn) return 64;
    return 220;
  };
  const sidebarW = getSidebarWidth();
  // Always show labels unless explicitly in mini/compact mode
  const showLabels = true;

  // Boxed layout
  const isBoxed = c.layoutWidth === 'boxed';

  // Sidebar custom styling
  const sidebarStyle = {};
  if (c.sidebarColor && c.sidebarColor !== 'default') {
    const customBg = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-bg-custom').trim();
    if (customBg) sidebarStyle.backgroundColor = customBg;
  }
  if (c.sidebarBg) {
    const bgImg = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-bg-image').trim();
    if (bgImg) sidebarStyle.background = bgImg;
  }
  sidebarStyle.backdropFilter = 'blur(20px)';

  // Topbar custom styling
  const topbarStyle = { backdropFilter: 'blur(20px)' };
  if (c.topbarColor && c.topbarColor !== 'white') {
    const customBg = getComputedStyle(document.documentElement).getPropertyValue('--topbar-bg-custom').trim();
    if (customBg) {
      if (customBg.startsWith('linear')) {
        topbarStyle.background = customBg;
      } else {
        topbarStyle.backgroundColor = customBg;
      }
    }
  }

  // Card layout class
  const cardClass = c.cardLayout === 'borderless' ? 'card-borderless' : c.cardLayout === 'shadow' ? 'card-shadow' : '';

  // Topbar has custom color â†’ use white text
  const topbarHasCustomColor = c.topbarColor && c.topbarColor !== 'white';
  const topbarTextCls = topbarHasCustomColor ? 'text-white/80' : 'text-[var(--text-faint)]';
  const topbarTextPrimaryCls = topbarHasCustomColor ? 'text-white' : 'text-[var(--text-primary)]';

  // Sidebar has custom color â†’ use custom text
  const sidebarHasCustomColor = (c.sidebarColor && c.sidebarColor !== 'default') || c.sidebarBg;

  return (
    <div className={cn('min-h-screen bg-[var(--bg-page)]', isBoxed && 'max-w-[1440px] mx-auto shadow-2xl', cardClass)}>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TOP BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-[60] h-14 flex items-center gap-3 px-4 border-b transition-all duration-300 w-full',
          !topbarHasCustomColor && 'topbar-bg border-[var(--border-base)]',
          topbarHasCustomColor && 'border-white/10',
        )}
        style={topbarStyle}
      >

        {/* Mobile sidebar toggle */}
        <button
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors',
            topbarTextCls,
            // Show on desktop too for overlay mode; hide on desktop for other layouts
            !isOverlay && 'lg:hidden'
          )}
          onClick={() => { if (isOverlay) { setSidebarHovered(h => !h); } else { setSidebarOpen(p => !p); } }}
        >
          {(sidebarOpen || (isOverlay && sidebarHovered)) ? <X size={15} /> : <Menu size={15} />}
        </button>

        {/* Logo - Hidden, only sidebar logo remains */}
        <div className="flex items-center gap-2.5 min-w-[200px] opacity-0 pointer-events-none">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shrink-0"
            style={{
              background: `linear-gradient(to bottom right, var(--primary), var(--primary-light))`,
              boxShadow: `0 10px 15px -3px var(--primary-glow), 0 4px 6px -2px var(--primary-glow)`
            }}>
            <Sun size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <p className={cn('font-extrabold text-sm tracking-tight', topbarHasCustomColor ? topbarTextPrimaryCls : 'gradient-text')}>{APP_CONFIG.name}</p>
            <p className={cn('text-[9px] uppercase tracking-widest mt-0.5', topbarHasCustomColor ? 'text-white/50' : 'text-[var(--text-faint)]')}>{APP_CONFIG.edition}</p>
          </div>
        </div>

        {/* Breadcrumb */}
        {(() => {
          let section = null;
          let label = null;
          for (const s of visibleSections) {
            const found = s.items.find(i => i.id === currentPage);
            if (found) { section = s.section; label = found.label; break; }
          }
          if (!section || !label) return null;
          return (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium">
              <span className={topbarHasCustomColor ? 'text-white/40' : 'text-[var(--text-faint)]'}>{section}</span>
              <ChevronRight size={10} className={topbarHasCustomColor ? 'text-white/30' : 'text-[var(--text-faint)]'} />
              <span className={topbarHasCustomColor ? 'text-white/90 font-bold' : 'text-[var(--text-primary)] font-bold'}>{label}</span>
            </div>
          );
        })()}

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-sm relative">
          <Search size={12} className={cn('absolute left-3 top-1/2 -translate-y-1/2', topbarHasCustomColor ? 'text-white/40' : 'text-[var(--text-faint)]')} />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search projects, leads, invoicesâ€¦"
            className={cn(
              'w-full h-8 pl-8 pr-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all',
              topbarHasCustomColor
                ? 'bg-[var(--bg-surface)]/10 border border-white/15 text-white placeholder:text-white/40'
                : 'bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-secondary)] placeholder:text-[var(--text-faint)] focus:border-[var(--border-active)]'
            )}
          />
        </div>

        <div className="flex-1" />

        {/* AI pulse */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
          topbarHasCustomColor
            ? 'bg-[var(--bg-surface)]/10 border border-white/15'
            : 'bg-[var(--primary)]/10 border border-[var(--primary)]/20'
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse-dot" />
          <span className={cn('text-[10px] font-medium', topbarHasCustomColor ? 'text-white/90' : 'text-[var(--primary-light)]')}>AI Active</span>
        </div>

        {/* Reminders Button */}
        <button
          onClick={() => { setReminderSidebarOpen(true); setNotifOpen(false); setUserMenuOpen(false); }}
          className={cn(
            'relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors',
            topbarHasCustomColor
              ? 'text-white/70 hover:text-white border-white/15 hover:border-white/30 bg-[var(--bg-surface)]/10'
              : 'text-[var(--text-faint)] hover:text-[var(--text-primary)] border-[var(--border-base)] hover:border-[var(--border-muted)] bg-[var(--bg-elevated)]'
          )}
          title="Reminders"
        >
          <Bell size={14} />
          {(upcomingCount + overdueCount + activeNotifications.length) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-[var(--bg-page)] flex items-center justify-center text-[8px] font-bold text-white leading-none animate-pulse">
              {Math.min(upcomingCount + overdueCount + activeNotifications.length, 99)}
            </span>
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(p => !p); setUserMenuOpen(false); setThemeMenuOpen(false); }}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border transition-colors',
              topbarHasCustomColor
                ? 'text-white/70 hover:text-white border-white/15 hover:border-white/30 bg-[var(--bg-surface)]/10'
                : 'text-[var(--text-faint)] hover:text-[var(--text-primary)] border-[var(--border-base)] hover:border-[var(--border-muted)] bg-[var(--bg-elevated)]'
            )}>
            <Bell size={14} />
          </button>
          {(unreadCount > 0 || totalReminderAlerts > 0) && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-[var(--bg-page)] flex items-center justify-center text-[8px] font-bold text-white leading-none">
              {Math.min(unreadCount + totalReminderAlerts, 99)}
            </span>
          )}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-10 z-[70] w-80 glass-card shadow-2xl shadow-black/60 animate-slide-up overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[var(--border-base)] flex items-center justify-between">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Notifications</p>
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-[9px] font-bold text-red-400">{unreadCount} new</span>
                </div>
                {/* Tabs */}
                <div className="flex border-b border-[var(--border-base)]">
                  {['alerts', 'activity'].map(t => (
                    <button key={t} onClick={() => setNotifTab(t)}
                      className={cn('flex-1 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors',
                        notifTab === t ? 'text-[var(--primary-light)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
                      )}>
                      {t === 'alerts' ? `Alerts (${ALERTS.length})` : 'Activity'}
                    </button>
                  ))}
                </div>
                {/* Content */}
                <div className="max-h-80 overflow-y-auto">
                  {notifTab === 'alerts' ? (
                    ALERTS.map(a => {
                      const col = a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6';
                      const Icon = a.type === 'stock' ? Package : a.type === 'delay' ? Clock : AlertTriangle;
                      return (
                        <button key={a.id} onClick={() => { onNavigate(a.page); setNotifOpen(false); }}
                          className="w-full flex items-start gap-2.5 px-4 py-3 border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors text-left">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${col}15`, border: `1px solid ${col}25` }}>
                            <Icon size={11} style={{ color: col }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{a.message}</p>
                            <p className="text-[9px] text-[var(--text-faint)] mt-0.5">{a.time}</p>
                          </div>
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: col }} />
                        </button>
                      );
                    })
                  ) : (
                    ACTIVITY_FEED.slice(0, 8).map(item => (
                      <div key={item.id} className="flex items-start gap-2.5 px-4 py-3 border-b border-[var(--border-base)] last:border-0">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[9px] font-bold text-[var(--primary-light)]">
                          {item.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                            <span className="font-semibold text-[var(--text-primary)]">{item.actor}</span> {item.action}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{item.subject}</p>
                          <p className="text-[9px] text-[var(--text-faint)] mt-0.5">{item.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-[var(--border-base)]">
                  <button className="w-full text-[10px] font-semibold text-[var(--primary-light)] hover:underline text-center">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Settings shortcut */}
        {canViewSettings && (
          <button
            onClick={() => { onNavigate('settings'); setNotifOpen(false); setUserMenuOpen(false); setThemeMenuOpen(false); }}
            title="Settings & Control Center"
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border transition-colors',
              currentPage === 'settings'
                ? 'text-[var(--accent)] border-[var(--accent)]/40 bg-[var(--accent)]/8'
                : topbarHasCustomColor
                  ? 'text-white/70 hover:text-white border-white/15 hover:border-white/30 bg-[var(--bg-surface)]/10'
                  : 'text-[var(--text-faint)] hover:text-[var(--text-primary)] border-[var(--border-base)] hover:border-[var(--border-muted)] bg-[var(--bg-elevated)]'
            )}>
            <Settings size={14} />
          </button>
        )}

        {/* Theme picker */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(p => !p)}
            title={`Theme: ${currentLabel}`}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border transition-colors',
              topbarHasCustomColor
                ? 'text-white/70 hover:text-white border-white/15 hover:border-white/30 bg-[var(--bg-surface)]/10'
                : 'text-[var(--text-faint)] hover:text-[var(--primary-light)] border-[var(--border-base)] hover:border-[var(--primary)]/40 bg-[var(--bg-elevated)]'
            )}
          >
            <Palette size={14} />
          </button>
          {themeMenuOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setThemeMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-[70] w-44 glass-card shadow-2xl shadow-black/60 py-1.5 animate-slide-up">
                <p className="px-4 py-1.5 text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-widest border-b border-[var(--border-base)] mb-1">Theme</p>
                {themes.map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setTheme(t.key); setThemeMenuOpen(false); }}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-4 py-2 text-xs transition-colors',
                      theme === t.key
                        ? 'text-[var(--primary-light)] bg-[var(--primary)]/10'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    <span className={cn(
                      'w-3 h-3 rounded-full border shrink-0',
                      t.key === 'dark' && 'bg-[#0b1220] border-blue-500/60',
                      t.key === 'light' && 'bg-[#f8fafc] border-blue-400/60',
                      t.key === 'deep' && 'bg-[#080c14] border-blue-600/60',
                      t.key === 'slate' && 'bg-[#1e293b] border-blue-400/50',
                      t.key === 'solar' && 'bg-[#181200] border-amber-500/60',
                    )} />
                    {t.label}
                    {theme === t.key && <span className="ml-auto text-[10px] text-[var(--primary-light)]">âœ“</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative z-[1000]">
          <button
            onClick={() => setUserMenuOpen(p => !p)}
            className={cn(
              'flex items-center gap-2 h-8 px-2 rounded-lg border transition-all cursor-pointer',
              topbarHasCustomColor
                ? 'bg-[var(--bg-surface)]/10 border-white/15 hover:border-white/30'
                : 'bg-[var(--bg-elevated)] border-[var(--border-base)] hover:border-[var(--border-muted)]'
            )}
          >
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                className="w-5 h-5 rounded-lg object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-5 h-5 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white text-[10px] font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className={cn('hidden sm:block text-xs font-medium', topbarHasCustomColor ? 'text-white/90' : 'text-[var(--text-secondary)]')}>{user?.name?.split(' ')[0]}</span>
            <ChevronDown size={11} className={cn('hidden sm:block', topbarHasCustomColor ? 'text-white/50' : 'text-[var(--text-faint)]')} />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-[9999] w-56 glass-card shadow-2xl shadow-black/60 py-1.5 animate-slide-up">
                <div className="px-4 py-3 border-b border-[var(--border-base)]">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{user?.name}</p>
                  <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{user?.email}</p>
                  <Badge variant="blue" className="mt-2 text-[9px]">{user?.role}</Badge>
                </div>
                <button
                  onClick={() => { onNavigate('profile'); setUserMenuOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <User size={12} /> My Profile
                </button>
                {canViewSettings && (
                  <button
                    onClick={() => { onNavigate('settings'); setUserMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                    <Settings size={12} /> Settings
                  </button>
                )}
                <div className="border-t border-[var(--border-base)] mt-1 pt-1">
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={12} /> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MOBILE OVERLAY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {(sidebarOpen || (isOverlay && sidebarHovered)) && (
        <div
          className={cn(
            'fixed inset-0 z-30 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
            // On desktop: only show for overlay mode
            !isOverlay && 'lg:hidden'
          )}
          onClick={() => { close(); setSidebarHovered(false); }}
        />
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• HORIZONTAL NAV BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {isHorizontal && (
        <div
          className="fixed top-14 left-0 right-0 z-30 h-11 flex items-center gap-1 px-4 border-b border-[var(--border-base)] overflow-x-auto"
          style={{ ...sidebarStyle, background: sidebarStyle.background || sidebarStyle.backgroundColor || 'var(--bg-sidebar)', backdropFilter: 'blur(20px)' }}
        >
          {visibleSections.flatMap(s => s.items).map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); close(); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-150 shrink-0',
                  active
                    ? 'bg-[var(--primary)]/15 text-[var(--primary-light)] font-semibold'
                    : sidebarHasCustomColor
                      ? 'text-white/60 hover:text-white/90 hover:bg-[var(--bg-surface)]/10'
                      : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SIDEBAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {!isHorizontal && (
        <aside
          className={cn(
            'fixed top-0 z-40 flex flex-col transition-all duration-300 overflow-y-auto overflow-x-hidden',
            'border-r border-[var(--border-base)]',
            !sidebarHasCustomColor && 'sidebar-bg',
            // Full height sidebar
            'h-screen',
            // Detached: floating with gap/margin
            isDetached && 'top-2 bottom-2 left-2 rounded-2xl border h-[calc(100vh-1rem)]',
            !isDetached && 'left-0',
            // Overlay: shadow when visible
            (isOverlay && sidebarHovered) && 'shadow-2xl shadow-black/40',
            // Hover-view: always visible on desktop at 64px, expands on hover with shadow
            isHoverView && sidebarHovered && 'shadow-2xl shadow-black/30',
            // Visibility: mobile = slide, desktop = depends on mode
            sidebarOpen
              ? 'translate-x-0'
              : isOverlay
                ? (sidebarHovered ? 'translate-x-0' : '-translate-x-full lg:-translate-x-full')
                : '-translate-x-full lg:translate-x-0'
          )}
          style={{
            width: `${isOverlay ? (sidebarHovered ? 220 : 0) : sidebarW}px`,
            paddingTop: '0',
            ...sidebarStyle,
          }}
          onMouseEnter={() => { if (isHoverView || isOverlay) setSidebarHovered(true); }}
          onMouseLeave={() => { if (isHoverView || isOverlay) setSidebarHovered(false); }}
        >

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SIDEBAR LOGO â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className={cn(
            'relative z-50 flex items-center border-b border-[var(--border-base)] bg-[var(--bg-sidebar)] shrink-0',
            showLabels ? 'px-4 h-14 gap-3' : 'justify-center h-10'
          )}>
            {/* Solar Logo Icon */}
            <div className={cn(
              'relative z-10 shrink-0 rounded-xl flex items-center justify-center',
              'w-5 h-5'
            )}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.5)',
              }}
            >
              <Sun
                size={15}
                className="relative z-10 text-white"
                strokeWidth={2}
              />

              {/* Solar panel badge */}
              <div className="absolute -bottom-1.5 -right-1.5 z-20 w-5 h-5 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: '2px solid var(--bg-sidebar)'
                }}
              >
                <div className="w-2.5 h-2.5 grid grid-cols-2 gap-px">
                  <div className="bg-[var(--bg-surface)]/90 rounded-sm" />
                  <div className="bg-[var(--bg-surface)]/90 rounded-sm" />
                  <div className="bg-[var(--bg-surface)]/90 rounded-sm" />
                  <div className="bg-[var(--bg-surface)]/90 rounded-sm" />
                </div>
              </div>
            </div>

            {/* Logo Text */}
            {showLabels && (
              <div className="relative z-10 flex flex-col justify-center">
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    'font-bold text-lg leading-none',
                    sidebarHasCustomColor ? 'text-white' : 'text-amber-500'
                  )}>
                    {APP_CONFIG.name.split(' ')[0]}
                  </span>
                  <span className={cn(
                    'font-semibold text-lg leading-none',
                    sidebarHasCustomColor ? 'text-white/90' : 'text-[var(--text-primary)]'
                  )}>
                    {APP_CONFIG.name.split(' ')[1]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn(
                    'text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded',
                    sidebarHasCustomColor
                      ? 'bg-[var(--bg-surface)]/10 text-white/60'
                      : 'bg-amber-500/10 text-amber-600'
                  )}>
                    {APP_CONFIG.edition}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 py-4 px-2">
            {visibleSections.map(section => (
              <div key={section.section} className="mb-3">
                {showLabels && (
                  <p className={cn(
                    'px-3 pb-1 pt-1.5 text-[8px] font-bold uppercase tracking-[0.15em]',
                    sidebarHasCustomColor ? 'text-white/30' : 'text-[var(--text-faint)]'
                  )}>
                    {section.section}
                  </p>
                )}
                {section.items.map(item => {
                  const Icon = item.icon;
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = expandedMenus[item.id];
                  const isChildActive = hasChildren && item.children.some(child => child.id === currentPage);
                  const isActive = currentPage === item.id || isChildActive;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (hasChildren) {
                            setExpandedMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                          } else {
                            onNavigate(item.id);
                            close();
                            setSidebarHovered(false);
                          }
                        }}
                        title={!showLabels ? item.label : undefined}
                        className={cn(
                          'w-full flex items-center transition-all duration-150',
                          showLabels ? 'nav-item' : 'justify-center py-2 px-1 rounded-lg my-0.5',
                          (isActive || isChildActive) && showLabels && !sidebarHasCustomColor && 'nav-item-active',
                          (isActive || isChildActive) && showLabels && sidebarHasCustomColor && 'bg-[var(--bg-surface)]/15 text-white font-semibold',
                          (isActive || isChildActive) && !showLabels && 'bg-[var(--primary)]/15',
                          !isActive && !showLabels && 'hover:bg-[var(--bg-hover)]',
                          !isActive && sidebarHasCustomColor && showLabels && 'text-white/60 hover:text-white/90 hover:bg-[var(--bg-surface)]/10',
                        )}
                      >
                        <Icon
                          size={showLabels ? 13 : 16}
                          className={cn(
                            'shrink-0',
                            (isActive || isChildActive)
                              ? (sidebarHasCustomColor ? 'text-white' : 'text-[var(--primary-light)]')
                              : (sidebarHasCustomColor ? 'text-white/40' : 'text-[var(--text-faint)]')
                          )}
                        />
                        {showLabels && <span className="truncate text-[11px]">{item.label}</span>}
                        {showLabels && hasChildren && (
                          <ChevronDown
                            size={12}
                            className={cn(
                              'ml-auto transition-transform duration-200',
                              isExpanded ? 'rotate-180' : ''
                            )}
                          />
                        )}
                        {showLabels && ((badgeCounts[item.id] ?? 0) > 0) && (
                          <span className={cn(
                            'ml-auto text-[8px] rounded-full px-1.5 py-0.5 font-bold',
                            item.badgeVariant === 'red' ? 'bg-red-500 text-white' :
                              item.badgeVariant === 'amber' ? 'bg-amber-500 text-black' :
                                'bg-[var(--primary)] text-white'
                          )}>{badgeCounts[item.id]}</span>
                        )}
                      </button>

                      {/* Dropdown for children */}
                      {showLabels && hasChildren && isExpanded && (
                        <div className="ml-4 mt-1 space-y-0.5 border-l border-[var(--border-base)] pl-2">
                          {item.children.map(child => {
                            const ChildIcon = child.icon;
                            const isChildActive = currentPage === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  onNavigate(child.id);
                                  close();
                                  setSidebarHovered(false);
                                }}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all duration-150',
                                  isChildActive
                                    ? 'bg-[var(--primary)]/10 text-[var(--primary-light)] font-medium'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                )}
                              >
                                <ChildIcon size={12} className="shrink-0" />
                                <span className="truncate">{child.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* AI Engine badge â€” only when sidebar is expanded */}
          {showLabels && (
            <div className="m-3 p-3.5 rounded-xl border border-[var(--primary)]/20"
              style={{ background: 'linear-gradient(135deg, var(--primary-glow) 0%, rgba(34,211,238,0.05) 100%)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={12} className="text-[var(--primary-light)]" />
                <span className="text-[11px] font-bold text-[var(--primary-light)]">AI Engine Active</span>
              </div>
              <p className={cn('text-[10px]', sidebarHasCustomColor ? 'text-white/40' : 'text-[var(--text-faint)]')}>
                3 insights ready for review
              </p>
            </div>
          )}

          {/* Version */}
          {showLabels && (
            <div className="px-4 pb-4">
              <p className={cn('text-[9px]', sidebarHasCustomColor ? 'text-white/30' : 'text-[var(--text-faint)]')}>{APP_CONFIG.company}</p>
              <p className={cn('text-[9px] mt-0.5', sidebarHasCustomColor ? 'text-white/30' : 'text-[var(--text-faint)]')}>v{APP_CONFIG.version}</p>
            </div>
          )}
        </aside>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• OVERLAY / HOVER TRIGGER ZONE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {(isOverlay || isHoverView) && !sidebarOpen && !sidebarHovered && !isHorizontal && (
        <div
          className="fixed top-14 left-0 bottom-0 w-3 z-40 hidden lg:block"
          onMouseEnter={() => setSidebarHovered(true)}
        />
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MAIN CONTENT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <main
        className={cn(
          'min-h-[calc(100vh-56px)] p-5 bg-[var(--bg-page)] transition-all duration-300',
          isHorizontal ? 'mt-[100px]' : 'mt-14',
        )}
        style={{
          marginLeft: isOverlay ? 0 : (windowWidth >= 1024 ? `${sidebarW}px` : 0),
        }}
        onClick={() => { if (userMenuOpen) setUserMenuOpen(false); if (themeMenuOpen) setThemeMenuOpen(false); if (notifOpen) setNotifOpen(false); }}
      >
        <DataScopeBanner />
        <div className="p-5">
          {children}
        </div>
      </main>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• REMINDER SIDEBAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <ReminderSidebar
        isOpen={reminderSidebarOpen}
        onClose={() => setReminderSidebarOpen(false)}
        onNavigate={onNavigate}
      />

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• THEME CUSTOMIZER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <ThemeCustomizer />
    </div>
  );
};

export default Layout;
