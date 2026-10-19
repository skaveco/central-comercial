# Pré - Venda

## Pré-venda
Responsável pela entrada e qualificação dos leads.

### Etapas oficiais
1. **Lead**
2. **Primeiro contato**
3. **Qualificação**
4. **Sem resposta**
5. **Desqualificado**
6. **Agendado**

Fluxo principal: **Lead → Primeiro contato → Qualificação → Agendado**. Sem resposta arquiva com confirmação e envia ao Histórico; Desqualificado encerra com confirmação, cancela as tarefas pendentes, sem campo adicional de motivo, com avaliação baseada na qualificação, e envia ao Histórico. Agendado executa a transferência para Venda após confirmação.

### Tarefa automática ao entrar em Primeiro contato
Ao entrar em **Primeiro contato**, inclusive na movimentação **Lead → Primeiro contato**, criar a tarefa **Qualificar lead — \[nome da oportunidade\]**, tipo **Qualificação**, status **Pendente**, vinculada à oportunidade e atribuída ao seu responsável atual.
*   O tipo Qualificação já faz parte do cadastro de tipos de tarefa.
*   Criar a tarefa não registra contato nem preenche os parâmetros de qualificação.
*   Aplicar a movimentação e a criação juntas, sem duplicação por repetição do evento. Em retorno à etapa, reutilizar a tarefa automática correspondente se ainda estiver pendente.
*   Restaurar uma oportunidade em Primeiro contato cria uma nova tarefa com vencimento no dia da restauração; tarefas canceladas do ciclo anterior permanecem canceladas.
*   A conclusão segue as regras de confirmação de contato do módulo Tarefas. Não há novo avanço automático de etapa definido para essa conclusão.
*   **Vencimento:** no mesmo dia da entrada em Primeiro contato, considerando a data no fuso da aplicação, sem horário obrigatório. Se reutilizar uma tarefa pendente ao retornar à etapa, preservar seu vencimento até reagendamento explícito.

### Saída por Sem resposta
**Sem resposta é uma saída da pipeline, não uma espera ativa.**
Ao mover para Sem resposta, abrir a confirmação de arquivamento, com observação opcional. Informar que o card sairá da pipeline ativa, ficará disponível no Histórico como **Arquivado** e terá suas tarefas comerciais pendentes canceladas.
Confirmar arquiva a mesma oportunidade, preservando dados, vínculos e atividades, e registra que a saída ocorreu por Sem resposta. Aplicar as regras existentes de arquivamento e cancelamento de tarefas, sem marcar tarefas como concluídas nem registrar contato.
Cancelar ou fechar mantém a etapa anterior e suas tarefas. Não arquivar apenas pelo decurso de tempo sem resposta; o gatilho é a movimentação confirmada para essa saída.

### Transferência para Venda
Ao mover a oportunidade para **Agendado**, abrir um formulário. Exigir ao menos **2 respostas preenchidas em parâmetros ativos** de qualificação antes de confirmar; respostas negativas contam e respostas de parâmetros desativados ficam apenas no histórico, inclusive se o usuário pular a etapa Qualificação. O Administrador mantém **2 a 5 parâmetros ativos** em Configurações. Não transferir antes da confirmação.

*   **Responsável — obrigatório:** selecionar explicitamente o vendedor que realizará a call. Listar apenas usuários ativos habilitados a operar Venda (Comercial/Administrador). Não manter automaticamente o autor da transferência; ele pode selecionar a si mesmo se tiver acesso à Venda.
*   **Data e horário da call — obrigatórios:** usar como vencimento da tarefa criada.
*   **Nota — opcional:** observações que o vendedor deseja repassar a quem realizará a call. Copiar o texto informado para a **Descrição da tarefa**. Se não houver nota, deixar a descrição vazia; não bloquear a transferência.
*   **Confirmar transferência:** enviar a mesma oportunidade, com o mesmo ID, para **Venda → Diagnóstico**, alterar seu responsável para o vendedor escolhido e criar a tarefa vinculada.
*   **Cancelar ou fechar:** manter etapa e responsável anteriores, sem criar tarefa.

### Tarefa criada
*   **Título:** Realizar diagnóstico — \[nome da oportunidade\].
*   **Tipo:** Agendamento.
*   **Responsável:** vendedor selecionado no formulário.
*   **Vencimento:** data e horário informados para a call.
*   **Descrição:** nota opcional preenchida no formulário.
*   **Status inicial:** Pendente.
*   **Vínculo:** mesma oportunidade transferida.

Criar a tarefa não contabiliza contato realizado. Na conclusão, aplicar as regras de Tarefas: perguntar **Houve contato?** e, se sim, exigir canal e data/hora real; atualizar Último contato apenas se for a interação mais recente e recalcular Esfriando pela data real, conforme Tarefas.

### Integridade e registros
*   Transferência, cancelamento das tarefas pendentes do funil anterior, troca de responsável e criação da nova tarefa devem ocorrer juntos, conforme [Tarefas](../Tarefas.md). Em falha, preservar o estado anterior, sem transferência parcial ou tarefa isolada, e permitir nova tentativa.
*   Impedir que cliques repetidos ou repetição da mesma confirmação criem tarefas duplicadas.
*   Preservar dados, vínculos e atividades existentes da oportunidade.
*   Registrar autor e momento da transferência, etapa/funil de origem e destino, responsável anterior, novo responsável e data/horário da reunião.
*   Após sucesso, exibir confirmação de transferência para Diagnóstico e de criação da tarefa.

Regras aprovadas em 08/10/2026. A nota opcional do formulário será a descrição da tarefa destinada ao vendedor que realizará a call.

