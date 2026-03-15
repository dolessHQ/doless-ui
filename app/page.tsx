"use client"

import * as React from "react"
import { format, isAfter, isBefore, parseISO } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Activity,
  ArrowUpRight,
  Building2,
  Cable,
  CheckCheck,
  Download,
  Plus,
  Siren,
} from "lucide-react"

import { OpenInV0Button } from "@/components/open-in-v0-button"
import { Badge } from "@/registry/new-york/ui/badge"
import { Button } from "@/registry/new-york/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/new-york/ui/card"
import { DataGrid } from "@/registry/new-york/doless/DataGrid"
import { DataGridPageShell } from "@/registry/new-york/doless/DataGridPageShell"
import {
  createDataGridStateCodec,
  type DataGridBulkAction,
  type DataGridDateRangeValue,
  type DataGridFilterDefinition,
  type DataGridRowAction,
  type DataGridSortState,
  useDataGridController,
} from "@/lib/data-grid"

type ShowcaseAccount = {
  id: string
  account: string
  region: string
  stage: string
  health: "Healthy" | "Watching" | "Risk"
  owner: string
  segment: "Startup" | "Mid-market" | "Enterprise"
  launchWindow: string
  nextReview: string
  mrr: number
  seats: number
  completion: number
  attention: boolean
  note: string
}

type ShowcaseFilters = {
  search: string | null
  region: string[]
  stage: string[]
  health: string | null
  attention: boolean | null
  segment: ShowcaseAccount["segment"] | null
  launchWindow: DataGridDateRangeValue | null
}

