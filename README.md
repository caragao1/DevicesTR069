# DevicesTR069 · Limitações de Modelos (IXC ACS)

Aplicação web interna para registrar e consultar limitações e problemas
conhecidos de modelos de equipamentos TR-069 gerenciados pelo **IXC ACS**.

Com a imensidão de firmwares/modelos de equipamentos no dia a dia, esta
aplicação centraliza, por fabricante e modelo, quais limitações são
conhecidas, sua severidade, categoria, firmware(s) afetado(s), possíveis
workarounds e o status de cada uma.

## Funcionalidades

- Consulta 100% pública (sem necessidade de login) por fabricante/modelo,
  com busca e filtros por categoria, severidade e status.
- Login interno (e-mail/senha) apenas para quem for cadastrar/editar dados.
- CRUD de modelos de equipamento e de suas limitações, disponível a
  qualquer usuário logado.
- **Capacidades de equipamentos** (`/capacidades`): consulta os recursos que
  um hardware/firmware específico suporta ou não, registrada a partir da API
  do ACS do cliente (rota `/api/v1/devices/capabilities`) informando
  domínio, client_id/client_secret e o número de série do equipamento.
  Navegação por fabricante → modelo → hardware → firmware. Consulta
  pública; registrar exige login (qualquer cargo). O client_secret é usado
  só na hora do registro e nunca é armazenado.
- Dois cargos de usuário: **Membro** (pode adicionar e editar modelos,
  fabricantes e limitações) e **Administrador** (também pode excluir
  qualquer informação e gerenciar usuários em `/usuarios`). Excluir
  qualquer coisa exige login como Administrador.

## Stack técnica

- [Next.js 16](https://nextjs.org/) (App Router, Server Actions, TypeScript)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [Tailwind CSS 4](https://tailwindcss.com/)
- Autenticação própria e simples: sessão em cookie `httpOnly` assinada com
  JWT ([jose](https://github.com/panva/jose)) e senha com hash
  ([bcryptjs](https://github.com/dcodeIO/bcrypt.js))

## Como rodar localmente

Requer um Postgres acessível (local via Docker, ou um banco gratuito no
[Neon](https://neon.tech)/[Vercel Postgres](https://vercel.com/storage/postgres)).

```bash
npm install

cp .env.example .env
# edite o .env: DATABASE_URL, DIRECT_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

npm run db:migrate   # cria as tabelas e roda o seed
npm run dev           # http://localhost:3000
```

O `db:migrate` já dispara o `db:seed` automaticamente (configurado no
`package.json`), criando o usuário admin (cargo Administrador) e alguns
modelos de exemplo. O seed também pode ser rodado isoladamente a qualquer
momento com `npm run db:seed` — ele é idempotente (não duplica dados
existentes).

Acesse `http://localhost:3000`, você será redirecionado para `/login`.
Use o e-mail/senha definidos em `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env`.
Novos usuários (membros ou outros administradores) são criados pelo próprio
admin em `/usuarios` dentro da aplicação — não é preciso rodar nenhum
script.

## Variáveis de ambiente

Veja `.env.example`:

| Variável         | Descrição                                                              |
| ---------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`   | Connection string do Postgres (conexão pooled, usada em runtime).          |
| `DIRECT_URL`     | Connection string direta do Postgres (sem pooler), usada só pelas migrations. |
| `AUTH_SECRET`    | Segredo usado para assinar o cookie de sessão. Troque em produção.         |
| `ADMIN_EMAIL`    | E-mail do usuário administrador criado pelo seed.                          |
| `ADMIN_PASSWORD` | Senha do usuário administrador criado pelo seed.                           |

## Deploy no Vercel

Não precisa de CLI — dá pra fazer tudo pelo dashboard:

1. **Importe o repositório**: em [vercel.com/new](https://vercel.com/new),
   selecione este repositório GitHub. O Vercel detecta o Next.js
   automaticamente.
2. **Crie o banco Postgres**: na aba **Storage** do projeto, clique em
   *Create Database* → *Postgres* (roda no Neon). O Vercel já injeta as
   variáveis de conexão certas no projeto automaticamente.
   - Se as variáveis vierem com outro nome (ex: `POSTGRES_PRISMA_URL` /
     `POSTGRES_URL_NON_POOLING`), copie os valores para `DATABASE_URL` e
     `DIRECT_URL` em **Settings → Environment Variables** (ou renomeie lá
     mesmo).
3. **Defina as demais variáveis de ambiente** em
   **Settings → Environment Variables**: `AUTH_SECRET` (gere um valor
   aleatório longo, ex: `openssl rand -base64 32`), `ADMIN_EMAIL` e
   `ADMIN_PASSWORD`.
4. **Deploy**: o build (`npm run build`) já roda `prisma migrate deploy`
   antes do `next build`, então as tabelas são criadas automaticamente no
   primeiro deploy — não precisa rodar migração manualmente.
5. **Rode o seed uma vez** (cria o usuário admin), apontando para o banco
   de produção — pegue a connection string em **Storage → seu banco →
   `.env.local`** no dashboard do Vercel:
   ```bash
   DATABASE_URL="<connection-string-de-produção>" \
   ADMIN_EMAIL="..." ADMIN_PASSWORD="..." \
   npx tsx prisma/seed.ts
   ```

A partir do segundo deploy em diante, novas migrations (se você alterar o
schema) são aplicadas automaticamente a cada build.

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
