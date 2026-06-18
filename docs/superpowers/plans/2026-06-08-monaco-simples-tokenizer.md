# Monaco SIMPLES Tokenizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Monaco Editor and register a custom "simples" language with Monarch tokenizer syntax highlighting and dark theme.

**Architecture:** Add `@monaco-editor/react` wrapper as dependency. Create a pure-TS constants file for SIMPLES language keywords/operators. Create `SimplesEditor` React component that registers language, tokenizer, and theme on mount, then renders Monaco Editor. Swap the welcome placeholder on the home page for the editor.

**Tech Stack:** React 18, TypeScript, @monaco-editor/react, Monaco Editor

**Spec:** `docs/superpowers/specs/2026-06-08-monaco-simples-tokenizer-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/package.json` | Modify | Add `@monaco-editor/react` and `monaco-editor` deps |
| `frontend/src/lib/simples-lang.ts` | Create | Pure TS constants: 27 keywords, operators |
| `frontend/src/components/SimplesEditor.tsx` | Create | React component wrapping Monaco, registers language/theme |
| `frontend/src/routes/index.tsx` | Modify | Replace welcome placeholder with `SimplesEditor` |

---

### Task 1: Install Monaco Editor dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install npm packages**

```bash
npm install @monaco-editor/react@^4.7.0 monaco-editor@^0.52.0
```

Run from `frontend/` directory.

Expected: packages added to `package.json` and `node_modules/`, lockfile updated.

---

### Task 2: Create SIMPLES language constants

**Files:**
- Create: `frontend/src/lib/simples-lang.ts`

- [ ] **Step 1: Create constants file**

```typescript
export const SIMPLES_KEYWORDS = [
  "programa", "inicio", "fim",
  "inteiro", "flutuante", "vazio",
  "se", "entao", "senao", "fimse",
  "enquanto", "fimenquanto",
  "para", "de", "ate", "passo", "faca", "fimpara",
  "leia", "escreva", "escreval",
  "e", "ou", "nao",
  "div",
  "procedimento", "retorna",
] as const

export const SIMPLES_OPERATORS = ["<-", "+", "-", "*", "div", ">", "<", "=", "<>", ">=", "<="]
```

- [ ] **Step 2: Verify file**

Check file exists and imports have no errors by running:

```bash
npx tsc --noEmit --strict src/lib/simples-lang.ts
```

Expected: exits with code 0, no output.

---

### Task 3: Create SimplesEditor component

**Files:**
- Create: `frontend/src/components/SimplesEditor.tsx`

- [ ] **Step 1: Create the component**

```typescript
import Editor, { BeforeMount } from '@monaco-editor/react'
import { SIMPLES_KEYWORDS, SIMPLES_OPERATORS } from '../lib/simples-lang'

interface SimplesEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export function SimplesEditor({ value, onChange, readOnly = false }: SimplesEditorProps) {
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.languages.register({ id: 'simples' })

    monaco.languages.setMonarchTokensProvider('simples', {
      ignoreCase: true,
      keywords: SIMPLES_KEYWORDS,
      operators: SIMPLES_OPERATORS,
      symbols: /[=<>+\-*]+/,
      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
          [/\d+\.\d+/, 'number.float'],
          [/\d+/, 'number'],
          [/<-/, 'operator'],
          [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
          [/[(),;]/, 'delimiter'],
          [/\s+/, 'white'],
        ],
      },
    })

    monaco.editor.defineTheme('simples-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '00bcd4', fontStyle: 'bold' },
        { token: 'number', foreground: 'ff9800' },
        { token: 'number.float', foreground: 'ff9800' },
        { token: 'identifier', foreground: 'e0e0e0' },
        { token: 'operator', foreground: 'ce93d8' },
        { token: 'delimiter', foreground: '90a4ae' },
        { token: 'comment', foreground: '66bb6a' },
      ],
      colors: {
        'editor.background': '#1a1a2e',
        'editor.foreground': '#e0e0e0',
        'editor.lineHighlightBackground': '#16213e',
        'editorCursor.foreground': '#00bcd4',
        'editor.selectionBackground': '#0f3460',
      },
    })
  }

  return (
    <Editor
      height="100%"
      language="simples"
      theme="simples-dark"
      beforeMount={handleBeforeMount}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        padding: { top: 12 },
        automaticLayout: true,
        readOnly,
      }}
    />
  )
}
```

---

### Task 4: Integrate editor into home page

**Files:**
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Replace placeholder with SimplesEditor**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SimplesEditor } from '../components/SimplesEditor'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [code, setCode] = useState('')

  return (
    <div className="h-[calc(100vh-80px)]">
      <SimplesEditor value={code} onChange={setCode} />
    </div>
  )
}
```

---

### Task 5: Verify build and lint

**Files:**
- No file changes

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: no warnings or errors, exits with code 0.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: builds successfully, outputs to `dist/`.

- [ ] **Step 4: Commit everything**

```bash
git add .
git commit -m "feat(editor): add Monaco SIMPLES tokenizer

- Install @monaco-editor/react and monaco-editor
- Create lib/simples-lang.ts with 27 keywords and operators
- Create SimplesEditor component with Monarch tokenizer
- Define custom 'simples-dark' theme with language-specific colors
- Integrate editor into home page

Refs #15"
```
