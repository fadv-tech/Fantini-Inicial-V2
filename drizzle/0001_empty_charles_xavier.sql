CREATE TABLE `anexos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`peticaoId` int NOT NULL,
	`tipoDocumento` varchar(100) NOT NULL,
	`nomeArquivo` text NOT NULL,
	`arquivoUrl` text NOT NULL,
	`arquivoKey` text NOT NULL,
	`tamanhoBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anexos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idcertificados` int NOT NULL,
	`advogadoNome` text NOT NULL,
	`vencimento` varchar(20),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificados_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificados_idcertificados_unique` UNIQUE(`idcertificados`)
);
--> statement-breakpoint
CREATE TABLE `movimentacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idmovimentacoes` int,
	`processoId` int NOT NULL,
	`fkProcesso` int,
	`titulo` text,
	`dataMovimentacao` timestamp,
	`conteudo` text,
	`tipo` varchar(50),
	`documentoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movimentacoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `movimentacoes_idmovimentacoes_unique` UNIQUE(`idmovimentacoes`)
);
--> statement-breakpoint
CREATE TABLE `notificacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processoId` int,
	`idprocessos` int,
	`tipo` varchar(50) NOT NULL,
	`titulo` text,
	`conteudo` text,
	`payload` text,
	`lida` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idpartes` int,
	`nome` text NOT NULL,
	`tipoParte` varchar(50) NOT NULL,
	`tipoDocumento` varchar(20),
	`numeroDocumento` varchar(50),
	`profissao` varchar(100),
	`orgaoExpedidor` varchar(50),
	`email` varchar(320),
	`telefone` varchar(20),
	`endereco` text,
	`cidade` varchar(100),
	`estado` varchar(2),
	`cep` varchar(10),
	`oab` varchar(20),
	`ufOab` varchar(2),
	`dadosCompletos` text,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partes_id` PRIMARY KEY(`id`),
	CONSTRAINT `partes_idpartes_unique` UNIQUE(`idpartes`)
);
--> statement-breakpoint
CREATE TABLE `peticoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idpeticoes` int,
	`idprocessos` int,
	`processoId` int,
	`hashPeticao` varchar(255),
	`hashProcesso` varchar(255),
	`tipo` enum('inicial','intermediaria') NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'rascunho',
	`ufTribunal` varchar(2),
	`tribunal` varchar(50),
	`sistema` varchar(50),
	`instancia` varchar(20),
	`comarca` text,
	`competencia` varchar(100),
	`area` varchar(100),
	`classe` text,
	`rito` varchar(100),
	`assunto` text,
	`tipoProcesso` varchar(100),
	`tipoJustica` varchar(100),
	`valorCausa` varchar(20),
	`liminar` boolean DEFAULT false,
	`sigilo` boolean DEFAULT false,
	`gratuidade` boolean DEFAULT false,
	`prioridade` boolean DEFAULT false,
	`motivoPrioridade` text,
	`distribuicao` varchar(50),
	`processoReferencia` varchar(50),
	`fundamentoLegal` text,
	`motivoSigilo` text,
	`atividadeEconomica` varchar(100),
	`arquivoPrincipalUrl` text,
	`arquivoPrincipalKey` text,
	`dadosCompletos` text,
	`erroMensagem` text,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peticoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `peticoes_idpeticoes_unique` UNIQUE(`idpeticoes`)
);
--> statement-breakpoint
CREATE TABLE `peticoes_partes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`peticaoId` int NOT NULL,
	`parteId` int NOT NULL,
	`polo` enum('ativo','passivo') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `peticoes_partes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idprocessos` int NOT NULL,
	`hashProcesso` varchar(255),
	`numeroProcesso` varchar(50) NOT NULL,
	`juizo` text,
	`valorCausa` varchar(20),
	`tribunal` varchar(50),
	`sistemaTribunal` varchar(50),
	`processoTema` text,
	`poloativoNome` text,
	`polopassivoNome` text,
	`abreviaturaClasse` varchar(50),
	`nomeClasse` text,
	`foro` text,
	`inboxAtual` varchar(50),
	`lastImport` timestamp,
	`arquivado` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processos_id` PRIMARY KEY(`id`),
	CONSTRAINT `processos_idprocessos_unique` UNIQUE(`idprocessos`)
);
--> statement-breakpoint
CREATE TABLE `webhook_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`endpoint` text NOT NULL,
	`keyEndpoint` varchar(255),
	`nomeAplicacao` varchar(100) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_config_id` PRIMARY KEY(`id`)
);
