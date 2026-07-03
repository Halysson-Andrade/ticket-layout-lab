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

    // Simulated sectors for events (default)
    const simulatedSetores = [
      { id: 'setor-pista', name: 'Pista', color: 'hsl(142, 71%, 45%)' },
      { id: 'setor-vip', name: 'VIP', color: 'hsl(340, 82%, 52%)' },
      { id: 'setor-camarote', name: 'Camarote', color: 'hsl(262, 83%, 58%)' },
      { id: 'setor-arquibancada-a', name: 'Arquibancada A', color: 'hsl(199, 89%, 48%)' },
      { id: 'setor-arquibancada-b', name: 'Arquibancada B', color: 'hsl(45, 93%, 47%)' },
      { id: 'setor-mezanino', name: 'Mezanino', color: 'hsl(24, 95%, 53%)' },
    ]

    // Event-specific sectors
    const mirageSetores = [
      { id: 'mirage-lateral-prata-par',    name: 'Lateral Prata - Numeração Lado Par',    color: '#F2C230' },
      { id: 'mirage-lateral-prata-impar',  name: 'Lateral Prata - Numeração Lado Ímpar',  color: '#F2C230' },
      { id: 'mirage-lateral-ouro-par',     name: 'Lateral Ouro - Numeração Lado Par',     color: '#1B7BA6' },
      { id: 'mirage-lateral-ouro-impar',   name: 'Lateral Ouro - Numeração Lado Ímpar',   color: '#1B7BA6' },
      { id: 'mirage-central-prata-par',    name: 'Central Prata - Numeração Lado Par',    color: '#A6CE39' },
      { id: 'mirage-central-prata-impar',  name: 'Central Prata - Numeração Lado Ímpar',  color: '#A6CE39' },
      { id: 'mirage-central-ouro-par',     name: 'Central Ouro - Numeração Lado Par',     color: '#E6224A' },
      { id: 'mirage-central-ouro-impar',   name: 'Central Ouro - Numeração Lado Ímpar',   color: '#E6224A' },
      { id: 'mirage-vip-prata-par',        name: 'VIP Prata - Numeração Lado Par',        color: '#D63BB8' },
      { id: 'mirage-vip-prata-impar',      name: 'VIP Prata - Numeração Lado Ímpar',      color: '#D63BB8' },
      { id: 'mirage-vip-ouro-par',         name: 'VIP Ouro - Numeração Lado Par',         color: '#F08A1F' },
      { id: 'mirage-vip-ouro-impar',       name: 'VIP Ouro - Numeração Lado Ímpar',       color: '#F08A1F' },
      { id: 'mirage-vip-premium-par',      name: 'VIP Premium - Numeração Lado Par',      color: '#C99A2E' },
      { id: 'mirage-vip-premium-impar',    name: 'VIP Premium - Numeração Lado Ímpar',    color: '#C99A2E' },
      { id: 'mirage-camarote-familia-par', name: 'Camarote Família - Numeração Lado Par', color: '#B08423' },
      { id: 'mirage-camarote-familia-impar', name: 'Camarote Família - Numeração Lado Ímpar', color: '#B08423' },
      { id: 'mirage-cadeirante',           name: 'Setor Cadeirante',                      color: '#6B7280' },
    ]

    if (action === 'list-setores') {
      const idEvento = url.searchParams.get('id_evento') || ''
      const setores = idEvento.toUpperCase().includes('MIRAGE') ? mirageSetores : simulatedSetores
      return new Response(JSON.stringify({ setores }), {
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
      const idEvento = url.searchParams.get('id_evento')
      const companyId = url.searchParams.get('company_id')

      let query = admin.from('maps').select('*')

      if (mapId) {
        query = query.eq('id', mapId)
      } else if (idEvento) {
        query = query.eq('id_evento_externo', idEvento)
        if (companyId) {
          query = query.eq('company_id', companyId)
        }
      } else {
        return new Response(JSON.stringify({ error: 'map_id or id_evento required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data } = await query.maybeSingle()
      
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
      
      // Deny user-124 to test permission validation
      const blockedUsers = ['user-124']
      const isBlocked = blockedUsers.includes(body.id_usuario)
      
      if (isBlocked) {
        return new Response(JSON.stringify({ 
          allowed: false, 
          message: `Usuário "${body.id_usuario}" não tem permissão para acessar o evento "${body.id_evento}". Contate o administrador.` 
        }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

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
