# TODO - Sistema Fantini-Inicial-Simples

## ✅ Fase 1: Estrutura de Banco de Dados e Configuração da API (CONCLUÍDO)

- [x] Criar schema do banco de dados com tabelas principais
- [x] Configurar variável de ambiente para API Key do LegalMail
- [x] Criar cliente HTTP completo para API LegalMail
- [x] Validar API Key (89 tribunais encontrados)

## 🧪 Fase 2: Scripts de Teste da API LegalMail

- [x] Script 1: Listar tribunais disponíveis (✅ 89 tribunais)
- [x] Script 2: Buscar processo por número CNJ normalizado (✅ idprocessos: 41541)
- [x] Script 3: Criar petição intermediária (✅ idPeticoes: 362701)
- [x] Script 5: Listar certificados disponíveis (✅ 2 certificados)
- [x] Script 6: Upload de arquivo PDF principal (✅ 512 KB enviado)
- [x] Script 8: Listar tipos de anexo (⚠️ Array vazio - TJGO não aceita anexos separados)
- [x] Script 10: Testar todos os tipos de anexo (0-3, null, vazio) (❌ Todos falharam)
- [ ] Script 9: Protocolar petição com certificado (⏸️ Pronto, aguardando confirmação)
- [x] Documentar todos os JSONs de request/response

### 💡 Descobertas Importantes:
- ⚠️ **TJGO/Projudi NÃO aceita anexos separados** via API LegalMail
- ✅ Todos os documentos devem ser **mesclados em um único PDF** antes do envio
- ✅ Endpoint correto de anexos: `/api/v1/petition/attachments` (sem idprocessos)
- ✅ Endpoint de tipos retorna `[]` vazio para TJGO

## 📄 Fase 3: Parser de Arquivos PDF

- [ ] Implementar função `normalizeCNJ()` para converter CNJ parcial em completo (25 caracteres)
- [ ] Implementar função `removeAccents()` para normalizar nomes de arquivos
- [ ] Implementar função `extractCNJ()` para extrair CNJ do nome do arquivo
- [ ] Implementar função `extractCodes()` para extrair codProc e codPet
- [ ] Implementar função `extractDescription()` para extrair descrição
- [ ] Implementar função `parsePdfFileName()` completa
- [ ] Implementar função `groupByProcess()` para agrupar por CNJ
- [ ] Criar testes unitários do parser

## 📥 Fase 4: Sistema de Importação em Lote

- [ ] Criar endpoint para upload múltiplo de PDFs
- [ ] Implementar validação de arquivos (apenas PDF, tamanho máximo)
- [ ] Processar nomes de arquivos e extrair metadados
- [ ] Agrupar arquivos por processo (CNJ normalizado)
- [ ] Identificar arquivo principal vs anexos (por codProc/codPet)
- [ ] Salvar arquivos no S3
- [ ] Salvar metadados no banco de dados
- [ ] Retornar preview dos arquivos processados

## 🚀 Fase 5: Protocolização em Batelada

- [ ] Criar tabela `bateladas` no banco de dados
- [ ] Implementar background job para processar batelada
- [ ] Para cada processo na batelada:
  - [ ] Buscar idprocessos no LegalMail via número CNJ
  - [ ] Criar petição intermediária na API
  - [ ] Upload do PDF principal
  - [ ] Upload dos anexos
  - [ ] Protocolar petição com certificado selecionado
  - [ ] Salvar todos os JSONs (request/response) no LOG
- [ ] Atualizar status da batelada (processando → concluído)
- [ ] Contar sucessos e falhas

## 📊 Fase 6: Sistema de LOG e Auditoria

- [ ] Criar tabela `logs_auditoria` no banco de dados
  - [ ] Campos: bateladaId, processoNumero, etapa, timestamp, requestJson, responseJson, status, erro
