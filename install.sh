#!/bin/bash

# Script de Auto-Instalação - Sistema de Peticionamento LegalMail
# Uso: bash install.sh

set -e  # Parar em caso de erro

echo "🚀 Instalação Automática - Sistema de Peticionamento LegalMail"
echo "=============================================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para gerar senha aleatória
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Função para gerar JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

# 1. Atualizar sistema
echo -e "${BLUE}📦 Atualizando sistema...${NC}"
sudo apt update -qq
sudo apt upgrade -y -qq

# 2. Instalar dependências
echo -e "${BLUE}📦 Instalando dependências...${NC}"
sudo DEBIAN_FRONTEND=noninteractive apt install -y mysql-server git curl

# 3. Instalar pnpm (se não tiver)
if ! command -v pnpm &> /dev/null; then
    echo -e "${BLUE}📦 Instalando pnpm...${NC}"
    npm install -g pnpm
fi

# 4. Gerar senhas aleatórias
echo -e "${BLUE}🔐 Gerando credenciais...${NC}"
DB_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_jwt_secret)

echo -e "${GREEN}✅ Senha do banco gerada: ${DB_PASSWORD}${NC}"
echo -e "${GREEN}✅ JWT Secret gerado: ${JWT_SECRET:0:20}...${NC}"

# 5. Perguntar LEGALMAIL_API_KEY
echo ""
echo -e "${YELLOW}🔑 Por favor, insira sua LEGALMAIL_API_KEY:${NC}"
read -p "LEGALMAIL_API_KEY: " LEGALMAIL_API_KEY

if [ -z "$LEGALMAIL_API_KEY" ]; then
    echo -e "${RED}❌ Erro: LEGALMAIL_API_KEY não pode estar vazia!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ LEGALMAIL_API_KEY configurada${NC}"

# 6. Configurar MySQL
echo -e "${BLUE}🗄️  Configurando MySQL...${NC}"

# Iniciar MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Criar banco e usuário
sudo mysql -e "CREATE DATABASE IF NOT EXISTS legalmail_peticionamento;"
sudo mysql -e "DROP USER IF EXISTS 'legalmail'@'localhost';"
sudo mysql -e "CREATE USER 'legalmail'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON legalmail_peticionamento.* TO 'legalmail'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo -e "${GREEN}✅ Banco de dados criado: legalmail_peticionamento${NC}"
echo -e "${GREEN}✅ Usuário criado: legalmail${NC}"

# 7. Clonar repositório
echo -e "${BLUE}📥 Clonando repositório...${NC}"
cd ~
rm -rf Fantini-Inicial-V2
git clone https://github.com/fadv-tech/Fantini-Inicial-V2.git
cd Fantini-Inicial-V2

# 8. Instalar dependências do projeto
echo -e "${BLUE}📦 Instalando dependências do projeto...${NC}"
pnpm install --silent

# 9. Criar arquivo .env
echo -e "${BLUE}⚙️  Criando arquivo .env...${NC}"
cat > .env << EOF
# Database
DATABASE_URL=mysql://legalmail:${DB_PASSWORD}@localhost:3306/legalmail_peticionamento

# JWT Secret
JWT_SECRET=${JWT_SECRET}

# LegalMail API
LEGALMAIL_API_KEY=${LEGALMAIL_API_KEY}

# App Config
VITE_APP_TITLE=Sistema de Peticionamento LegalMail
VITE_APP_LOGO=/logo.svg

# OAuth (opcional)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=
OWNER_OPEN_ID=
OWNER_NAME=

# Storage Local (não usar S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=
EOF

echo -e "${GREEN}✅ Arquivo .env criado${NC}"

# 10. Criar tabelas no banco
echo -e "${BLUE}🗄️  Criando tabelas no banco...${NC}"
mysql -u legalmail -p${DB_PASSWORD} legalmail_peticionamento < create-tables.sql

echo -e "${GREEN}✅ Tabelas criadas com sucesso${NC}"

# 11. Popular tribunais
echo -e "${BLUE}🌱 Populando tribunais...${NC}"
pnpm seed

# 12. Criar pasta para arquivos eternos
echo -e "${BLUE}📁 Criando pasta para arquivos permanentes...${NC}"
mkdir -p ~/arquivos-eternos
chmod 755 ~/arquivos-eternos

echo -e "${GREEN}✅ Pasta criada: ~/arquivos-eternos${NC}"

# 13. Gerar PDFs de teste (se ImageMagick estiver instalado)
if command -v convert &> /dev/null; then
    echo -e "${BLUE}📄 Gerando PDFs de teste...${NC}"
    bash gerar-pdfs-teste.sh
else
    echo -e "${YELLOW}⚠️  ImageMagick não instalado. Pulando geração de PDFs de teste.${NC}"
    echo -e "${YELLOW}   Para instalar: sudo apt install imagemagick${NC}"
fi

# 14. Resumo da instalação
echo ""
echo -e "${GREEN}=============================================================="
echo -e "✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo -e "==============================================================${NC}"
echo ""
echo -e "${BLUE}📊 Resumo da Instalação:${NC}"
echo ""
echo -e "  🗄️  Banco de dados: ${GREEN}legalmail_peticionamento${NC}"
echo -e "  👤 Usuário MySQL: ${GREEN}legalmail${NC}"
echo -e "  🔐 Senha MySQL: ${GREEN}${DB_PASSWORD}${NC}"
echo -e "  🔑 JWT Secret: ${GREEN}${JWT_SECRET:0:20}...${NC}"
echo -e "  🔑 LegalMail API Key: ${GREEN}${LEGALMAIL_API_KEY:0:20}...${NC}"
echo -e "  📁 Arquivos permanentes: ${GREEN}~/arquivos-eternos/${NC}"
echo -e "  🏛️  Tribunais populados: ${GREEN}27 tribunais${NC}"
echo ""
echo -e "${BLUE}🚀 Para iniciar o servidor:${NC}"
echo ""
echo -e "  ${GREEN}cd ~/Fantini-Inicial-V2${NC}"
echo -e "  ${GREEN}pnpm dev${NC}"
echo ""
echo -e "${BLUE}🌐 Depois acesse:${NC}"
echo ""
echo -e "  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}💾 IMPORTANTE: Salve estas credenciais em local seguro!${NC}"
echo ""
echo -e "${BLUE}📝 Credenciais salvas em: ~/Fantini-Inicial-V2/.env${NC}"
echo ""
