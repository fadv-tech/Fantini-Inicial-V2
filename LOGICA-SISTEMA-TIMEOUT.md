# 🔄 Lógica Completa do Sistema - Processamento de Bateladas

## 📊 Como o Sistema Funciona AGORA

### Fluxo Geral (send-batch.ts)

```
┌─────────────────────────────────────────────────────────────────┐
│ BATELADA (ex: 50 processos, 120 arquivos)                      │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. AGRUPAR POR TRIBUNAL                                         │
│    - TJGO: 30 processos                                         │
│    - TJSP: 15 processos                                         │
│    - TJRJ: 5 processos                                          │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PROCESSAR CADA TRIBUNAL SEQUENCIALMENTE                      │
│    for (const [tribunal, processos] of tribunais) {             │
│      // Processa TJGO completo, depois TJSP, depois TJRJ        │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. DENTRO DE CADA TRIBUNAL: PROCESSAR CADA PROCESSO SEQUENCIAL  │
│    for (const processo of processos) {                          │
│      await processarProcesso(processo); // UM POR VEZ           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detalhamento: processarProcesso() - UM PROCESSO POR VEZ

Cada processo passa por **6 etapas SEQUENCIAIS**:

```
PROCESSO: CNJ-0123456-78.2024.8.09.0051 (1 PDF principal + 2 anexos)

┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 1: Buscar Processo no LegalMail                          │
│ ├─ Requisição: GET /api/v1/process?cnj=0123456-78.2024.8.09.0051│
│ ├─ Timeout: 60s                                                 │
│ ├─ Tempo real: ~1-3s (rápido, só busca no banco do LegalMail)  │
│ └─ Resultado: idprocessos = 12345                              │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (aguarda completar)
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 2: Criar Petição Intermediária                           │
│ ├─ Requisição: POST /api/v1/petition/intermediate              │
│ ├─ Body: {idprocessos: 12345, fk_certificado: 2562}            │
│ ├─ Timeout: 60s                                                 │
│ ├─ Tempo real: ~1-2s (rápido, só cria registro no banco)       │
│ └─ Resultado: idPeticoes = 67890                               │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (aguarda completar)
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 3: Upload PDF Principal                                  │
│ ├─ Arquivo: PETICAO-INICIAL.pdf (3 MB)                         │
│ ├─ Ler do storage: hybridStorageRead(s3Key)                    │
│ ├─ Converter: bufferToBase64() → 4 MB Base64                   │
│ ├─ Requisição: POST /api/v1/petition/file                      │
│ ├─ Body: {arquivo_base64: "[4MB]", nome_arquivo: "..."}        │
│ ├─ Timeout: 60s                                                 │
│ ├─ Tempo real: ~5-15s (LENTO, upload de 4MB + processamento)   │
│ └─ Resultado: arquivo_id = 99999                               │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (aguarda completar)
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 4: Upload Anexo 1                                        │
│ ├─ Arquivo: ANEXO-1.pdf (2 MB)                                 │
│ ├─ Ler do storage: hybridStorageRead(s3Key)                    │
│ ├─ Converter: bufferToBase64() → 2.6 MB Base64                 │
│ ├─ Requisição: POST /api/v1/petition/attachments               │
│ ├─ Timeout: 60s                                                 │
│ ├─ Tempo real: ~3-10s                                           │
│ └─ Resultado: anexo_id = 88888                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (aguarda completar)
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 5: Upload Anexo 2                                        │
│ ├─ Arquivo: ANEXO-2.pdf (1.5 MB)                               │
│ ├─ Ler do storage: hybridStorageRead(s3Key)                    │
│ ├─ Converter: bufferToBase64() → 2 MB Base64                   │
│ ├─ Requisição: POST /api/v1/petition/attachments               │
│ ├─ Timeout: 60s                                                 │
│ ├─ Tempo real: ~2-8s                                            │
│ └─ Resultado: anexo_id = 77777                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (aguarda completar)
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 6: Protocolar Petição                                    │
│ ├─ Requisição: POST /api/v1/petition/intermediate/send         │
│ ├─ Params: {idpeticoes: 67890, idprocessos: 12345, ...}        │
│ ├─ Timeout: 60s                                                 │
│ ├─ Tempo real: ~3-10s (LENTO, assina digitalmente + protocola) │
│ └─ Resultado: protocolo = "2024000123456"                      │
└─────────────────────────────────────────────────────────────────┘

