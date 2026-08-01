import { Filter, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRequests, useServices } from "@/api/hooks";
import { RequestCard, ServiceCard } from "@/components/product/Cards";
import { Badge, Button, Card } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/cn";

export function ExplorePage() {
  const { role } = useApp();
  const services = useServices();
  const requests = useRequests();
  const [tab, setTab] = useState<"services" | "requests">(role === "provider" ? "requests" : "services");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const serviceResults = useMemo(() => (services.data ?? []).filter((item) => {
    const matchesQuery = `${item.title} ${item.category} ${item.provider}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "All" || item.category === category);
  }), [category, query, services.data]);
  const requestResults = useMemo(() => (requests.data ?? []).filter((item) => `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase()) && (category === "All" || item.category === category)), [category, query, requests.data]);

  return (
    <main className="page-wrap">
      <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-8">
        <div className="absolute right-0 top-0 h-full w-1/3 pattern-grid opacity-60 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative max-w-2xl"><Badge tone="forest"><MapPin className="h-3 w-3" /> Tagudin pilot area</Badge><h1 className="display-title mt-4">Find the right fit — not just the closest result.</h1><p className="mt-3 text-sm leading-6 text-ink-500">Compare what is offered, what is included, the Work shape, payment lane, availability, and recovery route before deciding.</p></div>
        <div className="relative mt-7 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-3.5 h-5 w-5 text-ink-400" /><input className="field-input h-13 pl-12 pr-10 text-[15px]" placeholder="Search services, practical tasks, or a need…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-50" onClick={() => setQuery("")}><X className="h-4 w-4" /></button>}</label><Button size="lg" variant="outline" leftIcon={<SlidersHorizontal className="h-4 w-4" />}>More filters</Button></div>
      </section>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-2xl border border-ink-100 bg-white p-1.5 shadow-sm"><button className={cn("min-h-10 rounded-xl px-4 text-xs font-extrabold transition", tab === "services" ? "bg-ink-950 text-white" : "text-ink-500 hover:bg-ink-50")} onClick={() => setTab("services")}>Services <span className="ml-1 opacity-60">{serviceResults.length}</span></button><button className={cn("min-h-10 rounded-xl px-4 text-xs font-extrabold transition", tab === "requests" ? "bg-ink-950 text-white" : "text-ink-500 hover:bg-ink-50")} onClick={() => setTab("requests")}>Open requests <span className="ml-1 opacity-60">{requestResults.length}</span></button></div>
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">{["All", "Errands", "Repair & craft", "Creative", "Local goods"].map((item) => <button key={item} className={cn("min-h-9 shrink-0 rounded-full border px-3 text-xs font-bold transition", category === item ? "border-forest-600 bg-forest-600 text-white" : "border-ink-100 bg-white text-ink-500 hover:border-ink-200")} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block"><Card className="sticky top-24 p-5"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-forest-600" /><h2 className="font-display text-sm font-extrabold text-ink-950">Quick filters</h2></div><FilterGroup title="Work shape" options={["A1 Linear", "A3 Appointment", "A4 Handoff", "A9 Digital"]} /><FilterGroup title="Payment lane" options={["External Cash", "External Digital Proof"]} /><div className="mt-5 rounded-2xl bg-mango-50 p-4"><p className="text-xs font-extrabold text-mango-700">Sandbox lanes hidden</p><p className="mt-1 text-[11px] leading-4 text-mango-700/70">Direct Digital and Tiwala appear only inside labeled Pattern Lab demonstrations.</p></div></Card></aside>

        <div>{tab === "services" ? <><div className="mb-4 flex items-center justify-between"><p className="text-sm text-ink-500"><strong className="text-ink-900">{serviceResults.length}</strong> useful matches</p><span className="text-[11px] font-semibold text-ink-400">Sorted by fit and current availability</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{serviceResults.map((service) => <ServiceCard key={service.id} service={service} />)}</div></> : <><div className="mb-4 flex items-center justify-between"><p className="text-sm text-ink-500"><strong className="text-ink-900">{requestResults.length}</strong> open needs</p><span className="text-[11px] font-semibold text-ink-400">Clear terms before proposal</span></div><div className="grid gap-4 xl:grid-cols-2">{requestResults.map((request) => <RequestCard key={request.id} request={request} providerView={role === "provider"} />)}</div></>}</div>
      </section>
    </main>
  );
}

function FilterGroup({ title, options }: { title: string; options: string[] }) {
  return <fieldset className="mt-5 border-t border-ink-100 pt-5"><legend className="text-[10px] font-extrabold uppercase tracking-[.12em] text-ink-400">{title}</legend><div className="mt-3 space-y-2">{options.map((option, index) => <label key={option} className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-ink-600"><input type="checkbox" defaultChecked={index === 0} className="h-4 w-4 rounded border-ink-300 text-forest-600 focus:ring-forest-300" />{option}</label>)}</div></fieldset>;
}
