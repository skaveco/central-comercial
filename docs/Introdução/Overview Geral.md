# Overview Geral

A **Central Comercial Skave** é um CRM desktop para gerenciar demanda, oportunidades, vendas e relacionamento com clientes. Acesso aprovado pelo Administrador, com perfis Administrador, Pré-venda e Comercial. Pré-venda e Comercial compartilham o acesso aos funis de Pré-venda e Venda; Comercial também opera o Pós-venda e Administrador possui acesso total.

| Área | O que reúne |
| --- | --- |
| [Dashboard](../Funcionalidades/Dashboard.md) | Meta e resultado do mês, carteira ativa, evolução por etapas, leads por origem/responsável, vendas por categoria/produto, ticket e ciclo médios, previsão de fechamento, perdas e esfriamento. |
| [Pré-venda](../Funcionalidades/Pipeline%20%28funis%29/Pr%C3%A9-venda.md) | Entrada de leads, contato, qualificação e agendamento com transferência para Venda. |
| [Venda](../Funcionalidades/Pipeline%20%28funis%29/Venda.md) | Diagnóstico, preparação/envio de proposta, negociação, ganho ou perda; tarefas por etapa. |
| [Pós-venda](../Funcionalidades/Pipeline%20%28funis%29/P%C3%B3s-venda.md) | Onboarding, Cliente ativo, Entrega concluída e Acompanhamento; próximos contatos, finalização e criação de novas oportunidades para o cliente. |
| [Oportunidades](../Funcionalidades/Oportunidades.md) | Registro central com Empresa, Contato, Produtos, valor, origem, responsável, qualificação, previsão de fechamento, contatos realizados, temperatura, tarefas, notas, anexos e atividades. |
| [Tarefas](../Funcionalidades/Tarefas.md) | Atividades manuais e automáticas, com ou sem oportunidade; responsável, vencimento, conclusão, reagendamento, cancelamento e ações em lote. |
| [Histórico](../Funcionalidades/Hist%C3%B3rico.md) | Consulta de Ganhas, Perdidas, Desqualificadas e Arquivadas; restauração e reabertura conforme permissões. |
| [Empresas](../Funcionalidades/Cadastros/Empresas.md) | Dados, segmento, contatos vinculados, oportunidades, indicadores, notas, anexos e atividades; ativação/desativação. |
| [Contatos](../Funcionalidades/Cadastros/Contatos.md) | Pessoas com vínculos em várias empresas, cargo por vínculo, oportunidades, indicadores, notas e atividades; ativação/desativação. |
| [Produtos](../Funcionalidades/Cadastros/Produtos.md) | Catálogo de produtos e serviços, categoria, descrição, valor base e ativação/desativação; preços preservados nas oportunidades. |
| [Usuários e Permissões](../Configura%C3%A7%C3%B5es/Usu%C3%A1rios%20e%20Permiss%C3%B5es.md) | Convites, aprovação administrativa, cargos, acesso e desativação com transferência de responsabilidades. |
| [Metas](../Configura%C3%A7%C3%B5es/Controle%20de%20metas.md) | Meta mensal global em reais, mantida até alteração e com meses anteriores preservados. |
| [Categorias de produtos](../Configura%C3%A7%C3%B5es/Categorias%20de%20produtos.md) | Cadastro das categorias obrigatórias dos produtos, com edição e ativação/desativação. |
| [Configurações de Oportunidades](../Configura%C3%A7%C3%B5es/Oportunidades.md) | Parâmetros de qualificação, origens e motivos de perda. Temperaturas fixas: Frio, Morno e Quente. |
| [Segmentos](../Configura%C3%A7%C3%B5es/Segmentos.md) | Catálogo único dos segmentos usados nas empresas. |

Os funis compartilham a mesma oportunidade, sem duplicar vendas. É possível criar em qualquer etapa autorizada, respeitando suas regras. Etapas são fixas e podem ser ocultadas individualmente. Saídas cancelam pendências; restaurações executam novas automações. Esfriamento sinaliza três dias úteis sem contato, sem gerar tarefa extra.

Escopo e regras centrais: [PRD](PRD.md). Base técnica: [Stack e arquitetura](Stack%20e%20arquitetura.md).
