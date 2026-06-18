# NASM Viewer Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a read-only NASM assembly viewer panel with Monaco Editor, draggable splitter, and x86 syntax highlighting.

**Architecture:** Register a custom `asm-x86` language in Monaco (same pattern as `simples`), build a `useSplitter` hook for the draggable divider, and compose Editor + Splitter + NasmViewer in the Index route.

**Tech Stack:** React 18, TypeScript, `@monaco-editor/react`, Tailwind CSS

**Stack:** frontend

**Related spec:** `docs/superpowers/specs/2026-06-12-nasm-viewer-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/lib/asm-lang.ts` | Create | Monaco language registration for x86 assembly |
| `frontend/src/components/NasmViewer.tsx` | Create | Monaco readOnly component |
| `frontend/src/hooks/useSplitter.ts` | Create | Draggable splitter hook with localStorage |
| `frontend/src/routes/index.tsx` | Modify | Add splitter layout + NasmViewer with `asm` state |

---

### Task 1: Create `asm-lang.ts` — Monaco x86 Assembly Tokenizer

**Files:**
- Create: `frontend/src/lib/asm-lang.ts`

- [ ] **Step 1: Create the file with x86 assembly tokenizer**

Write `frontend/src/lib/asm-lang.ts`:

```typescript
const ASM_KEYWORDS = [
  'section', 'global', 'extern', 'bits', 'default', 'absolute',
  'align', 'common', 'cpu', 'group', 'import', 'export',
  'incbin', 'pragma', 'sectalign', 'struc', 'endstruc',
  '%define', '%undef', '%if', '%elif', '%else', '%endif',
  '%macro', '%endmacro', '%include',
]

const ASM_INSTRUCTIONS = [
  'mov', 'add', 'sub', 'mul', 'div', 'imul', 'idiv',
  'push', 'pop', 'pusha', 'popa', 'pushf', 'popf',
  'call', 'ret', 'retf', 'iret',
  'int', 'into', 'int3',
  'cmp', 'test',
  'jmp', 'je', 'jne', 'jg', 'jl', 'jge', 'jle',
  'ja', 'jb', 'jae', 'jbe', 'jz', 'jnz', 'jc', 'jnc', 'jo', 'jno',
  'js', 'jns', 'jp', 'jnp', 'jpe', 'jpo',
  'loop', 'loope', 'loopne', 'loopz', 'loopnz',
  'syscall', 'sysenter', 'sysexit',
  'nop', 'hlt', 'wait', 'xchg', 'lea',
  'xor', 'or', 'and', 'not', 'neg',
  'inc', 'dec',
  'shl', 'shr', 'sal', 'sar', 'rol', 'ror', 'rcl', 'rcr',
  'cbw', 'cwd', 'cdq', 'cwde', 'cdqe',
  'movsb', 'movsw', 'movsd',
  'cmpsb', 'cmpsw', 'cmpsd',
  'stosb', 'stosw', 'stosd',
  'lodsb', 'lodsw', 'lodsd',
  'scasb', 'scasw', 'scasd',
  'rep', 'repe', 'repne', 'repz', 'repnz',
  'enter', 'leave',
]

const ASM_REGISTERS = [
  'eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'esp', 'ebp', 'eip',
  'ax', 'bx', 'cx', 'dx', 'si', 'di', 'sp', 'bp',
  'al', 'ah', 'bl', 'bh', 'cl', 'ch', 'dl', 'dh',
  'cs', 'ds', 'es', 'fs', 'gs', 'ss',
  'cr0', 'cr2', 'cr3', 'cr4',
  'dr0', 'dr1', 'dr2', 'dr3', 'dr6', 'dr7',
  'st0', 'st1', 'st2', 'st3', 'st4', 'st5', 'st6', 'st7',
  'mm0', 'mm1', 'mm2', 'mm3', 'mm4', 'mm5', 'mm6', 'mm7',
  'xmm0', 'xmm1', 'xmm2', 'xmm3', 'xmm4', 'xmm5', 'xmm6', 'xmm7',
]

const ASM_DIRECTIVES = ['.data', '.text', '.bss', '.rodata', '.code', '.stack']

export function registerAsmLang(monaco: typeof import('monaco-editor')) {
  if (monaco.languages.getLanguages().some((l) => l.id === 'asm-x86')) return

  monaco.languages.register({ id: 'asm-x86' })

  monaco.languages.setMonarchTokensProvider('asm-x86', {
    ignoreCase: true,
    keywords: [...ASM_KEYWORDS, ...ASM_INSTRUCTIONS],
    registers: ASM_REGISTERS,
    directives: ASM_DIRECTIVES,
    symbols: /[=<>+\-*\/\[\],:]+/,
    escapes: /\\(?:[abfnrtv\\"'0-7\xX])/,
    tokenizer: {
      root: [
        [/[a-zA-Z_][\w.]*:/, 'label'],
        [/[a-zA-Z_.][\w.]*/, {
          cases: {
            '@directives': 'keyword',
            '@keywords': 'keyword',
            '@registers': 'register',
            '@default': 'identifier',
          },
        }],
        { include: '@whitespace' },
        [/[;,.]/, 'delimiter'],
        [/\d+[hH]/, 'number.hex'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/[0-9]+/, 'number'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
      ],
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/;.*$/, 'comment'],
      ],
    },
  })

  monaco.editor.defineTheme('asm-x86-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '00bcd4', fontStyle: 'bold' },
      { token: 'register', foreground: '80cbc4' },
      { token: 'label', foreground: 'ffeb3b' },
      { token: 'number', foreground: 'ff9800' },
      { token: 'number.hex', foreground: 'ff9800' },
      { token: 'identifier', foreground: 'e0e0e0' },
      { token: 'operator', foreground: 'ce93d8' },
      { token: 'delimiter', foreground: '90a4ae' },
      { token: 'comment', foreground: '66bb6a' },
      { token: 'string', foreground: 'a5d6a7' },
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/asm-lang.ts
git commit -m "feat(frontend): add Monaco x86 assembly language registration

- Register asm-x86 language with tokenizer for instructions, registers, directives, labels, numbers, strings, comments
- Define asm-x86-dark theme consistent with simples-dark

Refs #19"
```

