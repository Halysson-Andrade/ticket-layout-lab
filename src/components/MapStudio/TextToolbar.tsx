import React from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import { TextElement } from '@/types/mapStudio';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface TextToolbarProps {
  textElement: TextElement;
  position: { x: number; y: number }; // screen coords above the text
  onUpdate: (id: string, updates: Partial<TextElement>) => void;
  onDelete: (id: string) => void;
}

const FONTS = ['sans-serif', 'serif', 'monospace', 'Arial', 'Georgia', 'Courier New', 'Verdana', 'Impact'];

const TEXT_COLORS = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export const TextToolbar: React.FC<TextToolbarProps> = ({ textElement, position, onUpdate, onDelete }) => {
  const id = textElement.id;

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-xl px-2 py-1.5"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%) translateY(-8px)' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Font family */}
      <Select value={textElement.fontFamily} onValueChange={(v) => onUpdate(id, { fontFamily: v })}>
        <SelectTrigger className="h-7 w-24 text-[10px] border-none shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map(f => (
            <SelectItem key={f} value={f}>
              <span style={{ fontFamily: f }} className="text-xs">{f}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font size */}
      <Input
        type="number"
        value={textElement.fontSize}
        onChange={(e) => onUpdate(id, { fontSize: Math.max(8, parseInt(e.target.value) || 14) })}
        className="h-7 w-12 text-[10px] text-center border-none shadow-none"
        min={8}
        max={200}
      />

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Bold */}
      <button
        className={`p-1.5 rounded transition-all ${textElement.fontWeight === 'bold' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
        onClick={() => onUpdate(id, { fontWeight: textElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* Italic */}
      <button
        className={`p-1.5 rounded transition-all ${textElement.fontStyle === 'italic' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
        onClick={() => onUpdate(id, { fontStyle: textElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* Underline */}
      <button
        className={`p-1.5 rounded transition-all ${textElement.textDecoration === 'underline' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
        onClick={() => onUpdate(id, { textDecoration: textElement.textDecoration === 'underline' ? 'none' : 'underline' })}
      >
        <Underline className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Alignment */}
      <button
        className={`p-1.5 rounded transition-all ${textElement.textAlign === 'left' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
        onClick={() => onUpdate(id, { textAlign: 'left' })}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
      <button
        className={`p-1.5 rounded transition-all ${textElement.textAlign === 'center' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
        onClick={() => onUpdate(id, { textAlign: 'center' })}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </button>
      <button
        className={`p-1.5 rounded transition-all ${textElement.textAlign === 'right' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
        onClick={() => onUpdate(id, { textAlign: 'right' })}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Color */}
      <div className="flex items-center gap-0.5">
        {TEXT_COLORS.map(c => (
          <button
            key={c}
            className={`w-4 h-4 rounded-sm border transition-all hover:scale-125 ${
              textElement.color === c ? 'border-primary ring-1 ring-primary/30 scale-110' : 'border-border/50'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => onUpdate(id, { color: c })}
          />
        ))}
        <input
          type="color"
          value={textElement.color}
          onChange={(e) => onUpdate(id, { color: e.target.value })}
          className="w-4 h-4 rounded cursor-pointer border border-border/50"
        />
      </div>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Delete */}
      <button
        className="p-1.5 rounded transition-all hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
