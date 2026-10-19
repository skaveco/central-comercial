# Modelo de dados — Central Comercial

## Objetivo

Este documento descreve o modelo inicial implementado pelas migrations. A instalação atende somente à operação interna da Skave. Não existe separação por organização no MVP.

As regras detalhadas continuam nas especificações de `docs/Funcionalidades/` e `docs/Configurações/`. Este documento traduz essas regras para entidades, relações, integridade e acesso.

## Princípios

- `auth.users` autentica a pessoa; `profiles` guarda perfil, cargo e aprovação.
- Uma oportunidade mantém o mesmo ID durante todo o ciclo comercial e o Pós-venda.
- Passagens por etapas e encerramentos são registros históricos imutáveis.
- Apenas um encerramento pode ser o resultado vigente de uma oportunidade.
- Reabertura invalida o resultado vigente sem apagar o evento anterior.
- Produtos vinculados guardam os dados e o preço usados no momento do vínculo.
- Saídas de funil, transferências e tarefas automáticas são executadas na mesma transação.
- Registros comerciais não são apagados fisicamente. Exclusões permitidas pela interface são registradas para auditoria.
- Valores monetários usam `numeric(14,2)`, nunca ponto flutuante.
- Datas de negócio usam `timestamptz`; datas sem horário usam `date`. A aplicação apresenta tudo em `America/Sao_Paulo`.

## Identidade e acesso

### `profiles`

Extensão segura de `auth.users`.

Campos principais:

- `id`: mesmo UUID de `auth.users`.
- `name`.
- `role`: `admin`, `pre_sales` ou `commercial`.
- `access_status`: `pending`, `active`, `rejected` ou `disabled`.
- `approved_by`, `approved_at`.
- `disabled_by`, `disabled_at`.
- `created_at`, `updated_at`.

Regras:

- Um cadastro novo começa como `pending` e não acessa os dados comerciais.
- Somente Administrador aprova, recusa, define cargo ou desativa.
- Não é permitido desativar o último Administrador ativo.
- A desativação somente termina após a transferência atômica das responsabilidades.

## Funis

### `pipelines`

Funis fixos do MVP:

- Pré-venda;
- Venda;
- Pós-venda.

### `pipeline_stages`

Etapas fixas, ordenadas e ligadas ao respectivo funil.

- Pré-venda: Lead, Primeiro contato, Qualificação e Agendado.
- Venda: Diagnóstico, Proposta em andamento, Proposta enviada, Negociação, Ganho e Perdido.
- Pós-venda: Onboarding, Cliente ativo, Entrega concluída e Acompanhamento.

`Agendado`, `Ganho` e `Perdido` existem para representar destinos e formulários do fluxo, mas não acumulam cards ativos após a confirmação do evento correspondente.

### `user_stage_preferences`

Guarda `user_id`, `stage_id` e `is_hidden`. A ocultação vale somente para o usuário que a realizou. A combinação usuário/etapa é única.

## Catálogos

Tabelas:

- `segments`;
- `opportunity_sources`;
- `loss_reasons`;
- `product_categories`;
- `qualification_parameters`.

Campos comuns:

- `id`, `name`, `is_active`, `sort_order`;
- `created_by`, `created_at`, `updated_by`, `updated_at`.

Regras:

- Somente Administrador gerencia os catálogos.
- Registros utilizados são desativados, não apagados.
- Nomes que precisam ser únicos são comparados após remover espaços nas extremidades e ignorar maiúsculas/minúsculas.
- Deve haver entre dois e cinco parâmetros de qualificação ativos.

### `sales_goal_changes`

Guarda `effective_month`, `amount`, autoria e datas. O valor de um mês é a alteração mais recente com vigência igual ou anterior ao mês consultado. Isso repete a meta até uma nova alteração e preserva os meses anteriores.

Somente Administrador pode cadastrar ou alterar metas.

## Empresas e contatos

### `companies`

Campos principais:

- `name` obrigatório;
- `cnpj` e `cnpj_normalized` opcionais;
- `email`, `phone`, `address` opcionais;
- `segment_id` opcional;
- `is_active`;
- autoria e datas de criação, atualização e alteração de status.

`cnpj_normalized` é único quando informado, inclusive para empresas desativadas.

### `contacts`

Campos principais:

