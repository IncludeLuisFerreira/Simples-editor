# Monaco SIMPLES Tokenizer — Design

> Issue #15 · Sprint 2 — Editor e Compilador
> Data: 2026-06-08

## Dependências

Adicionar ao `frontend/package.json`:

- `@monaco-editor/react` ^4.7.0 — wrapper React para Monaco Editor
- `monaco-editor` ^0.52.0 — core do Monaco Editor

## Estrutura de arquivos

```
frontend/src/
  lib/
    simples-lang.ts              ← constantes puras (keywords, operadores)
  components/
    SimplesEditor.tsx            ← componente React + registro Monaco
```

## `lib/simples-lang.ts`

Exporta constantes da linguagem SIMPLES sem depender de Monaco — TypeScript puro.

```ts
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

## `components/SimplesEditor.tsx`

Componente React que encapsula Monaco Editor e registra a linguagem SIMPLES via `beforeMount`.

### Fluxo

1. `@monaco-editor/react` carrega Monaco assincronamente
2. `beforeMount` recebe a instância `monaco`
3. Registra language `simples` com `monaco.languages.register()`
4. Registra o Monarch tokenizer com `monaco.languages.setMonarchTokensProvider()`
5. Define tema dark customizado com `monaco.editor.defineTheme()`
6. Renderiza `<Editor>` com `language="simples"` e `theme="simples-dark"`

### Tokenizer Monarch

| Regra | Token | Exemplo |
|-------|-------|---------|
| Palavra reservada | `keyword` | `programa`, `se`, `enquanto` |
| Identificador | `identifier` | `x`, `meuNome` |
| Inteiro | `number` | `42` |
| Flutuante | `number.float` | `3.14` |
| Atribuição `<-` | `operator` | `x <- 10` |
| Outros operadores | `operator` | `+`, `-`, `*`, `div`, `>`, `<`, `=`, `<>`, `>=`, `<=` |
| Delimitadores | `delimiter` | `(`, `)`, `,`, `;` |
| Espaço | `white` | espaços, tabs, newlines |

### Tema dark `simples-dark`

| Token | Cor | Significado |
|-------|-----|-------------|
| `keyword` | `#00bcd4` (ciano) + bold | Palavras reservadas |
| `number` / `number.float` | `#ff9800` (laranja) | Literais numéricos |
| `identifier` | `#e0e0e0` (neutro) | Nomes de variáveis |
| `operator` | `#ce93d8` (roxo claro) | Operadores |
| `delimiter` | `#90a4ae` (cinza) | Parênteses, vírgulas, ponto-e-vírgula |
| `comment` | `#66bb6a` (verde) | Comentários (reservado para futuro) |

Cores do editor:
- `editor.background`: `#1a1a2e`
- `editor.foreground`: `#e0e0e0`
- `editor.lineHighlightBackground`: `#16213e`
- `editorCursor.foreground`: `#00bcd4`
- `editor.selectionBackground`: `#0f3460`

### Props

O componente aceita as props `value` (código), `onChange` (callback), `readOnly` (booleano) — alinhado com a issue #16 que virá em seguida.

## Critérios de aceite (da issue #15)

- [x] `monaco.languages.register({ id: 'simples' })`
- [x] Tokenizer Monarch com 27 keywords
- [x] Operators: <-, +, -, *, div, >, <, =, <>, >=, <=
- [x] Numbers (inteiro e flutuante) destacados
- [x] Tema dark customizado
- [x] Editor renderiza código SIMPLES com cores

## Integração na página inicial

O `SimplesEditor` é inserido na rota `/` (`routes/index.tsx`) substituindo o placeholder atual. A altura ocupará toda a área disponível (`flex-1`).

## Testes (manual)

1. `npm install` instala as novas dependências sem erro
2. `npm run dev` inicia sem warnings
3. Abrir a página inicial → editor Monaco visível com fundo escuro
4. Digitar `programa exemplo inicio inteiro x <- 42 fim` → palavras reservadas em ciano, `x` em cinza claro, `42` em laranja, `<-` em roxo
5. `npm run lint -- --max-warnings 0` passa sem erros
