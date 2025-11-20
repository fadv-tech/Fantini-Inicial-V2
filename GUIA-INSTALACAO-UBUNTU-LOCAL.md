# 🐧 Guia de Instalação - Ubuntu Local (Do Zero)

Este guia mostra como instalar e rodar o sistema em um **Ubuntu zerado** com Node v20.18.2.

---

## ✅ Pré-requisitos

- Ubuntu 22.04 LTS (ou superior)

- Node.js v20.18.2 (já instalado)

- MySQL 8.0+ ou MariaDB 10.6+

- Git

---

## 📋 Passo a Passo

### 1️⃣ Instalar Dependências do Sistema

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar MySQL
sudo apt install -y mysql-server

# Iniciar MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Configurar MySQL (senha root, remover usuários anônimos, etc)
sudo mysql_secure_installation
```

**Respostas recomendadas:**

```
Set root password? Y
New password: sua_senha_aqui
Remove anonymous users? Y
Disallow root login remotely? Y
Remove test database? Y
Reload privilege tables? Y
```

---

### 2️⃣ Criar Banco de Dados

```bash
# Entrar no MySQL
sudo mysql -u root -p

# Criar banco e usuário
CREATE DATABASE legalmail_peticionamento;
CREATE USER 'legalmail'@'localhost' IDENTIFIED BY 'senha_segura_aqui';
GRANT ALL PRIVILEGES ON legalmail_peticionamento.* TO 'legalmail'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

### 3️⃣ Clonar Repositório

```bash
# Clonar do GitHub
cd ~
git clone https://github.com/fadv-tech/Fantini-Inicial-V2.git
cd Fantini-Inicial-V2

# Verificar versão correta (commit mais recente)
git checkout 17a7af45
```

---

### 4️⃣ Instalar pnpm (se não tiver )

```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Verificar instalação
pnpm --version
```

---

### 5️⃣ Instalar Dependências do Projeto

```bash
cd ~/Fantini-Inicial-V2
pnpm install
```

**Tempo esperado:** ~2-3 minutos

---

### 6️⃣ Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
nano .env
```

**Cole o seguinte conteúdo** (ajuste os valores):

```
# Database (MySQL Local)
DATABASE_URL=mysql://legalmail:senha_segura_aqui@localhost:3306/legalmail_peticionamento

# JWT Secret (gere uma chave aleatória)
JWT_SECRET=sua_chave_secreta_aleatoria_aqui_min_32_caracteres

# LegalMail API
LEGALMAIL_API_KEY=sua_api_key_legalmail_aqui

# OAuth (Manus - opcional para testes locais)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=seu_app_id_aqui
OWNER_OPEN_ID=seu_open_id_aqui
OWNER_NAME=Seu Nome

# App Config
VITE_APP_TITLE=Sistema de Peticionamento LegalMail
VITE_APP_LOGO=/logo.svg

# Storage Local (não usar S3 )
# Deixe vazio para usar filesystem local
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=

# Built-in Forge API (opcional)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

**Salvar:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 7️⃣ Criar Tabelas no Banco

```bash
cd ~/Fantini-Inicial-V2

# Executar script SQL
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

---

### 8️⃣ Popular Tribunais (Seed)

```bash
cd ~/Fantini-Inicial-V2
pnpm seed
```

**Ou diretamente com tsx:**
```bash
cd ~/Fantini-Inicial-V2
npx tsx seed-tribunais.mjs
```

**Resultado esperado:**

```
✅ 27 tribunais inseridos com sucesso!
```

---

### 9️⃣ Criar Pasta para Arquivos Permanentes

```bash
# Criar pasta para arquivamento permanente
mkdir -p ~/arquivos-eternos

# Dar permissões
chmod 755 ~/arquivos-eternos
```

**Estrutura que será criada automaticamente:**

```
~/arquivos-eternos/
  └─ 2024/
      └─ 11/
          └─ 20/
              ├─ CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-20241120-230015.pdf
              ├─ CNJ-0123456-78.2024.8.09.0051-ANEXO-1-20241120-230016.pdf
              └─ ...
```

---

### 🔟 Iniciar Servidor de Desenvolvimento

```bash
cd ~/Fantini-Inicial-V2
pnpm dev
```

**Resultado esperado:**

```
> legalmail-peticionamento@1.0.0 dev
> concurrently "pnpm dev:server" "pnpm dev:client"

