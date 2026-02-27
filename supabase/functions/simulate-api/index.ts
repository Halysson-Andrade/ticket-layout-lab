import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // Simulated sectors for events
    const simulatedSetores = [
      { id: 'setor-pista', name: 'Pista', color: 'hsl(142, 71%, 45%)' },
      { id: 'setor-vip', name: 'VIP', color: 'hsl(340, 82%, 52%)' },
      { id: 'setor-camarote', name: 'Camarote', color: 'hsl(262, 83%, 58%)' },
      { id: 'setor-arquibancada-a', name: 'Arquibancada A', color: 'hsl(199, 89%, 48%)' },
      { id: 'setor-arquibancada-b', name: 'Arquibancada B', color: 'hsl(45, 93%, 47%)' },
      { id: 'setor-mezanino', name: 'Mezanino', color: 'hsl(24, 95%, 53%)' },
    ]

    if (action === 'list-setores') {
      return new Response(JSON.stringify({ setores: simulatedSetores }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list-events') {
      const companyId = url.searchParams.get('company_id')
      if (!companyId) {
        return new Response(JSON.stringify({ error: 'company_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data, error } = await admin
        .from('simulated_events')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: true })

      if (error) throw error
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create-mapa') {
      const body = await req.json()
      // Simulate receiving map data from MapStudio
      console.log('Simulated API received map creation:', JSON.stringify(body).substring(0, 200))
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Mapa recebido com sucesso pela API simulada',
        external_map_id: `SIM-${Date.now()}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get-mapa') {
      const mapId = url.searchParams.get('map_id')
      if (!mapId) {
        return new Response(JSON.stringify({ error: 'map_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data } = await admin
        .from('maps')
        .select('*')
        .eq('id', mapId)
        .maybeSingle()
      
      return new Response(JSON.stringify(data || { error: 'not found' }), {
        status: data ? 200 : 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update-mapa') {
      const body = await req.json()
      console.log('Simulated API received map update:', JSON.stringify(body).substring(0, 200))
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Mapa atualizado com sucesso pela API simulada'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Simulated permission check endpoint
    if (action === 'check-permissao') {
      const body = await req.json()
      console.log('Simulated permission check:', JSON.stringify(body))
      // In simulation, always allow
      return new Response(JSON.stringify({ 
        allowed: true, 
        message: 'Permissão concedida (simulação)' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
