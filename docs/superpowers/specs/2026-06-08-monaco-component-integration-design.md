# Monaco Component Integration — Design

> Issue #16 · Sprint 2 — Editor e Compilador
> Data: 2026-06-08

## 1. Contexto e problema

A issue #15 registrou a linguagem SIMPLES no Monaco Editor (tokenizer Monarch + tema dark) e criou o componente `SimplesEditor` com as props `value`, `onChange`, e `readOnly`. O componente já está integrado na página inicial (`/`).

A issue #16 trata da **camada de integração** — garantir que as opções do Monaco Editor estejam configuradas adequadamente para edição de código SIMPLES, que o layout comporte o editor em altura total, e que a experiência de edição (atalhos, auto-indent, bracket matching) funcione conforme esperado.

### 1.1. O que já está implementado (herdado da #15)

| Item | Arquivo | Status |
|------|---------|--------|
| Componente `SimplesEditor` com `@monaco-editor/react` | `src/components/SimplesEditor.tsx` | ✅ |
| Props `value`, `onChange`, `readOnly` | `SimplesEditor.tsx:4-8` | ✅ |
| Language `'simples'` registrada | `SimplesEditor.tsx:12` | ✅ |
| Tema `'simples-dark'` definido | `SimplesEditor.tsx:32-51` | ✅ |
| Tokenizer Monarch com 27 keywords | `SimplesEditor.tsx:14-29` | ✅ |
| Constantes da linguagem | `src/lib/simples-lang.ts` | ✅ |
| Dependências instaladas (`@monaco-editor/react`, `monaco-editor`) | `package.json` | ✅ |

### 1.2. O que precisa ser feito (escopo da #16)

| Item | Descrição |
|------|-----------|
| Opções do editor | `autoIndent`, `autoClosingBrackets`, `matchBrackets`, `tabSize` |
| Layout da página | Editor ocupa altura total abaixo do header (sem magic numbers) |
| Atalhos | Verificar que Ctrl+C/V/Z/X funcionam (Monaco nativo) |

---

## 2. Arquitetura

### 2.1. Árvore de componentes (estado atual + proposta)

```
__root.tsx
└── div.min-h-screen.flex.flex-col
    ├── header (altura natural, border-b)
    └── main.flex-1.flex.flex-col.min-h-0  ← alterar container
        └── Outlet
            └── index.tsx
                └── div.flex-1.flex.flex-col.min-h-0  ← alterar container
                    └── SimplesEditor  ← alterar options
```

### 2.2. Dependências

Nenhuma nova dependência. Apenas alterações de configuração em código existente.

### 2.3. Decisões de design

| Decisão | Alternativa rejeitada | Motivo |
|---------|----------------------|--------|
| `main` sem `container mx-auto p-4` | Manter container e usar calc negativa | Login.tsx já tem próprio alinhamento; container atrapalha editor full-height |
| `flex-1` no container do editor | `h-[calc(100vh-80px)]` | Magic number quebra se header mudar; flex é adaptativo |
| Opções explícitas no Monaco | Confiar nos defaults | Explicitabilidade e auditabilidade; futuras alterações ficam óbvias |

---

## 3. Especificação das mudanças

### 3.1. `SimplesEditor.tsx` — Opções do editor

**Localização:** `frontend/src/components/SimplesEditor.tsx:62-68`

Adicionar ao objeto `options` do `<Editor>`:

```typescript
options={{
  // ... existentes
  minimap: { enabled: false },
  fontSize: 14,
  padding: { top: 12 },
  automaticLayout: true,
  readOnly,
  // novos
  autoIndent: 'full',
  autoClosingBrackets: 'always',
  matchBrackets: 'always',
  tabSize: 2,
}}
```

**Justificativa de cada opção:**

