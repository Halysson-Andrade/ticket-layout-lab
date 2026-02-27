import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: roleCheck } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const body = req.method !== 'GET' ? await req.json() : null

    // Route: GET /admin-users - list all users
    if (req.method === 'GET') {
      const { data: profiles, error } = await adminClient
        .from('profiles')
        .select('*, user_roles(role)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return new Response(JSON.stringify(profiles), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Route: POST - create user
    if (req.method === 'POST' && !body.action) {
      const { username, email, name, role, status, company_id, password } = body

      // Create auth user
      const tempPassword = password || Math.random().toString(36).slice(-12) + 'A1!'
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      })
      if (authError) throw authError

      const userId = authUser.user.id

      // Create profile
      const { error: profileError } = await adminClient.from('profiles').insert({
        user_id: userId,
        name,
        username,
        email,
        status: status || 'ativo',
        must_change_password: true,
        company_id: company_id || null,
      })
      if (profileError) {
        // Rollback auth user
        await adminClient.auth.admin.deleteUser(userId)
        throw profileError
      }

      // Assign role
      const { error: roleError } = await adminClient.from('user_roles').insert({
        user_id: userId,
        role: role || 'basico',
      })
      if (roleError) throw roleError

      // Audit
      await adminClient.from('audit_logs').insert({
        action: 'USER_CREATED',
        actor_user_id: callerId,
        entity_type: 'user',
        entity_id: userId,
        metadata: { username, role, created_by: callerId },
      })

      return new Response(JSON.stringify({ userId, tempPassword }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Route: POST with action
    if (req.method === 'POST' && body.action === 'reset-password') {
      const { user_id } = body
      const newPassword = Math.random().toString(36).slice(-10) + 'X1!'

      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        password: newPassword,
      })
      if (error) throw error

      await adminClient.from('profiles').update({ must_change_password: true }).eq('user_id', user_id)

      await adminClient.from('audit_logs').insert({
        action: 'PASSWORD_RESET',
        actor_user_id: callerId,
        entity_type: 'user',
        entity_id: user_id,
        metadata: { reset_by: callerId },
      })

      return new Response(JSON.stringify({ tempPassword: newPassword }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Route: PUT - update user
    if (req.method === 'PUT') {
      const { user_id, name, username, email, role, status, company_id } = body

      const { error: profileError } = await adminClient.from('profiles').update({
        name, username, email, status,
        company_id: company_id || null,
      }).eq('user_id', user_id)
      if (profileError) throw profileError

      // Update email in auth
      await adminClient.auth.admin.updateUserById(user_id, { email })

      // Update role
      await adminClient.from('user_roles').update({ role }).eq('user_id', user_id)

      await adminClient.from('audit_logs').insert({
        action: 'USER_UPDATED',
        actor_user_id: callerId,
        entity_type: 'user',
        entity_id: user_id,
        metadata: { updated_fields: { name, username, email, role, status, company_id } },
      })

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
