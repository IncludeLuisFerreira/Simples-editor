# Monaco Component Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Monaco Editor options explicitly (auto-indent, bracket matching) and fix the page layout so the editor fills the full height below the header.

**Architecture:** Three targeted edits: add Monaco editor options (`autoIndent`, `autoClosingBrackets`, `matchBrackets`, `tabSize`) in `SimplesEditor.tsx`, replace `container mx-auto p-4` with `flex-1` in `__root.tsx`'s main element, and replace `h-[calc(100vh-80px)]` with `flex-1` in `index.tsx`'s editor container.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, @monaco-editor/react

**Spec:** `docs/superpowers/specs/2026-06-08-monaco-component-integration-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/components/SimplesEditor.tsx` | Modify | Add autoIndent, autoClosingBrackets, matchBrackets, tabSize to Monaco options |
| `frontend/src/routes/__root.tsx` | Modify | Change main container from `container mx-auto p-4` to `flex-1 flex flex-col min-h-0` |
| `frontend/src/routes/index.tsx` | Modify | Replace `h-[calc(100vh-80px)]` with `flex-1 flex flex-col min-h-0` |
| `PROGRESS.md` | Modify | Mark issue #16 as completed |

---

### Task 1: Add Monaco editor options

**Files:**
- Modify: `frontend/src/components/SimplesEditor.tsx:62-68`

- [ ] **Step 1: Add auto-indent and bracket matching options**

Edit the `options` prop of `<Editor>` to include explicit configuration:

```typescript
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        padding: { top: 12 },
        automaticLayout: true,
        readOnly,
        autoIndent: 'full',
        autoClosingBrackets: 'always',
        matchBrackets: 'always',
        tabSize: 2,
      }}
```

- [ ] **Step 2: Verify the file parses**

```bash
npx tsc --noEmit src/components/SimplesEditor.tsx
```

Expected: exits with code 0, no output.

---

### Task 2: Fix root layout — full-height main container

**Files:**
- Modify: `frontend/src/routes/__root.tsx:43`

- [ ] **Step 1: Replace main container classes**

Change:
```tsx
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
```
To:
```tsx
      <main className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>
```

- [ ] **Step 2: Verify the file parses**

```bash
npx tsc --noEmit src/routes/__root.tsx
```

Expected: exits with code 0, no output.

---

### Task 3: Fix index page layout — remove magic number

**Files:**
- Modify: `frontend/src/routes/index.tsx:13`

- [ ] **Step 1: Replace container div classes**

Change:
```tsx
    <div className="h-[calc(100vh-80px)]">
      <SimplesEditor value={code} onChange={setCode} />
    </div>
```
To:
```tsx
    <div className="flex-1 flex flex-col min-h-0">
      <SimplesEditor value={code} onChange={setCode} />
    </div>
```

- [ ] **Step 2: Verify the file parses**

```bash
npx tsc --noEmit src/routes/index.tsx
```

Expected: exits with code 0, no output.

---

### Task 4: Verify full build

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

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: builds successfully, outputs to `dist/`.

---

### Task 5: Update PROGRESS.md

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Mark issue #16 as completed**

Edit the Sprint 2 section:
```diff
 ## Sprint 2 — Editor e Compilador (0/6)
 - [ ] #15 feat(editor): add Monaco SIMPLES tokenizer
-- [ ] #16 feat(editor): integrate Monaco component
++ [x] #16 feat(editor): integrate Monaco component
 - [ ] #17 feat(backend): compile endpoint with simplesc
```
Also update the progress percentage in the header.

---

### Task 6: Commit and finalize

**Files:**
- No file changes

- [ ] **Step 1: Stage all changed files**

```bash
git add frontend/src/components/SimplesEditor.tsx \
        frontend/src/routes/__root.tsx \
        frontend/src/routes/index.tsx \
        PROGRESS.md \
        docs/superpowers/specs/2026-06-08-monaco-component-integration-design.md \
        docs/superpowers/plans/2026-06-08-monaco-component-integration-plan.md
```

- [ ] **Step 2: Commit with conventional message**

```bash
git commit -m "feat(editor): integrate Monaco component with explicit editor options

- Add autoIndent, autoClosingBrackets, matchBrackets, tabSize to editor options
- Refactor layout: main container uses flex-1 for full-height editor
- Remove magic number calc from index page layout
- Add design spec and implementation plan

Resolves #16"
```

- [ ] **Step 3: Push and create PR**

```bash
git push -u origin issue-16-integrate-monaco-component

gh pr create \
  --base dev \
  --title "feat(editor): integrate Monaco component with explicit editor options" \
  --body "Closes #16

## Changes
- Add autoIndent, autoClosingBrackets, matchBrackets, tabSize to editor options
- Refactor layout: main container uses flex-1 for full-height editor
- Remove magic number calc from index page layout
- Add design spec and implementation plan

## Testing
- \`npm run build\` passes (tsc + vite build)
- \`npm run lint\` passes with 0 warnings
- Manual: editor fills full height, auto-indent and bracket matching work"
```
