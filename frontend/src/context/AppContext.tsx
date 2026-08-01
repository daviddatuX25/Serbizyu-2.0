import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/types/domain";

interface AppContextValue {
  role: Role;
  setRole: (role: Role) => void;
  composerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem("serbizyu-role") as Role | null) ?? "buyer");
  const [composerOpen, setComposerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const value = useMemo<AppContextValue>(() => ({
    role,
    setRole: (next) => {
      localStorage.setItem("serbizyu-role", next);
      setRoleState(next);
    },
    composerOpen,
    openComposer: () => setComposerOpen(true),
    closeComposer: () => setComposerOpen(false),
    sidebarOpen,
    setSidebarOpen,
  }), [composerOpen, role, sidebarOpen]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used within AppProvider");
  return value;
}
