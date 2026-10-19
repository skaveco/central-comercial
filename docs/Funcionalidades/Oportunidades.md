# Oportunidades

### Definição
A **Negociação** é o registro comercial que percorre os funis da plataforma.

### Relacionamentos
Uma negociação pode ser vinculada a:
*   **Contato**
*   **Empresa**
*   um ou mais **Produtos e Serviços**

### Campos
1. **Nome da negociação**
2. **Empresa**
3. **Contato**
4. **Serviços**
5. **Valor da venda**
6. **Origem**
7. **Responsável**
8. **Descrição / observações**
9. **Funil de destino — obrigatório no cadastro**
10. **Etapa do funil — obrigatória no cadastro**

### Criação de oportunidade — aprovada em 10/10/2026
*   Permitir criar uma negociação em qualquer etapa; a criação não fica restrita a Lead ou Diagnóstico.
*   Todo botão de **Nova oportunidade/Criar oportunidade**, inclusive em Empresa, Contato e Pós-venda, deve abrir um formulário com **Funil e Etapa obrigatórios**, junto aos demais campos.
*   Exibir etapas pertencentes ao funil escolhido. Ao trocar o funil, exigir nova seleção de etapa. Respeitar as permissões de acesso aos funis.
*   Aplicar os formulários, validações e automações da etapa de destino; não simular passagem pelas etapas anteriores nem criar suas tarefas.
*   Confirmar cria um novo ID e registra autor, data, funil e etapa iniciais. Cancelar não cria registros; falha não deixa cadastro ou tarefas parciais; repetição da confirmação não duplica a oportunidade.
*   Os vínculos previamente preenchidos por Empresa, Contato ou Pós-venda seguem as regras de cadastros ativos.
*   **Ganho ou qualquer etapa de Pós-venda:** exigir Empresa, Contato, Responsável, ao menos um Produto com quantidade inteira positiva e Valor final maior que zero. Confirmar registra a negociação como **Ganha** no Histórico, uma única vez. Em Ganho, iniciar Onboarding; em criação direta no Pós-venda, iniciar na etapa escolhida. Acompanhamento exige também o formulário de próximo contato. Cancelar não cria negociação nem venda.
*   **Perdido, Desqualificado ou Sem resposta:** executar o encerramento correspondente após confirmação; Perdido exige motivo cadastrado, Desqualificado não exige motivo adicional e Sem resposta arquiva com observação opcional. Registrar no Histórico, sem manter card ativo nem tarefas pendentes.
*   **Agendado:** aplicar a transferência já definida na Pré-venda, com qualificação, vendedor, data e horário da call e nota opcional. A confirmação cria a mesma negociação em Venda → Diagnóstico e sua tarefa de Agendamento, sem deixar outro card em Agendado.
*   Criar diretamente em uma etapa não cria tarefas de etapas anteriores. Registrar criação e eventual encerramento na mesma operação, com uma única venda quando aplicável.
*   **Qualificação:** qualquer entrada em Venda, inclusive criação direta, exige duas respostas preenchidas em parâmetros ativos; respostas negativas contam. Ver a regra de qualificação abaixo.

### Funcionalidades relacionadas
*   **Tarefas**
*   **Critérios qualificatórios** — checklist configurável pelo Administrador.
*   **Notas rápidas**
*   **Anexos**
*   **Motivo de perda**
*   **Data prevista de fechamento**
*   **Data de entrada em cada etapa**
*   **Último contato** — data/hora da última interação comercial registrada.

### Ações
*   Editar
*   Arquivar
*   Criar tarefa
*   Adicionar nota
*   Mover de etapa
*   Marcar como ganho
*   Marcar como perdido
*   Criar nova oportunidade para este cliente

### Histórico de atividades
Registra automaticamente os principais eventos da negociação.

Exibir atividades mais recentes primeiro e carregar as anteriores automaticamente conforme a rolagem. Sem páginas numeradas ou botão Carregar mais; sem filtros inicialmente. Preservar a posição da leitura e evitar eventos duplicados ao carregar.

