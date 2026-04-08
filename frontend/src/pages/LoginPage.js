import React, { useState } from 'react';
import {
 Sun, Eye, EyeOff, ArrowRight, Shield, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Label } from '../components/ui/Input';
import { APP_CONFIG } from '../config/app.config';

const LoginPage = () => {
 const { login } = useAuth();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [showPass, setShowPass] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');

 const handleSubmit = async (e) => {
 e.preventDefault();
 setError('');

 setLoading(true);
 try {
 const result = await login(email, password);
 console.log(result, "::::::");
 if (result) {
 // Redirect based on role
 window.location.href = '/dashboard';
 } else {
 setError('Invalid email or password');
 }
 } catch (err) {
 setError('Invalid credentials');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-[var(--bg-page)] flex flex-col xl:flex-row">

 {/* †â€™†â€™LEFT BRAND PANEL †â€™†â€™*/}
 <div
 className="hidden xl:flex flex-col justify-between w-[380px] shrink-0 p-10 relative overflow-hidden"
 style={{
 background: 'linear-gradient(160deg, rgba(37,99,235,0.10) 0%, rgba(7,8,15,1) 60%)',
 borderRight: '1px solid var(--border-base)',
 }}
 >
 {/* Glow blobs */}
 <div className="absolute -top-28 -left-28 w-80 h-80 rounded-full opacity-20 pointer-events-none"
 style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.5) 0%, transparent 70%)' }} />
 <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full opacity-10 pointer-events-none"
 style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)' }} />

 <div className="relative">
 {/* Logo */}
 <div className="flex items-center gap-3 mb-10">
 <div
 className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl"
 style={{
 background: `linear-gradient(to bottom right, var(--primary), var(--primary-light))`,
 boxShadow: `0 20px 25px -5px var(--primary-glow), 0 10px 10px -5px var(--primary-glow)`
 }}
 >
 <Sun size={20} className="text-white" strokeWidth={2.5} />
 </div>
 <div>
 <p className="font-extrabold text-lg text-[var(--text-primary)] tracking-tight">{APP_CONFIG.name}</p>
 <p className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">{APP_CONFIG.edition}</p>
 </div>
 </div>

 <h1 className="text-3xl font-extrabold text-[var(--text-primary)] leading-snug mb-4">
 Admin<br />
 <span className="gradient-solar">Control Center</span>
 </h1>
 <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-8">
 Secure administrative access to manage your solar EPC operations. Create users, manage roles, and oversee all system activities.
 </p>

 {/* Feature chips */}
 <div className="space-y-2.5">
 {[
 'Full system administration access',
 'User & role management',
 'Comprehensive analytics & reports',
 'Security & compliance oversight',
 'Multi-module EPC control',
 ].map(f => (
 <div key={f} className="flex items-center gap-2.5">
 <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center shrink-0">
 <div className="w-1 h-1 rounded-full bg-[var(--accent)]" />
 </div>
 <span className="text-[11px] text-[var(--text-muted)]">{f}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Admin Info */}
 <div className="relative">
 <div className="glass-card p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/30 flex items-center justify-center">
 <Shield size={18} className="text-[var(--green)]" />
 </div>
 <div>
 <p className="text-sm font-bold text-[var(--text-primary)]">Admin Access Only</p>
 <p className="text-[10px] text-[var(--text-muted)]">Restricted to authorized administrators</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* †â€™†â€™MAIN CONTENT †â€™†â€™*/}
 <div className="flex-1 overflow-y-auto">
 <div className="min-h-full flex flex-col items-center justify-center py-10 px-4 relative">

 {/* Grid bg */}
 <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
 style={{ backgroundImage: 'linear-gradient(var(--border-base) 1px,transparent 1px),linear-gradient(90deg,var(--border-base) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

 <div className="relative w-full max-w-md animate-fade-in">

 {/* Mobile logo */}
 <div className="flex items-center gap-2.5 mb-8 xl:hidden justify-center">
 <div
 className="w-8 h-8 rounded-xl flex items-center justify-center"
 style={{
 background: `linear-gradient(to bottom right, var(--primary), var(--primary-light))`
 }}
 >
 <Sun size={15} className="text-white" />
 </div>
 <span className="font-extrabold text-[var(--text-primary)]">{APP_CONFIG.name}</span>
 <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-widest ml-1 mt-0.5">{APP_CONFIG.edition}</span>
 </div>

 {/* Admin Badge */}
 <div className="flex justify-center mb-6">
 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30">
 <Shield size={14} className="text-blue-400" />
 <span className="text-xs font-medium text-blue-400">Secure Login</span>
 </div>
 </div>

 {/* Sign-in Form */}
 <div className="glass-card p-6">
 <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">Sign In</h3>
 <p className="text-[11px] text-[var(--text-muted)] mb-6 text-center">
 Enter your credentials to access the system
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
 placeholder="you@solarcorp.com"
 value={email}
 onChange={e => setEmail(e.target.value)}
 required
 autoFocus
 />
 </div>
 <div>
 <div className="flex items-center justify-between mb-1">
 <Label className="text-[11px]">Password</Label>
 <button
 type="button"
 onClick={() => window.location.href = '/forgot-password'}
 className="text-[10px] text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors"
 >
 Forgot Password?
 </button>
 </div>
 <div className="relative">
 <Input
 type={showPass ? 'text' : 'password'}
 placeholder="†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™"
 value={password}
 onChange={e => setPassword(e.target.value)}
 required
 className="pr-9"
 />
 <button
 type="button"
 onClick={() => setShowPass(p => !p)}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-secondary)] transition-colors"
 >
 {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
 </button>
 </div>
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
 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 ) : (
 <>
 Sign In
 <ArrowRight size={14} />
 </>
 )}
 </button>
 </form>

 {/* Login hint */}
 <div className="mt-4 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
 <p className="text-[10px] text-[var(--text-faint)] text-center">
 Super Admin: harshildobariya070@gmail.com / 123456
 </p>
 </div>
 </div>

 {/* Info Card */}
 <div className="mt-6 glass-card p-4">
 <div className="flex items-start gap-3">
 <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
 <CheckCircle size={16} className="text-blue-400" />
 </div>
 <div>
 <p className="text-xs font-medium text-[var(--text-primary)] mb-1">Future Role-Based Access</p>
 <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
 After admin login, you can create users and assign roles.
 Role-based login system will be enabled once users are configured.
 </p>
 </div>
 </div>
 </div>

 <p className="text-center text-[10px] text-[var(--text-faint)] mt-6 pb-4">
 {APP_CONFIG.company} †â€™…Â¡Â· {APP_CONFIG.name} v{APP_CONFIG.version} †â€™…Â¡Â· {APP_CONFIG.edition}
 </p>
 </div>
 </div>
 </div>
 </div>
 );
};

export default LoginPage;
