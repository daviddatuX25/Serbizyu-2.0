import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { AppProvider } from "@/context/AppContext";
import { RouterProvider } from "@/context/RouterContext";
import { ScenarioProvider } from "@/context/ScenarioContext";
import "@/styles/index.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: false, refetchOnWindowFocus: false } } });
createRoot(document.getElementById("root")!).render(<StrictMode><QueryClientProvider client={queryClient}><RouterProvider><ScenarioProvider><AppProvider><App /></AppProvider></ScenarioProvider></RouterProvider></QueryClientProvider></StrictMode>);
