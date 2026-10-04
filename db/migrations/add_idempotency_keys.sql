-- =============================================================================
-- Migration: Add idempotency_key columns for offline event deduplication
-- Run once against adaptvr_db.
-- Safe to run multiple times (uses IF NOT EXISTS / DO NOTHING patterns).
-- =============================================================================

-- ── INTERACTION_EVENT ─────────────────────────────────────────────────────────
ALTER TABLE INTERACTION_EVENT
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Unique partial index: only enforce uniqueness when the key is present
-- (legacy rows without a key are unaffected)
CREATE UNIQUE INDEX IF NOT EXISTS uq_interaction_event_idempotency_key
  ON INTERACTION_EVENT (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── ML_PREDICTION ─────────────────────────────────────────────────────────────
ALTER TABLE ML_PREDICTION
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ml_prediction_idempotency_key
  ON ML_PREDICTION (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── ADAPTATION_EVENT ──────────────────────────────────────────────────────────
ALTER TABLE ADAPTATION_EVENT
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_adaptation_event_idempotency_key
  ON ADAPTATION_EVENT (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Done.
-- After running this migration the backend routes will accept the
-- idempotency_key field and use INSERT ... ON CONFLICT DO NOTHING
-- to safely deduplicate replayed offline events from the VR headset.
