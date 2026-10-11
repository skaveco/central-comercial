# Matriz de acesso e RLS — Central Comercial

## Objetivo

Este documento define quem pode visualizar e alterar cada parte da Central Comercial. Ele será a fonte para as políticas de Row Level Security (RLS), funções transacionais e regras do Supabase Storage.

A instalação é interna da Skave e possui três cargos fixos:

- **Administrador**;
- **Pré-venda**;
- **Comercial**.

## Princípios de segurança

1. O usuário precisa estar autenticado, aprovado e ativo para acessar dados comerciais.
2. Ocultar botões no front-end não concede segurança. A permissão é revalidada no banco.
3. O banco libera apenas os registros necessários para o cargo e para a operação.
4. Operações críticas não são compostas por alterações independentes no navegador. Elas usam funções transacionais validadas pelo banco.
5. Histórico e auditoria são imutáveis para os usuários.
6. Arquivos ficam em buckets privados e exigem a mesma permissão do registro vinculado.
7. A chave `service_role` nunca é usada no navegador.
8. Funções privilegiadas validam `auth.uid()`, perfil ativo, cargo, estado atual e dados recebidos antes de alterar registros.

## Estados de acesso

| Situação | Dados próprios | Dados comerciais | Administração |
| --- | --- | --- | --- |
| Aguardando aprovação | Ver a própria situação | Sem acesso | Sem acesso |
| Recusado | Ver a própria situação | Sem acesso | Sem acesso |
| Ativo | Conforme o cargo | Conforme o cargo | Somente Administrador |
| Desativado | Ver a própria situação de bloqueio | Sem acesso | Sem acesso |

O bloqueio é aplicado pelo RLS imediatamente. Uma sessão antiga não mantém acesso depois que o perfil é desativado.

## Usuários e perfis

### Administrador

- Lista usuários e solicitações de acesso.
- Consulta nome, e-mail, cargo, status e último acesso.
- Aprova, recusa, atribui cargo e desativa.
- Transfere responsabilidades antes de desativar.
- Não pode desativar o último Administrador ativo.

### Pré-venda e Comercial

- Consultam o próprio perfil.
- Consultam uma visão limitada de usuários ativos para escolher responsáveis: `id`, nome, cargo e disponibilidade.
- Não consultam e-mail de acesso, situação de aprovação ou dados administrativos de colegas.
- Não alteram cargo, aprovação ou status de acesso.

### Implementação RLS

- `profiles`: leitura completa pelo Administrador; leitura da própria linha pelo usuário.
- `assignable_profiles`: visão segura somente com dados necessários à atribuição.
- Alterações administrativas somente por função transacional de Administrador.

## Funis e oportunidades ativas

| Ação | Administrador | Pré-venda | Comercial |
| --- | --- | --- | --- |
| Ver Pré-venda | Sim | Sim | Sim |
| Criar em Pré-venda | Sim | Sim | Sim |
| Editar oportunidade em Pré-venda | Sim | Sim | Sim |
| Mover entre etapas da Pré-venda | Sim | Sim | Sim |
| Transferir Pré-venda para Venda | Sim | Sim | Sim |
| Ver Venda | Sim | Sim | Sim |
| Criar em Venda | Sim | Sim | Sim |
| Editar oportunidades de Venda de qualquer responsável | Sim | Sim | Sim |
| Mover entre etapas de Venda | Sim | Sim | Sim |
| Ganhar, perder ou arquivar em Venda | Sim | Sim | Sim |
| Ver Pós-venda ativo | Sim | Não | Sim |
| Criar diretamente em Pós-venda | Sim | Não | Sim |
| Operar etapas e finalizar Pós-venda | Sim | Não | Sim |

Regras complementares:

- Pré-venda e Comercial operam todas as oportunidades de Pré-venda e Venda, inclusive as atribuídas a colegas.
- Comercial também opera todas as oportunidades de Pós-venda.
- O responsável da oportunidade não amplia o acesso de Pré-venda ao Pós-venda.
- Administrador acessa todos os funis.
- A criação oferece somente funis e responsáveis compatíveis com o cargo de quem executa.

### Operações críticas

Os usuários não terão políticas amplas de `UPDATE` para alterar diretamente funil, etapa, resultado ou responsável. Essas mudanças passam por funções específicas:

- criar oportunidade;
- mover etapa;
- transferir para Venda;
- marcar como ganha;
- marcar como perdida;
- desqualificar;
- arquivar;
- restaurar ou reabrir;
- alterar responsável;
- iniciar ou finalizar Pós-venda.

