"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface DataGridPageShellProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  primaryAction?: React.ReactNode
  secondaryActions?: React.ReactNode
  toolbar?: React.ReactNode
  children: React.ReactNode
  detailPane?: React.ReactNode
  footer?: React.ReactNode
  dialogLayer?: React.ReactNode
  className?: string
  contentClassName?: string
  detailPaneClassName?: string
}

export function DataGridPageShell({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  toolbar,
  children,
  detailPane,
  footer,
  dialogLayer,
  className,
  contentClassName,
  detailPaneClassName,
}: DataGridPageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-svh w-full max-w-[1600px] flex-col gap-6 px-4 py-8 lg:px-8",
        className
      )}
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? (
            <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {(secondaryActions || primaryAction) && (
          <div className="flex flex-wrap items-center gap-3">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </header>

      {toolbar ? <div>{toolbar}</div> : null}

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]",
          !detailPane && "xl:grid-cols-1",
          contentClassName
        )}
      >
        <div className="min-h-0">{children}</div>
        {detailPane ? (
          <aside
            className={cn(
              "h-fit xl:sticky xl:top-8",
              detailPaneClassName
            )}
          >
            {detailPane}
          </aside>
        ) : null}
      </div>

      {footer ? <div>{footer}</div> : null}
      {dialogLayer}
    </div>
  )
}
