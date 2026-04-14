-- CoverMe.ai — Phase 8: Smart Alert Engine + Escalation Chain

-------------------------------------------------------
-- ALERTS TABLE
-------------------------------------------------------

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_employee_id UUID REFERENCES employees(id),
  related_shift_id UUID REFERENCES shifts(id),
  related_callout_id UUID REFERENCES callouts(id),
  status TEXT NOT NULL DEFAULT 'active',
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  notified_via TEXT[] DEFAULT '{}',
  escalation_level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT alerts_type_check CHECK (type IN (
    'coverage_gap', 'no_show', 'labor_over', 'cert_expiring',
    'cert_expired', 'schedule_late', 'callout_unfilled', 'compliance_violation',
    'consecutive_days'
  )),
  CONSTRAINT alerts_severity_check CHECK (severity IN ('critical', 'warning', 'info')),
  CONSTRAINT alerts_status_check CHECK (status IN ('active', 'acknowledged', 'resolved', 'auto_resolved'))
);

-- Indexes for querying
CREATE INDEX idx_alerts_org_status_created ON alerts (organization_id, status, created_at DESC);
CREATE INDEX idx_alerts_location ON alerts (location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_alerts_type ON alerts (type);

-- Updated_at trigger
CREATE TRIGGER set_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-------------------------------------------------------
-- ALERT PREFERENCES TABLE
-------------------------------------------------------

CREATE TABLE alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  alert_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT alert_prefs_channel_check CHECK (channel IN ('sms', 'push', 'dashboard')),
  CONSTRAINT alert_prefs_unique UNIQUE (user_id, alert_type, channel)
);

CREATE INDEX idx_alert_prefs_user ON alert_preferences (user_id, organization_id);

-------------------------------------------------------
-- RLS POLICIES
-------------------------------------------------------

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

-- Alerts: org members can read
CREATE POLICY "alerts_select" ON alerts
  FOR SELECT USING (organization_id = auth.organization_id());

-- Alerts: owners and managers can insert (edge functions use service role)
CREATE POLICY "alerts_insert" ON alerts
  FOR INSERT WITH CHECK (organization_id = auth.organization_id());

-- Alerts: owners and managers can update (acknowledge, resolve)
CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

-- Alert preferences: users manage their own
CREATE POLICY "alert_prefs_select" ON alert_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "alert_prefs_insert" ON alert_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "alert_prefs_update" ON alert_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "alert_prefs_delete" ON alert_preferences
  FOR DELETE USING (user_id = auth.uid());
