import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Check, Armchair, LayoutGrid, Settings, Square, Triangle, Pentagon, Hexagon, Circle, Star, ArrowUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectorShape, SHAPE_NAMES, FurnitureType, TableShape, FURNITURE_LABELS, SEAT_COLORS, SeatType, RowLabelType, SeatLabelType } from '@/types/mapStudio';
import { cn } from '@/lib/utils';
import { generateVerticesForShape, isPointInPolygon } from '@/lib/mapUtils';

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (shapeConfig: ShapeConfig) => void;
}

export interface ShapeConfig {
  shape: SectorShape;
  totalSeats: number;
  sectors: number;
  rows: number;
  cols: number;
  seatSize: number;
  rowSpacing: number;
  colSpacing: number;
  curvature: number;
  furnitureType: FurnitureType;
  tableShape: TableShape;
  chairsPerTable: number;
  seatType: SeatType;
  // Configurações de rotulação
  rowLabelType: RowLabelType;
  rowLabelStart: string;
  seatLabelType: SeatLabelType;
  seatLabelStart: number;
  prefix: string;
}

interface ShapeTemplate {
  id: SectorShape;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultParams: Partial<ShapeConfig>;
}

const shapeTemplates: ShapeTemplate[] = [
  {
    id: 'rectangle',
    name: 'Retângulo',
    description: 'Cinemas, teatros, auditórios',
    icon: <Square className="h-6 w-6" />,
    defaultParams: { rows: 12, cols: 24, seatSize: 14, rowSpacing: 6, colSpacing: 2 },
  },
  {
    id: 'parallelogram',
    name: 'Paralelogramo',
    description: 'Setores laterais com ângulo',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h14l-4 16H2L6 4z" /></svg>,
    defaultParams: { rows: 10, cols: 20, seatSize: 14, rowSpacing: 6, colSpacing: 2 },
  },
  {
    id: 'trapezoid',
    name: 'Trapézio',
    description: 'Arquibancadas, setores frontais',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16l-3-16H7L4 20z" /></svg>,
    defaultParams: { rows: 15, cols: 30, seatSize: 12, rowSpacing: 4, colSpacing: 2 },
  },
  {
    id: 'triangle',
    name: 'Triângulo',
    description: 'Cantos e setores angulares',
    icon: <Triangle className="h-6 w-6" />,
    defaultParams: { rows: 8, cols: 16, seatSize: 14, rowSpacing: 6, colSpacing: 3 },
  },
  {
    id: 'pentagon',
    name: 'Pentágono',
    description: 'Espaços irregulares',
    icon: <Pentagon className="h-6 w-6" />,
    defaultParams: { rows: 10, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 3 },
  },
  {
    id: 'hexagon',
    name: 'Hexágono',
    description: 'Layout orgânico, eventos ao redor',
    icon: <Hexagon className="h-6 w-6" />,
    defaultParams: { rows: 8, cols: 24, seatSize: 16, rowSpacing: 6, colSpacing: 2 },
  },
  {
    id: 'octagon',
    name: 'Octágono',
    description: 'Arenas, ringues',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7,2 17,2 22,7 22,17 17,22 7,22 2,17 2,7" /></svg>,
    defaultParams: { rows: 10, cols: 30, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'circle',
    name: 'Círculo/Oval',
    description: 'Circos, arenas 360°',
    icon: <Circle className="h-6 w-6" />,
    defaultParams: { rows: 10, cols: 40, seatSize: 14, rowSpacing: 4, colSpacing: 2 },
  },
  {
    id: 'arc',
    name: 'Arco',
    description: 'Curvatura para palcos',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18 Q 12 2 22 18 L 18 18 Q 12 8 6 18 Z" /></svg>,
    defaultParams: { rows: 12, cols: 30, seatSize: 14, rowSpacing: 5, colSpacing: 2, curvature: 50 },
  },
  {
    id: 'diamond',
    name: 'Losango',
    description: 'Áreas centrais, VIP',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 22,12 12,22 2,12" /></svg>,
    defaultParams: { rows: 8, cols: 16, seatSize: 14, rowSpacing: 5, colSpacing: 3 },
  },
  {
    id: 'l-shape',
    name: 'Forma L',
    description: 'Cantos e extensões',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h8v8h8v8H4V4z" /></svg>,
    defaultParams: { rows: 10, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'u-shape',
    name: 'Forma U',
    description: 'Ao redor do palco',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v16h16V4h-5v10H9V4H4z" /></svg>,
    defaultParams: { rows: 10, cols: 24, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 't-shape',
    name: 'Forma T',
    description: 'Passarelas e extensões',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v6h-5v10H9V10H4V4z" /></svg>,
    defaultParams: { rows: 12, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'z-shape',
    name: 'Forma Z',
    description: 'Setores escalonados',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v5h-10v6h10v5H4v-5h10v-6H4V4z" /></svg>,
    defaultParams: { rows: 10, cols: 18, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'cross',
    name: 'Cruz',
    description: 'Layout central expandido',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z" /></svg>,
    defaultParams: { rows: 10, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'arrow',
    name: 'Seta',
    description: 'Direcionado ao palco',
    icon: <ArrowUp className="h-6 w-6" />,
    defaultParams: { rows: 12, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'star',
    name: 'Estrela',
    description: 'Eventos especiais',
    icon: <Star className="h-6 w-6" />,
    defaultParams: { rows: 8, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 3 },
  },
  {
    id: 'wave',
    name: 'Onda',
    description: 'Layout orgânico curvo',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12 Q 6 6 12 12 T 22 12" /></svg>,
    defaultParams: { rows: 10, cols: 30, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
];

const seatTypeOptions: { type: SeatType; label: string }[] = [
  { type: 'normal', label: 'Normal' },
  { type: 'vip', label: 'VIP' },
  { type: 'pcd', label: 'PCD' },
  { type: 'obeso', label: 'Obeso' },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<'shape' | 'config' | 'preview'>('shape');
  const [selectedShape, setSelectedShape] = useState<ShapeTemplate | null>(null);
  const [config, setConfig] = useState<ShapeConfig>({
    shape: 'rectangle',
    totalSeats: 288,
    sectors: 1,
    rows: 12,
    cols: 24,
    seatSize: 14,
    rowSpacing: 6,
    colSpacing: 2,
    curvature: 0,
    furnitureType: 'chair',
    tableShape: 'round',
    chairsPerTable: 6,
    seatType: 'normal',
    // Rotulação
    rowLabelType: 'alpha',
    rowLabelStart: 'A',
    seatLabelType: 'numeric',
    seatLabelStart: 1,
    prefix: '',
  });

  // Hook useMemo ANTES do early return
  // Calcula dimensões do preview baseado na quantidade de assentos - EXPANDE para caber todos
  const previewDimensions = useMemo(() => {
    // Mesas precisam de muito mais espaço que cadeiras
    const isTable = config.furnitureType === 'table' || config.furnitureType === 'bistro';
    
    // Tamanho base proporcional
    const scaledSeatSize = isTable 
      ? Math.max(18, Math.min(28, 20 * (config.seatSize / 14)))
      : Math.max(5, Math.min(10, 7 * (config.seatSize / 14)));
    
    const scaledRowSpacing = isTable 
      ? Math.max(10, config.rowSpacing * 1.5)
      : Math.max(2, config.rowSpacing / 2);
    
    const scaledColSpacing = isTable 
      ? Math.max(10, config.colSpacing * 1.5)
      : Math.max(2, config.colSpacing / 2);
    
    const cols = config.cols;
    const rows = config.rows;
    
    // Calcula tamanho necessário para caber TODOS os assentos
    const gridWidth = cols * (scaledSeatSize + scaledColSpacing);
    const gridHeight = rows * (scaledSeatSize + scaledRowSpacing);
    
    // Margem extra para a forma geométrica (formas não-retangulares precisam de mais espaço)
    const shapeMargin = selectedShape?.id === 'rectangle' ? 1.1 : 1.4;
    
    // Expande o preview para caber todos os assentos
    const width = Math.max(180, (gridWidth + 40) * shapeMargin);
    const height = Math.max(120, (gridHeight + 40) * shapeMargin);
    
    return { 
      width, 
      height, 
      seatSize: scaledSeatSize, 
      rowSpacing: scaledRowSpacing, 
      colSpacing: scaledColSpacing,
      cols,
      rows,
      isTable
    };
  }, [config.cols, config.rows, config.seatSize, config.rowSpacing, config.colSpacing, config.furnitureType, selectedShape]);

  // Gera posições dos assentos DENTRO da forma geométrica
  const seatsInShape = useMemo(() => {
    if (!selectedShape) return [];
    
    const { width: previewWidth, height: previewHeight, seatSize, rowSpacing, colSpacing, cols, rows } = previewDimensions;
    const bounds = { x: 0, y: 0, width: previewWidth, height: previewHeight };
    const cx = previewWidth / 2;
    const cy = previewHeight / 2;
    
    const curvature = config.curvature || 0;
    const isArcShape = selectedShape.id === 'arc' || curvature >= 80;
    const hasHighCurvature = curvature >= 40;
    
    const seats: { x: number; y: number; inside: boolean }[] = [];
    
    if (isArcShape) {
      // POSICIONAMENTO EM ARCO - assentos seguem linhas curvas em semicírculo superior
      const outerRadius = Math.min(previewWidth, previewHeight) * 0.45;
      const innerRatio = selectedShape.id === 'arc' ? 0.35 : Math.max(0.15, 0.5 - curvature / 200);
      const innerRadius = outerRadius * innerRatio;
      
      // Arco vai de 0° a 180° (semicírculo superior - abertura para baixo)
      const startAngle = Math.PI;  // 180°
      const endAngle = 0;          // 0° (vai no sentido horário)
      
      for (let r = 0; r < rows; r++) {
        // Raio desta fileira (da externa para interna)
        const rowRatio = rows > 1 ? r / (rows - 1) : 0;
        const rowRadius = outerRadius - rowRatio * (outerRadius - innerRadius);
        
        // Ajusta quantidade de assentos por fileira baseado no raio
        const circumference = Math.PI * rowRadius;
        const seatSpaceNeeded = seatSize + colSpacing;
        const maxSeatsInRow = Math.max(1, Math.floor(circumference / seatSpaceNeeded));
        const seatsInRow = Math.min(cols, maxSeatsInRow);
        
        // Ajusta o ângulo de início e fim para centralizar os assentos
        const angleNeeded = seatsInRow > 1 ? (seatsInRow - 1) * seatSpaceNeeded / rowRadius : 0;
        const centerAngle = -Math.PI / 2; // -90° (topo)
        const rowStartAngle = centerAngle - angleNeeded / 2;
        
        for (let c = 0; c < seatsInRow; c++) {
          const angle = seatsInRow > 1 
            ? rowStartAngle + (c * angleNeeded / (seatsInRow - 1))
            : centerAngle;
          
          const x = cx + rowRadius * Math.cos(angle);
          const y = cy + rowRadius * Math.sin(angle);
          
          seats.push({ x, y, inside: true });
        }
      }
    } else if (hasHighCurvature) {
      // ALTA CURVATURA (40-79) - transição para arco
      const outerRadius = Math.min(previewWidth, previewHeight) * 0.45;
      const innerRatio = Math.max(0.2, 0.6 - curvature / 150);
      const innerRadius = outerRadius * innerRatio;
      
      // Ângulo proporcional à curvatura (40% = 90°, 79% = quase 180°)
      const angleSpread = Math.PI * (0.5 + (curvature - 40) / 80);
      
      for (let r = 0; r < rows; r++) {
        const rowRatio = rows > 1 ? r / (rows - 1) : 0;
        const rowRadius = outerRadius - rowRatio * (outerRadius - innerRadius);
        
        for (let c = 0; c < cols; c++) {
          const colRatio = cols > 1 ? c / (cols - 1) : 0.5;
          const angle = -Math.PI / 2 - angleSpread / 2 + angleSpread * colRatio;
          
          const x = cx + rowRadius * Math.cos(angle);
          const y = cy + rowRadius * Math.sin(angle);
          
          seats.push({ x, y, inside: true });
        }
      }
    } else if (curvature > 0) {
      // CURVATURA MODERADA - grid com deformação curva
      const vertices = generateVerticesForShape(selectedShape.id, bounds);
      const gridWidth = cols * (seatSize + colSpacing);
      const gridHeight = rows * (seatSize + rowSpacing);
      const offsetX = (previewWidth - gridWidth) / 2;
      const offsetY = (previewHeight - gridHeight) / 2;
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Posição base no grid
          const baseX = offsetX + c * (seatSize + colSpacing) + seatSize / 2;
          const baseY = offsetY + r * (seatSize + rowSpacing) + seatSize / 2;
          
          // Aplica curvatura - pontos nas bordas descem, centro sobe
          const normalizedX = (baseX - cx) / (previewWidth / 2);
          const curveOffset = (1 - normalizedX * normalizedX) * curvature * 0.4;
          
          // Desloca Y baseado na curvatura
          const x = baseX;
          const y = baseY - curveOffset + (r / rows) * curvature * 0.2;
          
          const inside = isPointInPolygon({ x, y }, vertices);
          seats.push({ x, y, inside });
        }
      }
    } else {
      // SEM CURVATURA - grid normal dentro da forma
      const vertices = generateVerticesForShape(selectedShape.id, bounds);
      const gridWidth = cols * (seatSize + colSpacing);
      const gridHeight = rows * (seatSize + rowSpacing);
      const offsetX = (previewWidth - gridWidth) / 2;
      const offsetY = (previewHeight - gridHeight) / 2;
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * (seatSize + colSpacing) + seatSize / 2;
          const y = offsetY + r * (seatSize + rowSpacing) + seatSize / 2;
          const inside = isPointInPolygon({ x, y }, vertices);
          seats.push({ x, y, inside });
        }
      }
    }
    
    return seats;
  }, [selectedShape, previewDimensions, config.curvature]);

  // Capacidade real da forma (assentos que cabem)
  const realCapacity = useMemo(() => {
    return seatsInShape.filter(s => s.inside).length;
  }, [seatsInShape]);

  // Assentos fora da forma
  const seatsOutside = useMemo(() => {
    return seatsInShape.filter(s => !s.inside).length;
  }, [seatsInShape]);

  // Total configurado
  const totalConfigured = config.rows * config.cols;

  // Early return DEPOIS de todos os hooks
  if (!open) return null;

  const handleSelectShape = (shape: ShapeTemplate) => {
    setSelectedShape(shape);
    setConfig(prev => ({
      ...prev,
      shape: shape.id,
      rows: shape.defaultParams.rows || 10,
      cols: shape.defaultParams.cols || 25,
      seatSize: shape.defaultParams.seatSize || 14,
      rowSpacing: shape.defaultParams.rowSpacing || 6,
      colSpacing: shape.defaultParams.colSpacing || 2,
      curvature: shape.defaultParams.curvature || 0,
    }));
    setStep('config');
  };

  const handleComplete = () => {
    onComplete(config);
  };

  const steps = [
    { id: 'shape', label: 'Forma', icon: LayoutGrid },
    { id: 'config', label: 'Configurar', icon: Settings },
    { id: 'preview', label: 'Preview', icon: Armchair },
  ];

  const renderShapePreview = (shapeId: SectorShape) => {
    const cx = 40, cy = 40;
    switch (shapeId) {
      case 'rectangle':
        return <rect x="10" y="20" width="60" height="40" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'parallelogram':
        return <polygon points="20,20 70,20 60,60 10,60" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'trapezoid':
        return <polygon points="20,20 60,20 70,60 10,60" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'triangle':
        return <polygon points="40,15 70,65 10,65" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'pentagon':
        const r = 28;
        const pentPoints = Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={pentPoints} fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'hexagon':
        const hr = 28;
        const hexPoints = Array.from({ length: 6 }, (_, i) => {
          const angle = (i * Math.PI / 3) - Math.PI / 2;
          return `${cx + hr * Math.cos(angle)},${cy + hr * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={hexPoints} fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'octagon':
        const or = 28;
        const octPoints = Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI / 4) - Math.PI / 8;
          return `${cx + or * Math.cos(angle)},${cy + or * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={octPoints} fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'circle':
        return <ellipse cx="40" cy="40" rx="30" ry="20" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'arc':
        // Arco real com raio interno e externo (meia-lua)
        return <path d="M 10 50 A 30 25 0 0 1 70 50 L 60 50 A 20 15 0 0 0 20 50 Z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'diamond':
        return <polygon points="40,10 70,40 40,70 10,40" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'l-shape':
        return <path d="M10,10 h25 v25 h25 v25 h-50 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'u-shape':
        return <path d="M10,10 v50 h60 v-50 h-20 v30 h-20 v-30 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 't-shape':
        return <path d="M10,10 h60 v20 h-20 v30 h-20 v-30 h-20 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'z-shape':
        return <path d="M10,10 h60 v15 h-35 v20 h35 v15 h-60 v-15 h35 v-20 h-35 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'cross':
        return <path d="M25,10 h30 v15 h15 v30 h-15 v15 h-30 v-15 h-15 v-30 h15 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'arrow':
        return <polygon points="40,10 70,35 55,35 55,70 25,70 25,35 10,35" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'star':
        const sr = 30, ir = 12;
        const starPoints = Array.from({ length: 10 }, (_, i) => {
          const angle = (i * Math.PI / 5) - Math.PI / 2;
          const radius = i % 2 === 0 ? sr : ir;
          return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={starPoints} fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'wave':
        return <path d="M10,30 Q25,10 40,30 T70,30 v20 Q55,70 40,50 T10,50 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      default:
        return <rect x="10" y="20" width="60" height="40" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
    }
  };

  const renderMiniPreview = () => {
    if (!selectedShape) return null;
    
    const { width: previewWidth, height: previewHeight, seatSize } = previewDimensions;
    const bounds = { x: 0, y: 0, width: previewWidth, height: previewHeight };
    const vertices = generateVerticesForShape(selectedShape.id, bounds);
    
    // Gera path com ou sem curvatura
    const curvature = config.curvature || 0;
    const cx = previewWidth / 2;
    const cy = previewHeight / 2;
    let pathData: string;
    
    const isArcShape = selectedShape.id === 'arc' || curvature >= 80;
    const hasHighCurvature = curvature >= 40;
    
    if (isArcShape) {
      // Forma de arco completo (semicírculo superior com buraco interno)
      const outerR = Math.min(previewWidth, previewHeight) * 0.45;
      const innerR = outerR * 0.35;
      pathData = `
        M ${cx - outerR} ${cy}
        A ${outerR} ${outerR} 0 0 1 ${cx + outerR} ${cy}
        L ${cx + innerR} ${cy}
        A ${innerR} ${innerR} 0 0 0 ${cx - innerR} ${cy}
        Z
      `;
    } else if (hasHighCurvature) {
      // Transição para arco - curva mais pronunciada
      const outerR = Math.min(previewWidth, previewHeight) * 0.45;
      const innerR = outerR * Math.max(0.2, 0.6 - curvature / 150);
      const angleSpread = Math.PI * (0.5 + (curvature - 40) / 80);
      const startX = cx + outerR * Math.cos(-Math.PI / 2 - angleSpread / 2);
      const startY = cy + outerR * Math.sin(-Math.PI / 2 - angleSpread / 2);
      const endX = cx + outerR * Math.cos(-Math.PI / 2 + angleSpread / 2);
      const endY = cy + outerR * Math.sin(-Math.PI / 2 + angleSpread / 2);
      const innerStartX = cx + innerR * Math.cos(-Math.PI / 2 + angleSpread / 2);
      const innerStartY = cy + innerR * Math.sin(-Math.PI / 2 + angleSpread / 2);
      const innerEndX = cx + innerR * Math.cos(-Math.PI / 2 - angleSpread / 2);
      const innerEndY = cy + innerR * Math.sin(-Math.PI / 2 - angleSpread / 2);
      
      pathData = `
        M ${startX} ${startY}
        A ${outerR} ${outerR} 0 0 1 ${endX} ${endY}
        L ${innerStartX} ${innerStartY}
        A ${innerR} ${innerR} 0 0 0 ${innerEndX} ${innerEndY}
        Z
      `;
    } else if (curvature > 0 && vertices.length <= 8) {
      // Curvatura moderada - curva as bordas da forma
      const parts: string[] = [`M ${vertices[0].x} ${vertices[0].y}`];
      for (let i = 0; i < vertices.length; i++) {
        const current = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curveAmount = (curvature / 100) * dist * 0.4;
        
        const nx = -dy / dist;
        const ny = dx / dist;
        
        const cpX = midX + nx * curveAmount;
        const cpY = midY + ny * curveAmount;
        
        parts.push(`Q ${cpX} ${cpY} ${next.x} ${next.y}`);
      }
      pathData = parts.join(' ');
    } else {
      // Sem curvatura - polígono normal
      pathData = vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ') + ' Z';
    }
    
    const insideSeats = seatsInShape.filter(s => s.inside);

    // Renderiza mesa ou cadeira baseado no tipo de mobília
    const renderSeat = (seat: { x: number; y: number; inside: boolean }, i: number) => {
      if (!seat.inside) return null;
      
      if (config.furnitureType === 'table' || config.furnitureType === 'bistro') {
        // Renderiza mesa com cadeiras ao redor - tamanhos proporcionais ao seatSize
        const tableSize = seatSize * 0.4; // Mesa ocupa 40% do espaço
        const chairSize = seatSize * 0.12; // Cadeiras menores
        const chairCount = config.chairsPerTable;
        const chairDist = tableSize + chairSize + 2; // Distância das cadeiras à mesa
        
        return (
          <g key={i}>
            {/* Mesa */}
            {config.tableShape === 'round' ? (
              <circle cx={seat.x} cy={seat.y} r={tableSize} fill="#8B4513" stroke="#5D2E0C" strokeWidth="1" />
            ) : config.tableShape === 'square' ? (
              <rect x={seat.x - tableSize} y={seat.y - tableSize} width={tableSize * 2} height={tableSize * 2} fill="#8B4513" stroke="#5D2E0C" strokeWidth="1" />
            ) : (
              <rect x={seat.x - tableSize * 1.3} y={seat.y - tableSize * 0.7} width={tableSize * 2.6} height={tableSize * 1.4} fill="#8B4513" stroke="#5D2E0C" strokeWidth="1" rx="2" />
            )}
            {/* Cadeiras ao redor */}
            {Array.from({ length: chairCount }).map((_, ci) => {
              const angle = (ci * 2 * Math.PI / chairCount) - Math.PI / 2;
              const cx = seat.x + chairDist * Math.cos(angle);
              const cy = seat.y + chairDist * Math.sin(angle);
              return (
                <circle key={ci} cx={cx} cy={cy} r={chairSize} fill={SEAT_COLORS[config.seatType]} opacity={0.9} />
              );
            })}
          </g>
        );
      }
      
      // Cadeira simples
      const seatRadius = Math.max(2, seatSize / 2);
      return (
        <circle
          key={i}
          cx={seat.x}
          cy={seat.y}
          r={seatRadius}
          fill={SEAT_COLORS[config.seatType]}
          opacity={0.9}
        />
      );
    };

    // Calcula capacidade real da forma
    const capacidadeReal = insideSeats.length;
    const capacidadeSolicitada = config.rows * config.cols;
    const taxaAproveitamento = capacidadeSolicitada > 0 ? Math.round((capacidadeReal / capacidadeSolicitada) * 100) : 0;

    return (
      <div className="flex flex-col items-center gap-2">
        <svg width={previewWidth} height={previewHeight} className="border border-border rounded-lg bg-muted/20">
          {/* Forma do setor */}
          <path 
            d={pathData} 
            fill="hsl(var(--primary) / 0.15)" 
            stroke="hsl(var(--primary))" 
            strokeWidth="2" 
          />
          {/* Assentos/Mesas dentro da forma */}
          {seatsInShape.map(renderSeat)}
        </svg>
        
        <div className="text-xs text-muted-foreground mt-2 text-center space-y-1">
          <div>
            <strong className="text-primary">{capacidadeReal}</strong> {config.furnitureType === 'chair' ? 'assentos' : 'mesas'} cabem na forma
          </div>
          <div className="text-[10px]">
            ({taxaAproveitamento}% de aproveitamento do grid {config.rows}x{config.cols})
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
        {/* Header with steps */}
        <div className="px-8 py-4 border-b border-border bg-muted/30 shrink-0">
          <h1 className="text-2xl font-bold mb-3">Criar Novo Setor</h1>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => {
                    if (s.id === 'shape') setStep('shape');
                    else if (s.id === 'config' && selectedShape) setStep('config');
                    else if (s.id === 'preview' && selectedShape) setStep('preview');
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    step === s.id 
                      ? "bg-primary text-primary-foreground" 
                      : steps.findIndex(x => x.id === step) > index
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content - altura fixa com scroll */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Step 1: Shape Selection */}
          {step === 'shape' && (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Escolha a forma do setor</h2>
                  <p className="text-sm text-muted-foreground">
                    Selecione a geometria que melhor se adapta ao seu espaço
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 pb-4">
                  {shapeTemplates.map((shape) => (
                    <button
                      key={shape.id}
                      onClick={() => handleSelectShape(shape)}
                      className={cn(
                        "group text-left p-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
                        selectedShape?.id === shape.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      <div className="flex justify-center mb-2 text-primary">
                        <svg viewBox="0 0 80 80" className="w-16 h-16">
                          {renderShapePreview(shape.id)}
                        </svg>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="[&>svg]:h-4 [&>svg]:w-4">{shape.icon}</span>
                        <h3 className="font-semibold text-sm">{shape.name}</h3>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center leading-tight">
                        {shape.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Step 2: Configuration */}
          {step === 'config' && selectedShape && (
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Config form */}
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold mb-1">Configure o setor: {selectedShape.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Ajuste os parâmetros de assentos
                      </p>
                    </div>

                    <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Número de Setores</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[config.sectors]}
                          onValueChange={([v]) => setConfig(prev => ({ ...prev, sectors: v }))}
                          min={1}
                          max={8}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={config.sectors}
                          onChange={(e) => setConfig(prev => ({ ...prev, sectors: parseInt(e.target.value) || 1 }))}
                          className="w-20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Fileiras</Label>
                        <Input
                          type="number"
                          value={config.rows}
                          onChange={(e) => setConfig(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                          className="mt-2"
                          min={1}
                          max={100}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Assentos por Fileira</Label>
                        <Input
                          type="number"
                          value={config.cols}
                          onChange={(e) => setConfig(prev => ({ ...prev, cols: parseInt(e.target.value) || 1 }))}
                          className="mt-2"
                          min={1}
                          max={100}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Tamanho do Assento (px)</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[config.seatSize]}
                          onValueChange={([v]) => setConfig(prev => ({ ...prev, seatSize: v }))}
                          min={8}
                          max={24}
                          step={1}
                          className="flex-1"
                        />
                        <span className="w-16 text-sm text-muted-foreground">{config.seatSize}px</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Espaçamento Fileiras</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Slider
                            value={[config.rowSpacing]}
                            onValueChange={([v]) => setConfig(prev => ({ ...prev, rowSpacing: v }))}
                            min={2}
                            max={20}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-10 text-xs text-muted-foreground">{config.rowSpacing}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Espaçamento Colunas</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Slider
                            value={[config.colSpacing]}
                            onValueChange={([v]) => setConfig(prev => ({ ...prev, colSpacing: v }))}
                            min={1}
                            max={10}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-10 text-xs text-muted-foreground">{config.colSpacing}</span>
                        </div>
                      </div>
                    </div>

                    {/* Curvatura */}
                    <div>
                      <Label className="text-sm font-medium">Curvatura da Forma</Label>
                      <p className="text-xs text-muted-foreground mb-2">Transforme formas retas em arcos</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[config.curvature]}
                          onValueChange={([v]) => setConfig(prev => ({ ...prev, curvature: v }))}
                          min={0}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="w-16 text-sm text-muted-foreground">{config.curvature}%</span>
                      </div>
                    </div>

                    {/* Tipo de Assento */}
                    <div>
                      <Label className="text-sm font-medium">Tipo de Assento Padrão</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {seatTypeOptions.map(({ type, label }) => (
                          <button
                            key={type}
                            onClick={() => setConfig(prev => ({ ...prev, seatType: type }))}
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                              config.seatType === type
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: SEAT_COLORS[type] }}
                            />
                            <span className="text-xs">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Configurações de Rotulação */}
                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <Label className="text-sm font-medium">Numeração de Fileiras e Assentos</Label>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Tipo de Fileira</Label>
                          <Select
                            value={config.rowLabelType}
                            onValueChange={(v: RowLabelType) => setConfig(prev => ({ ...prev, rowLabelType: v }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alpha">Letras (A, B, C...)</SelectItem>
                              <SelectItem value="numeric">Números (1, 2, 3...)</SelectItem>
                              <SelectItem value="roman">Romanos (I, II, III...)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Início Fileira</Label>
                          <Input
                            value={config.rowLabelStart}
                            onChange={(e) => setConfig(prev => ({ ...prev, rowLabelStart: e.target.value }))}
                            className="mt-1"
                            placeholder={config.rowLabelType === 'alpha' ? 'A' : '1'}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Tipo de Numeração</Label>
                          <Select
                            value={config.seatLabelType}
                            onValueChange={(v: SeatLabelType) => setConfig(prev => ({ ...prev, seatLabelType: v }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="numeric">Sequencial (1, 2, 3...)</SelectItem>
                              <SelectItem value="odd-left">Ímpares à esquerda</SelectItem>
                              <SelectItem value="even-left">Pares à esquerda</SelectItem>
                              <SelectItem value="reverse">Inverter por fileira</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Início Assento</Label>
                          <Input
                            type="number"
                            value={config.seatLabelStart}
                            onChange={(e) => setConfig(prev => ({ ...prev, seatLabelStart: parseInt(e.target.value) || 1 }))}
                            className="mt-1"
                            min={1}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Prefixo (opcional)</Label>
                        <Input
                          value={config.prefix}
                          onChange={(e) => setConfig(prev => ({ ...prev, prefix: e.target.value }))}
                          className="mt-1"
                          placeholder="Ex: VIP-, A-"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Exemplo: {config.prefix}{config.rowLabelStart}
                          {config.seatLabelStart}
                        </p>
                      </div>
                    </div>

                    {/* Tipo de Mobília */}
                    <div>
                      <Label className="text-sm font-medium">Tipo de Mobília</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {(['chair', 'table', 'bistro'] as FurnitureType[]).map((ft) => (
                          <button
                            key={ft}
                            onClick={() => setConfig(prev => ({ ...prev, furnitureType: ft }))}
                            className={cn(
                              "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                              config.furnitureType === ft
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {ft === 'chair' && <Armchair className="h-5 w-5" />}
                            {ft === 'table' && <Square className="h-5 w-5" />}
                            {ft === 'bistro' && <Circle className="h-5 w-5" />}
                            <span className="text-xs">{FURNITURE_LABELS[ft]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Config mesa/bistrô */}
                    {(config.furnitureType === 'table' || config.furnitureType === 'bistro') && (
                      <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Formato da Mesa</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {(['round', 'square', 'rectangular'] as TableShape[]).map((ts) => (
                              <button
                                key={ts}
                                onClick={() => setConfig(prev => ({ ...prev, tableShape: ts }))}
                                className={cn(
                                  "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                                  config.tableShape === ts
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                {ts === 'round' && <Circle className="h-4 w-4" />}
                                {ts === 'square' && <Square className="h-4 w-4" />}
                                {ts === 'rectangular' && <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="1" /></svg>}
                                <span className="text-[10px]">{ts === 'round' ? 'Redonda' : ts === 'square' ? 'Quadrada' : 'Retangular'}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Cadeiras por Mesa: {config.chairsPerTable}</Label>
                          <Slider
                            value={[config.chairsPerTable]}
                            onValueChange={([v]) => setConfig(prev => ({ ...prev, chairsPerTable: v }))}
                            min={2}
                            max={12}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live preview */}
                <div className="bg-muted/30 rounded-xl p-6 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <svg viewBox="0 0 80 80" className="w-12 h-12 text-primary">
                      {renderShapePreview(selectedShape.id)}
                    </svg>
                    <h3 className="text-sm font-medium text-muted-foreground">{selectedShape.name}</h3>
                  </div>
                  
                  {renderMiniPreview()}
                  
                  {/* Aviso quando há assentos fora da forma */}
                  {seatsOutside > 0 && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 w-full max-w-xs">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        <strong>{seatsOutside}</strong> {config.furnitureType === 'chair' ? 'assentos' : 'mesas'} fora do setor. 
                        Ajuste as configurações ou escolha uma forma mais adequada.
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 p-4 bg-background rounded-lg w-full max-w-xs">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Configurado:</span>
                        <span className="font-medium">{totalConfigured.toLocaleString()} {config.furnitureType === 'chair' ? 'assentos' : 'mesas'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacidade real:</span>
                        <span className={cn("font-medium", seatsOutside > 0 ? "text-amber-500" : "text-primary")}>
                          {realCapacity.toLocaleString()} {config.furnitureType === 'chair' ? 'assentos' : 'mesas'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aproveitamento:</span>
                        <span className={cn("font-medium", realCapacity / totalConfigured >= 0.9 ? "text-green-500" : "text-amber-500")}>
                          {totalConfigured > 0 ? Math.round((realCapacity / totalConfigured) * 100) : 0}%
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total ({config.sectors} {config.sectors > 1 ? 'setores' : 'setor'}):</span>
                          <span className="font-bold text-primary">{(realCapacity * config.sectors).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </ScrollArea>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && selectedShape && (
            <ScrollArea className="h-full">
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Confirme sua configuração</h2>
                  <p className="text-sm text-muted-foreground">
                    Revise os parâmetros antes de criar
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-muted/30 rounded-xl p-6 text-center">
                    <svg viewBox="0 0 80 80" className="w-24 h-24 mx-auto text-primary mb-4">
                      {renderShapePreview(selectedShape.id)}
                    </svg>
                    <h3 className="text-xl font-bold">{selectedShape.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{selectedShape.description}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium mb-3">Resumo</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Setores:</dt>
                          <dd className="font-medium">{config.sectors}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Fileiras por setor:</dt>
                          <dd className="font-medium">{config.rows}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Assentos por fileira:</dt>
                          <dd className="font-medium">{config.cols}</dd>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 mt-2">
                          <dt className="text-muted-foreground">Capacidade por setor:</dt>
                          <dd className="font-bold text-primary">{realCapacity.toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Total de {config.furnitureType === 'chair' ? 'assentos' : 'mesas'}:</dt>
                          <dd className="font-bold text-primary">{(realCapacity * config.sectors).toLocaleString()}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Após criar, você poderá ajustar os vértices da forma diretamente no canvas para personalizar o layout.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border bg-muted/30 flex justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          
          <div className="flex gap-2">
            {step !== 'shape' && (
              <Button
                variant="outline"
                onClick={() => setStep(step === 'preview' ? 'config' : 'shape')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            
            {step === 'config' && (
              <Button onClick={() => setStep('preview')}>
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            
            {step === 'preview' && (
              <Button onClick={handleComplete}>
                <Check className="h-4 w-4 mr-1" />
                Criar Setor
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
