# Tarefas

Área em **Visão → Tarefas** para organizar próximos passos comerciais e atividades da rotina, com ou sem negociação.

Base de revisão: telas e notas de Tarefas no Figma. As regras operacionais abaixo estão consolidadas com as decisões aprovadas nesta revisão. O esfriamento segue a decisão de 08/10/2026, sem geração de tarefa extra; as automações por etapa permanecem.

### Cadastro e vínculos

*   Obrigatórios: **Nome, Tipo, Responsável e Data de vencimento**. Ao criar manualmente, preencher o responsável com o usuário criador por padrão e permitir selecionar outro usuário ativo habilitado para os vínculos da tarefa, sem restrição de mesmo cargo. Impedir salvar ou editar uma tarefa deixando tipo ou responsável vazio; alterações de responsável seguem as permissões do módulo.
*   Opcionais: **Horário, Descrição, Oportunidade, Empresa e Contato**.
*   Tipos definidos: **Primeiro contato, Qualificação, Follow-up, Agendamento, Proposta e Gestão**. Gestão representa atividades de organização sem oportunidade vinculada. Essa lista substitui a proposta anterior que misturava finalidade da tarefa e canal de comunicação.
*   Status: **Pendente, Concluída ou Cancelada**. Atraso é calculado, não um status separado.
*   Criação registrada automaticamente, sem edição; conclusão registra usuário, data e hora.
*   Permitir tarefas sem qualquer vínculo.
*   Selecionar oportunidade herda apenas empresa e contato já vinculados a ela. Ausência desses vínculos não bloqueia a tarefa nem cria cadastros.
*   Sem oportunidade, permitir empresa e/ou contato ativos. Se ambos forem informados, validar o vínculo; não escolher empresa arbitrariamente quando o contato representa várias.
*   Trocar/remover a oportunidade exige revisar os vínculos antes de salvar. Desativação posterior de empresas/contatos preserva as relações existentes.
*   Tarefas vinculadas também podem ser criadas, visualizadas e concluídas dentro da negociação, da empresa e do contato relacionados. As abas **Pendentes, Concluídas e Canceladas** preservam o histórico; clicar na tarefa abre seus detalhes e o check executa a conclusão ou, quando permitido, a reabertura.
*   Consultar uma empresa ou contato não amplia a permissão sobre tarefas: cada card mostra somente as tarefas que o usuário já pode acessar, conforme as regras deste módulo.

### Criação e restauração de oportunidades — aprovadas em 10/10/2026
Criar uma oportunidade em qualquer etapa executa somente as automações dessa etapa, conforme [Oportunidades](Oportunidades.md), sem criar tarefas das etapas anteriores. Restaurar executa normalmente as automações da etapa escolhida, conforme [Histórico](Hist%C3%B3rico.md); tarefas canceladas do ciclo anterior permanecem canceladas. Na entrada em Primeiro contato, o vencimento da nova tarefa é o dia da criação/restauração; em Diagnóstico, solicitar data e horário da call; nas demais etapas, seguir seus prazos ou formulários. Não duplicar tarefas por repetição da mesma confirmação.

### Tarefa automática ao entrar em Primeiro contato
Ao entrar em **Primeiro contato**, inclusive na movimentação **Lead → Primeiro contato**, criar a tarefa **Qualificar lead — \[nome da oportunidade\]**, tipo **Qualificação**, status **Pendente**, vinculada à oportunidade e atribuída ao seu responsável atual.
*   O tipo Qualificação já faz parte do cadastro de tipos de tarefa.
*   Criar a tarefa não registra contato nem preenche os parâmetros de qualificação.
*   Aplicar a movimentação e a criação juntas, sem duplicação por repetição do evento. Em retorno à etapa, reutilizar a tarefa automática correspondente se ainda estiver pendente.
*   A conclusão segue as regras de confirmação de contato do módulo Tarefas. Não há novo avanço automático de etapa definido para essa conclusão.
*   **Vencimento:** no mesmo dia da entrada em Primeiro contato, considerando a data no fuso da aplicação, sem horário obrigatório. Se reutilizar uma tarefa pendente ao retornar à etapa, preservar seu vencimento até reagendamento explícito.

