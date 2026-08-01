import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { AppProvider } from "@/context/AppContext";
import { RouterProvider } from "@/context/RouterContext";
import "@/styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: false, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </RouterProvider>
    </QueryClientProvider>
  </StrictMode>,
);
