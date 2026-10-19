# Dashboard

Regras consolidadas em 10/10/2026. A Dashboard apresenta resultado, potencial comercial, evolução das oportunidades e situações que exigem atenção. Os valores da referência visual são exemplos; esta especificação define as métricas e os tooltips, sem determinar formatos de gráficos.

## Filtros e períodos

*   Filtros: **Período, Responsável, Origem, Produto/Serviço e Segmento da empresa**. Segmento substitui a nomenclatura Setor.
*   Usar datas inclusivas no fuso **America/Sao_Paulo**. Combinar campos diferentes com E e opções do mesmo campo com OU.
*   Cada conjunto de indicadores tem uma referência temporal explícita, conforme a tabela abaixo. Não aplicar indiscriminadamente o período global a todos os cards.
*   Mostrar o período ou mês de referência nos indicadores. Alterar filtros recalcula o conjunto correspondente, sem misturar bases.

| Indicadores | Referência temporal | Efeito dos filtros |
| --- | --- | --- |
| Meta, Valor vendido e Valor restante | Mês vigente | Ignoram todos os filtros globais; valores globais da operação |
| Pré-venda, Leads por origem e Leads por responsável | Criação dos leads no período selecionado | Acompanham a evolução desse mesmo grupo até o momento da consulta |
| Venda | Primeira entrada em Venda no período selecionado | Acompanha a evolução desse mesmo grupo até o momento da consulta |
| Vendas por categoria, Vendas por produto, Ticket médio e Ciclo médio | Data do ganho no período selecionado | Aplicam os filtros globais |
| Motivos de perda | Data da perda no período selecionado | Aplica os filtros globais |
| Valor ativo no funil e alerta de esfriamento | Situação atual | Ignoram o período global; aplicam os demais filtros |
| Previsão de fechamento — este mês/próximo mês | Data prevista de fechamento no respectivo mês | Ignoram o período global; aplicam os demais filtros |

## Meta e resultado do mês vigente

*   **Meta:** valor global configurado para o mês vigente, sem rateio por responsável, produto ou outro filtro.
*   **Valor vendido:** soma dos valores finais das oportunidades atualmente Ganhas, com data do ganho vigente no mês atual. Contar uma venda por oportunidade, sem duplicar pelo Pós-venda.
*   **Percentual atingido:** valor vendido no mês ÷ meta do mês × 100. Pode superar 100%.
*   **Valor restante:** máximo entre meta menos valor vendido no mês e zero.
*   Subtítulo de Valor restante: **“X% para atingir a meta”**, calculado pelo valor restante ÷ meta × 100. Não usar “taxa de ganho”. Ao atingir ou superar a meta, indicar **Meta atingida**.
*   Sem meta cadastrada, exibir **Meta não definida** nos indicadores dependentes, sem calcular percentual ou tratar ausência como meta zero. Valor vendido continua disponível.
*   Meta, Valor vendido e Valor restante permanecem no mês vigente, independentemente dos filtros globais.

## Valor ativo no funil

*   Somar o valor total atual das oportunidades abertas em **Pré-venda e Venda**, cada uma uma única vez.
*   Excluir Ganhas, Perdidas, Desqualificadas, Arquivadas e acompanhamentos de Pós-venda.
*   Respeitar o modo calculado/manual do valor da oportunidade. Não somar produtos novamente ao total.
*   O valor representa potencial comercial atual, não receita confirmada.
*   Oportunidades sem valor definido não entram na soma; informar sua quantidade para evidenciar a parcela da carteira ainda não valorada. Valor ausente é diferente de zero.

## Evolução por passagem nas etapas

