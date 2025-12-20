"use client"

import * as React from "react"
import { OpenInV0Button } from "@/components/open-in-v0-button"
import { ColorPickerPopover } from "@/registry/new-york/doless/ColorPickerPopover"
import { DatePicker } from "@/registry/new-york/doless/DatePicker"
import { DateRangePicker } from "@/registry/new-york/doless/DateRangePicker"
import { MultiDatePicker } from "@/registry/new-york/doless/MultiDatePicker"
import { Badge } from "@/registry/new-york/ui/badge"
import { Button } from "@/registry/new-york/ui/button"
// This page displays items from the custom registry.
// You are free to implement this with your own design as needed.

export default function Home() {
  const [labelColor, setLabelColor] = React.useState("#7c3aed")
  const colorPickerLabel = "Choose a color"

  return (
    <div className="max-w-3xl mx-auto flex flex-col min-h-svh px-4 py-8 gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">DolessHQ UI</h1>
        <p className="text-muted-foreground">
          DolessHQ&apos;s frequently used UI components.
        </p>
      </header>
      <main className="flex flex-col flex-1 gap-8">
        <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground sm:pl-3">
              Pick a color with presets and a custom picker.
            </h2>
            <OpenInV0Button name="color-picker-popover" className="w-fit" />
          </div>
          <div className="flex items-center justify-center min-h-[400px] relative">
            <div className="flex flex-col items-center gap-3">
              <ColorPickerPopover
                value={labelColor}
                onChange={setLabelColor}
                label={colorPickerLabel}
              >
                <Button variant="outline" className="gap-2">
                  <span
                    className="h-3 w-3 rounded-full border"
                    style={{ backgroundColor: labelColor }}
                  />
                  {colorPickerLabel}
                </Button>
              </ColorPickerPopover>
              <Badge variant="secondary" className="gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: labelColor }}
                />
                {labelColor.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground sm:pl-3">
              Single date picker with clearable selection.
            </h2>
            <OpenInV0Button name="date-picker" className="w-fit" />
          </div>
          <div className="flex items-center justify-center min-h-[400px] relative">
            <div className="w-full max-w-sm">
              <DatePicker
                label="Start date"
                placeholder="Pick a date"
                defaultValue="2024-10-15"
                clearable
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground sm:pl-3">
              Range picker with before/after modes and quick presets.
            </h2>
            <OpenInV0Button name="date-range-picker" className="w-fit" />
          </div>
          <div className="flex items-center justify-center min-h-[400px] relative">
            <div className="w-full max-w-md">
              <DateRangePicker
                label="Trip window"
                modes={["range", "before", "after"]}
                initialDateFrom="2024-10-10"
                initialDateTo="2024-10-18"
                showPresets
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground sm:pl-3">
              Multi-date picker that supports tagging selections.
            </h2>
            <OpenInV0Button name="multi-date-picker" className="w-fit" />
          </div>
          <div className="flex items-center justify-center min-h-[400px] relative">
            <div className="w-full max-w-sm">
              <MultiDatePicker
                label="Available days"
                defaultValue={["2024-10-04", "2024-10-11"]}
                maxDates={5}
                clearable
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
