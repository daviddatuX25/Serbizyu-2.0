import { RequestComposer } from "@/components/product/RequestComposer";
import { AppShell } from "@/components/shell/AppShell";
import { useRouter } from "@/context/RouterContext";
import { DealRoomPage } from "@/pages/DealRoomPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { HomePage } from "@/pages/HomePage";
import { PatternsPage } from "@/pages/PatternsPage";
import { PaymentsPage } from "@/pages/PaymentsPage";

function CurrentPage() {
  const { route } = useRouter();
  if (route === "/explore") return <ExplorePage />;
  if (route === "/deal") return <DealRoomPage />;
  if (route === "/payments") return <PaymentsPage />;
  if (route === "/patterns") return <PatternsPage />;
  return <HomePage />;
}

export default function App() {
  return (
    <>
      <AppShell><CurrentPage /></AppShell>
      <RequestComposer />
    </>
  );
}