- [ ] Logar TUDO:
  - [ ] Nome do arquivo original
  - [ ] Metadados extraídos (CNJ, codProc, codPet, descrição)
  - [ ] JSON enviado para cada endpoint da API
  - [ ] JSON recebido de cada endpoint
  - [ ] Erros detalhados com stack trace
  - [ ] Tempo de execução de cada etapa
- [ ] Interface para visualizar LOG por batelada
- [ ] Filtros: status (sucesso/erro), processo, data
- [ ] Exportar LOG completo em JSON

## 🎨 Fase 7: Interface do Usuário

- [ ] Configurar tema baseado na logo Fantini (https://lh3.googleusercontent.com/a/ACg8ocLD_Igs6fY97vKtfRG9bB4tg4fCIqFwmZohGV5uxTZRoUHAFkk0=s288-c-no)
- [ ] Criar DashboardLayout com sidebar fixa
- [ ] Página: Upload de Petições
  - [ ] Área de drag-and-drop para múltiplos PDFs
  - [ ] Preview dos arquivos com metadados extraídos
  - [ ] Dropdown para selecionar certificado
  - [ ] Botão "Protocolizar Batelada"
- [ ] Página: LOG e Auditoria
  - [ ] Listagem de bateladas
  - [ ] Detalhes de cada batelada (X sucessos, Y falhas)
  - [ ] Visualização de LOG detalhado por processo
  - [ ] Exibir JSONs formatados (request/response)
- [ ] Página: Configurações de Tribunais
  - [ ] TJGO (inicial)
  - [ ] Preparado para adicionar outros tribunais

## 🧪 Fase 8: Testes e Validação

- [ ] Testar fluxo completo com PDFs reais fornecidos
  - [ ] 5645881.12.2022.8.09.0051_12693_56814_Manifestação.pdf
  - [ ] 5645881.12.2022.8.09.0051LourdesIaccino-Contrato.pdf
- [ ] Validar normalização CNJ
- [ ] Validar protocolização real no LegalMail
- [ ] Verificar LOG completo de auditoria
- [ ] Testar cenários de erro (arquivo inválido, API indisponível, etc.)

## 📝 Regras de Negócio

### Identificação de Tribunal
- Extrair do número CNJ: `8.09` = TJGO (Tribunal de Justiça de Goiás)
- Formato: `NNNNNNN.DD.AAAA.J.TT.OOOO`
  - J = Justiça (8 = Justiça Estadual)
  - TT = Tribunal (09 = Goiás)

### Padrão de Nomes de Arquivo
- **Petição principal:** `CNJ_codProc_codPet_Descrição.pdf`
  - Exemplo: `5645881.12.2022.8.09.0051_12693_56814_Manifestação.pdf`
  - codProc: 1-50000 (12693)
  - codPet: >50000 (56814)
- **Anexo:** `CNJNomeParte-TipoDocumento.pdf`
  - Exemplo: `5645881.12.2022.8.09.0051LourdesIaccino-Contrato.pdf`

### Agrupamento
- Todos os arquivos com mesmo CNJ normalizado pertencem ao mesmo processo
- Arquivo com codProc+codPet = petição principal
- Demais arquivos = anexos


## 🔧 Fase 9: Implementação do Sistema Completo

### Schema do Banco de Dados
- [x] Atualizar schema com tabela de configurações de tribunais
- [x] Criar tabela de bateladas
- [x] Criar tabela de LOG/auditoria detalhado
- [x] Adicionar campos necessários para rastreamento

### Storage Híbrido
- [x] Implementar localStoragePut() para filesystem
- [x] Implementar localStorageGet() para filesystem
- [x] Criar wrapper hybridStorage() que detecta ambiente
- [x] Testar em ambiente local
- [x] Testar em ambiente Manus Cloud

### Parser e Utilitários
- [ ] Implementar normalizeCNJ() em shared
- [ ] Implementar removeAccents() em shared
- [ ] Implementar extractCNJ() em shared
- [ ] Implementar selectMainFile() com lógica de keywords
- [ ] Implementar parsePdfFileName() completo
- [ ] Implementar groupByProcess()

### Procedures tRPC
- [ ] petition.listCertificates - Listar certificados do LegalMail
- [ ] petition.sendBatch - Enviar batelada de petições
- [ ] config.getTribunals - Listar configurações de tribunais
- [ ] config.updateTribunal - Atualizar configuração de tribunal
- [ ] config.syncWithLegalMail - Sincronizar tipos da API
- [ ] audit.listBatches - Listar bateladas
- [ ] audit.getBatchDetails - Detalhes de uma batelada
- [ ] audit.getProcessLogs - Logs de um processo específico

### Páginas
- [ ] SendPetition.tsx - Upload em lote com preview
- [ ] Configuracoes.tsx - Tabela de tribunais
- [ ] Auditoria.tsx - LOG completo com filtros


## 🔧 Fase 10: Parser e Seed de Tribunais

- [x] Implementar parser completo em shared/
- [x] Criar seed de 27 tribunais


## 🔧 Fase 11: Procedures tRPC e Backend

- [x] Criar procedures de certificados (listCertificates)
- [x] Criar procedures de configuração (syncTribunalWithLegalMail, updateTribunalConfig, applyToAllTribunals)
- [x] Criar procedures de upload (uploadFiles com Base64)
- [x] Criar procedures de batelada (listBatches, getBatchDetails)
- [x] Implementar SSE para progresso em tempo real (server/sse.ts)
- [x] Implementar sendBatch (protocolização em background)
- [x] Criar send-batch.ts com processBatch e processarProcesso
- [ ] Completar implementação de processarProcesso (buscar arquivos do storage, upload real, protocolar)


## 🎨 Fase 12: Interface SendPetition

- [x] Criar página SendPetition.tsx baseada no modelo fornecido
- [x] Implementar drag-and-drop de arquivos PDF
- [x] Integrar com trpc.petition.parseFiles para preview
- [x] Mostrar arquivos agrupados por processo (CNJ)
- [x] Identificar visualmente principal vs anexos
- [x] Dropdown de seleção de certificado
- [x] Box de LOG em tempo real (abaixo da lista)
- [x] Barra de progresso com processo atual
- [x] Botão "Protocolizar" + "Parar" lado a lado
- [x] Tratamento de duplicatas (warning mas permite)
- [x] Ícone vermelho para erros com tooltip
- [x] Modal de resumo ao concluir

## 🔄 Fase 13: SSE e Protocolização em Background

- [x] Implementar endpoint SSE em server/sse.ts
- [x] Criar sendBatch procedure com background processing
- [x] Emitir eventos SSE de progresso
- [x] Implementar lógica de parada via SSE (flag shouldStop)
- [x] LOG detalhado de cada etapa (buscar processo, criar petição, upload, protocolar)
- [x] Tratamento de erros (processo não encontrado, etc.)
- [x] Atualizar status da batelada no banco
- [ ] Integrar SSE no frontend (SendPetition.tsx)
- [ ] Completar implementação de upload de arquivos do storage
- [ ] Completar implementação de protocolização final

## ⚙️ Fase 14: Página de Configurações

- [ ] Criar página Configuracoes.tsx
- [ ] Tabela com todos os 27 tribunais
- [ ] Células editáveis inline (dropdowns)
- [ ] Botão "Sincronizar com LegalMail"
- [ ] Botão "Aplicar para Todos"
- [ ] Salvar alterações via trpc.config.updateTribunal

## 📊 Fase 15: Página de Auditoria/LOG

- [ ] Criar página Auditoria.tsx
- [ ] Listar todas as bateladas
- [ ] Filtros (data, tribunal, status)
- [ ] Card expandível para cada batelada
- [ ] Resumo (sucessos, erros, avisos)
- [ ] LOG completo colapsável
- [ ] JSONs de request/response expandíveis
- [ ] Busca por CNJ
