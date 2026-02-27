import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sector, SECTOR_COLORS, VenueElement, VenueMap } from '@/types/mapStudio';
import { generateId, generateVerticesForShape } from '@/lib/mapUtils';

interface IntegrationState {
  isIntegration: boolean;
  companyId: string | null;
  eventId: string | null;
  mapId: string | null; // existing map UUID
  loading: boolean;
  saving: boolean;
  syncStatus: 'idle' | 'syncing' | 'ok' | 'error';
  eventName: string | null;
  externalSetores: { id: string; name: string; color: string }[];
}

interface IntegrationResult {
  state: IntegrationState;
  loadIntegrationData: (
    setSectors: (s: Sector[]) => void,
    setElements: (e: VenueElement[]) => void,
    setMapData: (fn: (prev: VenueMap) => VenueMap) => void,
  ) => Promise<void>;
  saveIntegration: (exportData: any) => Promise<void>;
}

export function useIntegrationMode(): IntegrationResult {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('empresa');
  const eventId = searchParams.get('id_evento');
  const existingMapId = searchParams.get('map_id');

  const [state, setState] = useState<IntegrationState>({
    isIntegration: !!(companyId && eventId),
    companyId,
    eventId,
    mapId: existingMapId,
    loading: false,
    saving: false,
    syncStatus: 'idle',
    eventName: null,
    externalSetores: [],
  });

  const loadIntegrationData = useCallback(async (
    setSectors: (s: Sector[]) => void,
    setElements: (e: VenueElement[]) => void,
    setMapData: (fn: (prev: VenueMap) => VenueMap) => void,
  ) => {
    if (!companyId || !eventId) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // 1. Check for existing map
      const { data: existingMap } = await supabase
        .from('maps')
        .select('*')
        .eq('company_id', companyId)
        .eq('id_evento_externo', eventId)
        .maybeSingle();

      if (existingMap) {
        // Load existing map
        const mapJson = existingMap.map_json as any;
        setState(prev => ({
          ...prev,
          mapId: existingMap.id,
          eventName: existingMap.name,
          loading: false,
        }));
        
        if (mapJson?.sectors) {
          setSectors(mapJson.sectors);
        }
        if (mapJson?.elements) {
          setElements(mapJson.elements);
        }
        setMapData(prev => ({
          ...prev,
          name: existingMap.name,
          id: existingMap.id,
        }));
        toast.success(`Mapa "${existingMap.name}" carregado com sucesso!`);
        return;
      }

      // 2. Fetch company integration URLs
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (!integration?.url_list_setores) {
        toast.warning('Empresa sem URL de setores configurada');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // 3. Fetch sectors from external API
      const setoresRes = await fetch(integration.url_list_setores, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const setoresData = await setoresRes.json();
      const externalSetores = setoresData?.setores || setoresData || [];

      // 4. Pre-create sectors on canvas
      const newSectors: Sector[] = externalSetores.map((s: any, i: number) => {
        const cols = 3; // arrange sectors in grid
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 100 + col * 350;
        const y = 100 + row * 300;
        const bounds = { x, y, width: 300, height: 200 };

        return {
          id: generateId(),
          name: s.name,
          color: s.color || SECTOR_COLORS[i % SECTOR_COLORS.length],
          opacity: 60,
          bounds,
          vertices: generateVerticesForShape('rectangle', bounds),
          shape: 'rectangle' as const,
          rotation: 0,
          curvature: 0,
          seats: [],
          visible: true,
          locked: false,
          categoryId: s.id,
          sectorLabel: s.name,
        };
      });

      setSectors(newSectors);
      setMapData(prev => ({
        ...prev,
        name: `Evento ${eventId}`,
      }));

      setState(prev => ({
        ...prev,
        externalSetores: externalSetores,
        eventName: `Evento ${eventId}`,
        loading: false,
      }));

      toast.success(`${newSectors.length} setor(es) carregados da integração!`);
    } catch (err: any) {
      console.error('Integration load error:', err);
      toast.error('Erro ao carregar dados da integração');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [companyId, eventId]);

  const saveIntegration = useCallback(async (exportData: any) => {
    if (!companyId || !eventId) return;

    setState(prev => ({ ...prev, saving: true, syncStatus: 'syncing' }));

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        toast.error('Sessão expirada');
        setState(prev => ({ ...prev, saving: false, syncStatus: 'error' }));
        return;
      }

      // 1. Save/update in maps table
      const mapRecord = {
        name: exportData.name || `Evento ${eventId}`,
        company_id: companyId,
        id_evento_externo: eventId,
        map_json: exportData,
        created_by_user_id: session.user.id,
        sync_status: 'PENDENTE',
      };

      let savedMapId = state.mapId;

      if (savedMapId) {
        // Update existing
        const { error } = await supabase
          .from('maps')
          .update({
            map_json: exportData as any,
            name: mapRecord.name,
            sync_status: 'PENDENTE',
          })
          .eq('id', savedMapId);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('maps')
          .insert(mapRecord as any)
          .select('id')
          .single();
        if (error) throw error;
        savedMapId = data.id;
        setState(prev => ({ ...prev, mapId: savedMapId }));
      }

      // 2. POST to external API
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('url_create_mapa, url_update_mapa')
        .eq('company_id', companyId)
        .maybeSingle();

      const apiUrl = state.mapId
        ? integration?.url_update_mapa
        : integration?.url_create_mapa;

      if (apiUrl) {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            map_id: savedMapId,
            id_evento: eventId,
            map_json: exportData,
          }),
        });
        const result = await res.json();

        if (res.ok) {
          // Update sync status to OK
          await supabase
            .from('maps')
            .update({ sync_status: 'OK', last_sync_at: new Date().toISOString() } as any)
            .eq('id', savedMapId);

          setState(prev => ({ ...prev, saving: false, syncStatus: 'ok' }));
          toast.success('Mapa salvo e sincronizado com a API do cliente!');
        } else {
          await supabase
            .from('maps')
            .update({ sync_status: 'ERRO' } as any)
            .eq('id', savedMapId);

          setState(prev => ({ ...prev, saving: false, syncStatus: 'error' }));
          toast.error(`Mapa salvo, mas erro na sincronização: ${result.error || 'Desconhecido'}`);
        }
      } else {
        setState(prev => ({ ...prev, saving: false, syncStatus: 'ok' }));
        toast.success('Mapa salvo internamente!');
      }
    } catch (err: any) {
      console.error('Save integration error:', err);
      setState(prev => ({ ...prev, saving: false, syncStatus: 'error' }));
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  }, [companyId, eventId, state.mapId]);

  return { state, loadIntegrationData, saveIntegration };
}
