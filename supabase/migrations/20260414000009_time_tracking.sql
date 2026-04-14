-- CoverMe.ai — Time Tracking & Payroll Tables
-- Supports time clock, weekly timesheets, pay periods, and pay stubs

-------------------------------------------------------
-- TIME ENTRIES (clock in/out)
-------------------------------------------------------

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  employee_id UUID REFERENCES employees(id),
  location_id UUID REFERENCES locations(id),
  shift_id UUID REFERENCES shifts(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_minutes INT DEFAULT 0,
  hours_worked NUMERIC GENERATED ALWAYS AS (
    CASE WHEN clock_out IS NOT NULL
      THEN EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0 - (break_minutes / 60.0)
      ELSE NULL
    END
  ) STORED,
  hourly_rate NUMERIC NOT NULL,
  gross_pay NUMERIC GENERATED ALWAYS AS (
    CASE WHEN clock_out IS NOT NULL
      THEN (EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0 - (break_minutes / 60.0)) * hourly_rate
      ELSE NULL
    END
  ) STORED,
  is_overtime BOOLEAN DEFAULT false,
  overtime_rate NUMERIC DEFAULT 1.5,
  status TEXT DEFAULT 'active',
  notes TEXT,
  edited_by UUID REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- PAY PERIODS
-------------------------------------------------------

CREATE TABLE pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open',
  total_regular_hours NUMERIC,
  total_overtime_hours NUMERIC,
  total_gross_pay NUMERIC,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- PAY STUBS
-------------------------------------------------------

CREATE TABLE pay_stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  pay_period_id UUID REFERENCES pay_periods(id),
  employee_id UUID REFERENCES employees(id),
  regular_hours NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  regular_rate NUMERIC,
  overtime_rate NUMERIC DEFAULT 1.5,
  regular_pay NUMERIC DEFAULT 0,
  overtime_pay NUMERIC DEFAULT 0,
  gross_pay NUMERIC DEFAULT 0,
  deductions JSONB DEFAULT '{}',
  net_pay NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- INDEXES
-------------------------------------------------------

CREATE INDEX idx_time_entries_employee_clock_in ON time_entries(employee_id, clock_in);
CREATE INDEX idx_time_entries_org_status ON time_entries(organization_id, status);
CREATE INDEX idx_pay_stubs_pay_period ON pay_stubs(pay_period_id);
CREATE INDEX idx_pay_periods_org_status ON pay_periods(organization_id, status);
CREATE INDEX idx_time_entries_location ON time_entries(location_id);

-------------------------------------------------------
-- UPDATED_AT TRIGGER ON TIME_ENTRIES
-------------------------------------------------------

CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entries_updated_at();

-------------------------------------------------------
-- ROW LEVEL SECURITY
-------------------------------------------------------

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_stubs ENABLE ROW LEVEL SECURITY;

-- time_entries policies
CREATE POLICY "time_entries_select" ON time_entries
  FOR SELECT USING (organization_id = public.get_organization_id());

CREATE POLICY "time_entries_insert" ON time_entries
  FOR INSERT WITH CHECK (
    organization_id = public.get_organization_id()
    AND public.get_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "time_entries_update" ON time_entries
  FOR UPDATE USING (
    organization_id = public.get_organization_id()
    AND public.get_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "time_entries_delete" ON time_entries
  FOR DELETE USING (
    organization_id = public.get_organization_id()
    AND public.get_user_role() = 'owner'
  );

-- pay_periods policies
CREATE POLICY "pay_periods_select" ON pay_periods
  FOR SELECT USING (organization_id = public.get_organization_id());

CREATE POLICY "pay_periods_insert" ON pay_periods
  FOR INSERT WITH CHECK (
    organization_id = public.get_organization_id()
    AND public.get_user_role() = 'owner'
  );

CREATE POLICY "pay_periods_update" ON pay_periods
  FOR UPDATE USING (
    organization_id = public.get_organization_id()
    AND public.get_user_role() = 'owner'
  );

-- pay_stubs policies
CREATE POLICY "pay_stubs_select" ON pay_stubs
  FOR SELECT USING (organization_id = public.get_organization_id());

CREATE POLICY "pay_stubs_insert" ON pay_stubs
  FOR INSERT WITH CHECK (
    organization_id = public.get_organization_id()
    AND public.get_user_role() = 'owner'
  );

CREATE POLICY "pay_stubs_update" ON pay_stubs
  FOR UPDATE USING (
    organization_id = public.get_organization_id()
    AND public.get_user_role() = 'owner'
  );
