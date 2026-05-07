"use client"

import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const { calendarSpy } = vi.hoisted(() => ({
  calendarSpy: vi.fn(),
}))

vi.mock("@/registry/new-york/ui/calendar", () => ({
  Calendar: (props: Record<string, unknown>) => {
    calendarSpy(props)
    return <div data-testid="calendar" />
  },
}))

vi.mock("@/registry/new-york/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

import { DateRangePicker } from "@/registry/new-york/doless/DateRangePicker"

describe("DateRangePicker", () => {
  it("passes explicit dropdown navigation bounds that extend beyond the current year", () => {
    render(<DateRangePicker label="Launch window" />)

    expect(calendarSpy).toHaveBeenCalled()

    const calendarProps = calendarSpy.mock.lastCall?.[0] as
      | Record<string, unknown>
      | undefined

    expect(calendarProps?.fromYear).toBeUndefined()
    expect(calendarProps?.toYear).toBeUndefined()
    expect(calendarProps?.startMonth).toBeInstanceOf(Date)
    expect(calendarProps?.endMonth).toBeInstanceOf(Date)
    expect(
      (calendarProps?.endMonth as Date).getFullYear()
    ).toBeGreaterThan(new Date().getFullYear())
  })
})