---

### Task 2: Create `NasmViewer.tsx` — Monaco ReadOnly Component

**Files:**
- Create: `frontend/src/components/NasmViewer.tsx`

- [ ] **Step 1: Create the component**

Write `frontend/src/components/NasmViewer.tsx`:

```typescript
import Editor, { BeforeMount } from '@monaco-editor/react'
import { registerAsmLang } from '../lib/asm-lang'

interface NasmViewerProps {
  asm: string
}

export function NasmViewer({ asm }: NasmViewerProps) {
  const handleBeforeMount: BeforeMount = (monaco) => {
    registerAsmLang(monaco)
  }

  return (
    <Editor
      height="100%"
      language="asm-x86"
      theme="asm-x86-dark"
      beforeMount={handleBeforeMount}
      value={asm}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        padding: { top: 12 },
        automaticLayout: true,
        readOnly: true,
        lineNumbers: 'on',
        tabSize: 2,
      }}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/NasmViewer.tsx
git commit -m "feat(frontend): add NasmViewer read-only Monaco component

- Create NasmViewer with asm prop
- Uses asm-x86 language and dark theme
- ReadOnly with consistent editor options

Refs #19"
```

---

### Task 3: Create `useSplitter.ts` — Draggable Splitter Hook

**Files:**
- Create: `frontend/src/hooks/useSplitter.ts`

- [ ] **Step 1: Create the hook**

