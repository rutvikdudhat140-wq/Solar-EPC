import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import reminderApi from '../lib/reminderApi';
import { useAuth } from './AuthContext';
import { getReminderModuleInfo, normalizeReminderModule } from '../components/Reminder/reminderModules';
import { io } from 'socket.io-client';

const ReminderContext = createContext();

const DEFAULT_SETTINGS = {
  voiceAlerts: true,
  smsNotifications: true,
  inAppNotifications: true,
  notificationSound: true,
  autoMarkComplete: false,
  reminderInterval: 15,
};

const parseDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getReminderId = (reminder) => String(reminder?.id || reminder?._id || '');

const normalizeReminder = (reminder = {}) => {
  const assignedTo = reminder.assignedTo || null;
  const createdBy = reminder.createdBy || null;

  return {
    ...reminder,
    id: getReminderId(reminder),
    module: normalizeReminderModule(reminder.module),
    dueDate: parseDate(reminder.dueDate) || new Date(),
    remindAt: parseDate(reminder.remindAt),
    createdAt: parseDate(reminder.createdAt),
    updatedAt: parseDate(reminder.updatedAt),
    assignedTo,
    createdBy,
    notificationChannels: Array.isArray(reminder.notificationChannels)
      ? reminder.notificationChannels
      : ['in-app'],
    metadata: reminder.metadata && typeof reminder.metadata === 'object' ? reminder.metadata : {},
    recurring: Boolean(reminder.recurringPattern),
  };
};

const getUserLabel = (userRef) => {
  if (!userRef) return '';
  if (typeof userRef === 'string') return userRef;
  if (userRef.name) return userRef.name;
  if (userRef.firstName || userRef.lastName) return `${userRef.firstName || ''} ${userRef.lastName || ''}`.trim();
  if (userRef.email) return userRef.email;
  return String(userRef.id || userRef._id || '');
};

export const useReminders = () => {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
};

