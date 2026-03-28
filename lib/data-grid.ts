/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
import * as React from "react"
import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  RowData,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"

export type DataGridSortState = SortingState
export type DataGridPinnedSide = "left" | "right"
export type DataGridDateRangeMode = "range" | "after" | "before"

export interface DataGridDateRangeValue {
  from: string | null
  to: string | null
  mode: DataGridDateRangeMode | null
  label?: string | null
}

export interface DataGridFilterOption {
  label: string
  value: string
  helperText?: string
}

export interface DataGridColumnMeta {
  label?: string
  description?: string
  pinnable?: boolean
  defaultPinned?: DataGridPinnedSide
  defaultVisible?: boolean
  orderPriority?: number
  align?: "left" | "center" | "right"
  minSize?: number
  maxSize?: number
  className?: string
  headerClassName?: string
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> extends DataGridColumnMeta {}
}

type DataGridBaseFilterDefinition<TFilters, TValue> = {
  id: string
  label: string
  description?: string
  placeholder?: string
  paramKey?: string
  getValue: (filters: TFilters) => TValue
  setValue: (filters: TFilters, value: TValue) => TFilters
  getResetValue?: () => TValue
  parse?: (params: URLSearchParams, current: TFilters) => TValue
  serialize?: (value: TValue, current: TFilters) => Record<string, string | undefined>
}

export type DataGridCustomFilterRenderProps<TFilters> = {
  definition: DataGridFilterDefinition<TFilters>
  filters: TFilters
  onFiltersChange: (filters: TFilters) => void
}

export type DataGridFilterDefinition<TFilters> =
  | (DataGridBaseFilterDefinition<TFilters, string | null | undefined> & {
      kind: "search"
    })
  | (DataGridBaseFilterDefinition<TFilters, string | null | undefined> & {
      kind: "single-select"
      options?: DataGridFilterOption[]
      loadOptions?: () => Promise<DataGridFilterOption[]>
    })
  | (DataGridBaseFilterDefinition<TFilters, string[]> & {
      kind: "multi-select"
      options?: DataGridFilterOption[]
      loadOptions?: () => Promise<DataGridFilterOption[]>
    })
  | (DataGridBaseFilterDefinition<TFilters, boolean | null | undefined> & {
      kind: "boolean"
      trueLabel?: string
      falseLabel?: string
    })
  | (DataGridBaseFilterDefinition<TFilters, DataGridDateRangeValue | null> & {
      kind: "date-range"
    })
  | (DataGridBaseFilterDefinition<TFilters, unknown> & {
      kind: "custom"
      render: (props: DataGridCustomFilterRenderProps<TFilters>) => React.ReactNode
    })

export interface DataGridStateSnapshot<TFilters, TSort> {
  filters: TFilters
  sorting: TSort
  page: number
  pageSize: number
}

export interface DataGridStateCodec<TFilters, TSort> {
  parse: (
    params: URLSearchParams,
    defaults: DataGridStateSnapshot<TFilters, TSort>
  ) => Partial<DataGridStateSnapshot<TFilters, TSort>>
  serialize: (state: DataGridStateSnapshot<TFilters, TSort>) => URLSearchParams
  getOwnedParams?: () => string[]
}

export interface DataGridLoaderArgs<TFilters, TSort> {
  page: number
  pageSize: number
  filters: TFilters
  sorting: TSort
}

export interface DataGridLoaderResult<TData> {
  rows: TData[]
  totalCount: number
}

export type DataGridLoader<TData, TFilters, TSort> = (
  args: DataGridLoaderArgs<TFilters, TSort>
) => Promise<DataGridLoaderResult<TData>>

export interface DataGridStoredPreferences {
  columnVisibility?: VisibilityState
  columnOrder?: ColumnOrderState
  columnPinning?: ColumnPinningState
  columnSizing?: ColumnSizingState
}

