/**
 * Script de Teste 4: Listar Tipos de Petição Disponíveis
 * 
 * Objetivo: Buscar tipos de petição (peças) disponíveis para uma petição intermediária
 * Endpoint: GET /api/v1/petition/types
 * 
 * Este endpoint retorna os tipos padronizados pelo LegalMail para o tribunal específico
 * Exemplo: Petição, Requerimento, Manifestação, etc.
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function listarTiposPeticao(idPeticoes) {
  console.log("🔍 Testando: Listar Tipos de Petição Disponíveis\n");
  console.log("📡 Endpoint: GET /api/v1/petition/types");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);
  console.log(`📋 idPeticoes: ${idPeticoes}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/types?api_key=${API_KEY}&idPeticoes=${idPeticoes}`;

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

    console.log("✅ Tipos de petição obtidos com sucesso!\n");
    
    if (result.pecas && Array.isArray(result.pecas)) {
      console.log(`📋 ${result.pecas.length} tipos disponíveis:\n`);
      
      result.pecas.forEach(peca => {
        console.log(`  ${peca.idpecas}. ${peca.nome}`);
      });
      
      console.log("");
      
      // Procurar tipo "Manifestação" (do nosso PDF de teste)
      const manifestacao = result.pecas.find(p => p.nome === 'Manifestação');
      if (manifestacao) {
        console.log("🎯 Tipo 'Manifestação' encontrado:");
        console.log(`   ID: ${manifestacao.idpecas}`);
        console.log("   ↳ Use este ID no campo fk_peca ao fazer upload\n");
      }
      
      // Salvar resposta completa
      const fs = await import('fs/promises');
      await fs.writeFile(
        '/home/ubuntu/legalmail-peticionamento/scripts-teste/04-response.json',
        JSON.stringify(result, null, 2)
      );
      console.log("💾 Resposta completa salva em: 04-response.json");
      
      return result.pecas;
    } else {
      console.log("⚠️  Resposta não contém array 'pecas'");
      console.log("Resposta:", JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

// Usar idPeticoes criado no script anterior (será passado como argumento)
const idPeticoes = parseInt(process.argv[2]);

if (!idPeticoes) {
  console.error("❌ Erro: idPeticoes não fornecido");
  console.error("Uso: node 04-listar-tipos-peticao.mjs <idPeticoes>");
  console.error("Exemplo: node 04-listar-tipos-peticao.mjs 123456");
  process.exit(1);
}

listarTiposPeticao(idPeticoes);
