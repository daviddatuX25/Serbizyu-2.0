import { ArrowRight, BriefcaseBusiness, CircleDollarSign, Clock3, Compass, FileCheck2, MapPin, Plus, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useRouter } from "@/context/RouterContext";
import { useDashboard } from "@/api/hooks";
import { ActiveOrderCard, RequestCard, ServiceCard } from "@/components/product/Cards";
import { Badge, Button, Card, SectionHeading } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import type { Role } from "@/types/domain";

const hero: Record<Role, { eyebrow: string; title: string; description: string; primary: string }> = {
  buyer: { eyebrow: "Local help, without the guesswork", title: "Ano ang kailangan mo today?", description: "Find practical help around Tagudin or post exactly what you need. Terms, responsibilities, and recovery stay clear from the start.", primary: "Post what I need" },
  provider: { eyebrow: "Your work, clearly organized", title: "Three nearby needs fit your services.", description: "Review real-shaped requests, accept only what you can fulfill, and keep Buyers informed with visible steps and evidence.", primary: "Browse open requests" },
  admin: { eyebrow: "Operations and recovery", title: "Two records need a human decision.", description: "Inspect shared facts across Order, Work, payment, evidence, and support without rewriting history or overclaiming certainty.", primary: "Open review queue" },
};

const categories = [
  { label: "Errands", icon: Compass, tone: "bg-forest-50 text-forest-700" },
  { label: "Repair & craft", icon: BriefcaseBusiness, tone: "bg-mango-50 text-mango-700" },
  { label: "Creative", icon: Sparkles, tone: "bg-coral-50 text-coral-600" },
  { label: "Local goods", icon: MapPin, tone: "bg-blue-50 text-blue-700" },
];