### Saída por Sem resposta
**Sem resposta é uma saída da pipeline, não uma espera ativa.**
Ao mover para Sem resposta, abrir a confirmação de arquivamento, com observação opcional. Informar que o card sairá da pipeline ativa, ficará disponível no Histórico como **Arquivado** e terá suas tarefas comerciais pendentes canceladas.
Confirmar arquiva a mesma oportunidade, preservando dados, vínculos e atividades, e registra que a saída ocorreu por Sem resposta. Aplicar as regras existentes de arquivamento e cancelamento de tarefas, sem marcar tarefas como concluídas nem registrar contato.
Cancelar ou fechar mantém a etapa anterior e suas tarefas. Não arquivar apenas pelo decurso de tempo sem resposta; o gatilho é a movimentação confirmada para essa saída.

### Tarefa automática na transferência de Pré-venda para Venda
Regra aprovada em 08/10/2026: ao confirmar a transferência para **Venda → Diagnóstico**, criar uma tarefa **Pendente**, vinculada à mesma oportunidade, com título **Realizar diagnóstico — \[nome da oportunidade\]**, tipo **Agendamento**, responsável escolhido e data/horário da call como vencimento. A **Nota opcional** do formulário preenche a **Descrição da tarefa**; sem nota, deixar a descrição vazia. Nesse fluxo, responsável, data e horário são obrigatórios. Transferência, cancelamento das pendências do funil anterior e criação da nova tarefa acontecem juntos, sem duplicação em confirmações repetidas. Cancelar ou falhar mantém o estado anterior. A criação não registra contato; a conclusão segue a confirmação de contato e canal descrita abaixo.

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

### Cancelamento de tarefas na saída do funil — aprovado em 10/10/2026
*   Qualquer saída confirmada da oportunidade do funil cancela **todas as tarefas pendentes do fluxo de origem vinculadas à oportunidade**, manuais ou automáticas, inclusive atrasadas. Abrange transferência entre funis, Ganho, Perdido, Desqualificado, Arquivado, saída por Sem resposta, interrupção do Pós-venda por reabertura e Finalizar acompanhamento.
*   Na transferência entre funis, cancelar as pendências anteriores antes de criar as tarefas da etapa de destino. As novas tarefas não são canceladas pela saída do funil anterior.
*   Alterar o status para **Cancelada**, preservando tarefa, vínculos, autoria, responsável, descrição, vencimento e registros anteriores. Não excluir, marcar como Concluída, registrar contato nem atualizar Último contato.
*   Registrar data/hora, usuário da ação e motivo do cancelamento: transferência, ganho, perda, desqualificação, arquivamento, reabertura ou finalização do acompanhamento, conforme o caso.
*   Tarefas concluídas ou já canceladas permanecem como estão. Não afetar tarefas de outras oportunidades nem tarefas sem vínculo com a oportunidade que saiu do funil.
*   Canceladas deixam de aparecer como pendentes ou atrasadas e não contam como realizadas; permanecem consultáveis na oportunidade.
*   Executar saída, cancelamento e eventual criação de tarefas de destino juntos, sem efeito parcial nem duplicidade. Cancelar ou fechar o formulário mantém o estado anterior.
*   Movimentar entre etapas ativas do **mesmo funil** não é saída do funil e não cancela pendências anteriores automaticamente. Manter as regras da etapa de destino.
*   **Ganho:** registrar no Histórico e iniciar Pós-venda na mesma negociação, sem duplicar venda; somente as novas tarefas do Pós-venda permanecem pendentes.
*   **Restauração:** as tarefas antigas continuam canceladas. Criar novas tarefas conforme as automações da etapa escolhida, com novos prazos; não reativar tarefas do ciclo encerrado.

### Datas e abas

Usar datas civis no fuso **America/Sao_Paulo**, não intervalos de 24 horas. Atualizar classificação ao abrir/recarregar, após ações e na virada do dia.

*   **Hoje:** pendentes com vencimento hoje, ordenadas pelo horário. Mesmo com horário passado, permanecem em Hoje até o dia terminar. Quando houver horário informado e ultrapassado, exibir **Horário ultrapassado**.
*   **Atrasadas:** pendentes com vencimento anterior a hoje; mais antigas primeiro. Grupos: **Ontem (1 dia), 2–7 dias, 8–30 dias e Mais de 30 dias (31+)**.
*   **Próximas:** pendentes com vencimento futuro, em ordem crescente. Grupos: **Amanhã (1 dia), Próximos 7 dias (2–7), Próximos 30 dias (8–30) e Após 30 dias (31+)**.
*   **Concluídas:** agrupadas pela data de conclusão, mais recentes primeiro: **Hoje, Últimos 7 dias (1–7 dias anteriores), Últimos 30 dias (8–30) e Mais antigas (31+)**.
*   Grupos e abas não se sobrepõem. Concluídas nunca aparecem nas abas pendentes.

