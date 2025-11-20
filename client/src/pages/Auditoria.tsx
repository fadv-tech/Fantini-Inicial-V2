import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, 
  Search, 
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface LogEntry {
  id: number;
  bateladaId: number;
  etapa: string;
  status: string;
  mensagem: string | null;
  requestUrl: string | null;
  requestMethod: string | null;
  requestPayload: any;
  responseStatus: number | null;
  responsePayload: any;
  tempoExecucaoMs: number | null;
  createdAt: Date;
}

export default function Auditoria() {
  const [searchCNJ, setSearchCNJ] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set());
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any[]>([]);
  const [verifyingBatchId, setVerifyingBatchId] = useState<number | null>(null);

  // Queries
  const { data: batches, isLoading: loadingBatches } = trpc.petition.listBatches.useQuery();
  const { data: batchDetails, isLoading: loadingDetails } = trpc.petition.getBatchDetails.useQuery(
    { bateladaId: selectedBatch! },
    { enabled: !!selectedBatch }
  );

  // Query para verificar petições (manual)
  const [idsParaVerificar, setIdsParaVerificar] = useState<number[]>([]);
  const { data: verificacaoData, isLoading: isVerifying, refetch: refetchVerificacao } = trpc.petition.verificarPeticoesLote.useQuery(
    { idPeticoes: idsParaVerificar },
    { enabled: false } // Não executar automaticamente
  );

  // Filtrar bateladas por CNJ (simplificado - buscar na descrição)
  const filteredBatches = batches?.filter((batch: any) => {
    if (!searchCNJ) return true;
    return batch.descricao?.includes(searchCNJ);
  });

  // Toggle expansão de batelada
  const toggleBatch = (batchId: number) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
    setSelectedBatch(batchId);
  };

  // Verificar status das petições via API LegalMail
  const handleVerificarStatus = async (batchId: number) => {
    try {
      setVerifyingBatchId(batchId);
      
      // Buscar detalhes da batelada para obter IDs das petições
      const batch = batches?.find((b: any) => b.id === batchId);
      if (!batch) {
        toast.error("Batelada não encontrada");
        return;
      }
      
      // Buscar processos da batelada
      const response = await fetch(`/api/trpc/petition.getBatchDetails?input=${encodeURIComponent(JSON.stringify({ bateladaId: batchId }))}`);
      const data = await response.json();
      
      if (!data.result?.data?.processos || data.result.data.processos.length === 0) {
        toast.error("Nenhum processo encontrado nesta batelada");
        return;
      }
      
      // Extrair IDs das petições (idpeticoes)
      const idsPeticoes = data.result.data.processos
        .map((p: any) => p.idpeticoes)
        .filter((id: any) => id != null);
      
      if (idsPeticoes.length === 0) {
        toast.error("Nenhuma petição foi criada ainda nesta batelada");
        return;
      }
      
      // Atualizar IDs e triggerar verificação
      setIdsParaVerificar(idsPeticoes);
      const result = await refetchVerificacao();
      
      if (result.data) {
        setVerificationResults(result.data);
        setVerificationDialogOpen(true);
        toast.success(`Verificação concluída: ${idsPeticoes.length} petições verificadas`);
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      toast.error("Erro ao verificar status das petições");
    } finally {
      setVerifyingBatchId(null);
    }
  };

  // Exportar LOG em JSON
  const handleExportJSON = (batchId: number) => {
    const batch = batches?.find((b: any) => b.id === batchId);
    if (!batch) return;

    const dataStr = JSON.stringify(batch, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batelada-${batchId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("LOG exportado em JSON");
  };

  // Exportar LOG em CSV
  const handleExportCSV = (batchId: number) => {
    const batch = batches?.find((b: any) => b.id === batchId);
    if (!batch) return;

    const headers = ["ID", "Descrição", "Total Processos", "Sucessos", "Falhas", "Status", "Data"];
    const row = [
      batch.id,
      batch.descricao || "",
      batch.totalProcessos,
      batch.sucessos,
      batch.falhas,
      batch.status,
      new Date(batch.createdAt).toLocaleString("pt-BR")
    ];

    const csvContent = [
      headers.join(","),
      row.join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batelada-${batchId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("LOG exportado em CSV");
  };

  // Renderizar badge de status de verificação
  const renderVerificationBadge = (status: string) => {
    switch (status) {
      case "protocolada":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Protocolada
          </Badge>
        );
      case "enviada":
        return (
          <Badge variant="default" className="gap-1 bg-blue-600">
            <CheckCircle2 className="h-3 w-3" />
            Enviada
          </Badge>
        );
      case "pendente":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case "rejeitada":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejeitada
          </Badge>
        );
      case "erro":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Desconhecido
          </Badge>
        );
    }
  };

  // Renderizar badge de status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "sucesso":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Sucesso
          </Badge>
        );
      case "erro":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Erro
          </Badge>
        );
      case "processando":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processando
          </Badge>
        );
      case "pendente":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loadingBatches) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Auditoria / LOG
        </h1>
        <p className="text-muted-foreground">
          Histórico completo de protocolizações em batelada
        </p>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Busque por número CNJ ou filtre por data/tribunal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por CNJ (ex: 0123456-78.2024.8.09.0051)..."
                  value={searchCNJ}
                  onChange={(e) => setSearchCNJ(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Bateladas */}
      <div className="space-y-4">
        {filteredBatches && filteredBatches.length > 0 ? (
          filteredBatches.map((batch: any) => (
            <Card key={batch.id}>
              <Collapsible
                open={expandedBatches.has(batch.id)}
                onOpenChange={() => toggleBatch(batch.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">
                          Batelada #{batch.id}
                        </CardTitle>
                        {renderStatusBadge(batch.status)}
                      </div>
                      <CardDescription className="mt-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                          <div>
                            <span className="text-xs text-muted-foreground">Descrição</span>
                            <p className="font-medium">{batch.descricao || "Sem descrição"}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Total Processos</span>
                            <p className="font-medium">{batch.totalProcessos}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Sucessos / Erros</span>
                            <p className="font-medium text-green-600">
                              {batch.sucessos} <span className="text-muted-foreground">/</span>{" "}
                              <span className="text-red-600">{batch.falhas}</span>
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Data</span>
                            <p className="font-medium">
                              {new Date(batch.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerificarStatus(batch.id);
                        }}
                        disabled={isVerifying}
                      >
                        {isVerifying && verifyingBatchId === batch.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Verificar Status
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportJSON(batch.id);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportCSV(batch.id);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button size="sm" variant="ghost">
                          {expandedBatches.has(batch.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent>
                    {/* Resumo */}
                    <div className="mb-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Resumo</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>{batch.sucessos} sucessos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>{batch.falhas} erros</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span>0 avisos</span>
                        </div>
                      </div>
                    </div>

                    {/* LOG Detalhado */}
                    {loadingDetails && selectedBatch === batch.id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : batchDetails && selectedBatch === batch.id ? (
                      <div>
                        <h4 className="font-semibold mb-2">LOG Detalhado</h4>
                        <ScrollArea className="h-[400px] rounded-md border p-4">
                          <div className="space-y-2">
                            {batchDetails.logs?.map((log: LogEntry) => (
                              <div
                                key={log.id}
                                className="p-3 rounded-lg bg-muted/50 text-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {renderStatusBadge(log.status)}
                                      <span className="font-mono text-xs text-muted-foreground">
                                        {log.etapa}
                                      </span>
                                      {log.tempoExecucaoMs && (
                                        <span className="text-xs text-muted-foreground">
                                          ({log.tempoExecucaoMs}ms)
                                        </span>
                                      )}
                                    </div>
                                    <p>{log.mensagem}</p>
                                    {log.requestUrl && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {log.requestMethod} {log.requestUrl}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(log.createdAt).toLocaleTimeString("pt-BR")}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : null}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma batelada encontrada</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Verificação */}
      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultados da Verificação</DialogTitle>
            <DialogDescription>
              Status das petições consultadas via API LegalMail
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {verificationResults.length > 0 ? (
              verificationResults.map((result: any, idx: number) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">Petição #{result.idPeticoes}</span>
                          {renderVerificationBadge(result.status)}
                        </div>
                        {result.numeroProtocolo && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Protocolo:</span> {result.numeroProtocolo}
                          </p>
                        )}
                        {result.dataProtocolo && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Data:</span> {new Date(result.dataProtocolo).toLocaleString("pt-BR")}
                          </p>
                        )}
                        {result.mensagemErro && (
                          <p className="text-sm text-red-600 mt-2">
                            <span className="font-medium">Erro:</span> {result.mensagemErro}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground">Nenhum resultado disponível</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
