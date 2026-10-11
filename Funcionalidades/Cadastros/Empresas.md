# Empresas

Área em **Cadastros → Empresas** para concentrar os dados e o histórico comercial de cada organização. Uma empresa pode ter vários contatos e oportunidades e ser reutilizada sem novo cadastro.

### Listagem, busca e filtros

*   Colunas: **Empresa, Segmento, CNPJ, Data de cadastro, Última atualização e Status**.
*   Iniciar na aba **Ativas**; disponibilizar **Desativadas**, busca, **Filtros** e **Nova empresa**. Clicar na linha abre os detalhes.
*   Buscar por nome parcial ou CNPJ normalizado, sem diferenciar maiúsculas e minúsculas. Ordenar por nome, de A a Z.
*   Paginação com opções **10/20/50**, sendo 10 por padrão, total de resultados e navegação anterior/próxima.
*   Painel de filtros à direita: **Segmento** com múltipla seleção e **Período de cadastro**, inicialmente sem restrição.
*   Combinar segmentos com **OU** e campos com **E**; impedir intervalo inválido.
*   **Aplicar** atualiza e fecha; **Limpar** remove seleções ao aplicar; fechar sem aplicar descarta mudanças.
*   Manter busca e filtros entre abas e páginas. Alterar critérios, aba ou tamanho da página retorna à primeira página.
*   A coluna **Status** possui um toggle: ligado = empresa ativa; desligado = empresa inativa. Acionar o toggle abre um modal de confirmação para desativar ou reativar. O status só muda após confirmar e salvar com sucesso. O toggle não deve abrir os detalhes da linha. Após salvar, a empresa aparece na aba correspondente.
*   Menu de empresas ativas: **Visualizar e Editar**. De desativadas: **Visualizar**. A mudança de status ocorre pelo toggle, substituindo as ações Arquivar/Restaurar.

### Cadastro e edição

*   **Nome obrigatório**, sem aceitar apenas espaços. Nomes podem se repetir.
*   **CNPJ, E-mail, Telefone, Endereço e Segmento opcionais**. Validar CNPJ, e-mail e telefone quando preenchidos e indicar erros no campo.
*   CNPJ deve ser único após normalização, inclusive entre empresas desativadas. Em duplicidade, informar o cadastro existente e permitir abri-lo ou reativá-lo pelo toggle de Status.
*   **Segmento** substitui a nomenclatura anterior “Setor”: seleção por dropdown de Configurações, sem texto livre e apenas com opções ativas. Preservar segmento inativo já vinculado, sem permitir novas seleções.
*   **Salvar** persiste e registra a alteração. **Cancelar** mantém os dados anteriores; sair com alterações não salvas exige confirmação de descarte.

### Detalhes e indicadores

Exibir nome, **Cliente desde** (data de cadastro), informações principais, contatos vinculados, oportunidades, notas, anexos e atividades.

*   **Editar empresa** abre edição; **Nova oportunidade** inicia cadastro com a empresa preenchida.
*   **Ações rápidas:** Criar oportunidade, Vincular contato, Adicionar nota e Adicionar anexo. A ativação/desativação é feita pelo toggle de Status na listagem.
*   Indicadores consideram todo o histórico, sem filtro de período, e o status atual das oportunidades.
*   **Total:** oportunidades únicas vinculadas, em todos os status.
*   **Ganhos/Perdidos:** contagens atuais. Taxas = ganhas ou perdidas ÷ (ganhas + perdidas); denominador zero exibe **0%**.
*   **Valor ganho — Total vendido:** soma dos valores das oportunidades atualmente ganhas. Não somar projetos/vendas novamente; restauração recalcula sem duplicar oportunidades.

### Contatos vinculados

*   **Vincular contato** abre busca por contatos ativos e permite criar um novo, vinculado após salvar. Impedir vínculos duplicados.
*   Um contato pode representar várias empresas, com vínculo independente em cada uma. Clicar abre os detalhes do contato.
*   Mostrar cargo/função quando informado. Os contatos vinculados não possuem indicação ou seleção de contato principal.
*   Desvincular exige confirmação e preserva relações das negociações anteriores; impede selecionar esse contato em novas oportunidades da empresa.
*   Desativar um contato preserva relações anteriores e impede novas seleções.

### Oportunidades

*   Listar todas as oportunidades da empresa, incluindo ganhas, perdidas, desqualificadas e arquivadas, pela criação mais recente.
*   Colunas: **Oportunidade, Responsável, Contato, Etapa/Status e Valor**. Paginação de 10 por padrão; clicar abre a negociação.
*   **Criar oportunidade** preenche a empresa e permite selecionar apenas contatos ativos vinculados a ela.
*   Preservar contatos antigos nas oportunidades existentes.
*   Empresa desativada não permite novas oportunidades, mesmo por contato ativo; as existentes continuam seguindo seu próprio fluxo.

### Notas

