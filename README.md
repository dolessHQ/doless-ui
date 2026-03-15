# DolessHQ UI

DolessHQ UI is a collection of UI components for the DolessHQ platform.
Visit [DolessHQ UI](https://doless-ui.vercel.app/) to see the components in action.

## Registry Item: data-grid

`data-grid` is the shared table phenotype item for reusable, host-driven table experiences.

Install URL:
- https://doless-ui.vercel.app/r/data-grid.json

Install:
```bash
shadcn add https://doless-ui.vercel.app/r/data-grid.json
```

Required dependencies:
- `@tanstack/react-table`
- `lucide-react`
- registry dependencies: `badge`, `button`, `calendar`, `card`, `input`, `label`, `popover`, `separator`
- installable helper: `lib/data-grid.ts`

Required imports after install:
- `import { DataGrid } from "@/components/DataGrid"`
- `import { createDataGridStateCodec, useDataGridController } from "@/lib/data-grid"`

Public props/types and extension surface:
- `DataGrid` component props include:
  - data wiring: `tableId`, `columns`, `rows`, `totalCount`, `totalPages`
  - state hooks: `filters`, `onFiltersChange`, `sorting`, `onSortingChange`, `currentPage`, `onPageChange`, `pageSize`, `onPageSizeChange`
  - display controls: `filterDefinitions`, `exportActions`, `actionButtons`, `onRefresh`, `emptyTitle`, `emptyDescription`, `mobilePinningBreakpoint`
  - interactions: `onRowClick`, `selectedRowId`, `getRowId`
- `DataGridExportContext`, `DataGridExportAction` for host-owned export hooks.
- `DataGridFilterDefinition` schema API:
  - `search`
  - `single-select`
  - `multi-select`
  - `boolean`
  - `date-range`
  - `custom`
- `createDataGridStateCodec` and `DataGridStateCodec` for URL synchronization and custom codecs.
- `DataGridColumnMeta` for column defaults:
  - `pinnable`
  - `defaultPinned`
  - `defaultVisible`
  - `orderPriority`
  - `minSize`
  - `maxSize`
- `DataGridSavedView`, `DataGridViewSnapshot`, and `DataGridSavedViewAdapter` types are provided for host-owned saved-view implementations.
- `DataGridRowAction` and `DataGridBulkAction` types are provided for host-owned action models.
- `useDataGridController` + `DataGridLoader` for remote-load driven tables.
- `useDataGridController` also exposes `hasInitialUrlState` so host surfaces can preserve URL-over-saved-view precedence when composing a `DataGrid`.

Saved views behavior:
- Snapshot model includes filters, sorting, page size, and all column layout state (visibility/order/pinning/sizing).
- Set `enableSavedViews` to render the built-in `Views` control.
- Without a `savedViewsAdapter`, views persist locally under the current `tableId`.
- With a `savedViewsAdapter`, the same UI uses host-backed list/create/update/delete/default view behavior.
- `readDataGridSavedViews`/`writeDataGridSavedViews` are available from `lib/data-grid.ts` if you want to compose your own adapter or inspect local state.

Row actions and bulk actions behavior:
- Pass `rowActions` to render the shared trailing kebab-menu column.
- Pass `bulkActions` to render the shared leading checkbox-selection column and contextual bulk action bar.
- `DataGridRowAction` and `DataGridBulkAction` define the host-owned commands; the shared component renders the UI but does not impose domain semantics.
- Bulk selection is page-scoped in v1 and clears automatically on page, filter, sort, and page-size changes.

URL state and local preference behavior:
- Use `createDataGridStateCodec` with `stateCodec` + `syncToUrl` in `useDataGridController`.
- Default URL-backed state keys:
  - `page`, `page_size`, `sort`
  - filter keys from each `DataGridFilterDefinition`
- Local table preferences (`columnVisibility`, `columnOrder`, `columnPinning`, `columnSizing`) persist under `tableId`.
- When saved views are enabled, URL state wins on initial load, then default saved views, then local/current defaults.
- URL state is intended for shareable table state; local preferences are for UX memory across sessions.

Minimal consumer example:

```tsx
"use client"

import * as React from "react"
import { DataGrid, type DataGridExportAction } from "@/components/DataGrid"
import { DataGridPageShell } from "@/components/DataGridPageShell"
import {
  createDataGridStateCodec,
  type DataGridFilterDefinition,
  type DataGridLoaderArgs,
  type DataGridSortState,
  useDataGridController,
} from "@/lib/data-grid"
import type { ColumnDef } from "@tanstack/react-table"

type Customer = {
  id: string
  company: string
  plan: "starter" | "pro" | "growth"
  active: boolean
  teamCount: number
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
    getValue: (filters) => filters.search,
    setValue: (filters, value) => ({ ...filters, search: value ?? null }),
    placeholder: "Search customers",
  },
  {
    id: "plan",
    label: "Plan",
    kind: "single-select",
    options: [
      { label: "Starter", value: "starter" },
      { label: "Pro", value: "pro" },
      { label: "Growth", value: "growth" },
    ],
    getValue: (filters) => filters.plan,
    setValue: (filters, value) => ({ ...filters, plan: value ?? null }),
  },
]

const DEFAULT_FILTERS: CustomerFilters = { search: null, plan: null }
const DEFAULT_SORTING: DataGridSortState = [{ id: "company", desc: false }]
const stateCodec = createDataGridStateCodec({ filterDefinitions: FILTER_DEFINITIONS })

const CUSTOMERS: Customer[] = [
  { id: "c-1", company: "Northwind", plan: "growth", active: true, teamCount: 12 },
  { id: "c-2", company: "Acme", plan: "pro", active: false, teamCount: 4 },
  { id: "c-3", company: "Summit", plan: "starter", active: true, teamCount: 3 },
]

const loadCustomers = async ({
  page,
  pageSize,
  filters,
  sorting,
}: DataGridLoaderArgs<CustomerFilters, DataGridSortState>) => {
  let rows = [...CUSTOMERS]

  if (filters.search) {
    const search = filters.search.toLowerCase()
    rows = rows.filter((row) => row.company.toLowerCase().includes(search))
  }

  if (filters.plan) {
    rows = rows.filter((row) => row.plan === filters.plan)
  }

  if (sorting.length > 0) {
    const sort = sorting[0]
    rows = [...rows].sort((lhs, rhs) => {
      const left = String(lhs[sort.id as keyof Customer] ?? "")
      const right = String(rhs[sort.id as keyof Customer] ?? "")
      const delta = left.localeCompare(right)
      return sort.desc ? -delta : delta
    })
  }

  const offset = (page - 1) * pageSize
  const totalCount = rows.length

  return {
    rows: rows.slice(offset, offset + pageSize),
    totalCount,
  }
}

const COLUMNS: ColumnDef<Customer>[] = [
  { accessorKey: "company", header: "Company", meta: { orderPriority: 1 } },
  { accessorKey: "plan", header: "Plan", meta: { orderPriority: 2 } },
  { accessorKey: "teamCount", header: "Team Size", meta: { orderPriority: 3 } },
  {
    accessorKey: "active",
    header: "Active",
    cell: ({ getValue }) => (getValue<boolean>() ? "Active" : "Paused"),
    meta: { orderPriority: 4 },
  },
]

const EXPORT_ACTIONS: Array<DataGridExportAction<Customer, CustomerFilters, DataGridSortState>> = [
  {
    label: "Copy company names",
    onExport: ({ rows }) => {
      void navigator.clipboard.writeText(rows.map((row) => row.company).join("\n"))
    },
  },
]

export default function DataGridDemo() {
  const tableId = "smoke-data-grid-demo"
  const controller = useDataGridController<Customer, CustomerFilters, DataGridSortState>({
    tableId,
    initialFilters: DEFAULT_FILTERS,
    initialSorting: DEFAULT_SORTING,
    loadPage: loadCustomers,
    stateCodec,
  })

  return (
    <DataGridPageShell
      title="Data Grid Example"
      subtitle="Reusable table shell with schema-driven filters and URL state."
    >
      <DataGrid
        tableId={tableId}
        columns={COLUMNS}
        rows={controller.rows}
        filters={controller.filters}
        onFiltersChange={controller.setFilters}
        sorting={controller.sorting}
        onSortingChange={controller.setSorting}
        filterDefinitions={FILTER_DEFINITIONS}
        currentPage={controller.currentPage}
        pageSize={controller.pageSize}
        totalCount={controller.totalCount}
        totalPages={controller.totalPages}
        onPageChange={controller.setCurrentPage}
        onPageSizeChange={controller.setPageSize}
        isLoading={controller.isLoading}
        error={controller.error}
        onRefresh={controller.refresh}
        exportActions={EXPORT_ACTIONS}
      />
    </DataGridPageShell>
  )
}
```

## Registry Item: data-grid-page-shell

`data-grid-page-shell` is the shared page frame for a table-driven surface.

Install URL:
- https://doless-ui.vercel.app/r/data-grid-page-shell.json

Install:
```bash
shadcn add https://doless-ui.vercel.app/r/data-grid-page-shell.json
```

Public props:
- `eyebrow`
- `title`
- `subtitle`
- `primaryAction`
- `secondaryActions`
- `toolbar`
- `children`
- `detailPane`
- `footer`
- `dialogLayer`
- `className`
- `contentClassName`
- `detailPaneClassName`

The shell is intentionally host-owned beyond layout and does not implement data fetching, filtering, or domain actions.

## Custom Components (registry/doless)

The `registry/new-york/doless` folder also contains date and color components for broad reuse.

### ColorPickerPopover

A popover-based color picker with preset swatches and a custom color input.

Props:

- `value`: Current color hex string.
- `onChange`: Callback invoked with the next color string.
- `presets`: Optional array of preset hex strings.
- `children`: Trigger element rendered via `PopoverTrigger`.
- `className`: Optional class override for the popover content.

### DatePicker

Single-date picker with optional clear action and date bounds.

Props:

- `label`: Optional label text.
- `id`: Optional id for the trigger button.
- `value`: Controlled value (`Date`, ISO string, or `null`).
- `defaultValue`: Uncontrolled initial value (`Date`, ISO string, or `null`).
- `onChange`: Emits a `DatePickerValue` payload.
- `onBlur`: Optional blur callback after selection/close.
- `placeholder`: Placeholder text when no date is selected.
- `dateFormat`: Display format string (date-fns).
- `disabled`: Disables the trigger and calendar.
- `clearable`: Shows a clear action when true.
- `clearLabel`: Label for the clear action.
- `minDate`/`maxDate`: Date bounds (`Date`, ISO string, or `null`).
- `disabledDates`: `react-day-picker` disabled matcher(s).
- `numberOfMonths`: Number of months to show.
- `className`: Wrapper class override.
- `triggerClassName`: Trigger button class override.
- `calendarClassName`: Popover content class override.

`DatePickerValue` shape:

- `date`: Selected `Date` or `null`.
- `formatted`: Formatted display string or `null`.
- `iso`: ISO string or `null`.
- `label`: Friendly label string.

### DateRangePicker

Date range picker with range/before/after modes, presets, and clear action.

Props:

- `label`: Optional label text.
- `onUpdate`: Emits a `DateRangePickerUpdate` payload.
- `modes`: Array of enabled modes (`"range" | "after" | "before"`).
- `initialMode`: Starting selection mode.
- `initialDateFrom`/`initialDateTo`: Initial bounds (`Date`, ISO string, or `null`).
- `dateFormat`: Display format string (date-fns).
- `placeholder`: Placeholder text when no selection.
- `disabled`: Disables the trigger and calendar.
- `className`: Wrapper class override.
- `id`: Optional id for the trigger button.
- `numberOfMonths`: Number of months to show.
- `clearable`: Shows a clear action when true.
- `clearLabel`: Label for the clear action.
- `triggerClassName`: Trigger button class override.
- `showPresets`: Shows preset buttons when true.
- `calendarClassName`: Popover content class override.

`DateRangePickerUpdate` shape:

- `range`: Raw `react-day-picker` range or `undefined`.
- `from`/`to`: Normalized bounds for the active mode.
- `mode`: Active selection mode.
- `formatted`: `{ from, to, label }` strings.
- `iso`: `{ from, to }` ISO strings.

### MultiDatePicker

Multi-select date picker with removable date badges and optional max count.

Props:

- `label`: Optional label text.
- `id`: Optional id for the trigger button.
- `value`: Controlled array of ISO date strings.
- `defaultValue`: Uncontrolled array of ISO date strings.
- `onChange`: Emits a `MultiDatePickerValue` payload.
- `onBlur`: Optional blur callback after selection/close.
- `placeholder`: Placeholder text when no dates are selected.
- `dateFormat`: Display format string (date-fns).
- `disabled`: Disables the trigger and calendar.
- `clearable`: Shows a clear action when true.
- `clearLabel`: Label for the clear action.
- `minDate`/`maxDate`: Date bounds (`Date`, ISO string, or `null`).
- `disabledDates`: `react-day-picker` disabled matcher(s).
- `numberOfMonths`: Number of months to show.
- `className`: Wrapper class override.
- `triggerClassName`: Trigger button class override.
- `calendarClassName`: Popover content class override.
- `maxDates`: Maximum number of dates that can be selected.

`MultiDatePickerValue` shape:

- `dates`: Selected `Date[]`.
- `formatted`: Formatted display strings.
- `iso`: ISO strings.
- `label`: Summary label string.

## Smoke Test

Use the reusable smoke test to validate installability in a clean consumer app.
It targets `http://localhost:3002` by default so it validates the current local registry surface.

```bash
npm run smoke:data-grid
```

Override the registry host when you want to test a different local port or the deployed registry:

```bash
REGISTRY_BASE_URL=https://doless-ui.vercel.app npm run smoke:data-grid
```

The script creates a temporary Next app, runs `shadcn init`, installs both
`data-grid` and `data-grid-page-shell`, writes a minimal example page using both
items, and runs `npm run build`.
