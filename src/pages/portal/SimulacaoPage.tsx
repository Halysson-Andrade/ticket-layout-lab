import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Play, Calendar, MapPin, Loader2, ExternalLink } from 'lucide-react';

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
    if (session) fetchEvents();
  }, [fetchEvents, session]);

  const handleOpenEvent = (evt: SimEvent) => {
    const params = new URLSearchParams({
      empresa: COMPANY_ID,
      id_evento: evt.external_id,
    });
    navigate(`/mapstudio?${params.toString()}`);
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
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleOpenEvent(evt)}
            >
              <div className="relative h-40 bg-muted overflow-hidden">
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
                <h3 className="font-semibold text-sm line-clamp-2">{evt.name}</h3>
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
                  <ExternalLink className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimulacaoPage;
