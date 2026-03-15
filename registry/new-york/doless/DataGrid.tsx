"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type Header,
  type RowData,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  EyeOff,
  Filter,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

import type {
  DataGridColumnMeta,
  DataGridCustomFilterRenderProps,
  DataGridDateRangeValue,
  DataGridFilterDefinition,
  DataGridFilterOption,
  DataGridPinnedSide,
  DataGridSortState,
  DataGridStoredPreferences,
} from "@/lib/data-grid"
import {
  readDataGridPreferences,
  writeDataGridPreferences,
} from "@/lib/data-grid"
import { cn } from "@/lib/utils"
import {
  Badge,
} from "@/registry/new-york/ui/badge"
import { Button } from "@/registry/new-york/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/new-york/ui/card"
import { DateRangePicker, type DateRangePickerUpdate } from "@/registry/new-york/doless/DateRangePicker"
import { Input } from "@/registry/new-york/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/new-york/ui/popover"

export interface DataGridExportContext<TData, TFilters, TSort> {
  rows: TData[]
  filters: TFilters
  sorting: TSort
  currentPage: number
  pageSize: number
  totalCount: number
  visibleColumnIds: string[]
}

export interface DataGridExportAction<TData, TFilters, TSort> {
  label: string
  description?: string
  onExport: (
    context: DataGridExportContext<TData, TFilters, TSort>
  ) => Promise<void> | void
}

export interface DataGridProps<TData extends RowData, TFilters> {
  tableId: string
  columns: Array<ColumnDef<TData, unknown>>
  rows: TData[]
  filters: TFilters
  onFiltersChange: (filters: TFilters) => void
  filterDefinitions?: Array<DataGridFilterDefinition<TFilters>>
  sorting: DataGridSortState
  onSortingChange: (sorting: DataGridSortState) => void
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => Promise<void> | void
  actionButtons?: React.ReactNode
  exportActions?: Array<DataGridExportAction<TData, TFilters, DataGridSortState>>
  onRowClick?: (row: TData) => void
  selectedRowId?: string | null
  getRowId?: (row: TData, index: number) => string
  emptyTitle?: string
  emptyDescription?: string
  mobilePinningBreakpoint?: number
  className?: string
}

const DEFAULT_PAGE_SIZES = [8, 12, 24, 48]

const getColumnId = <TData extends RowData, TValue>(
  column: ColumnDef<TData, TValue>
) => {
  if (column.id) return column.id
  if ("accessorKey" in column && column.accessorKey) {
    return String(column.accessorKey)
  }
  return ""
}

const buildDefaultColumnVisibility = <TData extends RowData>(
  columns: Array<ColumnDef<TData, unknown>>
) =>
  columns.reduce<VisibilityState>((visibility, column) => {
    const id = getColumnId(column)
    if (!id) return visibility
    visibility[id] = column.meta?.defaultVisible ?? true
    return visibility
  }, {})

const buildDefaultColumnOrder = <TData extends RowData>(
  columns: Array<ColumnDef<TData, unknown>>
) =>
  [...columns]
    .sort((a, b) => {
      const aPriority = a.meta?.orderPriority ?? Number.MAX_SAFE_INTEGER
      const bPriority = b.meta?.orderPriority ?? Number.MAX_SAFE_INTEGER
      if (aPriority !== bPriority) return aPriority - bPriority
      return getColumnId(a).localeCompare(getColumnId(b))
    })
    .map(getColumnId)
    .filter(Boolean)

const buildDefaultColumnPinning = <TData extends RowData>(
  columns: Array<ColumnDef<TData, unknown>>
) => {
  const pinning: ColumnPinningState = { left: [], right: [] }

  for (const column of columns) {
    const id = getColumnId(column)
    if (!id) continue
    if (column.meta?.defaultPinned === "left") {
      pinning.left = [...(pinning.left ?? []), id]
    }
    if (column.meta?.defaultPinned === "right") {
      pinning.right = [...(pinning.right ?? []), id]
    }
  }

  return pinning
}

const buildDefaultColumnSizing = <TData extends RowData>(
  columns: Array<ColumnDef<TData, unknown>>
) =>
  columns.reduce<ColumnSizingState>((sizing, column) => {
    const id = getColumnId(column)
    if (!id) return sizing
    const size = typeof column.size === "number" ? column.size : undefined
    const minSize = column.meta?.minSize ?? column.minSize
    sizing[id] = size ?? minSize ?? 180
    return sizing
  }, {})

