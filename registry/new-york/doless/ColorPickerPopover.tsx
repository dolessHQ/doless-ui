"use client"

import { type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/registry/new-york/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/new-york/ui/popover"

// Default swatches used when presets are not provided.
const DEFAULT_PRESETS = [
  "#7c3aed",
  "#22c55e",
  "#f97316",
  "#3b82f6",
  "#f43f5e",
  "#14b8a6",
  "#a855f7",
  "#eab308",
  "#6366f1",
];

export interface ColorPickerPopoverProps {
  value: string
  onChange: (next: string) => void
  label?: ReactNode
  presets?: string[]
  children: ReactNode
  className?: string
}

export function ColorPickerPopover({
  value,
  onChange,
  label,
  presets = DEFAULT_PRESETS,
  children,
  className,
}: ColorPickerPopoverProps) {
  const handlePresetClick = (preset: string) => {
    if (preset === value) return
    onChange(preset)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className={cn("w-64 space-y-3", className)}>
        {label ? (
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                "h-7 w-7 rounded-full border transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                value === preset && "ring-2 ring-offset-2 ring-primary"
              )}
              style={{ backgroundColor: preset }}
              aria-label={`Set color ${preset}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Custom</span>
          <Input
            type="color"
            className="h-8 w-16 cursor-pointer p-1"
            value={value || "#a3a3a3"}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
