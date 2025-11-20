import { sseManager } from "./sse-progress";
import { legalMailRequest } from "./legalmail-client";
import { hybridStoragePut, calculateFileHash, hybridStorageRead, bufferToBase64 } from "./hybrid-storage";
import { arquivarPDF, truncarPayloadBase64 } from "./arquivo-permanente";
import { 
  updateBatelada, 
  createBateladaProcesso, 
  createLogAuditoria,
  getArquivosByBatelada,
  updateBateladaProcesso,
  getArquivosByProcesso
} from "./db";
import { parsePdfFileName, groupAndIdentifyMainFiles } from "../shared/pdfParser";
import type { ParsedFile } from "../shared/pdfParser";

// Timeouts por etapa (em ms)
const TIMEOUTS = {
  BUSCAR_PROCESSO: 30000,      // 30s - rápido, só busca no banco
  CRIAR_PETICAO: 30000,         // 30s - rápido, só cria registro
  PROTOCOLAR: 90000,            // 90s - lento, assina digitalmente
};

/**
 * Calcula timeout dinâmico baseado no tamanho do arquivo
 * Fórmula: 30s base + 10s por MB (máximo 5 minutos)
 * 
 * Exemplos:
 * - 1MB: 30s + (1 * 10s) = 40s
 * - 5MB: 30s + (5 * 10s) = 80s
 * - 10MB: 30s + (10 * 10s) = 130s
 * - 20MB: 30s + (20 * 10s) = 230s
 * - 30MB+: limitado a 300s (5min)
 */
function calcularTimeoutUpload(tamanhoBytes: number): number {
  const BASE_TIMEOUT = 30000; // 30s
  const TIMEOUT_POR_MB = 10000; // 10s por MB
  const MAX_TIMEOUT = 300000; // 5 minutos
  
  const tamanhoMB = tamanhoBytes / (1024 * 1024);
  const timeout = BASE_TIMEOUT + (tamanhoMB * TIMEOUT_POR_MB);
  
  return Math.min(timeout, MAX_TIMEOUT);
}

// Usar ProcessGroup do pdfParser
import type { ProcessGroup } from "../shared/pdfParser";

/**
 * Processa uma batelada em background com progresso em tempo real via SSE
 */
