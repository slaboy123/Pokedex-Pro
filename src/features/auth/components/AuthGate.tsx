import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';

type AuthView = 'login' | 'register' | 'forgot-password';

interface AuthGateProps {
  onAuthenticated: () => void;
}

export const AuthGate = ({ onAuthenticated }: AuthGateProps): JSX.Element => {
  const [view, setView] = useState<AuthView>('login');
  const { signIn, signUp, resetPassword, isLoading, error } = useAuth();

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    const ok = await signIn(email, password);
    if (ok) {
      onAuthenticated();
    }
    return ok;
  };

  const handleRegister = async (email: string, password: string, nickname: string): Promise<boolean> => {
    const ok = await signUp(email, password, nickname);
    if (ok) {
      onAuthenticated();
    }
    return ok;
  };

  const handleResetPassword = async (email: string): Promise<boolean> => {
    return resetPassword(email);
  };

  if (view === 'register') {
    return (
      <RegisterPage
        onRegister={handleRegister}
        onGoToLogin={() => setView('login')}
        loading={isLoading}
        error={error}
      />
    );
  }

  if (view === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onSendRecovery={handleResetPassword}
        onGoToLogin={() => setView('login')}
        loading={isLoading}
        error={error}
      />
    );
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onGoToRegister={() => setView('register')}
      onGoToForgotPassword={() => setView('forgot-password')}
      loading={isLoading}
      error={error}
    />
  );
};
