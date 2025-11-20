/**
 * Script de Teste 11: Sincronizar Tribunal (Buscar Tipos de Petição e Anexo)
 * 
 * Objetivo: Testar o fluxo completo de sincronização de um tribunal:
 * 1. Buscar processo no LegalMail
 * 2. Criar petição intermediária mock
 * 3. Buscar tipos de petição disponíveis
 * 4. Buscar tipos de anexo disponíveis
 * 5. Limpar petição mock (opcional)
 * 
 * Uso: node 11-sincronizar-tribunal.mjs <numeroCNJ>
 * Exemplo: node 11-sincronizar-tribunal.mjs 0123456-78.2024.8.09.0051
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY || "a48badb3-cf79-6dcc-5b57-cb87f1f660cf";

/**
 * Normalizar CNJ para formato esperado pela API
 */
function normalizeCNJ(cnjParcial) {
  // Remover tudo exceto dígitos, pontos e hífens
  const cleaned = cnjParcial.trim().replace(/[^\d.-]/g, '');
  
  // Se já tem hífen, assumir que está no formato correto
  if (cleaned.includes('-')) {
    // Validar comprimento
    if (cleaned.length !== 25) {
      throw new Error(`CNJ com formato incorreto: esperado 25 caracteres, obtido ${cleaned.length}`);
    }
    return cleaned;
  }
  
  // Caso contrário, normalizar
  const parts = cleaned.split('.');
  
  if (parts.length !== 6) {
    throw new Error(`CNJ inválido: esperado 6 blocos, encontrado ${parts.length}`);
  }
  
  const firstBlock = parts[0].padStart(7, '0');
  const normalized = `${firstBlock}-${parts.slice(1).join('.')}`;
  
  if (normalized.length !== 25) {
    throw new Error(`CNJ normalizado inválido: esperado 25 caracteres, obtido ${normalized.length}`);
  }
  
  return normalized;
}

/**
 * Buscar processo no LegalMail
 */
async function buscarProcesso(numeroCNJ) {
  console.log("\n📍 ETAPA 1: Buscar Processo no LegalMail");
  console.log(`🔍 Número CNJ: ${numeroCNJ}`);
  
  const cnjNormalizado = normalizeCNJ(numeroCNJ);
  console.log(`📋 CNJ Normalizado: ${cnjNormalizado}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/process/detail?api_key=${API_KEY}&numero_processo=${encodeURIComponent(cnjNormalizado)}`;

  try {
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error("❌ Erro ao buscar processo:");
      console.error(responseText);
      return null;
    }

    const processos = JSON.parse(responseText);
    
    if (!Array.isArray(processos) || processos.length === 0) {
      console.error("❌ Processo não encontrado ou resposta inválida");
      console.log("Resposta:", JSON.stringify(processos, null, 2));
      return null;
    }
    
    const result = processos[0];

    console.log("✅ Processo encontrado!");
    console.log(`   ID: ${result.idprocessos}`);
    console.log(`   Número: ${result.numero_processo || result.numero}`);
    console.log(`   Tribunal: ${result.tribunal || 'N/A'}`);
    console.log(`   Sistema: ${result.sistema_tribunal || result.sistema || 'N/A'}`);
    
    return result;

  } catch (error) {
    console.error("❌ Erro ao buscar processo:");
    console.error(error.message);
    return null;
  }
}

/**
 * Criar petição intermediária mock
 */
