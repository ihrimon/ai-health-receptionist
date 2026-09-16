"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { CheckCircle2, X, XCircle } from "lucide-react"
import { toastManager } from "@/lib/toast"

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      swipeDirection={["down", "right"]}
      className="w-full rounded-lg border bg-popover p-3.5 shadow-lg ring-1 ring-foreground/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[ending-style]:opacity-0 data-[limited]:hidden"
      style={{
        transform:
          "scale(calc(max(0, 1 - (var(--toast-index) * 0.06)))) translateX(var(--toast-swipe-movement-x, 0px)) translateY(calc(var(--toast-swipe-movement-y, 0px) + (var(--toast-index) * -14px)))",
        zIndex: "calc(1000 - var(--toast-index))",
      }}
    >
      <ToastPrimitive.Content className="flex items-start gap-2.5">
        {toast.type === "error" ? (
          <XCircle className="mt-0.5 size-4.5 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-green-600 dark:text-green-400" />
        )}
        <div className="grid flex-1 gap-0.5">
          {toast.title && (
            <ToastPrimitive.Title className="text-sm font-medium text-foreground" />
          )}
          {toast.description && (
            <ToastPrimitive.Description className="text-sm text-muted-foreground" />
          )}
        </div>
        <ToastPrimitive.Close
          aria-label="Dismiss"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  ))
}

/** Mount once (see admin layout) — toastSuccess()/toastError() from lib/toast.ts work from anywhere after that. */
export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} timeout={5000}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[1000] flex w-80 max-w-[calc(100vw-2rem)] flex-col-reverse gap-2">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}
