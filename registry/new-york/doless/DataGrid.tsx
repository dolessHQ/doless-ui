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
  type Table,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bookmark,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react"

import type {
  DataGridBulkAction,
  DataGridColumnMeta,
  DataGridCustomFilterRenderProps,
  DataGridDateRangeValue,
  DataGridFilterDefinition,
  DataGridFilterOption,
  DataGridPinnedSide,
  DataGridRowAction,
  DataGridSavedView,
  DataGridSavedViewAdapter,
  DataGridSortState,
  DataGridStoredPreferences,
  DataGridViewSnapshot,
} from "@/lib/data-grid"
import {
  readDataGridPreferences,
  readDataGridSavedViews,
  writeDataGridPreferences,
  writeDataGridSavedViews,
} from "@/lib/data-grid"
import { cn } from "@/lib/utils"
import { Badge } from "@/registry/new-york/ui/badge"
import { Button } from "@/registry/new-york/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/new-york/ui/card"
import {
  DateRangePicker,
  type DateRangePickerUpdate,
} from "@/registry/new-york/doless/DateRangePicker"
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

export interface DataGridSelectionChange<TData> {
  rowIds: string[]
  rows: TData[]
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
  hasInitialUrlState?: boolean
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => Promise<void> | void
  actionButtons?: React.ReactNode
  exportActions?: Array<DataGridExportAction<TData, TFilters, DataGridSortState>>
  enableSavedViews?: boolean
  savedViewsAdapter?: DataGridSavedViewAdapter<TFilters, DataGridSortState>
  rowActions?: Array<DataGridRowAction<TData>>
  bulkActions?: Array<DataGridBulkAction<TData>>
  onSelectionChange?: (selection: DataGridSelectionChange<TData>) => void
  onRowClick?: (row: TData) => void
  selectedRowId?: string | null
  getRowId?: (row: TData, index: number) => string
  emptyTitle?: string
  emptyDescription?: string
  mobilePinningBreakpoint?: number
  className?: string
}

const DEFAULT_PAGE_SIZES = [8, 12, 24, 48]

const cloneSerializable = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const createSavedViewId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

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

const buildSnapshot = <TFilters,>({
  filters,
  sorting,
  pageSize,
  columnVisibility,
  columnOrder,
  columnPinning,
  columnSizing,
}: {
  filters: TFilters
  sorting: DataGridSortState
  pageSize: number
  columnVisibility: VisibilityState
  columnOrder: ColumnOrderState
  columnPinning: ColumnPinningState
  columnSizing: ColumnSizingState
}): DataGridViewSnapshot<TFilters, DataGridSortState> => ({
  filters: cloneSerializable(filters),
  sorting: cloneSerializable(sorting),
  pageSize,
  columnVisibility: cloneSerializable(columnVisibility),
  columnOrder: cloneSerializable(columnOrder),
  columnPinning: cloneSerializable(columnPinning),
  columnSizing: cloneSerializable(columnSizing),
})

const isSnapshotEqual = <TFilters,>(
  left: DataGridViewSnapshot<TFilters, DataGridSortState>,
  right: DataGridViewSnapshot<TFilters, DataGridSortState>
) => JSON.stringify(left) === JSON.stringify(right)

