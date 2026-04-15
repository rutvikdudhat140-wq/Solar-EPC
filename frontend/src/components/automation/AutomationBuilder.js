// AutomationBuilder.js - Production-grade Automation Builder UI
// Supports: Triggers, Complex Conditions (AND/OR tree), Multiple Actions, Templates

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Plus, Trash2, Play, Pause, Clock, AlertCircle,
  CheckCircle, ChevronDown, ChevronRight, Settings, Zap,
  Copy, Save, RefreshCw, Eye, History,
  ArrowRight, Layers, Cpu, Bell, Mail, UserPlus,
  Calendar,
  MoreHorizontal, ChevronUp, GripVertical, Info,
  FileText, DollarSign, Filter, X
} from 'lucide-react';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { automationApi } from '../../services/automationApi';

//     CONSTANTS                                                            

const OPERATORS = [
  { value: 'eq', label: 'equals', types: ['string', 'number', 'boolean', 'date'] },
  { value: 'ne', label: 'not equals', types: ['string', 'number', 'boolean', 'date'] },
  { value: 'gt', label: 'greater than', types: ['number', 'date'] },
  { value: 'gte', label: 'greater than or equals', types: ['number', 'date'] },
  { value: 'lt', label: 'less than', types: ['number', 'date'] },
  { value: 'lte', label: 'less than or equals', types: ['number', 'date'] },
  { value: 'contains', label: 'contains', types: ['string', 'array'] },
  { value: 'starts_with', label: 'starts with', types: ['string'] },
  { value: 'ends_with', label: 'ends with', types: ['string'] },
  { value: 'in', label: 'is in', types: ['string', 'number'] },
  { value: 'not_in', label: 'is not in', types: ['string', 'number'] },
  { value: 'exists', label: 'exists', types: ['any'] },
  { value: 'empty', label: 'is empty', types: ['string', 'array'] },
];

const ACTION_TYPES = [
  { value: 'create_record', label: 'Create Record', icon: FileText, color: '#3b82f6' },
  { value: 'update_field', label: 'Update Field', icon: Settings, color: '#22c55e' },
  { value: 'assign_user', label: 'Assign User', icon: UserPlus, color: '#8b5cf6' },
  { value: 'send_email', label: 'Send Email', icon: Mail, color: '#f59e0b' },
  { value: 'send_notification', label: 'Send Notification', icon: Bell, color: '#06b6d4' },
  { value: 'create_task', label: 'Create Task', icon: CheckCircle, color: '#ec4899' },
  { value: 'trigger_webhook', label: 'Trigger Webhook', icon: Zap, color: '#f97316' },
  { value: 'delay', label: 'Delay', icon: Clock, color: '#6b7280' },
  { value: 'create_project', label: 'Create Project', icon: Layers, color: '#14b8a6' },
  { value: 'create_quotation', label: 'Create Quotation', icon: DollarSign, color: '#84cc16' },
  { value: 'assign_engineer', label: 'Assign Engineer', icon: UserPlus, color: '#6366f1' },
  { value: 'update_status', label: 'Update Status', icon: RefreshCw, color: '#a855f7' },
];

//     MAIN COMPONENT                                                      

