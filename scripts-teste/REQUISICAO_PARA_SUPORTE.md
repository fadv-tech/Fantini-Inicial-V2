# 🆘 Requisição Real para Suporte LegalMail

## Problema Reportado

Ao tentar enviar anexos para uma petição intermediária no **TJGO/Projudi**, o endpoint `/api/v1/petition/attachment/types` retorna um **array vazio `[]`**, impossibilitando o envio de anexos separados.

---

## 📍 Contexto

- **Tribunal:** TJGO (Tribunal de Justiça de Goiás)
- **Sistema:** Projudi
- **Tipo de petição:** Intermediária
- **Processo CNJ:** 5645881-12.2022.8.09.0051
- **idprocessos:** 41541 (ID do processo no LegalMail)
- **🎯 idpeticoes:** 362701 (ID da petição criada - ESTE É O IMPORTANTE!)

---

## 🔍 Requisições Realizadas

### 1. Criação da Petição Intermediária (SUCESSO ✅)

**Request:**
```http
POST /api/v1/petition/intermediate?api_key=a48badb3-cf79-6dcc-5b57-cb87f1f660cf HTTP/1.1
Host: app.legalmail.com.br
Content-Type: application/json

{
  "fk_processo": 41541,
  "fk_certificado": 1466
}
```

**Response (200 OK):**
```json
{
  "hash_peticao": "d063532d-97b0-4530-abcc-4d1e7ffa079f",
  "idpeticoes": 362701
}
```

---

### 2. Upload do PDF Principal (SUCESSO ✅)

**Request:**
```http
POST /api/v1/petition/file?api_key=a48badb3-cf79-6dcc-5b57-cb87f1f660cf&idpeticoes=362701&idprocessos=41541 HTTP/1.1
Host: app.legalmail.com.br
Content-Type: multipart/form-data

[arquivo PDF de 512 KB]
```

**Response (200 OK):**
```json
"success"
```

---

### 3. Listar Tipos de Anexo Disponíveis (PROBLEMA ❌)

**Request:**
```http
GET /api/v1/petition/attachment/types?api_key=a48badb3-cf79-6dcc-5b57-cb87f1f660cf&idpeticoes=362701 HTTP/1.1
Host: app.legalmail.com.br
```

**Response (200 OK):**
```json
[]
```

**⚠️ PROBLEMA:** Array vazio - nenhum tipo de anexo disponível.

---

### 4. Tentativa de Upload de Anexo (FALHA ❌)

**Request:**
```http
POST /api/v1/petition/attachments?api_key=a48badb3-cf79-6dcc-5b57-cb87f1f660cf&idpeticoes=362701&fk_documentos_tipos=1 HTTP/1.1
Host: app.legalmail.com.br
Content-Type: multipart/form-data

[arquivo PDF de 1152 KB]
```

**Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "Tipo de documento informado não é válido para a petição. Consulte os tipos disponíveis para a petição em /api/v1/petition/attachment/types."
}
```

---

## 🧪 Testes Adicionais Realizados

### Teste com Múltiplos Tipos

Testamos os seguintes valores para `fk_documentos_tipos`:
- `0` → ❌ "Missing fields: fk_documentos_tipos are required"
- `1` → ❌ "Tipo de documento informado não é válido"
- `2` → ❌ "Tipo de documento informado não é válido"
- `3` → ❌ "Tipo de documento informado não é válido"
- `null` (sem parâmetro) → ❌ "Missing fields: fk_documentos_tipos are required"
- `""` (vazio) → ❌ "Missing fields: fk_documentos_tipos are required"

**Todos falharam.**

### Teste com Nova Petição

Criamos uma **segunda petição** (idpeticoes: 362731) para verificar se o problema era específico da primeira:

**Request:**
```http
GET /api/v1/petition/attachment/types?api_key=a48badb3-cf79-6dcc-5b57-cb87f1f660cf&idpeticoes=362731 HTTP/1.1
Host: app.legalmail.com.br
```

**Response (200 OK):**
```json
[]
```

**Resultado:** Mesmo problema - array vazio.

---

## ❓ Perguntas para o Suporte

1. **O TJGO/Projudi suporta anexos separados** via API do LegalMail?

2. Se sim, **por que o endpoint `/api/v1/petition/attachment/types` retorna array vazio** para petições intermediárias no TJGO?

3. Existe algum **parâmetro adicional** necessário na criação da petição para habilitar anexos?

4. Existe algum **tipo de documento padrão/genérico** que funcione para todos os tribunais quando o array de tipos está vazio?

5. A solução é **mesclar todos os documentos em um único PDF** antes do envio via `/api/v1/petition/file`?

---

## 📊 Dados Completos para Reprodução

### Credenciais de Teste
- **API Key:** a48badb3-cf79-6dcc-5b57-cb87f1f660cf
- **Workspace:** (associado à API Key acima)

### Processo de Teste
- **Número CNJ:** 5645881-12.2022.8.09.0051
- **idprocessos:** 41541
- **Tribunal:** TJGO
- **Sistema:** projudi
- **Classe:** Cumprimento de Sentença contra a Fazenda Pública

### 🎯 Petições Criadas para Teste (IDs IMPORTANTES)

#### Petição 1 (com PDF principal enviado):
- **idpeticoes:** **362701** ← USAR ESTE ID PARA TESTAR
- **hash_peticao:** d063532d-97b0-4530-abcc-4d1e7ffa079f
- **idprocessos:** 41541
- **PDF principal enviado:** ✅ Sim (512 KB)
- **Status:** Pronta para receber anexos
- **Problema:** `/api/v1/petition/attachment/types?idpeticoes=362701` retorna `[]`

#### Petição 2 (sem PDF, criada apenas para teste):
- **idpeticoes:** **362731** ← TAMBÉM PODE USAR ESTE
- **hash_peticao:** dd0419f2-a37e-4a20-a262-c6b9e02193ca
- **idprocessos:** 41541
- **PDF principal enviado:** ❌ Não
- **Status:** Criada apenas para testar tipos de anexo
- **Problema:** `/api/v1/petition/attachment/types?idpeticoes=362731` retorna `[]`

### Certificado Usado
- **idcertificados:** 1466
- **Advogado:** FREDE SA DE MOURA
- **Vencimento:** 2026-09-02

---

## 🔧 Comandos cURL para Reprodução

### Listar tipos de anexo (retorna array vazio):
```bash
curl -X GET "https://app.legalmail.com.br/api/v1/petition/attachment/types?api_key=a48badb3-cf79-6dcc-5b57-cb87f1f660cf&idpeticoes=362701"
```

### Tentar enviar anexo (falha):
```bash
curl -X POST "https://app.legalmail.com.br/api/v1/petition/attachments?api_key=a48badb3-cf79-6dcc-5b57-cb87f1f660cf&idpeticoes=362701&fk_documentos_tipos=1" \
  -F "file=@/path/to/anexo.pdf"
```

---

## 📎 Arquivos de Teste

1. **Petição principal:** `5645881.12.2022.8.09.0051_12693_56814_Manifestação.pdf` (512 KB)
2. **Anexo:** `5645881.12.2022.8.09.0051LourdesIaccino-Contrato.pdf` (1152 KB)

---

## 🎯 Resultado Esperado

Esperamos que o endpoint `/api/v1/petition/attachment/types` retorne uma lista de tipos de documento disponíveis, como:

```json
[
  {
    "id": 1,
    "nome": "Procuração"
  },
  {
    "id": 2,
    "nome": "Contrato"
  },
  {
    "id": 3,
    "nome": "Documento de Identificação"
  }
]
```

E que possamos usar esses IDs para enviar anexos via `/api/v1/petition/attachments`.

---

**Reportado em:** 2025-01-19  
**Contato:** (seu email/telefone)  
**Urgência:** Alta - bloqueando desenvolvimento de sistema de peticionamento em lote
