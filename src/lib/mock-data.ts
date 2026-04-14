// Mock data based on seed.sql — Wingporium, 6 GTA locations, 20 employees
// Used when Supabase is not connected or for development

const ORG_ID = "a1b2c3d4-0001-4000-8000-000000000001";

export const MOCK_LOCATIONS = [
  {
    id: "b1b2c3d4-0001-4000-8000-000000000001",
    organization_id: ORG_ID,
    name: "Wingporium Etobicoke",
    address: "123 The Queensway, Etobicoke, ON M8Y 1H8",
    timezone: "America/Toronto",
    lat: 43.6205,
    lng: -79.5132,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "b1b2c3d4-0002-4000-8000-000000000002",
    organization_id: ORG_ID,
    name: "Wingporium Port Credit",
    address: "45 Lakeshore Rd E, Mississauga, ON L5G 1C9",
    timezone: "America/Toronto",
    lat: 43.5507,
    lng: -79.5847,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "b1b2c3d4-0003-4000-8000-000000000003",
    organization_id: ORG_ID,
    name: "Wingporium Hamilton",
    address: "200 James St N, Hamilton, ON L8R 2L1",
    timezone: "America/Toronto",
    lat: 43.261,
    lng: -79.8681,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "b1b2c3d4-0004-4000-8000-000000000004",
    organization_id: ORG_ID,
    name: "Wingporium Scarborough",
    address: "300 Borough Dr, Scarborough, ON M1P 4P5",
    timezone: "America/Toronto",
    lat: 43.7731,
    lng: -79.2578,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "b1b2c3d4-0005-4000-8000-000000000005",
    organization_id: ORG_ID,
    name: "Wingporium Brampton",
    address: "50 Queen St E, Brampton, ON L6V 1A3",
    timezone: "America/Toronto",
    lat: 43.6834,
    lng: -79.7593,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "b1b2c3d4-0006-4000-8000-000000000006",
    organization_id: ORG_ID,
    name: "Wingporium Oakville",
    address: "170 Lakeshore Rd E, Oakville, ON L6J 1H6",
    timezone: "America/Toronto",
    lat: 43.448,
    lng: -79.6688,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

export const MOCK_ROLES = [
  {
    id: "c1b2c3d4-0001-4000-8000-000000000001",
    organization_id: ORG_ID,
    name: "Cook",
    requires_smart_serve: false,
    requires_food_handler: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c1b2c3d4-0002-4000-8000-000000000002",
    organization_id: ORG_ID,
    name: "Server",
    requires_smart_serve: true,
    requires_food_handler: false,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c1b2c3d4-0003-4000-8000-000000000003",
    organization_id: ORG_ID,
    name: "Bartender",
    requires_smart_serve: true,
    requires_food_handler: false,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c1b2c3d4-0004-4000-8000-000000000004",
    organization_id: ORG_ID,
    name: "Manager",
    requires_smart_serve: true,
    requires_food_handler: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const MOCK_EMPLOYEES = [
  { id: "e1b2c3d4-0001-4000-8000-000000000001", organization_id: ORG_ID, user_id: null, first_name: "Marcus", last_name: "Chen", phone: "+14165551001", email: "marcus@wingporium.com", primary_location_id: "b1b2c3d4-0001-4000-8000-000000000001", can_float: true, hourly_rate: 18.5, max_hours_per_week: 40, reliability_score: 92, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0002-4000-8000-000000000002", organization_id: ORG_ID, user_id: null, first_name: "Sarah", last_name: "Williams", phone: "+14165551002", email: "sarah@wingporium.com", primary_location_id: "b1b2c3d4-0001-4000-8000-000000000001", can_float: true, hourly_rate: 17.0, max_hours_per_week: 30, reliability_score: 88, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0003-4000-8000-000000000003", organization_id: ORG_ID, user_id: null, first_name: "David", last_name: "Nguyen", phone: "+14165551003", email: null, primary_location_id: "b1b2c3d4-0001-4000-8000-000000000001", can_float: false, hourly_rate: 19.0, max_hours_per_week: 40, reliability_score: 95, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0004-4000-8000-000000000004", organization_id: ORG_ID, user_id: null, first_name: "Lisa", last_name: "Patel", phone: "+14165551004", email: "lisa@wingporium.com", primary_location_id: "b1b2c3d4-0001-4000-8000-000000000001", can_float: true, hourly_rate: 22.0, max_hours_per_week: 40, reliability_score: 97, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0005-4000-8000-000000000005", organization_id: ORG_ID, user_id: null, first_name: "James", last_name: "Morrison", phone: "+14165552001", email: null, primary_location_id: "b1b2c3d4-0002-4000-8000-000000000002", can_float: true, hourly_rate: 17.5, max_hours_per_week: 40, reliability_score: 85, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0006-4000-8000-000000000006", organization_id: ORG_ID, user_id: null, first_name: "Emily", last_name: "Brown", phone: "+14165552002", email: "emily@wingporium.com", primary_location_id: "b1b2c3d4-0002-4000-8000-000000000002", can_float: true, hourly_rate: 18.0, max_hours_per_week: 40, reliability_score: 91, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0007-4000-8000-000000000007", organization_id: ORG_ID, user_id: null, first_name: "Ahmed", last_name: "Hassan", phone: "+14165552003", email: null, primary_location_id: "b1b2c3d4-0002-4000-8000-000000000002", can_float: false, hourly_rate: 17.0, max_hours_per_week: 40, reliability_score: 78, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0008-4000-8000-000000000008", organization_id: ORG_ID, user_id: null, first_name: "Katie", last_name: "MacLeod", phone: "+19055553001", email: "katie@wingporium.com", primary_location_id: "b1b2c3d4-0003-4000-8000-000000000003", can_float: true, hourly_rate: 17.5, max_hours_per_week: 40, reliability_score: 90, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0009-4000-8000-000000000009", organization_id: ORG_ID, user_id: null, first_name: "Mike", last_name: "Santos", phone: "+19055553002", email: null, primary_location_id: "b1b2c3d4-0003-4000-8000-000000000003", can_float: false, hourly_rate: 19.5, max_hours_per_week: 40, reliability_score: 82, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0010-4000-8000-000000000010", organization_id: ORG_ID, user_id: null, first_name: "Priya", last_name: "Sharma", phone: "+19055553003", email: "priya@wingporium.com", primary_location_id: "b1b2c3d4-0003-4000-8000-000000000003", can_float: true, hourly_rate: 18.0, max_hours_per_week: 40, reliability_score: 94, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0011-4000-8000-000000000011", organization_id: ORG_ID, user_id: null, first_name: "Tyler", last_name: "Jackson", phone: "+14165554001", email: null, primary_location_id: "b1b2c3d4-0004-4000-8000-000000000004", can_float: true, hourly_rate: 17.0, max_hours_per_week: 40, reliability_score: 86, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0012-4000-8000-000000000012", organization_id: ORG_ID, user_id: null, first_name: "Nina", last_name: "Volkov", phone: "+14165554002", email: "nina@wingporium.com", primary_location_id: "b1b2c3d4-0004-4000-8000-000000000004", can_float: true, hourly_rate: 18.5, max_hours_per_week: 40, reliability_score: 93, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0013-4000-8000-000000000013", organization_id: ORG_ID, user_id: null, first_name: "Ryan", last_name: "Kim", phone: "+14165554003", email: null, primary_location_id: "b1b2c3d4-0004-4000-8000-000000000004", can_float: false, hourly_rate: 20.0, max_hours_per_week: 40, reliability_score: 96, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0014-4000-8000-000000000014", organization_id: ORG_ID, user_id: null, first_name: "Aisha", last_name: "Mohammed", phone: "+14165554004", email: null, primary_location_id: "b1b2c3d4-0004-4000-8000-000000000004", can_float: true, hourly_rate: 17.5, max_hours_per_week: 40, reliability_score: 87, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0015-4000-8000-000000000015", organization_id: ORG_ID, user_id: null, first_name: "Jordan", last_name: "Taylor", phone: "+14165555001", email: "jordan@wingporium.com", primary_location_id: "b1b2c3d4-0005-4000-8000-000000000005", can_float: true, hourly_rate: 17.0, max_hours_per_week: 40, reliability_score: 84, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0016-4000-8000-000000000016", organization_id: ORG_ID, user_id: null, first_name: "Maria", last_name: "Garcia", phone: "+14165555002", email: null, primary_location_id: "b1b2c3d4-0005-4000-8000-000000000005", can_float: true, hourly_rate: 18.0, max_hours_per_week: 40, reliability_score: 89, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0017-4000-8000-000000000017", organization_id: ORG_ID, user_id: null, first_name: "Kevin", last_name: "Lee", phone: "+14165555003", email: null, primary_location_id: "b1b2c3d4-0005-4000-8000-000000000005", can_float: false, hourly_rate: 19.0, max_hours_per_week: 40, reliability_score: 91, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0018-4000-8000-000000000018", organization_id: ORG_ID, user_id: null, first_name: "Sophie", last_name: "Martin", phone: "+19055556001", email: "sophie@wingporium.com", primary_location_id: "b1b2c3d4-0006-4000-8000-000000000006", can_float: true, hourly_rate: 17.5, max_hours_per_week: 40, reliability_score: 88, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0019-4000-8000-000000000019", organization_id: ORG_ID, user_id: null, first_name: "Derek", last_name: "White", phone: "+19055556002", email: null, primary_location_id: "b1b2c3d4-0006-4000-8000-000000000006", can_float: true, hourly_rate: 18.5, max_hours_per_week: 40, reliability_score: 80, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "e1b2c3d4-0020-4000-8000-000000000020", organization_id: ORG_ID, user_id: null, first_name: "Zara", last_name: "Ali", phone: "+19055556003", email: null, primary_location_id: "b1b2c3d4-0006-4000-8000-000000000006", can_float: false, hourly_rate: 17.0, max_hours_per_week: 40, reliability_score: 83, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

// Role assignments (employee -> role -> location)
export const MOCK_EMPLOYEE_ROLES = [
  { employee_id: "e1b2c3d4-0001-4000-8000-000000000001", role_id: "c1b2c3d4-0001-4000-8000-000000000001", location_id: "b1b2c3d4-0001-4000-8000-000000000001" },
  { employee_id: "e1b2c3d4-0002-4000-8000-000000000002", role_id: "c1b2c3d4-0002-4000-8000-000000000002", location_id: "b1b2c3d4-0001-4000-8000-000000000001" },
  { employee_id: "e1b2c3d4-0003-4000-8000-000000000003", role_id: "c1b2c3d4-0001-4000-8000-000000000001", location_id: "b1b2c3d4-0001-4000-8000-000000000001" },
  { employee_id: "e1b2c3d4-0004-4000-8000-000000000004", role_id: "c1b2c3d4-0004-4000-8000-000000000004", location_id: "b1b2c3d4-0001-4000-8000-000000000001" },
  { employee_id: "e1b2c3d4-0001-4000-8000-000000000001", role_id: "c1b2c3d4-0001-4000-8000-000000000001", location_id: "b1b2c3d4-0002-4000-8000-000000000002" },
  { employee_id: "e1b2c3d4-0005-4000-8000-000000000005", role_id: "c1b2c3d4-0002-4000-8000-000000000002", location_id: "b1b2c3d4-0002-4000-8000-000000000002" },
  { employee_id: "e1b2c3d4-0006-4000-8000-000000000006", role_id: "c1b2c3d4-0003-4000-8000-000000000003", location_id: "b1b2c3d4-0002-4000-8000-000000000002" },
  { employee_id: "e1b2c3d4-0007-4000-8000-000000000007", role_id: "c1b2c3d4-0001-4000-8000-000000000001", location_id: "b1b2c3d4-0002-4000-8000-000000000002" },
  { employee_id: "e1b2c3d4-0008-4000-8000-000000000008", role_id: "c1b2c3d4-0002-4000-8000-000000000002", location_id: "b1b2c3d4-0003-4000-8000-000000000003" },
  { employee_id: "e1b2c3d4-0009-4000-8000-000000000009", role_id: "c1b2c3d4-0001-4000-8000-000000000001", location_id: "b1b2c3d4-0003-4000-8000-000000000003" },
  { employee_id: "e1b2c3d4-0010-4000-8000-000000000010", role_id: "c1b2c3d4-0003-4000-8000-000000000003", location_id: "b1b2c3d4-0003-4000-8000-000000000003" },
  { employee_id: "e1b2c3d4-0011-4000-8000-000000000011", role_id: "c1b2c3d4-0002-4000-8000-000000000002", location_id: "b1b2c3d4-0004-4000-8000-000000000004" },
  { employee_id: "e1b2c3d4-0012-4000-8000-000000000012", role_id: "c1b2c3d4-0003-4000-8000-000000000003", location_id: "b1b2c3d4-0004-4000-8000-000000000004" },
  { employee_id: "e1b2c3d4-0013-4000-8000-000000000013", role_id: "c1b2c3d4-0004-4000-8000-000000000004", location_id: "b1b2c3d4-0004-4000-8000-000000000004" },
  { employee_id: "e1b2c3d4-0014-4000-8000-000000000014", role_id: "c1b2c3d4-0001-4000-8000-000000000001", location_id: "b1b2c3d4-0004-4000-8000-000000000004" },
  { employee_id: "e1b2c3d4-0015-4000-8000-000000000015", role_id: "c1b2c3d4-0002-4000-8000-000000000002", location_id: "b1b2c3d4-0005-4000-8000-000000000005" },
  { employee_id: "e1b2c3d4-0016-4000-8000-000000000016", role_id: "c1b2c3d4-0001-4000-8000-000000000001", location_id: "b1b2c3d4-0005-4000-8000-000000000005" },
  { employee_id: "e1b2c3d4-0017-4000-8000-000000000017", role_id: "c1b2c3d4-0003-4000-8000-000000000003", location_id: "b1b2c3d4-0005-4000-8000-000000000005" },
  { employee_id: "e1b2c3d4-0018-4000-8000-000000000018", role_id: "c1b2c3d4-0002-4000-8000-000000000002", location_id: "b1b2c3d4-0006-4000-8000-000000000006" },
  { employee_id: "e1b2c3d4-0019-4000-8000-000000000019", role_id: "c1b2c3d4-0001-4000-8000-000000000001", location_id: "b1b2c3d4-0006-4000-8000-000000000006" },
  { employee_id: "e1b2c3d4-0020-4000-8000-000000000020", role_id: "c1b2c3d4-0002-4000-8000-000000000002", location_id: "b1b2c3d4-0006-4000-8000-000000000006" },
];

export interface MockShift {
  id: string;
  organization_id: string;
  location_id: string;
  role_id: string;
  employee_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  is_open: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to get dates for this week
function getWeekDates(): string[] {
  const today = new Date();
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function generateShiftsForLocation(
  locationId: string,
  employeeIds: string[],
  roleIds: string[],
): MockShift[] {
  const week = getWeekDates();
  const shifts: MockShift[] = [];
  let shiftIndex = 0;

  for (const date of week) {
    // Morning cook
    shifts.push({
      id: `shift-${locationId.slice(-4)}-${shiftIndex++}`,
      organization_id: ORG_ID,
      location_id: locationId,
      role_id: roleIds[0],
      employee_id: employeeIds[0] ?? null,
      date,
      start_time: `${date}T14:00:00Z`,
      end_time: `${date}T22:00:00Z`,
      status: "scheduled",
      is_open: !employeeIds[0],
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    // Evening server
    shifts.push({
      id: `shift-${locationId.slice(-4)}-${shiftIndex++}`,
      organization_id: ORG_ID,
      location_id: locationId,
      role_id: roleIds[1] ?? roleIds[0],
      employee_id: employeeIds[1] ?? null,
      date,
      start_time: `${date}T20:00:00Z`,
      end_time: `${date}T03:00:00Z`,
      status: "scheduled",
      is_open: !employeeIds[1],
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    // Third shift (bartender/manager) — some days only
    if (shiftIndex % 3 !== 0 && employeeIds[2]) {
      shifts.push({
        id: `shift-${locationId.slice(-4)}-${shiftIndex++}`,
        organization_id: ORG_ID,
        location_id: locationId,
        role_id: roleIds[2] ?? roleIds[0],
        employee_id: employeeIds[2],
        date,
        start_time: `${date}T21:00:00Z`,
        end_time: `${date}T04:00:00Z`,
        status: "scheduled",
        is_open: false,
        notes: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      });
    }
  }

  // Make a couple shifts open (coverage gaps)
  if (shifts.length > 3) {
    shifts[3].employee_id = null;
    shifts[3].is_open = true;
  }

  return shifts;
}

export const MOCK_SHIFTS: MockShift[] = [
  ...generateShiftsForLocation(
    "b1b2c3d4-0001-4000-8000-000000000001",
    ["e1b2c3d4-0001-4000-8000-000000000001", "e1b2c3d4-0002-4000-8000-000000000002", "e1b2c3d4-0004-4000-8000-000000000004"],
    ["c1b2c3d4-0001-4000-8000-000000000001", "c1b2c3d4-0002-4000-8000-000000000002", "c1b2c3d4-0004-4000-8000-000000000004"],
  ),
  ...generateShiftsForLocation(
    "b1b2c3d4-0002-4000-8000-000000000002",
    ["e1b2c3d4-0007-4000-8000-000000000007", "e1b2c3d4-0005-4000-8000-000000000005", "e1b2c3d4-0006-4000-8000-000000000006"],
    ["c1b2c3d4-0001-4000-8000-000000000001", "c1b2c3d4-0002-4000-8000-000000000002", "c1b2c3d4-0003-4000-8000-000000000003"],
  ),
  ...generateShiftsForLocation(
    "b1b2c3d4-0003-4000-8000-000000000003",
    ["e1b2c3d4-0009-4000-8000-000000000009", "e1b2c3d4-0008-4000-8000-000000000008", "e1b2c3d4-0010-4000-8000-000000000010"],
    ["c1b2c3d4-0001-4000-8000-000000000001", "c1b2c3d4-0002-4000-8000-000000000002", "c1b2c3d4-0003-4000-8000-000000000003"],
  ),
  ...generateShiftsForLocation(
    "b1b2c3d4-0004-4000-8000-000000000004",
    ["e1b2c3d4-0014-4000-8000-000000000014", "e1b2c3d4-0011-4000-8000-000000000011", "e1b2c3d4-0012-4000-8000-000000000012"],
    ["c1b2c3d4-0001-4000-8000-000000000001", "c1b2c3d4-0002-4000-8000-000000000002", "c1b2c3d4-0003-4000-8000-000000000003"],
  ),
  ...generateShiftsForLocation(
    "b1b2c3d4-0005-4000-8000-000000000005",
    ["e1b2c3d4-0016-4000-8000-000000000016", "e1b2c3d4-0015-4000-8000-000000000015", "e1b2c3d4-0017-4000-8000-000000000017"],
    ["c1b2c3d4-0001-4000-8000-000000000001", "c1b2c3d4-0002-4000-8000-000000000002", "c1b2c3d4-0003-4000-8000-000000000003"],
  ),
  ...generateShiftsForLocation(
    "b1b2c3d4-0006-4000-8000-000000000006",
    ["e1b2c3d4-0019-4000-8000-000000000019", "e1b2c3d4-0018-4000-8000-000000000018", "e1b2c3d4-0020-4000-8000-000000000020"],
    ["c1b2c3d4-0001-4000-8000-000000000001", "c1b2c3d4-0002-4000-8000-000000000002", "c1b2c3d4-0002-4000-8000-000000000002"],
  ),
];

const week = getWeekDates();

export const MOCK_CALLOUTS = [
  {
    id: "callout-001",
    organization_id: ORG_ID,
    shift_id: MOCK_SHIFTS[0]?.id ?? "shift-0001-0",
    employee_id: "e1b2c3d4-0001-4000-8000-000000000001",
    reason: "Sick - stomach flu",
    reported_at: `${week[0]}T12:00:00Z`,
    status: "filled",
    filled_by_employee_id: "e1b2c3d4-0003-4000-8000-000000000003",
    filled_at: `${week[0]}T12:45:00Z`,
    escalated_at: null,
    resolution_time_seconds: 2700,
    created_at: `${week[0]}T12:00:00Z`,
  },
  {
    id: "callout-002",
    organization_id: ORG_ID,
    shift_id: MOCK_SHIFTS[5]?.id ?? "shift-0001-5",
    employee_id: "e1b2c3d4-0005-4000-8000-000000000005",
    reason: "Car broke down",
    reported_at: `${week[1]}T18:00:00Z`,
    status: "escalated",
    filled_by_employee_id: null,
    filled_at: null,
    escalated_at: `${week[1]}T19:00:00Z`,
    resolution_time_seconds: null,
    created_at: `${week[1]}T18:00:00Z`,
  },
  {
    id: "callout-003",
    organization_id: ORG_ID,
    shift_id: MOCK_SHIFTS[8]?.id ?? "shift-0001-8",
    employee_id: "e1b2c3d4-0011-4000-8000-000000000011",
    reason: "Family emergency",
    reported_at: `${week[2]}T10:00:00Z`,
    status: "pending",
    filled_by_employee_id: null,
    filled_at: null,
    escalated_at: null,
    resolution_time_seconds: null,
    created_at: `${week[2]}T10:00:00Z`,
  },
];

export const MOCK_APPROVALS = [
  {
    id: "approval-001",
    type: "shift_swap" as const,
    status: "pending" as const,
    requested_at: `${week[0]}T14:00:00Z`,
    from_employee_id: "e1b2c3d4-0002-4000-8000-000000000002",
    to_employee_id: "e1b2c3d4-0005-4000-8000-000000000005",
    shift_id: MOCK_SHIFTS[2]?.id ?? "shift-0001-2",
    notes: "Sarah wants to swap Wednesday server shift with James",
  },
  {
    id: "approval-002",
    type: "time_off" as const,
    status: "pending" as const,
    requested_at: `${week[1]}T09:00:00Z`,
    from_employee_id: "e1b2c3d4-0006-4000-8000-000000000006",
    to_employee_id: null,
    shift_id: null,
    notes: "Emily requesting Friday-Saturday off for wedding",
  },
  {
    id: "approval-003",
    type: "schedule_change" as const,
    status: "approved" as const,
    requested_at: `${week[0]}T11:00:00Z`,
    from_employee_id: "e1b2c3d4-0008-4000-8000-000000000008",
    to_employee_id: null,
    shift_id: MOCK_SHIFTS[10]?.id ?? "shift-0003-0",
    notes: "Katie moved from evening to morning shift on Thursday",
  },
  {
    id: "approval-004",
    type: "shift_swap" as const,
    status: "denied" as const,
    requested_at: `${week[0]}T08:00:00Z`,
    from_employee_id: "e1b2c3d4-0015-4000-8000-000000000015",
    to_employee_id: "e1b2c3d4-0017-4000-8000-000000000017",
    shift_id: null,
    notes: "Jordan swap with Kevin denied - Kevin not certified for server role",
  },
];

export const MOCK_CERTIFICATIONS = [
  // Valid certs
  { id: "cert-001", employee_id: "e1b2c3d4-0006-4000-8000-000000000006", cert_type: "smart_serve", cert_number: "SS-2024-11234", issued_at: "2024-06-15", expires_at: "2029-06-15", is_verified: true, created_at: "2024-06-15T00:00:00Z" },
  { id: "cert-002", employee_id: "e1b2c3d4-0010-4000-8000-000000000010", cert_type: "smart_serve", cert_number: "SS-2024-11235", issued_at: "2024-08-20", expires_at: "2029-08-20", is_verified: true, created_at: "2024-08-20T00:00:00Z" },
  { id: "cert-003", employee_id: "e1b2c3d4-0012-4000-8000-000000000012", cert_type: "smart_serve", cert_number: "SS-2023-09876", issued_at: "2023-11-01", expires_at: "2028-11-01", is_verified: true, created_at: "2023-11-01T00:00:00Z" },
  { id: "cert-004", employee_id: "e1b2c3d4-0017-4000-8000-000000000017", cert_type: "smart_serve", cert_number: "SS-2025-22345", issued_at: "2025-01-10", expires_at: "2030-01-10", is_verified: true, created_at: "2025-01-10T00:00:00Z" },
  { id: "cert-005", employee_id: "e1b2c3d4-0004-4000-8000-000000000004", cert_type: "smart_serve", cert_number: "SS-2023-08765", issued_at: "2023-05-01", expires_at: "2028-05-01", is_verified: true, created_at: "2023-05-01T00:00:00Z" },
  { id: "cert-006", employee_id: "e1b2c3d4-0013-4000-8000-000000000013", cert_type: "smart_serve", cert_number: "SS-2024-13456", issued_at: "2024-03-15", expires_at: "2029-03-15", is_verified: true, created_at: "2024-03-15T00:00:00Z" },
  { id: "cert-007", employee_id: "e1b2c3d4-0001-4000-8000-000000000001", cert_type: "food_handler", cert_number: "FH-2024-5001", issued_at: "2024-04-01", expires_at: "2029-04-01", is_verified: true, created_at: "2024-04-01T00:00:00Z" },
  { id: "cert-008", employee_id: "e1b2c3d4-0003-4000-8000-000000000003", cert_type: "food_handler", cert_number: "FH-2024-5002", issued_at: "2024-07-15", expires_at: "2029-07-15", is_verified: true, created_at: "2024-07-15T00:00:00Z" },
  { id: "cert-009", employee_id: "e1b2c3d4-0007-4000-8000-000000000007", cert_type: "food_handler", cert_number: "FH-2025-5003", issued_at: "2025-01-20", expires_at: "2030-01-20", is_verified: true, created_at: "2025-01-20T00:00:00Z" },
  // cert-010 removed — Mike Santos' food_handler is now cert-015 (expired) to trigger violation
  { id: "cert-011", employee_id: "e1b2c3d4-0004-4000-8000-000000000004", cert_type: "food_handler", cert_number: "FH-2023-5005", issued_at: "2023-06-01", expires_at: "2028-06-01", is_verified: true, created_at: "2023-06-01T00:00:00Z" },
  { id: "cert-012", employee_id: "e1b2c3d4-0013-4000-8000-000000000013", cert_type: "food_handler", cert_number: "FH-2024-5006", issued_at: "2024-02-01", expires_at: "2029-02-01", is_verified: true, created_at: "2024-02-01T00:00:00Z" },
  // EXPIRED: Emily Brown (bartender at Port Credit) — Smart Serve expired
  { id: "cert-013", employee_id: "e1b2c3d4-0005-4000-8000-000000000005", cert_type: "smart_serve", cert_number: "SS-2020-99901", issued_at: "2020-03-01", expires_at: "2025-03-01", is_verified: true, created_at: "2020-03-01T00:00:00Z" },
  // EXPIRING SOON: Sophie Martin (server at Oakville) — Smart Serve expires in ~20 days
  { id: "cert-014", employee_id: "e1b2c3d4-0018-4000-8000-000000000018", cert_type: "smart_serve", cert_number: "SS-2021-88801", issued_at: "2021-05-04", expires_at: "2026-05-04", is_verified: true, created_at: "2021-05-04T00:00:00Z" },
  // EXPIRED: Mike Santos (cook at Hamilton) — Food Handler expired
  { id: "cert-015", employee_id: "e1b2c3d4-0009-4000-8000-000000000009", cert_type: "food_handler", cert_number: "FH-2021-5099", issued_at: "2021-01-15", expires_at: "2026-01-15", is_verified: true, created_at: "2021-01-15T00:00:00Z" },
];

// --- Phase 7: Compliance-triggering shifts ---
// These add clopen situations, near-OT employees, etc.

function generateComplianceShifts(): MockShift[] {
  const w = getWeekDates();
  const shifts: MockShift[] = [];

  // CLOPEN: Marcus Chen (Etobicoke cook) — closes at 11pm Monday, opens at 7am Tuesday (8h gap < 11h)
  shifts.push({
    id: "shift-compliance-clopen-1",
    organization_id: ORG_ID,
    location_id: "b1b2c3d4-0001-4000-8000-000000000001",
    role_id: "c1b2c3d4-0001-4000-8000-000000000001",
    employee_id: "e1b2c3d4-0001-4000-8000-000000000001",
    date: w[0],
    start_time: `${w[0]}T23:00:00Z`, // 11pm close shift
    end_time: `${w[1]}T03:00:00Z`,   // ends 3am Tuesday (really next-day)
    status: "scheduled",
    is_open: false,
    notes: "Late close shift",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  });
  shifts.push({
    id: "shift-compliance-clopen-2",
    organization_id: ORG_ID,
    location_id: "b1b2c3d4-0001-4000-8000-000000000001",
    role_id: "c1b2c3d4-0001-4000-8000-000000000001",
    employee_id: "e1b2c3d4-0001-4000-8000-000000000001",
    date: w[1],
    start_time: `${w[1]}T11:00:00Z`, // 7am ET opener (11 UTC)
    end_time: `${w[1]}T19:00:00Z`,   // 3pm ET
    status: "scheduled",
    is_open: false,
    notes: "Early open shift — clopen risk",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  });

  // NEAR-OT: Tyler Jackson (Scarborough server) — scheduled 42h this week (approaching 44)
  // Already has ~21h from main shifts. Add extra to push near 44h.
  shifts.push({
    id: "shift-compliance-ot-1",
    organization_id: ORG_ID,
    location_id: "b1b2c3d4-0004-4000-8000-000000000004",
    role_id: "c1b2c3d4-0002-4000-8000-000000000002",
    employee_id: "e1b2c3d4-0011-4000-8000-000000000011",
    date: w[5],
    start_time: `${w[5]}T14:00:00Z`,
    end_time: `${w[5]}T23:00:00Z`, // 9h shift
    status: "scheduled",
    is_open: false,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  });
  shifts.push({
    id: "shift-compliance-ot-2",
    organization_id: ORG_ID,
    location_id: "b1b2c3d4-0004-4000-8000-000000000004",
    role_id: "c1b2c3d4-0002-4000-8000-000000000002",
    employee_id: "e1b2c3d4-0011-4000-8000-000000000011",
    date: w[6],
    start_time: `${w[6]}T14:00:00Z`,
    end_time: `${w[6]}T23:00:00Z`, // another 9h
    status: "scheduled",
    is_open: false,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  });

  return shifts;
}

// Append compliance test shifts to main shifts array
MOCK_SHIFTS.push(...generateComplianceShifts());

// --- Phase 5: Events & Staffing Suggestions ---

export type EventType = 'nhl' | 'nba' | 'nfl' | 'mlb' | 'ufc' | 'concert' | 'custom';

export interface MockEvent {
  id: string;
  organization_id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  is_playoff: boolean;
  is_ppv: boolean;
  demand_multiplier: number;
  affects_locations: string[] | null;
  source: string;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockStaffingSuggestion {
  id: string;
  organization_id: string;
  event_id: string;
  location_id: string;
  suggested_date: string;
  role_id: string;
  current_headcount: number;
  suggested_headcount: number;
  status: 'pending' | 'approved' | 'adjusted' | 'dismissed';
  approved_by: string | null;
  approved_headcount: number | null;
  notes: string | null;
  created_at: string;
}

function getUpcomingDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getPastDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

const upcomingDates = getUpcomingDates();
const pastDates = getPastDates();

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: "evt-001",
    organization_id: ORG_ID,
    name: "Leafs vs Bruins",
    event_type: "nhl",
    event_date: upcomingDates[1],
    start_time: `${upcomingDates[1]}T23:00:00Z`,
    end_time: null,
    venue: "Scotiabank Arena",
    is_playoff: true,
    is_ppv: false,
    demand_multiplier: 1.8,
    affects_locations: null,
    source: "api",
    external_id: "nhl-2026041501",
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },
  {
    id: "evt-002",
    organization_id: ORG_ID,
    name: "Raptors vs Celtics",
    event_type: "nba",
    event_date: upcomingDates[2],
    start_time: `${upcomingDates[2]}T23:30:00Z`,
    end_time: null,
    venue: "Scotiabank Arena",
    is_playoff: false,
    is_ppv: false,
    demand_multiplier: 1.25,
    affects_locations: null,
    source: "api",
    external_id: "nba-2026041601",
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },
  {
    id: "evt-003",
    organization_id: ORG_ID,
    name: "Leafs @ Canadiens",
    event_type: "nhl",
    event_date: upcomingDates[4],
    start_time: `${upcomingDates[4]}T23:00:00Z`,
    end_time: null,
    venue: "Centre Bell",
    is_playoff: true,
    is_ppv: false,
    demand_multiplier: 1.5,
    affects_locations: null,
    source: "api",
    external_id: "nhl-2026041801",
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },
  {
    id: "evt-004",
    organization_id: ORG_ID,
    name: "UFC 315 - Makhachev vs Oliveira",
    event_type: "ufc",
    event_date: upcomingDates[5],
    start_time: `${upcomingDates[5]}T22:00:00Z`,
    end_time: null,
    venue: null,
    is_playoff: false,
    is_ppv: true,
    demand_multiplier: 1.5,
    affects_locations: null,
    source: "manual",
    external_id: null,
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },
  {
    id: "evt-005",
    organization_id: ORG_ID,
    name: "Leafs vs Lightning",
    event_type: "nhl",
    event_date: upcomingDates[7],
    start_time: `${upcomingDates[7]}T23:00:00Z`,
    end_time: null,
    venue: "Scotiabank Arena",
    is_playoff: true,
    is_ppv: false,
    demand_multiplier: 1.8,
    affects_locations: null,
    source: "api",
    external_id: "nhl-2026042101",
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },
  {
    id: "evt-006",
    organization_id: ORG_ID,
    name: "NFL Draft Day 1",
    event_type: "nfl",
    event_date: upcomingDates[10],
    start_time: `${upcomingDates[10]}T00:00:00Z`,
    end_time: null,
    venue: null,
    is_playoff: false,
    is_ppv: false,
    demand_multiplier: 1.3,
    affects_locations: null,
    source: "manual",
    external_id: null,
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },
  {
    id: "evt-007",
    organization_id: ORG_ID,
    name: "Raptors vs 76ers",
    event_type: "nba",
    event_date: upcomingDates[12],
    start_time: `${upcomingDates[12]}T23:30:00Z`,
    end_time: null,
    venue: "Scotiabank Arena",
    is_playoff: false,
    is_ppv: false,
    demand_multiplier: 1.25,
    affects_locations: null,
    source: "api",
    external_id: "nba-2026042601",
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },
  // Past event for history
  {
    id: "evt-past-001",
    organization_id: ORG_ID,
    name: "Leafs vs Panthers",
    event_type: "nhl",
    event_date: pastDates[2],
    start_time: `${pastDates[2]}T23:00:00Z`,
    end_time: null,
    venue: "Scotiabank Arena",
    is_playoff: true,
    is_ppv: false,
    demand_multiplier: 1.8,
    affects_locations: null,
    source: "api",
    external_id: "nhl-2026041101",
    created_at: "2026-04-08T00:00:00Z",
    updated_at: "2026-04-08T00:00:00Z",
  },
  {
    id: "evt-past-002",
    organization_id: ORG_ID,
    name: "Raptors vs Knicks",
    event_type: "nba",
    event_date: pastDates[4],
    start_time: `${pastDates[4]}T23:30:00Z`,
    end_time: null,
    venue: "Scotiabank Arena",
    is_playoff: false,
    is_ppv: false,
    demand_multiplier: 1.25,
    affects_locations: null,
    source: "api",
    external_id: "nba-2026041001",
    created_at: "2026-04-08T00:00:00Z",
    updated_at: "2026-04-08T00:00:00Z",
  },
];

// Generate staffing suggestions for upcoming events
function generateMockSuggestions(): MockStaffingSuggestion[] {
  const suggestions: MockStaffingSuggestion[] = [];
  const upcomingEvents = MOCK_EVENTS.filter(e => e.event_date >= upcomingDates[0]);
  let idx = 0;

  for (const event of upcomingEvents) {
    // Generate for first 3 locations per event
    const locationsToUse = MOCK_LOCATIONS.slice(0, 3);
    for (const loc of locationsToUse) {
      for (const role of MOCK_ROLES) {
        const baseHeadcount = role.name === "Manager" ? 1 : role.name === "Cook" ? 3 : role.name === "Server" ? 4 : 2;
        const suggestedHeadcount = Math.ceil(baseHeadcount * event.demand_multiplier);

        if (suggestedHeadcount > baseHeadcount) {
          const isFirst = idx < 4;
          suggestions.push({
            id: `sug-${String(idx++).padStart(3, "0")}`,
            organization_id: ORG_ID,
            event_id: event.id,
            location_id: loc.id,
            suggested_date: event.event_date,
            role_id: role.id,
            current_headcount: baseHeadcount,
            suggested_headcount: suggestedHeadcount,
            status: isFirst ? "approved" : "pending",
            approved_by: isFirst ? "user-001" : null,
            approved_headcount: isFirst ? suggestedHeadcount : null,
            notes: null,
            created_at: "2026-04-10T00:00:00Z",
          });
        }
      }
    }
  }

  return suggestions;
}

export const MOCK_STAFFING_SUGGESTIONS = generateMockSuggestions();

export const MOCK_EVENT_ACTUALS = [
  {
    id: "actual-001",
    event_id: "evt-past-001",
    location_id: "b1b2c3d4-0001-4000-8000-000000000001",
    actual_covers: 285,
    normal_covers_estimate: 160,
    actual_revenue: 14250,
    labor_cost: 2800,
    notes: "Record night for Etobicoke location",
    created_at: "2026-04-12T00:00:00Z",
  },
  {
    id: "actual-002",
    event_id: "evt-past-001",
    location_id: "b1b2c3d4-0002-4000-8000-000000000002",
    actual_covers: 210,
    normal_covers_estimate: 140,
    actual_revenue: 10500,
    labor_cost: 2200,
    notes: null,
    created_at: "2026-04-12T00:00:00Z",
  },
  {
    id: "actual-003",
    event_id: "evt-past-002",
    location_id: "b1b2c3d4-0001-4000-8000-000000000001",
    actual_covers: 195,
    normal_covers_estimate: 160,
    actual_revenue: 9750,
    labor_cost: 2100,
    notes: null,
    created_at: "2026-04-11T00:00:00Z",
  },
];
