import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PropertySliderProps {
  label: string;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  debounceMs?: number;
  showInput?: boolean;
  className?: string;
}

export const PropertySlider: React.FC<PropertySliderProps> = ({
  label,
  icon,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  onChangeEnd,
  debounceMs = 0,
  showInput = true,
  className,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout>();
  const isSliding = useRef(false);

  // Sincroniza com valor externo quando não está deslizando
  useEffect(() => {
    if (!isSliding.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleSliderChange = useCallback((values: number[]) => {
    const newValue = values[0];
    setLocalValue(newValue);
    isSliding.current = true;

    if (debounceMs > 0) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    } else {
      onChange(newValue);
    }
  }, [onChange, debounceMs]);

  const handleSliderCommit = useCallback((values: number[]) => {
    isSliding.current = false;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const finalValue = values[0];
    onChange(finalValue);
    onChangeEnd?.(finalValue);
  }, [onChange, onChangeEnd]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.min(max, Math.max(min, parseInt(e.target.value) || min));
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange, min, max]);

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-xs flex items-center gap-2">
        {icon}
        {label}
        {unit && <span className="text-muted-foreground ml-auto">{localValue}{unit}</span>}
      </Label>
      <div className="flex items-center gap-2">
        <Slider
          value={[localValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          className="flex-1"
        />
        {showInput && (
          <Input
            type="number"
            value={localValue}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            className="w-16 h-7 text-xs text-center"
          />
        )}
      </div>
    </div>
  );
};
