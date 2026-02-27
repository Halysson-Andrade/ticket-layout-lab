import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Key, RefreshCw, Copy, Link2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
          <div className="space-y-2">
            <Label>URL Lista de Setores (GET)</Label>
            <Input
              value={urls.url_list_setores}
              onChange={(e) => setUrls({ ...urls, url_list_setores: e.target.value })}
              placeholder="https://api.cliente.com/setores"
            />
          </div>
          <div className="space-y-2">
            <Label>URL Criação do Mapa (POST)</Label>
            <Input
              value={urls.url_create_mapa}
              onChange={(e) => setUrls({ ...urls, url_create_mapa: e.target.value })}
              placeholder="https://api.cliente.com/mapas"
            />
          </div>
          <div className="space-y-2">
            <Label>URL Visualização do Mapa (GET)</Label>
            <Input
              value={urls.url_get_mapa}
              onChange={(e) => setUrls({ ...urls, url_get_mapa: e.target.value })}
              placeholder="https://api.cliente.com/mapas/:id"
            />
          </div>
          <div className="space-y-2">
            <Label>URL Atualização do Mapa (PUT)</Label>
            <Input
              value={urls.url_update_mapa}
              onChange={(e) => setUrls({ ...urls, url_update_mapa: e.target.value })}
              placeholder="https://api.cliente.com/mapas/:id"
            />
          </div>
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
