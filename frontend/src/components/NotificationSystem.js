// NotificationSystem.js Ã¢â‚¬â€ Real-time notification display component
import React, { useEffect, useState } from 'react';
import { Bell, X, Clock, AlertTriangle, CheckCircle, Volume2, Smartphone } from 'lucide-react';
import { useReminders } from '../context/ReminderContext';

const NotificationSystem = () => {
    const { activeNotifications, dismissNotification, settings } = useReminders();
    const [displayedNotifications, setDisplayedNotifications] = useState([]);

    useEffect(() => {
        // Only show the most recent 3 notifications
        setDisplayedNotifications(activeNotifications.slice(0, 3));
    }, [activeNotifications]);

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'critical':
                return <AlertTriangle size={16} className="text-red-500" />;
            case 'high':
                return <Bell size={16} className="text-orange-500" />;
            case 'medium':
                return <Clock size={16} className="text-blue-500" />;
            default:
                return <CheckCircle size={16} className="text-[var(--text-muted)]" />;
        }
    };

    const getNotificationChannelIcons = (channels) => {
        return (
            <div className="flex gap-1 ml-2">
                {channels.includes('voice') && <Volume2 size={12} className="text-purple-500" />}
                {channels.includes('sms') && <Smartphone size={12} className="text-green-500" />}
                {channels.includes('in-app') && <Bell size={12} className="text-blue-500" />}
            </div>
        );
    };

    if (!settings.inAppNotifications || displayedNotifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-16 right-4 z-50 space-y-3 max-w-sm w-full overflow-visible">
            {displayedNotifications.map((notification, index) => (
                <div
                    key={notification.id}
                    className={`bg-[var(--bg-surface)] dark:bg-gray-800 border border-[var(--border-base)] dark:border-gray-700 rounded-lg shadow-lg p-4 transform transition-all duration-500 ease-out overflow-visible ${index === 0 ? 'animate-slide-in-right' : ''
                        } ${notification.isOverdue ? 'border-l-4 border-l-red-500' : notification.priority === 'critical' ? 'border-l-4 border-l-orange-500' : ''}`}
                    style={{
                        animationDelay: `${index * 100}ms`,
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="flex-shrink-0 mt-0.5">
                                {getPriorityIcon(notification.priority)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {notification.title}
                                    </h4>
                                    <button
                                        onClick={() => dismissNotification(notification.id)}
                                        className="flex-shrink-0 p-1 rounded-full hover:bg-[var(--bg-overlay)] dark:hover:bg-gray-700 transition-colors ml-2"
                                    >
                                        <X size={14} className="text-gray-400" />
                                    </button>
                                </div>

                                <p className="text-xs text-[var(--text-secondary)] dark:text-gray-300 mt-1 line-clamp-2">
                                    {notification.description}
                                </p>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${notification.isOverdue
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                                : notification.priority === 'critical'
                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                            }`}>
                                            {notification.timeToGo}
                                        </span>

                                        <span className="text-xs text-[var(--text-muted)] capitalize">
                                            {notification.module}
                                        </span>
                                    </div>

                                    {getNotificationChannelIcons(notification.channels)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress bar for time remaining */}
                    {!notification.isOverdue && (
                        <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${notification.priority === 'critical' ? 'bg-red-500' :
                                        notification.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                                    }`}
                                style={{
                                    width: notification.timeToGo === 'Now' ? '100%' : '75%' // Simplified for demo
                                }}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// Add CSS animations
const notificationStyles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.5s ease-out forwards;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = notificationStyles;
    document.head.appendChild(styleElement);
}

export default NotificationSystem;