TEMPO TOTAL DO PROCESSO: ~15-48s (depende do tamanho dos arquivos)
```

---

## ⏱️ Análise de Tempo - Exemplo Real

### Cenário: Batelada com 10 processos (30 arquivos)

```
Processo 1: 1 PDF (3MB) + 2 anexos (2MB, 1.5MB)
├─ Buscar processo: 2s
├─ Criar petição: 1s
├─ Upload PDF principal (3MB): 8s
├─ Upload anexo 1 (2MB): 5s
├─ Upload anexo 2 (1.5MB): 4s
├─ Protocolar: 5s
└─ TOTAL: 25s

Processo 2: 1 PDF (2MB) + 1 anexo (1MB)
├─ Buscar processo: 2s
├─ Criar petição: 1s
├─ Upload PDF principal (2MB): 5s
├─ Upload anexo 1 (1MB): 3s
├─ Protocolar: 5s
└─ TOTAL: 16s

Processo 3: 1 PDF (5MB) + 3 anexos (3MB, 2MB, 1MB)
├─ Buscar processo: 2s
├─ Criar petição: 1s
├─ Upload PDF principal (5MB): 15s
├─ Upload anexo 1 (3MB): 8s
├─ Upload anexo 2 (2MB): 5s
├─ Upload anexo 3 (1MB): 3s
├─ Protocolar: 5s
└─ TOTAL: 39s

... (mais 7 processos)

TEMPO TOTAL DA BATELADA (10 processos): ~200-300s (3-5 minutos)
```

---

## 🚨 Problema do Timeout Atual

### Timeout Fixo de 60s por Requisição

```typescript
const TIMEOUT_MS = 60000; // 60 segundos

// Cada requisição tem timeout de 60s:
await withTimeout(
  legalMailRequest({...}),
  TIMEOUT_MS, // 60s
  "Timeout ao buscar processo"
);
```

### Quando o Timeout É Atingido?

**Cenário 1: Arquivo Grande (10 MB)**
```
Upload PDF principal (10MB):
├─ Ler do storage: 1s
├─ Converter Base64: 2s (10MB → 13MB)
├─ Enviar para API: 30s (13MB pela rede)
├─ API processar: 20s (salvar, validar, etc)
└─ TOTAL: 53s ✅ OK (dentro de 60s)

Mas se a rede estiver lenta ou API sobrecarregada:
└─ TOTAL: 65s ❌ TIMEOUT! (excede 60s)
```

**Cenário 2: Múltiplos Anexos Grandes**
```
Processo com 1 PDF (5MB) + 5 anexos (4MB cada):
├─ Upload PDF: 15s
├─ Upload anexo 1: 12s
├─ Upload anexo 2: 12s
├─ Upload anexo 3: 12s
├─ Upload anexo 4: 12s
├─ Upload anexo 5: 12s ❌ Pode dar timeout se API estiver lenta
└─ Protocolar: 5s
```

---

## 💡 Problema: Timeout NÃO É Proporcional ao Tamanho da Batelada

### Por Que Não?

**O timeout atual (60s) é POR REQUISIÇÃO, não por batelada!**

```
Batelada com 1 processo:
├─ Buscar: timeout 60s
├─ Criar: timeout 60s
├─ Upload PDF: timeout 60s
├─ Upload anexo: timeout 60s
├─ Protocolar: timeout 60s
└─ Tempo máximo teórico: 300s (5min) se TODAS derem timeout

