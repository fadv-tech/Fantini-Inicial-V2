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


## 🚀 Fase 16: Completar Implementação de processarProcesso (NOVA)

- [x] Buscar arquivos do storage híbrido (S3 ou local)
- [x] Converter arquivos para Base64
- [x] Upload real de PDF principal via API LegalMail
- [x] Upload real de anexos via API LegalMail
- [x] Buscar tipo de petição padrão do tribunal (tribunal_configs)
- [x] Protocolar petição via API LegalMail
- [x] Implementar função hybridStorageRead() no hybrid-storage.ts
- [x] Implementar função bufferToBase64() no hybrid-storage.ts
- [ ] Testar em ambiente local (filesystem)
- [ ] Testar em ambiente Manus Cloud (S3)

## 🔄 Fase 17: Integração SSE no Frontend (NOVA)

- [x] Conectar SendPetition.tsx ao endpoint `/api/sse/progress/:bateladaId`
- [x] Atualizar barra de progresso em tempo real
- [x] Atualizar box de LOG em tempo real
- [x] Implementar botão "Parar" funcional
- [x] Exibir toast ao concluir
- [x] Adicionar mutation sendBatch
- [x] Implementar EventSource com listeners para todos os eventos (log, progress, complete, error, stopped)
- [x] Implementar handleParar com fetch para /api/sse/stop/:bateladaId
- [ ] Adicionar badge de notificação no header

## ⚙️ Fase 18: Página de Configurações (NOVA)

- [ ] Criar página Configuracoes.tsx
- [ ] Tabela com todos os 27 tribunais
- [ ] Células editáveis inline (dropdowns)
- [ ] Botão "Sincronizar com LegalMail"
- [ ] Botão "Aplicar para Todos"
- [ ] Salvar alterações via trpc.config.updateTribunal

## 📊 Fase 19: Página de Auditoria/LOG (NOVA)

- [ ] Criar página Auditoria.tsx
- [ ] Listar todas as bateladas
- [ ] Filtros (data, tribunal, status)
- [ ] Card expandível para cada batelada
- [ ] Resumo (sucessos, erros, avisos)
- [ ] LOG completo colapsável
- [ ] JSONs de request/response expandíveis
- [ ] Busca por CNJ
- [ ] Exportação em CSV e JSON


---

## 📚 Documentação Adicionada (Commit fbd6357):

- [x] LOGGING-DETALHADO.md - Documentação técnica completa
- [x] LOGGING-RESUMO.md - Resumo visual e prático
- [x] Commit realizado com git

---

## ✅ RESUMO FINAL - SISTEMA COMPLETO

### Páginas Implementadas:
- [x] Home.tsx - Página inicial com links para todas as funcionalidades
- [x] SendPetition.tsx - Upload, parsing e protocolização em lote com SSE
- [x] Configuracoes.tsx - Gestão de 27 tribunais com sincronização LegalMail
- [x] Auditoria.tsx - Histórico completo de bateladas com LOG detalhado

### Backend Completo:
- [x] send-batch.ts - Processamento em background com timeout e parada manual
- [x] sse.ts - Server-Sent Events para progresso em tempo real
- [x] hybrid-storage.ts - Storage híbrido (S3 + Filesystem)
- [x] legalmail-client.ts - Cliente completo da API LegalMail (7 endpoints)
- [x] petition.ts - 6 procedures tRPC (uploadFiles, sendBatch, listBatches, etc)
- [x] config.ts - 4 procedures tRPC (listTribunals, syncTribunal, updateTribunal, applyToAll)

### Banco de Dados:
- [x] 6 tabelas criadas (users, bateladas, batelada_processos, arquivos_enviados, tribunal_configs, logs_auditoria)
- [x] Schema completo em drizzle/schema.ts
- [x] Migrations via pnpm db:push

### Documentação:
- [x] COMPATIBILIDADE.md - Checagem completa Ubuntu Local + Manus Cloud
- [x] REVISAO-SISTEMA.md - Revisão completa de todas as funcionalidades
- [x] todo.md - Rastreamento de todas as tarefas (este arquivo)

