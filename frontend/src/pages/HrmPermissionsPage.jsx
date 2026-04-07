import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Save, RefreshCcw, Check, X, Loader2,
  Users, Calendar, Clock, Wallet, TrendingUp, Building,
  ChevronDown, ChevronRight, Eye, EyeOff, Lock, AlertCircle
} from 'lucide-react';
import api from '../lib/apiClient';
import { toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const PERMISSION_COLUMNS = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' },
  { id: 'approve', label: 'Approve' },
  { id: 'reject', label: 'Reject' },
  { id: 'apply', label: 'Apply' },
  { id: 'checkin', label: 'Check In' },
  { id: 'checkout', label: 'Check Out' },
  { id: 'generate', label: 'Generate' },
  { id: 'export', label: 'Export' },
];

const MODULE_SPECIFIC_ACTIONS = {
  employees: ['export', 'assign'],
  leaves: ['apply'],
  attendance: ['checkin', 'checkout', 'export'],
  payroll: ['generate', 'export'],
  increments: ['export'],
  departments: ['export', 'assign'],
};

const MODULES = [
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'leaves', label: 'Leaves', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'payroll', label: 'Payroll', icon: Wallet },
  { id: 'increments', label: 'Increments', icon: TrendingUp },
  { id: 'departments', label: 'Departments', icon: Building },
];

const DATA_SCOPES = [
  { value: 'own', label: 'Own Only' },
  { value: 'department', label: 'Department' },
  { value: 'all', label: 'All Data' },
];

const PERMISSION_PRESETS = {
  hr_manager: { label: 'HR Manager', permissions: { employees: { view: true, create: true, edit: true, delete: true }, leaves: { view: true, apply: true, approve: true, reject: true }, attendance: { view: true, checkin: true, checkout: true }, payroll: { view: true, generate: true }, increments: { view: true, create: true }, departments: { view: true, create: true } } },
  department_head: { label: 'Department Head', permissions: { employees: { view: true, create: false, edit: true, delete: false }, leaves: { view: true, apply: false, approve: true, reject: true }, attendance: { view: true, checkin: false, checkout: false }, payroll: { view: true }, increments: { view: true }, departments: { view: true } } },
  employee: { label: 'Employee', permissions: { employees: { view: true, create: false, edit: false, delete: false }, leaves: { view: true, apply: true, approve: false, reject: false }, attendance: { view: true, checkin: true, checkout: true }, payroll: { view: true }, increments: { view: true }, departments: { view: false } } },
};

