# Controle de metas

## Controle de metas
Área de **Configurações → Metas**.

### Objetivo e apresentação
Configurar o **valor da meta mensal de vendas da central comercial em R$**.
Subtítulo: **Defina o objetivo mensal de vendas da central comercial.**
A identificação da tela deve ser **Configurações — Metas**.

### Estados da tela
Exibir apenas um dos estados por vez:
*   **Com meta cadastrada:** seção **Meta atual**, valor formatado em R$, indicação **Meta mensal** e botão **Editar**.
*   **Sem meta cadastrada:** seção **Meta atual**, mensagem **Parece que ainda não há nenhuma meta mensal cadastrada** e botão **Nova meta**.

### Cadastro e edição
**Nova meta** e **Editar** abrem o formulário do valor mensal.
*   Valor em R$ obrigatório e maior que zero.
*   Ações **Salvar** e **Cancelar**.
*   Validar o valor antes de salvar; se inválido, informar o erro e manter o formulário aberto para correção.
*   Salvar persiste a meta e atualiza sua exibição e os indicadores relacionados na Dashboard.
*   Cancelar ou fechar mantém o valor anterior; sem cadastro anterior, mantém o estado vazio.

### Vigência mensal
A meta cadastrada se repete automaticamente nos meses seguintes até ser alterada.
Uma edição atualiza a meta do mês atual e o valor utilizado nos próximos meses, **preservando as metas dos meses anteriores**.
Não há seleção de mês/ano nesta tela.

### Relação com filtros — aprovada em 10/10/2026
A meta exibida é exclusivamente a **meta global do mês vigente**. Filtros de período, responsável, origem, serviço ou segmento não alteram seu valor nem o mês de referência; não ratear ou somar metas em função dos filtros. Metas anteriores permanecem preservadas para histórico. Os cards Meta, Valor vendido e Valor restante usam os totais globais do mês vigente e ignoram todos os filtros globais, conforme [Dashboard](../Funcionalidades/Dashboard.md). Valor restante é limitado a zero; o percentual atingido pode superar 100%.

### Uso na Dashboard
A meta alimenta a meta do mês, o valor restante para atingir a meta e o percentual atingido, em conjunto com o valor vendido.
A apuração das vendas deve respeitar as regras de Ganho/Histórico: uma venda por negociação, sem duplicar pelo acompanhamento de Pós-venda; reabertura retira ganho e valor vendido dos indicadores atuais.
Na ausência de meta cadastrada, indicar que a meta não foi definida, sem tratá-la como meta zero nem calcular percentual sobre zero.

### Permissões
Somente o **Administrador** pode cadastrar e editar a meta, conforme aprovação de 10/10/2026.

