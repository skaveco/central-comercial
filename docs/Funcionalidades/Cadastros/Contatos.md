# Contatos

Área em **Cadastros → Contatos** para gerenciar pessoas vinculadas a empresas e oportunidades. Um contato pode representar várias empresas e participar de várias negociações, sem duplicar seu cadastro.

### Listagem

*   Abas **Ativos** e **Desativados**, busca, **Filtros**, **Novo contato**, menu por linha e paginação.
*   Colunas: **Contato, Empresa(s), E-mail, Data de cadastro, Última atualização e Status**.
*   Mostrar uma empresa e **+N** para vínculos adicionais; sem empresa, exibir **—**.
*   Selecionar o contato abre seus detalhes.
*   A coluna **Status** possui um toggle: ligado = contato ativo; desligado = contato inativo. Acionar o toggle abre um modal de confirmação para desativar ou reativar. O status só muda após confirmar e salvar com sucesso. O toggle não abre os detalhes da linha. Após salvar, o contato aparece na aba correspondente.
*   Menu de ativos: **Visualizar e Editar**. De desativados: **Visualizar**. A mudança de status ocorre pelo toggle.

### Cadastro e edição

*   **Nome obrigatório**; **Telefone, E-mail e Origem do contato opcionais**, com validação quando preenchidos.
*   Permitir cadastro sem empresa e vinculação posterior.
*   Origem usa o catálogo compartilhado com oportunidades em Configurações: opções ativas para novas seleções, preservando valores inativos existentes.
*   **Salvar** registra a alteração; **Cancelar** mantém os dados anteriores e pede confirmação para descartar alterações.
*   Avisar quando e-mail ou telefone já estiver cadastrado e oferecer acesso ao contato existente. Permitir continuar mediante confirmação explícita, sem bloquear: pessoas diferentes podem compartilhar telefone ou e-mail empresarial. Comparar e-mail normalizado e telefone normalizado.
*   **Novo contato**, nos detalhes, inicia um cadastro independente.

### Detalhes do contato

Exibir nome, data de cadastro (“Contato desde”), **Editar contato**, **Ações rápidas** e **Novo contato**, além de:

*   Indicadores: total de oportunidades, perdidas, ganhas e valor ganho.
*   Informações principais: nome, telefone, e-mail e origem.
*   Empresas vinculadas.
*   Oportunidades vinculadas.
*   Notas do contato, com texto, autor e data/hora.
*   Histórico de atividades, com resumo, usuário, data/hora e filtro por tipo.

### Empresas e oportunidades vinculadas

*   Permitir várias empresas por contato e impedir vínculo duplicado com a mesma empresa. Selecionar uma empresa abre seus detalhes.
*   Cargo/função pertence ao vínculo com cada empresa. Não há indicação ou seleção de contato principal.
*   Desvincular exige confirmação e preserva as relações das oportunidades anteriores. Novas oportunidades não podem usar o vínculo removido.
*   Listar somente oportunidades vinculadas ao contato, em todos os status, da criação mais recente para a mais antiga; 10 linhas por padrão.
*   Colunas: **Oportunidade, Responsável, Empresa, Etapa/Status e Valor**.
*   **Criar oportunidade** preenche o contato; sugere a empresa ativa vinculada quando houver apenas uma e permite escolher entre várias ou deixar empresa vazia.
*   Na criação da oportunidade, nome, responsável, funil e etapa são obrigatórios. Preencher responsável com o usuário atual quando habilitado para o destino; caso contrário, exigir outro responsável habilitado. Aplicar os requisitos da etapa escolhida, inclusive qualificação para entrada em Venda e dados de fechamento para Ganho ou criação direta no Pós-venda, conforme [Oportunidades](../Oportunidades.md).
*   Desativar ou desvincular não remove relações das oportunidades anteriores.

### Ativação, desativação e permissões

*   Contatos possuem dois estados: **Ativo** e **Inativo**; as abas da interface são **Ativos** e **Desativados**.
*   Todos os perfis podem consultar, criar, editar, ativar e desativar contatos e gerenciar seus vínculos e notas, sem restrição por cargo ou autoria. As restrições do estado inativo se aplicam a todos.
*   Ao desligar o toggle de **Status**, abrir **Confirmar desativação?**; ao ligar, abrir **Confirmar reativação?**. Exibir **Confirmar** e **Cancelar**. Só persistir a mudança após confirmação e sucesso da operação; registrar usuário e data/hora nas atividades.
*   Cancelar ou fechar o modal mantém o status e a posição anterior do toggle, sem alterar o registro.
*   Na desativação, informar que os dados, vínculos e histórico serão preservados e que o contato ficará indisponível para edição, novos vínculos e novas oportunidades até reativar.
*   Na reativação, informar que a edição e os novos vínculos serão liberados, preservando os dados existentes. A ação reativa apenas o contato.
*   Desativar preserva os dados, vínculos com empresas e oportunidades, notas e histórico. Não encerra nem altera o status das oportunidades existentes.
*   Contato desativado permanece disponível para consulta, mas não permite edição, novos vínculos, novas oportunidades nem inclusão, edição ou exclusão de notas.
*   Reativar libera novamente edição e novos vínculos, com todos os dados e relações preservados. A ação altera apenas o contato; empresas desativadas continuam desativadas.
*   Ações rápidas do contato desativado ficam indisponíveis; a reativação é feita pelo toggle na aba **Desativados**.
*   Falha ao ativar/desativar mantém o status anterior e restaura a posição do toggle. Bloquear novas solicitações durante o processamento.
*   Sem exclusão automática no MVP.

