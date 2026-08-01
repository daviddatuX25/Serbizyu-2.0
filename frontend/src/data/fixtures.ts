import type { OpenRequest, Order, ServiceListing, ViewerAccount, WorkPlan } from "@/types/domain";

export const currentUser: ViewerAccount = {
  id: "USR-ROSA-01",
  name: "Rosa Mendoza",
  shortName: "Rosa",
  avatar: "RM",
  area: "Tagudin Centro",
  capabilities: ["request", "provide", "agent"],
  agentFor: ["Lola Nena"],
};

export const maya = { id: "USR-MAYA-01", name: "Maya Dela Cruz", shortName: "Maya", avatar: "MD", area: "Tagudin Centro" };
export const noel = { id: "USR-NOEL-02", name: "Noel Ramos", shortName: "Noel", avatar: "NR", area: "Tagudin Public Market" };
export const lina = { id: "USR-LINA-03", name: "Lina Aquino", shortName: "Lina", avatar: "LA", area: "Brgy. Quirino" };
export const rosa = { id: currentUser.id, name: currentUser.name, shortName: currentUser.shortName, avatar: currentUser.avatar, area: currentUser.area };

export const serviceListings: ServiceListing[] = [
  { id: "SRV-101", title: "Hand-drawn invitation layout", category: "Creative", provider: maya, area: "Tagudin Centro", price: 80, priceLabel: "₱80", availability: "Can start today", description: "A simple personal invitation with one revision.", quickDealAvailable: true, featured: true, media: [{ id: "M-101", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80", alt: "Artist smiling while holding a sketchbook" }] },
  { id: "SRV-102", title: "Pick up medicine or small items", category: "Errands", provider: noel, area: "Tagudin Public Market", price: 70, priceLabel: "from ₱70", availability: "Available until 5 PM", description: "Local pickup with a clear item list and receipt handoff.", quickDealAvailable: true, media: [{ id: "M-102", url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80", alt: "Person holding a small shopping bag" }] },
  { id: "SRV-103", title: "Basic trouser alteration", category: "Repair", provider: lina, area: "Brgy. Quirino", price: 150, priceLabel: "₱150", availability: "3 slots this week", description: "Simple hemming and fitting by appointment.", media: [{ id: "M-103", url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80", alt: "Tailor working with clothing fabric" }] },
  { id: "SRV-104", title: "Seedling trays for home gardens", category: "Local goods", provider: { id: "USR-ANA-04", name: "Ana's Garden", shortName: "Ana", avatar: "AG", area: "Brgy. Becques" }, area: "Brgy. Becques", price: 50, priceLabel: "₱50", availability: "8 trays ready", description: "Vegetable seedlings for pickup or nearby handoff.", media: [{ id: "M-104", url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80", alt: "Young green seedlings growing in trays" }] },
];

export const openRequests: OpenRequest[] = [
  { id: "REQ-204", title: "Need two seedling trays", buyer: rosa, area: "Tagudin Centro", budget: 100, category: "Local goods", proposals: 2, postedLabel: "18 min ago", description: "Tomato or pechay seedlings. Pickup near the public market.", status: "open" },
  { id: "REQ-205", title: "Please fetch school supplies", buyer: { id: "USR-BEN-03", name: "Ben Ramos", shortName: "Ben", avatar: "BR", area: "Brgy. Bio" }, area: "Brgy. Bio", budget: 300, category: "Errands", proposals: 1, postedLabel: "42 min ago", description: "Notebook, pencil, and colored paper. Ask before spending beyond budget.", status: "open" },
];

export const primaryOrder: Order = {
  id: "ORD-260801-08", title: "Hand-drawn invitation layout", buyer: rosa, provider: maya, amount: 80, area: "Tagudin Centro", orderStatus: "active", workStatus: "in_progress", paymentLane: "external_cash", cashStatus: "not_reported", buyerCashReported: false, providerCashReported: false, nextActor: "provider", nextAction: "Maya will send the first draft", steps: [
    { id: "S1", title: "Details agreed", owner: "buyer", state: "done", note: "Date, names, and style were agreed." },
    { id: "S2", title: "First drawing", owner: "provider", state: "active", note: "Maya is preparing the first version." },
    { id: "S3", title: "Your review", owner: "buyer", state: "upcoming", note: "You can request the included revision." },
  ], timeline: [
    { id: "E1", title: "Order started", actor: "Rosa and Maya", at: "Today", note: "₱80 agreed. Cash will be handled directly.", tone: "good" },
    { id: "E2", title: "Maya started drawing", actor: "Maya", at: "10:20 AM", note: "First version is being prepared." },
  ],
};

export const workPlan: WorkPlan = {
  id: "PLAN-12", title: "Birthday lunch at home", area: "Tagudin Centro", items: [
    { id: "P1", title: "Lunch trays", amount: 1200, provider: { id: "USR-TESS-11", name: "Aling Tessie", shortName: "Tessie", avatar: "AT", area: "Tagudin Centro" }, state: "in_progress", paymentNote: "Agree directly with Tessie" },
    { id: "P2", title: "Simple banner", amount: 250, provider: maya, state: "accepted", paymentNote: "Agree after the design is chosen" },
    { id: "P3", title: "Pick up ice and drinks", amount: 300, state: "needs_provider", dependency: "Do this after the lunch pickup time is confirmed", paymentNote: "No provider chosen yet" },
  ],
};
