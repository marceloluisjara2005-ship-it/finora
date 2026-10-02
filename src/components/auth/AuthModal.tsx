import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  X,
  KeyRound,
  Cloud,
  Laptop,
  MailCheck,
  RefreshCw,
} from 'lucide-react';
import {
  getSupabase,
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  updateUserPassword,
  getCurrentSession,
} from '../../lib/supabase';
import type { UserProfile } from '../../types/finance';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
  onAuthSuccess: (userProfile: UserProfile, isCloudSession: boolean) => void;
  onContinueOfflineGuest: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  canDismiss = true,
  onAuthSuccess,
  onContinueOfflineGuest,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password' | 'update_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [showPassword, setShowPassword] = useState(false);

  // Recovery email state & cooldown
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isCloudReady = isSupabaseConfigured || Boolean(getSupabase());

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Listen for Supabase password recovery event from URL hash or auth change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
        setAuthMode('update_password');
      }
    }

    const client = getSupabase();
    if (client) {
      const { data: authListener } = client.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setAuthMode('update_password');
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleTriggerRecovery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email.trim());
      setRecoveryEmailSent(true);
      setResendCooldown(60);
      setSuccessMsg(`Te enviamos un enlace de recuperación a ${email.trim()}`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      let msg = err.message || 'No se pudo enviar el correo de recuperación.';
      if (msg.includes('rate limit') || msg.includes('security purposes')) {
        msg = 'Por seguridad, debes esperar 60 segundos antes de solicitar otro enlace de recuperación.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await updateUserPassword(newPassword);
      setSuccessMsg('¡Contraseña actualizada con éxito! Redirigiendo a tu cuenta...');

      const { user } = await getCurrentSession();
      if (user) {
        const profile: UserProfile = {
          id: user.id,
          email: user.email || email.trim(),
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario Finora',
          primaryCurrency: currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires',
          privacyModeEnabled: false,
          createdAt: user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setTimeout(() => {
          onAuthSuccess(profile, true);
        }, 1500);
      } else {
        setTimeout(() => {
          setAuthMode('login');
          setSuccessMsg('Contraseña restablecida. Por favor inicia sesión con tu nueva contraseña.');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Update password error:', err);
      setErrorMsg(err.message || 'Error al actualizar la contraseña en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'forgot_password') {
      return handleTriggerRecovery();
    }

    if (authMode === 'update_password') {
      return handleUpdatePassword(e);
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic validation
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (authMode === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Por favor ingresa tu nombre completo.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isCloudReady && getSupabase()) {
        if (authMode === 'login') {
          const res = await signInWithEmail(email.trim(), password);
          const user = res.user;
          if (!user) throw new Error('No se pudo obtener el usuario autenticado.');

          const profile: UserProfile = {
            id: user.id,
            email: user.email || email.trim(),
            displayName: user.user_metadata?.full_name || email.split('@')[0],
            primaryCurrency: currency,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires',
            privacyModeEnabled: false,
            createdAt: user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          onAuthSuccess(profile, true);
        } else {
          // Register
          const res = await signUpWithEmail(email.trim(), password, fullName.trim());
          const user = res.user;
          if (!user) throw new Error('No se pudo crear el usuario.');

          const profile: UserProfile = {
            id: user.id,
            email: user.email || email.trim(),
            displayName: fullName.trim() || email.split('@')[0],
            primaryCurrency: currency,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires',
            privacyModeEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (res.session) {
            onAuthSuccess(profile, true);
          } else {
            setSuccessMsg('¡Cuenta creada con éxito! Si tu proyecto requiere confirmación, verifica tu bandeja de entrada.');
            setTimeout(() => {
              onAuthSuccess(profile, true);
            }, 2000);
          }
        }
      } else {
        // Local Account Simulation (No Supabase keys yet)
        const localId = `usr-${Math.random().toString(36).substr(2, 9)}`;
        const profile: UserProfile = {
          id: localId,
          email: email.trim(),
          displayName: authMode === 'register' ? fullName.trim() : email.split('@')[0],
          primaryCurrency: currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires',
          privacyModeEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onAuthSuccess(profile, false);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message || 'Error de autenticación.';
      if (message.includes('Invalid login credentials')) {
        message = 'Correo o contraseña incorrectos. Verifica tus credenciales.';
      } else if (message.includes('User already registered')) {
        message = 'Este correo ya está registrado en Supabase. Por favor inicia sesión.';
      } else if (message.includes('Email not confirmed')) {
        message = 'Tu correo aún no ha sido confirmado en Supabase.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <div className="w-full max-w-md bg-[#0E131F] border border-[#1F293D] rounded-3xl p-6 sm:p-8 shadow-2xl relative my-auto">
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-full hover:bg-[#161F33] transition-colors"
            aria-label="Cerrar ventana de autenticación"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#5687F5]/10 border border-[#5687F5]/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(86,135,245,0.2)]">
            <ShieldCheck className="w-8 h-8 text-[#5687F5]" />
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Finora
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#5687F5]/20 text-[#5687F5] font-semibold border border-[#5687F5]/30">
              {authMode === 'forgot_password'
                ? 'Recuperación'
                : authMode === 'update_password'
                ? 'Nueva Clave'
                : 'Auth'}
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {authMode === 'forgot_password'
              ? 'Restablece el acceso a tu cuenta mediante Supabase Auth'
              : authMode === 'update_password'
              ? 'Ingresa tu nueva contraseña para actualizar tu acceso'
              : 'Contador Público Personal & Finanzas Personales'}
          </p>

          {/* Cloud Status Indicator */}
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Cloud Conectado</span>
          </div>
        </div>

        {/* Tab Switcher for Login / Register */}
        {(authMode === 'login' || authMode === 'register') && (
          <div className="flex p-1 bg-[#080B12] rounded-xl border border-[#1F293D] mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-[#161F33] text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                authMode === 'register'
                  ? 'bg-[#161F33] text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 text-xs text-emerald-300 animate-fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FLOW 1: FORGOT PASSWORD */}
        {authMode === 'forgot_password' && (
          <div className="space-y-4 animate-fade-in">
            {recoveryEmailSent ? (
              <div className="p-4 rounded-2xl bg-[#121826] border border-[#28354D] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <MailCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">¡Enlace de recuperación enviado!</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Hemos enviado las instrucciones a: <strong className="text-white">{email}</strong>.
                  Haz clic en el enlace del correo para restablecer tu contraseña.
                </p>
                <div className="p-2.5 rounded-xl bg-[#080B12] text-[11px] text-gray-400 text-left border border-[#1F293D]">
                  💡 <strong>Tip:</strong> Si no lo recibes en unos minutos, revisa tu carpeta de <em>Spam</em> o correo no deseado.
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={loading || resendCooldown > 0}
                    onClick={() => handleTriggerRecovery()}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#161F33] hover:bg-[#202B47] disabled:opacity-50 text-xs font-semibold text-gray-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0
                      ? `Reenviar en ${resendCooldown}s`
                      : 'Reenviar enlace de recuperación'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setRecoveryEmailSent(false);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Volver a Iniciar Sesión
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Ingresa el correo electrónico asociado a tu cuenta de Finora. Te enviaremos un enlace seguro de Supabase para restablecer tu contraseña.
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B12] border border-[#1F293D] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5687F5] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#5687F5] hover:bg-[#4375E6] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_0_20px_rgba(86,135,245,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enviar Enlace de Recuperación</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 pt-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Iniciar Sesión</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* FLOW 2: UPDATE PASSWORD (TRIGGERED VIA EMAIL RECOVERY LINK) */}
        {authMode === 'update_password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-[#161F33] border border-[#28354D] text-xs text-gray-300">
              🔒 Has abierto un enlace de recuperación válido. Por favor ingresa tu nueva contraseña.
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#080B12] border border-[#1F293D] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5687F5] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repite la nueva contraseña"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B12] border border-[#1F293D] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5687F5] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#5687F5] hover:bg-[#4375E6] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_0_20px_rgba(86,135,245,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Actualizar Contraseña y Acceder</span>
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FLOW 3: STANDARD LOGIN / REGISTER */}
        {(authMode === 'login' || authMode === 'register') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Marcelo Jara"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B12] border border-[#1F293D] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5687F5] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B12] border border-[#1F293D] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5687F5] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-300">
                  Contraseña
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setRecoveryEmailSent(false);
                    }}
                    className="text-xs text-[#5687F5] hover:text-[#7FA5FF] transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#080B12] border border-[#1F293D] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5687F5] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B12] border border-[#1F293D] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5687F5] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Moneda Principal
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#080B12] border border-[#1F293D] text-white text-sm focus:outline-none focus:border-[#5687F5]"
                  >
                    <option value="ARS">ARS ($ - Peso Argentino)</option>
                    <option value="USD">USD (US$ - Dólar Estadounidense)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-[#5687F5] hover:bg-[#4375E6] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_0_20px_rgba(86,135,245,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {authMode === 'login' && 'Iniciar Sesión'}
                  {authMode === 'register' && 'Crear Cuenta en Finora'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Offline Guest Option */}
        <div className="mt-6 pt-5 border-t border-[#1F293D] text-center">
          <button
            type="button"
            onClick={onContinueOfflineGuest}
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <Laptop className="w-3.5 h-3.5 text-gray-500" />
            Continuar en modo local / sin registrarse
          </button>
        </div>
      </div>
    </div>
  );
};
