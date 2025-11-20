/**
 * Verificação Automática de Petições
 * 
 * Sistema para verificar se petições foram realmente protocoladas:
 * 1. Consulta API LegalMail (GET /api/v1/petition/status)
 * 2. (Futuro) Robô Puppeteer para acessar site do Tribunal
 * 
 * IMPORTANTE: NÃO implementar retry automático para evitar duplicidade!
 * Este módulo serve apenas para VERIFICAR status, não para reprocessar.
 */

import { legalMailRequest } from "./legalmail-client";

/**
 * Status possíveis de uma petição no LegalMail
 */
export type StatusPeticaoLegalMail = 
  | "pendente"        // Criada mas não enviada
  | "enviada"         // Enviada ao tribunal
  | "protocolada"     // Confirmada pelo tribunal
  | "rejeitada"       // Rejeitada pelo tribunal
  | "erro"            // Erro no processamento
  | "desconhecido";   // Não encontrada

/**
 * Resultado da verificação de uma petição
 */
export interface ResultadoVerificacao {
  idPeticoes: number;
  status: StatusPeticaoLegalMail;
  numeroProtocolo?: string;
  dataProtocolo?: string;
  mensagemErro?: string;
  detalhes?: any;
}

/**
 * Verifica status de uma petição no LegalMail
 * 
 * @param idPeticoes - ID da petição no LegalMail
 * @returns Status atual da petição
 */
export async function verificarPeticaoLegalMail(idPeticoes: number): Promise<ResultadoVerificacao> {
  try {
    const response = await legalMailRequest<any>({
      method: "GET",
      endpoint: `/api/v1/petition/status?idpeticoes=${idPeticoes}`,
    });

    // Parse da resposta da API
    // NOTA: Ajustar conforme documentação real da API LegalMail
    const status = mapearStatusLegalMail(response.status || response.situacao);
    
    return {
      idPeticoes,
      status,
      numeroProtocolo: response.numeroProtocolo,
      dataProtocolo: response.dataProtocolo,
      detalhes: response,
    };

  } catch (error) {
    console.error(`[Verificação] Erro ao verificar petição ${idPeticoes}:`, error);
    
    return {
      idPeticoes,
      status: "erro",
      mensagemErro: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Mapeia status da API LegalMail para nosso enum
 */
function mapearStatusLegalMail(statusApi: string): StatusPeticaoLegalMail {
  const statusNormalizado = statusApi?.toLowerCase() || "";
  
  if (statusNormalizado.includes("protocolad")) return "protocolada";
  if (statusNormalizado.includes("enviad")) return "enviada";
  if (statusNormalizado.includes("rejeitad")) return "rejeitada";
  if (statusNormalizado.includes("pendente")) return "pendente";
  if (statusNormalizado.includes("erro")) return "erro";
  
  return "desconhecido";
}

/**
 * Verifica múltiplas petições em lote
 * 
 * @param idPeticoes - Array de IDs de petições
 * @returns Array de resultados
 */
export async function verificarPeticoesEmLote(idPeticoes: number[]): Promise<ResultadoVerificacao[]> {
  const resultados: ResultadoVerificacao[] = [];
  
  for (const id of idPeticoes) {
    const resultado = await verificarPeticaoLegalMail(id);
    resultados.push(resultado);
    
    // Delay de 500ms entre requisições para não sobrecarregar API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return resultados;
}

/**
 * [FUTURO] Verificação via robô Puppeteer
 * 
 * Esta função será implementada no futuro para acessar o site do Tribunal
 * e verificar se a petição realmente foi protocolada.
 * 
 * Fluxo:
 * 1. Abrir navegador headless (Puppeteer)
 * 2. Acessar site do Tribunal (ex: https://projudi.tjgo.jus.br)
 * 3. Fazer login com certificado digital
 * 4. Buscar processo por CNJ
 * 5. Verificar se petição está listada
 * 6. Capturar screenshot como prova
 * 7. Retornar resultado da verificação
 * 
 * IMPORTANTE: Implementar apenas quando necessário, pois:
 * - Requer Puppeteer instalado
 * - Consome mais recursos (navegador headless)
 * - Pode ser bloqueado por CAPTCHA
 * - Depende de certificado digital
 */
export async function verificarPeticaoViaSiteTribunal(
  numeroCNJ: string,
  tribunal: string
): Promise<ResultadoVerificacao> {
  // TODO: Implementar no futuro
  throw new Error("Verificação via site do Tribunal não implementada ainda");
  
  /*
  // Exemplo de implementação futura:
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // 1. Acessar site do Tribunal
    const urlTribunal = obterUrlTribunal(tribunal);
    await page.goto(urlTribunal);
    
    // 2. Fazer login (certificado digital)
    await fazerLoginCertificado(page);
    
    // 3. Buscar processo
    await page.type('#numeroCNJ', numeroCNJ);
    await page.click('#btnBuscar');
    await page.waitForSelector('.resultado-busca');
    
    // 4. Verificar petições
    const peticoes = await page.$$eval('.lista-peticoes .peticao', els => 
      els.map(el => ({
        data: el.querySelector('.data')?.textContent,
        tipo: el.querySelector('.tipo')?.textContent,
        protocolo: el.querySelector('.protocolo')?.textContent,
      }))
    );
    
    // 5. Capturar screenshot
    const screenshot = await page.screenshot({ fullPage: true });
    
    // 6. Retornar resultado
    return {
      idPeticoes: 0, // Não temos ID aqui
      status: peticoes.length > 0 ? "protocolada" : "desconhecido",
      detalhes: { peticoes, screenshot: screenshot.toString('base64') },
    };
    
  } finally {
    await browser.close();
  }
  */
}