export interface DataGridViewSnapshot<TFilters, TSort> extends DataGridStoredPreferences {
  filters: TFilters
  sorting: TSort
  pageSize: number
}

export interface DataGridSavedView<TFilters, TSort> {
  id: string
  name: string
  snapshot: DataGridViewSnapshot<TFilters, TSort>
  isDefault?: boolean
}

export interface DataGridSavedViewAdapter<TFilters, TSort> {
  list: () =>
    | Promise<Array<DataGridSavedView<TFilters, TSort>>>
    | Array<DataGridSavedView<TFilters, TSort>>
  create: (input: {
    name: string
    snapshot: DataGridViewSnapshot<TFilters, TSort>
    isDefault?: boolean
  }) =>
    | Promise<DataGridSavedView<TFilters, TSort>>
    | DataGridSavedView<TFilters, TSort>
  update: (
    viewId: string,
    updates: {
      name?: string
      snapshot?: DataGridViewSnapshot<TFilters, TSort>
      isDefault?: boolean
    }
  ) =>
    | Promise<DataGridSavedView<TFilters, TSort>>
    | DataGridSavedView<TFilters, TSort>
  delete: (viewId: string) => Promise<void> | void
}

export interface DataGridRowAction<TData> {
  label: string
  icon?: React.ReactNode
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost"
  onSelect: (row: TData) => Promise<void> | void
  isDisabled?: (row: TData) => boolean
  isHidden?: (row: TData) => boolean
}

export interface DataGridBulkAction<TData> {
  label: string
  icon?: React.ReactNode
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost"
  onSelect: (rows: TData[]) => Promise<void> | void
  isDisabled?: (rows: TData[]) => boolean
}

type DataGridPreferenceEnvelope = {
  version: number
  preferences: DataGridStoredPreferences
}

type DataGridSavedViewsEnvelope<TFilters, TSort> = {
  version: number
  views: Array<DataGridSavedView<TFilters, TSort>>
}

export interface CreateDataGridStateCodecOptions<TFilters> {
  filterDefinitions: Array<DataGridFilterDefinition<TFilters>>
  pageParam?: string
  pageSizeParam?: string
  sortParam?: string
}

export interface UseDataGridControllerArgs<TData, TFilters, TSort> {
  tableId: string
  initialFilters: TFilters
  initialSorting: TSort
  initialPage?: number
  initialPageSize?: number
  loadPage: DataGridLoader<TData, TFilters, TSort>
  stateCodec?: DataGridStateCodec<TFilters, TSort>
  syncToUrl?: boolean
  debounceMs?: number
  shouldDebounceLoad?: (nextFilters: TFilters, previousFilters: TFilters) => boolean
  getRowId?: (row: TData) => string
}

const DATA_GRID_STORAGE_VERSION = 1
const DATA_GRID_SAVED_VIEWS_VERSION = 1
const DEFAULT_PAGE_PARAM = "page"
const DEFAULT_PAGE_SIZE_PARAM = "page_size"
const DEFAULT_SORT_PARAM = "sort"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const clampPositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const parseSortingState = (value: string | null): SortingState => {
  if (!value) return []

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, direction] = entry.split(":")
      return {
        id,
        desc: direction === "desc",
      }
    })
    .filter((entry) => entry.id)
}

const serializeSortingState = (sorting: SortingState) =>
  sorting
    .map((entry) => `${entry.id}:${entry.desc ? "desc" : "asc"}`)
    .join(",")

