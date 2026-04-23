import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sector, VenueElement, VenueMap } from '@/types/mapStudio';

interface IntegrationState {
  isIntegration: boolean;
  companyId: string | null;
  eventId: string | null;
  mapId: string | null;
  loading: boolean;
  saving: boolean;
  syncStatus: 'idle' | 'syncing' | 'ok' | 'error';
  eventName: string | null;
  externalSetores: { id: string; name: string; color: string }[];
  tokenValid: boolean | null;
  tokenError: string | null;
  idUsuarioExterno: string | null;
}

interface IntegrationResult {
  state: IntegrationState;
  loadIntegrationData: (
    setSectors: (s: Sector[]) => void,
    setElements: (e: VenueElement[]) => void,
    setMapData: (fn: (prev: VenueMap) => VenueMap) => void,
    setBackground?: (bg: { url: string; opacity: number; scale: number; x: number; y: number } | null) => void,
  ) => Promise<void>;
  saveIntegration: (exportData: any) => Promise<void>;
}

export function useIntegrationMode(): IntegrationResult {
  const [searchParams] = useSearchParams();
  const exchangeCode = searchParams.get('code');
  const existingMapId = searchParams.get('map_id');

  const [state, setState] = useState<IntegrationState>({
    isIntegration: !!exchangeCode,
    companyId: null,
    eventId: null,
    mapId: existingMapId,
    loading: false,
    saving: false,
    syncStatus: 'idle',
    eventName: null,
    externalSetores: [],
    tokenValid: null,
    tokenError: null,
    idUsuarioExterno: null,
  });

  const loadIntegrationData = useCallback(async (
    setSectors: (s: Sector[]) => void,
    setElements: (e: VenueElement[]) => void,
    setMapData: (fn: (prev: VenueMap) => VenueMap) => void,
    setBackground?: (bg: { url: string; opacity: number; scale: number; x: number; y: number } | null) => void,
  ) => {
    if (!exchangeCode) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // 1. Exchange the code for session data
      const exchangeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exchange-code`;
      const codeRes = await fetch(exchangeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ code: exchangeCode }),
      });
      const codeResult = await codeRes.json();

      if (!codeResult.valid) {
        toast.error(`Acesso negado: ${codeResult.error || 'Código inválido'}`);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          tokenValid: false, 
          tokenError: codeResult.error 
        }));
        return;
      }

      const resolvedCompanyId = codeResult.company_id;
      const eventId = codeResult.id_evento;
      const idUsuarioExterno = codeResult.id_usuario_externo;

      setState(prev => ({ 
        ...prev, 
        tokenValid: true, 
        tokenError: null, 
        companyId: resolvedCompanyId,
        eventId,
        idUsuarioExterno,
      }));

      // 2. Fetch company integration config
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('*')
        .eq('company_id', resolvedCompanyId)
        .maybeSingle();

      // 3. Try to load existing map via url_get_mapa (client API is source of truth)
      if (integration?.url_get_mapa) {
        try {
          const getMapUrl = integration.url_get_mapa.includes('?')
            ? `${integration.url_get_mapa}&id_evento=${eventId}`
            : `${integration.url_get_mapa}?id_evento=${eventId}`;

          const mapRes = await fetch(getMapUrl, {
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (mapRes.ok) {
            const mapData = await mapRes.json();
            
            if (mapData && mapData.map_json) {
              const mapJson = mapData.map_json;
              setState(prev => ({
                ...prev,
                mapId: mapData.id || mapData.map_id || null,
                eventName: mapData.name || `Evento ${eventId}`,
                loading: false,
              }));

              if (mapJson.sectors) setSectors(mapJson.sectors);
              if (mapJson.elements) setElements(mapJson.elements);
              setMapData(prev => ({
                ...prev,
                name: mapData.name || `Evento ${eventId}`,
                id: mapData.id || mapData.map_id || prev.id,
              }));
              toast.success(`Mapa "${mapData.name || eventId}" carregado via API do cliente!`);
              return;
            }
          }
        } catch (err) {
          console.warn('Erro ao buscar mapa via url_get_mapa, tentando banco interno:', err);
        }
      }

      // 4. Fallback: check internal DB
      const { data: existingMap } = await supabase
        .from('maps')
        .select('*')
        .eq('company_id', resolvedCompanyId)
        .eq('id_evento_externo', eventId)
        .maybeSingle();

      if (existingMap) {
        const mapJson = existingMap.map_json as any;
        setState(prev => ({
          ...prev,
          mapId: existingMap.id,
          eventName: existingMap.name,
          loading: false,
        }));
        
        if (mapJson?.sectors) setSectors(mapJson.sectors);
        if (mapJson?.elements) setElements(mapJson.elements);
        setMapData(prev => ({
          ...prev,
          name: existingMap.name,
          id: existingMap.id,
        }));
        toast.success(`Mapa "${existingMap.name}" carregado do banco interno!`);
        return;
      }

      // 5. No existing map — fetch sectors for new map
      if (!integration?.url_list_setores) {
        toast.warning('Empresa sem URL de setores configurada');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const setoresRes = await fetch(integration.url_list_setores, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const setoresData = await setoresRes.json();
      const externalSetores = setoresData?.setores || setoresData || [];

      setMapData(prev => ({
        ...prev,
        name: `Evento ${eventId}`,
      }));

      setState(prev => ({
        ...prev,
        externalSetores,
        eventName: `Evento ${eventId}`,
        loading: false,
      }));

      toast.success(`${externalSetores.length} setor(es) disponíveis para vincular!`);
    } catch (err: any) {
      console.error('Integration load error:', err);
      toast.error('Erro ao carregar dados da integração');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [exchangeCode]);

  const saveIntegration = useCallback(async (exportData: any) => {
    if (!state.companyId || !state.eventId) return;

    setState(prev => ({ ...prev, saving: true, syncStatus: 'syncing' }));

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        toast.error('Sessão expirada');
        setState(prev => ({ ...prev, saving: false, syncStatus: 'error' }));
        return;
      }

      const mapRecord = {
        name: exportData.name || `Evento ${state.eventId}`,
        company_id: state.companyId,
        id_evento_externo: state.eventId,
        map_json: exportData,
        created_by_user_id: session.user.id,
        sync_status: 'PENDENTE',
      };

      let savedMapId = state.mapId;

      if (savedMapId) {
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
        const { data, error } = await supabase
          .from('maps')
          .insert(mapRecord as any)
          .select('id')
          .single();
        if (error) throw error;
        savedMapId = data.id;
        setState(prev => ({ ...prev, mapId: savedMapId }));
      }

      // POST to external API
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('url_create_mapa, url_update_mapa')
        .eq('company_id', state.companyId)
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
            id_evento: state.eventId,
            map_json: exportData,
          }),
        });
        const result = await res.json();

        if (res.ok) {
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
  }, [state.eventId, state.companyId, state.mapId]);

  return { state, loadIntegrationData, saveIntegration };
}
