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
    const { company_id, token } = await req.json()

    if (!company_id || !token) {
      return new Response(JSON.stringify({ valid: false, error: 'company_id e token são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Fetch integration record for this company
    const { data: integration, error } = await admin
      .from('company_integrations')
      .select('token_secret_hash, token_expires_at')
      .eq('company_id', company_id)
      .maybeSingle()

    if (error) throw error

    if (!integration || !integration.token_secret_hash) {
      return new Response(JSON.stringify({ valid: false, error: 'Empresa sem token de integração configurado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check expiry
    if (integration.token_expires_at) {
      const expiresAt = new Date(integration.token_expires_at)
      if (expiresAt < new Date()) {
        return new Response(JSON.stringify({ valid: false, error: 'Token expirado' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Hash the provided token and compare
    const providedHash = await hashToken(token)
    if (providedHash !== integration.token_secret_hash) {
      return new Response(JSON.stringify({ valid: false, error: 'Token inválido' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ valid: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})