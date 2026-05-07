"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"

import type { DataGridFilterDefinition } from "@/lib/data-grid"
import {
  canUseUnpinControl,
  normalizePinnableColumns,
  resolveFilterOptions,
} from "@/registry/new-york/doless/DataGrid"

type TestRow = {
  name: string
  status: string
}

type FilterState = {
  good: string | null
  bad: string | null
}

describe("DataGrid helpers", () => {
  it("keeps successful async filter options when another loader fails", async () => {
    const goodLoader = vi.fn().mockResolvedValue([
      { label: "Option A", value: "a" },
    ])
    const badLoader = vi.fn().mockRejectedValue(new Error("network down"))
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const filterDefinitions: Array<DataGridFilterDefinition<FilterState>> = [
      {
        id: "good",
        label: "Good",
        kind: "single-select",
        loadOptions: goodLoader,
        getValue: (filters) => filters.good,
        setValue: (filters, value) => ({ ...filters, good: value ?? null }),
      },
      {
        id: "bad",
        label: "Bad",
        kind: "single-select",
        loadOptions: badLoader,
        getValue: (filters) => filters.bad,
        setValue: (filters, value) => ({ ...filters, bad: value ?? null }),
      },
    ]

    const resolvedEntries = await resolveFilterOptions(filterDefinitions)
    const optionState = Object.fromEntries(resolvedEntries)

    expect(optionState.good).toEqual([{ label: "Option A", value: "a" }])
    expect(optionState.bad).toEqual([])
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"bad"'),
      expect.any(Error)
    )
  })

  it("disables pinning for columns with meta.pinnable set to false", () => {
    const columns: Array<ColumnDef<TestRow, unknown>> = [
      {
        accessorKey: "name",
        header: "Name",
        meta: { pinnable: false },
      },
      {
        accessorKey: "status",
        header: "Status",
      },
    ]

    const normalizedColumns = normalizePinnableColumns(columns)

    expect(normalizedColumns[0]?.enablePinning).toBe(false)
    expect(normalizedColumns[1]?.enablePinning).toBeUndefined()
  })

  it("disables unpinning when a column cannot be pinned", () => {
    expect(canUseUnpinControl("left", false)).toBe(false)
    expect(canUseUnpinControl(false, true)).toBe(false)
    expect(canUseUnpinControl("left", true)).toBe(true)
  })
})
