"use client";

import { useEffect, useState } from "react";

// 클라이언트 마운트 이후에만 true → SSR/persist 하이드레이션 불일치 방지.
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
