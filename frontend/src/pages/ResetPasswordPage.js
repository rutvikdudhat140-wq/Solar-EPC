import React, { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { api } from '../lib/apiClient';
import { Input, Label } from '../components/ui/Input';
import { APP_CONFIG } from '../config/app.config';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get email from localStorage (set by forgot password page)
    const storedEmail = localStorage.getItem('reset_email');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
      });

      if (response.success) {
        setSuccess(true);
        // Clear stored email
        localStorage.removeItem('reset_email');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      {/* Grid bg */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(var(--border-base) 1px,transparent 1px),linear-gradient(90deg,var(--border-base) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(to bottom right, var(--primary), var(--primary-light))`
            }}
          >
            <Shield size={20} className="text-white" />
          </div>
          <span className="font-extrabold text-lg text-[var(--text-primary)]">{APP_CONFIG.name}</span>
        </div>

        <div className="glass-card p-6">
          {!success ? (
            <>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">
                Reset Password
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mb-6 text-center">
                Enter the OTP sent to your email and set a new password
              </p>

              {error && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 flex items-center gap-2">
                  <Shield size={14} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-[11px]">Email address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@solarcorp.com"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[11px]">OTP Code</Label>
                  <Input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                  />
                </div>

                <div>
                  <Label className="text-[11px]">New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px]">Confirm Password</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="pr-9"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #10b981cc, #059b6888)',
                    boxShadow: '0 4px 16px #10b98144',
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Lock size={14} />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-[var(--green)]" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">
                  Password Reset!
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] text-center">
                  Your password has been successfully reset.<br />
                  Redirecting to login page...
                </p>
              </div>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6cc, #1d4ed888)',
                  boxShadow: '0 4px 16px #3b82f644',
                }}
              >
                Go to Login Now
              </button>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => window.location.href = '/forgot-password'}
              className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Forgot Password
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-[var(--text-faint)] mt-6">
          {APP_CONFIG.company} · {APP_CONFIG.name} v{APP_CONFIG.version}
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