async function criarPeticaoMock(idprocessos) {
  console.log("\n📍 ETAPA 2: Criar Petição Intermediária Mock");
  console.log(`🔗 ID Processo: ${idprocessos}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/intermediate?api_key=${API_KEY}`;
  
  // Certificado padrão (Wesley Fantini - ID: 2562)
  const payload = {
    fk_processo: idprocessos,
    fk_certificado: 2562
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const responseText = await response.text();
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error("❌ Erro ao criar petiu00e7ão mock:");
      console.error(responseText);
      return null;
    }

    const result = JSON.parse(responseText);
    
    const idPeticoes = result.idPeticoes || result.idpeticoes;
    
    if (!result || !idPeticoes) {
      console.error("❌ Petiu00e7ão mock não criada ou resposta inválida");
      console.log("Resposta:", JSON.stringify(result, null, 2));
      return null;
    }

    console.log("✅ Petiu00e7ão mock criada!");
    console.log(`   ID Petiu00e7ão: ${idPeticoes}`);
    
    result.idPeticoes = idPeticoes; // Normalizar campo
    return result;

  } catch (error) {
    console.error("❌ Erro ao criar petição mock:");
    console.error(error.message);
    return null;
  }
}

/**
 * Buscar tipos de petição disponíveis
 */
async function buscarTiposPeticao(idPeticoes) {
  console.log("\n📍 ETAPA 3: Buscar Tipos de Petição Disponíveis");
  console.log(`🔗 ID Petição: ${idPeticoes}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/types?api_key=${API_KEY}&idpeticoes=${idPeticoes}`;
  console.log(`🌐 URL: ${url.replace(API_KEY, 'API_KEY')}\n`);

  try {
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error("❌ Erro ao buscar tipos de petição:");
      console.error(responseText);
      return null;
    }

    const result = JSON.parse(responseText);
    
    // API pode retornar array direto ou objeto com propriedade 'pecas'
    let pecas;
    if (Array.isArray(result)) {
      pecas = result;
    } else if (result && Array.isArray(result.pecas)) {
      pecas = result.pecas;
    } else {
      console.error("❌ Tipos de petiu00e7ão não encontrados ou resposta inválida");
      console.log("Resposta:", JSON.stringify(result, null, 2));
      return null;
    }

    console.log(`✅ ${pecas.length} tipos de petiu00e7ão encontrados:\n`);
    
    pecas.slice(0, 10).forEach(peca => {
      console.log(`   ${peca.idpecas}. ${peca.nome}`);
    });
    
    if (pecas.length > 10) {
      console.log(`   ... e mais ${pecas.length - 10} tipos`);
    }
    
    return pecas;

  } catch (error) {
    console.error("❌ Erro ao buscar tipos de petição:");
    console.error(error.message);
    return null;
  }
}

/**
 * Buscar tipos de anexo disponíveis
 */
async function buscarTiposAnexo(idPeticoes) {
  console.log("\n📍 ETAPA 4: Buscar Tipos de Anexo Disponíveis");
  console.log(`🔗 ID Petição: ${idPeticoes}\n`);

  const url = `${LEGALMAIL_BASE_URL}/api/v1/petition/attachment/types?api_key=${API_KEY}&idpeticoes=${idPeticoes}`;

  try {
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error("❌ Erro ao buscar tipos de anexo:");
      console.error(responseText);
      return null;
    }

    const result = JSON.parse(responseText);
    
    // API pode retornar array direto ou objeto com propriedade 'tipos'
    let tipos;
    if (Array.isArray(result)) {
      tipos = result;
    } else if (result && Array.isArray(result.tipos)) {
      tipos = result.tipos;
    } else {
      console.log("⚠️  Tribunal não aceita tipos de anexo ou resposta vazia");
      return [];
    }
    
    if (tipos.length === 0) {
      console.log("⚠️  Nenhum tipo de anexo disponível");
      return [];
    }

    console.log(`✅ ${tipos.length} tipos de anexo encontrados:\n`);
    
    tipos.slice(0, 10).forEach(tipo => {
      const id = tipo.id || tipo.iddocumentos_tipos;
      console.log(`   ${id}. ${tipo.nome}`);
    });
    
    if (tipos.length > 10) {
      console.log(`   ... e mais ${tipos.length - 10} tipos`);
    }
    
    return tipos;

  } catch (error) {
    console.error("❌ Erro ao buscar tipos de anexo:");
    console.error(error.message);
    return null;
  }
}

