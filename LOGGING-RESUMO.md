# 📊 Resumo Visual - Sistema de Logging

## ❓ Pergunta do Usuário

> "O sistema irá fazer log de tudo? Ex: Quando fizermos uma consulta na api qual foi o link completo consultado e a resposta? Quando fizermos um push qual o push e qual resultado? Quando fizermos cada coisinha o que fizemos e qual resultado?"

## ✅ Resposta: SIM, TUDO É REGISTRADO!

---

## 🔄 Fluxo de Logging - 3 Camadas

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣ LOGS EM TEMPO REAL (SSE - Frontend)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Frontend vê TUDO enquanto acontece                      │ │
│ │ - Cada arquivo sendo processado                         │ │
│ │ - Cada requisição à API LegalMail                       │ │
│ │ - Cada erro que ocorre                                  │ │
│ │ - Progresso em tempo real (barra + contadores)          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2️⃣ LOGS DE AUDITORIA (Banco de Dados - Permanente)          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tudo fica registrado para sempre                        │ │
│ │ - Tabela: logs_auditoria (6 colunas principais)         │ │
│ │ - Consultável depois via página /auditoria              │ │
│ │ - Exportável em JSON ou CSV                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3️⃣ LOGS DE CONSOLE (Servidor - Debug)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Logs no terminal durante desenvolvimento                │ │
│ │ - [BATCH] Criando batelada...                           │ │
│ │ - [API] GET https://app.legalmail.com.br/api/v1/...    │ │
│ │ - [API] Response: 200 OK (1200ms)                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 O Que É Registrado

### 1. Upload de Arquivo

```
ENTRADA:
  Arquivo: CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf
  Tamanho: 125 KB
  Base64: [conteúdo codificado]

PROCESSAMENTO:
  ✅ Decodificado de Base64
  ✅ Salvo em: uploads/2024-11-20/CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-abc123.pdf
  ✅ Registrado no banco: arquivos_enviados (ID 1)

SAÍDA:
  {
    "id": 1,
    "nomeOriginal": "CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf",
    "tamanho": 125000,
    "s3Key": "uploads/2024-11-20/CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-abc123.pdf",
    "s3Url": "https://s3.amazonaws.com/bucket/uploads/...",
    "uploadStatus": "sucesso",
    "createdAt": "2024-11-20T23:00:00Z"
  }
```

### 2. Consulta à API LegalMail

```
REQUISIÇÃO:
  GET https://app.legalmail.com.br/api/v1/process?cnj=0123456-78.2024.8.09.0051&api_key=***
  
  Registrado em logs_auditoria:
  - requestUrl: "https://app.legalmail.com.br/api/v1/process?cnj=0123456-78.2024.8.09.0051&api_key=***"
  - requestMethod: "GET"
  - requestPayload: null (GET não tem body)

RESPOSTA:
  Status: 200 OK
  Tempo: 1200ms
  
  Registrado em logs_auditoria:
  - responseStatus: 200
  - responsePayload: {
      "idprocessos": 12345,
      "numero_processo": "0123456-78.2024.8.09.0051",
      "tribunal": "TJGO",
      "poloativo_nome": "João Silva",
      "polopassivo_nome": "Maria Santos",
      ...
    }
  - tempoExecucaoMs: 1200

FRONTEND VÊ (SSE):
  🔍 Buscando processo 0123456-78.2024.8.09.0051 no LegalMail...
  [após 1200ms]
  ✅ Processo encontrado: ID 12345
```

### 3. Upload de Arquivo para API

```
REQUISIÇÃO:
  POST https://app.legalmail.com.br/api/v1/petition/file?idpeticoes=67890&idprocessos=12345
  Content-Type: multipart/form-data
  Body: [arquivo PDF em Base64]
  
  Registrado em logs_auditoria:
  - requestUrl: "https://app.legalmail.com.br/api/v1/petition/file?idpeticoes=67890&idprocessos=12345"
  - requestMethod: "POST"
  - requestPayload: {
      "arquivo_base64": "[truncado para brevidade]",
      "nome_arquivo": "PETICAO-INICIAL.pdf"
    }

RESPOSTA:
  Status: 200 OK
  Tempo: 2500ms
  
  Registrado em logs_auditoria:
  - responseStatus: 200
  - responsePayload: {
      "status": "sucesso",
      "arquivo_id": 99999,
      "tamanho_bytes": 125000
    }
  - tempoExecucaoMs: 2500

FRONTEND VÊ (SSE):
  📄 PDF principal enviado: 125 KB
```

