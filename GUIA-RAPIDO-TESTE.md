# ⚡ Guia Rápido - Instalar e Testar

## 📥 Passo 1: Clonar Repositório

```bash
cd ~
rm -rf Fantini-Inicial-V2  # Se já existir, remover versão antiga
git clone https://github.com/fadv-tech/Fantini-Inicial-V2.git
cd Fantini-Inicial-V2
```

## 📦 Passo 2: Instalar Dependências

```bash
pnpm install
```

**Tempo esperado:** 2-3 minutos

## 🗄️ Passo 3: Configurar Banco de Dados

### 3.1 Criar banco MySQL

```bash
mysql -u root -p
```

**Digite a senha do root e execute:**

```sql
CREATE DATABASE legalmail_peticionamento;
CREATE USER 'legalmail'@'localhost' IDENTIFIED BY 'senha_segura_aqui';
GRANT ALL PRIVILEGES ON legalmail_peticionamento.* TO 'legalmail'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3.2 Criar tabelas

```bash
cd ~/Fantini-Inicial-V2
mysql -u legalmail -p legalmail_peticionamento < create-tables.sql
```

**Digite a senha:** `senha_segura_aqui`

**Verificar tabelas criadas:**

```bash
mysql -u legalmail -p legalmail_peticionamento -e "SHOW TABLES;"
```

**Resultado esperado:**
```
+--------------------------------------+
| Tables_in_legalmail_peticionamento   |
+--------------------------------------+
| arquivos_enviados                    |
| batelada_processos                   |
| bateladas                            |
| logs_auditoria                       |
| tribunal_configs                     |
| users                                |
+--------------------------------------+
```

## ⚙️ Passo 4: Configurar Variáveis de Ambiente

```bash
cd ~/Fantini-Inicial-V2
nano .env
```

**Cole o seguinte conteúdo:**

```env
# Database
DATABASE_URL=mysql://legalmail:senha_segura_aqui@localhost:3306/legalmail_peticionamento

# JWT Secret (pode ser qualquer string aleatória)
JWT_SECRET=sua_chave_secreta_aleatoria_aqui_min_32_caracteres

# LegalMail API (IMPORTANTE: adicione sua chave real aqui)
LEGALMAIL_API_KEY=sua_api_key_legalmail_aqui

# App Config
VITE_APP_TITLE=Sistema de Peticionamento LegalMail
VITE_APP_LOGO=/logo.svg

# OAuth (opcional para testes locais)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=seu_app_id_aqui
OWNER_OPEN_ID=seu_open_id_aqui
OWNER_NAME=Seu Nome

# Storage Local (não usar S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=
```

**Salvar:** `Ctrl+O`, `Enter`, `Ctrl+X`

## 🌱 Passo 5: Popular Tribunais

```bash
cd ~/Fantini-Inicial-V2
pnpm seed
```

**Resultado esperado:**
```
🌱 Iniciando seed de tribunais...
  ✅ TJAC (8.01)
  ✅ TJAL (8.02)
  ...
  ✅ TJTO (8.27)

✅ 27 tribunais inseridos com sucesso!
```

## 📄 Passo 6: Gerar PDFs de Teste

```bash
cd ~/Fantini-Inicial-V2
bash gerar-pdfs-teste.sh
```

**Resultado esperado:**
```
📄 Gerando PDFs de teste...
  ✅ PDF 1 criado: 0123456-78.2024.8.09.0051-PETICAO.pdf
  ✅ PDF 2 criado: 0789012-34.2024.8.09.0001-PETICAO.pdf
  ✅ PDF 3 criado: 0456789-01.2024.8.09.0137-PETICAO.pdf
  ✅ Anexo 1 criado: 0123456-78.2024.8.09.0051-ANEXO-1.pdf
  ✅ Anexo 2 criado: 0123456-78.2024.8.09.0051-ANEXO-2.pdf