const defaultSerializeFilter = <TFilters,>(
  definition: DataGridFilterDefinition<TFilters>,
  filters: TFilters
) => {
  const paramKey = definition.paramKey ?? definition.id

  switch (definition.kind) {
    case "search":
    case "single-select": {
      const value = definition.getValue(filters) as string | null | undefined
      return {
        [paramKey]: typeof value === "string" && value.length > 0 ? value : undefined,
      }
    }
    case "multi-select": {
      const value = definition.getValue(filters) as string[]
      return {
        [paramKey]: value.length > 0 ? value.join(",") : undefined,
      }
    }
    case "boolean": {
      const value = definition.getValue(filters) as boolean | null | undefined
      return {
        [paramKey]:
          value === true ? "true" : value === false ? "false" : undefined,
      }
    }
    case "date-range": {
      const rangeValue = definition.getValue(filters) as DataGridDateRangeValue | null
      return {
        [`${paramKey}_from`]: rangeValue?.from ?? undefined,
        [`${paramKey}_to`]: rangeValue?.to ?? undefined,
        [`${paramKey}_mode`]: rangeValue?.mode ?? undefined,
      }
    }
    case "custom":
      return {}
  }
}

const defaultParseFilter = <TFilters,>(
  definition: DataGridFilterDefinition<TFilters>,
  params: URLSearchParams,
  current: TFilters
) => {
  const paramKey = definition.paramKey ?? definition.id

  switch (definition.kind) {
    case "search":
    case "single-select": {
      const value = params.get(paramKey)
      return (value && value.length > 0 ? value : null) as ReturnType<
        typeof definition.getValue
      >
    }
    case "multi-select": {
      const value = params.get(paramKey)
      return (
        value
          ? value
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean)
          : []
      ) as ReturnType<typeof definition.getValue>
    }
    case "boolean": {
      const value = params.get(paramKey)
      return (
        value === "true" ? true : value === "false" ? false : null
      ) as ReturnType<typeof definition.getValue>
    }
    case "date-range": {
      const from = params.get(`${paramKey}_from`)
      const to = params.get(`${paramKey}_to`)
      const mode = params.get(`${paramKey}_mode`)
      if (!from && !to) {
        return null as ReturnType<typeof definition.getValue>
      }

      return {
        from: from ?? null,
        to: to ?? null,
        mode:
          mode === "range" || mode === "after" || mode === "before"
            ? mode
            : from && !to
              ? "after"
              : !from && to
                ? "before"
                : "range",
        label: null,
      } as ReturnType<typeof definition.getValue>
    }
    case "custom":
      return definition.getValue(current)
  }
}

export function createDataGridStateCodec<TFilters>({
  filterDefinitions,
  pageParam = DEFAULT_PAGE_PARAM,
  pageSizeParam = DEFAULT_PAGE_SIZE_PARAM,
  sortParam = DEFAULT_SORT_PARAM,
}: CreateDataGridStateCodecOptions<TFilters>): DataGridStateCodec<
  TFilters,
  SortingState
> {
  const ownedParams = Array.from(
    new Set(
      filterDefinitions.flatMap((definition) => {
        const paramKey = definition.paramKey ?? definition.id

        if (definition.kind === "date-range") {
          return [paramKey, `${paramKey}_from`, `${paramKey}_to`, `${paramKey}_mode`]
        }

        return [paramKey]
      })
    )
  )

  return {
    parse(params, defaults) {
      let filters = defaults.filters

      for (const definition of filterDefinitions) {
        const parsed = definition.parse
          ? definition.parse(params, filters)
          : defaultParseFilter(definition, params, filters)
        filters = definition.setValue(filters, parsed as never)
      }

      return {
        filters,
        page: clampPositiveInt(params.get(pageParam), defaults.page),
        pageSize: clampPositiveInt(params.get(pageSizeParam), defaults.pageSize),
        sorting: (() => {
          const parsedSorting = parseSortingState(params.get(sortParam))
          return parsedSorting.length > 0
            ? (parsedSorting as SortingState)
            : defaults.sorting
        })(),
      }
    },
    serialize(state) {
      const params = new URLSearchParams()

      for (const definition of filterDefinitions) {
        const serialized = definition.serialize
          ? definition.serialize(definition.getValue(state.filters) as never, state.filters)
          : defaultSerializeFilter(definition, state.filters)

        for (const [key, value] of Object.entries(serialized)) {
          if (value && value.length > 0) {
            params.set(key, value)
          }
        }
      }

      if (state.page > 1) {
        params.set(pageParam, String(state.page))
      }

      if (state.pageSize > 0) {
        params.set(pageSizeParam, String(state.pageSize))
      }

      const serializedSorting = serializeSortingState(
        state.sorting as unknown as SortingState
      )
      if (serializedSorting) {
        params.set(sortParam, serializedSorting)
      }

      return params
    },
    getOwnedParams() {
      return [...ownedParams, pageParam, pageSizeParam, sortParam]
    },
  }
}

