import React from 'react';
import { 
  Theater, 
  Music2, 
  Beer, 
  DoorOpen, 
  DoorClosed,
  Speaker,
  Headphones,
  Monitor,
  Star,
  UtensilsCrossed,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ElementType, ELEMENT_ICONS } from '@/types/mapStudio';

interface ElementsPanelProps {
  onAddElement: (type: ElementType) => void;
}

const elementOptions: { type: ElementType; label: string; icon: React.ReactNode }[] = [
  { type: 'stage', label: 'Palco', icon: <Theater className="h-4 w-4" /> },
  { type: 'speaker', label: 'Caixa de Som', icon: <Speaker className="h-4 w-4" /> },
  { type: 'dj', label: 'DJ Booth', icon: <Headphones className="h-4 w-4" /> },
  { type: 'bar', label: 'Bar', icon: <Beer className="h-4 w-4" /> },
  { type: 'food', label: 'Alimentação', icon: <UtensilsCrossed className="h-4 w-4" /> },
  { type: 'entrance', label: 'Entrada', icon: <DoorOpen className="h-4 w-4" /> },
  { type: 'exit', label: 'Saída', icon: <DoorClosed className="h-4 w-4" /> },
  { type: 'bathroom', label: 'Banheiro', icon: <Music2 className="h-4 w-4" /> },
  { type: 'screen', label: 'Telão', icon: <Monitor className="h-4 w-4" /> },
  { type: 'vip-area', label: 'Área VIP', icon: <Star className="h-4 w-4" /> },
  { type: 'custom', label: 'Personalizado', icon: <Package className="h-4 w-4" /> },
];

export const ElementsPanel: React.FC<ElementsPanelProps> = ({ onAddElement }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {elementOptions.map(({ type, label, icon }) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 justify-start h-auto py-2 px-3"
          onClick={() => onAddElement(type)}
        >
          <span className="text-lg">{ELEMENT_ICONS[type]}</span>
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
};
