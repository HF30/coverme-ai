-- CoverMe.ai — Seed Data for Wingporium
-- Run after migrations. Requires a user in auth.users to act as owner.
-- For local dev, create a user first via Supabase dashboard or auth API.

-- Use fixed UUIDs for reproducibility
-- Owner user_id should be set to the actual auth.users id after signup

DO $$
DECLARE
  v_org_id uuid := 'a1b2c3d4-0001-4000-8000-000000000001';
  v_owner_id uuid := '00000000-0000-0000-0000-000000000000'; -- Replace with real auth.users id

  -- Location IDs
  v_loc_etobicoke uuid := 'b1b2c3d4-0001-4000-8000-000000000001';
  v_loc_portcredit uuid := 'b1b2c3d4-0002-4000-8000-000000000002';
  v_loc_hamilton uuid := 'b1b2c3d4-0003-4000-8000-000000000003';
  v_loc_scarborough uuid := 'b1b2c3d4-0004-4000-8000-000000000004';
  v_loc_brampton uuid := 'b1b2c3d4-0005-4000-8000-000000000005';
  v_loc_oakville uuid := 'b1b2c3d4-0006-4000-8000-000000000006';

  -- Role IDs
  v_role_cook uuid := 'c1b2c3d4-0001-4000-8000-000000000001';
  v_role_server uuid := 'c1b2c3d4-0002-4000-8000-000000000002';
  v_role_bartender uuid := 'c1b2c3d4-0003-4000-8000-000000000003';
  v_role_manager uuid := 'c1b2c3d4-0004-4000-8000-000000000004';

  -- Employee IDs (20 employees)
  v_emp uuid[];

  -- Shift date helpers
  v_monday date := date_trunc('week', CURRENT_DATE + interval '7 days')::date; -- Next Monday
