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
    symbols: /[=<>+\-*/[\],:]+/,
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
        [/[^']*'/, 'string'],
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
