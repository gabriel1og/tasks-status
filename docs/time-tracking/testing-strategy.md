# Estratégia de testes do domínio de horas

Esta estratégia acompanha a implementação incremental do domínio de apontamento de horas e prioriza regras de negócio, isolamento entre contas e integridade histórica.

## Pirâmide

| Camada | Objetivo | Implementação atual |
| --- | --- | --- |
| Unitária | Validar regras sem rede ou banco | `tests/time-tracking-rules.test.cjs` |
| Repository | Validar payloads, CRUD, erros e filtro obrigatório por proprietário | `tests/time-tracking-repository.test.cjs` |
| Banco | Validar estrutura, constraints, triggers, FK composta e RLS | `supabase/tests/database/time_tracking_*.test.sql` |
| Interface | Validar formulário, acessibilidade e feedback | Pendente das fases de interface |
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
