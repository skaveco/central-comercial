# Stack e arquitetura

### Front-end
*   **Next.js 16.x** — App Router e Server Components.
*   **React 19.x**
*   **TypeScript**
*   **Tailwind CSS 4.x**
*   **shadcn/ui** — base de componentes customizável.

### Back-end e banco de dados
*   **Supabase**
    *   PostgreSQL
    *   Auth
    *   Row Level Security (RLS)
    *   Storage
    *   Cron

O MVP utilizará o próprio Next.js como camada de aplicação, sem API/backend separado inicialmente.

### Dados e validação
*   **Supabase Client/Server SDK** para acesso ao banco.
*   **SQL migrations** versionadas pelo Supabase CLI.
*   **Zod** para validação de dados.
*   **React Hook Form** para formulários.

### Interface e módulos específicos
*   **dnd-kit** — movimentação dos cards entre etapas da Pipeline. Etapas são fixas e a ocultação é individual.
*   **shadcn/ui ** — componentes de visualização da Dashboard; Recharts como dependência interna e outros componentes.
*   **Heroicons** — biblioteca padrão de ícones.

### Automações
O **Supabase Cron** integra a stack para rotinas agendadas, quando necessárias. Esfriamento sinaliza oportunidades abertas de Pré-venda/Venda após três dias úteis sem contato confirmado, sem criar tarefa extra; seguir o cálculo em [Tarefas](../Funcionalidades/Tarefas.md), no fuso America/Sao_Paulo.

Automações por etapa, cancelamento de pendências na saída do funil e tarefas de restauração são disparados pela operação confirmada. Persistir mudança de estado e efeitos relacionados de forma atômica, sem execução parcial ou duplicidade; não adiar esses efeitos para uma rotina periódica.

### Arquivos
Anexos de negociações e empresas serão armazenados em buckets privados do **Supabase Storage**.

### Autenticação e permissões
*   convites não liberam acesso: aprovação exclusiva do Administrador;
*   autenticação via Supabase Auth;
*   perfis: Administrador, Pré-venda e Comercial;
*   permissões protegidas na aplicação e no banco com RLS.

### Infraestrutura
*   **Vercel** — deploy e hospedagem da aplicação.
*   **Supabase Cloud** — banco, autenticação, storage e automações.
*   **GitHub** — repositório e versionamento.
*   **pnpm** — gerenciamento de dependências.

### Qualidade
*   **ESLint** — padronização e análise de código.
*   **Vitest** — testes unitários.
*   **Playwright** — testes dos fluxos principais.

### Diretrizes
*   manter a arquitetura simples e monolítica no MVP;
*   evitar microserviços inicialmente;
*   manter regras críticas também no banco quando necessário;
*   utilizar sempre versões estáveis e patches de segurança atualizados.

## Princípios arquiteturais

A aplicação será desenvolvida como um **monólito modular**, permitindo a evolução futura para novos domínios sem reconstruir a base tecnológica.

### Evolução prevista
Fora do MVP, novos módulos poderão ser adicionados futuramente, como:
*   **Projetos**
*   **Financeiro**
*   **Jurídico**
*   **Gestão interna**

### Diretrizes
*   organizar o código por domínios/módulos;
*   evitar acoplamento entre regras de áreas diferentes;
*   manter entidades centrais reutilizáveis entre módulos;
*   evitar duplicação de dados;
*   separar serviços apenas quando houver necessidade técnica real.

### Entidades centrais
Entidades como **Empresa, Contato e Usuário** devem ser compartilhadas entre os módulos.

A evolução natural do fluxo pode seguir a lógica:

**Empresa → Contato → Negociação → Venda → Projeto / Contrato → Financeiro**

Essa estrutura permite que o CRM seja o primeiro módulo de uma plataforma maior de gestão da Skave.

