-- CoverMe.ai — SMS Enhancements (Phase 3)
-- Adds indexes for SMS lookups and conversation_context table.

-------------------------------------------------------
-- INDEXES for sms_conversations
-------------------------------------------------------

-- Fast lookup: recent messages by phone number
CREATE INDEX idx_sms_phone_created
  ON sms_conversations(phone_number, created_at DESC);

-- Fast lookup: messages related to a specific callout
CREATE INDEX idx_sms_callout
  ON sms_conversations(related_callout_id)
  WHERE related_callout_id IS NOT NULL;

-- Fast lookup: messages related to a specific shift
CREATE INDEX idx_sms_shift
  ON sms_conversations(related_shift_id)
  WHERE related_shift_id IS NOT NULL;

-- Fast lookup: outbound messages to a phone (for context detection)
CREATE INDEX idx_sms_phone_outbound
  ON sms_conversations(phone_number, created_at DESC)
  WHERE direction = 'outbound';

-------------------------------------------------------
-- CONVERSATION CONTEXT
-- Tracks active conversation state per phone number.
-- Used by the webhook to know whether an incoming "yes"
-- is a reply to a shift offer, approval request, etc.
-------------------------------------------------------

CREATE TABLE conversation_context (
  phone_number TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_context TEXT NOT NULL DEFAULT 'idle'
    CHECK (current_context IN ('idle', 'awaiting_shift_reply', 'awaiting_approval', 'owner_chat')),
  context_data JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctx_select_org" ON conversation_context
  FOR SELECT USING (organization_id = auth.organization_id());

-- Service role can insert/update (edge functions use service role key)
-- No user-facing insert/update needed — only edge functions mutate this table
CREATE POLICY "ctx_insert_service" ON conversation_context
  FOR INSERT WITH CHECK (true);

CREATE POLICY "ctx_update_service" ON conversation_context
  FOR UPDATE USING (true);

CREATE POLICY "ctx_delete_service" ON conversation_context
  FOR DELETE USING (organization_id = auth.organization_id() AND auth.user_role() = 'owner');

-------------------------------------------------------
-- INDEX on employees.phone for webhook lookups
-------------------------------------------------------

CREATE INDEX idx_employees_phone ON employees(phone);
