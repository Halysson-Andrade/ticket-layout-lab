import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getMapContentExtent } from '@/lib/mapUtils';
import type { Sector, VenueElement, TextElement, Seat } from '@/types/mapStudio';
import { SEAT_COLORS } from '@/types/mapStudio';

interface MapPreviewSVGProps {
  sectors: Sector[];
  elements?: VenueElement[];
  textElements?: TextElement[];
  width: number;
  height: number;
  backgroundImage?: string | null;
  bgConfig?: { url: string; opacity: number; scale: number; x: number; y: number } | null;
  hoveredSectorId?: string | null;
  selectedSectorId?: string | null;
  onHoverSector?: (id: string | null) => void;
  onClickSector?: (id: string) => void;
  className?: string;
  focusBounds?: { x: number; y: number; w: number; h: number } | null;
  selectedSeatIds?: string[];
  onClickSeat?: (seat: Seat, sector: Sector) => void;
  showSeatLabels?: boolean;
  interactive?: boolean;
  // Como exibir o nome do setor sobre o mapa: sempre, só no hover (tooltip) ou nunca
  sectorLabelMode?: 'always' | 'hover' | 'none';
  // Setores a esmaecer (cinza) — ex.: fora do orçamento escolhido na régua de preço.
  // Puramente visual: o setor continua clicável e volta à cor real ao hover/seleção.
  dimmedSectorIds?: string[];
}


// Constrói o path do setor respeitando curvas bézier (controlPoint), igual ao construtor.
// Convenção: v.controlPoint é o ponto de controle da aresta que TERMINA em v.
const verticesToPath = (vertices: { x: number; y: number; controlPoint?: { x: number; y: number } }[]) => {
  if (!vertices.length) return '';
  const [first] = vertices;
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < vertices.length; i++) {
    const v = vertices[i];
    d += v.controlPoint ? ` Q ${v.controlPoint.x} ${v.controlPoint.y} ${v.x} ${v.y}` : ` L ${v.x} ${v.y}`;
  }
  // Aresta de fechamento (último -> primeiro) usa o controlPoint do primeiro vértice
  d += first.controlPoint ? ` Q ${first.controlPoint.x} ${first.controlPoint.y} ${first.x} ${first.y}` : ' Z';
  return d;
};

