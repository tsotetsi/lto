'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import axios from 'axios';
import SplitPane from './components/SplitPane';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';

const STORAGE_KEYS = {
  CODE: 'cv_editor_code',
  FONT: 'cv_editor_font'
};

 const AVAILABLE_FONTS = [
   "Liberation Sans",
   "Liberation Serif",
   "Liberation Mono",
   "Fontin", // Bundled custom font.
   "Times New Roman",
   "Arial",
   "Comic Sans MS",
   "Courier New",
   "Georgia",
   "Verdana"
 ];

const RESUME_SNIPPETS = [
  {
    label: "Experience Block",
    code: `\\section{Experience}
\\textbf{Job Title} \\hfill City, Country \\\\
\\textit{Company Name} \\hfill Month Year – Present
\\begin{itemize}
    \\item Developed a LaTeX-based CV automation tool using FastAPI and Next.js.
    \\item Optimized Docker builds using multi-stage layers, reducing image size by 60\\%.
\\end{itemize}\n`
  },
  {
    label: "Education Block",
    code: `\\section{Education}
\\textbf{Degree Name} \\hfill University Name \\\\
\\textit{Major/Specialization} \\hfill Month Year – Month Year\n`
  },
  {
    label: "Skills Grid",
    code: `\\section{Skills}
\\begin{tabular}{ @{} >{\\bfseries}l @{\\hspace{6ex}} l }
Languages & Python, TypeScript, C++, LaTeX \\\\
Tools & Docker, Git, Next.js, FastAPI \\\\
\\end{tabular}\n`
  }
];

