import type { Request, Response } from "express";

/**
 * Gerenciador de conexões SSE para progresso em tempo real
 */
class SSEManager {
  private connections: Map<number, Response[]> = new Map();
  private stopFlags: Map<number, boolean> = new Map();

  /**
   * Adiciona uma conexão SSE para uma batelada
   */
  addConnection(bateladaId: number, res: Response) {
    if (!this.connections.has(bateladaId)) {
      this.connections.set(bateladaId, []);
    }
    this.connections.get(bateladaId)!.push(res);

    // Limpar ao desconectar
    res.on("close", () => {
      this.removeConnection(bateladaId, res);
    });
  }

  /**
   * Remove uma conexão SSE
   */
  removeConnection(bateladaId: number, res: Response) {
    const connections = this.connections.get(bateladaId);
    if (connections) {
      const index = connections.indexOf(res);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.connections.delete(bateladaId);
      }
    }
  }

  /**
   * Envia evento para todas as conexões de uma batelada
   */
  sendEvent(bateladaId: number, event: string, data: any) {
    const connections = this.connections.get(bateladaId);
    if (connections) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      connections.forEach((res) => {
        try {
          res.write(payload);
        } catch (error) {
          console.error(`[SSE] Erro ao enviar evento para batelada ${bateladaId}:`, error);
        }
      });
    }
  }

  /**
   * Marca batelada para parar
   */
  setStopFlag(bateladaId: number) {
    this.stopFlags.set(bateladaId, true);
  }

  /**
   * Verifica se batelada deve parar
   */
  shouldStop(bateladaId: number): boolean {
    return this.stopFlags.get(bateladaId) === true;
  }

  /**
   * Limpa flag de parada
   */
  clearStopFlag(bateladaId: number) {
    this.stopFlags.delete(bateladaId);
  }

  /**
   * Fecha todas as conexões de uma batelada
   */
  closeConnections(bateladaId: number) {
    const connections = this.connections.get(bateladaId);
    if (connections) {
      connections.forEach((res) => {
        try {
          res.end();
        } catch (error) {
          console.error(`[SSE] Erro ao fechar conexão para batelada ${bateladaId}:`, error);
        }
      });
      this.connections.delete(bateladaId);
    }
    this.clearStopFlag(bateladaId);
  }
}

export const sseManager = new SSEManager();

/**
 * Handler para endpoint SSE
 */
export function handleSSE(req: Request, res: Response) {
  const bateladaId = parseInt(req.query.bateladaId as string);

  if (!bateladaId || isNaN(bateladaId)) {
    res.status(400).json({ error: "bateladaId inválido" });
    return;
  }

  // Configurar headers SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Nginx

  // Enviar comentário inicial para manter conexão viva
  res.write(": connected\n\n");

  // Adicionar conexão
  sseManager.addConnection(bateladaId, res);

  console.log(`[SSE] Cliente conectado para batelada ${bateladaId}`);
}

/**
 * Handler para parar batelada
 */
export function handleStop(req: Request, res: Response) {
  const bateladaId = parseInt(req.body.bateladaId);

  if (!bateladaId || isNaN(bateladaId)) {
    res.status(400).json({ error: "bateladaId inválido" });
    return;
  }

  sseManager.setStopFlag(bateladaId);
  console.log(`[SSE] Flag de parada setada para batelada ${bateladaId}`);

  res.json({ success: true, message: "Batelada será parada" });
}

/**
 * Tipos de eventos SSE
 */
export interface SSEProgressEvent {
  type: "progress";
  current: number;
  total: number;
  currentProcess: string;
  successCount: number;
  errorCount: number;
  warningCount: number;
}

export interface SSELogEvent {
  type: "log";
  timestamp: string;
  message: string;
  level: "info" | "success" | "error" | "warning";
}

export interface SSECompleteEvent {
  type: "complete";
  successCount: number;
  errorCount: number;
  warningCount: number;
}

export interface SSEStoppedEvent {
  type: "stopped";
  message: string;
}

export interface SSEErrorEvent {
  type: "error";
  message: string;
}
