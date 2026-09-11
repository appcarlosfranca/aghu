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

    // Validação explícita da sessão administrativa.
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

    if (callerProfileError) return reply({ error: callerProfileError.message }, 400);
    if (!callerProfile?.active || callerProfile.role !== "admin") {
      return reply({ error: "Acesso administrativo negado." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    async function listAuthUsers() {
      const { data, error } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (error) throw error;
      return data?.users || [];
    }

    async function findAuthUserByEmail(email: string) {
      const normalized = email.trim().toLowerCase();
      const users = await listAuthUsers();
      return users.find(
        (u) => String(u.email || "").trim().toLowerCase() === normalized,
      ) || null;
    }

    async function reconcileOne(user: any, createdBy?: string | null) {
      if (!user?.id || !user?.email) {
        throw new Error("Usuário inválido para reconciliação.");
      }

      // Garante profile.
      const { data: existingProfile, error: profileReadError } = await admin
        .from("profiles")
        .select("id,role,active,created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileReadError) throw profileReadError;

      if (!existingProfile) {
        const { error } = await admin.from("profiles").insert({
          id: user.id,
          email: user.email,
          role: "user",
          active: true,
          first_access_done: false,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const { error } = await admin.from("profiles").update({
          email: user.email,
          updated_at: new Date().toISOString(),
        }).eq("id", user.id);
        if (error) throw error;
      }

      // Lê o profile final para preservar role/admin e active.
      const { data: finalProfile, error: finalProfileError } = await admin
        .from("profiles")
        .select("role,active,created_at")
        .eq("id", user.id)
        .single();

      if (finalProfileError) throw finalProfileError;

      // Garante registro sincronizado persistente.
      const { error: registryError } = await admin
        .from("access_registry")
        .upsert({
          id: user.id,
          email: user.email,
          role: finalProfile.role || "user",
          active: finalProfile.active !== false,
          created_by: createdBy || null,
          created_at: user.created_at || finalProfile.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (registryError) throw registryError;

      return {
        id: user.id,
        email: user.email,
        role: finalProfile.role || "user",
        active: finalProfile.active !== false,
        created_at: user.created_at || finalProfile.created_at,
      };
    }

    async function reconcileAll() {
      const authUsers = await listAuthUsers();
      const out = [];
      for (const user of authUsers) {
        try {
          out.push(await reconcileOne(user, null));
        } catch (err) {
          console.error("Falha ao reconciliar usuário", user?.email, err);
        }
      }
      return out;
    }

    if (action === "list") {
      const reconciled = await reconcileAll();

      const { data: records, error: recordsError } =
        await admin.from("vault_records").select("user_id");
      if (recordsError) return reply({ error: recordsError.message }, 400);

      const hasData = new Set((records || []).map((r: any) => r.user_id));

      return reply({
        ok: true,
        users: reconciled.map((u: any) => ({
          ...u,
          has_data: hasData.has(u.id),
        })),
      });
    }

    if (action === "create" || action === "create_or_reconcile") {
      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return reply({ error: "Informe um e-mail válido." }, 400);
      }
      if (password.length < 6) {
        return reply({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
      }

      // Idempotência: se uma tentativa anterior criou o Auth user, mas a UI
      // perdeu a confirmação, reconcilia em vez de "sumir".
      let existing = await findAuthUserByEmail(email);
      if (existing) {
        const user = await reconcileOne(existing, caller.id);
        return reply({
          ok: true,
          existing: true,
          reconciled: true,
          user,
        });
      }

      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError) {
        // Pode ter havido criação antes do erro de resposta/rede.
        existing = await findAuthUserByEmail(email);
        if (existing) {
          const user = await reconcileOne(existing, caller.id);
          return reply({
            ok: true,
            existing: true,
            reconciled: true,
            user,
          });
        }

        return reply({
          error: createError.message || "Não foi possível criar o acesso.",
        }, 400);
      }

      const user = await reconcileOne(created.user, caller.id);

      return reply({
        ok: true,
        existing: false,
        reconciled: true,
        user,
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

      const { error: pError } = await admin
        .from("profiles")
        .update({
          active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (pError) return reply({ error: pError.message }, 400);

      const { error: rError } = await admin
        .from("access_registry")
        .update({
          active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (rError) return reply({ error: rError.message }, 400);

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

      const { error } = await admin.auth.admin.updateUserById(userId, {
        password,
      });
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
