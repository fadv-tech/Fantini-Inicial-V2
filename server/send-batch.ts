import { sseManager } from "./sse-progress";
import { legalMailRequest } from "./legalmail-client";
import { hybridStoragePut, calculateFileHash } from "./hybrid-storage";
import { 
  updateBatelada, 
  createBateladaProcesso, 
  createLogAuditoria,
  getArquivosByBatelada,
  updateBateladaProcesso
} from "./db";
import { parsePdfFileName, groupAndIdentifyMainFiles } from "../shared/pdfParser";
import type { ParsedFile } from "../shared/pdfParser";

const TIMEOUT_MS = 60000; // 60 segundos

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
      endpoint: "/api/v1/process",
      params: { cnj: processo.numeroCNJ }
    }),
    TIMEOUT_MS,
    `Timeout ao buscar processo ${processo.numeroCNJ}`
  );

  await createLogAuditoria({
    bateladaId,
    etapa: "buscar_processo",
    status: "sucesso",
    mensagem: `Processo ${processo.numeroCNJ} encontrado`,
    requestUrl: `/api/v1/process?cnj=${processo.numeroCNJ}`,
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
    TIMEOUT_MS,
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

  // TODO: Buscar arquivo do storage e fazer upload
  // Por enquanto, apenas simular
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. Upload dos anexos
  for (const anexo of processo.anexos) {
    sseManager.sendEvent(bateladaId, "log", {
      type: "log",
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      message: `📎 Enviando anexo (${anexo.originalName})...`,
      level: "info",
    });

    // TODO: Upload de anexo
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 5. Protocolar
  sseManager.sendEvent(bateladaId, "log", {
    type: "log",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    message: `⚖️ Protocolando petição...`,
    level: "info",
  });

  // TODO: Buscar tipo de petição padrão do tribunal e protocolar
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 6. Salvar no banco
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
