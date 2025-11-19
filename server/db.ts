import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  processos, 
  peticoes, 
  partes, 
  anexos, 
  movimentacoes, 
  certificados, 
  notificacoes, 
  webhookConfig,
  peticoesPartes,
  type InsertProcesso,
  type InsertPeticao,
  type InsertParte,
  type InsertAnexo,
  type InsertMovimentacao,
  type InsertCertificado,
  type InsertNotificacao,
  type InsertWebhookConfig,
  type InsertPeticaoParte
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== PROCESSOS ====================

export async function listarProcessosDb(params?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

  const query = db
    .select()
    .from(processos)
    .orderBy(desc(processos.createdAt))
    .limit(params?.limit || 50)
    .offset(params?.offset || 0);

  return await query;
}

export async function obterProcessoDb(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(processos).where(eq(processos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function obterProcessoPorIdLegalMail(idprocessos: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(processos).where(eq(processos.idprocessos, idprocessos)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function salvarProcesso(processo: InsertProcesso) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(processos).values(processo);
  return result;
}

export async function atualizarProcesso(id: number, dados: Partial<InsertProcesso>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(processos).set(dados).where(eq(processos.id, id));
}

// ==================== PETIÇÕES ====================

export async function listarPeticoesDb(userId: number, params?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

  const query = db
    .select()
    .from(peticoes)
    .where(eq(peticoes.userId, userId))
    .orderBy(desc(peticoes.createdAt))
    .limit(params?.limit || 50)
    .offset(params?.offset || 0);

  return await query;
}

export async function obterPeticaoDb(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(peticoes).where(eq(peticoes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function salvarPeticao(peticao: InsertPeticao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(peticoes).values(peticao);
  return result;
}

export async function atualizarPeticao(id: number, dados: Partial<InsertPeticao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(peticoes).set(dados).where(eq(peticoes.id, id));
}

export async function deletarPeticao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(peticoes).where(eq(peticoes.id, id));
}

// ==================== PARTES ====================

export async function listarPartesDb(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(partes).where(eq(partes.userId, userId)).orderBy(desc(partes.createdAt));
}

export async function obterParteDb(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(partes).where(eq(partes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function salvarParte(parte: InsertParte) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(partes).values(parte);
  return result;
}

export async function atualizarParte(id: number, dados: Partial<InsertParte>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(partes).set(dados).where(eq(partes.id, id));
}

// ==================== ANEXOS ====================

export async function listarAnexosPeticao(peticaoId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(anexos).where(eq(anexos.peticaoId, peticaoId));
}

export async function salvarAnexo(anexo: InsertAnexo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(anexos).values(anexo);
  return result;
}

// ==================== MOVIMENTAÇÕES ====================

export async function listarMovimentacoesProcesso(processoId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(movimentacoes).where(eq(movimentacoes.processoId, processoId)).orderBy(desc(movimentacoes.dataMovimentacao));
}

export async function salvarMovimentacao(movimentacao: InsertMovimentacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(movimentacoes).values(movimentacao);
  return result;
}

// ==================== CERTIFICADOS ====================

export async function listarCertificadosDb() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(certificados).where(eq(certificados.ativo, true));
}

export async function salvarCertificado(certificado: InsertCertificado) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(certificados).values(certificado);
  return result;
}

// ==================== NOTIFICAÇÕES ====================

export async function listarNotificacoesDb(params?: { limit?: number; offset?: number; lida?: boolean }) {
  const db = await getDb();
  if (!db) return [];

  if (params?.lida !== undefined) {
    return await db
      .select()
      .from(notificacoes)
      .where(eq(notificacoes.lida, params.lida))
      .orderBy(desc(notificacoes.createdAt))
      .limit(params?.limit || 50)
      .offset(params?.offset || 0);
  }

  return await db
    .select()
    .from(notificacoes)
    .orderBy(desc(notificacoes.createdAt))
    .limit(params?.limit || 50)
    .offset(params?.offset || 0);
}

export async function salvarNotificacao(notificacao: InsertNotificacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notificacoes).values(notificacao);
  return result;
}

export async function marcarNotificacaoLida(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notificacoes).set({ lida: true }).where(eq(notificacoes.id, id));
}

// ==================== WEBHOOK CONFIG ====================

export async function obterWebhookConfig() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(webhookConfig).where(eq(webhookConfig.ativo, true)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function salvarWebhookConfig(config: InsertWebhookConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(webhookConfig).values(config);
  return result;
}

// ==================== RELAÇÕES PETIÇÕES-PARTES ====================

export async function vincularPartePeticao(vinculo: InsertPeticaoParte) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(peticoesPartes).values(vinculo);
  return result;
}

export async function listarPartesPeticao(peticaoId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      parte: partes,
      polo: peticoesPartes.polo,
    })
    .from(peticoesPartes)
    .innerJoin(partes, eq(peticoesPartes.parteId, partes.id))
    .where(eq(peticoesPartes.peticaoId, peticaoId));
}
