import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{...cors,"Content-Type":"application/json"}
});

async function deleteFolder(admin:any,userId:string){
  const bucket=admin.storage.from("note-images");
  async function walk(prefix:string){
    const {data}=await bucket.list(prefix,{limit:1000});
    if(!data)return;
    const files:string[]=[];
    for(const item of data){
      const path=prefix?`${prefix}/${item.name}`:item.name;
      if(item.id)files.push(path); else await walk(path);
    }
    if(files.length)await bucket.remove(files);
  }
  await walk(userId);
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({error:"Método inválido."},405);

  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader=req.headers.get("Authorization")||"";
  if(!authHeader.startsWith("Bearer "))return reply({error:"Não autenticado."},401);

  const caller=createClient(url,anon,{
    global:{headers:{Authorization:authHeader}},
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});

  const {data:u,error:uerr}=await caller.auth.getUser(authHeader.slice(7));
  if(uerr||!u.user)return reply({error:"Sessão inválida."},401);

  const {data:profile}=await admin.from("profiles").select("role,active").eq("id",u.user.id).maybeSingle();
  if(!profile?.active||profile.role!=="admin")return reply({error:"Acesso administrativo negado."},403);

  let body:any={};
  try{body=await req.json()}catch{}
  const action=String(body.action||"");

  if(action==="list"){
    const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(error)return reply({error:error.message},400);
    const ids=data.users.map(x=>x.id);
    const [{data:profiles},{data:records}]=await Promise.all([
      ids.length?admin.from("profiles").select("id,role,active,created_at").in("id",ids):Promise.resolve({data:[]}),
      admin.from("vault_records").select("user_id")
    ]);
    const pm=new Map((profiles||[]).map((p:any)=>[p.id,p]));
    const hd=new Set((records||[]).map((r:any)=>r.user_id));
    return reply({users:data.users.map(x=>{
      const p:any=pm.get(x.id)||{};
      return{
        id:x.id,email:x.email,created_at:x.created_at,
        role:p.role||"user",active:p.active!==false,has_data:hd.has(x.id)
      };
    })});
  }

  if(action==="create"){
    const email=String(body.email||"").trim().toLowerCase();
    const password=String(body.password||"");
    if(!email||password.length<6)return reply({error:"Informe e-mail e senha com pelo menos 6 caracteres."},400);
    const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
    if(error)return reply({error:error.message},400);
    return reply({ok:true,user:{id:data.user.id,email:data.user.email}});
  }

  if(action==="toggle_user"){
    const id=String(body.user_id||"");
    if(!id||id===u.user.id)return reply({error:"Operação inválida para esta conta."},400);
    const {data:p}=await admin.from("profiles").select("active").eq("id",id).maybeSingle();
    if(!p)return reply({error:"Usuário não encontrado."},404);
    const {error}=await admin.from("profiles").update({active:!p.active,updated_at:new Date().toISOString()}).eq("id",id);
    if(error)return reply({error:error.message},400);
    return reply({ok:true,active:!p.active});
  }

  if(action==="reset_password"){
    const id=String(body.user_id||""),password=String(body.password||"");
    if(!id||password.length<6)return reply({error:"Usuário ou senha inválidos."},400);
    const {count}=await admin.from("vault_records").select("id",{count:"exact",head:true}).eq("user_id",id);
    if((count||0)>0)return reply({
      error:"Redefinição bloqueada: esta conta já possui dados criptografados. Use troca de senha com recriptografia."
    },409);
    const {error}=await admin.auth.admin.updateUserById(id,{password});
    if(error)return reply({error:error.message},400);
    return reply({ok:true});
  }

  if(action==="delete_user"){
    const id=String(body.user_id||"");
    if(!id||id===u.user.id)return reply({error:"Não é permitido excluir a própria conta administrativa por aqui."},400);
    await deleteFolder(admin,id);
    const {error}=await admin.auth.admin.deleteUser(id);
    if(error)return reply({error:error.message},400);
    return reply({ok:true});
  }

  return reply({error:"Ação desconhecida."},400);
});
