-- CoverMe.ai — Daily Briefing & Owner Chat (Phase 6)
-- Stores briefing history and owner query logs for analytics.

-------------------------------------------------------
-- BRIEFINGS TABLE
-------------------------------------------------------

CREATE TABLE briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('morning', 'evening', 'on_demand')),
  recipient_phone TEXT NOT NULL,
  content TEXT NOT NULL,
  data_snapshot JSONB,
  sent_at TIMESTAMPTZ DEFAULT now(),
  twilio_sid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefings_org ON briefings(organization_id);
CREATE INDEX idx_briefings_sent ON briefings(sent_at DESC);
CREATE INDEX idx_briefings_type ON briefings(organization_id, type);

-------------------------------------------------------
-- OWNER QUERIES TABLE
-------------------------------------------------------

CREATE TABLE owner_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  parsed_command TEXT,
  response TEXT NOT NULL,
  response_time_ms INT,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_owner_queries_org ON owner_queries(organization_id);
CREATE INDEX idx_owner_queries_created ON owner_queries(created_at DESC);

-------------------------------------------------------
-- RLS POLICIES
-------------------------------------------------------

ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_queries ENABLE ROW LEVEL SECURITY;

-- Org owners can view their own briefings
CREATE POLICY "briefings_select_org" ON briefings
  FOR SELECT USING (
    organization_id = (
      SELECT (raw_app_meta_data->>'organization_id')::uuid
      FROM auth.users WHERE id = auth.uid()
    )
  );

-- Service role can insert (edge functions)
CREATE POLICY "briefings_insert_service" ON briefings
  FOR INSERT WITH CHECK (true);

-- Org owners can view their own queries
CREATE POLICY "owner_queries_select_org" ON owner_queries
  FOR SELECT USING (
    organization_id = (
      SELECT (raw_app_meta_data->>'organization_id')::uuid
      FROM auth.users WHERE id = auth.uid()
    )
  );

-- Service role can insert (edge functions)
CREATE POLICY "owner_queries_insert_service" ON owner_queries
  FOR INSERT WITH CHECK (true);
