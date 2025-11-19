/**
 * Script de Teste 5: Listar Certificados Digitais Disponíveis
 * 
 * Objetivo: Obter lista de certificados cadastrados no workspace LegalMail
 * Endpoint: GET /api/v1/workspace/certificates
 * 
 * Os certificados são necessários para protocolar petições
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

async function listarCertificados() {
  console.log("🔍 Testando: Listar Certificados Digitais Disponíveis\n");
  console.log("📡 Endpoint: GET /api/v1/workspace/certificates");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/workspace/certificates?api_key=${API_KEY}`;

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

    const certificados = JSON.parse(responseText);

    if (Array.isArray(certificados) && certificados.length > 0) {
      console.log(`✅ ${certificados.length} certificado(s) encontrado(s)!\n`);
      
      certificados.forEach((cert, index) => {
        console.log(`📜 Certificado ${index + 1}:`);
        console.log(`   ID: ${cert.idcertificados}`);
        console.log(`   Advogado: ${cert.advogado_nome || 'N/A'}`);
        console.log(`   Vencimento: ${cert.vencimento || 'N/A'}`);
        console.log("");
      });
      
      // Pegar primeiro certificado
      const primeiroCert = certificados[0];
      console.log("🎯 Usar certificado:");
      console.log(`   ID: ${primeiroCert.idcertificados}`);
      console.log("   ↳ Use este ID no campo fk_certificado ao criar petição\n");
      
      // Salvar resposta completa
      const fs = await import('fs/promises');
      await fs.writeFile(
        '/home/ubuntu/legalmail-peticionamento/scripts-teste/05-response.json',
        JSON.stringify(certificados, null, 2)
      );
      console.log("💾 Resposta completa salva em: 05-response.json");
      
      return certificados;
    } else {
      console.log("⚠️  Nenhum certificado encontrado no workspace");
      console.log("Resposta:", responseText);
    }

  } catch (error) {
    console.error("❌ Erro ao executar teste:");
    console.error(error);
  }
}

listarCertificados();
