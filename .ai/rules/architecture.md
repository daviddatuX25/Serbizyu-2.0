---
globs: app/**
---

# Modular Monolith & Architecture Rules

- **Module Isolation:** Code inside `app/Modules/{ModuleA}` must NEVER import from `app/Modules/{ModuleB}` directly.
- **Shared Contracts:** Cross-module communication must use interfaces and data contracts defined in `app/Shared/Contracts` or `app/Shared/Application`.
- **Controllers & Routing:** Controllers in `app/Http/Controllers` may query multiple modules via constructor-injected application services or shared contracts.
- **DTOs and Envelopes:** Use `App\Shared\Application\CommandEnvelope`, `FirstSliceResponse`, or `ErrorEnvelope` for consistent application responses across slice queries and commands.
