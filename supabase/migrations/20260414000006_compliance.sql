-- CoverMe.ai — Phase 7: Compliance Guardrails
-- Audit log for compliance checks + certification renewal reminders

-------------------------------------------------------
-- TABLES
-------------------------------------------------------

-- Compliance audit log — records each schedule validation
CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by UUID REFERENCES auth.users(id),
  score NUMERIC NOT NULL DEFAULT 0,
  violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  result TEXT NOT NULL DEFAULT 'blocked' CHECK (result IN ('passed', 'warnings_only', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Certification renewal reminders
CREATE TABLE cert_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL CHECK (cert_type IN ('smart_serve', 'food_handler', 'whmis', 'first_aid')),
  expires_at DATE NOT NULL,
  reminder_sent_at TIMESTAMPTZ,
  renewed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reminded', 'renewed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-------------------------------------------------------
-- INDEXES
-------------------------------------------------------

CREATE INDEX idx_compliance_checks_org ON compliance_checks(organization_id);
CREATE INDEX idx_compliance_checks_location ON compliance_checks(location_id);
CREATE INDEX idx_compliance_checks_schedule ON compliance_checks(schedule_id) WHERE schedule_id IS NOT NULL;
CREATE INDEX idx_compliance_checks_result ON compliance_checks(organization_id, result);

CREATE INDEX idx_cert_reminders_org ON cert_reminders(organization_id);
CREATE INDEX idx_cert_reminders_employee ON cert_reminders(employee_id);
CREATE INDEX idx_cert_reminders_status ON cert_reminders(organization_id, status);
CREATE INDEX idx_cert_reminders_expires ON cert_reminders(expires_at);

-------------------------------------------------------
-- TRIGGERS
-------------------------------------------------------

CREATE TRIGGER trg_cert_reminders_updated_at
  BEFORE UPDATE ON cert_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-------------------------------------------------------
-- RLS POLICIES
-------------------------------------------------------

ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_reminders ENABLE ROW LEVEL SECURITY;

-- compliance_checks: org members can read, managers can insert
CREATE POLICY "compliance_checks_select"
  ON compliance_checks FOR SELECT
  USING (organization_id = auth.organization_id());

CREATE POLICY "compliance_checks_insert"
  ON compliance_checks FOR INSERT
  WITH CHECK (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

-- cert_reminders: org members can read, managers can manage
CREATE POLICY "cert_reminders_select"
  ON cert_reminders FOR SELECT
  USING (organization_id = auth.organization_id());

CREATE POLICY "cert_reminders_insert"
  ON cert_reminders FOR INSERT
  WITH CHECK (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "cert_reminders_update"
  ON cert_reminders FOR UPDATE
  USING (organization_id = auth.organization_id())
  WITH CHECK (auth.user_role() IN ('owner', 'manager'));