- `name` obrigatório;
- `phone`, `phone_normalized`, `email`, `email_normalized` opcionais;
- `source_id` opcional;
- `is_active`;
- autoria e datas de criação, atualização e alteração de status.

E-mail e telefone repetidos geram aviso na aplicação, mas não possuem restrição única no banco.

### `company_contacts`

Relação muitos-para-muitos entre empresas e contatos.

Campos principais:

- `company_id`, `contact_id`;
- `job_title` opcional;
- `is_active`, `linked_by`, `linked_at`, `unlinked_by`, `unlinked_at`.

A combinação empresa/contato é única. Desvincular preserva o registro e impede novas seleções enquanto estiver inativo.

## Produtos

### `products`

Campos principais:

- `name` e `category_id` obrigatórios;
- `description` opcional;
- `base_price` opcional, maior ou igual a zero;
- `is_active`;
- autoria e datas.

Somente Administrador gerencia produtos. Todos os usuários ativos podem consultar produtos e categorias.

## Oportunidades

### `opportunities`

Registro central da negociação.

Campos principais:

- `name` obrigatório;
- `company_id`, `contact_id`, `source_id` opcionais;
- `responsible_id` obrigatório;
- `current_pipeline_id` e `current_stage_id`;
- `commercial_status`: `active`, `won`, `lost`, `disqualified` ou `archived`;
- `post_sale_status`: `active`, `finished`, `interrupted` ou nulo;
- `temperature`: `cold`, `warm`, `hot` ou nulo;
- `description` opcional;
- `expected_close_date` opcional;
- `value_mode`: `calculated` ou `manual`;
- `final_value` opcional, maior ou igual a zero;
- `last_contact_at` opcional;
- `created_directly_as_won`: identifica cadastros feitos diretamente em Ganho/Pós-venda para o Ciclo médio;
- `created_by`, `created_at`, `updated_by`, `updated_at`.

Regras de integridade:

- A etapa sempre pertence ao funil informado.
- Empresa e contato informados juntos precisam ter vínculo ativo para novos cadastros, sem invalidar relações históricas.
- O responsável deve estar ativo e habilitado para o funil.
- Oportunidade ativa pertence a Pré-venda ou Venda.
- Oportunidade ganha pode manter o resultado comercial e estar simultaneamente em uma etapa operacional de Pós-venda.
- Perdida, Desqualificada e Arquivada não mantêm card em funil ativo.

### `opportunity_products`

Uma linha por produto em cada oportunidade.

Campos principais:

- `opportunity_id`, `product_id`;
- `quantity`, inteiro maior que zero;
- snapshots `product_name`, `product_description`, `category_id`, `category_name` e `unit_price`;
- autoria e datas.

A combinação oportunidade/produto é única. Selecionar o mesmo produto aumenta sua quantidade. Mudanças posteriores no catálogo não alteram os snapshots.

### `opportunity_qualification_answers`

Guarda uma resposta booleana por oportunidade e parâmetro, com o texto do parâmetro preservado. Respostas positivas e negativas contam como preenchidas.

### `opportunity_qualification_validations`

Registra cada validação concluída com a quantidade de parâmetros ativos respondidos, autor, data e operação que exigiu a validação. Esse registro mantém a métrica histórica mesmo se o catálogo mudar depois.

### `opportunity_stage_entries`

Histórico imutável de passagem por etapas.

Campos principais:

- oportunidade, funil e etapa;
- `entered_at`, `entered_by`;
- snapshots de `responsible_id` e `source_id` no momento da entrada;
- origem da entrada: criação, movimentação, transferência, restauração, reabertura ou automação;
- `operation_id` para impedir duplicação da mesma confirmação.

Essa tabela sustenta as métricas de passagem e primeira entrada sem deduzi-las da etapa atual. Registros anteriores à migration da Dashboard foram preenchidos com os valores atuais disponíveis; novas entradas preservam os valores históricos exatos.

### `opportunity_outcomes`

Histórico de encerramentos comerciais.

Campos principais:

- `result`: `won`, `lost`, `disqualified` ou `archived`;
- `loss_reason_id` somente para perda;
- `archive_reason`: inclui a indicação de Sem resposta quando aplicável;
- `notes` opcional;
- snapshots de `final_value` e `responsible_id`;
- funil e etapa anteriores;
- `closed_at`, `closed_by`;
- `is_current`;
- `invalidated_at`, `invalidated_by` quando houver reabertura.

