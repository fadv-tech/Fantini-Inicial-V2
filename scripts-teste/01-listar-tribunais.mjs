/**
 * Script de Teste 1: Listar Tribunais Disponíveis
 * 
 * Objetivo: Validar conexão com API e obter lista de tribunais
 * Endpoint: GET /api/v1/petition/tribunals
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function listarTribunais() {
  console.log("🔍 Testando: Listar Tribunais Disponíveis\n");
  console.log("📡 Endpoint: GET /api/v1/petition/tribunals");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/tribunals?api_key=${API_KEY}`;

  try {
    const response = await fetch(url);
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro na requisição:");
      console.error(errorText);
      return;
    }

    const responseText = await response.text();
    const tribunais = JSON.parse(responseText);

    console.log(`✅ Sucesso! ${tribunais.length} tribunais encontrados\n`);
    
    // Procurar TJGO
    const tjgo = tribunais.find(t => t.tribunal === 'TJGO');
    if (tjgo) {
      console.log("🎯 TJGO encontrado:");
      console.log(JSON.stringify(tjgo, null, 2));
      console.log("");
    }

    // Mostrar primeiros 5 tribunais
    console.log("📋 Primeiros 5 tribunais:");
    tribunais.slice(0, 5).forEach(t => {
      console.log(`  - ${t.tribunal}: ${t.sistemas.join(', ')}`);
    });

    // Salvar resposta completa
    const fs = await import('fs/promises');
    await fs.writeFile(
      '/home/ubuntu/legalmail-peticionamento/scripts-teste/01-response.json',
      JSON.stringify(tribunais, null, 2)
    );
    console.log("\n💾 Resposta completa salva em: 01-response.json");

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

listarTribunais();