export const MapPreviewSVG: React.FC<MapPreviewSVGProps> = ({
  sectors,
  elements = [],
  textElements = [],
  width,
  height,
  backgroundImage,
  bgConfig,
  hoveredSectorId,
  selectedSectorId,
  onHoverSector,
  onClickSector,
  className,
  focusBounds,
  selectedSeatIds,
  onClickSeat,
  showSeatLabels = false,
  interactive = true,
  sectorLabelMode = 'always',
  dimmedSectorIds,
}) => {
  const selectedSeatSet = useMemo(() => new Set(selectedSeatIds ?? []), [selectedSeatIds]);
  const dimmedSet = useMemo(() => new Set(dimmedSectorIds ?? []), [dimmedSectorIds]);

  // Cor do assento por tipo. 'normal' fica branco (o verde de "selecionado" precisa se
  // distinguir; SEAT_COLORS.normal também é verde). Demais tipos usam a cor do tipo.
  const seatTypeFill = (seat: Seat): string =>
    seat.type && seat.type !== 'normal' ? SEAT_COLORS[seat.type] : 'rgba(255,255,255,0.9)';

  // Compute fit bounds from visible content (setores + elementos como palco/telão + textos),
  // considerando a rotação de cada item para não cortar nas laterais.
  const bounds = useMemo(() => {
    const ext = getMapContentExtent(sectors, elements, textElements);
    if (!ext) {
      return { x: 0, y: 0, w: width, h: height };
    }
    const pad = 60;
    return {
      x: ext.minX - pad,
      y: ext.minY - pad,
      w: Math.max(100, ext.maxX - ext.minX + pad * 2),
      h: Math.max(100, ext.maxY - ext.minY + pad * 2),
    };
  }, [sectors, elements, textElements, width, height]);

  const finalBounds = focusBounds
    ? { x: focusBounds.x, y: focusBounds.y, w: focusBounds.w, h: focusBounds.h }
    : bounds;

  return (
    <svg
      className={cn('w-full h-full block', className)}
      viewBox={`${finalBounds.x} ${finalBounds.y} ${finalBounds.w} ${finalBounds.h}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ transition: 'all 400ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}
    >
      {backgroundImage && bgConfig && (
        <image
          href={backgroundImage}
          x={bgConfig.x}
          y={bgConfig.y}
          width={width * bgConfig.scale}
          height={height * bgConfig.scale}
          opacity={bgConfig.opacity / 100}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {/* Elements (palco, decoração) */}
      {elements.map((el) => (
        <g key={el.id} transform={`rotate(${el.rotation || 0} ${el.bounds.x + el.bounds.width / 2} ${el.bounds.y + el.bounds.height / 2})`}>
          <rect
            x={el.bounds.x}
            y={el.bounds.y}
            width={el.bounds.width}
            height={el.bounds.height}
            fill={el.color || '#475569'}
            opacity={0.85}
            rx={6}
          />
          {el.label && (
            <text
              x={el.bounds.x + el.bounds.width / 2}
              y={el.bounds.y + el.bounds.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={Math.min(el.bounds.width, el.bounds.height) * 0.25}
              fontWeight="bold"
            >
              {el.label}
            </text>
          )}
        </g>
      ))}

      {/* Sectors */}
      {sectors.map((s) => {
        if (s.visible === false) return null;
        const isHover = hoveredSectorId === s.id;
        const isSelected = selectedSectorId === s.id;
        // Esmaecido só quando não está em foco: hover/seleção sempre revelam a cor real.
        const isDimmed = dimmedSet.has(s.id) && !isHover && !isSelected;
        const cx = s.bounds.x + s.bounds.width / 2;
        const cy = s.bounds.y + s.bounds.height / 2;
        const seatBaseR = Math.max(2, (s.seatSize ?? 14) * 0.35);
        const seatR = showSeatLabels ? Math.max(6, (s.seatSize ?? 14) * 0.5) : seatBaseR;
        return (
          <g
            key={s.id}
            transform={`rotate(${s.rotation || 0} ${cx} ${cy})`}
            className={interactive ? 'cursor-pointer' : undefined}
            onMouseEnter={interactive ? () => onHoverSector?.(s.id) : undefined}
            onMouseLeave={interactive ? () => onHoverSector?.(null) : undefined}
            onClick={interactive ? () => onClickSector?.(s.id) : undefined}
          >
            <path
              d={verticesToPath(s.vertices)}
              fill={isDimmed ? '#94a3b8' : s.color}
              fillOpacity={isDimmed ? 0.35 : (isHover || isSelected ? 0.95 : (s.opacity ?? 60) / 100)}
              stroke={isSelected ? '#0f172a' : isHover ? '#1e293b' : 'rgba(0,0,0,0.25)'}
              strokeWidth={isSelected ? 3 : 1.5}
              style={{ transition: 'fill-opacity 120ms, stroke 120ms' }}
            />
            {/* Seats — setor em foco renderiza TODOS os assentos (compra); demais mantêm cap por performance */}
            {s.seats.slice(0, s.id === selectedSectorId ? s.seats.length : (showSeatLabels ? 2000 : 600)).map((seat) => {
              const isSeatSelected = selectedSeatSet.has(seat.id);
              const isBlocked = seat.status === 'blocked' || seat.status === 'sold' || seat.type === 'blocked';
              const isSpecial = !isSeatSelected && !isBlocked && !isDimmed && seat.type && seat.type !== 'normal';
              const fill = isSeatSelected
                ? '#11CC35'
                : isBlocked
                ? 'rgba(148,163,184,0.6)'
                : isDimmed
                ? 'rgba(203,213,225,0.7)'
                : seatTypeFill(seat);
              const handleSeatClick = (e: React.MouseEvent) => {
                if (!interactive || !onClickSeat || isBlocked) return;
                e.stopPropagation();
                onClickSeat(seat, s);
              };
              const seatCursor = interactive && onClickSeat && !isBlocked ? 'pointer' : undefined;

              // Mesa/bistrô: espelha o desenho do construtor (mesa + cadeiras ao redor)
              const isTable = seat.furnitureType === 'table' || seat.furnitureType === 'bistro';
              if (isTable) {
                const cfg = seat.tableConfig || { shape: 'round' as const, chairCount: 4, tableWidth: 40, tableHeight: 40, chairStartAngle: 0 };
                const tW = cfg.tableWidth || 40;
                const tH = cfg.tableHeight || 40;
                const chairR = cfg.chairRadius || 6;
                const tCenterX = seat.x + tW / 2;
                const tCenterY = seat.y + tH / 2;
                const defaultColor = seat.furnitureType === 'bistro' ? '#8b5cf6' : '#64748b';
                const tableFill = isSeatSelected
                  ? '#11CC35'
                  : isBlocked
                  ? 'rgba(148,163,184,0.7)'
                  : isDimmed
                  ? 'rgba(203,213,225,0.7)'
                  : seat.type && seat.type !== 'normal'
                  ? SEAT_COLORS[seat.type]
                  : (cfg.tableColor || defaultColor);
                const chairFill = isBlocked || isDimmed ? 'rgba(148,163,184,0.5)' : 'rgba(255,255,255,0.9)';
                const startAngle = ((cfg.chairStartAngle || 0) * Math.PI) / 180;
                const chairs = [];
                for (let i = 0; i < (cfg.chairCount || 0); i++) {
                  const angle = cfg.chairAngles && cfg.chairAngles.length === cfg.chairCount
                    ? (cfg.chairAngles[i] * Math.PI) / 180
                    : startAngle + (i / cfg.chairCount) * Math.PI * 2 - Math.PI / 2;
                  const cos = Math.cos(angle), sin = Math.sin(angle);
                  let chX: number, chY: number;
                  if (cfg.shape === 'round') {
                    const dist = Math.min(tW, tH) / 2 + chairR + 1;
                    chX = tCenterX + cos * dist;
                    chY = tCenterY + sin * dist;
                  } else {
                    const scaleX = cos !== 0 ? Math.abs((tW / 2) / cos) : Infinity;
                    const scaleY = sin !== 0 ? Math.abs((tH / 2) / sin) : Infinity;
                    const sc = Math.min(scaleX, scaleY);
                    chX = tCenterX + cos * (sc + chairR + 1);
                    chY = tCenterY + sin * (sc + chairR + 1);
                  }
                  chairs.push(<circle key={i} cx={chX} cy={chY} r={chairR} fill={chairFill} stroke="rgba(0,0,0,0.3)" strokeWidth={0.4} pointerEvents="none" />);
                }
                return (
                  <g key={seat.id} onClick={handleSeatClick} style={{ cursor: seatCursor }}>
                    {chairs}
                    {cfg.shape === 'round' ? (
                      <circle cx={tCenterX} cy={tCenterY} r={Math.min(tW, tH) / 2} fill={tableFill} stroke={isSeatSelected ? '#0a8a26' : 'rgba(0,0,0,0.35)'} strokeWidth={isSeatSelected ? 1.5 : 0.6} />
                    ) : (
                      <rect x={seat.x} y={seat.y} width={tW} height={tH} rx={3} fill={tableFill} stroke={isSeatSelected ? '#0a8a26' : 'rgba(0,0,0,0.35)'} strokeWidth={isSeatSelected ? 1.5 : 0.6} />
                    )}
                    {showSeatLabels && seat.number && (
                      <text x={tCenterX} y={tCenterY} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(tW, tH) * 0.3} fontWeight={700} fill="#fff" pointerEvents="none">
                        {seat.number}
                      </text>
                    )}
                  </g>
                );
              }

              return (
                <g key={seat.id}>
                  <circle
                    cx={seat.x}
                    cy={seat.y}
                    r={seatR}
                    fill={fill}
                    stroke={isSeatSelected ? '#0a8a26' : 'rgba(0,0,0,0.35)'}
                    strokeWidth={isSeatSelected ? 1.5 : 0.5}
                    onClick={handleSeatClick}
                    style={{ cursor: seatCursor }}
                  />
                  {showSeatLabels && seat.number && (
                    <text
                      x={seat.x}
                      y={seat.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={seatR * 0.9}
                      fontWeight={700}
                      fill={isSeatSelected || isSpecial ? '#fff' : '#0f172a'}
                      pointerEvents="none"
                    >
                      {seat.number}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Sector label — modo 'always' (padrão) mostra sempre; 'hover' vira tooltip
                (só aparece ao passar/selecionar); 'none' nunca. Some quando há rótulos de assento. */}
            {!showSeatLabels && sectorLabelMode !== 'none' && (sectorLabelMode === 'always' || isHover || isSelected) && (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#0f172a"
                fontSize={Math.max(14, Math.min(s.bounds.width, s.bounds.height) * 0.12)}
                fontWeight="bold"
                style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.95)', strokeWidth: 4 }}
                pointerEvents="none"
              >
                {s.sectorLabel || s.name}
              </text>
            )}
          </g>
        );
      })}


      {/* Text overlays */}
      {textElements.map((t) => (
        <text
          key={t.id}
          x={t.x}
          y={t.y}
          fill={t.color}
          fontFamily={t.fontFamily}
          fontSize={t.fontSize}
          fontWeight={t.fontWeight}
          fontStyle={t.fontStyle}
          textAnchor={t.textAlign === 'center' ? 'middle' : t.textAlign === 'right' ? 'end' : 'start'}
          transform={`rotate(${t.rotation || 0} ${t.x} ${t.y})`}
        >
          {t.text}
        </text>
      ))}
    </svg>
  );
};
