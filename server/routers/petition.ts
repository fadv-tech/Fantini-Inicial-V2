/**
 * Router de Petições
 * Procedures tRPC para gerenciar petições, upload de arquivos e protocolização
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { legalMailRequest } from "../legalmail-client";
import { hybridStoragePut, calculateFileHash, generateUniqueFileName } from "../hybrid-storage";
import { parsePdfFileName, groupAndIdentifyMainFiles, type ParsedFile } from "../../shared/pdfParser";
import {
  createBatelada,
  createBateladaProcesso,
  createArquivoEnviado,
  createLogAuditoria,
  getBatelada,
  updateBatelada,
  updateBateladaProcesso,
  getAllBateladas,
  getBateladaProcessos,
  getLogsByBatelada,
  getTribunalConfig,
} from "../db";

/**
 * Lista certificados disponíveis no LegalMail
 */
export const listCertificates = protectedProcedure.query(async () => {
  try {
    const response = await legalMailRequest<{ certificados: any[] }>({
      method: "GET",
      endpoint: "/api/v1/certificate",
    });
    
    if (!response.certificados || !Array.isArray(response.certificados)) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Resposta inválida da API LegalMail",
      });
    }
    
    return response.certificados.map((cert: any) => ({
      id: cert.idcertificados,
      nome: cert.nome,
      vencimento: cert.vencimento,
    }));
  } catch (error) {
    console.error("[listCertificates] Erro:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Erro ao listar certificados",
    });
  }
});

/**
 * Faz parsing de nomes de arquivos PDF
 */
export const parseFiles = protectedProcedure
  .input(
    z.object({
      fileNames: z.array(z.string()),
    })
  )
  .mutation(async ({ input }) => {
    const parsed = input.fileNames.map((fileName) => parsePdfFileName(fileName));
    const groups = groupAndIdentifyMainFiles(parsed);
    
    return {
      parsed,
      groups,
      totalFiles: parsed.length,
      validFiles: parsed.filter((f) => f.isValid).length,
      invalidFiles: parsed.filter((f) => !f.isValid).length,
    };
  });

/**
 * Cria uma nova batelada e faz upload dos arquivos
 */
