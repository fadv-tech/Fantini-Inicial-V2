/**
 * Seed de Tribunais Estaduais Brasileiros
 * 
 * Pré-popula a tabela tribunal_configs com os 27 Tribunais de Justiça Estaduais
 * Todos com certificado padrão Wesley (ID: 2562)
 */

import { upsertTribunalConfig } from './db';
import type { InsertTribunalConfig } from '../drizzle/schema';

const CERTIFICADO_WESLEY_ID = 2562;
const CERTIFICADO_WESLEY_NOME = "WESLEY FANTINI DE ABREU";

/**
 * Lista dos 27 Tribunais de Justiça Estaduais
 * Código do tribunal no formato "8.XX" onde XX é o código do estado
 */
const TRIBUNAIS_ESTADUAIS: Array<{
  codigo: string;
  sigla: string;
  nome: string;
  uf: string;
}> = [
  { codigo: "8.01", sigla: "TJAC", nome: "Tribunal de Justiça do Acre", uf: "AC" },
  { codigo: "8.02", sigla: "TJAL", nome: "Tribunal de Justiça de Alagoas", uf: "AL" },
  { codigo: "8.03", sigla: "TJAP", nome: "Tribunal de Justiça do Amapá", uf: "AP" },
  { codigo: "8.04", sigla: "TJAM", nome: "Tribunal de Justiça do Amazonas", uf: "AM" },
  { codigo: "8.05", sigla: "TJBA", nome: "Tribunal de Justiça da Bahia", uf: "BA" },
  { codigo: "8.06", sigla: "TJCE", nome: "Tribunal de Justiça do Ceará", uf: "CE" },
  { codigo: "8.07", sigla: "TJDF", nome: "Tribunal de Justiça do Distrito Federal e Territórios", uf: "DF" },
  { codigo: "8.08", sigla: "TJES", nome: "Tribunal de Justiça do Espírito Santo", uf: "ES" },
  { codigo: "8.09", sigla: "TJGO", nome: "Tribunal de Justiça de Goiás", uf: "GO" },
  { codigo: "8.10", sigla: "TJMA", nome: "Tribunal de Justiça do Maranhão", uf: "MA" },
  { codigo: "8.11", sigla: "TJMT", nome: "Tribunal de Justiça de Mato Grosso", uf: "MT" },
  { codigo: "8.12", sigla: "TJMS", nome: "Tribunal de Justiça de Mato Grosso do Sul", uf: "MS" },
  { codigo: "8.13", sigla: "TJMG", nome: "Tribunal de Justiça de Minas Gerais", uf: "MG" },
  { codigo: "8.14", sigla: "TJPA", nome: "Tribunal de Justiça do Pará", uf: "PA" },
  { codigo: "8.15", sigla: "TJPB", nome: "Tribunal de Justiça da Paraíba", uf: "PB" },
  { codigo: "8.16", sigla: "TJPR", nome: "Tribunal de Justiça do Paraná", uf: "PR" },
  { codigo: "8.17", sigla: "TJPE", nome: "Tribunal de Justiça de Pernambuco", uf: "PE" },
  { codigo: "8.18", sigla: "TJPI", nome: "Tribunal de Justiça do Piauí", uf: "PI" },
  { codigo: "8.19", sigla: "TJRJ", nome: "Tribunal de Justiça do Rio de Janeiro", uf: "RJ" },
  { codigo: "8.20", sigla: "TJRN", nome: "Tribunal de Justiça do Rio Grande do Norte", uf: "RN" },
  { codigo: "8.21", sigla: "TJRS", nome: "Tribunal de Justiça do Rio Grande do Sul", uf: "RS" },
  { codigo: "8.22", sigla: "TJRO", nome: "Tribunal de Justiça de Rondônia", uf: "RO" },
  { codigo: "8.23", sigla: "TJRR", nome: "Tribunal de Justiça de Roraima", uf: "RR" },
  { codigo: "8.24", sigla: "TJSC", nome: "Tribunal de Justiça de Santa Catarina", uf: "SC" },
  { codigo: "8.25", sigla: "TJSE", nome: "Tribunal de Justiça de Sergipe", uf: "SE" },
  { codigo: "8.26", sigla: "TJSP", nome: "Tribunal de Justiça de São Paulo", uf: "SP" },
  { codigo: "8.27", sigla: "TJTO", nome: "Tribunal de Justiça do Tocantins", uf: "TO" },
];

/**
 * Executa o seed de tribunais
 */
export async function seedTribunais(): Promise<void> {
  console.log('[Seed] Iniciando seed de tribunais estaduais...');
  
  let count = 0;
  for (const tribunal of TRIBUNAIS_ESTADUAIS) {
    const config: InsertTribunalConfig = {
      codigoTribunal: tribunal.codigo,
      nomeTribunal: tribunal.sigla,
      nomeCompleto: tribunal.nome,
      sistema: null, // Será preenchido ao sincronizar com LegalMail
      
      // Configurações padrão (null = não configurado ainda)
      tipoPeticaoPadrao: null,
      tipoPeticaoPadraoNome: null,
      tipoAnexoPadrao: null,
      tipoAnexoPadraoNome: null,
      
      // Wesley como certificado padrão
      certificadoPadrao: CERTIFICADO_WESLEY_ID,
      certificadoPadraoNome: CERTIFICADO_WESLEY_NOME,
      
      // Tipos disponíveis (será preenchido ao sincronizar)
      tiposPeticaoDisponiveis: null,
      tiposAnexoDisponiveis: null,
      
      ultimaSincronizacao: null,
      ativo: true,
    };
    
    await upsertTribunalConfig(config);
    count++;
    
    console.log(`[Seed] ${count}/27 - ${tribunal.sigla} (${tribunal.codigo}) criado`);
  }
  
  console.log(`[Seed] ✅ ${count} tribunais criados com sucesso!`);
  console.log(`[Seed] Certificado padrão: ${CERTIFICADO_WESLEY_NOME} (ID: ${CERTIFICADO_WESLEY_ID})`);
}

// Auto-executa o seed
seedTribunais()
  .then(() => {
    console.log('[Seed] Concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Seed] Erro:', error);
    process.exit(1);
  });
