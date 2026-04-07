import React, { useState } from 'react';
import { X, Bell, Calendar, Clock, RotateCcw, Repeat, User, AlertCircle, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useReminders } from '../context/ReminderContext';

const MODULES = [
  { id: 'crm', label: 'CRM / Sales', icon: '👥' },
  { id: 'hrm', label: 'HRM', icon: '👔' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'procurement', label: 'Procurement', icon: '🛒' },
  { id: 'project', label: 'Projects', icon: '📋' },
  { id: 'service', label: 'Service', icon: '🔧' },
  { id: 'installation', label: 'Installation', icon: '🏗️' },
  { id: 'general', label: 'General', icon: '📌' },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-green-500' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { id: 'high', label: 'High', color: 'bg-orange-500' },
  { id: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const TRIGGER_TYPES = [
  { id: 'date', label: 'Specific Date & Time', icon: Calendar, desc: 'Remind on a specific date' },
  { id: 'relative', label: 'Relative Time', icon: Clock, desc: 'Remind before/after an event' },
  { id: 'recurring', label: 'Recurring', icon: Repeat, desc: 'Remind on a repeating schedule' },
];

const WEEKDAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

export const CreateReminderModal = ({ isOpen, onClose, assignedUsers = [] }) => {
  const { addReminder } = useReminders();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    module: 'general',
    priority: 'medium',
    assignedTo: '',
    triggerType: 'date',
    
    // Date-based
    triggerDate: '',
    triggerTime: '09:00',
    
    // Relative-based
    relativeTo: 'createdAt',
    offsetValue: 1,
    offsetUnit: 'days',
    offsetDirection: 'after', // 'before' or 'after'
    
    // Recurring
    recurringPattern: 'weekly',
    recurringDays: [1, 2, 3, 4, 5], // Mon-Fri default
    recurringTime: '09:00',
    
    // Notification channels
    notificationChannels: ['in-app'],
    
    // Reference
    referenceId: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleChannel = (channel) => {
    setFormData(prev => {
      const channels = prev.notificationChannels.includes(channel)
        ? prev.notificationChannels.filter(c => c !== channel)
        : [...prev.notificationChannels, channel];
      return { ...prev, notificationChannels: channels };
    });
  };

  const toggleWeekday = (dayId) => {
    setFormData(prev => {
      const days = prev.recurringDays.includes(dayId)
        ? prev.recurringDays.filter(d => d !== dayId)
        : [...prev.recurringDays, dayId];
      return { ...prev, recurringDays: days.sort() };
    });
  };

  const calculateDueDate = () => {
    const now = new Date();
    
    switch (formData.triggerType) {
      case 'date':
        if (formData.triggerDate) {
          const [year, month, day] = formData.triggerDate.split('-').map(Number);
          const [hours, minutes] = formData.triggerTime.split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes);
        }
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
      case 'relative':
        const multiplier = formData.offsetUnit === 'minutes' ? 1 :
                          formData.offsetUnit === 'hours' ? 60 : 24 * 60;
        const minutes = formData.offsetValue * multiplier;
        const direction = formData.offsetDirection === 'before' ? -1 : 1;
        return new Date(now.getTime() + direction * minutes * 60 * 1000);
        
      case 'recurring':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  };

  const calculateRemindAt = () => {
    const dueDate = calculateDueDate();
    
    switch (formData.triggerType) {
      case 'date':
        return dueDate;
        
      case 'relative':
        return dueDate;
        
      case 'recurring':
        const [hours, minutes] = formData.recurringTime.split(':').map(Number);
        const nextDate = new Date();
        nextDate.setHours(hours, minutes, 0, 0);
        
        // If time passed today, move to next occurrence
        if (nextDate <= new Date()) {
          if (formData.recurringPattern === 'daily') {
            nextDate.setDate(nextDate.getDate() + 1);
          } else if (formData.recurringPattern === 'weekly') {
            // Find next selected day
            const currentDay = nextDate.getDay();
            const sortedDays = formData.recurringDays.sort((a, b) => a - b);
            let daysToAdd = 0;
            
            for (const day of sortedDays) {
              if (day > currentDay) {
                daysToAdd = day - currentDay;
                break;
              }
            }
            
            if (daysToAdd === 0 && sortedDays.length > 0) {
              daysToAdd = 7 - currentDay + sortedDays[0];
            }
            
            nextDate.setDate(nextDate.getDate() + daysToAdd);
          } else if (formData.recurringPattern === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
        }
        
        return nextDate;
        
      default:
        return dueDate;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.assignedTo) return;
    
    setIsSubmitting(true);
    
    try {
      const dueDate = calculateDueDate();
      const remindAt = calculateRemindAt();
      
      const reminderData = {
        title: formData.title,
        description: formData.description,
        module: formData.module,
        priority: formData.priority,
        assignedTo: formData.assignedTo,
        dueDate,
        remindAt,
        type: 'custom',
        isCustom: true,
        triggerType: formData.triggerType,
        notificationChannels: formData.notificationChannels,
        
        // Trigger-specific fields
        ...(formData.triggerType === 'date' && {
          triggerDate: new Date(formData.triggerDate + 'T' + formData.triggerTime),
        }),
        
        ...(formData.triggerType === 'relative' && {
          relativeTo: formData.relativeTo,
          offsetValue: formData.offsetDirection === 'before' ? -formData.offsetValue : formData.offsetValue,
          offsetUnit: formData.offsetUnit,
        }),
        
        ...(formData.triggerType === 'recurring' && {
          recurringPattern: formData.recurringPattern,
          recurringDays: formData.recurringDays,
          recurringTime: formData.recurringTime,
        }),
        
        ...(formData.referenceId && { referenceId: formData.referenceId }),
      };
      
      await addReminder(reminderData);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        module: 'general',
        priority: 'medium',
        assignedTo: '',
        triggerType: 'date',
        triggerDate: '',
        triggerTime: '09:00',
        relativeTo: 'createdAt',
        offsetValue: 1,
        offsetUnit: 'days',
        offsetDirection: 'after',
        recurringPattern: 'weekly',
        recurringDays: [1, 2, 3, 4, 5],
        recurringTime: '09:00',
        notificationChannels: ['in-app'],
        referenceId: '',
      });
    } catch (err) {
      console.error('Failed to create reminder:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Create Custom Reminder</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reminder title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Enter description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Module</label>
                <select
                  value={formData.module}
                  onChange={(e) => handleInputChange('module', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MODULES.map(m => (
                    <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Assign To *</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select user...</option>
                {assignedUsers.map(user => (
                  <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Trigger Type Selection */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-3">When to Remind</label>
            <div className="grid grid-cols-3 gap-3">
              {TRIGGER_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = formData.triggerType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleInputChange('triggerType', type.id)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div className={`font-medium ${isSelected ? 'text-blue-700' : ''}`}>{type.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Trigger Configuration */}
          <div className="border-t pt-4 bg-gray-50 rounded-lg p-4">
            {formData.triggerType === 'date' && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Specific Date & Time
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.triggerDate}
                      onChange={(e) => handleInputChange('triggerDate', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.triggerTime}
                      onChange={(e) => handleInputChange('triggerTime', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.triggerType === 'relative' && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Relative Time
                </h4>
                <div className="grid grid-cols-4 gap-4 items-end">
                  <div className="col-span-1">
                    <label className="block text-sm mb-1">When</label>
                    <select
                      value={formData.offsetDirection}
                      onChange={(e) => handleInputChange('offsetDirection', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="after">After</option>
                      <option value="before">Before</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm mb-1">Value</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.offsetValue}
                      onChange={(e) => handleInputChange('offsetValue', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-1">Unit</label>
                    <select
                      value={formData.offsetUnit}
                      onChange={(e) => handleInputChange('offsetUnit', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Example: Remind {formData.offsetValue} {formData.offsetUnit} {formData.offsetDirection} event
                </p>
              </div>
            )}

            {formData.triggerType === 'recurring' && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Recurring Schedule
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1">Pattern</label>
                    <select
                      value={formData.recurringPattern}
                      onChange={(e) => handleInputChange('recurringPattern', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {formData.recurringPattern === 'weekly' && (
                    <div>
                      <label className="block text-sm mb-2">Days of Week</label>
                      <div className="flex gap-2">
                        {WEEKDAYS.map(day => {
                          const isSelected = formData.recurringDays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => toggleWeekday(day.id)}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                isSelected 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.recurringTime}
                      onChange={(e) => handleInputChange('recurringTime', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Channels */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-3">Notify Via</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => toggleChannel('in-app')}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  formData.notificationChannels.includes('in-app')
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Bell className="w-4 h-4" />
                In-App
              </button>
              <button
                type="button"
                onClick={() => toggleChannel('email')}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  formData.notificationChannels.includes('email')
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => toggleChannel('sms')}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  formData.notificationChannels.includes('sms')
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                SMS
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.assignedTo}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Create Reminder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReminderModal;
