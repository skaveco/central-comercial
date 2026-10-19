# Pipeline (funis)

## Estrutura dos funis

A Central Comercial possui 3 funis principais:
*   **Pré-venda**
*   **Venda**
*   **Pós-venda**

**Acesso:** Pré-venda e Comercial operam os funis de Pré-venda e Venda. Comercial também opera o Pós-venda; Administrador possui acesso total. As permissões próprias de tarefas, configurações e reabertura continuam sendo aplicadas separadamente.

Cada funil possui etapas oficiais fixas. No MVP, **não permitir criar nem excluir etapas**. **Todos os perfis podem ocultar etapas** da visualização nos funis aos quais têm acesso, sem excluir registros nem alterar as regras da etapa. A ocultação vale **somente para o próprio usuário** e não altera a visualização da equipe. Permitir reexibir as etapas ocultas; ocultar não cancela tarefas, muda oportunidades de etapa ou desativa automações. Etapas ocultas continuam disponíveis nos seletores de criação e movimentação.

## Pré-venda

Responsável pela entrada e qualificação dos leads.

### Etapas
1. **Lead** — novo contato ainda não abordado.
2. **Primeiro contato** — contato inicial realizado ou em andamento.
3. **Qualificação** — análise do potencial e aderência da oportunidade.
4. **Sem resposta** — saída por arquivamento confirmado, com envio ao Histórico.
5. **Desqualificado** — oportunidade encerrada na Pré-venda.
6. **Agendado** — diagnóstico ou reunião comercial marcada.

**Fluxo principal:** Lead → Primeiro contato → Qualificação → Agendado.

Ao entrar em **Primeiro contato**, criar tarefa **Qualificar lead**, tipo **Qualificação**, para o responsável atual e vinculada à oportunidade, sem duplicar tarefa pendente da mesma automação. O vencimento é no mesmo dia da entrada em Primeiro contato, no fuso da aplicação, sem horário obrigatório. Ao reutilizar uma tarefa pendente, preservar seu vencimento até reagendamento explícito. Regras detalhadas em [Pré-venda](Pr%C3%A9-venda.md).

## Venda

Responsável pelas oportunidades qualificadas até o fechamento.

### Etapas
1. **Diagnóstico**
2. **Proposta em andamento**
3. **Proposta enviada**
4. **Negociação**
5. **Ganho**
6. **Perdido**

**Fluxo principal:** Diagnóstico → Proposta em andamento → Proposta enviada → Negociação → Ganho.

## Pós-venda

Responsável pelo acompanhamento comercial após a contratação.

### Etapas
1. **Onboarding**
2. **Cliente ativo**
3. **Entrega concluída**
4. **Acompanhamento**

**Fluxo principal:** Onboarding → Cliente ativo → Entrega concluída → Acompanhamento.

### Regras
*   Permitir avanço e recuo livres entre etapas ativas do mesmo funil, por arrastar o card ou pelos detalhes, sem passagem sequencial obrigatória. Manter as automações, formulários e validações da etapa de destino; transições entre funis e encerramentos seguem suas regras específicas.
*   **Sem resposta** abre confirmação de arquivamento com observação opcional; confirmar remove o card da pipeline ativa, envia ao Histórico como Arquivado e cancela tarefas comerciais pendentes. Cancelar mantém o estado anterior.
*   **Desqualificado** encerra a oportunidade, cancela as tarefas pendentes e permanece disponível no Histórico de Negociações.
*   **Perdido** encerra a oportunidade e permanece disponível no Histórico de Negociações.
*   Ao mover para **Agendado**, abrir formulário com **Responsável, Data e Horário obrigatórios** e **Nota opcional**. Somente ao confirmar, transferir a mesma oportunidade para **Venda → Diagnóstico**, atribuí-la ao vendedor selecionado e criar a tarefa de **Agendamento**. A nota informada será a descrição da tarefa. Cancelar ou falhar preserva o estado anterior. Regras completas em [Pré-venda](Pr%C3%A9-venda.md).
*   Ao confirmar **Ganho**, cancelar as pendências anteriores e iniciar **Onboarding** no Pós-venda. Toda saída do funil segue a [regra geral de cancelamento de tarefas](../Tarefas.md), inclusive transferências e Desqualificação.
*   Após transições automáticas, o sistema exibe um feedback na interface.
*   Colunas podem ser ocultadas da visualização sem excluir seus registros.

### Esfriamento — aprovado em 08/10/2026
*   Destacar e permitir filtrar oportunidades abertas de **Pré-venda e Venda** após **3 dias úteis sem contato confirmado**. No MVP, considerar segunda a sexta, no fuso da aplicação.
*   Contar a partir do **Último contato**; se nunca houve contato, usar a criação da oportunidade.
*   **Prazo e fuso — aprovado em 10/10/2026:** usar **America/Sao_Paulo**. Somar três dias úteis à data/hora de referência, preservando o horário local; contar somente segunda a sexta, sem considerar feriados no MVP. Começar a contagem no dia seguinte à data de referência e sinalizar ao atingir o prazo. Exemplo: sexta às 14h → quarta às 14h.
*   Somente contato efetivamente confirmado, com canal e data/hora real informados, atualiza Último contato se for a interação mais recente. Recalcular Esfriando pela data real; remover o alerta somente se o prazo não tiver sido atingido. Contato retroativo não reinicia a contagem pela data de inserção. Notas, edições, mudanças de etapa e conclusão sem contato não reiniciam.
*   Manter o alerta mesmo quando houver Follow-up agendado.
*   **Não criar tarefa automática por esfriamento no MVP.** As tarefas por etapa permanecem; esta regra substitui a automação anterior de follow-up após 2 dias sem contato.
*   Não aplicar a oportunidades encerradas nem ao acompanhamento de Pós-venda. Não alterar a temperatura manual.

### Navegação e filtros

#### Tabs
*   **Ativo** — negociações em andamento.
*   **Esfriando / Pendente** — negociações que exigem atenção ou follow-up.

#### Período
Filtro por calendário com presets:
*   **Semana**
*   **Mês**
*   **Período personalizado**

#### Filtros globais
*   **Responsável**
*   **Empresa**
*   **Contato**
*   **Serviço**
*   **Origem**

### Ajustes de operação
*   A tab **Esfriando / Pendente** reúne negociações esfriando e negociações com tarefa comercial pendente ou atrasada.
*   **Desqualificado** e **Perdido** são etapas de saída: ao entrar nelas, a negociação é encerrada, sai do pipeline ativo e permanece no Histórico de Negociações.

### Temperatura do lead
A Pipeline deve permitir visualizar e filtrar negociações pela temperatura:
*   **Frio**
*   **Morno**
*   **Quente**

## Páginas

- [Pré-venda](Pr%C3%A9-venda.md)
- [Venda](Venda.md)
- [Pós-venda](P%C3%B3s-venda.md)