const createLocalSavedViewsAdapter = <TFilters,>(
  tableId: string
): DataGridSavedViewAdapter<TFilters, DataGridSortState> => ({
  list() {
    return readDataGridSavedViews<TFilters, DataGridSortState>(tableId)
  },
  create(input) {
    const currentViews = readDataGridSavedViews<TFilters, DataGridSortState>(tableId)
    const nextView: DataGridSavedView<TFilters, DataGridSortState> = {
      id: createSavedViewId(),
      name: input.name,
      snapshot: cloneSerializable(input.snapshot),
      isDefault: input.isDefault ?? false,
    }

    const baseViews = input.isDefault
      ? currentViews.map((view) => ({ ...view, isDefault: false }))
      : currentViews

    writeDataGridSavedViews(tableId, [...baseViews, nextView])
    return nextView
  },
  update(viewId, updates) {
    const currentViews = readDataGridSavedViews<TFilters, DataGridSortState>(tableId)
    let updatedView: DataGridSavedView<TFilters, DataGridSortState> | null = null

    const nextViews = currentViews.map((view) => {
      if (updates.isDefault && view.id !== viewId) {
        return { ...view, isDefault: false }
      }

      if (view.id !== viewId) {
        return view
      }

      updatedView = {
        ...view,
        ...(updates.name ? { name: updates.name } : {}),
        ...(typeof updates.isDefault === "boolean"
          ? { isDefault: updates.isDefault }
          : {}),
        ...(updates.snapshot
          ? { snapshot: cloneSerializable(updates.snapshot) }
          : {}),
      }

      return updatedView
    })

    writeDataGridSavedViews(tableId, nextViews)
    return updatedView ?? currentViews.find((view) => view.id === viewId)!
  },
  delete(viewId) {
    const currentViews = readDataGridSavedViews<TFilters, DataGridSortState>(tableId)
    writeDataGridSavedViews(
      tableId,
      currentViews.filter((view) => view.id !== viewId)
    )
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

const hasRecognizedGridUrlState = <TFilters,>(
  params: URLSearchParams,
  filterDefinitions: Array<DataGridFilterDefinition<TFilters>>
) => {
  if (params.has("page") || params.has("page_size") || params.has("sort")) {
    return true
  }

  return filterDefinitions.some((definition) => {
    const paramKey = definition.paramKey ?? definition.id

    if (definition.kind === "date-range") {
      return (
        params.has(paramKey) ||
        params.has(`${paramKey}_from`) ||
        params.has(`${paramKey}_to`) ||
        params.has(`${paramKey}_mode`)
      )
    }

    return params.has(paramKey)
  })
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
    case "boolean": {
      const value = definition.getValue(filters) as boolean | null | undefined
      return value === true || value === false
    }
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
    case "single-select": {
      const value = definition.getValue(filters) as string | null | undefined
      return options.find((option) => option.value === value)?.label ?? value ?? null
    }
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

function SelectionCheckbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  ariaLabel,
}: {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange: (checked: boolean) => void
  ariaLabel: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-label={ariaLabel}
      className="size-4 rounded border border-border bg-background accent-primary"
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  )
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
                placeholder={
                  definition.placeholder ?? `Search ${definition.label.toLowerCase()}`
                }
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
                      variant={
                        definition.getValue(filters) == null ? "secondary" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        onFiltersChange(definition.setValue(filters, null))
                      }
                    >
                      All
                    </Button>
                    <Button
                      variant={
                        definition.getValue(filters) === true
                          ? "secondary"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        onFiltersChange(definition.setValue(filters, true))
                      }
                    >
                      {definition.trueLabel ?? "Yes"}
                    </Button>
                    <Button
                      variant={
                        definition.getValue(filters) === false
                          ? "secondary"
                          : "outline"
                      }
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

function DataGridViewsPanel<TFilters>({
  currentSnapshot,
  currentViewId,
  savedViews,
  isLoading,
  error,
  onApplyView,
  onCreateView,
  onOverwriteView,
  onRenameView,
  onDeleteView,
  onToggleDefault,
}: {
  currentSnapshot: DataGridViewSnapshot<TFilters, DataGridSortState>
  currentViewId: string | null
  savedViews: Array<DataGridSavedView<TFilters, DataGridSortState>>
  isLoading: boolean
  error: string | null
  onApplyView: (view: DataGridSavedView<TFilters, DataGridSortState>) => void
  onCreateView: (name: string) => Promise<void>
  onOverwriteView: (view: DataGridSavedView<TFilters, DataGridSortState>) => Promise<void>
  onRenameView: (
    view: DataGridSavedView<TFilters, DataGridSortState>,
    nextName: string
  ) => Promise<void>
  onDeleteView: (view: DataGridSavedView<TFilters, DataGridSortState>) => Promise<void>
  onToggleDefault: (
    view: DataGridSavedView<TFilters, DataGridSortState>
  ) => Promise<void>
}) {
  const [draftName, setDraftName] = React.useState("")
  const [editingViewId, setEditingViewId] = React.useState<string | null>(null)
  const [editingName, setEditingName] = React.useState("")
  const [busyKey, setBusyKey] = React.useState<string | null>(null)

  const sortedViews = React.useMemo(
    () =>
      [...savedViews].sort((left, right) => {
        if (Boolean(left.isDefault) !== Boolean(right.isDefault)) {
          return left.isDefault ? -1 : 1
        }

        return left.name.localeCompare(right.name)
      }),
    [savedViews]
  )

  const runBusyAction = React.useCallback(
    async (key: string, action: () => Promise<void>) => {
      setBusyKey(key)
      try {
        await action()
      } finally {
        setBusyKey(null)
      }
    },
    []
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="size-4" />
          Views
          {currentViewId ? (
            <Badge variant="secondary" className="max-w-32 truncate">
              {savedViews.find((view) => view.id === currentViewId)?.name ?? "Active"}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0">
        <Card className="gap-0 border-0 py-0 shadow-none">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Saved views</CardTitle>
            <CardDescription>
              Store named snapshots of filters, sorting, page size, and column layout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-3 text-sm font-medium">Save the current view</div>
              <div className="flex items-center gap-2">
                <Input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Leadership review"
                />
                <Button
                  size="sm"
                  disabled={!draftName.trim() || Boolean(busyKey)}
                  onClick={() =>
                    void runBusyAction("create", async () => {
                      await onCreateView(draftName.trim())
                      setDraftName("")
                    })
                  }
                >
                  <CheckCheck className="size-4" />
                  Save
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Current page is intentionally excluded. Applying a view always re-enters at
                page 1.
              </p>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              {isLoading ? (
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  Loading saved views...
                </div>
              ) : sortedViews.length === 0 ? (
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  No saved views yet. Save the current layout to create one.
                </div>
              ) : (
                sortedViews.map((view) => {
                  const isActive = currentViewId === view.id
                  const isEditing = editingViewId === view.id
                  const currentViewMatches = isSnapshotEqual(view.snapshot, currentSnapshot)

                  return (
                    <div
                      key={view.id}
                      className={cn(
                        "rounded-lg border p-3",
                        isActive && "border-primary/40 bg-primary/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                className="h-8"
                              />
                              <Button
                                size="sm"
                                disabled={!editingName.trim() || Boolean(busyKey)}
                                onClick={() =>
                                  void runBusyAction(`rename-${view.id}`, async () => {
                                    await onRenameView(view, editingName.trim())
                                    setEditingViewId(null)
                                    setEditingName("")
                                  })
                                }
                              >
                                <Check className="size-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingViewId(null)
                                  setEditingName("")
                                }}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 text-left"
                              onClick={() => onApplyView(view)}
                            >
                              <span className="truncate font-medium">{view.name}</span>
                              {view.isDefault ? (
                                <Badge variant="outline">Default</Badge>
                              ) : null}
                              {currentViewMatches ? (
                                <Badge variant="secondary">Live</Badge>
                              ) : null}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant={isActive ? "secondary" : "outline"}
                          size="sm"
                          disabled={Boolean(busyKey)}
                          onClick={() => onApplyView(view)}
                        >
                          <Check className="size-4" />
                          Apply
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(busyKey)}
                          onClick={() =>
                            void runBusyAction(`overwrite-${view.id}`, () =>
                              onOverwriteView(view)
                            )
                          }
                        >
                          <Bookmark className="size-4" />
                          Overwrite
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(busyKey)}
                          onClick={() => {
                            setEditingViewId(view.id)
                            setEditingName(view.name)
                          }}
                        >
                          <Pencil className="size-4" />
                          Rename
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(busyKey)}
                          onClick={() =>
                            void runBusyAction(`default-${view.id}`, () =>
                              onToggleDefault(view)
                            )
                          }
                        >
                          {view.isDefault ? (
                            <StarOff className="size-4" />
                          ) : (
                            <Star className="size-4" />
                          )}
                          {view.isDefault ? "Unset default" : "Make default"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={Boolean(busyKey)}
                          onClick={() =>
                            void runBusyAction(`delete-${view.id}`, () =>
                              onDeleteView(view)
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

function DataGridColumnPanel<TData extends RowData>({
  table,
  columnOrder,
  onColumnOrderChange,
}: {
  table: Table<TData>
  columnOrder: ColumnOrderState
  onColumnOrderChange: React.Dispatch<React.SetStateAction<ColumnOrderState>>
}) {
  const allColumns = table
    .getAllLeafColumns()
    .filter((column) => column.columnDef.enableHiding !== false)

  const moveColumn = (columnId: string, direction: "up" | "down") => {
    onColumnOrderChange((currentOrder) => {
      const workingOrder =
        currentOrder.length > 0
          ? [...currentOrder]
          : allColumns.map((column) => column.id)
      const currentIndex = workingOrder.indexOf(columnId)
      if (currentIndex === -1) return workingOrder

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
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

function DataGridRowActionsMenu<TData>({
  row,
  actions,
}: {
  row: TData
  actions: Array<DataGridRowAction<TData>>
}) {
  const [open, setOpen] = React.useState(false)
  const availableActions = React.useMemo(
    () => actions.filter((action) => !action.isHidden?.(row)),
    [actions, row]
  )

  if (availableActions.length === 0) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open row actions</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          {availableActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "outline"}
              className="w-full justify-start"
              disabled={action.isDisabled?.(row)}
              onClick={async (event) => {
                event.stopPropagation()
                await action.onSelect(row)
                setOpen(false)
              }}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
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
  hasInitialUrlState,
  isLoading = false,
  error,
  onRefresh,
  actionButtons,
  exportActions,
  enableSavedViews = false,
  savedViewsAdapter,
  rowActions = [],
  bulkActions = [],
  onSelectionChange,
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

  const initialUrlPresentRef = React.useRef(false)
  const defaultViewAppliedRef = React.useRef(false)
  const [preferencesHydrated, setPreferencesHydrated] = React.useState(false)

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    defaultPreferences.columnVisibility ?? {}
  )
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    defaultPreferences.columnOrder ?? []
  )
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    defaultPreferences.columnPinning ?? { left: [], right: [] }
  )
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
    defaultPreferences.columnSizing ?? {}
  )
  const [pinningEnabled, setPinningEnabled] = React.useState(false)
  const [selectedRowIds, setSelectedRowIds] = React.useState<string[]>([])
  const [savedViews, setSavedViews] = React.useState<
    Array<DataGridSavedView<TFilters, DataGridSortState>>
  >([])
  const [savedViewsLoading, setSavedViewsLoading] = React.useState(false)
  const [savedViewsError, setSavedViewsError] = React.useState<string | null>(null)

  const savedViewsEnabled = enableSavedViews || Boolean(savedViewsAdapter)

  const localSavedViewsAdapter = React.useMemo(
    () => createLocalSavedViewsAdapter<TFilters>(tableId),
    [tableId]
  )

  const effectiveSavedViewsAdapter = React.useMemo(
    () =>
      savedViewsEnabled
        ? savedViewsAdapter ?? localSavedViewsAdapter
        : null,
    [localSavedViewsAdapter, savedViewsAdapter, savedViewsEnabled]
  )

  React.useEffect(() => {
    initialUrlPresentRef.current =
      hasInitialUrlState ??
      hasRecognizedGridUrlState(
        new URLSearchParams(window.location.search),
        filterDefinitions
      )

    const storedPreferences = readDataGridPreferences(tableId)
    const hydratedPreferences = mergePreferences(defaultPreferences, storedPreferences)

    setColumnVisibility(hydratedPreferences.columnVisibility ?? {})
    setColumnOrder(hydratedPreferences.columnOrder ?? [])
    setColumnPinning(hydratedPreferences.columnPinning ?? { left: [], right: [] })
    setColumnSizing(hydratedPreferences.columnSizing ?? {})
    setPreferencesHydrated(true)
  }, [defaultPreferences, filterDefinitions, hasInitialUrlState, tableId])

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
    if (!preferencesHydrated) return

    writeDataGridPreferences(tableId, {
      columnVisibility,
      columnOrder,
      columnPinning,
      columnSizing,
    })
  }, [columnOrder, columnPinning, columnSizing, columnVisibility, preferencesHydrated, tableId])

  const currentSnapshot = React.useMemo(
    () =>
      buildSnapshot({
        filters,
        sorting,
        pageSize,
        columnVisibility,
        columnOrder,
        columnPinning,
        columnSizing,
      }),
    [
      columnOrder,
      columnPinning,
      columnSizing,
      columnVisibility,
      filters,
      pageSize,
      sorting,
    ]
  )

  const loadSavedViews = React.useCallback(async () => {
    if (!effectiveSavedViewsAdapter) {
      setSavedViews([])
      return
    }

    setSavedViewsLoading(true)
    setSavedViewsError(null)
    try {
      const nextViews = await effectiveSavedViewsAdapter.list()
      setSavedViews(nextViews)
    } catch (caughtError) {
      setSavedViewsError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load saved views"
      )
    } finally {
      setSavedViewsLoading(false)
    }
  }, [effectiveSavedViewsAdapter])

  React.useEffect(() => {
    void loadSavedViews()
  }, [loadSavedViews])

  const applyViewSnapshot = React.useCallback(
    (snapshot: DataGridViewSnapshot<TFilters, DataGridSortState>) => {
      setColumnVisibility(cloneSerializable(snapshot.columnVisibility ?? {}))
      setColumnOrder(cloneSerializable(snapshot.columnOrder ?? []))
      setColumnPinning(
        cloneSerializable(snapshot.columnPinning ?? { left: [], right: [] })
      )
      setColumnSizing(cloneSerializable(snapshot.columnSizing ?? {}))
      onPageSizeChange(snapshot.pageSize)
      onFiltersChange(cloneSerializable(snapshot.filters))
      onSortingChange(cloneSerializable(snapshot.sorting))
      onPageChange(1)
    },
    [onFiltersChange, onPageChange, onPageSizeChange, onSortingChange]
  )

  const currentMatchingView = React.useMemo(
    () =>
      savedViews.find((view) => isSnapshotEqual(view.snapshot, currentSnapshot)) ?? null,
    [currentSnapshot, savedViews]
  )

  React.useEffect(() => {
    if (
      !savedViewsEnabled ||
      savedViewsLoading ||
      savedViewsError ||
      defaultViewAppliedRef.current
    ) {
      return
    }

    defaultViewAppliedRef.current = true

    if (initialUrlPresentRef.current) {
      return
    }

    const defaultView = savedViews.find((view) => view.isDefault)
    if (!defaultView) {
      return
    }

    applyViewSnapshot(defaultView.snapshot)
  }, [
    applyViewSnapshot,
    savedViews,
    savedViewsEnabled,
    savedViewsError,
    savedViewsLoading,
  ])

  const handleCreateSavedView = React.useCallback(
    async (name: string) => {
      if (!effectiveSavedViewsAdapter) return

      await effectiveSavedViewsAdapter.create({
        name,
        snapshot: currentSnapshot,
      })
      await loadSavedViews()
    },
    [currentSnapshot, effectiveSavedViewsAdapter, loadSavedViews]
  )

  const handleOverwriteSavedView = React.useCallback(
    async (view: DataGridSavedView<TFilters, DataGridSortState>) => {
      if (!effectiveSavedViewsAdapter) return

      await effectiveSavedViewsAdapter.update(view.id, {
        snapshot: currentSnapshot,
      })
      await loadSavedViews()
    },
    [currentSnapshot, effectiveSavedViewsAdapter, loadSavedViews]
  )

  const handleRenameSavedView = React.useCallback(
    async (
      view: DataGridSavedView<TFilters, DataGridSortState>,
      nextName: string
    ) => {
      if (!effectiveSavedViewsAdapter) return

      await effectiveSavedViewsAdapter.update(view.id, { name: nextName })
      await loadSavedViews()
    },
    [effectiveSavedViewsAdapter, loadSavedViews]
  )

  const handleDeleteSavedView = React.useCallback(
    async (view: DataGridSavedView<TFilters, DataGridSortState>) => {
      if (!effectiveSavedViewsAdapter) return

      await effectiveSavedViewsAdapter.delete(view.id)
      await loadSavedViews()
    },
    [effectiveSavedViewsAdapter, loadSavedViews]
  )

  const handleToggleDefaultView = React.useCallback(
    async (view: DataGridSavedView<TFilters, DataGridSortState>) => {
      if (!effectiveSavedViewsAdapter) return

      await effectiveSavedViewsAdapter.update(view.id, {
        isDefault: !view.isDefault,
      })
      await loadSavedViews()
    },
    [effectiveSavedViewsAdapter, loadSavedViews]
  )

  const enhancedColumns = React.useMemo<Array<ColumnDef<TData, unknown>>>(() => {
    const nextColumns: Array<ColumnDef<TData, unknown>> = []

    if (bulkActions.length > 0) {
      nextColumns.push({
        id: "__selection",
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 52,
        minSize: 52,
        maxSize: 52,
        meta: {
          label: "Select",
          defaultPinned: "left",
          align: "center",
          orderPriority: -100,
          minSize: 52,
          maxSize: 52,
        },
        header: ({ table }) => {
          const pageRows = table.getRowModel().rows
          const pageRowIds = pageRows.map((row) => row.id)
          const allChecked =
            pageRowIds.length > 0 &&
            pageRowIds.every((rowId) => selectedRowIds.includes(rowId))
          const someChecked =
            !allChecked && pageRowIds.some((rowId) => selectedRowIds.includes(rowId))

          return (
            <div className="flex justify-center">
              <SelectionCheckbox
                checked={allChecked}
                indeterminate={someChecked}
                ariaLabel="Select current page"
                onCheckedChange={(checked) => {
                  setSelectedRowIds((currentSelected) => {
                    if (checked) {
                      return Array.from(
                        new Set([...currentSelected, ...pageRowIds])
                      )
                    }

                    const pageRowIdSet = new Set(pageRowIds)
                    return currentSelected.filter((rowId) => !pageRowIdSet.has(rowId))
                  })
                }}
              />
            </div>
          )
        },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <SelectionCheckbox
              checked={selectedRowIds.includes(row.id)}
              ariaLabel="Select row"
              onCheckedChange={(checked) => {
                setSelectedRowIds((currentSelected) =>
                  checked
                    ? Array.from(new Set([...currentSelected, row.id]))
                    : currentSelected.filter((rowId) => rowId !== row.id)
                )
              }}
            />
          </div>
        ),
      })
    }

    nextColumns.push(...columns)

    if (rowActions.length > 0) {
      nextColumns.push({
        id: "__row_actions",
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 72,
        minSize: 72,
        maxSize: 72,
        meta: {
          label: "Actions",
          defaultPinned: "right",
          align: "right",
          orderPriority: Number.MAX_SAFE_INTEGER - 1,
          minSize: 72,
          maxSize: 72,
        },
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div
            className="flex justify-end"
            onClick={(event) => event.stopPropagation()}
          >
            <DataGridRowActionsMenu row={row.original} actions={rowActions} />
          </div>
        ),
      })
    }

    return nextColumns
  }, [bulkActions.length, columns, rowActions, selectedRowIds])

  const table = useReactTable({
    data: rows,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnPinning: pinningEnabled ? columnPinning : { left: [], right: [] },
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

  const visibleRows = table.getRowModel().rows
  const visibleRowIdSignature = React.useMemo(
    () => visibleRows.map((row) => row.id).join("|"),
    [visibleRows]
  )

  const selectedVisibleRows = React.useMemo(
    () => visibleRows.filter((row) => selectedRowIds.includes(row.id)),
    [selectedRowIds, visibleRows]
  )
  const filtersSignature = React.useMemo(
    () => JSON.stringify(filters),
    [filters]
  )
  const sortingSignature = React.useMemo(
    () => JSON.stringify(sorting),
    [sorting]
  )

  React.useEffect(() => {
    if (bulkActions.length === 0) return
    setSelectedRowIds([])
  }, [bulkActions.length, currentPage, filtersSignature, pageSize, sortingSignature])

  React.useEffect(() => {
    if (bulkActions.length === 0) return

    const visibleRowIdSet = new Set(visibleRows.map((row) => row.id))
    setSelectedRowIds((currentSelected) => {
      const nextSelected = currentSelected.filter((rowId) =>
        visibleRowIdSet.has(rowId)
      )

      return nextSelected.length === currentSelected.length
        ? currentSelected
        : nextSelected
    })
  }, [bulkActions.length, visibleRowIdSignature, visibleRows])

  React.useEffect(() => {
    if (!onSelectionChange) return

    onSelectionChange({
      rowIds: selectedVisibleRows.map((row) => row.id),
      rows: selectedVisibleRows.map((row) => row.original),
    })
  }, [onSelectionChange, selectedVisibleRows])

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
            {savedViewsEnabled ? (
              <DataGridViewsPanel
                currentSnapshot={currentSnapshot}
                currentViewId={currentMatchingView?.id ?? null}
                savedViews={savedViews}
                isLoading={savedViewsLoading}
                error={savedViewsError}
                onApplyView={(view) => applyViewSnapshot(view.snapshot)}
                onCreateView={handleCreateSavedView}
                onOverwriteView={handleOverwriteSavedView}
                onRenameView={handleRenameSavedView}
                onDeleteView={handleDeleteSavedView}
                onToggleDefault={handleToggleDefaultView}
              />
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

      {bulkActions.length > 0 && selectedVisibleRows.length > 0 ? (
        <div className="border-b bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{selectedVisibleRows.length} selected</Badge>
              <span className="text-muted-foreground">
                Bulk actions are page-scoped in v1.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {bulkActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant ?? "outline"}
                  size="sm"
                  disabled={action.isDisabled?.(
                    selectedVisibleRows.map((row) => row.original)
                  )}
                  onClick={async () => {
                    await action.onSelect(
                      selectedVisibleRows.map((row) => row.original)
                    )
                    setSelectedRowIds([])
                  }}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRowIds([])}
              >
                <X className="size-4" />
                Clear selection
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
                table.getRowModel().rows.map((row) => {
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
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
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
