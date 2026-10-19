# Histórico

Área em **Comercial → Histórico** para consultar negociações **Ganhas, Perdidas, Desqualificadas e Arquivadas**.

### Listagem e consulta

*   Exibir uma linha atual por negociação, mantendo o mesmo ID. Encerramentos anteriores permanecem nas atividades, sem duplicar linhas.
*   Colunas: **Oportunidade, Resultado, Valor, Responsável, Encerramento e Motivo**.
*   Clicar na linha ou em **Visualizar** abre o registro em modo de consulta.
*   Buscar pelo nome parcial da oportunidade, sem diferenciar maiúsculas e minúsculas. Ordenação por nome, de A a Z.
*   Iniciar no mês atual, considerando a data de encerramento comercial. Permitir outro intervalo, com datas inicial e final inclusivas no fuso da aplicação.
*   Paginação com 10 registros por página por padrão, total de resultados e navegação anterior/próxima. Manter busca e filtros entre páginas; alterar critérios retorna à primeira página.

### Filtros

Painel lateral à direita com **Resultado, Período de encerramento, Responsável, Empresa, Contato, Serviço e Motivo**.

*   Sem resultado selecionado, incluir todos. Combinar opções do mesmo campo com **OU** e campos diferentes com **E**.
*   Abrir o painel com os critérios aplicados. **Aplicar** atualiza a listagem e fecha o painel; fechar sem aplicar descarta as alterações.
*   **Limpar** remove as seleções e restaura o mês atual, com efeito ao aplicar.
*   Sincronizar o período da barra com o painel e impedir intervalos inválidos.
*   Usar os motivos registrados nos encerramentos. Ganhas e Desqualificadas sem motivo exibem **—** e não aparecem ao filtrar por um motivo específico.
*   O período considera o encerramento comercial, não a entrega ou a mudança de etapa do pós-venda.

### Entrada no Histórico

*   **Perder:** exigir motivo cadastrado pelo Administrador e confirmação.
*   **Desqualificar:** confirmar encerramento sem campo adicional de motivo; avaliação baseada nos parâmetros de qualificação. Cancelar as tarefas pendentes, conforme a regra geral de saída do funil.
*   **Arquivar:** solicitar confirmação e observação opcional, sem motivo obrigatório ou catálogo. Informar que irá ao Histórico e cancelará tarefas comerciais pendentes; cancelar ou fechar mantém o registro.
*   **Ganhar:** não exigir motivo; retirar do funil de Venda, registrar como Ganha no Histórico e iniciar acompanhamento em **Onboarding**, no Pós-venda, vinculado à mesma negociação.
*   Registrar data e usuário do encerramento, funil e etapa anteriores, dados, produtos e valor fechado. Preservar as atividades.
*   Finalizar o acompanhamento de pós-venda apenas atualiza sua situação e atividades; não cria outra entrada no Histórico.
*   A transferência de Pré-venda para Venda não é encerramento e não exige motivo.
*   **Criação direta em etapa de saída ou Pós-venda:** aplicar a [regra de criação de Oportunidades](Oportunidades.md). Ganho/Pós-venda registra Ganha com os dados de fechamento; Perdido, Desqualificado e Sem resposta registram o resultado correspondente após confirmação. A entrada direta no Pós-venda inicia na etapa escolhida, sem criar outra venda.

### Cancelamento de tarefas na saída do funil — aprovado em 10/10/2026

Aplicar a [regra geral de Tarefas](Tarefas.md): qualquer saída confirmada cancela as pendências anteriores, inclusive Desqualificação, transferência e interrupção/finalização do Pós-venda. Preservar os registros como **Cancelada**, sem excluir nem registrar contato. Cancelamento e saída acontecem juntos; tarefas novas do destino seguem normalmente.

### Ações

**Negociações não ganhas**
*   **Visualizar** e **Restaurar**, conforme permissões.
*   Ao clicar em **Restaurar**, sempre abrir um modal para escolher **Funil de destino** e **Etapa de destino**, ambos obrigatórios, com botões **Restaurar negociação** e **Cancelar**. Oferecer apenas os funis **Pré-venda e Venda**, respeitando o acesso do usuário, e etapas pertencentes ao funil escolhido. Não permitir restaurar diretamente para Pós-venda. Exigir a escolha a cada abertura, sem retorno automático ao destino anterior. Confirmar restaura no funil e na etapa escolhidos; cancelar ou fechar não altera o registro.
*   Retirar a negociação da listagem de encerradas e preservar os eventos anteriores. A oportunidade restaurada volta a seguir normalmente as validações, formulários e automações da etapa escolhida. Criar as tarefas previstas para a nova entrada, com prazos calculados pela nova entrada; as tarefas do ciclo anterior permanecem canceladas. Impedir apenas a duplicação da mesma confirmação, sem bloquear automações legítimas do novo ciclo.

