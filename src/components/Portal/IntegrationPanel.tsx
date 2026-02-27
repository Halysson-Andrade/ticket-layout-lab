import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Key, RefreshCw, Copy, Link2, Eye, EyeOff, AlertTriangle, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface IntegrationPanelProps {
  companyId: string;
}

const IntegrationPanel: React.FC<IntegrationPanelProps> = ({ companyId }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingUrls, setSavingUrls] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [urls, setUrls] = useState({
    url_list_setores: '',
    url_create_mapa: '',
    url_get_mapa: '',
    url_update_mapa: '',
    url_check_permissao: '',
  });

  const fetchIntegration = async () => {
    const { data } = await supabase
      .from('company_integrations')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (data) {
      setIntegration(data);
      setUrls({
        url_list_setores: data.url_list_setores || '',
        url_create_mapa: data.url_create_mapa || '',
        url_get_mapa: data.url_get_mapa || '',
        url_update_mapa: data.url_update_mapa || '',
        url_check_permissao: (data as any).url_check_permissao || '',
      });
    }
  };

  useEffect(() => {
    fetchIntegration();
  }, [companyId]);

  const callCompanyFunction = async (action: string, extraData = {}) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-companies`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, company_id: companyId, ...extraData }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const handleGenerateToken = async () => {
    setLoading(true);
    try {
      const data = await callCompanyFunction(
        integration?.token_secret_hash ? 'rotate-token' : 'generate-token'
      );
      setGeneratedToken(data.token);
      setShowToken(true);
      toast.success(data.message);
      fetchIntegration();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrls = async () => {
    setSavingUrls(true);
    try {
      await callCompanyFunction('update-urls', urls);
      toast.success('URLs salvas com sucesso');
      fetchIntegration();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingUrls(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <div className="space-y-6">
      {/* Token Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Token de Integração
          </CardTitle>
          <CardDescription>
            Token usado para autenticar chamadas entre o MapStudio e a API do cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration?.token_secret_hash ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-green-600 font-medium">Configurado</span>
              </div>
              {integration.token_expires_at && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Expira em:</span>
                  <span>{new Date(integration.token_expires_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum token configurado</p>
          )}

          {generatedToken && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="space-y-2">
                <p className="font-medium text-amber-600">Guarde este token! Ele não será exibido novamente.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background p-2 rounded border break-all">
                    {showToken ? generatedToken : '•'.repeat(48)}
                  </code>
                  <Button size="icon" variant="ghost" onClick={() => setShowToken(!showToken)}>
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedToken)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleGenerateToken} disabled={loading} variant={integration?.token_secret_hash ? 'outline' : 'default'}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {integration?.token_secret_hash ? (
              <><RefreshCw className="h-4 w-4 mr-1" /> Rotacionar Token</>
            ) : (
              <><Key className="h-4 w-4 mr-1" /> Gerar Token</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* URLs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            URLs de Integração
          </CardTitle>
          <CardDescription>
            Endpoints da API do cliente para comunicação com o MapStudio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Lista de Setores */}
          <div className="space-y-2">
            <Label>URL Lista de Setores (GET)</Label>
            <Input
              value={urls.url_list_setores}
              onChange={(e) => setUrls({ ...urls, url_list_setores: e.target.value })}
              placeholder="https://api.cliente.com/setores"
            />
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="doc" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação do endpoint</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">GET /setores</p>
                    <p className="font-sans text-muted-foreground">Retorna a lista de setores disponíveis para o evento. O MapStudio usa esses setores para popular o dropdown "Vincular a Setor".</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Query Parameters:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`id_evento: 456       // ID do evento (int) - obrigatório`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Headers:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`Authorization: Bearer <token>