export default function AutomationBuilder({ tenantId, user }) {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rules'); // rules | templates | history
  const [selectedRule, setSelectedRule] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [stats, setStats] = useState(null);

  // Form state for new/edit rule
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: true,
    trigger: { event: '', module: '', entityType: '' },
    conditionTree: { type: 'group', logic: 'AND', children: [] },
    actionNodes: [],
  });

  //     DATA LOADING                                                       

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesRes, templatesRes, eventsRes, statsRes] = await Promise.all([
        automationApi.getAutomationRules(),
        automationApi.getAutomationTemplates(),
        automationApi.getAvailableEvents(),
        automationApi.getAutomationStats(),
      ]);

      setRules(rulesRes.data || []);
      setTemplates(templatesRes.data || []);
      
      // Add fallback events if API returns empty
      const eventsData = eventsRes.data || [];
      if (eventsData.length === 0) {
        setAvailableEvents([
          { id: 'lead.created', description: 'Lead Created', module: 'leads', entityType: 'lead' },
          { id: 'lead.status_changed', description: 'Lead Status Changed', module: 'leads', entityType: 'lead' },
          { id: 'estimate.created', description: 'Estimate Created', module: 'estimates', entityType: 'estimate' },
          { id: 'proposal.sent', description: 'Proposal Sent', module: 'proposals', entityType: 'proposal' },
          { id: 'project.started', description: 'Project Started', module: 'projects', entityType: 'project' },
          { id: 'inventory.low_stock', description: 'Inventory Stock Low', module: 'inventory', entityType: 'item' }
        ]);
      } else {
        setAvailableEvents(eventsData);
      }
      
      setStats(statsRes);
    } catch (error) {
      console.warn('Using fallback automation data due to API error');
      setAvailableEvents([
        { id: 'lead.created', description: 'Lead Created', module: 'leads', entityType: 'lead' },
        { id: 'lead.status_changed', description: 'Lead Status Changed', module: 'leads', entityType: 'lead' },
        { id: 'estimate.created', description: 'Estimate Created', module: 'estimates', entityType: 'estimate' },
        { id: 'proposal.sent', description: 'Proposal Sent', module: 'proposals', entityType: 'proposal' },
        { id: 'project.started', description: 'Project Started', module: 'projects', entityType: 'project' },
        { id: 'inventory.low_stock', description: 'Inventory Stock Low', module: 'inventory', entityType: 'item' }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  //     HANDLERS                                                           

  const handleCreateRule = () => {
    setSelectedRule(null);
    setFormData({
      name: '',
      description: '',
      enabled: true,
      trigger: { event: '', module: '', entityType: '' },
      conditionTree: { type: 'group', logic: 'AND', children: [] },
      actionNodes: [],
    });
    setIsEditing(true);
  };

  const handleEditRule = (rule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name || '',
      description: rule.description || '',
      enabled: rule.enabled !== false,
      trigger: rule.trigger || { event: '', module: '', entityType: '' },
      conditionTree: rule.conditionTree || { type: 'group', logic: 'AND', children: [] },
      actionNodes: rule.actionNodes || [],
    });
    setIsEditing(true);
  };

  const handleSaveRule = async () => {
    try {
      if (!formData.name || !formData.trigger.event) {
        toast.error('Please fill in required fields (name and trigger)');
        return;
      }

      const payload = {
        ...formData,
        startNodeId: formData.actionNodes[0]?.nodeId || 'action_1',
      };

      if (selectedRule) {
        await automationApi.updateAutomationRule(selectedRule.ruleId, payload);
        toast.success('Rule updated successfully');
      } else {
        await automationApi.createAutomationRule(payload);
        toast.success('Rule created successfully');
      }

      setIsEditing(false);
      loadData();
    } catch (error) {
      toast.error('Failed to save rule');
      console.error(error);
    }
  };

  const handleToggleRule = async (ruleId, enabled) => {
    try {
      await automationApi.toggleAutomationRule(ruleId, enabled);
      toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await automationApi.deleteAutomationRule(ruleId);
      toast.success('Rule deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleApplyTemplate = async (templateId) => {
    try {
      await automationApi.applyTemplate(templateId);
      toast.success('Template applied successfully');
      setShowTemplateModal(false);
      loadData();
    } catch (error) {
      toast.error('Failed to apply template');
    }
  };

  const handleViewExecution = async (execution) => {
    setSelectedExecution(execution);
    setShowExecutionModal(true);
  };

  //     CONDITION BUILDER                                                   

  const addCondition = (parentPath = []) => {
    const newCondition = {
      type: 'condition',
      field: '',
      operator: 'eq',
      value: '',
    };

    setFormData(prev => {
      const newTree = { ...prev.conditionTree };
      let current = newTree;
      
      for (const index of parentPath) {
        current = current.children[index];
      }
      
      if (!current.children) current.children = [];
      current.children.push(newCondition);
      
      return { ...prev, conditionTree: newTree };
    });
  };

  const addConditionGroup = () => {
    setFormData(prev => ({
      ...prev,
      conditionTree: {
        type: 'group',
        logic: 'AND',
        children: [...(prev.conditionTree.children || []), {
          type: 'group',
          logic: 'AND',
          children: [],
        }],
      },
    }));
  };

  const updateCondition = (path, updates) => {
    setFormData(prev => {
      const newTree = JSON.parse(JSON.stringify(prev.conditionTree));
      let current = newTree;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current.children[path[i]];
      }
      
      const lastIndex = path[path.length - 1];
      current.children[lastIndex] = { ...current.children[lastIndex], ...updates };
      
      return { ...prev, conditionTree: newTree };
    });
  };

  const removeCondition = (path) => {
    setFormData(prev => {
      const newTree = JSON.parse(JSON.stringify(prev.conditionTree));
      let current = newTree;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current.children[path[i]];
      }
      
      const lastIndex = path[path.length - 1];
      current.children.splice(lastIndex, 1);
      
      return { ...prev, conditionTree: newTree };
    });
  };

  //     ACTION BUILDER                                                     

  const addAction = () => {
    const nodeId = `action_${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      actionNodes: [...prev.actionNodes, {
        nodeId,
        type: 'send_notification',
        config: {},
        dependencies: prev.actionNodes.length > 0 ? [prev.actionNodes[prev.actionNodes.length - 1].nodeId] : [],
        nextNodes: [],
        delayMs: 0,
        retryCount: 0,
        maxRetries: 3,
        stopOnFailure: false,
      }],
    }));
  };

  const updateAction = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      actionNodes: prev.actionNodes.map((action, i) =>
        i === index ? { ...action, ...updates } : action
      ),
    }));
  };

  const removeAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actionNodes: prev.actionNodes.filter((_, i) => i !== index),
    }));
  };

  const moveAction = (fromIndex, toIndex) => {
    setFormData(prev => {
      const newActions = [...prev.actionNodes];
      const [moved] = newActions.splice(fromIndex, 1);
      newActions.splice(toIndex, 0, moved);
      
      // Update dependencies
      return {
        ...prev,
        actionNodes: newActions.map((action, i) => ({
          ...action,
          dependencies: i > 0 ? [newActions[i - 1].nodeId] : [],
        })),
      };
    });
  };

  //     RENDER                                                              

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
        <span className="ml-3 text-sm text-[var(--text-faint)]">Loading automation engine...</span>
      </div>
    );
  }

  // Rule Editor View
  if (isEditing) {
    return (
      <RuleEditor
        formData={formData}
        setFormData={setFormData}
        availableEvents={availableEvents}
        onSave={handleSaveRule}
        onCancel={() => setIsEditing(false)}
        isEdit={!!selectedRule}
        addCondition={addCondition}
        addConditionGroup={addConditionGroup}
        updateCondition={updateCondition}
        removeCondition={removeCondition}
        addAction={addAction}
        updateAction={updateAction}
        removeAction={removeAction}
        moveAction={moveAction}
      />
    );
  }

  // Main List View
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <GitBranch size={20} className="text-[var(--accent)]" />
            Automation Rules
          </h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">
            {stats?.rules?.active || 0} active   {stats?.rules?.total || 0} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors flex items-center gap-1.5"
          >
            <Copy size={12} />
            Templates
          </button>
          <button
            onClick={handleCreateRule}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus size={12} />
            New Rule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border-base)]">
        {[
          { id: 'rules', label: 'Rules', icon: GitBranch },
          { id: 'history', label: 'Execution History', icon: History },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-[var(--accent)] border-[var(--accent)]'
                : 'text-[var(--text-faint)] border-transparent hover:text-[var(--text-secondary)]'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'rules' && (
        <RulesList
          rules={rules}
          onEdit={handleEditRule}
          onToggle={handleToggleRule}
          onDelete={handleDeleteRule}
        />
      )}

      {activeTab === 'history' && (
        <ExecutionHistory
          executions={executions}
          onView={handleViewExecution}
        />
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          templates={templates}
          onApply={handleApplyTemplate}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {/* Execution Detail Modal */}
      {showExecutionModal && selectedExecution && (
        <ExecutionDetailModal
          execution={selectedExecution}
          onClose={() => setShowExecutionModal(false)}
        />
      )}
    </div>
  );
}

//     SUB-COMPONENTS                                                      

function RuleEditor({
  formData,
  setFormData,
  availableEvents,
  onSave,
  onCancel,
  isEdit,
  addCondition,
  addConditionGroup,
  updateCondition,
  removeCondition,
  addAction,
  updateAction,
  removeAction,
  moveAction,
}) {
  const [activeSection, setActiveSection] = useState('trigger');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          {isEdit ? 'Edit Automation Rule' : 'Create Automation Rule'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-black hover:opacity-90 flex items-center gap-1.5"
          >
            <Save size={12} />
            Save Rule
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="p-4 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] space-y-3">
        <div>
          <label className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider">
            Rule Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Lead Qualified   Create Survey"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="What does this automation do?"
            rows={2}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
            className="rounded border-[var(--border-base)]"
          />
          <label htmlFor="enabled" className="text-xs text-[var(--text-secondary)]">
            Enable this rule
          </label>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'trigger', label: '1. Trigger', icon: Zap },
          { id: 'conditions', label: '2. Conditions', icon: Filter },
          { id: 'actions', label: '3. Actions', icon: Play },
        ].map((section, index) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeSection === section.id
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30'
                : 'bg-[var(--bg-elevated)] text-[var(--text-faint)] border border-[var(--border-base)] hover:border-[var(--accent)]/30'
            }`}
          >
            <section.icon size={12} />
            {section.label}
          </button>
        ))}
      </div>

      {/* Trigger Section */}
      {activeSection === 'trigger' && (
        <div className="p-4 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)]">
          <h3 className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
            <Zap size={14} className="text-[var(--accent)]" />
            When this event occurs...
          </h3>
          <select
            value={formData.trigger.event}
            onChange={e => {
              const event = availableEvents.find(ev => ev.id === e.target.value);
              setFormData(prev => ({
                ...prev,
                trigger: {
                  event: event?.id || '',
                  module: event?.module || '',
                  entityType: event?.entityType || '',
                },
              }));
            }}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">Select an event...</option>
            {availableEvents.map(event => (
              <option key={event.id} value={event.id}>
                {event.description || event.id}
              </option>
            ))}
          </select>
          {formData.trigger.event && (
            <div className="mt-3 p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-active)]">
              <p className="text-[10px] text-[var(--text-faint)]">
                Module: <span className="text-[var(--text-secondary)] capitalize">{formData.trigger.module}</span>
              </p>
              <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                Entity: <span className="text-[var(--text-secondary)] capitalize">{formData.trigger.entityType}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Conditions Section */}
      {activeSection === 'conditions' && (
        <div className="p-4 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Filter size={14} className="text-[var(--accent)]" />
              Check these conditions...
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => addCondition([])}
                className="px-2 py-1 rounded text-[10px] font-medium bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 flex items-center gap-1"
              >
                <Plus size={10} />
                Condition
              </button>
              <button
                onClick={addConditionGroup}
                className="px-2 py-1 rounded text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--text-faint)] hover:text-[var(--text-secondary)] border border-[var(--border-base)]"
              >
                Group
              </button>
            </div>
          </div>
          <ConditionTree
            tree={formData.conditionTree}
            path={[]}
            onUpdate={updateCondition}
            onRemove={removeCondition}
            onAdd={() => addCondition([])}
          />
          {(!formData.conditionTree.children || formData.conditionTree.children.length === 0) && (
            <div className="text-center py-6">
              <p className="text-xs text-[var(--text-faint)]">
                No conditions set. The rule will trigger for all {formData.trigger.event || 'events'}.
              </p>
              <button
                onClick={() => addCondition([])}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
              >
                + Add First Condition
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions Section */}
      {activeSection === 'actions' && (
        <div className="p-4 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Play size={14} className="text-[var(--accent)]" />
              Then do these actions...
            </h3>
            <button
              onClick={addAction}
              className="px-2 py-1 rounded text-[10px] font-medium bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 flex items-center gap-1"
            >
              <Plus size={10} />
              Action
            </button>
          </div>
          <div className="space-y-2">
            {formData.actionNodes.map((action, index) => (
              <ActionNode
                key={action.nodeId}
                action={action}
                index={index}
                isFirst={index === 0}
                isLast={index === formData.actionNodes.length - 1}
                onUpdate={updates => updateAction(index, updates)}
                onRemove={() => removeAction(index)}
                onMoveUp={() => moveAction(index, index - 1)}
                onMoveDown={() => moveAction(index, index + 1)}
              />
            ))}
          </div>
          {formData.actionNodes.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-[var(--text-faint)]">
                No actions defined yet.
              </p>
              <button
                onClick={addAction}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
              >
                + Add First Action
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

//     CONDITION TREE COMPONENT                                             

function ConditionTree({ tree, path, onUpdate, onRemove, onAdd }) {
  if (tree.type === 'condition') {
    return (
      <ConditionNode
        condition={tree}
        path={path}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    );
  }

  return (
    <div className={`${path.length > 0 ? 'ml-4 pl-4 border-l-2 border-[var(--border-base)]' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <select
          value={tree.logic}
          onChange={e => {
            // Update logic at this level
          }}
          className="px-2 py-1 rounded text-[10px] font-bold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30"
        >
          <option value="AND">ALL OF (AND)</option>
          <option value="OR">ANY OF (OR)</option>
        </select>
        {path.length > 0 && (
          <button
            onClick={() => onRemove(path)}
            className="p-1 rounded text-[var(--text-faint)] hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {tree.children?.map((child, index) => (
          <ConditionTree
            key={index}
            tree={child}
            path={[...path, index]}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onAdd={onAdd}
          />
        ))}
        <button
          onClick={() => onAdd([...path, tree.children?.length || 0])}
          className="text-[10px] text-[var(--text-faint)] hover:text-[var(--accent)] flex items-center gap-1"
        >
          <Plus size={10} />
          Add condition
        </button>
      </div>
    </div>
  );
}

function ConditionNode({ condition, path, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-base)]">
      <input
        type="text"
        value={condition.field}
        onChange={e => onUpdate(path, { field: e.target.value })}
        placeholder="Field (e.g., status)"
        className="flex-1 px-2 py-1 rounded text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] focus:outline-none focus:border-[var(--accent)]"
      />
      <select
        value={condition.operator}
        onChange={e => onUpdate(path, { operator: e.target.value })}
        className="px-2 py-1 rounded text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)]"
      >
        {OPERATORS.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={condition.value}
        onChange={e => onUpdate(path, { value: e.target.value })}
        placeholder="Value"
        className="flex-1 px-2 py-1 rounded text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] focus:outline-none focus:border-[var(--accent)]"
      />
      <button
        onClick={() => onRemove(path)}
        className="p-1 rounded text-[var(--text-faint)] hover:text-red-400"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

//     ACTION NODE COMPONENT                                                 

function ActionNode({ action, index, isFirst, isLast, onUpdate, onRemove, onMoveUp, onMoveDown }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const actionType = ACTION_TYPES.find(t => t.value === action.type) || ACTION_TYPES[0];
  const Icon = actionType.icon;

  return (
    <div className="rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] overflow-hidden">
      <div className="flex items-center gap-2 p-2">
        <div className="text-[var(--text-faint)] cursor-move">
          <GripVertical size={14} />
        </div>
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ backgroundColor: `${actionType.color}20`, color: actionType.color }}
        >
          <Icon size={14} />
        </div>
        <span className="text-xs font-medium text-[var(--text-primary)] flex-1">
          {actionType.label}
        </span>
        <div className="flex items-center gap-1">
          {!isFirst && (
            <button onClick={onMoveUp} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-faint)]">
              <ChevronUp size={12} />
            </button>
          )}
          {!isLast && (
            <button onClick={onMoveDown} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-faint)]">
              <ChevronDown size={12} />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-faint)]"
          >
            <Settings size={12} />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-500/10 text-[var(--text-faint)] hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-[var(--border-base)]">
          <div className="pt-2 space-y-2">
            <div>
              <label className="text-[10px] text-[var(--text-faint)]">Action Type</label>
              <select
                value={action.type}
                onChange={e => onUpdate({ type: e.target.value })}
                className="w-full mt-1 px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
              >
                {ACTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <ActionConfig
              type={action.type}
              config={action.config}
              onChange={newConfig => onUpdate({ config: newConfig })}
            />
            <div className="flex items-center gap-4 pt-2">
              <div>
                <label className="text-[10px] text-[var(--text-faint)]">Delay (ms)</label>
                <input
                  type="number"
                  value={action.delayMs || 0}
                  onChange={e => onUpdate({ delayMs: parseInt(e.target.value) || 0 })}
                  className="w-20 mt-1 px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
                />
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id={`stopOnFailure-${index}`}
                  checked={action.stopOnFailure}
                  onChange={e => onUpdate({ stopOnFailure: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor={`stopOnFailure-${index}`} className="text-[10px] text-[var(--text-secondary)]">
                  Stop on failure
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionConfig({ type, config, onChange }) {
  const updateConfig = (key, value) => {
    onChange({ ...config, [key]: value });
  };

  switch (type) {
    case 'send_email':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={config.to || ''}
            onChange={e => updateConfig('to', e.target.value)}
            placeholder="To (email or {{variable}})"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
          <input
            type="text"
            value={config.subject || ''}
            onChange={e => updateConfig('subject', e.target.value)}
            placeholder="Subject"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
          <textarea
            value={config.body || ''}
            onChange={e => updateConfig('body', e.target.value)}
            placeholder="Email body (supports {{variables}})"
            rows={3}
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)] resize-none"
          />
        </div>
      );
    case 'send_notification':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={config.title || ''}
            onChange={e => updateConfig('title', e.target.value)}
            placeholder="Notification title"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
          <textarea
            value={config.message || ''}
            onChange={e => updateConfig('message', e.target.value)}
            placeholder="Message (supports {{variables}})"
            rows={2}
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)] resize-none"
          />
          <input
            type="text"
            value={(config.recipients || []).join(', ')}
            onChange={e => updateConfig('recipients', e.target.value.split(',').map(s => s.trim()))}
            placeholder="Recipients (comma-separated)"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
        </div>
      );
    case 'update_field':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={config.field || ''}
            onChange={e => updateConfig('field', e.target.value)}
            placeholder="Field name"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
          <input
            type="text"
            value={config.value || ''}
            onChange={e => updateConfig('value', e.target.value)}
            placeholder="New value (supports {{variables}})"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
        </div>
      );
    case 'create_task':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={config.title || ''}
            onChange={e => updateConfig('title', e.target.value)}
            placeholder="Task title"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
          <textarea
            value={config.description || ''}
            onChange={e => updateConfig('description', e.target.value)}
            placeholder="Task description"
            rows={2}
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)] resize-none"
          />
          <input
            type="text"
            value={config.assignee || ''}
            onChange={e => updateConfig('assignee', e.target.value)}
            placeholder="Assignee (user ID or {{variable}})"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
        </div>
      );
    case 'trigger_webhook':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={config.url || ''}
            onChange={e => updateConfig('url', e.target.value)}
            placeholder="Webhook URL"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
          <select
            value={config.method || 'POST'}
            onChange={e => updateConfig('method', e.target.value)}
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>
      );
    case 'delay':
      return (
        <div className="space-y-2">
          <input
            type="number"
            value={config.duration || 0}
            onChange={e => updateConfig('duration', parseInt(e.target.value) || 0)}
            placeholder="Duration"
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          />
          <select
            value={config.unit || 'seconds'}
            onChange={e => updateConfig('unit', e.target.value)}
            className="w-full px-2 py-1 rounded text-xs bg-[var(--bg-surface)] border border-[var(--border-base)]"
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      );
    default:
      return (
        <div className="text-xs text-[var(--text-faint)]">
          Configuration for {type} action
        </div>
      );
  }
}

//     RULES LIST COMPONENT                                                 

function RulesList({ rules, onEdit, onToggle, onDelete }) {
  if (rules.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-dashed border-[var(--border-base)]">
        <GitBranch size={32} className="mx-auto text-[var(--border-base)] mb-3" />
        <p className="text-sm text-[var(--text-faint)]">No automation rules yet</p>
        <p className="text-xs text-[var(--text-faint)] mt-1">
          Create your first rule or apply a template to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rules.map(rule => (
        <div
          key={rule.ruleId}
          className={`p-3 rounded-xl border transition-all ${
            rule.enabled
              ? 'border-[var(--border-base)] bg-[var(--bg-surface)]'
              : 'border-[var(--border-base)]/50 bg-[var(--bg-elevated)]/50 opacity-60'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold text-[var(--text-primary)]">{rule.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  rule.enabled
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-[var(--bg-overlay)] text-[var(--text-faint)] border border-[var(--border-base)]'
                }`}>
                  {rule.enabled ? 'ACTIVE' : 'INACTIVE'}
                </span>
                {rule.category === 'template' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    TEMPLATE
                  </span>
                )}
              </div>
              {rule.description && (
                <p className="text-[10px] text-[var(--text-faint)] mb-2">{rule.description}</p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-faint)]">
                <span className="flex items-center gap-1">
                  <Zap size={10} />
                  {rule.trigger?.event}
                </span>
                <span> </span>
                <span>{rule.actionNodes?.length || 0} actions</span>
                <span> </span>
                <span>Runs: {rule.executionCount || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onToggle(rule.ruleId, !rule.enabled)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                  rule.enabled
                    ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                    : 'border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)]'
                }`}
              >
                {rule.enabled ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button
                onClick={() => onEdit(rule)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Settings size={12} />
              </button>
              <button
                onClick={() => onDelete(rule.ruleId)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border-base)] text-[var(--text-faint)] hover:border-red-500/40 hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

//     EXECUTION HISTORY COMPONENT                                         

function ExecutionHistory({ executions, onView }) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-12">
        <History size={32} className="mx-auto text-[var(--border-base)] mb-3" />
        <p className="text-sm text-[var(--text-faint)]">No execution history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map(exec => (
        <div
          key={exec.executionId}
          onClick={() => onView(exec)}
          className="p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/30 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon status={exec.status} />
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  {exec.triggerEvent}
                </p>
                <p className="text-[10px] text-[var(--text-faint)]">
                  {new Date(exec.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-faint)]">
                {exec.actionResults?.length || 0} actions
              </p>
              {exec.durationMs && (
                <p className="text-[10px] text-[var(--text-faint)]">
                  {exec.durationMs}ms
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusIcon({ status }) {
  const icons = {
    completed: <CheckCircle size={16} className="text-green-400" />,
    failed: <AlertCircle size={16} className="text-red-400" />,
    pending: <Clock size={16} className="text-yellow-400" />,
    running: <RefreshCw size={16} className="text-blue-400 animate-spin" />,
    cancelled: <X size={16} className="text-gray-400" />,
  };
  return icons[status] || <Clock size={16} className="text-gray-400" />;
}

//     MODAL COMPONENTS                                                      

function TemplateModal({ templates, onApply, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'lead_management', 'project_workflow', 'finance', 'service', 'inventory'];
  
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <Modal open={true} onClose={onClose} title="Apply Template" size="lg">
      <div className="p-4 space-y-4">
        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 rounded text-[10px] font-medium capitalize ${
                selectedCategory === cat
                  ? 'bg-[var(--accent)] text-black'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-faint)] border border-[var(--border-base)]'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => onApply(template.id)}
              className="p-3 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                  <GitBranch size={14} className="text-[var(--accent)]" />
                </div>
                <span className="text-xs font-medium text-[var(--text-primary)]">{template.name}</span>
              </div>
              <p className="text-[10px] text-[var(--text-faint)] line-clamp-2">
                {template.description}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {template.tags?.map(tag => (
                  <span
                    key={tag}
                    className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-faint)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ExecutionDetailModal({ execution, onClose }) {
  return (
    <Modal open={true} onClose={onClose} title="Execution Details" size="lg">
      <div className="p-4 space-y-4">
        {/* Status Header */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)]">
          <StatusIcon status={execution.status} />
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] capitalize">
              {execution.status}
            </p>
            <p className="text-[10px] text-[var(--text-faint)]">
              {execution.executionId}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">
            Action Timeline
          </h4>
          <div className="space-y-2">
            {execution.actionResults?.map((result, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-elevated)]"
              >
                <div className="mt-0.5">
                  {result.status === 'completed' && <CheckCircle size={12} className="text-green-400" />}
                  {result.status === 'failed' && <AlertCircle size={12} className="text-red-400" />}
                  {result.status === 'skipped' && <Clock size={12} className="text-yellow-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    {result.actionType}
                  </p>
                  <p className="text-[10px] text-[var(--text-faint)]">
                    {result.nodeId}   {result.durationMs}ms
                  </p>
                  {result.errorMessage && (
                    <p className="text-[10px] text-red-400 mt-1">{result.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Context */}
        <div>
          <h4 className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">
            Trigger Context
          </h4>
          <pre className="p-2 rounded-lg bg-[var(--bg-elevated)] text-[10px] text-[var(--text-faint)] overflow-auto max-h-40">
            {JSON.stringify(execution.context, null, 2)}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