*   Os blocos Pré-venda e Venda mostram **passagens registradas**, não a quantidade de cards atualmente estacionados em cada etapa.
*   Selecionar o grupo pela data de referência e acompanhar exclusivamente as oportunidades desse grupo até o momento da consulta. Avanços posteriores ao fim do período também entram na evolução desse grupo.
*   Contar IDs únicos por etapa. Voltar à etapa, restaurar ou reabrir não duplica o lead nem sua passagem. Não criar uma nova entrada na base de leads gerados por restauração.
*   Uma oportunidade criada diretamente em uma etapa conta nessa etapa, mas não conta nas anteriores que não percorreu. Não inferir contato, diagnóstico realizado, envio de proposta ou outra atividade pela simples existência de etapas posteriores.
*   Uma oportunidade pode aparecer em várias linhas de passagem. Não somar essas linhas como se fossem grupos exclusivos.
*   Ganho e Perdido representam resultados comerciais vigentes; reabertura remove o resultado vigente, preservando as passagens e os eventos anteriores.
*   Toda conversão compara oportunidades do **mesmo grupo** que efetivamente passaram pela etapa-base. Entradas diretas ou saltos não devem gerar conversões acima de 100%.
*   Denominador zero: exibir **—**, com tooltip **Sem base para calcular a conversão**.

### Pré-venda

*   **Leads gerados:** oportunidades criadas em Pré-venda no período selecionado, independentemente da etapa inicial. Criar diretamente em Venda ou Pós-venda não simula geração de um lead na Pré-venda.
*   **Passaram por Primeiro contato:** leads desse grupo com entrada registrada nessa etapa. Não equivale a contato efetivamente confirmado.
*   **Qualificação preenchida:** leads desse grupo que concluíram a qualificação com ao menos duas respostas em parâmetros ativos no momento da validação. Respostas negativas contam; o indicador não representa aprovação comercial positiva. Alterações posteriores do catálogo não apagam a conclusão histórica.
*   **Diagnósticos agendados:** leads desse grupo cuja transferência por Agendado foi confirmada, com criação da tarefa de diagnóstico. A contagem usa o evento da transferência, já que o card segue para Venda → Diagnóstico.
*   **Conversão geral:** diagnósticos agendados desse grupo ÷ leads gerados desse grupo × 100.
*   Evitar o rótulo isolado “Qualificados”, que poderia sugerir avaliação comercial positiva, e “Em contato”, que poderia sugerir uma interação confirmada.

### Venda

*   Base: oportunidades cuja **primeira entrada no funil de Venda** ocorreu no período selecionado, por transferência, criação direta ou restauração de oportunidade que nunca esteve nesse funil.
*   **Passaram por Diagnóstico**, **Passaram por Proposta em andamento**, **Passaram por Proposta enviada** e **Passaram por Negociação:** contar oportunidades da base com passagem efetivamente registrada na etapa correspondente.
*   “Passaram por Diagnóstico” não significa que a reunião foi realizada. Não contar a etapa apenas porque uma oportunidade foi criada em uma etapa posterior.
*   **Perdidas** e **Ganhas:** oportunidades da base com o respectivo resultado vigente, mesmo quando o encerramento ocorreu depois do período selecionado.
*   Não usar **Proposta apresentada**, pois essa etapa não pertence ao fluxo aprovado.
*   **Conversão geral Diagnóstico → Venda:** oportunidades atualmente Ganhas desse grupo que passaram por Diagnóstico ÷ oportunidades desse grupo que passaram por Diagnóstico × 100.
*   Ganhas que não passaram por Diagnóstico aparecem no total de Ganhas, mas não no numerador ou denominador dessa conversão. Explicar a diferença no tooltip.
*   O total de Ganhas deste bloco pode diferir das vendas fechadas no período: aqui a seleção é pela entrada no funil; nos indicadores de resultado, pela data do ganho.

### Tooltips das linhas de evolução

Exibir ao passar o mouse sobre cada linha:

