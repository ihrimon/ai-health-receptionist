-- 005_conversation_rating.sql
-- Post-booking conversation rating: shown to the caller as a 1-5 star
-- prompt right after a booking is confirmed in the chat UI (dashboard),
-- surfaced in the admin conversations list. Nullable — most conversations
-- (no booking yet, or the caller dismissed the prompt) have no rating.

ALTER TABLE conversations
  ADD COLUMN rating SMALLINT
    CONSTRAINT conversations_rating_range CHECK (rating BETWEEN 1 AND 5);
