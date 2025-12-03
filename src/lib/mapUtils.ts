import { Seat, GridGeneratorParams, RowLabelType, SeatLabelType, SEAT_COLORS } from '@/types/mapStudio';

// Gera ID único
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
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
