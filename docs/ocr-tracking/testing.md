# Roteiro de validação OCR

Os cenários abaixo estão preparados para execução manual. Nenhuma validação automática ou execução no navegador foi realizada na implementação.

## Regras e repository

O comando `npm.cmd test` inclui os arquivos `tests/ocr-tracking-*.test.cjs` e a navegação atualizada.

- Preservar o estado desconhecido e distinguir ausência de validação de reprovação.
- Exigir os seis campos, as quatro etapas, os adicionais tratados e nenhuma pendência aberta.
- Bloqueio prevalecer sobre progresso parcial; dispensas não serem contadas como aprovações.
- Alteração de regex invalidar lupinha/triagem e apagar somente os valores obtidos atuais.
- Recusar dispensa incompleta, aprovação sem evidência e resolução sem descrição.
- Combinar filtros, busca sem acentos, ordenação e arquivamento.
- Ler mais de 1.000 registros por conta, mesmo com respostas limitadas a menos de 500 linhas.
- Incluir `user_id`, ID e versão anterior nas atualizações; rejeitar versão antiga.
- Exportar os 41 documentos independentemente da página atual, preservando aspas, acentos, quebras de linha e neutralizando fórmulas de planilha.

## Carga inicial

1. Abrir a prévia: conferir 41 documentos, 28 observações e 39 associações.
2. Conferir a origem com acentos e notas com `;`, além de regexs com alternância sem escape de tabela Markdown.
3. Importar; conferir os seis obrigatórios de todos os documentos e que testes externos continuam não informados.
4. Conferir duas linhas independentes para LinkedIn e Club Coworking, com o ID externo repetido e alertas.
5. Conferir pendências distintas de categoria, documento e emissão na BTG; emissão incompleta na R10; divergência de valores; linha digitável; código de parceiro e restrição de nome.
6. Editar um responsável e uma regex. Reimportar e confirmar que não surgem duplicatas e que as alterações manuais permanecem.
7. Arquivar um documento e reimportar: ele continua arquivado, sem cópia nova.

## Banco e segurança

Após aplicação manual das migrations, executar `npm.cmd run supabase:test:db` no banco local. O arquivo `supabase/tests/database/ocr_tracking.test.sql` usa transação e rollback e cobre:

- Estrutura das cinco tabelas e referências compostas.
- Leitura e atualização isoladas por conta, inclusive histórico.
- Rejeição de propriedade e parentesco entre contas.
- Proteção da origem e do histórico.
- Invalidação dos testes pelo banco após alteração de regex.
- Resolução, evidência e dispensa obrigatórias.
- Importação idempotente, preservação de edições, rejeição de outro usuário e rollback integral diante de documento inválido.

## Interface e falhas

Usar servidor somente quando solicitado explicitamente pelo usuário.

1. Alternar entre Etapas, Pendências e Campos sem perder filtros; selecionar um documento na visão Campos.
2. Paginar em 25/50/100; alterar um registro e conferir manutenção da página e da ordenação.
3. Na linha, cancelar sem gravar e salvar com check. Simular falha de rede: o rascunho permanece.
4. Editar checklist com evidência, autor e data; testar a justificativa do item condicional de reteste.
5. Editar campo, registrar resultados e evidência, depois mudar a regex; confirmar necessidade de reteste e preservação da versão anterior no histórico.
6. Criar, resolver, dispensar e reabrir pendências; testar vínculo com campo e manutenção da resolução anterior no histórico.
7. Tentar concluir com obrigatório ausente, teste não informado, adicional sem avaliação e pendência aberta; conferir a explicação do impedimento.
8. Em duas abas, editar o mesmo registro: a segunda gravação deve pedir conferência/recarregamento e manter o rascunho.
9. Simular sucesso de gravação e falha de atualização posterior: informar que foi salvo, sem induzir duplicação da ação.
10. Exportar após filtros: CSV e relatório devem incluir o recorte completo, além da página visível. Abrir CSV no Excel e conferir caracteres e campos multilinha.
11. Conferir light, dark e system; foco visível, Escape, retorno de foco e navegação por teclado no modal.
12. Conferir telas pequenas: filtros empilham, texto quebra e rolagem horizontal fica nas tabelas.
