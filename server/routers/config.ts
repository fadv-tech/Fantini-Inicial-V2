/**
 * Router de Configurações
 * Procedures tRPC para gerenciar configurações de tribunais
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { legalMailRequest } from "../legalmail-client";
import {
  getAllTribunalConfigs,
  getTribunalConfig,
  updateTribunalConfigFields,
} from "../db";

/**
 * Normalizar CNJ para formato esperado pela API (25 caracteres)
 */
function normalizeCNJ(cnjParcial: string): string {
  // Remover tudo exceto dígitos, pontos e hífens
  const cleaned = cnjParcial.trim().replace(/[^\d.-]/g, '');
  
  // Se já tem hífen, assumir que está no formato correto
  if (cleaned.includes('-')) {
    // Validar comprimento
    if (cleaned.length !== 25) {
      throw new Error(`CNJ com formato incorreto: esperado 25 caracteres, obtido ${cleaned.length}`);
    }
    return cleaned;
  }
  
  // Caso contrário, normalizar
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

/**
 * Lista todas as configurações de tribunais
 */
export const listTribunals = protectedProcedure.query(async () => {
  const tribunais = await getAllTribunalConfigs();
  return tribunais;
});

/**
 * Sincroniza um tribunal com a API do LegalMail usando um processo válido
 * 1. Busca processo no LegalMail
 * 2. Cria petição intermediária mock
 * 3. Busca tipos de petição e anexo disponíveis
 * 4. Salva no banco
 */
export const syncTribunalWithProcess = protectedProcedure
  .input(
    z.object({
      codigoTribunal: z.string(),
      numeroCNJ: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const tribunal = await getTribunalConfig(input.codigoTribunal);
    
    if (!tribunal) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Tribunal ${input.codigoTribunal} não encontrado`,
      });
    }
    
    try {
      // 1. Normalizar CNJ
      const cnjNormalizado = normalizeCNJ(input.numeroCNJ);
      console.log(`[syncTribunalWithProcess] CNJ normalizado: ${cnjNormalizado}`);
      
      // 2. Buscar processo no LegalMail
      const processosResponse = await legalMailRequest<any[]>({
        method: "GET",
        endpoint: "/api/v1/process/detail",
        params: {
          numero_processo: cnjNormalizado,
        },
      });
      
      if (!Array.isArray(processosResponse) || processosResponse.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Processo ${cnjNormalizado} não encontrado no LegalMail`,
        });
      }
      
      const processo = processosResponse[0];
      console.log(`[syncTribunalWithProcess] Processo encontrado: ID ${processo.idprocessos}`);
      
      // 3. Criar petição intermediária mock
      const peticaoResponse = await legalMailRequest<any>({
        method: "POST",
        endpoint: "/api/v1/petition/intermediate",
        body: {
          fk_processo: processo.idprocessos,
          fk_certificado: 2562, // Certificado padrão (Wesley Fantini)
        },
      });
      
      const idPeticoes = peticaoResponse.idPeticoes || peticaoResponse.idpeticoes;
      
      if (!idPeticoes) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar petição mock",
        });
      }
      
      console.log(`[syncTribunalWithProcess] Petição mock criada: ID ${idPeticoes}`);
      
      // 4. Buscar tipos de petição (IMPORTANTE: usar idpeticoes minúsculo)
      const tiposPeticaoResponse = await legalMailRequest<any>({
        method: "GET",
        endpoint: "/api/v1/petition/types",
        params: {
          idpeticoes: idPeticoes, // minúsculo!
        },
      });
      
      // API pode retornar array direto ou objeto com propriedade 'pecas'
      let tiposPeticao: any[] = [];
      if (Array.isArray(tiposPeticaoResponse)) {
        tiposPeticao = tiposPeticaoResponse;
      } else if (tiposPeticaoResponse?.pecas && Array.isArray(tiposPeticaoResponse.pecas)) {
        tiposPeticao = tiposPeticaoResponse.pecas;
      }
      
      console.log(`[syncTribunalWithProcess] ${tiposPeticao.length} tipos de petição encontrados`);
      
      // 5. Buscar tipos de anexo (IMPORTANTE: usar idpeticoes minúsculo)
      const tiposAnexoResponse = await legalMailRequest<any>({
        method: "GET",
        endpoint: "/api/v1/petition/attachment/types",
        params: {
          idpeticoes: idPeticoes, // minúsculo!
        },
      });
      
      // API pode retornar array direto ou objeto com propriedade 'tipos'
      let tiposAnexo: any[] = [];
      if (Array.isArray(tiposAnexoResponse)) {
        tiposAnexo = tiposAnexoResponse;
      } else if (tiposAnexoResponse?.tipos && Array.isArray(tiposAnexoResponse.tipos)) {
        tiposAnexo = tiposAnexoResponse.tipos;
      }
      
      console.log(`[syncTribunalWithProcess] ${tiposAnexo.length} tipos de anexo encontrados`);
      
      // 6. Normalizar tipos para salvar no banco
      const tiposPeticaoNormalizados = tiposPeticao.map((t: any) => ({
        id: parseInt(t.idpecas || t.id),
        nome: t.nome,
      }));
      
      const tiposAnexoNormalizados = tiposAnexo.map((t: any) => ({
        id: parseInt(t.iddocumentos_tipos || t.id),
        nome: t.nome,
      }));
      
      // 7. Salvar no banco
      await updateTribunalConfigFields(input.codigoTribunal, {
        processoSyncCNJ: cnjNormalizado,
        tiposPeticaoDisponiveis: tiposPeticaoNormalizados as any,
        tiposAnexoDisponiveis: tiposAnexoNormalizados as any,
        ultimaSincronizacao: new Date(),
      });
      
      return {
        success: true,
        tiposPeticao: tiposPeticaoNormalizados.length,
        tiposAnexo: tiposAnexoNormalizados.length,
        processoUsado: cnjNormalizado,
      };
      
    } catch (error: any) {
      console.error(`[syncTribunalWithProcess] Erro:`, error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Erro ao sincronizar tribunal",
      });
    }
  });

