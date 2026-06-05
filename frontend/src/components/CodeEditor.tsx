import { useEffect, useRef } from 'react';
import Editor, { loader, OnMount } from '@monaco-editor/react';
import { simplesLanguageDef } from '../lib/monaco-simples';

loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs' } });

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

export function CodeEditor({ code, onChange, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Registrar a linguagem SIMPLES se ainda não estiver registrada
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'simples')) {
      monaco.languages.register({ id: 'simples' });
      monaco.languages.setMonarchTokensProvider('simples', simplesLanguageDef as any);

      monaco.languages.setLanguageConfiguration('simples', {
        comments: {
          lineComment: '//',
        },
        autoClosingPairs: [
          { open: '(', close: ')' },
          { open: '[', close: ']' },
        ],
        surroundingPairs: [
          { open: '(', close: ')' },
          { open: '[', close: ']' },
        ],
      });
    }

    // Definir tema escuro customizado
    monaco.editor.defineTheme('simples-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '4ec9b0', fontStyle: 'bold' },
        { token: 'number', foreground: 'ce9178' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'identifier', foreground: '9cdcfe' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
      }
    });

    monaco.editor.setTheme('simples-dark');
  };

  return (
    <div className="w-full h-full min-h-[400px] border border-gray-700 rounded-md overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="simples"
        value={code}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          readOnly: readOnly,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
