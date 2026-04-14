/**
 * CoverMe.ai — Event Sync Edge Function
 *
 * Fetches upcoming sports events relevant to GTA-area sports bars and
 * generates staffing suggestions based on demand multipliers.
 *
 * POST /functions/v1/event-sync
 * Authorization: Bearer <service_role_key>
 * Body: {
 *   organization_id: "uuid",
 *   weeks_ahead?: number  // default 4
 * }
 *
 * Sources:
 * - NHL API (api-web.nhle.com) — Leafs home/away games
 * - NBA API (cdn.nba.com) — Raptors home/away games
 * - Manual/custom events pass through unchanged
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Team config for GTA sports bars
const TEAMS = {
  nhl: {
    teamAbbrev: 'TOR',
    teamName: 'Toronto Maple Leafs',
    eventType: 'nhl',
  },
  nba: {
    teamId: 28, // Raptors team ID on balldontlie
    teamName: 'Toronto Raptors',
    eventType: 'nba',
  },
}

// Demand multiplier rules
function getDemandMultiplier(
  sport: string,
  isHome: boolean,
  isPlayoff: boolean,
): number {
  if (isPlayoff) return isHome ? 1.8 : 1.5
  if (sport === 'nhl') return isHome ? 1.3 : 1.15
  if (sport === 'nba') return isHome ? 1.25 : 1.1
  if (sport === 'ufc') return 1.5
  if (sport === 'nfl') return 1.3
  return 1.2
}

interface NHLGame {
  id: number
  startTimeUTC: string
  gameDate: string
  gameType: number // 2 = regular, 3 = playoff
  venue: { default: string }
  homeTeam: { abbrev: string; placeName?: { default: string } }
  awayTeam: { abbrev: string; placeName?: { default: string } }
}

interface NBAGame {
  id: number
  date: string
  home_team: { id: number; full_name: string; city: string }
  visitor_team: { id: number; full_name: string; city: string }
  status: string
}

async function fetchNHLGames(weeksAhead: number): Promise<Array<{
  name: string
  event_type: string
  event_date: string
  start_time: string | null
  venue: string | null
  is_playoff: boolean
  demand_multiplier: number
  external_id: string
}>> {
  const events: Array<{
    name: string
    event_type: string
    event_date: string
    start_time: string | null
    venue: string | null
    is_playoff: boolean
    demand_multiplier: number
    external_id: string
  }> = []

  try {
    // NHL API: fetch schedule for the current week range
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + weeksAhead * 7)

    const startStr = now.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    const url = `https://api-web.nhle.com/v1/club-schedule/${TEAMS.nhl.teamAbbrev}/week/${startStr}`
    const resp = await fetch(url)

    if (!resp.ok) {
      // Fallback: try the "now" endpoint
      const fallbackResp = await fetch(
        `https://api-web.nhle.com/v1/club-schedule-season/${TEAMS.nhl.teamAbbrev}/now`
      )
      if (!fallbackResp.ok) {
        console.error('NHL API failed:', fallbackResp.status)
        return events
      }
      const data = await fallbackResp.json()
      const games: NHLGame[] = data.games || []

      for (const game of games) {
        const gameDate = game.gameDate || game.startTimeUTC?.split('T')[0]
        if (!gameDate) continue
        if (gameDate < startStr || gameDate > endStr) continue

        const isHome = game.homeTeam.abbrev === TEAMS.nhl.teamAbbrev
        const isPlayoff = game.gameType === 3
        const opponent = isHome ? game.awayTeam.abbrev : game.homeTeam.abbrev

        events.push({
          name: isHome
            ? `Leafs vs ${opponent}`
            : `Leafs @ ${opponent}`,
          event_type: 'nhl',
          event_date: gameDate,
          start_time: game.startTimeUTC || null,
          venue: game.venue?.default || null,
          is_playoff: isPlayoff,
          demand_multiplier: getDemandMultiplier('nhl', isHome, isPlayoff),
          external_id: `nhl-${game.id}`,
        })
      }
      return events
    }

    const data = await resp.json()
    const games: NHLGame[] = data.games || []

    for (const game of games) {
      const gameDate = game.gameDate || game.startTimeUTC?.split('T')[0]
      if (!gameDate) continue

      const isHome = game.homeTeam.abbrev === TEAMS.nhl.teamAbbrev
      const isPlayoff = game.gameType === 3
      const opponent = isHome ? game.awayTeam.abbrev : game.homeTeam.abbrev

      events.push({
        name: isHome
          ? `Leafs vs ${opponent}${isPlayoff ? ' (Playoffs)' : ''}`
          : `Leafs @ ${opponent}${isPlayoff ? ' (Playoffs)' : ''}`,
        event_type: 'nhl',
        event_date: gameDate,
        start_time: game.startTimeUTC || null,
        venue: game.venue?.default || null,
        is_playoff: isPlayoff,
        demand_multiplier: getDemandMultiplier('nhl', isHome, isPlayoff),
        external_id: `nhl-${game.id}`,
      })
    }
  } catch (err) {
    console.error('NHL fetch error:', err)
  }

  return events
}

async function fetchNBAGames(weeksAhead: number): Promise<Array<{
  name: string
  event_type: string
  event_date: string
  start_time: string | null
  venue: string | null
  is_playoff: boolean
  demand_multiplier: number
  external_id: string
}>> {
  const events: Array<{
    name: string
    event_type: string
    event_date: string
    start_time: string | null
    venue: string | null
    is_playoff: boolean
    demand_multiplier: number
    external_id: string
  }> = []

  try {
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + weeksAhead * 7)

    const startStr = now.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    // balldontlie.io free API — no key needed for basic schedule
    const url = `https://api.balldontlie.io/v1/games?team_ids[]=${TEAMS.nba.teamId}&start_date=${startStr}&end_date=${endStr}&per_page=50`
    const resp = await fetch(url, {
      headers: {
        'Authorization': Deno.env.get('BALLDONTLIE_API_KEY') || '',
      },
    })

    if (!resp.ok) {
      console.error('NBA API failed:', resp.status)
      return events
    }

    const data = await resp.json()
    const games: NBAGame[] = data.data || []

    for (const game of games) {
      const gameDate = game.date?.split('T')[0]
      if (!gameDate) continue

      const isHome = game.home_team.id === TEAMS.nba.teamId
      const opponent = isHome
        ? game.visitor_team.full_name
        : game.home_team.full_name
      const opponentShort = isHome
        ? game.visitor_team.city
        : game.home_team.city

      // NBA regular season — playoff detection would need additional logic
      const isPlayoff = false

      events.push({
        name: isHome
          ? `Raptors vs ${opponentShort}`
          : `Raptors @ ${opponentShort}`,
        event_type: 'nba',
        event_date: gameDate,
        start_time: game.date || null,
        venue: isHome ? 'Scotiabank Arena' : null,
        is_playoff: isPlayoff,
        demand_multiplier: getDemandMultiplier('nba', isHome, isPlayoff),
        external_id: `nba-${game.id}`,
      })
    }
  } catch (err) {
    console.error('NBA fetch error:', err)
  }

  return events
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { organization_id, weeks_ahead = 4 } = await req.json()

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch events from all sources in parallel
    const [nhlEvents, nbaEvents] = await Promise.all([
      fetchNHLGames(weeks_ahead),
      fetchNBAGames(weeks_ahead),
    ])

    const allEvents = [...nhlEvents, ...nbaEvents]
    console.log(`Fetched ${allEvents.length} events (${nhlEvents.length} NHL, ${nbaEvents.length} NBA)`)

    // Upsert events (use external_id to deduplicate)
    let upsertedCount = 0
    let suggestionsCreated = 0

    for (const event of allEvents) {
      // Check if event already exists
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('external_id', event.external_id)
        .maybeSingle()

      if (existing) {
        // Update
        await supabase
          .from('events')
          .update({
            name: event.name,
            start_time: event.start_time,
            demand_multiplier: event.demand_multiplier,
            is_playoff: event.is_playoff,
          })
          .eq('id', existing.id)
        upsertedCount++
        continue
      }

      // Insert new event
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert({
          organization_id,
          name: event.name,
          event_type: event.event_type,
          event_date: event.event_date,
          start_time: event.start_time,
          venue: event.venue,
          is_playoff: event.is_playoff,
          demand_multiplier: event.demand_multiplier,
          source: 'api',
          external_id: event.external_id,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        continue
      }

      upsertedCount++

      // Generate staffing suggestions for new events
      // Fetch all locations for this org
      const { data: locations } = await supabase
        .from('locations')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('is_active', true)

      if (!locations || locations.length === 0) continue

      // Fetch all roles for this org
      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .eq('organization_id', organization_id)

      if (!roles || roles.length === 0) continue

      // For each location, calculate suggested headcount per role
      for (const location of locations) {
        // Count current baseline staff for this location on the same day of week
        const dayOfWeek = new Date(event.event_date).getDay()

        for (const role of roles) {
          // Get average scheduled staff for this role at this location
          const { count: baselineCount } = await supabase
            .from('shifts')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', location.id)
            .eq('role_id', role.id)
            .eq('is_open', false)

          // Use a sensible default if no historical data
          const currentHeadcount = baselineCount ?? getDefaultHeadcount(role.name)
          const suggestedHeadcount = Math.ceil(currentHeadcount * event.demand_multiplier)

          if (suggestedHeadcount > currentHeadcount) {
            await supabase
              .from('staffing_suggestions')
              .insert({
                organization_id,
                event_id: newEvent.id,
                location_id: location.id,
                suggested_date: event.event_date,
                role_id: role.id,
                current_headcount: currentHeadcount,
                suggested_headcount: suggestedHeadcount,
                status: 'pending',
              })
            suggestionsCreated++
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        events_synced: upsertedCount,
        suggestions_created: suggestionsCreated,
        sources: {
          nhl: nhlEvents.length,
          nba: nbaEvents.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Event sync error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getDefaultHeadcount(roleName: string): number {
  switch (roleName.toLowerCase()) {
    case 'cook': return 3
    case 'server': return 4
    case 'bartender': return 2
    case 'manager': return 1
    default: return 2
  }
}