✅ 5 PDFs de teste criados em pdfs-teste/
```

## 🚀 Passo 7: Iniciar Servidor

```bash
cd ~/Fantini-Inicial-V2
pnpm dev
```

**Resultado esperado:**
```
[server] Server running on http://localhost:3000/
[client] VITE v5.x.x ready in 1234 ms
[client] ➜  Local:   http://localhost:3000
```

## 🧪 Passo 8: Testar Sistema

Abra no navegador: **http://localhost:3000**

### 8.1 Verificar Tribunais Populados

```bash
# Em outro terminal
mysql -u legalmail -p legalmail_peticionamento -e "SELECT COUNT(*) as total FROM tribunal_configs;"
```

**Resultado esperado:**
```
+-------+
| total |
+-------+
|    27 |
+-------+
```

### 8.2 Verificar PDFs Criados

```bash
ls -lh ~/Fantini-Inicial-V2/pdfs-teste/
```

**Resultado esperado:**
```
-rw-r--r-- 1 user user 12K Nov 20 10:00 0123456-78.2024.8.09.0051-PETICAO.pdf
-rw-r--r-- 1 user user 8.5K Nov 20 10:00 0789012-34.2024.8.09.0001-PETICAO.pdf
-rw-r--r-- 1 user user 10K Nov 20 10:00 0456789-01.2024.8.09.0137-PETICAO.pdf
-rw-r--r-- 1 user user 6.2K Nov 20 10:00 0123456-78.2024.8.09.0051-ANEXO-1.pdf
-rw-r--r-- 1 user user 5.8K Nov 20 10:00 0123456-78.2024.8.09.0051-ANEXO-2.pdf
```

### 8.3 Testar Fluxo Completo (UI)

1. Acesse **http://localhost:3000**
2. Clique em **"Enviar Petições"** (ou `/send`)
3. Arraste os PDFs de `pdfs-teste/` para o upload
4. Clique em **"Protocolar Batelada"**
5. Observe o progresso em tempo real
6. Verifique logs em **"Auditoria"** (ou `/auditoria`)

## ✅ Checklist de Validação

- [ ] Repositório clonado com sucesso
- [ ] Dependências instaladas (`pnpm install`)
- [ ] Banco de dados criado e tabelas criadas
- [ ] Variáveis de ambiente configuradas (`.env`)
- [ ] 27 tribunais populados (`pnpm seed`)
- [ ] 5 PDFs de teste criados (`bash gerar-pdfs-teste.sh`)
- [ ] Servidor iniciado (`pnpm dev`)
- [ ] Sistema acessível em http://localhost:3000
- [ ] PDFs fazem upload sem erros
- [ ] Logs aparecem em tempo real (SSE)
- [ ] Arquivos salvos em `~/arquivos-eternos/`

## 🐛 Troubleshooting

### Erro: "Cannot connect to MySQL"
```bash
sudo systemctl restart mysql
mysql -u legalmail -p legalmail_peticionamento -e "SELECT 1;"
```

### Erro: "pnpm: command not found"
```bash
npm install -g pnpm
pnpm --version
```

### Erro: "Table 'bateladas' doesn't exist"
```bash
cd ~/Fantini-Inicial-V2
mysql -u legalmail -p legalmail_peticionamento < create-tables.sql
```

### Erro: "Port 3000 already in use"
```bash
# Matar processo na porta 3000
sudo lsof -ti:3000 | xargs kill -9

# Ou usar porta diferente
PORT=3001 pnpm dev
```

### Erro: "ImageMagick not found" (ao gerar PDFs)
```bash
sudo apt install imagemagick
bash gerar-pdfs-teste.sh
```

## 📞 Próximos Passos

1. **Testar protocolização real**: Adicione `LEGALMAIL_API_KEY` real no `.env` para testar fluxo completo
2. **Verificar arquivamento**: Confira que arquivos foram salvos em `~/arquivos-eternos/`
3. **Consultar logs**: Execute SQL para ver logs detalhados:
   ```bash
   mysql -u legalmail -p legalmail_peticionamento -e "SELECT etapa, status, mensagem FROM logs_auditoria LIMIT 10;"
   ```

---

**Sucesso! Sistema pronto para testes! 🎉**