/**
 * Atualiza configuração de um tribunal específico
 */
export const updateTribunalConfig = protectedProcedure
  .input(
    z.object({
      codigoTribunal: z.string(),
      tipoPeticaoPadrao: z.number().optional(),
      tipoPeticaoPadraoNome: z.string().optional(),
      tipoAnexoPadrao: z.number().nullable().optional(),
      tipoAnexoPadraoNome: z.string().nullable().optional(),
      certificadoPadrao: z.number().optional(),
      certificadoPadraoNome: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { codigoTribunal, ...updates } = input;
    
    const tribunal = await getTribunalConfig(codigoTribunal);
    
    if (!tribunal) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Tribunal ${codigoTribunal} não encontrado`,
      });
    }
    
    await updateTribunalConfigFields(codigoTribunal, updates);
    
    return {
      success: true,
      codigoTribunal,
    };
  });

/**
 * Aplica configuração para todos os tribunais
 */
export const applyToAllTribunals = protectedProcedure
  .input(
    z.object({
      tipoPeticaoPadrao: z.number().optional(),
      tipoPeticaoPadraoNome: z.string().optional(),
      tipoAnexoPadrao: z.number().nullable().optional(),
      tipoAnexoPadraoNome: z.string().nullable().optional(),
      certificadoPadrao: z.number().optional(),
      certificadoPadraoNome: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const tribunais = await getAllTribunalConfigs();
    
    for (const tribunal of tribunais) {
      await updateTribunalConfigFields(tribunal.codigoTribunal, input);
    }
    
    return {
      success: true,
      tribunaisAtualizados: tribunais.length,
    };
  });

export const configRouter = router({
  listTribunals,
  syncTribunalWithProcess,
  updateTribunalConfig,
  applyToAllTribunals,
});