Write `frontend/src/hooks/useSplitter.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSplitterOptions {
  initialRatio?: number
  minRatio?: number
  storageKey?: string
}

interface UseSplitterReturn {
  ratio: number
  collapsed: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

interface StoredState {
  ratio: number
  collapsed: boolean
}

const DEFAULT_INITIAL_RATIO = 0.6
const DEFAULT_MIN_RATIO = 0.2
const DEFAULT_STORAGE_KEY = 'nasm-splitter'

function loadState(key: string): StoredState | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as StoredState
  } catch {
    return null
  }
}

function saveState(key: string, state: StoredState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useSplitter(options: UseSplitterOptions = {}): UseSplitterReturn {
  const {
    initialRatio = DEFAULT_INITIAL_RATIO,
    minRatio = DEFAULT_MIN_RATIO,
    storageKey = DEFAULT_STORAGE_KEY,
  } = options

  const stored = loadState(storageKey)
  const [ratio, setRatio] = useState(stored?.ratio ?? initialRatio)
  const [collapsed, setCollapsed] = useState(stored?.collapsed ?? false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)
  const lastRatio = useRef(ratio)

  const persist = useCallback(
    (r: number, c: boolean) => {
      saveState(storageKey, { ratio: r, collapsed: c })
    },
    [storageKey],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      const startX = e.clientX
      const startRatio = ratio
      const container = containerRef.current
      if (!container) return

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragging.current) return
        const dx = moveEvent.clientX - startX
        const containerWidth = container.getBoundingClientRect().width
        if (containerWidth === 0) return
        let newRatio = startRatio + dx / containerWidth
        newRatio = Math.max(minRatio, Math.min(1 - minRatio, newRatio))
        setRatio(newRatio)
        lastRatio.current = newRatio
      }

      const onMouseUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        persist(lastRatio.current, collapsed)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [ratio, minRatio, collapsed, persist],
  )

  const onDoubleClick = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      if (next) {
        lastRatio.current = ratio
        persist(ratio, true)
      } else {
        const restoreRatio = lastRatio.current
        setRatio(restoreRatio)
        persist(restoreRatio, false)
      }
      return next
    })
  }, [ratio, persist])

  useEffect(() => {
    return () => {
      dragging.current = false
    }
  }, [])

  return {
    ratio,
    collapsed,
    onMouseDown,
    onDoubleClick,
    containerRef,
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSplitter.ts
git commit -m "feat(frontend): add useSplitter hook with localStorage persistence

- Draggable vertical splitter with min/max ratio clamping
- Double-click to collapse/expand NASM panel
- State persisted in localStorage under configurable key

Refs #19"
```

---

### Task 4: Update `routes/index.tsx` — Integrate Splitter + NasmViewer

**Files:**
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Update the Index route with splitter layout**

Replace `frontend/src/routes/index.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SimplesEditor } from '../components/SimplesEditor'
import { NasmViewer } from '../components/NasmViewer'
import { useSplitter } from '../hooks/useSplitter'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [code, setCode] = useState('')
  const [asm] = useState('')
  const { ratio, collapsed, onMouseDown, onDoubleClick, containerRef } =
    useSplitter()

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0">
      <div style={{ width: `${ratio * 100}%` }} className="min-w-0 flex flex-col">
        <SimplesEditor value={code} onChange={setCode} />
      </div>
      {!collapsed && (
        <>
          <div
            className="w-[4px] cursor-col-resize bg-[#0f3460] hover:bg-[#1a4a80] shrink-0 transition-colors"
            onMouseDown={onMouseDown}
            onDoubleClick={onDoubleClick}
          />
          <div style={{ width: `${(1 - ratio) * 100}%` }} className="min-w-0 flex flex-col">
            <NasmViewer asm={asm} />
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run lint**

Run: `cd frontend && npm run lint`
Expected: No warnings.

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "feat(frontend): integrate NasmViewer with splitter layout

- Add splitter layout between SimplesEditor and NasmViewer
- Wire useSplitter hook with drag and double-click collapse
- Add asm state placeholder for future WebSocket integration

Refs #19"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All 6 acceptance criteria are covered: Monaco readOnly (Task 2), syntax highlighting (Task 1), asm prop update (Task 2), draggable splitter (Task 3), double-click collapse (Task 3), localStorage persistence (Task 3).
- [x] **Placeholder scan**: No TBD, TODO, or incomplete steps. Every code block has complete code.
- [x] **Type consistency**: `useSplitter` return types match usage in `index.tsx`. `registerAsmLang` signature matches `BeforeMount` callback.