export async function processBatch(bateladaId: number, certificadoId: number) {
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  try {
    // LOG: Início
    await createLogAuditoria({
      bateladaId,
      etapa: "iniciar_processamento",
      status: "sucesso",
      mensagem: `Iniciando processamento da batelada ${bateladaId}`,
      tempoExecucaoMs: 0,
    });

    sseManager.sendEvent(bateladaId, "log", {
      type: "log",
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      message: "🚀 Iniciando protocolização em batelada...",
      level: "info",
    });

    // 1. Buscar arquivos da batelada
    const arquivos = await getArquivosByBatelada(bateladaId);
    
    if (arquivos.length === 0) {
      throw new Error("Nenhum arquivo encontrado na batelada");
    }

    // 2. Agrupar por processo (CNJ)
    const parsed = arquivos.map((arq: any) => parsePdfFileName(arq.nomeOriginal));
    const groups = groupAndIdentifyMainFiles(parsed);

    // 3. Separar por tribunal (criar sub-bateladas se necessário)
    const groupedByTribunal = new Map<string, ProcessGroup[]>();
    
    groups.forEach(group => {
      const tribunal = group.codigoTribunal;
      if (!groupedByTribunal.has(tribunal)) {
        groupedByTribunal.set(tribunal, []);
      }
      groupedByTribunal.get(tribunal)!.push(group);
    });

    sseManager.sendEvent(bateladaId, "log", {
      type: "log",
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      message: `📊 ${groups.length} processo(s) identificado(s) em ${groupedByTribunal.size} tribunal(is)`,
      level: "info",
    });

    // 4. Processar cada tribunal separadamente
    let currentIndex = 0;
    const totalProcessos = groups.length;

    for (const [tribunal, processos] of Array.from(groupedByTribunal.entries())) {
      sseManager.sendEvent(bateladaId, "log", {
        type: "log",
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        message: `🏛️ Processando ${processos.length} processo(s) do ${tribunal}...`,
        level: "info",
      });

      // Processar cada processo do tribunal
      for (const processo of processos) {
        currentIndex++;

        // Verificar flag de parada
        if (sseManager.shouldStop(bateladaId)) {
          sseManager.sendEvent(bateladaId, "stopped", {
            type: "stopped",
            message: "Processamento interrompido pelo usuário",
          });

          await updateBatelada(bateladaId, {
            status: "parado",
            concluidoEm: new Date(),
          });

          await createLogAuditoria({
            bateladaId,
            etapa: "parar_processamento",
            status: "sucesso",
            mensagem: "Processamento interrompido pelo usuário",
            tempoExecucaoMs: Date.now() - startTime,
          });

          sseManager.closeConnections(bateladaId);
          return;
        }

        // Atualizar progresso
        sseManager.sendEvent(bateladaId, "progress", {
          type: "progress",
          current: currentIndex,
          total: totalProcessos,
          currentProcess: processo.numeroCNJ,
          successCount,
          errorCount,
          warningCount,
        });

        try {
          await processarProcesso(bateladaId, processo, certificadoId);
          successCount++;

          sseManager.sendEvent(bateladaId, "log", {
            type: "log",
            timestamp: new Date().toLocaleTimeString("pt-BR"),
            message: `✅ ${processo.numeroCNJ} protocolado com sucesso (${currentIndex}/${totalProcessos})`,
            level: "success",
          });

        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

          sseManager.sendEvent(bateladaId, "log", {
            type: "log",
            timestamp: new Date().toLocaleTimeString("pt-BR"),
            message: `❌ ERRO: ${processo.numeroCNJ} - ${errorMessage}`,
            level: "error",
          });

          await createLogAuditoria({
            bateladaId,
            etapa: "processar_processo",
            status: "erro",
            mensagem: `Erro ao processar ${processo.numeroCNJ}: ${errorMessage}`,
            erro: errorMessage,
            tempoExecucaoMs: 0,
          });
        }
      }
    }

    // 5. Finalizar
    await updateBatelada(bateladaId, {
      sucessos: successCount,
      falhas: errorCount,
      status: "concluido",
      concluidoEm: new Date(),
    });

    sseManager.sendEvent(bateladaId, "complete", {
      type: "complete",
      successCount,
      errorCount,
      warningCount,
    });

    sseManager.sendEvent(bateladaId, "log", {
      type: "log",
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      message: `🎉 Batelada concluída! ✅ ${successCount} sucessos | ❌ ${errorCount} erros`,
      level: "success",
    });

    await createLogAuditoria({
      bateladaId,
      etapa: "concluir_processamento",
      status: "sucesso",
      mensagem: `Batelada concluída: ${successCount} sucessos, ${errorCount} erros`,
      tempoExecucaoMs: Date.now() - startTime,
    });

    // Fechar conexões SSE
    setTimeout(() => {
      sseManager.closeConnections(bateladaId);
    }, 5000); // Aguardar 5s para garantir que mensagens foram recebidas

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    await updateBatelada(bateladaId, {
      status: "erro",
      concluidoEm: new Date(),
    });

    sseManager.sendEvent(bateladaId, "error", {
      type: "error",
      message: errorMessage,
    });

    await createLogAuditoria({
      bateladaId,
      etapa: "processar_batelada",
      status: "erro",
      mensagem: `Erro fatal na batelada: ${errorMessage}`,
      erro: errorMessage,
      tempoExecucaoMs: Date.now() - startTime,
    });

    sseManager.closeConnections(bateladaId);
  }
}

/**
 * Processa um único processo (CNJ) com sua petição principal e anexos
 */
