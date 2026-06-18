# NASM Viewer Panel — Design

> Issue #19 · Sprint 2 — Editor e Compilador
> Data: 2026-06-12 · Status: Aprovado

## Contexto

Criar painel read-only para exibir assembly NASM gerado pelo compilador SIMPLES. O usuário escreve código SIMPLES no editor, compila, e vê o assembly x86 correspondente no painel ao lado.

## Critérios de Aceite

- [ ] Componente NasmViewer com Monaco readOnly
- [ ] Syntax highlighting para assembly (x86)
- [ ] Atualiza conteúdo quando recebe `asm_generated`
- [ ] Splitter arrastável entre Editor e NASM
- [ ] Double-click no splitter colapsa/expande NASM
- [ ] Estado do splitter persistido em localStorage

## Arquivos e Responsabilidades

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/asm-lang.ts` | Criar | Registrar linguagem x86 assembly no Monaco |
| `src/components/NasmViewer.tsx` | Criar | Componente Monaco readOnly |
| `src/hooks/useSplitter.ts` | Criar | Hook do splitter arrastável |
| `src/routes/index.tsx` | Modificar | Layout com splitter + NasmViewer |

## `asm-lang.ts` — Tokenizer x86 Assembly

Registra linguagem `asm-x86` com `monaco.languages.register` e `setMonarchTokensProvider`, mesma estrutura de `simples-lang.ts`.

### Tokens

- **Directivas**: `section`, `global`, `extern`, `bits`, `%define`
- **Instruções**: `mov`, `add`, `sub`, `mul`, `div`, `push`, `pop`, `call`, `ret`, `int`, `cmp`, `jmp`, `je`, `jne`, `jg`, `jl`, `jge`, `jle`, `syscall`, `nop`, `xor`, `inc`, `dec`, `imul`, `idiv`, `neg`, `and`, `or`, `not`, `shl`, `shr`
- **Registradores**: `eax`, `ebx`, `ecx`, `edx`, `esi`, `edi`, `esp`, `ebp`, `eip`, `ax`, `bx`, `cx`, `dx`, `al`, `ah`, `bl`, `bh`
- **Números**: hex (`0x...`), dec, bin (`0b...`)
- **Rótulos**: identificador seguido de `:` — token `label`
- **Comentários**: `;` até fim da linha — token `comment`
- **Strings**: entre aspas duplas — token `string`
- **Operadores**: `+`, `-`, `*`, `/`, `[`, `]`, `,`

### Tema `asm-x86-dark`

- Base: `vs-dark`
- Cores consistentes com `simples-dark`:
  - `keyword` (instruções/directivas): `#00bcd4` bold
  - `number`: `#ff9800`
  - `identifier`: `#e0e0e0`
  - `operator`: `#ce93d8`
  - `delimiter`: `#90a4ae`
  - `comment`: `#66bb6a`
  - `label`: `#ffeb3b` (amarelo)
  - `string`: `#a5d6a7`
  - `register`: `#80cbc4`
- `editor.background`: `#1a1a2e`
- Demais cores de editor iguais ao `simples-dark`

## `NasmViewer.tsx` — Componente

```tsx
interface NasmViewerProps {
  asm: string
}
```

- Usa `@monaco-editor/react` com `language="asm-x86"`, `theme="asm-x86-dark"`
- `readOnly={true}`
- Opções do editor: minimap desligado, fontSize 14, padding top 12, automaticLayout
- Registra linguagem no `beforeMount`
- Monaco re-renderiza automaticamente quando `value` (prop `asm`) muda

## `useSplitter.ts` — Hook

```tsx
interface UseSplitterOptions {
  initialRatio?: number   // 0.6
  minRatio?: number       // 0.2
  storageKey?: string     // "nasm-splitter"
}

interface UseSplitterReturn {
  ratio: number
  collapsed: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  toggleCollapse: () => void
  containerRef: React.RefObject<HTMLDivElement>
}
```

### Comportamentos

- **Drag**: `onMouseDown` na barra adiciona listeners `mousemove`/`mouseup` no `document`. `mousemove` calcula ratio dividindo offset do mouse pela largura total do container. `mouseup` remove listeners e persiste.
- **Double-click**: alterna `collapsed` (NASM oculto, editor 100%). Novo double-click restaura última `ratio`.
- **Persistência**: salva `{ ratio, collapsed }` em `localStorage` via `storageKey`. Restaura no mount. Remove do storage se colapsado for `false` e ratio for o `initialRatio` (valor default).
- **minRatio**: clamp do ratio para não deixar editor < 20%.

## Layout em `routes/index.tsx`

### State

```tsx
const [code, setCode] = useState('')
const [asm, setAsm] = useState('')
const { ratio, collapsed, onMouseDown, onDoubleClick, containerRef } = useSplitter()
```

### Estrutura

```
<div ref={containerRef} className="flex flex-1 min-h-0">
  <div style={{ width: ratio * 100 + '%' }} className="min-w-0">
    <SimplesEditor value={code} onChange={setCode} />
  </div>
  {!collapsed && (
    <div className="flex items-stretch">
      <div
        className="w-1 cursor-col-resize bg-[#0f3460] hover:bg-[#1a4a80] shrink-0"
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
      />
      <div style={{ width: (1 - ratio) * 100 + '%' }} className="min-w-0">
        <NasmViewer asm={asm} />
      </div>
    </div>
  )}
</div>
```

### Splitter Bar

- Largura: 4px (`w-1` com scale, ou `w-[4px]` para precisão)
- Cor: `#0f3460` (mesma do `editor.selectionBackground` do tema SIMPLES)
- Hover: `#1a4a80`
- `cursor-col-resize`
- `shrink-0` para não comprimir

## Tratamento de Estados

- **Empty state**: `asm = ''` → Monaco exibe editor vazio (fundo escuro sem texto)
- **Update**: `asm` muda → Monaco atualiza automaticamente (reatividade do `@monaco-editor/react`)
- **Collapsed**: NASM oculto, editor ocupa 100%, barra do splitter não renderizada
- **Erro**: NasmViewer não tem estado de erro — conteúdo inválido é apenas texto no Monaco

## Testes

- `NasmViewer` renderiza Monaco com `asm` passado como prop
- `useSplitter` retorna `ratio` e `collapsed` corretos, persiste no localStorage
- Double-click alterna collapsed
- Drag modifica ratio e clamp respeita minRatio

## Referências

- PRD §12.1 (Layout desktop)
- PRD §5 RF06 (painel NASM)
- Issue #19
