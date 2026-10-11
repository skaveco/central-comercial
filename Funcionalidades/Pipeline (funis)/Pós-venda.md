# Pós - Venda

## Pós-venda
Acompanhamento da negociação ganha, preservando seu ID e o resultado no Histórico, sem duplicar venda.

### Etapas oficiais
1. **Onboarding**
2. **Cliente ativo**
3. **Entrega concluída**
4. **Acompanhamento**

Acompanhamento substitui a antiga coluna Follow-up. **Follow-up permanece como tipo de tarefa.** Movimentação livre entre etapas ativas do mesmo funil, respeitando os formulários da etapa de destino.

### Entrada e continuidade
*   Confirmar Ganho inicia Onboarding na mesma negociação. O Histórico mantém o resultado Ganha; o Pós-venda representa seu acompanhamento.
*   Pendências comerciais anteriores são canceladas conforme a regra aprovada; novas tarefas do Pós-venda seguem normalmente.
*   Preservar dados, atividades, notas, anexos, empresa e contato.
*   Esfriamento não se aplica ao Pós-venda.

### Criação direta — aprovada em 10/10/2026
Permitir escolher qualquer etapa de Pós-venda no cadastro de uma nova oportunidade, conforme [Oportunidades](../Oportunidades.md). Exigir os dados de fechamento e confirmação para registrar a negociação como **Ganha** no Histórico, uma única vez, e iniciar o Pós-venda na etapa escolhida. Se a etapa for Acompanhamento, exigir também data e horário do próximo contato e criar o Follow-up. Não simular a passagem pelas etapas anteriores. Cancelar não cria a oportunidade nem registra venda.

### Organização da etapa Acompanhamento
*   Objetivo: acompanhar resultados, identificar novas necessidades e oportunidades de cross-sell.
*   Toda oportunidade ativa na **etapa Acompanhamento** deve ter responsável e próximo contato agendado. Essa obrigação é exclusiva desta etapa; não se aplica automaticamente a Onboarding, Cliente ativo ou Entrega concluída.
*   Ao entrar na etapa, solicitar **data e horário** do próximo contato e **nota opcional** com seu objetivo. Criar tarefa **Follow-up** vinculada à negociação, atribuída ao responsável, com a nota na descrição.
*   Ao concluir o Follow-up, manter a confirmação de contato e canal e oferecer **Agendar próximo contato** ou **Finalizar acompanhamento**. Sem contato, permitir reagendar, sem registrar interação.
*   Exibir no card responsável, último contato e próximo Follow-up. Destacar **Contato atrasado** ou **Sem próximo contato**, sem usar Esfriando.
*   Permitir filtrar por responsável, contatos atrasados e acompanhamentos sem próxima tarefa. Atraso segue a regra de Tarefas; horário ultrapassado hoje não equivale a atraso por dia.
*   Evitar criar a mesma tarefa duas vezes por confirmação repetida. Se o próximo contato for removido, evidenciar Sem próximo contato para regularização.

### Criar nova oportunidade para este cliente
*   Disponibilizar a ação **Criar nova oportunidade para este cliente** no acompanhamento de Pós-venda.
*   Abrir o cadastro de uma nova oportunidade com **Empresa e Contato já preenchidos**, referenciando os mesmos cadastros da negociação original. Não duplicar empresa ou contato.
*   **Destino obrigatório:** pedir ao usuário que escolha o **funil** e a **coluna/etapa** da nova oportunidade. A lista de colunas deve corresponder ao funil escolhido; ao trocar o funil, exigir nova seleção de coluna. Não salvar sem ambos.
*   Aplicar as validações, formulários e automações já definidos para a etapa escolhida; a escolha de destino não dispensa requisitos de qualificação, transferência ou fechamento. A criação não deve marcar uma nova venda como ganha apenas por se originar de um cliente do Pós-venda.
*   Preencher os dados da nova venda e confirmar a criação. Criar um **novo ID de oportunidade**, com produtos, valor, tarefas e histórico próprios; não copiar o resultado Ganha da negociação original. O resultado da nova oportunidade depende da etapa escolhida e de suas regras de confirmação, conforme a regra geral de criação.
*   Preservar a negociação original, seu valor fechado e seu acompanhamento. Criar a nova oportunidade não finaliza o acompanhamento nem substitui seu próximo contato.
*   Cancelar o cadastro não cria oportunidade. Impedir criação duplicada por repetição da confirmação.
*   Respeitar a regra de cadastros ativos para novos vínculos: se empresa ou contato estiver desativado, informar o impedimento, sem reativar automaticamente ou remover o vínculo da negociação original.

### Finalizar acompanhamento
Exigir confirmação, remover o card do Pós-venda ativo e registrar usuário/data nas atividades. Preservar resultado Ganha, data do ganho, produtos e valor vendido. Continuar acessível pelo Histórico, sem criar outra entrada ou venda.

Ao confirmar **Finalizar acompanhamento**, cancelar todas as tarefas de Pós-venda ainda **Pendentes** vinculadas àquela oportunidade, manuais ou automáticas, inclusive as atrasadas. Informar o cancelamento no modal. Preservar as tarefas como **Cancelada**, com vínculos, autoria, responsável, vencimento e registros; preservar também as já concluídas ou canceladas. Não registrar contato nem execução. Registrar usuário, data/hora e motivo da finalização. Não afetar tarefas de outras oportunidades, inclusive a nova oportunidade criada para o cliente. Cancelar ou fechar mantém o acompanhamento e as tarefas. Executar finalização e cancelamento juntos, sem efeito parcial ou duplicidade.
Decisão de 10/10/2026: esta regra substitui a exclusão das pendências ao finalizar o Pós-venda.

### Demais etapas e novos ciclos — aprovados em 10/10/2026
*   Onboarding, Cliente ativo e Entrega concluída utilizam tarefas manuais no MVP, sem novas automações específicas dessas etapas.
*   O responsável da oportunidade conduz essas etapas; responsáveis de tarefas manuais seguem as regras de Tarefas.
*   Apenas a etapa Acompanhamento exige próximo contato agendado e cria o Follow-up previsto.
*   Após reabertura e novo Ganho, iniciar um novo ciclo em Onboarding, preservando atividades e entregas do ciclo anterior. Não reativar tarefas canceladas nem contar duas vendas vigentes para a mesma oportunidade.

