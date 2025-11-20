# Checagem de Compatibilidade do Sistema

## ✅ Compatibilidade Ubuntu Local + Manus Cloud (S3)

### 1. Storage Híbrido

**Arquivo:** `server/hybrid-storage.ts`

#### Detecção Automática de Ambiente
```typescript
function isManusCloud(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}
```

- ✅ **Manus Cloud**: Detecta presença de `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY`
- ✅ **Ubuntu Local**: Ausência dessas variáveis indica ambiente local

#### Operações de Storage

**1. Salvar Arquivo (`hybridStoragePut`)**

- **Manus Cloud**: Usa `storagePut()` do `server/storage.ts` → Upload para S3
- **Ubuntu Local**: Usa `localStoragePut()` → Salva em `/uploads/` (filesystem)

**2. Ler Arquivo (`hybridStorageRead`)**

- **Manus Cloud**: 
  * Busca URL presigned do S3 via `storageGet()`
  * Faz download via `fetch(url)`
  * Retorna Buffer
  
- **Ubuntu Local**:
  * Lê diretamente do filesystem via `fs.readFile()`
  * Caminho: `/home/ubuntu/legalmail-peticionamento/uploads/`
  * Retorna Buffer

**3. Conversão para Base64 (`bufferToBase64`)**

- ✅ **Ambos os ambientes**: Usa `buffer.toString('base64')`
- ✅ **Compatível**: Node.js Buffer API é idêntica

---

### 2. Banco de Dados

**Conexão:** MySQL/TiDB via Drizzle ORM

- ✅ **Manus Cloud**: Usa `DATABASE_URL` fornecida pelo ambiente
- ✅ **Ubuntu Local**: Usa `DATABASE_URL` do `.env` local (MySQL ou TiDB)

**Migrations:**
```bash
pnpm db:push
```

- ✅ **Ambos os ambientes**: Comando idêntico
- ✅ **Compatível**: Drizzle ORM funciona igualmente em ambos

---

### 3. API LegalMail

**Cliente:** `server/legalmail-client.ts`

```typescript
const LEGALMAIL_API_KEY = process.env.LEGALMAIL_API_KEY;
const LEGALMAIL_BASE_URL = "https://api.legalmail.com.br";
```

- ✅ **Manus Cloud**: Usa `LEGALMAIL_API_KEY` do painel de Secrets
- ✅ **Ubuntu Local**: Usa `LEGALMAIL_API_KEY` do `.env` local

**Endpoints Utilizados:**
- `GET /api/v1/process` - Buscar processo por CNJ
- `POST /api/v1/petition/intermediate` - Criar petição intermediária
- `POST /api/v1/petition/file` - Upload de PDF principal
- `POST /api/v1/petition/attachments` - Upload de anexos
- `POST /api/v1/petition/protocol` - Protocolar petição

- ✅ **Ambos os ambientes**: Mesma API, mesmos endpoints

---

### 4. SSE (Server-Sent Events)

**Endpoint:** `/api/sse/progress/:bateladaId`

**Backend:**
- ✅ **Manus Cloud**: Express server com SSE nativo
- ✅ **Ubuntu Local**: Express server com SSE nativo
- ✅ **Compatível**: SSE é protocolo HTTP padrão

**Frontend:**
```typescript
const eventSource = new EventSource(`/api/sse/progress/${bateladaId}`);
```

- ✅ **Ambos os ambientes**: EventSource API é nativa do navegador
- ✅ **Compatível**: Funciona em Chrome, Firefox, Safari, Edge

---

### 5. Dependências Node.js

**Verificação:**
```bash
node --version  # v22.13.0
pnpm --version  # 9.15.4
```

**Pacotes Críticos:**
- `express` - ✅ Compatível
- `drizzle-orm` - ✅ Compatível
- `mysql2` - ✅ Compatível
- `react` - ✅ Compatível (frontend)
- `vite` - ✅ Compatível (build)

---

### 6. Sistema Operacional

**Manus Cloud:**
- OS: Ubuntu 22.04 (sandbox)
- Arquitetura: linux/amd64
- Acesso à internet: ✅ Sim

**Ubuntu Local:**
- OS: Ubuntu 20.04+ (recomendado)
- Arquitetura: linux/amd64 ou linux/arm64
- Acesso à internet: ✅ Necessário (API LegalMail)

---

### 7. Variáveis de Ambiente

#### Obrigatórias em Ambos os Ambientes:
```env
DATABASE_URL=mysql://user:password@host:port/database
LEGALMAIL_API_KEY=sua_api_key_aqui
JWT_SECRET=seu_jwt_secret_aqui
```

#### Exclusivas do Manus Cloud (injetadas automaticamente):
```env
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=auto_generated
VITE_APP_ID=auto_generated
OAUTH_SERVER_URL=https://api.manus.im
```

#### Exclusivas do Ubuntu Local:
```env
# Nenhuma variável exclusiva necessária
# Todas as variáveis do Manus Cloud são opcionais localmente
```

---

### 8. Fluxo de Upload de Arquivos

