# Sistema de Logging Detalhado - Fantini Inicial Simples

## 📊 Visão Geral

O sistema implementa **logging multinível** que registra **TUDO** que acontece durante a protocolização:

1. **Logs em Tempo Real (SSE)** - Frontend vê progresso ao vivo
2. **Logs de Auditoria (Banco de Dados)** - Histórico permanente
3. **Logs de Console (Servidor)** - Debug durante desenvolvimento

---

## 🔄 Fluxo Completo de Logging

### 1. Upload de PDFs

#### Frontend (SendPetition.tsx)
```typescript
// Usuário seleciona arquivos
const handleFileSelect = (files: File[]) => {
  console.log("📁 Arquivos selecionados:", files.map(f => f.name));
  // Converte para Base64
  // Envia para backend via tRPC
};
```

#### Backend (petition.ts - uploadFiles)
```typescript
// Recebe Base64 dos arquivos
const uploadFiles = protectedProcedure
  .input(z.object({
    files: z.array(z.object({
      nomeOriginal: z.string(),
      conteudoBase64: z.string(),
    })),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log(`[UPLOAD] Recebido ${input.files.length} arquivo(s)`);
    
    for (const file of input.files) {
      // 1. Decodificar Base64
      const buffer = Buffer.from(file.conteudoBase64, 'base64');
      console.log(`[UPLOAD] ${file.nomeOriginal}: ${buffer.length} bytes`);
      
      // 2. Salvar no storage híbrido
      const { key, url } = await hybridStoragePut(
        file.nomeOriginal,
        buffer,
        'application/pdf'
      );
      console.log(`[STORAGE] Salvo em: ${key}`);
      
      // 3. Criar registro no banco
      await createArquivoEnviado({
        bateladaId,
        nomeOriginal: file.nomeOriginal,
        tamanho: buffer.length,
        s3Key: key,
        s3Url: url,
      });
      console.log(`[DB] Arquivo registrado: ${file.nomeOriginal}`);
    }
  });
```

#### Banco de Dados (arquivos_enviados)
```sql
-- Registro criado:
INSERT INTO arquivos_enviados (
  bateladaId, nomeOriginal, tamanho, s3Key, s3Url, 
  uploadStatus, createdAt
) VALUES (
  1, 
  'CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf',
  125000,
  'uploads/2024-11-20/CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-abc123.pdf',
  'https://s3.amazonaws.com/bucket/uploads/2024-11-20/CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-abc123.pdf',
  'sucesso',
  '2024-11-20 23:00:00'
);
```

---

### 2. Parsing de Nomes de Arquivo

#### Processo de Parsing (shared/pdfParser.ts)
```typescript
// Input: "CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf"
// Output:
{
  numeroCNJ: "0123456-78.2024.8.09.0051",
  codigoProcesso: "0123456",
  codigoPeticao: "PETICAO-INICIAL",
  descricao: "PETICAO-INICIAL",
  tribunal: "TJGO",
  isPrincipal: true,
  nomeArquivo: "CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf"
}
```

#### Log de Parsing
```
[PARSE] Processando: CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf
[PARSE] ✅ CNJ extraído: 0123456-78.2024.8.09.0051
[PARSE] ✅ Tribunal identificado: TJGO
[PARSE] ✅ Tipo: Petição Inicial (Principal)
```

---

### 3. Protocolização em Lote (Fluxo Completo)

#### 3.1 Início da Batelada

**Frontend (SendPetition.tsx)**
```typescript
const handleProtocolar = async () => {
  console.log("🚀 Iniciando protocolização...");
  console.log("📊 Dados da batelada:", {
    certificadoId: 2562,
    totalProcessos: 5,
    totalArquivos: 12,
  });
  
  const bateladaId = await trpc.petition.sendBatch.mutate({
    certificadoId: 2562,
  });
  console.log(`✅ Batelada criada: ID ${bateladaId}`);
};
```

**Backend (petition.ts - sendBatch)**
```typescript
const sendBatch = protectedProcedure
  .input(z.object({ certificadoId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    console.log(`[BATCH] Criando batelada para usuário ${ctx.user.id}`);
    
    // 1. Criar registro na tabela bateladas
    const batelada = await createBatelada({
      descricao: `Protocolização em lote - ${new Date().toLocaleString('pt-BR')}`,
      certificadoId: input.certificadoId,
      status: 'pendente',
    });
    console.log(`[BATCH] Batelada criada: ID ${batelada.id}`);
    
    // 2. Iniciar processamento em background (NÃO bloqueia)
    processBatch(batelada.id, input.certificadoId).catch(err => {
      console.error(`[BATCH] Erro no processamento: ${err.message}`);
    });
    
    return { bateladaId: batelada.id };
  });
```