const SHOWCASE_DATA: ShowcaseAccount[] = [
  {
    id: "acme-ops",
    account: "Acme Facilities",
    region: "Northeast",
    stage: "Pilot",
    health: "Healthy",
    owner: "Mina Patel",
    segment: "Mid-market",
    launchWindow: "2026-03-22",
    nextReview: "2026-03-18",
    mrr: 12000,
    seats: 42,
    completion: 81,
    attention: false,
    note: "Strong pilot adoption with fast onboarding feedback loops.",
  },
  {
    id: "northstar-living",
    account: "Northstar Living",
    region: "Midwest",
    stage: "Expansion",
    health: "Watching",
    owner: "Jared Wu",
    segment: "Enterprise",
    launchWindow: "2026-04-06",
    nextReview: "2026-03-20",
    mrr: 28400,
    seats: 98,
    completion: 62,
    attention: true,
    note: "Needs tighter exec alignment before additional building rollout.",
  },
  {
    id: "evergreen-asset",
    account: "Evergreen Asset Group",
    region: "West",
    stage: "Design",
    health: "Risk",
    owner: "Talia Morgan",
    segment: "Enterprise",
    launchWindow: "2026-04-18",
    nextReview: "2026-03-24",
    mrr: 19850,
    seats: 74,
    completion: 34,
    attention: true,
    note: "Procurement slowdown is blocking final implementation timeline.",
  },
  {
    id: "harbor-house",
    account: "Harbor House PM",
    region: "South",
    stage: "Live",
    health: "Healthy",
    owner: "Sofia Nguyen",
    segment: "Startup",
    launchWindow: "2026-03-17",
    nextReview: "2026-03-16",
    mrr: 7600,
    seats: 19,
    completion: 94,
    attention: false,
    note: "Very high operator trust and strong usage in daily workflow.",
  },
  {
    id: "elevate-rentals",
    account: "Elevate Rentals",
    region: "Northeast",
    stage: "Expansion",
    health: "Watching",
    owner: "Noah Brooks",
    segment: "Mid-market",
    launchWindow: "2026-04-02",
    nextReview: "2026-03-27",
    mrr: 16800,
    seats: 58,
    completion: 69,
    attention: true,
    note: "Expansion plan is approved but enablement content needs cleanup.",
  },
  {
    id: "cedar-point",
    account: "Cedar Point Housing",
    region: "Midwest",
    stage: "Live",
    health: "Healthy",
    owner: "Mina Patel",
    segment: "Enterprise",
    launchWindow: "2026-03-12",
    nextReview: "2026-03-21",
    mrr: 31200,
    seats: 121,
    completion: 97,
    attention: false,
    note: "Reference account candidate with polished regional rollout playbook.",
  },
  {
    id: "lattice-communities",
    account: "Lattice Communities",
    region: "West",
    stage: "Pilot",
    health: "Watching",
    owner: "Sofia Nguyen",
    segment: "Mid-market",
    launchWindow: "2026-03-29",
    nextReview: "2026-03-19",
    mrr: 10900,
    seats: 36,
    completion: 57,
    attention: false,
    note: "Pilot team is engaged, but measurement framework is still maturing.",
  },
  {
    id: "atlas-stays",
    account: "Atlas Stays",
    region: "South",
    stage: "Design",
    health: "Risk",
    owner: "Talia Morgan",
    segment: "Startup",
    launchWindow: "2026-04-26",
    nextReview: "2026-03-28",
    mrr: 5400,
    seats: 14,
    completion: 21,
    attention: true,
    note: "Scope creep is expanding the implementation footprint too quickly.",
  },
  {
    id: "meridian-portfolio",
    account: "Meridian Portfolio",
    region: "Northeast",
    stage: "Expansion",
    health: "Healthy",
    owner: "Jared Wu",
    segment: "Enterprise",
    launchWindow: "2026-03-31",
    nextReview: "2026-03-25",
    mrr: 35200,
    seats: 132,
    completion: 88,
    attention: false,
    note: "Regional expansion is paced well with clear executive sponsorship.",
  },
  {
    id: "sunline-pm",
    account: "Sunline Property",
    region: "West",
    stage: "Pilot",
    health: "Healthy",
    owner: "Noah Brooks",
    segment: "Startup",
    launchWindow: "2026-03-26",
    nextReview: "2026-03-17",
    mrr: 6800,
    seats: 22,
    completion: 73,
    attention: false,
    note: "Fast iteration cadence and very low implementation friction.",
  },
  {
    id: "oakmont-service",
    account: "Oakmont Service Group",
    region: "Midwest",
    stage: "Expansion",
    health: "Risk",
    owner: "Mina Patel",
    segment: "Mid-market",
    launchWindow: "2026-04-11",
    nextReview: "2026-03-22",
    mrr: 14300,
    seats: 51,
    completion: 49,
    attention: true,
    note: "Cross-functional ownership is unclear, increasing rollout latency.",
  },
  {
    id: "bloomfield-resi",
    account: "Bloomfield Residential",
    region: "South",
    stage: "Live",
    health: "Watching",
    owner: "Sofia Nguyen",
    segment: "Enterprise",
    launchWindow: "2026-03-14",
    nextReview: "2026-03-23",
    mrr: 26500,
    seats: 87,
    completion: 91,
    attention: false,
    note: "Operationally successful, but stakeholder expectations keep shifting.",
  },
]

const initialFilters: ShowcaseFilters = {
  search: null,
  region: [],
  stage: [],
  health: null,
  attention: null,
  segment: null,
  launchWindow: null,
}

