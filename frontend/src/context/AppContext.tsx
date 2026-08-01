import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface AppContextValue { composerOpen: boolean; openComposer: () => void; closeComposer: () => void; sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void; }
const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) { const [composerOpen, setComposerOpen] = useState(false); const [sidebarOpen, setSidebarOpen] = useState(false); const value = useMemo(() => ({ composerOpen, openComposer: () => setComposerOpen(true), closeComposer: () => setComposerOpen(false), sidebarOpen, setSidebarOpen }), [composerOpen, sidebarOpen]); return <AppContext.Provider value={value}>{children}</AppContext.Provider>; }
export function useApp() { const value = useContext(AppContext); if (!value) throw new Error("useApp must be used within AppProvider"); return value; }
