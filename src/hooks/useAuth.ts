/**
 * Authentication hook
 * Handles user login, logout, and authentication state
 */

import { useState, useEffect } from 'react';
import { REMEMBERED_USERNAME_KEY, VIEWS } from '../constants';
import type { User, Batch, LoginForm, ViewType } from '../types';

export interface UseAuthReturn {
  currentUser: User | null;
  loginForm: LoginForm;
  setLoginForm: (form: LoginForm) => void;
  error: string;
  setError: (error: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  handleLogin: () => void;
  handleLogout: () => void;
}

interface UseAuthProps {
  users: User[];
  batches: Batch[];
  onViewChange: (view: ViewType) => void;
  onActiveQuizChange: (quiz: any) => void;
  onCurrentAttemptChange: (attempt: any) => void;
}

export function useAuth({
  users,
  batches,
  onViewChange,
  onActiveQuizChange,
  onCurrentAttemptChange
}: UseAuthProps): UseAuthReturn {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>({ username: '', password: '' });
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Load remembered username on mount
  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBERED_USERNAME_KEY);
      if (remembered) {
        setLoginForm(prev => ({ ...prev, username: remembered }));
        setRememberMe(true);
      }
    } catch (e) {
      // ignore localStorage errors
    }
  }, []);

  const handleLogin = () => {
    setError('');

    // Find user with matching credentials
    const user = users.find(u =>
      u.username === loginForm.username &&
      u.password === loginForm.password &&
      u.active
    );

    if (!user) {
      setError('Invalid credentials or account inactive');
      return;
    }

    // Handle remember me
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, loginForm.username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }
    } catch (e) {
      console.warn('Could not access localStorage', e);
    }

    // Special validation for students - must have active quiz
    if (user.role === 'student') {
      const studentBatch = batches.find(b =>
        b.studentIds && b.studentIds.includes(user.id) && b.active
      );

      if (!studentBatch || !studentBatch.activeQuizId) {
        setError('No active quiz assigned. Please contact your supervisor.');
        return;
      }
    }

    // Set current user and navigate to appropriate view
    setCurrentUser(user);
    const targetView =
      user.role === 'owner' ? VIEWS.COLLAB_SPACES :
      user.role === 'administrator' ? VIEWS.QUESTIONS :
      user.role === 'supervisor' ? VIEWS.BATCHES :
      VIEWS.STUDENT_QUIZ;

    onViewChange(targetView);
    setLoginForm({ username: '', password: '' });
    setShowPassword(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    onViewChange(VIEWS.LOGIN);
    onActiveQuizChange(null);
    onCurrentAttemptChange(null);
  };

  return {
    currentUser,
    loginForm,
    setLoginForm,
    error,
    setError,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    handleLogin,
    handleLogout
  };
}