export default function Home() {
  const [accounts, setAccounts] = React.useState(SHOWCASE_DATA)
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(
    SHOWCASE_DATA[0]?.id ?? null
  )

  const filterDefinitions = React.useMemo<
    Array<DataGridFilterDefinition<ShowcaseFilters>>
  >(
    () => [
      {
        id: "search",
        label: "Search",
        kind: "search",
        placeholder: "Search client, owner, or notes",
        getValue: (filters) => filters.search,
        setValue: (filters, value) => ({ ...filters, search: value ?? null }),
      },
      {
        id: "region",
        label: "Region",
        kind: "multi-select",
        options: ["Northeast", "Midwest", "South", "West"].map((value) => ({
          label: value,
          value,
        })),
        getValue: (filters) => filters.region,
        setValue: (filters, value) => ({ ...filters, region: value }),
      },
      {
        id: "stage",
        label: "Stage",
        kind: "multi-select",
        options: ["Design", "Pilot", "Expansion", "Live"].map((value) => ({
          label: value,
          value,
        })),
        getValue: (filters) => filters.stage,
        setValue: (filters, value) => ({ ...filters, stage: value }),
      },
      {
        id: "health",
        label: "Health",
        kind: "single-select",
        options: ["Healthy", "Watching", "Risk"].map((value) => ({
          label: value,
          value,
        })),
        getValue: (filters) => filters.health,
        setValue: (filters, value) => ({ ...filters, health: value ?? null }),
      },
      {
        id: "attention",
        label: "Attention",
        kind: "boolean",
        trueLabel: "Needs attention",
        falseLabel: "Stable",
        getValue: (filters) => filters.attention,
        setValue: (filters, value) => ({
          ...filters,
          attention: value ?? null,
        }),
      },
      {
        id: "segment",
        label: "Segment",
        kind: "custom",
        paramKey: "segment",
        getValue: (filters) => filters.segment,
        setValue: (filters, value) => ({
          ...filters,
          segment: value as ShowcaseFilters["segment"],
        }),
        getResetValue: () => null,
        parse: (params) => {
          const value = params.get("segment")
          return value === "Startup" || value === "Mid-market" || value === "Enterprise"
            ? (value as ShowcaseFilters["segment"])
            : null
        },
        serialize: (value) => ({
          segment: typeof value === "string" ? value : undefined,
        }),
        render: ({ definition, filters, onFiltersChange }) => {
          const currentValue = definition.getValue(filters) as ShowcaseFilters["segment"]
          const setSegmentValue =
            definition.setValue as (
              filters: ShowcaseFilters,
              value: ShowcaseFilters["segment"]
            ) => ShowcaseFilters
          const options = [
            "Startup",
            "Mid-market",
            "Enterprise",
          ] as const

          return (
            <div className="flex items-center gap-2 rounded-lg border bg-background p-1">
              {options.map((option) => (
                <Button
                  key={option}
                  variant={currentValue === option ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() =>
                    onFiltersChange(
                      setSegmentValue(
                        filters,
                        currentValue === option
                          ? null
                          : (option as ShowcaseFilters["segment"])
                      )
                    )
                  }
                >
                  {option}
                </Button>
              ))}
            </div>
          )
        },
      },
      {
        id: "launch_window",
        label: "Launch window",
        kind: "date-range",
        getValue: (filters) => filters.launchWindow,
        setValue: (filters, value) => ({ ...filters, launchWindow: value }),
      },
    ],
    []
  )

  const stateCodec = React.useMemo(
    () => createDataGridStateCodec({ filterDefinitions }),
    [filterDefinitions]
  )

  const loadShowcasePage = React.useCallback(
    async ({
      page,
      pageSize,
      filters,
      sorting,
    }: {
      page: number
      pageSize: number
      filters: ShowcaseFilters
      sorting: DataGridSortState
    }) => {
      await new Promise((resolve) => window.setTimeout(resolve, 180))

      let filtered = [...accounts]

      if (filters.search) {
        const query = filters.search.toLowerCase()
        filtered = filtered.filter((row) =>
          [row.account, row.owner, row.note]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      }

      if (filters.region.length > 0) {
        filtered = filtered.filter((row) => filters.region.includes(row.region))
      }

      if (filters.stage.length > 0) {
        filtered = filtered.filter((row) => filters.stage.includes(row.stage))
      }

      if (filters.health) {
        filtered = filtered.filter((row) => row.health === filters.health)
      }

      if (filters.attention != null) {
        filtered = filtered.filter((row) => row.attention === filters.attention)
      }

      if (filters.segment) {
        filtered = filtered.filter((row) => row.segment === filters.segment)
      }

      if (filters.launchWindow?.from || filters.launchWindow?.to) {
        filtered = filtered.filter((row) => {
          const launchDate = parseISO(row.launchWindow)
          const from = filters.launchWindow?.from
            ? parseISO(filters.launchWindow.from)
            : null
          const to = filters.launchWindow?.to
            ? parseISO(filters.launchWindow.to)
            : null
          const mode = filters.launchWindow?.mode ?? "range"

          if (mode === "after" && from) {
            return !isBefore(launchDate, from)
          }

          if (mode === "before" && to) {
            return !isAfter(launchDate, to)
          }

          if (from && isBefore(launchDate, from)) {
            return false
          }

          if (to && isAfter(launchDate, to)) {
            return false
          }

          return true
        })
      }

      const sorted = [...filtered].sort((a, b) => {
        const sort = sorting[0]
        if (!sort) return 0

        const direction = sort.desc ? -1 : 1
        const aValue = a[sort.id as keyof ShowcaseAccount]
        const bValue = b[sort.id as keyof ShowcaseAccount]

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * direction
        }

        return String(aValue).localeCompare(String(bValue)) * direction
      })

      const start = (page - 1) * pageSize
      const paged = sorted.slice(start, start + pageSize)

      return {
        rows: paged,
        totalCount: sorted.length,
      }
    },
    [accounts]
  )

  const updateAccounts = React.useCallback(
    (accountIds: string[], updater: (account: ShowcaseAccount) => ShowcaseAccount) => {
      const accountIdSet = new Set(accountIds)
      setAccounts((currentAccounts) =>
        currentAccounts.map((account) =>
          accountIdSet.has(account.id) ? updater(account) : account
        )
      )
    },
    []
  )

  const {
    rows,
    filters,
    sorting,
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    isLoading,
    error,
    hasInitialUrlState,
    setFilters,
    setSorting,
    setCurrentPage,
    setPageSize,
    refresh,
  } = useDataGridController<ShowcaseAccount, ShowcaseFilters, DataGridSortState>({
    tableId: "shared-showcase-grid",
    initialFilters,
    initialSorting: [{ id: "mrr", desc: true }],
    initialPageSize: 8,
    loadPage: loadShowcasePage,
    stateCodec,
    syncToUrl: true,
    debounceMs: 250,
    shouldDebounceLoad: (nextFilters, previousFilters) =>
      nextFilters.search !== previousFilters.search,
    getRowId: (row) => row.id,
  })

  React.useEffect(() => {
    if (!selectedAccountId && accounts[0]?.id) {
      setSelectedAccountId(accounts[0].id)
      return
    }

    if (
      selectedAccountId &&
      !accounts.some((account) => account.id === selectedAccountId)
    ) {
      setSelectedAccountId(accounts[0]?.id ?? null)
    }
  }, [accounts, selectedAccountId])

  const columns = React.useMemo<Array<ColumnDef<ShowcaseAccount>>>(
    () => [
      {
        accessorKey: "account",
        header: "Client",
        enableSorting: true,
        size: 240,
        meta: {
          label: "Client",
          defaultPinned: "left",
          orderPriority: 0,
          minSize: 220,
          className: "font-medium",
        },
      },
      {
        accessorKey: "stage",
        header: "Stage",
        enableSorting: true,
        size: 140,
        meta: {
          label: "Stage",
          defaultPinned: "left",
          orderPriority: 1,
          minSize: 130,
        },
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.stage === "Live"
                ? "status-success"
                : row.original.stage === "Expansion"
                  ? "status-info"
                  : "secondary"
            }
          >
            {row.original.stage}
          </Badge>
        ),
      },
      {
        accessorKey: "health",
        header: "Health",
        enableSorting: true,
        size: 148,
        meta: {
          label: "Health",
          orderPriority: 2,
          minSize: 140,
        },
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.health === "Healthy"
                ? "status-success"
                : row.original.health === "Watching"
                  ? "status-warning"
                  : "destructive"
            }
          >
            {row.original.health}
          </Badge>
        ),
      },
      {
        accessorKey: "owner",
        header: "Owner",
        enableSorting: true,
        size: 180,
        meta: {
          label: "Owner",
          orderPriority: 3,
          minSize: 160,
        },
      },
      {
        accessorKey: "region",
        header: "Region",
        enableSorting: true,
        size: 140,
        meta: {
          label: "Region",
          orderPriority: 4,
        },
      },
      {
        accessorKey: "segment",
        header: "Segment",
        enableSorting: true,
        size: 160,
        meta: {
          label: "Segment",
          orderPriority: 5,
        },
      },
      {
        accessorKey: "launchWindow",
        header: "Launch",
        enableSorting: true,
        size: 144,
        meta: {
          label: "Launch",
          orderPriority: 6,
        },
        cell: ({ row }) => format(parseISO(row.original.launchWindow), "MMM d, yyyy"),
      },
      {
        accessorKey: "nextReview",
        header: "Next review",
        enableSorting: true,
        size: 144,
        meta: {
          label: "Next review",
          orderPriority: 7,
        },
        cell: ({ row }) => format(parseISO(row.original.nextReview), "MMM d"),
      },
      {
        accessorKey: "mrr",
        header: "MRR",
        enableSorting: true,
        size: 128,
        meta: {
          label: "MRR",
          align: "right",
          orderPriority: 8,
        },
        cell: ({ row }) =>
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(row.original.mrr),
      },
      {
        accessorKey: "completion",
        header: "Completion",
        enableSorting: true,
        size: 180,
        meta: {
          label: "Completion",
          orderPriority: 9,
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${row.original.completion}%` }}
              />
            </div>
            <span className="tabular-nums text-muted-foreground">
              {row.original.completion}%
            </span>
          </div>
        ),
      },
      {
        accessorKey: "attention",
        header: "Attention",
        enableSorting: true,
        size: 136,
        meta: {
          label: "Attention",
          orderPriority: 10,
        },
        cell: ({ row }) => (
          <Badge
            variant={row.original.attention ? "status-warning" : "outline"}
          >
            {row.original.attention ? "Required" : "Clear"}
          </Badge>
        ),
      },
    ],
    []
  )

  const selectedAccount = React.useMemo(
    () =>
      accounts.find((account) => account.id === selectedAccountId) ?? rows[0] ?? null,
    [accounts, rows, selectedAccountId]
  )

  const exportActions = React.useMemo(
    () => [
      {
        label: "Export current page as CSV",
        description: "Host-controlled export action wired into the generic toolbar.",
        onExport: ({
          rows,
        }: {
          rows: ShowcaseAccount[]
        }) => {
          if (typeof window === "undefined") return

          const lines = [
            [
              "Account",
              "Stage",
              "Health",
              "Owner",
              "Region",
              "Segment",
              "Launch",
              "MRR",
            ].join(","),
            ...rows.map((row) =>
              [
                row.account,
                row.stage,
                row.health,
                row.owner,
                row.region,
                row.segment,
                row.launchWindow,
                row.mrr,
              ].join(",")
            ),
          ]

          const blob = new Blob([lines.join("\n")], { type: "text/csv" })
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = "shared-grid-showcase.csv"
          link.click()
          URL.revokeObjectURL(url)
        },
      },
    ],
    []
  )

  const rowActions = React.useMemo<Array<DataGridRowAction<ShowcaseAccount>>>(
    () => [
      {
        label: "Open in detail rail",
        onSelect: (row) => setSelectedAccountId(row.id),
      },
      {
        label: "Raise attention",
        variant: "outline",
        isDisabled: (row) => row.attention,
        onSelect: (row) => {
          updateAccounts([row.id], (account) => ({
            ...account,
            attention: true,
          }))
          void refresh()
        },
      },
      {
        label: "Clear attention",
        variant: "outline",
        isDisabled: (row) => !row.attention,
        onSelect: (row) => {
          updateAccounts([row.id], (account) => ({
            ...account,
            attention: false,
          }))
          void refresh()
        },
      },
    ],
    [refresh, updateAccounts]
  )

  const bulkActions = React.useMemo<Array<DataGridBulkAction<ShowcaseAccount>>>(
    () => [
      {
        label: "Raise attention",
        icon: <Siren className="size-4" />,
        variant: "outline",
        isDisabled: (selectedRows) =>
          selectedRows.length === 0 || selectedRows.every((row) => row.attention),
        onSelect: (selectedRows) => {
          updateAccounts(
            selectedRows.map((row) => row.id),
            (account) => ({
              ...account,
              attention: true,
            })
          )
          void refresh()
        },
      },
      {
        label: "Mark stable",
        icon: <CheckCheck className="size-4" />,
        variant: "outline",
        isDisabled: (selectedRows) =>
          selectedRows.length === 0 || selectedRows.every((row) => !row.attention),
        onSelect: (selectedRows) => {
          updateAccounts(
            selectedRows.map((row) => row.id),
            (account) => ({
              ...account,
              attention: false,
            })
          )
          void refresh()
        },
      },
    ],
    [refresh, updateAccounts]
  )

  return (
    <DataGridPageShell
      eyebrow="Registry Preview"
      title="Shared Data Grid"
      subtitle="A client-ready table surface with filters, saved views, row and bulk actions, exports, column controls, and a host-owned detail rail that can travel cleanly between projects."
      secondaryActions={
        <>
          <OpenInV0Button name="data-grid" />
          <OpenInV0Button name="data-grid-page-shell" />
        </>
      }
      primaryAction={
        <Button size="sm">
          <Plus className="size-4" />
          New workflow
        </Button>
      }
      toolbar={
        <div className="grid gap-3 rounded-2xl border bg-card/60 p-4 text-sm text-muted-foreground lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <Cable className="size-3.5" />
              URL state
            </Badge>
            <Badge variant="outline" className="gap-2">
              <Building2 className="size-3.5" />
              Local preferences
            </Badge>
            <Badge variant="outline" className="gap-2">
              <Activity className="size-3.5" />
              Runtime pinning
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em]">
            <span>Client-ready</span>
            <ArrowUpRight className="size-3.5" />
          </div>
        </div>
      }
      detailPane={
        selectedAccount ? (
          <Card className="border shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>{selectedAccount.account}</CardTitle>
              <CardDescription>
                The detail rail stays app-owned while the table surface remains reusable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Segment
                  </div>
                  <div className="mt-1 font-medium">{selectedAccount.segment}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Seats
                  </div>
                  <div className="mt-1 font-medium">{selectedAccount.seats}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Launch
                  </div>
                  <div className="mt-1 font-medium">
                    {format(parseISO(selectedAccount.launchWindow), "MMMM d, yyyy")}
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Review
                  </div>
                  <div className="mt-1 font-medium">
                    {format(parseISO(selectedAccount.nextReview), "MMMM d")}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Notes
                </div>
                <p className="text-sm leading-6 text-foreground/88">
                  {selectedAccount.note}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    selectedAccount.health === "Healthy"
                      ? "status-success"
                      : selectedAccount.health === "Watching"
                        ? "status-warning"
                        : "destructive"
                  }
                >
                  {selectedAccount.health}
                </Badge>
                <Badge variant="outline">{selectedAccount.region}</Badge>
                <Badge variant="outline">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(selectedAccount.mrr)}{" "}
                  MRR
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : null
      }
      footer={
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Select a row to drive the host detail rail.</span>
          <span>Save views, trigger row actions, and use bulk actions to verify the phenotype.</span>
        </div>
      }
    >
      <DataGrid
        tableId="shared-showcase-grid"
        columns={columns}
        rows={rows}
        filters={filters}
        onFiltersChange={setFilters}
        filterDefinitions={filterDefinitions}
        sorting={sorting}
        onSortingChange={setSorting}
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        hasInitialUrlState={hasInitialUrlState}
        isLoading={isLoading}
        error={error}
        onRefresh={refresh}
        enableSavedViews
        rowActions={rowActions}
        bulkActions={bulkActions}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedAccountId(row.id)}
        selectedRowId={selectedAccountId}
        exportActions={exportActions}
        actionButtons={
          <Button variant="outline" size="sm">
            <Download className="size-4" />
            Snapshot
          </Button>
        }
        emptyTitle="No accounts match the current filters"
        emptyDescription="The showcase uses an injected loader so the surface stays reusable even when the backing data changes."
      />
    </DataGridPageShell>
  )
}
