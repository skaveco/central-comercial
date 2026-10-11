# Produtos

Área em **Cadastros → Produtos** para gerenciar os produtos e serviços comercializados pela Skave. Um item do catálogo pode estar vinculado a várias negociações.

### Catálogo

*   Exibir cards com **Categoria, Nome, Descrição, Valor base, toggle de Status e menu de edição**.
*   Controles: busca, abas **Todos / Ativos / Desativados**, filtro **Todas as categorias**, **Novo produto** e paginação.
*   Status: **Ativo ou Desativado**, substituindo Arquivado.
*   Valor base ausente aparece como **Não definido**, nunca como zero.

### Cadastro e edição — aprovado em 10/10/2026

*   **Novo produto** abre formulário. Clicar no card ou em **Editar** abre o mesmo formulário preenchido, sem tela de detalhes no MVP.
*   **Nome e Categoria obrigatórios**; **Descrição e Valor base opcionais**; status inicial **Ativo**.
*   Valor em reais, não negativo e com até duas casas decimais. Zero é diferente de valor não informado.
*   Nome repetido na mesma categoria gera aviso, permitindo confirmar.
*   A alteração do valor base é feita na **edição do produto em Cadastros → Produtos**. Configurações gerencia apenas as categorias, não os produtos ou preços.
*   **Salvar** atualiza o catálogo. **Cancelar** preserva os dados anteriores; sair com alterações não salvas exige confirmação de descarte.

### Categorias — obrigatoriedade aprovada em 10/10/2026

Todo produto deve ter categoria atribuída, cadastrada em [Configurações → Categorias de produtos](../../Configura%C3%A7%C3%B5es/Categorias%20de%20produtos.md). As regras operacionais abaixo foram aprovadas em 10/10/2026.

*   Seleção por dropdown das categorias cadastradas em **Configurações**, sem texto livre; Branding e Tecnologia são exemplos, não uma lista fixa.
*   Apenas categorias ativas podem ser selecionadas em novos cadastros ou trocas.
*   Preservar categoria inativa já vinculada a um produto.
*   Filtro com seleção única: **Todas as categorias** não restringe resultados. Incluir categorias inativas com produtos associados, identificando-as como inativas.
*   Inativar uma categoria não desativa seus produtos automaticamente.

### Busca e paginação — aprovado em 10/10/2026

*   Iniciar na aba **Todos**. Buscar por nome ou descrição parcial, sem diferenciar maiúsculas/minúsculas; ordenar por nome, de A a Z.
*   Combinar busca, status e categoria com **E**.
*   Manter busca/categoria ao trocar de aba e critérios ao trocar de página.
*   Paginação de **10/20/50**, com 10 itens por padrão. Alterar critérios ou tamanho retorna à primeira página.
*   Contador representa os produtos filtrados. A grade adapta o número de colunas à largura disponível.

### Uso nas oportunidades — aprovado em 10/10/2026

**Quantidade aprovada:** A quantidade de cada produto é escolhida conforme a oportunidade, sem quantidade fixa, e deve ser **inteira e maior que zero**. Não permitir frações.

*   Somente produtos ativos podem ser adicionados a novas oportunidades ou como novos itens de oportunidades existentes.
*   **Regra aprovada:** cada produto entra na oportunidade com seu valor base. Não permitir editar o preço do produto dentro da oportunidade; o valor base é alterado na **edição do produto em Cadastros → Produtos**.
*   O total da oportunidade soma valor base × quantidade dos itens, mas pode ser editado manualmente para desconto ou outras condições, sem alterar o valor base dos produtos.
*   Se o valor base estiver ausente, defini-lo na edição do produto em Produtos antes de usar o item no cálculo comercial; não informar preço do produto dentro da oportunidade.
*   Guardar nome, descrição e preço utilizados no item. Alterações futuras no catálogo não modificam itens e valores anteriores.
*   **Preço preservado no vínculo:** guardar o valor base vigente quando o produto for vinculado à oportunidade. Alterações posteriores na edição do produto em Produtos valem apenas para novos vínculos; não alteram itens já vinculados, totais calculados anteriores ou ajustes manuais. Recalcular pelos produtos utiliza os valores guardados nos vínculos existentes, não os preços atuais do catálogo.
*   **Regra aprovada:** uma linha por produto na oportunidade. Selecionar novamente aumenta a quantidade da linha existente, mantendo seu preço preservado.
*   O cálculo por preço unitário e quantidade, incluindo ajustes do total, é descrito em [Negociação](../Oportunidades.md).

### Ativação e desativação

*   Cada card possui um **toggle de Status**: ligado = Ativo; desligado = Desativado. O menu mantém **Editar**, substituindo as ações de ativação/desativação pelo toggle.
*   Desligar abre **Confirmar desativação?**; ligar abre **Confirmar reativação?**, com botões **Confirmar** e **Cancelar**.
*   O status só muda após confirmação e sucesso da operação. Cancelar ou fechar mantém o status e a posição anterior do toggle.
*   O toggle não abre o formulário de edição do card.
*   Desativar informa que o produto ficará indisponível para novas seleções, mas permanecerá nas oportunidades em que já foi utilizado.
*   Preservar vínculos e valores anteriores; não encerrar oportunidades. Reativar libera novas seleções sem alterar oportunidades existentes.
*   Registrar usuário e data/hora. Em falha, manter status e toggle anteriores; impedir envios duplicados durante processamento.
*   Não disponibilizar exclusão permanente no MVP.

### Permissões — aprovadas em 10/10/2026

*   Todos os perfis podem consultar o catálogo e selecionar produtos ativos nas oportunidades.
*   Cadastro, edição, ativação e desativação ficam reservados ao **Administrador**, conforme decisão aprovada em 10/10/2026.
*   Ocultar ações sem permissão e validar autorização ao executar.
*   A liberação de permissões definida para Empresas/Contatos não se estende ao catálogo.

### Estados e falhas — aprovado em 10/10/2026

*   Exibir carregamento, catálogo vazio com **Novo produto** para Administrador e estados de abas vazias.
*   Sem resultados, permitir limpar busca e categoria. Erro oferece **Tentar novamente**.
*   Falha ao salvar preserva o rascunho; falha ao reativar/desativar mantém o status anterior.
*   Bloquear envio duplicado durante processamento.
*   Textos longos não devem quebrar os cards; conteúdo completo disponível na edição.

### Referências

[Figma — Catálogo](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=93-12752) · [Notas de comportamento](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=149-1163) · [Categorias de produtos em Configurações](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=164-2709) · [Valor da oportunidade](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=179-1598) · [Recalcular pelos produtos](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=184-1896)

Revisado conforme o Figma em 07/10/2026. As propostas operacionais foram aprovadas em 10/10/2026, incorporando os ajustes descritos neste documento.

Definição atualizada em 07/10/2026: abas Todos / Ativos / Desativados; status Ativo ou Desativado; ações Desativar e Reativar por toggle em cada card, com confirmação nas duas ações. Essa definição substitui a proposta anterior de ações no menu.

