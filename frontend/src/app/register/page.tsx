'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email, password, displayName || undefined);
      router.push('/');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).response?.data?.detail || 'Registration failed'
          : 'Registration failed';
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

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Create Account</h1>
            <p className="text-sm text-theme-secondary">
              Save snippets and manage your templates
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="displayName" className="block text-xs font-medium text-theme-secondary mb-1.5">
                Display Name <span className="text-theme-muted">(optional)</span>
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-theme-secondary border border-theme-primary rounded focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                placeholder="Jane Doe"
              />
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-theme-secondary border border-theme-primary rounded focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-theme-secondary mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-theme-secondary border border-theme-primary rounded focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                placeholder="Repeat your password"
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
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-theme-secondary mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent-blue)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