#### Manus Cloud (S3):
1. Frontend: Usuário seleciona PDFs
2. Frontend: Converte para Base64
3. Backend: Recebe Base64 via tRPC
4. Backend: `hybridStoragePut()` → `storagePut()` → S3
5. Backend: Salva `s3Key` no banco
6. **Protocolização:**
   - Backend: `hybridStorageRead(s3Key)` → `storageGet()` → URL presigned
   - Backend: `fetch(url)` → Download do S3
   - Backend: `bufferToBase64()` → Base64
   - Backend: Upload para LegalMail

#### Ubuntu Local (Filesystem):
1. Frontend: Usuário seleciona PDFs
2. Frontend: Converte para Base64
3. Backend: Recebe Base64 via tRPC
4. Backend: `hybridStoragePut()` → `localStoragePut()` → `/uploads/`
5. Backend: Salva `s3Key` (na verdade, path local) no banco
6. **Protocolização:**
   - Backend: `hybridStorageRead(path)` → `fs.readFile()`
   - Backend: `bufferToBase64()` → Base64
   - Backend: Upload para LegalMail

---

### 9. Testes de Compatibilidade

#### Teste 1: Detecção de Ambiente
```bash
# Manus Cloud
echo $BUILT_IN_FORGE_API_URL
# Saída esperada: https://forge.manus.im

# Ubuntu Local
echo $BUILT_IN_FORGE_API_URL
# Saída esperada: (vazio)
```

#### Teste 2: Storage Híbrido
```typescript
// Ambos os ambientes
const { key, url } = await hybridStoragePut("test.pdf", pdfBuffer, "application/pdf");
const buffer = await hybridStorageRead(key);
const base64 = bufferToBase64(buffer);
```

#### Teste 3: Banco de Dados
```bash
# Ambos os ambientes
pnpm db:push
# Saída esperada: Migrations aplicadas com sucesso
```

#### Teste 4: API LegalMail
```bash
# Ambos os ambientes
curl -H "Authorization: Bearer $LEGALMAIL_API_KEY" \
  https://api.legalmail.com.br/api/v1/tribunals
# Saída esperada: Lista de tribunais (JSON)
```

---

### 10. Checklist de Instalação Ubuntu Local

```bash
# 1. Instalar Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar pnpm
npm install -g pnpm

# 3. Clonar repositório
git clone https://github.com/fadv-tech/legalmail-peticionamento.git
cd legalmail-peticionamento

# 4. Instalar dependências
pnpm install

# 5. Configurar .env
cp .env.example .env
nano .env
# Adicionar:
# DATABASE_URL=mysql://user:password@localhost:3306/legalmail
# LEGALMAIL_API_KEY=sua_api_key_aqui
# JWT_SECRET=seu_jwt_secret_aqui

# 6. Criar banco de dados
mysql -u root -p
CREATE DATABASE legalmail;
exit;

# 7. Aplicar migrations
pnpm db:push

# 8. Criar diretório de uploads
mkdir -p uploads

# 9. Iniciar servidor de desenvolvimento
pnpm dev

# 10. Acessar aplicação
# http://localhost:3000
```

---

### 11. Troubleshooting

#### Problema: "Table 'bateladas' doesn't exist"
**Solução:**
```bash
pnpm db:push
# Confirmar criação de todas as tabelas interativamente
```

#### Problema: "Cannot read file from storage"
**Manus Cloud:**
- Verificar se `BUILT_IN_FORGE_API_KEY` está configurado
- Verificar se arquivo foi salvo corretamente no S3

**Ubuntu Local:**
- Verificar se diretório `/uploads/` existe
- Verificar permissões: `chmod 755 uploads`

#### Problema: "LEGALMAIL_API_KEY not found"
**Solução:**
```bash
# Manus Cloud: Adicionar no painel de Secrets
# Ubuntu Local: Adicionar no .env
echo "LEGALMAIL_API_KEY=sua_key_aqui" >> .env
```

#### Problema: "SSE connection error"
**Solução:**
- Verificar se servidor está rodando
- Verificar firewall/proxy
- Verificar se navegador suporta EventSource

---

### 12. Resumo de Compatibilidade

| Componente | Manus Cloud | Ubuntu Local | Compatível |
|------------|-------------|--------------|------------|
| Storage | S3 | Filesystem | ✅ Sim |
| Banco de Dados | TiDB | MySQL | ✅ Sim |
| API LegalMail | HTTPS | HTTPS | ✅ Sim |
| SSE | Express | Express | ✅ Sim |
| Node.js | 22.13.0 | 22.x | ✅ Sim |
| Frontend | React 19 | React 19 | ✅ Sim |
| Build | Vite | Vite | ✅ Sim |

---

## ✅ Conclusão

O sistema **Sistema de Peticionamento LegalMail** é **100% compatível** com:

1. **Manus Cloud (Produção)**: Usa S3 para storage, TiDB para banco, variáveis injetadas automaticamente
2. **Ubuntu Local (Desenvolvimento)**: Usa filesystem para storage, MySQL para banco, variáveis no `.env`

**Nenhuma alteração de código é necessária** para migrar entre ambientes. A detecção é **automática** via `isManusCloud()`.
