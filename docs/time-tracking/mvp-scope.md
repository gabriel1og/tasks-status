# Escopo do MVP de apontamento de horas

**Status:** Aprovado  
**Data:** 19/09/2026  
**Responsável pela decisão:** proprietário do projeto

Este documento é a fonte de verdade das regras de produto do primeiro lançamento do domínio de apontamento de horas. Mudanças que ampliem esse escopo devem ser registradas aqui antes da implementação.

## Objetivo

Adicionar ao TaskFlow uma área pessoal para registrar horas manualmente, acompanhar a meta diária e consultar o histórico, preservando o gerenciamento de tarefas existente como um domínio independente.

O MVP deve permitir que uma pessoa:

- mantenha categorias próprias;
- configure sua meta diária;
- marque feriados, férias e outras ausências da jornada;
- registre, edite, duplique e exclua apontamentos;
- acompanhe totais diários e semanais;
- consulte o histórico por período, tarefa e categoria.

## Modelo de uso

- O produto é individual: não existem organizações, equipes ou gestores no MVP.
- Cada conta acessa somente os próprios registros.
- O isolamento é aplicado por `user_id` tanto nas consultas da aplicação quanto no RLS do Supabase.
- Não existe fluxo de aprovação, rejeição ou fechamento de folha.
- Não existe cálculo de faturamento.

"Uso individual" descreve o modelo do produto. Ele não significa uma conta compartilhada: contas diferentes permanecem tecnicamente isoladas.

## Apontamento

Um apontamento possui somente os seguintes dados de negócio:

| Campo | Regra |
| --- | --- |
| Data | Obrigatória e não pode estar no futuro |
| Duração | Obrigatória, positiva e armazenada em minutos |
| Tarefa | Texto obrigatório preenchido manualmente |
| Categoria | Obrigatória e pertencente à mesma conta |

### Regras

- O lançamento é sempre manual.
- O campo de tarefa não possui autocomplete, chave estrangeira ou integração com as tarefas atuais.
- Não existem campos de sprint ou descrição.
- Alterar ou excluir uma tarefa do domínio de tarefas não modifica apontamentos.
- Um apontamento pode ser editado, duplicado ou excluído pelo proprietário.
- Totais e relatórios são calculados a partir dos apontamentos; não são armazenados nas tarefas.
- Datas civis usam o formato persistido `YYYY-MM-DD` e não devem ser convertidas por UTC de maneira que altere o dia escolhido.
- Sábados, domingos e dias configurados sem apontamento não aceitam novos lançamentos.

## Categorias

- As categorias são editáveis e exclusivas de cada conta.
- Categorias padrão são criadas de forma idempotente: executar a inicialização novamente não cria duplicatas.
- Uma categoria nunca utilizada pode ser excluída definitivamente.
- Uma categoria utilizada por pelo menos um apontamento não pode ser excluída; deve ser arquivada.
- Categorias arquivadas não aparecem na criação de novos apontamentos.
- Categorias arquivadas continuam visíveis no histórico e nos filtros que consultam períodos antigos.
- Uma categoria arquivada pode ser reativada.
- Renomear uma categoria altera o nome apresentado também nos apontamentos antigos. O MVP não mantém snapshot do nome da categoria.
- Excluir ou arquivar uma categoria nunca exclui apontamentos.

## Integridade e preservação histórica

- A FK entre apontamento e categoria usa exclusão restrita: uma categoria
  referenciada não pode ser removida, mesmo por acesso direto ao banco.
- A interface e o repository verificam o uso antes da exclusão; a FK permanece
  como garantia final para acessos concorrentes.
- O texto manual de tarefa armazenado no próprio apontamento é o valor
  histórico. Alterar ou excluir uma tarefa do outro domínio não o modifica.
- Tarefas e sprints não recebem arquivamento por causa do domínio de horas:
  como não são referenciadas, seu ciclo de vida não afeta relatórios antigos.