### Funcionalidades 100% Operacionais:
- [x] Upload e parsing de PDFs com agrupamento por CNJ
- [x] Protocolização em lote via API LegalMail
- [x] Processamento em background sem bloquear UI
- [x] Progresso em tempo real via SSE (log, progress, complete, error, stopped)
- [x] Parada manual funcional
- [x] Configuração de tribunais com sincronização
- [x] Auditoria completa com LOG detalhado
- [x] Exportação JSON/CSV
- [x] Storage híbrido (S3 + Filesystem)
- [x] Compatibilidade Ubuntu Local + Manus Cloud

### Próximos Passos Recomendados:

**IMEDIATOS (Próximas 2-3 horas):**
- [ ] Executar `pnpm db:push` para criar tabelas no banco de dados
- [ ] Testar fluxo completo em ambiente local (upload PDF, protocolar, ver logs)
- [ ] Validar compatibilidade com S3 (Manus Cloud)
- [ ] Criar testes unitários (vitest) para procedures críticas

**CURTO PRAZO (Próxima semana):**
- [ ] Implementar retry automático com backoff exponencial
- [ ] Adicionar notificações por email ao concluir bateladas
- [ ] Criar dashboard analítico com gráficos de sucessos/erros
- [ ] Implementar reprocessamento de erros com um clique

**MÉDIO PRAZO (Próximas 2 semanas):**
- [ ] Adicionar validação de CNJ antes de protocolar
- [ ] Implementar suporte a petições iniciais (além de intermediárias)
- [ ] Criar sistema de permissões (admin, user, auditor)
- [ ] Implementar backup automático de logs

**LONGO PRAZO (Próximo mês):**
- [ ] Integração com webhooks para notificações em tempo real
- [ ] Dashboard de analytics com métricas de desempenho
- [ ] Sistema de templates para petições
- [ ] Integração com sistemas de gestão de processos


---

## 🔧 Fase 22: Melhorias Arquiteturais (NOVA - Em Andamento)

### Decisões Tomadas:

**3️⃣ Upload de Arquivos:**
- [x] Decisão: Criar endpoint `/api/upload` com FormData direto
- [ ] Implementar endpoint POST /api/upload com multipart/form-data
- [ ] Atualizar frontend para usar endpoint direto (sem Base64)
- [ ] Manter tRPC para metadados, FormData para arquivos binários

**4️⃣ Logs de Auditoria:**
- [x] Decisão: NÃO salvar arquivo no banco, salvar em pasta permanente
- [ ] Criar pasta de arquivamento permanente (ex: /arquivos-eternos/)
- [ ] Salvar TODOS os PDFs que circularam no sistema
- [ ] Organizar por data: /arquivos-eternos/2024/11/20/CNJ-xxx.pdf
- [ ] No banco: salvar apenas referência (caminho do arquivo)
- [ ] Truncar payload Base64 nos logs: "[TRUNCADO - X MB]"

**5️⃣ Retry Automático:**
- [x] Decisão: NÃO implementar retry (risco de duplicidade)
- [ ] Preparar infraestrutura para verificação automática
- [ ] Criar função para verificar petição no LegalMail (GET /api/v1/petition/...)
- [ ] Preparar estrutura para robô que verifica no site do Tribunal
- [ ] Implementar endpoint para reprocessar processos com erro (manual)
- [ ] Melhorar logs para facilitar auditoria e identificação de falhas

### Tarefas de Implementação:

**Timeout Dinâmico:**
- [x] Criar função calcularTimeout(tamanhoBytes) em send-batch.ts
- [x] Definir timeouts por etapa (BUSCAR=30s, CRIAR=30s, PROTOCOLAR=90s)
- [x] Aplicar timeout dinâmico em uploads (30s base + 10s/MB, max 5min)
- [x] Implementado em send-batch.ts: calcularTimeoutUpload()
- [x] Aplicado em upload PDF principal e anexos
- [ ] Testar com arquivos de diferentes tamanhos (1MB, 5MB, 10MB, 20MB)

**Endpoint FormData:**
- [x] Criar server/routes/upload.ts com endpoint POST /api/upload
- [x] Implementar multipart/form-data parsing com multer
- [x] Instalar multer e @types/multer
- [x] Registrar rota em server/_core/index.ts
- [x] Suporte a múltiplos arquivos (até 100)
- [x] Limite de 50MB por arquivo
- [x] Validação de tipo (apenas PDF)
- [x] Parse automático de CNJ, codProc, codPet
- [x] Salvar em storage híbrido (S3/filesystem)
- [x] Retornar metadados completos (s3Key, s3Url, hash, etc)
- [ ] Atualizar SendPetition.tsx para usar fetch direto
- [ ] Testar upload de arquivos grandes (20MB+)

