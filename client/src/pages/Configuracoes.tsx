import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Save, CheckCircle2, AlertTriangle, Settings2, Wand2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TribunalConfigUI {
  id: number;
  codigoTribunal: string;
  nomeTribunal: string;
  processoSyncCNJ: string | null;
  tiposPeticaoDisponiveis: Array<{ id: number; nome: string }>;
  tiposAnexoDisponiveis: Array<{ id: number; nome: string }>;
  tipoPeticaoPadrao: number | null;
  tipoPeticaoPadraoNome: string | null;
  tipoAnexoPadrao: number | null;
  tipoAnexoPadraoNome: string | null;
  ultimaSincronizacao: Date | null;
  sincronizado: boolean;
}

export default function Configuracoes() {
  const [configs, setConfigs] = useState<TribunalConfigUI[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [editedRows, setEditedRows] = useState<Set<string>>(new Set());
  const [cnjInputs, setCnjInputs] = useState<Record<string, string>>({});

  // Queries
  const { data: tribunaisLegalMail, isLoading: loadingTribunais } = trpc.config.listTribunals.useQuery();

  // Mutations
  const syncTribunalMutation = trpc.config.syncTribunalWithProcess.useMutation();
  const updateTribunalMutation = trpc.config.updateTribunalConfig.useMutation();
  const applyToAllMutation = trpc.config.applyToAllTribunals.useMutation();

  // Carregar configurações iniciais
  useEffect(() => {
    if (tribunaisLegalMail) {
      const initialConfigs: TribunalConfigUI[] = tribunaisLegalMail.map((t: any) => ({
        id: t.id,
        codigoTribunal: t.codigoTribunal,
        nomeTribunal: t.nomeTribunal,
        processoSyncCNJ: t.processoSyncCNJ || null,
        tiposPeticaoDisponiveis: t.tiposPeticaoDisponiveis || [],
        tiposAnexoDisponiveis: t.tiposAnexoDisponiveis || [],
        tipoPeticaoPadrao: t.tipoPeticaoPadrao || null,
        tipoPeticaoPadraoNome: t.tipoPeticaoPadraoNome || null,
        tipoAnexoPadrao: t.tipoAnexoPadrao || null,
        tipoAnexoPadraoNome: t.tipoAnexoPadraoNome || null,
        ultimaSincronizacao: t.ultimaSincronizacao ? new Date(t.ultimaSincronizacao) : null,
        sincronizado: !!t.ultimaSincronizacao,
      }));
      setConfigs(initialConfigs);
    }
  }, [tribunaisLegalMail]);

  // Sincronizar um tribunal com processo válido
  const handleSyncTribunal = async (codigoTribunal: string) => {
    const cnj = cnjInputs[codigoTribunal];
    
    if (!cnj || cnj.trim() === "") {
      toast.error("Informe um número de processo (CNJ) válido");
      return;
    }

    try {
      setIsSyncing(codigoTribunal);
      const result = await syncTribunalMutation.mutateAsync({
        codigoTribunal,
        numeroCNJ: cnj,
      });

      // Atualizar config local com tipos carregados
      setConfigs(prev => prev.map(c => 
        c.codigoTribunal === codigoTribunal 
          ? {
              ...c,
              processoSyncCNJ: cnj,
              sincronizado: true,
              ultimaSincronizacao: new Date(),
              tiposPeticaoDisponiveis: Array.isArray(result.tiposPeticao) ? result.tiposPeticao : [],
              tiposAnexoDisponiveis: Array.isArray(result.tiposAnexo) ? result.tiposAnexo : [],
            }
          : c
      ));
      setCnjInputs(prev => ({ ...prev, [codigoTribunal]: "" }));

      toast.success(`Tribunal ${codigoTribunal} sincronizado com sucesso!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao sincronizar";
      toast.error(message);
    } finally {
      setIsSyncing(null);
    }
  };

  // Atualizar tipo de petição
  const handleUpdateTipoPeticao = (codigoTribunal: string, tipoPeticaoId: string) => {
    const tribunal = configs.find(c => c.codigoTribunal === codigoTribunal);
    const tipo = tribunal?.tiposPeticaoDisponiveis.find(t => t.id === parseInt(tipoPeticaoId));

    setConfigs(prev => prev.map(c => 
      c.codigoTribunal === codigoTribunal 
        ? {
            ...c,
            tipoPeticaoPadrao: parseInt(tipoPeticaoId),
            tipoPeticaoPadraoNome: tipo?.nome || null,
          }
        : c
    ));
    setEditedRows(prev => new Set(prev).add(codigoTribunal));
  };

  // Atualizar tipo de anexo
  const handleUpdateTipoAnexo = (codigoTribunal: string, tipoAnexoId: string) => {
    const tribunal = configs.find(c => c.codigoTribunal === codigoTribunal);
    const tipo = tribunal?.tiposAnexoDisponiveis.find(t => t.id === parseInt(tipoAnexoId));

    setConfigs(prev => prev.map(c => 
      c.codigoTribunal === codigoTribunal 
        ? {
            ...c,
            tipoAnexoPadrao: tipoAnexoId === "null" ? null : parseInt(tipoAnexoId),
            tipoAnexoPadraoNome: tipoAnexoId === "null" ? null : (tipo?.nome || null),
          }
        : c
    ));
    setEditedRows(prev => new Set(prev).add(codigoTribunal));
  };

  // Salvar alterações de um tribunal
  const handleSaveTribunal = async (codigoTribunal: string) => {
    const config = configs.find(c => c.codigoTribunal === codigoTribunal);
    if (!config) return;

    try {
      await updateTribunalMutation.mutateAsync({
        codigoTribunal,
        tipoPeticaoPadrao: config.tipoPeticaoPadrao ?? undefined,
        tipoPeticaoPadraoNome: config.tipoPeticaoPadraoNome ?? undefined,
        tipoAnexoPadrao: config.tipoAnexoPadrao ?? undefined,
        tipoAnexoPadraoNome: config.tipoAnexoPadraoNome ?? undefined,
      });

      setEditedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(codigoTribunal);
        return newSet;
      });

      toast.success(`Configuração do ${codigoTribunal} salva`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar";
      toast.error(message);
    }
  };

  // Aplicar configuração para todos
  const handleApplyToAll = async () => {
    const firstConfig = configs[0];
    if (!firstConfig || !firstConfig.tipoPeticaoPadrao) {
      toast.error("Configure o primeiro tribunal antes de aplicar para todos");
      return;
    }

    try {
      await applyToAllMutation.mutateAsync({
        tipoPeticaoPadrao: firstConfig.tipoPeticaoPadrao ?? undefined,
        tipoPeticaoPadraoNome: firstConfig.tipoPeticaoPadraoNome ?? undefined,
        tipoAnexoPadrao: firstConfig.tipoAnexoPadrao ?? undefined,
        tipoAnexoPadraoNome: firstConfig.tipoAnexoPadraoNome ?? undefined,
      });

      // Atualizar todos localmente
      setConfigs(prev => prev.map(c => ({
        ...c,
        tipoPeticaoPadrao: firstConfig.tipoPeticaoPadrao,
        tipoPeticaoPadraoNome: firstConfig.tipoPeticaoPadraoNome,
        tipoAnexoPadrao: firstConfig.tipoAnexoPadrao,
        tipoAnexoPadraoNome: firstConfig.tipoAnexoPadraoNome,
      })));

      setEditedRows(new Set());
      toast.success("Configuração aplicada para todos os tribunais");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao aplicar";
      toast.error(message);
    }
  };

  if (loadingTribunais) {
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
          <Settings2 className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Configure os tipos de petição e anexo padrão para cada tribunal
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Como funciona:</strong> Informe um número CNJ válido de um processo daquele tribunal, clique em "Popular" para carregar os tipos disponíveis, e então escolha os padrões.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tribunais ({configs.length})</CardTitle>
              <CardDescription>
                Sincronize cada tribunal com um processo válido para carregar os tipos disponíveis
              </CardDescription>
            </div>
            <Button
              onClick={handleApplyToAll}
              disabled={!configs[0]?.tipoPeticaoPadrao}
            >
              Aplicar para Todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Código</TableHead>
                  <TableHead className="w-[120px]">Tribunal</TableHead>
                  <TableHead className="w-[150px]">Processo (CNJ)</TableHead>
                  <TableHead className="w-[180px]">Tipo Petição</TableHead>
                  <TableHead className="w-[180px]">Tipo Anexo</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.codigoTribunal}>
                    <TableCell className="font-mono font-semibold text-sm">
                      {config.codigoTribunal}
                    </TableCell>
                    <TableCell className="text-sm">{config.nomeTribunal}</TableCell>
                    
                    {/* Campo CNJ + Botão Popular */}
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          placeholder="CNJ..."
                          value={cnjInputs[config.codigoTribunal] || ""}
                          onChange={(e) => setCnjInputs(prev => ({
                            ...prev,
                            [config.codigoTribunal]: e.target.value
                          }))}
                          disabled={isSyncing === config.codigoTribunal}
                          className="text-xs h-8"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncTribunal(config.codigoTribunal)}
                          disabled={isSyncing === config.codigoTribunal}
                          className="h-8 px-2"
                        >
                          {isSyncing === config.codigoTribunal ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>

                    {/* Select Tipo Petição - Dinâmico */}
                    <TableCell>
                      <Select
                        value={config.tipoPeticaoPadrao?.toString() || ""}
                        onValueChange={(value) => handleUpdateTipoPeticao(config.codigoTribunal, value)}
                        disabled={!config.sincronizado || config.tiposPeticaoDisponiveis.length === 0}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={config.sincronizado ? "Selecione..." : "Sincronize primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {config.tiposPeticaoDisponiveis.map(tipo => (
                            <SelectItem key={tipo.id} value={tipo.id.toString()}>
                              {tipo.id} - {tipo.nome.substring(0, 30)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Select Tipo Anexo - Dinâmico */}
                    <TableCell>
                      <Select
                        value={config.tipoAnexoPadrao?.toString() || "null"}
                        onValueChange={(value) => handleUpdateTipoAnexo(config.codigoTribunal, value)}
                        disabled={!config.sincronizado || config.tiposAnexoDisponiveis.length === 0}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={config.sincronizado ? "Selecione..." : "Sincronize primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Nenhum</SelectItem>
                          {config.tiposAnexoDisponiveis.map(tipo => (
                            <SelectItem key={tipo.id} value={tipo.id.toString()}>
                              {tipo.id} - {tipo.nome.substring(0, 30)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {config.sincronizado ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>

                    {/* Botões Ações */}
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleSaveTribunal(config.codigoTribunal)}
                        disabled={!editedRows.has(config.codigoTribunal)}
                        className="h-8 px-2 text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Salvar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