**Eventos iniciais:**
*   criação da negociação;
*   mudança de etapa;
*   alteração de valor;
*   troca de responsável;
*   vínculo ou remoção de Empresa, Contato ou Serviço;
*   negociação ganha ou perdida;
*   tarefa criada ou concluída;
*   nota adicionada;
*   proposta enviada.

### Campos de sistema
*   **Etapa atual**
*   **Data de criação**
*   **Último contato**

### Esfriamento — aprovado em 08/10/2026
*   Destacar e permitir filtrar oportunidades abertas de **Pré-venda e Venda** após **3 dias úteis sem contato confirmado**. No MVP, considerar segunda a sexta, no fuso da aplicação.
*   Contar a partir do **Último contato**; se nunca houve contato, usar a criação da oportunidade.
*   **Prazo e fuso — aprovado em 10/10/2026:** usar **America/Sao_Paulo**. Somar três dias úteis à data/hora de referência, preservando o horário local; contar somente segunda a sexta, sem considerar feriados no MVP. Começar a contagem no dia seguinte à data de referência e sinalizar ao atingir o prazo. Exemplo: sexta às 14h → quarta às 14h.
*   Somente contato efetivamente confirmado, com canal informado, atualiza a referência da contagem pela data real da interação mais recente. Remover Esfriando apenas quando essa data não estiver além do prazo. Notas, edições, mudanças de etapa e conclusão sem contato não reiniciam.
*   Manter o alerta mesmo quando houver Follow-up agendado.
*   **Não criar tarefa automática por esfriamento no MVP.** As tarefas por etapa permanecem; esta regra substitui a automação anterior de follow-up após 2 dias sem contato.
*   Não aplicar a oportunidades encerradas nem ao acompanhamento de Pós-venda. Não alterar a temperatura manual.

### Contato com o lead
*   A negociação possui a ação rápida **Registrar um contato**.
*   O formulário exige **tipo de contato e data/hora em que ocorreu**, inicialmente preenchida com o momento atual e ajustável, além de observação opcional. O registro de uma conversa anterior usa este mesmo formulário, sem ação separada. Usar America/Sao_Paulo e impedir data/hora futura.
*   Registrar o evento nas atividades. **Último contato** é a data/hora mais recente entre as interações registradas; uma conversa anterior não substitui uma mais recente. Recalcular Esfriando a partir dessa data real, sem reiniciar o prazo pela data de inserção.
*   Concluir tarefa de Primeiro contato, Qualificação, Follow-up, Agendamento ou Proposta só atualiza **Último contato** após confirmar **Houve contato? Sim** e informar o canal, conforme Tarefas. Concluir sem contato não atualiza a interação.

### Temperatura do lead
Indica o nível de interesse ou potencial comercial da negociação.

**Opções:**
*   **Frio**
*   **Morno**
*   **Quente**

A temperatura é definida manualmente pelo usuário no MVP e pode ser alterada ao longo da negociação.

### Tipo de contato
Ao registrar **Registrar um contato**, o usuário deve informar o canal utilizado.

**Opções:**
*   **WhatsApp**
*   **Ligação**
*   **E-mail**
*   **Reunião online**
*   **Reunião presencial**
*   **Outro**

O registro pode incluir uma observação opcional.

Ao registrar o contato:
*   atualiza **Último contato** somente se a interação for a mais recente;
*   registra o tipo de contato na timeline;
*   recalcula **Esfriando** pela data real do último contato, removendo o alerta apenas quando não houver mais condição de esfriamento.

No MVP, o tipo de contato é informado manualmente e não depende de integração com canais externos.

### Origem
A **Origem** da negociação deve ser selecionada por dropdown a partir das origens cadastradas em **Configurações**.

O campo não utiliza texto livre.

Apenas origens ativas podem ser selecionadas.

