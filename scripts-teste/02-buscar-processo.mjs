/**
 * Script de Teste 2: Buscar Processo por Número CNJ
 * 
 * Objetivo: Obter idprocessos do LegalMail a partir do número CNJ
 * Endpoint: GET /api/v1/process/detail
 * 
 * Teste com processo real: 5645881.12.2022.8.09.0051
 * CNJ Normalizado: 5645881-12.2022.8.09.0051
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

// Função de normalização CNJ
function normalizeCNJ(cnjParcial) {
  const cleaned = cnjParcial.trim().replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  
  if (parts.length !== 6) {
    throw new Error(`CNJ inválido: esperado 6 blocos, encontrado ${parts.length}`);
  }
  
  const firstBlock = parts[0].padStart(7, '0');
  const normalized = `${firstBlock}-${parts.slice(1).join('.')}`;
  
  if (normalized.length !== 25) {
    throw new Error(`CNJ normalizado inválido: esperado 25 caracteres, obtido ${normalized.length}`);
  }
  
  return normalized;
}

async function buscarProcesso(numeroCNJ) {
  console.log("🔍 Testando: Buscar Processo por Número CNJ\n");
  console.log("📡 Endpoint: GET /api/v1/process/detail");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  // Normalizar CNJ
  const cnjNormalizado = normalizeCNJ(numeroCNJ);
  console.log(`📋 CNJ Original: ${numeroCNJ}`);
  console.log(`📋 CNJ Normalizado: ${cnjNormalizado}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/process/detail?api_key=${API_KEY}&numero_processo=${encodeURIComponent(cnjNormalizado)}`;

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

    const processos = JSON.parse(responseText);

    if (Array.isArray(processos) && processos.length > 0) {
      console.log(`✅ Processo encontrado!\n`);
      
      const processo = processos[0];
      console.log("📄 Dados do Processo:");
      console.log(`  - idprocessos: ${processo.idprocessos}`);
      console.log(`  - hash_processo: ${processo.hash_processo}`);
      console.log(`  - numero_processo: ${processo.numero_processo}`);
      console.log(`  - tribunal: ${processo.tribunal || 'N/A'}`);
      console.log(`  - sistema_tribunal: ${processo.sistema_tribunal || 'N/A'}`);
      console.log(`  - juizo: ${processo.juizo || 'N/A'}`);
      console.log(`  - classe: ${processo.nome_classe || 'N/A'}`);
      console.log(`  - polo_ativo: ${processo.poloativo_nome || 'N/A'}`);
      console.log(`  - polo_passivo: ${processo.polopassivo_nome || 'N/A'}`);
      
      // Salvar resposta completa
      const fs = await import('fs/promises');
      await fs.writeFile(
        '/home/ubuntu/legalmail-peticionamento/scripts-teste/02-response.json',
        JSON.stringify(processos, null, 2)
      );
      console.log("\n💾 Resposta completa salva em: 02-response.json");
      
      return processo;
    } else {
      console.log("⚠️  Processo não encontrado no LegalMail");
      console.log("Resposta:", responseText);
    }

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

// Testar com processo real fornecido
const numeroCNJ = process.argv[2] || "5645881.12.2022.8.09.0051";
buscarProcesso(numeroCNJ);
