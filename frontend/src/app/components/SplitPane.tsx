'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  leftLabel?: string;
  rightLabel?: string;
  leftCollapsible?: boolean;
  rightCollapsible?: boolean;
}

export default function SplitPane({
  left,
  right,
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  leftLabel = 'Editor',
  rightLabel = 'Preview',
  leftCollapsible = true,
  rightCollapsible = true,
}: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(minLeftWidth, Math.min(maxLeftWidth, pct));
      setLeftWidth(pct);
    },
    [isDragging, minLeftWidth, maxLeftWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleLeft = () => {
    if (leftCollapsed) {
      setLeftCollapsed(false);
      setLeftWidth(defaultLeftWidth);
    } else {
      setLeftCollapsed(true);
    }
    if (rightCollapsed) setRightCollapsed(false);
  };

  const toggleRight = () => {
    if (rightCollapsed) {
      setRightCollapsed(false);
    } else {
      setRightCollapsed(true);
    }
    if (leftCollapsed) setLeftCollapsed(false);
  };

  let lFlex: number, rFlex: number;
  if (leftCollapsed) { lFlex = 0; rFlex = 1; }
  else if (rightCollapsed) { lFlex = 1; rFlex = 0; }
  else { lFlex = leftWidth; rFlex = 100 - leftWidth; }

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden relative">
      {/* Left Panel */}
      <div
        className="flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          flex: leftCollapsed ? '0 0 0px' : `${lFlex}%`,
          minWidth: leftCollapsed ? 0 : undefined,
          opacity: leftCollapsed ? 0 : 1,
        }}
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-theme-header border-b border-theme-primary shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--accent-blue)' }}>
              {leftLabel}
            </span>
            {leftCollapsible && (
              <button onClick={toggleLeft} className="text-theme-muted hover:text-theme-primary transition-colors p-0.5" title={leftCollapsed ? 'Expand' : 'Collapse'}>
                <svg className={`w-3 h-3 transition-transform ${leftCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">{left}</div>
      </div>

      {/* Resizable Divider */}
      {!leftCollapsed && !rightCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`flex-shrink-0 w-[5px] cursor-col-resize relative group transition-colors ${
            isDragging ? 'bg-[var(--accent-blue)]' : 'bg-theme-primary hover:bg-[var(--accent-blue)]'
          }`}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-0.5 h-0.5 rounded-full bg-white" />
            <div className="w-0.5 h-0.5 rounded-full bg-white" />
            <div className="w-0.5 h-0.5 rounded-full bg-white" />
          </div>
        </div>
      )}

      {/* Collapsed Left Toggle */}
      {leftCollapsed && (
        <div className="flex items-center justify-center px-2 bg-theme-header border-r border-theme-primary">
          <button onClick={toggleLeft} className="text-theme-muted hover:text-theme-primary transition-colors p-2 text-[10px] uppercase font-bold tracking-widest [writing-mode:vertical-rl]" title="Expand editor">
            <svg className="w-4 h-4 mb-2 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {leftLabel}
          </button>
        </div>
      )}

      {/* Collapsed Right Toggle */}
      {rightCollapsed && (
        <div className="flex items-center justify-center px-2 bg-theme-header border-l border-theme-primary ml-auto">
          <button onClick={toggleRight} className="text-theme-muted hover:text-theme-primary transition-colors p-2 text-[10px] uppercase font-bold tracking-widest" title="Expand preview">
            {rightLabel}
            <svg className="w-4 h-4 mt-2 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Right Panel */}
      <div
        className="flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          flex: rightCollapsed ? '0 0 0px' : `${rFlex}%`,
          minWidth: rightCollapsed ? 0 : undefined,
          opacity: rightCollapsed ? 0 : 1,
        }}
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-theme-header border-b border-theme-primary shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--accent-green)' }}>
            {rightLabel}
          </span>
          {rightCollapsible && (
            <button onClick={toggleRight} className="text-theme-muted hover:text-theme-primary transition-colors p-0.5" title={rightCollapsed ? 'Expand' : 'Collapse'}>
              <svg className={`w-3 h-3 transition-transform ${rightCollapsed ? '-rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1 overflow-hidden">{right}</div>
      </div>
    </div>
  );
}