const mergePreferences = (
  defaults: DataGridStoredPreferences,
  stored: DataGridStoredPreferences | null
): DataGridStoredPreferences => ({
  columnVisibility: {
    ...(defaults.columnVisibility ?? {}),
    ...(stored?.columnVisibility ?? {}),
  },
  columnOrder:
    stored?.columnOrder && stored.columnOrder.length > 0
      ? stored.columnOrder
      : defaults.columnOrder,
  columnPinning: {
    left: stored?.columnPinning?.left ?? defaults.columnPinning?.left ?? [],
    right: stored?.columnPinning?.right ?? defaults.columnPinning?.right ?? [],
  },
  columnSizing: {
    ...(defaults.columnSizing ?? {}),
    ...(stored?.columnSizing ?? {}),
  },
})

const getAlignmentClassName = (align?: DataGridColumnMeta["align"]) => {
  switch (align) {
    case "center":
      return "text-center"
    case "right":
      return "text-right"
    default:
      return "text-left"
  }
}

const getVisiblePageNumbers = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage])
  pages.add(Math.max(1, currentPage - 1))
  pages.add(Math.min(totalPages, currentPage + 1))
  pages.add(Math.max(1, currentPage - 2))
  pages.add(Math.min(totalPages, currentPage + 2))

  return Array.from(pages).sort((a, b) => a - b)
}

const isFilterActive = <TFilters,>(
  definition: DataGridFilterDefinition<TFilters>,
  filters: TFilters
) => {
  switch (definition.kind) {
    case "search":
    case "single-select": {
      const value = definition.getValue(filters) as string | null | undefined
      return typeof value === "string" && value.length > 0
    }
    case "multi-select":
      return (definition.getValue(filters) as string[]).length > 0
    case "boolean":
      return (() => {
        const value = definition.getValue(filters) as boolean | null | undefined
        return value === true || value === false
      })()
    case "date-range": {
      const value = definition.getValue(filters) as DataGridDateRangeValue | null
      return Boolean(value?.from || value?.to)
    }
    case "custom":
      return Boolean(definition.getValue(filters))
  }
}

const getFilterSummary = <TFilters,>(
  definition: DataGridFilterDefinition<TFilters>,
  filters: TFilters,
  options: DataGridFilterOption[]
) => {
  switch (definition.kind) {
    case "search": {
      const value = definition.getValue(filters) as string | null | undefined
      return typeof value === "string" && value.length > 0 ? value : null
    }
    case "single-select":
      return (() => {
        const value = definition.getValue(filters) as string | null | undefined
        return options.find((option) => option.value === value)?.label ?? value ?? null
      })()
    case "multi-select": {
      const value = definition.getValue(filters) as string[]
      return value.length > 0 ? `${value.length} selected` : null
    }
    case "boolean": {
      const value = definition.getValue(filters) as boolean | null | undefined
      if (value === true) return definition.trueLabel ?? "Yes"
      if (value === false) return definition.falseLabel ?? "No"
      return null
    }
    case "date-range": {
      const value = definition.getValue(filters) as DataGridDateRangeValue | null
      return value?.label ?? null
    }
    case "custom":
      return null
  }
}

const getPinnedCellStyles = <
  TData extends RowData,
  TValue,
>(
  headerOrColumn: Header<TData, TValue>["column"],
  stickyEnabled: boolean
): React.CSSProperties => {
  const pinnedSide = stickyEnabled ? headerOrColumn.getIsPinned() : false
  const baseSize = headerOrColumn.getSize()

  if (!pinnedSide) {
    return {
      width: baseSize,
      minWidth: baseSize,
    }
  }

  const shadow =
    pinnedSide === "left" && headerOrColumn.getIsLastColumn("left")
      ? "8px 0 18px -14px rgba(15, 23, 42, 0.32)"
      : pinnedSide === "right" && headerOrColumn.getIsFirstColumn("right")
        ? "-8px 0 18px -14px rgba(15, 23, 42, 0.32)"
        : undefined

  return {
    width: baseSize,
    minWidth: baseSize,
    position: "sticky",
    left: pinnedSide === "left" ? `${headerOrColumn.getStart("left")}px` : undefined,
    right:
      pinnedSide === "right"
        ? `${headerOrColumn.getAfter("right")}px`
        : undefined,
    boxShadow: shadow,
    zIndex: pinnedSide ? 3 : 1,
  }
}

