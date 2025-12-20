"use client"

import * as React from "react"
import { format, isValid, parseISO } from "date-fns"
import { CalendarIcon, ChevronDownIcon, X } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york/ui/button"
import { Calendar } from "@/registry/new-york/ui/calendar"
import { Label } from "@/registry/new-york/ui/label"
import { Badge } from "@/registry/new-york/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/new-york/ui/popover"

const DEFAULT_DISPLAY_FORMAT = "MMM d, yyyy"
const ISO_STORE_FORMAT = "yyyy-MM-dd"

type DateInput = Date | string | null | undefined

export interface MultiDatePickerValue {
  dates: Date[]
  formatted: string[]
  iso: string[]
  label: string
}

export interface MultiDatePickerProps {
  label?: string
  id?: string
  value?: string[] // Array of ISO date strings
  defaultValue?: string[]
  onChange?: (value: MultiDatePickerValue) => void
  onBlur?: () => void
  placeholder?: string
  dateFormat?: string
  disabled?: boolean
  clearable?: boolean
  clearLabel?: string
  minDate?: DateInput
  maxDate?: DateInput
  disabledDates?: Matcher | Matcher[]
  numberOfMonths?: number
  className?: string
  triggerClassName?: string
  calendarClassName?: string
  maxDates?: number // Maximum number of dates that can be selected
}

const parseDateInput = (value: DateInput): Date | null => {
  if (!value) return null

  if (value instanceof Date) {
    return isValid(value) ? new Date(value.getTime()) : null
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseISO(value)
    return isValid(parsed) ? parsed : null
  }

  return null
}

const buildValuePayload = (
  dates: Date[],
  displayFormat: string,
  placeholder: string = "Select dates"
): MultiDatePickerValue => {
  const formatDateSafe = (value: Date, pattern: string) => {
    if (!value) return null
    try {
      return format(value, pattern)
    } catch (error) {
      console.warn("Failed to format date with pattern:", pattern, error)
      return value.toLocaleDateString()
    }
  }

  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime())
  
  const formatted = sortedDates.map(d => formatDateSafe(d, displayFormat)).filter((f): f is string => f !== null)
  const iso = sortedDates.map(d => formatDateSafe(d, ISO_STORE_FORMAT)).filter((f): f is string => f !== null)

  return {
    dates: sortedDates,
    formatted,
    iso,
    label: formatted.length > 0 
      ? `${formatted.length} date${formatted.length !== 1 ? 's' : ''} selected`
      : placeholder
  }
}

// Stable key for comparing date arrays without order sensitivity.
const buildDateKey = (dates: Date[]) =>
  dates
    .map((date) => date.getTime())
    .sort((a, b) => a - b)
    .join(",")