**Banco de Dados (bateladas)**
```sql
INSERT INTO bateladas (
  descricao, totalProcessos, totalArquivos, status, 
  certificadoId, certificadoNome, createdAt
) VALUES (
  'Protocolização em lote - 20/11/2024 23:00:00',
  5,
  12,
  'pendente',
  2562,
  'Wesley',
  '2024-11-20 23:00:00'
);
-- Resultado: ID 1
```

#### 3.2 Processamento em Background (send-batch.ts)

**Log SSE em Tempo Real**
```
[SSE] Conectando ao /api/sse/progress/1
[SSE] Evento: log
  timestamp: 23:00:05
  message: 🚀 Iniciando protocolização em batelada...
  level: info

[SSE] Evento: log
  timestamp: 23:00:06
  message: 📊 5 processo(s) identificado(s) em 1 tribunal(is)
  level: info

[SSE] Evento: log
  timestamp: 23:00:07
  message: 🏛️ Processando 5 processo(s) do TJGO...
  level: info
```

**Banco de Dados (logs_auditoria)**
```sql
INSERT INTO logs_auditoria (
  bateladaId, etapa, status, mensagem, tempoExecucaoMs, createdAt
) VALUES (
  1,
  'iniciar_processamento',
  'sucesso',
  'Iniciando processamento da batelada 1',
  0,
  '2024-11-20 23:00:05'
);
```

#### 3.3 Processamento de Cada Processo (CNJ)

**Etapa 1: Buscar Processo no LegalMail**

```typescript
// Backend (send-batch.ts - processarProcesso)
const searchResult = await legalMailRequest({
  method: "GET",
  endpoint: "/api/v1/process",
  params: { cnj: "0123456-78.2024.8.09.0051" }
});

// Log SSE
sseManager.sendEvent(bateladaId, "log", {
  type: "log",
  timestamp: "23:00:08",
  message: "🔍 Buscando processo 0123456-78.2024.8.09.0051 no LegalMail...",
  level: "info",
});

// Log de Auditoria
await createLogAuditoria({
  bateladaId: 1,
  etapa: "buscar_processo",
  status: "sucesso",
  mensagem: "Processo encontrado: ID 12345",
  requestUrl: "https://app.legalmail.com.br/api/v1/process?cnj=0123456-78.2024.8.09.0051&api_key=***",
  requestMethod: "GET",
  responseStatus: 200,
  responsePayload: {
    idprocessos: 12345,
    numero_processo: "0123456-78.2024.8.09.0051",
    tribunal: "TJGO",
    // ... mais dados
  },
  tempoExecucaoMs: 1200,
});
```

**Banco de Dados (logs_auditoria)**
```sql
INSERT INTO logs_auditoria (
  bateladaId, numeroCNJ, etapa, status, mensagem,
  requestUrl, requestMethod, responseStatus, responsePayload,
  tempoExecucaoMs, createdAt
) VALUES (
  1,
  '0123456-78.2024.8.09.0051',
  'buscar_processo',
  'sucesso',
  'Processo encontrado: ID 12345',
  'https://app.legalmail.com.br/api/v1/process?cnj=0123456-78.2024.8.09.0051&api_key=***',
  'GET',
  200,
  '{"idprocessos": 12345, "numero_processo": "0123456-78.2024.8.09.0051", "tribunal": "TJGO"}',
  1200,
  '2024-11-20 23:00:08'
);
```

**Etapa 2: Criar Petição Intermediária**

```typescript
// Backend
const peticaoResult = await legalMailRequest({
  method: "POST",
  endpoint: "/api/v1/petition/intermediate",
  body: {
    idprocessos: 12345,
    idcertificados: 2562,
    descricao: "Petição Intermediária",
  }
});

// Log SSE
sseManager.sendEvent(bateladaId, "log", {
  timestamp: "23:00:09",
  message: "📝 Petição intermediária criada: ID 67890",
  level: "success",
});

// Log de Auditoria
await createLogAuditoria({
  bateladaId: 1,
  etapa: "criar_peticao",
  status: "sucesso",
  mensagem: "Petição intermediária criada: ID 67890",
  requestUrl: "https://app.legalmail.com.br/api/v1/petition/intermediate",
  requestMethod: "POST",
  requestPayload: {
    idprocessos: 12345,
    idcertificados: 2562,
    descricao: "Petição Intermediária",
  },
  responseStatus: 201,
  responsePayload: {
    idpeticoes: 67890,
    idprocessos: 12345,
    status: "criada",
  },
  tempoExecucaoMs: 800,
});
```

