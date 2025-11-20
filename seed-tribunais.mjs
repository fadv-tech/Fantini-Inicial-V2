#!/usr/bin/env node

/**
 * Script para popular tabela tribunal_configs com os 27 tribunais
 * Uso: node seed-tribunais.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { tribunalConfigs } from "./drizzle/schema.ts";

// Conectar ao banco
const db = drizzle(process.env.DATABASE_URL);

// Lista dos 27 tribunais
const tribunais = [
  { codigoTribunal: "8.01", nomeTribunal: "TJAC", nomeCompleto: "Tribunal de Justiça do Acre", sistema: "pje" },
  { codigoTribunal: "8.02", nomeTribunal: "TJAL", nomeCompleto: "Tribunal de Justiça de Alagoas", sistema: "pje" },
  { codigoTribunal: "8.03", nomeTribunal: "TJAM", nomeCompleto: "Tribunal de Justiça do Amazonas", sistema: "projudi" },
  { codigoTribunal: "8.04", nomeTribunal: "TJAP", nomeCompleto: "Tribunal de Justiça do Amapá", sistema: "pje" },
  { codigoTribunal: "8.05", nomeTribunal: "TJBA", nomeCompleto: "Tribunal de Justiça da Bahia", sistema: "pje" },
  { codigoTribunal: "8.06", nomeTribunal: "TJCE", nomeCompleto: "Tribunal de Justiça do Ceará", sistema: "pje" },
  { codigoTribunal: "8.07", nomeTribunal: "TJDF", nomeCompleto: "Tribunal de Justiça do Distrito Federal", sistema: "pje" },
  { codigoTribunal: "8.08", nomeTribunal: "TJES", nomeCompleto: "Tribunal de Justiça do Espírito Santo", sistema: "pje" },
  { codigoTribunal: "8.09", nomeTribunal: "TJGO", nomeCompleto: "Tribunal de Justiça de Goiás", sistema: "projudi" },
  { codigoTribunal: "8.10", nomeTribunal: "TJMA", nomeCompleto: "Tribunal de Justiça do Maranhão", sistema: "pje" },
  { codigoTribunal: "8.11", nomeTribunal: "TJMG", nomeCompleto: "Tribunal de Justiça de Minas Gerais", sistema: "pje" },
  { codigoTribunal: "8.12", nomeTribunal: "TJMS", nomeCompleto: "Tribunal de Justiça do Mato Grosso do Sul", sistema: "pje" },
  { codigoTribunal: "8.13", nomeTribunal: "TJMT", nomeCompleto: "Tribunal de Justiça do Mato Grosso", sistema: "pje" },
  { codigoTribunal: "8.14", nomeTribunal: "TJPA", nomeCompleto: "Tribunal de Justiça do Pará", sistema: "pje" },
  { codigoTribunal: "8.15", nomeTribunal: "TJPB", nomeCompleto: "Tribunal de Justiça da Paraíba", sistema: "pje" },
  { codigoTribunal: "8.16", nomeTribunal: "TJPE", nomeCompleto: "Tribunal de Justiça de Pernambuco", sistema: "pje" },
  { codigoTribunal: "8.17", nomeTribunal: "TJPI", nomeCompleto: "Tribunal de Justiça do Piauí", sistema: "pje" },
  { codigoTribunal: "8.18", nomeTribunal: "TJPR", nomeCompleto: "Tribunal de Justiça do Paraná", sistema: "pje" },
  { codigoTribunal: "8.19", nomeTribunal: "TJRJ", nomeCompleto: "Tribunal de Justiça do Rio de Janeiro", sistema: "pje" },
  { codigoTribunal: "8.20", nomeTribunal: "TJRN", nomeCompleto: "Tribunal de Justiça do Rio Grande do Norte", sistema: "pje" },
  { codigoTribunal: "8.21", nomeTribunal: "TJRO", nomeCompleto: "Tribunal de Justiça de Rondônia", sistema: "pje" },
  { codigoTribunal: "8.22", nomeTribunal: "TJRR", nomeCompleto: "Tribunal de Justiça de Roraima", sistema: "pje" },
  { codigoTribunal: "8.23", nomeTribunal: "TJRS", nomeCompleto: "Tribunal de Justiça do Rio Grande do Sul", sistema: "pje" },
  { codigoTribunal: "8.24", nomeTribunal: "TJSC", nomeCompleto: "Tribunal de Justiça de Santa Catarina", sistema: "pje" },
  { codigoTribunal: "8.25", nomeTribunal: "TJSE", nomeCompleto: "Tribunal de Justiça de Sergipe", sistema: "pje" },
  { codigoTribunal: "8.26", nomeTribunal: "TJSP", nomeCompleto: "Tribunal de Justiça de São Paulo", sistema: "pje" },
  { codigoTribunal: "8.27", nomeTribunal: "TJTO", nomeCompleto: "Tribunal de Justiça do Tocantins", sistema: "pje" },
];

async function seed() {
  try {
    console.log("🌱 Iniciando seed de tribunais...");

    for (const tribunal of tribunais) {
      await db.insert(tribunalConfigs).values({
        codigoTribunal: tribunal.codigoTribunal,
        nomeTribunal: tribunal.nomeTribunal,
        nomeCompleto: tribunal.nomeCompleto,
        sistema: tribunal.sistema,
        certificadoPadrao: 2562, // Wesley Fantini
        certificadoPadraoNome: "WESLEY FANTINI DE ABREU",
        ativo: true,
      }).onDuplicateKeyUpdate({
        set: {
          nomeCompleto: tribunal.nomeCompleto,
          sistema: tribunal.sistema,
        },
      });

      console.log(`  ✅ ${tribunal.nomeTribunal} (${tribunal.codigoTribunal})`);
    }

    console.log("\n✅ 27 tribunais inseridos com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao popular tribunais:", error);
    process.exit(1);
  }
}

seed();
