import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()

    if (!code) {
      return new Response(JSON.stringify({ valid: false, error: 'Código é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Hash the code to find it
    const codeHash = await hashToken(code)

    // Find the exchange code
    const { data: exchangeCode, error } = await admin
      .from('integration_exchange_codes')
      .select('*')
      .eq('code', codeHash)
      .eq('used', false)
      .maybeSingle()

    if (error) throw error

    if (!exchangeCode) {
      return new Response(JSON.stringify({ valid: false, error: 'Código inválido ou já utilizado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check expiry
    if (new Date(exchangeCode.expires_at) < new Date()) {
      // Mark as used to prevent replay
      await admin
        .from('integration_exchange_codes')
        .update({ used: true })
        .eq('id', exchangeCode.id)

      return new Response(JSON.stringify({ valid: false, error: 'Código expirado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark as used (single-use)
    await admin
      .from('integration_exchange_codes')
      .update({ used: true })
      .eq('id', exchangeCode.id)

    // Return session data
    return new Response(JSON.stringify({
      valid: true,
      company_id: exchangeCode.company_id,
      id_evento: exchangeCode.id_evento,
      id_usuario_externo: exchangeCode.id_usuario_externo,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Exchange code error:', err)
    return new Response(JSON.stringify({ valid: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
