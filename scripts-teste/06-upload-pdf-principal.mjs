/**
 * Script de Teste 6: Upload do PDF Principal da Petição
 * 
 * Objetivo: Fazer upload do arquivo PDF principal da petição intermediária
 * Endpoint: POST /api/v1/petition/file
 * 
 * Arquivo de teste: 5645881.12.2022.8.09.0051_12693_56814_Manifestação.pdf
 * idPeticoes: 362701
 * idprocessos: 41541
 */

import { readFile } from 'fs/promises';

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function uploadPdfPrincipal(idpeticoes, idprocessos, pdfPath) {
  console.log("🔍 Testando: Upload do PDF Principal\n");
  console.log("📡 Endpoint: POST /api/v1/petition/file");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);
  console.log(`📋 idpeticoes: ${idpeticoes}`);
  console.log(`📋 idprocessos: ${idprocessos}`);
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

    const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/file?api_key=${API_KEY}&idpeticoes=${idpeticoes}&idprocessos=${idprocessos}`;

    console.log(`🌐 URL: ${url.replace(API_KEY, 'API_KEY')}\n`);
    console.log("📤 Enviando arquivo...\n");

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
      return;
    }

    console.log("✅ Upload do PDF principal realizado com sucesso!\n");
    console.log("📄 Resposta:");
    console.log(responseText);
    console.log("");

    // Salvar resposta
    const fs = await import('fs/promises');
    await fs.writeFile(
      '/home/ubuntu/legalmail-peticionamento/scripts-teste/06-response.json',
      JSON.stringify({ response: responseText, status: response.status }, null, 2)
    );
    console.log("💾 Resposta salva em: 06-response.json");

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

// Parâmetros
const idpeticoes = parseInt(process.argv[2]);
const idprocessos = parseInt(process.argv[3]);
const pdfPath = process.argv[4] || '/home/ubuntu/upload/5645881.12.2022.8.09.0051_12693_56814_Manifestação.pdf';

if (!idpeticoes || !idprocessos) {
  console.error("❌ Erro: Parâmetros obrigatórios não fornecidos");
  console.error("Uso: node 06-upload-pdf-principal.mjs <idpeticoes> <idprocessos> [pdfPath]");
  console.error("Exemplo: node 06-upload-pdf-principal.mjs 362701 41541 /path/to/file.pdf");
  process.exit(1);
}

uploadPdfPrincipal(idpeticoes, idprocessos, pdfPath);
