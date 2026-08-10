# @brainstack/voice

Placeholder package for the voice pipeline:

- Twilio Voice + Media Streams webhook handling (Phase 2)
- Deepgram real-time speech-to-text (Phase 3)
- ElevenLabs text-to-speech streaming (Phase 3)

Phase 2 already implements the Twilio webhook handling, TwiML response
building, and the Media Streams WebSocket endpoint directly in
`apps/api/src/modules/voice` — not here. That mirrors the `@brainstack/
workflow` precedent from Phase 1 (BullMQ wired directly in `apps/api/src/
queue` first): no app currently depends on any `@brainstack/*` workspace
package yet, and `apps/api`'s `tsc`-based build (no configured `rootDir`)
isn't set up to safely resolve a symlinked workspace package's source
outside `apps/api/src`. Extracting into this package is worth doing once
Phase 3's Deepgram/ElevenLabs streaming pipeline takes shape and needs to be
shared with a future standalone worker process — at that point, move the
TwiML builder, webhook DTOs, and Media Stream handler here.
