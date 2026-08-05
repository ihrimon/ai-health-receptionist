# @brainstack/workflow

Placeholder package for BullMQ job/queue definitions (booking validation,
transcript save, notifications — Phase 5).

Phase 1 already wires the Redis connection and registers the
`transcript-save` / `notification` queues directly in
`apps/api/src/queue` so the connection is provable end-to-end. Once the
actual job processors are built in Phase 5, move the queue names and
processor classes here so they can be shared between `apps/api` and any
future standalone worker process.
