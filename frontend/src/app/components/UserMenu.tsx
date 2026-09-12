'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function UserMenu() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading) {
    return (
      <div className="w-6 h-6 rounded-full bg-theme-secondary animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-[10px] uppercase font-bold px-2 py-1 bg-theme-secondary hover:bg-[var(--hover-bg)] rounded transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="text-[10px] uppercase font-bold px-2 py-1 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded transition-colors"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const displayName = user?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-1 bg-theme-secondary hover:bg-[var(--hover-bg)] rounded transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="max-w-[80px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-theme-secondary border border-theme-primary rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-2 border-b border-theme-primary">
            <p className="text-[10px] font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="w-full text-left text-[10px] px-3 py-2 text-[var(--accent-red)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
