import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LayoutGrid, FileJson, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toolbar } from './Toolbar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { Canvas } from './Canvas';
import { Minimap } from './Minimap';
import { StatusBar } from './StatusBar';
import { GridGeneratorModal } from './GridGeneratorModal';
import { OnboardingWizard } from './OnboardingWizard';
import { ExportModal } from './ExportModal';
import { 
  VenueMap, 
  Sector, 
  Seat, 
  VenueElement, 
  ToolType, 
  SeatType, 
  Template,
  SECTOR_COLORS,
  GridGeneratorParams 
} from '@/types/mapStudio';
import { generateSeatsGrid, generateId } from '@/lib/mapUtils';
import { toast } from 'sonner';

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1500;

export const MapStudio: React.FC = () => {
  // Estado do mapa
  const [mapData, setMapData] = useState<VenueMap>({
    id: generateId(),
    name: 'Novo Mapa',
    version: 1,
    status: 'draft',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    layers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [elements, setElements] = useState<VenueElement[]>([]);
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  
  // UI state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeSeatType, setActiveSeatType] = useState<SeatType>('normal');
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 100, y: 50 });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Modals
  const [showGridGenerator, setShowGridGenerator] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showExport, setShowExport] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<Sector[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Adiciona ao histórico
  const pushHistory = useCallback((newSectors: Sector[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newSectors)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSectors(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSectors(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [historyIndex, history]);

  // Cria setor
  const handleCreateSector = useCallback((bounds: { x: number; y: number; width: number; height: number }) => {
    const newSector: Sector = {
      id: generateId(),
      name: `Setor ${sectors.length + 1}`,
      color: SECTOR_COLORS[sectors.length % SECTOR_COLORS.length],
      bounds,
      rotation: 0,
      seats: [],
      visible: true,
      locked: false,
    };
    const newSectors = [...sectors, newSector];
    setSectors(newSectors);
    pushHistory(newSectors);
    setSelectedSectorIds([newSector.id]);
    toast.success(`Setor "${newSector.name}" criado!`);
  }, [sectors, pushHistory]);

  // Seleciona setor
  const handleSelectSector = useCallback((id: string, additive: boolean) => {
    if (additive) {
      setSelectedSectorIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      setSelectedSectorIds([id]);
    }
    setSelectedSeatIds([]);
  }, []);

  // Seleciona assentos
  const handleSelectSeats = useCallback((ids: string[], additive: boolean) => {
    if (additive) {
      setSelectedSeatIds(prev => {
        const newIds = [...prev];
        ids.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      });
    } else {
      setSelectedSeatIds(ids);
    }
    if (ids.length > 0) {
      setSelectedSectorIds([]);
    }
  }, []);

  // Move setor
  const handleMoveSector = useCallback((id: string, dx: number, dy: number) => {
    setSectors(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        bounds: {
          ...s.bounds,
          x: s.bounds.x + dx,
          y: s.bounds.y + dy,
        },
        seats: s.seats.map(seat => ({
          ...seat,
          x: seat.x + dx,
          y: seat.y + dy,
        })),
      };
    }));
  }, []);

  // Atualiza setor
  const handleUpdateSector = useCallback((id: string, updates: Partial<Sector>) => {
    setSectors(prev => {
      const newSectors = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      pushHistory(newSectors);
      return newSectors;
    });
  }, [pushHistory]);

  // Atualiza assentos
  const handleUpdateSeats = useCallback((ids: string[], updates: Partial<Seat>) => {
    setSectors(prev => {
      const newSectors = prev.map(s => ({
        ...s,
        seats: s.seats.map(seat => 
          ids.includes(seat.id) ? { ...seat, ...updates } : seat
        ),
      }));
      pushHistory(newSectors);
      return newSectors;
    });
  }, [pushHistory]);

  // Aplica tipo ao assento
  const handleApplySeatType = useCallback((ids: string[], type: SeatType) => {
    handleUpdateSeats(ids, { type });
    toast.success(`Tipo "${type}" aplicado a ${ids.length} assento(s)`);
  }, [handleUpdateSeats]);

  // Toggle visibilidade do setor
  const handleToggleSectorVisibility = useCallback((id: string) => {
    setSectors(prev => prev.map(s => 
      s.id === id ? { ...s, visible: !s.visible } : s
    ));
  }, []);

  // Toggle lock do setor
  const handleToggleSectorLock = useCallback((id: string) => {
    setSectors(prev => prev.map(s => 
      s.id === id ? { ...s, locked: !s.locked } : s
    ));
  }, []);

  // Delete setor
  const handleDeleteSector = useCallback((id: string) => {
    const newSectors = sectors.filter(s => s.id !== id);
    setSectors(newSectors);
    pushHistory(newSectors);
    setSelectedSectorIds([]);
    toast.success('Setor excluído');
  }, [sectors, pushHistory]);

  // Gera assentos em grade
  const handleGenerateGrid = useCallback((params: GridGeneratorParams) => {
    const sector = sectors.find(s => s.id === params.sectorId);
    if (!sector) return;

    const newSeats = generateSeatsGrid(
      params,
      sector.bounds.x + 20,
      sector.bounds.y + 30
    );

    setSectors(prev => {
      const newSectors = prev.map(s => 
        s.id === params.sectorId 
          ? { ...s, seats: [...s.seats, ...newSeats] }
          : s
      );
      pushHistory(newSectors);
      return newSectors;
    });

    toast.success(`${newSeats.length} assentos gerados!`);
  }, [sectors, pushHistory]);

  // Importa imagem de fundo
  const handleImportImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setBackgroundImage(ev.target?.result as string);
          toast.success('Imagem de fundo importada!');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, []);

  // Seleciona template
  const handleSelectTemplate = useCallback((template: Template) => {
    // Cria setores baseado no template
    const newSectors: Sector[] = [];
    
    for (let i = 0; i < template.sectors; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = 100 + col * 450;
      const y = 200 + row * 300;

      const sector: Sector = {
        id: generateId(),
        name: `${template.name} - Setor ${i + 1}`,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        bounds: { x, y, width: 400, height: 250 },
        rotation: 0,
        seats: [],
        visible: true,
        locked: false,
      };

      // Gera assentos iniciais
      const seatsPerSector = Math.ceil(template.totalSeats / template.sectors);
      const rows = template.defaultParams?.rows || 10;
      const cols = Math.ceil(seatsPerSector / rows);

      sector.seats = generateSeatsGrid({
        rows,
        cols,
        rowSpacing: template.defaultParams?.rowSpacing || 4,
        colSpacing: template.defaultParams?.colSpacing || 2,
        seatSize: template.defaultParams?.seatSize || 14,
        rowLabelType: template.defaultParams?.rowLabelType || 'alpha',
        seatLabelType: template.defaultParams?.seatLabelType || 'numeric',
        rowLabelStart: 'A',
        seatLabelStart: 1,
        rotation: 0,
        sectorId: sector.id,
        prefix: `S${i + 1}-`,
      }, x + 20, y + 30);

      newSectors.push(sector);
    }

    // Adiciona elemento palco para alguns templates
    if (['theater', 'show', 'cinema'].includes(template.category)) {
      setElements([{
        id: generateId(),
        type: 'stage',
        label: 'Palco',
        bounds: { x: 200, y: 50, width: 600, height: 100 },
        rotation: 0,
        color: '#4a5568',
      }]);
    }

    setSectors(newSectors);
    pushHistory(newSectors);
    toast.success(`Template "${template.name}" aplicado com sucesso!`);
  }, [pushHistory]);

  // Delete selecionados
  const handleDelete = useCallback(() => {
    if (selectedSectorIds.length > 0) {
      const newSectors = sectors.filter(s => !selectedSectorIds.includes(s.id));
      setSectors(newSectors);
      pushHistory(newSectors);
      setSelectedSectorIds([]);
      toast.success('Setores excluídos');
    } else if (selectedSeatIds.length > 0) {
      setSectors(prev => {
        const newSectors = prev.map(s => ({
          ...s,
          seats: s.seats.filter(seat => !selectedSeatIds.includes(seat.id)),
        }));
        pushHistory(newSectors);
        return newSectors;
      });
      setSelectedSeatIds([]);
      toast.success('Assentos excluídos');
    }
  }, [selectedSectorIds, selectedSeatIds, sectors, pushHistory]);

  // Duplicar selecionados
  const handleDuplicate = useCallback(() => {
    if (selectedSectorIds.length > 0) {
      const newSectors: Sector[] = [];
      selectedSectorIds.forEach(id => {
        const sector = sectors.find(s => s.id === id);
        if (sector) {
          const newSector: Sector = {
            ...sector,
            id: generateId(),
            name: `${sector.name} (cópia)`,
            bounds: {
              ...sector.bounds,
              x: sector.bounds.x + 50,
              y: sector.bounds.y + 50,
            },
            seats: sector.seats.map(seat => ({
              ...seat,
              id: generateId(),
              x: seat.x + 50,
              y: seat.y + 50,
            })),
          };
          newSectors.push(newSector);
        }
      });
      const updatedSectors = [...sectors, ...newSectors];
      setSectors(updatedSectors);
      pushHistory(updatedSectors);
      setSelectedSectorIds(newSectors.map(s => s.id));
      toast.success('Setores duplicados');
    }
  }, [selectedSectorIds, sectors, pushHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 'h': setActiveTool('pan'); break;
        case 'r': setActiveTool('sector'); break;
        case 'g': 
          if (selectedSectorIds.length === 1) {
            setShowGridGenerator(true);
          }
          break;
        case 's': setActiveTool('seat-single'); break;
        case 'e': setActiveTool('element'); break;
        case 'delete':
        case 'backspace': handleDelete(); break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleDuplicate();
          }
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) handleRedo();
            else handleUndo();
          }
          break;
        case '=':
        case '+': setZoom(z => Math.min(3, z * 1.1)); break;
        case '-': setZoom(z => Math.max(0.2, z * 0.9)); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, handleDuplicate, handleUndo, handleRedo, selectedSectorIds]);

  // Dados para export
  const exportData = {
    ...mapData,
    sectors: sectors.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
      bounds: s.bounds,
      seats: s.seats.map(seat => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        type: seat.type,
        status: seat.status,
        x: seat.x,
        y: seat.y,
      })),
    })),
    elements,
  };

  const selectedSector = sectors.find(s => selectedSectorIds.includes(s.id)) || null;
  const selectedSeats = sectors.flatMap(s => s.seats).filter(seat => selectedSeatIds.includes(seat.id));

  return (
    <div ref={containerRef} className="h-screen w-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border px-4 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <h1 className="font-semibold text-lg">Map Studio</h1>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {mapData.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowOnboarding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Mapa
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setShowExport(true)}
          >
            <FileJson className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 relative overflow-hidden">
        {/* Canvas */}
        <Canvas
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          sectors={sectors}
          elements={elements}
          selectedSectorIds={selectedSectorIds}
          selectedSeatIds={selectedSeatIds}
          activeTool={activeTool}
          activeSeatType={activeSeatType}
          zoom={zoom}
          pan={pan}
          backgroundImage={backgroundImage}
          onZoomChange={setZoom}
          onPanChange={setPan}
          onSelectSector={handleSelectSector}
          onSelectSeats={handleSelectSeats}
          onCreateSector={handleCreateSector}
          onMoveSector={handleMoveSector}
          onApplySeatType={handleApplySeatType}
        />

        {/* Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={() => setZoom(z => Math.min(3, z * 1.2))}
          onZoomOut={() => setZoom(z => Math.max(0.2, z * 0.8))}
          onExport={() => setShowExport(true)}
          onImportImage={handleImportImage}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          hasSelection={selectedSectorIds.length > 0 || selectedSeatIds.length > 0}
          zoom={zoom}
        />

        {/* Left Sidebar */}
        <LeftSidebar
          sectors={sectors}
          elements={elements}
          selectedIds={selectedSectorIds}
          onSelectSector={(id) => handleSelectSector(id, false)}
          onToggleSectorVisibility={handleToggleSectorVisibility}
          onToggleSectorLock={handleToggleSectorLock}
          onDeleteSector={handleDeleteSector}
          activeSeatType={activeSeatType}
          onSeatTypeChange={setActiveSeatType}
        />

        {/* Right Sidebar */}
        <RightSidebar
          selectedSector={selectedSector}
          selectedSeats={selectedSeats}
          onUpdateSector={handleUpdateSector}
          onUpdateSeats={handleUpdateSeats}
        />

        {/* Minimap */}
        <Minimap
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          sectors={sectors}
          zoom={zoom}
          pan={pan}
          viewportWidth={containerRef.current?.clientWidth || 1200}
          viewportHeight={(containerRef.current?.clientHeight || 800) - 56}
        />

        {/* Status Bar */}
        <StatusBar
          sectors={sectors}
          selectedSeatCount={selectedSeatIds.length}
          zoom={zoom}
        />

        {/* Generate Seats button when sector selected */}
        {selectedSectorIds.length === 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
            <Button onClick={() => setShowGridGenerator(true)} className="shadow-lg">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Gerar Assentos neste Setor
            </Button>
          </div>
        )}
      </main>

      {/* Modals */}
      <GridGeneratorModal
        open={showGridGenerator}
        onClose={() => setShowGridGenerator(false)}
        onGenerate={handleGenerateGrid}
        sectorId={selectedSectorIds[0] || ''}
      />

      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={(template, customParams) => {
          handleSelectTemplate(template);
          setShowOnboarding(false);
        }}
      />

      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        data={exportData}
      />
    </div>
  );
};
