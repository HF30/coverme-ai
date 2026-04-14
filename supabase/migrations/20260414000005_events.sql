-- CoverMe.ai — Phase 5: Event-Aware Staffing
-- Sports/entertainment events that affect staffing demand

-------------------------------------------------------
-- EVENTS
-------------------------------------------------------

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  venue TEXT,
  is_playoff BOOLEAN DEFAULT false,
  is_ppv BOOLEAN DEFAULT false,
  demand_multiplier NUMERIC DEFAULT 1.3,
  affects_locations UUID[],
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_org_date ON events(organization_id, event_date);
CREATE INDEX idx_events_external_id ON events(external_id);
CREATE INDEX idx_events_type ON events(event_type);

-- Trigger for updated_at
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------
-- STAFFING SUGGESTIONS
-------------------------------------------------------

CREATE TABLE staffing_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  event_id UUID REFERENCES events(id),
  location_id UUID REFERENCES locations(id),
  suggested_date DATE NOT NULL,
  role_id UUID REFERENCES roles(id),
  current_headcount INT,
  suggested_headcount INT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_headcount INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staffing_suggestions_org ON staffing_suggestions(organization_id, suggested_date);
CREATE INDEX idx_staffing_suggestions_event ON staffing_suggestions(event_id);
CREATE INDEX idx_staffing_suggestions_status ON staffing_suggestions(status);

-------------------------------------------------------
-- EVENT ACTUALS (for learning)
-------------------------------------------------------

CREATE TABLE event_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  location_id UUID REFERENCES locations(id),
  actual_covers INT,
  normal_covers_estimate INT,
  actual_revenue NUMERIC,
  labor_cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_actuals_event ON event_actuals(event_id);

-------------------------------------------------------
-- ROW LEVEL SECURITY
-------------------------------------------------------

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_actuals ENABLE ROW LEVEL SECURITY;

-- EVENTS
CREATE POLICY "events_select" ON events
  FOR SELECT USING (organization_id = auth.organization_id());

CREATE POLICY "events_insert_owner_manager" ON events
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "events_update_owner_manager" ON events
  FOR UPDATE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "events_delete_owner_manager" ON events
  FOR DELETE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

-- STAFFING SUGGESTIONS
CREATE POLICY "staffing_suggestions_select" ON staffing_suggestions
  FOR SELECT USING (organization_id = auth.organization_id());

CREATE POLICY "staffing_suggestions_insert_owner_manager" ON staffing_suggestions
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "staffing_suggestions_update_owner_manager" ON staffing_suggestions
  FOR UPDATE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "staffing_suggestions_delete_owner_manager" ON staffing_suggestions
  FOR DELETE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

-- EVENT ACTUALS
CREATE POLICY "event_actuals_select" ON event_actuals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_actuals.event_id
        AND e.organization_id = auth.organization_id()
    )
  );

CREATE POLICY "event_actuals_insert_owner_manager" ON event_actuals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_actuals.event_id
        AND e.organization_id = auth.organization_id()
        AND auth.user_role() IN ('owner', 'manager')
    )
  );

CREATE POLICY "event_actuals_update_owner_manager" ON event_actuals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_actuals.event_id
        AND e.organization_id = auth.organization_id()
        AND auth.user_role() IN ('owner', 'manager')
    )
  );
