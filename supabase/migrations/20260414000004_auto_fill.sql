-- CoverMe.ai — Auto-Fill Engine (Phase 4)
-- Tracks candidates offered shifts during auto-fill and adds performance indexes.

-------------------------------------------------------
-- CALLOUT CANDIDATES TABLE
-------------------------------------------------------

CREATE TABLE callout_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  callout_id UUID NOT NULL REFERENCES callouts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  batch_number INT NOT NULL,
  score NUMERIC,
  offered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response TEXT CHECK (response IN ('accepted', 'declined', 'no_response', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup: all candidates for a callout
CREATE INDEX idx_callout_candidates_callout ON callout_candidates(callout_id);

-- Fast lookup: pending offers for an employee (used by webhook)
CREATE INDEX idx_callout_candidates_employee ON callout_candidates(employee_id);

-- Fast lookup: hours calculation — shifts by employee + date range
CREATE INDEX idx_shifts_employee_date ON shifts(employee_id, date)
  WHERE employee_id IS NOT NULL;

-- Fast lookup: callout candidates by response status
CREATE INDEX idx_callout_candidates_response ON callout_candidates(callout_id, response);

-------------------------------------------------------
-- RLS POLICIES
-------------------------------------------------------

ALTER TABLE callout_candidates ENABLE ROW LEVEL SECURITY;

-- Org members can view candidates for their org's callouts
CREATE POLICY "cc_select_org" ON callout_candidates
  FOR SELECT USING (
    callout_id IN (
      SELECT id FROM callouts WHERE organization_id = auth.organization_id()
    )
  );

-- Service role can insert/update (edge functions)
CREATE POLICY "cc_insert_service" ON callout_candidates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cc_update_service" ON callout_candidates
  FOR UPDATE USING (true);
