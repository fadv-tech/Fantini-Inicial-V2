# 🚀 Guia de Teste - Manus Cloud

Este guia mostra como testar o sistema **já rodando** no Manus Cloud (ambiente atual).

---

## ✅ Pré-requisitos

- Sistema já está rodando em: https://3000-ijemx7lbwof3q36if97ef-7ab20da6.manusvm.computer
- Banco de dados TiDB já configurado
- Storage S3 já configurado
- Todas as tabelas já criadas

---

## 📋 Passo a Passo

### 1️⃣ Popular Tribunais (Seed)

Execute o script de seed para criar os 27 tribunais:

```bash
cd /home/ubuntu/legalmail-peticionamento
node seed-tribunais.mjs
```

**Resultado esperado:**
```
✅ 27 tribunais inseridos com sucesso!
```

---

### 2️⃣ Acessar o Sistema

Abra no navegador:
```
https://3000-ijemx7lbwof3q36if97ef-7ab20da6.manusvm.computer
```

**Páginas disponíveis:**
- `/` - Home (dashboard)
- `/upload` - Upload de PDFs
- `/send` - Enviar Petições
- `/configuracoes` - Configurar Tribunais
- `/auditoria` - Ver Logs

---

### 3️⃣ Configurar Tribunais

1. Acesse `/configuracoes`
2. Clique em **"Sincronizar Todos"** para buscar tipos de petição/anexo da API LegalMail
3. Aguarde sincronização (pode demorar ~30s)
4. Verifique que os dropdowns foram populados

**Resultado esperado:**
- Badge "Sincronizado" em verde
- Dropdowns com opções de tipos de petição/anexo

---

### 4️⃣ Fazer Upload de PDFs de Teste

1. Acesse `/upload`
2. Arraste os PDFs de teste (criados no passo 4 do guia)
3. Verifique que o sistema detectou CNJ, codProc, codPet automaticamente

**Arquivos de teste:**
- `0123456-78.2024.8.09.0051-PETICAO.pdf` (TJGO)
- `0789012-34.2024.8.09.0001-PETICAO.pdf` (TJGO)
- `0456789-01.2024.8.09.0137-PETICAO.pdf` (TJGO)

**Resultado esperado:**
```
✅ 3 arquivos processados
✅ CNJ detectado: 0123456-78.2024.8.09.0051
✅ Tribunal: TJGO (8.09)
```

---

### 5️⃣ Protocolar Batelada

1. Acesse `/send`
2. Selecione certificado (Wesley Fantini - ID 2562)
3. Clique em **"Protocolar Batelada"**
4. Observe progresso em tempo real via SSE

**Resultado esperado:**
- Barra de progresso atualizando (0% → 100%)
- LOG detalhado em tempo real:
  ```
  [INFO] Iniciando processamento da batelada #1
  [INFO] Processo 1/3: 0123456-78.2024.8.09.0051
  [INFO] Buscando processo no LegalMail...
  [SUCESSO] Processo encontrado (idprocessos: 12345)
  [INFO] Criando petição...
  [SUCESSO] Petição criada (idpeticoes: 67890)
  [INFO] Fazendo upload do PDF principal...
  [INFO] Arquivo arquivado permanentemente: s3://bucket/arquivos-eternos/2024/11/20/...
  [SUCESSO] Upload concluído (3.2 MB em 4.5s)
  [INFO] Protocolando petição...
  [SUCESSO] Petição protocolada! Protocolo: 2024/123456
  ```
- Toast de sucesso ao concluir

---

### 6️⃣ Verificar Arquivamento Permanente (S3)

**No Manus Cloud, os arquivos são salvos no S3:**

```bash
# Verificar que arquivos foram salvos (via logs)
cd /home/ubuntu/legalmail-peticionamento
mysql -h <host> -u <user> -p<password> <database> -e "SELECT arquivoPermanentePath, arquivoPermanenteUrl FROM arquivos_enviados LIMIT 5;"
```

