interface Example {
  key: string
  label: string
  code: string
}

export const CANONICAL_EXAMPLES: Example[] = [
  {
    key: 'hello',
    label: 'Hello World',
    code: `programa ola_mundo
inicio
  escreva "Ola Mundo";
fim`,
  },
  {
    key: 'atribuicao',
    label: 'Atribuição e expressões',
    code: `programa atribuicao
  inteiro a, b, c;
inicio
  a <- 10;
  b <- 20;
  c <- a + b * 2;
  escreva c;
fim`,
  },
  {
    key: 'leia_escreva',
    label: 'Leia + Escreva',
    code: `programa leia_escreva
  inteiro x;
inicio
  leia x;
  escreva x;
fim`,
  },
  {
    key: 'se',
    label: 'Se / Então / Senão',
    code: `programa se_condicao
  inteiro x;
inicio
  leia x;
  se x > 0 entao
    escreva 1;
  senao
    escreva 0;
  fimse
fim`,
  },
  {
    key: 'enquanto',
    label: 'Enquanto',
    code: `programa enquanto_loop
  inteiro i;
inicio
  i <- 1;
  enquanto i <= 5 faca
    escreva i;
    i <- i + 1;
  fimenquanto
fim`,
  },
  {
    key: 'para',
    label: 'Para / De / Até / Passo',
    code: `programa para_loop
  inteiro i;
inicio
  para i de 1 ate 5 passo 1 faca
    escreva i;
  fimpara
fim`,
  },
  {
    key: 'fatorial',
    label: 'Fatorial',
    code: `programa fatorial
  inteiro n, fat, contador;
inicio
  leia n;
  fat <- 1;
  contador <- 1;
  enquanto contador < n faca
    contador <- contador + 1;
    fat <- fat * contador;
  fimenquanto
  escreva fat;
fim`,
  },
]
