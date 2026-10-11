# Venda

## Venda
Funil responsável por conduzir oportunidades qualificadas até o fechamento.

### Etapas oficiais
1. **Diagnóstico**
2. **Proposta em andamento**
3. **Proposta enviada**
4. **Negociação**
5. **Ganho**
6. **Perdido**

Fluxo principal: **Diagnóstico → Proposta em andamento → Proposta enviada → Negociação → Ganho**. Ganho e Perdido são resultados de saída do funil ativo, não etapas para acumular cards encerrados.

### Entrada pela Pré-venda — aprovada
*   A confirmação de Agendado na Pré-venda transfere a mesma oportunidade para **Diagnóstico**, mantendo ID, dados, vínculos e atividades.
*   O vendedor selecionado passa a ser o responsável. Cancelar as pendências do funil anterior e criar a nova tarefa de Diagnóstico na mesma operação, conforme [Tarefas](../Tarefas.md).
*   Criar tarefa **Realizar diagnóstico — \[nome da oportunidade\]**, tipo **Agendamento**, para o responsável selecionado, na data e horário da call.
*   A nota opcional do formulário será a descrição da tarefa.
*   Cancelar ou falhar preserva o estado anterior. Não duplicar a tarefa ao repetir a confirmação.
*   A criação da tarefa não registra contato realizado.

### Entrada direta em Venda — aprovada
Permitir criar uma oportunidade em **qualquer etapa**, com seleção obrigatória de funil e etapa em todo cadastro, conforme [Oportunidades](../Oportunidades.md). Não exigir passagem sequencial pela Pré-venda ou por etapas anteriores. Para Diagnóstico, manter o formulário da call descrito abaixo; exigir duas respostas preenchidas em parâmetros ativos na criação direta em Venda, conforme [Qualificação](../../Configura%C3%A7%C3%B5es/Oportunidades.md). Respostas negativas contam. Criação em Ganho ou Perdido aplica os respectivos formulários e encerramentos, conforme a regra geral.

### Tarefas por etapa — regras aprovadas em 08/10/2026
*   **Diagnóstico → Proposta em andamento:** concluir a tarefa da reunião de diagnóstico realizada avança automaticamente a oportunidade para Proposta em andamento. Manter a confirmação de contato e canal. Reagendar ou concluir sem contato não representa call realizada e não aciona esse avanço.
*   Aplicar esse avanço somente à tarefa de diagnóstico vinculada, enquanto a oportunidade estiver aberta em Diagnóstico. Concluir outra tarefa de Agendamento não deve mover o card; uma conclusão tardia não deve retroceder nem reabrir a oportunidade.
*   **Entrada em Proposta em andamento**, por avanço automático ou movimentação manual: criar tarefa **Pendente**, tipo **Proposta**, título **Preparar proposta — \[nome da oportunidade\]**, vinculada à oportunidade e atribuída ao responsável atual.
*   Vencimento inicial da tarefa de Proposta: **5 dias corridos após a entrada em Proposta em andamento**, mantendo o horário no fuso da aplicação.
*   **Entrada em Proposta enviada:** criar tarefa **Pendente**, tipo **Follow-up**, título **Follow-up da proposta — \[nome da oportunidade\]**, vinculada à oportunidade e atribuída ao responsável atual.
*   Vencimento do Follow-up: **5 dias corridos após a entrada em Proposta enviada**, mantendo o horário. Não contar a partir da criação da oportunidade.
*   A criação das tarefas é disparada pela entrada na etapa. Repetir a mesma confirmação ou processar novamente o mesmo evento não duplica tarefas.
*   Registrar movimentação e tarefas nas atividades. Aplicar movimentação e criação correspondente juntas, sem persistir avanço parcial em falha.
*   Mover o card manualmente não conclui tarefas anteriores nem registra contato automaticamente.
*   Se não houver proposta após a call, o vendedor pode **Arquivar** a oportunidade, com confirmação e observação opcional, conforme as regras do Histórico.
*   **Concluir tarefa Proposta:** mantém a oportunidade em Proposta em andamento. O vendedor move manualmente para Proposta enviada após o envio.
*   **Entrada em Negociação:** solicitar data e horário pelo componente de calendário e criar tarefa **Follow-up**, vinculada à oportunidade e atribuída ao responsável atual, com o vencimento escolhido. Cancelar a seleção mantém a etapa anterior.
*   **Retorno a uma etapa:** reutilizar a tarefa automática correspondente àquela etapa se ainda estiver pendente, preservando seu vencimento até reagendamento explícito. Se não houver tarefa pendente correspondente, inclusive quando a anterior estiver concluída, cancelada ou excluída, criar outra na nova entrada na etapa, segundo seus prazos. Excluir uma tarefa não provoca sua recriação imediata. Após restauração, não reativar tarefas canceladas: aplicar normalmente as automações da etapa escolhida. Não reutilizar tarefa de outra etapa apenas por ter o mesmo tipo.
*   **Criação direta em Diagnóstico:** solicitar responsável, data e horário da call e nota opcional; criar tarefa de Agendamento vinculada, com a nota na descrição, nos mesmos moldes da entrada pela Pré-venda.

