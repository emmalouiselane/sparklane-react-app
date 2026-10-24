import { useEffect, useRef } from 'react';

export const PAGE_ACTIVATED_EVENT = 'sparklane:page-activated';
export const DATA_SAVED_EVENT = 'sparklane:data-saved';

export function useRefreshOnPageActivation(pageId: string, refresh: () => void) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const handleActivation = (event: Event) => {
      const activatedPageId = (event as CustomEvent<string>).detail;
      if (activatedPageId === pageId) refreshRef.current();
    };

    window.addEventListener(PAGE_ACTIVATED_EVENT, handleActivation);
    return () => window.removeEventListener(PAGE_ACTIVATED_EVENT, handleActivation);
  }, [pageId]);
}