Cada função valida o cargo e executa efeitos relacionados na mesma transação.

## Histórico

| Ação | Administrador | Pré-venda | Comercial |
| --- | --- | --- | --- |
| Consultar negociações encerradas | Sim | Sim | Sim |
| Ver detalhes históricos | Sim | Sim | Sim |
| Alterar dados enquanto estiver no Histórico | Não | Não | Não |
| Restaurar não ganha para Pré-venda | Sim | Sim | Sim |
| Restaurar não ganha para Venda | Sim | Sim | Sim |
| Reabrir negociação ganha | Sim | Não | Não |
| Consultar Pós-venda de uma venda | Sim | Registro comercial | Sim |

Regras:

- O Histórico é somente leitura até que uma restauração ou reabertura válida seja confirmada.
- Pré-venda pode consultar o registro comercial de uma venda no Histórico, mas não opera o Pós-venda.
- Pré-venda e Comercial podem restaurar negociações não ganhas para Pré-venda ou Venda.
- Destinos disponíveis são filtrados pelo cargo e pelas regras já aprovadas.
- Apenas Administrador reabre uma oportunidade atualmente ganha.

## Empresas e contatos

| Ação | Administrador | Pré-venda | Comercial |
| --- | --- | --- | --- |
| Consultar ativos e desativados | Sim | Sim | Sim |
| Criar e editar ativos | Sim | Sim | Sim |
| Ativar e desativar | Sim | Sim | Sim |
| Gerenciar vínculo empresa/contato | Sim | Sim | Sim |
| Gerenciar notas de registro ativo | Sim | Sim | Sim |
| Gerenciar anexos de empresa ativa | Sim | Sim | Sim |
| Editar registro desativado | Não, até reativar | Não | Não |
| Criar novos vínculos em registro desativado | Não | Não | Não |
| Consultar e baixar dados históricos desativados | Sim | Sim | Sim |

Regras:

- Reativar é permitido a todos os três cargos mediante confirmação.
- A desativação não remove vínculos nem altera oportunidades existentes.
- Novas oportunidades exigem empresa e contato ativos quando esses vínculos forem utilizados.
- CNPJ normalizado permanece único entre registros ativos e desativados.

## Produtos, catálogos, parâmetros e metas

| Área | Administrador | Pré-venda | Comercial |
| --- | --- | --- | --- |
| Consultar produtos e categorias | Sim | Sim | Sim |
| Usar produto ativo em oportunidade permitida | Sim | Sim | Sim |
| Criar/editar/ativar/desativar produto | Sim | Não | Não |
| Gerenciar categorias | Sim | Não | Não |
| Consultar segmentos, origens e motivos ativos | Sim | Sim | Sim |
| Gerenciar segmentos, origens e motivos | Sim | Não | Não |
| Consultar parâmetros de qualificação ativos | Sim | Sim | Sim |
| Gerenciar parâmetros de qualificação | Sim | Não | Não |
| Consultar meta vigente quando o indicador estiver disponível | Sim | Conforme Dashboard | Conforme Dashboard |
| Criar ou editar meta | Sim | Não | Não |

Registros desativados continuam legíveis quando já estiverem vinculados a dados históricos. Eles não aparecem em novas seleções.

## Produtos e qualificação da oportunidade

- Usuário com permissão de edição sobre a oportunidade pode adicionar, remover ou alterar a quantidade de produtos ativos.
- O preço unitário do vínculo vem do catálogo e não é editável na oportunidade.
- Snapshots já utilizados permanecem visíveis mesmo quando produto ou categoria forem desativados.
- Usuário com permissão de edição sobre a oportunidade pode responder a qualificação.
- Apenas funções de entrada em Venda validam formalmente as respostas e criam o registro histórico de validação.
- Respostas e snapshots históricos não podem ser apagados para alterar métricas passadas.

## Tarefas

### Visualização

- Administrador visualiza todas as tarefas.
- Pré-venda e Comercial visualizam somente tarefas que criaram ou pelas quais são responsáveis atualmente.
- Uma oportunidade acessível não libera automaticamente as tarefas de colegas.
- Uma empresa ou contato acessível não libera automaticamente tarefas vinculadas.
- Tarefa automática possui Sistema como criador e é visível ao responsável e ao Administrador.

### Ações

