export type EntityId = string & { readonly __entityId: unique symbol };
export type ListingId = string & { readonly __listingId: unique symbol };
export type RequestId = string & { readonly __requestId: unique symbol };
export type OrderId = string & { readonly __orderId: unique symbol };
export type WorkId = string & { readonly __workId: unique symbol };
export type PaymentObligationId = string & { readonly __paymentObligationId: unique symbol };

export function asListingId(value: string): ListingId { return value as ListingId; }
export function asRequestId(value: string): RequestId { return value as RequestId; }
export function asOrderId(value: string): OrderId { return value as OrderId; }
export function asWorkId(value: string): WorkId { return value as WorkId; }
export function asPaymentObligationId(value: string): PaymentObligationId { return value as PaymentObligationId; }
