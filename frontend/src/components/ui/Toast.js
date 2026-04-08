import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

// Premium SaaS Toast - Stripe/Linear/Vercel inspired
const ToastItem = ({ toast, onRemove, index }) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const pausedProgressRef = useRef(100);
  
  const duration = toast.duration || 4000;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    
    const updateProgress = () => {
      if (isPaused) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = (remaining / duration) * 100;
      setProgress(newProgress);
      if (newProgress > 0) requestAnimationFrame(updateProgress);
      else handleExit();
    };
    
    const rafId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafId);
  }, [duration, isPaused]);

  const handleExit = () => {
    setIsVisible(false);
    setTimeout(onRemove, 400);
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
    pausedProgressRef.current = progress;
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    const elapsedRatio = (100 - pausedProgressRef.current) / 100;
    startTimeRef.current = Date.now() - (elapsedRatio * duration);
  };

  const configs = {
    error: {
      icon: AlertCircle,
      title: toast.title || 'Error',
      gradient: 'from-rose-500/95 via-red-500/95 to-red-600/95',
      border: 'border-rose-400/30',
      shadow: 'shadow-rose-500/20',
      iconBg: 'bg-rose-500/20',
      progress: 'bg-rose-400',
      accent: 'bg-rose-400',
    },
    warning: {
      icon: AlertTriangle,
      title: toast.title || 'Warning',
      gradient: 'from-amber-500/95 via-orange-500/95 to-orange-600/95',
      border: 'border-amber-400/30',
      shadow: 'shadow-amber-500/20',
      iconBg: 'bg-amber-500/20',
      progress: 'bg-amber-400',
      accent: 'bg-amber-400',
    },
    success: {
      icon: CheckCircle2,
      title: toast.title || 'Success',
      gradient: 'from-emerald-500/95 via-teal-500/95 to-teal-600/95',
      border: 'border-emerald-400/30',
      shadow: 'shadow-emerald-500/20',
      iconBg: 'bg-emerald-500/20',
      progress: 'bg-emerald-400',
      accent: 'bg-emerald-400',
    },
    info: {
      icon: Info,
      title: toast.title || 'Information',
      gradient: 'from-blue-500/95 via-indigo-500/95 to-indigo-600/95',
      border: 'border-blue-400/30',
      shadow: 'shadow-blue-500/20',
      iconBg: 'bg-blue-500/20',
      progress: 'bg-blue-400',
      accent: 'bg-blue-400',
    },
  };

  const config = configs[toast.type] || configs.info;
  const Icon = config.icon;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative w-full max-w-[440px] rounded-2xl overflow-hidden
        cursor-pointer select-none
        transition-all duration-500 ease-out
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'}
      `}
      style={{ transformOrigin: 'center right', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className={`
        relative bg-gradient-to-br ${config.gradient}
        backdrop-blur-2xl border ${config.border}
        rounded-2xl
        shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ${config.shadow}
        overflow-hidden
        transition-shadow duration-300
        hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.4)]
      `}>
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent pointer-events-none" />
        
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />

        <div className="relative flex items-start gap-4 p-5">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-11 h-11 rounded-xl ${config.iconBg}
            backdrop-blur-sm flex items-center justify-center
            border border-white/20 shadow-inner
            transition-transform duration-300 group-hover:scale-110
          `}>
            <Icon className="w-5 h-5 text-white drop-shadow-sm" strokeWidth={2.5} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-white font-semibold text-[15px] leading-tight tracking-tight drop-shadow-sm">
              {config.title}
            </h4>
            <p className="text-white/80 text-[13px] leading-relaxed mt-1 font-medium">
              {toast.message}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); handleExit(); }}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
              text-white/50 hover:text-white hover:bg-[var(--bg-surface)]/20
              active:bg-[var(--bg-surface)]/30 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/20">
          <div className={`h-full ${config.progress} transition-none`} 
            style={{ width: `${progress}%`, boxShadow: '0 0 10px currentColor' }} />
        </div>

        {/* Top accent */}
        <div className={`absolute top-0 left-4 right-4 h-[2px] ${config.accent} rounded-full opacity-60`} />
      </div>

      {/* Depth shadow */}
      <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-white/10 to-transparent -z-10 blur-2xl opacity-40"
        style={{ transform: 'translateY(8px) scale(0.95)' }} />
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { title, duration = 4000, ...rest } = options;
    setToasts(prev => [...prev, { id, message, type, title, duration, ...rest }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none" style={{ perspective: '1000px' }}>
        {toasts.map((toast, index) => (
          <div key={toast.id} className="pointer-events-auto"
            style={{
              transform: `translateZ(${-index * 4}px) scale(${1 - index * 0.02})`,
              opacity: index > 2 ? 0 : 1 - index * 0.15,
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              zIndex: toasts.length - index,
            }}>
            <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} index={index} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

// Standalone toast API
const createToastStyles = () => {
  const styleId = 'premium-toast-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes toast-slide-in {
      0% { transform: translateX(100%) scale(0.9) rotateY(-10deg); opacity: 0; }
      60% { transform: translateX(-4%) scale(1.02) rotateY(2deg); }
      100% { transform: translateX(0) scale(1) rotateY(0deg); opacity: 1; }
    }
    @keyframes toast-slide-out {
      0% { transform: translateX(0) scale(1); opacity: 1; }
      100% { transform: translateX(120%) scale(0.9); opacity: 0; }
    }
    @keyframes progress-shrink { from { width: 100%; } to { width: 0%; } }
    .premium-toast {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: toast-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .premium-toast:hover { transform: translateY(-2px) scale(1.01) !important; }
    .premium-toast.exiting { animation: toast-slide-out 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .premium-toast-progress { animation: progress-shrink linear forwards; }
  `;
  document.head.appendChild(style);
};

const getToastContainer = () => {
  createToastStyles();
  let container = document.getElementById('premium-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'premium-toast-container';
    container.style.cssText = `
      position: fixed; top: 24px; right: 24px; z-index: 99999;
      display: flex; flex-direction: column; gap: 12px;
      pointer-events: none; max-width: 440px; perspective: 1000px;
    `;
    document.body.appendChild(container);
  }
  return container;
};

const createToastElement = (type, title, message, duration) => {
  const configs = {
    error: {
      gradient: 'linear-gradient(135deg, rgba(244,63,94,0.95) 0%, rgba(239,68,68,0.95) 50%, rgba(220,38,38,0.95) 100%)',
      icon: 'âš ï¸', iconBg: 'rgba(244,63,94,0.25)', progress: '#fb7185', border: 'rgba(244,63,94,0.4)',
    },
    warning: {
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.95) 0%, rgba(249,115,22,0.95) 50%, rgba(234,88,12,0.95) 100%)',
      icon: 'âš¡', iconBg: 'rgba(245,158,11,0.25)', progress: '#fbbf24', border: 'rgba(245,158,11,0.4)',
    },
    success: {
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(20,184,166,0.95) 50%, rgba(13,148,136,0.95) 100%)',
      icon: 'âœ“', iconBg: 'rgba(16,185,129,0.25)', progress: '#34d399', border: 'rgba(16,185,129,0.4)',
    },
    info: {
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.95) 0%, rgba(99,102,241,0.95) 50%, rgba(79,70,229,0.95) 100%)',
      icon: 'â„¹', iconBg: 'rgba(59,130,246,0.25)', progress: '#60a5fa', border: 'rgba(59,130,246,0.4)',
    },
  };
  
  const c = configs[type] || configs.info;
  
  const el = document.createElement('div');
  el.className = 'premium-toast';
  el.style.cssText = `
    position: relative; width: 100%; max-width: 440px;
    background: ${c.gradient}; backdrop-filter: blur(20px);
    border-radius: 16px; border: 1px solid ${c.border};
    box-shadow: 0 20px 60px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset;
    overflow: hidden; pointer-events: auto; cursor: pointer;
  `;
  
  el.innerHTML = `
    <div style="position: absolute; inset: 0; border-radius: 16px; background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 50%, transparent 100%); pointer-events: none;"></div>
    <div style="position: absolute; top: 0; left: 16px; right: 16px; height: 2px; background: ${c.progress}; border-radius: 0 0 2px 2px; opacity: 0.7;"></div>
    <div style="display: flex; align-items: flex-start; gap: 14px; padding: 18px 18px 16px; position: relative;">
      <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; background: ${c.iconBg}; backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; font-size: 20px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">${c.icon}</div>
      <div style="flex: 1; min-width: 0; padding-top: 2px;">
        <div style="color: white; font-weight: 600; font-size: 15px; line-height: 1.3; letter-spacing: -0.01em; text-shadow: 0 1px 2px rgba(0,0,0,0.15);">${title}</div>
        <div style="color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.5; margin-top: 4px; font-weight: 500;">${message}</div>
      </div>
      <button class="toast-close" style="flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); background: transparent; border: none; cursor: pointer; font-size: 18px; font-weight: 300; transition: all 0.2s ease;" aria-label="Close">Ã—</button>
    </div>
    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(0,0,0,0.25); border-radius: 0 0 16px 16px; overflow: hidden;">
      <div class="premium-toast-progress" style="height: 100%; background: ${c.progress}; box-shadow: 0 0 8px ${c.progress}; animation-duration: ${duration}ms;"></div>
    </div>
  `;
  
  // Hover + close handlers
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'translateY(-2px) scale(1.01)';
    el.querySelector('.premium-toast-progress').style.animationPlayState = 'paused';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
    el.querySelector('.premium-toast-progress').style.animationPlayState = 'running';
  });
  
  const closeBtn = el.querySelector('.toast-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    el.classList.add('exiting');
    setTimeout(() => el.remove(), 400);
  });
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.15)'; closeBtn.style.color = 'white'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = 'rgba(255,255,255,0.5)'; });
  
  setTimeout(() => { if (el.parentNode) { el.classList.add('exiting'); setTimeout(() => el.remove(), 400); } }, duration);
  
  return el;
};

export const toast = {
  error(message, options = {}) {
    console.error(`[Toast Error] ${message}`);
    const container = getToastContainer();
    const { title = 'Error', duration = 4000 } = options;
    container.appendChild(createToastElement('error', title, message, duration));
  },
  warning(message, options = {}) {
    console.warn(`[Toast Warning] ${message}`);
    const container = getToastContainer();
    const { title = 'Warning', duration = 4000 } = options;
    container.appendChild(createToastElement('warning', title, message, duration));
  },
  success(message, options = {}) {
    console.log(`[Toast Success] ${message}`);
    const container = getToastContainer();
    const { title = 'Success', duration = 3000 } = options;
    container.appendChild(createToastElement('success', title, message, duration));
  },
  info(message, options = {}) {
    console.log(`[Toast Info] ${message}`);
    const container = getToastContainer();
    const { title = 'Information', duration = 4000 } = options;
    container.appendChild(createToastElement('info', title, message, duration));
  },
};

export default toast;