| Opção | Valor | Comportamento |
|-------|-------|---------------|
| `autoIndent: 'full'` | `'full'` | Indenta automaticamente após `entao`, `faca`, etc. — essencial para código SIMPLES que é estruturado por indentação |
| `autoClosingBrackets: 'always'` | `'always'` | Fecha `(`, `[` automaticamente — evita erro de sintaxe em expressões |
| `matchBrackets: 'always'` | `'always'` | Destaca o parêntese/chave correspondente ao cursor |
| `tabSize: 2` | `2` | SIMPLES usa indentação de 2 espaços por nível (padrão adotado na disciplina) |

### 3.2. `__root.tsx` — Layout do container principal

**Localização:** `frontend/src/routes/__root.tsx:43`

**Antes:**
```tsx
<main className="container mx-auto p-4">
  <Outlet />
</main>
```

**Depois:**
```tsx
<main className="flex-1 flex flex-col min-h-0">
  <Outlet />
</main>
```

**Efeito:** O `<main>` passa a ocupar todo o espaço vertical restante após o header (graças ao `flex-1` no pai `min-h-screen.flex.flex-col`). O `min-h-0` permite que o flex item encolha abaixo do conteúdo mínimo.

**Impacto em outras rotas:** Login.tsx usa `min-h-[60vh]` próprio e não depende do container/p4 do main. Nenhuma regressão.

### 3.3. `index.tsx` — Container do editor

**Localização:** `frontend/src/routes/index.tsx:13`

**Antes:**
```tsx
<div className="h-[calc(100vh-80px)]">
  <SimplesEditor value={code} onChange={setCode} />
</div>
```

**Depois:**
```tsx
<div className="flex-1 flex flex-col min-h-0">
  <SimplesEditor value={code} onChange={setCode} />
</div>
```

**Efeito:** O container do editor ocupa todo o espaço disponível dentro do `<main>`, sem depender de um valor hardcoded de altura do header.

### 3.4. Atalhos de teclado

Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+X, Ctrl+A, Ctrl+S, Ctrl+F são gerenciados nativamente pelo Monaco Editor e funcionam sem configuração adicional. Nenhuma ação necessária — apenas verificação.

---

## 4. Verificação

### 4.1. Critérios de aceite (da issue #16)

| # | Critério | Como verificar |
|---|----------|----------------|
| 1 | Componente SimplesEditor com @monaco-editor/react | Já implementado na #15 |
| 2 | Configuração language='simples', theme='simples-dark' | Já implementado na #15 |
| 3 | Props value, onChange, readOnly | Já implementado na #15 |
| 4 | Atalhos padrão (Ctrl+C/V/Z) | Abrir editor, testar atalhos manualmente |
| 5 | Auto-indent e bracket matching | Digitar `se (` → parêntese fecha; Enter → auto-indent |
| 6 | Componente renderiza no layout principal | Editor ocupa altura total abaixo do header |

### 4.2. Testes automatizados

```bash
# TypeScript check
npx tsc --noEmit

# Linter
npm run lint

# Build
npm run build
```

### 4.3. Testes manuais

1. `npm run dev` inicia sem warnings
2. Abrir `http://localhost:5173` → editor visível com fundo escuro (#1a1a2e)
3. Digitar `programa exemplo inicio inteiro x <- 42 fim` → keywords em ciano, `42` em laranja, `<-` em roxo
4. Digitar `se (` → parêntese fecha automaticamente
5. Enter após `se` → cursor indenta
6. Clicar em parêntese de abertura → par de fechamento destacado
7. Header ocupa largura total, editor ocupa espaço restante sem padding lateral

---

## 5. Atualizações de documentação

- `PROGRESS.md`: marcar #16 como concluída
- `docs/superpowers/specs/`: adicionar este documento

---

## 6. Fora de escopo

- Toolbar (Run/Stop/Limpar/exemplos) — issue #27
- Painel NASM — issue #19
- Terminal xterm.js — issue #25
- Highlight de erros de compilação — issue #20
- Layout responsivo/mobile (< 1024px) — v1.1
