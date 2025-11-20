import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Save, CheckCircle2, AlertTriangle, Settings2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TribunalConfig {
  codigoTribunal: string;
  nomeTribunal: string;
  tipoPeticaoPadrao: number | null;
  tipoAnexoPadrao: number | null;
  sincronizado: boolean;
}

export default function Configuracoes() {
  const [configs, setConfigs] = useState<TribunalConfig[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editedRows, setEditedRows] = useState<Set<string>>(new Set());

  // Queries
  const { data: tribunaisLegalMail, isLoading: loadingTribunais } = trpc.config.listTribunals.useQuery();

  // Mutations
  const syncTribunalMutation = trpc.config.syncTribunalWithLegalMail.useMutation();
  const updateTribunalMutation = trpc.config.updateTribunal.useMutation();
  const applyToAllMutation = trpc.config.applyToAllTribunals.useMutation();

  // Carregar configurações iniciais
  useEffect(() => {
    if (tribunaisLegalMail) {
      const initialConfigs: TribunalConfig[] = tribunaisLegalMail.map((t: any) => ({
        codigoTribunal: t.codigo,
        nomeTribunal: t.nome,
        tipoPeticaoPadrao: null,
        tipoAnexoPadrao: null,
        sincronizado: false,
      }));
      setConfigs(initialConfigs);
    }
  }, [tribunaisLegalMail]);

  // Sincronizar um tribunal específico
  const handleSyncTribunal = async (codigoTribunal: string) => {
    try {
      setIsSyncing(true);
      const result = await syncTribunalMutation.mutateAsync({ codigoTribunal });
      
      // Atualizar config local
      setConfigs(prev => prev.map(c => 
        c.codigoTribunal === codigoTribunal 
          ? { ...c, ...result, sincronizado: true }
          : c
      ));

      toast.success(`Tribunal ${codigoTribunal} sincronizado com sucesso`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao sincronizar";
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sincronizar todos os tribunais
  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      
      for (const config of configs) {
        await handleSyncTribunal(config.codigoTribunal);
      }

      toast.success("Todos os tribunais foram sincronizados");
    } catch (error) {
      toast.error("Erro ao sincronizar tribunais");
    } finally {
      setIsSyncing(false);
    }
  };

  // Atualizar tipo de petição
  const handleUpdateTipoPeticao = (codigoTribunal: string, tipoPeticao: string) => {
    setConfigs(prev => prev.map(c => 
      c.codigoTribunal === codigoTribunal 
        ? { ...c, tipoPeticaoPadrao: parseInt(tipoPeticao) }
        : c
    ));
    setEditedRows(prev => new Set(prev).add(codigoTribunal));
  };

  // Atualizar tipo de anexo
  const handleUpdateTipoAnexo = (codigoTribunal: string, tipoAnexo: string) => {
    setConfigs(prev => prev.map(c => 
      c.codigoTribunal === codigoTribunal 
        ? { ...c, tipoAnexoPadrao: tipoAnexo === "null" ? null : parseInt(tipoAnexo) }
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
        tipoPeticaoPadrao: config.tipoPeticaoPadrao,
        tipoAnexoPadrao: config.tipoAnexoPadrao,
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
        codigoTribunalOrigem: firstConfig.codigoTribunal,
      });

      // Atualizar todos localmente
      setConfigs(prev => prev.map(c => ({
        ...c,
        tipoPeticaoPadrao: firstConfig.tipoPeticaoPadrao,
        tipoAnexoPadrao: firstConfig.tipoAnexoPadrao,
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
          <strong>Importante:</strong> Sincronize cada tribunal com o LegalMail para obter os tipos de petição disponíveis.
          O TJGO não aceita tipos de anexo (sempre null).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tribunais ({configs.length})</CardTitle>
              <CardDescription>
                Gerencie as configurações de protocolização para cada tribunal
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSyncAll}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar Todos
              </Button>
              <Button
                onClick={handleApplyToAll}
                disabled={!configs[0]?.tipoPeticaoPadrao}
              >
                Aplicar para Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead className="w-[200px]">Tipo Petição</TableHead>
                  <TableHead className="w-[200px]">Tipo Anexo</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.codigoTribunal}>
                    <TableCell className="font-mono font-semibold">
                      {config.codigoTribunal}
                    </TableCell>
                    <TableCell>{config.nomeTribunal}</TableCell>
                    <TableCell>
                      <Select
                        value={config.tipoPeticaoPadrao?.toString() || ""}
                        onValueChange={(value) => handleUpdateTipoPeticao(config.codigoTribunal, value)}
                        disabled={!config.sincronizado}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6046">6046 - Petição Intermediária</SelectItem>
                          <SelectItem value="6047">6047 - Contestação</SelectItem>
                          <SelectItem value="6048">6048 - Recurso</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={config.tipoAnexoPadrao?.toString() || "null"}
                        onValueChange={(value) => handleUpdateTipoAnexo(config.codigoTribunal, value)}
                        disabled={!config.sincronizado}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Nenhum (TJGO)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {config.sincronizado ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Sincronizado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Não sincronizado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncTribunal(config.codigoTribunal)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveTribunal(config.codigoTribunal)}
                          disabled={!editedRows.has(config.codigoTribunal)}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      </div>
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
