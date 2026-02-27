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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if admin already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', 'adm')
      .maybeSingle()

    if (existingProfile) {
      return new Response(
        JSON.stringify({ message: 'Admin user already exists' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@portal.local',
      password: 'Guiche@2026@',
      email_confirm: true,
    })

    if (authError) throw authError

    const userId = authUser.user.id

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        name: 'Administrador',
        username: 'adm',
        email: 'admin@portal.local',
        status: 'ativo',
        must_change_password: true,
      })

    if (profileError) throw profileError

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin',
      })

    if (roleError) throw roleError

    // Audit log
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'USER_CREATED',
        actor_user_id: userId,
        entity_type: 'user',
        entity_id: userId,
        metadata: { username: 'adm', role: 'admin', seed: true },
      })

    if (auditError) console.error('Audit log error:', auditError)

    return new Response(
      JSON.stringify({ message: 'Admin user created successfully', userId }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Seed admin error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