| Ação | Administrador | Criador ou responsável | Outro usuário |
| --- | --- | --- | --- |
| Criar tarefa | Sim | Sim | Sim, dentro dos vínculos permitidos |
| Editar | Sim | Sim | Não |
| Concluir | Sim | Sim | Não |
| Reagendar | Sim | Sim | Não |
| Marcar novamente como pendente | Sim | Sim, se o ciclo estiver ativo | Não |
| Excluir individualmente | Sim | Sim | Não |
| Executar ação em lote | Sim | Sim, revalidada por tarefa | Não |
| Alterar responsável | Sim | Sim, para usuário elegível | Não |

Regras:

- Toda ação em lote revalida permissão e estado de cada ID no banco.
- Cancelamento automático por saída do funil não depende de o usuário gerenciar individualmente cada tarefa.
- Tarefas canceladas não podem voltar a Pendente.
- Tarefas de ciclos encerrados não podem ser reabertas.
- Exclusão retira a tarefa das listas, preservando auditoria e interações já registradas.

## Contatos realizados

- São visíveis para quem pode visualizar a oportunidade.
- Podem ser criados por quem pode editar a oportunidade ou concluir uma tarefa permitida vinculada a ela.
- Não podem ser editados silenciosamente para reescrever a data de Último contato.
- Correções futuras devem gerar evento de auditoria e recalcular o último contato; a primeira migration não oferece edição ou exclusão direta.
- Data futura é rejeitada no banco.

## Notas e anexos de oportunidades

### Oportunidade ativa

- Quem pode visualizar e operar o funil pode consultar, adicionar, editar e remover notas e anexos, independentemente da autoria.
- Alterações preservam autoria original e registram o usuário que realizou a ação.

### Histórico

- Todos os cargos podem consultar notas e baixar anexos da negociação encerrada.
- Enquanto estiver apenas no Histórico, notas e anexos ficam em modo de consulta.
- Após restauração, as permissões voltam a seguir o funil escolhido.

### Storage

- Buckets são privados.
- Upload é autorizado somente após validar o registro e seu estado.
- Leitura ou URL temporária exige permissão de consulta sobre a empresa ou oportunidade vinculada.
- Remoção exige permissão de edição e registra auditoria antes de apagar o objeto.
- O caminho do arquivo inclui o tipo e o ID do registro, mas o caminho sozinho não concede acesso.
- Tipo MIME e tamanho são verificados no servidor e no banco; a interface não é a única validação.

## Atividades, passagens e encerramentos

### Leitura

- `activity_events` segue a visibilidade do registro relacionado.
- `opportunity_stage_entries` e `opportunity_outcomes` são lidos por meio das oportunidades ativas permitidas ou do Histórico.
- Eventos associados a empresa e contato seguem o acesso geral a esses cadastros.

### Escrita

- Usuários não inserem, editam ou apagam diretamente atividades, passagens ou encerramentos.
- Apenas funções transacionais gravam esses registros.
- Reabertura invalida o resultado vigente, sem apagar encerramentos anteriores.
- A timeline é imutável.

## Dashboard

| Conjunto de indicadores | Administrador | Pré-venda | Comercial |
| --- | --- | --- | --- |
| Visão global da operação | Sim | Não | Não |
| Evolução e leads de Pré-venda | Sim | Sim | Sim |
| Pipeline e evolução de Venda | Sim | Sim | Sim |
| Pós-venda | Sim | Não | Sim |
| Vendas, ticket e ciclo | Sim | Sim | Sim |
| Motivos de perda | Sim | Sim | Sim |
| Esfriamento de Pré-venda | Sim | Sim | Sim |
| Esfriamento de Venda | Sim | Sim | Sim |

Regras:

- Métricas são retornadas por funções próprias, não por consultas irrestritas às tabelas.
- Filtros nunca ampliam o conjunto permitido pelo cargo.
- Pré-venda e Comercial recebem métricas de Pré-venda e Venda conforme os filtros aprovados.
- Somente Comercial e Administrador recebem métricas específicas de Pós-venda.
- Administrador recebe os dados globais.
- Cards globais de meta e resultado serão apresentados apenas aos cargos para os quais forem explicitamente disponibilizados na interface; a primeira implementação seguirá a tabela acima.

## Preferências de etapas

- Cada usuário ativo consulta e altera somente as próprias preferências de ocultação.
- Administrador não altera a preferência visual de outro usuário.
- Ocultar uma etapa não altera oportunidades, automações, métricas ou permissões.
- Nenhum cargo cria ou exclui etapas no MVP.

## Matriz técnica por grupo de tabelas