export const buildDataGridPreferenceStorageKey = (tableId: string) =>
  `doless:data-grid:${tableId}:v${DATA_GRID_STORAGE_VERSION}`

export const buildDataGridSavedViewsStorageKey = (tableId: string) =>
  `doless:data-grid:saved-views:${tableId}:v${DATA_GRID_SAVED_VIEWS_VERSION}`

export const readDataGridPreferences = (
  tableId: string
): DataGridStoredPreferences | null => {
  if (typeof window === "undefined") return null

  try {
    const rawValue = window.localStorage.getItem(
      buildDataGridPreferenceStorageKey(tableId)
    )
    if (!rawValue) return null

    const parsed = JSON.parse(rawValue) as unknown
    if (!isRecord(parsed)) return null
    if (parsed.version !== DATA_GRID_STORAGE_VERSION) return null
    if (!isRecord(parsed.preferences)) return null

    return parsed.preferences as DataGridStoredPreferences
  } catch (error) {
    console.warn("Failed to read data grid preferences", error)
    return null
  }
}

export const writeDataGridPreferences = (
  tableId: string,
  preferences: DataGridStoredPreferences
) => {
  if (typeof window === "undefined") return

  try {
    const envelope: DataGridPreferenceEnvelope = {
      version: DATA_GRID_STORAGE_VERSION,
      preferences,
    }

    window.localStorage.setItem(
      buildDataGridPreferenceStorageKey(tableId),
      JSON.stringify(envelope)
    )
  } catch (error) {
    console.warn("Failed to persist data grid preferences", error)
  }
}

export const readDataGridSavedViews = <TFilters, TSort>(
  tableId: string
): Array<DataGridSavedView<TFilters, TSort>> => {
  if (typeof window === "undefined") return []

  try {
    const rawValue = window.localStorage.getItem(
      buildDataGridSavedViewsStorageKey(tableId)
    )
    if (!rawValue) return []

    const parsed = JSON.parse(rawValue) as unknown
    if (!isRecord(parsed)) return []
    if (parsed.version !== DATA_GRID_SAVED_VIEWS_VERSION) return []
    if (!Array.isArray(parsed.views)) return []

    return parsed.views as Array<DataGridSavedView<TFilters, TSort>>
  } catch (error) {
    console.warn("Failed to read data grid saved views", error)
    return []
  }
}

export const writeDataGridSavedViews = <TFilters, TSort>(
  tableId: string,
  views: Array<DataGridSavedView<TFilters, TSort>>
) => {
  if (typeof window === "undefined") return

  try {
    const envelope: DataGridSavedViewsEnvelope<TFilters, TSort> = {
      version: DATA_GRID_SAVED_VIEWS_VERSION,
      views,
    }

    window.localStorage.setItem(
      buildDataGridSavedViewsStorageKey(tableId),
      JSON.stringify(envelope)
    )
  } catch (error) {
    console.warn("Failed to persist data grid saved views", error)
  }
}

export function hydrateDataGridViewSnapshot<TFilters, TSort>(
  snapshot: DataGridViewSnapshot<TFilters, TSort>,
  filterDefinitions: Array<DataGridFilterDefinition<TFilters>>
): DataGridViewSnapshot<TFilters, TSort> {
  let hydratedFilters = snapshot.filters

  for (const definition of filterDefinitions) {
    if (definition.kind !== "date-range") {
      continue
    }

    const nextValue = definition.getValue(hydratedFilters)
    hydratedFilters = definition.setValue(hydratedFilters, nextValue as never)
  }

  return hydratedFilters === snapshot.filters
    ? snapshot
    : {
        ...snapshot,
        filters: hydratedFilters,
      }
}