export function HomePage() {
  const { role, openComposer } = useApp();
  const { navigate } = useRouter();
  const dashboard = useDashboard(role);
  const copy = hero[role];

  if (dashboard.isLoading || !dashboard.data) return <HomeSkeleton />;
  const { services, requests, order } = dashboard.data;

  return (
    <main className="page-wrap">
      <section className="hero-mesh soft-noise relative overflow-hidden rounded-3xl p-6 text-white shadow-lift sm:p-8 lg:p-10">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)] lg:items-end">
          <div className="max-w-3xl"><Badge tone="dark" className="bg-white/12 text-white ring-white/20"><span className="h-1.5 w-1.5 rounded-full bg-mango-300" /> {copy.eyebrow}</Badge><h1 className="mt-5 max-w-2xl font-display text-4xl font-extrabold leading-[1.02] tracking-[-.055em] sm:text-5xl lg:text-[58px]">{copy.title}</h1><p className="mt-4 max-w-xl text-sm leading-6 text-white/68 sm:text-[15px]">{copy.description}</p><div className="mt-7 flex flex-wrap gap-3"><Button size="lg" variant="warm" leftIcon={role === "buyer" ? <Plus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />} onClick={role === "buyer" ? openComposer : () => navigate(role === "provider" ? "/explore" : "/deal")}>{copy.primary}</Button><Button size="lg" className="bg-white/10 text-white hover:bg-white/20" leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={() => navigate("/patterns")}>See how protection works</Button></div></div>
          <div className="grid grid-cols-2 gap-3">
            {role === "buyer" ? <><Metric icon={Clock3} value="1" label="active deal" detail="Maya is working" /><Metric icon={Users} value="4" label="nearby providers" detail="available today" /><Metric icon={FileCheck2} value="3" label="open requests" detail="with clear terms" /><Metric icon={CircleDollarSign} value="₱0" label="held by Serbizyu" detail="External Cash" /></> : role === "provider" ? <><Metric icon={BriefcaseBusiness} value="3" label="matching needs" detail="within Tagudin" /><Metric icon={Clock3} value="1" label="active Work" detail="draft due next" /><Metric icon={CircleDollarSign} value="₱80" label="cash receivable" detail="not platform balance" /><Metric icon={FileCheck2} value="2" label="completed demos" detail="fixture history" /></> : <><Metric icon={ShieldCheck} value="2" label="review items" detail="human decision" /><Metric icon={Clock3} value="1" label="stale response" detail="counterparty report" /><Metric icon={FileCheck2} value="0" label="live money events" detail="sandbox disabled" /><Metric icon={Users} value="9" label="demo scenarios" detail="synthetic cohort" /></>}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          {role !== "admin" && <section><SectionHeading eyebrow={role === "buyer" ? "Start with a familiar need" : "Service categories you cover"} title={role === "buyer" ? "Browse by what needs doing" : "Your service areas"} action={<button className="text-xs font-bold text-forest-700 hover:text-forest-800" onClick={() => navigate("/explore")}>See all <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>} /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{categories.map(({ label, icon: Icon, tone }) => <button key={label} className="surface group flex min-h-24 flex-col items-start justify-between p-4 text-left transition hover:-translate-y-1 hover:border-forest-200 hover:shadow-lift" onClick={() => navigate("/explore")}><span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span><strong className="mt-3 text-xs font-extrabold text-ink-800">{label}</strong></button>)}</div></section>}

          {role === "buyer" ? <section><SectionHeading eyebrow="Available around you" title="Practical services, ready to review" action={<Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>Explore all <ArrowRight className="h-3.5 w-3.5" /></Button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{services.slice(0, 3).map((service) => <ServiceCard key={service.id} service={service} />)}</div></section> : role === "provider" ? <section><SectionHeading eyebrow="Open near your area" title="Requests worth reviewing" action={<Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>Open request board <ArrowRight className="h-3.5 w-3.5" /></Button>} /><div className="grid gap-4 lg:grid-cols-2">{requests.map((request) => <RequestCard key={request.id} request={request} providerView />)}</div></section> : <OperationsPreview />}
        </div>

        <aside className="space-y-5"><ActiveOrderCard order={order} /><Card className="overflow-hidden"><div className="border-b border-ink-100 px-5 py-4"><p className="eyebrow">Shared truth</p><h3 className="mt-1 font-display text-base font-extrabold text-ink-950">Work and payment are separate.</h3></div><div className="space-y-3 p-5 text-xs leading-5 text-ink-500"><p><strong className="text-ink-800">Work:</strong> Maya is preparing the first draft.</p><p><strong className="text-ink-800">Payment:</strong> No cash report has been made. Serbizyu holds nothing.</p><button className="font-bold text-forest-700" onClick={() => navigate("/payments")}>Open payment explanation <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div></Card></aside>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, value, label, detail }: { icon: typeof Clock3; value: string; label: string; detail: string }) {
  return <div className="metric-card"><Icon className="h-4 w-4 text-mango-300" /><strong className="mt-4 block font-display text-2xl font-extrabold tracking-[-.04em]">{value}</strong><span className="mt-1 block text-xs font-bold text-white/90">{label}</span><small className="mt-0.5 block text-[10px] text-white/50">{detail}</small></div>;
}

function OperationsPreview() {
  return <section><SectionHeading eyebrow="Human review queue" title="Exceptions before automation" /><div className="grid gap-4 md:grid-cols-2"><Card className="border-coral-100 p-5"><div className="flex items-center justify-between"><Badge tone="coral">Mismatch</Badge><span className="text-[10px] font-bold text-ink-400">PAY-DEMO-07</span></div><h3 className="mt-4 font-display text-lg font-extrabold text-ink-950">Cash reports disagree</h3><p className="mt-2 text-xs leading-5 text-ink-500">Buyer reports ₱90 paid; Provider reports a different amount. Work remains in progress.</p><Button className="mt-5 w-full" variant="danger">Review shared facts</Button></Card><Card className="border-mango-100 p-5"><div className="flex items-center justify-between"><Badge tone="mango">Manual review</Badge><span className="text-[10px] font-bold text-ink-400">EVI-DEMO-03</span></div><h3 className="mt-4 font-display text-lg font-extrabold text-ink-950">Evidence needs context</h3><p className="mt-2 text-xs leading-5 text-ink-500">Receipt image is readable but does not match the submitted item list.</p><Button className="mt-5 w-full" variant="outline">Open evidence review</Button></Card></div></section>;
}

function HomeSkeleton() {
  return <main className="page-wrap"><div className="h-[360px] animate-pulse rounded-3xl bg-forest-100" /><div className="mt-6 grid gap-4 sm:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-white" />)}</div></main>;
}