### Comportamentos operacionais — aprovados em 10/10/2026

As regras abaixo foram aprovadas conforme descritas, incorporando as decisões consolidadas de cadastro, duplicidade e permissões.

**Busca, filtros e paginação**

*   Iniciar em Ativos; buscar por nome/e-mail parcial e telefone normalizado, sem diferenciar maiúsculas e minúsculas. Ordenar por nome, de A a Z.
*   Paginação de 10/20/50 contatos, com 10 por padrão. Manter critérios entre abas e páginas; alterar busca, filtros, aba ou tamanho retorna à primeira página.
*   Painel à direita com empresas, origem e período de cadastro, sem período inicial obrigatório. Múltiplas opções usam **OU** no mesmo campo e **E** entre campos e busca.
*   Datas inclusivas; impedir início posterior ao fim. **Aplicar** atualiza e fecha; **Limpar** remove seleções ao aplicar; fechar sem aplicar descarta alterações.
*   Exibir filtros ativos com remoção individual imediata. Interagir com **+N** mostra todas as empresas.

**Ações e vínculos**

*   Ações rápidas do contato ativo: **Criar oportunidade, Vincular empresa e Adicionar nota**. A ativação/desativação segue a definição aprovada de Status.
*   Vincular empresa abre seleção de empresas ativas com busca. Criar empresa segue seu próprio cadastro.

**Indicadores**

*   Considerar apenas oportunidades explicitamente vinculadas ao contato, em todo o histórico.
*   Total conta oportunidades únicas de todos os status; ganhas e perdidas consideram o status atual.
*   Taxas: ganhas ou perdidas ÷ (ganhas + perdidas); sem encerramentos desse tipo, exibir 0%.
*   Valor ganho soma oportunidades atualmente ganhas, sem duplicar vendas ou projetos. Restaurar uma oportunidade recalcula os indicadores pelo status atual da oportunidade; ativar/desativar o contato não altera seus resultados comerciais.

**Notas e atividades**

*   Notas pertencem ao contato, sem cópia automática para empresas ou oportunidades; mais recentes primeiro.
*   Adicionar nota abre editor com **Salvar/Cancelar** e exige texto não vazio.
*   Confirmar exclusão de notas e descarte de rascunho. As permissões seguem a definição atual em “Ativação, desativação e permissões”.
*   Edição preserva autoria/data originais, indica alteração e registra atividades; exclusão também gera atividade.
*   Histórico inclui criação, edição, ativação e desativação do contato, vínculos, alterações de cargo/função, notas e oportunidades explicitamente vinculadas; não importa eventos de outros contatos ou de toda a empresa.
*   Atividades mais recentes primeiro, com acesso ao registro; filtros **Todos, Contato, Empresas, Oportunidades, Notas e Interações**. Carregar 20 eventos por vez, com **Carregar mais**.

**Estados e falhas**

*   Exibir carregamento, estados vazios próprios e erro com **Tentar novamente**; sem resultados, permitir limpar busca/filtros.
*   Contato inexistente ou inacessível oferece retorno à lista. Campos ausentes exibem **—**.
*   Falha ao salvar preserva rascunho; falha ao ativar/desativar mantém o status anterior e a posição anterior do toggle. Impedir envios duplicados durante processamento.

### Referências

[Figma — Listagem](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=87-5188) · [Detalhes](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=91-10528) · [Regras da listagem](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=145-1163) · [Regras dos detalhes](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=147-1163)

Base: Figma consultado em 06/10/2026; as propostas operacionais foram aprovadas em 10/10/2026, com os ajustes descritos neste documento. Ajustes posteriores definidos para o MVP: sem seleção de contato principal e com permissões iguais para todos os perfis na gestão de empresas, contatos, vínculos e notas, sem restrição por autoria. Contatos seguem a mesma lógica de Empresas: ativação/desativação pelo toggle de Status, com abas Ativos/Desativados, substituindo o arquivamento. Ativar e desativar pelo toggle exige modal de confirmação. Esses ajustes prevalecem sobre as notas anteriores do Figma.

![](https://t9011515818.p.clickup-attachments.com/t9011515818/85896ab7-fdc8-4828-9386-4d8b1ff40ce6/image.png)


### Destino da nova oportunidade — aprovado em 10/10/2026
Todo botão de criação abre o cadastro com **Funil e Etapa obrigatórios**, junto aos demais campos, conforme [Oportunidades](../Oportunidades.md). Preservar o preenchimento dos vínculos descrito neste módulo e aplicar as regras da etapa escolhida.
