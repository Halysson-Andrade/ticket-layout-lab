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
  onResizeElement: (id: string, width: number, height: number, x?: number, y?: number) => void;
  onUpdateSectorVertices: (id: string, vertices: Vertex[]) => void;
  onApplySeatType: (ids: string[], type: SeatType) => void;
  onMoveSeat: (seatId: string, sectorId: string, x: number, y: number) => void;
  onMoveSelectedSeats?: (dx: number, dy: number) => void;
  onSeatMoveEnd?: () => void;
  onSectorMoveEnd?: () => void;
  onAddVertex?: (sectorId: string, edgeIndex: number, position: { x: number; y: number }) => void;
  onRemoveVertex?: (sectorId: string, vertexIndex: number) => void;
  onVertexMoveEnd?: () => void;
  onDuplicateSector?: () => void;
  onDuplicateSectorById?: (sectorId: string) => void;
  onDeleteSector?: () => void;
  onZoomToSector?: (sectorId: string) => void;
  onEditRow?: (sectorId: string, rowLabel: string) => void;
  onRotateSector?: (sectorId: string, rotation: number, finalize?: boolean) => void;
  geometricShapes?: GeometricShape[];
  selectedShapeIds?: string[];
  onSelectShape?: (id: string, additive: boolean) => void;
  onMoveShape?: (id: string, dx: number, dy: number) => void;
  onDeleteShape?: (id: string) => void; // Excluir forma não vinculada
  onGroupShapesToSector?: (shapeIds: string[]) => void;
  onAddFurniture?: (sectorId: string, position: { x: number; y: number }) => void;
  onDeselectAll?: () => void;
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
  onSectorMoveEnd,
  onAddVertex,
  onRemoveVertex,
  onVertexMoveEnd,
  onDuplicateSector,
  onDuplicateSectorById,
  onDeleteSector,
  onZoomToSector,
  onEditRow,
  onRotateSector,
  geometricShapes = [],
  selectedShapeIds = [],
  onSelectShape,
  onMoveShape,
  onDeleteShape,
  onGroupShapesToSector,
  onAddFurniture,
  onDeselectAll,
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
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingStartAngle, setRotatingStartAngle] = useState(0);
  const [isCurvingVertex, setIsCurvingVertex] = useState(false);
  const [curvingVertexInfo, setCurvingVertexInfo] = useState<{ sectorId: string; vertexIndex: number } | null>(null);
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

  // Tooltip state para assentos bloqueados
  const [hoveredBlockedSeat, setHoveredBlockedSeat] = useState<{
    seat: Seat;
    screenX: number;
    screenY: number;
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
    isSelected: boolean,
    showNumbers: boolean = true
  ) => {
    const config = seat.tableConfig || { shape: 'round', chairCount: 4, tableWidth: 40, tableHeight: 40 };
    const tableX = seat.x;
    const tableY = seat.y;
    const tableW = config.tableWidth;
    const tableH = config.tableHeight;
    const chairRadius = config.chairRadius || 6;
    
    // Cor da mesa
    const defaultColor = seat.furnitureType === 'bistro' ? '#8b5cf6' : '#64748b';
    ctx.fillStyle = isSelected ? '#3b82f6' : (config.tableColor || defaultColor);
    
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
    
    // Número da mesa no centro
    if (showNumbers && zoom > 0.6) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${10}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seat.number, tableX + tableW / 2, tableY + tableH / 2);
    }
    
    // Desenha cadeiras ao redor com números
    ctx.fillStyle = SEAT_COLORS[seat.type];
    const centerX = tableX + tableW / 2;
    const centerY = tableY + tableH / 2;
    
    const startAngle = ((config.chairStartAngle || 0) * Math.PI) / 180;
    for (let i = 0; i < config.chairCount; i++) {
      const angle = startAngle + (i / config.chairCount) * Math.PI * 2 - Math.PI / 2;
      
      // Posiciona cadeiras encostadas na borda da mesa
      let chairX: number, chairY: number;
      if (config.shape === 'round') {
        // Para mesa redonda: cadeira encostada no raio
        const tableRadius = Math.min(tableW, tableH) / 2;
        const dist = tableRadius + chairRadius + 1;
        chairX = centerX + Math.cos(angle) * dist;
        chairY = centerY + Math.sin(angle) * dist;
      } else {
        // Para mesa quadrada/retangular: cadeira encostada na borda
        const halfW = tableW / 2;
        const halfH = tableH / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        // Calcula interseção com o retângulo
        const scaleX = cos !== 0 ? Math.abs(halfW / cos) : Infinity;
        const scaleY = sin !== 0 ? Math.abs(halfH / sin) : Infinity;
        const scale = Math.min(scaleX, scaleY);
        chairX = centerX + cos * (scale + chairRadius + 1);
        chairY = centerY + sin * (scale + chairRadius + 1);
      }
      
      ctx.beginPath();
      ctx.arc(chairX, chairY, chairRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Número da cadeira
      if (showNumbers && zoom > 0.8) {
        ctx.fillStyle = '#fff';
        ctx.font = `${7}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), chairX, chairY);
        ctx.fillStyle = SEAT_COLORS[seat.type]; // Restaura cor
      }
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
          // Desenha linhas/curvas entre vértices, usando controlPoints quando disponíveis
          ctx.moveTo(sector.vertices[0].x, sector.vertices[0].y);
          for (let i = 0; i < sector.vertices.length; i++) {
            const next = sector.vertices[(i + 1) % sector.vertices.length];
            if (next.controlPoint) {
              ctx.quadraticCurveTo(next.controlPoint.x, next.controlPoint.y, next.x, next.y);
            } else {
              ctx.lineTo(next.x, next.y);
            }
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
            const hasCurve = !!vertex.controlPoint;
            
            // Handle background
            ctx.fillStyle = hasCurve ? '#f59e0b' : '#1e2330';
            if (hasCurve) {
              // Vértice com curva: desenha círculo
              ctx.beginPath();
              ctx.arc(vertex.x, vertex.y, handleSize / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 2 / zoom;
              ctx.stroke();
              
              // Desenha linha do control point
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
              ctx.lineWidth = 1 / zoom;
              ctx.setLineDash([4 / zoom, 2 / zoom]);
              ctx.beginPath();
              ctx.moveTo(vertex.x, vertex.y);
              ctx.lineTo(vertex.controlPoint!.x, vertex.controlPoint!.y);
              ctx.stroke();
              ctx.setLineDash([]);
              
              // Handle do control point
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(vertex.controlPoint!.x, vertex.controlPoint!.y, handleSize / 3, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillRect(vertex.x - handleSize / 2, vertex.y - handleSize / 2, handleSize, handleSize);
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 2 / zoom;
              ctx.strokeRect(vertex.x - handleSize / 2, vertex.y - handleSize / 2, handleSize, handleSize);
            }
            
            // Número do vértice
            if (zoom > 0.6) {
              ctx.fillStyle = hasCurve ? '#f59e0b' : '#3b82f6';
              ctx.font = `${10 / zoom}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(i + 1), vertex.x, vertex.y);
            }
          });
          
          // Indicador de topo (triângulo no topo da forma)
          const topY = Math.min(...sector.vertices.map(v => v.y));
          const topVertices = sector.vertices.filter(v => Math.abs(v.y - topY) < 5);
          const topCenterX = topVertices.length > 0 
            ? topVertices.reduce((sum, v) => sum + v.x, 0) / topVertices.length 
            : bounds.x + bounds.width / 2;
          
          const arrowSize = 12 / zoom;
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(topCenterX, topY - arrowSize - 5 / zoom);
          ctx.lineTo(topCenterX - arrowSize / 2, topY - 5 / zoom);
          ctx.lineTo(topCenterX + arrowSize / 2, topY - 5 / zoom);
          ctx.closePath();
          ctx.fill();
          
          // Texto "TOPO"
          ctx.fillStyle = '#22c55e';
          ctx.font = `bold ${9 / zoom}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText('TOPO', topCenterX, topY - arrowSize - 8 / zoom);
          
          // Handle de rotação (ícone circular com seta) - desenhado em coordenadas locais do setor
          // Como já estamos dentro do contexto rotacionado, desenhamos em posição fixa
          const rotHandleDistance = 35 / zoom;
          const handleRadius = 12 / zoom;
          
          // Posição fixa: canto superior direito do bounds + offset (sem rotação adicional)
          const handleX = bounds.x + bounds.width + rotHandleDistance;
          const handleY = bounds.y - rotHandleDistance;
          
          // Círculo do handle
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Borda
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
          
          // Seta de rotação
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2 / zoom;
          ctx.beginPath();
          const arrowRadius = handleRadius * 0.6;
          ctx.arc(handleX, handleY, arrowRadius, -Math.PI * 0.7, Math.PI * 0.3);
          ctx.stroke();
          
          // Ponta da seta
          const arrowTipAngle = Math.PI * 0.3;
          const tipX = handleX + Math.cos(arrowTipAngle) * arrowRadius;
          const tipY = handleY + Math.sin(arrowTipAngle) * arrowRadius;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + 4 / zoom, tipY - 2 / zoom);
          ctx.lineTo(tipX + 2 / zoom, tipY + 4 / zoom);
          ctx.closePath();
          ctx.fillStyle = '#fff';
          ctx.fill();
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

  // ESC para cancelar modo curvar
  useEffect(() => {
    if (!isCurvingVertex) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCurvingVertex(false);
        setCurvingVertexInfo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCurvingVertex]);

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
      // Verifica click no handle de rotação de setor selecionado
      for (const sectorId of selectedSectorIds) {
        const sector = sectors.find(s => s.id === sectorId);
        if (sector && sector.vertices) {
          const bounds = getBoundsFromVertices(sector.vertices);
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          
          // Posição fixa do handle no espaço local (não rotacionado)
          const rotHandleDistance = 35 / zoom;
          const localHandleX = bounds.x + bounds.width + rotHandleDistance;
          const localHandleY = bounds.y - rotHandleDistance;
          
          // Transforma o clique para o espaço local do setor (aplica rotação inversa)
          const rotation = sector.rotation || 0;
          const rad = (-rotation * Math.PI) / 180; // Rotação inversa
          
          // Translada para origem, rotaciona inversamente, translada de volta
          const relX = pos.x - centerX;
          const relY = pos.y - centerY;
          const localClickX = centerX + relX * Math.cos(rad) - relY * Math.sin(rad);
          const localClickY = centerY + relX * Math.sin(rad) + relY * Math.cos(rad);
          
          const handleRadius = 12 / zoom;
          
          const dist = Math.sqrt(Math.pow(localClickX - localHandleX, 2) + Math.pow(localClickY - localHandleY, 2));
          if (dist <= handleRadius) {
            setIsRotating(true);
            const startAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
            setRotatingStartAngle(startAngle - (sector.rotation || 0));
            setDragStart({ x: centerX, y: centerY });
            return;
          }
        }
      }
      
      // Verifica click em vértice de setor selecionado
      for (const sectorId of selectedSectorIds) {
        const sector = sectors.find(s => s.id === sectorId);
        if (sector && sector.vertices) {
          const vertexIndex = getVertexAtPoint(pos, sector);
          if (vertexIndex !== null) {
            // Salva estado inicial para undo ANTES de começar o drag
            if (onSeatMoveEnd) {
              // Usamos onSeatMoveEnd como proxy para pushHistory
              // O histórico será salvo quando soltar o mouse
            }
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

      // Modo de curvar vértice ativo: clique no vértice inicia arraste do control point
      if (isCurvingVertex && curvingVertexInfo) {
        const sector = sectors.find(s => s.id === curvingVertexInfo.sectorId);
        if (sector) {
          const vertexIndex = getVertexAtPoint(pos, sector);
          if (vertexIndex === curvingVertexInfo.vertexIndex) {
            setIsDraggingVertex(true);
            setActiveVertexIndex(vertexIndex);
            setDragStart(pos);
            return;
          }
        }
        // Clicou fora do vértice - cancela modo curvar
        setIsCurvingVertex(false);
        setCurvingVertexInfo(null);
      }

      // Se múltiplos setores estão selecionados e clicou dentro de um deles, inicia drag do grupo
      if (selectedSectorIds.length > 1) {
        for (const sectorId of selectedSectorIds) {
          const sector = sectors.find(s => s.id === sectorId);
          if (sector && isPointInSector(pos, sector)) {
            setIsDragging(true);
            setDragStart(pos);
            return;
          }
        }
      }

      // Verifica click em assento (sem precisar de Ctrl)
      for (const sector of sectors) {
        if (!sector.visible) continue;
        for (const seat of sector.seats) {
          let hitDetected = false;
          
          if (seat.furnitureType === 'table' || seat.furnitureType === 'bistro') {
            // Para mesas/bistrôs, expande hitbox para incluir cadeiras ao redor
            const config = seat.tableConfig || { shape: 'round', chairCount: 4, tableWidth: 40, tableHeight: 40, chairStartAngle: 0 };
            const chairRadius = 6;
            const extraRadius = chairRadius + 4; // mesmo offset usado na renderização
            const expandedBounds = {
              x: seat.x - extraRadius,
              y: seat.y - extraRadius,
              width: config.tableWidth + extraRadius * 2,
              height: config.tableHeight + extraRadius * 2,
            };
            hitDetected = isPointInBounds(pos, expandedBounds);
          } else {
            const seatW = 14;
            const seatH = 14;
            const seatBounds = { x: seat.x, y: seat.y, width: seatW, height: seatH };
            hitDetected = isPointInBounds(pos, seatBounds);
          }
          
          if (hitDetected) {
            if (!selectedSeatIds.includes(seat.id)) {
              // Seleciona o assento primeiro
              onSelectSeats([seat.id], e.ctrlKey || e.metaKey);
              if (activeSeatType !== 'normal') {
                onApplySeatType([seat.id], activeSeatType);
              }
            }
            // Inicia arraste imediatamente (selecionar + arrastar no mesmo clique)
            setIsDraggingSeat(true);
            setDraggingSeatInfo({ seatId: seat.id, sectorId: sector.id });
            setDragStart(pos);
            return;
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
            // CTRL+Click em setor = multi-seleção (adiciona/remove da seleção)
            if (e.ctrlKey || e.metaKey) {
              onSelectSector(sector.id, true); // additive = true
              setIsDragging(true);
              setDragStart(pos);
              return;
            }
            // Click normal: seleciona apenas este setor (a menos que já selecionado em multi-seleção)
            const isAlreadySelected = selectedSectorIds.includes(sector.id);
            if (!isAlreadySelected || selectedSectorIds.length === 1) {
              onSelectSector(sector.id, e.shiftKey);
            }
            setIsDragging(true);
            setDragStart(pos);
            return;
          }
        } else if (isPointInBounds(pos, sector.bounds)) {
          // CTRL+Click em setor = multi-seleção (adiciona/remove da seleção)
          if (e.ctrlKey || e.metaKey) {
            onSelectSector(sector.id, true); // additive = true
            setIsDragging(true);
            setDragStart(pos);
            return;
          }
          // Click normal: seleciona apenas este setor (a menos que já selecionado em multi-seleção)
          const isAlreadySelected = selectedSectorIds.includes(sector.id);
          if (!isAlreadySelected || selectedSectorIds.length === 1) {
            onSelectSector(sector.id, e.shiftKey);
          }
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
  }, [activeTool, screenToCanvas, pan, sectors, elements, geometricShapes, selectedSectorIds, selectedElementIds, selectedSeatIds, selectedShapeIds, onSelectSeats, onSelectSector, onSelectElements, onSelectShape, onApplySeatType, activeSeatType, getVertexAtPoint, zoom, contextMenu, isPointInSector, onAddFurniture, onDuplicateSectorById]);

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

    // Rotação de setor via handle
    if (isRotating && selectedSectorIds.length === 1 && onRotateSector) {
      const sector = sectors.find(s => s.id === selectedSectorIds[0]);
      if (sector) {
        const currentAngle = Math.atan2(pos.y - dragStart.y, pos.x - dragStart.x) * 180 / Math.PI;
        let newRotation = currentAngle - rotatingStartAngle;
        // Normaliza para 0-360
        newRotation = ((newRotation % 360) + 360) % 360;
        onRotateSector(sector.id, Math.round(newRotation));
      }
      return;
    }

    if (isDraggingVertex && activeVertexIndex !== null && selectedSectorIds.length === 1) {
      const sector = sectors.find(s => s.id === selectedSectorIds[0]);
      if (sector && sector.vertices) {
        const newVertices = [...sector.vertices];
        const transformedPos = transformPointForSector(pos, sector);
        
        if (isCurvingVertex && curvingVertexInfo) {
          // Modo curvar: atualiza o controlPoint do vértice em vez de mover
          newVertices[activeVertexIndex] = {
            ...newVertices[activeVertexIndex],
            controlPoint: { x: transformedPos.x, y: transformedPos.y },
          };
        } else {
          // Modo normal: move o vértice
          const oldVertex = sector.vertices[activeVertexIndex];
          const dx = transformedPos.x - oldVertex.x;
          const dy = transformedPos.y - oldVertex.y;
          newVertices[activeVertexIndex] = { 
            x: oldVertex.x + dx, 
            y: oldVertex.y + dy,
            controlPoint: oldVertex.controlPoint, // preserva control point
          };
        }
        
        onUpdateSectorVertices(sector.id, newVertices);
      }
      return;
    }

    // Redimensionar elemento
    if (isResizingElement && selectedElementIds.length === 1 && resizeCorner) {
      const el = elements.find(e => e.id === selectedElementIds[0]);
      if (el) {
        let newX = el.bounds.x;
        let newY = el.bounds.y;
        let newWidth = el.bounds.width;
        let newHeight = el.bounds.height;
        
        if (resizeCorner === 'se') {
          // Canto inferior direito: ancora no topo-esquerdo
          newWidth = Math.max(50, pos.x - el.bounds.x);
          newHeight = Math.max(30, pos.y - el.bounds.y);
        } else if (resizeCorner === 'ne') {
          // Canto superior direito: ancora no inferior-esquerdo
          newWidth = Math.max(50, pos.x - el.bounds.x);
          const proposedHeight = Math.max(30, el.bounds.y + el.bounds.height - pos.y);
          newY = el.bounds.y + el.bounds.height - proposedHeight;
          newHeight = proposedHeight;
        } else if (resizeCorner === 'sw') {
          // Canto inferior esquerdo: ancora no topo-direito
          const proposedWidth = Math.max(50, el.bounds.x + el.bounds.width - pos.x);
          newX = el.bounds.x + el.bounds.width - proposedWidth;
          newWidth = proposedWidth;
          newHeight = Math.max(30, pos.y - el.bounds.y);
        } else if (resizeCorner === 'nw') {
          // Canto superior esquerdo: ancora no inferior-direito
          const proposedWidth = Math.max(50, el.bounds.x + el.bounds.width - pos.x);
          const proposedHeight = Math.max(30, el.bounds.y + el.bounds.height - pos.y);
          newX = el.bounds.x + el.bounds.width - proposedWidth;
          newY = el.bounds.y + el.bounds.height - proposedHeight;
          newWidth = proposedWidth;
          newHeight = proposedHeight;
        }
        
        onResizeElement(el.id, newWidth, newHeight, newX, newY);
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

    // Detecta hover em assentos bloqueados para mostrar tooltip
    if (!isPanning && !isDragging && !isBoxSelecting && !isDraggingSeat) {
      let foundBlockedSeat = false;
      for (const sector of sectors) {
        if (!sector.visible) continue;
        for (const seat of sector.seats) {
          if (seat.type === 'blocked') {
            const seatW = seat.tableConfig?.tableWidth || 14;
            const seatH = seat.tableConfig?.tableHeight || 14;
            const seatBounds = { x: seat.x, y: seat.y, width: seatW, height: seatH };
            if (isPointInBounds(pos, seatBounds)) {
              setHoveredBlockedSeat({
                seat,
                screenX: e.clientX,
                screenY: e.clientY,
              });
              foundBlockedSeat = true;
              break;
            }
          }
        }
        if (foundBlockedSeat) break;
      }
      if (!foundBlockedSeat && hoveredBlockedSeat) {
        setHoveredBlockedSeat(null);
      }
    }
  }, [isPanning, isDrawing, isDragging, isDraggingShape, isDraggingElement, isDraggingVertex, isDraggingSeat, draggingSeatInfo, isResizingElement, resizeCorner, activeVertexIndex, isBoxSelecting, activeTool, dragStart, screenToCanvas, selectedSectorIds, selectedShapeIds, selectedElementIds, sectors, elements, onPanChange, onMoveSector, onMoveShape, onMoveElement, onResizeElement, onMoveSeat, onUpdateSectorVertices, onMoveSelectedSeats, selectedSeatIds, isPointInSector, transformPointForSector, hoveredBlockedSeat]);

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
        // CTRL pressionado = seleciona assentos; sem CTRL = seleciona setores
        if (e.ctrlKey || e.metaKey) {
          // Seleciona assentos dentro da box
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
          // Seleciona setores que intersectam a box
          const selectedSectorIdsList: string[] = [];
          sectors.forEach(sector => {
            if (!sector.visible || sector.locked) return;
            const bounds = getBoundsFromVertices(sector.vertices);
            // Verifica se o centro do setor está dentro da box
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            if (centerX >= minX && centerX <= maxX && 
                centerY >= minY && centerY <= maxY) {
              selectedSectorIdsList.push(sector.id);
            }
          });
          if (selectedSectorIdsList.length > 0) {
            // Seleciona todos os setores encontrados
            selectedSectorIdsList.forEach((id, index) => {
              onSelectSector(id, index > 0 || e.shiftKey);
            });
          }
        }
      } else {
        // Click simples no vazio - limpa toda a seleção
        if (!e.shiftKey) {
          onDeselectAll?.();
        }
      }
    }

    // Salva histórico se estava arrastando assento
    if (isDraggingSeat && onSeatMoveEnd) {
      onSeatMoveEnd();
    }

    // Salva histórico se estava arrastando vértice
    if (isDraggingVertex && onVertexMoveEnd) {
      onVertexMoveEnd();
      // Finaliza modo curvar após soltar
      if (isCurvingVertex) {
        setIsCurvingVertex(false);
        setCurvingVertexInfo(null);
      }
    }

    // Salva histórico se estava arrastando setor
    if (isDragging && onSectorMoveEnd) {
      onSectorMoveEnd();
    }

    // Finaliza rotação - apenas marca como finalizado para salvar no histórico
    if (isRotating && selectedSectorIds.length === 1 && onRotateSector) {
      const sector = sectors.find(s => s.id === selectedSectorIds[0]);
      if (sector) {
        onRotateSector(sector.id, sector.rotation || 0, true); // finalize = true para salvar histórico
      }
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
    setIsRotating(false);
  }, [isDrawing, isDraggingSeat, isDraggingVertex, activeTool, drawStart, drawCurrent, onCreateSector, isBoxSelecting, boxSelectStart, boxSelectCurrent, sectors, onSelectSeats, activeSeatType, onApplySeatType, onSeatMoveEnd, onVertexMoveEnd, isRotating, selectedSectorIds, onRotateSector]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-canvas-bg cursor-crosshair"
      style={{ cursor: isCurvingVertex ? 'crosshair' : activeTool === 'pan' ? 'grab' : isPanning ? 'grabbing' : isRotating ? 'grabbing' : isDraggingVertex ? 'move' : isDraggingElement ? 'move' : isDraggingSeat ? 'grabbing' : isResizingElement ? 'nwse-resize' : isBoxSelecting ? 'crosshair' : 'default' }}
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
        onDoubleClick={(e) => {
          // Duplo clique em label de fileira abre editor
          if (!onEditRow) return;
          const pos = screenToCanvas(e.clientX, e.clientY);
          
          for (const sector of sectors) {
            if (!sector.visible) continue;
            
            // Agrupa assentos por fileira
            const seatsByRow: Record<string, Seat[]> = {};
            sector.seats.forEach(seat => {
              if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
              seatsByRow[seat.row].push(seat);
            });
            
            // Verifica se clicou na área do label de alguma fileira
            const rowLabelPos = sector.rowLabelPosition || 'left';
            for (const [rowLabel, rowSeats] of Object.entries(seatsByRow)) {
              if (rowSeats.length === 0) continue;
              
              const sortedByX = [...rowSeats].sort((a, b) => a.x - b.x);
              const leftMost = sortedByX[0];
              const rightMost = sortedByX[sortedByX.length - 1];
              const seatSize = leftMost.tableConfig?.tableWidth || 14;
              
              // Área do label à esquerda
              if (rowLabelPos === 'left' || rowLabelPos === 'both') {
                const labelBounds = {
                  x: leftMost.x - 40,
                  y: leftMost.y - 5,
                  width: 35,
                  height: seatSize + 10
                };
                if (isPointInBounds(pos, labelBounds)) {
                  onEditRow(sector.id, rowLabel);
                  return;
                }
              }
              
              // Área do label à direita
              if (rowLabelPos === 'right' || rowLabelPos === 'both') {
                const labelBounds = {
                  x: rightMost.x + seatSize + 5,
                  y: rightMost.y - 5,
                  width: 35,
                  height: seatSize + 10
                };
                if (isPointInBounds(pos, labelBounds)) {
                  onEditRow(sector.id, rowLabel);
                  return;
                }
              }
            }
          }
        }}
      />
      
      {/* Hint overlay */}
      {selectedSeatIds.length === 0 && sectors.length > 0 && !isBoxSelecting && !selectedSectorIds.length && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-muted-foreground pointer-events-none">
          Arraste para selecionar setores • Ctrl+arraste para selecionar assentos • Ctrl+click para multi-seleção
        </div>
      )}
      
      {/* Vertex editing hint */}
      {selectedSectorIds.length === 1 && activeTool === 'select' && !contextMenu && !isCurvingVertex && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-primary-foreground pointer-events-none">
          Arraste os vértices para ajustar • Ctrl+botão direito para adicionar/remover/curvar pontos
        </div>
      )}

      {/* Curving vertex hint */}
      {isCurvingVertex && curvingVertexInfo && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-white pointer-events-none font-medium">
          🎯 Clique e arraste o ponto {curvingVertexInfo.vertexIndex + 1} para curvar • ESC para cancelar
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
          isVertexContext={contextMenu.vertexIndex !== null}
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
          onCurveVertex={() => {
            if (contextMenu.sectorId && contextMenu.vertexIndex !== null) {
              setIsCurvingVertex(true);
              setCurvingVertexInfo({ sectorId: contextMenu.sectorId, vertexIndex: contextMenu.vertexIndex });
              toast.info('Clique e arraste o ponto para curvar as arestas');
            }
          }}
          onDuplicate={onDuplicateSector}
          onDelete={onDeleteSector}
        />
      )}
      
      {/* Tooltip para assentos bloqueados */}
      {hoveredBlockedSeat && (
        <div 
          className="fixed z-50 bg-destructive text-destructive-foreground px-3 py-2 rounded-lg shadow-lg text-xs max-w-[200px] pointer-events-none"
          style={{
            left: hoveredBlockedSeat.screenX + 12,
            top: hoveredBlockedSeat.screenY + 12,
          }}
        >
          <div className="font-semibold flex items-center gap-1.5">
            🚫 Assento Bloqueado
          </div>
          <div className="text-destructive-foreground/90 mt-1">
            {hoveredBlockedSeat.seat.row}-{hoveredBlockedSeat.seat.number}
          </div>
          {hoveredBlockedSeat.seat.description && (
            <div className="text-destructive-foreground/80 mt-1 border-t border-destructive-foreground/20 pt-1">
              <strong>Motivo:</strong> {hoveredBlockedSeat.seat.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