async function processarProcesso(
  bateladaId: number,
  processo: ProcessGroup,
  certificadoId: number
): Promise<void> {
  const stepStart = Date.now();

  // 1. Buscar processo no LegalMail
  sseManager.sendEvent(bateladaId, "log", {
    type: "log",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    message: `🔍 Buscando processo ${processo.numeroCNJ} no LegalMail...`,
    level: "info",
  });

  const searchResult = await withTimeout(
    legalMailRequest<any>({
      method: "GET",
      endpoint: "/api/v1/process/detail",
      params: { numero_processo: processo.numeroCNJ }
    }),
    TIMEOUTS.BUSCAR_PROCESSO, // 30s
    `Timeout ao buscar processo ${processo.numeroCNJ}`
  );

  await createLogAuditoria({
    bateladaId,
    etapa: "buscar_processo",
    status: "sucesso",
    mensagem: `Processo ${processo.numeroCNJ} encontrado`,
    requestUrl: `/api/v1/process/detail?numero_processo=${processo.numeroCNJ}`,
    requestMethod: "GET",
    responseStatus: 200,
    responsePayload: searchResult,
    tempoExecucaoMs: Date.now() - stepStart,
  });

  if (!searchResult || !searchResult.idprocessos) {
    throw new Error(`Processo ${processo.numeroCNJ} não encontrado no LegalMail`);
  }

  const idprocessos = searchResult.idprocessos;

  // 2. Criar petição intermediária
  sseManager.sendEvent(bateladaId, "log", {
    type: "log",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    message: `📝 Criando petição intermediária...`,
    level: "info",
  });

  const createPetitionPayload = {
    idprocessos,
    fk_certificado: certificadoId,
  };

  const createResult = await withTimeout(
    legalMailRequest<any>({
      method: "POST",
      endpoint: "/api/v1/petition/intermediate",
      body: createPetitionPayload
    }),
    TIMEOUTS.CRIAR_PETICAO, // 30s
    "Timeout ao criar petição"
  );

  await createLogAuditoria({
    bateladaId,
    etapa: "criar_peticao",
    status: "sucesso",
    mensagem: `Petição criada: ${createResult.idPeticoes}`,
    requestUrl: "/api/v1/petition/intermediate",
    requestMethod: "POST",
    requestPayload: createPetitionPayload,
    responseStatus: 200,
    responsePayload: createResult,
    tempoExecucaoMs: Date.now() - stepStart,
  });

  const idPeticoes = createResult.idPeticoes;

  // 3. Upload do PDF principal
  if (!processo.principal) {
    throw new Error("Nenhum arquivo principal identificado");
  }

  sseManager.sendEvent(bateladaId, "log", {
    type: "log",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    message: `📤 Enviando PDF principal (${processo.principal.originalName})...`,
    level: "info",
  });

  // Buscar todos os arquivos da batelada e filtrar pelo CNJ do processo
  const todosArquivos = await getArquivosByBatelada(bateladaId);
  const arquivosDoProcesso = todosArquivos.filter((a: any) => a.numeroCNJ === processo.numeroCNJ);
  const arquivoPrincipalData = arquivosDoProcesso.find((a: any) => a.isPrincipal);
  
  if (!arquivoPrincipalData || !arquivoPrincipalData.s3Key) {
    throw new Error(`Arquivo principal não encontrado no storage para processo ${processo.numeroCNJ}`);
  }

  // Ler arquivo do storage híbrido (S3 ou local)
  const pdfBuffer = await hybridStorageRead(arquivoPrincipalData.s3Key);
  const pdfBase64 = bufferToBase64(pdfBuffer);
  
  // Arquivar PDF permanentemente (pasta eterna)
  const { caminhoCompleto: arquivoPermanentePath, url: arquivoPermanenteUrl } = await arquivarPDF(
    pdfBuffer,
    processo.numeroCNJ,
    "PETICAO-INICIAL",
    processo.principal.originalName
  );
  
  sseManager.sendEvent(bateladaId, "log", {
    type: "log",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    message: `💾 Arquivo arquivado permanentemente: ${arquivoPermanentePath}`,
    level: "info",
  });

  // Upload do PDF principal via API LegalMail
  const uploadPdfPayload = {
    idPeticoes,
    arquivo: pdfBase64,
    nomeArquivo: processo.principal.originalName,
  };

  // Timeout dinâmico baseado no tamanho do arquivo
  const timeoutUploadPdf = calcularTimeoutUpload(pdfBuffer.length);
  
  const uploadPdfResult = await withTimeout(
    legalMailRequest<any>({
      method: "POST",
      endpoint: "/api/v1/petition/file",
      body: uploadPdfPayload
    }),
    timeoutUploadPdf, // Dinâmico: 30s base + 10s/MB
    `Timeout ao fazer upload do PDF principal (${Math.round(pdfBuffer.length / (1024 * 1024))}MB, timeout ${timeoutUploadPdf}ms)`
  );

  await createLogAuditoria({
    bateladaId,
    etapa: "upload_pdf_principal",
    status: "sucesso",
    mensagem: `PDF principal enviado: ${processo.principal.originalName} (${Math.round(pdfBuffer.length / 1024)} KB)`,
    requestUrl: "/api/v1/petition/file",
    requestMethod: "POST",
    requestPayload: {
      ...uploadPdfPayload,
      arquivo: truncarPayloadBase64(pdfBase64, pdfBuffer.length), // Truncar Base64
    },
    responseStatus: 200,
    responsePayload: uploadPdfResult,
    tempoExecucaoMs: Date.now() - stepStart,
  });

  // 4. Upload dos anexos
  for (const anexo of processo.anexos) {
    sseManager.sendEvent(bateladaId, "log", {
      type: "log",
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      message: `📎 Enviando anexo (${anexo.originalName})...`,
      level: "info",
    });

    // Buscar arquivo anexo do storage
    const arquivoAnexoData = arquivosDoProcesso.find((a: any) => 
      a.nomeOriginal === anexo.originalName && !a.isPrincipal
    );

    if (!arquivoAnexoData || !arquivoAnexoData.s3Key) {
      sseManager.sendEvent(bateladaId, "log", {
        type: "log",
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        message: `⚠️ Anexo ${anexo.originalName} não encontrado no storage. Pulando...`,
        level: "warning",
      });
      continue;
    }

    // Ler arquivo do storage híbrido
    const anexoBuffer = await hybridStorageRead(arquivoAnexoData.s3Key);
    const anexoBase64 = bufferToBase64(anexoBuffer);

    // Upload do anexo via API LegalMail
    const uploadAnexoPayload = {
      idPeticoes,
      arquivo: anexoBase64,
      nomeArquivo: anexo.originalName,
      tipo: null, // TJGO não aceita tipos de anexo
    };

    // Timeout dinâmico baseado no tamanho do anexo
    const timeoutUploadAnexo = calcularTimeoutUpload(anexoBuffer.length);
    
    const uploadAnexoResult = await withTimeout(
      legalMailRequest<any>({
        method: "POST",
        endpoint: "/api/v1/petition/attachments",
        body: uploadAnexoPayload
      }),
      timeoutUploadAnexo, // Dinâmico: 30s base + 10s/MB
      `Timeout ao fazer upload do anexo ${anexo.originalName} (${Math.round(anexoBuffer.length / (1024 * 1024))}MB, timeout ${timeoutUploadAnexo}ms)`
    );

    await createLogAuditoria({
      bateladaId,
      etapa: "upload_anexo",
      status: "sucesso",
      mensagem: `Anexo enviado: ${anexo.originalName} (${Math.round(anexoBuffer.length / 1024)} KB)`,
      requestUrl: "/api/v1/petition/attachments",
      requestMethod: "POST",
      requestPayload: {
        ...uploadAnexoPayload,
        arquivo: truncarPayloadBase64(anexoBase64, anexoBuffer.length), // Truncar Base64
      },
      responseStatus: 200,
      responsePayload: uploadAnexoResult,
      tempoExecucaoMs: Date.now() - stepStart,
    });
  }

  // 5. Buscar tipo de petição padrão do tribunal
  const { getTribunalConfig } = await import("./db");
  const tribunalConfig = await getTribunalConfig(processo.codigoTribunal);

  if (!tribunalConfig || !tribunalConfig.tipoPeticaoPadrao) {
    throw new Error(`Tipo de petição padrão não configurado para tribunal ${processo.codigoTribunal}`);
  }

  // 6. Protocolar
  sseManager.sendEvent(bateladaId, "log", {
    type: "log",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    message: `⚖️ Protocolando petição (tipo: ${tribunalConfig.tipoPeticaoPadrao})...`,
    level: "info",
  });

  const protocolPayload = {
    idPeticoes,
    tipo: tribunalConfig.tipoPeticaoPadrao,
  };

  const protocolResult = await withTimeout(
    legalMailRequest<any>({
      method: "POST",
      endpoint: "/api/v1/petition/intermediate/send",
      body: protocolPayload
    }),
    TIMEOUTS.PROTOCOLAR, // 90s
    "Timeout ao protocolar petição"
  );

  await createLogAuditoria({
    bateladaId,
    etapa: "protocolar",
    status: "sucesso",
    mensagem: `Petição protocolada com sucesso! Protocolo: ${protocolResult.protocolo || 'N/A'}`,
    requestUrl: "/api/v1/petition/protocol",
    requestMethod: "POST",
    requestPayload: protocolPayload,
    responseStatus: 200,
    responsePayload: protocolResult,
    tempoExecucaoMs: Date.now() - stepStart,
  });

  // 7. Salvar no banco
  await createBateladaProcesso({
    bateladaId,
    numeroCNJ: processo.numeroCNJ,
    idprocessos,
    idpeticoes: idPeticoes,
    arquivoPrincipal: processo.principal.originalName,
    totalAnexos: processo.anexos.length,
    status: "sucesso",
  });
}

/**
 * Executa uma promise com timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}