**Etapa 3: Upload do PDF Principal**

```typescript
// Backend
const arquivoPrincipal = await hybridStorageRead(
  "uploads/2024-11-20/CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-abc123.pdf"
);
const base64 = bufferToBase64(arquivoPrincipal);

const uploadResult = await legalMailRequest({
  method: "POST",
  endpoint: "/api/v1/petition/file",
  params: {
    idpeticoes: 67890,
    idprocessos: 12345,
  },
  body: {
    arquivo_base64: base64,
    nome_arquivo: "PETICAO-INICIAL.pdf",
  }
});

// Log SSE
sseManager.sendEvent(bateladaId, "log", {
  timestamp: "23:00:10",
  message: "📄 PDF principal enviado: 125 KB",
  level: "success",
});

// Log de Auditoria
await createLogAuditoria({
  bateladaId: 1,
  etapa: "upload_pdf_principal",
  status: "sucesso",
  mensagem: "PDF principal enviado: 125 KB",
  requestUrl: "https://app.legalmail.com.br/api/v1/petition/file?idpeticoes=67890&idprocessos=12345",
  requestMethod: "POST",
  requestPayload: {
    arquivo_base64: "[base64 truncado]",
    nome_arquivo: "PETICAO-INICIAL.pdf",
  },
  responseStatus: 200,
  responsePayload: {
    status: "sucesso",
    arquivo_id: 99999,
  },
  tempoExecucaoMs: 2500,
});
```

**Etapa 4: Upload de Anexos**

```typescript
// Backend - Para cada anexo
const anexos = [
  "CNJ-0123456-78.2024.8.09.0051-ANEXO-1.pdf",
  "CNJ-0123456-78.2024.8.09.0051-ANEXO-2.pdf",
];

for (const anexo of anexos) {
  const arquivoAnexo = await hybridStorageRead(`uploads/2024-11-20/${anexo}`);
  const base64Anexo = bufferToBase64(arquivoAnexo);
  
  const uploadAnexoResult = await legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/petition/attachments",
    params: {
      idpeticoes: 67890,
      idprocessos: 12345,
      tipo_documento: "ANEXO",
    },
    body: {
      arquivo_base64: base64Anexo,
      nome_arquivo: anexo,
    }
  });
  
  // Log SSE
  sseManager.sendEvent(bateladaId, "log", {
    timestamp: "23:00:11",
    message: `📎 Anexo enviado: ${anexo} (85 KB)`,
    level: "success",
  });
  
  // Log de Auditoria
  await createLogAuditoria({
    bateladaId: 1,
    etapa: "upload_anexo",
    status: "sucesso",
    mensagem: `Anexo enviado: ${anexo}`,
    requestUrl: "https://app.legalmail.com.br/api/v1/petition/attachments?idpeticoes=67890&idprocessos=12345&tipo_documento=ANEXO",
    requestMethod: "POST",
    responseStatus: 200,
    tempoExecucaoMs: 1800,
  });
}
```

**Etapa 5: Protocolar Petição**

```typescript
// Backend
const protocolResult = await legalMailRequest({
  method: "POST",
  endpoint: "/api/v1/petition/intermediate/send",
  params: {
    idpeticoes: 67890,
    idprocessos: 12345,
    idcertificados: 2562,
  }
});

// Log SSE
sseManager.sendEvent(bateladaId, "log", {
  timestamp: "23:00:12",
  message: "✅ Petição protocolada com sucesso! Protocolo: 2024000123456",
  level: "success",
});

// Log de Auditoria
await createLogAuditoria({
  bateladaId: 1,
  etapa: "protocolar",
  status: "sucesso",
  mensagem: "Petição protocolada: 2024000123456",
  requestUrl: "https://app.legalmail.com.br/api/v1/petition/intermediate/send?idpeticoes=67890&idprocessos=12345&idcertificados=2562",
  requestMethod: "POST",
  responseStatus: 200,
  responsePayload: {
    protocolo: "2024000123456",
    data_protocolo: "2024-11-20T23:00:12Z",
    status: "protocolado",
  },
  tempoExecucaoMs: 3200,
});

// Atualizar batelada_processos
await updateBateladaProcesso(bateladaProcessoId, {
  status: "sucesso",
  idprocessos: 12345,
  idpeticoes: 67890,
});
```

#### 3.4 Progresso em Tempo Real

