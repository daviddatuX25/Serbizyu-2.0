import { RequestComposer } from "@/components/product/RequestComposer";
import { AppShell } from "@/components/shell/AppShell";
import { useRouter } from "@/context/RouterContext";
import { ActivityPage, MePage } from "@/pages/ActivityPage";
import { AgentTodayPage } from "@/pages/AgentTodayPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { HomePage } from "@/pages/HomePage";
import { ListingDetailPage } from "@/pages/ListingDetailPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { OrderWorkspacePage } from "@/pages/OrderWorkspacePage";
import { ProfilePage } from "@/pages/ProfilePage";
import { QuickDealPage } from "@/pages/QuickDealPage";
import { ScenarioLabPage } from "@/pages/ScenarioLabPage";
function CurrentPage() { const { parsed } = useRouter(); switch (parsed.kind) { case "home": return <HomePage />; case "explore": return <ExplorePage />; case "listing": return <ListingDetailPage listingId={parsed.listingId} />; case "order": return <OrderWorkspacePage orderId={parsed.orderId} />; case "quick-deal": return <QuickDealPage listingId={parsed.listingId} />; case "activity": return <ActivityPage />; case "agent": return <AgentTodayPage />; case "me": return <MePage />; case "profile": return <ProfilePage />; case "review": return <ScenarioLabPage />; case "not-found": return <NotFoundPage path={parsed.path} />; } }
export default function App() { return <><AppShell><CurrentPage /></AppShell><RequestComposer /></>; }
