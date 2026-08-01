import { useOrder } from "@/api/hooks";
import { Button, Card } from "@/components/ui";
export function DealRoomPage() { const order = useOrder(); if (!order.data) return <main className="page-wrap">Loading…</main>; return <main className="page-wrap max-w-3xl"><h1 className="display-title">{order.data.title}</h1><Card className="mt-5 p-6"><p className="text-sm text-ink-500">Maya is working on your first drawing.</p><Button className="mt-4">Message Maya</Button></Card></main>; }
