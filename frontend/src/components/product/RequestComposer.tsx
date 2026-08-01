import { ArrowLeft, ArrowRight, Check, ChevronDown, MapPin, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCreateRequest } from "@/api/hooks";
import { Badge, Button } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { formatPeso } from "@/lib/cn";
import type { RequestDraft } from "@/types/domain";

const initialDraft: RequestDraft = {
  title: "",
  category: "Errands",
  details: "",
  budget: 100,
  area: "Tagudin Centro",
  workShape: "A1",
  lane: "external_cash",
};

const steps = ["What you need", "Details", "Review"];

export function RequestComposer() {
  const { composerOpen, closeComposer } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RequestDraft>(initialDraft);
  const createRequest = useCreateRequest();

  useEffect(() => {
    if (!composerOpen) {
      const timer = window.setTimeout(() => {
        setStep(0);
        setDraft(initialDraft);
        createRequest.reset();
      }, 240);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [composerOpen]);

  if (!composerOpen) return null;
  const canContinue = step === 0 ? draft.title.trim().length > 4 : step === 1 ? draft.details.trim().length > 8 && draft.budget > 0 : true;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-ink-950/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Post a request">
      <button className="absolute inset-0 cursor-default" onClick={closeComposer} aria-label="Close request composer" />
      <section className="relative flex h-full w-full max-w-[620px] flex-col overflow-hidden bg-cream-50 shadow-2xl animate-float-in">
        <header className="flex items-center gap-3 border-b border-ink-100 bg-white px-5 py-4 sm:px-7">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-100 text-forest-700"><Sparkles className="h-5 w-5" /></div>
          <div><p className="eyebrow">Create a clear request</p><h2 className="font-display text-lg font-extrabold text-ink-950">Ano ang kailangan mo?</h2></div>
          <button className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-ink-500 hover:bg-ink-50" onClick={closeComposer} aria-label="Close"><X className="h-5 w-5" /></button>
        </header>

        <div className="border-b border-ink-100 bg-white px-5 py-4 sm:px-7">
          <div className="grid grid-cols-3 gap-2">
            {steps.map((label, index) => <div key={label} className="flex items-center gap-2"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${index < step ? "bg-forest-600 text-white" : index === step ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-400"}`}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className={`hidden text-xs font-bold sm:block ${index === step ? "text-ink-950" : "text-ink-400"}`}>{label}</span></div>)}
          </div>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {createRequest.isSuccess ? (
            <div className="grid min-h-[420px] place-items-center text-center">
              <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-forest-100 text-forest-700"><Check className="h-7 w-7" /></span><Badge tone="forest" className="mt-5">Synthetic request created</Badge><h3 className="mt-3 font-display text-2xl font-extrabold text-ink-950">Ready for provider proposals</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-500">{createRequest.data.title} is now visible in this review build. No backend or genuine Tagudin record was created.</p><Button className="mt-6" onClick={closeComposer}>Return to workspace</Button></div>
            </div>
          ) : step === 0 ? (
            <div className="animate-float-in">
              <p className="eyebrow">Step 1</p><h3 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.035em] text-ink-950">Describe the outcome, not the app feature.</h3><p className="mt-2 text-sm leading-6 text-ink-500">A short, practical need works best. You can add limits and evidence next.</p>
              <label className="mt-7 block"><span className="field-label">I need someone to…</span><textarea autoFocus className="field-textarea text-base" placeholder="Example: Pick up medicine from the public market" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <div className="mt-5"><span className="field-label">Category</span><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{["Errands", "Repair & craft", "Creative", "Local goods", "Lessons", "Other"].map((item) => <button key={item} className={`min-h-12 rounded-xl border px-3 text-left text-xs font-bold transition ${draft.category === item ? "border-forest-400 bg-forest-50 text-forest-800 ring-2 ring-forest-100" : "border-ink-100 bg-white text-ink-600 hover:border-ink-200"}`} onClick={() => setDraft({ ...draft, category: item })}>{item}</button>)}</div></div>
            </div>
          ) : step === 1 ? (
            <div className="animate-float-in">
              <p className="eyebrow">Step 2</p><h3 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.035em] text-ink-950">Set clear boundaries.</h3><p className="mt-2 text-sm leading-6 text-ink-500">Tell providers what success looks like, your area, budget, and preferred lane.</p>
              <label className="mt-7 block"><span className="field-label">Details and limits</span><textarea className="field-textarea" placeholder="What is included? What should they avoid? Where should the handoff happen?" value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} /></label>
              <div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="field-label">Budget</span><div className="relative"><span className="absolute left-3.5 top-3 text-sm font-bold text-ink-500">₱</span><input className="field-input pl-8" type="number" min="50" value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: Number(event.target.value) })} /></div></label><label><span className="field-label">Area</span><div className="relative"><MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-ink-400" /><select className="field-input appearance-none pl-10" value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })}><option>Tagudin Centro</option><option>Brgy. Quirino</option><option>Brgy. Bio</option><option>Brgy. Libtong</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-ink-400" /></div></label></div>
              <div className="mt-5"><span className="field-label">Payment lane</span><button className="flex w-full items-center justify-between rounded-2xl border border-forest-200 bg-forest-50 p-4 text-left"><span><strong className="block text-sm text-forest-900">External Cash</strong><small className="mt-1 block text-xs text-forest-700">Pay provider directly · 0% pilot commission · Serbizyu holds nothing</small></span><span className="h-4 w-4 rounded-full border-4 border-forest-600 bg-white" /></button></div>
            </div>
          ) : (
            <div className="animate-float-in">
              <p className="eyebrow">Step 3</p><h3 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.035em] text-ink-950">Review before posting.</h3><p className="mt-2 text-sm leading-6 text-ink-500">This snapshot is what providers will respond to. You can still go back.</p>
              <div className="mt-7 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft"><div className="hero-mesh p-6 text-white"><Badge tone="dark" className="bg-white/15 ring-white/20">{draft.category}</Badge><h4 className="mt-4 font-display text-2xl font-extrabold leading-tight">{draft.title}</h4><p className="mt-2 text-sm text-white/70"><MapPin className="mr-1 inline h-3.5 w-3.5" />{draft.area}</p></div><div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-wider text-ink-400">Details</p><p className="mt-2 text-sm leading-6 text-ink-700">{draft.details}</p></div><div className="rounded-2xl bg-mango-50 p-4 text-center"><small className="block text-xs font-bold text-mango-700">Budget</small><strong className="font-display text-2xl font-extrabold text-ink-950">{formatPeso(draft.budget)}</strong></div></div><div className="border-t border-ink-100 px-6 py-4 text-xs leading-5 text-ink-500"><strong className="text-ink-800">External Cash:</strong> pay the provider directly. Reports from both sides are independent; Work remains separate.</div></div>
            </div>
          )}
        </div>

        {!createRequest.isSuccess && <footer className="flex items-center gap-3 border-t border-ink-100 bg-white px-5 py-4 sm:px-7"><Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</Button><div className="ml-auto"><Button size="lg" loading={createRequest.isPending} disabled={!canContinue} leftIcon={step < 2 ? <ArrowRight className="h-4 w-4" /> : <Check className="h-4 w-4" />} onClick={() => step < 2 ? setStep(step + 1) : createRequest.mutate(draft)}>{step < 2 ? "Continue" : "Post synthetic request"}</Button></div></footer>}
      </section>
    </div>
  );
}
