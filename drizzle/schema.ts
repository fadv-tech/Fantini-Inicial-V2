import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

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
 * Processos judiciais importados ou criados via API LegalMail
 */
export const processos = mysqlTable("processos", {
  id: int("id").autoincrement().primaryKey(),
  idprocessos: int("idprocessos").notNull().unique(), // ID do processo no LegalMail
  hashProcesso: varchar("hashProcesso", { length: 255 }),
  numeroProcesso: varchar("numeroProcesso", { length: 50 }).notNull(),
  juizo: text("juizo"),
  valorCausa: varchar("valorCausa", { length: 20 }),
  tribunal: varchar("tribunal", { length: 50 }),
  sistemaTribunal: varchar("sistemaTribunal", { length: 50 }),
  processoTema: text("processoTema"),
  poloativoNome: text("poloativoNome"),
  polopassivoNome: text("polopassivoNome"),
  abreviaturaClasse: varchar("abreviaturaClasse", { length: 50 }),
  nomeClasse: text("nomeClasse"),
  foro: text("foro"),
  inboxAtual: varchar("inboxAtual", { length: 50 }),
  lastImport: timestamp("lastImport"),
  arquivado: boolean("arquivado").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Processo = typeof processos.$inferSelect;
export type InsertProcesso = typeof processos.$inferInsert;

/**
 * Petições (iniciais e intermediárias)
 */
export const peticoes = mysqlTable("peticoes", {
  id: int("id").autoincrement().primaryKey(),
  idpeticoes: int("idpeticoes").unique(), // ID da petição no LegalMail (após criação)
  idprocessos: int("idprocessos"), // ID do processo no LegalMail
  processoId: int("processoId"), // FK para tabela local de processos
  hashPeticao: varchar("hashPeticao", { length: 255 }),
  hashProcesso: varchar("hashProcesso", { length: 255 }),
  tipo: mysqlEnum("tipo", ["inicial", "intermediaria"]).notNull(),
  status: varchar("status", { length: 50 }).default("rascunho").notNull(), // rascunho, enviada, protocolada, erro
  
  // Dados da petição inicial
  ufTribunal: varchar("ufTribunal", { length: 2 }),
  tribunal: varchar("tribunal", { length: 50 }),
  sistema: varchar("sistema", { length: 50 }),
  instancia: varchar("instancia", { length: 20 }),
  comarca: text("comarca"),
  competencia: varchar("competencia", { length: 100 }),
  area: varchar("area", { length: 100 }),
  classe: text("classe"),
  rito: varchar("rito", { length: 100 }),
  assunto: text("assunto"),
  tipoProcesso: varchar("tipoProcesso", { length: 100 }),
  tipoJustica: varchar("tipoJustica", { length: 100 }),
  valorCausa: varchar("valorCausa", { length: 20 }),
  liminar: boolean("liminar").default(false),
  sigilo: boolean("sigilo").default(false),
  gratuidade: boolean("gratuidade").default(false),
  prioridade: boolean("prioridade").default(false),
  motivoPrioridade: text("motivoPrioridade"),
  distribuicao: varchar("distribuicao", { length: 50 }),
  processoReferencia: varchar("processoReferencia", { length: 50 }),
  fundamentoLegal: text("fundamentoLegal"),
  motivoSigilo: text("motivoSigilo"),
  atividadeEconomica: varchar("atividadeEconomica", { length: 100 }),
  
  // Arquivos
  arquivoPrincipalUrl: text("arquivoPrincipalUrl"),
  arquivoPrincipalKey: text("arquivoPrincipalKey"),
  
  // Metadados
  dadosCompletos: text("dadosCompletos"), // JSON com todos os dados enviados
  erroMensagem: text("erroMensagem"),
  userId: int("userId").notNull(), // Usuário que criou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Peticao = typeof peticoes.$inferSelect;
export type InsertPeticao = typeof peticoes.$inferInsert;

/**
 * Partes processuais (autores, réus, advogados, etc)
 */
export const partes = mysqlTable("partes", {
  id: int("id").autoincrement().primaryKey(),
  idpartes: int("idpartes").unique(), // ID da parte no LegalMail
  nome: text("nome").notNull(),
  tipoParte: varchar("tipoParte", { length: 50 }).notNull(), // autor, reu, advogado, testemunha, etc
  tipoDocumento: varchar("tipoDocumento", { length: 20 }), // CPF, CNPJ, RG, etc
  numeroDocumento: varchar("numeroDocumento", { length: 50 }),
  profissao: varchar("profissao", { length: 100 }),
  orgaoExpedidor: varchar("orgaoExpedidor", { length: 50 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  oab: varchar("oab", { length: 20 }), // Para advogados
  ufOab: varchar("ufOab", { length: 2 }), // Para advogados
  dadosCompletos: text("dadosCompletos"), // JSON com dados adicionais
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Parte = typeof partes.$inferSelect;
export type InsertParte = typeof partes.$inferInsert;

/**
 * Relação entre petições e partes (polo ativo/passivo)
 */
export const peticoesPartes = mysqlTable("peticoes_partes", {
  id: int("id").autoincrement().primaryKey(),
  peticaoId: int("peticaoId").notNull(),
  parteId: int("parteId").notNull(),
  polo: mysqlEnum("polo", ["ativo", "passivo"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PeticaoParte = typeof peticoesPartes.$inferSelect;
export type InsertPeticaoParte = typeof peticoesPartes.$inferInsert;

/**
 * Anexos de petições
 */
export const anexos = mysqlTable("anexos", {
  id: int("id").autoincrement().primaryKey(),
  peticaoId: int("peticaoId").notNull(),
  tipoDocumento: varchar("tipoDocumento", { length: 100 }).notNull(),
  nomeArquivo: text("nomeArquivo").notNull(),
  arquivoUrl: text("arquivoUrl").notNull(),
  arquivoKey: text("arquivoKey").notNull(),
  tamanhoBytes: int("tamanhoBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Anexo = typeof anexos.$inferSelect;
export type InsertAnexo = typeof anexos.$inferInsert;

/**
 * Movimentações/autos dos processos
 */
export const movimentacoes = mysqlTable("movimentacoes", {
  id: int("id").autoincrement().primaryKey(),
  idmovimentacoes: int("idmovimentacoes").unique(), // ID no LegalMail
  processoId: int("processoId").notNull(),
  fkProcesso: int("fkProcesso"), // ID do processo no LegalMail
  titulo: text("titulo"),
  dataMovimentacao: timestamp("dataMovimentacao"),
  conteudo: text("conteudo"),
  tipo: varchar("tipo", { length: 50 }), // auto, intimacao, despacho, etc
  documentoUrl: text("documentoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Movimentacao = typeof movimentacoes.$inferSelect;
export type InsertMovimentacao = typeof movimentacoes.$inferInsert;

/**
 * Certificados digitais cadastrados no workspace
 */
export const certificados = mysqlTable("certificados", {
  id: int("id").autoincrement().primaryKey(),
  idcertificados: int("idcertificados").notNull().unique(), // ID no LegalMail
  advogadoNome: text("advogadoNome").notNull(),
  vencimento: varchar("vencimento", { length: 20 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Certificado = typeof certificados.$inferSelect;
export type InsertCertificado = typeof certificados.$inferInsert;

/**
 * Notificações recebidas via webhook do LegalMail
 */
export const notificacoes = mysqlTable("notificacoes", {
  id: int("id").autoincrement().primaryKey(),
  processoId: int("processoId"),
  idprocessos: int("idprocessos"), // ID do processo no LegalMail
  tipo: varchar("tipo", { length: 50 }).notNull(), // intimacao, atualizacao, etc
  titulo: text("titulo"),
  conteudo: text("conteudo"),
  payload: text("payload"), // JSON completo do webhook
  lida: boolean("lida").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notificacao = typeof notificacoes.$inferSelect;
export type InsertNotificacao = typeof notificacoes.$inferInsert;

/**
 * Configurações do webhook
 */
export const webhookConfig = mysqlTable("webhook_config", {
  id: int("id").autoincrement().primaryKey(),
  endpoint: text("endpoint").notNull(),
  keyEndpoint: varchar("keyEndpoint", { length: 255 }),
  nomeAplicacao: varchar("nomeAplicacao", { length: 100 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WebhookConfig = typeof webhookConfig.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfig.$inferInsert;