- `created_at` e `updated_at` são controlados pelo banco. Clientes não podem
  retroagir a data de criação de configurações, categorias ou apontamentos.
- O nome da categoria não possui snapshot: renomeá-la altera a identificação
  apresentada no histórico, conforme a regra já aprovada para o MVP.
- A exclusão explícita de um apontamento continua permitida e é definitiva; o
  MVP não adota lixeira, soft delete ou trilha de auditoria de alterações.

## Meta diária

- A meta inicial é de 6 horas, armazenada como `360` minutos.
- A meta pode ser alterada pelo usuário.
- Deve existir apenas uma configuração atual por conta.
- Indicadores usam a meta vigente no momento da consulta.
- O MVP não mantém histórico das alterações da meta.
- Alterar a meta não altera a duração de nenhum apontamento.

## Dias sem apontamento

- Sábados e domingos são ignorados automaticamente nos cálculos.
- O usuário pode marcar um dia útil ou intervalo como feriado, férias ou outra ausência.
- Intervalos armazenam somente os dias úteis; finais de semana dentro do período são ignorados.
- Cada data pode ter apenas uma configuração por conta.
- Uma data com apontamentos existentes não pode ser marcada como dia sem apontamento.
- Remover a marcação faz a data voltar a compor a meta e o indicador de pendências.
- Esses registros pertencem exclusivamente à conta autenticada e usam o mesmo isolamento por RLS.

## Relatórios do MVP

Os relatórios podem apresentar:

- total por dia;
- total por semana;
- total por texto de tarefa;
- total por categoria;
- comparação entre meta diária e horas realizadas;
- dias do período sem apontamento.

O período considera somente os dias úteis entre a data inicial e a data final.
Sábados, domingos, feriados, férias e outras ausências configuradas não compõem
a meta, o saldo, o progresso ou o indicador de dias sem lançamento. Horas
eventualmente preservadas em datas antigas excluídas também não entram nos
agrupamentos dos relatórios.

Não haverá total por sprint, cliente, equipe ou pessoa.

## Fora do escopo

- vínculo com `task_statuses` ou `sprints`;
- seleção automática de tarefas;
- descrição adicional no apontamento;
- aprovação ou rejeição;
- gestores, organizações e equipes;
- clientes e horas faturáveis;
- fechamento mensal;
- cronômetro;
- recorrência;
- copiar semana anterior;
- exportação CSV;
- histórico da meta diária;
- lixeira, soft delete e auditoria de alterações dos apontamentos;
- dashboards gerenciais.

Esses itens podem ser reavaliados depois do MVP, mas não devem orientar o schema ou a interface inicial.

## Limites entre os domínios

O domínio de tarefas e o domínio de apontamento compartilham apenas autenticação, layout e infraestrutura do Supabase.

O domínio de apontamento não deve:

- importar repositories de tarefas;
- criar chaves estrangeiras para tarefas ou sprints;
- depender da disponibilidade ou do arquivamento de uma tarefa;
- alterar registros do domínio de tarefas.

A decisão arquitetural está registrada em [ADR-0001 — Monólito modular](../adr/0001-modular-monolith.md).

## Critérios de aceite da Fase 0

- [x] Modelo individual confirmado.
- [x] Lançamento manual confirmado.
- [x] Ausência de aprovação e faturamento confirmada.
- [x] Campos do apontamento definidos.
- [x] Meta diária inicial e editável definida.
- [x] Regras de categorias e arquivamento definidas.
- [x] Limites entre tarefas e apontamentos definidos.
- [x] Arquitetura registrada em ADR.
- [x] Escopo e exclusões do MVP documentados.

## Controle de mudanças

Qualquer alteração nestas regras deve:

1. atualizar este documento;
2. avaliar se o ADR continua válido;
3. identificar impacto em schema, migration, RLS, tipos, repositories e testes;
4. ser aprovada antes do desenvolvimento.
