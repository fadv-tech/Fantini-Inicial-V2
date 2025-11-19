# TODO - Sistema de Peticionamento LegalMail

## Fase 1: Estrutura de Banco de Dados e Configuração da API

- [x] Criar schema do banco de dados com tabelas principais
  - [x] Tabela de processos
  - [x] Tabela de petições (iniciais e intermediárias)
  - [x] Tabela de partes processuais
  - [x] Tabela de documentos/anexos
  - [x] Tabela de notificações/webhooks
  - [x] Tabela de certificados digitais
- [x] Configurar variável de ambiente para API Key do LegalMail
- [x] Criar arquivo de constantes com endpoints da API

## Fase 2: Cliente HTTP e Procedures tRPC

- [x] Implementar cliente HTTP para API LegalMail
  - [x] Função genérica para requisições GET
  - [x] Função genérica para requisições POST
  - [x] Função para upload de arquivos (multipart/form-data)
  - [x] Tratamento de erros e rate limiting (429)
- [ ] Criar procedures tRPC para processos
  - [ ] Listar processos
  - [ ] Obter detalhes de processo
  - [ ] Listar autos do processo
  - [ ] Arquivar/desarquivar processo
- [ ] Criar procedures tRPC para petições iniciais
  - [ ] Criar petição inicial
  - [ ] Atualizar petição inicial
  - [ ] Consultar petição inicial
  - [ ] Deletar petição inicial
  - [ ] Enviar arquivo principal
  - [ ] Enviar anexos
- [ ] Criar procedures tRPC para petições intermediárias
  - [ ] Criar petição intermediária
  - [ ] Protocolar petição intermediária
- [ ] Criar procedures tRPC para dados auxiliares
  - [ ] Listar tribunais
  - [ ] Listar comarcas
  - [ ] Listar classes processuais
  - [ ] Listar assuntos
  - [ ] Listar profissões
  - [ ] Listar órgãos expedidores
  - [ ] Listar certificados
- [ ] Criar procedures tRPC para partes
  - [ ] Listar partes
  - [ ] Criar parte
  - [ ] Editar parte

## Fase 3: Interface de Peticionamento Inicial

- [ ] Criar layout principal com navegação
- [ ] Implementar página de dashboard
  - [ ] Listagem de processos
  - [ ] Estatísticas gerais
  - [ ] Processos recentes
- [ ] Implementar formulário de petição inicial
  - [ ] Seleção de tribunal e sistema
  - [ ] Seleção de comarca
  - [ ] Seleção de classe processual
  - [ ] Seleção de assunto
  - [ ] Campos de dados do processo
  - [ ] Gerenciamento de partes (polo ativo/passivo)
  - [ ] Upload de petição principal (PDF)
  - [ ] Upload de anexos (PDF)
  - [ ] Validação de campos obrigatórios
  - [ ] Preview antes do envio
  - [ ] Envio da petição

## Fase 4: Peticionamento Intermediário e Gestão de Processos

- [ ] Implementar página de detalhes do processo
  - [ ] Informações gerais do processo
  - [ ] Timeline de movimentações
  - [ ] Lista de documentos
  - [ ] Botão para arquivar/desarquivar
- [ ] Implementar formulário de petição intermediária
  - [ ] Seleção de processo existente
  - [ ] Upload de petição
  - [ ] Upload de anexos
  - [ ] Protocolo da petição
- [ ] Implementar página de listagem de processos
  - [ ] Filtros e busca
  - [ ] Paginação
  - [ ] Ordenação

## Fase 5: Sistema de Webhooks e Notificações

- [ ] Criar endpoint para receber webhooks do LegalMail
- [ ] Implementar processamento de notificações
- [ ] Criar interface de notificações em tempo real
- [ ] Implementar histórico de notificações
- [ ] Criar página de configurações
  - [ ] Cadastro de webhook
  - [ ] Gerenciamento de certificados
  - [ ] Gerenciamento de usuários

## Fase 6: Testes e Validação

- [ ] Criar testes unitários para procedures tRPC
- [ ] Testar fluxo completo de petição inicial
- [ ] Testar fluxo completo de petição intermediária
- [ ] Testar sistema de notificações
- [ ] Validar tratamento de erros
- [ ] Testar rate limiting

## Fase 7: Documentação e Entrega

- [ ] Criar documentação de uso do sistema
- [ ] Documentar endpoints e procedures
- [ ] Criar checkpoint final
- [ ] Apresentar sistema ao usuário
