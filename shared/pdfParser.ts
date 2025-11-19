/**
 * Parser de arquivos PDF do sistema Fantini-Inicial-Simples
 * 
 * Extrai metadados de nomes de arquivos PDF:
 * - Número CNJ (normalizado para 25 caracteres)
 * - Códigos do sistema externo (codProc, codPet)
 * - Descrição da petição
 * - Identifica arquivo principal vs anexo
 */

export interface ParsedFile {
  originalName: string;
  normalizedName: string;
  cnjOriginal: string;
  cnjNormalizado: string;
  codProc: number | null;
  codPet: number | null;
  descricao: string;
  hasPattern: boolean;
  isValid: boolean;
  errorMessage?: string;
  codigoTribunal?: string; // Ex: "8.09" para TJGO
}

/**
 * Remove acentos e caracteres especiais de uma string
 */
export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Normaliza número CNJ para formato completo de 25 caracteres
 * 
 * Entrada: 5757.95.2025.8.09.0051 (formato parcial)
 * Saída: 0005757-95.2025.8.09.0051 (25 caracteres)
 */
export function normalizeCNJ(cnjParcial: string): string {
  try {
    // Remove espaços e caracteres inválidos
    const cleaned = cnjParcial.trim().replace(/[^\d.]/g, '');
    
    // Separa por ponto
    const parts = cleaned.split('.');
    
    // Valida estrutura (deve ter 6 partes)
    if (parts.length !== 6) {
      throw new Error(`CNJ inválido: esperado 6 blocos separados por ponto, encontrado ${parts.length}`);
    }
    
    // Completa primeiro bloco com zeros à esquerda (7 dígitos)
    const firstBlock = parts[0].padStart(7, '0');
    
    // Reconstrói com hífen após primeiro bloco
    const normalized = `${firstBlock}-${parts.slice(1).join('.')}`;
    
    // Valida tamanho final (deve ter 25 caracteres)
    if (normalized.length !== 25) {
      throw new Error(`CNJ normalizado inválido: esperado 25 caracteres, obtido ${normalized.length}`);
    }
    
    return normalized;
  } catch (error) {
    throw new Error(`Erro ao normalizar CNJ "${cnjParcial}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extrai número CNJ do nome do arquivo
 * Padrão: 4-7 dígitos, ponto, 2 dígitos, ponto, 4 dígitos, ponto, 1 dígito, ponto, 2 dígitos, ponto, 4 dígitos
 */
function extractCNJ(fileName: string): string | null {
  const cnjRegex = /^(\d{4,7}\.\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/;
  const match = fileName.match(cnjRegex);
  return match ? match[1] : null;
}

/**
 * Extrai código do tribunal do CNJ
 * Ex: "5757.95.2025.8.09.0051" → "8.09" (TJGO)
 */
function extractCodigoTribunal(cnj: string): string | null {
  const parts = cnj.split('.');
  if (parts.length !== 6) return null;
  
  // Formato: NNNNNNN.DD.AAAA.J.TT.OOOO
  // J = Justiça (posição 3)
  // TT = Tribunal (posição 4)
  return `${parts[3]}.${parts[4]}`;
}

/**
 * Extrai códigos _CodProc_CodPet_ do nome do arquivo
 */
function extractCodes(fileName: string): { codProc: number | null; codPet: number | null } {
  // Padrão: _XXXX_YYYY_ (2 números separados por underscore)
  const codesRegex = /_(\d+)_(\d+)_/;
  const match = fileName.match(codesRegex);
  
  if (!match) {
    return { codProc: null, codPet: null };
  }
  
  const num1 = parseInt(match[1], 10);
  const num2 = parseInt(match[2], 10);
  
  // Identifica qual é CodProc e qual é CodPet
  let codProc: number | null = null;
  let codPet: number | null = null;
  
  // CodProc: 1 a 50000
  if (num1 >= 1 && num1 <= 50000) {
    codProc = num1;
  }
  
  // CodPet: > 50000
  if (num2 > 50000) {
    codPet = num2;
  }
  
  // Se não seguir as regras, tenta inverter
  if (!codProc && num2 >= 1 && num2 <= 50000) {
    codProc = num2;
  }
  
  if (!codPet && num1 > 50000) {
    codPet = num1;
  }
  
  return { codProc, codPet };
}

/**
 * Extrai descrição do nome do arquivo
 */
function extractDescription(fileName: string): string {
  // Remove extensão
  let desc = fileName.replace(/\.pdf$/i, '');
  
  // Remove CNJ (início)
  desc = desc.replace(/^\d{4,7}\.\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/, '');
  
  // Remove códigos _XXXX_YYYY_
  desc = desc.replace(/_\d+_\d+_/, '');
  
  // Remove underscores extras
  desc = desc.replace(/^_+|_+$/g, '');
  desc = desc.replace(/_+/g, ' ');
  
  return desc.trim() || 'Sem descrição';
}

/**
 * Faz parsing completo de um nome de arquivo PDF
 */
export function parsePdfFileName(fileName: string): ParsedFile {
  try {
    // Extrai CNJ
    const cnjOriginal = extractCNJ(fileName);
    if (!cnjOriginal) {
      return {
        originalName: fileName,
        normalizedName: removeAccents(fileName),
        cnjOriginal: '',
        cnjNormalizado: '',
        codProc: null,
        codPet: null,
        descricao: extractDescription(fileName),
        hasPattern: false,
        isValid: false,
        errorMessage: 'CNJ não encontrado no nome do arquivo',
      };
    }
    
    // Normaliza CNJ
    let cnjNormalizado: string;
    try {
      cnjNormalizado = normalizeCNJ(cnjOriginal);
    } catch (error) {
      return {
        originalName: fileName,
        normalizedName: removeAccents(fileName),
        cnjOriginal,
        cnjNormalizado: '',
        codProc: null,
        codPet: null,
        descricao: extractDescription(fileName),
        hasPattern: false,
        isValid: false,
        errorMessage: error instanceof Error ? error.message : 'Erro ao normalizar CNJ',
      };
    }
    
    // Extrai código do tribunal
    const codigoTribunal = extractCodigoTribunal(cnjOriginal);
    
    // Extrai códigos
    const { codProc, codPet } = extractCodes(fileName);
    const hasPattern = codProc !== null && codPet !== null;
    
    // Extrai descrição
    const descricao = extractDescription(fileName);
    
    // Normaliza nome do arquivo
    const normalizedName = removeAccents(fileName);
    
    return {
      originalName: fileName,
      normalizedName,
      cnjOriginal,
      cnjNormalizado,
      codProc,
      codPet,
      descricao,
      hasPattern,
      isValid: true,
      codigoTribunal: codigoTribunal || undefined,
    };
  } catch (error) {
    return {
      originalName: fileName,
      normalizedName: removeAccents(fileName),
      cnjOriginal: '',
      cnjNormalizado: '',
      codProc: null,
      codPet: null,
      descricao: extractDescription(fileName),
      hasPattern: false,
      isValid: false,
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido ao fazer parsing',
    };
  }
}

/**
 * Agrupa arquivos por número CNJ normalizado
 */
export function groupByProcess(files: ParsedFile[]): Map<string, ParsedFile[]> {
  const groups = new Map<string, ParsedFile[]>();
  
  for (const file of files) {
    if (!file.isValid || !file.cnjNormalizado) {
      continue; // Ignora arquivos inválidos
    }
    
    const cnj = file.cnjNormalizado;
    if (!groups.has(cnj)) {
      groups.set(cnj, []);
    }
    groups.get(cnj)!.push(file);
  }
  
  return groups;
}

/**
 * Seleciona arquivo principal de um grupo
 * 
 * Prioridade:
 * 1. Procura por palavras-chave: "pet", "req", "memo"
 * 2. Se múltiplos matches, pega o mais curto
 * 3. Fallback: pega o mais curto
 */
export function selectMainFile(arquivos: ParsedFile[]): ParsedFile | null {
  if (arquivos.length === 0) {
    return null;
  }
  
  if (arquivos.length === 1) {
    return arquivos[0];
  }
  
  const keywords = ['pet', 'req', 'memo'];
  
  // 1. Procura por palavras-chave
  for (const keyword of keywords) {
    const matches = arquivos.filter(f => 
      f.originalName.toLowerCase().includes(keyword)
    );
    
    if (matches.length > 0) {
      // Se múltiplos matches, pega o mais curto
      return matches.reduce((shortest, current) => 
        current.originalName.length < shortest.originalName.length ? current : shortest
      );
    }
  }
  
  // 2. Fallback: pega o mais curto
  return arquivos.reduce((shortest, current) => 
    current.originalName.length < shortest.originalName.length ? current : shortest
  );
}

/**
 * Agrupa arquivos por processo e identifica principal vs anexos
 */
export interface ProcessGroup {
  numeroCNJ: string;
  codigoTribunal: string;
  principal: ParsedFile | null;
  anexos: ParsedFile[];
  codProc: number | null;
  codPet: number | null;
}

export function groupAndIdentifyMainFiles(files: ParsedFile[]): ProcessGroup[] {
  const groups = groupByProcess(files);
  const result: ProcessGroup[] = [];
  
  for (const [cnj, arquivos] of Array.from(groups.entries())) {
    // Separar por _CodProc_CodPet_
    const byPattern = new Map<string, ParsedFile[]>();
    const semPadrao: ParsedFile[] = [];
    
    for (const arquivo of arquivos) {
      if (arquivo.hasPattern && arquivo.codProc && arquivo.codPet) {
        const key = `${arquivo.codProc}_${arquivo.codPet}`;
        if (!byPattern.has(key)) {
          byPattern.set(key, []);
        }
        byPattern.get(key)!.push(arquivo);
      } else {
        semPadrao.push(arquivo);
      }
    }
    
    // Para cada padrão, selecionar principal
    for (const [pattern, arquivosDoPattern] of Array.from(byPattern.entries())) {
      const [codProcStr, codPetStr] = pattern.split('_');
      const principal = selectMainFile(arquivosDoPattern);
      const anexos = arquivosDoPattern.filter(a => a !== principal);
      
      // Adicionar arquivos sem padrão como anexos
      anexos.push(...semPadrao as ParsedFile[]);
      
      result.push({
        numeroCNJ: cnj,
        codigoTribunal: arquivos[0].codigoTribunal || '',
        principal,
        anexos,
        codProc: parseInt(codProcStr, 10),
        codPet: parseInt(codPetStr, 10),
      });
    }
    
    // Se não houver padrão, todos são anexos
    if (byPattern.size === 0 && semPadrao.length > 0) {
      result.push({
        numeroCNJ: cnj,
        codigoTribunal: arquivos[0].codigoTribunal || '',
        principal: null,
        anexos: semPadrao,
        codProc: null,
        codPet: null,
      });
    }
  }
  
  return result;
}
