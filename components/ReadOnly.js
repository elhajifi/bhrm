"use client";
// Read-only (demo) mode on the client.
// - <ReadOnlyProvider> shows a dialog whenever a read-only user tries to change something.
// - useGuard() wraps an action: for read-only users it opens the dialog instead of running it.
// The server refuses every change from these accounts anyway (see requireUser in lib/auth.js);
// this only makes the experience friendlier. The dialog also opens if a blocked API call
// slips through (lib/api.js sends a "bhrm:read-only" event).
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { EyeIcon } from "@heroicons/react/24/outline";
import { useUser } from "./UserContext";

export const READ_ONLY_EVENT = "bhrm:read-only";

const ReadOnlyContext = createContext(() => {});

export function ReadOnlyProvider({ children }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);

  useEffect(() => {
    window.addEventListener(READ_ONLY_EVENT, show);
    return () => window.removeEventListener(READ_ONLY_EVENT, show);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <ReadOnlyContext.Provider value={show}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="read-only-title"
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <EyeIcon className="h-6 w-6 text-amber-600" />
            </div>
            <h2 id="read-only-title" className="text-lg font-semibold text-gray-800">
              View-only demo
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You&apos;re using the public demo account, so you can explore every page but you can&apos;t
              add, edit or delete anything. This keeps the demo clean for the next visitor.
            </p>
            <button
              autoFocus
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </ReadOnlyContext.Provider>
  );
}

/**
 * Returns guard(fn): a function that runs fn normally, or shows the
 * "view-only" dialog when the logged-in user is read-only.
 *   onClick={guard(() => openEdit(emp))}
 */
export function useGuard() {
  const user = useUser();
  const show = useContext(ReadOnlyContext);
  return useCallback(
    (fn) =>
      (...args) => {
        if (user?.readOnly) {
          args[0]?.preventDefault?.();
          show();
          return;
        }
        return fn(...args);
      },
    [user?.readOnly, show]
  );
}

/** Small badge for the header. */
export function ReadOnlyBadge() {
  const user = useUser();
  const show = useContext(ReadOnlyContext);
  if (!user?.readOnly) return null;
  return (
    <button
      onClick={show}
      className="flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-200"
      title="This demo account can view but not change data"
    >
      <EyeIcon className="h-3.5 w-3.5" /> View only
    </button>
  );
}