**Frontend recebe eventos SSE**
```javascript
const eventSource = new EventSource(`/api/sse/progress/1`);

eventSource.addEventListener("progress", (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progresso: ${data.current}/${data.total}`);
  console.log(`Sucessos: ${data.successCount}, Erros: ${data.errorCount}`);
  // Atualiza barra de progresso, contadores, etc.
});

eventSource.addEventListener("log", (event) => {
  const data = JSON.parse(event.data);
  console.log(`[${data.timestamp}] ${data.message}`);
  // Adiciona mensagem ao box de LOG
});
```

#### 3.5 Conclusão

**Log SSE Final**
```
[SSE] Evento: complete
  timestamp: 23:00:45
  successCount: 5
  errorCount: 0
  warningCount: 0

[SSE] Evento: log
  timestamp: 23:00:45
  message: 🎉 Batelada concluída! ✅ 5 sucessos | ❌ 0 erros
  level: success
```

**Banco de Dados (bateladas - atualizado)**
```sql
UPDATE bateladas SET
  status = 'concluido',
  sucessos = 5,
  falhas = 0,
  concluidoEm = '2024-11-20 23:00:45'
WHERE id = 1;
```

**Banco de Dados (logs_auditoria - final)**
```sql
INSERT INTO logs_auditoria (
  bateladaId, etapa, status, mensagem, tempoExecucaoMs, createdAt
) VALUES (
  1,
  'concluir_processamento',
  'sucesso',
  'Batelada concluída: 5 sucessos, 0 erros',
  40000,
  '2024-11-20 23:00:45'
);
```

---

## 📋 Tabela de Logs de Auditoria

### Campos Registrados

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `bateladaId` | INT | ID da batelada | 1 |
| `bateladaProcessoId` | INT | ID do processo na batelada | 5 |
| `numeroCNJ` | VARCHAR | Número CNJ do processo | 0123456-78.2024.8.09.0051 |
| `etapa` | VARCHAR | Etapa do processamento | buscar_processo, criar_peticao, upload_pdf_principal, upload_anexo, protocolar |
| `status` | ENUM | Status da operação | sucesso, erro, warning |
| `mensagem` | TEXT | Mensagem descritiva | "Processo encontrado: ID 12345" |
| `erro` | TEXT | Mensagem de erro (se houver) | "Timeout ao buscar processo" |
| `requestUrl` | VARCHAR | URL completa da requisição | https://app.legalmail.com.br/api/v1/process?cnj=...&api_key=*** |
| `requestMethod` | VARCHAR | Método HTTP | GET, POST, PUT, DELETE |
| `requestPayload` | JSON | Corpo da requisição | {"idprocessos": 12345, ...} |
| `responseStatus` | INT | Status HTTP da resposta | 200, 201, 400, 500 |
| `responsePayload` | JSON | Corpo da resposta | {"idpeticoes": 67890, ...} |
| `tempoExecucaoMs` | INT | Tempo de execução em ms | 1200 |
| `createdAt` | TIMESTAMP | Data/hora do log | 2024-11-20 23:00:08 |

---

## 🔍 Consultando Logs

### Via Auditoria (Frontend)

Acessar `/auditoria` para ver:
- Lista de bateladas
- Resumo (sucessos, erros, avisos)
- LOG detalhado expandível
- Exportar em JSON ou CSV

### Via Banco de Dados (Backend)

```sql
-- Todos os logs de uma batelada
SELECT * FROM logs_auditoria 
WHERE bateladaId = 1 
ORDER BY createdAt ASC;

-- Logs de erro
SELECT * FROM logs_auditoria 
WHERE bateladaId = 1 AND status = 'erro';

-- Tempo total de processamento
SELECT 
  SUM(tempoExecucaoMs) as tempo_total_ms,
  COUNT(*) as total_operacoes,
  AVG(tempoExecucaoMs) as tempo_medio_ms
FROM logs_auditoria 
WHERE bateladaId = 1;

-- Requisições à API LegalMail
SELECT 
  etapa, requestMethod, requestUrl, responseStatus, tempoExecucaoMs
FROM logs_auditoria 
WHERE bateladaId = 1 AND requestUrl IS NOT NULL
ORDER BY createdAt ASC;

-- Erros por etapa
SELECT 
  etapa, COUNT(*) as total_erros, 
  GROUP_CONCAT(DISTINCT erro) as mensagens_erro
