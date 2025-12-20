/**
 * Login view component
 * Displays login form for all users
 * Theme: Oxford Blue (#002147) and Selective Yellow (#FFBA00)
 */

import { AlertCircle, Eye, GraduationCap, Users, ShieldCheck, Crown } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-[#002147] via-[#003366] to-[#004080] flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#FFBA00] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-[#FFBA00] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-[#FFBA00] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border-t-4 border-[#FFBA00]">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#002147] to-[#003366] rounded-full mb-4">
            <GraduationCap size={32} className="text-[#FFBA00]" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#002147] to-[#003366] bg-clip-text text-transparent">
            Quiz Platform
          </h1>
          <p className="text-gray-600 mt-2 text-sm">Excellence in Assessment</p>
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
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <Crown size={16} className="text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-purple-900">Owner:</span>
                <span className="ml-2 text-purple-700">owner / owner123</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-blue-900">Admin:</span>
                <span className="ml-2 text-blue-700">admin / admin123</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <Users size={16} className="text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-green-900">Supervisor:</span>
                <span className="ml-2 text-green-700">supervisor / super123</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
              <GraduationCap size={16} className="text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-amber-900">Student:</span>
                <span className="ml-2 text-amber-700">student / student123</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            Choose any role above to explore the platform
          </p>
        </div>
      </div>
    </div>
  );
}
