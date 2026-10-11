# Oportunidades

## Oportunidades — Configurações
Configura os cadastros utilizados nas oportunidades. Os detalhes operacionais da negociação permanecem em [Oportunidades](../Funcionalidades/Oportunidades.md).

### Qualificação — aprovada
*   Administrador cria, edita, ordena, ativa e desativa parâmetros.
*   Manter **mínimo de 2 e máximo de 5 parâmetros ativos**.
*   Exigir **ao menos 2 respostas** para concluir a qualificação e avançar para Agendado/Venda, inclusive quando a etapa Qualificação for pulada.
*   Sem pesos ou pontuação. Preservar respostas anteriores ao alterar o cadastro.

### Origens
*   Administrador cria, edita, reordena, desativa e reativa.
*   Seleção por dropdown nas oportunidades, sem texto livre. Apenas ativas em novas seleções; preservar vínculos existentes.

### Motivos de perda — aprovados
*   Cadastrados e gerenciados pelo Administrador.
*   Ao perder uma oportunidade, exigir seleção de motivo cadastrado e confirmação.
*   Desqualificação não tem catálogo nem campo adicional de motivo; avaliação pelos parâmetros de qualificação.
*   Arquivamento tem confirmação e observação opcional, sem catálogo ou motivo obrigatório. Informar envio ao Histórico e cancelamento das tarefas comerciais pendentes.

### Temperaturas — aprovadas em 10/10/2026
No MVP, manter as opções fixas **Frio, Morno e Quente**. A atribuição à oportunidade é manual. Não disponibilizar cadastro, edição, ativação ou desativação das opções de temperatura. Essa decisão substitui a proposta anterior de catálogo configurável.

### Fora desta área
Produtos e preços são editados em **Cadastros → Produtos**. Esfriamento e automações por etapa seguem as regras aprovadas dos módulos; não há editor dessas regras definido neste fluxo.

[Figma — Configurações de Oportunidades](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=165-3306)


### Qualificação em qualquer entrada em Venda — aprovada em 10/10/2026
*   Exigir ao menos **duas respostas preenchidas em parâmetros ativos** em qualquer entrada no funil de Venda, inclusive transferência, criação direta e restauração/reabertura.
*   Resposta negativa conta como resposta preenchida; não exigir respostas positivas nem atribuir pontuação. A avaliação comercial continua humana.
*   Preservar respostas de parâmetros desativados no histórico, mas não contá-las em uma nova validação. Manter de 2 a 5 parâmetros ativos no catálogo.
*   A desativação de parâmetros não retira oportunidades que já estão em Venda. Revalidar na próxima entrada nesse funil.

