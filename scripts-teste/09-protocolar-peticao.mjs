/**
 * Script de Teste 9: Protocolar Petição Intermediária
 * 
 * Objetivo: Enviar a petição para protocolização no tribunal
 * Endpoint: POST /api/v1/petition/intermediate/send
 * 
 * ATENÇÃO: Esta ação é IRREVERSÍVEL e irá protocolar a petição no tribunal real!
 * 
 * idPeticoes: 362701
 * idprocessos: 41541
 * idcertificados: 1466 (FREDE SA DE MOURA)
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function protocolarPeticao(idpeticoes, idprocessos, idcertificados) {
  console.log("🔍 Testando: Protocolar Petição Intermediária\n");
  console.log("⚠️  ATENÇÃO: Esta ação é IRREVERSÍVEL!\n");
  console.log("📡 Endpoint: POST /api/v1/petition/intermediate/send");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);
  console.log(`📋 idpeticoes: ${idpeticoes}`);
  console.log(`📋 idprocessos: ${idprocessos}`);
  console.log(`📋 idcertificados: ${idcertificados}\n`);

  const fk_peca = parseInt(process.argv[6]) || 1; // Tipo de petição (1 = genérico)
  
  const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/intermediate/send?api_key=${API_KEY}&idpeticoes=${idpeticoes}&idprocessos=${idprocessos}&fk_peca=${fk_peca}`;

  console.log(`🌐 URL: ${url.replace(API_KEY, 'API_KEY')}\n`);

  // Confirmação de segurança
  const confirmar = process.argv[5];
  if (confirmar !== '--confirmar') {
    console.log("⚠️  Para protocolar a petição, execute novamente com --confirmar:");
    console.log(`   node 09-protocolar-peticao.mjs ${idpeticoes} ${idprocessos} ${idcertificados} --confirmar\n`);
    console.log("💡 Verifique se:");
    console.log("   1. O PDF principal foi enviado corretamente");
    console.log("   2. O certificado está correto");
    console.log("   3. Você realmente deseja protocolar no tribunal\n");
    return;
  }

  console.log("🚀 Protocolando petição...\n");

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}\n`);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("❌ Erro na protocolização:");
      console.error(responseText);
      return;
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { response: responseText };
    }

    console.log("✅ Petição protocolada com sucesso!\n");
    console.log("📄 Resposta:");
    console.log(JSON.stringify(result, null, 2));
    console.log("");

    // Salvar resposta
    const fs = await import('fs/promises');
    await fs.writeFile(
      '/home/ubuntu/legalmail-peticionamento/scripts-teste/09-response.json',
      JSON.stringify(result, null, 2)
    );
    console.log("💾 Resposta salva em: 09-response.json");
    
    console.log("\n🎯 Próximos passos:");
    console.log("   1. Aguardar processamento pelo LegalMail");
    console.log("   2. Consultar status com: GET /api/v1/petition/status");
    console.log("   3. Verificar no painel do LegalMail se foi protocolado");

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

// Parâmetros
const idpeticoes = parseInt(process.argv[2]);
const idprocessos = parseInt(process.argv[3]);
const idcertificados = parseInt(process.argv[4]) || 1466;

if (!idpeticoes || !idprocessos) {
  console.error("❌ Erro: Parâmetros obrigatórios não fornecidos");
  console.error("Uso: node 09-protocolar-peticao.mjs <idpeticoes> <idprocessos> [idcertificados] --confirmar");
  console.error("Exemplo: node 09-protocolar-peticao.mjs 362701 41541 1466 --confirmar");
  process.exit(1);
}

protocolarPeticao(idpeticoes, idprocessos, idcertificados);
