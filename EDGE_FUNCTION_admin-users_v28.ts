import { withSupabase } from "npm:@supabase/server@^1";

const json = (body: unknown, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    try {
      const callerId = ctx.userClaims?.sub;
      if (!callerId) return json({ error: "Sessão inválida." }, 401);

      const { data: profile, error: profileError } = await ctx.supabaseAdmin
        .from("profiles")
        .select("role,active")
        .eq("id", callerId)
        .maybeSingle();

      if (profileError) return json({ error: profileError.message }, 400);
      if (!profile?.active || profile.role !== "admin") {
        return json({ error: "Acesso administrativo negado." }, 403);
      }

      const body = await req.json().catch(() => ({}));
      const action = String(body?.action || "");

      if (action === "list") {
        const { data: authData, error } =
          await ctx.supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) return json({ error: error.message }, 400);

        const users = authData?.users || [];
        const ids = users.map((u) => u.id);

        const profilesResult = ids.length
          ? await ctx.supabaseAdmin
              .from("profiles")
              .select("id,role,active,created_at")
              .in("id", ids)
          : { data: [], error: null };

        if (profilesResult.error) {
          return json({ error: profilesResult.error.message }, 400);
        }

        const { data: records, error: recordsError } =
          await ctx.supabaseAdmin.from("vault_records").select("user_id");
        if (recordsError) return json({ error: recordsError.message }, 400);

        const pmap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]));
        const hasData = new Set((records || []).map((r: any) => r.user_id));

        return json({
          users: users.map((u) => {
            const p: any = pmap.get(u.id) || {};
            return {
              id: u.id,
              email: u.email,
              created_at: u.created_at,
              role: p.role || "user",
              active: p.active !== false,
              has_data: hasData.has(u.id),
            };
          }),
        });
      }

      if (action === "create") {
        const email = String(body?.email || "").trim().toLowerCase();
        const password = String(body?.password || "");

        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return json({ error: "Informe um e-mail válido." }, 400);
        }
        if (password.length < 6) {
          return json({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
        }

        const { data, error } = await ctx.supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (error) {
          const message = String(error.message || "");
          if (/already|registered|exists/i.test(message)) {
            return json({ error: "Este e-mail já possui acesso cadastrado." }, 409);
          }
          return json({ error: message || "Não foi possível criar o acesso." }, 400);
        }

        const { error: profileUpsertError } = await ctx.supabaseAdmin
          .from("profiles")
          .upsert({
            id: data.user.id,
            email: data.user.email,
            role: "user",
            active: true,
            first_access_done: false,
            updated_at: new Date().toISOString(),
          });

        if (profileUpsertError) {
          return json({ error: profileUpsertError.message }, 400);
        }

        return json({
          ok: true,
          user: { id: data.user.id, email: data.user.email },
        });
      }

      if (action === "toggle_user") {
        const userId = String(body?.user_id || "");
        if (!userId || userId === callerId) {
          return json({ error: "Não é permitido bloquear a própria conta administrativa." }, 400);
        }

        const { data: p, error: findError } = await ctx.supabaseAdmin
          .from("profiles")
          .select("active")
          .eq("id", userId)
          .maybeSingle();

        if (findError) return json({ error: findError.message }, 400);
        if (!p) return json({ error: "Usuário não encontrado." }, 404);

        const { error } = await ctx.supabaseAdmin
          .from("profiles")
          .update({ active: !p.active, updated_at: new Date().toISOString() })
          .eq("id", userId);

        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, active: !p.active });
      }

      if (action === "reset_password") {
        const userId = String(body?.user_id || "");
        const password = String(body?.password || "");

        if (!userId || password.length < 6) {
          return json({ error: "Usuário ou senha inválidos." }, 400);
        }

        const { count, error: countError } = await ctx.supabaseAdmin
          .from("vault_records")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (countError) return json({ error: countError.message }, 400);

        if ((count || 0) > 0) {
          return json({
            error:
              "Esta conta já possui notas criptografadas. A senha não pode ser redefinida sem recriptografar os dados.",
          }, 409);
        }

        const { error } =
          await ctx.supabaseAdmin.auth.admin.updateUserById(userId, { password });

        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      if (action === "delete_user") {
        return json({
          error:
            "Exclusão administrativa bloqueada. Apenas o login criador pode excluir suas próprias notas.",
        }, 403);
      }

      return json({ error: "Ação administrativa desconhecida." }, 400);
    } catch (error) {
      console.error("admin-users:", error);
      return json(
        { error: error instanceof Error ? error.message : String(error) },
        500,
      );
    }
  }),
};
