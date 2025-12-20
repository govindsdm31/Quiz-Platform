/**
 * Login view component
 * Displays login form for all users
 * Theme: Oxford Blue (#002147) and Selective Yellow (#FFBA00)
 * Layout: Two-column design with stats on left, form on right
 */

import { useState, useEffect } from 'react';
import { AlertCircle, Eye, GraduationCap, Users, ShieldCheck, Crown, TrendingUp, Award, BookOpen, Target } from 'lucide-react';
import type { LoginForm } from '../../types';

interface LoginViewProps {
  loginForm: LoginForm;
  setLoginForm: (form: LoginForm) => void;
  error: string;
  setError: (error: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  handleLogin: () => void;
}

// Counter animation hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

// Stat component with animation
function StatCard({ icon: Icon, value, label, delay = 0 }: { icon: any, value: number, label: string, delay?: number }) {
  const animatedValue = useCountUp(value, 2000);

  return (
    <div
      className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-lg bg-[#FFBA00] flex items-center justify-center">
          <Icon size={24} className="text-[#002147]" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-[#FFBA00]">
          {animatedValue.toLocaleString()}+
        </div>
        <div className="text-sm text-white/80">{label}</div>
      </div>
    </div>
  );
}

export function LoginView({
  loginForm,
  setLoginForm,
  error,
  setError,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  handleLogin
}: LoginViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002147] via-[#003366] to-[#004080] flex">
      {/* Left Side - Branding & Stats */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-[#FFBA00] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#FFBA00] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16 xl:px-24 w-full">
          {/* Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFBA00] rounded-2xl mb-6 shadow-2xl">
              <GraduationCap size={40} className="text-[#002147]" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Quiz<br />Platform
            </h1>
            <p className="text-xl text-[#FFBA00] font-medium mb-2">
              Excellence in Assessment
            </p>
            <p className="text-white/70 text-lg">
              Empowering educators and students with intelligent quiz management
            </p>
          </div>

          {/* Animated Statistics */}
          <div className="space-y-4 mt-12">
            <StatCard icon={Users} value={10000} label="Active Users" delay={0} />
            <StatCard icon={BookOpen} value={50000} label="Quizzes Created" delay={200} />
            <StatCard icon={Award} value={1000000} label="Questions Answered" delay={400} />
            <StatCard icon={TrendingUp} value={98} label="Success Rate %" delay={600} />
          </div>

          {/* Floating elements */}
          <div className="absolute bottom-8 left-12 opacity-20">
            <Target size={120} className="text-[#FFBA00] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFBA00] rounded-2xl mb-4">
              <GraduationCap size={32} className="text-[#002147]" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Quiz Platform</h1>
            <p className="text-[#FFBA00]">Excellence in Assessment</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 border-t-4 border-[#FFBA00]">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#002147] mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to continue to your account</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg flex items-center gap-2 animate-shake" role="alert" aria-live="assertive">
                <AlertCircle size={20} className="flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#002147] mb-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  aria-label="Username"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FFBA00] focus:ring-2 focus:ring-[#FFBA00]/20 transition-all"
                  value={loginForm.username}
                  onChange={(e) => { setLoginForm({ ...loginForm, username: e.target.value }); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#002147] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    aria-label="Password"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FFBA00] focus:ring-2 focus:ring-[#FFBA00]/20 transition-all pr-10"
                    value={loginForm.password}
                    onChange={(e) => { setLoginForm({ ...loginForm, password: e.target.value }); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#002147] transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#FFBA00] focus:ring-[#FFBA00]"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button
                onClick={handleLogin}
                type="button"
                className="w-full bg-gradient-to-r from-[#002147] to-[#003366] text-white py-3 rounded-lg hover:from-[#003366] hover:to-[#004080] transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
            </div>

            {/* Demo Credentials */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-200"></div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Demo Accounts</p>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                <div
                  className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setLoginForm({ username: 'owner', password: 'owner123' });
                    setTimeout(handleLogin, 0);
                  }}
                >
                  <Crown size={16} className="text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-purple-900">Owner:</span>
                    <span className="ml-2 text-purple-700">owner / owner123</span>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setLoginForm({ username: 'admin', password: 'admin123' });
                    setTimeout(handleLogin, 0);
                  }}
                >
                  <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-blue-900">Admin:</span>
                    <span className="ml-2 text-blue-700">admin / admin123</span>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setLoginForm({ username: 'supervisor', password: 'super123' });
                    setTimeout(handleLogin, 0);
                  }}
                >
                  <Users size={16} className="text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-green-900">Supervisor:</span>
                    <span className="ml-2 text-green-700">supervisor / super123</span>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 p-2 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setLoginForm({ username: 'student', password: 'student123' });
                    setTimeout(handleLogin, 0);
                  }}
                >
                  <GraduationCap size={16} className="text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-amber-900">Student:</span>
                    <span className="ml-2 text-amber-700">student / student123</span>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 mt-4">
                Click any credential above to quick login
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
