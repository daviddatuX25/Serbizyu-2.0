import { ArrowUpRight, BriefcaseBusiness, Clock3, MapPin, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "@/context/RouterContext";
import type { OpenRequest, Order, ServiceListing } from "@/types/domain";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { cn, formatPeso } from "@/lib/cn";

const artTones = {
  forest: "from-forest-100 via-forest-50 to-mango-50 text-forest-700",
  mango: "from-mango-100 via-mango-50 to-cream-50 text-mango-700",
  coral: "from-coral-100 via-coral-50 to-cream-50 text-coral-600",
  blue: "from-blue-100 via-blue-50 to-cream-50 text-blue-700",
};

export function ServiceCard({ service }: { service: ServiceListing }) {
  const { navigate } = useRouter();
  return (
    <Card className="group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-forest-200 hover:shadow-lift">
      <div className={cn("service-art m-3 mb-0 bg-gradient-to-br p-4", artTones[service.tone])}>
        <div className="absolute -right-5 -top-8 h-28 w-28 rounded-full border-[18px] border-current opacity-10" />
        <div className="absolute bottom-3 right-4 font-display text-4xl font-extrabold opacity-20">{service.workShape}</div>
        <Badge tone={service.tone === "coral" ? "coral" : service.tone === "mango" ? "mango" : service.tone === "blue" ? "blue" : "forest"}>{service.category}</Badge>
        <p className="absolute bottom-3 left-4 text-[11px] font-extrabold uppercase tracking-[.12em]">{service.workShapeLabel}</p>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3"><h3 className="font-display text-[15px] font-extrabold leading-5 tracking-[-0.02em] text-ink-950">{service.title}</h3><button className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-500 transition group-hover:bg-forest-600 group-hover:text-white" onClick={() => navigate("/explore")} aria-label={`Open ${service.title}`}><ArrowUpRight className="h-4 w-4" /></button></div>
        <div className="mt-3 flex items-center gap-2"><Avatar initials={service.providerInitials} tone={service.tone === "mango" ? "mango" : service.tone === "coral" ? "coral" : service.tone === "blue" ? "blue" : "forest"} className="h-8 w-8 rounded-xl" /><div className="min-w-0"><p className="truncate text-xs font-bold text-ink-800">{service.provider}</p><p className="truncate text-[11px] text-ink-400"><MapPin className="mr-1 inline h-3 w-3" />{service.area}</p></div></div>
        <div className="mt-4 flex items-end justify-between gap-3"><div><strong className="font-display text-lg font-extrabold text-ink-950">{service.priceLabel}</strong><p className="mt-0.5 text-[10px] font-semibold text-forest-600">{service.availability}</p></div><Badge tone="neutral">{service.lane === "external_cash" ? "Cash" : "Proof"}</Badge></div>
      </div>
    </Card>
  );
}

export function RequestCard({ request, providerView = false }: { request: OpenRequest; providerView?: boolean }) {
  return (
    <Card className="p-4 transition hover:border-forest-200 hover:shadow-lift">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-mango-50 text-mango-700"><BriefcaseBusiness className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-ink-400">{request.id} · {request.category}</p><h3 className="mt-1 font-display text-sm font-extrabold text-ink-950">{request.title}</h3></div><strong className="shrink-0 font-display text-base font-extrabold text-forest-700">{formatPeso(request.budget)}</strong></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-500">{request.description}</p><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-ink-400"><span><MapPin className="mr-1 inline h-3 w-3" />{request.area}</span><span><Clock3 className="mr-1 inline h-3 w-3" />{request.postedLabel}</span><span><Users className="mr-1 inline h-3 w-3" />{request.proposals} proposal{request.proposals === 1 ? "" : "s"}</span></div>{providerView && <Button className="mt-3 w-full" variant="outline" size="sm">Review request</Button>}</div></div>
    </Card>
  );
}

export function ActiveOrderCard({ order, compact = false }: { order: Order; compact?: boolean }) {
  const { navigate } = useRouter();
  return (
    <Card className="overflow-hidden border-forest-100">
      <div className="flex items-center justify-between border-b border-forest-100 bg-forest-50 px-5 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-forest-400" /><span className="text-xs font-extrabold uppercase tracking-[.12em] text-forest-700">Active deal</span></div><span className="text-[11px] font-bold text-forest-700">{order.id}</span></div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-lg font-extrabold tracking-[-.025em] text-ink-950">{order.title}</h3><p className="mt-1 text-xs text-ink-500">{order.provider.shortName} ↔ {order.buyer.shortName} · {order.area}</p></div><strong className="font-display text-xl font-extrabold text-ink-950">{formatPeso(order.amount)}</strong></div>
        {!compact && <div className="mt-5 grid grid-cols-3 gap-2"><StatusCell label="Order" value="Active" tone="forest" /><StatusCell label="Work" value={order.workStatus === "awaiting_buyer_review" ? "For review" : "In progress"} tone="mango" /><StatusCell label="Payment" value={order.cashStatus === "not_reported" ? "No report" : order.cashStatus.replaceAll("_", " ")} tone="blue" /></div>}
        <div className="mt-5 rounded-2xl bg-ink-950 p-4 text-white"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><ShieldCheck className="h-4 w-4 text-forest-300" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/50">Next responsible action</p><p className="mt-1 text-sm font-bold">{order.nextAction}</p><p className="mt-1 text-[11px] text-white/55">Responsible: {order.nextActor}</p></div></div></div>
        <div className="mt-4 flex gap-2"><Button className="flex-1" onClick={() => navigate("/deal")}>Open Deal Room</Button><Button variant="outline" size="icon" aria-label="Message"><MessageCircle className="h-4 w-4" /></Button></div>
      </div>
    </Card>
  );
}

function StatusCell({ label, value, tone }: { label: string; value: string; tone: "forest" | "mango" | "blue" }) {
  const styles = { forest: "bg-forest-50 text-forest-800", mango: "bg-mango-50 text-mango-700", blue: "bg-blue-50 text-blue-700" };
  return <div className={cn("rounded-xl p-3", styles[tone])}><span className="block text-[9px] font-extrabold uppercase tracking-[.12em] opacity-60">{label}</span><strong className="mt-1 block truncate text-[11px] capitalize">{value}</strong></div>;
}
