/**
 * Script de Teste 10: Testar Upload de Anexo com Diferentes Tipos
 * 
 * Objetivo: Descobrir qual tipo de documento funciona para anexos
 * Endpoint: POST /api/v1/petition/attachments (SEM idprocessos!)
 * 
 * Vamos testar: 0, 1, 2, 3, null, vazio
 */

import { readFile } from 'fs/promises';

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function testarAnexoComTipo(idpeticoes, tipo, pdfPath) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testando com tipo: ${tipo === null ? 'null' : tipo === '' ? 'vazio' : tipo}`);
  console.log('='.repeat(60));

  try {
    const pdfBuffer = await readFile(pdfPath);
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const fileName = pdfPath.split('/').pop();
    formData.append('file', blob, fileName);

    let url;
    if (tipo === null) {
      // Sem o parâmetro
      url = `${LEGALMAIL_BASE_URL}/api/v1/petition/attachments?api_key=${API_KEY}&idpeticoes=${idpeticoes}`;
    } else if (tipo === '') {
      // Vazio
      url = `${LEGALMAIL_BASE_URL}/api/v1/petition/attachments?api_key=${API_KEY}&idpeticoes=${idpeticoes}&fk_documentos_tipos=`;
    } else {
      // Com valor
      url = `${LEGALMAIL_BASE_URL}/api/v1/petition/attachments?api_key=${API_KEY}&idpeticoes=${idpeticoes}&fk_documentos_tipos=${tipo}`;
    }

    console.log(`🌐 URL: ${url.replace(API_KEY, 'API_KEY')}`);

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    
    if (response.ok) {
      console.log(`✅ SUCESSO com tipo ${tipo}!`);
      console.log(`📄 Resposta: ${responseText}`);
      return { tipo, sucesso: true, resposta: responseText };
    } else {
      console.log(`❌ Falhou: ${responseText.substring(0, 150)}`);
      return { tipo, sucesso: false, erro: responseText };
    }

  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return { tipo, sucesso: false, erro: error.message };
  }
}

async function testarTodosOsTipos(idpeticoes, pdfPath) {
  console.log("🔍 Testando Upload de Anexo com Diferentes Tipos\n");
  console.log(`📋 idpeticoes: ${idpeticoes}`);
  console.log(`📄 Arquivo: ${pdfPath}\n`);

  const tiposParaTestar = [
    0,      // Zero
    1,      // Um
    2,      // Dois  
    3,      // Três
    null,   // Sem parâmetro
    '',     // Vazio
  ];

  const resultados = [];

  for (const tipo of tiposParaTestar) {
    const resultado = await testarAnexoComTipo(idpeticoes, tipo, pdfPath);
    resultados.push(resultado);
    
    if (resultado.sucesso) {
      console.log(`\n🎉 ENCONTRAMOS! Tipo ${tipo} funciona!\n`);
      break; // Para no primeiro sucesso
    }
    
    // Pequeno delay entre tentativas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  
  resultados.forEach(r => {
    const tipoStr = r.tipo === null ? 'null' : r.tipo === '' ? 'vazio' : r.tipo;
    const status = r.sucesso ? '✅' : '❌';
    console.log(`${status} Tipo ${tipoStr}: ${r.sucesso ? 'SUCESSO' : 'FALHOU'}`);
  });

  // Salvar resultados
  const fs = await import('fs/promises');
  await fs.writeFile(
    '/home/ubuntu/legalmail-peticionamento/scripts-teste/10-resultados.json',
    JSON.stringify(resultados, null, 2)
  );
  console.log("\n💾 Resultados salvos em: 10-resultados.json");
}

// Parâmetros
const idpeticoes = parseInt(process.argv[2]);
const pdfPath = process.argv[3] || '/home/ubuntu/upload/5645881.12.2022.8.09.0051LourdesIaccino-Contrato.pdf';

if (!idpeticoes) {
  console.error("❌ Erro: idpeticoes não fornecido");
  console.error("Uso: node 10-testar-anexo-tipos.mjs <idpeticoes> [pdfPath]");
  console.error("Exemplo: node 10-testar-anexo-tipos.mjs 362701");
  process.exit(1);
}

testarTodosOsTipos(idpeticoes, pdfPath);
