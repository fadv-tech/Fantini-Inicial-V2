import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  tribunalConfigs,
  bateladas,
  bateladaProcessos,
  logsAuditoria,
  arquivosEnviados,
  type TribunalConfig,
  type InsertTribunalConfig,
  type Batelada,
  type InsertBatelada,
  type BateladaProcesso,
  type InsertBateladaProcesso,
  type LogAuditoria,
  type InsertLogAuditoria,
  type ArquivoEnviado,
  type InsertArquivoEnviado
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

// ==========================================
// Tribunal Configs
// ==========================================

export async function getTribunalConfig(codigoTribunal: string): Promise<TribunalConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(tribunalConfigs)
    .where(eq(tribunalConfigs.codigoTribunal, codigoTribunal))
    .limit(1);

  return result[0];
}

export async function getAllTribunalConfigs(): Promise<TribunalConfig[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tribunalConfigs);
}

export async function upsertTribunalConfig(config: InsertTribunalConfig): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .insert(tribunalConfigs)
    .values(config)
    .onDuplicateKeyUpdate({ set: config });
}

export async function updateTribunalConfigFields(
  codigoTribunal: string,
  fields: Partial<Omit<InsertTribunalConfig, 'codigoTribunal' | 'nomeTribunal'>>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(tribunalConfigs)
    .set(fields)
    .where(eq(tribunalConfigs.codigoTribunal, codigoTribunal));
}

// ==========================================
// Bateladas
// ==========================================

export async function createBatelada(data: InsertBatelada): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(bateladas).values(data);
  return Number(result[0].insertId);
}

export async function getBatelada(id: number): Promise<Batelada | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(bateladas)
    .where(eq(bateladas.id, id))
    .limit(1);

  return result[0];
}

export async function updateBatelada(id: number, data: Partial<Batelada>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(bateladas).set(data).where(eq(bateladas.id, id));
}

export async function getAllBateladas(): Promise<Batelada[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(bateladas).orderBy(bateladas.createdAt);
}

// ==========================================
// Batelada Processos
// ==========================================

export async function createBateladaProcesso(data: InsertBateladaProcesso): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(bateladaProcessos).values(data);
  return Number(result[0].insertId);
}

export async function getBateladaProcessos(bateladaId: number): Promise<BateladaProcesso[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(bateladaProcessos)
    .where(eq(bateladaProcessos.bateladaId, bateladaId));
}

export async function updateBateladaProcesso(id: number, data: Partial<BateladaProcesso>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(bateladaProcessos).set(data).where(eq(bateladaProcessos.id, id));
}

// ==========================================
// Logs de Auditoria
// ==========================================

export async function createLogAuditoria(data: InsertLogAuditoria): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(logsAuditoria).values(data);
  return Number(result[0].insertId);
}

export async function getLogsByBatelada(bateladaId: number): Promise<LogAuditoria[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(logsAuditoria)
    .where(eq(logsAuditoria.bateladaId, bateladaId))
    .orderBy(logsAuditoria.createdAt);
}

export async function getLogsByProcesso(bateladaProcessoId: number): Promise<LogAuditoria[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(logsAuditoria)
    .where(eq(logsAuditoria.bateladaProcessoId, bateladaProcessoId))
    .orderBy(logsAuditoria.createdAt);
}

// ==========================================
// Arquivos Enviados
// ==========================================

export async function createArquivoEnviado(data: InsertArquivoEnviado): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(arquivosEnviados).values(data);
  return Number(result[0].insertId);
}

export async function getArquivosByProcesso(bateladaProcessoId: number): Promise<ArquivoEnviado[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(arquivosEnviados)
    .where(eq(arquivosEnviados.bateladaProcessoId, bateladaProcessoId));
}