| Grupo | SELECT | INSERT/UPDATE/DELETE direto | Forma de mutação |
| --- | --- | --- | --- |
| `profiles` | Próprio ou Admin | Bloqueado para regras administrativas | Funções de aprovação/desativação |
| Funis e etapas | Todos os ativos | Bloqueado | Dados fixos por migration |
| Preferências de etapa | Somente próprio | Somente próprio | Operação simples com RLS |
| Catálogos, produtos e metas | Todos conforme necessidade | Somente Admin | Server Action + RLS |
| Empresas e contatos | Todos os ativos | Permitido conforme estado | Server Action + RLS/validações |
| Oportunidades | Por funil ou Histórico | Alterações críticas bloqueadas | Funções transacionais |
| Itens e qualificação | Conforme oportunidade | Conforme edição da oportunidade | Funções/Server Actions validadas |
| Tarefas | Admin ou criador/responsável | Conforme autoria/responsabilidade | Server Actions e funções de fluxo |
| Interações | Conforme oportunidade/tarefa | Sem alteração direta posterior | Função de registro de contato |
| Notas | Conforme registro e estado | Conforme matriz | Server Actions + RLS |
| Anexos | Conforme registro e estado | Conforme matriz | Server Actions + Storage privado |
| Passagens, resultados e ciclos | Conforme oportunidade/Histórico | Bloqueado | Funções transacionais |
| Atividades | Conforme registro | Bloqueado | Funções transacionais |
| Operações/idempotência | Sem leitura geral | Bloqueado | Funções transacionais |

## Funções e exposição pela API

As verificações `current_profile_is_active`, `current_profile_role`, `is_admin`, `can_access_pipeline`, `can_view_opportunity`, `can_edit_opportunity`, `can_manage_task`, `can_view_company`, `can_edit_company`, `can_view_contact` e `can_edit_contact` ficam no schema não exposto `private`.

As RPCs públicas cobrem aprovação de usuários, criação e edição de oportunidades, produtos, qualificação, transferência, movimentação, encerramento, restauração, troca de responsável, registro de contato, tarefas e Pós-venda. Elas são wrappers `SECURITY INVOKER`; a implementação privilegiada fica no schema `private`.

Toda função `SECURITY DEFINER` possui `search_path` vazio, referências qualificadas, validação explícita de `auth.uid()` e execução revogada por padrão. O schema `public` não contém funções `SECURITY DEFINER`.

## Cenários mínimos de teste do RLS

1. Usuário pendente tenta consultar empresas e recebe zero acesso.
2. Usuário desativado perde acesso mesmo com sessão anterior aberta.
3. Pré-venda consulta e edita oportunidades de Pré-venda e Venda.
4. Pré-venda transfere uma oportunidade e continua podendo consultá-la e operá-la em Venda.
5. Comercial consulta e edita oportunidades de Pré-venda e Venda de diferentes responsáveis.
6. Pré-venda não consulta nem opera acompanhamento ativo de Pós-venda.
7. Todos consultam o Histórico, mas somente restauram para funis permitidos.
8. Apenas Administrador reabre uma oportunidade ganha.
9. Vendedor não consulta nem altera tarefa de colega quando não é criador nem responsável.
10. Administrador gerencia qualquer tarefa.
11. Todos consultam produtos; apenas Administrador os altera.
12. Registro desativado de empresa/contato permite consulta, mas bloqueia edição e novos vínculos.
13. Arquivo privado não é baixado sem acesso ao registro vinculado.
14. Atividade, passagem e encerramento não aceitam escrita direta.
15. Função de Dashboard não retorna métricas de outro domínio ao cargo solicitante.
16. Repetir uma confirmação com a mesma chave não duplica tarefas, resultados ou passagens.
17. Alteração de cargo ou status produz efeito imediato nas consultas seguintes.

## Decisões adotadas para fechar lacunas

As especificações já aprovadas não definiam explicitamente todos os limites de leitura. Para manter o menor acesso necessário, esta matriz adota:

- Pré-venda e Comercial visualizam e operam oportunidades ativas de Pré-venda e Venda.
- O Pós-venda ativo continua restrito a Comercial e Administrador.
- Todos os cargos consultam o Histórico, seguindo o modo de consulta já aprovado.
- Usuários não administradores visualizam somente tarefas que criaram ou pelas quais são responsáveis.
- Dados administrativos de colegas não são expostos no seletor de responsável.
- Notas e anexos de uma oportunidade encerrada ficam somente para consulta até a restauração.
- Métricas são entregues por funções específicas de cada cargo.

Essas escolhas evitam exposição entre equipes sem impedir os fluxos aprovados.
