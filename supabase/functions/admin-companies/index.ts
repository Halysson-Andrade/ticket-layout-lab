import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(length = 48): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => chars[b % chars.length]).join('')
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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await callerClient.auth.getClaims(token)
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const callerId = claims.claims.sub as string

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: roleCheck } = await adminClient
      .from('user_roles').select('role')
      .eq('user_id', callerId).eq('role', 'admin').maybeSingle()

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action, company_id } = body

    if (action === 'generate-token') {
      const rawToken = generateToken()
      const tokenHash = await hashToken(rawToken)
      
      // Calculate expiry (default 1 year)
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      // Upsert integration
      const { error } = await adminClient.from('company_integrations').upsert({
        company_id,
        token_secret_hash: tokenHash,
        token_expires_at: expiresAt.toISOString(),
      }, { onConflict: 'company_id' })

      if (error) throw error

      await adminClient.from('audit_logs').insert({
        action: 'TOKEN_GENERATED',
        actor_user_id: callerId,
        entity_type: 'company',
        entity_id: company_id,
        metadata: { expires_at: expiresAt.toISOString() },
      })

      // Return raw token ONCE
      return new Response(JSON.stringify({ 
        token: rawToken, 
        expires_at: expiresAt.toISOString(),
        message: 'Guarde este token. Ele não será exibido novamente.' 
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'rotate-token') {
      const rawToken = generateToken()
      const tokenHash = await hashToken(rawToken)
      
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      const { error } = await adminClient.from('company_integrations').update({
        token_secret_hash: tokenHash,
        token_expires_at: expiresAt.toISOString(),
      }).eq('company_id', company_id)

      if (error) throw error

      await adminClient.from('audit_logs').insert({
        action: 'TOKEN_ROTATED',
        actor_user_id: callerId,
        entity_type: 'company',
        entity_id: company_id,
        metadata: { expires_at: expiresAt.toISOString() },
      })

      return new Response(JSON.stringify({ 
        token: rawToken,
        expires_at: expiresAt.toISOString(),
        message: 'Token rotacionado. Guarde este novo token. O anterior foi invalidado.'
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update-urls') {
      const { url_list_setores, url_create_mapa, url_get_mapa, url_update_mapa } = body

      const { error } = await adminClient.from('company_integrations').upsert({
        company_id,
        url_list_setores,
        url_create_mapa,
        url_get_mapa,
        url_update_mapa,
      }, { onConflict: 'company_id' })

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Admin companies error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
