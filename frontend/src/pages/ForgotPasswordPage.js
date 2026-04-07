import React, { useState, useEffect, useRef } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle, Shield, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { api } from '../lib/apiClient';
import { Input, Label } from '../components/ui/Input';
import { APP_CONFIG } from '../config/app.config';

const ForgotPasswordPage = () => {
  // Step state: 1 = Email, 2 = OTP Verification, 3 = Reset Password
  const [step, setStep] = useState(1);
  
  // Email state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OTP state
  const [otp, setOtp] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Resend OTP timer (30 seconds)
  const RESEND_COOLDOWN = 30;
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  
  // Refs for auto-focus
  const otpInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/send-otp', { email });
      
      if (response.success) {
        // Move to Step 2: OTP Verification
        setStep(2);
        setCanResend(false);
        setResendTimer(RESEND_COOLDOWN);
      } else {
        if (response.remainingTime) {
          setResendTimer(response.remainingTime);
        }
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setVerifyLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', { email, otp });

      if (response.success) {
        // Move to Step 3: Reset Password
        setStep(3);
      } else {
        setError(response.message || 'OTP verification failed');
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setResetLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        email,
        newPassword,
      });

      if (response.success) {
        setResetSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval = null;
    if (step === 2 && !resetSuccess && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resetSuccess, resendTimer]);

  // Auto-focus OTP input on step 2
  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Auto-focus password input on step 3
  useEffect(() => {
    if (step === 3 && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [step]);

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setError('');
    setLoading(true);
    
    try {
      const response = await api.post('/auth/send-otp', { email });
      
      if (response.success) {
        setCanResend(false);
        setResendTimer(RESEND_COOLDOWN);
        setOtp(''); // Clear previous OTP
      } else {
        if (response.remainingTime) {
          setResendTimer(response.remainingTime);
        }
        setError(response.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    } else {
      window.location.href = '/';
    }
  };

  // Progress indicator
  const renderProgress = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`w-2 h-2 rounded-full transition-colors ${
            s === step
              ? 'bg-[var(--primary)]'
              : s < step
              ? 'bg-[var(--green)]'
              : 'bg-[var(--border-base)]'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(var(--border-base) 1px,transparent 1px),linear-gradient(90deg,var(--border-base) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(to bottom right, var(--primary), var(--primary-light))` }}>
            <Shield size={20} className="text-white" />
          </div>
          <span className="font-extrabold text-lg text-[var(--text-primary)]">{APP_CONFIG.name}</span>
        </div>

        {!resetSuccess && renderProgress()}

        <div className="glass-card p-6">
          {resetSuccess ? (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-[var(--green)]" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">Password Reset!</h3>
                <p className="text-[11px] text-[var(--text-muted)] text-center">
                  Your password has been successfully reset.<br />Redirecting to login page...
                </p>
              </div>
              <button onClick={() => window.location.href = '/'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #3b82f6cc, #1d4ed888)' }}>
                Go to Login Now
              </button>
            </>
          ) : step === 1 ? (
            <>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">Forgot Password?</h3>
              <p className="text-[11px] text-[var(--text-muted)] mb-6 text-center">Enter your email address and we'll send you an OTP</p>
              {error && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 flex items-center gap-2">
                  <Shield size={14} />{error}
                </div>
              )}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label className="text-[11px]">Email address</Label>
                  <Input type="email" placeholder="you@solarcorp.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #3b82f6cc, #1d4ed888)' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={14} /> Send OTP</>}
                </button>
              </form>
            </>
          ) : step === 2 ? (
            <>
              <div className="flex flex-col items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-3">
                  <KeyRound size={24} className="text-[var(--green)]" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">Verify OTP</h3>
                <p className="text-[11px] text-[var(--text-muted)] text-center">Enter the 6-digit OTP sent to<br /><span className="text-[var(--text-primary)] font-medium">{email}</span></p>
                <p className="text-[10px] text-[var(--text-faint)] mt-2">Valid for 5 minutes</p>
              </div>
              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 flex items-center gap-2">
                  <Shield size={14} />{error}
                </div>
              )}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label className="text-[11px]">Enter OTP Code</Label>
                  <Input ref={otpInputRef} type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" maxLength={6} required className="text-center font-mono text-lg tracking-widest" />
                </div>
                <button type="submit" disabled={verifyLoading || otp.length !== 6} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #10b981cc, #059b6888)' }}>
                  {verifyLoading ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={14} /> Verify OTP</>}
                </button>
              </form>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={handleResendOtp} disabled={!canResend || loading} className={`text-[11px] transition-colors ${canResend ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] cursor-not-allowed'}`}>
                  Didn't receive OTP? Send again
                </button>
                {!canResend && <span className="text-[11px] text-[var(--text-muted)] font-mono">({resendTimer}s)</span>}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-3">
                  <Lock size={24} className="text-[var(--green)]" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">Reset Password</h3>
                <p className="text-[11px] text-[var(--text-muted)] text-center">Create a new password for<br /><span className="text-[var(--text-primary)] font-medium">{email}</span></p>
              </div>
              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 flex items-center gap-2">
                  <Shield size={14} />{error}
                </div>
              )}
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <Label className="text-[11px]">New Password</Label>
                  <div className="relative">
                    <Input ref={passwordInputRef} type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} className="pr-9" />
                    <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-secondary)]">
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-[11px]">Confirm Password</Label>
                  <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required className="pr-9" />
                </div>
                <button type="submit" disabled={resetLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white mt-2" style={{ background: 'linear-gradient(135deg, #10b981cc, #059b6888)' }}>
                  {resetLoading ? <Loader2 size={16} className="animate-spin" /> : <><Lock size={14} /> Reset Password</>}
                </button>
              </form>
            </>
          )}

          {!resetSuccess && (
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
              <button onClick={handleBack} className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft size={14} />{step === 1 ? 'Back to Login' : 'Back'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-[var(--text-faint)] mt-6">
          {APP_CONFIG.company} · {APP_CONFIG.name} v{APP_CONFIG.version}
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
