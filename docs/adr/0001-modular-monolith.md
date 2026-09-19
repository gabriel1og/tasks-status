# ADR-0001: Monólito modular para tarefas e apontamento de horas

**Status:** Aceito  
**Data:** 19/09/2026  
**Decisor:** proprietário do projeto

## Contexto

O TaskFlow começou como uma aplicação Next.js com Supabase para gerenciamento pessoal de tarefas. O produto passa a incluir um segundo domínio: apontamento de horas.

Os dois domínios compartilham autenticação, identidade do usuário, navegação, componentes visuais e infraestrutura. Entretanto, suas regras de negócio são independentes: apontamentos usam um texto manual de tarefa e não possuem vínculo com tarefas ou sprints existentes.

A arquitetura precisa manter essa independência sem introduzir a operação e a complexidade de aplicações ou serviços separados.

## Decisão

O projeto continuará como um único deploy Next.js e um único projeto Supabase, organizado internamente como um monólito modular.

Os módulos são:

- **Gerenciamento de tarefas:** tarefas atuais e futuras, sprints, ambientes, tags e queries.
- **Apontamento de horas:** configurações, categorias, apontamentos, visão semanal e relatórios.
- **Compartilhado:** autenticação, shell da aplicação, tema, componentes básicos e cliente Supabase.

Cada domínio terá suas próprias páginas, componentes, regras, repositories, testes e arquivos declarativos de schema. Integrações entre domínios só poderão ser adicionadas por uma decisão futura explícita.

## Restrições arquiteturais

- Não criar FK de apontamentos para `task_statuses` ou `sprints`.
- Não importar repositories do domínio de tarefas no domínio de horas.
- Persistir a tarefa do apontamento como texto manual.
- Aplicar `user_id` explicitamente nos repositories, mesmo com RLS ativo.
- Aplicar RLS com `auth.uid() = user_id` em todas as tabelas pessoais.
- Usar FKs compostas com `user_id` quando uma entidade pessoal referencia outra, impedindo referências entre contas.
- Criar migrations incrementais; o baseline remoto não deve ser reescrito.
- Manter schemas declarativos separados por domínio.
- Gerar novamente os tipos TypeScript depois de cada alteração de banco.

## Opções consideradas

### Opção A — Monólito sem limites de domínio

| Dimensão | Avaliação |
| --- | --- |
| Complexidade inicial | Baixa |
| Custo operacional | Baixo |
| Isolamento de regras | Baixo |
| Risco de acoplamento | Alto |

**Vantagens:** exige menos estrutura inicial.

**Desvantagens:** favorece imports cruzados, regras duplicadas e dependências acidentais entre tarefas e horas.

### Opção B — Monólito modular

| Dimensão | Avaliação |
| --- | --- |
| Complexidade inicial | Baixa a média |
| Custo operacional | Baixo |
| Isolamento de regras | Alto |
| Adequação ao MVP | Alta |

**Vantagens:** mantém um único deploy e banco, preserva as ferramentas atuais e estabelece limites claros entre os domínios.

**Desvantagens:** os limites dependem de disciplina estrutural e de revisão, pois não são impostos por processos separados.

### Opção C — Aplicações ou serviços separados

| Dimensão | Avaliação |
| --- | --- |
| Complexidade inicial | Alta |
| Custo operacional | Alto |
| Isolamento de regras | Muito alto |
| Adequação ao MVP | Baixa |

**Vantagens:** oferece isolamento técnico forte e ciclos de deploy independentes.

**Desvantagens:** duplica autenticação, configuração, observabilidade e manutenção sem uma necessidade atual de escala ou equipe.

## Análise dos trade-offs

O monólito sem limites seria mais rápido apenas no início, mas aumentaria o risco de o domínio de horas depender do modelo atual de tarefas. Serviços separados resolveriam esse acoplamento com um custo operacional desproporcional ao produto individual.

O monólito modular mantém a simplicidade operacional existente e oferece separação suficiente para o MVP. A ausência deliberada de vínculo entre tarefas e apontamentos reduz ainda mais a necessidade de separação física.

## Consequências

### Positivas

- Um único processo de desenvolvimento, build e deploy.
- Reutilização de autenticação, RLS, tema e componentes.
- Evolução independente das regras de cada domínio.
- Menor risco de alterações em tarefas quebrarem o histórico de horas.
- Possibilidade de extrair um módulo futuramente se escala ou organização exigirem.

### Negativas

- O banco e o bundle continuam compartilhados.
- Imports cruzados ainda são tecnicamente possíveis.
- Alterações em infraestrutura compartilhada exigem validação dos dois domínios.
- Separação modular precisa ser preservada por convenções, documentação e testes.

## Estrutura esperada

```text
app/
  time-tracking/
components/
  time-tracking/
lib/
  time-tracking/
types/
  time-tracking.ts
supabase/
  schemas/
    50_time_tracking.sql
  migrations/
tests/
supabase/tests/database/
```

Os nomes podem ser refinados durante a implementação, mas a propriedade de cada módulo deve permanecer explícita.

## Ações

- [x] Registrar as regras do MVP.
- [x] Criar a estrutura de navegação do hub.
- [ ] Criar o schema declarativo do domínio de horas.
- [ ] Criar migration incremental.
- [ ] Implementar regras e repository do domínio.
- [ ] Adicionar testes de RLS e referências entre contas.
- [ ] Revisar os limites modulares antes da entrega do MVP.

## Referências

- [Escopo do MVP de apontamento de horas](../time-tracking/mvp-scope.md)
- [Guia do projeto](../../AGENTS.md)