export const ReminderProvider = ({ children }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [wsConnected, setWsConnected] = useState(false);
  const voiceRef = useRef(null);
  const socketRef = useRef(null);

  const fetchReminders = useCallback(async (retryCount = 0) => {
    // Check if user is authenticated before fetching
    const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      setReminders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await reminderApi.getAll({
        includeOverdue: true,
        limit: 250,
        status: 'all',
      });
      console.log('[Reminders] Raw API response:', response);

      // Handle different response formats
      let list = [];
      if (response?.success && Array.isArray(response?.reminders)) {
        // Standard format: { success: true, reminders: [...], total: n }
        list = response.reminders;
      } else if (Array.isArray(response?.reminders)) {
        list = response.reminders;
      } else if (Array.isArray(response?.data?.reminders)) {
        list = response.data.reminders;
      } else if (Array.isArray(response?.data)) {
        list = response.data;
      } else if (Array.isArray(response)) {
        list = response;
      }

      console.log('[Reminders] Extracted list:', list.length, 'items');
      console.log('[Reminders] Response keys:', Object.keys(response || {}));

      if (list.length === 0) {
        console.warn('[Reminders] No reminders found. Response:', response);
      }

      setReminders(list.map(normalizeReminder));
      if (list.length === 0 && retryCount < 1) {
        console.log('[Reminders] No reminders found, will retry once...');
        setTimeout(() => fetchReminders(retryCount + 1), 2000);
      }
    } catch (error) {
      console.error('[Reminders] Failed to fetch live reminders:', error);
      // If error is 401 Unauthorized, don't retry
      if (error?.response?.status === 401 || error?.status === 401) {
        console.log('[Reminders] Unauthorized (401), clearing reminders and stopping retries');
        setReminders([]);
        return;
      }
      if (retryCount < 2) {
        console.log(`[Reminders] Retrying... (${retryCount + 1}/2)`);
        setTimeout(() => fetchReminders(retryCount + 1), 3000);
      } else {
        setReminders([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchReminders();
  }, [fetchReminders, user]);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(fetchReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchReminders, user]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      voiceRef.current = window.speechSynthesis;
    }
  }, []);

  // WebSocket connection for real-time reminders
  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return;

    const WS_URL = process.env.REACT_APP_API_BASE_URL?.replace('http', 'ws') || 'ws://localhost:3000';

    try {
      const socket = io(`${WS_URL}/reminders`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Reminder WebSocket] Connected');
        setWsConnected(true);
        socket.emit('subscribe-reminders');
      });

      socket.on('disconnect', () => {
        console.log('[Reminder WebSocket] Disconnected');
        setWsConnected(false);
      });

      socket.on('new-reminder', (data) => {
        console.log('[Reminder WebSocket] New reminder:', data);
        fetchReminders();
        // Show notification
        const notification = {
          id: `ws-${Date.now()}`,
          reminderId: data.data?.id,
          title: data.data?.title || 'New Reminder',
          description: data.data?.description,
          priority: data.data?.priority,
          module: data.data?.module,
          timestamp: new Date(),
          isOverdue: false,
          timeToGo: 'Just received',
          channels: ['in-app'],
        };
        setActiveNotifications((prev) => [...prev, notification]);
        if (settings.notificationSound) {
          playNotificationSound();
        }
      });

      socket.on('reminder-triggered', (data) => {
        console.log('[Reminder WebSocket] Reminder triggered:', data);
        fetchReminders();
        const notification = {
          id: `trigger-${Date.now()}`,
          reminderId: data.data?.id,
          title: data.data?.title || 'Reminder Alert',
          description: data.data?.description,
          priority: data.data?.priority,
          module: data.data?.module,
          timestamp: new Date(),
          isOverdue: new Date(data.data?.dueDate) < new Date(),
          timeToGo: new Date(data.data?.dueDate) < new Date() ? 'Overdue' : 'Due now',
          channels: ['in-app'],
        };
        setActiveNotifications((prev) => [...prev, notification]);
        if (settings.notificationSound) {
          playNotificationSound();
        }
        if (settings.voiceAlerts) {
          speakNotification(notification);
        }
      });

      socket.on('reminder-updated', () => {
        fetchReminders();
      });

      socket.on('reminder-completed', (data) => {
        setActiveNotifications((prev) => prev.filter((n) => n.reminderId !== data.data?.id));
        fetchReminders();
      });

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (err) {
      console.error('[Reminder WebSocket] Connection error:', err);
    }
  }, [user?.id, fetchReminders, settings.notificationSound, settings.voiceAlerts]);

  const playNotificationSound = useCallback(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYfBz2U4fTNfC4GMnzN8+BTEA1XqOfxuWYdBzuU3fTMfS4GNH/Q8+BVFAxXpuXzu2UcBTiN2fDHdSsFLYnQ9tqQPwkSY7zs4KdUEwlFnt7xwGoiBC14yPHdkUEPExzS7+ORS');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  const speakNotification = useCallback((notification) => {
    if (!voiceRef.current || !settings.voiceAlerts) return;
    const utterance = new SpeechSynthesisUtterance(`Reminder: ${notification.title}. ${notification.timeToGo}.`);
    utterance.voice = voiceRef.current.getVoices().find((voice) => voice.lang === 'en-US') || null;
    utterance.rate = 0.9;
    utterance.pitch = 1.05;
    voiceRef.current.speak(utterance);
  }, [settings.voiceAlerts]);

  const dismissNotification = useCallback(async (notificationId) => {
    // Find the notification to get the reminderId
    const notification = activeNotifications.find((n) => n.id === notificationId);
    if (notification?.reminderId) {
      try {
        // Cancel the reminder on the backend
        await reminderApi.cancel(notification.reminderId);
      } catch (error) {
        console.error('Failed to cancel reminder:', error);
      }
    }
    setActiveNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
  }, [activeNotifications]);

  const dismissAllNotifications = useCallback(async () => {
    // Cancel all reminders associated with active notifications
    const cancelPromises = activeNotifications.map((notification) => {
      if (notification?.reminderId) {
        return reminderApi.cancel(notification.reminderId).catch((error) => {
          console.error('Failed to cancel reminder:', error);
        });
      }
      return Promise.resolve();
    });
    await Promise.all(cancelPromises);
    setActiveNotifications([]);
  }, [activeNotifications]);

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter((reminder) => reminder.status === 'pending' && reminder.dueDate > now)
      .sort((left, right) => left.dueDate - right.dueDate);
  }, [reminders]);

  const overdueReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter((reminder) => (reminder.status === 'pending' || reminder.status === 'overdue') && reminder.dueDate < now)
      .sort((left, right) => left.dueDate - right.dueDate);
  }, [reminders]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const thresholdMs = settings.reminderInterval * 60 * 1000;
      const candidates = reminders.filter((reminder) => {
        if (reminder.status === 'completed' || reminder.status === 'cancelled') return false;
        const dueDate = reminder.dueDate;
        const timeDiff = dueDate - now;
        return timeDiff <= thresholdMs;
      });

      candidates.forEach((reminder) => {
        const reminderId = reminder.id;
        const alreadyActive = activeNotifications.some((notification) => notification.reminderId === reminderId);
        if (alreadyActive) return;

        const timeDiff = reminder.dueDate - now;
        const isOverdue = timeDiff < 0 || reminder.status === 'overdue';
        const notification = {
          id: `notif-${reminderId}-${Date.now()}`,
          reminderId,
          title: reminder.title,
          description: reminder.description,
          priority: reminder.priority,
          module: reminder.module,
          timestamp: new Date(),
          isOverdue,
          timeToGo: isOverdue ? 'Overdue' : `${Math.max(1, Math.round(timeDiff / 60000))}m left`,
          channels: reminder.notificationChannels || ['in-app'],
        };

        setActiveNotifications((prev) => [...prev, notification]);

        if (settings.notificationSound && notification.channels.includes('in-app')) {
          playNotificationSound();
        }
        if (notification.channels.includes('voice')) {
          speakNotification(notification);
        }

        setTimeout(() => {
          dismissNotification(notification.id);
        }, 30000);
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeNotifications, dismissNotification, playNotificationSound, reminders, settings, speakNotification]);

  const syncReminder = useCallback((nextReminder) => {
    const normalized = normalizeReminder(nextReminder);
    setReminders((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === normalized.id);
      if (existingIndex === -1) return [normalized, ...prev];
      const updated = [...prev];
      updated[existingIndex] = normalized;
      return updated;
    });
    return normalized;
  }, []);

  const addReminder = useCallback(async (payload) => {
    const response = await reminderApi.create(payload);
    const created = response?.data || response;
    return syncReminder(created);
  }, [syncReminder]);

  const updateReminder = useCallback(async (id, updates) => {
    const response = await reminderApi.update(id, updates);
    const updated = response?.data || response;
    return syncReminder(updated);
  }, [syncReminder]);

  const updateReminderStatus = useCallback(async (id, status) => {
    return updateReminder(id, { status });
  }, [updateReminder]);

  const deleteReminder = useCallback(async (id) => {
    await reminderApi.delete(id);
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
    setActiveNotifications((prev) => prev.filter((notification) => notification.reminderId !== id));
  }, []);

  const snoozeReminder = useCallback(async (id, snoozeMinutes = 15) => {
    const response = await reminderApi.snooze(id, snoozeMinutes);
    const updated = response?.data || response;
    return syncReminder(updated);
  }, [syncReminder]);

  const markComplete = useCallback(async (id) => {
    const response = await reminderApi.complete(id);
    const updated = response?.data || response;
    setActiveNotifications((prev) => prev.filter((notification) => notification.reminderId !== id));
    return syncReminder(updated);
  }, [syncReminder]);

  const cancelReminder = useCallback(async (id) => {
    const response = await reminderApi.cancel(id);
    const updated = response?.data || response;
    setActiveNotifications((prev) => prev.filter((notification) => notification.reminderId !== id));
    return syncReminder(updated);
  }, [syncReminder]);

  const getUpcomingReminders = useCallback(() => upcomingReminders, [upcomingReminders]);
  const getOverdueReminders = useCallback(() => overdueReminders, [overdueReminders]);
  const getRemindersByModule = useCallback(
    (moduleId) => reminders.filter((reminder) => reminder.module === normalizeReminderModule(moduleId)),
    [reminders],
  );
  const getRemindersByPriority = useCallback(
    (priority) => reminders.filter((reminder) => reminder.priority === priority && reminder.status === 'pending'),
    [reminders],
  );

  const getRemindersForUser = useCallback(() => {
    if (!user) return reminders.filter((reminder) => reminder.status !== 'completed' && reminder.status !== 'cancelled');
    const currentUserId = String(user.id || user._id || '');
    const currentUserEmail = String(user.email || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin', 'super admin'].includes(String(user.role || '').toLowerCase()) || user.isSuperAdmin;

    return reminders.filter((reminder) => {
      if (reminder.status === 'completed' || reminder.status === 'cancelled') return false;
      if (isAdmin) return true;

      const assignedId = String(reminder.assignedTo?.id || reminder.assignedTo?._id || reminder.assignedTo || '');
      const assignedEmail = String(reminder.assignedTo?.email || '').toLowerCase();
      const createdId = String(reminder.createdBy?.id || reminder.createdBy?._id || reminder.createdBy || '');
      const createdEmail = String(reminder.createdBy?.email || '').toLowerCase();

      return assignedId === currentUserId
        || createdId === currentUserId
        || assignedEmail === currentUserEmail
        || createdEmail === currentUserEmail;
    });
  }, [reminders, user]);

  const updateSettings = useCallback((nextSettings) => {
    setSettings((prev) => ({ ...prev, ...nextSettings }));
  }, []);

  const counts = useMemo(() => {
    const pending = reminders.filter((reminder) => reminder.status === 'pending').length;
    const completed = reminders.filter((reminder) => reminder.status === 'completed').length;
    const overdue = overdueReminders.length;
    const critical = reminders.filter((reminder) => reminder.priority === 'critical' && reminder.status === 'pending').length;
    return {
      totalReminders: reminders.length,
      pendingCount: pending,
      completedCount: completed,
      upcomingCount: upcomingReminders.length,
      overdueCount: overdue,
      criticalCount: critical,
    };
  }, [overdueReminders.length, reminders, upcomingReminders.length]);

  const value = {
    reminders,
    loading,
    activeNotifications,
    settings,
    wsConnected,
    addReminder,
    updateReminder,
    updateReminderStatus,
    deleteReminder,
    markComplete,
    cancelReminder,
    snoozeReminder,
    dismissNotification,
    dismissAllNotifications,
    getUpcomingReminders,
    getOverdueReminders,
    getRemindersByModule,
    getRemindersByPriority,
    getRemindersForUser,
    updateSettings,
    fetchReminders,
    normalizeReminder,
    getReminderId,
    getReminderModuleInfo,
    getUserLabel,
    ...counts,
  };

  return (
    <ReminderContext.Provider value={value}>
      {children}
    </ReminderContext.Provider>
  );
};

export default ReminderProvider;