const HrmPermissionsPage = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activePreset, setActivePreset] = useState('');

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  // Fetch roles on mount
  useEffect(() => {
    fetchRoles();
  }, []);

  // Fetch permissions when role changes
  useEffect(() => {
    if (selectedRoleId) {
      fetchPermissions(selectedRoleId);
    }
  }, [selectedRoleId]);

  const fetchRoles = async () => {
    try {
      // Fetch custom roles from Settings > Role Builder
      const response = await api.get('/settings/custom-roles');
      let rolesData = response.data || [];
      
      // API returns object { roleId: { roleId, label, ... }, ... }
      // Convert to array
      let customRoles = [];
      if (Array.isArray(rolesData)) {
        customRoles = rolesData;
      } else if (rolesData.customRoles) {
        customRoles = rolesData.customRoles;
      } else if (typeof rolesData === 'object') {
        // Convert object to array
        customRoles = Object.values(rolesData);
      }
      
      // Map Settings roles to frontend format (roleId -> id, label -> name)
      const mappedRoles = customRoles.map(role => ({
        _id: role.roleId || role._id || role.id,
        name: role.label || role.name || 'Unknown',
        ...role
      }));
      
      setRoles(mappedRoles);
      if (mappedRoles.length > 0) {
        setSelectedRoleId(mappedRoles[0]._id);
        setSelectedRoleName(mappedRoles[0].name);
      } else {
        toast.info('No custom roles found. Create roles in Settings > Role Builder first.');
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      toast.error('Failed to load roles from Settings');
    }
  };

  const fetchPermissions = async (roleId) => {
    setLoading(true);
    try {
      const response = await api.get(`/hrm/permissions/roles/${roleId}/module-permissions`);
      const perms = response.data?.permissions || {};

      // Ensure all modules have default structure
      const defaultPerms = {};
      MODULES.forEach(module => {
        defaultPerms[module.id] = {
          actions: perms[module.id]?.actions || {
            view: false, create: false, edit: false, delete: false,
            approve: false, reject: false, export: false
          },
          dataScope: perms[module.id]?.dataScope || 'own'
        };
      });

      setPermissions(defaultPerms);
      setActivePreset('');
    } catch (err) {
      console.error('Error fetching permissions:', err);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (e) => {
    const roleId = e.target.value;
    const role = roles.find(r => r._id === roleId);
    setSelectedRoleId(roleId);
    setSelectedRoleName(role?.name || '');
  };

  const handleToggleAction = (moduleId, actionKey) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        actions: {
          ...prev[moduleId].actions,
          [actionKey]: !prev[moduleId].actions[actionKey]
        }
      }
    }));
    setActivePreset('');
  };

  const handleDataScopeChange = (moduleId, scope) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        dataScope: scope
      }
    }));
    setActivePreset('');
  };

  const applyPreset = (presetKey) => {
    const preset = PERMISSION_PRESETS[presetKey];
    if (!preset) return;

    const newPermissions = {};
    MODULES.forEach(module => {
      const modulePreset = preset.permissions[module.id] || {};
      newPermissions[module.id] = {
        actions: {
          view: modulePreset.view || false,
          create: modulePreset.create || false,
          edit: modulePreset.edit || false,
          delete: modulePreset.delete || false,
          approve: modulePreset.approve || false,
          reject: modulePreset.reject || false,
          export: modulePreset.export || false
        },
        dataScope: 'all'
      };
    });

    setPermissions(newPermissions);
    setActivePreset(presetKey);
    toast.success(`Applied ${preset.label} preset`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/hrm/permissions/roles/${selectedRoleId}/module-permissions/bulk`, {
        permissions
      });
      toast.success('Permissions saved successfully');
    } catch (err) {
      console.error('Error saving permissions:', err);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all permissions to default for this role?')) {
      fetchPermissions(selectedRoleId);
      toast.info('Permissions reset');
    }
  };

  // Admin-only access check
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-500 text-center max-w-md">
          Only administrators can access the HRM Permissions page.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HRM Permissions</h1>
                <p className="text-sm text-gray-500">Configure granular access controls for each role</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={loading || saving}
                className="gap-2"
              >
                <RefreshCcw size={16} />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Role Selector & Presets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Role Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Role
            </label>
            <select
              value={selectedRoleId}
              onChange={handleRoleChange}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
            >
              {roles.map(role => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              Configuring for: <span className="font-medium text-orange-600">{selectedRoleName}</span>
            </p>
          </div>

          {/* Permission Presets */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Quick Presets
            </label>
            <div className="space-y-2">
              {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    activePreset === key
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{preset.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Permission Matrix */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">Permission Matrix</h2>
              <p className="text-sm text-gray-500 mt-1">Configure actions and data scope for each module</p>
            </div>

            <div className="divide-y divide-gray-100">
              {MODULES.map(module => {
                const Icon = module.icon;
                const modulePerms = permissions[module.id] || { actions: {}, dataScope: 'own' };

                return (
                  <div key={module.id} className="p-5">
                    {/* Module Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{module.label}</h3>
                        </div>
                      </div>

                      {/* Data Scope Selector */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Data Scope:</span>
                        <select
                          value={modulePerms.dataScope || 'own'}
                          onChange={(e) => handleDataScopeChange(module.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                        >
                          {DATA_SCOPES.map(scope => (
                            <option key={scope.value} value={scope.value}>
                              {scope.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Action Toggles */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {(() => {
                        // Get module-specific actions
                        const specificActions = MODULE_SPECIFIC_ACTIONS[module.id] || [];
                        // Common actions for all modules
                        const commonActions = ['view', 'create', 'edit', 'delete', 'approve', 'reject'];
                        // Combine based on module
                        let relevantActions = [];
                        
                        if (module.id === 'leaves') {
                          relevantActions = ['view', 'apply', 'approve', 'reject', 'delete'];
                        } else if (module.id === 'attendance') {
                          relevantActions = ['view', 'checkin', 'checkout', 'edit', 'delete'];
                        } else if (module.id === 'payroll') {
                          relevantActions = ['view', 'generate', 'edit', 'delete', 'export'];
                        } else if (module.id === 'increments') {
                          relevantActions = ['view', 'create', 'edit', 'delete', 'approve'];
                        } else {
                          relevantActions = [...commonActions, ...specificActions];
                        }
                        
                        return PERMISSION_COLUMNS.filter(action => relevantActions.includes(action.id));
                      })().map(action => (
                        <button
                          key={action.id}
                          onClick={() => handleToggleAction(module.id, action.id)}
                          className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                            modulePerms.actions?.[action.id]
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 hover:border-orange-300 text-gray-600'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                            modulePerms.actions?.[action.id]
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {modulePerms.actions?.[action.id] ? <Check size={14} /> : <X size={14} />}
                          </div>
                          <span className="text-xs font-medium text-center">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Scope Legend */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 mt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Data Scope Explanation</h4>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-blue-700">
                  {DATA_SCOPES.map(scope => (
                    <div key={scope.value}>
                      <span className="font-medium">{scope.label}:</span>{' '}
                      <span className="text-blue-600">{scope.value === 'own' ? 'Only their own records' : scope.value === 'department' ? 'Records in their department' : 'All records in the system'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-3">
            <Loader2 className="text-orange-500 animate-spin" size={24} />
            <span className="text-gray-600 font-medium">Loading permissions...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrmPermissionsPage;