### Produtos, quantidades e valor da negociação

A quantidade de cada produto é escolhida conforme a oportunidade, sem quantidade fixa, e deve ser **inteira e maior que zero**. Não permitir frações.

*   Cada produto utiliza seu **valor base cadastrado em Produtos**, sem edição do preço do item dentro da oportunidade. Alterar o valor base na edição do produto em **Cadastros → Produtos**, não em Configurações.
*   Total calculado = soma de **valor base × quantidade** dos produtos vinculados.
*   **Preço preservado no vínculo:** guardar o valor base vigente quando o produto for vinculado à oportunidade. Alterações posteriores na edição do produto em Produtos valem apenas para novos vínculos; não alteram itens já vinculados, totais calculados anteriores ou ajustes manuais. Recalcular pelos produtos utiliza os valores guardados nos vínculos existentes, não os preços atuais do catálogo.
*   Permitir ajustar manualmente o **valor total da oportunidade**, inclusive para desconto ou outra condição comercial, sem alterar os valores base dos produtos. Não há configuração separada de descontos.
*   Identificar se o total está em modo calculado ou manual. No modo manual, mostrar a diferença em relação à soma dos itens.
*   Disponibilizar **Recalcular pelos produtos**, **Salvar valor ajustado** e **Cancelar**.
*   Alterar itens não substitui um total manual sem confirmação.

Regra do cálculo consolidada em 07/10/2026. Referência: [Produtos e valor da oportunidade no Figma](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=179-1598).

### Validação de Ganho — aprovada em 08/10/2026
Para confirmar **Ganho**, exigir **Empresa, Contato, Responsável, ao menos um Produto com quantidade válida e Valor final maior que zero**. A quantidade deve ser inteira e maior que zero, sem frações. Bloquear a confirmação e indicar os campos ausentes ou inválidos; valor ausente não equivale a zero.

### Criar nova oportunidade para este cliente
*   Disponibilizar a ação **Criar nova oportunidade para este cliente** no acompanhamento de Pós-venda.
*   Abrir o cadastro de uma nova oportunidade com **Empresa e Contato já preenchidos**, referenciando os mesmos cadastros da negociação original. Não duplicar empresa ou contato.
*   **Destino obrigatório:** pedir ao usuário que escolha o **funil** e a **coluna/etapa** da nova oportunidade. A lista de colunas deve corresponder ao funil escolhido; ao trocar o funil, exigir nova seleção de coluna. Não salvar sem ambos.
*   Aplicar as validações, formulários e automações já definidos para a etapa escolhida; a escolha de destino não dispensa requisitos de qualificação, transferência ou fechamento. A criação não deve marcar uma nova venda como ganha apenas por se originar de um cliente do Pós-venda.
*   Preencher os dados da nova venda e confirmar a criação. Criar um **novo ID de oportunidade**, com produtos, valor, tarefas e histórico próprios; não copiar o resultado Ganha da negociação original. O resultado da nova oportunidade depende da etapa escolhida e de suas regras de confirmação, conforme a regra geral de criação.
*   Preservar a negociação original, seu valor fechado e seu acompanhamento. Criar a nova oportunidade não finaliza o acompanhamento nem substitui seu próximo contato.
*   Cancelar o cadastro não cria oportunidade. Impedir criação duplicada por repetição da confirmação.
*   Respeitar a regra de cadastros ativos para novos vínculos: se empresa ou contato estiver desativado, informar o impedimento, sem reativar automaticamente ou remover o vínculo da negociação original.

### Estrutura dos detalhes da oportunidade
Referência: tela e nota do Figma, confrontadas com as decisões aprovadas; as decisões de 10/10/2026 prevalecem sobre as propostas anteriores.

