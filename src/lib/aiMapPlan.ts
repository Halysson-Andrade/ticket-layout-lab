// Converte o plano gerado pela IA em setores/elementos do MapStudio
import {
  Sector,
  VenueElement,
  SectorShape,
  ElementType,
  SECTOR_COLORS,
  RowLabelType,
} from '@/types/mapStudio';
import {
  generateId,
  generateVerticesWithCurvature,
  generateSeatsInsidePolygon,
} from './mapUtils';

export interface AIPlanSector {
  name: string;
  color: string;
  shape: SectorShape;
  x: number;
  y: number;
  width: number;
  height: number;
  curvature?: number;
  rotation?: number;
  rows: number;
  cols: number;
  seatSize?: number;
  rowSpacing?: number;
  colSpacing?: number;
  rowAlignment?: 'left' | 'center' | 'right';
  seatsPerRow?: number[];
  centerSeats?: boolean;
  rowLabelType?: RowLabelType;
  labelPrefix?: string;
}

export interface AIPlanElement {
  type: ElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface AIMapPlan {
  sectors: AIPlanSector[];
  elements: AIPlanElement[];
}

const SUPPORTED_SHAPES: SectorShape[] = [
  'rectangle',
  'circle',
  'trapezoid',
  'pentagon',
  'hexagon',
  'triangle',
  'arc',
  'l-shape',
  'u-shape',
  't-shape',
  'diamond',
  'octagon',
];

const SUPPORTED_ELEMENTS: ElementType[] = [
  'stage',
  'bar',
  'bathroom',
  'entrance',
  'exit',
  'speaker',
  'dj',
  'screen',
  'vip-area',
  'food',
];

export function buildSectorsAndElementsFromPlan(
  plan: AIMapPlan,
  startSectorIndex: number = 0
): { sectors: Sector[]; elements: VenueElement[] } {
  const sectors: Sector[] = (plan.sectors || []).map((s, idx) => {
    const shape: SectorShape = SUPPORTED_SHAPES.includes(s.shape)
      ? s.shape
      : 'rectangle';
    const bounds = {
      x: Math.max(0, Math.round(s.x)),
      y: Math.max(0, Math.round(s.y)),
      width: Math.max(60, Math.round(s.width)),
      height: Math.max(60, Math.round(s.height)),
    };
    const curvature = Math.max(0, Math.min(100, Math.round(s.curvature ?? 0)));
    const vertices = generateVerticesWithCurvature(shape, bounds, curvature);
    const sectorId = generateId();
    const seatSize = Math.max(6, Math.min(24, Math.round(s.seatSize ?? 10)));
    const colSpacing = Math.max(0, Math.min(24, Math.round(s.colSpacing ?? 8)));
    const rowSpacing = Math.max(0, Math.min(24, Math.round(s.rowSpacing ?? colSpacing)));
    const seatsPerRow = Array.isArray(s.seatsPerRow)
      ? s.seatsPerRow
          .map((value) => Math.max(0, Math.round(value ?? 0)))
          .slice(0, Math.max(0, Math.round(s.rows ?? 0)))
      : undefined;

    let seats: ReturnType<typeof generateSeatsInsidePolygon> = [];
    const rows = Math.max(0, Math.round(s.rows ?? 0));
    const cols = Math.max(0, Math.round(s.cols ?? 0));
    if (rows > 0 && cols > 0) {
      try {
        seats = generateSeatsInsidePolygon(
          vertices,
          sectorId,
          seatSize,
          colSpacing,
          s.rowLabelType || 'alpha',
          'numeric',
          s.labelPrefix || '',
          'chair',
          undefined,
          shape === 'arc',
          curvature,
          rows,
          cols,
          undefined,
          undefined,
          s.rotation ?? 0,
          seatsPerRow,
          rowSpacing,
          s.rowAlignment,
        );
      } catch (e) {
        console.error('Erro gerando assentos para setor IA', s.name, e);
        seats = [];
      }
    }

    const color =
      s.color && s.color.startsWith('hsl')
        ? s.color
        : SECTOR_COLORS[(startSectorIndex + idx) % SECTOR_COLORS.length];

    const sector: Sector = {
      id: sectorId,
      name: s.name || `Setor IA ${startSectorIndex + idx + 1}`,
      color,
      opacity: 60,
      bounds,
      vertices,
      shape,
      rotation: s.rotation ?? 0,
      curvature,
      seats,
      visible: true,
      locked: false,
      gridRows: rows,
      gridCols: cols,
      seatSize,
      rowSpacing,
      colSpacing,
      rowAlignment: s.rowAlignment,
      seatsPerRow,
      centerSeats: s.centerSeats ?? true,
      rowLabelType: s.rowLabelType || 'alpha',
      seatLabelType: 'numeric',
      rowLabelStart: 'A',
      seatLabelStart: 1,
      labelPrefix: s.labelPrefix || '',
    };
    return sector;
  });

  const elements: VenueElement[] = (plan.elements || [])
    .filter((e) => SUPPORTED_ELEMENTS.includes(e.type))
    .map((e) => ({
      id: generateId(),
      type: e.type,
      label: e.label || e.type,
      bounds: {
        x: Math.max(0, Math.round(e.x)),
        y: Math.max(0, Math.round(e.y)),
        width: Math.max(40, Math.round(e.width)),
        height: Math.max(40, Math.round(e.height)),
      },
      rotation: e.rotation ?? 0,
    }));

  return { sectors, elements };
}

export function summarizePlan(plan: AIMapPlan): string {
  const sectorCount = plan.sectors?.length ?? 0;
  const totalSeats = (plan.sectors || []).reduce(
    (acc, s) => acc + (s.rows || 0) * (s.cols || 0),
    0
  );
  const elementCount = plan.elements?.length ?? 0;
  return `${sectorCount} setor(es) • ~${totalSeats} assentos • ${elementCount} elemento(s)`;
}