FROM logs_auditoria 
WHERE bateladaId = 1 AND status = 'erro'
GROUP BY etapa;
```

### Via Console (Desenvolvimento)

```bash
# Terminal do servidor
[BATCH] Criando batelada para usuário 1
[BATCH] Batelada criada: ID 1
[PARSE] Processando: CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf
[PARSE] ✅ CNJ extraído: 0123456-78.2024.8.09.0051
[STORAGE] Salvo em: uploads/2024-11-20/CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-abc123.pdf
[DB] Arquivo registrado: CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL.pdf
[PROCESS] Buscando processo 0123456-78.2024.8.09.0051...
[API] GET https://app.legalmail.com.br/api/v1/process?cnj=0123456-78.2024.8.09.0051&api_key=***
[API] Response: 200 OK (1200ms)
[PROCESS] Criando petição intermediária...
[API] POST https://app.legalmail.com.br/api/v1/petition/intermediate
[API] Response: 201 Created (800ms)
[PROCESS] Enviando PDF principal...
[API] POST https://app.legalmail.com.br/api/v1/petition/file?idpeticoes=67890&idprocessos=12345
[API] Response: 200 OK (2500ms)
[PROCESS] Enviando anexos...
[API] POST https://app.legalmail.com.br/api/v1/petition/attachments?idpeticoes=67890&idprocessos=12345&tipo_documento=ANEXO
[API] Response: 200 OK (1800ms)
[PROCESS] Protocolando...
[API] POST https://app.legalmail.com.br/api/v1/petition/intermediate/send?idpeticoes=67890&idprocessos=12345&idcertificados=2562
[API] Response: 200 OK (3200ms)
[BATCH] Batelada concluída: 5 sucessos, 0 erros (40000ms total)
```

---

## 📊 Exemplo de Resposta Completa

### Auditoria de Uma Batelada

```json
{
  "batelada": {
    "id": 1,
    "descricao": "Protocolização em lote - 20/11/2024 23:00:00",
    "totalProcessos": 5,
    "totalArquivos": 12,
    "sucessos": 5,
    "falhas": 0,
    "status": "concluido",
    "certificadoId": 2562,
    "certificadoNome": "Wesley",
    "iniciadoEm": "2024-11-20T23:00:05Z",
    "concluidoEm": "2024-11-20T23:00:45Z",
    "createdAt": "2024-11-20T23:00:00Z"
  },
  "logs": [
    {
      "id": 1,
      "bateladaId": 1,
      "etapa": "iniciar_processamento",
      "status": "sucesso",
      "mensagem": "Iniciando processamento da batelada 1",
      "tempoExecucaoMs": 0,
      "createdAt": "2024-11-20T23:00:05Z"
    },
    {
      "id": 2,
      "bateladaId": 1,
      "numeroCNJ": "0123456-78.2024.8.09.0051",
      "etapa": "buscar_processo",
      "status": "sucesso",
      "mensagem": "Processo encontrado: ID 12345",
      "requestUrl": "https://app.legalmail.com.br/api/v1/process?cnj=0123456-78.2024.8.09.0051&api_key=***",
      "requestMethod": "GET",
      "responseStatus": 200,
      "responsePayload": {
        "idprocessos": 12345,
        "numero_processo": "0123456-78.2024.8.09.0051",
        "tribunal": "TJGO"
      },
      "tempoExecucaoMs": 1200,
      "createdAt": "2024-11-20T23:00:08Z"
    },
    {
      "id": 3,
      "bateladaId": 1,
      "numeroCNJ": "0123456-78.2024.8.09.0051",
      "etapa": "criar_peticao",
      "status": "sucesso",
      "mensagem": "Petição intermediária criada: ID 67890",
      "requestUrl": "https://app.legalmail.com.br/api/v1/petition/intermediate",
      "requestMethod": "POST",
      "requestPayload": {
        "idprocessos": 12345,
        "idcertificados": 2562,
        "descricao": "Petição Intermediária"
      },
      "responseStatus": 201,
      "responsePayload": {
        "idpeticoes": 67890,
        "idprocessos": 12345,
        "status": "criada"
      },
      "tempoExecucaoMs": 800,
      "createdAt": "2024-11-20T23:00:09Z"
    }
    // ... mais logs
  ]
}
```

---

## 🎯 Resumo

O sistema registra **TUDO**:

✅ **Cada arquivo** enviado (nome, tamanho, local de armazenamento)  
✅ **Cada requisição** à API LegalMail (URL completa, método, payload, resposta, tempo)  
✅ **Cada etapa** do processamento (buscar processo, criar petição, upload, protocolar)  
✅ **Cada erro** que ocorre (mensagem detalhada, stack trace)  
✅ **Tempo de execução** de cada operação (em ms)  
✅ **Progresso em tempo real** via SSE (frontend vê tudo ao vivo)  
✅ **Histórico permanente** no banco de dados (pode ser consultado depois)  

**Nada se perde!** Tudo fica registrado para auditoria, debugging e compliance.
