// ReminderContext.js — Centralized reminder management with real-time notifications
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/apiClient';

const ReminderContext = createContext();
const TENANT_ID = 'solarcorp';

export const useReminders = () => {
    const context = useContext(ReminderContext);
    if (!context) {
        throw new Error('useReminders must be used within a ReminderProvider');
    }
    return context;
};

export const ReminderProvider = ({ children }) => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeNotifications, setActiveNotifications] = useState([]);
    const [settings, setSettings] = useState({
        voiceAlerts: true,
        smsNotifications: true,
        inAppNotifications: true,
        notificationSound: true,
        autoMarkComplete: false,
        reminderInterval: 15 // minutes
    });

    // Fetch reminders from API
    const fetchReminders = useCallback(async () => {
        try {
            setLoading(true);
            console.log('[DEBUG] Fetching reminders from API...');
            const res = await api.get('/reminders', {
                tenantId: TENANT_ID,
                includeOverdue: true,
                limit: 100
            });
            console.log('[DEBUG] API response:', res);
            const data = res?.data?.reminders || res?.data?.data || [];
            console.log('[DEBUG] Extracted data:', data);
            console.log('[DEBUG] Data length:', data.length);
            // Convert date strings to Date objects
            const parsed = data.map(r => ({
                ...r,
                dueDate: r.dueDate ? new Date(r.dueDate) : new Date(),
                createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
                updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date()
            }));
            console.log('[DEBUG] Parsed reminders:', parsed);
            setReminders(parsed);
        } catch (err) {
            console.error('[DEBUG] Error fetching reminders:', err);
            console.error('[DEBUG] Error response:', err.response);
            // No fake data - empty array on error
            setReminders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    // Refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(fetchReminders, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchReminders]);

    const notificationTimeout = useRef(null);
    const voiceRef = useRef(null);

    // Initialize speech synthesis
    useEffect(() => {
        if ('speechSynthesis' in window) {
            voiceRef.current = window.speechSynthesis;
        }
    }, []);

    // Real-time reminder checking
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const upcomingReminders = reminders.filter(reminder => {
                if (reminder.status === 'completed' || reminder.status === 'cancelled') return false;

                const timeDiff = reminder.dueDate - now;
                const isUpcoming = timeDiff > 0 && timeDiff <= settings.reminderInterval * 60 * 1000;
                const isOverdue = timeDiff < 0 && reminder.status !== 'overdue';

                return isUpcoming || isOverdue;
            });

            upcomingReminders.forEach(reminder => {
                triggerNotification(reminder);
            });
        };

        // Check immediately and then every 5 minutes (reduced from 1 minute to prevent refresh loops)
        checkReminders();
        const interval = setInterval(checkReminders, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [settings.reminderInterval]);

    // Trigger notification for a reminder
    const triggerNotification = useCallback((reminder) => {
        const notificationId = `notif-${reminder.id}-${Date.now()}`;
        const now = new Date();
        const timeDiff = reminder.dueDate - now;
        const isOverdue = timeDiff < 0;

        // Update reminder status if overdue
        if (isOverdue && reminder.status !== 'overdue') {
            updateReminderStatus(reminder.id, 'overdue');
        }

        // Check if we already have an active notification for this reminder
        const existingNotif = activeNotifications.find(n => n.reminderId === reminder.id);
        if (existingNotif) return;

        const notification = {
            id: notificationId,
            reminderId: reminder.id,
            title: reminder.title,
            description: reminder.description,
            priority: reminder.priority,
            module: reminder.module,
            timestamp: new Date(),
            isOverdue,
            timeToGo: isOverdue ? 'Overdue' : formatTimeRemaining(timeDiff),
            channels: reminder.notificationChannels || ['in-app']
        };

        // Add to active notifications
        setActiveNotifications(prev => [...prev, notification]);

        // Trigger different notification channels
        if (settings.inAppNotifications && notification.channels.includes('in-app')) {
            showInAppNotification(notification);
        }

        if (settings.voiceAlerts && notification.channels.includes('voice')) {
            speakNotification(notification);
        }

        if (settings.smsNotifications && notification.channels.includes('sms')) {
            sendSMSNotification(notification);
        }

        // Auto-remove notification after 30 seconds
        setTimeout(() => {
            dismissNotification(notificationId);
        }, 30000);
    }, [activeNotifications, settings]);

    // Show in-app notification
    const showInAppNotification = (notification) => {
        // This will be handled by the notification component
        if (settings.notificationSound) {
            playNotificationSound();
        }
    };

    // Voice notification
    const speakNotification = (notification) => {
        if (voiceRef.current && settings.voiceAlerts) {
            const utterance = new SpeechSynthesisUtterance(
                `Reminder: ${notification.title}. ${notification.timeToGo}.`
            );
            utterance.voice = voiceRef.current.getVoices().find(voice => voice.lang === 'en-US') || null;
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            voiceRef.current.speak(utterance);
        }
    };

    // SMS notification (mock implementation)
    const sendSMSNotification = (notification) => {
        console.log(`📱 SMS Sent: ${notification.title} - Due ${notification.timeToGo}`);
        // In real implementation, integrate with SMS service like Twilio
    };

    // Play notification sound
    const playNotificationSound = () => {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYfBz2U4fTNfC4GMnzN8+BTEA1XqOfxuWYdBzuU3fTMfS4GNH/Q8+BVFAxXpuXzu2UcBTiN2fDHdSsFLYnQ9tqQPwkSY7zs4KdUEwlFnt7xwGoiBC14yPHdkUEPExzS7+ORS');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Ignore audio play errors
        });
    };

    // Utility functions
    const formatTimeRemaining = (milliseconds) => {
        const totalMinutes = Math.floor(milliseconds / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return 'Now';
        }
    };

    // Reminder management functions with API integration
    const addReminder = useCallback(async (reminderData) => {
        try {
            console.log('[DEBUG] Creating reminder:', reminderData);
            const res = await api.post('/reminders', reminderData, { tenantId: TENANT_ID });
            console.log('[DEBUG] Created reminder response:', res);
            const newReminder = res?.data?.data || res?.data;
            if (newReminder) {
                setReminders(prev => [...prev, { ...newReminder, dueDate: new Date(newReminder.dueDate) }]);
                // Refresh list to ensure sync
                fetchReminders();
                return newReminder.id;
            }
        } catch (err) {
            console.error('[DEBUG] Error creating reminder:', err);
            // Fallback to local creation
            const newReminder = {
                id: `r${Date.now()}`,
                ...reminderData,
                createdAt: new Date(),
                status: 'pending'
            };
            setReminders(prev => [...prev, newReminder]);
            return newReminder.id;
        }
    }, [fetchReminders]);

    const updateReminder = useCallback((id, updates) => {
        setReminders(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    }, []);

    const updateReminderStatus = useCallback((id, status) => {
        setReminders(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }, []);

    const deleteReminder = useCallback((id) => {
        setReminders(prev => prev.filter(r => r.id !== id));
    }, []);

    const dismissNotification = useCallback((notificationId) => {
        setActiveNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    const dismissAllNotifications = useCallback(() => {
        setActiveNotifications([]);
    }, []);

    const snoozeReminder = useCallback((id, snoozeMinutes = 15) => {
        const newDueDate = new Date(Date.now() + snoozeMinutes * 60 * 1000);
        updateReminder(id, { dueDate: newDueDate });
    }, [updateReminder]);

    const markComplete = useCallback((id) => {
        updateReminderStatus(id, 'completed');
        // Remove any active notifications for this reminder
        setActiveNotifications(prev => prev.filter(n => n.reminderId !== id));
    }, [updateReminderStatus]);

    // Filter functions
    const getUpcomingReminders = useCallback(() => {
        const now = new Date();
        return reminders
            .filter(r => r.status === 'pending' && r.dueDate > now)
            .sort((a, b) => a.dueDate - b.dueDate);
    }, [reminders]);

    const getOverdueReminders = useCallback(() => {
        const now = new Date();
        return reminders
            .filter(r => (r.status === 'pending' || r.status === 'overdue') && r.dueDate < now)
            .sort((a, b) => a.dueDate - b.dueDate);
    }, [reminders]);

    const getRemindersByModule = useCallback((module) => {
        return reminders.filter(r => r.module === module);
    }, [reminders]);

    const getRemindersByPriority = useCallback((priority) => {
        return reminders.filter(r => r.priority === priority && r.status === 'pending');
    }, [reminders]);

    // Get reminders for current user based on role
    const getRemindersForUser = useCallback((userRole, userEmail) => {
        const roleModuleMap = {
            'Sales': ['sales', 'crm', 'quotation'],
            'Survey Engineer': ['survey'],
            'Design Engineer': ['design'],
            'Project Manager': ['project', 'installation', 'commissioning'],
            'Store Manager': ['inventory', 'procurement'],
            'Procurement Officer': ['procurement', 'logistics'],
            'Finance': ['finance'],
            'Technician': ['installation', 'service'],
            'Service Manager': ['service', 'commissioning'],
            'Admin': ['all']
        };

        const allowedModules = roleModuleMap[userRole] || ['all'];

        if (allowedModules.includes('all')) {
            return reminders.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
        }

        return reminders.filter(r => {
            if (r.status === 'completed' || r.status === 'cancelled') return false;
            return allowedModules.includes(r.module) ||
                r.assignedTo === userEmail ||
                r.createdBy === userEmail;
        });
    }, [reminders]);

    const updateSettings = useCallback((newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    const value = {
        // Data
        reminders,
        activeNotifications,
        settings,

        // Actions
        addReminder,
        updateReminder,
        updateReminderStatus,
        deleteReminder,
        markComplete,
        snoozeReminder,

        // Notifications
        dismissNotification,
        dismissAllNotifications,

        // Filters
        getUpcomingReminders,
        getOverdueReminders,
        getRemindersByModule,
        getRemindersByPriority,

        // Settings
        updateSettings,

        // Role-based filtering
        getRemindersForUser,

        // Stats
        totalReminders: reminders.length,
        upcomingCount: reminders.filter(r => r.status === 'pending' && r.dueDate > new Date()).length,
        overdueCount: reminders.filter(r => (r.status === 'pending' || r.status === 'overdue') && r.dueDate < new Date()).length,
        criticalCount: reminders.filter(r => r.priority === 'critical' && r.status === 'pending').length,
    };

    return (
        <ReminderContext.Provider value={value}>
            {children}
        </ReminderContext.Provider>
    );
};

export default ReminderProvider;
