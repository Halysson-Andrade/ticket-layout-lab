import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, Plus, Search, Settings, Loader2 } from 'lucide-react';
import CompanyFormModal from '@/components/Portal/CompanyFormModal';
import IntegrationPanel from '@/components/Portal/IntegrationPanel';

const EmpresasPage: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [integrationCompany, setIntegrationCompany] = useState<any>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar empresas');
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filtered = companies.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.trade_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj?.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Empresas
          </h1>
          <p className="text-muted-foreground">Gerencie empresas e configurações de integração</p>
        </div>
        <Button onClick={() => { setEditCompany(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Empresa
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razão social, fantasia ou CNPJ..."
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
              <TableHead>Razão Social</TableHead>
              <TableHead>Nome Fantasia</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma empresa encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.trade_name || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{c.cnpj || '—'}</TableCell>
                  <TableCell>{c.email || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'ativo' ? 'default' : 'destructive'}
                      className={c.status === 'ativo' ? 'bg-green-600' : ''}>
                      {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditCompany(c); setModalOpen(true); }}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setIntegrationCompany(c)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CompanyFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchCompanies}
        editCompany={editCompany}
      />

      {/* Integration Sheet */}
      <Sheet open={!!integrationCompany} onOpenChange={(v) => !v && setIntegrationCompany(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Integração — {integrationCompany?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {integrationCompany && <IntegrationPanel companyId={integrationCompany.id} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EmpresasPage;