**Resultado esperado:**
```
| arquivoPermanentePath                              | arquivoPermanenteUrl                                    |
|----------------------------------------------------|---------------------------------------------------------|
| arquivos-eternos/2024/11/20/CNJ-0123456-78...pdf   | https://s3.amazonaws.com/bucket/arquivos-eternos/...    |
```

---

### 7️⃣ Verificar Logs no Banco

```bash
mysql -h <host> -u <user> -p<password> <database> -e "SELECT etapa, status, mensagem, tempoExecucaoMs FROM logs_auditoria WHERE bateladaId = 1 ORDER BY createdAt LIMIT 10;"
```

**Resultado esperado:**
```
| etapa                  | status  | mensagem                          | tempoExecucaoMs |
|------------------------|---------|-----------------------------------|-----------------|
| buscar_processo        | sucesso | Processo encontrado               | 1234            |
| criar_peticao          | sucesso | Petição criada                    | 2345            |
| upload_pdf             | sucesso | Upload concluído                  | 4567            |
| protocolar             | sucesso | Petição protocolada               | 8901            |
```

**Verificar que payload Base64 foi truncado:**
```bash
mysql -h <host> -u <user> -p<password> <database> -e "SELECT requestPayload FROM logs_auditoria WHERE etapa = 'upload_pdf' LIMIT 1;"
```

**Resultado esperado:**
```json
{
  "file": "[TRUNCADO - 3.2 MB]",
  "filename": "peticao.pdf"
}
```

---

### 8️⃣ Verificar Status via API LegalMail

1. Acesse `/auditoria`
2. Clique em **"Verificar Status"** na batelada
3. Aguarde consulta à API LegalMail
4. Veja modal com resultados

**Resultado esperado:**
```
✅ Verificação concluída: 3 petições verificadas

Petição #67890
[Badge Verde] Protocolada
Protocolo: 2024/123456
Data: 20/11/2024 10:30:15

Petição #67891
[Badge Azul] Enviada
(aguardando protocolização)

Petição #67892
[Badge Vermelho] Erro
Erro: Certificado inválido
```

---

## 🎯 Checklist de Validação

- [ ] Tribunais populados (27 registros)
- [ ] Sincronização funcionando (tipos de petição/anexo)
- [ ] Upload de PDFs funcionando (parsing CNJ automático)
- [ ] Protocolização em background funcionando (SSE em tempo real)
- [ ] Arquivamento permanente no S3 funcionando
- [ ] Logs truncados no banco (payload Base64 não salvo completo)
- [ ] Verificação de status via API LegalMail funcionando
- [ ] Interface de Auditoria mostrando histórico completo

---

## 🐛 Troubleshooting

### Erro: "Tabelas não encontradas"
```bash
cd /home/ubuntu/legalmail-peticionamento
mysql -h <host> -u <user> -p<password> <database> < create-tables.sql
```

### Erro: "Certificado não encontrado"
Verifique que o certificado Wesley Fantini (ID 2562) existe na API LegalMail.

### Erro: "Timeout ao fazer upload"
Arquivo muito grande. O timeout é dinâmico (30s + 10s/MB, máximo 5min).

### Erro: "S3 access denied"
Verifique que as variáveis de ambiente S3 estão configuradas:
```bash
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_S3_BUCKET
```

---

## 📊 Métricas Esperadas

| Operação | Tempo Médio | Timeout |
|----------|-------------|---------|
| Buscar processo | 1-3s | 30s |
| Criar petição | 1-2s | 30s |
| Upload PDF 3MB | 4-6s | 60s |
| Upload PDF 10MB | 12-18s | 130s |
| Protocolar | 5-10s | 90s |

---

## ✅ Sucesso!

Se todos os passos funcionaram, o sistema está **100% operacional** no Manus Cloud! 🎉