### Listagem, busca e filtros

*   Iniciar em **Hoje**, com responsável filtrado para o usuário atual.
*   Colunas: **Tarefa, Oportunidade, Tipo e Vencimento**; em Concluídas, exibir **Concluída em**. Detalhes mostram vencimento e conclusão.
*   Buscar pelo nome da tarefa.
*   Painel de filtros: **Responsável, Tipo, Oportunidade, Empresa, Contato e Período de vencimento**. Em Concluídas, permitir período de conclusão separado.
*   Combinar campos com **E** e opções do mesmo campo com **OU**.
*   **Aplicar** atualiza e fecha; cancelar descarta mudanças; limpar restaura responsável atual e deixa os demais campos sem restrição.
*   Preservar critérios entre abas, respeitando a classificação de cada uma.
*   Grupos recolhíveis com contadores após filtros; carregar **20 linhas por grupo**, com **Carregar mais**. Diferenciar grupo vazio de busca sem resultados.

### Detalhes e ações individuais

*   Clicar na linha abre painel lateral à direita. Checkbox apenas seleciona; link da oportunidade abre a oportunidade.
*   **Nova tarefa** utiliza o mesmo formulário com **Salvar/Cancelar**. Editar salva alterações.
*   **Feito / Concluir tarefa** registra conclusão e remove a tarefa das pendentes.
*   **Marcar como pendente** desfaz a conclusão somente enquanto o fluxo ao qual a tarefa pertence estiver ativo; preservar vencimento e retornar para Hoje, Atrasadas ou Próximas conforme a data. Não reabrir tarefas de ciclos comerciais encerrados ou de Pós-venda finalizado/interrompido, mesmo que a oportunidade tenha sido restaurada em um novo ciclo. Preservar interações e movimentações já registradas e impedir sua duplicação ao concluir novamente. Tarefas canceladas permanecem canceladas.
*   **Reagendar** solicita nova data e horário opcional, preservando responsável e vínculos; registrar vencimentos anterior e novo.
*   Data passada é permitida com aviso de que a tarefa ficará atrasada. Tarefa concluída precisa ser marcada como pendente antes de reagendar.
*   **Excluir** exige confirmação, remove definitivamente a tarefa e preserva os registros vinculados e o evento de auditoria.

### Conclusão e registro de contato

*   Ao concluir **Primeiro contato, Qualificação, Follow-up, Agendamento ou Proposta**, perguntar obrigatoriamente **Houve contato?**, antes de finalizar. **Gestão** conclui diretamente, sem registrar contato.
*   Se **Sim**, exigir canal (**WhatsApp, Ligação, E-mail, Reunião online, Reunião presencial ou Outro**) e **data/hora real da interação**, preenchida inicialmente com o momento atual e ajustável para o passado. Impedir data futura; observação opcional. Sem canal ou data/hora válida, impedir a confirmação. Registrar separadamente o momento da conclusão da tarefa.
*   Após confirmar contato, canal e data/hora real, registrar a interação na oportunidade vinculada. Atualizar **Último contato** apenas se for a interação mais recente e recalcular **Esfriando** pela data real. Uma conversa antiga não substitui outra mais recente nem remove o alerta quando o prazo já foi atingido.
*   Se **Não**, não registrar contato, não atualizar **Último contato** e não remover o estado **Esfriando**. Oferecer **Concluir sem contato** ou **Reagendar**. Concluir sem contato registra a execução sem interação; Reagendar mantém a tarefa pendente e solicita novo vencimento.
*   Sem oportunidade vinculada, não atualizar nenhuma oportunidade por inferência a partir da empresa ou do contato.
*   Tipo da tarefa representa sua finalidade; canal representa como o contato ocorreu. Escolher um tipo, por si só, não comprova contato realizado.
*   Esta confirmação substitui a regra anterior de registro de interação totalmente separado da conclusão. Deve ser mantida consistente na revisão de Negociação.

### Seleção e ações em lote

