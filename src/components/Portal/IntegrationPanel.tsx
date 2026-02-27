import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Key, RefreshCw, Copy, Link2, Eye, EyeOff, AlertTriangle, FileText, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateNodeProject, downloadBlob } from '@/lib/generateNodeProject';

interface IntegrationPanelProps {
  companyId: string;
}

const IntegrationPanel: React.FC<IntegrationPanelProps> = ({ companyId }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingUrls, setSavingUrls] = useState(false);
  const [downloadingProject, setDownloadingProject] = useState(false);
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

  const handleDownloadProject = async () => {
    setDownloadingProject(true);
    try {
      // Fetch company name
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      const blob = await generateNodeProject({
        companyName: company?.name || 'Empresa',
        token: generatedToken,
        apiBaseUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
        mapstudioOrigin: window.location.origin,
      });

      downloadBlob(blob, 'mapstudio-integration.zip');
      toast.success('Projeto baixado com sucesso');
    } catch (err: any) {
      toast.error('Erro ao gerar projeto: ' + err.message);
    } finally {
      setDownloadingProject(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  return (
    <div className="space-y-6">
      {/* Fluxo de Integração - Documentação principal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Fluxo de Integração (Exchange Token — 2 etapas)
          </CardTitle>
          <CardDescription>
            Modelo de autenticação segura para acesso ao MapStudio. O token e o usuário nunca aparecem na URL do navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="flow">
            <AccordionItem value="flow" className="border rounded-md px-3">
              <AccordionTrigger className="py-2 text-xs hover:no-underline gap-1">
                <span className="flex items-center gap-1 text-sm font-medium"><FileText className="h-4 w-4" /> Ver documentação completa</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-5 text-xs">
                  {/* Diagrama do fluxo */}
                  <div className="space-y-2">
                    <p className="font-medium text-foreground text-sm">🔒 Modelo de Segurança</p>
                    <p className="text-muted-foreground leading-relaxed">
                      O fluxo usa <strong>Exchange Token em 2 etapas</strong>. O token de integração e o ID do usuário
                      <strong> nunca aparecem na URL do navegador</strong>. O sistema cliente faz uma chamada <strong>server-side</strong> para 
                      obter um código temporário (30s, uso único), e só esse código é passado na URL de redirecionamento.
                    </p>
                  </div>

                  <Separator />

                  {/* Etapas do fluxo */}
                  <div className="space-y-2">
                    <p className="font-medium text-foreground text-sm">Fluxo Completo</p>
                    <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                      <li><strong className="text-foreground">Server-side:</strong> Sistema do cliente envia <code className="bg-muted px-1 rounded text-foreground">token</code> + <code className="bg-muted px-1 rounded text-foreground">id_evento</code> + <code className="bg-muted px-1 rounded text-foreground">id_usuario</code> via POST para <code className="bg-muted px-1 rounded text-foreground">/integration-auth</code></li>
                      <li><strong className="text-foreground">Validação do token:</strong> Sistema identifica a empresa pelo hash SHA-256 do token</li>
                      <li><strong className="text-foreground">Verificação de permissão:</strong> Se <code className="bg-muted px-1 rounded text-foreground">url_check_permissao</code> estiver configurada, chama a URL com payload assinado (HMAC-SHA256)</li>
                      <li><strong className="text-foreground">Código temporário:</strong> Gera código de 30s, uso único, armazenado com hash</li>
                      <li><strong className="text-foreground">Redirecionamento:</strong> Cliente abre <code className="bg-muted px-1 rounded text-foreground">/mapstudio?code=XXX</code> no browser do usuário</li>
                      <li><strong className="text-foreground">Exchange:</strong> MapStudio troca o código por sessão (company_id, evento, usuário) via <code className="bg-muted px-1 rounded text-foreground">/exchange-code</code></li>
                      <li><strong className="text-foreground">Carregamento:</strong> Mapa existente é carregado, ou canvas vazio com setores da API</li>
                    </ol>
                  </div>

                  <Separator />

                  {/* Etapa 1: API integration-auth */}
                  <div className="space-y-2">
                    <p className="font-medium text-foreground text-sm">Etapa 1 — POST /integration-auth (Server-side)</p>
                    <p className="text-muted-foreground">Chamada feita pelo backend do cliente. <strong>Nunca</strong> expor esta chamada no frontend.</p>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted">
                            <th className="text-left p-2 font-medium">Campo</th>
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
                            <td className="p-2 text-muted-foreground">Token de integração da empresa</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-mono text-primary">id_evento</td>
                            <td className="p-2">string</td>
                            <td className="p-2"><Badge variant="destructive" className="text-[10px] px-1.5 py-0">Sim</Badge></td>
                            <td className="p-2 text-muted-foreground">ID do evento no sistema do cliente</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-mono text-primary">id_usuario</td>
                            <td className="p-2">string</td>
                            <td className="p-2"><Badge variant="destructive" className="text-[10px] px-1.5 py-0">Sim</Badge></td>
                            <td className="p-2 text-muted-foreground">Token ou ID opaco do usuário (não aparece na URL)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <pre className="bg-muted rounded-md p-3 font-mono overflow-x-auto whitespace-pre">{`POST ${apiBaseUrl}/integration-auth
Content-Type: application/json

{
  "token": "SEU_TOKEN_DE_INTEGRACAO",
  "id_evento": "EVT-001",
  "id_usuario": "user-token-abc123"
}

// Response 200:
{
  "exchange_code": "a1b2c3d4...",   // Código temporário (30s)
  "expires_in": 30,                  // Segundos até expirar
  "redirect_url": "/mapstudio?code=a1b2c3d4..."
}

// Response 403:
{ "error": "Token de integração inválido" }
{ "error": "Token de integração expirado" }
{ "error": "Usuário não tem permissão para este evento" }`}</pre>
                  </div>

                  <Separator />

                  {/* Etapa 2: Redirect */}
                  <div className="space-y-2">
                    <p className="font-medium text-foreground text-sm">Etapa 2 — Redirecionar o usuário</p>
                    <p className="text-muted-foreground">Com o <code className="bg-muted px-1 rounded text-foreground">exchange_code</code> obtido, redirecione o browser. O código é descartável e expira em 30 segundos.</p>
                    <pre className="bg-muted rounded-md p-3 font-mono overflow-x-auto whitespace-pre">{`// URL de redirecionamento (somente o código aparece):
${window.location.origin}/mapstudio?code={exchange_code}

// O MapStudio internamente chama POST /exchange-code
// para trocar o código por: company_id, id_evento, id_usuario`}</pre>
                  </div>

                  <Separator />

                  {/* Exemplo completo */}
                  <div className="space-y-2">
                    <p className="font-medium text-foreground text-sm">Exemplo Completo (Node.js / Express)</p>
                    <pre className="bg-muted rounded-md p-3 font-mono overflow-x-auto whitespace-pre">{`const express = require('express');
const app = express();

app.get('/abrir-mapa/:eventoId', async (req, res) => {
  const { eventoId } = req.params;
  const usuarioToken = req.user.externalToken;

  // Etapa 1: Obter código (server-side)
  const authRes = await fetch(
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

  const { exchange_code, error } = await authRes.json();
  if (error) return res.status(403).json({ error });

  // Etapa 2: Redirecionar o browser do usuário
  res.redirect(
    "${window.location.origin}/mapstudio?code=" + exchange_code
  );
});`}</pre>
                  </div>

                  <Separator />

                  {/* Erros possíveis */}
                  <div className="space-y-2">
                    <p className="font-medium text-foreground text-sm">Erros Possíveis</p>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted">
                            <th className="text-left p-2 font-medium">HTTP</th>
                            <th className="text-left p-2 font-medium">Erro</th>
                            <th className="text-left p-2 font-medium">Causa</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2 font-mono">400</td>
                            <td className="p-2 text-muted-foreground">Campos obrigatórios</td>
                            <td className="p-2 text-muted-foreground">Faltam token, id_evento ou id_usuario</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-mono">403</td>
                            <td className="p-2 text-muted-foreground">Token inválido</td>
                            <td className="p-2 text-muted-foreground">Hash do token não encontrado no banco</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-mono">403</td>
                            <td className="p-2 text-muted-foreground">Token expirado</td>
                            <td className="p-2 text-muted-foreground">Data de expiração ultrapassada</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-mono">403</td>
                            <td className="p-2 text-muted-foreground">Sem permissão</td>
                            <td className="p-2 text-muted-foreground">url_check_permissao retornou allowed: false</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-mono">403</td>
                            <td className="p-2 text-muted-foreground">Código expirado</td>
                            <td className="p-2 text-muted-foreground">Exchange code usado após 30s</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-mono">403</td>
                            <td className="p-2 text-muted-foreground">Código já utilizado</td>
                            <td className="p-2 text-muted-foreground">Exchange code de uso único já consumido</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-mono">502</td>
                            <td className="p-2 text-muted-foreground">Erro permissão</td>
                            <td className="p-2 text-muted-foreground">url_check_permissao inacessível ou com erro</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Token Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Token de Integração
          </CardTitle>
          <CardDescription>
            Token secreto da empresa. Usado <strong>server-side</strong> para autenticar na API de integração. Nunca expor no frontend ou na URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration?.token_secret_hash ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="border-green-500/50 text-green-600">Configurado</Badge>
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
            URLs da API do Cliente
          </CardTitle>
          <CardDescription>
            Endpoints que o MapStudio chama no sistema do cliente para buscar setores, salvar mapas e verificar permissões.
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
              <AccordionItem value="doc-setores" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">GET /setores</p>
                    <p className="font-sans text-muted-foreground">Retorna a lista de setores disponíveis para o evento. Chamado após autenticação bem-sucedida.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Query Parameters:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`id_evento: "EVT-001"  // ID do evento - obrigatório`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{
  "setores": [
    {
      "id": "setor-pista",   // ID único (string)
      "name": "Pista",       // Nome exibido
      "color": "hsl(142, 71%, 45%)"  // Cor HSL
    }
  ]
}`}</pre>
                    <p className="font-sans text-muted-foreground mt-1">Formato alternativo aceito: array direto (sem wrapper "setores").</p>
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
              <AccordionItem value="doc-create" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">POST /mapas</p>
                    <p className="font-sans text-muted-foreground">Chamado na primeira vez que o mapa é salvo para um evento.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Request Body:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{
  "map_id": "uuid",
  "id_evento": "EVT-001",
  "map_json": {
    "name": "string",
    "version": 1,
    "width": 2000,
    "height": 1500,
    "sectors": [
      {
        "id": "uuid",
        "name": "string",
        "color": "hsl(...)",
        "bounds": { "x": 0, "y": 0, "width": 200, "height": 150 },
        "vertices": [{ "x": 0, "y": 0 }],
        "shape": "rectangle",
        "rotation": 0,
        "seats": [
          {
            "id": "uuid",
            "sectorId": "uuid",
            "row": "A",
            "number": "1",
            "type": "normal|pcd|companion|obeso|vip|blocked",
            "status": "available|reserved|sold|blocked",
            "x": 100, "y": 200,
            "rotation": 0,
            "price": 150.00,
            "description": "string|null"
          }
        ],
        "categoryId": "setor-pista",
        "visible": true, "locked": false
      }
    ],
    "elements": [
      {
        "id": "uuid",
        "type": "stage|bar|bathroom|entrance|exit|speaker|dj|screen|vip-area|food|custom",
        "label": "string",
        "bounds": { "x": 0, "y": 0, "width": 300, "height": 100 },
        "rotation": 0,
        "color": "string|null"
      }
    ]
  }
}`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{
  "success": true,
  "message": "string",
  "external_map_id": "xyz-789"
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
              <AccordionItem value="doc-get" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">GET /mapas/:id</p>
                    <p className="font-sans text-muted-foreground">Retorna o JSON do mapa salvo.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Query Parameters:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`map_id: "uuid"  // ID do mapa`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{
  "id": "uuid",
  "name": "string",
  "company_id": "uuid",
  "id_evento_externo": "EVT-001",
  "map_json": { ... },
  "sync_status": "OK|PENDENTE|ERRO",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 404:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{ "error": "not found" }`}</pre>
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
              <AccordionItem value="doc-update" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline gap-1">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">POST /mapas/:id (atualização)</p>
                    <p className="font-sans text-muted-foreground">Chamado quando o mapa já existe e é atualizado. Body idêntico ao de criação.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Request Body:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{
  "map_id": "uuid",
  "id_evento": "EVT-001",
  "map_json": { ... }   // Mesmo formato do POST /mapas
}`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200:</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{ "success": true, "message": "string" }`}</pre>
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
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documentação</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-2">
                    <p className="font-sans text-sm font-medium text-foreground">POST /permissao</p>
                    <p className="font-sans text-muted-foreground">Chamado antes de gerar o código de acesso. Verifica se o usuário tem permissão para o evento. O payload é assinado com HMAC-SHA256 usando o hash do token como chave.</p>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Request Body (assinado):</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{
  "id_evento": "EVT-001",
  "id_usuario": "user-token-123",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "signature": "hmac_sha256_hex..."
}`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 200 (permitido):</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{ "allowed": true }`}</pre>
                    <Separator />
                    <p className="font-sans font-medium text-foreground">Response 403 (negado):</p>
                    <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre">{`{ "allowed": false, "message": "Motivo da recusa" }`}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Referência de Tipos */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="seat-types" className="border rounded-md px-3">
              <AccordionTrigger className="py-2 text-xs hover:no-underline gap-1">
                <span className="flex items-center gap-1 text-sm font-medium"><FileText className="h-4 w-4" /> Referência: Tipos e Enums</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-3">
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">SeatType (tipo do assento):</p>
                    <pre className="bg-background p-2 rounded border">{`"normal"     — Assento padrão
"pcd"        — Pessoa com deficiência
"companion"  — Acompanhante PCD
"obeso"      — Assento especial (obeso)
"vip"        — Assento VIP
"blocked"    — Bloqueado (indisponível)`}</pre>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">SeatStatus (status do assento):</p>
                    <pre className="bg-background p-2 rounded border">{`"available"  — Disponível para venda
"reserved"   — Reservado
"sold"       — Vendido
"blocked"    — Bloqueado`}</pre>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">ElementType (elementos do venue):</p>
                    <pre className="bg-background p-2 rounded border">{`"stage" | "bar" | "bathroom" | "entrance" | "exit"
"speaker" | "dj" | "screen" | "vip-area" | "food" | "custom"`}</pre>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-foreground mb-1">SectorShape (formas dos setores):</p>
                    <pre className="bg-background p-2 rounded border">{`"rectangle" | "circle" | "triangle" | "hexagon" | "pentagon"
"trapezoid" | "parallelogram" | "arc" | "diamond" | "octagon"
"l-shape" | "u-shape" | "t-shape" | "z-shape" | "cross"
"arrow" | "star" | "wave"`}</pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex gap-2">
            <Button onClick={handleSaveUrls} disabled={savingUrls}>
              {savingUrls && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar URLs
            </Button>
          </div>

          <Separator />

          {/* Download Projeto Node.js */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Projeto Node.js de Referência</p>
            <p className="text-xs text-muted-foreground">
              Baixe um projeto Express + Sequelize completo com todos os endpoints já estruturados, 
              migrations, models, controllers e services. Pronto para conectar ao seu banco de dados.
            </p>
            <Button variant="outline" onClick={handleDownloadProject} disabled={downloadingProject}>
              {downloadingProject ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Baixar Projeto Node.js
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationPanel;