**Negociações ganhas**
*   **Visualizar** e **Ver pós-venda**, inclusive após o acompanhamento estar Finalizado, em modo de consulta.

**Reabertura pelo Administrador**
*   O Administrador pode **Reabrir negociação** de qualquer resultado, a qualquer momento, sem solicitar justificativa, independentemente do status, inclusive Ganhas com pós-venda finalizado.
*   Ao clicar em **Reabrir negociação**, sempre abrir o modal para escolher **Funil de destino** e **Etapa de destino**, ambos obrigatórios, seguindo a mesma regra de seleção da restauração: apenas **Pré-venda ou Venda**, sem destino direto em Pós-venda. Não exibir nem exigir campo de justificativa. **Confirmar reabertura** aplica o destino escolhido; cancelar ou fechar não altera o registro.
*   Para Ganhas, reabrir no destino escolhido, retirar o ganho e o valor vendido dos indicadores atuais e interromper o acompanhamento, preservando atividades e entregas.
*   Não apagar tarefas ou anexos nem desfazer execuções externas. Na reabertura de Ganha, cancelar pendências do Pós-venda interrompido antes de criar as tarefas da etapa comercial de destino, conforme a regra geral de saída do funil.
*   Registrar usuário e data da reabertura e impedir execução repetida da mesma ação.
*   Um novo encerramento atualiza a mesma entrada por ID; um novo ganho inicia um **novo ciclo em Onboarding**, preservando o acompanhamento anterior e sem duplicar a venda vigente.

### Destinos de restauração e reabertura — aprovados em 10/10/2026
*   **Pré-venda:** Lead, Primeiro contato ou Qualificação.
*   **Venda:** Diagnóstico, Proposta em andamento, Proposta enviada ou Negociação.
*   Não oferecer Agendado, Sem resposta, Desqualificado, Ganho, Perdido ou etapas de Pós-venda como destino de restauração/reabertura.
*   Exigir responsável ativo habilitado para o destino e respeitar as permissões de quem executa a ação.
*   Entrada em Venda exige duas respostas preenchidas em parâmetros ativos, inclusive na restauração/reabertura; respostas negativas contam. Manter formulários e automações da etapa escolhida.
*   A criação de uma nova oportunidade continua permitindo qualquer etapa, com os respectivos efeitos e validações.

### Permissões e retenção

*   **Administrador, Pré-venda e Comercial** podem consultar e visualizar o Histórico e restaurar negociações não ganhas conforme suas permissões.
*   Apenas o **Administrador** pode reabrir Ganhas.
*   Pré-venda e Comercial operam os funis de Pré-venda e Venda e podem restaurar negociações não ganhas para qualquer um desses dois funis. Comercial também opera o Pós-venda; Administrador possui acesso total.
*   O acompanhamento de Pós-venda é operado por Comercial e Administrador; Pré-venda consulta o registro comercial no Histórico.
*   Retenção indefinida no MVP, sem exclusão automática ou permanente.

### Estados da tela

*   Exibir carregamento durante a consulta.
*   Histórico vazio: **Nenhuma negociação no histórico.**
*   Busca sem resultados: **Nenhuma negociação encontrada para os critérios informados**, com opção de limpar busca e filtros.
*   Erro: oferecer **Tentar novamente**.
*   Falha ao restaurar: manter a negociação no Histórico e permitir nova tentativa.

### Referência

[Figma — Histórico](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=95-1092) · [Notas de comportamento e regras](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=135-1160)

Base: Figma consultado em 06/10/2026, com ajustes posteriores definidos para este módulo: restauração e reabertura sempre por modal com escolha obrigatória de funil e etapa de destino; reabertura pelo Administrador sem justificativa (confirmado em 07/10/2026). Esses ajustes prevalecem sobre as notas anteriores do Figma.