### Operação da oportunidade
Permitir consultar os dados e trabalhar com tarefas, notas, anexos, empresa, contato, produtos e valor, conforme as regras do módulo Oportunidades.

*   Total calculado: soma de **valor base × quantidade** dos produtos. O valor base é alterado na edição do produto em Cadastros → Produtos, sem edição do preço do produto dentro da oportunidade. O total pode ser ajustado manualmente, inclusive para descontos.
*   Permitir valor total manual, identificado como tal; alterações nos itens não substituem esse total sem confirmação.
*   Confirmar contato e canal antes de contabilizar a interação ao concluir tarefas comerciais. Mudar de etapa ou concluir sem contato não comprova interação.
*   Registrar mudanças de etapa, responsável e valor nas atividades.

### Ganho — comportamento definido
*   Registrar a negociação como **Ganha** no Histórico e retirar do funil de Venda ativo.
*   Iniciar acompanhamento em **Pós-venda → Onboarding**, vinculado à mesma negociação, sem duplicar venda.
*   Ao acionar **Ganho**, exibir uma **animação de confetes no front**, junto ao modal com os dados da oportunidade: **Empresa, Contato, Produtos, Valor final e Vendedor responsável**. Os confetes são apenas um efeito visual; não registram o ganho nem disparam automações por si só.
*   Manter a confirmação no modal. Cancelar mantém a etapa atual; somente confirmar registra o ganho e inicia o acompanhamento. Para confirmar **Ganho**, exigir **Empresa, Contato, Responsável, ao menos um Produto com quantidade válida e Valor final maior que zero**. A quantidade deve ser inteira e maior que zero, sem frações. Bloquear a confirmação e indicar os campos ausentes ou inválidos; valor ausente não equivale a zero.
*   Não exigir motivo de ganho.
*   Preservar dados, produtos, valor fechado e atividades; registrar data e usuário do encerramento.
*   Reabertura pelo Administrador segue o Histórico: sem justificativa, sempre com escolha obrigatória de funil e etapa. Retirar ganho e valor vendido dos indicadores atuais e interromper acompanhamento, preservando atividades e entregas.

### Perdido e arquivamento — comportamento definido
*   **Perder** abre modal com seleção obrigatória de motivo cadastrado pelo Administrador em Configurações e confirmação; cancelar mantém a etapa atual. Confirmar retira a oportunidade do pipeline ativo e registra como Perdida no Histórico.
*   **Arquivar** é uma ação, não uma etapa deste funil; exige confirmação com observação opcional, sem motivo obrigatório ou catálogo de motivos, e envia ao Histórico como Arquivada. O modal informa o cancelamento das tarefas comerciais pendentes; cancelar mantém o estado anterior.
*   Preservar os eventos anteriores e uma única entrada atual por negociação.
*   Qualquer saída do funil cancela as tarefas pendentes anteriores, conforme a regra abaixo; não as marca como concluídas.