BEGIN

  -- Organization
  INSERT INTO organizations (id, name, slug, owner_id, settings)
  VALUES (
    v_org_id,
    'Wingporium',
    'wingporium',
    v_owner_id,
    '{"timezone": "America/Toronto", "default_shift_length_hours": 8}'::jsonb
  );

  -- Locations (6 GTA locations)
  INSERT INTO locations (id, organization_id, name, address, timezone, lat, lng) VALUES
    (v_loc_etobicoke, v_org_id, 'Wingporium Etobicoke', '123 The Queensway, Etobicoke, ON M8Y 1H8', 'America/Toronto', 43.6205, -79.5132),
    (v_loc_portcredit, v_org_id, 'Wingporium Port Credit', '45 Lakeshore Rd E, Mississauga, ON L5G 1C9', 'America/Toronto', 43.5507, -79.5847),
    (v_loc_hamilton, v_org_id, 'Wingporium Hamilton', '200 James St N, Hamilton, ON L8R 2L1', 'America/Toronto', 43.2610, -79.8681),
    (v_loc_scarborough, v_org_id, 'Wingporium Scarborough', '300 Borough Dr, Scarborough, ON M1P 4P5', 'America/Toronto', 43.7731, -79.2578),
    (v_loc_brampton, v_org_id, 'Wingporium Brampton', '50 Queen St E, Brampton, ON L6V 1A3', 'America/Toronto', 43.6834, -79.7593),
    (v_loc_oakville, v_org_id, 'Wingporium Oakville', '170 Lakeshore Rd E, Oakville, ON L6J 1H6', 'America/Toronto', 43.4480, -79.6688);

  -- Roles
  INSERT INTO roles (id, organization_id, name, requires_smart_serve, requires_food_handler) VALUES
    (v_role_cook, v_org_id, 'Cook', false, true),
    (v_role_server, v_org_id, 'Server', true, false),
    (v_role_bartender, v_org_id, 'Bartender', true, false),
    (v_role_manager, v_org_id, 'Manager', true, true);

  -- Generate 20 employee UUIDs
  v_emp := ARRAY[
    'e1b2c3d4-0001-4000-8000-000000000001'::uuid,
    'e1b2c3d4-0002-4000-8000-000000000002'::uuid,
    'e1b2c3d4-0003-4000-8000-000000000003'::uuid,
    'e1b2c3d4-0004-4000-8000-000000000004'::uuid,
    'e1b2c3d4-0005-4000-8000-000000000005'::uuid,
    'e1b2c3d4-0006-4000-8000-000000000006'::uuid,
    'e1b2c3d4-0007-4000-8000-000000000007'::uuid,
    'e1b2c3d4-0008-4000-8000-000000000008'::uuid,
    'e1b2c3d4-0009-4000-8000-000000000009'::uuid,
    'e1b2c3d4-0010-4000-8000-000000000010'::uuid,
    'e1b2c3d4-0011-4000-8000-000000000011'::uuid,
    'e1b2c3d4-0012-4000-8000-000000000012'::uuid,
    'e1b2c3d4-0013-4000-8000-000000000013'::uuid,
    'e1b2c3d4-0014-4000-8000-000000000014'::uuid,
    'e1b2c3d4-0015-4000-8000-000000000015'::uuid,
    'e1b2c3d4-0016-4000-8000-000000000016'::uuid,
    'e1b2c3d4-0017-4000-8000-000000000017'::uuid,
    'e1b2c3d4-0018-4000-8000-000000000018'::uuid,
    'e1b2c3d4-0019-4000-8000-000000000019'::uuid,
    'e1b2c3d4-0020-4000-8000-000000000020'::uuid
  ];

  -- Employees (20 across 6 locations, mix of can_float)
  INSERT INTO employees (id, organization_id, first_name, last_name, phone, email, primary_location_id, can_float, hourly_rate) VALUES
    -- Etobicoke (4 employees)
    (v_emp[1],  v_org_id, 'Marcus', 'Chen',      '+14165551001', 'marcus@wingporium.com',  v_loc_etobicoke, true,  18.50),
    (v_emp[2],  v_org_id, 'Sarah',  'Williams',  '+14165551002', 'sarah@wingporium.com',   v_loc_etobicoke, true,  17.00),
    (v_emp[3],  v_org_id, 'David',  'Nguyen',    '+14165551003', NULL,                     v_loc_etobicoke, false, 19.00),
    (v_emp[4],  v_org_id, 'Lisa',   'Patel',     '+14165551004', 'lisa@wingporium.com',    v_loc_etobicoke, true,  22.00),
    -- Port Credit (3 employees)
    (v_emp[5],  v_org_id, 'James',  'Morrison',  '+14165552001', NULL,                     v_loc_portcredit, true,  17.50),
    (v_emp[6],  v_org_id, 'Emily',  'Brown',     '+14165552002', 'emily@wingporium.com',   v_loc_portcredit, true,  18.00),
    (v_emp[7],  v_org_id, 'Ahmed',  'Hassan',    '+14165552003', NULL,                     v_loc_portcredit, false, 17.00),
    -- Hamilton (3 employees)
    (v_emp[8],  v_org_id, 'Katie',  'MacLeod',   '+19055553001', 'katie@wingporium.com',   v_loc_hamilton, true,  17.50),
    (v_emp[9],  v_org_id, 'Mike',   'Santos',    '+19055553002', NULL,                     v_loc_hamilton, false, 19.50),
    (v_emp[10], v_org_id, 'Priya',  'Sharma',    '+19055553003', 'priya@wingporium.com',   v_loc_hamilton, true,  18.00),
    -- Scarborough (4 employees)
    (v_emp[11], v_org_id, 'Tyler',  'Jackson',   '+14165554001', NULL,                     v_loc_scarborough, true,  17.00),
    (v_emp[12], v_org_id, 'Nina',   'Volkov',    '+14165554002', 'nina@wingporium.com',    v_loc_scarborough, true,  18.50),
    (v_emp[13], v_org_id, 'Ryan',   'Kim',       '+14165554003', NULL,                     v_loc_scarborough, false, 20.00),
    (v_emp[14], v_org_id, 'Aisha',  'Mohammed',  '+14165554004', NULL,                     v_loc_scarborough, true,  17.50),
    -- Brampton (3 employees)
    (v_emp[15], v_org_id, 'Jordan', 'Taylor',    '+14165555001', 'jordan@wingporium.com',  v_loc_brampton, true,  17.00),
    (v_emp[16], v_org_id, 'Maria',  'Garcia',    '+14165555002', NULL,                     v_loc_brampton, true,  18.00),
    (v_emp[17], v_org_id, 'Kevin',  'Lee',       '+14165555003', NULL,                     v_loc_brampton, false, 19.00),
    -- Oakville (3 employees)
    (v_emp[18], v_org_id, 'Sophie', 'Martin',    '+19055556001', 'sophie@wingporium.com',  v_loc_oakville, true,  17.50),
    (v_emp[19], v_org_id, 'Derek',  'White',     '+19055556002', NULL,                     v_loc_oakville, true,  18.50),
    (v_emp[20], v_org_id, 'Zara',   'Ali',       '+19055556003', NULL,                     v_loc_oakville, false, 17.00);

  -- Employee Roles (assign roles at their primary locations)
  INSERT INTO employee_roles (employee_id, role_id, location_id) VALUES
    -- Etobicoke
    (v_emp[1],  v_role_cook, v_loc_etobicoke),
    (v_emp[2],  v_role_server, v_loc_etobicoke),
    (v_emp[3],  v_role_cook, v_loc_etobicoke),
    (v_emp[4],  v_role_manager, v_loc_etobicoke),
    (v_emp[1],  v_role_cook, v_loc_portcredit),     -- Marcus can also cook at Port Credit
    -- Port Credit
    (v_emp[5],  v_role_server, v_loc_portcredit),
    (v_emp[6],  v_role_bartender, v_loc_portcredit),
    (v_emp[7],  v_role_cook, v_loc_portcredit),
    -- Hamilton
    (v_emp[8],  v_role_server, v_loc_hamilton),
    (v_emp[9],  v_role_cook, v_loc_hamilton),
    (v_emp[10], v_role_bartender, v_loc_hamilton),
    -- Scarborough
    (v_emp[11], v_role_server, v_loc_scarborough),
    (v_emp[12], v_role_bartender, v_loc_scarborough),
    (v_emp[13], v_role_manager, v_loc_scarborough),
    (v_emp[14], v_role_cook, v_loc_scarborough),
    -- Brampton
    (v_emp[15], v_role_server, v_loc_brampton),
    (v_emp[16], v_role_cook, v_loc_brampton),
    (v_emp[17], v_role_bartender, v_loc_brampton),
    -- Oakville
    (v_emp[18], v_role_server, v_loc_oakville),
    (v_emp[19], v_role_cook, v_loc_oakville),
    (v_emp[20], v_role_server, v_loc_oakville);

  -- Certifications (Smart Serve for bartenders and managers)
  INSERT INTO employee_certifications (employee_id, cert_type, cert_number, issued_at, expires_at, is_verified) VALUES
    (v_emp[6],  'smart_serve', 'SS-2024-11234', '2024-06-15', '2029-06-15', true),
    (v_emp[10], 'smart_serve', 'SS-2024-11235', '2024-08-20', '2029-08-20', true),
    (v_emp[12], 'smart_serve', 'SS-2023-09876', '2023-11-01', '2028-11-01', true),
    (v_emp[17], 'smart_serve', 'SS-2025-22345', '2025-01-10', '2030-01-10', true),
    (v_emp[4],  'smart_serve', 'SS-2023-08765', '2023-05-01', '2028-05-01', true),
    (v_emp[13], 'smart_serve', 'SS-2024-13456', '2024-03-15', '2029-03-15', true),
    -- Food handler certs for cooks and managers
    (v_emp[1],  'food_handler', 'FH-2024-5001', '2024-04-01', '2029-04-01', true),
    (v_emp[3],  'food_handler', 'FH-2024-5002', '2024-07-15', '2029-07-15', true),
    (v_emp[7],  'food_handler', 'FH-2025-5003', '2025-01-20', '2030-01-20', true),
    (v_emp[9],  'food_handler', 'FH-2024-5004', '2024-09-01', '2029-09-01', true),
    (v_emp[4],  'food_handler', 'FH-2023-5005', '2023-06-01', '2028-06-01', true),
    (v_emp[13], 'food_handler', 'FH-2024-5006', '2024-02-01', '2029-02-01', true);

  -- Employee Availability (typical restaurant patterns)
  -- Most employees available evenings and weekends
  INSERT INTO employee_availability (employee_id, day_of_week, start_time, end_time, is_available, effective_from) VALUES
    -- Marcus: available Mon-Sat, not Sunday
    (v_emp[1], 1, '10:00', '22:00', true, '2026-01-01'),
    (v_emp[1], 2, '10:00', '22:00', true, '2026-01-01'),
    (v_emp[1], 3, '10:00', '22:00', true, '2026-01-01'),
    (v_emp[1], 4, '10:00', '22:00', true, '2026-01-01'),
    (v_emp[1], 5, '10:00', '23:00', true, '2026-01-01'),
    (v_emp[1], 6, '10:00', '23:00', true, '2026-01-01'),
    -- Sarah: available Wed-Sun (student, off Mon/Tue)
    (v_emp[2], 3, '16:00', '23:00', true, '2026-01-01'),
    (v_emp[2], 4, '16:00', '23:00', true, '2026-01-01'),
    (v_emp[2], 5, '16:00', '00:00', true, '2026-01-01'),
    (v_emp[2], 6, '11:00', '23:00', true, '2026-01-01'),
    (v_emp[2], 0, '11:00', '20:00', true, '2026-01-01'),
    -- Emily: full availability
    (v_emp[6], 0, '11:00', '23:00', true, '2026-01-01'),
    (v_emp[6], 1, '11:00', '23:00', true, '2026-01-01'),
    (v_emp[6], 2, '11:00', '23:00', true, '2026-01-01'),
    (v_emp[6], 3, '11:00', '23:00', true, '2026-01-01'),
    (v_emp[6], 4, '11:00', '00:00', true, '2026-01-01'),
    (v_emp[6], 5, '11:00', '00:00', true, '2026-01-01'),
    (v_emp[6], 6, '11:00', '00:00', true, '2026-01-01');

  -- Sample shifts for next week (Mon-Sun at Etobicoke)
  INSERT INTO shifts (organization_id, location_id, role_id, employee_id, date, start_time, end_time, status) VALUES
    -- Monday
    (v_org_id, v_loc_etobicoke, v_role_cook, v_emp[1], v_monday, (v_monday || ' 10:00:00')::timestamptz AT TIME ZONE 'America/Toronto', (v_monday || ' 18:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_etobicoke, v_role_cook, v_emp[3], v_monday, (v_monday || ' 14:00:00')::timestamptz AT TIME ZONE 'America/Toronto', (v_monday || ' 22:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_etobicoke, v_role_server, v_emp[2], v_monday, (v_monday || ' 16:00:00')::timestamptz AT TIME ZONE 'America/Toronto', (v_monday || ' 23:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_etobicoke, v_role_manager, v_emp[4], v_monday, (v_monday || ' 10:00:00')::timestamptz AT TIME ZONE 'America/Toronto', (v_monday || ' 18:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    -- Tuesday
    (v_org_id, v_loc_etobicoke, v_role_cook, v_emp[1], v_monday + 1, ((v_monday + 1) || ' 10:00:00')::timestamptz AT TIME ZONE 'America/Toronto', ((v_monday + 1) || ' 18:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_etobicoke, v_role_cook, v_emp[3], v_monday + 1, ((v_monday + 1) || ' 14:00:00')::timestamptz AT TIME ZONE 'America/Toronto', ((v_monday + 1) || ' 22:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_etobicoke, v_role_server, NULL, v_monday + 1, ((v_monday + 1) || ' 16:00:00')::timestamptz AT TIME ZONE 'America/Toronto', ((v_monday + 1) || ' 23:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),  -- Open shift!
    -- Wednesday
    (v_org_id, v_loc_etobicoke, v_role_cook, v_emp[1], v_monday + 2, ((v_monday + 2) || ' 10:00:00')::timestamptz AT TIME ZONE 'America/Toronto', ((v_monday + 2) || ' 18:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_etobicoke, v_role_server, v_emp[2], v_monday + 2, ((v_monday + 2) || ' 16:00:00')::timestamptz AT TIME ZONE 'America/Toronto', ((v_monday + 2) || ' 23:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_etobicoke, v_role_bartender, v_emp[6], v_monday + 2, ((v_monday + 2) || ' 17:00:00')::timestamptz AT TIME ZONE 'America/Toronto', ((v_monday + 2) || ' 00:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    -- Port Credit shifts
    (v_org_id, v_loc_portcredit, v_role_cook, v_emp[7], v_monday, (v_monday || ' 10:00:00')::timestamptz AT TIME ZONE 'America/Toronto', (v_monday || ' 18:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_portcredit, v_role_server, v_emp[5], v_monday, (v_monday || ' 11:00:00')::timestamptz AT TIME ZONE 'America/Toronto', (v_monday || ' 19:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled'),
    (v_org_id, v_loc_portcredit, v_role_bartender, v_emp[6], v_monday, (v_monday || ' 17:00:00')::timestamptz AT TIME ZONE 'America/Toronto', (v_monday || ' 00:00:00')::timestamptz AT TIME ZONE 'America/Toronto', 'scheduled');

  -- Mark Tuesday server shift as open
  UPDATE shifts SET is_open = true WHERE employee_id IS NULL;

END $$;
