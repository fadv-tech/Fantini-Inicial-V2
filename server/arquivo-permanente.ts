import { hybridStoragePut, isManusCloud } from "./hybrid-storage";
import fs from "fs";
import path from "path";

/**
 * Arquivamento Permanente de PDFs
 * 
 * TODOS os PDFs que circulam no sistema são salvos eternamente em:
 * - Manus Cloud (S3): s3://bucket/arquivos-eternos/{ano}/{mes}/{dia}/{filename}
 * - Ubuntu Local (filesystem): /home/ubuntu/arquivos-eternos/{ano}/{mes}/{dia}/{filename}
 * 
 * Estrutura de pastas organizada por data para facilitar auditoria e backup.
 */

const ARQUIVO_ETERNO_BASE_PATH = "/home/ubuntu/arquivos-eternos";

/**
 * Gera caminho relativo para arquivo permanente
 * Exemplo: 2024/11/20/CNJ-0123456-78.2024.8.09.0051-PETICAO-INICIAL-1732123456789.pdf
 */
function gerarCaminhoArquivo(cnj: string, tipo: "PETICAO-INICIAL" | "ANEXO", nomeOriginal: string): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const dia = String(now.getDate()).padStart(2, "0");
  const timestamp = Date.now();
  
  // Normalizar nome do arquivo (remover caracteres especiais)
  const nomeNormalizado = nomeOriginal
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 100); // Limitar tamanho
  
  const filename = `CNJ-${cnj}-${tipo}-${timestamp}-${nomeNormalizado}.pdf`;
  
  return `${ano}/${mes}/${dia}/${filename}`;
}

/**
 * Arquiva PDF permanentemente (S3 ou filesystem local)
 * 
 * @param buffer - Buffer do arquivo PDF
 * @param cnj - Número CNJ do processo
 * @param tipo - Tipo do arquivo (PETICAO-INICIAL ou ANEXO)
 * @param nomeOriginal - Nome original do arquivo
 * @returns Caminho completo do arquivo arquivado
 */
export async function arquivarPDF(
  buffer: Buffer,
  cnj: string,
  tipo: "PETICAO-INICIAL" | "ANEXO",
  nomeOriginal: string
): Promise<{ caminhoCompleto: string; url?: string }> {
  const caminhoRelativo = gerarCaminhoArquivo(cnj, tipo, nomeOriginal);
  
  if (isManusCloud()) {
    // Manus Cloud: salvar no S3
    const s3Key = `arquivos-eternos/${caminhoRelativo}`;
    const { url } = await hybridStoragePut(s3Key, buffer, "application/pdf");
    
    console.log(`[Arquivo Permanente] Salvo no S3: ${s3Key}`);
    
    return {
      caminhoCompleto: s3Key,
      url,
    };
  } else {
    // Ubuntu Local: salvar no filesystem
    const caminhoCompleto = path.join(ARQUIVO_ETERNO_BASE_PATH, caminhoRelativo);
    const diretorio = path.dirname(caminhoCompleto);
    
    // Criar diretórios se não existirem
    if (!fs.existsSync(diretorio)) {
      fs.mkdirSync(diretorio, { recursive: true });
    }
    
    // Salvar arquivo
    fs.writeFileSync(caminhoCompleto, buffer);
    
    console.log(`[Arquivo Permanente] Salvo localmente: ${caminhoCompleto}`);
    
    return {
      caminhoCompleto,
    };
  }
}

/**
 * Trunca payload Base64 para logs (evita salvar MB de dados no banco)
 * 
 * @param base64 - String Base64 completa
 * @param tamanhoBytes - Tamanho original do arquivo em bytes
 * @returns String truncada com metadados
 */
export function truncarPayloadBase64(base64: string, tamanhoBytes: number): string {
  const tamanhoMB = (tamanhoBytes / (1024 * 1024)).toFixed(2);
  return `[TRUNCADO - ${tamanhoMB} MB - ${base64.length} caracteres Base64]`;
}

/**
 * Limpa arquivos temporários (opcional, para economizar espaço)
 * Remove arquivos do storage temporário após arquivamento permanente
 * 
 * ATENÇÃO: Só executar após confirmar que arquivo foi arquivado com sucesso!
 */
export async function limparArquivoTemporario(s3Key: string): Promise<void> {
  // TODO: Implementar limpeza de arquivos temporários se necessário
  // Por ora, manter arquivos temporários para segurança
  console.log(`[Arquivo Permanente] Arquivo temporário mantido: ${s3Key}`);
}
