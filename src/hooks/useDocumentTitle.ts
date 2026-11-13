import { useEffect } from 'react';

const DEFAULT_TITLE = 'FairShare — Household Logistics & Smart Shared Errands';

/** Keeps the browser tab in step with the page the user is on. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · FairShare` : DEFAULT_TITLE;
  }, [title]);
}
