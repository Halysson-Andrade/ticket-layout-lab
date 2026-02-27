import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CompanyFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editCompany?: any;
}

const CompanyFormModal: React.FC<CompanyFormModalProps> = ({ open, onClose, onSuccess, editCompany }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    trade_name: '',
    cnpj: '',
    email: '',
    status: 'ativo',
  });

  useEffect(() => {
    if (editCompany) {
      setForm({
        name: editCompany.name || '',
        trade_name: editCompany.trade_name || '',
        cnpj: editCompany.cnpj || '',
        email: editCompany.email || '',
        status: editCompany.status || 'ativo',
      });
    } else {
      setForm({ name: '', trade_name: '', cnpj: '', email: '', status: 'ativo' });
    }
  }, [editCompany, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Razão social é obrigatória');
      return;
    }

    setLoading(true);
    try {
      if (editCompany) {
        const { error } = await supabase.from('companies').update(form).eq('id', editCompany.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('companies').insert(form);
        if (error) throw error;
      }
      toast.success(editCompany ? 'Empresa atualizada' : 'Empresa criada');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editCompany ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Razão Social *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editCompany ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyFormModal;
