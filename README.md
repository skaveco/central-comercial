# Central Comercial Skave

Base do CRM comercial da Skave.

## Stack

- Next.js 16, React 19 e TypeScript
- Tailwind CSS 4 e shadcn/ui
- Heroicons
- pnpm

## Comandos

```bash
pnpm dev
pnpm lint
pnpm build
```

O projeto usa App Router e o código da aplicação fica em `src/`. A documentação funcional está em [Introdução](Introdu%C3%A7%C3%A3o/README.md), [Funcionalidades](Funcionalidades/README.md) e [Configurações](Configura%C3%A7%C3%B5es/README.md).

O build usa Webpack porque o Turbopack não consegue abrir um processo interno para CSS neste ambiente. O desenvolvimento continua com `next dev`.

## Supabase

1. Copie `.env.example` para `.env.local`.
2. No painel do Supabase, abra **Connect > App Frameworks > Next.js**.
3. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Reinicie o servidor de desenvolvimento após alterar as variáveis.

A chave publicável pode ser usada pelo navegador quando as tabelas estiverem protegidas por Row Level Security (RLS). Nunca coloque a chave `service_role` em uma variável `NEXT_PUBLIC_*` ou em código enviado ao navegador.

Os clientes ficam separados por ambiente:

- `src/lib/supabase/client.ts`: componentes executados no navegador;
- `src/lib/supabase/server.ts`: Server Components, Server Actions e Route Handlers;
- `src/lib/supabase/proxy.ts`: renovação segura da sessão por cookies.

### Banco de dados

O modelo está documentado em [`supabase/SCHEMA.md`](supabase/SCHEMA.md) e as permissões em [`supabase/ACCESS_CONTROL.md`](supabase/ACCESS_CONTROL.md). Toda alteração estrutural deve ser feita por arquivos versionados em `supabase/migrations/`.

Para validar em um ambiente local, é necessário instalar Docker Desktop ou OrbStack e executar:

```bash
pnpm supabase start
pnpm supabase db reset
pnpm supabase test db
```

`db reset` recria somente o banco local. `db push` altera o projeto remoto e deve ser executado apenas depois da revisão e dos testes locais.

O primeiro Administrador precisa ser promovido depois que sua conta existir no Supabase Auth. A função `bootstrap_first_admin` existe apenas para esse passo inicial, não é acessível pelo navegador e deixa de aceitar chamadas assim que houver um Administrador ativo.
