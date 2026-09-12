'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).response?.data?.detail || 'Login failed'
          : 'Login failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-theme-primary text-theme-primary flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-theme-header border-b border-theme-primary flex items-center justify-between">
        <Link href="/" className="text-[10px] text-[var(--accent-blue)] hover:opacity-80 uppercase font-bold tracking-widest transition-colors">
          ← Back to Editor
        </Link>
        <ThemeToggle />
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Sign In</h1>
            <p className="text-sm text-theme-secondary">
              Sign in to save snippets and customise your experience
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-theme-secondary mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-theme-secondary border border-theme-primary rounded focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-theme-secondary mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-theme-secondary border border-theme-primary rounded focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--accent-red)] bg-red-900/20 border border-red-900/30 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-[var(--accent-blue)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded transition-all"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-theme-secondary mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--accent-blue)] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
