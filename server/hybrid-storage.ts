/**
 * Storage Híbrido - Detecta automaticamente o ambiente
 * 
 * - Produção (Manus Cloud): usa Manus Storage API (S3)
 * - Local (desenvolvimento): usa filesystem local
 */

import { ENV } from './_core/env';
import { storagePut as manusStoragePut, storageGet as manusStorageGet } from './storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/**
 * Detecta se está rodando em ambiente Manus Cloud ou local
 */
function isManusCloud(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}

/**
 * Garante que o diretório de uploads existe
 */
async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.access(LOCAL_UPLOADS_DIR);
  } catch {
    await fs.mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Salva arquivo no filesystem local
 */
async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  await ensureUploadsDir();
  
  const normalizedKey = relKey.replace(/^\/+/, '');
  const filePath = path.join(LOCAL_UPLOADS_DIR, normalizedKey);
  
  // Criar diretórios intermediários se necessário
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  // Converter dados para Buffer
  const buffer = typeof data === 'string' 
    ? Buffer.from(data, 'utf-8')
    : Buffer.from(data);
  
  // Salvar arquivo
  await fs.writeFile(filePath, buffer);
  
  // Retornar URL local (para desenvolvimento, usa file:// ou http://localhost)
  const url = `/uploads/${normalizedKey}`;
  
  return { key: normalizedKey, url };
}

/**
 * Recupera arquivo do filesystem local
 */
async function localStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const normalizedKey = relKey.replace(/^\/+/, '');
  const url = `/uploads/${normalizedKey}`;
  
  return { key: normalizedKey, url };
}

/**
 * Salva arquivo (detecta ambiente automaticamente)
 */
export async function hybridStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (isManusCloud()) {
    console.log('[HybridStorage] Usando Manus Storage (S3)');
    return await manusStoragePut(relKey, data, contentType);
  } else {
    console.log('[HybridStorage] Usando Local Storage (filesystem)');
    return await localStoragePut(relKey, data, contentType);
  }
}

/**
 * Recupera URL do arquivo (detecta ambiente automaticamente)
 */
export async function hybridStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (isManusCloud()) {
    console.log('[HybridStorage] Usando Manus Storage (S3)');
    return await manusStorageGet(relKey);
  } else {
    console.log('[HybridStorage] Usando Local Storage (filesystem)');
    return await localStorageGet(relKey);
  }
}

/**
 * Gera nome de arquivo único com hash
 */
export function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const hash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  
  return `${nameWithoutExt}_${timestamp}_${hash}${ext}`;
}

/**
 * Calcula hash MD5 de um buffer
 */
export function calculateFileHash(data: Buffer | Uint8Array): string {
  const buffer = Buffer.from(data);
  return crypto.createHash('md5').update(buffer).digest('hex');
}
