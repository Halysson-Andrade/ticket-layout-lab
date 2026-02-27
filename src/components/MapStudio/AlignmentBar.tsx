import React from 'react';
import { 
  AlignStartVertical, 
  AlignCenterVertical, 
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  ArrowRightLeft,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

export type AlignType = 
  | 'left' | 'center-h' | 'right' 
  | 'top' | 'center-v' | 'bottom' 
  | 'distribute-h' | 'distribute-v';

interface AlignmentBarProps {
  onAlign: (type: AlignType) => void;
  itemCount: number;
  itemLabel?: string;
}

interface AlignButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const AlignButton: React.FC<AlignButtonProps> = ({ icon, label, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onClick}
      >
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <span>{label}</span>
    </TooltipContent>
  </Tooltip>
);

export const AlignmentBar: React.FC<AlignmentBarProps> = ({ onAlign, itemCount, itemLabel = 'setores' }) => {
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-2 py-1 shadow-lg">
      <span className="text-xs text-muted-foreground mr-1.5 whitespace-nowrap">
        {itemCount} {itemLabel}
      </span>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Alinhamento Horizontal */}
      <AlignButton
        icon={<AlignStartVertical className="h-4 w-4" />}
        label="Alinhar à esquerda"
        onClick={() => onAlign('left')}
      />
      <AlignButton
        icon={<AlignCenterVertical className="h-4 w-4" />}
        label="Centralizar horizontalmente"
        onClick={() => onAlign('center-h')}
      />
      <AlignButton
        icon={<AlignEndVertical className="h-4 w-4" />}
        label="Alinhar à direita"
        onClick={() => onAlign('right')}
      />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Alinhamento Vertical */}
      <AlignButton
        icon={<AlignStartHorizontal className="h-4 w-4" />}
        label="Alinhar ao topo"
        onClick={() => onAlign('top')}
      />
      <AlignButton
        icon={<AlignCenterHorizontal className="h-4 w-4" />}
        label="Centralizar verticalmente"
        onClick={() => onAlign('center-v')}
      />
      <AlignButton
        icon={<AlignEndHorizontal className="h-4 w-4" />}
        label="Alinhar à base"
        onClick={() => onAlign('bottom')}
      />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Distribuir */}
      <AlignButton
        icon={<ArrowRightLeft className="h-4 w-4" />}
        label="Distribuir horizontalmente"
        onClick={() => onAlign('distribute-h')}
      />
      <AlignButton
        icon={<ArrowUpDown className="h-4 w-4" />}
        label="Distribuir verticalmente"
        onClick={() => onAlign('distribute-v')}
      />
    </div>
  );
};