*   Nome completo do indicador e quantidade de oportunidades únicas.
*   Para a base, período de criação/entrada e esclarecimento de que a evolução é acompanhada até agora.
*   Para conversão entre etapas, apresentar **“X de Y oportunidades que passaram por [etapa-base] também chegaram a [destino] — Z%”**. X é a interseção dos dois grupos, não necessariamente todo o total da linha de destino.
*   Nas linhas sem etapa-base comparável, mostrar a participação no grupo inicial, com denominador explícito.
*   Em Ganhas, mostrar também o valor final total das vendas da linha e a conversão entre as oportunidades que passaram por Diagnóstico. Em Perdidas, mostrar a quantidade e sua participação na base de Venda; o valor das oportunidades pode ser exibido como valor perdido, sem representar receita.
*   Não exibir percentuais sem identificar sua base. Os tooltips complementam as linhas; não são elementos permanentemente abertos.

## Leads por origem e por responsável

*   Utilizar exatamente o mesmo grupo de **Leads gerados** da Pré-venda e os mesmos filtros.
*   Contar oportunidades, não cadastros de contatos ou empresas.
*   **Origem:** origem registrada na criação do lead; incluir **Sem origem** quando não informada.
*   **Responsável:** responsável na entrada inicial da Pré-venda. A transferência posterior para Venda não muda a atribuição histórica de geração de demanda. O filtro de responsável nesses indicadores usa essa mesma referência.
*   Tooltips: nome da origem/responsável, quantidade de leads e percentual sobre o total filtrado de leads gerados.

## Vendas por categoria e por produto

*   Considerar oportunidades atualmente Ganhas com data do ganho vigente no período selecionado, aplicando os filtros.
*   **Vendas por categoria:** quantidade de oportunidades ganhas que incluem ao menos um produto da categoria. Categoria é a do catálogo de Produtos, como Branding ou Tecnologia; não é o segmento da empresa.
*   **Vendas por produto:** quantidade de oportunidades ganhas que incluem o produto, independentemente da quantidade de unidades desse item.
*   Contar uma oportunidade uma vez por categoria e uma vez por produto. Vários produtos da mesma categoria não duplicam a venda naquela categoria.
*   Uma venda pode incluir vários produtos e categorias. Portanto, a soma das participações pode superar o total de vendas e 100%; não apresentar essas participações como partes exclusivas de um todo.
*   Se houver total geral, usar a quantidade de oportunidades ganhas únicas, e não a soma das contagens por produto/categoria.
*   Tooltips: nome, quantidade de vendas que incluem o produto/categoria e percentual sobre as vendas únicas do conjunto filtrado. Informar que uma venda pode participar de mais de um grupo.
*   Não apresentar faturamento por produto/categoria no MVP: o ajuste manual do valor total ainda não possui rateio entre os itens. A categoria usada para resultado deve ser preservada no fechamento para não reclassificar vendas antigas quando o catálogo mudar.

## Ticket médio

*   Soma dos valores finais das oportunidades atualmente Ganhas no período ÷ quantidade dessas oportunidades.
*   Selecionar pela data do ganho vigente e aplicar os filtros globais; não duplicar pela quantidade de produtos ou pelo Pós-venda.
*   Subtítulo: **Valor médio por venda**. Não associar o subtítulo a percentual da meta.
*   Sem vendas, exibir **—**, com indicação **Sem vendas no período**.
*   Tooltip: valor vendido considerado, quantidade de vendas e período.

## Ciclo médio de venda

*   Média do tempo decorrido entre criação da oportunidade e seu ganho vigente, entre as oportunidades atualmente Ganhas com data do ganho no período selecionado.
*   Aplicar os filtros globais. Excluir oportunidades cadastradas diretamente como Ganhas ou em Pós-venda; elas não representam um ciclo acompanhado desde a criação.
*   Preservar a data original de criação após restauração/reabertura. Um novo ganho usa sua nova data e continua representando o tempo desde a criação original.
*   Exibir em dias. Sem oportunidades elegíveis, exibir **—**, sem tratar ausência como ciclo zero.
*   Tooltip: quantidade de vendas consideradas, período e aviso de exclusão dos cadastros diretos em Ganho/Pós-venda.

