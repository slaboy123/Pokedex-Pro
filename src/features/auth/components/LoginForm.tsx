/**
 * Example: Login Form Component
 * Demonstrates authentication integration
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/services';

export const LoginForm = (): JSX.Element => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user, error, isAuthenticated } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const success = await signUp(email, password, nickname);
        if (success) {
          // Reset form
          setEmail('');
          setPassword('');
          setNickname('');
          setIsSignUp(false);
        }
      } else {
        await signIn(email, password);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="rounded-lg bg-blue-50 p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Welcome, {user.nickname}!</h2>
        <p className="mt-2 text-gray-600">Level {user.level}</p>
        <button className="mt-4 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-lg">
      <h1 className="mb-6 text-center text-2xl font-bold">
        {isSignUp ? 'Create Account' : 'Login'}
      </h1>

      {error && (
        <div className="mb-4 rounded bg-red-100 p-4 text-red-700">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="your@email.com"
          />
        </div>

        {isSignUp && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              placeholder="Choose your trainer name"
              maxLength={50}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="font-semibold text-blue-500 hover:underline"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
};
