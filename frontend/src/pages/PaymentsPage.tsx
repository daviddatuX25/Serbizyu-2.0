import { useOrder } from "@/api/hooks";
import { Card } from "@/components/ui";
export function PaymentsPage() { const order = useOrder(); return <main className="page-wrap max-w-3xl"><h1 className="display-title">Payment</h1><Card className="mt-5 p-6"><p className="text-sm text-ink-500">{order.data?.paymentLane === "external_cash" ? "Pay directly when you both agree." : "Payment details appear here."}</p></Card></main>; }