## Previsão de fechamento

*   **Previsão de fechamento — este mês:** soma dos valores atuais das oportunidades abertas em Pré-venda/Venda com data prevista de fechamento no mês vigente.
*   **Previsão de fechamento — próximo mês:** mesmo cálculo para o mês seguinte, inclusive na mudança de ano.
*   Respeitar os demais filtros, mas não o período global. Mostrar o mês/ano de referência.
*   Não incluir encerradas ou Pós-venda. Não aplicar probabilidades: é valor previsto em oportunidades, não receita garantida nem projeção ponderada.
*   Mostrar a quantidade de oportunidades correspondente. Na soma, incluir somente valores definidos e informar a quantidade sem valor.
*   Oportunidades sem data prevista ou com previsão anterior ao dia atual ficam fora desses totais; evidenciar suas quantidades separadamente como **Sem previsão** e **Previsão vencida**, sem realocação automática. Uma previsão vencida dentro do mês vigente também fica fora do total previsto.
*   Tooltips: mês de referência, quantidade de oportunidades, valor previsto e indicação de que o cálculo usa a data prevista de fechamento.

## Motivos de perda

*   Considerar oportunidades atualmente Perdidas com data da perda vigente no período selecionado e aplicar os filtros globais.
*   Agrupar pelo motivo registrado no encerramento. Preservar motivos desativados já utilizados.
*   Não incluir Arquivadas, Desqualificadas ou Ganhas. Contar uma oportunidade uma única vez no resultado vigente.
*   **Ao passar o mouse sobre cada motivo, mostrar:** nome completo do motivo, quantidade de oportunidades perdidas e percentual sobre todas as perdas do conjunto filtrado.
*   Exemplo ilustrativo: **“Preço — 8 oportunidades perdidas — 25% das 32 perdas no período.”**
*   Sem perdas, exibir estado vazio, sem calcular percentual sobre zero.

## Alerta de oportunidades esfriando

*   Contar oportunidades abertas de Pré-venda/Venda que atendam à regra de esfriamento: três dias úteis sem contato confirmado, usando a data real da interação mais recente e, na ausência, a criação.
*   Não incluir encerradas nem Pós-venda. Seguir o prazo e o fuso definidos em [Tarefas](Tarefas.md).
*   Mostrar a situação atual, ignorando o período histórico selecionado e respeitando os demais filtros e permissões.
*   Informar claramente que a contagem se refere às oportunidades atualmente esfriando.

## Integridade, histórico e permissões

*   Reabertura remove o resultado Ganho/Perdido vigente dos indicadores de resultado, inclusive ao consultar seu período anterior. Os eventos permanecem nas atividades. Um novo encerramento usa sua nova data e não cria outra venda vigente para a mesma oportunidade.
*   Preservar eventos de criação, primeira entrada nos funis, passagens, qualificação, agendamento e encerramento para calcular a evolução sem inferi-la apenas da etapa atual.
*   Preservar responsável/origem de geração de demanda e dados de fechamento utilizados nos resultados. Para resultados por responsável, usar o responsável no encerramento; para a base de Venda, o da primeira entrada; para carteira ativa e previsões, o responsável atual. Identificar o contexto do filtro na interface.
*   **Administrador:** visão completa da operação. **Pré-venda:** métricas relacionadas à Pré-venda e Venda. **Comercial:** métricas relacionadas à Pré-venda, Venda e Pós-venda. O acesso compartilhado aos funis não altera as restrições individuais de Tarefas.
*   Filtros não ampliam permissões. Quando um indicador não estiver disponível ao perfil, não exibi-lo nem retornar seus dados. Os cards globais de meta e resultado, quando disponíveis ao perfil, não devem ser apresentados como valores pessoais.
*   Distinguir carregamento, ausência de dados e falha. Valores monetários ausentes não são zero; denominadores vazios não produzem percentuais fictícios.
