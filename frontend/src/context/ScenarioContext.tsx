import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScenarioSnapshot } from "@/application/gateway";
import { getScenario, resetScenario, setReviewerActor } from "@/infrastructure/scenario/repository";

interface ScenarioContextValue { snapshot: ScenarioSnapshot; reset: () => void; setActor: (actorId: string) => void; }
const ScenarioContext = createContext<ScenarioContextValue | null>(null);
export function ScenarioProvider({ children }: { children: ReactNode }) { const [snapshot, setSnapshot] = useState(getScenario); useEffect(() => { const onStorage = () => setSnapshot(getScenario()); window.addEventListener("storage", onStorage); window.addEventListener("serbizyu:scenario-changed", onStorage); return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("serbizyu:scenario-changed", onStorage); }; }, []); const value = useMemo(() => ({ snapshot, reset: () => setSnapshot(resetScenario()), setActor: (actorId: string) => setSnapshot(setReviewerActor(actorId)) }), [snapshot]); return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>; }
export function useScenario() { const value = useContext(ScenarioContext); if (!value) throw new Error("useScenario must be used inside ScenarioProvider"); return value; }