[server]: http://localhost:3000/ "Server running on"
[client]: # "VITE v5.x.x ready in 1234 ms"
[client]: http://localhost:5173/ "➜  Local:"
[client]: # "➜  Network: use --host to expose"
```

**Acessar no navegador:**

```
http://localhost:3000
```

---

## 🎯 Testar Fluxo Completo

Siga o mesmo fluxo do **GUIA-TESTE-MANUS-CLOUD.md**, mas com estas diferenças:

### Diferenças Ubuntu Local vs Manus Cloud:

| Aspecto | Manus Cloud | Ubuntu Local |
| --- | --- | --- |
| **Storage** | S3 (AWS ) | Filesystem (`~/arquivos-eternos/`) |
| **Banco** | TiDB (cloud) | MySQL (local) |
| **URL** | [https://3000-xxx.manusvm.computer](https://3000-xxx.manusvm.computer) | [http://localhost:3000](http://localhost:3000) |
| **OAuth** | Manus OAuth | Opcional (pode desabilitar ) |

---

### Verificar Arquivamento Permanente (Filesystem)

```bash
# Listar arquivos arquivados
ls -lah ~/arquivos-eternos/2024/11/20/

# Ver conteúdo de um PDF
evince ~/arquivos-eternos/2024/11/20/CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-20241120-230015.pdf
```

**Resultado esperado:**

```
-rw-r--r-- 1 user user 3.2M Nov 20 23:00 CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-20241120-230015.pdf
-rw-r--r-- 1 user user 1.5M Nov 20 23:00 CNJ-0123456-78.2024.8.09.0051-ANEXO-1-20241120-230016.pdf
```

---

### Verificar Logs no Banco (Local)

```bash
mysql -u legalmail -p legalmail_peticionamento -e "
SELECT 
  id, 
  bateladaId, 
  etapa, 
  status, 
  mensagem, 
  tempoExecucaoMs 
FROM logs_auditoria 
WHERE bateladaId = 1 
ORDER BY createdAt 
LIMIT 10;
"
```

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to MySQL"

```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Reiniciar MySQL
sudo systemctl restart mysql

# Verificar conexão
mysql -u legalmail -p -e "SELECT 1;"
```

### Erro: "Permission denied" ao criar pasta

```bash
# Dar permissões corretas
sudo chown -R $USER:$USER ~/arquivos-eternos
chmod -R 755 ~/arquivos-eternos
```

### Erro: "Port 3000 already in use"

```bash
# Matar processo na porta 3000
sudo lsof -ti:3000 | xargs kill -9

# Ou usar porta diferente
PORT=3001 pnpm dev
```

### Erro: "pnpm: command not found"

```bash
# Instalar pnpm
npm install -g pnpm

# Adicionar ao PATH (se necessário)
export PATH="$HOME/.local/share/pnpm:$PATH"
```

---

## 🔄 Comandos Úteis

```bash
# Parar servidor
Ctrl+C

# Limpar cache
pnpm clean

# Reinstalar dependências
rm -rf node_modules
pnpm install

# Ver logs do servidor
pnpm dev 2>&1 | tee server.log

# Backup do banco
mysqldump -u legalmail -p legalmail_peticionamento > backup_$(date +%Y%m%d).sql

# Restaurar banco
mysql -u legalmail -p legalmail_peticionamento < backup_20241120.sql
```

---

## 📊 Monitoramento

### Ver processos Node rodando

```bash
ps aux | grep node
```

### Ver uso de disco (arquivos eternos)

```bash
du -sh ~/arquivos-eternos/
```

### Ver tamanho do banco

```bash
mysql -u legalmail -p legalmail_peticionamento -e "
SELECT 
  table_name AS 'Tabela',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Tamanho (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'legalmail_peticionamento'
ORDER BY (data_length + index_length) DESC;
"
```

---

## 🚀 Produção (Opcional)

Para rodar em produção (não desenvolvimento):

```bash
# Build do projeto
pnpm build

# Iniciar em produção
pnpm start
```

**Usar PM2 para manter rodando:**

```bash
# Instalar PM2
npm install -g pm2

# Iniciar com PM2
pm2 start npm --name "legalmail" -- start

# Ver status
pm2 status

# Ver logs
pm2 logs legalmail

# Reiniciar
pm2 restart legalmail

# Parar
pm2 stop legalmail
```

---

## ✅ Sucesso!

Se todos os passos funcionaram, o sistema está **100% operacional** no Ubuntu local! 🎉

**Próximos passos:**

- Configurar HTTPS com Let's Encrypt (produção)

- Configurar backup automático do banco

- Configurar monitoramento com Grafana/Prometheus

- Configurar CI/CD com GitHub Actions

