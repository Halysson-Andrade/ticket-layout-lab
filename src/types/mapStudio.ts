// ========================================
// MODELO DE DADOS - Map Studio
// ========================================

export type SeatType = 'normal' | 'pcd' | 'companion' | 'obeso' | 'vip' | 'blocked';
export type SeatStatus = 'available' | 'reserved' | 'sold' | 'blocked';
export type ElementType = 'stage' | 'bar' | 'bathroom' | 'entrance' | 'exit' | 'speaker' | 'dj' | 'screen' | 'vip-area' | 'food' | 'custom';
export type ToolType = 'select' | 'pan' | 'sector' | 'seat-grid' | 'seat-single' | 'element' | 'lasso' | 'table' | 'text';

// Elemento de texto independente no canvas
export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  textDecoration: 'none' | 'underline';
  rotation: number;
}

// Tipos de mobília
export type FurnitureType = 'chair' | 'table' | 'bistro';
export type TableShape = 'round' | 'square' | 'rectangular';

export type RowLabelType = 'alpha' | 'numeric' | 'roman';
export type SeatLabelType = 'numeric' | 'odd-left' | 'even-left' | 'odd-only' | 'even-only' | 'reverse' | 'custom' | 'custom-per-row';

// Direção da numeração dos assentos
export type SeatNumberDirection = 'ltr' | 'rtl' | 'center-out';

// Tipo de numeração por fileira
export type RowNumberingType = 'numeric' | 'odd' | 'even' | 'custom';

// Configuração de numeração customizada por fileira
export interface RowNumberingConfig {
  rowLabel: string;
  type: RowNumberingType; // Tipo de numeração: numérico, ímpar, par ou customizado
  startNumber: number; // Número inicial para numeric/odd/even
  numbers?: number[]; // Array de números para tipo 'custom'
  direction?: SeatNumberDirection; // Direção da geração (ltr ou rtl) para esta fileira
}

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
  controlPoint?: { x: number; y: number }; // Ponto de controle para curvas bezier
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

// Modo de venda da mesa
export type TableSellMode = 'per-chair' | 'closed-table';

// Configuração de mesa/bistrô
export interface TableConfig {
  shape: TableShape;
  chairCount: number;
  tableWidth: number;
  tableHeight: number;
  chairStartAngle?: number; // Ângulo inicial das cadeiras em graus (0-360)
  chairRadius?: number; // Raio das cadeiras (padrão 6)
  tableColor?: string; // Cor da mesa (padrão depende do tipo)
  chairAngles?: number[]; // Ângulos individuais das cadeiras em graus (posicionamento manual)
  sellMode?: TableSellMode; // Modo de venda: por cadeira ou mesa fechada
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
  rowDescription?: string; // Descrição customizada da fileira
  description?: string; // Motivo de bloqueio ou nota sobre o assento
}

export interface Sector {
  id: string;
  name: string;
  color: string;
  opacity: number; // Opacidade do preenchimento (0-100)
  bounds: Bounds;
  vertices: Vertex[];
  shape: SectorShape;
  rotation: number;
  curvature: number;
  seats: Seat[];
  categoryId?: string;
  visible: boolean;
  locked: boolean;
  furnitureType?: FurnitureType;
  // Espaçamento entre assentos
  rowSpacing?: number;
  colSpacing?: number;
  seatSize?: number;
  // Configuração de labels (preservada ao ajustar espaçamento)
  rowLabelType?: RowLabelType;
  seatLabelType?: SeatLabelType;
  rowLabelStart?: string;
  seatLabelStart?: number;
  labelPrefix?: string;
  tableConfig?: TableConfig;
  gridRows?: number;
  gridCols?: number;
  rowAlignment?: RowAlignment;
  seatsPerRow?: number[];
  customNumbers?: number[]; // Numeração custom usada no gerador
  customPerRowNumbers?: Record<string, RowNumberingConfig>; // Configuração de numeração por fileira
  rowLabelPosition?: 'left' | 'right' | 'both' | 'none'; // Posição do nome da fileira
  seatNumberDirection?: SeatNumberDirection; // Direção da numeração dos assentos
  centerSeats?: boolean; // Centralizar assentos na forma
  sectorLabel?: string; // Texto customizado exibido no centro do setor (ex: "Camarote")
  sectorLabelDirection?: 'horizontal' | 'vertical' | 'diagonal-up' | 'diagonal-down'; // Direção do texto
  sectorLabelSize?: number; // Tamanho da fonte (padrão: auto)
}