*   **Cabeçalho:** nome da oportunidade, temperatura, empresa, responsável e data/hora de criação. Ações de Ganho, Perdido, Registrar um contato e menu de demais ações, conforme situação e permissões.
*   **Funil e etapas:** exibir funil e etapa atual; permitir mudança livre entre etapas ativas do mesmo funil pelos detalhes, aplicando as mesmas validações e automações do arraste na Pipeline.
*   **Detalhes:** responsável, Último contato, previsão de fechamento e origem.
*   **Valor e produtos:** total da oportunidade e produtos vinculados, com preço unitário e quantidade. Permitir vincular/remover produtos enquanto a oportunidade estiver em edição, seguindo as regras de valor calculado/manual abaixo.
*   **Qualificação:** checklist de critérios configurados pelo Administrador; respostas associadas à oportunidade.
*   **Tarefas:** tarefas vinculadas à oportunidade, com nome, responsável, tipo e vencimento; ações seguem o módulo Tarefas. Contemplar Pendente, Concluída e Cancelada, preservando consulta das canceladas sem contá-las como realizadas.
*   **Anexos:** adicionar e consultar arquivos da oportunidade, com nome, formato, tamanho e data. Limite aprovado de **20 MB por arquivo**; proposta anexada é opcional, não envia documento ao cliente e não registra contato.
*   **Notas:** observações da oportunidade, distintas de contatos realizados.
*   **Histórico de atividades:** eventos da própria oportunidade com autoria e data/hora, preservados ao mudar de funil ou encerrar.

### Contextos de uso e ações aprovadas
*   **Venda ativa:** vendedores podem editar todas as oportunidades de Venda, inclusive de colegas, registrando o autor efetivo da alteração. A edição de tarefas depende de o vendedor ser seu criador ou responsável, conforme [Tarefas](Tarefas.md).
*   **Histórico:** visualização em consulta; restauração/reabertura segue o módulo Histórico. Administrador reabre sem justificativa, com escolha obrigatória de funil e etapa.
*   **Ganho:** modal com empresa, contato, produtos, valor final e vendedor responsável, acompanhado de confetes no front; exigir os campos de fechamento descritos abaixo. Ganho confirmado registra no Histórico e inicia Onboarding na mesma negociação.
*   **Perder:** motivo cadastrado obrigatório e confirmação. **Arquivar:** confirmação e observação opcional, sem motivo obrigatório. Qualquer saída do funil, inclusive desqualificar, cancela as tarefas pendentes anteriores, preservando registros e sem contabilizar execução ou contato.
*   **Pós-venda:** mesmo registro e resultado comercial Ganha, com etapa operacional de Onboarding, Cliente ativo, Entrega concluída ou Acompanhamento. Exibir valor fechado e preservar a venda original; Finalizar acompanhamento segue as regras de Pós-venda.
*   **Acompanhamento:** mostrar último e próximo contato, responsável e alertas de Contato atrasado/Sem próximo contato. Disponibilizar Criar nova oportunidade para este cliente, conforme regra abaixo.
*   **Etapas oficiais de Venda:** Diagnóstico, Proposta em andamento, Proposta enviada, Negociação, Ganho e Perdido. Os rótulos antigos Proposta apresentada/Oportunidade no Figma não prevalecem.

### Qualificação — aprovada
*   Carregar os itens cadastrados pelo Administrador em **Configurações** e salvar as respostas por oportunidade.
*   Manter **2 a 5 parâmetros ativos** cadastrados pelo Administrador e exigir **ao menos 2 respostas** para concluir a qualificação e avançar para Agendado/Venda. Esta regra substitui a decisão anterior sem mínimo. Não utilizar pesos ou pontuação.
*   Manter o formulário de transferência já aprovado com responsável, data, horário e nota opcional; validar ao menos 2 respostas antes de confirmar a transferência, inclusive ao pular a etapa Qualificação.