Content-Type: application/json`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{
  "setores": [
    {
      "id": 1,              // ID único do setor (int)
      "name": "string",     // Nome exibido (ex: "Pista", "VIP")
      "color": "string"     // Cor HSL (ex: "hsl(142, 71%, 45%)")
    }
  ]
}`}</pre>
                    <p className="font-sans text-muted-foreground mt-1">Formato alternativo aceito: array direto de objetos (sem wrapper "setores").</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* URL Criação do Mapa */}
          <div className="space-y-2">
            <Label>URL Criação do Mapa (POST)</Label>
            <Input
              value={urls.url_create_mapa}
              onChange={(e) => setUrls({ ...urls, url_create_mapa: e.target.value })}
              placeholder="https://api.cliente.com/mapas"
            />
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="doc" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação do endpoint</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">POST /mapas</p>
                    <p className="font-sans text-muted-foreground">Chamado na primeira vez que o mapa é salvo para um evento. Envia o JSON completo do mapa.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Headers:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`Authorization: Bearer <token>
Content-Type: application/json`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Request Body:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{
  "map_id": 123,               // ID interno do mapa (int)
  "id_evento": 456,            // ID do evento externo (int)
  "map_json": {
    "name": "string",
    "version": 1,
    "width": 2000,
    "height": 1500,
    "sectors": [
      {
        "id": 1,
        "name": "string",
        "color": "hsl(...)",
        "bounds": { "x": 0, "y": 0, "width": 200, "height": 150 },
        "vertices": [{ "x": 0, "y": 0 }],
        "shape": "rectangle",
        "rotation": 0,
        "seats": [
          {
            "id": 1,
            "sectorId": 1,
            "row": "A",
            "number": "1",
            "type": "normal | pcd | companion | obeso | vip | blocked",
            "status": "available | reserved | sold | blocked",
            "x": 100,
            "y": 200,
            "rotation": 0,
            "price": 150.00,
            "description": "string | null"
          }
        ],
        "categoryId": 1,
        "visible": true,
        "locked": false
      }
    ],
    "elements": [
      {
        "id": 1,
        "type": "stage | bar | bathroom | entrance | exit | speaker | dj | screen | vip-area | food | custom",
        "label": "string",
        "bounds": { "x": 0, "y": 0, "width": 300, "height": 100 },
        "rotation": 0,
        "color": "string | null"
      }
    ],
    "geometricShapes": [
      {
        "id": 1,
        "name": "string",
        "color": "hsl(...)",
        "opacity": 80,
        "bounds": { "x": 0, "y": 0, "width": 200, "height": 150 },
        "shape": "rectangle",
        "rotation": 0,
        "linkedSectorId": 1
      }
    ]
  }
}`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{
  "success": true,
  "message": "string",
  "external_map_id": 789  // ID do mapa no sistema externo (int)
}`}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* URL Visualização do Mapa */}
          <div className="space-y-2">
            <Label>URL Visualização do Mapa (GET)</Label>
            <Input
              value={urls.url_get_mapa}
              onChange={(e) => setUrls({ ...urls, url_get_mapa: e.target.value })}
              placeholder="https://api.cliente.com/mapas/:id"
            />
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="doc" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação do endpoint</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">GET /mapas/:id</p>
                    <p className="font-sans text-muted-foreground">Retorna o JSON do mapa salvo. Usado para carregar um mapa existente no MapStudio.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Headers:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`Authorization: Bearer <token>
Content-Type: application/json`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Query Parameters:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`map_id: 123  // ID do mapa a ser consultado (int)`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{
  "id": 123,
  "name": "string",
  "company_id": 1,
  "id_evento_externo": 456,
  "map_json": { ... },          // Mesmo formato do POST /mapas
  "sync_status": "OK | PENDENTE | ERRO",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 404:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{ "error": "not found" }`}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* URL Atualização do Mapa */}
          <div className="space-y-2">
            <Label>URL Atualização do Mapa (PUT/POST)</Label>
            <Input
              value={urls.url_update_mapa}
              onChange={(e) => setUrls({ ...urls, url_update_mapa: e.target.value })}
              placeholder="https://api.cliente.com/mapas/:id"
            />
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="doc" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação do endpoint</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">POST /mapas/:id (atualização)</p>
                    <p className="font-sans text-muted-foreground">Chamado quando o mapa já existe e é atualizado. O body é idêntico ao endpoint de criação.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Headers:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`Authorization: Bearer <token>
Content-Type: application/json`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Request Body:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{
  "map_id": 123,
  "id_evento": 456,
  "map_json": { ... }   // Mesmo formato do POST /mapas
}`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{
  "success": true,
  "message": "string"
}`}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* URL Verificação de Permissão */}
          <div className="space-y-2">
            <Label>URL Verificação de Permissão (POST) — Opcional</Label>
            <Input
              value={urls.url_check_permissao}
              onChange={(e) => setUrls({ ...urls, url_check_permissao: e.target.value })}
              placeholder="https://api.cliente.com/permissao"
            />
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="doc-perm" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação do endpoint</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">POST /permissao</p>
                    <p className="font-sans text-muted-foreground">Chamado antes de gerar o código de acesso. Verifica se o usuário tem permissão para acessar o evento. O payload é assinado com HMAC-SHA256.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Request Body (assinado):</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{
  "id_evento": "EVT-001",
  "id_usuario": "user-token-123",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "signature": "hmac_sha256_hex..."
}`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200 (permitido):</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{ "allowed": true }`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 403 (negado):</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre text-xs">{`{ "allowed": false, "message": "Motivo da recusa" }`}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Tipos de Assento */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="seat-types" className="border rounded-md px-3">
              <AccordionTrigger className="py-2 text-xs hover:no-underline gap-1">
                <span className="flex items-center gap-1 text-sm font-medium"><FileText className="h-4 w-4" /> Referência: Tipos e Enums</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-3">
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">SeatType (tipo do assento):</p>
                    <pre className="bg-background p-2 rounded border text-xs">{`"normal"     — Assento padrão
"pcd"        — Pessoa com deficiência
"companion"  — Acompanhante PCD
"obeso"      — Assento especial (obeso)
"vip"        — Assento VIP
"blocked"    — Bloqueado (indisponível)`}</pre>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">SeatStatus (status do assento):</p>
                    <pre className="bg-background p-2 rounded border text-xs">{`"available"  — Disponível para venda
"reserved"   — Reservado
"sold"       — Vendido
"blocked"    — Bloqueado`}</pre>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">ElementType (elementos do venue):</p>
                    <pre className="bg-background p-2 rounded border text-xs">{`"stage" | "bar" | "bathroom" | "entrance" | "exit"
"speaker" | "dj" | "screen" | "vip-area" | "food" | "custom"`}</pre>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">SectorShape (formas dos setores):</p>
                    <pre className="bg-background p-2 rounded border text-xs">{`"rectangle" | "circle" | "triangle" | "hexagon" | "pentagon"
"trapezoid" | "parallelogram" | "arc" | "diamond" | "octagon"
"l-shape" | "u-shape" | "t-shape" | "z-shape" | "cross"
"arrow" | "star" | "wave"`}</pre>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">Autenticação:</p>
                    <p className="font-sans text-muted-foreground">Todas as requisições incluem os headers:</p>
                    <pre className="bg-background p-2 rounded border text-xs">{`Authorization: Bearer <access_token>
apikey: <supabase_anon_key>
Content-Type: application/json`}</pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button onClick={handleSaveUrls} disabled={savingUrls}>
            {savingUrls && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar URLs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationPanel;
