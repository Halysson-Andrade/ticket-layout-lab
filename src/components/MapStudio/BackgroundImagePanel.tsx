import React from 'react';
import { Image, Trash2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface BackgroundImageConfig {
  url: string;
  opacity: number;
  scale: number;
  x: number;
  y: number;
}

interface BackgroundImagePanelProps {
  config: BackgroundImageConfig | null;
  onConfigChange: (config: BackgroundImageConfig | null) => void;
  onImportImage: () => void;
}

export const BackgroundImagePanel: React.FC<BackgroundImagePanelProps> = ({
  config,
  onConfigChange,
  onImportImage,
}) => {
  if (!config) {
    return (
      <div className="absolute top-20 right-80 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={onImportImage}
          className="bg-card/95 backdrop-blur-sm shadow-lg"
        >
          <Image className="h-4 w-4 mr-2" />
          Importar Imagem de Fundo
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute top-20 right-80 w-64 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Image className="h-4 w-4" />
          Imagem de Fundo
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onConfigChange(null)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview da imagem */}
      <div className="aspect-video bg-muted rounded overflow-hidden border">
        <img 
          src={config.url} 
          alt="Background preview" 
          className="w-full h-full object-cover"
          style={{ opacity: config.opacity / 100 }}
        />
      </div>

      {/* Opacidade */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Opacidade</Label>
          <span className="text-xs text-muted-foreground">{config.opacity}%</span>
        </div>
        <Slider
          value={[config.opacity]}
          onValueChange={([value]) => onConfigChange({ ...config, opacity: value })}
          min={10}
          max={100}
          step={5}
        />
      </div>

      {/* Escala */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Escala</Label>
          <span className="text-xs text-muted-foreground">{config.scale}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onConfigChange({ ...config, scale: Math.max(10, config.scale - 10) })}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Slider
            value={[config.scale]}
            onValueChange={([value]) => onConfigChange({ ...config, scale: value })}
            min={10}
            max={200}
            step={5}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onConfigChange({ ...config, scale: Math.min(200, config.scale + 10) })}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Posição */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Move className="h-3 w-3" />
          Posição
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">X</Label>
            <Input
              type="number"
              value={config.x}
              onChange={(e) => onConfigChange({ ...config, x: parseInt(e.target.value) || 0 })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Y</Label>
            <Input
              type="number"
              value={config.y}
              onChange={(e) => onConfigChange({ ...config, y: parseInt(e.target.value) || 0 })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onConfigChange({ ...config, x: 0, y: 0, scale: 100 })}
        >
          Resetar Posição
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={onImportImage}
        >
          Trocar Imagem
        </Button>
      </div>
    </div>
  );
};

export type { BackgroundImageConfig };