Um índice parcial garante no máximo um resultado vigente por oportunidade. Ganho, perda ou arquivamento repetido não cria outro resultado vigente.

### `post_sale_cycles`

Representa cada ciclo de acompanhamento iniciado por um ganho.

Campos principais:

- `opportunity_id`, `outcome_id`;
- etapa atual do Pós-venda;
- `status`: `active`, `finished` ou `interrupted`;
- início, finalização/interrupção e respectivos autores;
- motivo de finalização opcional.

Um novo ganho após reabertura inicia outro ciclo; ciclos anteriores permanecem preservados.

## Operação comercial

### `tasks`

Campos principais:

- `title`, `type`, `responsible_id` e `due_date` obrigatórios;
- `due_time` opcional, exceto nos fluxos que exigem horário;
- `description` opcional;
- vínculos opcionais com oportunidade, empresa e contato;
- `status`: `pending`, `completed` ou `cancelled`;
- `created_by` opcional e `creation_source`: `manual` ou `system`;
- `automation_key`, `stage_entry_id` e `post_sale_cycle_id` para automações;
- dados de conclusão, cancelamento, reagendamento e exclusão auditável;
- autoria e datas.

Uma restrição impede duas tarefas automáticas equivalentes para a mesma entrada de etapa. Tarefas canceladas nunca são reativadas.

Na criação e na edição, o banco valida a elegibilidade do responsável, a correspondência entre oportunidade, empresa e contato e o vínculo ativo entre empresa e contato quando não há oportunidade. Vínculos históricos inativados são preservados quando a edição não os altera. Tarefas de Gestão não podem ser vinculadas a uma oportunidade.

### `contact_interactions`

Registros de contato confirmado com canal, data/hora real, observação, oportunidade e tarefa opcional. A data não pode estar no futuro.

Ao inserir uma interação válida, `opportunities.last_contact_at` recebe somente a maior data de interação registrada. Notas e tarefas concluídas sem contato não entram nesta tabela.

### Notas

Tabelas separadas preservam chaves estrangeiras claras:

- `company_notes`;
- `contact_notes`;
- `opportunity_notes`.

Cada nota guarda texto, autor original, datas de edição e usuário que editou. A exclusão é auditável e não expõe o texto apagado no registro de atividade.

### `attachments`

Metadados de arquivos privados vinculados a uma empresa ou oportunidade, com nome, caminho no Storage, tipo MIME, tamanho, autor e remoção auditável. Uma restrição garante exatamente um vínculo por anexo.

Buckets privados separados podem ser usados para anexos de empresas e oportunidades. O limite é de 20 MB por arquivo e os formatos são validados conforme cada módulo.

### `activity_events`

Timeline imutável de auditoria e produto.

Campos principais:

- tipo e resumo do evento;
- `actor_id` opcional para eventos do Sistema;
- referências opcionais a oportunidade, empresa, contato, tarefa, etapa e operação;
- `metadata` apenas para dados complementares estruturados;
- `occurred_at`.

Eventos não podem ser editados nem apagados pelos usuários.

### `business_operations`

Registra uma chave de idempotência fornecida por cada confirmação crítica. A combinação usuário, tipo de operação e chave é única. A mesma solicitação repetida devolve o resultado anterior em vez de duplicar oportunidade, encerramento, passagem ou tarefa.

## Operações atômicas

Funções transacionais do banco são usadas para:

- criar oportunidade e aplicar apenas as regras da etapa inicial;
- mover entre etapas e criar/reutilizar a tarefa correspondente;
- transferir da Pré-venda para Venda;
- ganhar e iniciar Pós-venda;
- perder, desqualificar ou arquivar;
- restaurar ou reabrir;
- finalizar/interromper Pós-venda;
- desativar usuário e transferir responsabilidades;
- registrar contato e atualizar `last_contact_at`;
- criar e editar tarefas, inclusive seus vínculos, por meio das RPCs controladas;
- concluir a tarefa de diagnóstico e avançar quando houve contato;
- trocar responsável e transferir tarefas automáticas pendentes.
- calcular os indicadores da Dashboard pela RPC autenticada `get_dashboard_metrics`, sem expor consultas analíticas irrestritas.

