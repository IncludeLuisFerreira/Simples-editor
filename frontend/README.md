# Simples Editor - Frontend

Frontend do editor online da linguagem SIMPLES, construído com TanStack Start, React e TypeScript.

## Stack

- **React 18** - UI library
- **TypeScript 5** - Type safety
- **TanStack Start** - Full-stack framework
- **TanStack Router** - Type-safe routing
- **Tailwind CSS** - Utility-first styling
- **Vite** - Build tool

## Estrutura

```
app/
├── routes/          # Rotas da aplicação
├── components/      # Componentes reutilizáveis
├── lib/            # Utilitários e configurações
└── styles.css      # Estilos globais
```

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar dev server
npm run dev

# Build de produção
npm run build
```

## Docker

```bash
# Build da imagem
docker build -t simples-frontend .

# Executar
docker run -p 80:80 simples-frontend
```
