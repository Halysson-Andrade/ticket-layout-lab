import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sector, VenueElement, VenueMap } from '@/types/mapStudio';

interface PortalMapState {
  isPortalMode: boolean;
  loading: boolean;
  accessDenied: boolean;
  accessError: string | null;
  mapId: string | null;
  companyId: string | null;
  mapName: string | null;
}

interface PortalMapResult {
  state: PortalMapState;
  loadPortalMap: (
    setSectors: (s: Sector[]) => void,
    setElements: (e: VenueElement[]) => void,
    setMapData: (fn: (prev: VenueMap) => VenueMap) => void,
    setBackground?: (bg: { url: string; opacity: number; scale: number; x: number; y: number } | null) => void,
  ) => Promise<void>;
  savePortalMap: (exportData: any) => Promise<void>;
}

export function usePortalMapLoader(): PortalMapResult {
  const [searchParams] = useSearchParams();
  const mapId = searchParams.get('map_id');
  const hasIntegrationCode = !!searchParams.get('code');

  // Portal mode = has map_id but NOT an integration code
  const isPortalMode = !!mapId && !hasIntegrationCode;

  const [state, setState] = useState<PortalMapState>({
    isPortalMode,
    loading: false,
    accessDenied: false,
    accessError: null,
    mapId,
    companyId: null,
    mapName: null,
  });

  const loadPortalMap = useCallback(async (
    setSectors: (s: Sector[]) => void,
    setElements: (e: VenueElement[]) => void,
    setMapData: (fn: (prev: VenueMap) => VenueMap) => void,
  ) => {
    if (!isPortalMode || !mapId) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      // 1. Validate session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({
          ...prev,
          loading: false,
          accessDenied: true,
          accessError: 'Sessão não encontrada. Faça login pelo portal para acessar mapas.',
        }));
        return;
      }

      // 2. Load map (RLS ensures user can only see their own maps, or admin sees all)
      const { data: map, error } = await supabase
        .from('maps')
        .select('*')
        .eq('id', mapId)
        .maybeSingle();

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          accessDenied: true,
          accessError: 'Erro ao carregar mapa: ' + error.message,
        }));
        return;
      }

      if (!map) {
        setState(prev => ({
          ...prev,
          loading: false,
          accessDenied: true,
          accessError: 'Mapa não encontrado ou você não tem permissão para acessá-lo.',
        }));
        return;
      }

      // 3. Load map data
      const mapJson = map.map_json as any;

      setState(prev => ({
        ...prev,
        loading: false,
        accessDenied: false,
        mapId: map.id,
        companyId: map.company_id,
        mapName: map.name,
      }));

      if (mapJson?.sectors) setSectors(mapJson.sectors);
      if (mapJson?.elements) setElements(mapJson.elements);
      setMapData(prev => ({
        ...prev,
        name: map.name,
        id: map.id,
      }));

      toast.success(`Mapa "${map.name}" carregado!`);
    } catch (err: any) {
      console.error('Portal map load error:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        accessDenied: true,
        accessError: 'Erro inesperado ao carregar mapa.',
      }));
    }
  }, [isPortalMode, mapId]);

  const savePortalMap = useCallback(async (exportData: any) => {
    if (!state.mapId) return;

    try {
      const { error } = await supabase
        .from('maps')
        .update({
          map_json: exportData as any,
          name: exportData.name || state.mapName || 'Mapa',
        })
        .eq('id', state.mapId);

      if (error) throw error;
      toast.success('Mapa salvo com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    }
  }, [state.mapId, state.mapName]);

  return { state, loadPortalMap, savePortalMap };
}