Cada função valida permissões, estado atual e chave de idempotência antes de alterar dados. Ou todos os efeitos são gravados, ou nenhum é.

## Matriz inicial de acesso

### Administrador

- Acesso completo aos funis e registros.
- Aprova e gerencia usuários.
- Gerencia catálogos, produtos e metas.
- Gerencia todas as tarefas.
- Reabre qualquer resultado.

### Pré-venda

- Opera oportunidades de Pré-venda e Venda, inclusive as atribuídas a colegas.
- Transfere oportunidades qualificadas da Pré-venda para Venda.
- Consulta e gerencia empresas e contatos ativos conforme as regras dos módulos.
- Consulta catálogos e produtos.
- Gerencia tarefas que criou ou pelas quais é responsável.
- Consulta o registro comercial de Pós-venda no Histórico, sem operar o acompanhamento.

### Comercial

- Opera todas as oportunidades de Pré-venda, Venda e Pós-venda, inclusive as atribuídas a colegas.
- Consulta e gerencia empresas e contatos ativos conforme as regras dos módulos.
- Consulta catálogos e produtos.
- Gerencia tarefas que criou ou pelas quais é responsável.

### Usuário pendente, recusado ou desativado

- Não acessa dados comerciais.
- Pode consultar somente os dados mínimos necessários para mostrar sua própria situação de acesso.

## RLS

Todas as tabelas expostas pela API terão RLS habilitado.

A matriz detalhada e os cenários obrigatórios de teste estão em [`ACCESS_CONTROL.md`](ACCESS_CONTROL.md).

Funções auxiliares consultarão `auth.uid()` para determinar:

- se o perfil está ativo;
- o cargo atual;
- os funis permitidos;
- se a pessoa é criadora ou responsável por uma tarefa;
- se a oportunidade relacionada está acessível.

Restrições de interface também serão repetidas nas operações transacionais. Chaves privilegiadas nunca serão usadas no navegador.

## Índices principais

- empresas por nome, CNPJ normalizado, segmento e status;
- contatos por nome, e-mail normalizado, telefone normalizado e status;
- produtos por nome, categoria e status;
- oportunidades por funil/etapa, status, responsável, empresa, contato, origem, criação, ganho e previsão;
- passagens por oportunidade, funil, etapa, responsável, origem e data;
- tarefas por responsável, status, vencimento e oportunidade;
- atividades por oportunidade/empresa/contato e data decrescente;
- encerramentos vigentes por resultado e data;
- interações por oportunidade e data decrescente.

## Ordem lógica implementada pelas migrations

1. Extensões, enums e funções auxiliares.
2. Perfis, aprovação e permissões básicas.
3. Funis, etapas fixas e preferências individuais.
4. Catálogos, metas, empresas, contatos e produtos.
5. Oportunidades, itens, qualificação, passagens, resultados e ciclos de Pós-venda.
6. Tarefas, contatos realizados, notas, anexos, atividades e idempotência.
7. RLS completo, administração de acesso e políticas de Storage.
8. Dados iniciais dos funis e etapas.
9. Funções transacionais de oportunidades, qualificação, produtos e idempotência.
10. Funções transacionais de tarefas e Pós-venda.
11. Índices de apoio para relacionamentos, RLS e consultas operacionais.
12. Gatilhos de auditoria para empresas, contatos, vínculos e notas.
13. Correções de tipos nas funções transacionais e otimização das políticas RLS validada pelos Advisors do Supabase.
14. Valor manual de oportunidades e conclusão do fluxo principal de tarefas, incluindo validação e edição segura de vínculos.

As funções com privilégios elevados ficam no schema `private`, que não é exposto pela Data API. O schema `public` contém somente wrappers `SECURITY INVOKER` explicitamente liberados para a aplicação. Todas as funções públicas revalidam a identidade, o perfil ativo, o cargo e o estado atual por meio da implementação privada.

## Fora desta primeira versão do schema

- Supabase Cron para esfriamento: o estado pode ser calculado por consulta no MVP; nenhuma tarefa automática será criada.
- Integrações externas de WhatsApp, e-mail ou calendário.
- Múltiplas organizações.
- Exclusão física de registros comerciais.
