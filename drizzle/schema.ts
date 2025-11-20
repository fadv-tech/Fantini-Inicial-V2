import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Configurações de tribunais
 * Armazena configurações padrão para cada tribunal (tipo de petição, tipo de anexo, certificado)
 */
export const tribunalConfigs = mysqlTable("tribunal_configs", {
  id: int("id").autoincrement().primaryKey(),
  codigoTribunal: varchar("codigoTribunal", { length: 10 }).notNull().unique(), // Ex: "8.09" para TJGO
  nomeTribunal: varchar("nomeTribunal", { length: 100 }).notNull(), // Ex: "TJGO"
  nomeCompleto: text("nomeCompleto"), // Ex: "Tribunal de Justiça de Goiás"
  sistema: varchar("sistema", { length: 50 }), // Ex: "projudi", "pje"
  
  // Configurações padrão
  tipoPeticaoPadrao: int("tipoPeticaoPadrao"), // fk_peca padrão
  tipoPeticaoPadraoNome: varchar("tipoPeticaoPadraoNome", { length: 255 }),
  tipoAnexoPadrao: int("tipoAnexoPadrao"), // fk_documentos_tipos padrão
  tipoAnexoPadraoNome: varchar("tipoAnexoPadraoNome", { length: 255 }),
  certificadoPadrao: int("certificadoPadrao").default(2562), // ID do certificado (Wesley padrão)
  certificadoPadraoNome: varchar("certificadoPadraoNome", { length: 255 }).default("WESLEY FANTINI DE ABREU"),
  
  // Sincronização com LegalMail
  processoSyncCNJ: varchar("processoSyncCNJ", { length: 30 }), // CNJ do processo usado para sincronizar
  
  // Tipos disponíveis (JSON)
  tiposPeticaoDisponiveis: json("tiposPeticaoDisponiveis").$type<Array<{id: number, nome: string}>>(),
  tiposAnexoDisponiveis: json("tiposAnexoDisponiveis").$type<Array<{id: number, nome: string}>>(),
  
  ultimaSincronizacao: timestamp("ultimaSincronizacao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TribunalConfig = typeof tribunalConfigs.$inferSelect;
export type InsertTribunalConfig = typeof tribunalConfigs.$inferInsert;

/**
 * Bateladas de protocolização
 * Agrupa múltiplos processos enviados juntos
 */
export const bateladas = mysqlTable("bateladas", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }),
  totalProcessos: int("totalProcessos").default(0).notNull(),
  totalArquivos: int("totalArquivos").default(0).notNull(),
  sucessos: int("sucessos").default(0).notNull(),
  falhas: int("falhas").default(0).notNull(),
  
  status: mysqlEnum("status", ["pendente", "processando", "concluido", "parado", "erro"]).default("pendente").notNull(),
  
  certificadoId: int("certificadoId"),
  certificadoNome: varchar("certificadoNome", { length: 255 }),
  
  iniciadoEm: timestamp("iniciadoEm"),
  concluidoEm: timestamp("concluidoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Batelada = typeof bateladas.$inferSelect;
export type InsertBatelada = typeof bateladas.$inferInsert;

/**
 * Processos de uma batelada
 * Cada processo dentro de uma batelada
 */
export const bateladaProcessos = mysqlTable("batelada_processos", {
  id: int("id").autoincrement().primaryKey(),
  bateladaId: int("bateladaId").notNull(),
  
  numeroCNJ: varchar("numeroCNJ", { length: 30 }).notNull(),
  codigoTribunal: varchar("codigoTribunal", { length: 10 }),
  
  idprocessos: int("idprocessos"), // ID do processo no LegalMail (após buscar)
  idpeticoes: int("idpeticoes"), // ID da petição criada no LegalMail
  hashPeticao: varchar("hashPeticao", { length: 255 }),
  
  arquivoPrincipal: varchar("arquivoPrincipal", { length: 500 }),
  totalAnexos: int("totalAnexos").default(0),
  
  status: mysqlEnum("status", ["pendente", "processando", "sucesso", "erro"]).default("pendente").notNull(),
  mensagemErro: text("mensagemErro"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BateladaProcesso = typeof bateladaProcessos.$inferSelect;
export type InsertBateladaProcesso = typeof bateladaProcessos.$inferInsert;

/**
 * LOG detalhado de auditoria
 * Registra CADA etapa do processamento com request/response completo
 */
export const logsAuditoria = mysqlTable("logs_auditoria", {
  id: int("id").autoincrement().primaryKey(),
  bateladaId: int("bateladaId").notNull(),
  bateladaProcessoId: int("bateladaProcessoId"),
  
  numeroCNJ: varchar("numeroCNJ", { length: 30 }),
  etapa: varchar("etapa", { length: 100 }).notNull(), // Ex: "buscar_processo", "criar_peticao", "upload_pdf", "protocolar"
  
  requestUrl: text("requestUrl"),
  requestMethod: varchar("requestMethod", { length: 10 }),
  requestPayload: json("requestPayload").$type<any>(),
  
  responseStatus: int("responseStatus"),
  responsePayload: json("responsePayload").$type<any>(),
  
  status: mysqlEnum("status", ["sucesso", "erro", "warning"]).notNull(),
  mensagem: text("mensagem"),
  erro: text("erro"),
  
  tempoExecucaoMs: int("tempoExecucaoMs"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LogAuditoria = typeof logsAuditoria.$inferSelect;
export type InsertLogAuditoria = typeof logsAuditoria.$inferInsert;

/**
 * Arquivos enviados
 * Rastreia cada arquivo PDF enviado
 */
export const arquivosEnviados = mysqlTable("arquivos_enviados", {
  id: int("id").autoincrement().primaryKey(),
  bateladaProcessoId: int("bateladaProcessoId").notNull(),
  
  nomeOriginal: varchar("nomeOriginal", { length: 500 }).notNull(),
  nomeNormalizado: varchar("nomeNormalizado", { length: 500 }).notNull(),
  
  numeroCNJ: varchar("numeroCNJ", { length: 30 }),
  codProc: int("codProc"),
  codPet: int("codPet"),
  descricao: text("descricao"),
  
  isPrincipal: boolean("isPrincipal").default(false).notNull(),
  tamanhoBytes: int("tamanhoBytes"),
  
  s3Key: varchar("s3Key", { length: 500 }),
  s3Url: text("s3Url"),
  
  // Arquivamento permanente (pasta eterna)
  arquivoPermanentePath: varchar("arquivoPermanentePath", { length: 500 }), // Caminho completo do arquivo arquivado
  arquivoPermanenteUrl: text("arquivoPermanenteUrl"), // URL (se S3)
  
  uploadStatus: mysqlEnum("uploadStatus", ["pendente", "sucesso", "erro"]).default("pendente").notNull(),
  uploadErro: text("uploadErro"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ArquivoEnviado = typeof arquivosEnviados.$inferSelect;
export type InsertArquivoEnviado = typeof arquivosEnviados.$inferInsert;
