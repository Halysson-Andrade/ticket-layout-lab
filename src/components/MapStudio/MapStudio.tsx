import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LayoutGrid, FileJson, Plus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toolbar } from './Toolbar';
import { AlignmentBar, AlignType } from './AlignmentBar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { Canvas } from './Canvas';
import { Minimap } from './Minimap';
import { StatusBar } from './StatusBar';
import { SeatGeneratorModal } from './SeatGeneratorModal';
import { OnboardingWizard } from './OnboardingWizard';
import { ExportModal } from './ExportModal';
import { RowEditorModal } from './RowEditorModal';
import { BackgroundImagePanel, BackgroundImageConfig } from './BackgroundImagePanel';
import { SeatPlacementPopup, SeatPlacementConfig } from './SeatPlacementPopup';
import { TextToolbar } from './TextToolbar';
import { 
  VenueMap, 
  Sector, 
  Seat, 
  VenueElement, 
  ToolType, 
  SeatType, 
  Template,
  SectorShape,
  Vertex,
  ElementType,
  FurnitureType,
  TableConfig,
  GeometricShape,
  TextElement,
  SECTOR_COLORS,
  PREDEFINED_SECTORS,
  GridGeneratorParams,
  ELEMENT_ICONS,
  RowNumberingConfig
} from '@/types/mapStudio';
import { generateSeatsGrid, generateId, generateVerticesForShape, generateVerticesWithCurvature, getBoundsFromVertices, generateSeatsInsidePolygon, generateSeatsInsidePolygonSimple, repositionSeatsInsidePolygon, getSeatLabel } from '@/lib/mapUtils';
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
  const [geometricShapes, setGeometricShapes] = useState<GeometricShape[]>([]);
  const [elements, setElements] = useState<VenueElement[]>([]);
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedTextIds, setSelectedTextIds] = useState<string[]>([]);
  const [autoEditTextId, setAutoEditTextId] = useState<string | null>(null);
  
  // UI state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeSeatType, setActiveSeatType] = useState<SeatType>('normal');
  const [activeFurnitureType, setActiveFurnitureType] = useState<FurnitureType>('chair');
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    shape: 'round',
    chairCount: 6,
    tableWidth: 60,
    tableHeight: 60,
  });
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 100, y: 50 });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgConfig, setBgConfig] = useState<BackgroundImageConfig | null>(null);
  const [bgPanelOpen, setBgPanelOpen] = useState(false);

  // Seat placement popup
  const [seatPlacementPopup, setSeatPlacementPopup] = useState<{
    sectorId: string;
    position: { x: number; y: number };
    screenPosition: { x: number; y: number };
    nextNumber: number;
  } | null>(null);

  // Modals
  const [showGridGenerator, setShowGridGenerator] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingRow, setEditingRow] = useState<{ sectorId: string; rowLabel: string } | null>(null);

  // Panel visibility
  const [showToolbar, setShowToolbar] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // History for undo/redo
  const [history, setHistory] = useState<Sector[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  
  // Clipboard para copiar/colar setores
  const [clipboardSectors, setClipboardSectors] = useState<Sector[]>([]);

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

  // Cria forma geométrica (não vinculada a setor)
  const handleCreateShape = useCallback((bounds: { x: number; y: number; width: number; height: number }) => {
    const shape: SectorShape = 'rectangle';
    const newShape: GeometricShape = {
      id: generateId(),
      name: `Forma ${geometricShapes.length + 1}`,
      color: SECTOR_COLORS[geometricShapes.length % SECTOR_COLORS.length],
      opacity: 60,
      bounds,
      vertices: generateVerticesForShape(shape, bounds),
      shape,
      rotation: 0,
      curvature: 0,
    };
    setGeometricShapes(prev => [...prev, newShape]);
    setSelectedShapeIds([newShape.id]);
    setSelectedSectorIds([]);
    toast.success(`Forma "${newShape.name}" criada!`);
  }, [geometricShapes.length]);

  // Vincula forma geométrica a um setor da lista predefinida
  const handleLinkShapeToSector = useCallback((shapeId: string, categoryId: string) => {
    const shape = geometricShapes.find(s => s.id === shapeId);
    if (!shape) return;
    
    // Busca categoria da lista predefinida
    const category = PREDEFINED_SECTORS.find(s => s.id === categoryId);
    if (!category) return;
    
    // Cria um novo setor a partir da forma com nome/cor da categoria
    const newSector: Sector = {
      id: generateId(),
      name: category.name,
      color: category.color,
      opacity: shape.opacity,
      bounds: shape.bounds,
      vertices: shape.vertices,
      shape: shape.shape,
      rotation: shape.rotation,
      curvature: shape.curvature,
      seats: [],
      visible: true,
      locked: false,
      categoryId: categoryId,
    };
    
    // Remove a forma e adiciona o setor
    setGeometricShapes(prev => prev.filter(s => s.id !== shapeId));
    const newSectors = [...sectors, newSector];
    setSectors(newSectors);
    pushHistory(newSectors);
    setSelectedShapeIds([]);
    setSelectedSectorIds([newSector.id]);
    toast.success(`Forma vinculada ao setor "${category.name}"!`);
  }, [geometricShapes, sectors, pushHistory]);

  // Seleciona forma geométrica
  const handleSelectShape = useCallback((id: string, additive: boolean) => {
    if (additive) {
      setSelectedShapeIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      setSelectedShapeIds([id]);
    }
    setSelectedSectorIds([]);
    setSelectedSeatIds([]);
  }, []);

  // Move forma geométrica (não vinculada)
  const handleMoveShape = useCallback((id: string, dx: number, dy: number) => {
    setGeometricShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        bounds: {
          ...s.bounds,
          x: s.bounds.x + dx,
          y: s.bounds.y + dy,
        },
        vertices: s.vertices.map(v => ({
          x: v.x + dx,
          y: v.y + dy,
        })),
      };
    }));
  }, []);

  // Exclui forma geométrica não vinculada
  const handleDeleteShape = useCallback((id: string) => {
    setGeometricShapes(prev => prev.filter(s => s.id !== id));
    setSelectedShapeIds([]);
    toast.success('Forma excluída');
  }, []);

  // Cria setor diretamente (usado por templates/onboarding)
  const handleCreateSector = useCallback((bounds: { x: number; y: number; width: number; height: number }) => {
    const shape: SectorShape = 'rectangle';
    const newSector: Sector = {
      id: generateId(),
      name: `Setor ${sectors.length + 1}`,
      color: SECTOR_COLORS[sectors.length % SECTOR_COLORS.length],
      opacity: 60,
      bounds,
      vertices: generateVerticesForShape(shape, bounds),
      shape,
      rotation: 0,
      curvature: 0,
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

  // Atualiza propriedades de um elemento
  const handleUpdateElement = useCallback((id: string, updates: Partial<VenueElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  // Redimensiona forma geométrica
  const handleResizeShape = useCallback((id: string, width: number, height: number, x: number, y: number) => {
    setGeometricShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newBounds = { x, y, width, height };
      return {
        ...s,
        bounds: newBounds,
        vertices: generateVerticesForShape(s.shape, newBounds),
      };
    }));
  }, []);

  // Altera tipo de forma geométrica
  const handleUpdateShapeType = useCallback((id: string, shapeType: SectorShape) => {
    setGeometricShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        shape: shapeType,
        vertices: generateVerticesForShape(shapeType, s.bounds),
      };
    }));
  }, []);

  // Cria elemento de texto no canvas
  const handleCreateText = useCallback((position: { x: number; y: number }) => {
    const id = generateId();
    const newText: TextElement = {
      id,
      text: '',
      x: position.x,
      y: position.y,
      fontFamily: 'sans-serif',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      color: '#ffffff',
      textDecoration: 'none',
      rotation: 0,
    };
    setTextElements(prev => [...prev, newText]);
    setSelectedTextIds([id]);
    setSelectedSectorIds([]);
    setSelectedShapeIds([]);
    setSelectedSeatIds([]);
    setActiveTool('select');
    setAutoEditTextId(id);
  }, []);

  const handleSelectText = useCallback((id: string, additive: boolean) => {
    if (additive) {
      setSelectedTextIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedTextIds([id]);
    }
    setSelectedSectorIds([]);
    setSelectedShapeIds([]);
    setSelectedSeatIds([]);
  }, []);

  const handleMoveText = useCallback((id: string, dx: number, dy: number) => {
    setTextElements(prev => prev.map(t => t.id === id ? { ...t, x: t.x + dx, y: t.y + dy } : t));
  }, []);

  const handleDeleteText = useCallback((id: string) => {
    setTextElements(prev => prev.filter(t => t.id !== id));
    setSelectedTextIds(prev => prev.filter(x => x !== id));
  }, []);

  const handleUpdateText = useCallback((id: string, updates: Partial<TextElement>) => {
    setTextElements(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);


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

  // Desseleciona tudo
  const handleDeselectAll = useCallback(() => {
    setSelectedSectorIds([]);
    setSelectedSeatIds([]);
    setSelectedElementIds([]);
    setSelectedShapeIds([]);
    setSelectedTextIds([]);
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
      setSelectedElementIds([]);
    }
  }, []);

  // Seleciona elementos
  const handleSelectElements = useCallback((ids: string[], additive: boolean) => {
    if (additive) {
      setSelectedElementIds(prev => {
        const newIds = [...prev];
        ids.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      });
    } else {
      setSelectedElementIds(ids);
    }
    if (ids.length > 0) {
      setSelectedSectorIds([]);
      setSelectedSeatIds([]);
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
        vertices: s.vertices.map(v => ({
          ...v,
          x: v.x + dx,
          y: v.y + dy,
          controlPoint: v.controlPoint ? { x: v.controlPoint.x + dx, y: v.controlPoint.y + dy } : undefined,
        })),
        seats: s.seats.map(seat => ({
          ...seat,
          x: seat.x + dx,
          y: seat.y + dy,
        })),
      };
    }));
  }, []);

  // Atualiza vértices do setor SEM recalcular bounds durante arraste
  // Bounds fica estável durante o drag para manter o centro de rotação fixo e evitar drift
  // Bounds é recalculado em handleVertexMoveEnd quando o arraste termina
  const handleUpdateSectorVertices = useCallback((id: string, vertices: Vertex[]) => {
    setSectors(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, vertices };
    }));
  }, []);

  // Atualiza setor
  const handleUpdateSector = useCallback((id: string, updates: Partial<Sector>) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== id) return s;
        
        let updatedSector = { ...s, ...updates };
        
        // Se curvatura ou bounds foi alterado, recalcula vértices e assentos
        if (updates.curvature !== undefined || updates.bounds) {
          const newCurvature = updates.curvature !== undefined ? updates.curvature : s.curvature || 0;
          const newBounds = updates.bounds || s.bounds;
          const newVertices = generateVerticesWithCurvature(s.shape, newBounds, newCurvature);
          updatedSector.vertices = newVertices;
          updatedSector.curvature = newCurvature;
          
          // Regenera assentos com a nova curvatura
          const furnitureType = s.furnitureType || 'chair';
          const tableConf = furnitureType !== 'chair' ? {
            shape: 'round' as const,
            chairCount: 6,
            tableWidth: 60,
            tableHeight: 60,
          } : undefined;
          
          updatedSector.seats = generateSeatsInsidePolygon(
            newVertices,
            s.id,
            12, 4, 'alpha', 'numeric', '',
            furnitureType, tableConf,
            s.shape === 'arc', newCurvature
          );
        }
        
        return updatedSector;
      });
      pushHistory(newSectors);
      return newSectors;
    });
  }, [pushHistory]);

  // Redimensiona setor - escala proporcionalmente formas customizadas (Melhoria 6)
  const handleResizeSector = useCallback((sectorId: string, width: number, height: number) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        const oldBounds = s.bounds;
        const newBounds = { ...s.bounds, width, height };
        
        // Detecta se é forma customizada comparando número de vértices com padrão
        const standardVertexCount = getStandardVertexCount(s.shape);
        const isCustomShape = s.vertices.length !== standardVertexCount;
        
        let newVertices: Vertex[];
        if (isCustomShape) {
          // Forma customizada: escala proporcionalmente os vértices existentes
          const scaleX = width / oldBounds.width;
          const scaleY = height / oldBounds.height;
          const centerX = oldBounds.x + oldBounds.width / 2;
          const centerY = oldBounds.y + oldBounds.height / 2;
          
          newVertices = s.vertices.map(v => ({
            x: centerX + (v.x - centerX) * scaleX,
            y: centerY + (v.y - centerY) * scaleY,
          }));
        } else {
          // Forma padrão: regenera vértices normalmente
          newVertices = generateVerticesWithCurvature(s.shape, newBounds, s.curvature || 0);
        }
        
        // Apenas atualiza bounds e vértices, mantém assentos existentes
        return { ...s, bounds: newBounds, vertices: newVertices };
      });
      pushHistory(newSectors);
      return newSectors;
    });
  }, [pushHistory]);
  
  // Função auxiliar para obter contagem padrão de vértices por forma
  const getStandardVertexCount = (shape: SectorShape): number => {
    switch (shape) {
      case 'rectangle': return 4;
      case 'parallelogram': return 4;
      case 'trapezoid': return 4;
      case 'triangle': return 3;
      case 'pentagon': return 5;
      case 'hexagon': return 6;
      case 'octagon': return 8;
      case 'diamond': return 4;
      case 'star': return 10;
      case 'l-shape': return 6;
      case 'u-shape': return 8;
      case 't-shape': return 8;
      case 'z-shape': return 12;
      case 'cross': return 12;
      case 'arrow': return 7;
      case 'wave': return 26;
      case 'arc': return 26;
      case 'circle': return 16;
      default: return 4;
    }
  };

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

  // Gera assentos em grade (dentro do polígono)
  const handleGenerateGrid = useCallback((params: GridGeneratorParams) => {
    let sector = sectors.find(s => s.id === params.sectorId);
    if (!sector) return;

    // Se redimensionamento foi solicitado, atualiza o setor primeiro
    if (params.resizeWidth && params.resizeHeight) {
      const originalWidth = sector.bounds.width;
      const originalHeight = sector.bounds.height;
      const scaleX = params.resizeWidth / originalWidth;
      const scaleY = params.resizeHeight / originalHeight;
      
      // Escala vértices proporcionalmente
      const newVertices = sector.vertices.map(v => ({
        x: sector!.bounds.x + (v.x - sector!.bounds.x) * scaleX,
        y: sector!.bounds.y + (v.y - sector!.bounds.y) * scaleY,
      }));
      
      const newBounds = getBoundsFromVertices(newVertices);
      
      // Atualiza o setor com novas dimensões
      sector = {
        ...sector,
        vertices: newVertices,
        bounds: newBounds,
      };
    }

    // Monta configuração de mesa se necessário
    const furnitureType = params.furnitureType || 'chair';
    const tableConf = params.tableConfig || (furnitureType !== 'chair' ? {
      shape: 'round' as const,
      chairCount: 6,
      tableWidth: 60,
      tableHeight: 60,
    } : undefined);

    // Gera assentos dentro do polígono com tipo de mobília
    const newSeats = generateSeatsInsidePolygon(
      sector.vertices,
      sector.id,
      params.seatSize,
      params.colSpacing,
      params.rowLabelType,
      params.seatLabelType,
      params.prefix,
      furnitureType,
      tableConf,
      sector.shape === 'arc',
      sector.curvature || 0,
      params.rows,
      params.cols,
      params.customNumbers,
      params.rowDescriptions,
      params.rotation,
      params.seatsPerRow,
      params.rowSpacing,
      params.rowAlignment,
      params.rowLabelStart,
      params.seatLabelStart,
      params.customPerRowNumbers,
      params.seatNumberDirection
    );

    // Se rowLabelPosition é 'none', remove fileiras dos assentos
    if (params.rowLabelPosition === 'none') {
      newSeats.forEach(seat => { seat.row = ''; });
    }

    setSectors(prev => {
      const newSectors = prev.map(s => 
        s.id === params.sectorId 
          ? { 
              ...s, 
              seats: newSeats, 
              furnitureType,
              tableConfig: tableConf,
              // Salva configuração de labels para preservar ao ajustar espaçamento
              rowLabelType: params.rowLabelType,
              seatLabelType: params.seatLabelType,
              rowLabelStart: params.rowLabelStart,
              seatLabelStart: params.seatLabelStart,
              labelPrefix: params.prefix,
              rowSpacing: params.rowSpacing,
              colSpacing: params.colSpacing,
              seatSize: params.seatSize,
              gridRows: params.rows,
              gridCols: params.cols,
              rowAlignment: params.rowAlignment,
              seatsPerRow: params.seatsPerRow,
              customPerRowNumbers: params.customPerRowNumbers,
              rowLabelPosition: params.rowLabelPosition,
              seatNumberDirection: params.seatNumberDirection,
              // Aplica redimensionamento se solicitado
              ...(params.resizeWidth && params.resizeHeight ? {
                vertices: sector!.vertices,
                bounds: sector!.bounds,
              } : {})
            }
          : s
      );
      pushHistory(newSectors);
      return newSectors;
    });

    const isTable = furnitureType === 'table' || furnitureType === 'bistro';
    const totalSeats = isTable && tableConf ? newSeats.length * tableConf.chairCount : newSeats.length;
    toast.success(`${newSeats.length} ${isTable ? 'mesas' : 'assentos'} gerados (${totalSeats} lugares)!`);
  }, [sectors, pushHistory]);

  // Regenera assentos do setor selecionado
  const handleRegenerateSeats = useCallback((sectorId: string) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        // Mantém o tipo de mobília do setor
        const furnitureType = s.furnitureType || 'chair';
        const tableConf = furnitureType !== 'chair' ? {
          shape: 'round' as const,
          chairCount: 6,
          tableWidth: 60,
          tableHeight: 60,
        } : undefined;
        
        const newSeats = generateSeatsInsidePolygon(
          s.vertices,
          s.id,
          12, // seatSize
          4,  // spacing
          'alpha',
          'numeric',
          '',
          furnitureType,
          tableConf,
          s.shape === 'arc'
        );
        
        return { ...s, seats: newSeats };
      });
      pushHistory(newSectors);
      return newSectors;
    });
    toast.success('Assentos regenerados!');
  }, [pushHistory]);

  // Atualiza espaçamento entre assentos e regenera automaticamente (preserva assentos excluídos)
  const handleUpdateSpacing = useCallback((sectorId: string, rowSpacing: number, colSpacing: number, seatSize: number) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        // Salva os novos parâmetros no setor
        const updatedSector = { 
          ...s, 
          rowSpacing, 
          colSpacing, 
          seatSize 
        };
        
        // Se o setor já tem assentos, repositiona mantendo os mesmos assentos existentes
        if (s.seats.length > 0) {
          // Agrupa assentos por fileira mantendo ordem
          const seatsByRow: Record<string, Seat[]> = {};
          s.seats.forEach(seat => {
            if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
            seatsByRow[seat.row].push(seat);
          });
          
          // Ordena assentos em cada fileira por posição x
          Object.keys(seatsByRow).forEach(row => {
            seatsByRow[row].sort((a, b) => a.x - b.x);
          });
          
          // Ordena fileiras por posição y da primeira cadeira
          const sortedRows = Object.keys(seatsByRow).sort((a, b) => {
            const aY = seatsByRow[a][0]?.y || 0;
            const bY = seatsByRow[b][0]?.y || 0;
            return aY - bY;
          });
          
          // Calcula nova posição baseada no espaçamento
          const bounds = getBoundsFromVertices(s.vertices);
          const safetyPadding = 10;
          
          // Usa configuração de mesa se aplicável
          const furnitureType = s.furnitureType || s.seats[0]?.furnitureType || 'chair';
          const isTable = furnitureType === 'table' || furnitureType === 'bistro';
          const itemSize = isTable ? (s.seats[0]?.tableConfig?.tableWidth || 60) : seatSize;
          const colStep = itemSize + colSpacing;
          const rowStep = itemSize + rowSpacing;
          
          // Preserva o alinhamento original do setor
          const rowAlignment = s.rowAlignment || 'center';
          
          // Recalcula posição de cada assento mantendo IDs, tipos, números, descrições, etc.
          const repositionedSeats: Seat[] = [];
          const startY = bounds.y + safetyPadding;
          
          sortedRows.forEach((rowLabel, rowIndex) => {
            const rowSeats = seatsByRow[rowLabel];
            const colsInRow = rowSeats.length;
            const rowGridWidth = colsInRow * colStep;
            const rowY = startY + rowIndex * rowStep;
            
            // Calcula offset X baseado no alinhamento preservado
            let rowOffsetX: number;
            if (rowAlignment === 'left') {
              rowOffsetX = bounds.x + safetyPadding;
            } else if (rowAlignment === 'right') {
              rowOffsetX = bounds.x + bounds.width - rowGridWidth - safetyPadding + itemSize;
            } else {
              // Centralizado (padrão)
              rowOffsetX = bounds.x + (bounds.width - rowGridWidth) / 2 + itemSize / 2;
            }
            
            rowSeats.forEach((seat, colIndex) => {
              repositionedSeats.push({
                ...seat, // Mantém ID, tipo, número, descrição, tudo!
                x: rowOffsetX + colIndex * colStep - itemSize / 2,
                y: rowY,
              });
            });
          });
          
          return { ...updatedSector, seats: repositionedSeats };
        }
        
        return updatedSector;
      });
      pushHistory(newSectors);
      return newSectors;
    });
  }, [pushHistory]);

  // Centraliza os assentos na forma mantendo numeração
  const handleCenterSeats = useCallback((sectorId: string) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId || s.seats.length === 0) return s;
        
        const bounds = getBoundsFromVertices(s.vertices);
        
        // Calcula bounds atuais dos assentos
        const seatXs = s.seats.map(seat => seat.x);
        const seatYs = s.seats.map(seat => seat.y);
        const seatMinX = Math.min(...seatXs);
        const seatMaxX = Math.max(...seatXs);
        const seatMinY = Math.min(...seatYs);
        const seatMaxY = Math.max(...seatYs);
        
        const seatWidth = seatMaxX - seatMinX + 14;
        const seatHeight = seatMaxY - seatMinY + 14;
        
        // Calcula offset para centralizar
        const offsetX = bounds.x + (bounds.width - seatWidth) / 2 - seatMinX;
        const offsetY = bounds.y + (bounds.height - seatHeight) / 2 - seatMinY;
        
        // Move todos os assentos
        const centeredSeats = s.seats.map(seat => ({
          ...seat,
          x: seat.x + offsetX,
          y: seat.y + offsetY,
        }));
        
        return { ...s, seats: centeredSeats, centerSeats: true };
      });
      pushHistory(newSectors);
      return newSectors;
    });
    toast.success('Assentos centralizados!');
  }, [pushHistory]);

  // Inverte setor horizontalmente ou verticalmente
  const handleFlipSector = useCallback((sectorId: string, direction: 'horizontal' | 'vertical') => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        const bounds = getBoundsFromVertices(s.vertices);
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        
        // Inverte vértices (incluindo controlPoints de curvas Bezier)
        const flippedVertices = s.vertices.map(v => {
          const flippedVertex: Vertex = direction === 'horizontal'
            ? { x: centerX * 2 - v.x, y: v.y }
            : { x: v.x, y: centerY * 2 - v.y };
          
          // Flip controlPoint se existir
          if (v.controlPoint) {
            flippedVertex.controlPoint = direction === 'horizontal'
              ? { x: centerX * 2 - v.controlPoint.x, y: v.controlPoint.y }
              : { x: v.controlPoint.x, y: centerY * 2 - v.controlPoint.y };
          }
          
          return flippedVertex;
        });
        
        // Inverte posição dos assentos
        const flippedSeats = s.seats.map(seat => {
          const seatCenterX = seat.x + (seat.tableConfig?.tableWidth || 14) / 2;
          const seatCenterY = seat.y + (seat.tableConfig?.tableHeight || 14) / 2;
          
          if (direction === 'horizontal') {
            return { ...seat, x: centerX * 2 - seatCenterX - (seat.tableConfig?.tableWidth || 14) / 2 };
          } else {
            return { ...seat, y: centerY * 2 - seatCenterY - (seat.tableConfig?.tableHeight || 14) / 2 };
          }
        });
        
        // Recalcula bounds após flip
        const newBounds = getBoundsFromVertices(flippedVertices);
        
        return { ...s, vertices: flippedVertices, seats: flippedSeats, bounds: newBounds };
      });
      pushHistory(newSectors);
      return newSectors;
    });
    toast.success(`Setor invertido ${direction === 'horizontal' ? 'horizontalmente' : 'verticalmente'}!`);
  }, [pushHistory]);

  // Rotaciona setor via handle - mantém rotação como propriedade persistente
  // NÃO transforma coordenadas, apenas atualiza o valor de rotação
  // O Canvas renderiza visualmente usando ctx.rotate()
  const handleRotateSector = useCallback((sectorId: string, rotation: number, finalize: boolean = false) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        // Sempre apenas atualiza a propriedade de rotação
        // O Canvas aplica a rotação visualmente via ctx.rotate()
        return { ...s, rotation };
      });
      
      // Salva no histórico quando finaliza a rotação
      if (finalize) {
        pushHistory(newSectors);
      }
      
      return newSectors;
    });
  }, [pushHistory]);

  const handleRequestFurniture = useCallback((sectorId: string, position: { x: number; y: number }, screenPosition: { x: number; y: number }) => {
    const sector = sectors.find(s => s.id === sectorId);
    const nextNumber = sector ? sector.seats.length + 1 : 1;
    setSeatPlacementPopup({ sectorId, position, screenPosition, nextNumber });
  }, [sectors]);

  const handleConfirmFurniturePlacement = useCallback((config: SeatPlacementConfig) => {
    if (!seatPlacementPopup) return;
    const { sectorId, position } = seatPlacementPopup;
    const ft = config.furnitureType;
    const tc = config.tableConfig || tableConfig;

    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        const newSeat: Seat = {
          id: generateId(),
          sectorId,
          row: config.row,
          number: config.number,
          type: config.seatType,
          status: 'available',
          x: position.x - (ft !== 'chair' ? (tc.tableWidth || 40) / 2 : 7),
          y: position.y - (ft !== 'chair' ? (tc.tableHeight || 40) / 2 : 7),
          rotation: 0,
          furnitureType: ft,
          tableConfig: ft !== 'chair' ? { ...tc } : undefined,
        };
        
        return { ...s, seats: [...s.seats, newSeat] };
      });
      pushHistory(newSectors);
      return newSectors;
    });
    toast.success(`${ft === 'chair' ? 'Cadeira' : ft === 'table' ? 'Mesa' : 'Bistrô'} adicionado(a)!`);
    setSeatPlacementPopup(null);
  }, [seatPlacementPopup, tableConfig, pushHistory]);

  // Adiciona elemento de venue
  const handleAddElement = useCallback((type: ElementType) => {
    const newElement: VenueElement = {
      id: generateId(),
      type,
      label: ELEMENT_ICONS[type] + ' ' + type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
      bounds: { x: 400, y: 100, width: 150, height: 80 },
      rotation: 0,
      color: type === 'stage' ? '#6366f1' : type === 'bar' ? '#f59e0b' : '#64748b',
    };
    setElements(prev => [...prev, newElement]);
    toast.success(`Elemento "${type}" adicionado!`);
  }, []);

  // Deleta elemento
  const handleDeleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    setSelectedElementIds([]);
    toast.success('Elemento removido');
  }, []);

  // Move elemento
  const handleMoveElement = useCallback((id: string, dx: number, dy: number) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      return {
        ...el,
        bounds: {
          ...el.bounds,
          x: el.bounds.x + dx,
          y: el.bounds.y + dy,
        },
      };
    }));
  }, []);

  // Redimensiona elemento
  const handleResizeElement = useCallback((id: string, width: number, height: number, x?: number, y?: number) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      return {
        ...el,
        bounds: { 
          x: x !== undefined ? x : el.bounds.x, 
          y: y !== undefined ? y : el.bounds.y, 
          width, 
          height 
        },
      };
    }));
  }, []);

  // Move assento dentro do setor (sem salvar histórico durante o arraste)
  const handleMoveSeat = useCallback((seatId: string, sectorId: string, x: number, y: number) => {
    setSectors(prev => prev.map(s => {
      if (s.id !== sectorId) return s;
      return {
        ...s,
        seats: s.seats.map(seat => 
          seat.id === seatId ? { ...seat, x, y } : seat
        ),
      };
    }));
  }, []);

  // Move múltiplos assentos selecionados
  const handleMoveSelectedSeats = useCallback((dx: number, dy: number) => {
    setSectors(prev => prev.map(sector => ({
      ...sector,
      seats: sector.seats.map(seat => {
        if (selectedSeatIds.includes(seat.id)) {
          return { ...seat, x: seat.x + dx, y: seat.y + dy };
        }
        return seat;
      }),
    })));
  }, [selectedSeatIds]);

  // Salva histórico após finalizar movimento de assento
  const handleSeatMoveEnd = useCallback(() => {
    pushHistory(sectors);
  }, [sectors, pushHistory]);

  // Recalcula bounds/assentos e salva histórico após finalizar movimento de vértice
  // Para setores rotacionados, compensa vértices para que a mudança de centro de rotação
  // não cause "pulo" visual ao soltar o mouse
  const handleVertexMoveEnd = useCallback(() => {
    setSectors(prev => {
      const updated = prev.map(s => {
        const newBounds = getBoundsFromVertices(s.vertices);
        const rotation = s.rotation || 0;
        
        let finalVertices = s.vertices;
        
        // Se o setor tem rotação e o centro mudou, compensa os vértices
        // para que a aparência visual (rotacionada) permaneça idêntica
        if (rotation !== 0) {
          const oldCenterX = s.bounds.x + s.bounds.width / 2;
          const oldCenterY = s.bounds.y + s.bounds.height / 2;
          const newCenterX = newBounds.x + newBounds.width / 2;
          const newCenterY = newBounds.y + newBounds.height / 2;
          
          const dcx = newCenterX - oldCenterX;
          const dcy = newCenterY - oldCenterY;
          
          // Se o centro se moveu significativamente, compensa
          if (Math.abs(dcx) > 0.01 || Math.abs(dcy) > 0.01) {
            // IMPORTANTE: como os vértices também são transladados,
            // o novo centro de rotação também se desloca junto.
            // Para manter a aparência visual idêntica após mouse up,
            // usamos compensação auto-consistente: t = (R(θ) - I) * ΔC
            const rad = (rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rotatedDeltaX = dcx * cos - dcy * sin;
            const rotatedDeltaY = dcx * sin + dcy * cos;
            const compX = rotatedDeltaX - dcx;
            const compY = rotatedDeltaY - dcy;
            
            finalVertices = s.vertices.map(v => ({
              ...v,
              x: v.x + compX,
              y: v.y + compY,
              controlPoint: v.controlPoint ? {
                x: v.controlPoint.x + compX,
                y: v.controlPoint.y + compY,
              } : undefined,
            }));
            
            // Recalcula bounds com vértices compensados
            const compensatedBounds = getBoundsFromVertices(finalVertices);
            const repositionedSeats = repositionSeatsInsidePolygon(
              s.seats, finalVertices, finalVertices, s.id, 12
            );
            return { ...s, vertices: finalVertices, bounds: compensatedBounds, seats: repositionedSeats };
          }
        }
        
        // Sem rotação ou sem mudança de centro: atualiza normalmente
        if (newBounds.x !== s.bounds.x || newBounds.y !== s.bounds.y || newBounds.width !== s.bounds.width || newBounds.height !== s.bounds.height) {
          const repositionedSeats = repositionSeatsInsidePolygon(
            s.seats, s.vertices, s.vertices, s.id, 12
          );
          return { ...s, bounds: newBounds, seats: repositionedSeats };
        }
        return { ...s, bounds: newBounds };
      });
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  // Salva histórico após finalizar movimento de setor (drag)
  const handleSectorMoveEnd = useCallback(() => {
    pushHistory(sectors);
  }, [sectors, pushHistory]);

  // Alinhamento de múltiplos setores
  const handleAlignSectors = useCallback((type: AlignType) => {
    if (selectedSectorIds.length < 2) return;
    
    const selected = sectors.filter(s => selectedSectorIds.includes(s.id));
    const boundsArr = selected.map(s => getBoundsFromVertices(s.vertices));
    
    // Calcula limites globais
    const globalMinX = Math.min(...boundsArr.map(b => b.x));
    const globalMaxX = Math.max(...boundsArr.map(b => b.x + b.width));
    const globalMinY = Math.min(...boundsArr.map(b => b.y));
    const globalMaxY = Math.max(...boundsArr.map(b => b.y + b.height));
    const globalCenterX = (globalMinX + globalMaxX) / 2;
    const globalCenterY = (globalMinY + globalMaxY) / 2;

    const moves: { id: string; dx: number; dy: number }[] = [];

    selected.forEach((sector, i) => {
      const b = boundsArr[i];
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      let dx = 0, dy = 0;

      switch (type) {
        case 'left':
          dx = globalMinX - b.x;
          break;
        case 'right':
          dx = globalMaxX - (b.x + b.width);
          break;
        case 'center-h':
          dx = globalCenterX - cx;
          break;
        case 'top':
          dy = globalMinY - b.y;
          break;
        case 'bottom':
          dy = globalMaxY - (b.y + b.height);
          break;
        case 'center-v':
          dy = globalCenterY - cy;
          break;
      }

      if (type !== 'distribute-h' && type !== 'distribute-v') {
        if (dx !== 0 || dy !== 0) moves.push({ id: sector.id, dx, dy });
      }
    });

    // Distribuição
    if (type === 'distribute-h' || type === 'distribute-v') {
      const isH = type === 'distribute-h';
      // Ordena por posição
      const sorted = selected.map((s, i) => ({ sector: s, bounds: boundsArr[i] }))
        .sort((a, b) => isH 
          ? (a.bounds.x - b.bounds.x) 
          : (a.bounds.y - b.bounds.y));
      
      if (sorted.length >= 3) {
        const first = sorted[0].bounds;
        const last = sorted[sorted.length - 1].bounds;
        
        if (isH) {
          const totalSpace = (last.x + last.width) - first.x;
          const totalSectorWidth = sorted.reduce((sum, s) => sum + s.bounds.width, 0);
          const gap = (totalSpace - totalSectorWidth) / (sorted.length - 1);
          
          let currentX = first.x;
          sorted.forEach((item, idx) => {
            if (idx === 0) { currentX += item.bounds.width + gap; return; }
            const dx = currentX - item.bounds.x;
            if (dx !== 0) moves.push({ id: item.sector.id, dx, dy: 0 });
            currentX += item.bounds.width + gap;
          });
        } else {
          const totalSpace = (last.y + last.height) - first.y;
          const totalSectorHeight = sorted.reduce((sum, s) => sum + s.bounds.height, 0);
          const gap = (totalSpace - totalSectorHeight) / (sorted.length - 1);
          
          let currentY = first.y;
          sorted.forEach((item, idx) => {
            if (idx === 0) { currentY += item.bounds.height + gap; return; }
            const dy = currentY - item.bounds.y;
            if (dy !== 0) moves.push({ id: item.sector.id, dx: 0, dy });
            currentY += item.bounds.height + gap;
          });
        }
      }
    }

    if (moves.length === 0) return;

    // Aplica movimentos
    setSectors(prev => {
      const newSectors = prev.map(s => {
        const move = moves.find(m => m.id === s.id);
        if (!move) return s;
        return {
          ...s,
          bounds: { ...s.bounds, x: s.bounds.x + move.dx, y: s.bounds.y + move.dy },
          vertices: s.vertices.map(v => ({ ...v, x: v.x + move.dx, y: v.y + move.dy })),
          seats: s.seats.map(seat => ({ ...seat, x: seat.x + move.dx, y: seat.y + move.dy })),
        };
      });
      pushHistory(newSectors);
      return newSectors;
    });
  }, [selectedSectorIds, sectors, pushHistory]);

  // Alinhamento de múltiplos assentos selecionados
  const handleAlignSeats = useCallback((type: AlignType) => {
    if (selectedSeatIds.length < 2) return;

    const allSeats = sectors.flatMap(s => s.seats);
    const selected = allSeats.filter(s => selectedSeatIds.includes(s.id));
    const seatSize = 12;

    const minX = Math.min(...selected.map(s => s.x));
    const maxX = Math.max(...selected.map(s => s.x + seatSize));
    const minY = Math.min(...selected.map(s => s.y));
    const maxY = Math.max(...selected.map(s => s.y + seatSize));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const moves: Record<string, { dx: number; dy: number }> = {};

    if (type === 'auto-grid') {
      // Abordagem: detectar grid por clustering adaptativo, depois redistribuir uniformemente
      const parentSector = sectors.find(s => s.seats.some(seat => selectedSeatIds.includes(seat.id)));
      
      // Clustering adaptativo: ordenar por Y e detectar "saltos" para separar fileiras
      const sortedByY = [...selected].sort((a, b) => a.y - b.y);
      
      // Calcular gaps entre itens consecutivos em Y
      const yGaps: number[] = [];
      for (let i = 1; i < sortedByY.length; i++) {
        yGaps.push(sortedByY[i].y - sortedByY[i - 1].y);
      }
      
      // Encontrar threshold: gaps significativos (> mediana * 1.5) indicam nova fileira
      const sortedGaps = [...yGaps].sort((a, b) => a - b);
      const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 1;
      const rowThreshold = Math.max(medianGap * 1.5, 15);
      
      // Agrupar em fileiras
      const rows: typeof selected[] = [[sortedByY[0]]];
      for (let i = 1; i < sortedByY.length; i++) {
        if (sortedByY[i].y - sortedByY[i - 1].y > rowThreshold) {
          rows.push([sortedByY[i]]);
        } else {
          rows[rows.length - 1].push(sortedByY[i]);
        }
      }
      
      // Ordenar cada fileira por X
      rows.forEach(r => r.sort((a, b) => a.x - b.x));
      
      // Determinar número máximo de colunas
      const maxCols = Math.max(...rows.map(r => r.length));
      const numRows = rows.length;
      
      // Calcular tamanho de cada item (considerar mesa se existir)
      const firstSeat = selected[0];
      let itemW = seatSize;
      let itemH = seatSize;
      if (firstSeat.tableConfig) {
        itemW = firstSeat.tableConfig.tableWidth || 40;
        itemH = firstSeat.tableConfig.tableHeight || 40;
      } else if (firstSeat.furnitureType === 'table' || firstSeat.furnitureType === 'bistro') {
        itemW = 40;
        itemH = 40;
      }
      
      // Calcular espaçamento uniforme baseado no setor ou na área atual
      let areaW: number, areaH: number, areaX: number, areaY: number;
      if (parentSector) {
        const padding = Math.max(itemW, itemH) * 0.8;
        areaX = parentSector.bounds.x + padding;
        areaY = parentSector.bounds.y + padding;
        areaW = parentSector.bounds.width - padding * 2;
        areaH = parentSector.bounds.height - padding * 2;
      } else {
        areaX = minX;
        areaY = minY;
        areaW = maxX - minX;
        areaH = maxY - minY;
      }
      
      // Calcular gap uniforme
      const colStep = maxCols > 1 ? areaW / (maxCols - 1) : 0;
      const rowStep = numRows > 1 ? areaH / (numRows - 1) : 0;
      
      // Posicionar cada item na grade uniforme, centralizado no setor
      rows.forEach((row, rowIdx) => {
        const targetY = numRows > 1 ? areaY + rowStep * rowIdx : areaY + areaH / 2;
        
        // Centralizar fileiras com menos colunas
        const rowOffset = maxCols > 1 && row.length < maxCols 
          ? (areaW - (row.length - 1) * colStep) / 2 
          : 0;
        
        row.forEach((seat, colIdx) => {
          const targetX = row.length > 1 
            ? areaX + rowOffset + colStep * colIdx 
            : areaX + areaW / 2;
          
          const dx = targetX - seat.x;
          const dy = targetY - seat.y;
          if (dx !== 0 || dy !== 0) moves[seat.id] = { dx, dy };
        });
      });
    } else if (type === 'distribute-h' || type === 'distribute-v') {
      const isH = type === 'distribute-h';
      const sorted = [...selected].sort((a, b) => isH ? a.x - b.x : a.y - b.y);
      if (sorted.length >= 3) {
        const first = isH ? sorted[0].x : sorted[0].y;
        const last = isH ? sorted[sorted.length - 1].x : sorted[sorted.length - 1].y;
        const gap = (last - first) / (sorted.length - 1);
        sorted.forEach((seat, idx) => {
          if (idx === 0 || idx === sorted.length - 1) return;
          const target = first + gap * idx;
          const current = isH ? seat.x : seat.y;
          const delta = target - current;
          if (delta !== 0) {
            moves[seat.id] = isH ? { dx: delta, dy: 0 } : { dx: 0, dy: delta };
          }
        });
      }
    } else {
      selected.forEach(seat => {
        let dx = 0, dy = 0;
        switch (type) {
          case 'left': dx = minX - seat.x; break;
          case 'right': dx = maxX - (seat.x + seatSize); break;
          case 'center-h': dx = centerX - (seat.x + seatSize / 2); break;
          case 'top': dy = minY - seat.y; break;
          case 'bottom': dy = maxY - (seat.y + seatSize); break;
          case 'center-v': dy = centerY - (seat.y + seatSize / 2); break;
        }
        if (dx !== 0 || dy !== 0) moves[seat.id] = { dx, dy };
      });
    }

    if (Object.keys(moves).length === 0) return;

    setSectors(prev => {
      const newSectors = prev.map(s => ({
        ...s,
        seats: s.seats.map(seat => {
          const m = moves[seat.id];
          if (!m) return seat;
          return { ...seat, x: seat.x + m.dx, y: seat.y + m.dy };
        }),
      }));
      pushHistory(newSectors);
      return newSectors;
    });
  }, [selectedSeatIds, sectors, pushHistory]);

  // Adiciona vértice em uma aresta do polígono
  const handleAddVertex = useCallback((sectorId: string, edgeIndex: number, position: { x: number; y: number }) => {
    pushHistory(sectors);
    setSectors(prev => prev.map(s => {
      if (s.id !== sectorId) return s;
      const newVertices = [...s.vertices];
      // Insere o novo vértice após a aresta selecionada
      newVertices.splice(edgeIndex + 1, 0, { x: position.x, y: position.y });
      return {
        ...s,
        vertices: newVertices,
      };
    }));
    toast.success('Ponto adicionado ao polígono');
  }, [sectors, pushHistory]);

  // Remove vértice do polígono
  const handleRemoveVertex = useCallback((sectorId: string, vertexIndex: number) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector || sector.vertices.length <= 3) {
      toast.error('Não é possível remover - mínimo de 3 pontos');
      return;
    }
    pushHistory(sectors);
    setSectors(prev => prev.map(s => {
      if (s.id !== sectorId) return s;
      const newVertices = s.vertices.filter((_, i) => i !== vertexIndex);
      return {
        ...s,
        vertices: newVertices,
      };
    }));
    toast.success('Ponto removido do polígono');
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
          const url = ev.target?.result as string;
          setBackgroundImage(url);
          setBgConfig({
            url,
            opacity: 50,
            scale: 100,
            x: 0,
            y: 0,
          });
          setBgPanelOpen(true);
          toast.success('Imagem de fundo importada!');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, []);

  // Atualiza config da imagem de fundo
  const handleBgConfigChange = useCallback((config: BackgroundImageConfig | null) => {
    if (config === null) {
      setBackgroundImage(null);
      setBgConfig(null);
      setBgPanelOpen(false);
      toast.success('Imagem de fundo removida');
    } else {
      setBgConfig(config);
      setBackgroundImage(config.url);
    }
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

      const bounds = { x, y, width: 400, height: 250 };
      const shape: SectorShape = 'rectangle';
      const sector: Sector = {
        id: generateId(),
        name: `${template.name} - Setor ${i + 1}`,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        opacity: 60,
        bounds,
        vertices: generateVerticesForShape(shape, bounds),
        shape,
        rotation: 0,
        curvature: 0,
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
    // Deleta textos selecionados
    if (selectedTextIds.length > 0) {
      setTextElements(prev => prev.filter(t => !selectedTextIds.includes(t.id)));
      setSelectedTextIds([]);
      toast.success('Textos excluídos');
      return;
    }
    // Deleta formas geométricas selecionadas
    if (selectedShapeIds.length > 0) {
      setGeometricShapes(prev => prev.filter(s => !selectedShapeIds.includes(s.id)));
      setSelectedShapeIds([]);
      toast.success('Formas excluídas');
      return;
    }
    
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
  }, [selectedShapeIds, selectedSectorIds, selectedSeatIds, sectors, pushHistory]);

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
            vertices: sector.vertices.map(v => ({
              ...v,
              x: v.x + 50,
              y: v.y + 50,
              controlPoint: v.controlPoint ? { x: v.controlPoint.x + 50, y: v.controlPoint.y + 50 } : undefined,
            })),
            seats: sector.seats.map(seat => ({
              ...seat,
              id: generateId(),
              sectorId: '', // será atualizado abaixo
              x: seat.x + 50,
              y: seat.y + 50,
            })),
          };
          // Atualiza sectorId dos assentos
          newSector.seats = newSector.seats.map(seat => ({
            ...seat,
            sectorId: newSector.id,
          }));
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

  // Duplicar setor específico por ID (Ctrl+Click)
  const handleDuplicateSectorById = useCallback((sectorId: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    
    const newSectorId = generateId();
    const newSector: Sector = {
      ...sector,
      id: newSectorId,
      name: `${sector.name} (cópia)`,
      bounds: {
        ...sector.bounds,
        x: sector.bounds.x + 50,
        y: sector.bounds.y + 50,
      },
      vertices: sector.vertices.map(v => ({
        ...v,
        x: v.x + 50,
        y: v.y + 50,
        controlPoint: v.controlPoint ? { x: v.controlPoint.x + 50, y: v.controlPoint.y + 50 } : undefined,
      })),
      seats: sector.seats.map(seat => ({
        ...seat,
        id: generateId(),
        sectorId: newSectorId,
        x: seat.x + 50,
        y: seat.y + 50,
      })),
    };
    
    const updatedSectors = [...sectors, newSector];
    setSectors(updatedSectors);
    pushHistory(updatedSectors);
    setSelectedSectorIds([newSector.id]);
    toast.success(`Setor "${sector.name}" duplicado com ${newSector.seats.length} assentos`);
  }, [sectors, pushHistory]);

  // Copiar setores selecionados para o clipboard
  const handleCopySectors = useCallback(() => {
    if (selectedSectorIds.length === 0) {
      toast.error('Nenhum setor selecionado para copiar');
      return;
    }
    const sectorsToCopy = sectors.filter(s => selectedSectorIds.includes(s.id));
    setClipboardSectors(JSON.parse(JSON.stringify(sectorsToCopy)));
    toast.success(`${sectorsToCopy.length} setor(es) copiado(s)`);
  }, [selectedSectorIds, sectors]);

  // Colar setores do clipboard
  const handlePasteSectors = useCallback(() => {
    if (clipboardSectors.length === 0) {
      toast.error('Nenhum setor no clipboard');
      return;
    }
    
    const newSectors: Sector[] = clipboardSectors.map((sector, index) => {
      const newSectorId = generateId();
      return {
        ...sector,
        id: newSectorId,
        name: `${sector.name} (cópia)`,
        bounds: {
          ...sector.bounds,
          x: sector.bounds.x + 50 + (index * 10),
          y: sector.bounds.y + 50 + (index * 10),
        },
        vertices: sector.vertices.map(v => ({
          ...v,
          x: v.x + 50 + (index * 10),
          y: v.y + 50 + (index * 10),
          controlPoint: v.controlPoint ? { x: v.controlPoint.x + 50 + (index * 10), y: v.controlPoint.y + 50 + (index * 10) } : undefined,
        })),
        seats: sector.seats.map(seat => ({
          ...seat,
          id: generateId(),
          sectorId: newSectorId,
          x: seat.x + 50 + (index * 10),
          y: seat.y + 50 + (index * 10),
        })),
      };
    });
    
    const updatedSectors = [...sectors, ...newSectors];
    setSectors(updatedSectors);
    pushHistory(updatedSectors);
    setSelectedSectorIds(newSectors.map(s => s.id));
    toast.success(`${newSectors.length} setor(es) colado(s)`);
  }, [clipboardSectors, sectors, pushHistory]);

  // Atualiza configuração de numeração de uma fileira específica
  const handleUpdateRowConfig = useCallback((sectorId: string, rowLabel: string, config: import('@/types/mapStudio').RowNumberingConfig, newRowLabel?: string) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        const effectiveNewRowLabel = newRowLabel || rowLabel;
        
        // Se o nome da fileira mudou, precisamos atualizar os assentos primeiro
        let seatsWithUpdatedRow = s.seats;
        if (newRowLabel && newRowLabel !== rowLabel) {
          seatsWithUpdatedRow = s.seats.map(seat => {
            if (seat.row !== rowLabel) return seat;
            return { ...seat, row: newRowLabel };
          });
        }
        
        // Configura o objeto customPerRowNumbers
        const newCustomPerRowNumbers = { ...(s.customPerRowNumbers || {}) };
        // Remove a chave antiga se o nome mudou
        if (newRowLabel && newRowLabel !== rowLabel) {
          delete newCustomPerRowNumbers[rowLabel];
        }
        // Adiciona a config com o novo nome
        newCustomPerRowNumbers[effectiveNewRowLabel] = config;
        
        // Atualiza os números dos assentos da fileira com o novo rowLabel
        const updatedSeats = seatsWithUpdatedRow.map(seat => {
          if (seat.row !== effectiveNewRowLabel) return seat;
          
          // Recalcula o número baseado na nova configuração
          const rowSeats = seatsWithUpdatedRow.filter(rs => rs.row === effectiveNewRowLabel).sort((a, b) => a.x - b.x);
          const seatIndex = rowSeats.findIndex(rs => rs.id === seat.id);
          if (seatIndex === -1) return seat;
          
          const newNumber = getSeatLabel(
            seatIndex,
            rowSeats.length,
            'custom-per-row',
            config.startNumber,
            seatIndex < rowSeats.length / 2,
            undefined,
            config,
            config.direction
          );
          
          return { ...seat, number: newNumber };
        });
        
        return { ...s, customPerRowNumbers: newCustomPerRowNumbers, seats: updatedSeats };
      });
      pushHistory(newSectors);
      return newSectors;
    });
    toast.success(`Fileira ${newRowLabel || rowLabel} atualizada`);
  }, [pushHistory]);

  // Atualiza descrição de uma fileira (afeta todos os assentos da fileira)
  const handleUpdateRowLabel = useCallback((sectorId: string, oldRowLabel: string, newRowLabel: string) => {
    if (!newRowLabel || newRowLabel === oldRowLabel) return;
    
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        // Atualiza o rótulo da fileira em todos os assentos
        const updatedSeats = s.seats.map(seat => {
          if (seat.row !== oldRowLabel) return seat;
          return { ...seat, row: newRowLabel };
        });
        
        // Atualiza as configurações de numeração por fileira
        const updatedCustomPerRowNumbers = { ...s.customPerRowNumbers };
        if (updatedCustomPerRowNumbers[oldRowLabel]) {
          updatedCustomPerRowNumbers[newRowLabel] = {
            ...updatedCustomPerRowNumbers[oldRowLabel],
            rowLabel: newRowLabel
          };
          delete updatedCustomPerRowNumbers[oldRowLabel];
        }
        
        return { 
          ...s, 
          seats: updatedSeats,
          customPerRowNumbers: updatedCustomPerRowNumbers
        };
      });
      pushHistory(newSectors);
      return newSectors;
    });
  }, [pushHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const moveStep = e.shiftKey ? 10 : 1; // Shift = movimento maior

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (selectedSectorIds.length > 0) {
            selectedSectorIds.forEach(id => handleMoveSector(id, 0, -moveStep));
          } else if (selectedShapeIds.length > 0) {
            selectedShapeIds.forEach(id => handleMoveShape(id, 0, -moveStep));
          } else if (selectedElementIds.length > 0) {
            selectedElementIds.forEach(id => handleMoveElement(id, 0, -moveStep));
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (selectedSectorIds.length > 0) {
            selectedSectorIds.forEach(id => handleMoveSector(id, 0, moveStep));
          } else if (selectedShapeIds.length > 0) {
            selectedShapeIds.forEach(id => handleMoveShape(id, 0, moveStep));
          } else if (selectedElementIds.length > 0) {
            selectedElementIds.forEach(id => handleMoveElement(id, 0, moveStep));
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (selectedSectorIds.length > 0) {
            selectedSectorIds.forEach(id => handleMoveSector(id, -moveStep, 0));
          } else if (selectedShapeIds.length > 0) {
            selectedShapeIds.forEach(id => handleMoveShape(id, -moveStep, 0));
          } else if (selectedElementIds.length > 0) {
            selectedElementIds.forEach(id => handleMoveElement(id, -moveStep, 0));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (selectedSectorIds.length > 0) {
            selectedSectorIds.forEach(id => handleMoveSector(id, moveStep, 0));
          } else if (selectedShapeIds.length > 0) {
            selectedShapeIds.forEach(id => handleMoveShape(id, moveStep, 0));
          } else if (selectedElementIds.length > 0) {
            selectedElementIds.forEach(id => handleMoveElement(id, moveStep, 0));
          }
          break;
      }

      switch (e.key.toLowerCase()) {
        case 'v': 
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handlePasteSectors();
          } else {
            setActiveTool('select');
          }
          break;
        case 'h': setActiveTool('pan'); break;
        case 'r': 
          if (!e.ctrlKey && !e.metaKey) {
            if (e.shiftKey && selectedSectorIds.length === 1) {
              // Rotacionar 90° anti-horário
              const sector = sectors.find(s => s.id === selectedSectorIds[0]);
              if (sector) {
                handleUpdateSector(sector.id, { rotation: ((sector.rotation || 0) - 90 + 360) % 360 });
              }
            } else if (selectedSectorIds.length === 1) {
              // Rotacionar 90° horário
              const sector = sectors.find(s => s.id === selectedSectorIds[0]);
              if (sector) {
                handleUpdateSector(sector.id, { rotation: ((sector.rotation || 0) + 90) % 360 });
              }
            } else {
              setActiveTool('sector');
            }
          }
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey && selectedSectorIds.length === 1) {
            e.preventDefault();
            handleFlipSector(selectedSectorIds[0], e.shiftKey ? 'vertical' : 'horizontal');
          }
          break;
        case 'g': 
          if (selectedSectorIds.length === 1) {
            setShowGridGenerator(true);
          }
          break;
        case 's': setActiveTool('seat-single'); break;
        case 'e': setActiveTool('element'); break;
        case 't': setActiveTool('text'); break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Selecionar todos os setores
            setSelectedSectorIds(sectors.filter(s => s.visible).map(s => s.id));
          }
          break;
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRedo();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Ajustar à tela
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }
          break;
        case 'delete':
        case 'backspace': handleDelete(); break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleDuplicate();
          }
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleCopySectors();
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
  }, [handleDelete, handleDuplicate, handleCopySectors, handlePasteSectors, handleUndo, handleRedo, selectedSectorIds, selectedShapeIds, selectedElementIds, handleMoveSector, handleMoveShape, handleMoveElement]);

  // Dados para export - inclui todas as configurações do mapa
  const exportData = {
    ...mapData,
    sectors: sectors.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
      opacity: s.opacity,
      bounds: s.bounds,
      vertices: s.vertices,
      shape: s.shape,
      rotation: s.rotation,
      curvature: s.curvature,
      categoryId: s.categoryId,
      visible: s.visible,
      locked: s.locked,
      furnitureType: s.furnitureType,
      // Configurações de espaçamento
      rowSpacing: s.rowSpacing,
      colSpacing: s.colSpacing,
      seatSize: s.seatSize,
      // Configurações de labels
      rowLabelType: s.rowLabelType,
      seatLabelType: s.seatLabelType,
      rowLabelStart: s.rowLabelStart,
      seatLabelStart: s.seatLabelStart,
      labelPrefix: s.labelPrefix,
      // Configurações de grid e layout
      tableConfig: s.tableConfig,
      gridRows: s.gridRows,
      gridCols: s.gridCols,
      rowAlignment: s.rowAlignment,
      seatsPerRow: s.seatsPerRow,
      customNumbers: s.customNumbers,
      customPerRowNumbers: s.customPerRowNumbers,
      rowLabelPosition: s.rowLabelPosition,
      seatNumberDirection: s.seatNumberDirection,
      centerSeats: s.centerSeats,
      // Assentos com todas as propriedades
      seats: s.seats.map(seat => ({
        id: seat.id,
        sectorId: seat.sectorId,
        row: seat.row,
        number: seat.number,
        type: seat.type,
        status: seat.status,
        x: seat.x,
        y: seat.y,
        rotation: seat.rotation,
        price: seat.price,
        categoryId: seat.categoryId,
        furnitureType: seat.furnitureType,
        tableConfig: seat.tableConfig,
        rowDescription: seat.rowDescription,
        description: seat.description,
      })),
    })),
    elements: elements.map(e => ({
      id: e.id,
      type: e.type,
      label: e.label,
      bounds: e.bounds,
      rotation: e.rotation,
      color: e.color,
    })),
    // Metadados de exportação
    exportedAt: new Date().toISOString(),
    totalSeats: sectors.reduce((acc, s) => acc + s.seats.length, 0),
    totalSectors: sectors.length,
    totalElements: elements.length,
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
            Templates
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
          selectedElementIds={selectedElementIds}
          activeTool={activeTool}
          activeSeatType={activeSeatType}
          zoom={zoom}
          pan={pan}
          backgroundImage={backgroundImage}
          bgConfig={bgConfig}
          onZoomChange={setZoom}
          onPanChange={setPan}
          onSelectSector={handleSelectSector}
          onSelectSeats={handleSelectSeats}
          onSelectElements={handleSelectElements}
          onCreateSector={handleCreateShape}
          onMoveSector={handleMoveSector}
          onMoveElement={handleMoveElement}
          onResizeElement={handleResizeElement}
          onUpdateElement={handleUpdateElement}
          onUpdateSectorVertices={handleUpdateSectorVertices}
          onApplySeatType={handleApplySeatType}
          onMoveSeat={handleMoveSeat}
          onMoveSelectedSeats={handleMoveSelectedSeats}
          onSeatMoveEnd={handleSeatMoveEnd}
          onSectorMoveEnd={handleSectorMoveEnd}
          onVertexMoveEnd={handleVertexMoveEnd}
          onAddVertex={handleAddVertex}
          onRemoveVertex={handleRemoveVertex}
          onDuplicateSector={handleDuplicate}
          onDuplicateSectorById={handleDuplicateSectorById}
          onDeleteSector={handleDelete}
          onRotateSector={handleRotateSector}
          onEditRow={(sectorId, rowLabel) => setEditingRow({ sectorId, rowLabel })}
          geometricShapes={geometricShapes}
          selectedShapeIds={selectedShapeIds}
          onSelectShape={handleSelectShape}
          onMoveShape={handleMoveShape}
          onDeleteShape={handleDeleteShape}
          onResizeShape={handleResizeShape}
          onAddFurniture={handleRequestFurniture}
          onDeselectAll={handleDeselectAll}
          textElements={textElements}
          selectedTextIds={selectedTextIds}
          onCreateText={handleCreateText}
          onSelectText={handleSelectText}
          onMoveText={handleMoveText}
          onDeleteText={handleDeleteText}
          onUpdateText={handleUpdateText}
          autoEditTextId={autoEditTextId}
          onAutoEditTextDone={() => setAutoEditTextId(null)}
        />

        {/* Floating Text Toolbar */}
        {selectedTextIds.length === 1 && (() => {
          const te = textElements.find(t => t.id === selectedTextIds[0]);
          if (!te) return null;
          // Convert canvas coords to screen coords
          const screenX = te.x * zoom + pan.x + (containerRef.current?.querySelector('.overflow-hidden')?.getBoundingClientRect()?.left || 300);
          const screenY = te.y * zoom + pan.y + (containerRef.current?.querySelector('.overflow-hidden')?.getBoundingClientRect()?.top || 100);
          return (
            <TextToolbar
              textElement={te}
              position={{ x: screenX, y: screenY }}
              onUpdate={handleUpdateText}
              onDelete={handleDeleteText}
            />
          );
        })()}

        {/* Toolbar */}
        {showToolbar ? (
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onZoomIn={() => setZoom(z => Math.min(3, z * 1.2))}
            onZoomOut={() => setZoom(z => Math.max(0.2, z * 0.8))}
            onExport={() => setShowExport(true)}
            onImportImage={handleImportImage}
            onToggleBgPanel={() => setBgPanelOpen(prev => !prev)}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            hasSelection={selectedSectorIds.length > 0 || selectedSeatIds.length > 0}
            hasBgImage={!!bgConfig}
            zoom={zoom}
          />
        ) : null}

        {/* Toolbar toggle */}
        <button
          onClick={() => setShowToolbar(v => !v)}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-card/90 backdrop-blur-sm border border-border rounded-full p-1 shadow hover:bg-muted transition-colors"
          title={showToolbar ? 'Minimizar barra de ferramentas' : 'Expandir barra de ferramentas'}
        >
          {showToolbar ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {/* Alignment Bar - aparece quando 2+ setores ou 2+ assentos selecionados */}
        {selectedSectorIds.length >= 2 && (
          <AlignmentBar
            onAlign={handleAlignSectors}
            itemCount={selectedSectorIds.length}
            itemLabel="setores"
          />
        )}
        {selectedSeatIds.length >= 2 && selectedSectorIds.length < 2 && (
          <AlignmentBar
            onAlign={handleAlignSeats}
            itemCount={selectedSeatIds.length}
            itemLabel="assentos"
          />
        )}

        {/* Left Sidebar */}
        {showLeftSidebar ? (
          <LeftSidebar
            sectors={sectors}
            elements={elements}
            selectedIds={selectedSectorIds}
            onSelectSector={(id) => handleSelectSector(id, false)}
            onToggleSectorVisibility={handleToggleSectorVisibility}
            onToggleSectorLock={handleToggleSectorLock}
            onDeleteSector={handleDeleteSector}
            onDeleteElement={handleDeleteElement}
            activeSeatType={activeSeatType}
            onSeatTypeChange={setActiveSeatType}
            activeFurnitureType={activeFurnitureType}
            onFurnitureTypeChange={setActiveFurnitureType}
            tableConfig={tableConfig}
            onTableConfigChange={setTableConfig}
            onAddElement={handleAddElement}
          />
        ) : null}

        {/* Left Sidebar toggle */}
        <button
          onClick={() => setShowLeftSidebar(v => !v)}
          className={`absolute top-20 z-30 bg-card/90 backdrop-blur-sm border border-border rounded-r-lg p-1.5 shadow hover:bg-muted transition-all ${showLeftSidebar ? 'left-[19.5rem]' : 'left-0 rounded-l-lg'}`}
          title={showLeftSidebar ? 'Minimizar painel esquerdo' : 'Expandir painel esquerdo'}
        >
          {showLeftSidebar ? <PanelLeftClose className="h-4 w-4 text-muted-foreground" /> : <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />}
        </button>

        {/* Right Sidebar */}
        {showRightSidebar ? (
          <RightSidebar
            selectedSector={selectedSector}
            selectedSeats={selectedSeats}
            selectedShape={geometricShapes.find(s => selectedShapeIds.includes(s.id)) || null}
            sectors={sectors}
            selectedSectorIds={selectedSectorIds}
            onUpdateSector={handleUpdateSector}
            onUpdateSeats={handleUpdateSeats}
            onRegenerateSeats={handleRegenerateSeats}
            onResizeSector={handleResizeSector}
            onLinkShapeToSector={handleLinkShapeToSector}
            onUpdateSpacing={handleUpdateSpacing}
            onCenterSeats={handleCenterSeats}
            onFlipSector={handleFlipSector}
            onUpdateShapeName={(id, name) => setGeometricShapes(prev => prev.map(s => s.id === id ? { ...s, name } : s))}
            onUpdateShapeColor={(id, color) => setGeometricShapes(prev => prev.map(s => s.id === id ? { ...s, color } : s))}
            onUpdateShapeOpacity={(id, opacity) => setGeometricShapes(prev => prev.map(s => s.id === id ? { ...s, opacity } : s))}
            onUpdateShapeType={handleUpdateShapeType}
            onResizeShape={handleResizeShape}
            onUpdateShapeText={(id, textConfig) => setGeometricShapes(prev => prev.map(s => s.id === id ? { ...s, textConfig: { ...(s.textConfig || { text: s.name, fontFamily: 'sans-serif', fontSize: 13, fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center', color: '#ffffff', textDecoration: 'none' }), ...textConfig } } : s))}
            onGroupSectors={(sectorIds, categoryId) => {
              const category = PREDEFINED_SECTORS.find(s => s.id === categoryId);
              if (category) {
                setSectors(prev => prev.map(s => 
                  sectorIds.includes(s.id) 
                    ? { ...s, categoryId: categoryId, name: `${category.name} - ${s.name}`, color: category.color }
                    : s
                ));
                toast.success(`${sectorIds.length} setores agrupados em "${category.name}"`);
              }
            }}
          />
        ) : null}

        {/* Right Sidebar toggle */}
        <button
          onClick={() => setShowRightSidebar(v => !v)}
          className={`absolute top-20 z-30 bg-card/90 backdrop-blur-sm border border-border rounded-l-lg p-1.5 shadow hover:bg-muted transition-all ${showRightSidebar ? 'right-[19.5rem]' : 'right-0 rounded-r-lg'}`}
          title={showRightSidebar ? 'Minimizar painel direito' : 'Expandir painel direito'}
        >
          {showRightSidebar ? <PanelRightClose className="h-4 w-4 text-muted-foreground" /> : <PanelRightOpen className="h-4 w-4 text-muted-foreground" />}
        </button>

        {/* Background Image Panel */}
        <BackgroundImagePanel
          config={bgConfig}
          isOpen={bgPanelOpen}
          onClose={() => setBgPanelOpen(false)}
          onConfigChange={handleBgConfigChange}
          onImportImage={handleImportImage}
        />

        {/* Seat Placement Popup */}
        {seatPlacementPopup && (
          <SeatPlacementPopup
            position={seatPlacementPopup.screenPosition}
            currentFurnitureType={activeFurnitureType}
            currentSeatType={activeSeatType}
            currentTableConfig={tableConfig}
            nextNumber={seatPlacementPopup.nextNumber}
            onConfirm={handleConfirmFurniturePlacement}
            onCancel={() => setSeatPlacementPopup(null)}
          />
        )}

        <Minimap
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          sectors={sectors}
          zoom={zoom}
          pan={pan}
          viewportWidth={containerRef.current?.clientWidth || 1200}
          viewportHeight={(containerRef.current?.clientHeight || 800) - 56}
          onPanChange={setPan}
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
      <SeatGeneratorModal
        open={showGridGenerator}
        onClose={() => setShowGridGenerator(false)}
        onGenerate={handleGenerateGrid}
        sectorId={selectedSectorIds[0] || ''}
        sector={selectedSector}
      />

      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={(shapeConfig) => {
          // Cria setores baseado na forma selecionada
          const newSectors: Sector[] = [];
          for (let i = 0; i < shapeConfig.sectors; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = 100 + col * 500;
            const y = 200 + row * 350;
            
            // Calcula tamanho do setor baseado nos parâmetros configurados
            const isTable = shapeConfig.furnitureType === 'table' || shapeConfig.furnitureType === 'bistro';
            const itemSize = isTable ? 80 : shapeConfig.seatSize;
            const step = itemSize + (isTable ? shapeConfig.colSpacing * 2 : shapeConfig.colSpacing);
            const rowStep = itemSize + (isTable ? shapeConfig.rowSpacing * 2 : shapeConfig.rowSpacing);
            
            // Expande o setor para caber todos os itens
            const width = Math.max(450, shapeConfig.cols * step + 40);
            const height = Math.max(280, shapeConfig.rows * rowStep + 40);
            const bounds = { x, y, width, height };
            
            // Gera vértices considerando a curvatura
            const vertices = generateVerticesWithCurvature(shapeConfig.shape, bounds, shapeConfig.curvature || 0);
            const sectorId = generateId();
            
            // Gera assentos DENTRO do polígono com tipo de mobília e curvatura
            const tableConf = shapeConfig.furnitureType !== 'chair' ? {
              shape: shapeConfig.tableShape,
              chairCount: shapeConfig.chairsPerTable,
              tableWidth: 60,
              tableHeight: 60,
            } : undefined;
            
            // Parseia seatsPerRow e customPerRowNumbers
            const parsedSeatsPerRow = shapeConfig.seatsPerRowEnabled && shapeConfig.seatsPerRowConfig 
              ? shapeConfig.seatsPerRowConfig.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0)
              : undefined;
            
            const parsedCustomNumbers = shapeConfig.seatLabelType === 'custom' && shapeConfig.customNumbers
              ? shapeConfig.customNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
              : undefined;
            
            const parsedCustomPerRowNumbers: Record<string, RowNumberingConfig> | undefined = 
              shapeConfig.seatLabelType === 'custom-per-row' && shapeConfig.customPerRowConfig
                ? Object.entries(shapeConfig.customPerRowConfig).reduce((acc, [rowLabel, cfg]) => {
                    const numbers = cfg.customNumbers?.trim()
                      ? cfg.customNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
                      : undefined;
                    acc[rowLabel] = {
                      rowLabel,
                      type: cfg.type,
                      startNumber: cfg.startNumber,
                      numbers,
                      direction: cfg.direction || 'ltr'
                    };
                    return acc;
                  }, {} as Record<string, RowNumberingConfig>)
                : undefined;
            
            const seats = generateSeatsInsidePolygon(
              vertices,
              sectorId,
              shapeConfig.seatSize,
              shapeConfig.colSpacing,
              shapeConfig.rowLabelType,
              shapeConfig.seatLabelType,
              shapeConfig.prefix || `S${sectors.length + i + 1}-`,
              shapeConfig.furnitureType,
              tableConf,
              shapeConfig.shape === 'arc',
              shapeConfig.curvature || 0,
              shapeConfig.rows,
              shapeConfig.cols,
              parsedCustomNumbers,
              undefined, // rowDescriptions
              0, // rotation
              parsedSeatsPerRow,
              shapeConfig.rowSpacing,
              shapeConfig.rowAlignment,
              shapeConfig.rowLabelStart || 'A',
              shapeConfig.seatLabelStart || 1,
              parsedCustomPerRowNumbers,
              shapeConfig.seatNumberDirection
            );
            
            const sector: Sector = {
              id: sectorId,
              name: `Setor ${sectors.length + i + 1}`,
              color: SECTOR_COLORS[(sectors.length + i) % SECTOR_COLORS.length],
              opacity: 60,
              bounds,
              vertices,
              shape: shapeConfig.shape,
              rotation: 0,
              curvature: shapeConfig.curvature || 0,
              seats,
              visible: true,
              locked: false,
              furnitureType: shapeConfig.furnitureType,
              // Salva configurações para preservar ao ajustar espaçamento
              rowSpacing: shapeConfig.rowSpacing,
              colSpacing: shapeConfig.colSpacing,
              seatSize: shapeConfig.seatSize,
              rowLabelType: shapeConfig.rowLabelType,
              seatLabelType: shapeConfig.seatLabelType,
              rowLabelStart: shapeConfig.rowLabelStart,
              seatLabelStart: shapeConfig.seatLabelStart,
              labelPrefix: shapeConfig.prefix,
              tableConfig: tableConf,
              gridRows: shapeConfig.rows,
              gridCols: shapeConfig.cols,
              rowAlignment: shapeConfig.rowAlignment,
              seatsPerRow: parsedSeatsPerRow,
              customNumbers: parsedCustomNumbers,
              customPerRowNumbers: parsedCustomPerRowNumbers,
              rowLabelPosition: shapeConfig.rowLabelPosition,
              seatNumberDirection: shapeConfig.seatNumberDirection,
            };
            newSectors.push(sector);
          }
          setSectors(prev => [...prev, ...newSectors]);
          pushHistory([...sectors, ...newSectors]);
          setShowOnboarding(false);
          toast.success(`${shapeConfig.sectors} setor(es) criado(s) com ${newSectors.reduce((acc, s) => acc + s.seats.length, 0)} assentos!`);
        }}
      />

      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        data={exportData}
      />

      {/* Row Editor Modal */}
      {editingRow && (
        <RowEditorModal
          open={!!editingRow}
          onClose={() => setEditingRow(null)}
          sector={sectors.find(s => s.id === editingRow.sectorId)!}
          rowLabel={editingRow.rowLabel}
          onUpdateRow={handleUpdateRowConfig}
        />
      )}
    </div>
  );
};
