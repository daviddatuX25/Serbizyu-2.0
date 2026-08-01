import { RequestComposer } from "@/components/product/RequestComposer";
import { AppShell } from "@/components/shell/AppShell";
import { useRouter } from "@/context/RouterContext";
import { ActivityPage, MePage } from "@/pages/ActivityPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { HomePage } from "@/pages/HomePage";
import { QuickDealPage } from "@/pages/QuickDealPage";
function CurrentPage() { const { route } = useRouter(); if (route === "/explore") return <ExplorePage />; if (route === "/quick-deal") return <QuickDealPage />; if (route === "/activity") return <ActivityPage />; if (route === "/me") return <MePage />; return <HomePage />; }
export default function App() { return <><AppShell><CurrentPage /></AppShell><RequestComposer /></>; }
