# 📚 Aprendizados da API LegalMail - TJGO/Projudi

Documento gerado após testes extensivos com a API do LegalMail para peticionamento no TJGO.

---

## ✅ Fluxo Validado e Funcionando

### 1. Listar Tribunais
```bash
GET /api/v1/petition/tribunals?api_key=XXX
```
- ✅ **Funciona perfeitamente**
- Retorna 89 tribunais
- TJGO confirmado com sistema "projudi"

### 2. Buscar Processo por CNJ
```bash
GET /api/v1/process/detail?api_key=XXX&numero_processo=5645881-12.2022.8.09.0051
```
- ✅ **Funciona perfeitamente**
- Retorna `idprocessos`, `hash_processo`, dados das partes, etc.
- **Processo de teste:** 5645881-12.2022.8.09.0051 → idprocessos: 41541

### 3. Listar Certificados
```bash
GET /api/v1/workspace/certificates?api_key=XXX
```
- ✅ **Funciona perfeitamente**
- Retorna certificados cadastrados no workspace
- **Certificados disponíveis:**
  - ID 1466: FREDE SA DE MOURA (vence 02/09/2026)
  - ID 2562: WESLEY FANTINI DE ABREU (vence 02/07/2026)

### 4. Criar Petição Intermediária
```bash
POST /api/v1/petition/intermediate?api_key=XXX
Body: {
  "fk_processo": 41541,
  "fk_certificado": 1466
}
```
- ✅ **Funciona perfeitamente**
- Retorna `idpeticoes` e `hash_peticao`
- **Petição de teste:** idPeticoes: 362701

### 5. Upload do PDF Principal
```bash
POST /api/v1/petition/file?api_key=XXX&idpeticoes=362701&idprocessos=41541
Body: multipart/form-data com arquivo PDF
```
- ✅ **Funciona perfeitamente**
- Aceita PDFs de até vários MB
- Retorna `"success"` quando bem sucedido
- **Arquivo testado:** 512 KB enviado com sucesso

### 6. Protocolar Petição
```bash
POST /api/v1/petition/intermediate/send?api_key=XXX&idpeticoes=362701&idprocessos=41541&idcertificados=1466
```
- ⏸️ **Não testado** (aguardando confirmação para protocolar de verdade)
- Script pronto em: `09-protocolar-peticao.mjs`

---

## ❌ Limitações Descobertas

### 1. Anexos Separados NÃO Funcionam no TJGO

**Endpoint testado:**
```bash
POST /api/v1/petition/attachments?api_key=XXX&idpeticoes=362701&fk_documentos_tipos=1
```

**Resultado:** ❌ Sempre retorna erro
```json
{
  "status": "error",
  "message": "Tipo de documento informado não é válido para a petição. Consulte os tipos disponíveis para a petição em /api/v1/petition/attachment/types."
}
```

**Endpoint de tipos de anexo:**
```bash
GET /api/v1/petition/attachment/types?api_key=XXX&idpeticoes=362701
```

**Resultado:** Array vazio `[]`

**Tipos testados:** 0, 1, 2, 3, null, vazio → Todos falharam

### 2. Endpoint de Tipos de Petição Não Existe

**Endpoint testado:**
```bash
GET /api/v1/petition/types?api_key=XXX&idPeticoes=362701
```

**Resultado:** ❌ "Parâmetros ausentes"

Este endpoint não existe ou não é necessário para petições intermediárias.

---

## 🎯 Conclusões e Estratégia

### Para TJGO/Projudi:

1. **✅ Todos os documentos devem ser mesclados em um único PDF**
   - Petição principal + todos os anexos = 1 PDF único
   - Usar ferramenta de merge de PDFs antes do envio

2. **✅ Fluxo simplificado:**
   ```
   1. Buscar processo por CNJ → obter idprocessos
   2. Criar petição intermediária → obter idpeticoes
   3. Mesclar todos os PDFs em um único arquivo
   4. Upload do PDF mesclado via /api/v1/petition/file
   5. Protocolar via /api/v1/petition/intermediate/send
   ```

3. **✅ Não há necessidade de:**
   - Listar tipos de petição
   - Listar tipos de anexo
   - Fazer upload de anexos separados

---

## 📋 Arquivos de Teste Usados

1. **Petição principal:**
   - Nome: `5645881.12.2022.8.09.0051_12693_56814_Manifestação.pdf`
   - Tamanho: 512.59 KB
   - Status: ✅ Enviado com sucesso

2. **Anexo (não enviado):**
   - Nome: `5645881.12.2022.8.09.0051LourdesIaccino-Contrato.pdf`
   - Tamanho: 1152.23 KB
   - Status: ⚠️ Deve ser mesclado com o principal

---

## 🔧 Scripts Criados

Todos os scripts estão em `/scripts-teste/`:

1. `01-listar-tribunais.mjs` → Lista todos os tribunais
2. `02-buscar-processo.mjs` → Busca processo por CNJ
3. `03-criar-peticao-intermediaria.mjs` → Cria petição
4. `04-listar-tipos-peticao.mjs` → ❌ Endpoint não existe
5. `05-listar-certificados.mjs` → Lista certificados
6. `06-upload-pdf-principal.mjs` → Upload do PDF
7. `07-upload-anexo.mjs` → ❌ Não funciona no TJGO
8. `08-listar-tipos-anexo.mjs` → Retorna array vazio
9. `09-protocolar-peticao.mjs` → Protocola (com confirmação)
10. `10-testar-anexo-tipos.mjs` → Testa todos os tipos

---

## 📊 Dados de Teste

**Processo:** 5645881-12.2022.8.09.0051
- **idprocessos:** 41541
- **Tribunal:** TJGO
- **Sistema:** projudi
- **Classe:** Cumprimento de Sentença contra a Fazenda Pública
- **Autor:** LOURDES IACCINO
- **Réu:** MUNICIPIO DE GOIANIA

**Petição criada:** 362701
- **hash_peticao:** d063532d-97b0-4530-abcc-4d1e7ffa079f
- **Certificado:** 1466 (FREDE SA DE MOURA)
- **PDF enviado:** ✅ Sim (512 KB)
- **Protocolada:** ⏸️ Não (aguardando confirmação)

---

## 🚀 Próximos Passos Recomendados

1. **Implementar merge de PDFs** no sistema
   - Usar biblioteca Node.js como `pdf-lib` ou `pdfkit`
   - Mesclar petição principal + anexos antes do envio

2. **Criar fluxo de batelada:**
   - Agrupar arquivos por processo (CNJ)
   - Identificar petição principal vs anexos
   - Mesclar automaticamente
   - Enviar para LegalMail

3. **Sistema de LOG detalhado:**
   - Registrar todos os JSONs (request/response)
   - Salvar erros com stack trace
   - Permitir debug fácil de problemas

4. **Interface de usuário:**
   - Upload múltiplo de PDFs
   - Preview dos arquivos agrupados
   - Seleção de certificado
   - Botão "Protocolizar Batelada"

---

**Documentação criada em:** 2025-01-19  
**Versão da API:** v1  
**Tribunal testado:** TJGO (Projudi)
