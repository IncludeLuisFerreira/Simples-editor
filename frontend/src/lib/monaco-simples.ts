export const SIMPLES_KEYWORDS = [
  // Estrutura
  "programa", "inicio", "fim",
  // Tipos
  "inteiro", "flutuante", "vazio",
  // Controle
  "se", "entao", "senao", "fimse",
  // Laços
  "enquanto", "fimenquanto",
  "para", "de", "ate", "passo", "faca", "fimpara",
  // E/S
  "leia", "escreva", "escreval",
  // Lógicos
  "e", "ou", "nao",
  // Operador
  "div",
  // Subprograma
  "procedimento", "retorna",
];

export const simplesLanguageDef = {
  ignoreCase: true,
  defaultToken: '',
  keywords: SIMPLES_KEYWORDS,
  operators: [
    '<-', '+', '-', '*', 'div', '>', '<', '=', '<>', '>=', '<='
  ],
  symbols: /[=<>+\-*]+/,
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],
      [/\d+\.\d+/, 'number.float'],
      [/\d+/, 'number'],
      [/<-/, 'operator'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': ''
        }
      }],
      [/[(),;]/, 'delimiter'],
      [/\s+/, 'white'],
    ],
  },
};
