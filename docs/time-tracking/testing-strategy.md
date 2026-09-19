# Estratégia de testes do domínio de horas

Esta estratégia acompanha a implementação incremental do domínio de apontamento de horas e prioriza regras de negócio, isolamento entre contas e integridade histórica.

## Pirâmide

| Camada | Objetivo | Implementação atual |
| --- | --- | --- |
| Unitária | Validar regras sem rede ou banco | `tests/time-tracking-rules.test.cjs` e `tests/daily-goal.test.cjs` |
| Repository | Validar payloads, CRUD, erros e filtro obrigatório por proprietário | `tests/time-tracking-repository.test.cjs` |
| Banco | Validar estrutura, constraints, triggers, FK composta e RLS | `supabase/tests/database/time_tracking_*.test.sql` |
| Interface | Validar formulário, acessibilidade e feedback | Telas da Fase 4 implementadas; automação de interação pendente |
| Smoke | Validar fluxo real com duas contas | Pendente da fase de entrega |

## Casos críticos da fundação

- aceitar somente meta diária inteira e positiva;
- normalizar nome, cor e tarefa antes da persistência;
- rejeitar data inexistente ou futura;
- criar categorias padrão repetidamente sem duplicação;
- filtrar todas as leituras e mutações por `user_id` no repository;
- impedir que uma conta leia ou altere dados de outra;
- impedir categoria de outra conta em um apontamento;
- impedir novos apontamentos em categoria arquivada;
- preservar apontamentos quando a categoria é arquivada;
- impedir exclusão física de categoria utilizada;
- propagar falhas do Supabase sem simular sucesso.
- impedir nomes de categoria duplicados, inclusive entre ativas e arquivadas;
- exigir confirmação antes da exclusão física de categoria;
- orientar o arquivamento quando uma categoria já possuir apontamentos;
- converter a meta editável de horas e minutos para minutos inteiros;
- inicializar a meta padrão em 6h quando a conta ainda não possuir configuração.

## Validação manual da Fase 4

1. abrir Categorias com uma conta sem registros e confirmar a criação idempotente das categorias padrão;
2. criar e editar uma categoria, validando nome, cor e feedback de sucesso;
3. tentar repetir um nome ativo e um nome arquivado;
4. arquivar e reativar uma categoria;
5. excluir uma categoria sem uso e tentar excluir outra que possua apontamentos;
6. abrir Configurações sem registro prévio e confirmar a meta inicial de 6h;
7. salvar metas com horas e minutos, incluindo valores inválidos e uma meta inferior a uma hora;
8. repetir o fluxo em light mode, dark mode e viewport mobile.

## Comandos de validação

```powershell
npm test
npm run supabase:db:reset
npm run supabase:test:db
npm run supabase:db:lint
npm run supabase:types
```

Os testes JavaScript usam um cliente Supabase falso e não acessam rede. Os testes pgTAP exigem o Supabase local iniciado.

## Critério da Fase 3

A fase pode ser aceita quando:

1. o reset local aplica o baseline e a migration incremental sem erro;
2. testes unitários e de repository passam;
3. testes pgTAP passam integralmente;
4. os tipos gerados incluem as três tabelas do domínio;
5. nenhuma operação autenticada atravessa o limite de outra conta.