### Cancelamento de tarefas na saída do funil — aprovado em 10/10/2026

Aplicar a [regra geral de Tarefas](../Tarefas.md): qualquer saída confirmada cancela as pendências anteriores, inclusive Desqualificação, transferência e interrupção/finalização do Pós-venda. Preservar os registros como **Cancelada**, sem excluir nem registrar contato. Cancelamento e saída acontecem juntos; tarefas novas do destino seguem normalmente.

### Permissões em Venda — aprovadas
Usuários dos cargos **Pré-venda e Comercial** podem editar **todas as oportunidades do funil de Venda**, inclusive as atribuídas a colegas. Os dois cargos também acessam o funil de Pré-venda; Comercial também opera o Pós-venda e Administrador possui acesso total. Manter o responsável da oportunidade identificado e registrar o autor efetivo de cada alteração. Essa permissão não altera a regra de reabertura de Ganhas, exclusiva do Administrador, nem amplia a edição de tarefas: o usuário só pode editar as que criou ou pelas quais é responsável, conforme [Tarefas](../Tarefas.md).

### Esfriamento — aprovado em 08/10/2026
*   Destacar e permitir filtrar oportunidades abertas de **Pré-venda e Venda** após **3 dias úteis sem contato confirmado**. No MVP, considerar segunda a sexta, no fuso da aplicação.
*   Contar a partir do **Último contato**; se nunca houve contato, usar a criação da oportunidade.
*   **Prazo e fuso — aprovado em 10/10/2026:** usar **America/Sao_Paulo**. Somar três dias úteis à data/hora de referência, preservando o horário local; contar somente segunda a sexta, sem considerar feriados no MVP. Começar a contagem no dia seguinte à data de referência e sinalizar ao atingir o prazo. Exemplo: sexta às 14h → quarta às 14h.
*   Somente contato efetivamente confirmado, com canal e data/hora real informados, atualiza Último contato se for a interação mais recente. Recalcular Esfriando pela data real; remover o alerta somente se o prazo não tiver sido atingido. Contato retroativo não reinicia a contagem pela data de inserção. Notas, edições, mudanças de etapa e conclusão sem contato não reiniciam.
*   Manter o alerta mesmo quando houver Follow-up agendado.
*   **Não criar tarefa automática por esfriamento no MVP.** As tarefas por etapa permanecem; esta regra substitui a automação anterior de follow-up após 2 dias sem contato.
*   Não aplicar a oportunidades encerradas nem ao acompanhamento de Pós-venda. Não alterar a temperatura manual.

### Movimentação entre etapas — aprovada
*   Permitir avanço e recuo **livres entre etapas ativas do mesmo funil**, por arrastar o card ou selecionar a etapa nos detalhes, sem exigir passagem sequencial.
*   Aplicar as mesmas regras de tarefas e validações da etapa de destino pelos dois caminhos. A liberdade de movimentação não dispensa os formulários de transferência ou as confirmações de encerramento.
*   Registrar origem, destino, data e usuário. Cancelar um formulário obrigatório ou falhar mantém a etapa anterior.

### Proposta enviada e anexos — aprovados
*   O vendedor pode anexar a proposta **opcionalmente**, com limite de **20 MB por arquivo**, seguindo a lógica de anexos da oportunidade.
*   A ausência de anexo não bloqueia a entrada em Proposta enviada. Arquivo acima do limite deve ser recusado com mensagem indicando o limite.
*   Anexar o documento não envia automaticamente ao cliente, não registra contato e não muda a etapa por si só.
*   Ao entrar em Proposta enviada, manter a criação ou reutilização do Follow-up conforme as regras da etapa.

Consolidado com as decisões aprovadas para Venda. As duas pendências anteriores de movimentação e anexo da proposta foram resolvidas.
