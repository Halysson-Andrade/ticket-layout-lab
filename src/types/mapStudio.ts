// ========================================
// MODELO DE DADOS - Map Studio
// ========================================

export type SeatType = 'normal' | 'pcd' | 'companion' | 'obeso' | 'vip' | 'blocked';
export type SeatStatus = 'available' | 'reserved' | 'sold' | 'blocked';
export type ElementType = 'stage' | 'bar' | 'bathroom' | 'entrance' | 'exit' | 'speaker' | 'dj' | 'screen' | 'vip-area' | 'food' | 'custom';
export type ToolType = 'select' | 'pan' | 'sector' | 'seat-grid' | 'seat-single' | 'element' | 'lasso' | 'table';

// Tipos de mobília
export type FurnitureType = 'chair' | 'table' | 'bistro';
export type TableShape = 'round' | 'square' | 'rectangular';

export type RowLabelType = 'alpha' | 'numeric' | 'roman';
export type SeatLabelType = 'numeric' | 'odd-left' | 'even-left' | 'reverse';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vertex {
  x: number;
  y: number;
}

// Formas expandidas para setores
export type SectorShape = 
  | 'rectangle' 
  | 'parallelogram' 
  | 'trapezoid' 
  | 'pentagon' 
  | 'hexagon' 
  | 'triangle' 
  | 'circle' 
  | 'arc'
  | 'l-shape'
  | 'u-shape'
  | 't-shape'
  | 'z-shape'
  | 'cross'
  | 'diamond'
  | 'octagon'
  | 'arrow'
  | 'star'
  | 'wave';

// Configuração de mesa/bistrô
export interface TableConfig {
  shape: TableShape;
  chairCount: number;
  tableWidth: number;
  tableHeight: number;
}

export interface Seat {
  id: string;
  sectorId: string;
  row: string;
  number: string;
  type: SeatType;
  status: SeatStatus;
  x: number;
  y: number;
  rotation: number;
  price?: number;
  categoryId?: string;
  furnitureType?: FurnitureType;
  tableConfig?: TableConfig;
}

export interface Sector {
  id: string;
  name: string;
  color: string;
  bounds: Bounds;
  vertices: Vertex[];
  shape: SectorShape;
  rotation: number;
  seats: Seat[];
  categoryId?: string;
  visible: boolean;
  locked: boolean;
  furnitureType?: FurnitureType;
}

export interface VenueElement {
  id: string;
  type: ElementType;
  label: string;
  bounds: Bounds;
  rotation: number;
  color?: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  elements: (Sector | VenueElement)[];
}

export interface VenueMap {
  id: string;
  name: string;
  version: number;
  status: 'draft' | 'published';
  width: number;
  height: number;
  backgroundImage?: string;
  layers: Layer[];
  createdAt: string;
  updatedAt: string;
}

export interface GridGeneratorParams {
  rows: number;
  cols: number;
  rowSpacing: number;
  colSpacing: number;
  seatSize: number;
  rowLabelType: RowLabelType;
  seatLabelType: SeatLabelType;
  rowLabelStart: string;
  seatLabelStart: number;
  rotation: number;
  sectorId: string;
  prefix?: string;
  furnitureType?: FurnitureType;
  tableConfig?: TableConfig;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'cinema' | 'stadium' | 'circus' | 'show' | 'theater';
  defaultParams: Partial<GridGeneratorParams>;
  sectors: number;
  totalSeats: number;
}

export const SEAT_COLORS: Record<SeatType, string> = {
  normal: 'hsl(142, 71%, 45%)',
  pcd: 'hsl(199, 89%, 48%)',
  companion: 'hsl(280, 68%, 60%)',
  obeso: 'hsl(45, 93%, 47%)',
  vip: 'hsl(340, 82%, 52%)',
  blocked: 'hsl(0, 0%, 45%)',
};

export const SECTOR_COLORS = [
  'hsl(340, 82%, 52%)',
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
  'hsl(142, 71%, 45%)',
  'hsl(45, 93%, 47%)',
  'hsl(24, 95%, 53%)',
  'hsl(280, 68%, 60%)',
  'hsl(172, 66%, 50%)',
];

export const ELEMENT_ICONS: Record<ElementType, string> = {
  stage: '🎭',
  bar: '🍺',
  bathroom: '🚻',
  entrance: '🚪',
  exit: '🚪',
  speaker: '🔊',
  dj: '🎧',
  screen: '📺',
  'vip-area': '⭐',
  food: '🍔',
  custom: '📦',
};

export const SHAPE_NAMES: Record<SectorShape, string> = {
  rectangle: 'Retângulo',
  parallelogram: 'Paralelogramo',
  trapezoid: 'Trapézio',
  pentagon: 'Pentágono',
  hexagon: 'Hexágono',
  triangle: 'Triângulo',
  circle: 'Círculo',
  arc: 'Arco',
  'l-shape': 'Forma L',
  'u-shape': 'Forma U',
  't-shape': 'Forma T',
  'z-shape': 'Forma Z',
  cross: 'Cruz',
  diamond: 'Losango',
  octagon: 'Octágono',
  arrow: 'Seta',
  star: 'Estrela',
  wave: 'Onda',
};

export const FURNITURE_LABELS: Record<FurnitureType, string> = {
  chair: 'Cadeira',
  table: 'Mesa',
  bistro: 'Bistrô',
};
