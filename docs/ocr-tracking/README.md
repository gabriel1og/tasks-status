# Acompanhamento de layouts OCR

A página `/ocr-tracking` organiza o andamento da configuração dos layouts para apresentação ao time. Ela usa a conta autenticada do TaskFlow e não consulta nem altera o Inbound. As informações operacionais são atualizadas manualmente.

## Começar e apresentar ao time

1. Aplique a migration OCR no ambiente pretendido e acesse **Gerenciamento de tarefas → Acompanhamento OCR**.
2. Clique em **Importar base inicial**. Confira documentos, observações, associações e pendências propostas antes de importar.
3. Use **Etapas** para apresentar o andamento. Clique no nome para abrir a ficha ou em uma etapa para editar seu checklist.
4. Use **Pendências** para explicar o problema, quem precisa agir e a próxima ação. Resolva cada item com a solução registrada.
5. Use **Campos** para selecionar um documento e conferir regex, configuração, resultados da lupinha e triagem.
6. Filtre o recorte da reunião e escolha **Exportar**. A exportação inclui o recorte completo, além da página visível da tabela.

Os indicadores representam os documentos dos filtros ativos. **Sem confirmação** significa ausência de informação sobre execução; **Pendente** significa ação identificada. Para retirar um filtro de situação, clique em **Total de documentos** ou use **Limpar filtros**.

Na visão Pendências, o filtro de responsável considera quem executará a pendência. Nas visões Etapas e Campos, considera o responsável pelo acompanhamento. Exportações de pendências respeitam os filtros de tipo e situação, além do responsável quando essa visão estiver selecionada; os indicadores de conclusão continuam considerando todos os fatos do documento.

## Como registrar uma atualização

- Dados curtos podem ser editados na linha, com salvar/cancelar. A ficha permite editar todos os metadados.
- Ao concluir uma atividade, informe evidência, responsável e data. Uma referência pode identificar o arquivo, ambiente/tenant e teste executado; não registre credenciais.
- Registre os valores esperado e obtido e a evidência antes de aprovar lupinha ou triagem. Captura conferida localmente não equivale a teste no Inbound.
- Alterar regex invalida os dois resultados anteriores e limpa os valores obtidos. Os valores anteriores continuam no histórico.
- Adicione uma pendência pela ficha do documento e relacione o campo quando pertinente. Para resolver, descreva a solução. Para dispensar, acrescente autorizador e data.
- Campos adicionais precisam de aplicabilidade explícita; quando não aplicáveis, explique nas observações. Obrigatórios usam dispensa formal, com motivo, autorizador e data.
- Arquive um acompanhamento pela identificação para ocultá-lo da lista ativa. O filtro **Exibição** permite consultar arquivados e reativá-los.

Um acompanhamento só fica concluído com as quatro etapas, os seis obrigatórios validados ou dispensados formalmente, os adicionais tratados e nenhuma pendência aberta. Dispensas aparecem separadamente das aprovações. **Sem validação informada** difere de **0/6 aprovados**.

Os seis obrigatórios são número do documento, emissão, CPF/CNPJ do destinatário, valor bruto, valor do serviço e descrição. Código de parceiro do emissor não substitui automaticamente o identificador do destinatário. Emissão incompleta e número ausente precisam de resolução ou dispensa; o acompanhamento não inventa valores.

## Carga inicial e proveniência

O snapshot `lib/ocr-tracking/initial-source.json` contém os 41 documentos não vazios do CSV de 21/10/2026. As 28 observações originais ficam preservadas com todas as colunas de origem. A associação às 39 fichas do Markdown é explícita no preparador, por documento; não é uma busca aproximada por fornecedor.

O CSV foi lido em Windows-1252, com `;` como separador e tratamento de aspas. A aplicação não depende dos caminhos locais de Downloads ou do checkout Inbound. O Markdown fornece candidatas e evidências documentais de preparação, sem aprovação de testes externos. Os status `?`, `??` e vazio não comprovam execução.

A carga sinaliza o ID compartilhado por LinkedIn e Club Coworking, divergências E3/E4/E5 versus E1, emissão incompleta da R10, número ausente da BTG, restrição de nome da W&S Saura e referências de parceiro fornecidas no CSV. Notas contendo instruções são propostas para avaliação, nunca comandos executados pela aplicação.

Reimportar usa a chave da origem e do documento e ignora registros já existentes, inclusive arquivados. Isso preserva edições manuais e histórico. Corrigir uma associação na origem exige revisar o preparador e os documentos atingidos; não troque a versão do snapshot para forçar uma atualização, pois uma nova chave representaria uma nova carga.

O preparador recebe os caminhos explicitamente:

```powershell
python scripts/prepare-ocr-source.py '<caminho-do-CSV>' '<caminho-do-Markdown>'
```

## Persistência e aplicação manual

O domínio possui tabelas próprias de documentos, checklist, campos, pendências e histórico. Não há FK para tarefas, sprints ou apontamentos. Leituras e mutações filtram por conta, e o RLS reforça o isolamento. FKs compostas impedem relações entre contas ou campos de outros documentos.

A importação usa uma única transação com direitos do usuário autenticado. Escritas geram histórico no banco; o cliente não pode criar, editar ou apagar eventos. A origem é imutável após a importação. A edição usa a versão temporal anterior para rejeitar gravações sobre dados desatualizados.

Arquivos de banco: schema declarativo `supabase/schemas/60_ocr_tracking.sql`, migration `supabase/migrations/20261021010000_create_ocr_tracking.sql` e inclusão em `supabase/config.toml`.

No **PowerShell**, na raiz deste projeto, com o Supabase local já disponível, os comandos abaixo são para execução manual. Confira as migrations pendentes antes de aplicá-las; não é necessário resetar o banco:

```powershell
node_modules\.bin\supabase.cmd migration list --local
node_modules\.bin\supabase.cmd migration up --local
npm.cmd run supabase:types
```

Os tipos OCR do arquivo gerado foram preparados a partir do schema por `python scripts/generate-ocr-types.py`, sem conexão ao banco. Após aplicar a migration, o comando oficial de tipos acima pode regenerar o arquivo completo a partir do banco real.

## Validação manual da entrega

Leia [testing.md](testing.md) para o roteiro completo. Os testes preparados usam o comando existente `npm.cmd test`; os testes SQL usam `npm.cmd run supabase:test:db`. TypeScript e build seguem os comandos do `AGENTS.md`.

Não foram executados testes, TypeScript, build, migrations ou servidor local durante a implementação. A revisão de arquivos e a preparação dos dados não comprovam funcionamento no navegador nem aplicação do schema.