const buildInitialSnapshot = <TFilters, TSort>(
  initialFilters: TFilters,
  initialSorting: TSort,
  initialPage: number,
  initialPageSize: number
): DataGridStateSnapshot<TFilters, TSort> => ({
  filters: initialFilters,
  sorting: initialSorting,
  page: initialPage,
  pageSize: initialPageSize,
})

export function useDataGridController<TData, TFilters, TSort>({
  tableId,
  initialFilters,
  initialSorting,
  initialPage = 1,
  initialPageSize = 25,
  loadPage,
  stateCodec,
  syncToUrl = true,
  debounceMs = 250,
  shouldDebounceLoad,
  getRowId,
}: UseDataGridControllerArgs<TData, TFilters, TSort>) {
  const initialSnapshotRef = React.useRef<DataGridStateSnapshot<TFilters, TSort>>(
    buildInitialSnapshot(
      initialFilters,
      initialSorting,
      initialPage,
      initialPageSize
    )
  )
  const initialControllerStateRef = React.useRef({
    filters: initialFilters,
    sorting: initialSorting,
    page: initialPage,
    pageSize: initialPageSize,
  })

  const [rows, setRows] = React.useState<TData[]>([])
  const [filters, setFiltersState] = React.useState(
    initialSnapshotRef.current.filters
  )
  const [sorting, setSortingState] = React.useState(
    initialSnapshotRef.current.sorting
  )
  const [page, setPage] = React.useState(initialSnapshotRef.current.page)
  const [pageSize, setPageSize] = React.useState(
    initialSnapshotRef.current.pageSize
  )
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = React.useState(0)
  const [initialUrlStateHydrated, setInitialUrlStateHydrated] = React.useState(
    !syncToUrl || !stateCodec
  )
  const [hasInitialUrlState, setHasInitialUrlState] = React.useState(false)

  const latestRequestIdRef = React.useRef(0)
  const previousFiltersRef = React.useRef(filters)
  const loadPageRef = React.useRef(loadPage)
  const shouldDebounceLoadRef = React.useRef(shouldDebounceLoad)

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
    [pageSize, totalCount]
  )

  React.useEffect(() => {
    loadPageRef.current = loadPage
  }, [loadPage])

  React.useEffect(() => {
    shouldDebounceLoadRef.current = shouldDebounceLoad
  }, [shouldDebounceLoad])

  React.useEffect(() => {
    if (!syncToUrl || !stateCodec || typeof window === "undefined") {
      setInitialUrlStateHydrated(true)
      setHasInitialUrlState(false)
      return
    }

    const defaults = buildInitialSnapshot(
      initialControllerStateRef.current.filters,
      initialControllerStateRef.current.sorting,
      initialControllerStateRef.current.page,
      initialControllerStateRef.current.pageSize
    )
    const currentParams = new URLSearchParams(window.location.search)
    const ownedParams = stateCodec.getOwnedParams?.() ?? []
    const hasOwnedUrlState = ownedParams.some((paramKey) => currentParams.has(paramKey))
    const parsed = stateCodec.parse(currentParams, defaults)

    setHasInitialUrlState(hasOwnedUrlState)
    setFiltersState(parsed.filters ?? defaults.filters)
    setSortingState(parsed.sorting ?? defaults.sorting)
    setPage(parsed.page ?? defaults.page)
    setPageSize(parsed.pageSize ?? defaults.pageSize)
    setInitialUrlStateHydrated(true)
  }, [
    stateCodec,
    syncToUrl,
  ])

  React.useEffect(() => {
    if (!initialUrlStateHydrated) {
      return
    }

    if (!syncToUrl || !stateCodec || typeof window === "undefined") {
      return
    }

    const nextGridParams = stateCodec.serialize({
      filters,
      sorting,
      page,
      pageSize,
    })
    const params = new URLSearchParams(window.location.search)

    for (const paramKey of stateCodec.getOwnedParams?.() ?? []) {
      params.delete(paramKey)
    }

    for (const [key, value] of nextGridParams.entries()) {
      params.set(key, value)
    }

    const query = params.toString()
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    window.history.replaceState({}, "", nextUrl)
  }, [filters, initialUrlStateHydrated, page, pageSize, sorting, stateCodec, syncToUrl])

  React.useEffect(() => {
    if (!syncToUrl || !stateCodec || typeof window === "undefined") {
      return
    }

    const handlePopState = () => {
      const parsed = stateCodec.parse(
        new URLSearchParams(window.location.search),
        {
          filters: initialControllerStateRef.current.filters,
          sorting: initialControllerStateRef.current.sorting,
          page: initialControllerStateRef.current.page,
          pageSize: initialControllerStateRef.current.pageSize,
        }
      )

      setFiltersState(parsed.filters ?? initialControllerStateRef.current.filters)
      setSortingState(parsed.sorting ?? initialControllerStateRef.current.sorting)
      setPage(parsed.page ?? initialControllerStateRef.current.page)
      setPageSize(parsed.pageSize ?? initialControllerStateRef.current.pageSize)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [
    stateCodec,
    syncToUrl,
  ])

  React.useEffect(() => {
    if (!initialUrlStateHydrated) {
      return
    }

    const requestId = ++latestRequestIdRef.current
    const previousFilters = previousFiltersRef.current
    previousFiltersRef.current = filters
    const debounce =
      shouldDebounceLoadRef.current?.(filters, previousFilters) === true
        ? debounceMs
        : 0

    let cancelled = false

    const run = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await loadPageRef.current({
          page,
          pageSize,
          filters,
          sorting,
        })

        if (cancelled || requestId !== latestRequestIdRef.current) {
          return
        }

        setRows(result.rows)
        setTotalCount(result.totalCount)
      } catch (caughtError) {
        if (cancelled || requestId !== latestRequestIdRef.current) {
          return
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load table data"
        )
      } finally {
        if (!cancelled && requestId === latestRequestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    if (debounce > 0) {
      const timeoutId = window.setTimeout(() => {
        void run()
      }, debounce)
      return () => {
        cancelled = true
        window.clearTimeout(timeoutId)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [debounceMs, filters, initialUrlStateHydrated, page, pageSize, refreshNonce, sorting, tableId])

  const setFilters = React.useCallback((nextFilters: TFilters) => {
    setPage(1)
    setFiltersState(nextFilters)
  }, [])

  const setSorting = React.useCallback((nextSorting: TSort) => {
    setPage(1)
    setSortingState(nextSorting)
  }, [])

  const refresh = React.useCallback(() => {
    setRefreshNonce((value) => value + 1)
  }, [])

  const patchRow = React.useCallback(
    (rowId: string, updater: (row: TData) => TData) => {
      if (!getRowId) return
      setRows((currentRows) =>
        currentRows.map((row) =>
          getRowId(row) === rowId ? updater(row) : row
        )
      )
    },
    [getRowId]
  )

  const replaceRow = React.useCallback(
    (rowId: string, nextRow: TData) => {
      if (!getRowId) return
      setRows((currentRows) =>
        currentRows.map((row) => (getRowId(row) === rowId ? nextRow : row))
      )
    },
    [getRowId]
  )

  return {
    rows,
    filters,
    sorting,
    currentPage: page,
    pageSize,
    totalCount,
    totalPages,
    isLoading,
    error,
    hasInitialUrlState,
    setFilters,
    setSorting,
    setCurrentPage: setPage,
    setPageSize,
    refresh,
    patchRow,
    replaceRow,
  }
}
/* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
