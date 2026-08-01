import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface RouterValue {
  route: string;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

function readRoute() {
  const value = window.location.hash.replace(/^#/, "");
  return value.startsWith("/") ? value : "/";
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const value = useMemo<RouterValue>(() => ({
    route,
    navigate: (path) => {
      window.location.hash = path;
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  }), [route]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error("useRouter must be used inside RouterProvider");
  return value;
}