function DataGridFilterBar<TFilters>({
  definitions,
  filters,
  onFiltersChange,
}: {
  definitions: Array<DataGridFilterDefinition<TFilters>>
  filters: TFilters
  onFiltersChange: (filters: TFilters) => void
}) {
  const [optionState, setOptionState] = React.useState<
    Record<string, DataGridFilterOption[]>
  >({})

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      const resolvedEntries = await Promise.all(
        definitions.map(async (definition) => {
          if (
            definition.kind !== "single-select" &&
            definition.kind !== "multi-select"
          ) {
            return [definition.id, []] as const
          }

          if (definition.options) {
            return [definition.id, definition.options] as const
          }

          if (definition.loadOptions) {
            return [definition.id, await definition.loadOptions()] as const
          }

          return [definition.id, []] as const
        })
      )

      if (!cancelled) {
        setOptionState(Object.fromEntries(resolvedEntries))
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [definitions])

  const activeFilterCount = React.useMemo(
    () =>
      definitions.filter((definition) => isFilterActive(definition, filters)).length,
    [definitions, filters]
  )

  const resetFilters = React.useCallback(() => {
    let nextFilters = filters
    for (const definition of definitions) {
      if (definition.getResetValue) {
        nextFilters = definition.setValue(
          nextFilters,
          definition.getResetValue() as never
        )
        continue
      }

      switch (definition.kind) {
        case "search":
        case "single-select":
          nextFilters = definition.setValue(nextFilters, null)
          break
        case "multi-select":
          nextFilters = definition.setValue(nextFilters, [])
          break
        case "boolean":
          nextFilters = definition.setValue(nextFilters, null)
          break
        case "date-range":
          nextFilters = definition.setValue(nextFilters, null)
          break
        case "custom":
          break
      }
    }
    onFiltersChange(nextFilters)
  }, [definitions, filters, onFiltersChange])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {definitions.map((definition) => {
        if (definition.kind === "search") {
          return (
            <div key={definition.id} className="relative min-w-[240px] max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={definition.getValue(filters) ?? ""}
                placeholder={definition.placeholder ?? `Search ${definition.label.toLowerCase()}`}
                onChange={(event) => {
                  onFiltersChange(
                    definition.setValue(filters, event.target.value || null)
                  )
                }}
                className="pl-9"
              />
            </div>
          )
        }

        if (definition.kind === "custom") {
          return (
            <React.Fragment key={definition.id}>
              {definition.render({
                definition,
                filters,
                onFiltersChange,
              } satisfies DataGridCustomFilterRenderProps<TFilters>)}
            </React.Fragment>
          )
        }

        if (definition.kind === "date-range") {
          const value = definition.getValue(filters)
          const pickerKey = `${definition.id}:${value?.from ?? ""}:${value?.to ?? ""}:${value?.mode ?? ""}`

          return (
            <DateRangePicker
              key={pickerKey}
              label={definition.label}
              placeholder={definition.placeholder ?? definition.label}
              initialDateFrom={value?.from ?? null}
              initialDateTo={value?.to ?? null}
              initialMode={value?.mode ?? "range"}
              modes={["range", "after", "before"]}
              clearable
              showPresets={false}
              onUpdate={(update: DateRangePickerUpdate) => {
                const nextValue =
                  update.iso.from || update.iso.to
                    ? {
                        from: update.iso.from,
                        to: update.iso.to,
                        mode: update.mode,
                        label: update.formatted.label,
                      }
                    : null

                onFiltersChange(definition.setValue(filters, nextValue))
              }}
              triggerClassName="w-[220px] justify-between"
            />
          )
        }

        const options = optionState[definition.id] ?? []
        const summary = getFilterSummary(definition, filters, options)
        const active = isFilterActive(definition, filters)

        return (
          <Popover key={definition.id}>
            <PopoverTrigger asChild>
              <Button variant={active ? "default" : "outline"} size="sm">
                <Filter className="size-4" />
                {definition.label}
                {summary ? (
                  <Badge
                    variant={active ? "secondary" : "outline"}
                    className="ml-1"
                  >
                    {summary}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-3">
                <div>
                  <div className="font-medium">{definition.label}</div>
                  {definition.description ? (
                    <p className="text-sm text-muted-foreground">
                      {definition.description}
                    </p>
                  ) : null}
                </div>

                {definition.kind === "single-select" && (
                  <div className="space-y-2">
                    <Button
                      variant={!definition.getValue(filters) ? "secondary" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() =>
                        onFiltersChange(definition.setValue(filters, null))
                      }
                    >
                      All
                    </Button>
                    {options.map((option) => {
                      const selected = definition.getValue(filters) === option.value
                      return (
                        <Button
                          key={option.value}
                          variant={selected ? "secondary" : "outline"}
                          size="sm"
                          className="w-full justify-between"
                          onClick={() =>
                            onFiltersChange(
                              definition.setValue(
                                filters,
                                selected ? null : option.value
                              )
                            )
                          }
                        >
                          <span>{option.label}</span>
                          {selected ? <Eye className="size-4" /> : null}
                        </Button>
                      )
                    })}
                  </div>
                )}

                {definition.kind === "multi-select" && (
                  <div className="space-y-2">
                    {options.map((option) => {
                      const selected = definition
                        .getValue(filters)
                        .includes(option.value)

                      return (
                        <Button
                          key={option.value}
                          variant={selected ? "secondary" : "outline"}
                          size="sm"
                          className="w-full justify-between"
                          onClick={() => {
                            const currentValues = definition.getValue(filters)
                            const nextValues = selected
                              ? currentValues.filter((value) => value !== option.value)
                              : [...currentValues, option.value]

                            onFiltersChange(
                              definition.setValue(filters, nextValues)
                            )
                          }}
                        >
                          <span>{option.label}</span>
                          {selected ? <Eye className="size-4" /> : null}
                        </Button>
                      )
                    })}
                  </div>
                )}

                {definition.kind === "boolean" && (
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={definition.getValue(filters) == null ? "secondary" : "outline"}
                      size="sm"
                      onClick={() =>
                        onFiltersChange(definition.setValue(filters, null))
                      }
                    >
                      All
                    </Button>
                    <Button
                      variant={definition.getValue(filters) === true ? "secondary" : "outline"}
                      size="sm"
                      onClick={() =>
                        onFiltersChange(definition.setValue(filters, true))
                      }
                    >
                      {definition.trueLabel ?? "Yes"}
                    </Button>
                    <Button
                      variant={definition.getValue(filters) === false ? "secondary" : "outline"}
                      size="sm"
                      onClick={() =>
                        onFiltersChange(definition.setValue(filters, false))
                      }
                    >
                      {definition.falseLabel ?? "No"}
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )
      })}

      {activeFilterCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="size-4" />
          Reset
          <Badge variant="secondary">{activeFilterCount}</Badge>
        </Button>
      ) : null}
    </div>
  )
}

function DataGridColumnPanel<TData extends RowData>({
  table,
  columnOrder,
  onColumnOrderChange,
}: {
  table: ReturnType<typeof useReactTable<TData>>
  columnOrder: ColumnOrderState
  onColumnOrderChange: React.Dispatch<React.SetStateAction<ColumnOrderState>>
}) {
  const allColumns = table
    .getAllLeafColumns()
    .filter((column) => column.columnDef.enableHiding !== false)

  const moveColumn = (columnId: string, direction: "up" | "down") => {
    onColumnOrderChange((currentOrder) => {
      const workingOrder =
        currentOrder.length > 0 ? [...currentOrder] : allColumns.map((column) => column.id)
      const currentIndex = workingOrder.indexOf(columnId)
      if (currentIndex === -1) return workingOrder

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= workingOrder.length) {
        return workingOrder
      }

      const nextOrder = [...workingOrder]
      const [columnValue] = nextOrder.splice(currentIndex, 1)
      nextOrder.splice(targetIndex, 0, columnValue)
      return nextOrder
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="size-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0">
        <Card className="gap-0 border-0 py-0 shadow-none">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Column controls</CardTitle>
            <CardDescription>
              Show, hide, reorder, and pin columns without touching CSS.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-auto py-4">
            {allColumns.map((column) => {
              const meta = column.columnDef.meta
              const pinState = column.getIsPinned() as DataGridPinnedSide | false
              const label =
                meta?.label ??
                (typeof column.columnDef.header === "string"
                  ? column.columnDef.header
                  : column.id)

              return (
                <div
                  key={column.id}
                  className="rounded-lg border bg-background/70 p-3"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{label}</div>
                      {meta?.description ? (
                        <p className="text-xs text-muted-foreground">
                          {meta.description}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="outline">
                      {pinState ? `Pinned ${pinState}` : "Standard"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={column.getIsVisible() ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => column.toggleVisibility(!column.getIsVisible())}
                    >
                      {column.getIsVisible() ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                      {column.getIsVisible() ? "Visible" : "Hidden"}
                    </Button>

                    <Button
                      variant={pinState === "left" ? "secondary" : "outline"}
                      size="sm"
                      disabled={!column.getCanPin()}
                      onClick={() => column.pin(pinState === "left" ? false : "left")}
                    >
                      <Pin className="size-4" />
                      Pin left
                    </Button>

                    <Button
                      variant={pinState === "right" ? "secondary" : "outline"}
                      size="sm"
                      disabled={!column.getCanPin()}
                      onClick={() =>
                        column.pin(pinState === "right" ? false : "right")
                      }
                    >
                      <Pin className="size-4" />
                      Pin right
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pinState}
                      onClick={() => column.pin(false)}
                    >
                      <PinOff className="size-4" />
                      Unpin
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveColumn(column.id, "up")}
                    >
                      <ArrowUp className="size-4" />
                      Earlier
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveColumn(column.id, "down")}
                    >
                      <ArrowDown className="size-4" />
                      Later
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

export function DataGrid<TData extends RowData, TFilters>({
  tableId,
  columns,
  rows,
  filters,
  onFiltersChange,
  filterDefinitions = [],
  sorting,
  onSortingChange,
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  error,
  onRefresh,
  actionButtons,
  exportActions,
  onRowClick,
  selectedRowId,
  getRowId,
  emptyTitle = "No matching records",
  emptyDescription = "Adjust your filters or try a different view.",
  mobilePinningBreakpoint = 1024,
  className,
}: DataGridProps<TData, TFilters>) {
  const defaultPreferences = React.useMemo<DataGridStoredPreferences>(
    () => ({
      columnVisibility: buildDefaultColumnVisibility(columns),
      columnOrder: buildDefaultColumnOrder(columns),
      columnPinning: buildDefaultColumnPinning(columns),
      columnSizing: buildDefaultColumnSizing(columns),
    }),
    [columns]
  )

  const initialPreferences = React.useMemo(
    () => mergePreferences(defaultPreferences, readDataGridPreferences(tableId)),
    [defaultPreferences, tableId]
  )

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialPreferences.columnVisibility ?? {}
  )
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    initialPreferences.columnOrder ?? []
  )
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialPreferences.columnPinning ?? { left: [], right: [] }
  )
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
    initialPreferences.columnSizing ?? {}
  )
  const [pinningEnabled, setPinningEnabled] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery =
      typeof window !== "undefined"
        ? window.matchMedia(`(min-width: ${mobilePinningBreakpoint}px)`)
        : null

    if (!mediaQuery) return

    const handleChange = (event: MediaQueryListEvent) => {
      setPinningEnabled(event.matches)
    }

    setPinningEnabled(mediaQuery.matches)
    mediaQuery.addEventListener("change", handleChange)

    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [mobilePinningBreakpoint])

  React.useEffect(() => {
    writeDataGridPreferences(tableId, {
      columnVisibility,
      columnOrder,
      columnPinning,
      columnSizing,
    })
  }, [columnOrder, columnPinning, columnSizing, columnVisibility, tableId])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnPinning: pinningEnabled
        ? columnPinning
        : { left: [], right: [] },
      columnSizing,
    },
    defaultColumn: {
      minSize: 120,
      size: 180,
      maxSize: 420,
    },
    manualSorting: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onSortingChange: (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater
      onSortingChange(nextSorting)
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
  })

  const pageNumbers = React.useMemo(
    () => getVisiblePageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  )

  const exportContext = React.useMemo(
    () => ({
      rows,
      filters,
      sorting,
      currentPage,
      pageSize,
      totalCount,
      visibleColumnIds: table.getVisibleLeafColumns().map((column) => column.id),
    }),
    [currentPage, filters, pageSize, rows, sorting, table, totalCount]
  )

  return (
    <Card className={cn("gap-0 overflow-hidden border shadow-sm", className)}>
      <CardHeader className="gap-4 border-b py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <DataGridFilterBar
            definitions={filterDefinitions}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />

          <div className="flex flex-wrap items-center gap-2">
            {actionButtons}
            {onRefresh ? (
              <Button variant="outline" size="sm" onClick={() => void onRefresh()}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
            ) : null}
            {exportActions && exportActions.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="size-4" />
                    Export
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="font-medium">Export current view</div>
                      <p className="text-sm text-muted-foreground">
                        Plug in host-owned exports for CSV, spreadsheets, JSON, or
                        downstream workflows.
                      </p>
                    </div>
                    {exportActions.map((action) => (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => void action.onExport(exportContext)}
                      >
                        <div className="flex flex-col items-start">
                          <span>{action.label}</span>
                          {action.description ? (
                            <span className="text-xs text-muted-foreground">
                              {action.description}
                            </span>
                          ) : null}
                        </div>
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}

            <DataGridColumnPanel
              table={table}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="overflow-auto">
          <table
            className="w-full border-separate border-spacing-0 text-sm"
            style={{ minWidth: "100%", width: table.getTotalSize() }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta
                    const sortable = header.column.getCanSort()
                    const sortState = header.column.getIsSorted()

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        style={getPinnedCellStyles(header.column, pinningEnabled)}
                        className={cn(
                          "border-b bg-background px-4 py-3 text-left align-middle text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground",
                          "sticky top-0 z-20",
                          getAlignmentClassName(meta?.align),
                          meta?.headerClassName
                        )}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="relative flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!sortable}
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "flex min-w-0 items-center gap-2 text-left",
                                sortable
                                  ? "cursor-pointer transition-colors hover:text-foreground"
                                  : "cursor-default"
                              )}
                            >
                              <span className="truncate">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                              {sortable ? (
                                sortState === "asc" ? (
                                  <ArrowUp className="size-4" />
                                ) : sortState === "desc" ? (
                                  <ArrowDown className="size-4" />
                                ) : (
                                  <ArrowUpDown className="size-4 opacity-60" />
                                )
                              ) : null}
                            </button>

                            {header.column.getCanResize() ? (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className="absolute inset-y-0 right-0 z-30 w-2 cursor-col-resize touch-none select-none"
                              >
                                <div className="absolute right-0 top-1/2 h-6 w-px -translate-y-1/2 bg-border" />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {error ? (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="px-6 py-10 text-center"
                  >
                    <div className="space-y-2">
                      <div className="text-base font-medium">Unable to load data</div>
                      <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : isLoading ? (
                Array.from({ length: Math.min(pageSize, 8) }).map((_, rowIndex) => (
                  <tr key={`loading-${rowIndex}`}>
                    {table.getVisibleLeafColumns().map((column) => (
                      <td
                        key={`${column.id}-${rowIndex}`}
                        style={getPinnedCellStyles(column, pinningEnabled)}
                        className="border-b bg-background px-4 py-3 align-middle"
                      >
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="px-6 py-12 text-center"
                  >
                    <div className="space-y-2">
                      <div className="text-base font-medium">{emptyTitle}</div>
                      <p className="text-sm text-muted-foreground">
                        {emptyDescription}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  (() => {
                    const isSelected = selectedRowId === row.id

                    return (
                      <tr
                        key={row.id}
                        aria-selected={isSelected}
                        className={cn(
                          "group border-b transition-colors",
                          onRowClick ? "cursor-pointer hover:bg-muted/40" : "",
                          isSelected && "bg-accent/35 hover:bg-accent/40"
                        )}
                        onClick={() => onRowClick?.(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta
                          return (
                            <td
                              key={cell.id}
                              style={getPinnedCellStyles(cell.column, pinningEnabled)}
                              className={cn(
                                "border-b bg-background px-4 py-3 align-middle group-hover:bg-muted/40",
                                isSelected && "bg-accent/35 group-hover:bg-accent/40",
                                getAlignmentClassName(meta?.align),
                                meta?.className
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })()
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <div className="flex flex-col gap-4 border-t px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Showing{" "}
            <span className="font-medium text-foreground">
              {rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {totalCount.toLocaleString()}
            </span>
          </span>

          <label className="flex items-center gap-2">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              {DEFAULT_PAGE_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <Badge variant="outline">
            {pinningEnabled ? "Pinning enabled" : "Pinning disabled on small screens"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>

          {pageNumbers.map((pageNumber, index) => {
            const previousValue = pageNumbers[index - 1]
            const showGap = previousValue && pageNumber - previousValue > 1

            return (
              <React.Fragment key={pageNumber}>
                {showGap ? (
                  <span className="px-1 text-sm text-muted-foreground">...</span>
                ) : null}
                <Button
                  variant={pageNumber === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </Button>
              </React.Fragment>
            )
          })}

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
