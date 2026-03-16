"use client"

import * as React from "react"
import { isValid, parseISO, startOfDay } from "date-fns"
import { CalendarIcon, ChevronDownIcon, X } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { formatDateSafe } from "@/lib/doless-ui/date-utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/registry/new-york/ui/badge"
import { Button } from "@/registry/new-york/ui/button"
import { Calendar } from "@/registry/new-york/ui/calendar"
import { Card } from "@/registry/new-york/ui/card"
import { Label } from "@/registry/new-york/ui/label"
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
  value?: string[]
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
  maxDates?: number
  selectionDisplay?: "count" | "dates" | "badges"
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

const normalizeDateArray = (dates: Date[]): Date[] => {
  const seen = new Set<number>()

  return dates
    .map((date) => startOfDay(date))
    .filter((date) => {
      const key = date.getTime()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.getTime() - b.getTime())
}

const buildDateKey = (dates: Date[]) =>
  normalizeDateArray(dates)
    .map((date) => date.getTime())
    .join(",")

const buildValuePayload = (
  dates: Date[],
  displayFormat: string,
  placeholder = "Select dates"
): MultiDatePickerValue => {
  const normalizedDates = normalizeDateArray(dates)
  const formatted = normalizedDates
    .map((date) => formatDateSafe(date, displayFormat))
    .filter((value): value is string => value !== null)
  const iso = normalizedDates
    .map((date) => formatDateSafe(date, ISO_STORE_FORMAT))
    .filter((value): value is string => value !== null)

  return {
    dates: normalizedDates,
    formatted,
    iso,
    label:
      formatted.length > 0
        ? `${formatted.length} date${formatted.length !== 1 ? "s" : ""} selected`
        : placeholder,
  }
}

const buildDisplayLabel = ({
  payload,
  placeholder,
  selectionDisplay,
}: {
  payload: MultiDatePickerValue
  placeholder: string
  selectionDisplay: "count" | "dates" | "badges"
}) => {
  if (payload.formatted.length === 0) return placeholder
  if (selectionDisplay === "badges") return placeholder
  if (selectionDisplay === "dates") return payload.formatted.join(", ")
  return payload.label
}

export const MultiDatePicker = React.forwardRef<
  HTMLButtonElement,
  MultiDatePickerProps
>(
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
      selectionDisplay = "count",
    },
    ref
  ) => {
    const generatedId = React.useId()
    const buttonId = id ?? generatedId

    const isControlled = value !== undefined
    const parsedValue = React.useMemo(() => {
      if (!value || !Array.isArray(value)) return []
      return normalizeDateArray(
        value
          .map((item) => parseDateInput(item))
          .filter((item): item is Date => item !== null)
      )
    }, [value])

    const parsedDefault = React.useMemo(() => {
      if (!defaultValue || !Array.isArray(defaultValue)) return []
      return normalizeDateArray(
        defaultValue
          .map((item) => parseDateInput(item))
          .filter((item): item is Date => item !== null)
      )
    }, [defaultValue])

    const [internalDates, setInternalDates] = React.useState<Date[]>(
      isControlled ? parsedValue : parsedDefault
    )

    React.useEffect(() => {
      if (!isControlled) return

      if (buildDateKey(parsedValue) !== buildDateKey(internalDates)) {
        setInternalDates(parsedValue)
      }
    }, [internalDates, isControlled, parsedValue])

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
    }, [defaultDatesKey, isControlled, parsedDefault])

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
    }, [disabledDates, parsedMaxDate, parsedMinDate])

    const [open, setOpen] = React.useState(false)
    const lastEmittedRef = React.useRef<MultiDatePickerValue | null>(null)

    const displayValue = React.useMemo(() => {
      const payload = buildValuePayload(selectedDates, dateFormat, placeholder)
      return buildDisplayLabel({ payload, placeholder, selectionDisplay })
    }, [dateFormat, placeholder, selectedDates, selectionDisplay])

    const triggerBadgeValues = React.useMemo(() => {
      if (selectionDisplay !== "badges") return []

      return selectedDates
        .map((date) => formatDateSafe(date, dateFormat))
        .filter((value): value is string => Boolean(value))
    }, [dateFormat, selectedDates, selectionDisplay])

    const emitChange = React.useCallback(
      (next: Date[]) => {
        const normalizedNext = normalizeDateArray(next)
        if (!isControlled) {
          setInternalDates(normalizedNext)
        }

        const payload = buildValuePayload(
          normalizedNext,
          dateFormat,
          placeholder
        )
        const last = lastEmittedRef.current
        if (
          !last ||
          last.iso.join(",") !== payload.iso.join(",") ||
          last.formatted.join(",") !== payload.formatted.join(",")
        ) {
          lastEmittedRef.current = payload
          onChange?.(payload)
        }
      },
      [dateFormat, isControlled, onChange, placeholder]
    )

    const handleSelect = (date: Date | undefined) => {
      if (!date) return

      const normalizedDate = startOfDay(date)
      const dateTime = normalizedDate.getTime()
      const isSelected = selectedDates.some(
        (selectedDate) => selectedDate.getTime() === dateTime
      )

      let nextDates: Date[]
      if (isSelected) {
        nextDates = selectedDates.filter(
          (selectedDate) => selectedDate.getTime() !== dateTime
        )
      } else {
        if (maxDates && selectedDates.length >= maxDates) {
          return
        }
        nextDates = [...selectedDates, normalizedDate]
      }

      emitChange(nextDates)
    }

    const handleRemoveDate = (dateToRemove: Date) => {
      const nextDates = selectedDates.filter(
        (date) => date.getTime() !== dateToRemove.getTime()
      )
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
      selectedDates[0] ?? parsedMinDate ?? parsedMaxDate ?? new Date()
    const fromYear =
      parsedMinDate?.getFullYear() ?? new Date().getFullYear() - 5
    const toYear =
      parsedMaxDate?.getFullYear() ?? new Date().getFullYear() + 5

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
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {selectionDisplay === "badges" && triggerBadgeValues.length > 0 ? (
                  <span className="flex min-w-0 flex-wrap gap-1.5">
                    {triggerBadgeValues.map((value) => (
                      <Badge
                        key={`trigger-date-${value}`}
                        variant="outline"
                        className="h-5 border-border bg-muted/30 px-2 text-xs font-medium"
                      >
                        {value}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span className="truncate">{displayValue}</span>
                )}
              </span>
              <ChevronDownIcon className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            className={cn(
              "min-w-[340px] border-none bg-transparent p-0.5",
              calendarClassName
            )}
          >
            <Card className="my-1 gap-0 border bg-background py-0 shadow-lg">
              <div className="p-3">
                {selectedDates.length > 0 ? (
                  <div className="mb-3 flex max-w-full flex-wrap gap-2">
                    {selectedDates.map((date) => (
                      <Badge
                        key={date.getTime()}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {formatDateSafe(date, dateFormat)}
                        <button
                          type="button"
                          onClick={() => handleRemoveDate(date)}
                          className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <Calendar
                  initialFocus
                  mode="single"
                  selected={undefined}
                  onSelect={handleSelect}
                  numberOfMonths={numberOfMonths}
                  defaultMonth={defaultMonth}
                  captionLayout="dropdown"
                  disabled={combinedDisabled}
                  fromYear={fromYear}
                  toYear={toYear}
                  modifiers={{
                    selected: (date) =>
                      selectedDates.some(
                        (selectedDate) =>
                          selectedDate.getTime() === startOfDay(date).getTime()
                      ),
                  }}
                  modifiersClassNames={{
                    selected: "rounded-md bg-primary text-primary-foreground",
                  }}
                />
                {maxDates ? (
                  <div className="px-3 pb-2 text-xs text-muted-foreground">
                    {selectedDates.length} / {maxDates} dates selected
                  </div>
                ) : null}
              </div>
              {clearable && selectedDates.length > 0 ? (
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
              ) : null}
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

MultiDatePicker.displayName = "MultiDatePicker"

export default MultiDatePicker