### 4. Erro Durante Processamento

```
ERRO OCORRE:
  Timeout ao buscar processo 0123456-78.2024.8.09.0051
  
  Registrado em logs_auditoria:
  - etapa: "buscar_processo"
  - status: "erro"
  - mensagem: "Timeout ao buscar processo 0123456-78.2024.8.09.0051"
  - erro: "Timeout ao buscar processo 0123456-78.2024.8.09.0051"
  - requestUrl: "https://app.legalmail.com.br/api/v1/process?cnj=0123456-78.2024.8.09.0051&api_key=***"
  - responseStatus: null (não recebeu resposta)
  - tempoExecucaoMs: 60000 (timeout de 60s)

FRONTEND VÊ (SSE):
  ❌ ERRO: 0123456-78.2024.8.09.0051 - Timeout ao buscar processo
```

---

## 📊 Tabela de Logs - O Que Fica Registrado

| Operação | O Que É Registrado | Onde | Como Consultar |
|----------|-------------------|------|-----------------|
| **Upload de Arquivo** | Nome, tamanho, local de armazenamento, status | `arquivos_enviados` | Página Auditoria |
| **Consulta API GET** | URL completa, resposta JSON, tempo (ms) | `logs_auditoria` | Página Auditoria |
| **Upload para API** | URL, payload enviado, resposta, tempo (ms) | `logs_auditoria` | Página Auditoria |
| **Erro** | Mensagem detalhada, stack trace, etapa | `logs_auditoria` | Página Auditoria |
| **Progresso** | Processo atual, total, sucessos, erros | SSE (tempo real) | Frontend ao vivo |
| **Tempo de Execução** | Cada operação em ms | `logs_auditoria` | Página Auditoria |

---

## 🔍 Exemplo Prático - Protocolização Completa

### Cenário: Protocolar 1 processo com 2 anexos