*   Checkbox por linha; checkbox do grupo seleciona/desmarca apenas suas linhas carregadas e visíveis, com estado parcial quando necessário.
*   Permitir seleção entre grupos da mesma aba, contando IDs únicos.
*   **Carregar mais** não seleciona novas linhas automaticamente; recolher um grupo mantém a seleção.
*   Trocar aba, busca, filtros ou responsável, ou recarregar, limpa a seleção. Nunca selecionar automaticamente todo o resultado.
*   Com uma ou mais selecionadas, mostrar **Limpar seleção, Reagendar selecionadas e Excluir selecionadas**.
*   Reagendamento em lote somente para pendentes: confirmar quantidade e novo vencimento; preservar responsável e vínculos de cada tarefa.
*   Exclusão em lote também em Concluídas: confirmar quantidade e remoção definitiva, mantendo auditoria e registros relacionados.
*   Executar apenas nos IDs selecionados, revalidando permissão e estado de cada tarefa.
*   Bloquear repetição durante processamento. Sucesso limpa a seleção e recalcula grupos/contadores; falha parcial informa os resultados e mantém apenas as falhas selecionadas para tentar novamente.

### Permissões e autoria — aprovadas em 10/10/2026
*   O vendedor pode **editar, concluir, reagendar, excluir e executar ações em lote** somente nas tarefas que **criou OU pelas quais é responsável atualmente**, respeitando as restrições do estado e do fluxo. “Representante” corresponde ao campo Responsável.
*   O Administrador gerencia todas as tarefas, respeitando as mesmas restrições de estado. Preservar autoria quando houver troca de responsável.
*   Poder editar a oportunidade de um colega não concede, por si só, acesso às suas tarefas. Verificar a condição também nos detalhes da oportunidade e em cada item de ações em lote.
*   Nas tarefas automáticas, o criador é **Sistema**; registrar nas atividades o usuário que acionou a automação. A gestão fica com o responsável e o Administrador.
*   Cancelamentos por saída do funil e atribuições automáticas seguem as regras do fluxo; não dependem de permissão de edição individual de todas as tarefas pelo autor da saída.
*   Na transferência de Pré-venda para Venda, criar a nova tarefa para o Comercial/Administrador ativo escolhido.
*   Empresas/Contatos não ampliam automaticamente as permissões de Tarefas.

### Troca de responsável e ciclos — aprovados em 10/10/2026
*   Ao trocar o responsável da oportunidade no mesmo fluxo, transferir automaticamente as tarefas automáticas pendentes para o novo responsável ativo habilitado. Preservar autoria, prazo e registros; registrar as transferências.
*   Tarefas manuais pendentes mantêm seus responsáveis até transferência explícita permitida. Concluídas e canceladas mantêm os responsáveis históricos.
*   A desativação de usuário segue sua regra específica: transferir todas as pendências e responsabilidades antes de bloquear o acesso.
*   Ao sair do funil, cancelar pendências do fluxo anterior e criar as novas tarefas do destino; essa regra prevalece sobre a transferência de tarefas dentro do mesmo fluxo.
*   Em nova entrada na etapa, criar a tarefa prevista somente se não existir uma pendente correspondente no fluxo ativo. Não reativar canceladas nem recriar automaticamente uma tarefa apenas porque ela foi excluída.

### Atribuição manual — aprovada em 10/10/2026
*   Qualquer usuário que criar uma tarefa pode selecionar seu responsável. Por padrão, preencher com o próprio usuário criador.
*   Permitir selecionar outro usuário ativo, sem exigir o mesmo cargo, respeitando a habilitação e o acesso aos vínculos da tarefa. Se o criador não for elegível para os vínculos escolhidos, exigir outro responsável habilitado antes de salvar.
*   Responsável é obrigatório. Alterar o responsável não altera o criador original; registrar a atribuição e posteriores mudanças nas atividades.
*   A condição **criador OU responsável** continua regendo a gestão após a criação. Alterações posteriores de responsável respeitam essa permissão e os mesmos critérios de elegibilidade.

### Registros e falhas

*   Registrar as ações; criação e conclusão de tarefas vinculadas aparecem na timeline da negociação.
*   Confirmar qualquer saída do funil cancela as tarefas pendentes anteriores vinculadas, preservando registros; não as conclui automaticamente.
*   Falha preserva rascunho ou estado anterior. Impedir envios duplicados durante processamento.

