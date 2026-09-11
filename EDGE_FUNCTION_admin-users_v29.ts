import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método inválido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRole) {
      return reply({ error: "Configuração interna do Supabase indisponível." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return reply({ error: "Sessão administrativa ausente." }, 401);
    }
    const token = authHeader.slice(7);

    const admin = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Custom JWT/session validation. This is why Verify JWT can be OFF in Settings.
    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    const caller = callerData?.user;
    if (callerError || !caller) {
      return reply({ error: "Sessão administrativa inválida ou expirada." }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("profiles")
      .select("role,active")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfileError) {
      return reply({ error: callerProfileError.message }, 400);
    }
    if (!callerProfile?.active || callerProfile.role !== "admin") {
      return reply({ error: "Acesso administrativo negado." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    async function ensureRegistryForAuthUsers() {
      const { data: authData, error: authError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (authError) throw authError;

      const users = authData?.users || [];
      if (!users.length) return users;

      const ids = users.map((u) => u.id);
      const { data: profiles, error: profilesError } = await admin
        .from("profiles")
        .select("id,role,active,created_at")
        .in("id", ids);
      if (profilesError) throw profilesError;

      const pmap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const registryRows = users.map((u) => {
        const p: any = pmap.get(u.id) || {};
        return {
          id: u.id,
          email: u.email,
          role: p.role || "user",
          active: p.active !== false,
          created_at: u.created_at || p.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      const { error: registryError } = await admin
        .from("access_registry")
        .upsert(registryRows, { onConflict: "id" });
      if (registryError) throw registryError;

      return users;
    }

    if (action === "list") {
      const authUsers = await ensureRegistryForAuthUsers();

      const [{ data: registry, error: registryError }, { data: records, error: recordsError }] =
        await Promise.all([
          admin
            .from("access_registry")
            .select("id,email,role,active,created_at,updated_at")
            .order("created_at", { ascending: true }),
          admin.from("vault_records").select("user_id"),
        ]);

      if (registryError) return reply({ error: registryError.message }, 400);
      if (recordsError) return reply({ error: recordsError.message }, 400);

      const authIds = new Set((authUsers || []).map((u) => u.id));
      const hasData = new Set((records || []).map((r: any) => r.user_id));

      return reply({
        users: (registry || [])
          .filter((r: any) => authIds.has(r.id))
          .map((r: any) => ({
            id: r.id,
            email: r.email,
            role: r.role || "user",
            active: r.active !== false,
            created_at: r.created_at,
            has_data: hasData.has(r.id),
          })),
      });
    }

    if (action === "create") {
      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return reply({ error: "Informe um e-mail válido." }, 400);
      }
      if (password.length < 6) {
        return reply({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        const msg = String(createError.message || "");
        if (/already|registered|exists/i.test(msg)) {
          return reply({ error: "Este e-mail já possui acesso cadastrado." }, 409);
        }
        return reply({ error: msg || "Não foi possível criar o acesso." }, 400);
      }

      const user = created.user;

      // Persist profile and synchronized registry explicitly.
      const { error: profileError } = await admin
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          role: "user",
          active: true,
          first_access_done: false,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        return reply({
          error: `A conta foi criada no Auth, mas o perfil não foi sincronizado: ${profileError.message}`,
          user: { id: user.id, email: user.email },
        }, 500);
      }

      const { error: registryError } = await admin
        .from("access_registry")
        .upsert({
          id: user.id,
          email: user.email,
          role: "user",
          active: true,
          created_by: caller.id,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (registryError) {
        return reply({
          error: `A conta foi criada no Auth, mas o registro de acesso não foi sincronizado: ${registryError.message}`,
          user: { id: user.id, email: user.email },
        }, 500);
      }

      return reply({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          active: true,
        },
      });
    }

    if (action === "toggle_user") {
      const userId = String(body?.user_id || "");
      if (!userId || userId === caller.id) {
        return reply({ error: "Não é permitido bloquear a própria conta administrativa." }, 400);
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("active")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) return reply({ error: profileError.message }, 400);
      if (!profile) return reply({ error: "Usuário não encontrado." }, 404);

      const nextActive = !profile.active;

      const { error: updateProfileError } = await admin
        .from("profiles")
        .update({ active: nextActive, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateProfileError) return reply({ error: updateProfileError.message }, 400);

      const { error: updateRegistryError } = await admin
        .from("access_registry")
        .update({ active: nextActive, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateRegistryError) return reply({ error: updateRegistryError.message }, 400);

      return reply({ ok: true, active: nextActive });
    }

    if (action === "reset_password") {
      const userId = String(body?.user_id || "");
      const password = String(body?.password || "");
      if (!userId || password.length < 6) {
        return reply({ error: "Usuário ou senha inválidos." }, 400);
      }

      const { count, error: countError } = await admin
        .from("vault_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) return reply({ error: countError.message }, 400);

      if ((count || 0) > 0) {
        return reply({
          error:
            "Esta conta já possui notas criptografadas. A senha não pode ser redefinida sem recriptografar os dados.",
        }, 409);
      }

      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return reply({ error: error.message }, 400);
      return reply({ ok: true });
    }

    if (action === "delete_user") {
      return reply({
        error:
          "Exclusão administrativa bloqueada. Apenas o login criador pode excluir suas próprias notas.",
      }, 403);
    }

    return reply({ error: "Ação administrativa desconhecida." }, 400);
  } catch (error) {
    console.error("admin-users:", error);
    return reply({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