```
INÍCIO
├─ 🚀 Iniciando protocolização
│  └─ LOG: "Iniciando processamento da batelada 1"
│
├─ 📊 Identificando processos
│  └─ LOG: "1 processo(s) identificado(s) em 1 tribunal(is)"
│
├─ 🏛️ Processando TJGO
│  └─ LOG: "Processando 1 processo(s) do TJGO..."
│
├─ 🔍 ETAPA 1: Buscar Processo
│  ├─ REQUISIÇÃO: GET /api/v1/process?cnj=0123456-78.2024.8.09.0051
│  ├─ RESPOSTA: 200 OK (1200ms)
│  ├─ REGISTRADO: logs_auditoria (etapa: buscar_processo, status: sucesso)
│  └─ FRONTEND: "✅ Processo encontrado: ID 12345"
│
├─ 📝 ETAPA 2: Criar Petição Intermediária
│  ├─ REQUISIÇÃO: POST /api/v1/petition/intermediate
│  │  Body: {idprocessos: 12345, idcertificados: 2562}
│  ├─ RESPOSTA: 201 Created (800ms)
│  │  {idpeticoes: 67890, idprocessos: 12345, status: "criada"}
│  ├─ REGISTRADO: logs_auditoria (etapa: criar_peticao, status: sucesso)
│  └─ FRONTEND: "📝 Petição intermediária criada: ID 67890"
│
├─ 📄 ETAPA 3: Upload PDF Principal
│  ├─ ARQUIVO: CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf (125 KB)
│  ├─ REQUISIÇÃO: POST /api/v1/petition/file?idpeticoes=67890&idprocessos=12345
│  │  Body: {arquivo_base64: "[...]", nome_arquivo: "PETICAO-INICIAL.pdf"}
│  ├─ RESPOSTA: 200 OK (2500ms)
│  │  {status: "sucesso", arquivo_id: 99999, tamanho_bytes: 125000}
│  ├─ REGISTRADO: logs_auditoria (etapa: upload_pdf_principal, status: sucesso)
│  └─ FRONTEND: "📄 PDF principal enviado: 125 KB"
│
├─ 📎 ETAPA 4: Upload Anexo 1
│  ├─ ARQUIVO: CNJ-0123456-78.2024.8.09.0051-ANEXO-1.pdf (85 KB)
│  ├─ REQUISIÇÃO: POST /api/v1/petition/attachments?idpeticoes=67890&idprocessos=12345&tipo_documento=ANEXO
│  │  Body: {arquivo_base64: "[...]", nome_arquivo: "ANEXO-1.pdf"}
│  ├─ RESPOSTA: 200 OK (1800ms)
│  ├─ REGISTRADO: logs_auditoria (etapa: upload_anexo, status: sucesso)
│  └─ FRONTEND: "📎 Anexo enviado: CNJ-0123456-78.2024.8.09.0051-ANEXO-1.pdf (85 KB)"
│
├─ 📎 ETAPA 5: Upload Anexo 2
│  ├─ ARQUIVO: CNJ-0123456-78.2024.8.09.0051-ANEXO-2.pdf (95 KB)
│  ├─ REQUISIÇÃO: POST /api/v1/petition/attachments?idpeticoes=67890&idprocessos=12345&tipo_documento=ANEXO
│  │  Body: {arquivo_base64: "[...]", nome_arquivo: "ANEXO-2.pdf"}
│  ├─ RESPOSTA: 200 OK (1900ms)
│  ├─ REGISTRADO: logs_auditoria (etapa: upload_anexo, status: sucesso)
│  └─ FRONTEND: "📎 Anexo enviado: CNJ-0123456-78.2024.8.09.0051-ANEXO-2.pdf (95 KB)"
│
├─ ✅ ETAPA 6: Protocolar Petição
│  ├─ REQUISIÇÃO: POST /api/v1/petition/intermediate/send?idpeticoes=67890&idprocessos=12345&idcertificados=2562
│  ├─ RESPOSTA: 200 OK (3200ms)
│  │  {protocolo: "2024000123456", data_protocolo: "2024-11-20T23:00:12Z", status: "protocolado"}
│  ├─ REGISTRADO: logs_auditoria (etapa: protocolar, status: sucesso)
│  └─ FRONTEND: "✅ Petição protocolada com sucesso! Protocolo: 2024000123456"
│
└─ 🎉 CONCLUSÃO
   ├─ REGISTRADO: bateladas (status: concluido, sucessos: 1, falhas: 0)
   ├─ REGISTRADO: logs_auditoria (etapa: concluir_processamento, tempoExecucaoMs: 11400)
   └─ FRONTEND: "🎉 Batelada concluída! ✅ 1 sucessos | ❌ 0 erros"

TOTAL REGISTRADO:
  ✅ 6 operações principais
  ✅ 6 requisições HTTP (com URL, payload, resposta, tempo)
  ✅ 6 registros em logs_auditoria
  ✅ 1 atualização em bateladas
  ✅ 1 atualização em batelada_processos
  ✅ 3 registros em arquivos_enviados (PDF + 2 anexos)
  ✅ Tempo total: 11400ms
```

---

## 🎯 Como Consultar os Logs

### 1. Frontend - Página Auditoria (`/auditoria`)

