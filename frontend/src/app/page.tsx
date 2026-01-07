'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const STORAGE_KEYS = {
  CODE: 'cv_editor_code',
  FONT: 'cv_editor_font'
};

const AVAILABLE_FONTS = [
  "Liberation Sans",
  "Liberation Serif",
  "Liberation Mono",
  "Fontin" // Bundled custom font.
];

export default function CVEditor() {
  
  // Initialize with empty or default values.
  const [code, setCode] = useState<string>('\\documentclass{article}\n\\begin{document}\n\\section{Experience}\nSoftware Engineer at Google\n\\end{document}');
  const [selectedFont, setSelectedFont] = useState(AVAILABLE_FONTS[0]);
  const [isInitialized, setIsInitialized] = useState(false);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [showConsole, setShowConsole] = useState(false);

  // Refs to track state without triggering re-renders or dependency loops.
  const lastCompiledCodeRef = useRef<string>('');
  const lastCompiledFontRef = useRef<string>(AVAILABLE_FONTS[0]); // Initialize with your default font
  const currentUrlRef = useRef<string | null>(null);

  // Try loading from localStorage on mount
  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEYS.CODE);
    const savedFont = localStorage.getItem(STORAGE_KEYS.FONT);

    if (savedCode) setCode(savedCode);
    else setCode('% Welcome! Start your CV here...\n\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}');

    if (savedFont && AVAILABLE_FONTS.includes(savedFont)) setSelectedFont(savedFont);
    setIsInitialized(true);
  }, []);

  const compileLatex = useCallback(async (texContent: string, fontName: string) => {
    // 1. Don't compile if the content hasn't changed
    if (texContent === lastCompiledCodeRef.current && fontName === lastCompiledFontRef.current) {
      return;
    }

    setIsCompiling(true);
    try {
      const response = await axios.post(
        'http://localhost:8000/compile',
        {
          tex_content: texContent,
          file_name: 'my_cv',
          font: fontName,
        },
        { responseType: 'blob' }
      );

      const responseBlob = response.data;

      if (responseBlob.type === 'application/pdf') {
        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
        }

        const url = URL.createObjectURL(responseBlob);
        currentUrlRef.current = url;
        setPdfUrl(url);
        setError(null);
        lastCompiledCodeRef.current = texContent;
        lastCompiledFontRef.current = fontName;
      } else {
        const errorText = await responseBlob.text();
        let errorMessage = 'Compilation failed: Could not parse error log.';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || 'Compilation failed.';
        } catch (e) {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        setError(errorMessage);
        setShowConsole(true);
      }
    } catch (err: any) {
      let errorMessage = 'An unknown compilation error occurred.';
      if (err.response?.data) {
        if (err.response.data instanceof Blob) {
          const text = await err.response.data.text();
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.detail || 'Could not find details in error log.';
          } catch {
            errorMessage = text || 'Failed to read error log blob.';
          }
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else {
          errorMessage = err.message || 'Connection to compiler lost.';
        }
      } else {
        errorMessage = err.message || 'A network error occurred.';
      }
      setError(errorMessage);
      setShowConsole(true);
    } finally {
      setIsCompiling(false);
    }
  }, []);

  // Debounce logic
  useEffect(() => {
    const timeout = setTimeout(() => {
      compileLatex(code, selectedFont);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [code, selectedFont, compileLatex]);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white font-sans">
      {/* Left Column */}
      <div className="w-1/2 flex flex-col border-r border-gray-700 h-full">
        {/* Updated Header with Dropdown */}
        <div className="p-3 bg-gray-800 flex justify-between items-center shrink-0 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-blue-400 font-bold text-xs uppercase">XeLaTeX</span>
            
            <select 
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="bg-gray-700 text-[11px] border border-gray-600 rounded px-2 py-1 outline-none focus:border-blue-500"
            >
              {AVAILABLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {isCompiling && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <span className="text-[10px] text-gray-400 uppercase">Compiling...</span>
                </div>
            )}
          </div>
          <button 
            onClick={() => setShowConsole(!showConsole)}
            className={`text-[10px] uppercase font-bold px-3 py-1 rounded transition-colors ${
              error ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Terminal {error ? '(!)' : ''}
          </button>
        </div>

        <div className="flex-grow overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="latex"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{ 
              minimap: { enabled: false }, 
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>

        {showConsole && (
          <div className="h-1/3 bg-[#0a0a0a] border-t border-gray-700 flex flex-col shrink-0">
            <div className="px-4 py-1.5 bg-gray-800 text-[10px] uppercase font-bold text-gray-400 flex justify-between items-center">
              <span>Compiler Logs</span>
              <button onClick={() => setShowConsole(false)} className="hover:text-white">Close</button>
            </div>
            <pre
              className="p-4 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap leading-relaxed"
              style={{ color: error ? '#f87171' : '#4ade80' }}
            >
              {error || 'Build Successful. No errors reported.'}
            </pre>
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="w-1/2 bg-[#1e1e1e] flex flex-col">
        {pdfUrl ? (
          <iframe 
            key={pdfUrl} // Using key forces iframe to re-mount correctly only when URL changes
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full h-full border-none" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
            <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Booting PDF Engine...</p>
          </div>
        )}
      </div>
    </main>
  );
}