import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileText, 
  Paperclip, 
  Send, 
  StopCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ParsedFile {
  name: string;
  size: number;
  base64: string;
  cnj: string;
  codProc: string;
  codPet: string;
  descricao: string;
  tribunal: string;
  isPrincipal: boolean;
  isDuplicate?: boolean;
  error?: string;
}

interface GroupedProcess {
  cnj: string;
  tribunal: string;
  principal: ParsedFile | null;
  anexos: ParsedFile[];
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export default function SendPetition() {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [groupedProcesses, setGroupedProcesses] = useState<GroupedProcess[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<string>("2562"); // Wesley padrão
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProcess, setCurrentProcess] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState({ success: 0, error: 0, warning: 0 });

  // Queries
  const { data: certificates, isLoading: loadingCerts } = trpc.petition.listCertificates.useQuery();
  
  // Mutations
  const parseFilesMutation = trpc.petition.parseFiles.useMutation();
  const uploadFilesMutation = trpc.petition.uploadFiles.useMutation();

  // Adicionar log
  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    setLogs(prev => [{ timestamp, message, type }, ...prev]);
  }, []);

  // Converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(",")[1]); // Remove "data:application/pdf;base64,"
      };
      reader.onerror = reject;
    });
  };

  // Dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      addLog(`📥 ${acceptedFiles.length} arquivo(s) recebido(s)`, "info");
      
      // Converter para base64
      const filesWithBase64 = await Promise.all(
        acceptedFiles.map(async (file) => ({
          name: file.name,
          size: file.size,
          base64: await fileToBase64(file),
        }))
      );

      addLog("🔍 Analisando nomes dos arquivos...", "info");

      // Fazer parsing dos nomes
      const result = await parseFilesMutation.mutateAsync({
        fileNames: filesWithBase64.map(f => f.name),
      });

      // Combinar parsed com base64
      const parsedWithData = result.parsed.map((p, idx) => ({
        ...p,
        base64: filesWithBase64[idx]!.base64,
        size: filesWithBase64[idx]!.size,
      }));

      setFiles(parsedWithData as any);
      setGroupedProcesses(result.groups as any);

      addLog(
        `✅ ${result.totalFiles} arquivo(s) processado(s) | ${result.groups.length} processo(s) identificado(s)`,
        "success"
      );

      // Verificar erros
      const errors = result.parsed.filter(f => !f.isValid);

      if (errors.length > 0) {
        addLog(`❌ ${errors.length} arquivo(s) com erro no nome`, "error");
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao processar arquivos";
      addLog(`❌ ERRO: ${message}`, "error");
      toast.error(message);
    }
  }, [parseFilesMutation, addLog]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
  });

  // Protocolizar
  const handleProtocolizar = async () => {
    if (files.length === 0) {
      toast.error("Nenhum arquivo para protocolar");
      return;
    }

    if (!selectedCertificate) {
      toast.error("Selecione um certificado");
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      addLog("🚀 Iniciando protocolização em batelada...", "info");

      // Upload dos arquivos e criação da batelada
      const certificado = certificates?.find(c => c.id.toString() === selectedCertificate);
      
      const result = await uploadFilesMutation.mutateAsync({
        files: files.map(f => ({
          name: f.name,
          size: f.size,
          content: f.base64,
        })),
        certificadoId: parseInt(selectedCertificate),
        certificadoNome: certificado?.nome || "Desconhecido",
      });

      setBatchId(result.bateladaId);
      addLog(`✅ Batelada #${result.bateladaId} criada com sucesso`, "success");

      // TODO: Conectar SSE para progresso em tempo real
      // Por enquanto, simular progresso
      simulateProgress(result.totalProcessos);

    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao protocolar";
      addLog(`❌ ERRO: ${message}`, "error");
      toast.error(message);
      setIsProcessing(false);
    }
  };

  // Simular progresso (será substituído por SSE)
  const simulateProgress = (total: number) => {
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setProgress((current / total) * 100);
      setCurrentProcess(`Processo ${current}/${total}`);
      addLog(`📄 Protocolando processo ${current}/${total}...`, "info");

      if (current >= total) {
        clearInterval(interval);
        setIsProcessing(false);
        setSummary({ success: total - 2, error: 2, warning: 1 });
        setShowSummary(true);
        addLog("✅ Batelada concluída!", "success");
      }
    }, 1000);
  };

  // Parar processamento
  const handleParar = () => {
    // TODO: Implementar parada via SSE
    setIsProcessing(false);
    addLog("⏸️ Processamento interrompido pelo usuário", "warning");
    toast.warning("Processamento interrompido");
  };

  // Limpar
  const handleLimpar = () => {
    setFiles([]);
    setGroupedProcesses([]);
    setLogs([]);
    setProgress(0);
    setCurrentProcess("");
    setBatchId(null);
    setShowSummary(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Enviar Petições</h1>
        <p className="text-muted-foreground">
          Sistema de protocolização em lote - Fantini Inicial Simples
        </p>
      </div>

      <Tabs defaultValue="intermediarias" className="w-full">
        <TabsList>
          <TabsTrigger value="intermediarias">Petições Intermediárias</TabsTrigger>
          <TabsTrigger value="iniciais" disabled>
            Petições Iniciais (Em breve)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intermediarias" className="space-y-6">
          {/* Seleção de Certificado */}
          <Card>
            <CardHeader>
              <CardTitle>Certificado Digital</CardTitle>
              <CardDescription>
                Selecione o certificado para assinar as petições
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedCertificate} onValueChange={setSelectedCertificate}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Selecione um certificado" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCerts ? (
                    <SelectItem value="loading" disabled>
                      Carregando...
                    </SelectItem>
                  ) : certificates && certificates.length > 0 ? (
                    certificates.map((cert: any) => (
                      <SelectItem key={cert.id} value={cert.id.toString()}>
                        {cert.nome} - Vencimento: {cert.vencimento}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Nenhum certificado disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Upload de Arquivos */}
          <Card>
            <CardHeader>
              <CardTitle>Arquivos PDF</CardTitle>
              <CardDescription>
                Arraste e solte os arquivos PDF ou clique para selecionar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                  transition-colors
                  ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                  hover:border-primary hover:bg-primary/5
                `}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-lg">Solte os arquivos aqui...</p>
                ) : (
                  <div>
                    <p className="text-lg mb-2">
                      Arraste arquivos PDF aqui ou clique para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Suporta múltiplos arquivos
                    </p>
                  </div>
                )}
              </div>

              {/* Lista de Processos Agrupados */}
              {groupedProcesses.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {groupedProcesses.length} Processo(s) Identificado(s)
                    </h3>
                    <Button variant="outline" size="sm" onClick={handleLimpar}>
                      Limpar Tudo
                    </Button>
                  </div>

                  {groupedProcesses.map((process, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {process.cnj}
                            </CardTitle>
                            <CardDescription>{process.tribunal}</CardDescription>
                          </div>
                          <Badge variant="outline">
                            {process.principal ? 1 : 0} principal +{" "}
                            {process.anexos.length} anexo(s)
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {/* Arquivo Principal */}
                        {process.principal && (
                          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {process.principal.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(process.principal.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                            {process.principal.isDuplicate && (
                              <Badge variant="outline" className="text-yellow-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Duplicado
                              </Badge>
                            )}
                            {process.principal.error && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Anexos */}
                        {process.anexos.map((anexo, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{anexo.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(anexo.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                            {anexo.isDuplicate && (
                              <Badge variant="outline" className="text-yellow-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Duplicado
                              </Badge>
                            )}
                            {anexo.error && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          {groupedProcesses.length > 0 && (
            <div className="flex gap-4">
              <Button
                onClick={handleProtocolizar}
                disabled={isProcessing}
                size="lg"
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Protocolizando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Protocolizar Batelada
                  </>
                )}
              </Button>

              {isProcessing && (
                <Button
                  onClick={handleParar}
                  variant="destructive"
                  size="lg"
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  Parar
                </Button>
              )}
            </div>
          )}

          {/* Progresso */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle>Progresso</CardTitle>
                <CardDescription>{currentProcess}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} className="w-full" />
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>{summary.success} sucessos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>{summary.error} erros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>{summary.warning} avisos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* LOG em Tempo Real */}
          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>LOG de Processamento</CardTitle>
                <CardDescription>
                  Acompanhe em tempo real (mais recentes no topo)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="space-y-2 font-mono text-sm">
                    {logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`
                          ${log.type === "success" ? "text-green-600" : ""}
                          ${log.type === "error" ? "text-red-600" : ""}
                          ${log.type === "warning" ? "text-yellow-600" : ""}
                          ${log.type === "info" ? "text-muted-foreground" : ""}
                        `}
                      >
                        [{log.timestamp}] {log.message}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Modal de Resumo (simplificado) */}
          {showSummary && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Batelada concluída!</p>
                  <p>
                    ✅ {summary.success} sucessos | ❌ {summary.error} erros | ⚠️{" "}
                    {summary.warning} avisos
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Redirecionar para /auditoria
                      toast.info("Redirecionando para auditoria...");
                    }}
                  >
                    Ver Detalhes na Auditoria
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