Batelada com 100 processos:
├─ Processo 1: timeout 60s por requisição
├─ Processo 2: timeout 60s por requisição
├─ ...
├─ Processo 100: timeout 60s por requisição
└─ Tempo máximo teórico: 30.000s (8 horas!) se TODAS derem timeout
```

**MAS:** O sistema processa **UM PROCESSO POR VEZ**, então:
- Batelada de 1 processo: ~20-40s (tempo real)
- Batelada de 10 processos: ~200-400s (tempo real)
- Batelada de 100 processos: ~2000-4000s (33-66 minutos de tempo real)

---

## 🎯 Soluções Possíveis para Timeout

### Opção 1: Timeout Diferenciado por Etapa (RECOMENDADO)

```typescript
const TIMEOUTS = {
  BUSCAR_PROCESSO: 30000,      // 30s (rápido, só busca no banco)
  CRIAR_PETICAO: 30000,         // 30s (rápido, só cria registro)
  UPLOAD_ARQUIVO: 120000,       // 120s (LENTO, upload de arquivo grande)
  PROTOCOLAR: 90000,            // 90s (LENTO, assina digitalmente)
};

// Uso:
await withTimeout(
  legalMailRequest({method: "GET", endpoint: "/api/v1/process"}),
  TIMEOUTS.BUSCAR_PROCESSO, // 30s
  "Timeout ao buscar processo"
);

await withTimeout(
  legalMailRequest({method: "POST", endpoint: "/api/v1/petition/file"}),
  TIMEOUTS.UPLOAD_ARQUIVO, // 120s
  "Timeout ao fazer upload"
);
```

**Vantagens:**
- ✅ Operações rápidas não esperam 60s desnecessariamente
- ✅ Operações lentas (upload) têm mais tempo (120s)
- ✅ Reduz falsos positivos de timeout

**Desvantagens:**
- ❌ Ainda não é proporcional ao tamanho do arquivo

---

### Opção 2: Timeout Dinâmico Baseado no Tamanho do Arquivo

```typescript
function calcularTimeout(tamanhoBytes: number): number {
  const BASE_TIMEOUT = 30000; // 30s base
  const TIMEOUT_POR_MB = 10000; // 10s por MB
  
  const tamanhoMB = tamanhoBytes / (1024 * 1024);
  const timeout = BASE_TIMEOUT + (tamanhoMB * TIMEOUT_POR_MB);
  
  return Math.min(timeout, 300000); // Máximo 5 minutos
}

// Exemplo:
// Arquivo 1MB: 30s + (1 * 10s) = 40s
// Arquivo 5MB: 30s + (5 * 10s) = 80s
// Arquivo 10MB: 30s + (10 * 10s) = 130s
// Arquivo 30MB: 30s + (30 * 10s) = 330s → limitado a 300s (5min)

// Uso:
const pdfBuffer = await hybridStorageRead(s3Key);
const timeout = calcularTimeout(pdfBuffer.length);

await withTimeout(
  legalMailRequest({...}),
  timeout, // Dinâmico baseado no tamanho
  "Timeout ao fazer upload"
);
```

**Vantagens:**
- ✅ Timeout proporcional ao tamanho do arquivo
- ✅ Arquivos pequenos processam mais rápido
- ✅ Arquivos grandes não dão timeout injustamente

**Desvantagens:**
- ❌ Mais complexo de implementar
- ❌ Precisa ler o arquivo antes de calcular timeout

---

### Opção 3: Timeout Global da Batelada (NÃO RECOMENDADO)

```typescript
const TIMEOUT_POR_PROCESSO = 120000; // 2 minutos por processo
const timeoutBatelada = totalProcessos * TIMEOUT_POR_PROCESSO;

// Exemplo:
// 1 processo: 2 minutos
// 10 processos: 20 minutos
// 100 processos: 200 minutos (3.3 horas)