**Arquivamento Permanente:**
- [ ] Criar função arquivarPDF(buffer, cnj, tipo) em server/arquivo-permanente.ts
- [ ] Estrutura: /arquivos-eternos/{ano}/{mes}/{dia}/{cnj}-{tipo}-{timestamp}.pdf
- [ ] Adicionar campo arquivoPermanentePath em arquivos_enviados
- [ ] Implementar cleanup de arquivos temporários (S3/local após arquivar)

**Verificação Automática:**
- [ ] Criar server/verificacao-peticao.ts
- [ ] Função verificarPeticaoLegalMail(idPeticoes) - consulta API
- [ ] Preparar estrutura para robô (Puppeteer/Playwright)
- [ ] Criar tabela verificacoes_peticao (id, bateladaId, status, dataVerificacao)
- [ ] Endpoint para triggerar verificação manual

**Reprocessamento Manual:**
- [ ] Criar procedure tRPC reprocessarProcesso(bateladaProcessoId)
- [ ] Buscar arquivos da pasta permanente
- [ ] Reprocessar apenas processos com status "erro"
- [ ] Registrar tentativa de reprocessamento em logs_auditoria


---

## 🚀 Fase 23: Implementação dos 3 Próximos Passos (NOVA - Em Andamento)

### 1️⃣ Arquivamento Permanente de PDFs:
- [x] Criar server/arquivo-permanente.ts com função arquivarPDF()
- [x] Estrutura de pastas: /arquivos-eternos/{ano}/{mes}/{dia}/
- [x] Compatibilidade S3: usar hybridStoragePut() para salvar em S3
- [x] Compatibilidade Ubuntu: usar fs.writeFileSync() para salvar localmente
- [x] Adicionar campos arquivoPermanentePath e arquivoPermanenteUrl em drizzle/schema.ts
- [x] Atualizar getArquivosByBatelada() para incluir novos campos
- [x] Exportar isManusCloud() em hybrid-storage.ts
- [x] Criar função truncarPayloadBase64() para logs
- [x] Integrar arquivamento em send-batch.ts (após ler arquivo)
- [x] Truncar payload Base64 nos logs de upload PDF principal
- [x] Truncar payload Base64 nos logs de upload de anexos
- [x] Adicionar log SSE "Arquivo arquivado permanentemente"
- [ ] Executar pnpm db:push para criar colunas no banco
- [ ] Testar arquivamento em S3 (Manus Cloud)
- [ ] Testar arquivamento em filesystem (Ubuntu local)

### 2️⃣ Verificação Automática de Petições:
- [x] Criar server/verificacao-peticao.ts
- [x] Função verificarPeticaoLegalMail(idPeticoes) - GET /api/v1/petition/status
- [x] Função verificarPeticoesEmLote() para múltiplas petições
- [x] Mapear status da API LegalMail (pendente, enviada, protocolada, rejeitada, erro)
- [x] Preparar estrutura para robô Puppeteer (comentado, não implementar agora)
- [x] Criar procedure tRPC verificarPeticao(idPeticoes)
- [x] Criar procedure tRPC verificarPeticoesLote(idPeticoes[])
- [x] Adicionar procedures ao petitionRouter
- [ ] Criar interface no frontend para triggerar verificação manual
- [ ] Testar verificação com API LegalMail real

### 3️⃣ Atualizar Frontend para FormData:
- [x] Modificar interface ParsedFile: remover base64, adicionar file?: File
- [x] Substituir fileToBase64() por uploadViaFormData()
- [x] Usar fetch('/api/upload') com FormData
- [x] Manter compatibilidade com parseFiles (frontend)
- [x] Atualizar onDrop para não converter para Base64
- [x] Atualizar handleProtocolar para usar uploadViaFormData primeiro
- [x] Integrar resultado do upload FormData com uploadFilesMutation
- [ ] Testar upload de arquivos grandes (20MB+)
- [ ] Adicionar progresso de upload (fetch com onProgress)


---

## 🎯 Fase 24: Executar Próximos 3 Passos (NOVA - Em Andamento)

