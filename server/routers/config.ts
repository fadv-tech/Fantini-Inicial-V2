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
 * Lista todas as configurações de tribunais
 */
export const listTribunals = protectedProcedure.query(async () => {
  const tribunais = await getAllTribunalConfigs();
  return tribunais;
});

/**
 * Sincroniza um tribunal com a API do LegalMail
 * Busca tipos de petição e anexo disponíveis
 */
export const syncTribunalWithLegalMail = protectedProcedure
  .input(
    z.object({
      codigoTribunal: z.string(),
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
      // Buscar tipos de petição
      // Nota: A API do LegalMail não tem endpoint específico para listar tipos por tribunal
      // Vamos usar o endpoint global e filtrar depois
      const tiposPeticaoResponse = await legalMailRequest<any[]>({
        method: "GET",
        endpoint: "/api/v1/petition/types",
      });
      
      // Por enquanto, salvamos todos os tipos disponíveis
      // TODO: Filtrar por tribunal quando a API suportar
      const tiposPeticao = Array.isArray(tiposPeticaoResponse)
        ? tiposPeticaoResponse
        : [];
      
      // Atualizar configuração do tribunal
      await updateTribunalConfigFields(input.codigoTribunal, {
        tiposPeticaoDisponiveis: tiposPeticao as any,
        tiposAnexoDisponiveis: [] as any,
        ultimaSincronizacao: new Date(),
      });
      
      return {
        success: true,
        tiposPeticao: tiposPeticao.length,
        message: `Sincronizado com sucesso: ${tiposPeticao.length} tipos de petição`,
      };
    } catch (error) {
      console.error("[syncTribunalWithLegalMail] Erro:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Erro ao sincronizar com LegalMail",
      });
    }
  });

/**
 * Atualiza configuração de um tribunal
 */
export const updateTribunal = protectedProcedure
  .input(
    z.object({
      codigoTribunal: z.string(),
      tipoPeticaoPadrao: z.number().nullable().optional(),
      tipoPeticaoPadraoNome: z.string().nullable().optional(),
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
      message: "Configuração atualizada com sucesso",
    };
  });

/**
 * Aplica configuração de um tribunal para todos os outros
 */
export const applyToAllTribunals = protectedProcedure
  .input(
    z.object({
      codigoTribunalOrigem: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const tribunalOrigem = await getTribunalConfig(input.codigoTribunalOrigem);
    
    if (!tribunalOrigem) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Tribunal ${input.codigoTribunalOrigem} não encontrado`,
      });
    }
    
    const todosTribunais = await getAllTribunalConfigs();
    
    let count = 0;
    for (const tribunal of todosTribunais) {
      if (tribunal.codigoTribunal !== input.codigoTribunalOrigem) {
        await updateTribunalConfigFields(tribunal.codigoTribunal, {
          tipoPeticaoPadrao: tribunalOrigem.tipoPeticaoPadrao,
          tipoPeticaoPadraoNome: tribunalOrigem.tipoPeticaoPadraoNome,
          tipoAnexoPadrao: tribunalOrigem.tipoAnexoPadrao,
          tipoAnexoPadraoNome: tribunalOrigem.tipoAnexoPadraoNome,
          certificadoPadrao: tribunalOrigem.certificadoPadrao,
          certificadoPadraoNome: tribunalOrigem.certificadoPadraoNome,
        });
        count++;
      }
    }
    
    return {
      success: true,
      count,
      message: `Configuração aplicada para ${count} tribunais`,
    };
  });

export const configRouter = router({
  listTribunals,
  syncTribunalWithLegalMail,
  updateTribunal,
  applyToAllTribunals,
});
