#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${REGISTRY_BASE_URL:-http://localhost:3002}"
SMOKE_APP_NAME="doless-data-grid-smoke-${RANDOM}-${RANDOM}"
WORKDIR="$(mktemp -d)"
APP_DIR="$WORKDIR/$SMOKE_APP_NAME"

trap 'rm -rf "$WORKDIR"' EXIT

find_installed_file() {
  local pattern="$1"

  find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.next/*" \
    -name "$pattern" \
    | head -n 1
}

to_alias_import() {
  local file_path="$1"
  file_path="${file_path#./}"
  file_path="${file_path#src/}"
  file_path="${file_path%.tsx}"
  file_path="${file_path%.ts}"
  echo "@/${file_path}"
}

echo "Creating temporary Next app at: $APP_DIR"
npx create-next-app@latest "$APP_DIR" --ts --app --eslint --use-npm --tailwind --src-dir --yes

cd "$APP_DIR"

echo "Initializing shadcn"
npx shadcn init -y -d --cwd "$APP_DIR"

echo "Installing data-grid and data-grid-page-shell from $BASE_URL"
npx shadcn add "${BASE_URL}/r/data-grid.json" "${BASE_URL}/r/data-grid-page-shell.json" -y --cwd "$APP_DIR"

echo "Installing dependencies"
npm install

cd "$APP_DIR"
DATA_GRID_FILE="$(find_installed_file "DataGrid.tsx")"
PAGE_SHELL_FILE="$(find_installed_file "DataGridPageShell.tsx")"
LIB_FILE="$(find . -type f -not -path "./node_modules/*" -not -path "./.next/*" -name "data-grid.ts" | head -n 1)"

if [ -z "$DATA_GRID_FILE" ] || [ -z "$PAGE_SHELL_FILE" ] || [ -z "$LIB_FILE" ]; then
  echo "Failed to locate installed files. Expected registry assets in project tree:"
  echo "  - DataGrid.tsx: ${DATA_GRID_FILE:-missing}"
  echo "  - DataGridPageShell.tsx: ${PAGE_SHELL_FILE:-missing}"
  echo "  - lib/data-grid.ts: ${LIB_FILE:-missing}"
  exit 1
fi

DATA_GRID_IMPORT="$(to_alias_import "$DATA_GRID_FILE")"
PAGE_SHELL_IMPORT="$(to_alias_import "$PAGE_SHELL_FILE")"
LIB_IMPORT="$(to_alias_import "$LIB_FILE")"

if [ -f "src/app/page.tsx" ]; then
  DEMO_PAGE="src/app/page.tsx"
elif [ -f "app/page.tsx" ]; then
  DEMO_PAGE="app/page.tsx"
else
  mkdir -p "app"
  DEMO_PAGE="app/page.tsx"
fi

cat > "$DEMO_PAGE" <<EOF
"use client"

import * as React from "react"
import { DataGrid } from "${DATA_GRID_IMPORT}"
import { DataGridPageShell } from "${PAGE_SHELL_IMPORT}"
import {
  createDataGridStateCodec,
  type DataGridBulkAction,
  type DataGridFilterDefinition,
  type DataGridLoaderArgs,
  type DataGridRowAction,
  type DataGridSortState,
  useDataGridController,
} from "${LIB_IMPORT}"
import type { ColumnDef } from "@tanstack/react-table"

type Customer = {
  id: string
  company: string
  plan: "starter" | "pro" | "enterprise"
  isActive: boolean
  teamSize: number
}

type CustomerFilters = {
  search: string | null
  plan: string | null
}

const FILTER_DEFINITIONS: Array<DataGridFilterDefinition<CustomerFilters>> = [
  {
    id: "search",
    label: "Search",
    kind: "search",
    paramKey: "q",
    getValue: (filters) => filters.search,
    setValue: (filters, value) => ({ ...filters, search: value ?? null }),
    placeholder: "Search customers",
  },
  {
    id: "plan",
    label: "Plan",
    kind: "single-select",
    paramKey: "plan",
    options: [
      { label: "Starter", value: "starter" },
      { label: "Pro", value: "pro" },
      { label: "Enterprise", value: "enterprise" },
    ],
    getValue: (filters) => filters.plan,
    setValue: (filters, value) => ({ ...filters, plan: value ?? null }),
  },
]

const DEFAULT_FILTERS: CustomerFilters = { search: null, plan: null }
const DEFAULT_SORTING: DataGridSortState = [{ id: "company", desc: false }]
const stateCodec = createDataGridStateCodec({
  filterDefinitions: FILTER_DEFINITIONS,
  pageParam: "page",
  pageSizeParam: "pageSize",
  sortParam: "sort",
})

const SEED_DATA: Customer[] = [
  {
    id: "c-001",
    company: "Northwind",
    plan: "enterprise",
    isActive: true,
    teamSize: 22,
  },
  { id: "c-002", company: "Acme", plan: "pro", isActive: true, teamSize: 4 },
  {
    id: "c-003",
    company: "Summit Studio",
    plan: "starter",
    isActive: false,
    teamSize: 2,
  },
  { id: "c-004", company: "Atlas Labs", plan: "pro", isActive: true, teamSize: 11 },
  {
    id: "c-005",
    company: "Nimbus Energy",
    plan: "enterprise",
    isActive: true,
    teamSize: 27,
  },
]

const COLUMNS: ColumnDef<Customer>[] = [
  { accessorKey: "company", header: "Company", meta: { orderPriority: 1 } },
  { accessorKey: "plan", header: "Plan", meta: { orderPriority: 2 } },
  { accessorKey: "teamSize", header: "Team Size", meta: { orderPriority: 3 } },
  {
    accessorKey: "isActive",
    header: "Active",
    meta: { orderPriority: 4 },
    cell: ({ getValue }) => (getValue<boolean>() ? "Active" : "Paused"),
  },
]

export default function DataGridSmokePage() {
  const tableId = "smoke-data-grid"
  const [rowsState, setRowsState] = React.useState(SEED_DATA)
  const [selectedId, setSelectedId] = React.useState<string | null>(SEED_DATA[0]?.id ?? null)
  const loadCustomers = React.useCallback(
    async ({
      page,
      pageSize,
      filters,
      sorting,
    }: DataGridLoaderArgs<CustomerFilters, DataGridSortState>) => {
      let rows = [...rowsState]

      if (filters.search) {
        const search = filters.search.toLowerCase()
        rows = rows.filter((row) => row.company.toLowerCase().includes(search))
      }

      if (filters.plan) {
        rows = rows.filter((row) => row.plan === filters.plan)
      }

      if (sorting.length > 0) {
        const sort = sorting[0]
        rows = [...rows].sort((left, right) => {
          const leftValue = String(left[sort.id as keyof Customer] ?? "")
          const rightValue = String(right[sort.id as keyof Customer] ?? "")
          const delta = leftValue.localeCompare(rightValue)
          return sort.desc ? -delta : delta
        })
      }

      const start = (page - 1) * pageSize
      const totalCount = rows.length

      return {
        rows: rows.slice(start, start + pageSize),
        totalCount,
      }
    },
    [rowsState]
  )

  const controller = useDataGridController<Customer, CustomerFilters, DataGridSortState>({
    tableId,
    initialFilters: DEFAULT_FILTERS,
    initialSorting: DEFAULT_SORTING,
    initialPage: 1,
    initialPageSize: 5,
    stateCodec,
    loadPage: loadCustomers,
    getRowId: (row) => row.id,
  })

  const updateRows = React.useCallback((rowIds: string[], isActive: boolean) => {
    const rowIdSet = new Set(rowIds)
    setRowsState((currentRows) =>
      currentRows.map((row) =>
        rowIdSet.has(row.id) ? { ...row, isActive } : row
      )
    )
    void controller.refresh()
  }, [controller])

  const rowActions = React.useMemo<Array<DataGridRowAction<Customer>>>(
    () => [
      {
        label: "Open detail",
        onSelect: (row) => setSelectedId(row.id),
      },
      {
        label: "Deactivate",
        variant: "outline",
        isDisabled: (row) => !row.isActive,
        onSelect: (row) => updateRows([row.id], false),
      },
    ],
    [updateRows]
  )

  const bulkActions = React.useMemo<Array<DataGridBulkAction<Customer>>>(
    () => [
      {
        label: "Mark active",
        variant: "outline",
        onSelect: (selectedRows) =>
          updateRows(
            selectedRows.map((row) => row.id),
            true
          ),
      },
    ],
    [updateRows]
  )

  return (
    <DataGridPageShell
      title="Data Grid Smoke App"
      subtitle="Registry install verification with saved views and action surfaces compiled."
      className="mx-auto w-full"
      detailPane={
        selectedId ? (
          <div className="rounded-xl border p-4 text-sm">
            Selected row: {selectedId}
          </div>
        ) : null
      }
    >
      <DataGrid
        tableId={tableId}
        columns={COLUMNS}
        rows={controller.rows}
        filters={controller.filters}
        onFiltersChange={controller.setFilters}
        filterDefinitions={FILTER_DEFINITIONS}
        sorting={controller.sorting}
        onSortingChange={controller.setSorting}
        currentPage={controller.currentPage}
        pageSize={controller.pageSize}
        totalCount={controller.totalCount}
        totalPages={controller.totalPages}
        onPageChange={controller.setCurrentPage}
        onPageSizeChange={controller.setPageSize}
        hasInitialUrlState={controller.hasInitialUrlState}
        isLoading={controller.isLoading}
        error={controller.error}
        onRefresh={controller.refresh}
        enableSavedViews
        rowActions={rowActions}
        bulkActions={bulkActions}
        selectedRowId={selectedId}
        onRowClick={(row) => setSelectedId(row.id)}
      />
    </DataGridPageShell>
  )
}
EOF

echo "Running build in scratch app"
npm run build
