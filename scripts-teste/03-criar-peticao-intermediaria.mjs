/**
 * Script de Teste 3: Criar Petição Intermediária
 * 
 * Objetivo: Criar uma petição intermediária no processo encontrado
 * Endpoint: POST /api/v1/petition/intermediate
 * 
 * Processo de teste: 5645881-12.2022.8.09.0051 (idprocessos: 41541)
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function criarPeticaoIntermediaria(idprocessos) {
  console.log("🔍 Testando: Criar Petição Intermediária\n");
  console.log("📡 Endpoint: POST /api/v1/petition/intermediate");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);
  console.log(`📋 idprocessos: ${idprocessos}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/intermediate?api_key=${API_KEY}`;

  // Payload para criar petição intermediária (certificado obrigatório)
  const fk_certificado = parseInt(process.argv[3]) || 1466; // Certificado padrão: FREDE SA DE MOURA
  
  const payload = {
    fk_processo: idprocessos,
    fk_certificado: fk_certificado
  };
  
  console.log(`🔐 Certificado selecionado: ${fk_certificado}\n`);

  console.log("📤 Payload enviado:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("");

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}\n`);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("❌ Erro na requisição:");
      console.error(responseText);
      return;
    }

    const result = JSON.parse(responseText);

    console.log("✅ Petição intermediária criada com sucesso!\n");
    console.log("📄 Resposta:");
    console.log(JSON.stringify(result, null, 2));
    console.log("");

    if (result.idPeticoes || result.idpeticoes) {
      const idPeticoes = result.idPeticoes || result.idpeticoes;
      console.log(`🎯 idPeticoes: ${idPeticoes}`);
      console.log("   ↳ Use este ID para upload de arquivos e protocolização\n");
      
      // Salvar resposta completa
      const fs = await import('fs/promises');
      await fs.writeFile(
        '/home/ubuntu/legalmail-peticionamento/scripts-teste/03-response.json',
        JSON.stringify(result, null, 2)
      );
      console.log("💾 Resposta completa salva em: 03-response.json\n");
      
      return idPeticoes;
    }

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

// Usar idprocessos do processo real encontrado
const idprocessos = parseInt(process.argv[2]) || 41541;
criarPeticaoIntermediaria(idprocessos);
