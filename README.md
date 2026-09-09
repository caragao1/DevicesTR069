# DevicesTR069 · Limitações de Modelos (IXC ACS)

Aplicação web interna para registrar e consultar limitações e problemas
conhecidos de modelos de equipamentos TR-069 gerenciados pelo **IXC ACS**.

Com a imensidão de firmwares/modelos de equipamentos no dia a dia, esta
aplicação centraliza, por fabricante e modelo, quais limitações são
conhecidas, sua severidade, categoria, firmware(s) afetado(s), possíveis
workarounds e o status de cada uma.

## Funcionalidades

- Consulta pública (dentro do time) por fabricante/modelo, com busca e
  filtros por categoria, severidade e status.
- Login interno (e-mail/senha) para a equipe cadastrar e manter os dados.
- CRUD de modelos de equipamento e de suas limitações.
- Toda a aplicação é protegida por autenticação — não há acesso sem login.

## Stack técnica

- [Next.js 16](https://nextjs.org/) (App Router, Server Actions, TypeScript)
- [Prisma](https://www.prisma.io/) + SQLite (arquivo local, sem necessidade
  de infraestrutura de banco de dados separada)
- [Tailwind CSS 4](https://tailwindcss.com/)
- Autenticação própria e simples: sessão em cookie `httpOnly` assinada com
  JWT ([jose](https://github.com/panva/jose)) e senha com hash
  ([bcryptjs](https://github.com/dcodeIO/bcrypt.js))

Sem dependências externas de infraestrutura: o banco de dados é um arquivo
SQLite versionado localmente (fora do git), então basta `npm install` e
rodar as migrações para funcionar.

## Como rodar localmente

```bash
npm install

cp .env.example .env
# edite o .env: defina AUTH_SECRET, ADMIN_EMAIL e ADMIN_PASSWORD

npm run db:migrate   # cria o banco SQLite, as tabelas e roda o seed
npm run dev           # http://localhost:3000
```

O `db:migrate` já dispara o `db:seed` automaticamente (configurado no
`package.json`), criando o usuário admin e alguns modelos de exemplo. O
seed também pode ser rodado isoladamente a qualquer momento com
`npm run db:seed` — ele é idempotente (não duplica dados existentes).

Acesse `http://localhost:3000`, você será redirecionado para `/login`.
Use o e-mail/senha definidos em `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env`.

## Variáveis de ambiente

Veja `.env.example`:

| Variável         | Descrição                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`   | Caminho do arquivo SQLite (padrão: `file:./dev.db`)                   |
| `AUTH_SECRET`    | Segredo usado para assinar o cookie de sessão. Troque em produção.    |
| `ADMIN_EMAIL`    | E-mail do usuário administrador criado pelo seed.                     |
| `ADMIN_PASSWORD` | Senha do usuário administrador criado pelo seed.                      |

## Estrutura do projeto

```
prisma/
  schema.prisma       # modelos: User, DeviceModel, Limitation
  seed.ts              # cria usuário admin + modelos de exemplo
src/
  app/                 # rotas (App Router)
  components/          # componentes de UI compartilhados
  lib/
    actions/           # Server Actions (auth, models, limitations)
    prisma.ts          # cliente Prisma singleton
    session.ts          # sessão (cookie httpOnly assinado)
    constants.ts        # categorias, severidades e status disponíveis
  proxy.ts              # equivalente ao middleware.ts (Next.js 16),
                         # protege todas as rotas exceto /login
```

## Modelo de dados

Cada **modelo de equipamento** (`DeviceModel`) tem fabricante, nome do
modelo e observações gerais. Cada **limitação** (`Limitation`) associada a
um modelo tem:

- Título e descrição
- Categoria (Wi-Fi, Parâmetros TR-069, Provisionamento, Voz/VoIP,
  Atualização de firmware, Diagnóstico, Segurança, Outro)
- Severidade (Baixa, Média, Alta, Crítica)
- Firmware(s) afetado(s)
- Workaround / contorno conhecido
- Status (Conhecido, Em análise, Resolvido)
- Link de referência (chamado, ticket ou documentação do fabricante)
