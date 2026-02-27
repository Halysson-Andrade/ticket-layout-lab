import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Search, Play, Calendar, MapPin, Loader2, ExternalLink, FileText, Copy, Check, Key, AlertTriangle } from 'lucide-react';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

interface SimEvent {
  id: string;
  external_id: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  status: string;
  image_url: string | null;
}

const SimulacaoPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [docEvent, setDocEvent] = useState<SimEvent | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [integrationToken, setIntegrationToken] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulate-api?action=list-events&company_id=${COMPANY_ID}`;
      const res = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        toast.error('Erro ao carregar eventos');
      }
    } catch {
      toast.error('Erro ao carregar eventos');
    }
    setLoading(false);
  }, [session]);
  // Check if token is configured
  const fetchTokenStatus = useCallback(async () => {
    const { data } = await supabase
      .from('company_integrations')
      .select('token_secret_hash')
      .eq('company_id', COMPANY_ID)
      .maybeSingle();
    if (!data?.token_secret_hash) {
      setIntegrationToken(null);
    }
    // Token hash exists but we can't retrieve the raw value - user must input it
  }, []);

  useEffect(() => {
    if (session) {
      fetchEvents();
      fetchTokenStatus();
    }
  }, [fetchEvents, fetchTokenStatus, session]);

  const handleOpenEvent = (evt: SimEvent) => {
    if (!integrationToken) {
      toast.error('Informe o Token de Integração no campo acima antes de abrir um evento.');
      return;
    }
    const params = new URLSearchParams({
      id_evento: evt.external_id,
      token: integrationToken,
    });
    navigate(`/mapstudio?${params.toString()}`);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const buildRedirectUrl = (evt: SimEvent) => {
    const base = window.location.origin;
    return `${base}/mapstudio?id_evento=${evt.external_id}&token=SEU_TOKEN_AQUI`;
  };

  const filtered = events.filter(
    (e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.external_id.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Play className="h-6 w-6" /> Simulação de Integração
        </h1>
        <p className="text-muted-foreground">
          Simule o fluxo de um cliente integrando com o Map Studio. Selecione um evento para criar ou editar o mapa.
        </p>
      </div>

      {/* Token Input */}
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Key className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">Token de Integração:</span>
          <Input
            type="password"
            placeholder="Cole aqui o token gerado em Empresas > Integração"
            value={integrationToken || ''}
            onChange={(e) => setIntegrationToken(e.target.value || null)}
            className="max-w-md h-8 text-sm"
          />
          {!integrationToken && (
            <span className="text-xs text-amber-600 whitespace-nowrap flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Obrigatório para abrir eventos
            </span>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, local, cidade ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="text-xs">
          {filtered.length} evento{filtered.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhum evento encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((evt) => (
            <Card
              key={evt.id}
              className="overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div
                className="relative h-40 bg-muted overflow-hidden cursor-pointer"
                onClick={() => handleOpenEvent(evt)}
              >
                {evt.image_url ? (
                  <img
                    src={evt.image_url}
                    alt={evt.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <MapPin className="h-12 w-12" />
                  </div>
                )}
                <Badge
                  className={`absolute top-2 right-2 ${
                    evt.status === 'ativo'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-muted-foreground'
                  }`}
                >
                  {evt.status === 'ativo' ? 'Ativo' : 'Encerrado'}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm line-clamp-2 cursor-pointer" onClick={() => handleOpenEvent(evt)}>{evt.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{evt.venue} — {evt.city}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(evt.date)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-mono text-muted-foreground">{evt.external_id}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); setDocEvent(evt); }}
                      title="Documentação de redirecionamento"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <ExternalLink
                      className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => handleOpenEvent(evt)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Documentação de Redirecionamento */}
      <Dialog open={!!docEvent} onOpenChange={(v) => !v && setDocEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentação de Redirecionamento
            </DialogTitle>
          </DialogHeader>

          {docEvent && (
            <div className="space-y-5 text-sm">
              {/* Evento Info */}
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="font-medium text-foreground">{docEvent.name}</p>
                <p className="text-xs text-muted-foreground">{docEvent.venue} — {docEvent.city}</p>
                <p className="text-xs font-mono text-muted-foreground">ID Externo: {docEvent.external_id}</p>
              </div>

              <Separator />

              {/* Como funciona */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Como funciona o redirecionamento</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  O sistema do cliente redireciona o usuário para o MapStudio passando os parâmetros de integração na URL.
                  Ao abrir, o MapStudio detecta os parâmetros, verifica se já existe um mapa salvo para o evento e 
                  carrega os setores disponíveis via API. Ao salvar, o mapa é persistido internamente e sincronizado
                  com a API do cliente.
                </p>
              </div>

              <Separator />

              {/* URL de Redirecionamento */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">URL de Redirecionamento</h3>
                <div className="bg-muted rounded-md p-3 flex items-start gap-2">
                  <code className="flex-1 text-xs break-all font-mono text-foreground">
                    {buildRedirectUrl(docEvent)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleCopy(buildRedirectUrl(docEvent), 'url')}
                  >
                    {copiedField === 'url' ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Parâmetros */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Parâmetros da URL</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left p-2 font-medium">Parâmetro</th>
                        <th className="text-left p-2 font-medium">Tipo</th>
                        <th className="text-left p-2 font-medium">Obrigatório</th>
                        <th className="text-left p-2 font-medium">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-primary">token</td>
                        <td className="p-2">string</td>
                        <td className="p-2"><Badge variant="destructive" className="text-[10px] px-1.5 py-0">Sim</Badge></td>
                        <td className="p-2 text-muted-foreground">Token de integração da empresa (identifica a empresa automaticamente)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-primary">id_evento</td>
                        <td className="p-2">string</td>
                        <td className="p-2"><Badge variant="destructive" className="text-[10px] px-1.5 py-0">Sim</Badge></td>
                        <td className="p-2 text-muted-foreground">ID do evento no sistema do cliente</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-primary">map_id</td>
                        <td className="p-2">UUID</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px] px-1.5 py-0">Não</Badge></td>
                        <td className="p-2 text-muted-foreground">ID de um mapa existente (para edição direta)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              {/* Fluxo */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Fluxo de Abertura</h3>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>O usuário é redirecionado para a URL com os parâmetros <code className="bg-muted px-1 rounded text-foreground">id_evento</code> e <code className="bg-muted px-1 rounded text-foreground">token</code></li>
                  <li>O MapStudio verifica se o usuário está autenticado (redireciona para login se necessário)</li>
                  <li><strong className="text-foreground">Valida o token de integração</strong> — identifica automaticamente a empresa associada ao token</li>
                  <li>Se o token for inválido ou expirado → exibe tela de "Acesso Negado"</li>
                  <li>Busca na base se já existe um mapa salvo para <code className="bg-muted px-1 rounded text-foreground">company_id (do token) + id_evento_externo</code></li>
                  <li>Se existir → carrega o mapa salvo no canvas</li>
                  <li>Se não existir → abre o canvas vazio e busca os setores via <code className="bg-muted px-1 rounded text-foreground">url_list_setores</code> da empresa</li>
                  <li>Os setores ficam disponíveis no dropdown "Vincular a Setor" para associar formas criadas</li>
                </ol>
              </div>

              <Separator />

              {/* Fluxo de Save */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Fluxo de Salvamento</h3>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>O usuário clica em "Salvar" no MapStudio</li>
                  <li>O mapa é salvo na base interna com status <code className="bg-muted px-1 rounded text-foreground">PENDENTE</code></li>
                  <li>O sistema faz POST para <code className="bg-muted px-1 rounded text-foreground">url_create_mapa</code> (novo) ou <code className="bg-muted px-1 rounded text-foreground">url_update_mapa</code> (existente)</li>
                  <li>Se a API responder com sucesso → status atualizado para <code className="bg-muted px-1 rounded text-foreground">OK</code></li>
                  <li>Se houver erro → status marcado como <code className="bg-muted px-1 rounded text-foreground">ERRO</code></li>
                  <li>Toast exibido ao usuário com o resultado da sincronização</li>
                </ol>
              </div>

              <Separator />

              {/* Exemplo de implementação */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Exemplo de Implementação (Cliente)</h3>
                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre">{`// Redirecionar o usuário para criar/editar o mapa de um evento
function abrirMapStudio(eventoId, tokenIntegracao) {
  const url = "${window.location.origin}/mapstudio"
    + "?id_evento=" + eventoId
    + "&token=" + tokenIntegracao;
  
  window.open(url, "_blank");
}

// Exemplo de uso:
abrirMapStudio(
  "${docEvent.external_id}",
  "SEU_TOKEN_DE_INTEGRACAO"
);`}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimulacaoPage;
