import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Map, Plus, Search, MoreHorizontal, RefreshCw, ExternalLink, Loader2, Building2 } from 'lucide-react';

const MapasPage: React.FC = () => {
  const { user, profile, isAdmin, session } = useAuth();
  const navigate = useNavigate();
  const [maps, setMaps] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    try {
      // RLS already filters: users see own maps, admins see all
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaps(data || []);

      // Fetch company names for admin view
      if (isAdmin && data && data.length > 0) {
        const companyIds = [...new Set(data.map(m => m.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companiesData } = await supabase
            .from('companies')
            .select('id, name')
            .in('id', companyIds);
          
          if (companiesData) {
            const map: Record<string, string> = {};
            companiesData.forEach(c => { map[c.id] = c.name; });
            setCompanies(map);
          }
        }
      }
    } catch (err: any) {
      toast.error('Erro ao carregar mapas: ' + err.message);
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const handleResync = async (mapId: string) => {
    toast.info('Funcionalidade de resync será implementada na integração completa');
  };

  const handleOpenMap = (map: any) => {
    // Only map_id is needed — session auth validates access in MapStudio
    navigate(`/mapstudio?map_id=${map.id}`);
  };

  const handleNewMap = () => {
    navigate('/mapstudio');
  };

  const syncStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    OK: { label: 'Sincronizado', variant: 'default' },
    PENDENTE: { label: 'Pendente', variant: 'secondary' },
    ERRO: { label: 'Erro', variant: 'destructive' },
  };

  const filtered = maps.filter((m) =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.id_evento_externo?.toLowerCase().includes(search.toLowerCase()) ||
    (m.company_id && companies[m.company_id]?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6" /> Mapas
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Todos os mapas do sistema' : 'Seus mapas'}
          </p>
        </div>
        <Button onClick={handleNewMap}>
          <Plus className="h-4 w-4 mr-1" /> Novo Mapa
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isAdmin ? "Buscar por nome, evento ou empresa..." : "Buscar por nome ou ID evento..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {isAdmin && <TableHead>Empresa</TableHead>}
              <TableHead>ID Evento</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  Nenhum mapa encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => {
                const syncCfg = syncStatusConfig[m.sync_status] || syncStatusConfig.PENDENTE;
                const companyName = m.company_id ? companies[m.company_id] : null;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        {companyName ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {companyName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">{m.id_evento_externo || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={syncCfg.variant}
                        className={m.sync_status === 'OK' ? 'bg-green-600' : ''}>
                        {syncCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.updated_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenMap(m)}>
                            <ExternalLink className="h-4 w-4 mr-2" /> Abrir Mapa
                          </DropdownMenuItem>
                          {isAdmin && m.sync_status !== 'OK' && (
                            <DropdownMenuItem onClick={() => handleResync(m.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Tentar Resync
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MapasPage;