setTimeout(() => {
  throw new Error("Timeout da batelada");
}, timeoutBatelada);
```

**Vantagens:**
- ✅ Timeout proporcional ao tamanho da batelada

**Desvantagens:**
- ❌ NÃO resolve o problema de requisições individuais
- ❌ Se um processo travar, outros não processam
- ❌ Usuário não sabe qual processo falhou

---

## 🏆 Recomendação Final

### **Implementar Opção 1 + Opção 2 (Híbrido)**

```typescript
// Timeouts base por etapa
const TIMEOUTS = {
  BUSCAR_PROCESSO: 30000,
  CRIAR_PETICAO: 30000,
  PROTOCOLAR: 90000,
};

// Timeout dinâmico para uploads
function calcularTimeoutUpload(tamanhoBytes: number): number {
  const BASE = 30000; // 30s
  const POR_MB = 10000; // 10s/MB
  const tamanhoMB = tamanhoBytes / (1024 * 1024);
  return Math.min(BASE + (tamanhoMB * POR_MB), 300000); // Max 5min
}

// Uso:
// 1. Buscar processo (sempre 30s)
await withTimeout(
  legalMailRequest({method: "GET", ...}),
  TIMEOUTS.BUSCAR_PROCESSO,
  "Timeout ao buscar"
);

// 2. Criar petição (sempre 30s)
await withTimeout(
  legalMailRequest({method: "POST", ...}),
  TIMEOUTS.CRIAR_PETICAO,
  "Timeout ao criar"
);

// 3. Upload PDF (dinâmico baseado no tamanho)
const pdfBuffer = await hybridStorageRead(s3Key);
const timeoutUpload = calcularTimeoutUpload(pdfBuffer.length);
await withTimeout(
  legalMailRequest({method: "POST", ...}),
  timeoutUpload, // 40s-300s dependendo do tamanho
  "Timeout ao fazer upload"
);

// 4. Protocolar (sempre 90s)
await withTimeout(
  legalMailRequest({method: "POST", ...}),
  TIMEOUTS.PROTOCOLAR,
  "Timeout ao protocolar"
);
```

---

## 📊 Comparação de Estratégias

| Estratégia | Arquivo 1MB | Arquivo 5MB | Arquivo 10MB | Arquivo 20MB | Complexidade |
|------------|-------------|-------------|--------------|--------------|--------------|
| **Atual (60s fixo)** | 60s | 60s | 60s ❌ Pode falhar | 60s ❌ Falha | Baixa |
| **Por etapa (120s upload)** | 120s | 120s | 120s ✅ OK | 120s ⚠️ Arriscado | Baixa |
| **Dinâmico** | 40s | 80s | 130s ✅ OK | 230s ✅ OK | Média |
| **Híbrido (recomendado)** | 40s | 80s | 130s ✅ OK | 230s ✅ OK | Média |

---

## 🎯 Resumo

### Como o Sistema Funciona:
1. **Processa UM PROCESSO POR VEZ** (sequencial)
2. **Cada processo tem 6 etapas** (buscar, criar, upload PDF, upload anexos, protocolar)
3. **Cada etapa tem timeout de 60s** (atual)
4. **Timeout NÃO é proporcional à batelada**, é por requisição individual

### Problema:
- Arquivos grandes (>5MB) podem dar timeout injustamente
- Timeout fixo de 60s não considera tamanho do arquivo

### Solução Recomendada:
- **Timeout por etapa:** Buscar=30s, Criar=30s, Upload=dinâmico, Protocolar=90s
- **Timeout dinâmico para uploads:** 30s base + 10s por MB (máximo 5min)
- **Não precisa timeout global da batelada** (processamento é sequencial)

### Implementação:
```typescript
const TIMEOUTS = {
  BUSCAR: 30000,
  CRIAR: 30000,
  UPLOAD: (tamanhoMB: number) => Math.min(30000 + (tamanhoMB * 10000), 300000),
  PROTOCOLAR: 90000,
};
```

**Isso resolve o problema sem adicionar complexidade excessiva!**