### Notas e anexos — aprovados
*   Manter **um único editor de notas e uma única lista**, eliminando os dois espaços duplicados da tela.
*   Todos os usuários podem adicionar, editar e excluir notas, independentemente da autoria. Preservar autoria original e registrar quem realizou cada alteração.
*   Todos os usuários podem adicionar, consultar, baixar e remover anexos, independentemente da autoria, mantendo registros das ações.
*   Aceitar apenas **PDF, PNG, JPG/JPEG e SVG**, com limite de **20 MB por arquivo**. Nota e anexo não contabilizam contato realizado.
*   Essas permissões substituem a restrição de autor/Administrador da nota antiga do Figma; o modo de consulta do Histórico continua seguindo as regras do módulo.

### Nova oportunidade em vez de duplicação
*   Não disponibilizar a ação **Duplicar oportunidade**. Esta decisão substitui a regra anterior de cópia dos campos.
*   Para outra venda, criar uma nova oportunidade pelo cadastro ou usar **Criar nova oportunidade para este cliente**, que aproveita somente os vínculos de empresa e contato.
*   Não copiar produtos, valores, tarefas, notas, anexos, respostas de qualificação ou atividades da oportunidade anterior. As tarefas previstas para a nova oportunidade são criadas pelas regras normais do seu fluxo, não por cópia.
*   A oportunidade original permanece preservada.

### Cadastro e produtos — aprovados em 10/10/2026
*   **Nome, responsável, funil e etapa obrigatórios.** Preencher responsável com o criador somente quando habilitado para o funil escolhido; caso contrário, exigir seleção de responsável ativo habilitado.
*   Demais campos opcionais, exceto exigências específicas da etapa, incluindo qualificação para entrada em Venda e dados de fechamento para Ganho/Pós-venda.
*   **Uma linha por produto na oportunidade.** Selecionar novamente aumenta a quantidade da linha existente, mantendo o preço guardado naquele vínculo. Não substituir pelo preço atual do catálogo.
*   Quantidades inteiras positivas, preço preservado no vínculo e ajuste somente no total. Produto sem valor base precisa ter o preço definido em Produtos antes de compor o cálculo.

### Divergências do Figma resolvidas pelas decisões aprovadas
*   Ganho exige empresa, contato, responsável, produto com quantidade válida e valor final maior que zero.
*   Reabertura pelo Administrador não exige justificativa e sempre solicita funil/etapa.
*   Qualquer saída do funil cancela pendências anteriores, incluindo Ganho/Perdido/Desqualificado/Arquivado e transferências; incluir status Cancelada na apresentação das tarefas.
*   Etapa Acompanhamento substitui Follow-up no Pós-venda; tarefa continua do tipo Follow-up.
*   A tarefa criada na transferência é do tipo Agendamento, não Reunião.
*   Esfriamento vale apenas para oportunidades abertas de Pré-venda/Venda, após 3 dias úteis sem contato confirmado, sem tarefa extra automática.

### Referências dos detalhes
[Figma — Detalhes da oportunidade](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=95-1668) · [Nota de comportamento](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=156-1176)

### Motivos de encerramento
**Perda:** selecionar motivo cadastrado pelo Administrador em Configurações e confirmar. **Desqualificação:** sem campo adicional de motivo; avaliar pelos parâmetros de qualificação. **Arquivamento:** confirmação e observação opcional, sem catálogo de motivos. O modal informa o envio ao Histórico e o cancelamento das tarefas comerciais pendentes.


### Qualificação em qualquer entrada em Venda — aprovada em 10/10/2026
*   Exigir ao menos **duas respostas preenchidas em parâmetros ativos** em qualquer entrada no funil de Venda, inclusive transferência, criação direta e restauração/reabertura.
*   Resposta negativa conta como resposta preenchida; não exigir respostas positivas nem atribuir pontuação. A avaliação comercial continua humana.
*   Preservar respostas de parâmetros desativados no histórico, mas não contá-las em uma nova validação. Manter de 2 a 5 parâmetros ativos no catálogo.
*   A desativação de parâmetros não retira oportunidades que já estão em Venda. Revalidar na próxima entrada nesse funil.

