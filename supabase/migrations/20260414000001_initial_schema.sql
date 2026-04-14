-- CoverMe.ai — Initial Schema
-- All timestamps UTC, display in America/Toronto

-- Helper function: extract organization_id from JWT app_metadata
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'organization_id')::uuid
$$;

-- Helper function: extract user role from JWT app_metadata
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role'
$$;

-- Helper function: extract primary location from JWT app_metadata
CREATE OR REPLACE FUNCTION auth.location_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'location_id')::uuid
$$;

-------------------------------------------------------
-- TABLES
-------------------------------------------------------

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Toronto',
  lat numeric,
  lng numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,  -- E.164 format: +1XXXXXXXXXX
  email text,
  primary_location_id uuid NOT NULL REFERENCES locations(id),
  can_float boolean NOT NULL DEFAULT true,
  hourly_rate numeric NOT NULL,
  max_hours_per_week numeric NOT NULL DEFAULT 44,  -- Ontario ESA
  reliability_score numeric NOT NULL DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  requires_smart_serve boolean NOT NULL DEFAULT false,
  requires_food_handler boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE employee_roles (
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, role_id, location_id)
);

CREATE TABLE employee_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cert_type text NOT NULL CHECK (cert_type IN ('smart_serve', 'food_handler', 'whmis', 'first_aid')),
  cert_number text,
  issued_at date NOT NULL,
  expires_at date NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE employee_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sunday..6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL,
  effective_until date,  -- null = ongoing
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  employee_id uuid REFERENCES employees(id),
  date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'missed', 'cancelled')),
  is_open boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  week_start date NOT NULL,  -- Monday of the week
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE callouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  reason text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'auto_filling', 'filled', 'escalated', 'unfilled')),
  filled_by_employee_id uuid REFERENCES employees(id),
  filled_at timestamptz,
  escalated_at timestamptz,
  resolution_time_seconds int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sms_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  employee_id uuid REFERENCES employees(id),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message text NOT NULL,
  context text NOT NULL DEFAULT 'general' CHECK (context IN ('callout', 'shift_offer', 'owner_briefing', 'owner_command', 'general')),
  related_callout_id uuid REFERENCES callouts(id),
  related_shift_id uuid REFERENCES shifts(id),
  twilio_sid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-------------------------------------------------------
-- INDEXES
-------------------------------------------------------

CREATE INDEX idx_locations_org ON locations(organization_id);
CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_employees_location ON employees(primary_location_id);
CREATE INDEX idx_employees_user ON employees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX idx_employee_certifications_employee ON employee_certifications(employee_id);
CREATE INDEX idx_shifts_org_date ON shifts(organization_id, date);
CREATE INDEX idx_shifts_location_date ON shifts(location_id, date);
CREATE INDEX idx_shifts_employee ON shifts(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_shifts_open ON shifts(organization_id, is_open) WHERE is_open = true;
CREATE INDEX idx_schedules_org_week ON schedules(organization_id, week_start);
CREATE INDEX idx_callouts_org ON callouts(organization_id);
CREATE INDEX idx_callouts_shift ON callouts(shift_id);
CREATE INDEX idx_callouts_status ON callouts(organization_id, status);
CREATE INDEX idx_sms_org ON sms_conversations(organization_id);
CREATE INDEX idx_sms_phone ON sms_conversations(phone_number);
CREATE INDEX idx_sms_employee ON sms_conversations(employee_id) WHERE employee_id IS NOT NULL;

-------------------------------------------------------
-- UPDATED_AT TRIGGER
-------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
