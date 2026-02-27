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

function generateCode(length = 64): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(key =>
    crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  ).then(sig => {
    const arr = Array.from(new Uint8Array(sig))
    return arr.map(b => b.toString(16).padStart(2, '0')).join('')
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, id_evento, id_usuario } = await req.json()

    // Validate required fields
    if (!token || !id_evento || !id_usuario) {
      return new Response(JSON.stringify({ 
        error: 'Campos obrigatórios: token, id_evento, id_usuario' 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Validate company token
    const providedHash = await hashToken(token)
    const { data: integration, error: intError } = await admin
      .from('company_integrations')
      .select('company_id, token_expires_at, url_check_permissao, token_secret_hash')
      .eq('token_secret_hash', providedHash)
      .maybeSingle()

    if (intError) throw intError

    if (!integration) {
      return new Response(JSON.stringify({ error: 'Token de integração inválido' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check expiry
    if (integration.token_expires_at) {
      const expiresAt = new Date(integration.token_expires_at)
      if (expiresAt < new Date()) {
        return new Response(JSON.stringify({ error: 'Token de integração expirado' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const companyId = integration.company_id

    // 2. Check user permission via company's permission API (if configured)
    if (integration.url_check_permissao) {
      try {
        const timestamp = new Date().toISOString()
        const payloadStr = JSON.stringify({ id_evento, id_usuario, timestamp })
        
        // Sign with the token hash as HMAC secret (company knows their token)
        const signature = await createHmacSignature(payloadStr, providedHash)

        const permRes = await fetch(integration.url_check_permissao, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_evento,
            id_usuario,
            timestamp,
            signature,
          }),
        })

        const permResult = await permRes.json()

        if (!permRes.ok || permResult.allowed === false) {
          return new Response(JSON.stringify({ 
            error: permResult.message || 'Usuário não tem permissão para este evento' 
          }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } catch (permErr: any) {
        console.error('Permission check error:', permErr)
        return new Response(JSON.stringify({ 
          error: 'Erro ao verificar permissão do usuário' 
        }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 3. Generate short-lived exchange code (30 seconds)
    const code = generateCode()
    const codeHash = await hashToken(code)
    const expiresAt = new Date(Date.now() + 30 * 1000) // 30 seconds

    // Clean up old expired codes first
    await admin
      .from('integration_exchange_codes')
      .delete()
      .lt('expires_at', new Date().toISOString())

    const { error: insertError } = await admin
      .from('integration_exchange_codes')
      .insert({
        code: codeHash,
        company_id: companyId,
        id_evento,
        id_usuario_externo: id_usuario,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) throw insertError

    // 4. Return exchange code (raw, not hashed)
    return new Response(JSON.stringify({
      exchange_code: code,
      expires_in: 30,
      redirect_url: `/mapstudio?code=${code}`,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Integration auth error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
