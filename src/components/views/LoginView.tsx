/**
 * Login view component
 * Displays login form for all users
 */

import { AlertCircle, Eye } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Quiz Platform</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2" role="alert" aria-live="assertive">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-4">
          <label htmlFor="username" className="sr-only">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username"
            autoComplete="username"
            autoFocus
            aria-label="Username"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={loginForm.username}
            onChange={(e) => { setLoginForm({ ...loginForm, username: e.target.value }); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />

          <label htmlFor="password" className="sr-only">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              aria-label="Password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              value={loginForm.password}
              onChange={(e) => { setLoginForm({ ...loginForm, password: e.target.value }); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <Eye size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Remember username</span>
            </label>
            <button
              onClick={handleLogin}
              type="button"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-semibold"
            >
              Login
            </button>
          </div>
        </div>
        <div className="mt-6 p-4 bg-gray-50 rounded text-sm">
          <p className="font-semibold mb-2">Demo Credentials:</p>
          <p>Owner: owner / owner123</p>
        </div>
      </div>
    </div>
  );
}
