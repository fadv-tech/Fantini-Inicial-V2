# 🧪 Guias de Teste - Sistema de Peticionamento LegalMail

Este documento contém links para todos os guias de teste e instalação do sistema.

---

## 📚 Guias Disponíveis

### 1. 🚀 [GUIA-TESTE-MANUS-CLOUD.md](./GUIA-TESTE-MANUS-CLOUD.md)
**Testar no Manus Cloud (ambiente atual)**

Use este guia se você quer testar o sistema que já está rodando no Manus Cloud.

**Características:**
- ✅ Sistema já configurado e rodando
- ✅ Storage S3 automático
- ✅ Banco TiDB cloud
- ✅ URL pública: https://3000-xxx.manusvm.computer

**Tempo estimado:** 15-20 minutos

---

### 2. 🐧 [GUIA-INSTALACAO-UBUNTU-LOCAL.md](./GUIA-INSTALACAO-UBUNTU-LOCAL.md)
**Instalar em Ubuntu local (do zero)**

Use este guia se você quer instalar o sistema em um Ubuntu zerado com Node v20.18.2.

**Características:**
- 📦 Instalação completa do zero
- 🗄️ MySQL local
- 📁 Storage em filesystem (`~/arquivos-eternos/`)
- 🌐 URL local: http://localhost:3000

**Tempo estimado:** 30-40 minutos

---

## 🛠️ Scripts Auxiliares

### `seed-tribunais.mjs`
Popula a tabela `tribunal_configs` com os 27 tribunais brasileiros.

```bash
node seed-tribunais.mjs
```

**Saída esperada:**
```
🌱 Iniciando seed de tribunais...
  ✅ TJAC (8.01)
  ✅ TJAL (8.02)
  ...
  ✅ TJTO (8.27)

✅ 27 tribunais inseridos com sucesso!
```

---

### `gerar-pdfs-teste.sh`
Gera PDFs de teste com nomes CNJ válidos para testar upload e protocolização.

```bash
bash gerar-pdfs-teste.sh
```

**Requer:** ImageMagick (`sudo apt install imagemagick`)

**Saída esperada:**
```
📄 Gerando PDFs de teste...
  ✅ PDF 1 criado: 0123456-78.2024.8.09.0051-PETICAO.pdf
  ✅ PDF 2 criado: 0789012-34.2024.8.09.0001-PETICAO.pdf
  ✅ PDF 3 criado: 0456789-01.2024.8.09.0137-PETICAO.pdf
  ✅ Anexo 1 criado: 0123456-78.2024.8.09.0051-ANEXO-1.pdf
  ✅ Anexo 2 criado: 0123456-78.2024.8.09.0051-ANEXO-2.pdf

✅ 5 PDFs de teste criados em pdfs-teste/
```

---

### `create-tables.sql`
Script SQL para criar todas as 6 tabelas do sistema.

```bash
# Manus Cloud (TiDB)
mysql -h <host> -u <user> -p<password> <database> < create-tables.sql

# Ubuntu Local (MySQL)
mysql -u legalmail -p legalmail_peticionamento < create-tables.sql
```

**Tabelas criadas:**
- `users` - Usuários do sistema
- `tribunal_configs` - Configurações dos 27 tribunais
- `bateladas` - Bateladas de protocolização
- `batelada_processos` - Processos de cada batelada
- `arquivos_enviados` - Arquivos (PDFs) enviados
- `logs_auditoria` - Logs detalhados de todas as operações

---

## 🎯 Fluxo de Teste Recomendado

### Para Manus Cloud:
1. Ler [GUIA-TESTE-MANUS-CLOUD.md](./GUIA-TESTE-MANUS-CLOUD.md)
2. Executar `node seed-tribunais.mjs`
3. Executar `bash gerar-pdfs-teste.sh`
4. Seguir passos do guia (upload, configuração, protocolização)
5. Verificar arquivamento em S3
6. Verificar logs no banco TiDB

### Para Ubuntu Local:
1. Ler [GUIA-INSTALACAO-UBUNTU-LOCAL.md](./GUIA-INSTALACAO-UBUNTU-LOCAL.md)
2. Instalar MySQL e dependências
3. Clonar repositório do GitHub
4. Configurar `.env`
5. Executar `create-tables.sql`
6. Executar `node seed-tribunais.mjs`
7. Executar `bash gerar-pdfs-teste.sh`
8. Iniciar servidor com `pnpm dev`
9. Seguir passos do guia (upload, configuração, protocolização)
10. Verificar arquivamento em `~/arquivos-eternos/`
11. Verificar logs no banco MySQL local

---

## 📊 Comparação: Manus Cloud vs Ubuntu Local

| Aspecto | Manus Cloud | Ubuntu Local |
|---------|-------------|--------------|
| **Instalação** | ✅ Já pronto | 🔧 Manual (30-40min) |
| **Storage** | S3 (AWS) | Filesystem local |
| **Banco** | TiDB (cloud) | MySQL (local) |
| **URL** | https://3000-xxx.manusvm.computer | http://localhost:3000 |
| **OAuth** | Manus OAuth | Opcional |
| **Escalabilidade** | ✅ Alta | ⚠️ Limitada |
| **Custo** | 💰 Pago | 🆓 Grátis |
| **Backup** | ✅ Automático | 🔧 Manual |
| **Monitoramento** | ✅ Integrado | 🔧 Manual |

---

## 🐛 Troubleshooting Comum

### Erro: "Tabelas não encontradas"
```bash
# Executar script SQL
mysql -u <user> -p <database> < create-tables.sql
```

### Erro: "Cannot connect to database"
Verificar variável `DATABASE_URL` no `.env`:
```env
DATABASE_URL=mysql://user:password@host:port/database
```

### Erro: "Permission denied" (arquivos eternos)
```bash
chmod -R 755 ~/arquivos-eternos/
```

### Erro: "ImageMagick not found"
```bash
sudo apt install imagemagick
```

---

## 📞 Suporte

- **Documentação técnica:** [REVISAO-SISTEMA.md](./REVISAO-SISTEMA.md)
- **Compatibilidade:** [COMPATIBILIDADE.md](./COMPATIBILIDADE.md)
- **Logging:** [LOGGING-DETALHADO.md](./LOGGING-DETALHADO.md)
- **GitHub:** https://github.com/fadv-tech/legalmail-peticionamento

---

## ✅ Checklist de Validação

Após completar os testes, verifique:

- [ ] Tribunais populados (27 registros)
- [ ] Sincronização com LegalMail funcionando
- [ ] Upload de PDFs funcionando (parsing CNJ automático)
- [ ] Protocolização em background funcionando (SSE)
- [ ] Arquivamento permanente funcionando (S3 ou filesystem)
- [ ] Logs truncados no banco (payload Base64 não salvo completo)
- [ ] Verificação de status via API LegalMail funcionando
- [ ] Interface de Auditoria mostrando histórico completo

---

## 🎉 Sucesso!

Se todos os testes passaram, o sistema está **100% operacional**! 🚀

**Próximos passos:**
- Configurar HTTPS (produção)
- Configurar backup automático
- Configurar monitoramento
- Implementar reprocessamento de erros
- Adicionar dashboard analítico