*   **Adicionar nota** abre editor com **Salvar/Cancelar**; texto não vazio.
*   Mostrar texto, autor e data/hora, da mais recente para a mais antiga.
*   Todos os perfis podem consultar, adicionar, editar e excluir notas, independentemente de quem as criou.
*   Confirmar exclusão e descarte de rascunho com conteúdo.
*   Edição preserva autor/data originais, indica alteração e registra usuário/data nas atividades. Exclusão registra o evento sem reproduzir o texto excluído.

### Anexos

*   Formatos: **PDF, PNG, JPG/JPEG, WEBP, DOCX, XLSX, CSV, PPTX e TXT**. Até **20 MB por arquivo**, múltiplos por envio e sem limite de quantidade no MVP.
*   Exibir nome, formato, tamanho, autor e data. Mostrar progresso e erro por arquivo; permitir nova tentativa sem registrar upload incompleto como concluído.
*   Todos os perfis podem enviar, visualizar, baixar e remover anexos, independentemente de quem os enviou. Remover exige confirmação e registro.
*   Visualizar PDFs e imagens quando suportado; demais formatos por download.
*   Nome repetido gera aviso, mas permite manter ambos.

### Histórico de atividades

*   Eventos automáticos, sem edição manual: criação/edição/desativação/reativação da empresa; vínculos com contatos; notas; anexos; criação, etapa/status e restauração de oportunidades; ligações, WhatsApp e e-mails registrados nessas oportunidades.
*   Não importar atividades de outras empresas do mesmo contato.
*   Exibir resumo, usuário, data/hora e acesso ao registro relacionado, do mais recente para o mais antigo.
*   Filtros: **Todos, Empresa, Contatos, Oportunidades, Notas, Anexos e Interações**. Carregar 20 eventos por vez, com **Carregar mais**.

### Ativação, desativação e permissões

*   Empresas possuem dois estados: **Ativa** e **Inativa**. Na interface, as abas são **Ativas** e **Desativadas**, conforme a tela atual. Não há arquivamento de empresas.
*   Todos os perfis podem consultar, criar, editar, ativar e desativar empresas e gerenciar vínculos, notas e anexos, sem restrição por cargo ou autoria. As restrições do estado inativo se aplicam a todos.
*   Ao desligar o toggle de **Status**, abrir **Confirmar desativação?**; ao ligar, abrir **Confirmar reativação?**. Exibir **Confirmar** e **Cancelar**. Só persistir a mudança após confirmação e sucesso da operação; registrar usuário e data/hora nas atividades.
*   Cancelar ou fechar o modal mantém o status e a posição anterior do toggle, sem alterar o registro.
*   Na desativação, informar que os dados, vínculos e histórico serão preservados e que a empresa ficará indisponível para edição, novos vínculos e novas oportunidades até reativar.
*   Na reativação, informar que a edição e os novos vínculos serão liberados, preservando os dados existentes. A ação reativa apenas a empresa.
*   Desativar preserva todos os dados, contatos, negociações, notas, anexos e histórico, mantendo os vínculos existentes.
*   Enquanto desativada, permitir consulta, visualização e download; bloquear edição, novos vínculos, novas oportunidades e inclusão/edição/exclusão de notas e anexos.
*   Desativar a empresa não encerra nem desativa as oportunidades existentes; elas continuam seguindo seu próprio fluxo.
*   Reativar libera novamente edição e novos vínculos, com todos os dados e relações preservados. A ação altera apenas a empresa; contatos desativados separadamente permanecem desativados.
*   Ações rápidas de uma empresa desativada ficam indisponíveis; a reativação é feita pelo toggle na aba **Desativadas**.
*   Sem exclusão automática no MVP.

### Estados e falhas

*   Exibir carregamento e distinguir lista sem empresas, aba sem empresas desativadas e busca sem resultados. Permitir limpar critérios quando não houver resultados.
*   Erro oferece **Tentar novamente**; empresa inexistente/inacessível oferece retorno à lista.
*   Cada seção dos detalhes tem estado vazio e ação de adicionar quando permitida.
*   Falha ao salvar preserva rascunho; falha ao ativar/desativar mantém o status anterior e restaura a posição do toggle. Bloquear envio duplicado durante processamento.

### Referências

[Figma — Listagem](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=87-6594) · [Detalhes](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=87-8617) · [Regras da listagem](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=128-1160) · [Regras dos detalhes](https://www.figma.com/design/vS2kVjky5Pi4vMEcENprkQ/Central-Comercial?node-id=137-1163)

Base: Figma consultado em 06/10/2026, com ajustes posteriores definidos para o MVP: sem seleção de contato principal e com permissões iguais para todos os perfis na gestão de empresas, contatos, vínculos, notas e anexos. A tela enviada em 06/10/2026 substitui o arquivamento de empresas por ativação/desativação via toggle de Status, com abas Ativas/Desativadas. Ativar e desativar pelo toggle exige modal de confirmação. Esses ajustes prevalecem sobre as notas anteriores do Figma.


### Destino da nova oportunidade — aprovado em 10/10/2026
Todo botão de criação abre o cadastro com **Funil e Etapa obrigatórios**, junto aos demais campos, conforme [Oportunidades](../Oportunidades.md). Preservar o preenchimento dos vínculos descrito neste módulo e aplicar as regras da etapa escolhida.