export default function CVEditor() {
  const { theme } = useTheme();
  
  // Initialize with empty or default values.
  const [code, setCode] = useState<string>('');
  const [selectedFont, setSelectedFont] = useState(AVAILABLE_FONTS[0]);
  const [isInitialized, setIsInitialized] = useState(false);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [showConsole, setShowConsole] = useState(true);

  // Monaco Editor instance Ref.
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);

  // Refs to track state without triggering re-renders or dependency loops.
  const lastCompiledCodeRef = useRef<string>('');
  const lastCompiledFontRef = useRef<string>(AVAILABLE_FONTS[0]); // Initialize with your default font
  const currentUrlRef = useRef<string | null>(null);

  // Function to insert text at the current cursor position
  const insertSnippet = (snippetCode: string) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const selection = editor.getSelection();
    if (!selection) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const range = new (window as any).monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    );

    // This method handles the insertion and supports Undo/Redo
    editor.executeEdits("snippet-insert", [
      { range: range, text: snippetCode, forceMoveMarkers: true }
    ]);
    
    // Refresh the code state to trigger compilation.
    setCode(editor.getValue());
  };

  // Capture editor instance on mount.
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;

    const date = new Date().toISOString().split('T')[0];
    const fileName = `cv_${date}.pdf`;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const downloadDocx = async () => {
    const contentToCompile = code.trim() || `\\documentclass{article}
\\usepackage[a4paper, margin=2cm]{geometry}
\\begin{document}
\\sffamily\\Huge\\bfseries
\\begin{center}
  Document Blank
\\end{center}
\\end{document}`;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/compile/docx`,
        {
          tex_content: contentToCompile,
          file_name: 'my_cv',
          font: selectedFont,
        },
        { responseType: 'blob' }
      );

      const blob = response.data;
      if (blob.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        const link = document.createElement('a');
        link.href = url;
        link.download = `cv_${date}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          setError(errorData.detail || 'DOCX conversion failed.');
        } catch {
          setError('DOCX conversion failed. Ensure pandoc is installed on the server.');
        }
        setShowConsole(true);
      }
    } catch (err: unknown) {
      let msg = 'DOCX conversion failed.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as any;
        if (axiosErr.response?.data instanceof Blob) {
          const text = await axiosErr.response.data.text();
          try { msg = JSON.parse(text).detail || msg; } catch { msg = text || msg; }
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setShowConsole(true);
    }
  }

  // Try loading from localStorage on mount.
  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEYS.CODE);
    const savedFont = localStorage.getItem(STORAGE_KEYS.FONT);

    if (savedCode) setCode(savedCode);
    else setCode(code);

    if (savedFont && AVAILABLE_FONTS.includes(savedFont)) setSelectedFont(savedFont);
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever content changes.
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEYS.CODE, code);
    localStorage.setItem(STORAGE_KEYS.FONT, selectedFont);
  }, [code, selectedFont, isInitialized]);

  // Debounced compilation logic
  useEffect(() => {
    if (!isInitialized) return;

    const compile = async () => {
      let contentToCompile = code.trim();
      let isPlaceholder = false;

      if (!contentToCompile) {
        isPlaceholder = true;
        contentToCompile = `\\documentclass{article}
\\usepackage[a4paper, margin=2cm]{geometry}
\\begin{document}
\\sffamily
\\Huge\\bfseries
\\begin{center}
  Document Blank
\\end{center}
\\end{document}`;
      } else if (code === lastCompiledCodeRef.current && selectedFont === lastCompiledFontRef.current) {
        return;
      }

      setIsCompiling(true);

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/compile/raw`,
          {
            tex_content: contentToCompile,
            file_name: 'my_cv',
            font: selectedFont,
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
          setInfoMessage(null);
          setShowConsole(true);

          if (!isPlaceholder) {
            lastCompiledCodeRef.current = code;
            lastCompiledFontRef.current = selectedFont;
          }
        } else if (responseBlob.type === 'application/json') {
          const jsonText = await responseBlob.text();
          try {
            const jsonData = JSON.parse(jsonText);
            setInfoMessage(jsonData.message || 'Document blank');
            setError(null);
            setPdfUrl(null);
            setShowConsole(true);
          } catch {
            setError('Failed to parse server response');
          }
        } else {
          const errorText = await responseBlob.text();
          let errorMessage = 'Compilation failed: Could not parse error log.';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || 'Compilation failed.';
          } catch {
            if (errorText) errorMessage = errorText;
          }
          setError(errorMessage);
        }
      } catch (err: unknown) {
        let errorMessage = 'An unknown compilation error occurred.';
        if (err && typeof err === 'object' && 'response' in err) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const axiosError = err as any;
          if (axiosError.response?.data) {
            if (axiosError.response.data instanceof Blob) {
              const text = await axiosError.response.data.text();
              try {
                const errorData = JSON.parse(text);
                errorMessage = errorData.detail || 'Could not find details in error log.';
              } catch {
                errorMessage = text || 'Failed to read error log blob.';
              }
            } else if (axiosError.response.data.detail) {
              errorMessage = axiosError.response.data.detail;
            } else if (axiosError.message) {
              errorMessage = axiosError.message;
            }
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
                setError(errorMessage);
        setShowConsole(true);

      } finally {
        setIsCompiling(false);
      }
    };

    const timeout = setTimeout(compile, 1000);
    return () => clearTimeout(timeout);
  }, [code, selectedFont, isInitialized]);

    // Don't render editor until we've loaded from localStorage to avoid flicker
    if (!isInitialized) {
      return <div className="h-screen w-screen bg-gray-900 flex items-center justify-center text-white">Loading Workspace...</div>;
    }

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-theme-primary text-theme-primary font-sans transition-colors duration-200">
      {/* Snippet Sidebar */}
      <div className="w-48 bg-theme-sidebar border-r border-theme-primary flex flex-col shrink-0">
        <div className="p-4 border-b border-theme-primary">
          <h2 className="text-[10px] uppercase font-bold tracking-widest text-theme-muted">Library</h2>
        </div>
        <div className="p-2 flex flex-col gap-2 overflow-y-auto">
          {RESUME_SNIPPETS.map((snippet) => (
            <button
              key={snippet.label}
              onClick={() => insertSnippet(snippet.code)}
              className="text-left text-[11px] p-2 bg-theme-primary hover:bg-blue-900/20 border border-theme-primary rounded transition-colors group"
            >
              <span className="block font-medium text-theme-primary">{snippet.label}</span>
              <span className="text-[9px] text-theme-muted group-hover:text-blue-400">Click to insert</span>
            </button>
          ))}
        </div>
      </div>

      {/* Split Pane: Editor (Left) vs PDF Preview (Right) */}
      <SplitPane
        left={
          <div className="flex flex-col h-full">
            {/* Header with toolbar */}
            <div className="px-3 py-2 bg-theme-header border-b border-theme-primary flex items-center gap-3 shrink-0 transition-colors duration-200">
              <span className="text-[var(--accent-blue)] font-bold text-xs uppercase mr-2">XeLaTeX</span>

              <select
                id="font-select"
                name="font"
                aria-label="Document font"
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="bg-theme-secondary text-theme-primary text-[11px] border border-theme-primary rounded px-2 py-1 outline-none focus:border-[var(--accent-blue)] transition-colors"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <button
                onClick={downloadPdf}
                disabled={!pdfUrl || isCompiling}
                className={`inline-flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                  !pdfUrl || isCompiling
                    ? 'bg-theme-secondary text-theme-muted cursor-not-allowed'
                    : 'bg-[var(--accent-green)] hover:opacity-90 text-white shadow-lg'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>

              <button
                onClick={downloadDocx}
                disabled={isCompiling}
                className={`inline-flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                  isCompiling
                    ? 'bg-theme-secondary text-theme-muted cursor-not-allowed'
                    : 'bg-theme-secondary hover:bg-theme-header text-theme-primary border border-theme-primary shadow-sm'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                DOCX
              </button>

              <div className="flex-1" />

              <ThemeToggle />

              {isCompiling && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-ping" />
                  <span className="text-[10px] text-theme-muted uppercase font-bold">Compiling...</span>
                </div>
              )}

              <a
                href="/template"
                className="text-[10px] uppercase font-bold px-3 py-1.5 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded transition-all"
              >
                Templates
              </a>
            </div>

            {/* Monaco Editor */}
            <div className="flex-grow">
              <Editor
                height="100%"
                defaultLanguage="latex"
                theme={monacoTheme}
                value={code}
                onMount={handleEditorDidMount}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderWhitespace: 'selection',
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                }}
              />
            </div>

            {/* Terminal/Console */}
            <div
              className={`bg-theme-console border-t border-theme-primary flex-col shrink-0 transition-all duration-200 ${
                showConsole ? 'flex' : 'hidden'
              }`}
              style={{ height: '33%' }}
            >
              <div className="px-4 py-1.5 bg-theme-header text-[10px] uppercase font-bold text-theme-secondary flex justify-between items-center border-b border-theme-primary">
                <div className="flex items-center gap-4">
                  <span
                    className={error ? 'text-[var(--accent-red)]' : infoMessage ? 'text-[var(--accent-green)]' : ''}
                  >
                    {error ? 'Errors' : infoMessage ? 'Success' : 'Compiler Logs'}
                  </span>
                </div>
                <button
                  onClick={() => setShowConsole(false)}
                  className="hover:text-theme-primary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <pre
                className="flex-1 p-4 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap leading-relaxed"
                style={{
                  color: error
                    ? 'var(--accent-red)'
                    : infoMessage
                    ? 'var(--accent-green)'
                    : 'var(--text-secondary)',
                }}
              >
                {error ||
                  infoMessage ||
                  '✓ Build ready. No errors. Start typing LaTeX to compile.'}
              </pre>
            </div>
          </div>
        }
        leftLabel="Editor"
        right={            <div className="bg-theme-editor h-full flex flex-col">
            {pdfUrl ? (
              <iframe
                key={pdfUrl}
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full border-none"
                title="PDF Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">PDF Preview</p>
                  <p className="text-xs text-gray-500">
                    Your compiled document will appear here
                  </p>
                </div>
              </div>
            )}
          </div>
        }
        rightLabel="PDF Preview"
        defaultLeftWidth={55}
        minLeftWidth={30}
        maxLeftWidth={75}
      />
    </main>
  );
}