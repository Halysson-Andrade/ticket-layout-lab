import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Sector, Seat, VenueElement, ToolType, SeatType, SEAT_COLORS, ELEMENT_ICONS, Vertex, TableConfig, GeometricShape } from '@/types/mapStudio';
import { isPointInBounds, isPointInPolygon, getBoundsFromVertices } from '@/lib/mapUtils';
import { CanvasContextMenu } from './CanvasContextMenu';
import { toast } from 'sonner';

interface BackgroundImageConfig {
  url: string;
  opacity: number;
  scale: number;
  x: number;
  y: number;
}

interface CanvasProps {
  width: number;
  height: number;
  sectors: Sector[];
  elements: VenueElement[];
  selectedSectorIds: string[];
  selectedSeatIds: string[];
  selectedElementIds: string[];
  activeTool: ToolType;
  activeSeatType: SeatType;
  zoom: number;
  pan: { x: number; y: number };
  backgroundImage: string | null;
  bgConfig: BackgroundImageConfig | null;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onSelectSector: (id: string, additive: boolean) => void;
  onSelectSeats: (ids: string[], additive: boolean) => void;
  onSelectElements: (ids: string[], additive: boolean) => void;
  onCreateSector: (bounds: { x: number; y: number; width: number; height: number }) => void;
  onMoveSector: (id: string, dx: number, dy: number) => void;
  onMoveElement: (id: string, dx: number, dy: number) => void;
  onResizeElement: (id: string, width: number, height: number) => void;
  onUpdateSectorVertices: (id: string, vertices: Vertex[]) => void;
  onApplySeatType: (ids: string[], type: SeatType) => void;
  onMoveSeat: (seatId: string, sectorId: string, x: number, y: number) => void;
  onMoveSelectedSeats?: (dx: number, dy: number) => void;
  onSeatMoveEnd?: () => void;
  onAddVertex?: (sectorId: string, edgeIndex: number, position: { x: number; y: number }) => void;
  onRemoveVertex?: (sectorId: string, vertexIndex: number) => void;
  onDuplicateSector?: () => void;
  onDeleteSector?: () => void;
  onZoomToSector?: (sectorId: string) => void;
  geometricShapes?: GeometricShape[];
  selectedShapeIds?: string[];
  onSelectShape?: (id: string, additive: boolean) => void;
  onMoveShape?: (id: string, dx: number, dy: number) => void;
  onDeleteShape?: (id: string) => void; // Excluir forma não vinculada
  onGroupShapesToSector?: (shapeIds: string[]) => void;
  onAddFurniture?: (sectorId: string, position: { x: number; y: number }) => void;
}

const HANDLE_SIZE = 10;

