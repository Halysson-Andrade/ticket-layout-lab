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
import { Search, Play, Calendar, MapPin, Loader2, ExternalLink, FileText, Copy, Check, Key, AlertTriangle, User } from 'lucide-react';

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
  const [idUsuario, setIdUsuario] = useState<string>('user-123');
  const [openingEvent, setOpeningEvent] = useState<string | null>(null);

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

  useEffect(() => {
    if (session) {
      fetchEvents();
    }
  }, [fetchEvents, session]);

  const handleOpenEvent = async (evt: SimEvent) => {
    if (!integrationToken) {
      toast.error('Informe o Token de Integração antes de abrir um evento.');
      return;
    }
    if (!idUsuario.trim()) {
      toast.error('Informe o ID do Usuário.');
      return;
    }

    setOpeningEvent(evt.id);

    try {
      // Step 1: Call integration-auth to get exchange code
      const authUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-auth`;
      const res = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          token: integrationToken,
          id_evento: evt.external_id,
          id_usuario: idUsuario,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro na autenticação de integração');
        setOpeningEvent(null);
        return;
      }

      // Step 2: Redirect with exchange code (not token!)
      navigate(`/mapstudio?code=${data.exchange_code}`);
    } catch (err: any) {
      toast.error('Erro ao autenticar integração');
      console.error(err);
    } finally {
      setOpeningEvent(null);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

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

      {/* Token + User ID Input */}
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Key className="h-4 w-4 text-amber-600" />
        <AlertDescription className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground whitespace-nowrap">Token:</span>
            <Input
              type="password"
              placeholder="Cole o token gerado em Empresas > Integração"
              value={integrationToken || ''}
              onChange={(e) => setIntegrationToken(e.target.value || null)}
              className="max-w-sm h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground whitespace-nowrap flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Usuário:
            </span>
            <Input
              type="text"
              placeholder="ID do usuário externo (token ou identificador)"
              value={idUsuario}
              onChange={(e) => setIdUsuario(e.target.value)}
              className="max-w-sm h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              Identificador do usuário no sistema do cliente
            </span>
          </div>
          {!integrationToken && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Token obrigatório para abrir eventos
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
                {openingEvent === evt.id && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
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
              Documentação de Integração (2 etapas)
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

              {/* Segurança */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">🔒 Modelo de Segurança</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  O fluxo usa <strong>Exchange Token em 2 etapas</strong>. O token de integração e o ID do usuário 
                  <strong> nunca aparecem na URL do navegador</strong>. O sistema cliente faz uma chamada server-side 
                  para obter um código temporário (30s, uso único), e só esse código é passado na URL de redirecionamento.
                </p>
              </div>

              <Separator />

              {/* Etapa 1 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Etapa 1: Obter código de acesso (Server-side)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left p-2 font-medium">Campo</th>
                        <th className="text-left p-2 font-medium">Tipo</th>
                        <th className="text-left p-2 font-medium">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-primary">token</td>
                        <td className="p-2">string</td>
                        <td className="p-2 text-muted-foreground">Token de integração da empresa</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-primary">id_evento</td>
                        <td className="p-2">string</td>
                        <td className="p-2 text-muted-foreground">ID do evento no sistema do cliente</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-primary">id_usuario</td>
                        <td className="p-2">string</td>
                        <td className="p-2 text-muted-foreground">Identificador do usuário (token ou ID opaco)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre">{`// SERVER-SIDE: Obter código de acesso
const response = await fetch(
  "${apiBaseUrl}/integration-auth",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "SEU_TOKEN_INTEGRACAO",
      id_evento: "${docEvent.external_id}",
      id_usuario: "TOKEN_OU_ID_DO_USUARIO"
    })
  }
);

const { exchange_code, expires_in } = await response.json();
// exchange_code: código temporário (30s, uso único)
// expires_in: tempo em segundos até expirar`}</pre>
              </div>

              <Separator />

              {/* Etapa 2 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Etapa 2: Redirecionar o usuário</h3>
                <p className="text-xs text-muted-foreground">
                  Com o <code className="bg-muted px-1 rounded text-foreground">exchange_code</code> obtido, 
                  redirecione o usuário. O código é descartável e expira em 30 segundos.
                </p>
                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre">{`// CLIENT-SIDE: Redirecionar o usuário
const mapStudioUrl = "${window.location.origin}/mapstudio"
  + "?code=" + exchange_code;

window.open(mapStudioUrl, "_blank");`}</pre>
              </div>

              <Separator />

              {/* Permissão */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">🛡️ Verificação de Permissão (Opcional)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Se a empresa configurar a <strong>URL de Verificação de Permissão</strong> no painel de integração, 
                  o sistema fará uma chamada POST para essa URL antes de gerar o código. 
                  O payload é assinado com HMAC-SHA256 para garantir autenticidade.
                </p>
                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre">{`// Payload enviado para url_check_permissao (POST)
{
  "id_evento": "${docEvent.external_id}",
  "id_usuario": "TOKEN_OU_ID_DO_USUARIO",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "signature": "hmac_sha256_hex_string"
}

// Resposta esperada:
{ "allowed": true }  // ou { "allowed": false, "message": "Motivo" }`}</pre>
              </div>

              <Separator />

              {/* Fluxo completo */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Fluxo Completo</h3>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li><strong className="text-foreground">Server-side:</strong> Cliente envia token + id_evento + id_usuario para <code className="bg-muted px-1 rounded text-foreground">/integration-auth</code></li>
                  <li><strong className="text-foreground">Validação do token:</strong> Sistema identifica a empresa pelo hash do token</li>
                  <li><strong className="text-foreground">Verificação de permissão:</strong> Se configurada, chama URL da empresa com payload assinado</li>
                  <li><strong className="text-foreground">Código temporário:</strong> Gera código de 30s, uso único, armazenado com hash</li>
                  <li><strong className="text-foreground">Redirecionamento:</strong> Cliente abre <code className="bg-muted px-1 rounded text-foreground">/mapstudio?code=XXX</code></li>
                  <li><strong className="text-foreground">Exchange:</strong> MapStudio troca o código por sessão (company_id, evento, usuário)</li>
                  <li><strong className="text-foreground">Carregamento:</strong> Mapa existente ou canvas vazio com setores externos</li>
                </ol>
              </div>

              <Separator />

              {/* Exemplo completo */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Exemplo Completo (Node.js)</h3>
                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre">{`// Backend do cliente (Node.js/Express)
app.get('/abrir-mapa/:eventoId', async (req, res) => {
  const { eventoId } = req.params;
  const usuarioToken = req.user.externalToken; // ID do usuário

  // Etapa 1: Obter código server-side
  const authResponse = await fetch(
    "${apiBaseUrl}/integration-auth",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: process.env.MAPSTUDIO_TOKEN,
        id_evento: eventoId,
        id_usuario: usuarioToken
      })
    }
  );

  const { exchange_code, error } = await authResponse.json();
  if (error) return res.status(403).json({ error });

  // Etapa 2: Redirecionar o browser
  const redirectUrl = "${window.location.origin}/mapstudio?code=" 
    + exchange_code;
  res.redirect(redirectUrl);
});`}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimulacaoPage;
