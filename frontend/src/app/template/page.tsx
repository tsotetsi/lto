'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import TemplateGallery from '../components/TemplateGallery';
import VariableForm from '../components/VariableForm';
import TemplateBuilder from '../components/TemplateBuilder';
import ThemeToggle from '../components/ThemeToggle';
import UserMenu from '../components/UserMenu';
import { useTheme } from '../context/ThemeContext';
import { Template } from '../types/template';

const STORAGE_KEYS = {
  TEMPLATE_CODE: 'cv_template_code',
  TEMPLATE_FONT: 'cv_template_font',
  TEMPLATE_ID: 'cv_template_id',
  TEMPLATE_VARIABLES: 'cv_template_variables'
};

type EditorMode = 'gallery' | 'builder';

export default function TemplateEditor() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<EditorMode>('gallery');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [code, setCode] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    const savedTemplateId = localStorage.getItem(STORAGE_KEYS.TEMPLATE_ID);
    const savedVariables = localStorage.getItem(STORAGE_KEYS.TEMPLATE_VARIABLES);
    const savedCode = localStorage.getItem(STORAGE_KEYS.TEMPLATE_CODE);
    
    if (savedTemplateId && savedVariables) {
      // We'll fetch the template details when we have the ID
      setVariables(JSON.parse(savedVariables));
    }
    if (savedCode) {
      setCode(savedCode);
    }
    setIsInitialized(true);
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEYS.TEMPLATE_CODE, code);
    localStorage.setItem(STORAGE_KEYS.TEMPLATE_VARIABLES, JSON.stringify(variables));
  }, [code, variables, isInitialized]);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setShowVariableForm(true);
    localStorage.setItem(STORAGE_KEYS.TEMPLATE_ID, template.id);
  };

  const handleVariableSubmit = async (formVariables: Record<string, string>) => {
    if (!selectedTemplate) return;

    setVariables(formVariables);
    setShowVariableForm(false);
    setIsCompiling(true);

    try {
      // Fill template with variables
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/templates/${selectedTemplate.id}/fill`,
        { variables: formVariables }
      );

      const filledCode = response.data.tex_content;
      setCode(filledCode);
      
      // Compile the filled template
      await compileTemplate(filledCode, selectedTemplate.font);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fill template';
      setError(errorMessage);
      setShowConsole(true);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleBuilderCompile = useCallback(async (texContent: string, font: string) => {
    setCode(texContent);
    await compileTemplate(texContent, font);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const compileTemplate = async (texContent: string, font: string) => {
    setIsCompiling(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/compile/raw`,
        {
          tex_content: texContent,
          file_name: 'template_resume',
          font: font,
        },
        { responseType: 'blob' }
      );

      const responseBlob = response.data;

      if (responseBlob.type === 'application/pdf') {
        const url = URL.createObjectURL(responseBlob);
        setPdfUrl(url);
        setError(null);
        setInfoMessage(null);
        setShowConsole(true);
      } else if (responseBlob.type === 'application/json') {
        const jsonText = await responseBlob.text();
        const jsonData = JSON.parse(jsonText);
        setInfoMessage(jsonData.message || 'Document blank');
        setError(null);
        setPdfUrl(null);
        setShowConsole(true);
      } else {
        const errorText = await responseBlob.text();
        let errorMessage = 'Compilation failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || 'Compilation failed';
        } catch {
          if (errorText) errorMessage = errorText;
        }
        setError(errorMessage);
      }
    } catch (err: unknown) {
      let errorMessage = 'Compilation error occurred';
      if (err instanceof Error) {
        if (err.message) {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      setShowConsole(true);
    } finally {
      setIsCompiling(false);
    }
  };

  // Recompile when code changes (debounced)
  useEffect(() => {
    if (!isInitialized || !selectedTemplate || !code) return;

    const timeout = setTimeout(() => {
      compileTemplate(code, selectedTemplate.font);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [code, selectedTemplate, isInitialized]);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  if (!isInitialized) {
    return <div className="h-screen w-screen bg-theme-primary flex items-center justify-center text-theme-primary">Loading Template Workspace...</div>;
  }

  if (showVariableForm && selectedTemplate) {
    return (
      <div className="h-screen w-screen bg-theme-primary text-theme-primary">
        <div className="p-4 border-b border-theme-primary bg-theme-sidebar">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold">Fill Template: {selectedTemplate.name}</h1>
            <button
              onClick={() => setShowVariableForm(false)}
              className="px-4 py-2 bg-theme-secondary hover:opacity-80 rounded transition-colors"
            >
              Back to Templates
            </button>
          </div>
        </div>
        <VariableForm
          template={selectedTemplate}
          initialData={variables}
          onSubmit={handleVariableSubmit}
          onCancel={() => setShowVariableForm(false)}
        />
      </div>
    );
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-theme-primary text-theme-primary font-sans transition-colors duration-200">
      {/* ─── MODE: GALLERY ─── */}
      {mode === 'gallery' && (
        <>
          {/* Left Column - Template Gallery */}
          <div className="w-80 bg-theme-sidebar border-r border-theme-primary flex flex-col shrink-0">
            <div className="p-4 border-b border-theme-primary">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] uppercase font-bold tracking-widest text-theme-muted">Templates</h2>
                <Link
                  href="/"
                  className="text-[10px] text-[var(--accent-blue)] hover:opacity-80 transition-colors"
                >
                  ← Back to Editor
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-theme-secondary">
                  Select a template to customize and compile
                </p>
                <div className="flex-1" />
                <button
                  onClick={() => setMode('builder')}
                  className="text-[10px] uppercase font-bold px-2 py-1 bg-theme-secondary hover:bg-[var(--hover-bg)] rounded transition-colors"
                >
                  Builder
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TemplateGallery
                onSelectTemplate={handleTemplateSelect}
                selectedTemplate={selectedTemplate || undefined}
              />
            </div>
          </div>

          {/* Middle Column - Editor */}
          {selectedTemplate ? (
            <div className="flex-1 flex flex-col border-r border-theme-primary h-full">
              {/* Header */}
              <div className="px-3 py-2 bg-theme-header flex justify-between items-center shrink-0 border-b border-theme-primary">
                <div className="flex items-center gap-4">
                  <span className="text-[var(--accent-blue)] font-bold text-xs uppercase">Template: {selectedTemplate.name}</span>
                  <button
                    onClick={() => setShowVariableForm(true)}
                    className="text-[10px] uppercase font-bold px-3 py-1.5 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded transition-all"
                  >
                    Edit Variables
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <UserMenu />
                  <ThemeToggle />
                  {isCompiling && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-ping" />
                      <span className="text-[10px] text-theme-muted uppercase font-bold">Compiling...</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (error) {
                        setShowConsole(true);
                      } else {
                        setShowConsole(prev => !prev);
                      }
                    }}
                    className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded transition-colors ${
                      error ? 'bg-[var(--accent-red)] text-white' : 'bg-theme-secondary hover:opacity-80'
                    }`}
                  >
                    Terminal {error ? '(!)' : ''}
                  </button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-grow">
                <Editor
                  height="100%"
                  defaultLanguage="latex"
                  theme={monacoTheme}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                />
              </div>

              {/* Terminal Console */}
              <div className={`h-1/3 bg-theme-console border-t border-theme-primary flex-col shrink-0 transition-all duration-200 ${showConsole ? 'flex' : 'hidden'}`}>
                <div className="px-4 py-1.5 bg-theme-header text-[10px] uppercase font-bold text-theme-secondary flex justify-between items-center border-b border-theme-primary">
                  <span className={error ? 'text-[var(--accent-red)]' : infoMessage ? 'text-[var(--accent-green)]' : ''}>
                    {error ? 'Errors' : infoMessage ? 'Success' : 'Compiler Logs'}
                  </span>
                  <button onClick={() => setShowConsole(false)} className="hover:text-theme-primary transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <pre
                  className="flex-1 p-4 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap leading-relaxed"
                  style={{ color: error ? 'var(--accent-red)' : infoMessage ? 'var(--accent-green)' : 'var(--text-secondary)' }}
                >
                  {infoMessage || error || '✓ Build successful. No errors reported.'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-theme-primary">
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <h2 className="text-2xl font-bold mb-2">No Template Selected</h2>
                <p className="text-theme-secondary">Please select a template from the left sidebar to get started.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MODE: BUILDER ─── */}
      {mode === 'builder' && (
        <div className="flex-1 flex flex-col border-r border-theme-primary min-w-0">
          {/* Builder header bar */}
          <div className="px-3 py-2 bg-theme-header border-b border-theme-primary flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[var(--accent-blue)] font-bold text-xs uppercase">Template Builder</span>
              {isCompiling && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-ping" />
                  <span className="text-[10px] text-theme-muted uppercase font-bold">Compiling...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => setMode('gallery')}
                className="text-[10px] uppercase font-bold px-3 py-1.5 bg-theme-secondary hover:opacity-80 rounded transition-colors"
              >
                ← Gallery
              </button>
            </div>
          </div>

          {/* Template Builder takes over left + center */}
          <div className="flex-1 overflow-hidden">
            <TemplateBuilder
              onCompile={handleBuilderCompile}
              isCompiling={isCompiling}
            />
          </div>
        </div>
      )}

      {/* ─── Right Column - PDF Preview (shared across modes) ─── */}
      <div className="w-1/2 bg-theme-editor flex flex-col border-l border-theme-primary">
        <div className="px-3 py-2 bg-theme-header border-b border-theme-primary flex items-center justify-between shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-widest text-theme-muted">PDF Preview</span>
          <button
            onClick={() => {
              if (error) {
                setShowConsole(true);
              } else {
                setShowConsole(prev => !prev);
              }
            }}
            className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors ${
              error ? 'bg-[var(--accent-red)] text-white' : 'bg-theme-secondary hover:opacity-80'
            }`}
          >
            Terminal {error ? '(!)' : ''}
          </button>
        </div>
        {pdfUrl ? (
          <iframe 
            key={pdfUrl}
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full h-full border-none" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-theme-muted gap-4 p-8">
            <div className="w-12 h-12 border-4 border-theme-primary border-t-[var(--accent-blue)] rounded-full animate-spin" />
            <p className="text-sm font-medium text-center">
              {isCompiling ? 'Compiling...' : 'Build a template to preview'}
            </p>
            <p className="text-xs text-theme-muted text-center max-w-xs">
              {mode === 'gallery'
                ? 'Select a template from the gallery, fill in your details, and compile.'
                : 'Drag sections from the library, fill in your details, and click Generate Template.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}