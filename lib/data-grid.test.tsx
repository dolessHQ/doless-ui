import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  type DataGridSortState,
  useDataGridController,
} from "@/lib/data-grid"

type TestFilters = {
  search: string | null
}

describe("useDataGridController", () => {
  it("resets pagination when page size changes", async () => {
    const loadPage = vi.fn().mockResolvedValue({
      rows: ["row-1"],
      totalCount: 12,
    })

    const { result } = renderHook(() =>
      useDataGridController<string, TestFilters, DataGridSortState>({
        tableId: "test-grid",
        initialFilters: { search: null },
        initialSorting: [],
        initialPageSize: 8,
        loadPage,
        syncToUrl: false,
      })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      result.current.setCurrentPage(2)
    })

    await waitFor(() => expect(result.current.currentPage).toBe(2))
    await waitFor(() =>
      expect(loadPage).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 8,
        filters: { search: null },
        sorting: [],
      })
    )

    await act(async () => {
      result.current.setPageSize(48)
    })

    await waitFor(() => expect(result.current.currentPage).toBe(1))
    await waitFor(() => expect(result.current.pageSize).toBe(48))
  })
})
