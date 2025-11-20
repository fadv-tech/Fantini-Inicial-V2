-- Script para criar todas as tabelas do sistema
-- Executar apenas uma vez para inicializar o banco de dados

-- Tabela de usuários (já existe, mas garantir)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações de tribunais
CREATE TABLE IF NOT EXISTS tribunal_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigoTribunal VARCHAR(10) NOT NULL UNIQUE,
  nomeTribunal VARCHAR(100) NOT NULL,
  nomeCompleto TEXT,
  sistema VARCHAR(50),
  tipoPeticaoPadrao INT,
  tipoPeticaoPadraoNome VARCHAR(255),
  tipoAnexoPadrao INT,
  tipoAnexoPadraoNome VARCHAR(255),
  certificadoPadrao INT DEFAULT 2562,
  certificadoPadraoNome VARCHAR(255) DEFAULT 'WESLEY FANTINI DE ABREU',
  tiposPeticaoDisponiveis JSON,
  tiposAnexoDisponiveis JSON,
  ultimaSincronizacao TIMESTAMP NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de bateladas
CREATE TABLE IF NOT EXISTS bateladas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(255),
  totalProcessos INT NOT NULL DEFAULT 0,
  totalArquivos INT NOT NULL DEFAULT 0,
  sucessos INT NOT NULL DEFAULT 0,
  falhas INT NOT NULL DEFAULT 0,
  status ENUM('pendente', 'processando', 'concluido', 'parado', 'erro') NOT NULL DEFAULT 'pendente',
  certificadoId INT,
  certificadoNome VARCHAR(255),
  iniciadoEm TIMESTAMP NULL,
  concluidoEm TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de processos de uma batelada
CREATE TABLE IF NOT EXISTS batelada_processos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bateladaId INT NOT NULL,
  numeroCNJ VARCHAR(30) NOT NULL,
  codigoTribunal VARCHAR(10),
  idprocessos INT,
  idpeticoes INT,
  hashPeticao VARCHAR(255),
  arquivoPrincipal VARCHAR(500),
  totalAnexos INT DEFAULT 0,
  status ENUM('pendente', 'processando', 'sucesso', 'erro') NOT NULL DEFAULT 'pendente',
  mensagemErro TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bateladaId) REFERENCES bateladas(id) ON DELETE CASCADE
);

-- Tabela de arquivos enviados
CREATE TABLE IF NOT EXISTS arquivos_enviados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bateladaProcessoId INT NOT NULL,
  nomeOriginal VARCHAR(500) NOT NULL,
  nomeArquivo VARCHAR(500) NOT NULL,
  tamanhoBytes BIGINT NOT NULL,
  hashMD5 VARCHAR(32),
  s3Key VARCHAR(1000),
  s3Url TEXT,
  tipoArquivo ENUM('principal', 'anexo') NOT NULL,
  uploadSucesso BOOLEAN NOT NULL DEFAULT FALSE,
  uploadErro TEXT,
  idArquivoLegalMail INT,
  arquivoPermanentePath VARCHAR(1000),
  arquivoPermanenteUrl TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bateladaProcessoId) REFERENCES batelada_processos(id) ON DELETE CASCADE
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bateladaId INT NOT NULL,
  etapa VARCHAR(100) NOT NULL,
  status ENUM('sucesso', 'erro', 'info') NOT NULL,
  mensagem TEXT NOT NULL,
  requestUrl VARCHAR(500),
  requestMethod VARCHAR(10),
  requestPayload JSON,
  responseStatus INT,
  responsePayload JSON,
  tempoExecucaoMs INT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bateladaId) REFERENCES bateladas(id) ON DELETE CASCADE,
  INDEX idx_batelada (bateladaId),
  INDEX idx_etapa (etapa),
  INDEX idx_status (status)
);
