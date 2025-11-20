import { Router, type Response } from "express";
import multer from "multer";
import { hybridStoragePut, calculateFileHash } from "../hybrid-storage";
import { parsePdfFileName } from "../../shared/pdfParser";

const router = Router();

// Configurar multer para upload em memória (não salvar em disco temporário)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas PDFs
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos PDF são permitidos"));
    }
  },
});

/**
 * POST /api/upload
 * Upload direto de arquivos PDF via FormData (sem Base64)
 * 
 * Body (multipart/form-data):
 * - files: File[] - Arquivos PDF
 * 
 * Response:
 * {
 *   success: true,
 *   files: [{
 *     nomeOriginal: string,
 *     nomeNormalizado: string,
 *     tamanhoBytes: number,
 *     s3Key: string,
 *     s3Url: string,
 *     hash: string,
 *     cnj: string,
 *     codProc: number,
 *     codPet: number,
 *     descricao: string,
 *     tribunal: string,
 *     isPrincipal: boolean
 *   }]
 * }
 */
router.post("/upload", upload.array("files", 100), async (req: any, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nenhum arquivo enviado",
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      // Parse do nome do arquivo
      const parsed = parsePdfFileName(file.originalname);

      // Gerar nome normalizado
      const timestamp = Date.now();
      const nomeNormalizado = `${parsed.cnjNormalizado}-${parsed.codProc || "ANEXO"}-${timestamp}.pdf`;

      // Calcular hash MD5
      const hash = calculateFileHash(file.buffer);

      // Salvar no storage híbrido (S3 ou filesystem)
      const s3Key = `uploads/${new Date().toISOString().split("T")[0]}/${nomeNormalizado}`;
      const { url: s3Url } = await hybridStoragePut(s3Key, file.buffer, "application/pdf");

      uploadedFiles.push({
        nomeOriginal: file.originalname,
        nomeNormalizado,
        tamanhoBytes: file.size,
        s3Key,
        s3Url,
        hash,
        cnj: parsed.cnjNormalizado,
        codProc: parsed.codProc,
        codPet: parsed.codPet,
        descricao: parsed.descricao,
        tribunal: parsed.codigoTribunal || "desconhecido",
        isPrincipal: parsed.codProc !== null, // Se tem codProc, é principal
      });
    }

    return res.json({
      success: true,
      files: uploadedFiles,
    });

  } catch (error) {
    console.error("[Upload] Erro ao processar upload:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erro ao processar upload",
    });
  }
});

export default router;
