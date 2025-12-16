import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LayoutGrid, FileJson, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toolbar } from './Toolbar';
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

  // Modals
  const [showGridGenerator, setShowGridGenerator] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingRow, setEditingRow] = useState<{ sectorId: string; rowLabel: string } | null>(null);

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
    toast.success(`Forma "${newShape.name}" criada! Vincule a um setor nas propriedades.`);
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
          x: v.x + dx,
          y: v.y + dy,
        })),
        seats: s.seats.map(seat => ({
          ...seat,
          x: seat.x + dx,
          y: seat.y + dy,
        })),
      };
    }));
  }, []);

  // Atualiza vértices do setor e reposiciona assentos
  const handleUpdateSectorVertices = useCallback((id: string, vertices: Vertex[]) => {
    setSectors(prev => prev.map(s => {
      if (s.id !== id) return s;
      const bounds = getBoundsFromVertices(vertices);
      
      // Reposiciona assentos para caber no novo polígono
      const repositionedSeats = repositionSeatsInsidePolygon(
        s.seats,
        s.vertices,
        vertices,
        s.id,
        12 // seatSize
      );
      
      return { ...s, vertices, bounds, seats: repositionedSeats };
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
          const startX = bounds.x + 20;
          const startY = bounds.y + 20;
          
          // Usa configuração de mesa se aplicável
          const furnitureType = s.furnitureType || s.seats[0]?.furnitureType || 'chair';
          const isTable = furnitureType === 'table' || furnitureType === 'bistro';
          const itemSize = isTable ? (s.seats[0]?.tableConfig?.tableWidth || 60) : seatSize;
          const step = itemSize + colSpacing;
          const rowStep = itemSize + rowSpacing;
          
          // Recalcula posição de cada assento mantendo IDs, tipos, números, descrições, etc.
          const repositionedSeats: Seat[] = [];
          sortedRows.forEach((rowLabel, rowIndex) => {
            const rowSeats = seatsByRow[rowLabel];
            const rowY = startY + rowIndex * rowStep;
            
            rowSeats.forEach((seat, colIndex) => {
              repositionedSeats.push({
                ...seat, // Mantém ID, tipo, número, descrição, tudo!
                x: startX + colIndex * step,
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
        
        // Inverte vértices
        const flippedVertices = s.vertices.map(v => {
          if (direction === 'horizontal') {
            return { x: centerX * 2 - v.x, y: v.y };
          } else {
            return { x: v.x, y: centerY * 2 - v.y };
          }
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
        
        return { ...s, vertices: flippedVertices, seats: flippedSeats };
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

  const handleAddFurnitureToSector = useCallback((sectorId: string, position: { x: number; y: number }) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        const newSeat: Seat = {
          id: generateId(),
          sectorId,
          row: '',
          number: String(s.seats.length + 1),
          type: activeSeatType,
          status: 'available',
          x: position.x,
          y: position.y,
          rotation: 0,
          furnitureType: activeFurnitureType,
          tableConfig: activeFurnitureType !== 'chair' ? { ...tableConfig } : undefined,
        };
        
        return { ...s, seats: [...s.seats, newSeat] };
      });
      pushHistory(newSectors);
      return newSectors;
    });
    toast.success(`${activeFurnitureType === 'chair' ? 'Cadeira' : activeFurnitureType === 'table' ? 'Mesa' : 'Bistrô'} adicionado(a)!`);
  }, [activeFurnitureType, activeSeatType, tableConfig, pushHistory]);

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
  const handleResizeElement = useCallback((id: string, width: number, height: number) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      return {
        ...el,
        bounds: { ...el.bounds, width, height },
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

  // Salva histórico após finalizar movimento de vértice
  const handleVertexMoveEnd = useCallback(() => {
    pushHistory(sectors);
  }, [sectors, pushHistory]);

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
              x: v.x + 50,
              y: v.y + 50,
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
        x: v.x + 50,
        y: v.y + 50,
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
          x: v.x + 50 + (index * 10),
          y: v.y + 50 + (index * 10),
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
  const handleUpdateRowConfig = useCallback((sectorId: string, rowLabel: string, config: import('@/types/mapStudio').RowNumberingConfig) => {
    setSectors(prev => {
      const newSectors = prev.map(s => {
        if (s.id !== sectorId) return s;
        
        const newCustomPerRowNumbers = { ...(s.customPerRowNumbers || {}), [rowLabel]: config };
        
        // Atualiza os números dos assentos da fileira
        const updatedSeats = s.seats.map(seat => {
          if (seat.row !== rowLabel) return seat;
          
          // Recalcula o número baseado na nova configuração
          const rowSeats = s.seats.filter(rs => rs.row === rowLabel).sort((a, b) => a.x - b.x);
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
    toast.success(`Fileira ${rowLabel} atualizada`);
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
        case 'r': setActiveTool('sector'); break;
        case 'g': 
          if (selectedSectorIds.length === 1) {
            setShowGridGenerator(true);
          }
          break;
        case 's': setActiveTool('seat-single'); break;
        case 'e': setActiveTool('element'); break;
        case 't': setActiveTool('table'); break;
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
          onUpdateSectorVertices={handleUpdateSectorVertices}
          onApplySeatType={handleApplySeatType}
          onMoveSeat={handleMoveSeat}
          onMoveSelectedSeats={handleMoveSelectedSeats}
          onSeatMoveEnd={handleSeatMoveEnd}
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
          onAddFurniture={handleAddFurnitureToSector}
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
          onDeleteElement={handleDeleteElement}
          activeSeatType={activeSeatType}
          onSeatTypeChange={setActiveSeatType}
          activeFurnitureType={activeFurnitureType}
          onFurnitureTypeChange={setActiveFurnitureType}
          tableConfig={tableConfig}
          onTableConfigChange={setTableConfig}
          onAddElement={handleAddElement}
        />

        {/* Right Sidebar */}
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
          onGroupSectors={(sectorIds, categoryId) => {
            // Agrupa setores na mesma categoria
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

        {/* Background Image Panel */}
        <BackgroundImagePanel
          config={bgConfig}
          onConfigChange={handleBgConfigChange}
          onImportImage={handleImportImage}
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
          onUpdateRowLabel={handleUpdateRowLabel}
        />
      )}
    </div>
  );
};
