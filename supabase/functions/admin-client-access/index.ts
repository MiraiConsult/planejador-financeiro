// Edge Function: admin-client-access
//
// Gestão de acesso (portal do cliente) — SÓ ADMIN pode chamar.
//   action 'create'        { client_id, email, password? }  → cria login do cliente, vincula client_user_id
//   action 'reset_password'{ client_id, password }          → define nova senha
//   action 'send_reset'    { client_id }                    → envia e-mail de redefinição
//   action 'revoke'        { client_id }                    → desvincula login do cliente
//
// Segurança: identifica o chamador pelo JWT e exige que esteja em admin_users.
// Operações privilegiadas usam service_role (Admin API do GoTrue).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function gerarSenha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  for (const n of arr) s += chars[n % chars.length];
  return s + '!7';
}

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

  // 1) Identifica o chamador pelo JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user: caller } } = await asCaller.auth.getUser();
  if (!caller) return json({ error: 'Não autenticado' }, 401);

  // 2) Confirma que é admin (via service role, lendo admin_users)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: adminRow } = await admin.from('admin_users').select('user_id').eq('user_id', caller.id).maybeSingle();
  if (!adminRow) return json({ error: 'Acesso restrito a administradores' }, 403);

  let body: { action?: string; client_id?: string; email?: string; password?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const { action, client_id } = body;
  if (!action || !client_id) return json({ error: 'Informe action e client_id' }, 400);

  // Carrega o cliente alvo
  const { data: cliente } = await admin
    .from('clients')
    .select('id, nome_completo, client_user_id')
    .eq('id', client_id)
    .maybeSingle();
  if (!cliente) return json({ error: 'Cliente não encontrado' }, 404);

  // ─── create ──────────────────────────────────────────────────────────
  if (action === 'create') {
    if (cliente.client_user_id) return json({ error: 'Cliente já tem login. Use resetar senha.' }, 409);
    const email = (body.email ?? '').trim().toLowerCase();
    if (!email) return json({ error: 'Informe o e-mail do cliente' }, 400);
    const senha = body.password?.trim() || gerarSenha();

    const { data: created, error: errCreate } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { role: 'client', client_id, nome: cliente.nome_completo },
    });
    if (errCreate || !created.user) {
      return json({ error: errCreate?.message ?? 'Falha ao criar usuário' }, 400);
    }

    // GoTrue cria identity com email_verified=false por default — alguns
    // ambientes recusam login por causa disso. Forçamos true via SQL.
    await admin.rpc('set_identity_email_verified', { uid: created.user.id }).catch(() => {});

    const { error: errLink } = await admin
      .from('clients')
      .update({ client_user_id: created.user.id })
      .eq('id', client_id);
    if (errLink) {
      // rollback do user criado pra não deixar órfão
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return json({ error: errLink.message }, 400);
    }

    return json({ ok: true, email, senha_gerada: body.password ? undefined : senha });
  }

  // ─── reset_password ──────────────────────────────────────────────────
  if (action === 'reset_password') {
    if (!cliente.client_user_id) return json({ error: 'Cliente não tem login ainda' }, 409);
    const senha = body.password?.trim() || gerarSenha();
    const { error } = await admin.auth.admin.updateUserById(cliente.client_user_id, { password: senha });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, senha_gerada: body.password ? undefined : senha });
  }

  // ─── send_reset (e-mail de redefinição) ──────────────────────────────
  if (action === 'send_reset') {
    if (!cliente.client_user_id) return json({ error: 'Cliente não tem login ainda' }, 409);
    const { data: u } = await admin.auth.admin.getUserById(cliente.client_user_id);
    const email = u.user?.email;
    if (!email) return json({ error: 'E-mail do cliente não encontrado' }, 404);
    const { error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, enviado_para: email });
  }

  // ─── revoke ──────────────────────────────────────────────────────────
  if (action === 'revoke') {
    if (!cliente.client_user_id) return json({ ok: true });
    const uid = cliente.client_user_id;
    await admin.from('clients').update({ client_user_id: null }).eq('id', client_id);
    await admin.auth.admin.deleteUser(uid).catch(() => {});
    return json({ ok: true });
  }

  return json({ error: `Ação desconhecida: ${action}` }, 400);
});