### Esfriamento — aprovado em 08/10/2026
*   Destacar e permitir filtrar oportunidades abertas de **Pré-venda e Venda** após **3 dias úteis sem contato confirmado**. No MVP, considerar segunda a sexta, no fuso da aplicação.
*   Contar a partir do **Último contato**; se nunca houve contato, usar a criação da oportunidade.
*   **Prazo e fuso — aprovado em 10/10/2026:** usar **America/Sao_Paulo**. Somar três dias úteis à data/hora de referência, preservando o horário local; contar somente segunda a sexta, sem considerar feriados no MVP. Começar a contagem no dia seguinte à data de referência e sinalizar ao atingir o prazo. Exemplo: sexta às 14h → quarta às 14h.
*   Somente contato efetivamente confirmado, com canal e data/hora real informados, atualiza Último contato se for a interação mais recente. Recalcular Esfriando pela data real; remover o alerta somente se o prazo não tiver sido atingido. Contato retroativo não reinicia a contagem pela data de inserção. Notas, edições, mudanças de etapa e conclusão sem contato não reiniciam.
*   Manter o alerta mesmo quando houver Follow-up agendado.
*   **Não criar tarefa automática por esfriamento no MVP.** As tarefas por etapa permanecem; esta regra substitui a automação anterior de follow-up após 2 dias sem contato.
*   Não aplicar a oportunidades encerradas nem ao acompanhamento de Pós-venda. Não alterar a temperatura manual.

### Referências

[Figma — Tarefas e regras](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=151-1165) · [Hoje](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=113-8510) · [Detalhes](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=120-15852) · [Reagendamento em lote](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=179-1811) · [Exclusão em lote](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=179-1846)

Revisado em 07/10/2026 para conferência das regras do módulo.

Ajustes de 07/10/2026: Tipo e Responsável obrigatórios, criador como responsável inicial no cadastro manual e confirmação de contato/canal antes de contabilizar interação na oportunidade. Recomendações aceitas: seis tipos definidos, confirmação de contato nos cinco tipos comerciais, conclusão direta de Gestão, opções Concluir sem contato/Reagendar, atraso por dia com indicação Horário ultrapassado e ação Marcar como pendente preservando interações sem duplicá-las. A gestão foi aprovada em 10/10/2026 para criador ou responsável, incluindo edição, conclusão, reagendamento, exclusão e ações em lote. Tarefas automáticas têm Sistema como criador. A regra antiga de automação por esfriamento foi substituída pela decisão de 08/10/2026.

### Organização da etapa Acompanhamento
*   Objetivo: acompanhar resultados, identificar novas necessidades e oportunidades de cross-sell.
*   Toda oportunidade ativa na **etapa Acompanhamento** deve ter responsável e próximo contato agendado. Essa obrigação é exclusiva desta etapa; não se aplica automaticamente a Onboarding, Cliente ativo ou Entrega concluída.
*   Ao entrar na etapa, solicitar **data e horário** do próximo contato e **nota opcional** com seu objetivo. Criar tarefa **Follow-up** vinculada à negociação, atribuída ao responsável, com a nota na descrição.
*   Ao concluir o Follow-up, manter a confirmação de contato e canal e oferecer **Agendar próximo contato** ou **Finalizar acompanhamento**. Sem contato, permitir reagendar, sem registrar interação.
*   Exibir no card responsável, último contato e próximo Follow-up. Destacar **Contato atrasado** ou **Sem próximo contato**, sem usar Esfriando.
*   Permitir filtrar por responsável, contatos atrasados e acompanhamentos sem próxima tarefa. Atraso segue a regra de Tarefas; horário ultrapassado hoje não equivale a atraso por dia.
*   Evitar criar a mesma tarefa duas vezes por confirmação repetida. Se o próximo contato for removido, evidenciar Sem próximo contato para regularização.

![](https://t9011515818.p.clickup-attachments.com/t9011515818/0d3ff402-1f33-4900-bc76-d2302e35c361/image.png)

### Cancelamento de pendências ao finalizar acompanhamento de Pós-venda
Ao confirmar **Finalizar acompanhamento**, cancelar todas as tarefas de Pós-venda ainda **Pendentes** vinculadas àquela oportunidade, manuais ou automáticas, inclusive as atrasadas. Informar o cancelamento no modal. Preservar as tarefas como **Cancelada**, com vínculos, autoria, responsável, vencimento e registros; preservar também as já concluídas ou canceladas. Não registrar contato nem execução. Registrar usuário, data/hora e motivo da finalização. Não afetar tarefas de outras oportunidades, inclusive a nova oportunidade criada para o cliente. Cancelar ou fechar mantém o acompanhamento e as tarefas. Executar finalização e cancelamento juntos, sem efeito parcial ou duplicidade.
Decisão de 10/10/2026: esta regra substitui a exclusão das pendências ao finalizar o Pós-venda.
