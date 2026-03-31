import { useCallback, useEffect, useRef } from "react";

export function useScrollToBottom<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, ...deps]);

  return { ref, scrollToBottom };
}
