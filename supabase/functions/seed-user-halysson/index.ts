import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const email = 'halysson.andradega@gmail.com'
  const username = 'halysson.andradega'
  const password = '1234'

  try {
    const { data: existing } = await admin
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle()

    let userId = existing?.user_id as string | undefined
    let passwordOk = true
    let passwordError: string | null = null

    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
      if (error) { passwordOk = false; passwordError = error.message }
      await admin.from('profiles').update({ must_change_password: true, status: 'ativo', username, name: 'Halysson Andrade' }).eq('user_id', userId)
    } else {
      let created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (created.error) {
        passwordOk = false
        passwordError = created.error.message
        created = await admin.auth.admin.createUser({ email, password: 'Trocar@1234', email_confirm: true })
        if (created.error) throw created.error
      }
      userId = created.data.user!.id
      const { error: pErr } = await admin.from('profiles').insert({
        user_id: userId, name: 'Halysson Andrade', username, email,
        status: 'ativo', must_change_password: true,
      })
      if (pErr) throw pErr
      await admin.from('user_roles').insert({ user_id: userId, role: 'admin' })
    }

    return new Response(JSON.stringify({ userId, username, passwordOk, passwordError }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
