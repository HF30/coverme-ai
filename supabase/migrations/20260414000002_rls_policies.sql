-- CoverMe.ai — Row Level Security Policies
-- Roles: owner (full org access), manager (read/write own location, read other locations), employee (own data)

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE callouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------
-- ORGANIZATIONS
-------------------------------------------------------

CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id = auth.organization_id());

CREATE POLICY "org_update_owner" ON organizations
  FOR UPDATE USING (id = auth.organization_id() AND auth.user_role() = 'owner');

-------------------------------------------------------
-- LOCATIONS
-------------------------------------------------------

CREATE POLICY "locations_select" ON locations
  FOR SELECT USING (organization_id = auth.organization_id());

CREATE POLICY "locations_insert_owner" ON locations
  FOR INSERT WITH CHECK (organization_id = auth.organization_id() AND auth.user_role() = 'owner');

CREATE POLICY "locations_update_owner_manager" ON locations
  FOR UPDATE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "locations_delete_owner" ON locations
  FOR DELETE USING (organization_id = auth.organization_id() AND auth.user_role() = 'owner');

-------------------------------------------------------
-- EMPLOYEES
-------------------------------------------------------

CREATE POLICY "employees_select_org" ON employees
  FOR SELECT USING (
    organization_id = auth.organization_id()
    AND (
      auth.user_role() IN ('owner', 'manager')
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "employees_insert_owner_manager" ON employees
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "employees_update_owner_manager" ON employees
  FOR UPDATE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "employees_delete_owner" ON employees
  FOR DELETE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() = 'owner'
  );

-------------------------------------------------------
-- ROLES
-------------------------------------------------------

CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (organization_id = auth.organization_id());

CREATE POLICY "roles_insert_owner" ON roles
  FOR INSERT WITH CHECK (organization_id = auth.organization_id() AND auth.user_role() = 'owner');

CREATE POLICY "roles_update_owner" ON roles
  FOR UPDATE USING (organization_id = auth.organization_id() AND auth.user_role() = 'owner');

CREATE POLICY "roles_delete_owner" ON roles
  FOR DELETE USING (organization_id = auth.organization_id() AND auth.user_role() = 'owner');

-------------------------------------------------------
-- EMPLOYEE_ROLES
-------------------------------------------------------

CREATE POLICY "employee_roles_select" ON employee_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_roles.employee_id
        AND e.organization_id = auth.organization_id()
    )
  );

CREATE POLICY "employee_roles_insert_owner_manager" ON employee_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_roles.employee_id
        AND e.organization_id = auth.organization_id()
        AND auth.user_role() IN ('owner', 'manager')
    )
  );

CREATE POLICY "employee_roles_delete_owner_manager" ON employee_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_roles.employee_id
        AND e.organization_id = auth.organization_id()
        AND auth.user_role() IN ('owner', 'manager')
    )
  );

-------------------------------------------------------
-- EMPLOYEE_CERTIFICATIONS
-------------------------------------------------------

CREATE POLICY "certs_select" ON employee_certifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_certifications.employee_id
        AND e.organization_id = auth.organization_id()
    )
  );

CREATE POLICY "certs_insert_owner_manager" ON employee_certifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_certifications.employee_id
        AND e.organization_id = auth.organization_id()
        AND auth.user_role() IN ('owner', 'manager')
    )
  );

CREATE POLICY "certs_update_owner_manager" ON employee_certifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_certifications.employee_id
        AND e.organization_id = auth.organization_id()
        AND auth.user_role() IN ('owner', 'manager')
    )
  );

-------------------------------------------------------
-- EMPLOYEE_AVAILABILITY
-------------------------------------------------------

CREATE POLICY "availability_select" ON employee_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_availability.employee_id
        AND e.organization_id = auth.organization_id()
    )
  );

CREATE POLICY "availability_insert" ON employee_availability
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_availability.employee_id
        AND e.organization_id = auth.organization_id()
        AND (auth.user_role() IN ('owner', 'manager') OR e.user_id = auth.uid())
    )
  );

CREATE POLICY "availability_update" ON employee_availability
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_availability.employee_id
        AND e.organization_id = auth.organization_id()
        AND (auth.user_role() IN ('owner', 'manager') OR e.user_id = auth.uid())
    )
  );

-------------------------------------------------------
-- SHIFTS
-------------------------------------------------------

CREATE POLICY "shifts_select" ON shifts
  FOR SELECT USING (organization_id = auth.organization_id());

CREATE POLICY "shifts_insert_owner_manager" ON shifts
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "shifts_update_owner_manager" ON shifts
  FOR UPDATE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "shifts_delete_owner_manager" ON shifts
  FOR DELETE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

-------------------------------------------------------
-- SCHEDULES
-------------------------------------------------------

CREATE POLICY "schedules_select" ON schedules
  FOR SELECT USING (organization_id = auth.organization_id());

CREATE POLICY "schedules_insert_owner_manager" ON schedules
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "schedules_update_owner_manager" ON schedules
  FOR UPDATE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

-------------------------------------------------------
-- CALLOUTS
-------------------------------------------------------

CREATE POLICY "callouts_select" ON callouts
  FOR SELECT USING (organization_id = auth.organization_id());

CREATE POLICY "callouts_insert" ON callouts
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
  );

CREATE POLICY "callouts_update_owner_manager" ON callouts
  FOR UPDATE USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

-------------------------------------------------------
-- SMS_CONVERSATIONS
-------------------------------------------------------

CREATE POLICY "sms_select_owner_manager" ON sms_conversations
  FOR SELECT USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('owner', 'manager')
  );

CREATE POLICY "sms_insert" ON sms_conversations
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
  );
