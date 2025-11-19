/**
 * Script de Teste 8: Listar Tipos de Anexo Disponíveis
 * 
 * Objetivo: Buscar tipos de documentos anexos permitidos para uma petição
 * Endpoint: GET /api/v1/petition/attachment/types
 * 
 * Este endpoint retorna os tipos de anexo padronizados pelo LegalMail
 * Exemplo: Procuração, Contrato, Certidão, etc.
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function listarTiposAnexo(idpeticoes) {
  console.log("🔍 Testando: Listar Tipos de Anexo Disponíveis\n");
  console.log("📡 Endpoint: GET /api/v1/petition/attachment/types");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);
  console.log(`📋 idpeticoes: ${idpeticoes}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/attachment/types?api_key=${API_KEY}&idpeticoes=${idpeticoes}`;

  console.log(`🌐 URL: ${url.replace(API_KEY, 'API_KEY')}\n`);

  try {
    const response = await fetch(url);
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}\n`);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("❌ Erro na requisição:");
      console.error(responseText);
      return;
    }

    const result = JSON.parse(responseText);

    console.log("✅ Tipos de anexo obtidos com sucesso!\n");
    
    if (result.tipos && Array.isArray(result.tipos)) {
      console.log(`📋 ${result.tipos.length} tipos disponíveis:\n`);
      
      result.tipos.forEach(tipo => {
        console.log(`  ${tipo.id}. ${tipo.nome}`);
      });
      
      console.log("");
      
      // Procurar tipo "Contrato" (do nosso PDF de teste)
      const contrato = result.tipos.find(t => t.nome && t.nome.toLowerCase().includes('contrato'));
      if (contrato) {
        console.log("🎯 Tipo 'Contrato' encontrado:");
        console.log(`   ID: ${contrato.id}`);
        console.log("   ↳ Use este ID no campo fk_documentos_tipos ao fazer upload\n");
      }
      
      // Salvar resposta completa
      const fs = await import('fs/promises');
      await fs.writeFile(
        '/home/ubuntu/legalmail-peticionamento/scripts-teste/08-response.json',
        JSON.stringify(result, null, 2)
      );
      console.log("💾 Resposta completa salva em: 08-response.json");
      
      return result.tipos;
    } else {
      console.log("📄 Resposta completa:");
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

// Usar idpeticoes criado anteriormente
const idpeticoes = parseInt(process.argv[2]);

if (!idpeticoes) {
  console.error("❌ Erro: idpeticoes não fornecido");
  console.error("Uso: node 08-listar-tipos-anexo.mjs <idpeticoes>");
  console.error("Exemplo: node 08-listar-tipos-anexo.mjs 362701");
  process.exit(1);
}

listarTiposAnexo(idpeticoes);