```
Batelada #1
├─ Status: Concluído
├─ Sucessos: 1 | Erros: 0 | Avisos: 0
├─ Data: 20/11/2024 23:00:00
└─ [Expandir para ver LOG detalhado]
   ├─ 23:00:05 🚀 Iniciando protocolização em batelada...
   ├─ 23:00:06 📊 1 processo(s) identificado(s) em 1 tribunal(is)
   ├─ 23:00:07 🏛️ Processando 1 processo(s) do TJGO...
   ├─ 23:00:08 🔍 Buscando processo 0123456-78.2024.8.09.0051 no LegalMail...
   ├─ 23:00:09 ✅ Processo encontrado: ID 12345 (1200ms)
   ├─ 23:00:10 📝 Petição intermediária criada: ID 67890 (800ms)
   ├─ 23:00:12 📄 PDF principal enviado: 125 KB (2500ms)
   ├─ 23:00:14 📎 Anexo enviado: ANEXO-1.pdf (85 KB) (1800ms)
   ├─ 23:00:16 📎 Anexo enviado: ANEXO-2.pdf (95 KB) (1900ms)
   ├─ 23:00:19 ✅ Petição protocolada com sucesso! Protocolo: 2024000123456 (3200ms)
   └─ 23:00:45 🎉 Batelada concluída! ✅ 1 sucessos | ❌ 0 erros
```

### 2. Banco de Dados - Query SQL

```sql
-- Ver todos os logs de uma batelada
SELECT 
  etapa, status, mensagem, tempoExecucaoMs, createdAt
FROM logs_auditoria 
WHERE bateladaId = 1 
ORDER BY createdAt ASC;

-- Ver requisições à API com URL completa
SELECT 
  etapa, requestMethod, requestUrl, responseStatus, tempoExecucaoMs
FROM logs_auditoria 
WHERE bateladaId = 1 AND requestUrl IS NOT NULL
ORDER BY createdAt ASC;

-- Ver apenas erros
SELECT 
  etapa, mensagem, erro, requestUrl, responseStatus
FROM logs_auditoria 
WHERE bateladaId = 1 AND status = 'erro';

-- Tempo total de processamento
SELECT 
  SUM(tempoExecucaoMs) as tempo_total_ms,
  COUNT(*) as total_operacoes,
  AVG(tempoExecucaoMs) as tempo_medio_ms
FROM logs_auditoria 
WHERE bateladaId = 1;
```

### 3. Exportar Logs

**JSON (Completo)**
```json
{
  "batelada": {
    "id": 1,
    "descricao": "Protocolização em lote",
    "sucessos": 1,
    "falhas": 0,
    "status": "concluido"
  },
  "logs": [
    {
      "etapa": "buscar_processo",
      "status": "sucesso",
      "mensagem": "Processo encontrado: ID 12345",
      "requestUrl": "https://app.legalmail.com.br/api/v1/process?cnj=0123456-78.2024.8.09.0051&api_key=***",
      "requestMethod": "GET",
      "responseStatus": 200,
      "responsePayload": {...},
      "tempoExecucaoMs": 1200,
      "createdAt": "2024-11-20T23:00:08Z"
    },
    // ... mais logs
  ]
}
```

**CSV (Resumido)**
```
ID,Descrição,Total Processos,Sucessos,Falhas,Status,Data
1,Protocolização em lote,1,1,0,concluido,2024-11-20 23:00:00
```

---

## ✅ Checklist - O Que É Registrado

- [x] **Cada arquivo** enviado (nome, tamanho, local)
- [x] **Cada requisição** à API (URL completa, método, payload)
- [x] **Cada resposta** da API (status, dados, tempo)
- [x] **Cada erro** que ocorre (mensagem, etapa, contexto)
- [x] **Tempo** de cada operação (em ms)
- [x] **Progresso** em tempo real (via SSE)
- [x] **Histórico permanente** (banco de dados)
- [x] **Exportação** em JSON/CSV
- [x] **Rastreabilidade completa** (quem, quando, o quê, resultado)

---

## 🎓 Conclusão

**SIM, o sistema registra TUDO!**

- 📝 Cada operação fica no banco de dados
- 🔗 URL completa de cada requisição à API
- 📊 Resposta de cada API (status, dados, tempo)
- ⏱️ Tempo de execução de cada operação
- 🔴 Cada erro com contexto completo
- 📺 Progresso em tempo real no frontend
- 📥 Exportável em JSON/CSV para auditoria

**Nada se perde. Tudo fica registrado para sempre!**
