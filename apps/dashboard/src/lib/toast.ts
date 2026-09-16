import { Toast } from "@base-ui/react/toast";

/**
 * A single global manager, created outside React so it can be called from
 * any event handler (toastSuccess/toastError below) without needing a
 * hook or prop-drilling. The Toaster component (components/ui/toast.tsx),
 * mounted once in the admin layout, renders whatever's added here.
 */
export const toastManager = Toast.createToastManager();

export function toastSuccess(description: string) {
  toastManager.add({ description, type: "success" });
}

export function toastError(description: string) {
  // Slightly longer than the default 5s — an error is worth reading
  // fully, not glancing at.
  toastManager.add({ description, type: "error", timeout: 7000 });
}
