import { Seat, GridGeneratorParams, RowLabelType, SeatLabelType, SEAT_COLORS, Vertex, SectorShape, Bounds } from '@/types/mapStudio';

// Gera ID único
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// Gera vértices baseado na forma
export function generateVerticesForShape(shape: SectorShape, bounds: Bounds): Vertex[] {
  const { x, y, width, height } = bounds;
  
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
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.min(width, height) / 2;
      return Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
    case 'hexagon':
      const hcx = x + width / 2;
      const hcy = y + height / 2;
      const hr = Math.min(width, height) / 2;
      return Array.from({ length: 6 }, (_, i) => {
        const angle = (i * Math.PI / 3) - Math.PI / 2;
        return { x: hcx + hr * Math.cos(angle), y: hcy + hr * Math.sin(angle) };
      });
    case 'triangle':
      return [
        { x: x + width / 2, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
    case 'arc':
    case 'circle':
      // Aproximação de círculo com 12 pontos
      const acx = x + width / 2;
      const acy = y + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      return Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 2 * Math.PI / 12);
        return { x: acx + rx * Math.cos(angle), y: acy + ry * Math.sin(angle) };
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
  isLeftSide?: boolean
): string {
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

// Gera assentos DENTRO de um polígono
export function generateSeatsInsidePolygon(
  vertices: Vertex[],
  sectorId: string,
  seatSize: number = 12,
  spacing: number = 4,
  rowLabelType: RowLabelType = 'alpha',
  seatLabelType: SeatLabelType = 'numeric',
  prefix: string = ''
): Seat[] {
  if (vertices.length < 3) return [];

  const seats: Seat[] = [];
  const bounds = getBoundsFromVertices(vertices);
  const step = seatSize + spacing;
  
  // Padding interno para não encostar nas bordas
  const padding = seatSize;
  
  let rowIndex = 0;
  
  for (let y = bounds.y + padding; y < bounds.y + bounds.height - padding; y += step) {
    let colIndex = 0;
    const rowLabel = getRowLabel(rowIndex, rowLabelType, 'A');
    let hasSeatsInRow = false;
    
    for (let x = bounds.x + padding; x < bounds.x + bounds.width - padding; x += step) {
      // Verifica se o centro do assento está dentro do polígono
      const seatCenter = { x: x + seatSize / 2, y: y + seatSize / 2 };
      
      if (isPointInPolygon(seatCenter, vertices)) {
        const seatLabel = getSeatLabel(colIndex, 100, seatLabelType, 1);
        
        seats.push({
          id: generateId(),
          sectorId,
          row: prefix + rowLabel,
          number: seatLabel,
          type: 'normal',
          status: 'available',
          x,
          y,
          rotation: 0,
        });
        
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

// Reposiciona assentos existentes para caber dentro de novos vértices
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
    
    if (isPointInPolygon(seatCenter, newVertices)) {
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
