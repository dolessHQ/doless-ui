"use client"

import * as React from "react"
import { ChevronDownIcon, CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import {
  format,
  parseISO,
  isValid,
  startOfDay,
  isAfter,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york/ui/button"
import { Calendar } from "@/registry/new-york/ui/calendar"
import { Label } from "@/registry/new-york/ui/label"
import {
  Card,
  CardContent,
  CardFooter,
} from "@/registry/new-york/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/new-york/ui/popover"
import { Separator } from "@/registry/new-york/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/registry/new-york/ui/toggle-group"

const DEFAULT_DISPLAY_FORMAT = "MMM d"
const ISO_STORE_FORMAT = "yyyy-MM-dd"

export type DateRangeSelectionMode = "range" | "after" | "before"

export interface DateRangePickerUpdate {
  range: DateRange | undefined
  from: Date | null
  to: Date | null
  mode: DateRangeSelectionMode
  formatted: {
    from: string | null
    to: string | null
    label: string
  }
  iso: {
    from: string | null
    to: string | null
  }
}

export interface DateRangePickerProps {
  label?: string
  onUpdate?: (value: DateRangePickerUpdate) => void
  modes?: ReadonlyArray<DateRangeSelectionMode>
  initialMode?: DateRangeSelectionMode
  initialDateFrom?: Date | string | null
  initialDateTo?: Date | string | null
  dateFormat?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  numberOfMonths?: number
  clearable?: boolean
  clearLabel?: string
  triggerClassName?: string
  showPresets?: boolean
  calendarClassName?: string
}

const isDebugEnabled = () => {
  if (typeof window === "undefined") return false
  return (window as unknown as { __ANIMO_DEBUG_DATE_RANGE_PICKER__?: boolean })
    .__ANIMO_DEBUG_DATE_RANGE_PICKER__ === true
}

const debugLog = (...args: unknown[]) => {
  if (!isDebugEnabled()) return
  console.log(...args)
}

const parseDateInput = (value: Date | string | null | undefined) => {
  if (!value) return undefined

  if (value instanceof Date) {
    return isValid(value) ? new Date(value.getTime()) : undefined
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseISO(value)
    return isValid(parsed) ? parsed : undefined
  }

  return undefined
}

const datesEqual = (a?: Date, b?: Date) => {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.getTime() === b.getTime()
}

const buildUpdatePayload = (
  range: DateRange | undefined,
  displayFormat: string,
  mode: DateRangeSelectionMode
): DateRangePickerUpdate => {
  const rawFrom = range?.from ?? null
  const rawTo = range?.to ?? null

  // Canonicalize emitted bounds by mode.
  // `react-day-picker` always selects a `from` date first; in "before" mode we treat that as `to`.
  let from: Date | null = rawFrom
  let to: Date | null = rawTo

  if (mode === "after") {
    if (!from && to) {
      from = to
    }
    to = null
  }

  if (mode === "before") {
    if (!to && from) {
      to = from
    }
    from = null
  }

  const formatDateSafe = (date: Date | null, pattern: string) => {
    if (!date) return null
    try {
      return format(date, pattern)
    } catch (error) {
      console.warn("Failed to format date with pattern:", pattern, error)
      return date.toLocaleDateString()
    }
  }

  const formattedFrom = formatDateSafe(from, displayFormat)
  const formattedTo = formatDateSafe(to, displayFormat)

  const isoFrom = formatDateSafe(from, ISO_STORE_FORMAT)
  const isoTo = formatDateSafe(to, ISO_STORE_FORMAT)

  let label = "Select date range"
  if (mode === "after" && formattedFrom) {
    label = `After ${formattedFrom}`
  } else if (mode === "before" && formattedTo) {
    label = `Before ${formattedTo}`
  } else if (formattedFrom && formattedTo) {
    label = `${formattedFrom} – ${formattedTo}`
  } else if (formattedFrom) {
    label = `${formattedFrom} –`
  } else if (formattedTo) {
    label = `– ${formattedTo}`
  }

  return {
    range:
      mode === "after" && from
        ? { from, to: undefined }
        : mode === "before" && to
          ? { from: undefined, to }
          : mode === "range"
            ? range
            : undefined,
    from,
    to,
    mode,
    formatted: {
      from: formattedFrom,
      to: formattedTo,
      label,
    },
    iso: {
      from: isoFrom,
      to: isoTo,
    },
  }
}

export function DateRangePicker({
  label,
  onUpdate,
  modes = ["range"] as const,
  initialMode = "range",
  initialDateFrom,
  initialDateTo,
  dateFormat = DEFAULT_DISPLAY_FORMAT,
  placeholder = "Select date range",
  disabled = false,
  className,
  id,
  numberOfMonths = 1,
  clearable = true,
  clearLabel = "clear",
  triggerClassName,
  showPresets = true,
  calendarClassName,
}: DateRangePickerProps) {
  const generatedId = React.useId()
  const today = React.useMemo(() => startOfDay(new Date()), [])

  const normalizedModes = React.useMemo<DateRangeSelectionMode[]>(() => {
    const unique = Array.from(new Set<DateRangeSelectionMode>(modes)) as DateRangeSelectionMode[]
    return unique.length > 0 ? unique : ["range"]
  }, [modes])

  const [selectionMode, setSelectionMode] = React.useState<DateRangeSelectionMode>(() => {
    return normalizedModes.includes(initialMode) ? initialMode : normalizedModes[0] ?? "range"
  })

  const buildSingleDayRange = React.useCallback((value: Date | null | undefined): DateRange | undefined => {
    if (!value) return undefined
    const day = startOfDay(value)
    return { from: day, to: day }
  }, [])

  // Keep selectionMode in sync if parent changes initialMode (e.g., URL-driven filters)
  React.useEffect(() => {
    if (!normalizedModes.includes(initialMode)) return

    setSelectionMode((current) => (current === initialMode ? current : initialMode))

    setRange((current) => {
      if (initialMode === "after") {
        const nextFrom = parseDateInput(initialDateFrom) ?? parseDateInput(initialDateTo)
        const next = buildSingleDayRange(nextFrom)
        if (next && datesEqual(current?.from, next.from) && datesEqual(current?.to, next.to)) {
          return current
        }
        return next
      }
      if (initialMode === "before") {
        const nextTo = parseDateInput(initialDateTo) ?? parseDateInput(initialDateFrom)
        const next = buildSingleDayRange(nextTo)
        if (next && datesEqual(current?.from, next.from) && datesEqual(current?.to, next.to)) {
          return current
        }
        return next
      }
      return current
    })
  }, [initialMode, initialDateFrom, initialDateTo, normalizedModes, buildSingleDayRange])

  const isInitialFromProvided = initialDateFrom !== undefined && initialDateFrom !== null
  const isInitialToProvided = initialDateTo !== undefined && initialDateTo !== null

  const parsedInitialFrom = React.useMemo(
    () => parseDateInput(initialDateFrom),
    [initialDateFrom]
  )
  const parsedInitialTo = React.useMemo(
    () => parseDateInput(initialDateTo),
    [initialDateTo]
  )

  const buildRange = React.useCallback(
    (
      from?: Date | null,
      to?: Date | null,
      shouldDefaultEnd = false
    ): DateRange | undefined => {
      const normalizedFrom = from ? startOfDay(from) : undefined
      const normalizedTo = to ? startOfDay(to) : undefined

      if (normalizedFrom && normalizedTo) {
        const fromLessThanTo = normalizedFrom <= normalizedTo
        return {
          from: fromLessThanTo ? normalizedFrom : normalizedTo,
          to: fromLessThanTo ? normalizedTo : normalizedFrom,
        }
      }

      if (normalizedFrom) {
        const derivedEnd =
          shouldDefaultEnd && !isAfter(normalizedFrom, today)
            ? today
            : normalizedFrom
        return {
          from: normalizedFrom,
          to: derivedEnd,
        }
      }

      if (normalizedTo) {
        // Edge case: only end provided. Treat as single-day range.
        return {
          from: normalizedTo,
          to: normalizedTo,
        }
      }

      return undefined
    },
    [today]
  )

  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    if (!parsedInitialFrom && !parsedInitialTo) {
      return undefined
    }

    if (selectionMode === "after") {
      const seedFrom = parsedInitialFrom ?? parsedInitialTo
      return buildSingleDayRange(seedFrom)
    }
    if (selectionMode === "before") {
      const seedTo = parsedInitialTo ?? parsedInitialFrom
      return buildSingleDayRange(seedTo)
    }

    return buildRange(parsedInitialFrom ?? undefined, parsedInitialTo ?? undefined, true)
  })
  const [activePreset, setActivePreset] = React.useState<string | null>(null)

  const clearSelection = React.useCallback(() => {
    setRange(undefined)
    setActivePreset(null)
  }, [])

  const updatePayload = React.useMemo(
    () => buildUpdatePayload(range, dateFormat, selectionMode),
    [range, dateFormat, selectionMode]
  )

  const lastEmittedRef = React.useRef<DateRangePickerUpdate | null>(updatePayload)

  const displayValue = React.useMemo(() => {
    if (updatePayload.formatted.from || updatePayload.formatted.to) {
      return updatePayload.formatted.label
    }
    return placeholder
  }, [updatePayload, placeholder])

  const applySelection = React.useCallback(
    (nextRange: DateRange | undefined, mode: DateRangeSelectionMode) => {
      if (!nextRange || (!nextRange.from && !nextRange.to)) {
        clearSelection()
        return
      }

      if (mode === "after") {
        const nextFrom = nextRange.to ?? nextRange.from
        if (!nextFrom) {
          clearSelection()
          return
        }
        setRange(buildSingleDayRange(nextFrom))
        setActivePreset(null)
        return
      }

      if (mode === "before") {
        // In range-selection mode, the calendar sets `from` first. Treat that as `to`.
        const nextTo = nextRange.to ?? nextRange.from
        if (!nextTo) {
          clearSelection()
          return
        }
        setRange(buildSingleDayRange(nextTo))
        setActivePreset(null)
        return
      }

      const isSingleSelection =
        nextRange.from &&
        (!nextRange.to ||
          nextRange.to.getTime() === nextRange.from.getTime())

      if (isSingleSelection && nextRange.from) {
        setRange(buildRange(nextRange.from, undefined, true) ?? undefined)
        setActivePreset(null)
        return
      }

      setRange(buildRange(nextRange.from, nextRange.to, false) ?? undefined)
      setActivePreset(null)
    },
    [buildRange, buildSingleDayRange, clearSelection]
  )

  const handleSelect = (nextRange: DateRange | undefined) => {
    if (!nextRange || (!nextRange.from && !nextRange.to)) {
      clearSelection()
      return
    }

    applySelection(nextRange, selectionMode)
  }

  React.useEffect(() => {
    if (!isInitialFromProvided && !isInitialToProvided) {
      clearSelection()
      return
    }

    let nextRange: DateRange | undefined
    if (selectionMode === "after") {
      const seedFrom = parsedInitialFrom ?? parsedInitialTo
      nextRange = buildSingleDayRange(seedFrom)
    } else if (selectionMode === "before") {
      const seedTo = parsedInitialTo ?? parsedInitialFrom
      nextRange = buildSingleDayRange(seedTo)
    } else {
      nextRange =
        parsedInitialFrom || parsedInitialTo
          ? buildRange(
              parsedInitialFrom ?? undefined,
              parsedInitialTo ?? undefined,
              true
            )
          : undefined
    }

    setRange((previous) => {
      if (
        datesEqual(previous?.from, nextRange?.from) &&
        datesEqual(previous?.to, nextRange?.to)
      ) {
        return previous
      }
      debugLog("[DateRangePicker] sync range from props", {
        selectionMode,
        initialMode,
        initialDateFrom,
        initialDateTo,
        parsedInitialFrom,
        parsedInitialTo,
        previous,
        nextRange,
      })
      return nextRange
    })
  }, [
    isInitialFromProvided,
    isInitialToProvided,
    buildRange,
    parsedInitialFrom,
    parsedInitialTo,
    clearSelection,
    selectionMode,
    initialMode,
    initialDateFrom,
    initialDateTo,
    buildSingleDayRange,
  ])

  React.useEffect(() => {
    if (!onUpdate) return

    const last = lastEmittedRef.current
    if (
      last &&
      last.iso.from === updatePayload.iso.from &&
      last.iso.to === updatePayload.iso.to &&
      last.formatted.from === updatePayload.formatted.from &&
      last.formatted.to === updatePayload.formatted.to &&
      last.mode === updatePayload.mode
    ) {
      debugLog("[DateRangePicker] skip emit (same payload)", updatePayload)
      return
    }

    lastEmittedRef.current = updatePayload
    debugLog("[DateRangePicker] emit", updatePayload)
    onUpdate(updatePayload)
  }, [updatePayload, onUpdate])

  const inputId = id ?? generatedId
  const defaultMonth =
    range?.from ?? parsedInitialFrom ?? parsedInitialTo ?? today
  const [month, setMonth] = React.useState<Date>(() => defaultMonth)
  const monthsToShow = Math.max(1, numberOfMonths || 1)

  // Normalize the current selection for the next mode.
  const deriveRangeForMode = React.useCallback(
    (current: DateRange | undefined, nextMode: DateRangeSelectionMode) => {
      if (!current) return undefined

      const anchor = current.to ?? current.from
      const anchorDay = anchor ? startOfDay(anchor) : null

      if (nextMode === "after") {
        return buildSingleDayRange(anchorDay)
      }

      if (nextMode === "before") {
        return buildSingleDayRange(anchorDay)
      }

      if (current.from && current.to) {
        const from = startOfDay(current.from)
        const to = startOfDay(current.to)
        return from <= to ? { from, to } : { from: to, to: from }
      }

      if (!anchorDay) return undefined

      const todayStart = today
      const end = isAfter(anchorDay, todayStart) ? anchorDay : todayStart
      return { from: anchorDay, to: end }
    },
    [buildSingleDayRange, today]
  )

  const getMonthForMode = React.useCallback(
    (nextRange: DateRange | undefined, nextMode: DateRangeSelectionMode) => {
      if (!nextRange) return null
      const anchor =
        nextMode === "range"
          ? nextRange.from ?? nextRange.to
          : nextRange.to ?? nextRange.from
      return anchor ? startOfDay(anchor) : null
    },
    []
  )

  const applyPreset = (key: string, start: Date, end: Date) => {
    setSelectionMode("range")
    setActivePreset(key)
    setRange(buildRange(start, end, false) ?? undefined)
    setMonth(start)
  }

  const getWeekBoundaries = React.useCallback(
    (reference: Date) => {
      const weekStart = startOfWeek(reference, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(reference, { weekStartsOn: 1 })
      return {
        start: startOfDay(weekStart),
        end: startOfDay(weekEnd),
      }
    },
    []
  )

  const presetRanges = React.useMemo(() => {
    const thisWeek = getWeekBoundaries(today)
    const nextWeekStart = addWeeks(thisWeek.start, 1)
    const nextWeekEnd = addWeeks(thisWeek.end, 1)
    const lastWeekStart = subWeeks(thisWeek.start, 1)
    const lastWeekEnd = subWeeks(thisWeek.end, 1)

    const thisMonthStart = startOfDay(startOfMonth(today))
    const thisMonthEnd = startOfDay(endOfMonth(today))
    const nextMonthStart = startOfDay(startOfMonth(addMonths(today, 1)))
    const nextMonthEnd = startOfDay(endOfMonth(addMonths(today, 1)))
    const lastMonthStart = startOfDay(startOfMonth(subMonths(today, 1)))
    const lastMonthEnd = startOfDay(endOfMonth(subMonths(today, 1)))

    return {
      thisWeek: { start: thisWeek.start, end: thisWeek.end },
      nextWeek: { start: nextWeekStart, end: nextWeekEnd },
      lastWeek: { start: lastWeekStart, end: lastWeekEnd },
      thisMonth: { start: thisMonthStart, end: thisMonthEnd },
      lastMonth: { start: lastMonthStart, end: lastMonthEnd },
      nextMonth: { start: nextMonthStart, end: nextMonthEnd },
    }
  }, [getWeekBoundaries, today])

  const presetButton = (key: string, label: string, rangeValue: { start: Date; end: Date }) => (
    <Button
      key={key}
      type="button"
      variant={activePreset === key ? "default" : "outline"}
      className="w-full text-xs"
      onClick={() => applyPreset(key, rangeValue.start, rangeValue.end)}
    >
      {label}
    </Button>
  )

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <Label htmlFor={inputId} className="px-1 text-sm font-medium">
          {label}
        </Label>
      ) : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={inputId}
            variant="outline"
            className={cn(
              "min-w-56 w-56 justify-between text-left font-normal",
              !range?.from && !range?.to && "text-muted-foreground",
              triggerClassName
            )}
            disabled={disabled}
          >
            <span className="flex min-w-0 items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="truncate">{displayValue}</span>
            </span>
            <ChevronDownIcon className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("min-w-[340px] border-none bg-transparent p-0.5", calendarClassName)}
          align="start"
        >
          <Card className="border bg-background shadow-lg my-1">
            <CardContent className="px-3 -mt-2.5">
              {normalizedModes.length > 1 ? (
                <div className="flex items-center justify-center pb-3 pt-1">
                  <ToggleGroup
                    type="single"
                    value={selectionMode}
                    onValueChange={(value) => {
                      if (!value) return
                      const nextMode = value as DateRangeSelectionMode
                      if (nextMode === selectionMode) return
                      const nextRange = deriveRangeForMode(range, nextMode)
                      const nextMonth = getMonthForMode(nextRange, nextMode)
                      setSelectionMode(nextMode)
                      setActivePreset(null)
                      setRange(nextRange)
                      if (nextMonth) {
                        setMonth(nextMonth)
                      }
                    }}
                    className="w-full"
                  >
                    {normalizedModes.includes("before") ? (
                      <ToggleGroupItem value="before" className="flex-1 text-xs">
                        Before
                      </ToggleGroupItem>
                    ) : null}
                    {normalizedModes.includes("range") ? (
                      <ToggleGroupItem value="range" className="flex-1 text-xs">
                        Range
                      </ToggleGroupItem>
                    ) : null}
                    {normalizedModes.includes("after") ? (
                      <ToggleGroupItem value="after" className="flex-1 text-xs">
                        After
                      </ToggleGroupItem>
                    ) : null}
                  </ToggleGroup>
                </div>
              ) : null}
              <Calendar
                className="w-full"
                initialFocus
                mode="range"
                defaultMonth={defaultMonth}
                month={month}
                onMonthChange={setMonth}
                selected={range}
                onSelect={handleSelect}
                numberOfMonths={monthsToShow}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={2030}
              />
            </CardContent>

              <CardFooter className="flex-col  pt-2 -mb-2">
              {showPresets && selectionMode === "range" ? (
                <div className="flex-col gap-3 mt-3 border-t pt-3">
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {presetButton("lastWeek", "Last Week", presetRanges.lastWeek)}
                    {presetButton("thisWeek", "This Week", presetRanges.thisWeek)}
                    {presetButton("nextWeek", "Next Week", presetRanges.nextWeek)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 w-full mt-2">
                    {presetButton("lastMonth", "Last Month", presetRanges.lastMonth)}
                    {presetButton("thisMonth", "This Month", presetRanges.thisMonth)}                    
                    {presetButton("nextMonth", "Next Month", presetRanges.nextMonth)}
                  </div>
                </div>
              ) : null}
                {showPresets && clearable ? <Separator className="my-4" /> : null}
                {clearable ? (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      disabled={!range?.from && !range?.to}
                    >
                      {clearLabel}
                    </Button>
                  </div>
                ) : null}
              </CardFooter>
            
            
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default DateRangePicker
