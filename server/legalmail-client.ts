/**
 * Cliente HTTP para API do LegalMail
 * Documentação: https://app.legalmail.com.br/assets/docs/openapi.yaml
 * 
 * Limites:
 * - 30 requisições por minuto
 * - Bloqueio por 7 dias se detectado polling
 * - Bloqueio permanente em caso de reincidência
 */

const LEGALMAIL_BASE_URL = "https://app.legalmail.com.br";
const API_KEY = process.env.LEGALMAIL_API_KEY;

if (!API_KEY) {
  console.warn("[LegalMail] API_KEY não configurada");
}

interface LegalMailRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  formData?: FormData;
}

/**
 * Função genérica para fazer requisições à API do LegalMail
 */
export async function legalMailRequest<T = unknown>(
  options: LegalMailRequestOptions
): Promise<T> {
  const { method, endpoint, params = {}, body, formData } = options;

  if (!API_KEY) {
    throw new Error("LEGALMAIL_API_KEY não configurada");
  }

  // Adicionar api_key aos parâmetros
  const queryParams = new URLSearchParams({
    api_key: API_KEY,
    ...Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined)
    ),
  } as Record<string, string>);

  const url = `${LEGALMAIL_BASE_URL}${endpoint}?${queryParams.toString()}`;

  const headers: HeadersInit = {};

  let requestBody: BodyInit | undefined;

  if (formData) {
    // Para multipart/form-data, não definir Content-Type (o browser define automaticamente)
    requestBody = formData as unknown as BodyInit;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    // Tratamento de erros HTTP
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `LegalMail API Error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      // Tratamento especial para rate limiting
      if (response.status === 429) {
        throw new Error(
          "Limite de requisições excedido (30 por minuto). Aguarde antes de tentar novamente."
        );
      }

      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    
    // Tentar fazer parse JSON independente do content-type
    // pois a API LegalMail pode retornar JSON com content-type incorreto
    try {
      const parsed = JSON.parse(responseText);
      return parsed as T;
    } catch {
      // Se não for JSON válido, retornar como texto
      return responseText as T;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Erro desconhecido ao comunicar com LegalMail API");
  }
}

// ==================== PROCESSOS ====================

export interface ProcessoLegalMail {
  idprocessos: number;
  hash_processo: string;
  numero_processo: string;
  juizo?: string;
  valor_causa?: string;
  tribunal?: string;
  processo_tema?: string;
  sistema_tribunal?: string;
  poloativo_nome?: string;
  tema_nome?: string;
  polopassivo_nome?: string;
  abreviatura_classe?: string;
  foro?: string;
  nome_classe?: string;
  inbox_atual?: string;
  last_import?: string;
}

/**
 * Listar todos os processos do workspace
 */
export async function listarProcessos(params?: {
  offset?: number;
  limit?: number;
}): Promise<ProcessoLegalMail[]> {
  return legalMailRequest<ProcessoLegalMail[]>({
    method: "GET",
    endpoint: "/api/v1/process/all",
    params: {
      offset: params?.offset,
      limit: params?.limit,
    },
  });
}

/**
 * Obter detalhes de um processo específico
 */
export async function obterProcesso(params: {
  numero_processo?: string;
  idprocesso?: number;
}): Promise<ProcessoLegalMail[]> {
  return legalMailRequest<ProcessoLegalMail[]>({
    method: "GET",
    endpoint: "/api/v1/process/detail",
    params: {
      numero_processo: params.numero_processo,
      idprocesso: params.idprocesso,
    },
  });
}

/**
 * Listar autos do processo
 */
export async function listarAutosProcesso(idprocesso: number) {
  return legalMailRequest({
    method: "GET",
    endpoint: "/api/v1/process/autos",
    params: { idprocesso },
  });
}

/**
 * Arquivar ou desarquivar processo
 */
export async function arquivarProcesso(params: {
  idprocesso: number;
  archive: boolean;
}) {
  return legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/process/archive",
    params,
  });
}

// ==================== PETIÇÕES ====================

export interface PeticaoInicialResponse {
  status: string;
  peticao: {
    idpeticoes: number;
    idprocessos: number | null;
    hash_peticao: string | null;
    hash_processo: string | null;
    dados: Record<string, unknown>;
  };
}

/**
 * Criar petição inicial
 */
export async function criarPeticaoInicial(
  dados: Record<string, unknown>
): Promise<PeticaoInicialResponse> {
  return legalMailRequest<PeticaoInicialResponse>({
    method: "POST",
    endpoint: "/api/v1/petition/initial",
    body: dados,
  });
}

/**
 * Atualizar petição inicial
 */
export async function atualizarPeticaoInicial(
  idpeticoes: number,
  dados: Record<string, unknown>
): Promise<PeticaoInicialResponse> {
  return legalMailRequest<PeticaoInicialResponse>({
    method: "PUT",
    endpoint: "/api/v1/petition/initial",
    params: { idpeticoes },
    body: dados,
  });
}

/**
 * Consultar petição inicial
 */
export async function consultarPeticaoInicial(
  idpeticoes: number
): Promise<PeticaoInicialResponse> {
  return legalMailRequest<PeticaoInicialResponse>({
    method: "GET",
    endpoint: "/api/v1/petition/initial",
    params: { idpeticoes },
  });
}

/**
 * Deletar petição inicial
 */
export async function deletarPeticaoInicial(idpeticoes: number) {
  return legalMailRequest({
    method: "DELETE",
    endpoint: "/api/v1/petition/initial",
    params: { idpeticoes },
  });
}

/**
 * Enviar arquivo principal da petição
 */
export async function enviarArquivoPeticao(params: {
  idpeticoes: number;
  idprocessos: number;
  file: Buffer;
  filename: string;
}) {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(params.file)], { type: "application/pdf" });
  formData.append("file", blob, params.filename);

  return legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/petition/file",
    params: {
      idpeticoes: params.idpeticoes,
      idprocessos: params.idprocessos,
    },
    formData,
  });
}

/**
 * Enviar anexos da petição
 */
export async function enviarAnexoPeticao(params: {
  idpeticoes: number;
  idprocessos: number;
  tipo_documento: string;
  file: Buffer;
  filename: string;
}) {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(params.file)], { type: "application/pdf" });
  formData.append("file", blob, params.filename);

  return legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/petition/attachments",
    params: {
      idpeticoes: params.idpeticoes,
      idprocessos: params.idprocessos,
      tipo_documento: params.tipo_documento,
    },
    formData,
  });
}

/**
 * Consultar status da petição
 */
export async function consultarStatusPeticao(params: {
  idpeticoes: number;
  idprocessos: number;
}) {
  return legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/petition/status",
    params,
  });
}

// ==================== PETIÇÕES INTERMEDIÁRIAS ====================

/**
 * Criar petição intermediária
 */
export async function criarPeticaoIntermediaria(
  dados: Record<string, unknown>
) {
  return legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/petition/intermediate",
    body: dados,
  });
}

/**
 * Protocolar petição intermediária
 */
export async function protocolarPeticaoIntermediaria(params: {
  idpeticoes: number;
  idprocessos: number;
  idcertificados: number;
}) {
  return legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/petition/intermediate/send",
    params,
  });
}

// ==================== DADOS AUXILIARES ====================

export interface Tribunal {
  value: string;
  label: string;
  sistema?: string;
}

export interface Comarca {
  value: string;
  label: string;
}

export interface Classe {
  value: string;
  label: string;
}

export interface Profissao {
  deProfissao: string;
  deFeminina: string;
  cdProfissao: number;
}

export interface OrgaoExpedidor {
  value: string;
  label: string;
}

export interface Certificado {
  idcertificados: number;
  advogado_nome: string;
  vencimento: string;
}

/**
 * Listar tribunais disponíveis
 */
export async function listarTribunais(): Promise<Tribunal[]> {
  return legalMailRequest<Tribunal[]>({
    method: "GET",
    endpoint: "/api/v1/petition/tribunals",
  });
}

/**
 * Listar comarcas disponíveis
 */
export async function listarComarcas(params: {
  tribunal: string;
  sistema: string;
}): Promise<Comarca[]> {
  return legalMailRequest<Comarca[]>({
    method: "GET",
    endpoint: "/api/v1/petition/county",
    params,
  });
}

/**
 * Listar classes processuais
 */
export async function listarClasses(params: {
  tribunal: string;
  sistema: string;
  comarca: string;
}): Promise<Classe[]> {
  return legalMailRequest<Classe[]>({
    method: "GET",
    endpoint: "/api/v1/petition/classes",
    params,
  });
}

/**
 * Listar assuntos
 */
export async function listarAssuntos(params: {
  tribunal: string;
  sistema: string;
  comarca: string;
  classe: string;
}) {
  return legalMailRequest({
    method: "GET",
    endpoint: "/api/v1/petition/subjects",
    params,
  });
}

/**
 * Listar profissões
 */
export async function listarProfissoes(): Promise<Profissao[]> {
  return legalMailRequest<Profissao[]>({
    method: "GET",
    endpoint: "/api/v1/professions",
  });
}

/**
 * Listar órgãos expedidores
 */
export async function listarOrgaosExpedidores(): Promise<OrgaoExpedidor[]> {
  return legalMailRequest<OrgaoExpedidor[]>({
    method: "GET",
    endpoint: "/api/v1/issuing-agencies",
  });
}

/**
 * Listar certificados cadastrados
 */
export async function listarCertificados(): Promise<Certificado[]> {
  return legalMailRequest<Certificado[]>({
    method: "GET",
    endpoint: "/api/v1/workspace/certificates",
  });
}

// ==================== PARTES ====================

/**
 * Listar partes cadastradas
 */
export async function listarPartes() {
  return legalMailRequest({
    method: "GET",
    endpoint: "/api/v1/parts",
  });
}

/**
 * Criar parte
 */
export async function criarParte(dados: Record<string, unknown>) {
  return legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/parts",
    body: dados,
  });
}

/**
 * Editar parte
 */
export async function editarParte(
  idpartes: number,
  dados: Record<string, unknown>
) {
  return legalMailRequest({
    method: "PUT",
    endpoint: "/api/v1/parts",
    params: { idpartes },
    body: dados,
  });
}

// ==================== WORKSPACE ====================

/**
 * Cadastrar endpoint para notificações (webhook)
 */
export async function cadastrarWebhook(params: {
  endpoint: string;
  key_endpoint?: string;
  nome_aplicacao: string;
}) {
  return legalMailRequest({
    method: "POST",
    endpoint: "/api/v1/workspace/notifications/endpoint",
    params,
  });
}