/**
 * Fluxo completo de sincronização
 */
async function sincronizarTribunal(numeroCNJ) {
  console.log("═══════════════════════════════════════════════════════");
  console.log("🔄 TESTE: Sincronização de Tribunal");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`📋 Número CNJ: ${numeroCNJ}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);

  // Etapa 1: Buscar processo
  const processo = await buscarProcesso(numeroCNJ);
  if (!processo) {
    console.log("\n❌ Falha na Etapa 1: Processo não encontrado");
    return;
  }

  // Etapa 2: Criar petição mock
  const peticao = await criarPeticaoMock(processo.idprocessos);
  if (!peticao) {
    console.log("\n❌ Falha na Etapa 2: Não foi possível criar petição mock");
    return;
  }

  // Etapa 3: Buscar tipos de petição
  const tiposPeticao = await buscarTiposPeticao(peticao.idPeticoes);
  if (!tiposPeticao) {
    console.log("\n❌ Falha na Etapa 3: Não foi possível buscar tipos de petição");
    return;
  }

  // Etapa 4: Buscar tipos de anexo
  const tiposAnexo = await buscarTiposAnexo(peticao.idPeticoes);
  // Tipos de anexo podem ser null/vazio para alguns tribunais (TJGO)

  // Resumo final
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`📊 Processo: ${processo.numero} (ID: ${processo.idprocessos})`);
  console.log(`📊 Petição Mock: ID ${peticao.idPeticoes}`);
  console.log(`📊 Tipos de Petição: ${tiposPeticao.length} disponíveis`);
  console.log(`📊 Tipos de Anexo: ${tiposAnexo ? tiposAnexo.length : 0} disponíveis`);
  
  if (tiposPeticao.length > 0) {
    console.log(`\n💡 Sugestão de tipo padrão: ${tiposPeticao[0].idpecas} - ${tiposPeticao[0].nome}`);
  }
  
  if (tiposAnexo && tiposAnexo.length > 0) {
    console.log(`💡 Sugestão de anexo padrão: ${tiposAnexo[0].id} - ${tiposAnexo[0].nome}`);
  } else {
    console.log(`💡 Tribunal não aceita tipos de anexo (usar null)`);
  }

  // Salvar resultado completo
  const fs = await import('fs/promises');
  const resultado = {
    processo: {
      id: processo.idprocessos,
      numero: processo.numero,
      tribunal: processo.tribunal,
      sistema: processo.sistema,
    },
    peticaoMock: {
      id: peticao.idPeticoes,
    },
    tiposPeticao: tiposPeticao.map(p => ({ id: p.idpecas, nome: p.nome })),
    tiposAnexo: tiposAnexo ? tiposAnexo.map(t => ({ id: t.id, nome: t.nome })) : [],
  };
  
  await fs.writeFile(
    '/home/ubuntu/legalmail-peticionamento/scripts-teste/11-response.json',
    JSON.stringify(resultado, null, 2)
  );
  console.log("\n💾 Resultado completo salvo em: scripts-teste/11-response.json");
  
  console.log("\n⚠️  NOTA: A petição mock (ID: " + peticao.idPeticoes + ") foi criada mas não deletada.");
  console.log("   Você pode deletá-la manualmente no LegalMail se necessário.");
}

// Validar argumentos
const numeroCNJ = process.argv[2];

if (!numeroCNJ) {
  console.error("❌ Erro: Número CNJ não fornecido");
  console.error("\nUso: node 11-sincronizar-tribunal.mjs <numeroCNJ>");
  console.error("Exemplo: node 11-sincronizar-tribunal.mjs 0123456-78.2024.8.09.0051");
  console.error("\nDica: Use um número de processo válido do tribunal que deseja sincronizar");
  process.exit(1);
}

// Executar sincronização
sincronizarTribunal(numeroCNJ);
