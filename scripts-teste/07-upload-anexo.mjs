/**
 * Script de Teste 7: Upload de Anexo PDF
 * 
 * Objetivo: Fazer upload de documento anexo à petição intermediária
 * Endpoint: POST /api/v1/petition/attachments
 * 
 * Arquivo de teste: 5645881.12.2022.8.09.0051LourdesIaccino-Contrato.pdf
 * idPeticoes: 362701
 * idprocessos: 41541
 * tipo_documento: 1 (tipo genérico de anexo)
 */

import { readFile } from 'fs/promises';

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function uploadAnexo(idpeticoes, idprocessos, tipo_documento, pdfPath) {
  console.log("🔍 Testando: Upload de Anexo PDF\n");
  console.log("📡 Endpoint: POST /api/v1/petition/attachments");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);
  console.log(`📋 idpeticoes: ${idpeticoes}`);
  console.log(`📋 idprocessos: ${idprocessos}`);
  console.log(`📋 tipo_documento: ${tipo_documento}`);
  console.log(`📄 Arquivo: ${pdfPath}\n`);

  try {
    // Ler arquivo PDF
    const pdfBuffer = await readFile(pdfPath);
    console.log(`📊 Tamanho do arquivo: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);

    // Criar FormData
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const fileName = pdfPath.split('/').pop();
    formData.append('file', blob, fileName);

    const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/attachments?api_key=${API_KEY}&idpeticoes=${idpeticoes}&idprocessos=${idprocessos}&fk_documentos_tipos=${tipo_documento}`;

    console.log(`🌐 URL: ${url.replace(API_KEY, 'API_KEY')}\n`);
    console.log("📤 Enviando anexo...\n");

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}\n`);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("❌ Erro na requisição:");
      console.error(responseText);
      
      // Se erro de tipo inválido, sugerir consultar tipos disponíveis
      if (responseText.includes('tipo_documento')) {
        console.log("\n💡 Dica: Consulte os tipos de documento disponíveis em:");
        console.log("   GET /api/v1/petition/attachment/types?idpeticoes=" + idpeticoes);
      }
      
      return;
    }

    console.log("✅ Upload do anexo realizado com sucesso!\n");
    console.log("📄 Resposta:");
    console.log(responseText);
    console.log("");

    // Salvar resposta
    const fs = await import('fs/promises');
    await fs.writeFile(
      '/home/ubuntu/legalmail-peticionamento/scripts-teste/07-response.json',
      JSON.stringify({ response: responseText, status: response.status }, null, 2)
    );
    console.log("💾 Resposta salva em: 07-response.json");

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

// Parâmetros
const idpeticoes = parseInt(process.argv[2]);
const idprocessos = parseInt(process.argv[3]);
const tipo_documento = parseInt(process.argv[4]) || 1; // Tipo padrão: 1
const pdfPath = process.argv[5] || '/home/ubuntu/upload/5645881.12.2022.8.09.0051LourdesIaccino-Contrato.pdf';

if (!idpeticoes || !idprocessos) {
  console.error("❌ Erro: Parâmetros obrigatórios não fornecidos");
  console.error("Uso: node 07-upload-anexo.mjs <idpeticoes> <idprocessos> [tipo_documento] [pdfPath]");
  console.error("Exemplo: node 07-upload-anexo.mjs 362701 41541 1 /path/to/anexo.pdf");
  process.exit(1);
}

uploadAnexo(idpeticoes, idprocessos, tipo_documento, pdfPath);
