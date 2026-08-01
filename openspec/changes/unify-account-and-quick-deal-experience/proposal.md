# Unify account and Quick Deal experience

## Why
The initial React foundation exposed a prototype reviewer role switcher as product UI, rendered taxonomy art instead of listing media, and reduced Quick Deal to a manual QR demonstration. This conflicts with the product model: one person can request, provide, own listings, and act through delegated permissions.

## What changes
- Replace exclusive Buyer/Provider UI role switching with one logged-in multi-capability account.
- Make Buyer and Provider transaction relationships, not global identities.
- Replace verbose explanatory dashboard language with short task-led Taglish labels and progressive disclosure.
- Add photo-led listing media contracts and photo card anatomy.
- Build a connected/mock Quick Deal vertical slice: live camera permission state, auto-looping visual QR stream, fast price adjustments, counter/accept flow, dual confirmation, local receipt, and sync status.
- Add a related-work planning surface that represents a parent plan and independent child obligations without making unsupported escrow or payout promises.
- Keep Operations as a future protected surface rather than a consumer role toggle.

## Scope
This is a durable React frontend and endpoint-shaped mock API change. It does not activate offline money authorization, production escrow, or pilot Deal-Chaining.