export const uploadFiles = protectedProcedure
  .input(
    z.object({
      files: z.array(
        z.object({
          name: z.string(),
          content: z.string(), // Base64
          size: z.number(),
        })
      ),
      certificadoId: z.number(),
      certificadoNome: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    // 1. Criar batelada
    const bateladaId = await createBatelada({
      descricao: `Batelada de ${input.files.length} arquivos`,
      totalProcessos: 0, // Será atualizado depois
      totalArquivos: input.files.length,
      sucessos: 0,
      falhas: 0,
      status: "pendente",
      certificadoId: input.certificadoId,
      certificadoNome: input.certificadoNome,
      iniciadoEm: new Date(),
    });
    
    // LOG: Batelada criada
    await createLogAuditoria({
      bateladaId,
      etapa: "criar_batelada",
      status: "sucesso",
      mensagem: `Batelada ${bateladaId} criada com ${input.files.length} arquivos`,
      tempoExecucaoMs: Date.now() - startTime,
    });
    
    // 2. Parse dos nomes de arquivos
    const parsed = input.files.map((file) => ({
      ...parsePdfFileName(file.name),
      content: file.content,
      size: file.size,
    }));
    
    // 3. Agrupar por processo
    const groups = groupAndIdentifyMainFiles(parsed);
    
    // LOG: Arquivos parseados
    await createLogAuditoria({
      bateladaId,
      etapa: "parse_arquivos",
      status: "sucesso",
      mensagem: `${groups.length} processos identificados`,
      requestPayload: {
        totalArquivos: input.files.length,
        arquivosValidos: parsed.filter((f) => f.isValid).length,
        arquivosInvalidos: parsed.filter((f) => !f.isValid).length,
      },
      tempoExecucaoMs: Date.now() - startTime,
    });
    
    // 4. Para cada processo, fazer upload dos arquivos
    const processosIds: number[] = [];
    
    for (const group of groups) {
      const processoStartTime = Date.now();
      
      // Criar registro do processo
      const processoId = await createBateladaProcesso({
        bateladaId,
        numeroCNJ: group.numeroCNJ,
        codigoTribunal: group.codigoTribunal,
        arquivoPrincipal: group.principal?.originalName || null,
        totalAnexos: group.anexos.length,
        status: "pendente",
      });
      
      processosIds.push(processoId);
      
      // Upload do arquivo principal
      if (group.principal) {
        const file = parsed.find((f) => f.originalName === group.principal!.originalName);
        if (file && 'content' in file) {
          try {
            const buffer = Buffer.from(file.content, 'base64');
            const hash = calculateFileHash(buffer);
            const uniqueName = generateUniqueFileName(file.originalName);
            const storageKey = `bateladas/${bateladaId}/processos/${processoId}/${uniqueName}`;
            
            const { key, url } = await hybridStoragePut(storageKey, buffer, 'application/pdf');
            
            await createArquivoEnviado({
              bateladaProcessoId: processoId,
              nomeOriginal: file.originalName,
              nomeNormalizado: file.normalizedName,
              numeroCNJ: file.cnjNormalizado,
              codProc: file.codProc,
              codPet: file.codPet,
              descricao: file.descricao,
              isPrincipal: true,
              tamanhoBytes: file.size,
              s3Key: key,
              s3Url: url,
              uploadStatus: "sucesso",
            });
            
            // LOG: Upload do principal
            await createLogAuditoria({
              bateladaId,
              bateladaProcessoId: processoId,
              numeroCNJ: group.numeroCNJ,
              etapa: "upload_principal",
              status: "sucesso",
              mensagem: `Arquivo principal enviado: ${file.originalName}`,
              requestPayload: {
                arquivo: file.originalName,
                tamanho: file.size,
                hash,
                storageKey: key,
              },
              responsePayload: { url },
              tempoExecucaoMs: Date.now() - processoStartTime,
            });
          } catch (error) {
            await createLogAuditoria({
              bateladaId,
              bateladaProcessoId: processoId,
              numeroCNJ: group.numeroCNJ,
              etapa: "upload_principal",
              status: "erro",
              mensagem: `Erro ao enviar arquivo principal: ${file.originalName}`,
              erro: error instanceof Error ? error.message : String(error),
              tempoExecucaoMs: Date.now() - processoStartTime,
            });
          }
        }
      }
      
      // Upload dos anexos
      for (const anexo of group.anexos) {
        const file = parsed.find((f) => f.originalName === anexo.originalName);
        if (file && 'content' in file) {
          try {
            const buffer = Buffer.from(file.content, 'base64');
            const hash = calculateFileHash(buffer);
            const uniqueName = generateUniqueFileName(file.originalName);
            const storageKey = `bateladas/${bateladaId}/processos/${processoId}/${uniqueName}`;
            
            const { key, url } = await hybridStoragePut(storageKey, buffer, 'application/pdf');
            
            await createArquivoEnviado({
              bateladaProcessoId: processoId,
              nomeOriginal: file.originalName,
              nomeNormalizado: file.normalizedName,
              numeroCNJ: file.cnjNormalizado,
              codProc: file.codProc,
              codPet: file.codPet,
              descricao: file.descricao,
              isPrincipal: false,
              tamanhoBytes: file.size,
              s3Key: key,
              s3Url: url,
              uploadStatus: "sucesso",
            });
            
            // LOG: Upload de anexo
            await createLogAuditoria({
              bateladaId,
              bateladaProcessoId: processoId,
              numeroCNJ: group.numeroCNJ,
              etapa: "upload_anexo",
              status: "sucesso",
              mensagem: `Anexo enviado: ${file.originalName}`,
              requestPayload: {
                arquivo: file.originalName,
                tamanho: file.size,
                hash,
                storageKey: key,
              },
              responsePayload: { url },
              tempoExecucaoMs: Date.now() - processoStartTime,
            });
          } catch (error) {
            await createLogAuditoria({
              bateladaId,
              bateladaProcessoId: processoId,
              numeroCNJ: group.numeroCNJ,
              etapa: "upload_anexo",
              status: "erro",
              mensagem: `Erro ao enviar anexo: ${file.originalName}`,
              erro: error instanceof Error ? error.message : String(error),
              tempoExecucaoMs: Date.now() - processoStartTime,
            });
          }
        }
      }
    }
    
    // 5. Atualizar batelada com total de processos
    await updateBatelada(bateladaId, {
      totalProcessos: groups.length,
      status: "pendente",
    });
    
    // LOG: Upload concluído
    await createLogAuditoria({
      bateladaId,
      etapa: "upload_completo",
      status: "sucesso",
      mensagem: `Upload de ${input.files.length} arquivos concluído em ${groups.length} processos`,
      tempoExecucaoMs: Date.now() - startTime,
    });
    
    return {
      bateladaId,
      totalProcessos: groups.length,
      totalArquivos: input.files.length,
      processosIds,
    };
  });

/**
 * Lista todas as bateladas
 */
export const listBatches = protectedProcedure.query(async () => {
  const bateladas = await getAllBateladas();
  return bateladas;
});

/**
 * Obtém detalhes de uma batelada
 */
export const getBatchDetails = protectedProcedure
  .input(z.object({ bateladaId: z.number() }))
  .query(async ({ input }) => {
    const batelada = await getBatelada(input.bateladaId);
    if (!batelada) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Batelada não encontrada",
      });
    }
    
    const processos = await getBateladaProcessos(input.bateladaId);
    const logs = await getLogsByBatelada(input.bateladaId);
    
    return {
      batelada,
      processos,
      logs,
    };
  });

export const petitionRouter = router({
  listCertificates,
  parseFiles,
  uploadFiles,
  listBatches,
  getBatchDetails,
});
