import {
  Bell,
  BriefcaseBusiness,
  Compass,
  CreditCard,
  Home,
  Layers3,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "@/context/RouterContext";
import type { Role } from "@/types/domain";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

const navigation = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/deal", label: "Deal Room", icon: BriefcaseBusiness },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/patterns", label: "Pattern Lab", icon: Layers3 },
];

const roleCopy: Record<Role, { label: string; detail: string }> = {
  buyer: { label: "Buyer", detail: "Find help & manage requests" },
  provider: { label: "Provider", detail: "Serve work & update progress" },
  admin: { label: "Operations", detail: "Review exceptions & evidence" },
};

function Brand() {
  return (
    <a href="#/" className="flex items-center gap-3 px-2">
      <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-forest-600 font-display text-lg font-extrabold text-white shadow-lg shadow-forest-900/20 soft-noise">S</span>
      <span><strong className="block font-display text-lg font-extrabold tracking-[-0.04em] text-ink-950">Serbizyu</strong><small className="block text-[10px] font-bold uppercase tracking-[0.14em] text-forest-600">Tagudin · review build</small></span>
    </a>
  );
}

function RoleSwitcher() {
  const { role, setRole } = useApp();
  const roles: Role[] = ["buyer", "provider", "admin"];
  return (
    <div className="rounded-2xl border border-ink-100 bg-cream-50 p-1.5" aria-label="Switch perspective">
      <div className="grid grid-cols-3 gap-1">
        {roles.map((item) => (
          <button key={item} className={cn("role-pill focus-ring", role === item && "role-pill-active")} onClick={() => setRole(item)} title={roleCopy[item].detail}>
            {item === "buyer" ? "Buyer" : item === "provider" ? "Provider" : "Ops"}
          </button>
        ))}
      </div>
      <p className="px-2 pb-1 pt-2 text-[10px] leading-4 text-ink-500"><strong className="text-ink-700">{roleCopy[role].label} view.</strong> {roleCopy[role].detail}</p>
    </div>
  );
}

function SidebarContent() {
  const { openComposer } = useApp();
  const { route } = useRouter();
  return (
    <>
      <Brand />
      <div className="mt-7"><RoleSwitcher /></div>
      <Button className="mt-4 w-full" size="lg" leftIcon={<Plus className="h-4 w-4" />} onClick={openComposer}>Post a request</Button>
      <nav className="mt-7 space-y-1" aria-label="Main navigation">
        {navigation.map(({ to, label, icon: Icon }) => (
          <a key={to} href={`#${to}`} className={cn("nav-item", route === to && "nav-item-active")}>
            <Icon className="h-[18px] w-[18px]" /><span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl bg-ink-950 p-4 text-white">
        <div className="flex items-center gap-2 text-xs font-bold"><ShieldCheck className="h-4 w-4 text-forest-300" /> Safe review environment</div>
        <p className="mt-2 text-[11px] leading-4 text-white/60">Synthetic fixtures. No real money, identity evidence, or pilot claims.</p>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarOpen, setSidebarOpen, openComposer, role } = useApp();
  const { route } = useRouter();
  const current = navigation.find((item) => item.to === route) ?? navigation[0];

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-ink-100 bg-cream-100/92 p-4 backdrop-blur-xl lg:flex">
        <SidebarContent />
      </aside>

      {sidebarOpen && <button className="fixed inset-0 z-40 bg-ink-950/35 backdrop-blur-sm lg:hidden" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col border-r border-ink-100 bg-cream-100 p-4 shadow-2xl transition-transform lg:hidden", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <button className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl text-ink-500 hover:bg-white" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
        <SidebarContent />
      </aside>

      <div className="app-canvas">
        <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-cream-100/84 backdrop-blur-xl">
          <div className="mx-auto flex h-[68px] max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button className="grid h-11 w-11 place-items-center rounded-xl border border-ink-100 bg-white text-ink-700 shadow-sm lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-forest-600">{roleCopy[role].label} workspace</p>
              <h1 className="truncate font-display text-base font-bold text-ink-950">{current.label}</h1>
            </div>
            <div className="ml-auto hidden min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 text-ink-400 shadow-sm md:flex">
              <Search className="h-4 w-4" /><input className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none" placeholder="Search services, requests, order ID…" /><kbd className="rounded-md bg-ink-50 px-2 py-1 text-[10px] font-bold text-ink-400">⌘ K</kbd>
            </div>
            <div className="hidden items-center gap-2 sm:flex"><span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-[11px] font-bold text-forest-700"><span className="h-2 w-2 rounded-full bg-forest-400" /> Online</span><button className="relative grid h-11 w-11 place-items-center rounded-xl border border-ink-100 bg-white text-ink-600 shadow-sm"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral-400 ring-2 ring-white" /></button></div>
            <Button className="hidden xl:inline-flex" variant="warm" leftIcon={<Sparkles className="h-4 w-4" />} onClick={openComposer}>Create</Button>
          </div>
        </header>
        {children}
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-ink-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {navigation.map(({ to, label, icon: Icon }) => (
          <a key={to} href={`#${to}`} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-bold text-ink-400", route === to && "bg-forest-50 text-forest-700")}>
            <Icon className="h-[18px] w-[18px]" /><span>{label === "Pattern Lab" ? "Patterns" : label === "Deal Room" ? "Deal" : label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
