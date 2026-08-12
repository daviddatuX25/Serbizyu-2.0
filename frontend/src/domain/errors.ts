export type GatewayErrorCode = "validation" | "permission" | "not_found" | "stale" | "expired" | "offline" | "retryable" | "deferred" | "invariant";

export class GatewayError extends Error {
  constructor(public readonly code: GatewayErrorCode, message: string, public readonly details: Record<string, unknown> = {}) {
    super(message);
    this.name = "GatewayError";
  }
}
