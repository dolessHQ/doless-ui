"use client"

import * as React from "react"
import { isValid, parseISO } from "date-fns"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { formatDateSafe } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york/ui/button"
import { Calendar } from "@/registry/new-york/ui/calendar"
import { Label } from "@/registry/new-york/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/new-york/ui/popover"

const DEFAULT_DISPLAY_FORMAT = "MMM d, yyyy"
const ISO_STORE_FORMAT = "yyyy-MM-dd"

type DateInput = Date | string | null | undefined

export interface DatePickerValue {
  date: Date | null
  formatted: string | null
  iso: string | null
  label: string
}

export interface DatePickerProps {
  label?: string
  id?: string
  value?: DateInput
  defaultValue?: DateInput
  onChange?: (value: DatePickerValue) => void
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

const datesEqual = (a: Date | null, b: Date | null) => {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.getTime() === b.getTime()
}

const buildValuePayload = (
  date: Date | null,
  displayFormat: string
): DatePickerValue => {
  const formatted = formatDateSafe(date, displayFormat)
  const iso = formatDateSafe(date, ISO_STORE_FORMAT)

  return {
    date,
    formatted,
    iso,
    label: formatted ?? "Select date",
  }
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      label,
      id,
      value,
      defaultValue,
      onChange,
      onBlur,
      placeholder = "Select date",
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
    },
    ref
  ) => {
    const generatedId = React.useId()
    const buttonId = id ?? generatedId

    const isControlled = value !== undefined
    const parsedValue = React.useMemo(() => parseDateInput(value), [value])
    const parsedDefault = React.useMemo(
      () => parseDateInput(defaultValue),
      [defaultValue]
    )

    const [internalDate, setInternalDate] = React.useState<Date | null>(
      parsedValue ?? parsedDefault ?? null
    )

    React.useEffect(() => {
      if (isControlled) {
        if (!datesEqual(parsedValue, internalDate)) {
          setInternalDate(parsedValue)
        }
      }
    }, [isControlled, parsedValue, internalDate])

    // Track defaultValue changes without clobbering uncontrolled selections.
    const lastDefaultRef = React.useRef<Date | null>(parsedDefault)

    React.useEffect(() => {
      if (isControlled) return

      if (!datesEqual(parsedDefault, lastDefaultRef.current)) {
        lastDefaultRef.current = parsedDefault ?? null
        setInternalDate(parsedDefault ?? null)
      }
    }, [isControlled, parsedDefault])

    const selectedDate = isControlled ? parsedValue : internalDate

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
    const lastEmittedRef = React.useRef<DatePickerValue | null>(null)

    const displayValue = React.useMemo(() => {
      const label = buildValuePayload(selectedDate ?? null, dateFormat)
      return label.formatted ?? placeholder ?? label.label
    }, [selectedDate, dateFormat, placeholder])

    const emitChange = React.useCallback(
      (next: Date | null) => {
        if (!isControlled) {
          setInternalDate(next)
        }

        const payload = buildValuePayload(next, dateFormat)
        const last = lastEmittedRef.current
        if (
          !last ||
          last.iso !== payload.iso ||
          last.formatted !== payload.formatted
        ) {
          lastEmittedRef.current = payload
          onChange?.(payload)
        }
      },
      [isControlled, dateFormat, onChange]
    )

    const handleSelect = (nextDate: Date | undefined) => {
      emitChange(nextDate ?? null)
      setOpen(false)
      onBlur?.()
    }

    const handleClear = () => {
      emitChange(null)
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
      selectedDate ??
      parsedMinDate ??
      parsedMaxDate ??
      new Date()

    // Derive year range from minDate/maxDate props, with sensible defaults
    const fromYear = parsedMinDate?.getFullYear() ?? new Date().getFullYear() - 5
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
                !selectedDate && "text-muted-foreground",
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
            className={cn("w-auto p-0", calendarClassName)}
          >
            <Calendar
              initialFocus
              mode="single"
              selected={selectedDate ?? undefined}
              onSelect={handleSelect}
              numberOfMonths={numberOfMonths}
              defaultMonth={defaultMonth}
              captionLayout="dropdown"
              disabled={combinedDisabled}
              fromYear={fromYear}
              toYear={toYear}
            />
            {clearable ? (
              <div className="border-t border-border p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleClear}
                  disabled={disabled || !selectedDate}
                >
                  {clearLabel}
                </Button>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

DatePicker.displayName = "DatePicker"

export default DatePicker