export const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  sectors,
  elements,
  selectedSectorIds,
  selectedSeatIds,
  selectedElementIds,
  activeTool,
  activeSeatType,
  zoom,
  pan,
  backgroundImage,
  bgConfig,
  onZoomChange,
  onPanChange,
  onSelectSector,
  onSelectSeats,
  onSelectElements,
  onCreateSector,
  onMoveSector,
  onMoveElement,
  onResizeElement,
  onUpdateSectorVertices,
  onApplySeatType,
  onMoveSeat,
  onMoveSelectedSeats,
  onSeatMoveEnd,
  onAddVertex,
  onRemoveVertex,
  onDuplicateSector,
  onDeleteSector,
  onZoomToSector,
  geometricShapes = [],
  selectedShapeIds = [],
  onSelectShape,
  onMoveShape,
  onDeleteShape,
  onGroupShapesToSector,
  onAddFurniture,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isDraggingSeat, setIsDraggingSeat] = useState(false);
  const [draggingSeatInfo, setDraggingSeatInfo] = useState<{ seatId: string; sectorId: string } | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const [activeVertexIndex, setActiveVertexIndex] = useState<number | null>(null);
  const [isResizingElement, setIsResizingElement] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [boxSelectStart, setBoxSelectStart] = useState({ x: 0, y: 0 });
  const [boxSelectCurrent, setBoxSelectCurrent] = useState({ x: 0, y: 0 });
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    canvasPos: { x: number; y: number };
    edgeIndex: number | null;
    vertexIndex: number | null;
    sectorId: string | null;
  } | null>(null);

  // Estado para forçar re-render quando imagem carrega
  const [bgImageLoaded, setBgImageLoaded] = useState(false);

  // Carrega imagem de fundo
  useEffect(() => {
    if (backgroundImage) {
      setBgImageLoaded(false);
      const img = new Image();
      img.src = backgroundImage;
      img.onload = () => {
        bgImageRef.current = img;
        setBgImageLoaded(true); // Força re-render
      };
    } else {
      bgImageRef.current = null;
      setBgImageLoaded(false);
    }
  }, [backgroundImage]);

  // Converte coordenadas do mouse para coordenadas do canvas
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Transforma ponto aplicando rotação inversa do setor
  const transformPointForSector = useCallback((pos: { x: number; y: number }, sector: Sector): { x: number; y: number } => {
    if (!sector.rotation || sector.rotation === 0) {
      return pos;
    }
    const bounds = getBoundsFromVertices(sector.vertices);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const rad = (-sector.rotation * Math.PI) / 180; // Rotação inversa
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    return {
      x: centerX + dx * Math.cos(rad) - dy * Math.sin(rad),
      y: centerY + dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  }, []);

  // Verifica se o ponto está próximo de um vértice
  const getVertexAtPoint = useCallback((pos: { x: number; y: number }, sector: Sector): number | null => {
    const handleRadius = HANDLE_SIZE / zoom;
    // Aplica rotação inversa ao ponto clicado para comparar com vértices originais
    const transformedPos = transformPointForSector(pos, sector);
    for (let i = 0; i < sector.vertices.length; i++) {
      const v = sector.vertices[i];
      const dist = Math.sqrt(Math.pow(transformedPos.x - v.x, 2) + Math.pow(transformedPos.y - v.y, 2));
      if (dist <= handleRadius) {
        return i;
      }
    }
    return null;
  }, [zoom, transformPointForSector]);

  // Verifica se o ponto está próximo de uma aresta do polígono
  const getEdgeAtPoint = useCallback((pos: { x: number; y: number }, sector: Sector): { edgeIndex: number; point: { x: number; y: number } } | null => {
    const threshold = 12 / zoom;
    const vertices = sector.vertices;
    // Aplica rotação inversa ao ponto clicado
    const transformedPos = transformPointForSector(pos, sector);
    
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      
      // Calcular distância do ponto à linha
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const lengthSquared = dx * dx + dy * dy;
      
      if (lengthSquared === 0) continue;
      
      // Parâmetro t para projeção do ponto na linha
      const t = Math.max(0, Math.min(1, ((transformedPos.x - v1.x) * dx + (transformedPos.y - v1.y) * dy) / lengthSquared));
      
      // Ponto mais próximo na aresta
      const projX = v1.x + t * dx;
      const projY = v1.y + t * dy;
      
      const distSquared = Math.pow(transformedPos.x - projX, 2) + Math.pow(transformedPos.y - projY, 2);
      
      if (distSquared <= threshold * threshold) {
        return { edgeIndex: i, point: { x: projX, y: projY } };
      }
    }
    return null;
  }, [zoom, transformPointForSector]);

  // Verifica se ponto está dentro do setor considerando rotação
  const isPointInSector = useCallback((pos: { x: number; y: number }, sector: Sector): boolean => {
    if (!sector.vertices || sector.vertices.length < 3) return false;
    const transformedPos = transformPointForSector(pos, sector);
    return isPointInPolygon(transformedPos, sector.vertices);
  }, [transformPointForSector]);

  // Renderiza mesa/bistrô com cadeiras
  const renderTableWithChairs = useCallback((
    ctx: CanvasRenderingContext2D,
    seat: Seat,
    isSelected: boolean
  ) => {
    const config = seat.tableConfig || { shape: 'round', chairCount: 4, tableWidth: 40, tableHeight: 40 };
    const tableX = seat.x;
    const tableY = seat.y;
    const tableW = config.tableWidth;
    const tableH = config.tableHeight;
    const chairRadius = 6;
    
    // Cor da mesa
    ctx.fillStyle = isSelected ? '#3b82f6' : (seat.furnitureType === 'bistro' ? '#8b5cf6' : '#64748b');
    
    // Desenha mesa
    if (config.shape === 'round') {
      ctx.beginPath();
      ctx.arc(tableX + tableW / 2, tableY + tableH / 2, Math.min(tableW, tableH) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(tableX, tableY, tableW, tableH);
    }
    
    // Borda se selecionado
    if (isSelected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / zoom;
      if (config.shape === 'round') {
        ctx.beginPath();
        ctx.arc(tableX + tableW / 2, tableY + tableH / 2, Math.min(tableW, tableH) / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(tableX, tableY, tableW, tableH);
      }
    }
    
    // Desenha cadeiras ao redor
    ctx.fillStyle = SEAT_COLORS[seat.type];
    const centerX = tableX + tableW / 2;
    const centerY = tableY + tableH / 2;
    const radius = (Math.max(tableW, tableH) / 2) + chairRadius + 4;
    
    for (let i = 0; i < config.chairCount; i++) {
      const angle = (i / config.chairCount) * Math.PI * 2 - Math.PI / 2;
      const chairX = centerX + Math.cos(angle) * radius;
      const chairY = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(chairX, chairY, chairRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [zoom]);

  // Renderização do canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Limpa
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fundo
    ctx.fillStyle = '#1e2330';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Grid
    ctx.strokeStyle = '#2a3142';
    ctx.lineWidth = 0.5 / zoom;
    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Imagem de fundo com configurações
    if (bgImageRef.current && bgConfig) {
      ctx.save();
      ctx.globalAlpha = bgConfig.opacity / 100;
      
      const scale = bgConfig.scale / 100;
      const imgWidth = width * scale;
      const imgHeight = height * scale;
      
      ctx.drawImage(
        bgImageRef.current, 
        bgConfig.x, 
        bgConfig.y, 
        imgWidth, 
        imgHeight
      );
      ctx.restore();
    } else if (bgImageRef.current) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(bgImageRef.current, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    // Elementos (palco, bar, etc) - selecionáveis, móveis e redimensionáveis
    elements.forEach(el => {
      const isElSelected = selectedElementIds.includes(el.id);
      
      ctx.fillStyle = el.color || '#4a5568';
      ctx.fillRect(el.bounds.x, el.bounds.y, el.bounds.width, el.bounds.height);
      
      // Borda de seleção com handles de redimensionamento
      if (isElSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(el.bounds.x - 2, el.bounds.y - 2, el.bounds.width + 4, el.bounds.height + 4);
        ctx.setLineDash([]);
        
        // Desenha handles de redimensionamento nos cantos
        const handleSize = 8 / zoom;
        ctx.fillStyle = '#3b82f6';
        // NE
        ctx.fillRect(el.bounds.x + el.bounds.width - handleSize/2, el.bounds.y - handleSize/2, handleSize, handleSize);
        // NW
        ctx.fillRect(el.bounds.x - handleSize/2, el.bounds.y - handleSize/2, handleSize, handleSize);
        // SE
        ctx.fillRect(el.bounds.x + el.bounds.width - handleSize/2, el.bounds.y + el.bounds.height - handleSize/2, handleSize, handleSize);
        // SW
        ctx.fillRect(el.bounds.x - handleSize/2, el.bounds.y + el.bounds.height - handleSize/2, handleSize, handleSize);
      }
      
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.min(el.bounds.width, el.bounds.height) * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        ELEMENT_ICONS[el.type] || '📦',
        el.bounds.x + el.bounds.width / 2,
        el.bounds.y + el.bounds.height / 2
      );
      ctx.font = '10px sans-serif';
      ctx.fillText(
        el.label,
        el.bounds.x + el.bounds.width / 2,
        el.bounds.y + el.bounds.height + 12
      );
    });

    // Setores e Assentos
    sectors.forEach(sector => {
      if (!sector.visible) return;

      ctx.save();
      
      const isSelected = selectedSectorIds.includes(sector.id);
      const bounds = getBoundsFromVertices(sector.vertices);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      
      // Zoom dinâmico: define se mostra assentos ou cor sólida
      const showSeatsThreshold = 0.5;
      const showSolidColor = zoom < showSeatsThreshold && sector.seats.length > 0;
      
      // Aplica rotação se existir
      if (sector.rotation && sector.rotation !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate((sector.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      
      // Desenha polígono do setor (com curvatura aplicada)
      // Formas com muitos vértices (>8) já são naturalmente curvas, não aplica curvatura extra
      if (sector.vertices && sector.vertices.length > 2) {
        const curvature = sector.curvature || 0;
        const isNaturallyCurved = sector.vertices.length > 8; // arc, circle, wave já têm muitos vértices
        const shouldApplyCurvature = curvature > 0 && !isNaturallyCurved;
        
        ctx.beginPath();
        if (shouldApplyCurvature) {
          // Desenha com curvas de Bezier para curvatura
          const verts = sector.vertices;
          ctx.moveTo(verts[0].x, verts[0].y);
          
          for (let i = 0; i < verts.length; i++) {
            const current = verts[i];
            const next = verts[(i + 1) % verts.length];
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;
            
            // Calcula ponto de controle baseado na curvatura
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const curveAmount = (curvature / 100) * dist * 0.3;
            
            // Normal perpendicular
            const nx = -dy / dist;
            const ny = dx / dist;
            
            const cpX = midX + nx * curveAmount;
            const cpY = midY + ny * curveAmount;
            
            ctx.quadraticCurveTo(cpX, cpY, next.x, next.y);
          }
        } else {
          // Desenha linhas retas entre vértices (formas naturalmente curvas já têm muitos vértices)
          ctx.moveTo(sector.vertices[0].x, sector.vertices[0].y);
          for (let i = 1; i < sector.vertices.length; i++) {
            ctx.lineTo(sector.vertices[i].x, sector.vertices[i].y);
          }
          ctx.closePath();
        }
        
        // Fill - usa opacidade configurada no setor
        const sectorColor = sector.color || '#6366f1';
        const sectorOpacity = sector.opacity !== undefined ? sector.opacity : 60;
        // Quando zoom baixo, aumenta ligeiramente a opacidade
        const fillOpacity = showSolidColor 
          ? Math.min(95, sectorOpacity + 20) / 100 
          : sectorOpacity / 100;
        
        // Converte cor para formato com alpha
        if (sectorColor.startsWith('hsl')) {
          ctx.fillStyle = sectorColor.replace(')', `, ${fillOpacity})`).replace('hsl(', 'hsla(');
        } else if (sectorColor.startsWith('#')) {
          const r = parseInt(sectorColor.slice(1, 3), 16) || 100;
          const g = parseInt(sectorColor.slice(3, 5), 16) || 102;
          const b = parseInt(sectorColor.slice(5, 7), 16) || 241;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillOpacity})`;
        } else {
          ctx.fillStyle = sectorColor;
          ctx.globalAlpha = fillOpacity;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Stroke
        ctx.strokeStyle = isSelected ? '#3b82f6' : sector.color;
        ctx.lineWidth = isSelected ? 3 / zoom : 1.5 / zoom;
        ctx.stroke();

        // Desenha handles dos vértices se selecionado
        if (isSelected && activeTool === 'select') {
          sector.vertices.forEach((vertex, i) => {
            const handleSize = HANDLE_SIZE / zoom;
            
            // Handle background
            ctx.fillStyle = '#1e2330';
            ctx.fillRect(vertex.x - handleSize / 2, vertex.y - handleSize / 2, handleSize, handleSize);
            
            // Handle border
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2 / zoom;
            ctx.strokeRect(vertex.x - handleSize / 2, vertex.y - handleSize / 2, handleSize, handleSize);
            
            // Número do vértice
            if (zoom > 0.6) {
              ctx.fillStyle = '#3b82f6';
              ctx.font = `${10 / zoom}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(i + 1), vertex.x, vertex.y);
            }
          });
        }
      }

      // Mostra contagem de assentos no centro quando zoom baixo
      if (showSolidColor) {
        const seatCounts: Record<string, number> = {};
        sector.seats.forEach(seat => {
          seatCounts[seat.type] = (seatCounts[seat.type] || 0) + 1;
        });
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${16 / zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        
        // Total de assentos
        ctx.fillText(`${sector.seats.length}`, centerX, centerY - 10 / zoom);
        ctx.font = `${10 / zoom}px sans-serif`;
        ctx.fillText('assentos', centerX, centerY + 6 / zoom);
        
        // Resumo por tipo (exceto normal)
        const typeLabels: Record<string, string> = { pcd: 'PCD', vip: 'VIP', obeso: 'Obeso', companion: 'Acomp.', blocked: 'Bloq.' };
        const specialTypes = Object.entries(seatCounts)
          .filter(([type, count]) => type !== 'normal' && count > 0)
          .map(([type, count]) => `${count} ${typeLabels[type] || type}`)
          .join(' • ');
        
        if (specialTypes) {
          ctx.font = `${9 / zoom}px sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(specialTypes, centerX, centerY + 20 / zoom);
        }
      } else {
        // Zoom próximo: mostra assentos individuais
        
        // Agrupa assentos por fileira para renderizar labels nas laterais
        const seatsByRow: Record<string, Seat[]> = {};
        sector.seats.forEach(seat => {
          if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
          seatsByRow[seat.row].push(seat);
        });
        
        // Renderiza labels de fileira nas laterais (quando zoom > 0.6)
        const rowLabelPos = sector.rowLabelPosition || 'left';
        if (zoom > 0.6) {
          Object.entries(seatsByRow).forEach(([rowLabel, rowSeats]) => {
            if (rowSeats.length === 0) return;
            
            // Encontra o assento mais à esquerda e mais à direita da fileira
            const sortedByX = [...rowSeats].sort((a, b) => a.x - b.x);
            const leftMost = sortedByX[0];
            const rightMost = sortedByX[sortedByX.length - 1];
            
            const seatSize = leftMost.tableConfig?.tableWidth || 14;
            
            // Label à esquerda
            if (rowLabelPos === 'left' || rowLabelPos === 'both') {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.font = `bold ${11}px sans-serif`;
              ctx.textAlign = 'right';
              ctx.textBaseline = 'middle';
              ctx.fillText(rowLabel, leftMost.x - 8, leftMost.y + seatSize / 2);
              
              // Descrição da fileira (se houver) abaixo do label
              if (leftMost.rowDescription && zoom > 0.8) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.font = `italic ${9}px sans-serif`;
                ctx.fillText(leftMost.rowDescription, leftMost.x - 8, leftMost.y + seatSize / 2 + 12);
              }
            }
            
            // Label à direita
            if (rowLabelPos === 'right' || rowLabelPos === 'both') {
              ctx.textAlign = 'left';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.font = `bold ${11}px sans-serif`;
              ctx.fillText(rowLabel, rightMost.x + seatSize + 8, rightMost.y + seatSize / 2);
            }
          });
        }
        
        // Renderiza assentos
        sector.seats.forEach(seat => {
          const isSeatSelected = selectedSeatIds.includes(seat.id);
          
          if (seat.furnitureType === 'table' || seat.furnitureType === 'bistro') {
            renderTableWithChairs(ctx, seat, isSeatSelected);
          } else {
            const seatSize = 14;
            
            ctx.fillStyle = isSeatSelected ? '#3b82f6' : SEAT_COLORS[seat.type];
            
            ctx.beginPath();
            ctx.arc(seat.x + seatSize / 2, seat.y + seatSize / 2, seatSize / 2, 0, Math.PI * 2);
            ctx.fill();

            if (isSeatSelected) {
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2 / zoom;
              ctx.stroke();
            }

            if (zoom > 0.8) {
              ctx.fillStyle = '#fff';
              ctx.font = `${8}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(seat.number, seat.x + seatSize / 2, seat.y + seatSize / 2);
            }
          }
        });
      }

      ctx.restore();
    });

    // Desenha formas geométricas (não vinculadas a setores)
    geometricShapes.forEach(shape => {
      const isSelected = selectedShapeIds.includes(shape.id);
      const bounds = getBoundsFromVertices(shape.vertices);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      
      ctx.save();
      
      // Aplica rotação se existir
      if (shape.rotation && shape.rotation !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate((shape.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      
      // Desenha polígono
      if (shape.vertices && shape.vertices.length > 2) {
        ctx.beginPath();
        ctx.moveTo(shape.vertices[0].x, shape.vertices[0].y);
        for (let i = 1; i < shape.vertices.length; i++) {
          ctx.lineTo(shape.vertices[i].x, shape.vertices[i].y);
        }
        ctx.closePath();
        
        // Fill com opacidade
        const shapeColor = shape.color || '#6366f1';
        const shapeOpacity = shape.opacity !== undefined ? shape.opacity : 60;
        
        if (shapeColor.startsWith('hsl')) {
          ctx.fillStyle = shapeColor.replace(')', `, ${shapeOpacity / 100})`).replace('hsl(', 'hsla(');
        } else if (shapeColor.startsWith('#')) {
          const r = parseInt(shapeColor.slice(1, 3), 16) || 100;
          const g = parseInt(shapeColor.slice(3, 5), 16) || 102;
          const b = parseInt(shapeColor.slice(5, 7), 16) || 241;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${shapeOpacity / 100})`;
        } else {
          ctx.fillStyle = shapeColor;
          ctx.globalAlpha = shapeOpacity / 100;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Stroke - borda tracejada para indicar que não está vinculada
        ctx.strokeStyle = isSelected ? '#3b82f6' : shape.color;
        ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom;
        ctx.setLineDash([8 / zoom, 4 / zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Nome da forma
      ctx.fillStyle = '#fff';
      ctx.font = `${12}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(shape.name, bounds.x + 4, bounds.y + 4);
      
      // Indicador de "não vinculada"
      ctx.fillStyle = 'rgba(255, 200, 0, 0.9)';
      ctx.font = `${10}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚠ Não vinculada', centerX, centerY);
      
      ctx.restore();
    });

    // Retângulo de seleção/criação de setor
    if (isDrawing && activeTool === 'sector') {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(x, y, w, h);
    }

    // Box selection para assentos
    if (isBoxSelecting) {
      const x = Math.min(boxSelectStart.x, boxSelectCurrent.x);
      const y = Math.min(boxSelectStart.y, boxSelectCurrent.y);
      const w = Math.abs(boxSelectCurrent.x - boxSelectStart.x);
      const h = Math.abs(boxSelectCurrent.y - boxSelectStart.y);
      
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
  }, [sectors, elements, geometricShapes, selectedSectorIds, selectedSeatIds, selectedElementIds, selectedShapeIds, zoom, pan, width, height, isDrawing, drawStart, drawCurrent, activeTool, isBoxSelecting, boxSelectStart, boxSelectCurrent, renderTableWithChairs, bgConfig]);

  // Atualiza canvas
  useEffect(() => {
    requestAnimationFrame(render);
  }, [render, bgImageLoaded]);

  // Força render inicial após montagem
  useEffect(() => {
    const timer = setTimeout(() => {
      requestAnimationFrame(render);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Mouse wheel zoom - precisa usar listener nativo para passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(3, Math.max(0.2, zoom * delta));
      
      // Zoom em direção ao cursor
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      onPanChange({
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
      });
      
      onZoomChange(newZoom);
    };
    
    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelNative);
  }, [zoom, pan, onZoomChange, onPanChange]);

  // Context menu (botão direito) - só mostra se Ctrl pressionado
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Só mostra context menu se Ctrl estiver pressionado
    // Caso contrário, permite pan normal via right-click
    if (!e.ctrlKey && !e.metaKey) {
      return;
    }
    
    const pos = screenToCanvas(e.clientX, e.clientY);
    
    // Verifica se clicou em um vértice de setor selecionado
    for (const sectorId of selectedSectorIds) {
      const sector = sectors.find(s => s.id === sectorId);
      if (sector && sector.vertices) {
        const vertexIndex = getVertexAtPoint(pos, sector);
        if (vertexIndex !== null) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            canvasPos: pos,
            edgeIndex: null,
            vertexIndex: vertexIndex,
            sectorId: sectorId,
          });
          return;
        }
        
        // Verifica se clicou em uma aresta
        const edge = getEdgeAtPoint(pos, sector);
        if (edge) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            canvasPos: edge.point,
            edgeIndex: edge.edgeIndex,
            vertexIndex: null,
            sectorId: sectorId,
          });
          return;
        }
      }
    }
    
    // Verifica se clicou dentro de um setor selecionado
    for (const sectorId of selectedSectorIds) {
      const sector = sectors.find(s => s.id === sectorId);
      if (sector && isPointInSector(pos, sector)) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          canvasPos: pos,
          edgeIndex: null,
          vertexIndex: null,
          sectorId: sectorId,
        });
        return;
      }
    }
    
    // Fecha menu se clicar no vazio
    setContextMenu(null);
  }, [screenToCanvas, selectedSectorIds, sectors, getVertexAtPoint, getEdgeAtPoint, isPointInSector]);

  // Mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Fecha context menu se aberto
    if (contextMenu) {
      setContextMenu(null);
    }
    
    const pos = screenToCanvas(e.clientX, e.clientY);
    
    // Middle click (botão 1) ou pan tool = pan
    // Right-click (botão 2) sem Ctrl = pan também
    if (activeTool === 'pan' || e.button === 1 || (e.button === 2 && !e.ctrlKey && !e.metaKey)) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    
    // Right-click com Ctrl = context menu (tratado em handleContextMenu)
    if (e.button === 2) {
      return;
    }

    if (activeTool === 'sector') {
      setIsDrawing(true);
      setDrawStart(pos);
      setDrawCurrent(pos);
      return;
    }

    // Ferramenta de mobília: clique dentro de setor adiciona mobília (Melhoria 2)
    if (activeTool === 'table') {
      for (const sector of sectors) {
        if (!sector.visible || sector.locked) continue;
        if (sector.vertices && sector.vertices.length > 2) {
          if (isPointInSector(pos, sector)) {
            onAddFurniture?.(sector.id, { x: pos.x - 30, y: pos.y - 30 });
            return;
          }
        }
      }
      toast.error('Clique dentro de um setor para adicionar mobília');
      return;
    }

    if (activeTool === 'select' || activeTool === 'lasso') {
      // Verifica click em vértice de setor selecionado
      for (const sectorId of selectedSectorIds) {
        const sector = sectors.find(s => s.id === sectorId);
        if (sector && sector.vertices) {
          const vertexIndex = getVertexAtPoint(pos, sector);
          if (vertexIndex !== null) {
            setIsDraggingVertex(true);
            setActiveVertexIndex(vertexIndex);
            setDragStart(pos);
            return;
          }
        }
      }

      // Verifica click em handle de redimensionamento de elemento selecionado
      for (const elId of selectedElementIds) {
        const el = elements.find(e => e.id === elId);
        if (el) {
          const handleSize = 10 / zoom;
          const corners = [
            { corner: 'nw' as const, x: el.bounds.x, y: el.bounds.y },
            { corner: 'ne' as const, x: el.bounds.x + el.bounds.width, y: el.bounds.y },
            { corner: 'sw' as const, x: el.bounds.x, y: el.bounds.y + el.bounds.height },
            { corner: 'se' as const, x: el.bounds.x + el.bounds.width, y: el.bounds.y + el.bounds.height },
          ];
          for (const { corner, x, y } of corners) {
            if (Math.abs(pos.x - x) < handleSize && Math.abs(pos.y - y) < handleSize) {
              setIsResizingElement(true);
              setResizeCorner(corner);
              setDragStart(pos);
              return;
            }
          }
        }
      }

      // Verifica click em elemento (palco, bar, etc)
      for (const el of elements) {
        if (isPointInBounds(pos, el.bounds)) {
          onSelectElements([el.id], e.shiftKey);
          setIsDraggingElement(true);
          setDragStart(pos);
          return;
        }
      }

      // Se já há assentos selecionados, verifica se clicou em um deles para mover
      if (selectedSeatIds.length > 0) {
        for (const sector of sectors) {
          if (!sector.visible) continue;
          for (const seat of sector.seats) {
            const seatW = seat.tableConfig?.tableWidth || 14;
            const seatH = seat.tableConfig?.tableHeight || 14;
            const seatBounds = { x: seat.x, y: seat.y, width: seatW, height: seatH };
            if (isPointInBounds(pos, seatBounds)) {
              // Clicou em um assento
              if (selectedSeatIds.includes(seat.id)) {
                // Assento já selecionado - inicia arraste (sem precisar de Ctrl)
                setIsDraggingSeat(true);
                setDraggingSeatInfo({ seatId: seat.id, sectorId: sector.id });
                setDragStart(pos);
                return;
              } else if (e.ctrlKey || e.metaKey) {
                // Ctrl+click em assento não selecionado - adiciona à seleção
                onSelectSeats([seat.id], true);
                return;
              }
              // Clicou em assento não selecionado sem Ctrl - continua para limpar seleção
            }
          }
        }
        
        // Clicou fora dos assentos selecionados - limpa seleção de assentos
        // e verifica se clicou em um setor ou no vazio
        onSelectSeats([], false);
      }

      // CTRL+click para selecionar assento individual (quando não há assentos selecionados)
      if (e.ctrlKey || e.metaKey) {
        for (const sector of sectors) {
          if (!sector.visible) continue;
          for (const seat of sector.seats) {
            const seatW = seat.tableConfig?.tableWidth || 14;
            const seatH = seat.tableConfig?.tableHeight || 14;
            const seatBounds = { x: seat.x, y: seat.y, width: seatW, height: seatH };
            if (isPointInBounds(pos, seatBounds)) {
              onSelectSeats([seat.id], e.shiftKey);
              if (activeSeatType !== 'normal') {
                onApplySeatType([seat.id], activeSeatType);
              }
              return;
            }
          }
        }
      }

      // Verifica click em forma geométrica (não vinculada)
      for (const shape of geometricShapes) {
        if (shape.vertices && shape.vertices.length > 2) {
          if (isPointInPolygon(pos, shape.vertices)) {
            onSelectShape?.(shape.id, e.shiftKey);
            setIsDraggingShape(true);
            setDragStart(pos);
            return;
          }
        }
      }

      // Verifica click em setor (usando polígono) - comportamento padrão
      for (const sector of sectors) {
        if (!sector.visible || sector.locked) continue;
        if (sector.vertices && sector.vertices.length > 2) {
          if (isPointInSector(pos, sector)) {
            onSelectSector(sector.id, e.shiftKey);
            setIsDragging(true);
            setDragStart(pos);
            return;
          }
        } else if (isPointInBounds(pos, sector.bounds)) {
          onSelectSector(sector.id, e.shiftKey);
          setIsDragging(true);
          setDragStart(pos);
          return;
        }
      }

      // Click no vazio - inicia box selection
      setIsBoxSelecting(true);
      setBoxSelectStart(pos);
      setBoxSelectCurrent(pos);
    }
  }, [activeTool, screenToCanvas, pan, sectors, elements, geometricShapes, selectedSectorIds, selectedElementIds, selectedSeatIds, selectedShapeIds, onSelectSeats, onSelectSector, onSelectElements, onSelectShape, onApplySeatType, activeSeatType, getVertexAtPoint, zoom, contextMenu, isPointInSector, onAddFurniture]);

  // Mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      onPanChange({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);

    if (isDrawing && activeTool === 'sector') {
      setDrawCurrent(pos);
    }

    if (isDraggingVertex && activeVertexIndex !== null && selectedSectorIds.length === 1) {
      const sector = sectors.find(s => s.id === selectedSectorIds[0]);
      if (sector && sector.vertices) {
        const newVertices = [...sector.vertices];
        // Aplica rotação inversa no ponto atual para atualizar o vértice corretamente
        const transformedPos = transformPointForSector(pos, sector);
        newVertices[activeVertexIndex] = { x: transformedPos.x, y: transformedPos.y };
        onUpdateSectorVertices(sector.id, newVertices);
      }
      return;
    }

    // Redimensionar elemento
    if (isResizingElement && selectedElementIds.length === 1 && resizeCorner) {
      const el = elements.find(e => e.id === selectedElementIds[0]);
      if (el) {
        let newWidth = el.bounds.width;
        let newHeight = el.bounds.height;
        
        if (resizeCorner === 'se') {
          newWidth = Math.max(50, pos.x - el.bounds.x);
          newHeight = Math.max(30, pos.y - el.bounds.y);
        } else if (resizeCorner === 'ne') {
          newWidth = Math.max(50, pos.x - el.bounds.x);
          newHeight = Math.max(30, el.bounds.y + el.bounds.height - pos.y);
        } else if (resizeCorner === 'sw') {
          newWidth = Math.max(50, el.bounds.x + el.bounds.width - pos.x);
          newHeight = Math.max(30, pos.y - el.bounds.y);
        } else if (resizeCorner === 'nw') {
          newWidth = Math.max(50, el.bounds.x + el.bounds.width - pos.x);
          newHeight = Math.max(30, el.bounds.y + el.bounds.height - pos.y);
        }
        
        onResizeElement(el.id, newWidth, newHeight);
      }
      return;
    }

    // Arrastar assentos selecionados
    if (isDraggingSeat && draggingSeatInfo) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      // Move todos os assentos selecionados
      if (selectedSeatIds.length > 1 && onMoveSelectedSeats) {
        onMoveSelectedSeats(dx, dy);
      } else {
        // Move apenas o assento arrastado
        const sector = sectors.find(s => s.id === draggingSeatInfo.sectorId);
        if (sector && isPointInSector(pos, sector)) {
          onMoveSeat(draggingSeatInfo.seatId, draggingSeatInfo.sectorId, pos.x - 7, pos.y - 7);
        }
      }
      setDragStart(pos);
      return;
    }

    // Arrastar elementos do venue
    if (isDraggingElement && selectedElementIds.length > 0) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      selectedElementIds.forEach(id => onMoveElement(id, dx, dy));
      setDragStart(pos);
      return;
    }

    // Arrastar formas geométricas (não vinculadas)
    if (isDraggingShape && selectedShapeIds.length > 0 && onMoveShape) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      selectedShapeIds.forEach(id => onMoveShape(id, dx, dy));
      setDragStart(pos);
      return;
    }

    if (isDragging && selectedSectorIds.length > 0) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      selectedSectorIds.forEach(id => onMoveSector(id, dx, dy));
      setDragStart(pos);
    }

    if (isBoxSelecting) {
      setBoxSelectCurrent(pos);
    }
  }, [isPanning, isDrawing, isDragging, isDraggingShape, isDraggingElement, isDraggingVertex, isDraggingSeat, draggingSeatInfo, isResizingElement, resizeCorner, activeVertexIndex, isBoxSelecting, activeTool, dragStart, screenToCanvas, selectedSectorIds, selectedShapeIds, selectedElementIds, sectors, elements, onPanChange, onMoveSector, onMoveShape, onMoveElement, onResizeElement, onMoveSeat, onUpdateSectorVertices, onMoveSelectedSeats, selectedSeatIds, isPointInSector, transformPointForSector]);

  // Mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDrawing && activeTool === 'sector') {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      
      if (w > 20 && h > 20) {
        onCreateSector({ x, y, width: w, height: h });
      }
    }

    // Box selection finalizada
    if (isBoxSelecting) {
      const minX = Math.min(boxSelectStart.x, boxSelectCurrent.x);
      const maxX = Math.max(boxSelectStart.x, boxSelectCurrent.x);
      const minY = Math.min(boxSelectStart.y, boxSelectCurrent.y);
      const maxY = Math.max(boxSelectStart.y, boxSelectCurrent.y);
      
      // Só seleciona se a box tiver tamanho mínimo
      if (maxX - minX > 5 && maxY - minY > 5) {
        const selectedIds: string[] = [];
        sectors.forEach(sector => {
          if (!sector.visible) return;
          sector.seats.forEach(seat => {
            const seatCenterX = seat.x + 7;
            const seatCenterY = seat.y + 7;
            if (seatCenterX >= minX && seatCenterX <= maxX && 
                seatCenterY >= minY && seatCenterY <= maxY) {
              selectedIds.push(seat.id);
            }
          });
        });
        if (selectedIds.length > 0) {
          onSelectSeats(selectedIds, e.shiftKey);
          
          // Aplica tipo se não for normal
          if (activeSeatType !== 'normal') {
            onApplySeatType(selectedIds, activeSeatType);
          }
        }
      } else {
        // Click simples no vazio - limpa seleção
        if (!e.shiftKey) {
          onSelectSeats([], false);
        }
      }
    }

    // Salva histórico se estava arrastando assento
    if (isDraggingSeat && onSeatMoveEnd) {
      onSeatMoveEnd();
    }

    setIsPanning(false);
    setIsDrawing(false);
    setIsDragging(false);
    setIsDraggingShape(false);
    setIsDraggingElement(false);
    setIsDraggingSeat(false);
    setDraggingSeatInfo(null);
    setIsBoxSelecting(false);
    setIsDraggingVertex(false);
    setActiveVertexIndex(null);
    setIsResizingElement(false);
    setResizeCorner(null);
  }, [isDrawing, isDraggingSeat, activeTool, drawStart, drawCurrent, onCreateSector, isBoxSelecting, boxSelectStart, boxSelectCurrent, sectors, onSelectSeats, activeSeatType, onApplySeatType, onSeatMoveEnd]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-canvas-bg cursor-crosshair"
      style={{ cursor: activeTool === 'pan' ? 'grab' : isPanning ? 'grabbing' : isDraggingVertex ? 'move' : isDraggingElement ? 'move' : isDraggingSeat ? 'grabbing' : isResizingElement ? 'nwse-resize' : isBoxSelecting ? 'crosshair' : 'default' }}
    >
      <canvas
        ref={canvasRef}
        width={containerRef.current?.clientWidth || 1200}
        height={containerRef.current?.clientHeight || 800}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onMouseLeave={handleMouseUp}
      />
      
      {/* Hint overlay */}
      {selectedSeatIds.length === 0 && sectors.length > 0 && !isBoxSelecting && !selectedSectorIds.length && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-muted-foreground pointer-events-none">
          Ctrl+click no assento para selecionar • Arraste para box selection
        </div>
      )}
      
      {/* Vertex editing hint */}
      {selectedSectorIds.length === 1 && activeTool === 'select' && !contextMenu && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-primary-foreground pointer-events-none">
          Arraste os vértices para ajustar • Botão direito para adicionar/remover pontos
        </div>
      )}
      
      {/* Selection count with move hint */}
      {selectedSeatIds.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          {selectedSeatIds.length} assento{selectedSeatIds.length > 1 ? 's' : ''} • Arraste para mover • Clique fora para desselecionar
        </div>
      )}
      
      {/* Element resize hint */}
      {selectedElementIds.length === 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-accent/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-accent-foreground pointer-events-none">
          Arraste os cantos para redimensionar o elemento
        </div>
      )}
      
      {/* Context menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          showVertexOptions={contextMenu.edgeIndex !== null || contextMenu.vertexIndex !== null}
          showElementOptions={contextMenu.sectorId !== null && contextMenu.edgeIndex === null && contextMenu.vertexIndex === null}
          canRemoveVertex={contextMenu.vertexIndex !== null && (() => {
            const sector = sectors.find(s => s.id === contextMenu.sectorId);
            return sector ? sector.vertices.length > 3 : false;
          })()}
          onAddVertex={() => {
            if (contextMenu.sectorId && contextMenu.edgeIndex !== null) {
              onAddVertex?.(contextMenu.sectorId, contextMenu.edgeIndex, contextMenu.canvasPos);
            }
          }}
          onRemoveVertex={() => {
            if (contextMenu.sectorId && contextMenu.vertexIndex !== null) {
              onRemoveVertex?.(contextMenu.sectorId, contextMenu.vertexIndex);
            }
          }}
          onDuplicate={onDuplicateSector}
          onDelete={onDeleteSector}
        />
      )}
    </div>
  );
};