export const MultiDatePicker = React.forwardRef<HTMLButtonElement, MultiDatePickerProps>(
  (
    {
      label,
      id,
      value,
      defaultValue,
      onChange,
      onBlur,
      placeholder = "Select dates",
      dateFormat = DEFAULT_DISPLAY_FORMAT,
      disabled = false,
      clearable = false,
      clearLabel = "Clear selection",
      minDate,
      maxDate,
      disabledDates,
      numberOfMonths = 1,
      className,
      triggerClassName,
      calendarClassName,
      maxDates,
    },
    ref
  ) => {
    const generatedId = React.useId()
    const buttonId = id ?? generatedId

    const isControlled = value !== undefined
    const parsedValue = React.useMemo(() => {
      if (!value || !Array.isArray(value)) return []
      return value.map(v => parseDateInput(v)).filter((d): d is Date => d !== null)
    }, [value])
    
    const parsedDefault = React.useMemo(() => {
      if (!defaultValue || !Array.isArray(defaultValue)) return []
      return defaultValue.map(v => parseDateInput(v)).filter((d): d is Date => d !== null)
    }, [defaultValue])

    const [internalDates, setInternalDates] = React.useState<Date[]>(
      isControlled ? parsedValue : parsedDefault
    )

    React.useEffect(() => {
      if (!isControlled) return

      const valueDates = buildDateKey(parsedValue)
      const internalDatesKey = buildDateKey(internalDates)
      if (valueDates !== internalDatesKey) {
        setInternalDates(parsedValue)
      }
    }, [isControlled, parsedValue, internalDates])

    const defaultDatesKey = React.useMemo(
      () => buildDateKey(parsedDefault),
      [parsedDefault]
    )
    const lastDefaultKeyRef = React.useRef(defaultDatesKey)

    React.useEffect(() => {
      if (isControlled) return

      if (defaultDatesKey !== lastDefaultKeyRef.current) {
        lastDefaultKeyRef.current = defaultDatesKey
        setInternalDates(parsedDefault)
      }
    }, [isControlled, parsedDefault, defaultDatesKey])

    const selectedDates = isControlled ? parsedValue : internalDates

    const parsedMinDate = React.useMemo(
      () => parseDateInput(minDate),
      [minDate]
    )
    const parsedMaxDate = React.useMemo(
      () => parseDateInput(maxDate),
      [maxDate]
    )

    const combinedDisabled = React.useMemo(() => {
      const rules: Matcher[] = []
      if (parsedMinDate) {
        rules.push({ before: parsedMinDate })
      }
      if (parsedMaxDate) {
        rules.push({ after: parsedMaxDate })
      }
      if (Array.isArray(disabledDates)) {
        rules.push(...disabledDates)
      } else if (disabledDates) {
        rules.push(disabledDates)
      }

      if (rules.length === 0) return undefined
      if (rules.length === 1) return rules[0]
      return rules
    }, [parsedMinDate, parsedMaxDate, disabledDates])

    const [open, setOpen] = React.useState(false)
    const lastEmittedRef = React.useRef<MultiDatePickerValue | null>(null)

    const displayValue = React.useMemo(() => {
      const payload = buildValuePayload(selectedDates, dateFormat, placeholder)
      return payload.label
    }, [selectedDates, dateFormat, placeholder])

    const emitChange = React.useCallback(
      (next: Date[]) => {
        if (!isControlled) {
          setInternalDates(next)
        }

        const payload = buildValuePayload(next, dateFormat, placeholder)
        const last = lastEmittedRef.current
        if (
          !last ||
          last.iso.join(',') !== payload.iso.join(',') ||
          last.formatted.join(',') !== payload.formatted.join(',')
        ) {
          lastEmittedRef.current = payload
          onChange?.(payload)
        }
      },
      [isControlled, dateFormat, placeholder, onChange]
    )

    const handleSelect = (date: Date | undefined) => {
      if (!date) return

      const dateTime = date.getTime()
      const isSelected = selectedDates.some(d => d.getTime() === dateTime)

      let nextDates: Date[]
      if (isSelected) {
        // Remove date
        nextDates = selectedDates.filter(d => d.getTime() !== dateTime)
      } else {
        // Add date (check max limit)
        if (maxDates && selectedDates.length >= maxDates) {
          return // Don't add if max reached
        }
        nextDates = [...selectedDates, date]
      }

      emitChange(nextDates)
    }

    const handleRemoveDate = (dateToRemove: Date) => {
      const nextDates = selectedDates.filter(d => d.getTime() !== dateToRemove.getTime())
      emitChange(nextDates)
    }

    const handleClear = () => {
      emitChange([])
      setOpen(false)
      onBlur?.()
    }

    const handleOpenChange = (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) {
        onBlur?.()
      }
    }

    const defaultMonth =
      selectedDates.length > 0
        ? selectedDates[0]
        : parsedMinDate ?? parsedMaxDate ?? new Date()

    // Derive year range from minDate/maxDate props, with sensible defaults
    const fromYear = parsedMinDate?.getFullYear() ?? new Date().getFullYear() - 5;
    const toYear = parsedMaxDate?.getFullYear() ?? new Date().getFullYear() + 5

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {label ? (
          <Label htmlFor={buttonId} className="px-1 text-sm font-medium">
            {label}
          </Label>
        ) : null}
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={buttonId}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-between text-left font-normal",
                selectedDates.length === 0 && "text-muted-foreground",
                triggerClassName
              )}
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {displayValue}
              </span>
              <ChevronDownIcon className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            className={cn(
              "w-fit min-w-[280px] max-w-[min(320px,calc(100vw-2rem))] p-0",
              calendarClassName
            )}
          >
            <div className="p-3">
              {selectedDates.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 max-w-full">
                  {selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((date) => (
                      <Badge
                        key={date.getTime()}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {format(date, dateFormat)}
                        <button
                          type="button"
                          onClick={() => handleRemoveDate(date)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
              <Calendar
                initialFocus
                mode="single"
                selected={undefined} // Don't show single selection highlight
                onSelect={handleSelect}
                numberOfMonths={numberOfMonths}
                defaultMonth={defaultMonth}
                captionLayout="dropdown"
                disabled={combinedDisabled}
                fromYear={fromYear}
                toYear={toYear}
                modifiers={{
                  selected: (date) => selectedDates.some(d => d.getTime() === date.getTime())
                }}
                modifiersClassNames={{
                  selected: "bg-primary text-primary-foreground rounded-md"
                }}
              />
              {maxDates && (
                <div className="px-3 pb-2 text-xs text-muted-foreground">
                  {selectedDates.length} / {maxDates} dates selected
                </div>
              )}
            </div>
            {clearable && selectedDates.length > 0 && (
              <div className="border-t border-border p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleClear}
                  disabled={disabled}
                >
                  {clearLabel}
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

MultiDatePicker.displayName = "MultiDatePicker"

export default MultiDatePicker