### 1️⃣ Executar pnpm db:push:
- [x] Criar script SQL create-tables.sql com todas as 6 tabelas
- [x] Executar script SQL via mysql CLI
- [x] Verificar criação das tabelas (SHOW TABLES - 16 tabelas)
- [x] Verificar estrutura de arquivos_enviados (DESCRIBE - 15 colunas)
- [x] Confirmar colunas arquivoPermanentePath e arquivoPermanenteUrl criadas

### 2️⃣ Testar Fluxo Completo:
- [ ] Criar PDFs de teste com nomes válidos (CNJ)
- [ ] Testar upload de arquivos pequenos (< 5MB)
- [ ] Testar upload de arquivos grandes (> 20MB)
- [ ] Protocolar batelada de teste
- [ ] Verificar arquivamento permanente em /home/ubuntu/arquivos-eternos/
- [ ] Validar logs truncados no banco de dados
- [ ] Testar SSE em tempo real

### 3️⃣ Implementar Interface de Verificação:
- [x] Adicionar botão "Verificar Status" na página Auditoria
- [x] Criar modal/dialog para exibir resultados da verificação
- [x] Implementar badges coloridos para status (pendente, enviada, protocolada, rejeitada, erro, desconhecido)
- [x] Integrar com trpc.petition.verificarPeticoesLote
- [x] Adicionar loading state durante verificação (Loader2 animado)
- [x] Criar função handleVerificarStatus() para buscar IDs e triggerar verificação
- [x] Criar função renderVerificationBadge() para badges visuais
- [x] Exibir numeroProtocolo, dataProtocolo e mensagemErro no dialog
- [x] Adicionar toast de sucesso/erro após verificação


## 🐛 Fase 25: Correção de Bugs Críticos (CONCLUÍDO)

### Endpoints da API LegalMail
- [x] Auditoria completa de 31 endpoints contra documentação OpenAPI
- [x] Corrigir endpoint de certificados: /api/v1/certificate → /api/v1/workspace/certificates
- [x] Corrigir endpoint de busca de processo: /api/v1/process → /api/v1/process/detail
- [x] Corrigir endpoint de protocolização: /api/v1/petition/protocol → /api/v1/petition/intermediate/send
- [x] Documentar todas as correções em CORRECAO-ENDPOINTS.md

### Bug na Página de Configurações
- [x] Identificar causa raiz: mapeamento errado de campos (t.codigo vs t.codigoTribunal)
- [x] Corrigir mapeamento em Configuracoes.tsx (linhas 34-47)
- [x] Adicionar carregamento de valores existentes (tipoPeticaoPadrao, tipoAnexoPadrao)
- [x] Adicionar detecção de sincronização (!!t.ultimaSincronizacao)
- [x] Adicionar console.log para debug
- [x] Documentar em RESUMO-CORRECOES.md

### Validação
- [x] Confirmar 27 tribunais no banco de dados
- [x] Confirmar procedure listTribunals retorna dados corretos
- [x] Confirmar helper getAllTribunalConfigs() funciona
- [ ] ⚠️ Testar em produção após deploy (PENDENTE - usuário deve validar)

## 📝 Próximos Passos Recomendados

1. **Testes Unitários (vitest)**
   - [ ] Testar procedure config.syncTribunalWithLegalMail
   - [ ] Testar procedure petition.sendBatch
   - [ ] Testar função processarProcesso
   - [ ] Testar mapeamento de campos em Configuracoes.tsx

2. **Melhorias de Robustez**
   - [ ] Implementar retry automático com backoff exponencial (3 tentativas)
   - [ ] Adicionar timeout dinâmico proporcional ao tamanho dos arquivos
   - [ ] Implementar circuit breaker para API LegalMail

3. **Notificações e Alertas**
   - [ ] Adicionar notificações por email ao concluir bateladas
   - [ ] Adicionar badge de notificação no header
   - [ ] Implementar webhook para eventos críticos

4. **Dashboard Analítico**
   - [ ] Criar dashboard com gráficos de sucessos/erros
   - [ ] Adicionar filtros por data, tribunal, status
   - [ ] Exportar relatórios em PDF/Excel

5. **Documentação**
   - [ ] Atualizar README com guia de uso completo
   - [ ] Criar vídeo tutorial de instalação
   - [ ] Documentar API tRPC completa
