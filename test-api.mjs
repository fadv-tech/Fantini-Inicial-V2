#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.LEGALMAIL_API_KEY;
const BASE_URL = 'https://app.legalmail.com.br';

if (!API_KEY) {
  console.error('LEGALMAIL_API_KEY não configurada');
  process.exit(1);
}

async function testEndpoint(endpoint, params = {}) {
  const queryParams = new URLSearchParams({
    api_key: API_KEY,
    ...params,
  });
  const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;
  
  console.log(`\n📍 Testando: ${endpoint}`);
  if (Object.keys(params).length > 0) {
    console.log(`Parâmetros:`, params);
  }
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log(`Status: ${response.status}`);
    
    const text = await response.text();
    console.log(`Resposta (primeiros 500 caracteres):`);
    console.log(text.substring(0, 500));
    
    try {
      const json = JSON.parse(text);
      console.log(`\nJSON parseado:`, JSON.stringify(json, null, 2).substring(0, 500));
      
      // Verificar estrutura
      if (Array.isArray(json)) {
        console.log(`✅ Retorna um array com ${json.length} elementos`);
      } else if (json.data && Array.isArray(json.data)) {
        console.log(`✅ Retorna { data: [...] } com ${json.data.length} elementos`);
      } else if (json.tipos && Array.isArray(json.tipos)) {
        console.log(`✅ Retorna { tipos: [...] } com ${json.tipos.length} elementos`);
      } else {
        console.log(`⚠️  Estrutura desconhecida:`, Object.keys(json));
      }
    } catch (e) {
      console.log(`❌ Não é JSON válido`);
    }
  } catch (error) {
    console.error(`❌ Erro:`, error.message);
  }
}

async function main() {
  console.log('🧪 Testando endpoints da API LegalMail\n');
  
  // Testar tipos de petição com parâmetros como classes/assuntos
  console.log('\n=== Testando /api/v1/petition/types ===');
  await testEndpoint('/api/v1/petition/types');
  await testEndpoint('/api/v1/petition/types', { tribunal: 'TJSP', sistema: 'esaj' });
  await testEndpoint('/api/v1/petition/types', { tribunal: 'TJGO', sistema: 'projudi' });
  await testEndpoint('/api/v1/petition/types', { tribunal: 'TJSP', sistema: 'esaj', comarca: 'SAO PAULO' });
  await testEndpoint('/api/v1/petition/types', { tribunal: 'TJSP', sistema: 'esaj', comarca: 'SAO PAULO', classe: '1' });
  
  // Testar tipos de anexo com parâmetros
  console.log('\n=== Testando /api/v1/petition/attachment/types ===');
  await testEndpoint('/api/v1/petition/attachment/types');
  await testEndpoint('/api/v1/petition/attachment/types', { tribunal: 'TJSP', sistema: 'esaj' });
  await testEndpoint('/api/v1/petition/attachment/types', { tribunal: 'TJGO', sistema: 'projudi' });
  
  // Testar classes (funciona com parâmetros)
  console.log('\n=== Testando /api/v1/petition/classes (referência) ===');
  await testEndpoint('/api/v1/petition/classes', { tribunal: 'TJSP', sistema: 'esaj', comarca: 'SAO PAULO' });
}

main();
