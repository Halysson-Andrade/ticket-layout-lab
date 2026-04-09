import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Sector, Seat, VenueElement, ToolType, SeatType, SEAT_COLORS, ELEMENT_ICONS, Vertex, TableConfig, GeometricShape, TextElement } from '@/types/mapStudio';
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
  onUpdateElement?: (id: string, updates: Partial<VenueElement>) => void;
  onUpdateSectorVertices: (id: string, vertices: Vertex[]) => void;
  onApplySeatType: (ids: string[], type: SeatType) => void;
  onMoveSeat: (seatId: string, sectorId: string, x: number, y: number) => void;
  onMoveSelectedSeats?: (dx: number, dy: number) => void;
  onSeatMoveEnd?: () => void;
  onSectorMoveEnd?: () => void;
  onElementMoveEnd?: () => void;
  onAddVertex?: (sectorId: string, edgeIndex: number, position: { x: number; y: number }) => void;
  onRemoveVertex?: (sectorId: string, vertexIndex: number) => void;
  onVertexMoveEnd?: () => void;
  onAddElementVertex?: (elementId: string, edgeIndex: number, position: { x: number; y: number }) => void;
  onRemoveElementVertex?: (elementId: string, vertexIndex: number) => void;
  onUpdateElementVertices?: (elementId: string, vertices: Vertex[]) => void;
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
  onDeleteShape?: (id: string) => void;
  onResizeShape?: (id: string, width: number, height: number, x: number, y: number) => void;
  onGroupShapesToSector?: (shapeIds: string[]) => void;
  onAddFurniture?: (sectorId: string, position: { x: number; y: number }, screenPosition: { x: number; y: number }) => void;
  onDeselectAll?: () => void;
  // Text elements
  textElements?: TextElement[];
  selectedTextIds?: string[];
  onCreateText?: (position: { x: number; y: number }) => void;
  onSelectText?: (id: string, additive: boolean) => void;
  onMoveText?: (id: string, dx: number, dy: number) => void;
  onDeleteText?: (id: string) => void;
  onUpdateText?: (id: string, updates: Partial<TextElement>) => void;
  autoEditTextId?: string | null;
  onAutoEditTextDone?: () => void;
  onGetTextScreenPos?: (id: string) => { x: number; y: number } | null;
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
  onUpdateElement,
  onUpdateSectorVertices,
  onApplySeatType,
  onMoveSeat,
  onMoveSelectedSeats,
  onSeatMoveEnd,
  onSectorMoveEnd,
  onElementMoveEnd,
  onAddVertex,
  onRemoveVertex,
  onVertexMoveEnd,
  onAddElementVertex,
  onRemoveElementVertex,
  onUpdateElementVertices,
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
  onResizeShape,
  onGroupShapesToSector,
  onAddFurniture,
  onDeselectAll,
  textElements = [],
  selectedTextIds = [],
  onCreateText,
  onSelectText,
  onMoveText,
  onDeleteText,
  onUpdateText,
  autoEditTextId,
  onAutoEditTextDone,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isDraggingSeat, setIsDraggingSeat] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [draggingSeatInfo, setDraggingSeatInfo] = useState<{ seatId: string; sectorId: string } | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const [activeVertexIndex, setActiveVertexIndex] = useState<number | null>(null);
  const [isResizingElement, setIsResizingElement] = useState(false);
  const [isResizingShape, setIsResizingShape] = useState(false);
  const [resizingShapeId, setResizingShapeId] = useState<string | null>(null);
  const [resizeCorner, setResizeCorner] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingStartAngle, setRotatingStartAngle] = useState(0);
  const [isCurvingVertex, setIsCurvingVertex] = useState(false);
  const [isRotatingElement, setIsRotatingElement] = useState(false);
  const [rotatingElementStartAngle, setRotatingElementStartAngle] = useState(0);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingElementLabel, setEditingElementLabel] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const editTextRef = useRef<HTMLTextAreaElement>(null);
  const [curvingVertexInfo, setCurvingVertexInfo] = useState<{ sectorId: string; vertexIndex: number } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragCenterRef = useRef<{ x: number; y: number } | null>(null);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [boxSelectStart, setBoxSelectStart] = useState({ x: 0, y: 0 });
  const [boxSelectCurrent, setBoxSelectCurrent] = useState({ x: 0, y: 0 });
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  // Auto-enter edit mode for newly created text
  React.useEffect(() => {
    if (autoEditTextId) {
      const te = textElements.find(t => t.id === autoEditTextId);
      if (te) {
        setEditingTextId(te.id);
        setEditingTextValue(te.text || '');
        onAutoEditTextDone?.();
        setTimeout(() => editTextRef.current?.focus(), 100);
      }
    }
  }, [autoEditTextId, textElements, onAutoEditTextDone]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    canvasPos: { x: number; y: number };
    edgeIndex: number | null;
    vertexIndex: number | null;
    sectorId: string | null;
    elementId: string | null;
  } | null>(null);

  // Track whether vertex drag is on a sector or element
  const [vertexDragTarget, setVertexDragTarget] = useState<{ type: 'sector' | 'element'; id: string } | null>(null);

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
  // SEMPRE usa sector.bounds como centro para garantir paridade com a renderização
  const transformPointForSector = useCallback((pos: { x: number; y: number }, sector: Sector): { x: number; y: number } => {
    if (!sector.rotation || sector.rotation === 0) {
      return pos;
    }
    const center = {
      x: sector.bounds.x + sector.bounds.width / 2,
      y: sector.bounds.y + sector.bounds.height / 2,
    };
    const rad = (-sector.rotation * Math.PI) / 180;
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    return {
      x: center.x + dx * Math.cos(rad) - dy * Math.sin(rad),
      y: center.y + dx * Math.sin(rad) + dy * Math.cos(rad),
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
      let angle: number;
      if (config.chairAngles && config.chairAngles.length === config.chairCount) {
        angle = (config.chairAngles[i] * Math.PI) / 180;
      } else {
        angle = startAngle + (i / config.chairCount) * Math.PI * 2 - Math.PI / 2;
      }
      
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

    // Desenha formas geométricas (backgrounds) - CAMADA MAIS BAIXA (só fill+stroke)
    geometricShapes.forEach(shape => {
      const bounds = getBoundsFromVertices(shape.vertices);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const isSelected = selectedShapeIds.includes(shape.id);
      
      ctx.save();
      
      if (shape.rotation && shape.rotation !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate((shape.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      
      if (shape.vertices && shape.vertices.length > 2) {
        ctx.beginPath();
        ctx.moveTo(shape.vertices[0].x, shape.vertices[0].y);
        for (let i = 1; i < shape.vertices.length; i++) {
          ctx.lineTo(shape.vertices[i].x, shape.vertices[i].y);
        }
        ctx.closePath();
        
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
        
        ctx.strokeStyle = isSelected ? '#3b82f6' : shape.color;
        ctx.lineWidth = isSelected ? 3 / zoom : 1.5 / zoom;
        ctx.stroke();
      }
      
      ctx.restore();
    });

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
      const elCenterX = el.bounds.x + el.bounds.width / 2;
      const elCenterY = el.bounds.y + el.bounds.height / 2;
      
      ctx.save();
      
      // Aplica rotação do elemento
      if (el.rotation && el.rotation !== 0) {
        ctx.translate(elCenterX, elCenterY);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-elCenterX, -elCenterY);
      }
      
      // Renderiza como polígono se tiver vértices, senão retângulo
      ctx.fillStyle = el.color || '#4a5568';
      if (el.vertices && el.vertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(el.vertices[0].x, el.vertices[0].y);
        for (let i = 0; i < el.vertices.length; i++) {
          const next = el.vertices[(i + 1) % el.vertices.length];
          const current = el.vertices[i];
          if (next.controlPoint) {
            ctx.quadraticCurveTo(next.controlPoint.x, next.controlPoint.y, next.x, next.y);
          } else {
            ctx.lineTo(next.x, next.y);
          }
        }
        ctx.closePath();
        ctx.fill();
        
        // Borda
        ctx.strokeStyle = isElSelected ? '#3b82f6' : 'rgba(0,0,0,0.3)';
        ctx.lineWidth = isElSelected ? 3 / zoom : 1 / zoom;
        if (isElSelected) ctx.setLineDash([6, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillRect(el.bounds.x, el.bounds.y, el.bounds.width, el.bounds.height);
        if (isElSelected) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3 / zoom;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(el.bounds.x - 2, el.bounds.y - 2, el.bounds.width + 4, el.bounds.height + 4);
          ctx.setLineDash([]);
        }
      }
      
      // Seleção: handles de vértice OU handles de canto
      if (isElSelected) {
        if (el.vertices && el.vertices.length >= 3) {
          // Desenha handles nos vértices (como setores)
          const handleSize = 8 / zoom;
          el.vertices.forEach((v, i) => {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(v.x - handleSize/2, v.y - handleSize/2, handleSize, handleSize);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1 / zoom;
            ctx.strokeRect(v.x - handleSize/2, v.y - handleSize/2, handleSize, handleSize);
            
            // Desenha control point se existir
            if (v.controlPoint) {
              ctx.beginPath();
              ctx.setLineDash([3, 3]);
              ctx.moveTo(v.x, v.y);
              ctx.lineTo(v.controlPoint.x, v.controlPoint.y);
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1 / zoom;
              ctx.stroke();
              ctx.setLineDash([]);
              
              ctx.beginPath();
              ctx.arc(v.controlPoint.x, v.controlPoint.y, 4 / zoom, 0, Math.PI * 2);
              ctx.fillStyle = '#f59e0b';
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1 / zoom;
              ctx.stroke();
            }
          });
        } else {
          // Fallback: handles de canto
          const handleSize = 8 / zoom;
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(el.bounds.x + el.bounds.width - handleSize/2, el.bounds.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(el.bounds.x - handleSize/2, el.bounds.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(el.bounds.x + el.bounds.width - handleSize/2, el.bounds.y + el.bounds.height - handleSize/2, handleSize, handleSize);
          ctx.fillRect(el.bounds.x - handleSize/2, el.bounds.y + el.bounds.height - handleSize/2, handleSize, handleSize);
        }
        
        // Handle de rotação
        const rotHandleDistance = 30 / zoom;
        const rotHandleRadius = 10 / zoom;
        const rotHandleX = el.bounds.x + el.bounds.width + rotHandleDistance;
        const rotHandleY = el.bounds.y - rotHandleDistance;
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(el.bounds.x + el.bounds.width, el.bounds.y);
        ctx.lineTo(rotHandleX, rotHandleY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(rotHandleX, rotHandleY, rotHandleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 / zoom;
        const arrowR = rotHandleRadius * 0.5;
        ctx.beginPath();
        ctx.arc(rotHandleX, rotHandleY, arrowR, -Math.PI * 0.8, Math.PI * 0.3);
        ctx.stroke();
        const tipAngle = Math.PI * 0.3;
        const tipX = rotHandleX + arrowR * Math.cos(tipAngle);
        const tipY = rotHandleY + arrowR * Math.sin(tipAngle);
        ctx.beginPath();
        ctx.moveTo(tipX - 3/zoom, tipY - 3/zoom);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tipX + 3/zoom, tipY - 1/zoom);
        ctx.stroke();
      }
      
      // Ícone e label dentro do elemento
      if (editingElementId !== el.id) {
        ctx.fillStyle = '#fff';
        const iconSize = Math.min(el.bounds.width, el.bounds.height) * 0.25;
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          ELEMENT_ICONS[el.type] || '📦',
          elCenterX,
          elCenterY - (el.label ? 8 : 0)
        );
        
        if (el.label) {
          ctx.font = `bold ${Math.min(12, el.bounds.width * 0.12)}px sans-serif`;
          ctx.fillText(el.label, elCenterX, elCenterY + iconSize * 0.6);
        }
      }
      
      ctx.restore();
    });

    // Setores e Assentos
    sectors.forEach(sector => {
      if (!sector.visible) return;

      ctx.save();
      
      const isSelected = selectedSectorIds.includes(sector.id);
      // Usa sector.bounds (estável durante arraste de vértices) para centro de rotação
      const bounds = sector.bounds;
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
        
        // Calcula tamanho de fonte proporcional ao tamanho do setor
        const minDim = Math.min(bounds.width, bounds.height);
        const baseFontSize = Math.max(8, Math.min(minDim * 0.18, 40));
        const smallFontSize = baseFontSize * 0.6;
        const tinyFontSize = baseFontSize * 0.5;
        const lineHeight = baseFontSize * 1.2;
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        
        // Resumo por tipo (exceto normal)
        const typeLabels: Record<string, string> = { pcd: 'PCD', vip: 'VIP', obeso: 'Obeso', companion: 'Acomp.', blocked: 'Bloq.' };
        const specialTypes = Object.entries(seatCounts)
          .filter(([type, count]) => type !== 'normal' && count > 0)
          .map(([type, count]) => `${count} ${typeLabels[type] || type}`)
          .join(' • ');
        
        const hasSpecial = specialTypes.length > 0;
        const totalLines = hasSpecial ? 3 : 2;
        const blockHeight = lineHeight * totalLines;
        const startY = centerY - blockHeight / 2 + lineHeight / 2;
        
        // Total de assentos (número grande)
        ctx.font = `bold ${baseFontSize}px sans-serif`;
        ctx.fillText(`${sector.seats.length}`, centerX, startY);
        
        // Label "assentos"
        ctx.font = `${smallFontSize}px sans-serif`;
        ctx.fillText('assentos', centerX, startY + lineHeight);
        
        // Tipos especiais
        if (hasSpecial) {
          ctx.font = `${tinyFontSize}px sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(specialTypes, centerX, startY + lineHeight * 2, bounds.width * 0.9);
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

      // Renderiza texto customizado do setor (sectorLabel)
      if (sector.sectorLabel) {
        const labelCenterX = bounds.x + bounds.width / 2;
        const labelCenterY = bounds.y + bounds.height / 2;
        const minDim = Math.min(bounds.width, bounds.height);
        const autoSize = Math.max(10, Math.min(minDim * 0.2, 60));
        const fontSize = sector.sectorLabelSize || autoSize;
        const direction = sector.sectorLabelDirection || 'horizontal';
        
        ctx.save();
        ctx.translate(labelCenterX, labelCenterY);
        
        // Aplica rotação do texto conforme direção
        if (direction === 'vertical') {
          ctx.rotate(-Math.PI / 2);
        } else if (direction === 'diagonal-up') {
          ctx.rotate(-Math.PI / 6);
        } else if (direction === 'diagonal-down') {
          ctx.rotate(Math.PI / 6);
        }
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(sector.sectorLabel, 0, 0, Math.max(bounds.width, bounds.height) * 0.9);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      ctx.restore();
    });



    // Desenha elementos de texto independentes
    textElements.forEach(te => {
      const isSelected = selectedTextIds.includes(te.id);
      // Don't render text being edited inline
      if (te.id === editingTextId) return;
      ctx.save();
      
      if (te.rotation && te.rotation !== 0) {
        ctx.translate(te.x, te.y);
        ctx.rotate((te.rotation * Math.PI) / 180);
        ctx.translate(-te.x, -te.y);
      }
      
      const displayText = te.text || 'Texto';
      ctx.fillStyle = te.text ? (te.color || '#ffffff') : 'rgba(255,255,255,0.3)';
      ctx.font = `${te.fontStyle || 'normal'} ${te.fontWeight || 'normal'} ${te.fontSize || 14}px ${te.fontFamily || 'sans-serif'}`;
      ctx.textAlign = (te.textAlign || 'left') as CanvasTextAlign;
      ctx.textBaseline = 'top';
      
      const lines = displayText.split('\n');
      const lineHeight = (te.fontSize || 14) * 1.3;
      
      lines.forEach((line, i) => {
        ctx.fillText(line, te.x, te.y + i * lineHeight);
        
        if (te.textDecoration === 'underline') {
          const metrics = ctx.measureText(line);
          let lx = te.x;
          if (te.textAlign === 'center') lx -= metrics.width / 2;
          else if (te.textAlign === 'right') lx -= metrics.width;
          ctx.beginPath();
          ctx.strokeStyle = te.color || '#ffffff';
          ctx.lineWidth = 1;
          ctx.moveTo(lx, te.y + i * lineHeight + (te.fontSize || 14));
          ctx.lineTo(lx + metrics.width, te.y + i * lineHeight + (te.fontSize || 14));
          ctx.stroke();
        }
      });
      
      // Selection box
      if (isSelected) {
        // Measure total width
        let maxWidth = 0;
        lines.forEach(line => {
          const m = ctx.measureText(line);
          if (m.width > maxWidth) maxWidth = m.width;
        });
        const totalHeight = lines.length * lineHeight;
        
        let boxX = te.x - 4;
        if (te.textAlign === 'center') boxX = te.x - maxWidth / 2 - 4;
        else if (te.textAlign === 'right') boxX = te.x - maxWidth - 4;
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([4 / zoom, 3 / zoom]);
        ctx.strokeRect(boxX, te.y - 4, maxWidth + 8, totalHeight + 8);
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    });

    // Desenha labels e handles das formas geométricas (ACIMA de tudo)
    geometricShapes.forEach(shape => {
      const isSelected = selectedShapeIds.includes(shape.id);
      const bounds = getBoundsFromVertices(shape.vertices);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      
      ctx.save();
      if (shape.rotation && shape.rotation !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate((shape.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      
      // Renderiza texto estilizado
      const tc = shape.textConfig;
      const displayText = tc?.text || shape.name;
      if (displayText) {
        const fontSize = tc?.fontSize || 13;
        const fontFamily = tc?.fontFamily || 'sans-serif';
        const fontWeight = tc?.fontWeight || 'bold';
        const fontStyle = tc?.fontStyle || 'normal';
        const textColor = tc?.color || '#fff';
        const textAlign = tc?.textAlign || 'center';
        
        ctx.fillStyle = textColor;
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = textAlign as CanvasTextAlign;
        ctx.textBaseline = 'middle';
        
        // Calcula posição X baseado no alinhamento
        let textX = centerX;
        if (textAlign === 'left') textX = bounds.x + 8;
        else if (textAlign === 'right') textX = bounds.x + bounds.width - 8;
        
        // Quebra de linhas
        const lines = displayText.split('\n');
        const lineHeight = fontSize * 1.3;
        const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
        
        lines.forEach((line, i) => {
          const y = startY + i * lineHeight;
          ctx.fillText(line, textX, y);
          
          // Underline
          if (tc?.textDecoration === 'underline') {
            const metrics = ctx.measureText(line);
            let lineStartX = textX;
            if (textAlign === 'center') lineStartX = textX - metrics.width / 2;
            else if (textAlign === 'right') lineStartX = textX - metrics.width;
            
            ctx.beginPath();
            ctx.strokeStyle = textColor;
            ctx.lineWidth = 1;
            ctx.moveTo(lineStartX, y + fontSize * 0.35);
            ctx.lineTo(lineStartX + metrics.width, y + fontSize * 0.35);
            ctx.stroke();
          }
        });
      }
      
      if (isSelected) {
        const handleSize = 8 / zoom;
        const corners = [
          { x: bounds.x, y: bounds.y },
          { x: bounds.x + bounds.width, y: bounds.y },
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
          { x: bounds.x, y: bounds.y + bounds.height },
        ];
        corners.forEach(c => {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2 / zoom;
          ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
        });
        const midpoints = [
          { x: bounds.x + bounds.width / 2, y: bounds.y },
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
          { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
          { x: bounds.x, y: bounds.y + bounds.height / 2 },
        ];
        midpoints.forEach(m => {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5 / zoom;
          ctx.beginPath();
          ctx.arc(m.x, m.y, handleSize / 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
      
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

  // Atualiza canvas - render direto para feedback imediato durante arraste de vértices
  useEffect(() => {
    const id = requestAnimationFrame(render);
    return () => cancelAnimationFrame(id);
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
            x: e.clientX, y: e.clientY, canvasPos: pos,
            edgeIndex: null, vertexIndex, sectorId, elementId: null,
          });
          return;
        }
        const edge = getEdgeAtPoint(pos, sector);
        if (edge) {
          setContextMenu({
            x: e.clientX, y: e.clientY, canvasPos: edge.point,
            edgeIndex: edge.edgeIndex, vertexIndex: null, sectorId, elementId: null,
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
          x: e.clientX, y: e.clientY, canvasPos: pos,
          edgeIndex: null, vertexIndex: null, sectorId, elementId: null,
        });
        return;
      }
    }

    // Verifica se clicou em vértice/aresta de elemento selecionado
    for (const elId of selectedElementIds) {
      const el = elements.find(e => e.id === elId);
      if (el && el.vertices && el.vertices.length >= 3) {
        // Check vertex
        const handleRadius = HANDLE_SIZE / zoom;
        for (let i = 0; i < el.vertices.length; i++) {
          const v = el.vertices[i];
          const dist = Math.sqrt(Math.pow(pos.x - v.x, 2) + Math.pow(pos.y - v.y, 2));
          if (dist <= handleRadius) {
            setContextMenu({
              x: e.clientX, y: e.clientY, canvasPos: pos,
              edgeIndex: null, vertexIndex: i, sectorId: null, elementId: elId,
            });
            return;
          }
        }
        // Check edge
        const threshold = 12 / zoom;
        for (let i = 0; i < el.vertices.length; i++) {
          const v1 = el.vertices[i];
          const v2 = el.vertices[(i + 1) % el.vertices.length];
          const dx = v2.x - v1.x;
          const dy = v2.y - v1.y;
          const lengthSquared = dx * dx + dy * dy;
          if (lengthSquared === 0) continue;
          const t = Math.max(0, Math.min(1, ((pos.x - v1.x) * dx + (pos.y - v1.y) * dy) / lengthSquared));
          const projX = v1.x + t * dx;
          const projY = v1.y + t * dy;
          const distSq = Math.pow(pos.x - projX, 2) + Math.pow(pos.y - projY, 2);
          if (distSq <= threshold * threshold) {
            setContextMenu({
              x: e.clientX, y: e.clientY, canvasPos: { x: projX, y: projY },
              edgeIndex: i, vertexIndex: null, sectorId: null, elementId: elId,
            });
            return;
          }
        }
        // Check inside element
        if (isPointInPolygon(pos, el.vertices)) {
          setContextMenu({
            x: e.clientX, y: e.clientY, canvasPos: pos,
            edgeIndex: null, vertexIndex: null, sectorId: null, elementId: elId,
          });
          return;
        }
      }
    }
    
    setContextMenu(null);
  }, [screenToCanvas, selectedSectorIds, selectedElementIds, sectors, elements, getVertexAtPoint, getEdgeAtPoint, isPointInSector, zoom]);

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
            // Transforma para espaço local do setor (desfaz rotação)
            const localPos = transformPointForSector(pos, sector);
            onAddFurniture?.(sector.id, { x: localPos.x, y: localPos.y }, { x: e.clientX, y: e.clientY });
            return;
          }
        }
      }
      toast.error('Clique dentro de um setor para adicionar mobília');
      return;
    }

    // Ferramenta de texto: clique no canvas cria texto
    if (activeTool === 'text') {
      onCreateText?.(pos);
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
            const bounds = getBoundsFromVertices(sector.vertices);
            dragCenterRef.current = {
              x: bounds.x + bounds.width / 2,
              y: bounds.y + bounds.height / 2,
            };
            setIsDraggingVertex(true);
            setActiveVertexIndex(vertexIndex);
            setVertexDragTarget({ type: 'sector', id: sectorId });
            setDragStart(pos);
            return;
          }
        }
      }

      // Verifica click em handle de rotação de elemento selecionado
      for (const elId of selectedElementIds) {
        const el = elements.find(e => e.id === elId);
        if (el) {
          const elCenterX = el.bounds.x + el.bounds.width / 2;
          const elCenterY = el.bounds.y + el.bounds.height / 2;
          const rotHandleDistance = 30 / zoom;
          const rotHandleRadius = 12 / zoom;
          
          // Posição do handle no espaço local
          const localHandleX = el.bounds.x + el.bounds.width + rotHandleDistance;
          const localHandleY = el.bounds.y - rotHandleDistance;
          
          // Transforma clique para espaço local do elemento
          const rotation = el.rotation || 0;
          const rad = (-rotation * Math.PI) / 180;
          const relX = pos.x - elCenterX;
          const relY = pos.y - elCenterY;
          const localClickX = elCenterX + relX * Math.cos(rad) - relY * Math.sin(rad);
          const localClickY = elCenterY + relX * Math.sin(rad) + relY * Math.cos(rad);
          
          const dist = Math.sqrt(Math.pow(localClickX - localHandleX, 2) + Math.pow(localClickY - localHandleY, 2));
          if (dist <= rotHandleRadius) {
            setIsRotatingElement(true);
            const startAngle = Math.atan2(pos.y - elCenterY, pos.x - elCenterX) * 180 / Math.PI;
            setRotatingElementStartAngle(startAngle - (el.rotation || 0));
            setDragStart({ x: elCenterX, y: elCenterY });
            return;
          }
        }
      }

      // Verifica click em vértice de elemento selecionado
      for (const elId of selectedElementIds) {
        const el = elements.find(e => e.id === elId);
        if (el && el.vertices && el.vertices.length >= 3) {
          const handleRadius = HANDLE_SIZE / zoom;
          for (let i = 0; i < el.vertices.length; i++) {
            const v = el.vertices[i];
            const dist = Math.sqrt(Math.pow(pos.x - v.x, 2) + Math.pow(pos.y - v.y, 2));
            if (dist <= handleRadius) {
              setIsDraggingVertex(true);
              setActiveVertexIndex(i);
              setVertexDragTarget({ type: 'element', id: elId });
              setDragStart(pos);
              return;
            }
          }
        }
      }

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

      // Verifica click em elemento (palco, bar, etc) - usa polígono se disponível
      for (const el of elements) {
        const hit = (el.vertices && el.vertices.length >= 3)
          ? isPointInPolygon(pos, el.vertices)
          : isPointInBounds(pos, el.bounds);
        if (hit) {
          onSelectElements([el.id], e.shiftKey);
          setIsDraggingElement(true);
          setDragStart(pos);
          return;
        }
      }

      // Modo de curvar vértice ativo: clique no vértice inicia arraste do control point
      if (isCurvingVertex && curvingVertexInfo) {
        // Check if it's a sector
        const sector = sectors.find(s => s.id === curvingVertexInfo.sectorId);
        if (sector) {
          const vertexIndex = getVertexAtPoint(pos, sector);
          if (vertexIndex === curvingVertexInfo.vertexIndex) {
            const bounds = getBoundsFromVertices(sector.vertices);
            dragCenterRef.current = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
            setIsDraggingVertex(true);
            setActiveVertexIndex(vertexIndex);
            setVertexDragTarget({ type: 'sector', id: sector.id });
            setDragStart(pos);
            return;
          }
        }
        // Check if it's an element
        const el = elements.find(e => e.id === curvingVertexInfo.sectorId);
        if (el && el.vertices) {
          const handleRadius = HANDLE_SIZE / zoom;
          for (let i = 0; i < el.vertices.length; i++) {
            const v = el.vertices[i];
            const dist = Math.sqrt(Math.pow(pos.x - v.x, 2) + Math.pow(pos.y - v.y, 2));
            if (dist <= handleRadius && i === curvingVertexInfo.vertexIndex) {
              setIsDraggingVertex(true);
              setActiveVertexIndex(i);
              setVertexDragTarget({ type: 'element', id: el.id });
              setDragStart(pos);
              return;
            }
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
        // Transforma o clique para o espaço local do setor (desfaz rotação)
        const localPos = transformPointForSector(pos, sector);
        for (const seat of sector.seats) {
          let hitDetected = false;
          
          if (seat.furnitureType === 'table' || seat.furnitureType === 'bistro') {
            const config = seat.tableConfig || { shape: 'round', chairCount: 4, tableWidth: 40, tableHeight: 40, chairStartAngle: 0 };
            const chairRadius = 6;
            const extraRadius = chairRadius + 4;
            const expandedBounds = {
              x: seat.x - extraRadius,
              y: seat.y - extraRadius,
              width: config.tableWidth + extraRadius * 2,
              height: config.tableHeight + extraRadius * 2,
            };
            hitDetected = isPointInBounds(localPos, expandedBounds);
          } else {
            const seatW = 14;
            const seatH = 14;
            const seatBounds = { x: seat.x, y: seat.y, width: seatW, height: seatH };
            hitDetected = isPointInBounds(localPos, seatBounds);
          }
          
          if (hitDetected) {
            if (!selectedSeatIds.includes(seat.id)) {
              onSelectSeats([seat.id], e.ctrlKey || e.metaKey);
              if (activeSeatType !== 'normal') {
                onApplySeatType([seat.id], activeSeatType);
              }
            }
            setIsDraggingSeat(true);
            setDraggingSeatInfo({ seatId: seat.id, sectorId: sector.id });
            setDragStart(pos);
            return;
          }
        }
      }

      // Verifica click em handles de resize de forma geométrica
      for (const shape of geometricShapes) {
        if (!selectedShapeIds.includes(shape.id)) continue;
        const sBounds = getBoundsFromVertices(shape.vertices);
        const handleSize = 12 / zoom;
        const corners: Array<{ x: number; y: number; corner: 'nw' | 'ne' | 'se' | 'sw' }> = [
          { x: sBounds.x, y: sBounds.y, corner: 'nw' },
          { x: sBounds.x + sBounds.width, y: sBounds.y, corner: 'ne' },
          { x: sBounds.x + sBounds.width, y: sBounds.y + sBounds.height, corner: 'se' },
          { x: sBounds.x, y: sBounds.y + sBounds.height, corner: 'sw' },
        ];
        for (const c of corners) {
          if (Math.abs(pos.x - c.x) < handleSize && Math.abs(pos.y - c.y) < handleSize) {
            setIsResizingShape(true);
            setResizingShapeId(shape.id);
            setResizeCorner(c.corner);
            setDragStart(pos);
            return;
          }
        }
      }

      // Verifica click em texto
      for (const te of textElements) {
        // Measure text bounds
        const canvas = canvasRef.current;
        if (canvas) {
          const tCtx = canvas.getContext('2d');
          if (tCtx) {
            tCtx.font = `${te.fontStyle || 'normal'} ${te.fontWeight || 'normal'} ${te.fontSize || 14}px ${te.fontFamily || 'sans-serif'}`;
            const lines = (te.text || 'Texto').split('\n');
            const minClickW = Math.max(40 / zoom, 0);
            let maxW = 0;
            lines.forEach(l => { const m = tCtx.measureText(l); if (m.width > maxW) maxW = m.width; });
            const clickW = Math.max(maxW, minClickW);
            const totalH = Math.max(lines.length * (te.fontSize || 14) * 1.3, (te.fontSize || 14) * 1.5);
            let bx = te.x;
            if (te.textAlign === 'center') bx -= maxW / 2;
            else if (te.textAlign === 'right') bx -= maxW;
            
            if (pos.x >= bx - 4 && pos.x <= bx + clickW + 4 && pos.y >= te.y - 4 && pos.y <= te.y + totalH + 4) {
              onSelectText?.(te.id, e.shiftKey);
              setIsDraggingText(true);
              setDragStart(pos);
              return;
            }
          }
        }
      }

      // Formas geométricas: se já selecionada, permite arrastar com clique simples
      for (const shape of geometricShapes) {
        if (shape.vertices && shape.vertices.length > 2) {
          if (isPointInPolygon(pos, shape.vertices) && selectedShapeIds.includes(shape.id)) {
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

    // Rotação de elemento via handle
    if (isRotatingElement && selectedElementIds.length === 1 && onUpdateElement) {
      const el = elements.find(e => e.id === selectedElementIds[0]);
      if (el) {
        const elCenterX = el.bounds.x + el.bounds.width / 2;
        const elCenterY = el.bounds.y + el.bounds.height / 2;
        const currentAngle = Math.atan2(pos.y - elCenterY, pos.x - elCenterX) * 180 / Math.PI;
        let newRotation = currentAngle - rotatingElementStartAngle;
        newRotation = ((newRotation % 360) + 360) % 360;
        onUpdateElement(el.id, { rotation: Math.round(newRotation) });
      }
      return;
    }

    if (isDraggingVertex && activeVertexIndex !== null) {
      // Element vertex drag
      if (vertexDragTarget?.type === 'element' && onUpdateElementVertices) {
        const el = elements.find(e => e.id === vertexDragTarget.id);
        if (el && el.vertices) {
          const newVertices = [...el.vertices];
          if (isCurvingVertex && curvingVertexInfo) {
            const vi = activeVertexIndex;
            const prevIndex = (vi - 1 + newVertices.length) % newVertices.length;
            const prevVertex = newVertices[prevIndex];
            const currentVertex = newVertices[vi];
            const midX = (prevVertex.x + currentVertex.x) / 2;
            const midY = (prevVertex.y + currentVertex.y) / 2;
            const offsetX = pos.x - currentVertex.x;
            const offsetY = pos.y - currentVertex.y;
            newVertices[vi] = { ...newVertices[vi], controlPoint: { x: midX + offsetX, y: midY + offsetY } };
          } else {
            newVertices[activeVertexIndex] = { x: pos.x, y: pos.y, controlPoint: el.vertices[activeVertexIndex].controlPoint };
          }
          onUpdateElementVertices(el.id, newVertices);
        }
        return;
      }

      // Sector vertex drag
      if (vertexDragTarget?.type === 'sector' || selectedSectorIds.length === 1) {
        const sectorId = vertexDragTarget?.id || selectedSectorIds[0];
        const sector = sectors.find(s => s.id === sectorId);
        if (sector && sector.vertices) {
          const newVertices = [...sector.vertices];
          let transformedPos: { x: number; y: number };
          const rotation = sector.rotation || 0;
          if (rotation !== 0 && dragCenterRef.current) {
            const center = dragCenterRef.current;
            const rad = (-rotation * Math.PI) / 180;
            const dx = pos.x - center.x;
            const dy = pos.y - center.y;
            transformedPos = {
              x: center.x + dx * Math.cos(rad) - dy * Math.sin(rad),
              y: center.y + dx * Math.sin(rad) + dy * Math.cos(rad),
            };
          } else {
            transformedPos = transformPointForSector(pos, sector);
          }
          
          if (isCurvingVertex && curvingVertexInfo) {
            const vertexIndex = activeVertexIndex;
            const prevIndex = (vertexIndex - 1 + newVertices.length) % newVertices.length;
            const prevVertex = newVertices[prevIndex];
            const currentVertex = newVertices[vertexIndex];
            const midX = (prevVertex.x + currentVertex.x) / 2;
            const midY = (prevVertex.y + currentVertex.y) / 2;
            const offsetX = transformedPos.x - currentVertex.x;
            const offsetY = transformedPos.y - currentVertex.y;
            newVertices[activeVertexIndex] = {
              ...newVertices[activeVertexIndex],
              controlPoint: { x: midX + offsetX, y: midY + offsetY },
            };
          } else {
            const oldVertex = sector.vertices[activeVertexIndex];
            const dx = transformedPos.x - oldVertex.x;
            const dy = transformedPos.y - oldVertex.y;
            newVertices[activeVertexIndex] = { 
              x: oldVertex.x + dx, 
              y: oldVertex.y + dy,
              controlPoint: oldVertex.controlPoint,
            };
          }
          
          onUpdateSectorVertices(sector.id, newVertices);
        }
        return;
      }
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
      const sector = sectors.find(s => s.id === draggingSeatInfo.sectorId);
      
      // Transforma posições para espaço local do setor
      const localPos = sector ? transformPointForSector(pos, sector) : pos;
      const localDragStart = sector ? transformPointForSector(dragStart, sector) : dragStart;
      const dx = localPos.x - localDragStart.x;
      const dy = localPos.y - localDragStart.y;
      
      // Move todos os assentos selecionados
      if (selectedSeatIds.length > 1 && onMoveSelectedSeats) {
        onMoveSelectedSeats(dx, dy);
      } else {
        // Move apenas o assento arrastado
        if (sector) {
          onMoveSeat(draggingSeatInfo.seatId, draggingSeatInfo.sectorId, localPos.x - 7, localPos.y - 7);
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

    // Resize de formas geométricas
    if (isResizingShape && resizingShapeId && resizeCorner && onResizeShape) {
      const shape = geometricShapes.find(s => s.id === resizingShapeId);
      if (shape) {
        const sBounds = getBoundsFromVertices(shape.vertices);
        let newX = sBounds.x;
        let newY = sBounds.y;
        let newW = sBounds.width;
        let newH = sBounds.height;

        if (resizeCorner === 'se') {
          newW = Math.max(30, pos.x - sBounds.x);
          newH = Math.max(30, pos.y - sBounds.y);
        } else if (resizeCorner === 'ne') {
          newW = Math.max(30, pos.x - sBounds.x);
          const pH = Math.max(30, sBounds.y + sBounds.height - pos.y);
          newY = sBounds.y + sBounds.height - pH;
          newH = pH;
        } else if (resizeCorner === 'sw') {
          const pW = Math.max(30, sBounds.x + sBounds.width - pos.x);
          newX = sBounds.x + sBounds.width - pW;
          newW = pW;
          newH = Math.max(30, pos.y - sBounds.y);
        } else if (resizeCorner === 'nw') {
          const pW = Math.max(30, sBounds.x + sBounds.width - pos.x);
          const pH = Math.max(30, sBounds.y + sBounds.height - pos.y);
          newX = sBounds.x + sBounds.width - pW;
          newY = sBounds.y + sBounds.height - pH;
          newW = pW;
          newH = pH;
        }

        onResizeShape(resizingShapeId, newW, newH, newX, newY);
      }
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

    // Arrastar textos
    if (isDraggingText && selectedTextIds.length > 0 && onMoveText) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      selectedTextIds.forEach(id => onMoveText(id, dx, dy));
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

    // Salva histórico se estava arrastando elemento
    if (isDraggingElement && onElementMoveEnd) {
      onElementMoveEnd();
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
    setIsDraggingText(false);
    setDraggingSeatInfo(null);
    setIsBoxSelecting(false);
    setIsDraggingVertex(false);
    setVertexDragTarget(null);
    dragCenterRef.current = null;
    setActiveVertexIndex(null);
    setIsResizingElement(false);
    setIsResizingShape(false);
    setResizingShapeId(null);
    setResizeCorner(null);
    setIsRotating(false);
    setIsRotatingElement(false);
  }, [isDrawing, isDraggingSeat, isDraggingElement, isDraggingVertex, activeTool, drawStart, drawCurrent, onCreateSector, isBoxSelecting, boxSelectStart, boxSelectCurrent, sectors, onSelectSeats, activeSeatType, onApplySeatType, onSeatMoveEnd, onVertexMoveEnd, onElementMoveEnd, isRotating, isRotatingElement, selectedSectorIds, selectedElementIds, onRotateSector]);

  // Window-level mouse events for drag operations (prevents losing events when mouse goes over overlays)
  const isDraggingAny = isDragging || isDraggingShape || isDraggingElement || isDraggingSeat || isDraggingText || isDraggingVertex || isResizingElement || isResizingShape || isRotating || isRotatingElement || isPanning || isBoxSelecting;
  
  useEffect(() => {
    if (!isDraggingAny) return;
    const onWindowMouseMove = (e: MouseEvent) => {
      handleMouseMove({ clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, button: e.button, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() } as any);
    };
    const onWindowMouseUp = (e: MouseEvent) => {
      handleMouseUp({ clientX: e.clientX, clientY: e.clientY, button: e.button, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() } as any);
    };
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isDraggingAny, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-canvas-bg cursor-crosshair"
      style={{ cursor: isCurvingVertex ? 'crosshair' : activeTool === 'pan' ? 'grab' : isPanning ? 'grabbing' : isRotating || isRotatingElement ? 'grabbing' : isDraggingVertex ? 'move' : isDraggingElement ? 'move' : isDraggingSeat ? 'grabbing' : isResizingElement || isResizingShape ? 'nwse-resize' : isBoxSelecting ? 'crosshair' : 'default' }}
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
          const pos = screenToCanvas(e.clientX, e.clientY);
          
          // Duplo clique em texto - edita inline
          for (const te of textElements) {
            const canvas = canvasRef.current;
            if (canvas) {
              const tCtx = canvas.getContext('2d');
              if (tCtx) {
                tCtx.font = `${te.fontStyle || 'normal'} ${te.fontWeight || 'normal'} ${te.fontSize || 14}px ${te.fontFamily || 'sans-serif'}`;
                const lines = (te.text || 'Texto').split('\n');
                let maxW = 0;
                lines.forEach(l => { const m = tCtx.measureText(l); if (m.width > maxW) maxW = m.width; });
                const totalH = lines.length * (te.fontSize || 14) * 1.3;
                let bx = te.x;
                if (te.textAlign === 'center') bx -= maxW / 2;
                else if (te.textAlign === 'right') bx -= maxW;
                
                if (pos.x >= bx - 4 && pos.x <= bx + maxW + 4 && pos.y >= te.y - 4 && pos.y <= te.y + totalH + 4) {
                  setEditingTextId(te.id);
                  setEditingTextValue(te.text || 'Texto');
                  onSelectText?.(te.id, false);
                  setTimeout(() => {
                    editTextRef.current?.focus();
                    editTextRef.current?.select();
                  }, 50);
                  return;
                }
              }
            }
          }
          
          // Duplo clique em elemento - edita label inline
          for (const el of elements) {
            if (isPointInBounds(pos, el.bounds)) {
              setEditingElementId(el.id);
              setEditingElementLabel(el.label);
              setTimeout(() => editInputRef.current?.focus(), 50);
              return;
            }
          }
          
          // Duplo clique em forma geométrica (background) - seleciona
          for (const shape of geometricShapes) {
            if (shape.vertices && shape.vertices.length > 2) {
              if (isPointInPolygon(pos, shape.vertices)) {
                onSelectShape?.(shape.id, e.shiftKey);
                return;
              }
            }
          }
          
          // Duplo clique em label de fileira abre editor
          if (!onEditRow) return;
          
          for (const sector of sectors) {
            if (!sector.visible) continue;
            
            const seatsByRow: Record<string, Seat[]> = {};
            sector.seats.forEach(seat => {
              if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
              seatsByRow[seat.row].push(seat);
            });
            
            const rowLabelPos = sector.rowLabelPosition || 'left';
            for (const [rowLabel, rowSeats] of Object.entries(seatsByRow)) {
              if (rowSeats.length === 0) continue;
              
              const sortedByX = [...rowSeats].sort((a, b) => a.x - b.x);
              const leftMost = sortedByX[0];
              const rightMost = sortedByX[sortedByX.length - 1];
              const seatSize = leftMost.tableConfig?.tableWidth || 14;
              
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
      {(selectedSectorIds.length === 1 || selectedElementIds.length === 1) && activeTool === 'select' && !contextMenu && !isCurvingVertex && (
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
      {selectedElementIds.length === 1 && !editingElementId && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-accent/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-accent-foreground pointer-events-none">
          Arraste os cantos para redimensionar • Handle para rotacionar • Duplo clique para editar texto
        </div>
      )}
      
      {/* Inline element label editor */}
      {editingElementId && (() => {
        const el = elements.find(e => e.id === editingElementId);
        if (!el) return null;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const screenX = el.bounds.x * zoom + pan.x + rect.left;
        const screenY = el.bounds.y * zoom + pan.y + rect.top;
        const screenW = el.bounds.width * zoom;
        const screenH = el.bounds.height * zoom;
        return (
          <div
            className="fixed z-50 flex items-center justify-center"
            style={{
              left: screenX,
              top: screenY,
              width: screenW,
              height: screenH,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              transformOrigin: 'center center',
            }}
          >
            <input
              ref={editInputRef}
              className="bg-background/90 border border-primary rounded px-2 py-1 text-sm text-foreground text-center outline-none focus:ring-2 focus:ring-primary"
              style={{ maxWidth: screenW - 8 }}
              value={editingElementLabel}
              onChange={(e) => setEditingElementLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateElement?.(editingElementId!, { label: editingElementLabel });
                  setEditingElementId(null);
                } else if (e.key === 'Escape') {
                  setEditingElementId(null);
                }
              }}
              onBlur={() => {
                onUpdateElement?.(editingElementId!, { label: editingElementLabel });
                setEditingElementId(null);
              }}
            />
          </div>
        );
      })()}

      {/* Inline text editing overlay */}
      {editingTextId && (() => {
        const te = textElements.find(t => t.id === editingTextId);
        if (!te) return null;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const screenX = te.x * zoom + pan.x + rect.left;
        const screenY = te.y * zoom + pan.y + rect.top;
        const scaledFontSize = (te.fontSize || 14) * zoom;
        return (
          <textarea
            ref={editTextRef}
            className="fixed z-[60] bg-transparent border-2 border-primary rounded outline-none resize-none"
            style={{
              left: screenX - 4,
              top: screenY - 4,
              minWidth: Math.max(100, 200 * zoom),
              minHeight: scaledFontSize * 1.5 + 8,
              fontFamily: te.fontFamily || 'sans-serif',
              fontSize: `${scaledFontSize}px`,
              fontWeight: te.fontWeight || 'normal',
              fontStyle: te.fontStyle || 'normal',
              textAlign: (te.textAlign || 'left') as any,
              color: te.color || '#ffffff',
              textDecoration: te.textDecoration === 'underline' ? 'underline' : 'none',
              lineHeight: 1.3,
              padding: '2px 4px',
            }}
            value={editingTextValue}
            onChange={(e) => setEditingTextValue(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                onUpdateText?.(editingTextId, { text: editingTextValue });
                setEditingTextId(null);
              }
              // Enter sem shift = confirma, com shift = nova linha
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onUpdateText?.(editingTextId, { text: editingTextValue });
                setEditingTextId(null);
              }
            }}
            onBlur={() => {
              onUpdateText?.(editingTextId!, { text: editingTextValue });
              setEditingTextId(null);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        );
      })()}
      
      {/* Context menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          showVertexOptions={contextMenu.edgeIndex !== null || contextMenu.vertexIndex !== null}
          showElementOptions={
            (contextMenu.sectorId !== null || contextMenu.elementId !== null) && 
            contextMenu.edgeIndex === null && contextMenu.vertexIndex === null
          }
          isVertexContext={contextMenu.vertexIndex !== null}
          canRemoveVertex={contextMenu.vertexIndex !== null && (() => {
            if (contextMenu.sectorId) {
              const sector = sectors.find(s => s.id === contextMenu.sectorId);
              return sector ? sector.vertices.length > 3 : false;
            }
            if (contextMenu.elementId) {
              const el = elements.find(e => e.id === contextMenu.elementId);
              return el?.vertices ? el.vertices.length > 3 : false;
            }
            return false;
          })()}
          onAddVertex={() => {
            if (contextMenu.sectorId && contextMenu.edgeIndex !== null) {
              onAddVertex?.(contextMenu.sectorId, contextMenu.edgeIndex, contextMenu.canvasPos);
            }
            if (contextMenu.elementId && contextMenu.edgeIndex !== null) {
              onAddElementVertex?.(contextMenu.elementId, contextMenu.edgeIndex, contextMenu.canvasPos);
            }
          }}
          onRemoveVertex={() => {
            if (contextMenu.sectorId && contextMenu.vertexIndex !== null) {
              onRemoveVertex?.(contextMenu.sectorId, contextMenu.vertexIndex);
            }
            if (contextMenu.elementId && contextMenu.vertexIndex !== null) {
              onRemoveElementVertex?.(contextMenu.elementId, contextMenu.vertexIndex);
            }
          }}
          onCurveVertex={() => {
            if (contextMenu.sectorId && contextMenu.vertexIndex !== null) {
              setIsCurvingVertex(true);
              setCurvingVertexInfo({ sectorId: contextMenu.sectorId, vertexIndex: contextMenu.vertexIndex });
              toast.info('Clique e arraste o ponto para curvar as arestas');
            }
            if (contextMenu.elementId && contextMenu.vertexIndex !== null) {
              setIsCurvingVertex(true);
              setCurvingVertexInfo({ sectorId: contextMenu.elementId, vertexIndex: contextMenu.vertexIndex });
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
