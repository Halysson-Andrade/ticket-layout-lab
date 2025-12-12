import { Seat, GridGeneratorParams, RowLabelType, SeatLabelType, SEAT_COLORS, Vertex, SectorShape, Bounds, FurnitureType, TableConfig, TableShape } from '@/types/mapStudio';

// Gera ID único
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// Gera vértices baseado na forma
export function generateVerticesForShape(shape: SectorShape, bounds: Bounds): Vertex[] {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;
  
  switch (shape) {
    case 'rectangle':
      return [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      
    case 'parallelogram':
      const skew = width * 0.2;
      return [
        { x: x + skew, y },
        { x: x + width, y },
        { x: x + width - skew, y: y + height },
        { x, y: y + height },
      ];
      
    case 'trapezoid':
      const inset = width * 0.15;
      return [
        { x: x + inset, y },
        { x: x + width - inset, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      
    case 'pentagon':
      const r = Math.min(width, height) / 2;
      return Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
      
    case 'hexagon':
      const hr = Math.min(width, height) / 2;
      return Array.from({ length: 6 }, (_, i) => {
        const angle = (i * Math.PI / 3) - Math.PI / 2;
        return { x: cx + hr * Math.cos(angle), y: cy + hr * Math.sin(angle) };
      });
      
    case 'octagon':
      const or = Math.min(width, height) / 2;
      return Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI / 4) - Math.PI / 8;
        return { x: cx + or * Math.cos(angle), y: cy + or * Math.sin(angle) };
      });
      
    case 'triangle':
      return [
        { x: x + width / 2, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      
    case 'diamond':
      return [
        { x: cx, y },
        { x: x + width, y: cy },
        { x: cx, y: y + height },
        { x, y: cy },
      ];
      
    case 'star':
      const outerR = Math.min(width, height) / 2;
      const innerR = outerR * 0.4;
      return Array.from({ length: 10 }, (_, i) => {
        const angle = (i * Math.PI / 5) - Math.PI / 2;
        const radius = i % 2 === 0 ? outerR : innerR;
        return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
      });
      
    case 'l-shape':
      const lw = width * 0.4;
      const lh = height * 0.4;
      return [
        { x, y },
        { x: x + lw, y },
        { x: x + lw, y: y + height - lh },
        { x: x + width, y: y + height - lh },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      
    case 'u-shape':
      const uw = width * 0.3;
      const uh = height * 0.5;
      return [
        { x, y },
        { x: x + uw, y },
        { x: x + uw, y: y + uh },
        { x: x + width - uw, y: y + uh },
        { x: x + width - uw, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      
    case 't-shape':
      const tw = width * 0.3;
      const th = height * 0.35;
      return [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + th },
        { x: cx + tw, y: y + th },
        { x: cx + tw, y: y + height },
        { x: cx - tw, y: y + height },
        { x: cx - tw, y: y + th },
        { x, y: y + th },
      ];
      
    case 'z-shape':
      const zw = width * 0.35;
      const zh = height * 0.35;
      return [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + zh },
        { x: x + zw, y: y + zh },
        { x: x + zw, y: y + height - zh },
        { x: x + width, y: y + height - zh },
        { x: x + width, y: y + height },
        { x, y: y + height },
        { x, y: y + height - zh },
        { x: x + width - zw, y: y + height - zh },
        { x: x + width - zw, y: y + zh },
        { x, y: y + zh },
      ];
      
    case 'cross':
      const cw = width * 0.3;
      const ch = height * 0.3;
      return [
        { x: cx - cw, y },
        { x: cx + cw, y },
        { x: cx + cw, y: cy - ch },
        { x: x + width, y: cy - ch },
        { x: x + width, y: cy + ch },
        { x: cx + cw, y: cy + ch },
        { x: cx + cw, y: y + height },
        { x: cx - cw, y: y + height },
        { x: cx - cw, y: cy + ch },
        { x, y: cy + ch },
        { x, y: cy - ch },
        { x: cx - cw, y: cy - ch },
      ];
      
    case 'arrow':
      const aw = width * 0.25;
      const ah = height * 0.4;
      return [
        { x: cx, y },
        { x: x + width, y: y + ah },
        { x: cx + aw, y: y + ah },
        { x: cx + aw, y: y + height },
        { x: cx - aw, y: y + height },
        { x: cx - aw, y: y + ah },
        { x, y: y + ah },
      ];
      
    case 'wave':
      const segments = 12;
      const waveHeight = height * 0.15;
      const vertices: Vertex[] = [];
      // Top wave
      for (let i = 0; i <= segments; i++) {
        const px = x + (width * i / segments);
        const py = y + Math.sin(i * Math.PI) * waveHeight;
        vertices.push({ x: px, y: py });
      }
      // Bottom wave (reversed)
      for (let i = segments; i >= 0; i--) {
        const px = x + (width * i / segments);
        const py = y + height - Math.sin(i * Math.PI) * waveHeight;
        vertices.push({ x: px, y: py });
      }
      return vertices;
      
    case 'arc':
      // Arco com raio interno e externo (meia-lua)
      const arcOuter = Math.min(width, height) / 2;
      const arcInner = arcOuter * 0.4; // 40% do raio externo
      const arcPoints = 12;
      const arcVertices: Vertex[] = [];
      
      // Arco externo (de esquerda para direita, semicírculo superior)
      for (let i = 0; i <= arcPoints; i++) {
        const angle = Math.PI + (i * Math.PI / arcPoints); // 180° to 360°
        arcVertices.push({
          x: cx + arcOuter * Math.cos(angle),
          y: cy + arcOuter * Math.sin(angle) * (height / width) // Ajusta para proporção
        });
      }
      
      // Arco interno (de direita para esquerda)
      for (let i = arcPoints; i >= 0; i--) {
        const angle = Math.PI + (i * Math.PI / arcPoints);
        arcVertices.push({
          x: cx + arcInner * Math.cos(angle),
          y: cy + arcInner * Math.sin(angle) * (height / width)
        });
      }
      
      return arcVertices;
      
    case 'circle':
      const rx = width / 2;
      const ry = height / 2;
      return Array.from({ length: 16 }, (_, i) => {
        const angle = (i * 2 * Math.PI / 16);
        return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
      });
      
    default:
      return [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
  }
}

// Gera vértices considerando curvatura - transforma formas em arco
export function generateVerticesWithCurvature(
  shape: SectorShape,
  bounds: Bounds,
  curvature: number = 0
): Vertex[] {
  // Se curvatura alta ou forma é arco, gera vértices de arco
  if (shape === 'arc' || curvature >= 80) {
    return generateArcVertices(bounds, 100);
  }
  
  // Se curvatura moderada (40-79), gera arco parcial
  if (curvature >= 40) {
    return generateArcVertices(bounds, curvature);
  }
  
  // Curvatura baixa - usa forma original com vértices curvados
  if (curvature > 0) {
    const baseVertices = generateVerticesForShape(shape, bounds);
    return applyCurvatureToVertices(baseVertices, bounds, curvature);
  }
  
  // Sem curvatura - forma original
  return generateVerticesForShape(shape, bounds);
}

// Gera vértices de arco baseado no nível de curvatura - usa largura e altura completas
function generateArcVertices(bounds: Bounds, curvature: number): Vertex[] {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height; // Centro na base para arco voltado para cima
  
  const arcPoints = 20;
  const vertices: Vertex[] = [];
  
  // Usa dimensões completas do bounds
  const outerRx = width / 2; // Raio X externo = metade da largura
  const outerRy = height; // Raio Y externo = altura completa
  
  const innerRatio = curvature >= 80 ? 0.35 : Math.max(0.25, 0.6 - curvature / 150);
  const innerRx = outerRx * innerRatio;
  const innerRy = outerRy * innerRatio;
  
  // Ângulo do arco baseado na curvatura
  const angleSpread = curvature >= 80 
    ? Math.PI  // 180° para arco completo
    : Math.PI * (0.5 + (curvature - 40) / 80);
  
  const startAngle = Math.PI + (Math.PI - angleSpread) / 2;
  const endAngle = startAngle + angleSpread;
  
  // Arco externo (de esquerda para direita)
  for (let i = 0; i <= arcPoints; i++) {
    const angle = startAngle + (i * (endAngle - startAngle) / arcPoints);
    vertices.push({
      x: cx + outerRx * Math.cos(angle),
      y: cy + outerRy * Math.sin(angle)
    });
  }
  
  // Arco interno (de direita para esquerda)
  for (let i = arcPoints; i >= 0; i--) {
    const angle = startAngle + (i * (endAngle - startAngle) / arcPoints);
    vertices.push({
      x: cx + innerRx * Math.cos(angle),
      y: cy + innerRy * Math.sin(angle)
    });
  }
  
  return vertices;
}

// Aplica curvatura aos vértices existentes - proporcional às dimensões
function applyCurvatureToVertices(vertices: Vertex[], bounds: Bounds, curvature: number): Vertex[] {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height;
  const curvedVertices: Vertex[] = [];
  const numPointsPerEdge = 4;
  
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    
    for (let j = 0; j < numPointsPerEdge; j++) {
      const t = j / numPointsPerEdge;
      const px = current.x + (next.x - current.x) * t;
      const py = current.y + (next.y - current.y) * t;
      
      // Normaliza posição X relativa ao centro
      const normalizedX = (px - cx) / (bounds.width / 2);
      
      // Curvatura proporcional à altura e posição
      const curveFactor = (curvature / 100) * bounds.height * 0.3;
      const curveOffset = (1 - normalizedX * normalizedX) * curveFactor;
      
      // Aplica curvatura mais forte no topo
      const normalizedY = (py - bounds.y) / bounds.height;
      const yFactor = 1 - normalizedY;
      
      curvedVertices.push({
        x: px,
        y: py - curveOffset * yFactor
      });
    }
  }
  
  return curvedVertices;
}

// Calcula bounds a partir de vértices
export function getBoundsFromVertices(vertices: Vertex[]): Bounds {
  if (vertices.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Verifica se ponto está dentro de polígono
export function isPointInPolygon(point: { x: number; y: number }, vertices: Vertex[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Verifica se ponto está dentro de um arco (forma especial)
export function isPointInArc(point: { x: number; y: number }, bounds: Bounds): boolean {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  
  // Normaliza para elipse
  const normalizedX = dx / (bounds.width / 2);
  const normalizedY = dy / (bounds.height / 2);
  const dist = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
  
  const outerR = 1.0;
  const innerR = 0.4;
  
  // Verifica se está entre os raios e na metade superior
  return dist >= innerR && dist <= outerR && normalizedY < 0.3;
}

// Converte número para letra (A, B, C... Z, AA, AB...)
export function numberToAlpha(num: number): string {
  let result = '';
  while (num >= 0) {
    result = String.fromCharCode((num % 26) + 65) + result;
    num = Math.floor(num / 26) - 1;
  }
  return result;
}

// Converte número para romano
export function numberToRoman(num: number): string {
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let result = '';
  for (const [letter, value] of lookup) {
    while (num >= value) {
      result += letter;
      num -= value;
    }
  }
  return result;
}

// Gera label da fila
export function getRowLabel(index: number, type: RowLabelType, start: string): string {
  switch (type) {
    case 'alpha':
      const startCode = start.charCodeAt(0) - 65;
      return numberToAlpha(startCode + index);
    case 'numeric':
      return String(parseInt(start) + index);
    case 'roman':
      return numberToRoman(parseInt(start) + index);
    default:
      return String(index + 1);
  }
}

// Gera label do assento
export function getSeatLabel(
  index: number,
  total: number,
  type: SeatLabelType,
  start: number,
  isLeftSide?: boolean,
  customNumbers?: number[]
): string {
  // Se tiver numeração customizada, usa ela
  if (type === 'custom' && customNumbers && customNumbers.length > 0) {
    return String(customNumbers[index % customNumbers.length] || (start + index));
  }
  
  switch (type) {
    case 'numeric':
      return String(start + index);
    case 'reverse':
      return String(start + total - 1 - index);
    case 'odd-left':
      if (isLeftSide) {
        return String((index * 2) + 1); // 1, 3, 5...
      }
      return String((index * 2) + 2); // 2, 4, 6...
    case 'even-left':
      if (isLeftSide) {
        return String((index * 2) + 2); // 2, 4, 6...
      }
      return String((index * 2) + 1); // 1, 3, 5...
    default:
      return String(start + index);
  }
}

// Gera assentos em grade
export function generateSeatsGrid(
  params: GridGeneratorParams,
  startX: number,
  startY: number
): Seat[] {
  const seats: Seat[] = [];
  const {
    rows,
    cols,
    rowSpacing,
    colSpacing,
    seatSize,
    rowLabelType,
    seatLabelType,
    rowLabelStart,
    seatLabelStart,
    rotation,
    sectorId,
    prefix = '',
  } = params;

  const centerX = startX + (cols * (seatSize + colSpacing)) / 2;
  const centerY = startY + (rows * (seatSize + rowSpacing)) / 2;
  const rad = (rotation * Math.PI) / 180;

  for (let r = 0; r < rows; r++) {
    const rowLabel = getRowLabel(r, rowLabelType, rowLabelStart);
    
    for (let c = 0; c < cols; c++) {
      const seatLabel = getSeatLabel(c, cols, seatLabelType, seatLabelStart);
      
      // Posição antes da rotação
      let x = startX + c * (seatSize + colSpacing);
      let y = startY + r * (seatSize + rowSpacing);
      
      // Aplica rotação em torno do centro
      if (rotation !== 0) {
        const dx = x - centerX;
        const dy = y - centerY;
        x = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
        y = centerY + dx * Math.sin(rad) + dy * Math.cos(rad);
      }

      seats.push({
        id: generateId(),
        sectorId,
        row: prefix + rowLabel,
        number: seatLabel,
        type: 'normal',
        status: 'available',
        x,
        y,
        rotation,
      });
    }
  }

  return seats;
}

// Gera assentos em formato de arco/semicírculo
export function generateSeatsInArc(
  bounds: Bounds,
  sectorId: string,
  rows: number = 10,
  cols: number = 20,
  seatSize: number = 12,
  spacing: number = 4,
  rowLabelType: RowLabelType = 'alpha',
  seatLabelType: SeatLabelType = 'numeric',
  prefix: string = '',
  furnitureType: FurnitureType = 'chair',
  tableConfig?: TableConfig,
  curvature: number = 100 // 0-100, onde 100 = arco completo
): Seat[] {
  const seats: Seat[] = [];
  
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  
  // Ajusta tamanho baseado no tipo de mobília
  const itemSize = (furnitureType === 'table' || furnitureType === 'bistro') 
    ? (tableConfig?.tableWidth || 60) + 20
    : seatSize;
  
  const outerRadius = Math.min(bounds.width, bounds.height) * 0.45;
  const innerRatio = curvature >= 80 ? 0.35 : Math.max(0.15, 0.5 - curvature / 200);
  const innerRadius = outerRadius * innerRatio;
  
  // Ângulo do arco baseado na curvatura
  const angleSpread = curvature >= 80 
    ? Math.PI // 180° para arco completo
    : Math.PI * (0.3 + curvature / 130); // De 30° a ~108° para curvatura moderada
  
  for (let r = 0; r < rows; r++) {
    const rowRatio = rows > 1 ? r / (rows - 1) : 0;
    const rowRadius = outerRadius - rowRatio * (outerRadius - innerRadius);
    
    // Calcula quantos assentos cabem nesta fileira
    const circumference = angleSpread * rowRadius;
    const seatSpaceNeeded = itemSize + spacing;
    const maxSeatsInRow = Math.max(1, Math.floor(circumference / seatSpaceNeeded));
    const seatsInRow = Math.min(cols, maxSeatsInRow);
    
    const rowLabel = getRowLabel(r, rowLabelType, 'A');
    
    for (let c = 0; c < seatsInRow; c++) {
      const colRatio = seatsInRow > 1 ? c / (seatsInRow - 1) : 0.5;
      const angle = -Math.PI / 2 - angleSpread / 2 + angleSpread * colRatio;
      
      const x = cx + rowRadius * Math.cos(angle);
      const y = cy + rowRadius * Math.sin(angle);
      
      const seatLabel = getSeatLabel(c, seatsInRow, seatLabelType, 1);
      
      const seat: Seat = {
        id: generateId(),
        sectorId,
        row: prefix + rowLabel,
        number: seatLabel,
        type: 'normal',
        status: 'available',
        x,
        y,
        rotation: (angle + Math.PI / 2) * (180 / Math.PI), // Rotaciona para apontar para o centro
        furnitureType,
      };
      
      if ((furnitureType === 'table' || furnitureType === 'bistro') && tableConfig) {
        seat.tableConfig = { ...tableConfig };
      }
      
      seats.push(seat);
    }
  }
  
  return seats;
}

// Gera assentos com curvatura aplicada (grid curvo)
export function generateSeatsWithCurvature(
  bounds: Bounds,
  vertices: Vertex[],
  sectorId: string,
  rows: number = 10,
  cols: number = 20,
  seatSize: number = 12,
  spacing: number = 4,
  curvature: number = 0,
  rowLabelType: RowLabelType = 'alpha',
  seatLabelType: SeatLabelType = 'numeric',
  prefix: string = '',
  furnitureType: FurnitureType = 'chair',
  tableConfig?: TableConfig
): Seat[] {
  const seats: Seat[] = [];
  
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  
  // Ajusta tamanho baseado no tipo de mobília
  const itemSize = (furnitureType === 'table' || furnitureType === 'bistro') 
    ? (tableConfig?.tableWidth || 60) + 20
    : seatSize;
  const step = itemSize + spacing;
  
  const gridWidth = cols * step;
  const gridHeight = rows * step;
  const offsetX = bounds.x + (bounds.width - gridWidth) / 2;
  const offsetY = bounds.y + (bounds.height - gridHeight) / 2;
  
  for (let r = 0; r < rows; r++) {
    const rowLabel = getRowLabel(r, rowLabelType, 'A');
    
    for (let c = 0; c < cols; c++) {
      // Posição base no grid
      const baseX = offsetX + c * step + itemSize / 2;
      const baseY = offsetY + r * step + itemSize / 2;
      
      // Aplica curvatura - pontos nas bordas descem, centro sobe
      const normalizedX = (baseX - cx) / (bounds.width / 2);
      const curveOffset = (1 - normalizedX * normalizedX) * curvature * 0.8;
      
      const x = baseX;
      const y = baseY - curveOffset + (r / rows) * curvature * 0.3;
      
      // Verifica se está dentro do polígono
      if (!isPointInPolygon({ x, y }, vertices)) continue;
      
      const seatLabel = getSeatLabel(c, cols, seatLabelType, 1);
      
      const seat: Seat = {
        id: generateId(),
        sectorId,
        row: prefix + rowLabel,
        number: seatLabel,
        type: 'normal',
        status: 'available',
        x,
        y,
        rotation: 0,
        furnitureType,
      };
      
      if ((furnitureType === 'table' || furnitureType === 'bistro') && tableConfig) {
        seat.tableConfig = { ...tableConfig };
      }
      
      seats.push(seat);
    }
  }
  
  return seats;
}

// Gera assentos DENTRO de um polígono
export function generateSeatsInsidePolygon(
  vertices: Vertex[],
  sectorId: string,
  seatSize: number = 12,
  colSpacing: number = 4,
  rowLabelType: RowLabelType = 'alpha',
  seatLabelType: SeatLabelType = 'numeric',
  prefix: string = '',
  furnitureType: FurnitureType = 'chair',
  tableConfig?: TableConfig,
  isArcShape: boolean = false,
  curvature: number = 0,
  rows: number = 0,
  cols: number = 0,
  customNumbers?: number[],
  rowDescriptions?: Record<string, string>,
  rotation: number = 0,
  seatsPerRow?: number[],
  rowSpacing?: number // Novo parâmetro para espaçamento entre filas
): Seat[] {
  if (vertices.length < 3) return [];
  
  const bounds = getBoundsFromVertices(vertices);
  const effectiveRowSpacing = rowSpacing !== undefined ? rowSpacing : colSpacing;
  
  // Se tiver curvatura alta ou for arco, usa geração em arco
  if (isArcShape || curvature >= 40) {
    const effectiveRows = rows > 0 ? rows : Math.floor(bounds.height / (seatSize + effectiveRowSpacing));
    const effectiveCols = cols > 0 ? cols : Math.floor(bounds.width / (seatSize + colSpacing));
    return generateSeatsInArc(
      bounds,
      sectorId,
      effectiveRows,
      effectiveCols,
      seatSize,
      colSpacing,
      rowLabelType,
      seatLabelType,
      prefix,
      furnitureType,
      tableConfig,
      isArcShape ? 100 : curvature
    );
  }
  
  // Se tiver curvatura leve, usa grid curvo
  if (curvature > 0) {
    const effectiveRows = rows > 0 ? rows : Math.floor(bounds.height / (seatSize + effectiveRowSpacing));
    const effectiveCols = cols > 0 ? cols : Math.floor(bounds.width / (seatSize + colSpacing));
    return generateSeatsWithCurvature(
      bounds,
      vertices,
      sectorId,
      effectiveRows,
      effectiveCols,
      seatSize,
      colSpacing,
      curvature,
      rowLabelType,
      seatLabelType,
      prefix,
      furnitureType,
      tableConfig
    );
  }

  // Grid normal para curvatura 0 (usa rows e cols se especificados)
  const seats: Seat[] = [];
  
  // Ajusta tamanho baseado no tipo de mobília
  const isTable = furnitureType === 'table' || furnitureType === 'bistro';
  const itemSize = isTable 
    ? (tableConfig?.tableWidth || 60) + 20 // Mesa + espaço para cadeiras
    : seatSize;
  const colStep = itemSize + colSpacing;
  const rowStep = itemSize + effectiveRowSpacing;
  
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const rad = (rotation * Math.PI) / 180;
  
  // Função auxiliar para aplicar rotação
  const applyRotation = (x: number, y: number): { x: number; y: number } => {
    if (rotation === 0) return { x, y };
    const dx = x - centerX;
    const dy = y - centerY;
    return {
      x: centerX + dx * Math.cos(rad) - dy * Math.sin(rad),
      y: centerY + dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  };
  
  // Se rows e cols foram especificados, usa geração baseada em grid exato
  if (rows > 0 && cols > 0) {
    // Calcula o tamanho total do grid
    const gridWidth = cols * colStep;
    const gridHeight = rows * rowStep;
    
    // Centraliza o grid dentro do polígono
    const offsetX = bounds.x + (bounds.width - gridWidth) / 2 + itemSize / 2;
    const offsetY = bounds.y + (bounds.height - gridHeight) / 2 + itemSize / 2;
    
    for (let r = 0; r < rows; r++) {
      const rowLabel = getRowLabel(r, rowLabelType, 'A');
      
      // Quantidade de assentos nesta fileira
      const colsInRow = seatsPerRow && seatsPerRow[r] !== undefined ? seatsPerRow[r] : cols;
      
      // Recalcula offset X para centralizar fileira com quantidade customizada
      const rowGridWidth = colsInRow * colStep;
      const rowOffsetX = bounds.x + (bounds.width - rowGridWidth) / 2 + itemSize / 2;
      
      for (let c = 0; c < colsInRow; c++) {
        let x = rowOffsetX + c * colStep;
        let y = offsetY + r * rowStep;
        
        // Aplica rotação
        const rotated = applyRotation(x, y);
        x = rotated.x;
        y = rotated.y;
        
        // Verifica se está dentro do polígono (no ponto central)
        const seatCenter = { x, y };
        const isInside = isPointInPolygon(seatCenter, vertices);
        
        if (isInside) {
          const seatLabel = getSeatLabel(c, colsInRow, seatLabelType, 1, undefined, customNumbers);
          
          const seat: Seat = {
            id: generateId(),
            sectorId,
            row: prefix + rowLabel,
            number: seatLabel,
            type: 'normal',
            status: 'available',
            x: x - itemSize / 2,
            y: y - itemSize / 2,
            rotation,
            furnitureType,
            rowDescription: rowDescriptions?.[rowLabel],
          };
          
          if (isTable && tableConfig) {
            seat.tableConfig = { ...tableConfig };
          }
          
          seats.push(seat);
        }
      }
    }
    
    return seats;
  }
  
  // Fallback: padding interno para não encostar nas bordas
  const padding = itemSize;
  
  let rowIndex = 0;
  
  for (let y = bounds.y + padding; y < bounds.y + bounds.height - padding; y += rowStep) {
    let colIndex = 0;
    const rowLabel = getRowLabel(rowIndex, rowLabelType, 'A');
    let hasSeatsInRow = false;
    
    for (let xBase = bounds.x + padding; xBase < bounds.x + bounds.width - padding; xBase += colStep) {
      // Aplica rotação
      const rotated = applyRotation(xBase + itemSize / 2, y + itemSize / 2);
      
      // Verifica se o centro do assento está dentro do polígono
      const isInside = isPointInPolygon(rotated, vertices);
      
      if (isInside) {
        const seatLabel = getSeatLabel(colIndex, 100, seatLabelType, 1, undefined, customNumbers);
        
        const seat: Seat = {
          id: generateId(),
          sectorId,
          row: prefix + rowLabel,
          number: seatLabel,
          type: 'normal',
          status: 'available',
          x: rotated.x - itemSize / 2,
          y: rotated.y - itemSize / 2,
          rotation,
          furnitureType,
          rowDescription: rowDescriptions?.[rowLabel],
        };
        
        // Adiciona config de mesa se for mesa/bistro
        if (isTable && tableConfig) {
          seat.tableConfig = { ...tableConfig };
        }
        
        seats.push(seat);
        
        colIndex++;
        hasSeatsInRow = true;
      }
    }
    
    if (hasSeatsInRow) {
      rowIndex++;
    }
  }

  return seats;
}

// Gera assentos em grid simples SEM curvatura - para ajuste de espaçamento
export function generateSeatsInsidePolygonSimple(
  vertices: Vertex[],
  sectorId: string,
  seatSize: number = 12,
  colSpacing: number = 4,
  rowSpacing: number = 4,
  rows: number = 10,
  cols: number = 20,
  rowLabelType: RowLabelType = 'alpha',
  seatLabelType: SeatLabelType = 'numeric',
  rowLabelStart: string = 'A',
  seatLabelStart: number = 1,
  prefix: string = '',
  furnitureType: FurnitureType = 'chair',
  tableConfig?: TableConfig
): Seat[] {
  if (vertices.length < 3) return [];
  
  const bounds = getBoundsFromVertices(vertices);
  const seats: Seat[] = [];
  
  // Ajusta tamanho baseado no tipo de mobília
  const isTable = furnitureType === 'table' || furnitureType === 'bistro';
  const itemSize = isTable 
    ? (tableConfig?.tableWidth || 60) + 20
    : seatSize;
  const colStep = itemSize + colSpacing;
  const rowStep = itemSize + rowSpacing;
  
  // Calcula o tamanho total do grid
  const gridWidth = cols * colStep;
  const gridHeight = rows * rowStep;
  
  // Centraliza o grid dentro do polígono
  const offsetX = bounds.x + (bounds.width - gridWidth) / 2 + itemSize / 2;
  const offsetY = bounds.y + (bounds.height - gridHeight) / 2 + itemSize / 2;
  
  for (let r = 0; r < rows; r++) {
    const rowLabel = getRowLabel(r, rowLabelType, rowLabelStart);
    
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * colStep;
      const y = offsetY + r * rowStep;
      
      // Verifica se está dentro do polígono
      const isInside = isPointInPolygon({ x, y }, vertices);
      
      if (isInside) {
        const seatLabel = getSeatLabel(c, cols, seatLabelType, seatLabelStart);
        
        const seat: Seat = {
          id: generateId(),
          sectorId,
          row: prefix + rowLabel,
          number: seatLabel,
          type: 'normal',
          status: 'available',
          x: x - itemSize / 2,
          y: y - itemSize / 2,
          rotation: 0,
          furnitureType,
        };
        
        if (isTable && tableConfig) {
          seat.tableConfig = { ...tableConfig };
        }
        
        seats.push(seat);
      }
    }
  }
  
  return seats;
}

// Reposiciona assentos existentes para caber dentro de novos vértices
// Exclui assentos que ficam fora do novo polígono (Melhoria 4)
export function repositionSeatsInsidePolygon(
  existingSeats: Seat[],
  oldVertices: Vertex[],
  newVertices: Vertex[],
  sectorId: string,
  seatSize: number = 12
): Seat[] {
  if (newVertices.length < 3 || existingSeats.length === 0) return existingSeats;

  const oldBounds = getBoundsFromVertices(oldVertices);
  const newBounds = getBoundsFromVertices(newVertices);
  
  // Calcula fatores de escala
  const scaleX = oldBounds.width > 0 ? newBounds.width / oldBounds.width : 1;
  const scaleY = oldBounds.height > 0 ? newBounds.height / oldBounds.height : 1;
  
  // Reposiciona cada assento proporcionalmente
  const repositionedSeats: Seat[] = [];
  
  for (const seat of existingSeats) {
    if (seat.sectorId !== sectorId) {
      repositionedSeats.push(seat);
      continue;
    }
    
    // Calcula posição relativa ao bounds antigo (0-1)
    const relX = oldBounds.width > 0 ? (seat.x - oldBounds.x) / oldBounds.width : 0.5;
    const relY = oldBounds.height > 0 ? (seat.y - oldBounds.y) / oldBounds.height : 0.5;
    
    // Aplica na nova posição
    const newX = newBounds.x + relX * newBounds.width;
    const newY = newBounds.y + relY * newBounds.height;
    
    // Verifica se ainda está dentro do polígono
    const seatCenter = { x: newX + seatSize / 2, y: newY + seatSize / 2 };
    const isInside = isPointInPolygon(seatCenter, newVertices);
    
    // Exclui assentos que caem fora da nova forma (Melhoria 4)
    if (isInside) {
      repositionedSeats.push({
        ...seat,
        x: newX,
        y: newY,
      });
    }
  }
  
  return repositionedSeats;
}

// Regenera todos os assentos dentro do polígono mantendo configurações
export function regenerateSeatsForPolygon(
  vertices: Vertex[],
  sectorId: string,
  totalSeats: number,
  seatSize: number = 12,
  rowLabelType: RowLabelType = 'alpha',
  seatLabelType: SeatLabelType = 'numeric',
  prefix: string = ''
): Seat[] {
  if (vertices.length < 3) return [];

  const bounds = getBoundsFromVertices(vertices);
  const area = calculatePolygonArea(vertices);
  
  // Estima espaçamento baseado na área e número de assentos
  const areaPerSeat = area / totalSeats;
  const estimatedSpacing = Math.max(2, Math.sqrt(areaPerSeat) - seatSize);
  
  return generateSeatsInsidePolygon(
    vertices,
    sectorId,
    seatSize,
    estimatedSpacing,
    rowLabelType,
    seatLabelType,
    prefix
  );
}

// Calcula área de um polígono (Shoelace formula)
export function calculatePolygonArea(vertices: Vertex[]): number {
  let area = 0;
  const n = vertices.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  
  return Math.abs(area / 2);
}

// Verifica se ponto está dentro de bounds
export function isPointInBounds(point: { x: number; y: number }, bounds: { x: number; y: number; width: number; height: number }): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

// Verifica se dois bounds se sobrepõem
export function doBoundsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

// Exporta mapa para JSON
export function exportMapToJSON(map: any): string {
  return JSON.stringify(map, null, 2);
}

// Valida estrutura do mapa
export function validateMap(map: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!map.id) errors.push('ID do mapa é obrigatório');
  if (!map.name) errors.push('Nome do mapa é obrigatório');
  if (!map.layers || !Array.isArray(map.layers)) errors.push('Layers inválidas');
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