export interface VenueElement {
  id: string;
  type: ElementType;
  label: string;
  bounds: Bounds;
  vertices?: Vertex[];
  rotation: number;
  color?: string;
}

// Configuração de texto para formas geométricas
export interface ShapeTextConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  textDecoration: 'none' | 'underline';
}

// Forma geométrica independente (não vinculada a setor)
export interface GeometricShape {
  id: string;
  name: string;
  color: string;
  opacity: number; // Opacidade do preenchimento (0-100)
  bounds: Bounds;
  vertices: Vertex[];
  shape: SectorShape;
  rotation: number;
  curvature: number;
  linkedSectorId?: string; // ID do setor vinculado (opcional)
  textConfig?: ShapeTextConfig; // Texto estilizado dentro da forma
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

export type RowAlignment = 'left' | 'center' | 'right';

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
  tableShape?: TableShape;
  chairsPerTable?: number;
  customNumbers?: number[]; // Numeração customizada (ex: 2, 7, 10...)
  customPerRowNumbers?: Record<string, RowNumberingConfig>; // Configuração de numeração por fileira
  rowDescriptions?: Record<string, string>; // Descrições por fileira (ex: { A: 'Primeira fila' })
  seatsPerRow?: number[]; // Quantidade de assentos por fileira (ex: [10, 12, 14, 16])
  rowAlignment?: RowAlignment; // Alinhamento dos assentos na fileira
  resizeWidth?: number; // Nova largura do setor (opcional)
  resizeHeight?: number; // Nova altura do setor (opcional)
  rowLabelPosition?: 'left' | 'right' | 'both' | 'none'; // Posição do nome da fileira no mapa
  seatNumberDirection?: SeatNumberDirection; // Direção da numeração dos assentos
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

// Lista de setores predefinidos para vincular formas geométricas
export const PREDEFINED_SECTORS = [
  { id: 'lateral-prata-par',      name: 'Lateral Prata - Numeração Lado Par',      color: '#F2C230' },
  { id: 'lateral-prata-impar',    name: 'Lateral Prata - Numeração Lado Ímpar',    color: '#F2C230' },
  { id: 'lateral-ouro-par',       name: 'Lateral Ouro - Numeração Lado Par',       color: '#1B7BA6' },
  { id: 'lateral-ouro-impar',     name: 'Lateral Ouro - Numeração Lado Ímpar',     color: '#1B7BA6' },
  { id: 'central-prata-par',      name: 'Central Prata - Numeração Lado Par',      color: '#A6CE39' },
  { id: 'central-prata-impar',    name: 'Central Prata - Numeração Lado Ímpar',    color: '#A6CE39' },
  { id: 'central-ouro-par',       name: 'Central Ouro - Numeração Lado Par',       color: '#E6224A' },
  { id: 'central-ouro-impar',     name: 'Central Ouro - Numeração Lado Ímpar',     color: '#E6224A' },
  { id: 'vip-prata-par',          name: 'VIP Prata - Numeração Lado Par',          color: '#D63BB8' },
  { id: 'vip-prata-impar',        name: 'VIP Prata - Numeração Lado Ímpar',        color: '#D63BB8' },
  { id: 'vip-ouro-par',           name: 'VIP Ouro - Numeração Lado Par',           color: '#F08A1F' },
  { id: 'vip-ouro-impar',         name: 'VIP Ouro - Numeração Lado Ímpar',         color: '#F08A1F' },
  { id: 'vip-premium-par',        name: 'VIP Premium - Numeração Lado Par',        color: '#C99A2E' },
  { id: 'vip-premium-impar',      name: 'VIP Premium - Numeração Lado Ímpar',      color: '#C99A2E' },
  { id: 'camarote-familia-par',   name: 'Camarote Família - Numeração Lado Par',   color: '#B08423' },
  { id: 'camarote-familia-impar', name: 'Camarote Família - Numeração Lado Ímpar', color: '#B08423' },
  { id: 'cadeirante',             name: 'Setor Cadeirante',                        color: '#6B7280' },
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
