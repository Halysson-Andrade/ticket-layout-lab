import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function logAudit(client: any, action: string, userId: string | null, metadata: any) {
  try {
    await client.from('audit_logs').insert({
      action,
      actor_user_id: userId,
      metadata,
    })
  } catch (e) {
    console.error('Audit log error:', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username e senha são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Lookup profile by username using service role (bypasses RLS)
    const { data: profile, error: lookupError } = await adminClient
      .from('profiles')
      .select('email, status, user_id')
      .eq('username', username)
      .maybeSingle()

    if (lookupError || !profile) {
      await logAudit(adminClient, 'LOGIN_FAIL', null, { username, reason: 'user_not_found' })
      return new Response(JSON.stringify({ error: 'Usuário ou senha inválidos' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (profile.status === 'inativo') {
      return new Response(JSON.stringify({ error: 'Usuário inativo. Contate o administrador.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authenticate
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: profile.email,
      password,
    })

    if (authError) {
      await logAudit(adminClient, 'LOGIN_FAIL', profile.user_id, { username, reason: 'invalid_password' })
      return new Response(JSON.stringify({ error: 'Usuário ou senha inválidos' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    await logAudit(adminClient, 'LOGIN_SUCCESS', authData.user.id, { username })

    return new Response(JSON.stringify({
      session: authData.session,
      user: authData.user,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Login error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
