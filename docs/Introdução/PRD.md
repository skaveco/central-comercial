# PRD — Central Comercial Skave

## Objetivo e escopo

CRM desktop para organizar leads, oportunidades, tarefas, vendas e relacionamento comercial da Skave. O MVP inclui Dashboard, Pré-venda, Venda, Pós-venda, Oportunidades, Tarefas, Histórico, Cadastros e Configurações.

O [Overview Geral](Overview%20Geral.md) resume os módulos. As regras detalhadas estão em [Funcionalidades](Funcionalidades.md) e [Configurações](Configurações.md); este PRD resume as definições aprovadas.

## Acesso e permissões

*   Acesso restrito: usuários podem ser convidados, mas somente o Administrador aprova e atribui o cargo.
*   Perfis: **Administrador, Pré-venda e Comercial**. Pré-venda e Comercial operam os funis de Pré-venda e Venda; Comercial também opera o Pós-venda; Administrador possui acesso total.
*   Vendedores podem editar oportunidades de colegas em Venda. A gestão de tarefas exige ser criador ou responsável; Administrador gerencia todas. Tarefas automáticas têm Sistema como criador.
*   Todos os perfis gerenciam Empresas e Contatos. Apenas Administrador gerencia Produtos, Categorias, Metas e os catálogos configuráveis de Oportunidades e Segmentos.
*   Desativar usuário exige transferir suas responsabilidades para profissional ativo habilitado. Não desativar o último Administrador ativo.

## Regras centrais

*   **Oportunidade e negociação são o mesmo registro**, com um ID preservado entre funis, encerramentos e restaurações. Outra venda exige uma nova oportunidade.
*   Todo cadastro exige **nome, responsável, funil e etapa**. Permitir criação em qualquer etapa autorizada, executando suas validações e efeitos, sem simular etapas anteriores.
*   Etapas são fixas no MVP. Permitir movimentação livre entre etapas ativas do mesmo funil e ocultação individual, sem criação ou exclusão de etapas.
*   Qualquer entrada em Venda exige duas respostas em parâmetros ativos de qualificação. Administrador mantém de 2 a 5 parâmetros ativos; respostas negativas contam, sem pontuação.
*   Confirmar **Agendado** transfere para **Venda → Diagnóstico**, com vendedor, data e horário obrigatórios, nota opcional e tarefa de diagnóstico.
*   Confirmar **Ganho** exige Empresa, Contato, Responsável, produto com quantidade inteira positiva e valor final maior que zero. Registra Ganha no Histórico e inicia Onboarding, sem duplicar venda. Criação direta no Pós-venda registra Ganha e inicia na etapa escolhida.
*   **Perda** exige motivo cadastrado; **Desqualificação**, confirmação sem motivo adicional; **Arquivamento**, confirmação e observação opcional. Sem resposta executa arquivamento.
*   Qualquer saída do funil cancela as tarefas pendentes anteriores, preservando registros. Tarefas do destino são criadas normalmente; mover entre etapas ativas do mesmo funil não cancela pendências automaticamente.
*   Histórico reúne Ganhas, Perdidas, Desqualificadas e Arquivadas. Restauração/reabertura permite somente etapas ativas de Pré-venda ou Venda, com responsável habilitado e automações normais. Tarefas antigas permanecem canceladas.
*   Apenas Administrador reabre Ganhas, sem justificativa; retirar o ganho vigente dos indicadores e interromper o Pós-venda. Novo ganho inicia novo ciclo em Onboarding.
*   No Pós-venda, apenas **Acompanhamento** exige próximo contato e Follow-up. Finalizar preserva a venda e cancela pendências. Nova oportunidade para o cliente aproveita apenas os vínculos de Empresa e Contato.

## Tarefas, contatos e valores

*   Tarefas podem ser manuais ou automáticas, com ou sem oportunidade, nos estados Pendente, Concluída e Cancelada. Criador vem como responsável padrão, com seleção de outro usuário ativo habilitado.
*   Concluir tarefa comercial exige confirmar se houve contato; se houve, registrar canal e data/hora real. Último contato considera a interação mais recente, sem reinício artificial por registro retroativo.
*   Esfriamento aplica-se somente a oportunidades abertas de Pré-venda/Venda após **três dias úteis sem contato**, sem tarefa automática extra. Usar America/Sao_Paulo, segunda a sexta, sem feriados no MVP.
*   Produtos exigem categoria. Quantidades são inteiras positivas; preço fica preservado no vínculo. Total calculado soma preço × quantidade e admite ajuste manual. Uma linha por produto; nova seleção aumenta a quantidade.
*   Desativar cadastros preserva vínculos e histórico; novas seleções respeitam o estado ativo. Temperaturas são fixas: Frio, Morno e Quente.

## Indicadores

*   Meta, Valor vendido e Valor restante usam o mês vigente e ignoram filtros globais.
*   Pré-venda e Venda acompanham a passagem pelas etapas do grupo selecionado pelo período, sem inventar passagens ou duplicar retornos.
*   Dashboard inclui carteira ativa, leads por origem/responsável, vendas por categoria/produto, ticket e ciclo médios, previsões de fechamento, motivos de perda e alerta de esfriamento. Bases, filtros e tooltips seguem [Dashboard](../Funcionalidades/Dashboard.md).

## Requisitos técnicos e limites

*   Uso desktop; autenticação, autorização no servidor/banco, RLS e anexos privados. Preservar autoria e atividades, validar entradas e evitar operações parciais ou duplicadas.
*   Monólito modular em Next.js e Supabase, conforme [Stack e arquitetura](Stack%20e%20arquitetura.md). Empresas, Contatos e Usuários são entidades reutilizáveis.
*   Projetos, Financeiro, Jurídico e Gestão interna são possibilidades futuras, fora do MVP. Histórico comercial tem retenção indefinida, sem exclusão automática ou permanente.
