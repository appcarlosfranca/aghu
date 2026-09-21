//script 1
window.APP_CONFIG={SUPABASE_URL:"https://imwwqdgovfxhntsdkxlz.supabase.co",SUPABASE_ANON_KEY:"sb_publishable_5-96i6Atx7piLOhmQujUlQ___-9fLwW",GOOGLE_CLIENT_ID:""};
//script 2

(function(){
  document.documentElement.dataset.uiMode='original';
  try{
    localStorage.setItem('aghuNotes.uiMode','original');
  }catch(_){}
})();

//script 3

(()=>{
  const cfg=window.APP_CONFIG||{};
  if(!window.supabase?.createClient)throw new Error('Supabase JS não carregado.');
  const raw=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const BOOTSTRAP_ADMIN_LOGIN='carlosjfranca07@gmail.com';
  const LOGICAL=new Set(['notes','labels','note_labels','note_versions','attachments']);
  const OPEN={
    notes:['id','user_id'],labels:['id','user_id'],note_labels:['id','user_id','note_id','label_id'],
    note_versions:['id','user_id','note_id'],attachments:['id','user_id','note_id']
  };
  const enc=new TextEncoder(),dec=new TextDecoder(),MAGIC=enc.encode('AGHUIMG1'),ENC='AGHUENC1:';
  let dataKey=null,legacy180Key=null,legacy210Key=null,currentProfile=null,activeExclusiveSessionId=null,sharePrivateKey=null;
  const accountListeners=new Set();
  const b64=b=>{let s='',a=new Uint8Array(b);for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s)};
  const unb64=s=>{const b=atob(String(s||'')),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  const clone=v=>{try{return structuredClone(v)}catch{return JSON.parse(JSON.stringify(v))}};
  const normalizeLogin=v=>String(v||'').trim().toLowerCase();
  const authEmailFor=v=>{v=normalizeLogin(v);return v.includes('@')?v:`${v}@aghu-notes.invalid`};
  const displayLogin=(email,login='')=>{if(login)return normalizeLogin(login);email=normalizeLogin(email);return email.endsWith('@aghu-notes.invalid')?email.slice(0,-19):email};
  const validLogin=v=>{v=normalizeLogin(v);if(v.length<3||/\s/.test(v))return false;return v.includes('@')?/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v):/^[a-z0-9._-]+$/i.test(v)};
  const deviceLabel=()=>{const ua=navigator.userAgent||'Navegador',platform=navigator.userAgentData?.platform||navigator.platform||'';let family='Navegador';if(/iPad|iPhone|iPod/i.test(ua))family='iOS';else if(/Android/i.test(ua))family=/Mi |Redmi|POCO|Xiaomi/i.test(ua)?'Xiaomi / Android':'Android';else if(/Windows/i.test(ua))family='Windows';else if(/Macintosh|Mac OS X/i.test(ua))family='macOS';else if(/Linux/i.test(ua))family='Linux';const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Browser';return `${family} • ${browser}${platform?` • ${platform}`:''}`.slice(0,180)};

  async function deriveKey(password,salt,iterations){const material=await crypto.subtle.importKey('raw',enc.encode(String(password)),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:unb64(salt),iterations:Number(iterations)||180000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
  async function encryptObject(value,key=dataKey){if(!key)throw Error('Chave de criptografia indisponível.');const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(value)));return{v:1,alg:'AES-GCM',iv:b64(iv),cipher:b64(cipher)}}
  async function decryptObject(box,key){if(!box||!box.iv||!box.cipher||!key)throw Error('Payload criptografado inválido.');const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv)},key,unb64(box.cipher));return JSON.parse(dec.decode(plain))}
  function readKeyRing(){
    return [dataKey,legacy180Key,legacy210Key].filter((key,index,arr)=>key&&arr.indexOf(key)===index);
  }

  async function decryptPayload(payload){
    let box=payload;
    if(typeof box==='string'&&box.startsWith(ENC)){
      const [iv,cipher]=box.slice(ENC.length).split('.');
      const legacy={v:1,iv,cipher};
      for(const key of readKeyRing()){try{return await decryptObject(legacy,key)}catch{}}
      throw Error('Não foi possível descriptografar um registro local legado.');
    }
    if(typeof box==='string'){try{box=JSON.parse(box)}catch{}}
    if(box&&typeof box==='object'&&box.iv&&box.cipher){
      for(const key of readKeyRing()){try{return await decryptObject(box,key)}catch{}}
      throw Error('Não foi possível descriptografar os dados desta conta.');
    }
    return clone(payload);
  }
  async function encryptLegacyString(value,key=legacy210Key||dataKey){const box=await encryptObject(value,key);return `${ENC}${box.iv}.${box.cipher}`}

  async function chooseDataKey(password,p){
    const salt=p.encryption_salt||p.crypto_salt;
    if(!salt)throw Error('Perfil sem chave de criptografia.');

    // A chave de escrita é sempre a configuração atual do perfil. Para leitura,
    // mantemos também as duas iterações já usadas pelo AGHU Notes. Isso evita que
    // notas antigas e novas, gravadas em fases diferentes da migração, desapareçam
    // da lista após recarregar ou entrar novamente.
    const preferred=Number(p.encryption_iterations||180000)||180000;
    const iterations=[preferred,180000,210000].filter((x,i,a)=>a.indexOf(x)===i);
    const keys=new Map();
    for(const it of iterations)keys.set(it,await deriveKey(password,salt,it));

    dataKey=keys.get(preferred);
    legacy180Key=keys.get(180000)||null;
    legacy210Key=keys.get(210000)||null;

    const probe=await raw.from('vault_records')
      .select('payload')
      .eq('user_id',p.id)
      .limit(12);
    if(probe.error)throw probe.error;
    const rows=probe.data||[];
    if(!rows.length)return preferred;

    // Basta uma amostra ser legível para confirmar a senha; cada registro será
    // depois aberto com o anel completo de chaves, sem depender de qual linha o
    // Supabase retornou primeiro.
    let readable=false;
    for(const row of rows){
      for(const key of readKeyRing()){
        try{await decryptObject(row.payload,key);readable=true;break}catch{}
      }
      if(readable)break;
    }
    if(!readable){
      dataKey=null;legacy180Key=null;legacy210Key=null;
      throw Error('Senha aceita, mas não foi possível abrir os dados criptografados desta conta. Não alteramos nenhuma nota.');
    }
    return preferred;
  }

  function normalizeProfile(p){if(!p)return null;return{...p,user_id:p.id,login:displayLogin(p.email,p.login),crypto_salt:p.encryption_salt}}
  async function getOwnProfile(userId){const r=await raw.from('profiles').select('*').eq('id',userId).single();if(r.error)return r;return{data:normalizeProfile(r.data),error:null}}

  async function vaultRows(kind){if(!currentProfile?.user_id)return[];const r=await raw.from('vault_records').select('*').eq('user_id',currentProfile.user_id).eq('kind',kind);if(r.error)throw r.error;return r.data||[]}
  async function decodeVaultRow(v){const payload=await decryptPayload(v.payload);const row={...(payload&&typeof payload==='object'?payload:{}),id:v.record_id,user_id:v.user_id};if(v.note_id)row.note_id=v.note_id;if(v.kind==='note_labels'&&v.ref_id)row.label_id=v.ref_id;if(!row.created_at)row.created_at=v.created_at;if(!row.updated_at)row.updated_at=v.updated_at;Object.defineProperty(row,'__vault_id',{value:v.id,enumerable:false});return row}
  async function encodeVaultRow(kind,row,wrapperId=null){const now=new Date().toISOString(),id=row.id||crypto.randomUUID(),userId=row.user_id||currentProfile?.user_id;if(!userId)throw Error('Usuário indisponível.');const keep=new Set(OPEN[kind]||['id','user_id']),payload={};for(const [k,v] of Object.entries({...row,id,user_id:userId})){if(!keep.has(k)&&!k.startsWith('__'))payload[k]=v}if(!('created_at'in payload))payload.created_at=row.created_at||now;if(!('updated_at'in payload))payload.updated_at=row.updated_at||now;return{id:wrapperId||crypto.randomUUID(),user_id:userId,kind,record_id:id,note_id:row.note_id||null,ref_id:kind==='note_labels'?(row.label_id||null):null,payload:await encryptObject(payload),created_at:row.created_at||now,updated_at:row.updated_at||now}}
  async function fetchLogical(kind,enrich=false){
    const vs=await vaultRows(kind),out=[];
    for(const v of vs){
      try{
        out.push(await decodeVaultRow(v));
      }catch(e){
        // Um registro isolado não pode derrubar a lista inteira. Com o anel de
        // chaves acima, registros 180k/210k continuam legíveis após novas versões.
        console.warn('Registro do cofre não pôde ser aberto',kind,v.record_id,e);
      }
    }

    if(kind==='notes'&&enrich){
      const settled=await Promise.allSettled([
        fetchLogical('note_labels'),
        fetchLogical('labels'),
        fetchLogical('attachments')
      ]);
      const nls=settled[0].status==='fulfilled'?settled[0].value:[];
      const labels=settled[1].status==='fulfilled'?settled[1].value:[];
      const atts=settled[2].status==='fulfilled'?settled[2].value:[];
      const lm=new Map(labels.map(x=>[x.id,x]));
      for(const n of out){
        n.note_labels=nls.filter(x=>x.note_id===n.id).map(x=>({
          label_id:x.label_id,
          labels:lm.has(x.label_id)?{id:x.label_id,name:lm.get(x.label_id).name}:null
        }));
        n.attachments=atts.filter(x=>x.note_id===n.id);
      }
    }
    return out;
  }
  function matches(row,filters){for(const [op,k,v] of filters){const rv=row?.[k];if(op==='eq'&&rv!==v)return false;if(op==='in'&&!(v||[]).includes(rv))return false}return true}
  function sortRows(rows,ord){if(!ord)return rows;const[k,asc]=ord;return rows.sort((a,b)=>{const av=a?.[k],bv=b?.[k];if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return-1;let c;if(typeof av==='number'&&typeof bv==='number')c=av-bv;else{const ad=Date.parse(av),bd=Date.parse(bv);c=Number.isFinite(ad)&&Number.isFinite(bd)?ad-bd:String(av).localeCompare(String(bv),'pt-BR',{numeric:true,sensitivity:'base'})}return asc?c:-c})}
  async function deleteLogicalRows(kind,rows){
    for(const row of rows){
      if(!currentProfile?.user_id||row.user_id!==currentProfile.user_id){
        throw Error('Operação bloqueada: registro não pertence ao usuário.');
      }
      const vid=row.__vault_id;
      const r=vid
        ? await raw.from('vault_records').delete().eq('id',vid).eq('user_id',currentProfile.user_id)
        : await raw.from('vault_records').delete().eq('user_id',currentProfile.user_id).eq('kind',kind).eq('record_id',row.id);
      if(r.error)throw r.error;

      if(kind==='notes'){
        const dep=await raw.from('vault_records').delete()
          .eq('user_id',currentProfile.user_id)
          .in('kind',['note_labels','note_versions','attachments'])
          .eq('note_id',row.id);
        if(dep.error)throw dep.error;
      }else if(kind==='labels'){
        const dep=await raw.from('vault_records').delete()
          .eq('user_id',currentProfile.user_id)
          .eq('kind','note_labels')
          .eq('ref_id',row.id);
        if(dep.error)throw dep.error;
      }
    }
  }

  function idEqFilter(filters){
    const f=(filters||[]).find(x=>x[0]==='eq'&&x[1]==='id');
    return f?f[2]:null;
  }

  async function fetchLogicalForQuery(kind,filters,enrich=false){
    const id=idEqFilter(filters);
    if(!id)return (await fetchLogical(kind,enrich)).filter(r=>matches(r,filters));

    const q=await raw.from('vault_records').select('*')
      .eq('user_id',currentProfile.user_id)
      .eq('kind',kind)
      .eq('record_id',id)
      .limit(1);
    if(q.error)throw q.error;

    const rows=[];
    for(const v of q.data||[]){
      try{rows.push(await decodeVaultRow(v))}
      catch(e){console.warn('Registro específico ilegível',kind,id,e)}
    }

    if(kind==='notes'&&enrich&&rows.length){
      const [nls,labels,atts]=await Promise.all([
        fetchLogical('note_labels'),fetchLogical('labels'),fetchLogical('attachments')
      ]);
      const lm=new Map(labels.map(x=>[x.id,x]));
      for(const n of rows){
        n.note_labels=nls.filter(x=>x.note_id===n.id).map(x=>({
          label_id:x.label_id,labels:lm.has(x.label_id)?{id:x.label_id,name:lm.get(x.label_id).name}:null
        }));
        n.attachments=atts.filter(x=>x.note_id===n.id);
      }
    }
    return rows.filter(r=>matches(r,filters));
  }

  class Q{
    constructor(t){this.t=t;this.op='select';this.p=null;this.f=[];this.ord=null;this.lim=null;this.cols='*';this.ret=false;this.mode=null}
    select(c='*'){this.cols=c||'*';if(this.op==='insert'||this.op==='update')this.ret=true;else this.op='select';return this}
    insert(p){this.op='insert';this.p=p;return this}
    update(p){this.op='update';this.p=p;return this}
    delete(){this.op='delete';return this}
    eq(k,v){this.f.push(['eq',k,v]);return this}
    in(k,v){this.f.push(['in',k,[...(v||[])]]);return this}
    order(k,o={}){this.ord=[k,o.ascending!==false];return this}
    limit(n){this.lim=Number(n);return this}
    single(){this.mode='single';return this.execute()}
    maybeSingle(){this.mode='maybeSingle';return this.execute()}
    then(a,b){return this.execute().then(a,b)}
    finish(rows){
      let r=sortRows(rows,this.ord);
      if(Number.isFinite(this.lim))r=r.slice(0,this.lim);
      if(this.mode==='single'){
        if(r.length!==1)return{data:null,error:{message:`JSON object requested, multiple (or no) rows returned: ${r.length}`}};
        return{data:r[0],error:null};
      }
      if(this.mode==='maybeSingle'){
        if(r.length>1)return{data:null,error:{message:`JSON object requested, multiple rows returned: ${r.length}`}};
        return{data:r[0]||null,error:null};
      }
      return{data:r,error:null};
    }
    async execute(){
      if(!LOGICAL.has(this.t)){
        let q=raw.from(this.t);
        if(this.op==='select')q=q.select(this.cols);
        else if(this.op==='insert'){q=q.insert(this.p);if(this.ret)q=q.select(this.cols)}
        else if(this.op==='update'){q=q.update(this.p);if(this.ret)q=q.select(this.cols)}
        else q=q.delete();
        for(const[op,k,v]of this.f)q=op==='eq'?q.eq(k,v):q.in(k,v);
        if(this.ord)q=q.order(this.ord[0],{ascending:this.ord[1]});
        if(Number.isFinite(this.lim))q=q.limit(this.lim);
        if(this.mode==='single')q=q.single();
        else if(this.mode==='maybeSingle')q=q.maybeSingle();
        return await q;
      }

      try{
        if(!currentProfile?.user_id)throw Error('Usuário indisponível.');

        const enrich=this.t==='notes'&&this.op==='select'&&(String(this.cols).includes('note_labels')||String(this.cols).includes('attachments'));

        if(this.op==='select'){
          const filtered=await fetchLogicalForQuery(this.t,this.f,enrich);
          return this.finish(filtered);
        }

        if(this.op==='insert'){
          const many=Array.isArray(this.p),items=many?this.p:[this.p],saved=[];
          for(const input of items){
            const row={...clone(input)};
            if(!row.id)row.id=crypto.randomUUID();
            row.user_id=currentProfile.user_id;

            const exists=await raw.from('vault_records').select('id')
              .eq('user_id',currentProfile.user_id)
              .eq('kind',this.t)
              .eq('record_id',row.id)
              .limit(1)
              .maybeSingle();
            if(exists.error)throw exists.error;
            if(exists.data){
              const er=new Error('duplicate logical record');er.code='23505';throw er;
            }

            const vr=await encodeVaultRow(this.t,row);
            const r=await raw.from('vault_records').insert(vr).select('*').single();
            if(r.error)throw r.error;
            saved.push(await decodeVaultRow(r.data));
          }
          const result=many?saved:saved[0];
          if(this.ret||this.mode){
            const arr=Array.isArray(result)?result:[result];
            return this.finish(arr);
          }
          return{data:null,error:null};
        }

        const matched=await fetchLogicalForQuery(this.t,this.f,false);

        if(this.op==='update'){
          const saved=[];
          for(const old of matched){
            if(old.user_id!==currentProfile.user_id)throw Error('Registro não pertence ao usuário.');
            const patch=clone(this.p)||{};
            delete patch.user_id;
            const merged={...old,...patch,user_id:currentProfile.user_id};
            if(!('updated_at'in patch))merged.updated_at=new Date().toISOString();
            const vr=await encodeVaultRow(this.t,merged,old.__vault_id);
            const r=await raw.from('vault_records').update({
              payload:vr.payload,note_id:vr.note_id,ref_id:vr.ref_id,updated_at:vr.updated_at
            }).eq('id',old.__vault_id).eq('user_id',currentProfile.user_id).select('*').single();
            if(r.error)throw r.error;
            saved.push(await decodeVaultRow(r.data));
          }
          if(this.ret||this.mode)return this.finish(saved);
          return{data:null,error:null};
        }

        await deleteLogicalRows(this.t,matched);
        return{data:null,error:null};
      }catch(e){
        console.error(e);
        return{data:null,error:{message:e?.message||String(e),code:e?.code}};
      }
    }
  }

  async function ensureShareKeyPair(){
    if(!currentProfile?.user_id||!dataKey)return false;
    const p=await raw.from('profiles').select('share_public_jwk,share_private_enc').eq('id',currentProfile.user_id).maybeSingle();if(p.error)throw p.error;if(!p.data)throw Error('Perfil ativo não encontrado para o compartilhamento.');
    if(p.data.share_public_jwk&&p.data.share_private_enc){const box=await decryptPayload(p.data.share_private_enc);if(!box?.private_jwk)throw Error('Chave privada de compartilhamento inválida.');sharePrivateKey=await crypto.subtle.importKey('jwk',box.private_jwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);return true}
    const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
    const publicJwk=await crypto.subtle.exportKey('jwk',pair.publicKey),privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey),privateEnc=await encryptObject({private_jwk:privateJwk});
    const r=await raw.rpc('ensure_share_keys',{public_jwk:publicJwk,private_enc:privateEnc});if(r.error)throw r.error;sharePrivateKey=pair.privateKey;return true;
  }
  async function encryptSharePayload(payload,recipientPublicJwk){const publicKey=await crypto.subtle.importKey('jwk',recipientPublicJwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']),rawKey=await crypto.subtle.exportKey('raw',key),iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(payload))),wrapped=await crypto.subtle.encrypt({name:'RSA-OAEP'},publicKey,rawKey);return{encrypted_payload:JSON.stringify({iv:b64(iv),cipher:b64(cipher)}),wrapped_key:b64(wrapped)}}
  async function decryptSharePayload(row){await ensureShareKeyPair();const rawKey=await crypto.subtle.decrypt({name:'RSA-OAEP'},sharePrivateKey,unb64(row.wrapped_key));const key=await crypto.subtle.importKey('raw',rawKey,{name:'AES-GCM'},false,['decrypt']);const box=JSON.parse(row.encrypted_payload);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv)},key,unb64(box.cipher));return JSON.parse(dec.decode(plain))}
  async function shareNoteWithLogin(note,login){await ensureShareKeyPair();const desired=normalizeLogin(login),look=await raw.rpc('get_share_recipient',{desired_login:desired});if(look.error)throw look.error;const rec=Array.isArray(look.data)?look.data[0]:look.data;if(!rec?.recipient_user_id)throw Error('Login destinatário não encontrado ou inativo.');if(!rec.recipient_public_jwk)throw Error('Essa conta precisa acessar a versão atual do Notes ao menos uma vez antes de receber notas criptografadas.');const box=await encryptSharePayload({title:note.title||'Sem título',content_html:note.content_html||'',color:note.color||'#ffffff',shared_at:new Date().toISOString(),source_updated_at:note.updated_at||null},rec.recipient_public_jwk);const saved=await raw.rpc('save_note_share',{target_login:rec.recipient_login,target_note_id:note.id,encrypted_payload_arg:box.encrypted_payload,wrapped_key_arg:box.wrapped_key});if(saved.error)throw saved.error;const row=Array.isArray(saved.data)?saved.data[0]:saved.data;return{...(row||{}),recipient_login:rec.recipient_login}}
  async function listSharesForNote(noteId){const q=await raw.from('note_shares').select('id,note_id,recipient_id,recipient_login,owner_login,created_at,updated_at').eq('note_id',noteId).eq('owner_id',currentProfile.user_id).order('updated_at',{ascending:false});if(q.error)throw q.error;return q.data||[]}
  async function revokeShare(shareId){const q=await raw.from('note_shares').delete().eq('id',shareId).eq('owner_id',currentProfile.user_id);if(q.error)throw q.error;return true}
  async function listReceivedShares(){await ensureShareKeyPair();const q=await raw.from('note_shares').select('*').eq('recipient_id',currentProfile.user_id).order('updated_at',{ascending:false});if(q.error)throw q.error;const out=[];for(const row of q.data||[]){try{out.push({...row,payload:await decryptSharePayload(row)})}catch(e){out.push({...row,payload:null,decrypt_error:e?.message||String(e)})}}return out}
  window.AGhuShareCrypto={ensure:ensureShareKeyPair,shareNoteWithLogin,listSharesForNote,revokeShare,listReceivedShares};

  const auth={
    async getSession(){const r=await raw.auth.getSession();if(r.error)return r;if(r.data?.session&&!dataKey){await raw.auth.signOut({scope:'local'}).catch(()=>{});return{data:{session:null},error:null}}return r},
    async signInWithPassword({email,password}){
      const login=normalizeLogin(email),r=await raw.auth.signInWithPassword({email:authEmailFor(login),password});if(r.error)return r;
      const pr=await getOwnProfile(r.data.user.id);if(pr.error||!pr.data){await raw.auth.signOut({scope:'local'}).catch(()=>{});return{data:null,error:{message:'Perfil da conta não encontrado.'}}}if(!pr.data.active){await raw.auth.signOut({scope:'local'}).catch(()=>{});return{data:null,error:{message:'Este acesso está bloqueado pelo Administrador.'}}}
      currentProfile=pr.data;try{currentProfile.encryption_iterations=await chooseDataKey(password,pr.data)}catch(e){currentProfile=null;dataKey=null;legacy180Key=null;legacy210Key=null;await raw.auth.signOut({scope:'local'}).catch(()=>{});return{data:null,error:{message:e.message}}}
      try{await ensureShareKeyPair()}catch(e){console.warn('Chaves de compartilhamento:',e)}
      const sid=crypto.randomUUID(),claimed=await raw.rpc('claim_active_session',{new_session_id:sid,device_label:deviceLabel()});if(claimed.error){dataKey=null;legacy180Key=null;legacy210Key=null;sharePrivateKey=null;currentProfile=null;await raw.auth.signOut({scope:'local'}).catch(()=>{});return{data:null,error:{message:'Não foi possível iniciar a sessão exclusiva. Tente novamente.'}}}activeExclusiveSessionId=sid;
      const first=await raw.rpc('mark_first_access');const u={...r.data.user,login:currentProfile.login,role:currentProfile.role,first_access:first.data===true,exclusive_session_id:sid};return{data:{user:u,session:{...r.data.session,user:u}},error:null}
    },
    async signOut(options={}){const release=options?.release!==false,sid=activeExclusiveSessionId;if(release&&sid){try{await raw.rpc('release_active_session',{session_id_arg:sid})}catch{}}dataKey=null;legacy180Key=null;legacy210Key=null;sharePrivateKey=null;currentProfile=null;activeExclusiveSessionId=null;return raw.auth.signOut({scope:'local'})},
    onAuthStateChange(cb){return raw.auth.onAuthStateChange((ev,s)=>{if(!s){cb(ev,null);return}if(dataKey)cb(ev,{...s,user:{...s.user,login:currentProfile?.login,role:currentProfile?.role}})})}
  };

  async function encryptBlob(blob){if(!dataKey)throw Error('Chave de criptografia indisponível.');const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},dataKey,await blob.arrayBuffer())),mime=enc.encode(blob.type||'application/octet-stream'),out=new Uint8Array(8+2+mime.length+12+cipher.length);out.set(MAGIC,0);new DataView(out.buffer).setUint16(8,mime.length);out.set(mime,10);out.set(iv,10+mime.length);out.set(cipher,22+mime.length);return new Blob([out],{type:'application/octet-stream'})}
  async function decryptBlobBinary(blob,key){const a=new Uint8Array(await blob.arrayBuffer()),is=a.length>22&&MAGIC.every((v,i)=>a[i]===v);if(!is)throw Error('not-binary');const ml=new DataView(a.buffer,a.byteOffset,a.byteLength).getUint16(8),mime=dec.decode(a.slice(10,10+ml)),iv=a.slice(10+ml,22+ml),cipher=a.slice(22+ml),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);return new Blob([plain],{type:mime||'application/octet-stream'})}
  async function decryptBlob(blob){for(const key of readKeyRing()){try{return await decryptBlobBinary(blob,key)}catch{}}try{const txt=await blob.text(),box=JSON.parse(txt);if(box?.iv&&box?.cipher){for(const key of readKeyRing()){try{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv)},key,unb64(box.cipher));return new Blob([plain],{type:box.type||'application/octet-stream'})}catch{}}}}catch{}return blob}
  const storage={from(bucket){const b=raw.storage.from(bucket);return{async upload(path,blob,o={}){try{return await b.upload(path,await encryptBlob(blob),o)}catch(e){return{data:null,error:{message:e.message}}}},async download(path){const r=await b.download(path);if(r.error||!r.data)return r;try{return{data:await decryptBlob(r.data),error:null}}catch(e){return{data:null,error:{message:e.message}}}},remove:p=>b.remove(p),async createSignedUrl(path){const r=await b.download(path);if(r.error||!r.data)return{data:null,error:r.error};try{return{data:{signedUrl:URL.createObjectURL(await decryptBlob(r.data))},error:null}}catch(e){return{data:null,error:{message:e.message}}}}}}};

  const client={auth,storage,from:t=>new Q(t),rpc:(n,a)=>raw.rpc(n,a)};
  function notify(){for(const cb of accountListeners){try{cb()}catch{}}}
  async function adminFunction(action,payload={}){const s=await raw.auth.getSession(),token=s.data?.session?.access_token;if(!token)throw Error('Sessão do Administrador expirada.');const r=await fetch(`${cfg.SUPABASE_URL}/functions/v1/admin-users`,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY,'Authorization':`Bearer ${token}`},body:JSON.stringify({action,...payload})});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`Falha HTTP ${r.status}`);return d}
  const admin={
    hasAdmin:()=>true,setup:async()=>{throw Error('Administrador é gerenciado pela nuvem.')},
    async login(id,pw){const r=await auth.signInWithPassword({email:id,password:pw});if(r.error)throw Error(r.error.message||'Não foi possível autenticar.');if(r.data.user.role!=='admin'){await auth.signOut();throw Error('Esta conta não possui permissão de Administrador.')}return true},
    logout(){auth.signOut().catch(()=>{})},
    async listUsers(){const r=await raw.from('profiles').select('id,email,login,role,active,created_at,first_access_done').order('created_at',{ascending:true});if(r.error)throw r.error;return(r.data||[]).map(p=>({id:p.id,email:displayLogin(p.email,p.login),password:'••••••',createdAt:p.created_at,active:p.active,role:p.role,firstAccessDone:p.first_access_done}))},
    async createUser(login,password){login=normalizeLogin(login);password=String(password||'');if(!validLogin(login))throw Error('Login inválido.');if(password.length<6)throw Error('A senha deve ter pelo menos 6 caracteres.');const d=await adminFunction('create',{login,password});notify();return{id:d.user_id,email:login,active:true}},
    async resetPassword(id,password){await adminFunction('reset_password',{user_id:id,password:String(password||'')});return true},
    async toggleUser(id){const d=await adminFunction('toggle_active',{user_id:id});notify();return!!d.active},
    async deleteUser(id){await adminFunction('set_active',{user_id:id,active:false});notify();return true},onUsersChanged(cb){accountListeners.add(cb);return()=>accountListeners.delete(cb)}
  };
  raw.channel('aghu-admin-profiles').on('postgres_changes',{event:'*',schema:'public',table:'profiles'},notify).subscribe();
  window.AGhuCloud={createClient:()=>client,raw};window.AGhuCloudRaw=raw;window.AGhuCloudConfig=Object.freeze({SUPABASE_URL:cfg.SUPABASE_URL,SUPABASE_ANON_KEY:cfg.SUPABASE_ANON_KEY});window.AGhuLocalAdmin=admin;
  window.AGhuLocalCrypto={ready:()=>!!dataKey,userId:()=>currentProfile?.user_id||null,encryptJson:v=>encryptObject(v),decryptJson:decryptPayload,encryptBlob,decryptBlob};
})();


//script 4

(() => {
  const cfg=window.APP_CONFIG||{};
  const configured=!!(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.AGhuCloud);
  const supabase=window.AGhuCloud.createClient();
  const LOCAL_ONLY=false;


  // ================================================================
  // AGHU Notes v64 — NÚCLEO DE PERSISTÊNCIA REFEITO
  // Supabase (vault_records) é a fonte remota canônica.
  // IndexedDB é o espelho local durável e o rascunho é o journal de edição.
  // O caminho crítico de notas NÃO depende mais do adaptador lógico `notes`.
  // ================================================================
  const V64_CORE_VERSION='69.5';
  const v64Raw=window.AGhuCloudRaw;
  const V64_JOURNAL_PREFIX='aghuNotes.v64.journal:';
  // Espelho local ESTÁVEL: não é apagado após sincronizar. Ele existe para que
  // a nota continue disponível mesmo quando o IndexedDB está bloqueado, quando
  // o HTML é aberto diretamente por file:// ou quando uma leitura remota falha.
  const NOTE_MIRROR_PREFIX='aghuNotes.noteMirror:';
  const v64Diagnostics={unreadable:[],lastSave:null,lastLoad:null};

  function stableMirrorKey(noteId,userId=state?.user?.id){
    return userId&&noteId?`${NOTE_MIRROR_PREFIX}${userId}:${noteId}`:'';
  }
  function stableMirrorSnapshot(note,userId=state?.user?.id){
    if(!note?.id||!userId)return null;
    const n=v64Clone(note);
    delete n.__vault_id;
    n.id=note.id;n.user_id=userId;
    n.title=String(n.title||'Nova nota');
    n.content_html=String(n.content_html||'');
    n.color=n.color||'#ffffff';
    n.created_at=n.created_at||new Date().toISOString();
    n.updated_at=n.updated_at||new Date().toISOString();
    n.pinned=!!n.pinned;n.archived=!!n.archived;n.deleted=!!n.deleted;
    n.patient_meta=n.patient_meta||{};n.note_labels=n.note_labels||[];n.attachments=n.attachments||[];
    return n;
  }
  function writeStableMirror(note,userId=state?.user?.id){
    const snap=stableMirrorSnapshot(note,userId);
    const key=stableMirrorKey(note?.id,userId);
    if(!snap||!key)return false;
    try{localStorage.setItem(key,JSON.stringify(snap));return true}
    catch(err){console.warn('Espelho local da nota:',err);return false}
  }
  function readStableMirrors(userId){
    const out=[];const prefix=`${NOTE_MIRROR_PREFIX}${userId}:`;
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);if(!key||!key.startsWith(prefix))continue;
        try{const n=JSON.parse(localStorage.getItem(key)||'null');if(n?.id&&n.user_id===userId)out.push(n)}catch{}
      }
    }catch{}
    return out;
  }
  function deleteStableMirror(noteId,userId=state?.user?.id){
    const key=stableMirrorKey(noteId,userId);if(!key)return;
    try{localStorage.removeItem(key)}catch{}
  }


  const NOTE_TRASH_GUARD_PREFIX='aghuNotes.trashGuard:';
  function trashGuardKey(noteId,userId=state?.user?.id){
    return userId&&noteId?`${NOTE_TRASH_GUARD_PREFIX}${userId}:${noteId}`:'';
  }
  function writeTrashGuard(noteOrId,updatedAt=new Date().toISOString(),userId=state?.user?.id){
    const noteId=typeof noteOrId==='string'?noteOrId:noteOrId?.id;
    const key=trashGuardKey(noteId,userId);if(!key)return false;
    const payload={id:noteId,user_id:userId,deleted:true,archived:false,updated_at:updatedAt};
    try{localStorage.setItem(key,JSON.stringify(payload));return true}catch(err){console.warn('Guard da lixeira:',err);return false}
  }
  function readTrashGuards(userId){
    const out=[];const prefix=`${NOTE_TRASH_GUARD_PREFIX}${userId}:`;
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);if(!key||!key.startsWith(prefix))continue;
        try{const v=JSON.parse(localStorage.getItem(key)||'null');if(v?.id&&v.user_id===userId)out.push(v)}catch{}
      }
    }catch{}
    return out;
  }
  function clearTrashGuard(noteId,userId=state?.user?.id){
    const key=trashGuardKey(noteId,userId);if(!key)return;
    try{localStorage.removeItem(key)}catch{}
  }
  function enforceTrashGuardsMap(targetMap,userId){
    for(const guard of readTrashGuards(userId)){
      if(!guard?.id)continue;
      const existing=targetMap.get(guard.id);
      if(!existing)continue;
      const et=new Date(existing.updated_at||0).getTime();
      const gt=new Date(guard.updated_at||0).getTime();
      if(gt>=et || !existing.deleted){
        targetMap.set(guard.id,{...existing,deleted:true,archived:false,updated_at:guard.updated_at||existing.updated_at});
      }
    }
  }


  // Tombstone durável de exclusão definitiva. Diferente da lixeira, este marcador
  // sobrevive ao logout/reload e impede que snapshots/rascunhos locais antigos
  // recriem uma nota que já foi apagada da nuvem.
  const NOTE_HARD_DELETE_PREFIX='aghuNotes.hardDelete:';
  function hardDeleteGuardKey(noteId,userId=state?.user?.id){
    return userId&&noteId?`${NOTE_HARD_DELETE_PREFIX}${userId}:${noteId}`:'';
  }
  function writeHardDeleteGuard(noteOrId,userId=state?.user?.id){
    const noteId=typeof noteOrId==='string'?noteOrId:noteOrId?.id;
    const key=hardDeleteGuardKey(noteId,userId);if(!key)return false;
    const payload={id:noteId,user_id:userId,deleted_forever:true,deleted_at:new Date().toISOString()};
    try{localStorage.setItem(key,JSON.stringify(payload));return true}
    catch(err){console.warn('Tombstone de exclusão definitiva:',err);return false}
  }
  function clearHardDeleteGuard(noteId,userId=state?.user?.id){
    const key=hardDeleteGuardKey(noteId,userId);if(!key)return;
    try{localStorage.removeItem(key)}catch{}
  }
  function readHardDeleteGuards(userId){
    const out=[];const prefix=`${NOTE_HARD_DELETE_PREFIX}${userId}:`;
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);if(!key||!key.startsWith(prefix))continue;
        try{const v=JSON.parse(localStorage.getItem(key)||'null');if(v?.id&&v.user_id===userId)out.push(v)}catch{}
      }
    }catch{}
    return out;
  }
  function hardDeletedIds(userId=state?.user?.id){
    return new Set(readHardDeleteGuards(userId).map(x=>x.id).filter(Boolean));
  }
  function isHardDeleted(noteId,userId=state?.user?.id){
    if(!noteId||!userId)return false;
    try{return !!localStorage.getItem(hardDeleteGuardKey(noteId,userId))}catch{return false}
  }
  function purgeHardDeletedFromMap(targetMap,userId){
    for(const id of hardDeletedIds(userId))targetMap.delete(id);
  }
  async function reconcileHardDeleteGuards(userId){
    if(!userId||!navigator.onLine)return;
    const ids=[...hardDeletedIds(userId)];
    if(!ids.length)return;
    try{
      const main=await v64Raw.from('vault_records').delete()
        .eq('user_id',userId).eq('kind','notes').in('record_id',ids);
      if(main.error)throw main.error;
      const deps=await v64Raw.from('vault_records').delete()
        .eq('user_id',userId).in('kind',['note_labels','note_versions','attachments']).in('note_id',ids);
      if(deps.error)throw deps.error;
    }catch(err){console.warn('Reconciliação de exclusões definitivas:',err)}
  }

  function v64Clone(value){
    try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}
  }
  function v64JournalKey(noteId,userId=state.user?.id){
    return userId&&noteId?`${V64_JOURNAL_PREFIX}${userId}:${noteId}`:'';
  }
  function v64JournalSnapshot(note){
    if(!note?.id||!state.user?.id)return null;
    return {
      id:note.id,user_id:state.user.id,
      title:String(note.title||'Nova nota'),content_html:String(note.content_html||''),
      color:note.color||'#ffffff',reminder_at:note.reminder_at||null,
      created_at:note.created_at||new Date().toISOString(),
      updated_at:note.updated_at||new Date().toISOString(),
      pinned:!!note.pinned,archived:!!note.archived,deleted:!!note.deleted,
      patient_meta:note.patient_meta||{},google_doc_id:note.google_doc_id||null,
      synthetic_local:note.synthetic_local??null,synthetic_age:note.synthetic_age??null,
      synthetic_record:note.synthetic_record??null,
      local_only:!!note.local_only,note_labels:note.note_labels||[],attachments:note.attachments||[]
    };
  }
  function v64WriteJournal(note){
    const key=v64JournalKey(note?.id); if(!key)return false;
    if(isHardDeleted(note?.id,state.user?.id))return false;
    try{localStorage.setItem(key,JSON.stringify(v64JournalSnapshot(note)));return true}catch(err){console.warn('Journal v64:',err);return false}
  }
  function v64DeleteJournal(noteId){
    const key=v64JournalKey(noteId);if(!key)return;
    try{localStorage.removeItem(key)}catch{}
  }
  function v64ReadJournals(userId){
    const out=[];const prefix=`${V64_JOURNAL_PREFIX}${userId}:`;
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);if(!key||!key.startsWith(prefix))continue;
        try{const v=JSON.parse(localStorage.getItem(key)||'null');if(v?.id)out.push(v)}catch{}
      }
    }catch{}
    return out;
  }

  function v64CloudPayload(note){
    const n=v64Clone(note||{});
    return {
      title:String(n.title||'Sem título'),
      content_html:String(n.content_html||''),
      color:n.color||'#ffffff',reminder_at:n.reminder_at||null,
      patient_meta:n.patient_meta||{},google_doc_id:n.google_doc_id||null,
      pinned:!!n.pinned,archived:!!n.archived,deleted:!!n.deleted,
      synthetic_local:n.synthetic_local??null,
      synthetic_age:n.synthetic_age??null,synthetic_record:n.synthetic_record??null,
      created_at:n.created_at||new Date().toISOString(),
      updated_at:n.updated_at||new Date().toISOString()
    };
  }

  async function v64DecodeVaultRow(row){
    const payload=await window.AGhuLocalCrypto.decryptJson(row.payload);
    const decoded={...(payload&&typeof payload==='object'?payload:{}),id:row.record_id,user_id:row.user_id};
    if(row.note_id)decoded.note_id=row.note_id;
    if(row.kind==='note_labels'&&row.ref_id)decoded.label_id=row.ref_id;
    if(!decoded.created_at)decoded.created_at=row.created_at;
    if(!decoded.updated_at)decoded.updated_at=row.updated_at;
    Object.defineProperty(decoded,'__vault_id',{value:row.id,enumerable:false});
    return decoded;
  }

  async function v64UpsertNote(note){
    if(!state.user?.id)throw new Error('Usuário não autenticado.');
    if(!note?.id)throw new Error('Nota sem identificador.');
    if(!window.AGhuLocalCrypto?.ready())throw new Error('Criptografia ainda não está pronta.');

    const payload=v64CloudPayload({...note,user_id:state.user.id});
    const encrypted=await window.AGhuLocalCrypto.encryptJson(payload);
    const row={
      user_id:state.user.id,kind:'notes',record_id:note.id,
      note_id:null,ref_id:null,payload:encrypted,
      created_at:payload.created_at,updated_at:payload.updated_at
    };
    const {data,error}=await v64Raw.from('vault_records')
      .upsert(row,{onConflict:'user_id,kind,record_id'})
      .select('*').single();
    if(error)throw error;
    const saved=await v64DecodeVaultRow(data);
    if(saved.id!==note.id)throw new Error('Confirmação remota retornou outro identificador.');
    if(String(saved.title||'')!==String(payload.title||'') || String(saved.content_html||'')!==String(payload.content_html||'')){
      throw new Error('O conteúdo confirmado pelo servidor difere do conteúdo enviado.');
    }
    v64Diagnostics.lastSave={id:note.id,at:new Date().toISOString(),stage:'upsert-confirmed'};
    return {...saved,local_only:false,cloud_confirmed:true};
  }

  async function v64FetchCloudNote(noteId){
    if(!state.user?.id||!noteId)return null;
    const {data,error}=await v64Raw.from('vault_records').select('*')
      .eq('user_id',state.user.id).eq('kind','notes').eq('record_id',noteId).maybeSingle();
    if(error)throw error;
    return data?await v64DecodeVaultRow(data):null;
  }

  async function v64LoadCloudBundle(){
    if(!state.user?.id)return {notes:[],labels:[],note_labels:[],attachments:[],unreadable:[]};
    const {data,error}=await v64Raw.from('vault_records').select('*')
      .eq('user_id',state.user.id)
      .in('kind',['notes','labels','note_labels','attachments'])
      .order('updated_at',{ascending:false});
    if(error)throw error;

    const groups={notes:[],labels:[],note_labels:[],attachments:[]};
    const unreadable=[];
    for(const row of data||[]){
      try{
        const decoded=await v64DecodeVaultRow(row);
        if(groups[row.kind])groups[row.kind].push(decoded);
      }catch(err){
        unreadable.push({kind:row.kind,record_id:row.record_id,message:err?.message||String(err)});
        console.warn('v64: registro remoto preservado, mas ilegível nesta sessão',row.kind,row.record_id,err);
      }
    }
    const labelMap=new Map(groups.labels.map(x=>[x.id,x]));
    for(const note of groups.notes){
      note.note_labels=groups.note_labels.filter(x=>x.note_id===note.id).map(x=>({
        label_id:x.label_id,labels:labelMap.has(x.label_id)?{id:x.label_id,name:labelMap.get(x.label_id).name}:null
      }));
      note.attachments=groups.attachments.filter(x=>x.note_id===note.id);
      note.local_only=false;note.cloud_confirmed=true;
    }
    v64Diagnostics.unreadable=unreadable;
    v64Diagnostics.lastLoad={at:new Date().toISOString(),remoteNotes:groups.notes.length,unreadable:unreadable.length};
    return {...groups,unreadable};
  }

  window.AGhuPersistenceV64={
    version:V64_CORE_VERSION,
    diagnostics:()=>({...v64Clone(v64Diagnostics),localMirrors:state.user?.id?readStableMirrors(state.user.id).length:0,localMode:location.protocol}),
    fetchNote:id=>v64FetchCloudNote(id),
    reload:()=>loadNotes()
  };

  const $ = (id) => document.getElementById(id);
  const state = {
    user: null,
    notes: [],
    labels: [],
    current: null,
    filter: 'all',
    search: '',
    label: '',
    saveTimer: null,
    saveRetryTimer: null,
    draftWriteChains: new Map(),
    noteWriteChains: new Map(),
    cacheSnapshotChain: Promise.resolve(),
    saveInFlight: null,
    saveAgain: false,
    editRevision: 0,
    isDirty: false,
    versionTimer: null,
    selectedId: null,
    syncTimer: null,
    reminderTimer: null,
    sortKey: 'updated_at',
    sortDir: 'desc',
    entering: false,
    keepFocusMode: localStorage.getItem('aghuNotes.keepFocusMode')==='1',
    adminActive:false,
    googleToken:null,
    googleTokenExpiresAt:0,
    googleTokenClient:null,
    googleFolderId:null,
    googleSyncTimers:new Map(),
    quickImageTargetNoteId:null,
    quickImageObjectUrls:new Map(),
    notesViewMode:localStorage.getItem('aghuNotes.notesViewMode')==='cards'?'cards':'rows',
    realtimeChannel:null,realtimeDebounce:null,
    exclusiveSessionId:null,
    exclusiveSessionChannel:null,
    exclusiveHeartbeatTimer:null,
    exclusiveCheckTimer:null,
    forcedSessionLogout:false,
    localPersistenceReady:false,
    localNotesCache:[],
    localLabelsCache:[],
    localDrafts:new Map(),
    pendingSyncRunning:false
  };

  const els = {
    auth: $('authScreen'), app: $('appShell'), login: $('loginForm'), loginEmail: $('loginEmail'), loginPassword: $('loginPassword'), loginError: $('loginError'),
    forgotPasswordBtn:$('forgotPasswordBtn'), forgotPasswordDialog:$('forgotPasswordDialog'), forgotPasswordForm:$('forgotPasswordForm'), forgotPasswordEmail:$('forgotPasswordEmail'), forgotPasswordStatus:$('forgotPasswordStatus'), forgotPasswordClose:$('forgotPasswordCloseBtn'), forgotPasswordCancel:$('forgotPasswordCancelBtn'), forgotPasswordSend:$('forgotPasswordSendBtn'),
    newPasswordDialog:$('newPasswordDialog'), newPasswordForm:$('newPasswordForm'), newPasswordInput:$('newPasswordInput'), newPasswordConfirm:$('newPasswordConfirm'), newPasswordStatus:$('newPasswordStatus'), newPasswordSave:$('newPasswordSaveBtn'),
    adminAccess:$('adminAccessBtn'), adminPanel:$('adminPanel'), adminExit:$('adminExitBtn'), adminLoginDialog:$('adminLoginDialog'), adminLoginTitle:$('adminLoginTitle'), adminSetupHelp:$('adminSetupHelp'), adminLoginForm:$('adminLoginForm'), adminIdentifier:$('adminIdentifierInput'), adminPasswordInput:$('adminPasswordInput'), adminPasswordConfirm:$('adminPasswordConfirm'), adminConfirmWrap:$('adminConfirmWrap'), adminLoginError:$('adminLoginError'), adminLoginSubmit:$('adminLoginSubmitBtn'), adminLoginClose:$('adminLoginCloseBtn'), adminLoginCancel:$('adminLoginCancelBtn'), adminCreateUserForm:$('adminCreateUserForm'), adminNewEmail:$('adminNewEmail'), adminNewPassword:$('adminNewPassword'), adminCreateUserStatus:$('adminCreateUserStatus'), adminUsersBody:$('adminUsersBody'),
    adminUsersMenuBtn:$('adminUsersMenuBtn'), adminSalesTestMenuBtn:$('adminSalesTestMenuBtn'), adminUsersTabBtn:$('adminUsersTabBtn'), adminSalesTestTabBtn:$('adminSalesTestTabBtn'), adminUsersPage:$('adminUsersPage'), adminSalesTestPage:$('adminSalesTestPage'), adminTopTitle:$('adminTopTitle'),
    adminTestBuyerName:$('adminTestBuyerName'), adminTestBuyerEmail:$('adminTestBuyerEmail'), adminTestCreateBtn:$('adminTestCreateBtn'), adminTestApproveBtn:$('adminTestApproveBtn'), adminTestOpenActivationBtn:$('adminTestOpenActivationBtn'), adminTestCopyActivationBtn:$('adminTestCopyActivationBtn'), adminTestRefreshBtn:$('adminTestRefreshBtn'), adminTestMeta:$('adminTestMeta'), adminTestStatus:$('adminTestStatus'), adminTestChecklist:$('adminTestChecklist'), adminTestVerdict:$('adminTestVerdict'),
    calculatorMenu: $('calculatorMenuBtn'), calculatorEditor: $('calculatorEditorBtn'), calculatorDialog: $('calculatorDialog'),
    calculatorClose: $('calculatorCloseBtn'), calculatorDisplay: $('calculatorDisplay'),
    calculatorExpression: $('calculatorExpression'), calculatorKeys: $('calculatorKeys'),
    logout: $('logoutBtn'), syncStatus: $('syncStatus'), installApp: $('installAppBtn'),
    tbody: $('notesTbody'), empty: $('emptyState'), newNote: $('newNoteBtn'), noteSearch: $('noteSearch'), labelFilter: $('labelFilter'),
    notesRowsView:$('notesRowsViewBtn'), notesCardsView:$('notesCardsViewBtn'),
    emptyTrash: $('emptyTrashBtn'), openSelected: $('openSelectedBtn'), editPatientMeta: $('editPatientMetaBtn'), restoreSelected: $('restoreSelectedBtn'), deleteSelected: $('deleteSelectedBtn'),
    patientMetaDialog: $('patientMetaDialog'), patientMetaName: $('patientMetaName'), patientMetaAge: $('patientMetaAge'), patientMetaRecord: $('patientMetaRecord'),
    patientMetaDetected: $('patientMetaDetected'), patientMetaSave: $('patientMetaSaveBtn'), patientMetaAuto: $('patientMetaAutoBtn'),
    patientMetaCancel: $('patientMetaCancelBtn'), closePatientMeta: $('closePatientMetaBtn'),
    manageLabels: $('manageLabelsBtn'), labelsDialog: $('labelsDialog'), labelsManagerList: $('labelsManagerList'),
    firstSyncDialog: $('firstSyncDialog'), confirmFirstSync: $('confirmFirstSyncBtn'), cancelFirstSync: $('cancelFirstSyncBtn'),
    keepPage: $('keepPage'), editorPage: $('editorPage'), back: $('backBtn'), title: $('noteTitle'), body: $('noteBody'), autosave: $('autosaveState'), color: $('colorSelect'), reminder: $('reminderAt'), labelsInput: $('labelsInput'),
    pin: $('pinBtn'), archive: $('archiveBtn'), trash: $('trashBtn'), permanentDelete: $('permanentDeleteBtn'), duplicate: $('duplicateBtn'), share: $('shareBtn'), draw: $('drawBtn'), copyDocs: $('copyDocsBtn'),
    noteMenuBtn:$('noteMenuBtn'), noteActionsMenu:$('noteActionsMenu'),
    googleDocsDialog:$('googleDocsDialog'), googleDocsClose:$('googleDocsCloseBtn'), googleDocsCancel:$('googleDocsCancelBtn'),
    googleAccountInput:$('googleAccountInput'), googleClientIdInput:$('googleClientIdInput'), googleAutoBackup:$('googleAutoBackupToggle'),
    googleDocsStatus:$('googleDocsStatus'), googleConnect:$('googleConnectBtn'), googleSyncNow:$('googleSyncNowBtn'), googleOpenDirect:$('googleOpenDirectBtn'),
    googleOAuthOrigin:$('googleOAuthOrigin'), copyGoogleOrigin:$('copyGoogleOriginBtn'),
    history: $('historyBtn'), historyDialog: $('historyDialog'), historyList: $('historyList'), imageInput: $('imageInput'), imageGallery: $('imageGallery'),
    quickImageInput:$('quickImageInput'), quickImageViewer:$('quickImageViewerDialog'),
    quickImageViewerImg:$('quickImageViewerImg'), quickImageViewerTitle:$('quickImageViewerTitle'),
    quickImageViewerClose:$('quickImageViewerCloseBtn'),
    drawDialog: $('drawDialog'), drawCanvas: $('drawCanvas'), drawSize: $('drawSize'), drawColor: $('drawColor'), clearDraw: $('clearDrawBtn'), saveDraw: $('saveDrawBtn'), closeDraw: $('closeDrawBtn'), cancelDraw: $('cancelDrawBtn'), toast: $('toast'), keepModeToggle: $('keepModeToggle'), keepModeOverlayToggle: $('keepModeOverlayToggle'), keepFocusBar: $('keepFocusBar'),
    closeFocusWindow: $('closeFocusWindowBtn'), closeKeepTab: $('closeKeepTabBtn'), keepTab: $('keepTab'), keepTabOpen: $('keepTabOpenBtn'), panelTab: $('panelTab'), panelPage: $('panelGeneralPage'), panelMenu: $('panelMenuBtn'), keepMenu: $('keepMenuBtn')
  };

  function getNoteMenuBtn(){ return document.getElementById('noteMenuBtn'); }
  function getNoteActionsMenu(){ return document.getElementById('noteActionsMenu'); }

  function positionNoteActionsMenu(){
    const menu=getNoteActionsMenu();
    const btn=getNoteMenuBtn();
    if(!menu||!btn||menu.classList.contains('hidden'))return;
    menu.style.position='absolute';
    menu.style.top='calc(100% + 6px)';
    menu.style.right='0';
    menu.style.left='auto';
    menu.style.bottom='auto';
    menu.style.visibility='visible';
  }

  function openNoteActionsMenu(){
    const menu=getNoteActionsMenu();
    const btn=getNoteMenuBtn();
    if(!menu||!btn)return;
    menu.classList.remove('hidden');
    btn.setAttribute('aria-expanded','true');
    requestAnimationFrame(positionNoteActionsMenu);
  }

  function closeNoteActionsMenu(){
    const menu=getNoteActionsMenu();
    const btn=getNoteMenuBtn();
    if(!menu)return;
    menu.classList.add('hidden');
    menu.style.visibility='';
    if(btn)btn.setAttribute('aria-expanded','false');
  }

  function toggleNoteActionsMenu(event){
    if(event){event.preventDefault();event.stopPropagation();}
    const menu=getNoteActionsMenu();
    if(!menu)return;
    if(menu.classList.contains('hidden'))openNoteActionsMenu();
    else closeNoteActionsMenu();
  }

  const noteMenuButton=getNoteMenuBtn();
  if(noteMenuButton){
    noteMenuButton.onclick=toggleNoteActionsMenu;
  }
  const noteMenuPanel=getNoteActionsMenu();
  noteMenuPanel?.addEventListener('click',event=>{
    event.stopPropagation();
    if(event.target.closest('button'))setTimeout(closeNoteActionsMenu,0);
  });
  document.addEventListener('click',event=>{
    if(getNoteMenuBtn()?.contains(event.target))return;
    if(getNoteActionsMenu()?.contains(event.target))return;
    closeNoteActionsMenu();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeNoteActionsMenu();});
  window.addEventListener('resize',()=>{
    const menu=getNoteActionsMenu();
    if(menu&&!menu.classList.contains('hidden'))positionNoteActionsMenu();
  },{passive:true});

  window.openNoteActionsMenu=openNoteActionsMenu;
  window.closeNoteActionsMenu=closeNoteActionsMenu;
  window.toggleNoteActionsMenu=toggleNoteActionsMenu;


  function fmtDate(v){
    if(!v) return '-';
    const d = new Date(v);
    return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  }
  function toLocalInput(v){ if(!v) return ''; const d=new Date(v); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
  function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':'&quot;'}[c])); }
  function stripHtml(value=''){
    const div=document.createElement('div');div.innerHTML=value;return (div.textContent||div.innerText||'').trim();
  }

  function launchFirstAccessConfetti(){
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    if(document.querySelector('.first-access-confetti'))return;

    const layer=document.createElement('div');
    layer.className='first-access-confetti';
    layer.setAttribute('aria-hidden','true');

    const colors=[
      '#FFD700',
      '#FFC400',
      '#FFE36E',
      '#FFF1A6',
      '#FFB800',
      '#FFD54F',
      '#FFF7D1'
    ];

    const total=Math.min(130,Math.max(86,Math.floor((window.innerWidth||900)/8)));

    for(let i=0;i<total;i++){
      const piece=document.createElement('i');
      piece.className='first-access-confetti-piece';

      const circle=Math.random()<0.22;
      const w=5+Math.random()*7;
      const h=circle?w:(8+Math.random()*11);

      const confettiColor=colors[Math.floor(Math.random()*colors.length)];
      piece.style.backgroundColor=confettiColor;
      piece.style.color=confettiColor;
      piece.style.setProperty('--x',`${Math.random()*100}%`);
      piece.style.setProperty('--w',`${w.toFixed(1)}px`);
      piece.style.setProperty('--h',`${h.toFixed(1)}px`);
      piece.style.setProperty('--radius',circle?'50%':`${Math.random()*2.5}px`);
      piece.style.setProperty('--drift',`${(-110+Math.random()*220).toFixed(0)}px`);
      piece.style.setProperty('--delay',`${(Math.random()*1.25).toFixed(2)}s`);
      piece.style.setProperty('--dur',`${(3.1+Math.random()*2.4).toFixed(2)}s`);
      piece.style.setProperty('--rot',`${Math.floor(Math.random()*360)}deg`);
      piece.style.setProperty('--scale',`${(0.72+Math.random()*0.75).toFixed(2)}`);
      layer.appendChild(piece);
    }

    document.body.appendChild(layer);
    setTimeout(()=>layer.remove(),6500);
  }

  function showToast(message,ms=2600){if(!els.toast)return;els.toast.textContent=message;els.toast.classList.remove('hidden');clearTimeout(showToast._t);showToast._t=setTimeout(()=>els.toast.classList.add('hidden'),ms);}

  const LEGACY_NOTES_CACHE_PREFIX='aghuNotes.notesCache:';
  const LEGACY_LABELS_CACHE_PREFIX='aghuNotes.labelsCache:';
  const LEGACY_DRAFT_PREFIX='aghuNotes.draft:';

  let localDbPromise=null;

  function persistenceError(err){
    console.error('Persistência local:',err);
    const name=String(err?.name||'');
    if(name==='QuotaExceededError'){
      showToast('O espaço reservado pelo navegador para este app está cheio. Sincronize e libere espaço.',5000);
    }else if(name==='SecurityError'||name==='InvalidStateError'){
      showToast('O navegador bloqueou o armazenamento local deste app.',4500);
    }else{
      showToast('Não foi possível salvar a cópia local neste aparelho.',4200);
    }
  }

  function openLocalDb(){
    if(localDbPromise)return localDbPromise;

    const DB_NAME='AGHUNotesLocal';
    const REQUIRED_STORES=['cache','drafts','attachments','notes'];

    function configureSchema(db,tx){
      if(!db.objectStoreNames.contains('cache')){
        db.createObjectStore('cache',{keyPath:'key'});
      }

      for(const storeName of ['drafts','attachments','notes']){
        let store;
        if(!db.objectStoreNames.contains(storeName)){
          store=db.createObjectStore(storeName,{keyPath:storeName==='attachments'?'id':'key'});
        }else if(tx){
          store=tx.objectStore(storeName);
        }
        if(store){
          if(!store.indexNames.contains('userId'))store.createIndex('userId','userId',{unique:false});
          if(!store.indexNames.contains('noteId'))store.createIndex('noteId','noteId',{unique:false});
        }
      }
    }

    function schemaComplete(db){
      if(REQUIRED_STORES.some(name=>!db.objectStoreNames.contains(name)))return false;
      try{
        const tx=db.transaction(['drafts','attachments','notes'],'readonly');
        for(const storeName of ['drafts','attachments','notes']){
          const store=tx.objectStore(storeName);
          if(!store.indexNames.contains('userId')||!store.indexNames.contains('noteId'))return false;
        }
        return true;
      }catch{
        return false;
      }
    }

    function openAnyVersion(){
      return new Promise((resolve,reject)=>{
        // Não fixa uma versão antiga. Assim, uma instalação que já possua um
        // IndexedDB mais novo continua abrindo normalmente, sem VersionError.
        const req=indexedDB.open(DB_NAME);
        req.onupgradeneeded=()=>configureSchema(req.result,req.transaction);
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error);
        req.onblocked=()=>reject(new Error('IndexedDB bloqueado por outra aba.'));
      });
    }

    function repairSchema(db){
      if(schemaComplete(db))return Promise.resolve(db);
      const nextVersion=Math.max(1,Number(db.version)||1)+1;
      db.close();
      return new Promise((resolve,reject)=>{
        const req=indexedDB.open(DB_NAME,nextVersion);
        req.onupgradeneeded=()=>configureSchema(req.result,req.transaction);
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error);
        req.onblocked=()=>reject(new Error('IndexedDB bloqueado por outra aba. Feche outras abas do AGHU Notes e tente novamente.'));
      });
    }

    localDbPromise=openAnyVersion()
      .then(repairSchema)
      .then(db=>{
        db.onversionchange=()=>{
          try{db.close()}catch{}
          localDbPromise=null;
        };
        return db;
      })
      .catch(err=>{
        localDbPromise=null;
        throw err;
      });

    return localDbPromise;
  }

  async function idbGet(store,key){
    const db=await openLocalDb();
    const row=await new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly');
      const req=tx.objectStore(store).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
    if(!row)return null;
    try{
      if(store==='cache'&&row.encryptedValue){
        return {...row,value:await window.AGhuLocalCrypto.decryptJson(row.encryptedValue)};
      }
      if(store==='cache'&&'value' in row&&window.AGhuLocalCrypto.ready()){
        idbPut(store,row).catch(()=>{});
      }
      return row;
    }catch(err){throw new Error('Falha ao descriptografar cache local.')}
  }

  async function idbPut(store,value){
    let stored={...value};
    if(window.AGhuLocalCrypto?.ready()){
      if(store==='cache'&&'value' in stored){
        stored.encryptedValue=await window.AGhuLocalCrypto.encryptJson(stored.value);
        delete stored.value;
      }else if(store==='drafts'&&stored.data){
        stored.encryptedData=await window.AGhuLocalCrypto.encryptJson(stored.data);
        delete stored.data;
      }else if(store==='attachments'&&stored.blob){
        stored.encryptedBlob=await window.AGhuLocalCrypto.encryptBlob(stored.blob);
        delete stored.blob;
      }
    }
    const db=await openLocalDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).put(stored);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||new Error('Transação abortada.'));
    });
  }

  async function idbDelete(store,key){
    const db=await openLocalDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error);
    });
  }

  async function idbGetAllByIndex(store,indexName,value){
    const db=await openLocalDb();
    const rows=await new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly');
      const req=tx.objectStore(store).index(indexName).getAll(value);
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>reject(req.error);
    });
    const out=[];
    for(const row of rows){
      try{
        if(store==='drafts'&&row.encryptedData){
          out.push({...row,data:await window.AGhuLocalCrypto.decryptJson(row.encryptedData)});
        }else if(store==='attachments'&&row.encryptedBlob){
          out.push({...row,blob:await window.AGhuLocalCrypto.decryptBlob(row.encryptedBlob)});
        }else{
          out.push(row);
          if(window.AGhuLocalCrypto?.ready() &&
             ((store==='drafts'&&row.data)||(store==='attachments'&&row.blob))){
            idbPut(store,row).catch(()=>{});
          }
        }
      }catch(err){console.warn('Registro local não pôde ser descriptografado:',err)}
    }
    return out;
  }

  function localNoteKey(noteId){
    return state.user?.id&&noteId?`${state.user.id}:${noteId}`:'';
  }

  function cloneLocalNote(note){
    if(!note)return null;
    let out;
    try{out=structuredClone(note)}catch{out=JSON.parse(JSON.stringify(note))}
    delete out.__vault_id;
    return out;
  }

  function persistLocalNote(note){
    if(!note?.id||!state.user?.id)return Promise.resolve(false);
    const noteId=note.id;
    if(isHardDeleted(noteId,state.user.id))return Promise.resolve(false);
    const snapshot=cloneLocalNote({...note,user_id:state.user.id});

    // Camada 1: espelho síncrono no localStorage. Esta gravação acontece mesmo
    // quando o IndexedDB não está disponível (inclusive em execução file://).
    const mirrorOk=writeStableMirror(snapshot,state.user.id);

    // Camada 2: IndexedDB, quando disponível.
    if(!state.localPersistenceReady)return Promise.resolve(mirrorOk);
    const previous=state.noteWriteChains.get(noteId)||Promise.resolve();
    const current=previous
      .catch(()=>{})
      .then(()=>idbPut('notes',{
        key:localNoteKey(noteId),
        userId:state.user.id,
        noteId,
        data:snapshot,
        updatedAt:Date.now()
      }))
      .then(()=>true)
      .catch(err=>{persistenceError(err);return mirrorOk});
    state.noteWriteChains.set(noteId,current);
    current.finally(()=>{
      if(state.noteWriteChains.get(noteId)===current)state.noteWriteChains.delete(noteId);
    });
    return current;
  }

  async function waitLocalNote(noteId){
    const p=state.noteWriteChains.get(noteId);
    if(!p)return true;
    try{await p;return true}catch{return false}
  }

  async function removeLocalNote(noteId){
    if(!noteId||!state.user?.id)return;
    // Exclusão definitiva remove as DUAS cópias locais. Mover para a lixeira não
    // chama esta função, logo continua preservado.
    deleteStableMirror(noteId,state.user.id);
    if(!state.localPersistenceReady)return;
    const previous=state.noteWriteChains.get(noteId)||Promise.resolve();
    await previous.catch(()=>{});
    await idbDelete('notes',localNoteKey(noteId));
  }

  async function readLocalNotes(userId){
    const merged=new Map(readStableMirrors(userId).filter(n=>n?.id).map(n=>[n.id,n]));
    if(state.localPersistenceReady){
      try{
        const rows=await idbGetAllByIndex('notes','userId',userId);
        for(const r of rows||[]){
          const n=r?.data;if(!r?.noteId||!n?.id)continue;
          const old=merged.get(n.id);
          if(!old||new Date(n.updated_at||0)>=new Date(old.updated_at||0))merged.set(n.id,n);
        }
      }catch(err){console.warn('Leitura IndexedDB de notas:',err)}
    }
    return [...merged.values()];
  }

  async function verifyDurableLocalNote(noteId,expected){
    if(!noteId||!state.user?.id)return false;
    const mirror=readStableMirrors(state.user.id).find(n=>n.id===noteId)||null;
    const matches=(saved)=>{
      if(!saved)return false;
      if(expected){
        if(compactTitleForStorage(saved.title||'')!==compactTitleForStorage(expected.title||''))return false;
        if(compactHtmlForStorage(saved.content_html||'')!==compactHtmlForStorage(expected.content_html||''))return false;
      }
      return true;
    };
    if(matches(mirror))return true;
    if(!state.localPersistenceReady)return false;
    try{
      await waitLocalNote(noteId);
      const row=await idbGet('notes',localNoteKey(noteId));
      return matches(row?.data);
    }catch(err){
      console.warn('Falha ao confirmar cópia local da nota:',err);
      return false;
    }
  }


  function notesCacheId(){return state.user?`notes:${state.user.id}`:null;}
  function labelsCacheId(){return state.user?`labels:${state.user.id}`:null;}
  function draftId(noteId){return state.user?`${state.user.id}:${noteId}`:null;}

  async function migrateLegacyLocalStorage(userId){
    try{
      const notesKey=LEGACY_NOTES_CACHE_PREFIX+userId;
      const labelsKey=LEGACY_LABELS_CACHE_PREFIX+userId;

      const rawNotes=localStorage.getItem(notesKey);
      if(rawNotes){
        try{
          const value=JSON.parse(rawNotes);
          await idbPut('cache',{key:`notes:${userId}`,value,updatedAt:Date.now()});
        }catch{}
        localStorage.removeItem(notesKey);
      }

      const rawLabels=localStorage.getItem(labelsKey);
      if(rawLabels){
        try{
          const value=JSON.parse(rawLabels);
          await idbPut('cache',{key:`labels:${userId}`,value,updatedAt:Date.now()});
        }catch{}
        localStorage.removeItem(labelsKey);
      }

      const prefix=LEGACY_DRAFT_PREFIX+userId+':';
      const keys=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k&&k.startsWith(prefix))keys.push(k);
      }
      for(const k of keys){
        try{
          const data=JSON.parse(localStorage.getItem(k)||'null');
          if(data?.id){
            await idbPut('drafts',{
              key:`${userId}:${data.id}`,userId,noteId:data.id,data,updatedAt:Date.now()
            });
          }
        }catch{}
        localStorage.removeItem(k);
      }
    }catch(err){
      console.warn('Migração local:',err);
    }
  }

  async function initLocalPersistence(userId){
    // O espelho local é carregado ANTES do IndexedDB. Assim abrir o index.html
    // diretamente no navegador não deixa a lista vazia se o IndexedDB falhar.
    const mirrorNotes=readStableMirrors(userId);
    if(mirrorNotes.length){
      state.localNotesCache=mirrorNotes.map(n=>cloneLocalNote(n)).filter(Boolean);
    }
    try{
      await openLocalDb();
      state.localPersistenceReady=true;
      await migrateLegacyLocalStorage(userId);

      const [notesRec,labelsRec,draftRows,noteRows]=await Promise.all([
        idbGet('cache',`notes:${userId}`),
        idbGet('cache',`labels:${userId}`),
        idbGetAllByIndex('drafts','userId',userId),
        idbGetAllByIndex('notes','userId',userId)
      ]);

      const individual=(noteRows||[]).filter(r=>r?.noteId&&r?.data).map(r=>r.data);
      const legacy=Array.isArray(notesRec?.value)?notesRec.value:[];
      const merged=new Map();

      for(const n of mirrorNotes){
        if(n?.id)merged.set(n.id,n);
      }
      for(const n of individual){
        if(n?.id)merged.set(n.id,n);
      }
      for(const n of legacy){
        if(!n?.id)continue;
        const old=merged.get(n.id);
        if(!old||new Date(n.updated_at||0)>new Date(old.updated_at||0))merged.set(n.id,n);
      }

      state.localDrafts=new Map(
        (draftRows||[]).filter(r=>r?.noteId&&r?.data).map(r=>[r.noteId,r.data])
      );

      // Um rascunho jamais deve ficar sem sua nota-base local.
      for(const d of state.localDrafts.values()){
        if(!d?.id)continue;
        const old=merged.get(d.id);
        if(!old){
          merged.set(d.id,{
            id:d.id,user_id:userId,title:d.title||'Nova nota',content_html:d.content_html||'',
            color:d.color||'#ffffff',reminder_at:d.reminder_at||null,
            created_at:d.created_at||d.updated_at||new Date().toISOString(),
            updated_at:d.updated_at||new Date().toISOString(),
            synthetic_local:d.synthetic_local,synthetic_age:d.synthetic_age,
            synthetic_record:d.synthetic_record,patient_meta:d.patient_meta||{},
            pinned:false,archived:false,deleted:false,
            local_only:!!d.pending_create,note_labels:[],attachments:[]
          });
        }else if(!d.metadata_only&&new Date(d.updated_at||0)>new Date(old.updated_at||0)){
          Object.assign(old,{
            title:d.title,content_html:d.content_html,color:d.color||old.color,
            reminder_at:d.reminder_at,patient_meta:d.patient_meta||old.patient_meta||{},
            updated_at:d.updated_at,local_only:!!d.pending_create
          });
        }
      }

      // Exclusões definitivas sempre vencem snapshots, espelhos e rascunhos antigos.
      const hardIds=hardDeletedIds(userId);
      for(const id of hardIds){
        merged.delete(id);
        state.localDrafts.delete(id);
        deleteStableMirror(id,userId);
        try{localStorage.removeItem(`${V64_JOURNAL_PREFIX}${userId}:${id}`)}catch{}
        idbDelete('notes',`${userId}:${id}`).catch(()=>{});
        idbDelete('drafts',`${userId}:${id}`).catch(()=>{});
      }

      state.localNotesCache=[...merged.values()].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
      state.localLabelsCache=Array.isArray(labelsRec?.value)?labelsRec.value:[];

      // Migração v3: cria um registro individual por nota. Nunca apaga por ausência no snapshot.
      for(const n of state.localNotesCache)persistLocalNote(n);
    }catch(err){
      state.localPersistenceReady=false;
      if(mirrorNotes.length){
        const mergedFallback=new Map((state.localNotesCache||[]).filter(n=>n?.id).map(n=>[n.id,n]));
        for(const n of mirrorNotes){
          if(!n?.id)continue;const old=mergedFallback.get(n.id);
          if(!old||new Date(n.updated_at||0)>=new Date(old.updated_at||0))mergedFallback.set(n.id,n);
        }
        state.localNotesCache=[...mergedFallback.values()];
      }else state.localNotesCache=state.localNotesCache||[];
      state.localLabelsCache=state.localLabelsCache||[];
      state.localDrafts=state.localDrafts||new Map();
      persistenceError(err);
    }
  }

  function cacheNotes(){
    state.localNotesCache=state.notes
      .filter(n=>n?.id&&!isHardDeleted(n.id,state.user?.id))
      .map(n=>cloneLocalNote(n)).filter(Boolean);
    if(!state.user||!state.localPersistenceReady)return;

    // Persistência por registro: uma leitura vazia da nuvem nunca apaga as notas locais.
    for(const n of state.localNotesCache)persistLocalNote(n);

    // Snapshot legado mantido apenas para compatibilidade. Escritas são serializadas.
    const snapshot=state.localNotesCache.map(n=>cloneLocalNote(n));
    state.cacheSnapshotChain=state.cacheSnapshotChain
      .catch(()=>{})
      .then(()=>idbPut('cache',{
        key:notesCacheId(),value:snapshot,updatedAt:Date.now()
      }))
      .catch(persistenceError);
  }

  function cacheLabels(){
    state.localLabelsCache=state.labels.map(l=>({...l}));
    if(!state.user||!state.localPersistenceReady)return;
    idbPut('cache',{
      key:labelsCacheId(),value:state.localLabelsCache,updatedAt:Date.now()
    }).catch(persistenceError);
  }

  function setAutosave(text,mode=''){
    els.autosave.textContent=text;
    els.autosave.classList.remove('local-saved','cloud-saved','save-error');
    if(mode)els.autosave.classList.add(mode);
  }

  function compactHtmlForStorage(value=''){
    return String(value||'')
      .replace(/\u0000/g,'')
      .replace(/[\u200B\uFEFF]/g,'')
      .replace(/<!--[\s\S]*?-->/g,'')
      .trim();
  }

  function compactTitleForStorage(value=''){
    return String(value||'')
      .replace(/\u00a0/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,300);
  }

  function buildDraft(){
    if(!state.current)return null;
    return {
      id:state.current.id,
      user_id:state.user.id,
      title:compactTitleForStorage(els.title.value)||'Sem título',
      content_html:compactHtmlForStorage(els.body.innerHTML),
      color:els.color.value,
      reminder_at:els.reminder.value?new Date(els.reminder.value).toISOString():null,
      labels_text:els.labelsInput.value||'',
      updated_at:new Date().toISOString(),
      created_at:state.current.created_at||new Date().toISOString(),
      synthetic_local:state.current.synthetic_local,
      synthetic_age:state.current.synthetic_age,
      synthetic_record:state.current.synthetic_record,
      patient_meta:state.current.patient_meta||{},
      google_doc_id:state.current.google_doc_id||null,
      pending_create:!!state.current.local_only
    };
  }

  function queueDraftWrite(d){
    if(!d||!state.localPersistenceReady||!state.user)return Promise.resolve(false);
    const noteId=d.id;
    if(isHardDeleted(noteId,state.user.id))return Promise.resolve(false);
    const snapshot=JSON.parse(JSON.stringify(d));
    const previous=state.draftWriteChains.get(noteId)||Promise.resolve();

    const current=previous
      .catch(()=>{})
      .then(()=>idbPut('drafts',{
        key:draftId(noteId),
        userId:state.user.id,
        noteId,
        data:snapshot,
        updatedAt:Date.now()
      }))
      .catch(err=>{
        persistenceError(err);
        return false;
      });

    state.draftWriteChains.set(noteId,current);
    current.finally(()=>{
      if(state.draftWriteChains.get(noteId)===current){
        state.draftWriteChains.delete(noteId);
      }
    });
    return current;
  }

  async function waitDraftWrite(noteId){
    const p=state.draftWriteChains.get(noteId);
    if(!p)return true;
    try{await p;return true}catch{return false}
  }

  function persistDraftNow(){
    const d=buildDraft();
    if(!d)return null;

    d.revision=state.editRevision;
    state.localDrafts.set(d.id,d);

    const idx=state.notes.findIndex(n=>n.id===d.id);
    const patch={
      title:d.title,content_html:d.content_html,color:d.color,
      reminder_at:d.reminder_at,patient_meta:d.patient_meta||{},
      google_doc_id:d.google_doc_id||state.current.google_doc_id||null,
      updated_at:d.updated_at,local_only:!!d.pending_create
    };
    if(idx>=0){
      Object.assign(state.notes[idx],patch);
      persistLocalNote(state.notes[idx]);
    }
    Object.assign(state.current,patch);
    cacheNotes();
    v64WriteJournal({...state.current,...patch,id:d.id,user_id:state.user.id});

    if(state.localPersistenceReady)queueDraftWrite(d);
    return d;
  }

  function getDraft(noteId){
    return state.localDrafts.get(noteId)||null;
  }

  function clearDraft(noteId){
    state.localDrafts.delete(noteId);
    v64DeleteJournal(noteId);
    if(state.localPersistenceReady&&state.user){
      const previous=state.draftWriteChains.get(noteId)||Promise.resolve();
      const current=previous
        .catch(()=>{})
        .then(()=>idbDelete('drafts',draftId(noteId)))
        .catch(err=>console.warn('Falha ao limpar rascunho local:',err));

      state.draftWriteChains.set(noteId,current);
      current.finally(()=>{
        if(state.draftWriteChains.get(noteId)===current){
          state.draftWriteChains.delete(noteId);
        }
      });
    }
  }

  function pendingDrafts(){
    return [...state.localDrafts.values()]
      .filter(d=>d&&d.id&&!isHardDeleted(d.id,state.user?.id))
      .sort((a,b)=>new Date(a.updated_at)-new Date(b.updated_at));
  }

  async function queueLocalAttachment(blob,fileName,noteId){
    if(!state.localPersistenceReady)throw new Error('IndexedDB indisponível.');
    const item={
      id:crypto.randomUUID(),
      userId:state.user.id,
      noteId,
      fileName:fileName||`arquivo-${Date.now()}`,
      blob,
      createdAt:Date.now()
    };
    await idbPut('attachments',item);
    return item;
  }

  async function localAttachmentsForNote(noteId){
    if(!state.localPersistenceReady||!state.user)return[];
    const rows=await idbGetAllByIndex('attachments','noteId',noteId);
    return (rows||[]).filter(r=>r.userId===state.user.id);
  }

  async function deleteLocalAttachment(id){
    if(!state.localPersistenceReady)return;
    await idbDelete('attachments',id);
  }

  async function deleteLocalAttachmentsForNote(noteId){
    const rows=await localAttachmentsForNote(noteId);
    for(const row of rows)await deleteLocalAttachment(row.id);
  }

  async function syncPendingLocalAttachments(){
    if(!true||!state.user||!state.localPersistenceReady)return;
    const rows=await idbGetAllByIndex('attachments','userId',state.user.id);
    for(const item of rows){
      try{
        const noteExists=state.notes.some(n=>n.id===item.noteId&&!n.local_only);
        if(!noteExists)continue;

        const safe=(item.fileName||'arquivo').replace(/[^a-zA-Z0-9._-]/g,'_');
        const path=`${state.user.id}/${item.noteId}/${Date.now()}-${safe}`;
        const up=await supabase.storage.from('note-images').upload(path,item.blob,{upsert:false});
        if(up.error)continue;

        const {error}=await supabase.from('attachments').insert({
          user_id:state.user.id,note_id:item.noteId,storage_path:path,
          public_url:'',file_name:item.fileName||safe
        });
        if(error){
          await supabase.storage.from('note-images').remove([path]);
          continue;
        }
        await deleteLocalAttachment(item.id);
      }catch(err){
        console.warn('Anexo local pendente:',err);
      }
    }
  }

  function deviceSyncKey(userId){return `aghuNotes.syncConfirmed:${userId}`;}
  async function confirmFirstDeviceSync(){ return true; }

  function compactAge(value=''){
    const s=String(value||'')
      .replace(/\u00a0/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
    if(!s)return '';

    // 8 anos e 7 meses / 8 anos, 7 meses / 8a 7m / 8a7m
    let m=s.match(/\b(\d{1,3})\s*(?:anos?|ano|a)\s*(?:(?:e|,|\+)?\s*(\d{1,2})\s*(?:meses?|m[eê]s|m))?\b/i);
    if(m){
      const y=Number(m[1]), mo=m[2]!==undefined?Number(m[2]):null;
      return mo!==null?`${y}a ${mo}m`:String(y);
    }

    // Somente meses.
    m=s.match(/\b(\d{1,2})\s*(?:meses?|m[eê]s|m)\b/i);
    if(m)return `${Number(m[1])}m`;

    // Somente número em campo explicitamente de idade.
    m=s.match(/^\s*(\d{1,3})\s*$/);
    return m?String(Number(m[1])):'';
  }

  function calculateAgeFromBirthDate(value=''){
    const s=String(value).trim();
    const m=s.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);
    if(!m)return '';
    const birth=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
    if(Number.isNaN(birth.getTime()))return '';
    const now=new Date();
    let years=now.getFullYear()-birth.getFullYear();
    let months=now.getMonth()-birth.getMonth();
    if(now.getDate()<birth.getDate())months--;
    if(months<0){years--;months+=12;}
    if(years<0||years>120)return '';
    if(years===0)return `${Math.max(0,months)}m`;
    return months>0?`${years}a ${months}m`:String(years);
  }

  function noteTextForMetadata(note){
    const title=String(note?.title||'');
    const html=String(note?.content_html||'')
      .replace(/<br\s*\/?>/gi,'\n')
      .replace(/<(?:div|p|h[1-6]|li|tr|td|section|article)\b[^>]*>/gi,'\n')
      .replace(/<\/(?:div|p|h[1-6]|li|tr|td|section|article)>/gi,'\n');
    const body=stripHtml(html);
    return `${title}\n${body}`
      .replace(/\u00a0/g,' ')
      .replace(/\r/g,'\n')
      .replace(/[ \t]+/g,' ')
      .replace(/\n[ \t]+/g,'\n')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }

  function cleanPatientName(value=''){
    let s=String(value||'')
      .replace(/\u00a0/g,' ')
      .replace(/\s+/g,' ')
      .trim();

    // Corta qualquer campo clínico que venha depois do nome na mesma linha.
    s=s.replace(/\s*(?:[|;]|\s+-\s+)\s*(?:idade|dn|data\s+de\s+nascimento|nascimento|sexo|m[aã]e|pai|respons[aá]vel|proced[eê]ncia|naturalidade|prontu[aá]rio|pront\.?|pol)\b.*$/i,'').trim();

    // Corta idade anexada ao nome: "MARIA, 8 anos e 7 meses".
    s=s.replace(/\s*,?\s*\d{1,3}\s*(?:anos?|ano|a)\s*(?:(?:e|,|\+)?\s*\d{1,2}\s*(?:meses?|m[eê]s|m))?.*$/i,'').trim();
    s=s.replace(/\s*,?\s*\d{1,2}\s*(?:meses?|m[eê]s)\b.*$/i,'').trim();

    // Corta outros rótulos colados.
    s=s.replace(/\s+(?:idade|dn|data\s+de\s+nascimento|sexo|prontu[aá]rio|pront\.?|pol)\s*[:=#\-–].*$/i,'').trim();

    return s.replace(/^[\s:;,\-–]+|[\s:;,\-–]+$/g,'').trim();
  }

  function autoExtractPatientMetadata(note){
    const whole=noteTextForMetadata(note);
    const lines=whole.split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    let name='',age='',record='';

    // NOME: aceita os rótulos em qualquer ponto do texto/linha.
    const nameLabel=/(?:^|[\n;|])\s*(?:id|identifica(?:ç|c)[aã]o|nome(?:\s+(?:do|da)\s+paciente)?|paciente)\s*(?:[:=#\-–]+)\s*([^\n;|]+)/ig;
    let m;
    while((m=nameLabel.exec(`\n${whole}`))){
      const candidate=cleanPatientName(m[1]);
      const compact=candidate.replace(/[\s./-]/g,'');
      if(candidate.length>=3 && !/^\d+$/.test(compact)){
        name=candidate;
        break;
      }
    }

    // Segunda tentativa: rótulo e valor em linhas separadas.
    if(!name){
      for(let i=0;i<lines.length-1;i++){
        if(/^(?:id|identifica(?:ç|c)[aã]o|nome(?:\s+(?:do|da)\s+paciente)?|paciente)\s*[:=#\-–]*$/i.test(lines[i])){
          const candidate=cleanPatientName(lines[i+1]);
          if(candidate && !/^\d+$/.test(candidate.replace(/\D/g,''))){
            name=candidate;break;
          }
        }
      }
    }

    // ID com nome + idade, mesmo sem quebra.
    if(!name){
      for(const line of lines){
        const mm=line.match(/\bID\s*[:=#\-–]\s*([A-ZÀ-Ü][A-ZÀ-Üa-zà-ü'´`^~.\- ]{2,})(?=\s*,?\s*\d{1,3}\s*(?:anos?|ano|a)\b)/i);
        if(mm){name=cleanPatientName(mm[1]);break;}
      }
    }

    // IDADE: primeiro campo explicitamente rotulado.
    m=whole.match(/(?:^|[\n;|])\s*idade\s*(?:[:=#\-–]+)\s*([^\n;|]+)/i);
    if(m)age=compactAge(m[1]);

    // Idade junto de ID / identificação / nome.
    if(!age){
      for(const line of lines){
        if(!/\b(?:id|identifica(?:ç|c)[aã]o|nome|paciente)\b/i.test(line))continue;
        const a=compactAge(line);
        if(a){age=a;break;}
      }
    }

    // Fallback: idade inequívoca no texto.
    if(!age){
      const ageMatch=whole.match(/\b\d{1,3}\s*(?:anos?|ano|a)\s*(?:(?:e|,|\+)?\s*\d{1,2}\s*(?:meses?|m[eê]s|m))?\b|\b\d{1,2}\s*(?:meses?|m[eê]s)\b/i);
      if(ageMatch)age=compactAge(ageMatch[0]);
    }

    // Se não houver idade, deriva da data de nascimento.
    if(!age){
      const birth=whole.match(/(?:data\s+de\s+nascimento|nascimento|dn)\s*(?:[:=#\-–]+)\s*([^\n;|]+)/i);
      if(birth)age=calculateAgeFromBirthDate(birth[1]);
    }

    // PRONTUÁRIO / POL: mais flexível, aceita ponto, espaço e hífen no número.
    const recordPatterns=[
      /(?:^|[\n;|])\s*(?:prontu[aá]rio|pront\.?|pol)\s*(?:n(?:[º°o]|ro)?\.?)?\s*(?:[:=#\-–]+)?\s*([0-9][0-9 .\/-]{2,}[0-9]|[0-9]{3,})/i,
      /\b(?:prontu[aá]rio|pront\.?|pol)\b[^\d\n]{0,12}(\d{4,})\b/i
    ];
    for(const rx of recordPatterns){
      m=whole.match(rx);
      if(m){
        record=String(m[1]).replace(/\s+/g,'').replace(/[.,;:]+$/,'');
        break;
      }
    }

    return {name,age,record};
  }

  function extractPatientMetadata(note){
    const auto=autoExtractPatientMetadata(note);
    const manual=(note?.patient_meta&&typeof note.patient_meta==='object')?note.patient_meta:{};

    const manualName=String(manual.name||'').trim();
    const manualAge=String(manual.age||'').trim();
    const manualRecord=String(manual.record||'').trim();

    return {
      name:manualName||auto.name||note?.title||'Sem título',
      age:manualAge||auto.age||String(note?.synthetic_age??'-'),
      record:manualRecord||auto.record||String(note?.synthetic_record??'-'),
      recognized:{
        name:!!(manualName||auto.name),
        age:!!(manualAge||auto.age),
        record:!!(manualRecord||auto.record)
      },
      manual:{
        name:!!manualName,
        age:!!manualAge,
        record:!!manualRecord
      },
      auto
    };
  }

  function randomMeta(){
    const ward = Math.floor(Math.random()*9)+1;
    const room = String(Math.floor(Math.random()*390)+101);
    const bed = String(Math.floor(Math.random()*4)+1).padStart(4,'0');
    return { synthetic_local:`L:UN${ward}.${room}-${bed}`, synthetic_age:Math.floor(Math.random()*86), synthetic_record:Math.floor(Math.random()*8999999)+1000000 };
  }


  function syncKeepModeControls(){
    if(els.keepModeToggle) els.keepModeToggle.checked=state.keepFocusMode;
    if(els.keepModeOverlayToggle) els.keepModeOverlayToggle.checked=state.keepFocusMode;
  }
  function applyKeepFocusMode(active=state.keepFocusMode){
    document.body.classList.toggle('keep-focus-mode',!!active);
    if(els.keepFocusBar) els.keepFocusBar.classList.toggle('hidden',!active);
    syncKeepModeControls();
  }
  function setKeepFocusMode(enabled){
    state.keepFocusMode=!!enabled;
    localStorage.setItem('aghuNotes.keepFocusMode',state.keepFocusMode?'1':'0');
    applyKeepFocusMode(state.keepFocusMode);
  }
  function setTopTabState(which){
    const keepActive=which==='keep';
    els.keepTab?.classList.toggle('active',keepActive);
    els.panelTab?.classList.toggle('active',!keepActive);
    els.keepMenu?.classList.toggle('active',keepActive);
    els.panelMenu?.classList.toggle('active',!keepActive);
    if(els.keepTab) els.keepTab.setAttribute('aria-selected',keepActive?'true':'false');
  }

  function showPanelGeneral(){
    if(state.current&&state.isDirty)persistDraftNow();
    document.body.classList.remove('keep-focus-mode');
    els.keepFocusBar?.classList.add('hidden');
    els.keepPage.classList.add('hidden');
    els.editorPage.classList.add('hidden');
    els.panelPage?.classList.remove('hidden');
    state.current=null;
    setTopTabState('panel');
  }

  function openKeepModule(){
    els.panelPage?.classList.add('hidden');
    if(els.keepTab){
      els.keepTab.style.removeProperty('display');
      els.keepTab.classList.remove('hidden');
    }
    els.editorPage.classList.add('hidden');
    els.keepPage.classList.remove('hidden');
    state.current=null;
    setTopTabState('keep');
    applyKeepFocusMode(state.keepFocusMode);
    if(!state.keepFocusMode&&window.matchMedia('(max-width:700px)').matches)document.querySelector('.sidebar')?.classList.add('collapsed');
    renderNotes();
  }

  async function closeKeepModule(){
    if(state.isDirty) await flushSave();
    document.body.classList.remove('keep-focus-mode');
    els.keepFocusBar?.classList.add('hidden');
    if(els.keepTab){
      els.keepTab.classList.add('hidden');
      els.keepTab.style.setProperty('display','none','important');
    }
    showPanelGeneral();
  }

  async function closeElevatedWindow(){
    if(state.isDirty) await flushSave();
    document.body.classList.remove('keep-focus-mode');
    els.keepFocusBar?.classList.add('hidden');
    els.keepPage.classList.add('hidden');
    els.editorPage.classList.add('hidden');
    els.panelPage?.classList.remove('hidden');
    state.current=null;
    setTopTabState('panel');
    // A preferência "Abrir em primeiro plano" continua marcada.
    // Ao abrir Notas novamente, ele volta elevado.
    syncKeepModeControls();
  }

  els.keepModeToggle?.addEventListener('change',e=>setKeepFocusMode(e.target.checked));
  els.keepModeOverlayToggle?.addEventListener('change',e=>setKeepFocusMode(e.target.checked));
  els.closeFocusWindow?.addEventListener('click',closeElevatedWindow);
  els.closeKeepTab?.addEventListener('click',async e=>{e.stopPropagation();await closeKeepModule();});
  els.keepTabOpen?.addEventListener('click',openKeepModule);
  els.panelTab?.addEventListener('click',showPanelGeneral);
  els.panelMenu?.addEventListener('click',showPanelGeneral);
  syncKeepModeControls();

  async function bootstrap(){
    if(!configured){els.auth.classList.remove('hidden');els.loginError.textContent='Configure o Supabase na seção APP_CONFIG deste index antes do primeiro uso.';return;}
    const {data}=await supabase.auth.getSession();
    if(data.session)await enterApp(data.session.user);else showAuth();
    supabase.auth.onAuthStateChange(async(_event,session)=>{
      if(!session){if(state.user)showAuth();return;}
      if(!state.user||state.user.id!==session.user.id)await enterApp(session.user);
    });
    if(window.matchMedia('(max-width:700px)').matches)document.querySelector('.sidebar')?.classList.add('collapsed');
  }
  async function showAdminLogin(){
    els.adminLoginError.textContent='';
    els.adminIdentifier.value=localStorage.getItem('aghuNotes.adminLogin')||els.loginEmail.value||'';
    els.adminPasswordInput.value='';els.adminConfirmWrap.classList.add('hidden');
    els.adminLoginTitle.textContent='Administrador';els.adminSetupHelp.textContent='Entre com sua conta Administrador. No primeiro acesso desta versão, a conta principal pode ser ativada automaticamente.';els.adminLoginSubmit.textContent='Entrar';
    els.adminLoginDialog.showModal();
  }
  async function renderAdminUsers(){
    if(!state.adminActive)return;const us=await AGhuLocalAdmin.listUsers();
    els.adminUsersBody.innerHTML=us.map(u=>`<tr><td>${esc(u.email)}</td><td class="admin-password">••••••</td><td>${u.createdAt?new Date(u.createdAt).toLocaleString('pt-BR'):'-'}</td><td>${u.active?'Ativo':'Bloqueado'}</td><td><div class="admin-user-actions"><button data-toggle-user="${u.id}">${u.active?'Bloquear':'Ativar'}</button></div></td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;padding:25px;color:#888">Nenhum login cadastrado.</td></tr>';
    els.adminUsersBody.querySelectorAll('[data-toggle-user]').forEach(b=>b.onclick=async()=>{try{await AGhuLocalAdmin.toggleUser(b.dataset.toggleUser);await renderAdminUsers()}catch(e){alert(e.message||String(e))}});
  }

  let adminSalesTest=null;

  async function adminSalesTestFunction(action,payload={}){
    const raw=window.AGhuCloudRaw;
    if(!raw)throw Error('Conexão Supabase indisponível.');
    const s=await raw.auth.getSession();
    const token=s.data?.session?.access_token;
    if(!token)throw Error('Sessão do Administrador expirada.');
    const cfg=window.AGhuCloudConfig||{};
    const base=cfg.SUPABASE_URL||'https://imwwqdgovfxhntsdkxlz.supabase.co';
    const key=cfg.SUPABASE_ANON_KEY||'';
    const r=await fetch(`${base}/functions/v1/test-sales`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':key,'Authorization':`Bearer ${token}`},
      body:JSON.stringify({action,...payload})
    });
    let d={};try{d=await r.json()}catch{}
    if(!r.ok)throw Error(d.error||`Falha HTTP ${r.status}`);
    return d;
  }

  function showAdminPage(which){
    const users=which!=='sales';
    els.adminUsersPage?.classList.toggle('hidden',!users);
    els.adminSalesTestPage?.classList.toggle('hidden',users);
    els.adminUsersMenuBtn?.classList.toggle('active',users);
    els.adminSalesTestMenuBtn?.classList.toggle('active',!users);
    els.adminUsersTabBtn?.classList.toggle('active',users);
    els.adminSalesTestTabBtn?.classList.toggle('active',!users);
    if(els.adminTopTitle)els.adminTopTitle.textContent=users?'Administrador — Usuários e acessos':'Administrador — Homologação de vendas';
  }

  function setAdminTestStatus(message,type=''){
    if(!els.adminTestStatus)return;
    els.adminTestStatus.textContent=message||'';
    els.adminTestStatus.className=`admin-test-status${type?` ${type}`:''}`;
  }

  function renderAdminTest(data=adminSalesTest){
    if(!data){
      els.adminTestMeta.textContent='Nenhum ciclo de teste iniciado.';
      els.adminTestApproveBtn.disabled=true;
      els.adminTestOpenActivationBtn.disabled=true;
      els.adminTestCopyActivationBtn.disabled=true;
      els.adminTestRefreshBtn.disabled=true;
      els.adminTestChecklist?.querySelectorAll('li').forEach(li=>li.classList.remove('ok','warn'));
      els.adminTestVerdict.textContent='Aguardando início do teste.';
      els.adminTestVerdict.className='admin-test-verdict warn';
      return;
    }
    adminSalesTest={...(adminSalesTest||{}),...data};
    const d=adminSalesTest;
    els.adminTestMeta.textContent=[
      `Ambiente: TESTE / R$ 0,00`,
      `Ordem: ${d.order_id||'-'}`,
      `Status: ${d.status||'-'} / ${d.provider_status||'-'}`,
      `Login ativado: ${d.activated_login||'-'}`,
      `Criado: ${d.created_at?new Date(d.created_at).toLocaleString('pt-BR'):'-'}`
    ].join('\n');

    els.adminTestApproveBtn.disabled=!d.order_id||!!d.checks?.payment_approved;
    els.adminTestOpenActivationBtn.disabled=!d.activation_url||!!d.activated;
    els.adminTestCopyActivationBtn.disabled=!d.activation_url||!!d.activated;
    els.adminTestRefreshBtn.disabled=!d.order_id;

    const checks=d.checks||{};
    els.adminTestChecklist?.querySelectorAll('li[data-check]').forEach(li=>{
      li.classList.remove('ok','warn');
      if(checks[li.dataset.check]===true)li.classList.add('ok');
      else if(d.order_id)li.classList.add('warn');
    });

    if(d.homologated_core){
      els.adminTestVerdict.textContent='NÚCLEO VENDAS/LOGIN HOMOLOGADO: aprovação → token → conta → uso único → perfil → login.';
      els.adminTestVerdict.className='admin-test-verdict ok';
    }else if(d.checks?.account_created&&!d.checks?.login_verified){
      els.adminTestVerdict.textContent='Conta criada. Falta apenas entrar uma vez com o novo login e atualizar o diagnóstico.';
      els.adminTestVerdict.className='admin-test-verdict warn';
    }else{
      els.adminTestVerdict.textContent='Teste em andamento. Complete as etapas até todos os itens ficarem verdes.';
      els.adminTestVerdict.className='admin-test-verdict warn';
    }
  }

  async function refreshAdminSalesTest(){
    if(!adminSalesTest?.order_id)return;
    setAdminTestStatus('Atualizando diagnóstico...');
    try{
      const d=await adminSalesTestFunction('status',{order_id:adminSalesTest.order_id});
      renderAdminTest(d);
      setAdminTestStatus('Diagnóstico atualizado.','ok');
    }catch(e){setAdminTestStatus(e.message||String(e),'error')}
  }

  els.adminUsersMenuBtn?.addEventListener('click',()=>showAdminPage('users'));
  els.adminSalesTestMenuBtn?.addEventListener('click',()=>showAdminPage('sales'));
  els.adminUsersTabBtn?.addEventListener('click',()=>showAdminPage('users'));
  els.adminSalesTestTabBtn?.addEventListener('click',()=>showAdminPage('sales'));

  els.adminTestCreateBtn?.addEventListener('click',async()=>{
    setAdminTestStatus('Criando ciclo de homologação...');
    els.adminTestCreateBtn.disabled=true;
    try{
      const stamp=new Date().toISOString().replace(/\D/g,'').slice(0,14);
      const email=(els.adminTestBuyerEmail.value||'').trim()||`homologacao+${stamp}@aghu-notes.test`;
      const name=(els.adminTestBuyerName.value||'').trim()||'Homologação AGHU Notes';
      const d=await adminSalesTestFunction('create',{buyer_name:name,buyer_email:email});
      adminSalesTest=d;
      renderAdminTest(d);
      setAdminTestStatus('Venda de teste criada. Nenhum dinheiro foi movimentado.','ok');
    }catch(e){setAdminTestStatus(e.message||String(e),'error')}
    finally{els.adminTestCreateBtn.disabled=false}
  });

  els.adminTestApproveBtn?.addEventListener('click',async()=>{
    if(!adminSalesTest?.order_id)return;
    setAdminTestStatus('Simulando confirmação do pagamento...');
    els.adminTestApproveBtn.disabled=true;
    try{
      const d=await adminSalesTestFunction('approve',{order_id:adminSalesTest.order_id});
      renderAdminTest(d);
      setAdminTestStatus('Pagamento de teste aprovado. Token real de ativação foi emitido.','ok');
    }catch(e){setAdminTestStatus(e.message||String(e),'error');els.adminTestApproveBtn.disabled=false}
  });

  els.adminTestOpenActivationBtn?.addEventListener('click',()=>{
    if(!adminSalesTest?.activation_url)return;
    window.open(adminSalesTest.activation_url,'_blank','noopener,noreferrer');
  });

  els.adminTestCopyActivationBtn?.addEventListener('click',async()=>{
    const url=adminSalesTest?.activation_url;
    if(!url)return;
    try{await navigator.clipboard.writeText(url);setAdminTestStatus('Link copiado. Para isolar a sessão do Administrador, abra-o de preferência em janela anônima.','ok')}
    catch{setAdminTestStatus('Não foi possível copiar automaticamente. Use “Abrir criação de login”.','error')}
  });

  els.adminTestRefreshBtn?.addEventListener('click',refreshAdminSalesTest);

  async function enterAdmin(){state.adminActive=true;els.auth.classList.add('hidden');els.app.classList.add('hidden');els.adminPanel.classList.remove('hidden');showAdminPage('users');await renderAdminUsers()}

  window.AGhuLocalAdmin?.onUsersChanged?.(()=>{if(state.adminActive)renderAdminUsers().catch(()=>{})});

  function exitAdmin(){AGhuLocalAdmin.logout();state.adminActive=false;state.user=null;els.adminPanel.classList.add('hidden');els.app.classList.add('hidden');els.auth.classList.remove('hidden')}
  els.adminAccess?.addEventListener('click',showAdminLogin);els.adminLoginClose?.addEventListener('click',()=>els.adminLoginDialog.close());els.adminLoginCancel?.addEventListener('click',()=>els.adminLoginDialog.close());els.adminExit?.addEventListener('click',exitAdmin);
  els.adminLoginForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    els.adminLoginError.textContent='';
    const login=els.adminIdentifier.value.trim(),p=els.adminPasswordInput.value;
    els.adminLoginSubmit.disabled=true;
    els.adminLoginSubmit.textContent='Conectando...';
    try{
      await AGhuLocalAdmin.login(login,p);
      localStorage.setItem('aghuNotes.adminLogin',login);
      els.adminLoginDialog.close();
      await enterAdmin();
    }catch(x){
      els.adminLoginError.textContent=x.message||'Não foi possível entrar como Administrador.';
    }finally{
      els.adminLoginSubmit.disabled=false;
      els.adminLoginSubmit.textContent='Entrar';
    }
  });
  els.adminCreateUserForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    els.adminCreateUserStatus.textContent='Criando acesso...';
    try{
      const created=await AGhuLocalAdmin.createUser(els.adminNewEmail.value,els.adminNewPassword.value);
      els.adminNewEmail.value='';
      els.adminNewPassword.value='';
      await renderAdminUsers();
      els.adminCreateUserStatus.textContent=`Acesso "${created.email}" criado e disponível online em qualquer dispositivo.`;
    }catch(x){
      els.adminCreateUserStatus.textContent=x.message||'Não foi possível criar o acesso.';
    }
  });

  function stopExclusiveSessionWatch(){
    if(state.exclusiveHeartbeatTimer){clearInterval(state.exclusiveHeartbeatTimer);state.exclusiveHeartbeatTimer=null}
    if(state.exclusiveCheckTimer){clearInterval(state.exclusiveCheckTimer);state.exclusiveCheckTimer=null}
    if(state.exclusiveSessionChannel){
      try{window.AGhuCloudRaw.removeChannel(state.exclusiveSessionChannel)}catch{}
      state.exclusiveSessionChannel=null;
    }
    state.exclusiveSessionId=null;
  }

  async function forceLogoutByOtherDevice(){
    if(state.forcedSessionLogout)return;
    state.forcedSessionLogout=true;
    stopExclusiveSessionWatch();
    stopSyncLoop();
    stopReminderLoop();
    try{await supabase.auth.signOut({release:false})}catch{}
    showAuth('Sua conta foi acessada em outro dispositivo.');
    state.forcedSessionLogout=false;
  }

  async function verifyExclusiveSession(){
    if(!state.user||!state.exclusiveSessionId||!navigator.onLine)return;
    try{
      const r=await window.AGhuCloudRaw.rpc('current_active_session');
      if(r.error)return;
      const active=r.data?.session_id||null;
      if(active&&active!==state.exclusiveSessionId)await forceLogoutByOtherDevice();
    }catch{}
  }

  function startExclusiveSessionWatch(user){
    stopExclusiveSessionWatch();
    const sid=user?.exclusive_session_id;
    if(!sid||!user?.id)return;
    state.exclusiveSessionId=sid;

    try{
      state.exclusiveSessionChannel=window.AGhuCloudRaw
        .channel(`aghu-exclusive-${user.id}-${sid}`)
        .on('postgres_changes',{
          event:'UPDATE',
          schema:'public',
          table:'profiles',
          filter:`id=eq.${user.id}`
        },payload=>{
          const active=payload?.new?.active_session_id||null;
          if(active&&active!==state.exclusiveSessionId)forceLogoutByOtherDevice();
        })
        .subscribe();
    }catch(e){console.warn('Sessão exclusiva realtime:',e)}

    state.exclusiveHeartbeatTimer=setInterval(async()=>{
      if(!state.user||!state.exclusiveSessionId||!navigator.onLine)return;
      try{
        const r=await window.AGhuCloudRaw.rpc('touch_active_session',{session_id_arg:state.exclusiveSessionId});
        if(!r.error&&r.data===false)await forceLogoutByOtherDevice();
      }catch{}
    },25000);

    state.exclusiveCheckTimer=setInterval(verifyExclusiveSession,45000);
    window.addEventListener('online',verifyExclusiveSession,{once:true});
  }

  function showAuth(message=''){
    els.adminPanel?.classList.add('hidden');
    stopExclusiveSessionWatch();
    stopSyncLoop();
    stopReminderLoop();
    state.user=null;
    state.current=null;state.isDirty=false;state.selectedId=null;
    state.filter='all';state.search='';state.label='';
    document.body.classList.remove('keep-focus-mode');
    els.keepFocusBar?.classList.add('hidden');
    els.app.classList.add('hidden');
    els.auth.classList.remove('hidden');
    if(message)els.loginError.textContent=message;
  }

  async function enterApp(user){
    if(state.entering)return;
    state.entering=true;
    try{
      state.user=user;
      setSidebarTheme(preferredThemeForUser(user));
      const ok=await confirmFirstDeviceSync(user);
      if(!ok){await supabase.auth.signOut();showAuth();return;}
      els.auth.classList.add('hidden');els.app.classList.remove('hidden');setSyncStatus('syncing');
      startExclusiveSessionWatch(user);
      await initLocalPersistence(user.id);
      await Promise.all([loadNotes(),loadLabels()]);
      applyNotesViewMode(state.notesViewMode);
      renderNotes();applyKeepFocusMode(state.keepFocusMode);
      if(true&&pendingDrafts().length)await syncPendingDrafts();
      if(true)await syncPendingLocalAttachments();
      if(true)setTimeout(pruneCompactHistory,1200);
      setSyncStatus(true?'ok':'offline');
      startSyncLoop();startReminderLoop();

      if(user?.first_access===true){
        setTimeout(launchFirstAccessConfetti,350);
      }
    }finally{state.entering=false;}
  }

  const rememberedEmail=localStorage.getItem('aghuNotes.lastLogin')||localStorage.getItem('aghuNotes.lastEmail')||'';
  if(rememberedEmail) els.loginEmail.value=rememberedEmail;

  function setPasswordResetStatus(target,text,type=''){
    if(!target)return;
    target.textContent=text||'';
    target.className=`password-reset-status${type?` ${type}`:''}`;
  }

  function passwordResetRedirectUrl(){
    return 'https://appcarlosfranca.github.io/aghu/?password-reset=1';
  }

  els.forgotPasswordBtn?.addEventListener('click',()=>{
    const current=String(els.loginEmail?.value||'').trim();
    els.forgotPasswordEmail.value=current.includes('@')?current:'';
    setPasswordResetStatus(els.forgotPasswordStatus,'');
    els.forgotPasswordDialog.showModal();
  });
  els.forgotPasswordClose?.addEventListener('click',()=>els.forgotPasswordDialog.close());
  els.forgotPasswordCancel?.addEventListener('click',()=>els.forgotPasswordDialog.close());
  els.forgotPasswordForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=String(els.forgotPasswordEmail.value||'').trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      setPasswordResetStatus(els.forgotPasswordStatus,'Informe um e-mail válido.','error');return;
    }
    els.forgotPasswordSend.disabled=true;
    setPasswordResetStatus(els.forgotPasswordStatus,'Enviando link seguro...');
    try{
      const {error}=await window.AGhuCloudRaw.auth.resetPasswordForEmail(email,{redirectTo:passwordResetRedirectUrl()});
      if(error)throw error;
      setPasswordResetStatus(els.forgotPasswordStatus,'Se o e-mail estiver cadastrado, o link para redefinir a senha foi enviado. Verifique também a caixa de spam.','ok');
    }catch(err){
      setPasswordResetStatus(els.forgotPasswordStatus,err?.message||'Não foi possível enviar o link de redefinição.','error');
    }finally{els.forgotPasswordSend.disabled=false;}
  });

  function openNewPasswordRecoveryDialog(){
    setPasswordResetStatus(els.newPasswordStatus,'');
    els.newPasswordInput.value='';
    els.newPasswordConfirm.value='';
    if(!els.newPasswordDialog.open)els.newPasswordDialog.showModal();
  }

  window.AGhuCloudRaw?.auth?.onAuthStateChange?.((event,session)=>{
    if(event==='PASSWORD_RECOVERY')openNewPasswordRecoveryDialog();
  });

  try{
    const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
    const code=h.get('error_code');
    if(code==='otp_expired'){
      setTimeout(()=>showAuth('O link de redefinição expirou ou já foi utilizado. Solicite um novo link em “Redefinir senha”.'),250);
    }
  }catch{}

  if(new URLSearchParams(location.search).get('password-reset')==='1'){
    setTimeout(async()=>{
      try{
        const r=await window.AGhuCloudRaw.auth.getSession();
        if(r.data?.session)openNewPasswordRecoveryDialog();
      }catch{}
    },450);
  }

  els.newPasswordForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const p=els.newPasswordInput.value;
    const c=els.newPasswordConfirm.value;
    if(p.length<6){setPasswordResetStatus(els.newPasswordStatus,'A senha deve ter pelo menos 6 caracteres.','error');return;}
    if(p!==c){setPasswordResetStatus(els.newPasswordStatus,'As senhas não coincidem.','error');return;}
    els.newPasswordSave.disabled=true;
    setPasswordResetStatus(els.newPasswordStatus,'Salvando nova senha...');
    try{
      const {error}=await window.AGhuCloudRaw.auth.updateUser({password:p});
      if(error)throw error;
      await window.AGhuCloudRaw.auth.signOut({scope:'local'}).catch(()=>{});
      try{history.replaceState({},document.title,location.pathname)}catch{}
      els.newPasswordDialog.close();
      showAuth('Senha redefinida com sucesso. Entre com a nova senha.');
    }catch(err){
      setPasswordResetStatus(els.newPasswordStatus,err?.message||'Não foi possível redefinir a senha.','error');
    }finally{els.newPasswordSave.disabled=false;}
  });

  els.login.addEventListener('submit', async e=>{
    e.preventDefault(); els.loginError.textContent='';els.loginError.style.removeProperty('color');
    const login=els.loginEmail.value.trim(),password=els.loginPassword.value;
    if(!login||!password){els.loginError.textContent='Informe login e senha.';return;}
    const {data,error}=await supabase.auth.signInWithPassword({email:login,password});
    if(error){
      const rawMsg=error.message||'';
      els.loginError.textContent=/invalid login credentials/i.test(rawMsg)
        ? 'Login ou senha inválidos. Se esta conta ainda não foi criada, solicite ao Administrador.'
        : rawMsg||'Não foi possível entrar.';
      return;
    }
    localStorage.setItem('aghuNotes.lastLogin',login);
    els.loginPassword.value='';
    await enterApp(data.user);
  });
  els.logout.addEventListener('click', async()=>{ stopExclusiveSessionWatch();stopSyncLoop(); await supabase.auth.signOut(); showAuth(); });

  let deferredInstallPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredInstallPrompt=e;
    els.installApp?.classList.remove('hidden');
  });
  els.installApp?.addEventListener('click',async()=>{
    if(!deferredInstallPrompt){showToast('Use a opção “Adicionar à tela inicial” do navegador neste aparelho.',4200);return;}
    deferredInstallPrompt.prompt();
    try{await deferredInstallPrompt.userChoice;}catch{}
    deferredInstallPrompt=null;
    els.installApp.classList.add('hidden');
  });
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;els.installApp?.classList.add('hidden');showToast('AGHU Notes instalado neste dispositivo.');});

  function setSyncStatus(status='ok'){
    if(!els.syncStatus)return;
    els.syncStatus.classList.remove('syncing','offline');
    if(!navigator.onLine){els.syncStatus.textContent='● Offline';els.syncStatus.classList.add('offline');return;}
    if(status==='syncing'){els.syncStatus.textContent='● Sincronizando';els.syncStatus.classList.add('syncing');}
    else els.syncStatus.textContent='● Nuvem';
  }

  async function syncFromCloud(){
    if(!state.user)return;
    if(!navigator.onLine){setSyncStatus('offline');return;}

    // Nunca recarrega a lista por cima de uma edição/salvamento em andamento.
    if(state.current||state.isDirty||state.saveInFlight){
      clearTimeout(state.realtimeDebounce);
      state.realtimeDebounce=setTimeout(()=>syncFromCloud(),1200);
      return;
    }

    setSyncStatus('syncing');
    await Promise.all([loadNotes(),loadLabels()]);
    if(!els.keepPage.classList.contains('hidden'))renderNotes();
    setSyncStatus('ok');
  }

  function stopRealtimeSync(){
    clearTimeout(state.realtimeDebounce);state.realtimeDebounce=null;
    if(state.realtimeChannel&&window.AGhuCloudRaw)window.AGhuCloudRaw.removeChannel(state.realtimeChannel).catch(()=>{});
    state.realtimeChannel=null;
  }
  function startRealtimeSync(){
    stopRealtimeSync();
    if(!state.user||!window.AGhuCloudRaw)return;
    const schedule=()=>{
      clearTimeout(state.realtimeDebounce);
      state.realtimeDebounce=setTimeout(()=>{
        if(!state.current&&!state.isDirty&&!state.saveInFlight)syncFromCloud();
        else state.realtimeDebounce=setTimeout(()=>syncFromCloud(),1200);
      },450);
    };
    let ch=window.AGhuCloudRaw.channel(`aghu-notes-${state.user.id}`);
    ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'vault_records',filter:`user_id=eq.${state.user.id}`},schedule);
    state.realtimeChannel=ch.subscribe();
  }
  function startSyncLoop(){stopSyncLoop();startRealtimeSync();state.syncTimer=setInterval(syncFromCloud,10000);}
  function stopSyncLoop(){if(state.syncTimer)clearInterval(state.syncTimer);state.syncTimer=null;stopRealtimeSync();}
  function startReminderLoop(){stopReminderLoop();checkDueReminders();state.reminderTimer=setInterval(checkDueReminders,30000);}
  function stopReminderLoop(){if(state.reminderTimer){clearInterval(state.reminderTimer);state.reminderTimer=null;}}
  async function checkDueReminders(){
    if(!state.user)return;const now=Date.now();const due=state.notes.filter(n=>!n.deleted&&n.reminder_at&&new Date(n.reminder_at).getTime()<=now);
    for(const n of due){const key=`aghuNotes.reminderShown:${n.id}:${n.reminder_at}`;if(localStorage.getItem(key)==='1')continue;localStorage.setItem(key,'1');showToast(`Lembrete: ${n.title||'Nota'}`,5000);if('Notification'in window&&Notification.permission==='granted'){try{new Notification('AGHU Notes',{body:n.title||'Nota com lembrete'});}catch{}}}
  }

  async function loadNotes(){
    if(!state.user?.id)return;
    const uid=state.user.id;
    const localById=new Map();
    const chooseNewer=(a,b)=>new Date(a?.updated_at||0).getTime()>=new Date(b?.updated_at||0).getTime()?a:b;

    for(const n of state.localNotesCache||[]){if(n?.id)localById.set(n.id,v64Clone(n));}
    for(const n of readStableMirrors(uid)){
      if(!n?.id)continue;
      localById.set(n.id,localById.has(n.id)?chooseNewer(n,localById.get(n.id)):v64Clone(n));
    }
    if(state.localPersistenceReady){
      try{
        for(const n of await readLocalNotes(uid)){
          if(!n?.id)continue;
          localById.set(n.id,localById.has(n.id)?chooseNewer(n,localById.get(n.id)):v64Clone(n));
        }
      }catch(err){console.warn('v64: leitura do espelho local:',err)}
    }
    for(const n of v64ReadJournals(uid)){
      if(!n?.id)continue;
      localById.set(n.id,localById.has(n.id)?chooseNewer(n,localById.get(n.id)):v64Clone(n));
    }
    enforceTrashGuardsMap(localById,uid);
    purgeHardDeletedFromMap(localById,uid);

    let remote=[];
    if(navigator.onLine){
      try{remote=(await v64LoadCloudBundle()).notes||[]}
      catch(err){console.error('v64: falha ao carregar notas da nuvem:',err)}
    }

    const merged=new Map(localById);
    for(const cloud of remote){
      if(!cloud?.id)continue;
      const local=merged.get(cloud.id);
      if(!local){merged.set(cloud.id,v64Clone(cloud));continue;}
      const draft=state.localDrafts?.get(cloud.id);
      const lt=new Date(local.updated_at||0).getTime();
      const rt=new Date(cloud.updated_at||0).getTime();
      const dt=draft?new Date(draft.updated_at||0).getTime():0;
      if(local.local_only||dt>=rt||lt>rt+250){
        merged.set(cloud.id,{
          ...cloud,...local,
          note_labels:cloud.note_labels||local.note_labels||[],
          attachments:cloud.attachments||local.attachments||[],
          cloud_confirmed:true
        });
      }else merged.set(cloud.id,v64Clone(cloud));
    }

    for(const d of pendingDrafts()){
      if(!d?.id)continue;
      const existing=merged.get(d.id);
      const base=existing||{
        id:d.id,user_id:d.user_id||uid,title:d.title||'Nova nota',content_html:d.content_html||'',
        color:d.color||'#ffffff',reminder_at:d.reminder_at||null,
        created_at:d.created_at||d.updated_at||new Date().toISOString(),
        pinned:false,archived:false,deleted:false,patient_meta:{},note_labels:[],attachments:[]
      };
      if(d.patient_meta&&Object.keys(d.patient_meta).length)base.patient_meta=d.patient_meta;
      if(!d.metadata_only&&(!existing||new Date(d.updated_at||0).getTime()>=new Date(existing.updated_at||0).getTime())){
        Object.assign(base,{
          title:d.title,content_html:d.content_html,color:d.color||base.color,
          reminder_at:d.reminder_at,patient_meta:d.patient_meta||base.patient_meta||{},
          google_doc_id:d.google_doc_id||base.google_doc_id||null,
          updated_at:d.updated_at,local_only:!!d.pending_create
        });
      }
      merged.set(d.id,base);
    }
    enforceTrashGuardsMap(merged,uid);
    purgeHardDeletedFromMap(merged,uid);

    state.notes=[...merged.values()].filter(n=>n?.id&&n.user_id===uid&&!isHardDeleted(n.id,uid));
    state.notes.sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
    cacheNotes();
    if(navigator.onLine)reconcileHardDeleteGuards(uid).catch(()=>{});
  }

  async function loadLabels(){
    if(!true){
      state.labels=state.localLabelsCache.length?state.localLabelsCache.map(l=>({...l})):(state.labels||[]);
    }else{
      const {data,error}=await supabase.from('labels').select('*').order('name');
      if(error)state.labels=state.localLabelsCache.length?state.localLabelsCache.map(l=>({...l})):(state.labels||[]);
      else{
        state.labels=data||[];
        cacheLabels();
      }
    }
    els.labelFilter.innerHTML='<option value="">Todas as etiquetas</option>'+
      state.labels.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('');
  }

  function filteredNotes(){
    const q=state.search;
    const rows=state.notes.filter(n=>{
      const base=state.filter==='trash'?n.deleted:state.filter==='archived'?n.archived&&!n.deleted:state.filter==='pinned'?n.pinned&&!n.archived&&!n.deleted:state.filter==='reminders'?!!n.reminder_at&&!n.deleted&&!n.archived:!n.deleted&&!n.archived;
      if(!base)return false;
      if(q){const labelText=(n.note_labels||[]).map(x=>x.labels?.name||'').join(' ');const meta=extractPatientMetadata(n);const hay=[n.title,meta.name,stripHtml(n.content_html),labelText,n.synthetic_local,meta.record,meta.age].join(' ').toLowerCase();if(!hay.includes(q))return false;}
      if(state.label){const ids=(n.note_labels||[]).map(x=>x.label_id);if(!ids.includes(state.label))return false;}
      return true;
    });
    const dir=state.sortDir==='asc'?1:-1;
    return rows.sort((a,b)=>{const am=extractPatientMetadata(a),bm=extractPatientMetadata(b);let av=state.sortKey==='title'?am.name:state.sortKey==='synthetic_age'?am.age:state.sortKey==='synthetic_record'?am.record:a[state.sortKey];let bv=state.sortKey==='title'?bm.name:state.sortKey==='synthetic_age'?bm.age:state.sortKey==='synthetic_record'?bm.record:b[state.sortKey];if(state.sortKey==='updated_at'){av=new Date(av||0).getTime();bv=new Date(bv||0).getTime();}if(state.sortKey==='synthetic_age'){av=parseFloat(String(av).replace(/[^0-9.]/g,''))||0;bv=parseFloat(String(bv).replace(/[^0-9.]/g,''))||0;}if(typeof av==='string')av=av.toLocaleLowerCase('pt-BR');if(typeof bv==='string')bv=bv.toLocaleLowerCase('pt-BR');if(av===bv)return 0;return av>bv?dir:-dir;});
  }

  window.AGhuNoteActionIcon=window.AGhuNoteActionIcon||function(name){
    const common='viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"';
    const paths={
      open:'<path d="M2.75 12s3.55-6.05 9.25-6.05S21.25 12 21.25 12 17.7 18.05 12 18.05 2.75 12 2.75 12Z"/><circle cx="12" cy="12" r="3.05"/>',
      pin:'<path d="M8.2 4.1h7.6l-1.45 5.05 2.55 2.55v1.2H7.1v-1.2l2.55-2.55L8.2 4.1Z"/><path d="M12 12.9v7"/>',
      archive:'<rect x="3.75" y="6.5" width="16.5" height="13" rx="2.2"/><path d="M4.6 4.1h14.8v3H4.6z"/><path d="M9.5 11.1h5"/>',
      trash:'<path d="M4.5 7.2h15"/><path d="M9 7.2V4.6h6v2.6"/><path d="M7.3 7.2l.9 11.1a1.8 1.8 0 0 0 1.8 1.65h4a1.8 1.8 0 0 0 1.8-1.65l.9-11.1"/><path d="M10.1 10.6v5.8M13.9 10.6v5.8"/>',
      edit:'<path d="M4.25 19.75 8.6 18.7 18 9.3a2.15 2.15 0 1 0-3.05-3.05l-9.4 9.4-1.3 4.1Z"/><path d="m13.65 7.55 2.8 2.8"/>',
      restore:'<path d="M7.3 7.3H4V4"/><path d="M4.15 7.15A8.2 8.2 0 1 1 3.8 13"/><path d="M9.2 11.3h5.3v5.1"/>'
    };
    return `<svg ${common} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.open}</svg>`;
  };

  function updateSideActions(){
    const n=state.notes.find(x=>x.id===state.selectedId);
    const has=!!n;
    els.openSelected.disabled=!has;
    const shareSelectedBtn=document.getElementById('shareSelectedBtn');
    if(shareSelectedBtn)shareSelectedBtn.disabled=!has;
    els.editPatientMeta.disabled=!has;
    els.restoreSelected.classList.toggle('hidden',!(has&&state.filter==='trash'));
    els.deleteSelected.classList.toggle('hidden',!(has&&state.filter==='trash'));
  }

  function actionCells(n){
    const I=window.AGhuNoteActionIcon;
    if(n.deleted)return `<td class="row-action"><button class="grid-icon-btn action-restore" title="Restaurar" aria-label="Restaurar" data-restore-row="${n.id}">${I('restore')}</button></td><td class="row-action"><button class="grid-icon-btn danger action-delete-forever" title="Excluir definitivamente" aria-label="Excluir definitivamente" data-delete-forever="${n.id}">${I('trash')}</button></td><td class="row-action"></td><td class="row-action"></td><td class="row-action"></td>`;
    return `<td class="row-action"><button class="grid-icon-btn action-open" title="Abrir" aria-label="Abrir" data-open="${n.id}">${I('open')}</button></td><td class="row-action"><button class="grid-icon-btn action-pin" title="Fixar" aria-label="Fixar" data-star="${n.id}">${I('pin')}</button></td><td class="row-action"><button class="grid-icon-btn action-archive" title="${n.archived?'Restaurar do arquivo':'Arquivar'}" aria-label="${n.archived?'Restaurar do arquivo':'Arquivar'}" data-archive-row="${n.id}">${I('archive')}</button></td><td class="row-action"><button class="grid-icon-btn danger action-trash" title="Mover para a lixeira" aria-label="Mover para a lixeira" data-trash-row="${n.id}">${I('trash')}</button></td><td class="row-action"><button class="grid-icon-btn action-edit" title="Editar nome, idade e prontuário" aria-label="Editar" data-edit-meta="${n.id}">${I('edit')}</button></td>`;
  }


  function quickReferenceAttachments(note){
    return (note?.attachments||[]).filter(a=>a.quick_ref===true || a.quick_ref==='true');
  }

  function cleanupQuickImageUrls(){
    for(const url of state.quickImageObjectUrls.values()){
      try{URL.revokeObjectURL(url)}catch{}
    }
    state.quickImageObjectUrls.clear();
  }

  async function uploadQuickReferenceImage(noteId,fileOrBlob,fileName){
    if(!noteId||!fileOrBlob||!state.user)return null;

    const safe=(fileName||`consulta-${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`${state.user.id}/${noteId}/quick-${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safe}`;

    const up=await supabase.storage.from('note-images').upload(path,fileOrBlob,{upsert:false});
    if(up.error)throw up.error;

    const {data,error}=await supabase.from('attachments').insert({
      user_id:state.user.id,
      note_id:noteId,
      storage_path:path,
      public_url:'',
      file_name:fileName||safe,
      quick_ref:true
    }).select().single();

    if(error){
      await supabase.storage.from('note-images').remove([path]);
      throw error;
    }

    const note=state.notes.find(n=>n.id===noteId);
    if(note){
      note.attachments=note.attachments||[];
      note.attachments.push(data);
    }
    if(state.current?.id===noteId){
      state.current.attachments=state.current.attachments||[];
      if(!state.current.attachments.some(a=>a.id===data.id))state.current.attachments.push(data);
    }

    cacheNotes();
    return data;
  }

  async function addQuickImagesToNote(noteId,files){
    const list=[...(files||[])].filter(f=>f && String(f.type||'').startsWith('image/'));
    if(!list.length)return;

    const note=state.notes.find(n=>n.id===noteId);
    const name=extractPatientMetadata(note||{}).name||'nota';
    showToast(`Salvando ${list.length} imagem(ns) em ${name}...`,2200);

    let saved=0;
    for(const file of list){
      try{
        await uploadQuickReferenceImage(
          noteId,
          file,
          file.name||`print-${Date.now()}-${saved+1}.png`
        );
        saved++;
      }catch(err){
        console.error('Imagem de consulta rápida:',err);
      }
    }

    if(saved){
      await loadNotes();
      renderNotes();
      showToast(saved===1?'Imagem adicionada à consulta rápida.':`${saved} imagens adicionadas à consulta rápida.`);
    }else{
      showToast('Não foi possível salvar a imagem.');
    }
  }

  async function removeQuickReferenceImage(noteId,attachmentId,path){
    if(path)await supabase.storage.from('note-images').remove([path]).catch(()=>{});
    await supabase.from('attachments').delete().eq('id',attachmentId);

    const note=state.notes.find(n=>n.id===noteId);
    if(note)note.attachments=(note.attachments||[]).filter(a=>a.id!==attachmentId);
    if(state.current?.id===noteId){
      state.current.attachments=(state.current.attachments||[]).filter(a=>a.id!==attachmentId);
    }
    cacheNotes();
    renderNotes();
    showToast('Imagem removida da consulta rápida.');
  }

  async function showQuickReferenceImage(path,title='Consulta rápida'){
    if(!path)return;
    const url=await signedImageUrl(path);
    if(!url){showToast('Imagem indisponível.');return}
    els.quickImageViewerTitle.textContent=title||'Consulta rápida';
    els.quickImageViewerImg.src=url;
    els.quickImageViewerImg.dataset.objectUrl=url;
    els.quickImageViewer.showModal();
  }

  async function hydrateQuickReferenceImages(){
    cleanupQuickImageUrls();

    const holders=[...els.tbody.querySelectorAll('[data-quick-strip]')];
    for(const holder of holders){
      const noteId=holder.dataset.quickStrip;
      const note=state.notes.find(n=>n.id===noteId);
      if(!note)continue;

      const images=quickReferenceAttachments(note);
      holder.innerHTML='';

      const visible=images.slice(0,5);
      for(const att of visible){
        const thumb=document.createElement('div');
        thumb.className='quick-ref-thumb';
        thumb.dataset.quickAttachment=att.id;
        thumb.innerHTML=`<div class="quick-ref-thumb-loading">Imagem</div>
          <button class="quick-ref-remove" type="button" title="Remover imagem">×</button>`;
        holder.appendChild(thumb);

        try{
          const url=await signedImageUrl(att.storage_path);
          if(url){
            state.quickImageObjectUrls.set(att.id,url);
            const loading=thumb.querySelector('.quick-ref-thumb-loading');
            const img=document.createElement('img');
            img.src=url;
            img.alt=att.file_name||'Consulta rápida';
            img.title='Clique ou toque para visualizar';
            img.loading='lazy';
            loading.replaceWith(img);

            img.addEventListener('click',e=>{
              e.stopPropagation();
              showQuickReferenceImage(att.storage_path,extractPatientMetadata(note).name);
            });
          }
        }catch(err){
          console.warn('Miniatura:',err);
        }

        thumb.querySelector('.quick-ref-remove')?.addEventListener('click',async e=>{
          e.stopPropagation();
          if(confirm('Remover esta imagem da consulta rápida?')){
            await removeQuickReferenceImage(noteId,att.id,att.storage_path);
          }
        });
      }

      if(images.length>5){
        const more=document.createElement('button');
        more.type='button';
        more.className='quick-ref-more';
        more.textContent=`+${images.length-5}`;
        more.title='Há mais imagens nesta nota';
        more.addEventListener('click',e=>{
          e.stopPropagation();
          openNote(noteId);
        });
        holder.appendChild(more);
      }
    }
  }

  function imageFilesFromClipboard(event){
    const files=[];
    for(const item of [...(event.clipboardData?.items||[])]){
      if(item.kind==='file' && item.type.startsWith('image/')){
        const file=item.getAsFile();
        if(file)files.push(file);
      }
    }
    return files;
  }

  async function handleQuickReferencePaste(event,noteId){
    const files=imageFilesFromClipboard(event);
    if(!files.length)return false;
    event.preventDefault();
    event.stopPropagation();
    await addQuickImagesToNote(noteId,files);
    return true;
  }


  function applyNotesViewMode(mode=state.notesViewMode){
    state.notesViewMode=mode==='cards'?'cards':'rows';
    localStorage.setItem('aghuNotes.notesViewMode',state.notesViewMode);

    els.keepPage?.classList.toggle('notes-view-cards',state.notesViewMode==='cards');
    els.keepPage?.classList.toggle('notes-view-rows',state.notesViewMode==='rows');

    els.notesRowsView?.classList.toggle('active',state.notesViewMode==='rows');
    els.notesCardsView?.classList.toggle('active',state.notesViewMode==='cards');

    els.notesRowsView?.setAttribute('aria-pressed',state.notesViewMode==='rows'?'true':'false');
    els.notesCardsView?.setAttribute('aria-pressed',state.notesViewMode==='cards'?'true':'false');
  }

  els.notesRowsView?.addEventListener('click',()=>{
    applyNotesViewMode('rows');
    renderNotes();
  });
  els.notesCardsView?.addEventListener('click',()=>{
    applyNotesViewMode('cards');
    renderNotes();
  });

  function updateCompactNameOnlyMode(){
    if(!els.keepPage)return false;
    const width=Math.min(window.innerWidth||9999,els.keepPage.getBoundingClientRect().width||9999);
    const compact=width<=760;
    els.keepPage.classList.toggle('compact-name-only',compact);
    return compact;
  }


  function cardAccentLocalKey(noteId){
    return state.user?.id&&noteId?`aghuNotes.cardAccent:${state.user.id}:${noteId}`:null;
  }
  function noteAccentColor(note){
    const localKey=cardAccentLocalKey(note?.id);
    const local=localKey?String(localStorage.getItem(localKey)||'').trim():'';
    if(/^#[0-9a-f]{6}$/i.test(local))return local;
    const explicit=String(note?.patient_meta?.cardAccent||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(explicit))return explicit;
    const noteColor=String(note?.color||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(noteColor)&&noteColor.toLowerCase()!=='#ffffff')return noteColor;
    return '#171717';
  }
  function noteCardBackground(note){
    const raw=String(note?.color||'#ffffff').trim();
    const allowed=new Set([
      '#ffffff','#faafa8','#f39f76','#fff8b8','#e2f6d3','#b4ddd3','#d4e4ed','#aeccdc','#d3bfdb','#f6e2dd','#e9e3d4',
      'linear-gradient(135deg,#f8fbff 0 50%,#e9f2ff 50% 100%)',
      'linear-gradient(180deg,#fffef7,#eef8f0)',
      'repeating-linear-gradient(0deg,#fff 0,#fff 23px,#e8edf3 24px)'
    ]);
    return allowed.has(raw)?raw:'#ffffff';
  }

  function firstNameFromDisplay(name=''){
    const clean=String(name||'').trim();
    if(!clean)return'Nota';
    const first=clean.split(/\s+/)[0];
    return first.length>18?first.slice(0,18):first;
  }

  function safeCardMeta(value,fallback='—'){
    const v=String(value??'').trim();
    return v&&v!=='0'?v:fallback;
  }

  async function updateCardAccent(noteId,color){
    if(!/^#[0-9a-f]{6}$/i.test(String(color||'')))return;
    const note=state.notes.find(n=>n.id===noteId);
    if(!note)return;

    const normalized=String(color).toLowerCase();
    const now=new Date().toISOString();
    const patient_meta={...(note.patient_meta||{}),cardAccent:normalized};

    const localKey=cardAccentLocalKey(noteId);
    if(localKey)localStorage.setItem(localKey,normalized);

    note.patient_meta=patient_meta;
    note.updated_at=now;
    if(state.current?.id===noteId){
      state.current.patient_meta=patient_meta;
      state.current.updated_at=now;
    }

    const pending=state.localDrafts.get(noteId);
    if(pending){
      const updatedDraft={...pending,patient_meta:{...(pending.patient_meta||{}),cardAccent:normalized},updated_at:now};
      state.localDrafts.set(noteId,updatedDraft);
      if(state.localPersistenceReady){
        idbPut('drafts',{
          key:draftId(noteId),userId:state.user.id,noteId,data:updatedDraft,updatedAt:Date.now()
        }).catch(persistenceError);
      }
    }

    cacheNotes();
    renderNotes();

    setSyncStatus('syncing');
    const {error}=await supabase.from('notes')
      .update({patient_meta,updated_at:now})
      .eq('id',noteId);
    if(error){
      showToast('Cor preservada neste aparelho; sincronização pendente.');
      setSyncStatus('ok');
      return;
    }
    setSyncStatus('ok');
    setSyncStatus('ok');
  }

  function renderNotes(){
    const rows=filteredNotes();
    updateCompactNameOnlyMode();

    els.empty.classList.toggle('hidden',rows.length>0);
    els.emptyTrash.classList.toggle('hidden',state.filter!=='trash');
    if(state.selectedId&&!rows.some(n=>n.id===state.selectedId))state.selectedId=null;

    const one=n=>{
      const meta=extractPatientMetadata(n);
      const qrefs=quickReferenceAttachments(n);
      const hint=qrefs.length
        ? `<span class="quick-ref-count" title="Imagens para consulta rápida">${qrefs.length} img</span>`
        : '';

      const accent=noteAccentColor(n);
      const noteBg=noteCardBackground(n);
      const firstName=firstNameFromDisplay(meta.name);
      const age=safeCardMeta(meta.age);
      const record=safeCardMeta(meta.record);

      return `<tr data-id="${n.id}" class="${state.selectedId===n.id?'selected':''}" style="--note-accent:#d6dbe1;--note-bg:#ffffff">
        <td data-label="Nome" class="patient-name-cell" data-name-cell="${n.id}">
        <div class="patient-name-main">
            <strong>${esc(meta.name)}</strong>
            ${hint}
            <button class="quick-ref-add" type="button" data-add-quick-image="${n.id}" title="Adicionar imagem para consulta rápida">＋ imagem</button>
          </div>

          <div class="keep-card-preview">${esc(stripHtml(n.content_html||'').slice(0,420))}</div>

          <div class="quick-ref-zone" data-quick-zone="${n.id}" tabindex="0" aria-label="Cole uma imagem para consulta rápida">
            <div class="quick-ref-paste-hint">Selecione esta nota e cole um print com Ctrl+V, ou use “＋ imagem”.</div>
            <div class="quick-ref-strip" data-quick-strip="${n.id}"></div>
          </div>
        </td>
        <td data-label="Idade">${esc(meta.age)}</td>
        <td data-label="Prontuário">${esc(meta.record)}</td>
        ${actionCells(n)}
      </tr>`;
    };

    let h='';
    if(state.filter==='all'){
      const fixed=rows.filter(n=>n.pinned),normal=rows.filter(n=>!n.pinned);
      if(fixed.length)h+=`<tr class="notes-group-row pinned-group"><td colspan="8">Fixadas</td></tr>`+fixed.map(one).join('');
      if(normal.length)h+=`<tr class="notes-group-row"><td colspan="8">Não Fixadas</td></tr>`+normal.map(one).join('');
    }else h=rows.map(one).join('');

    els.tbody.innerHTML=h;

    els.tbody.querySelectorAll('tr[data-id]').forEach(tr=>{
      tr.addEventListener('click',e=>{
        if(e.target.closest('button')||e.target.closest('input')||e.target.closest('.quick-ref-thumb'))return;
        state.selectedId=tr.dataset.id;
        renderNotes();
      });
      tr.addEventListener('dblclick',e=>{
        if(e.target.closest('.quick-ref-zone')||e.target.closest('button')||e.target.closest('input'))return;
        openNote(tr.dataset.id);
      });
    });

    els.tbody.querySelectorAll('[data-quick-zone]').forEach(zone=>{
      zone.addEventListener('click',e=>{
        e.stopPropagation();
        state.selectedId=zone.dataset.quickZone;
      });
      zone.addEventListener('paste',e=>handleQuickReferencePaste(e,zone.dataset.quickZone));
      zone.addEventListener('dragover',e=>{
        if([...(e.dataTransfer?.items||[])].some(i=>i.kind==='file')){
          e.preventDefault();
          zone.classList.add('quick-ref-active');
        }
      });
      zone.addEventListener('dragleave',()=>zone.classList.remove('quick-ref-active'));
      zone.addEventListener('drop',async e=>{
        zone.classList.remove('quick-ref-active');
        const files=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/'));
        if(files.length){
          e.preventDefault();
          e.stopPropagation();
          await addQuickImagesToNote(zone.dataset.quickZone,files);
        }
      });
    });

    els.tbody.querySelectorAll('[data-add-quick-image]').forEach(b=>b.addEventListener('click',e=>{
      e.stopPropagation();
      state.quickImageTargetNoteId=b.dataset.addQuickImage;
      state.selectedId=b.dataset.addQuickImage;
      els.quickImageInput.value='';
      els.quickImageInput.click();
    }));

    els.tbody.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openNote(b.dataset.open)}));
    els.tbody.querySelectorAll('[data-star]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation();const n=state.notes.find(x=>x.id===b.dataset.star);if(n)await quickUpdate(n.id,{pinned:!n.pinned})}));
    els.tbody.querySelectorAll('[data-archive-row]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation();const n=state.notes.find(x=>x.id===b.dataset.archiveRow);if(n)await quickUpdate(n.id,{archived:!n.archived})}));
    els.tbody.querySelectorAll('[data-edit-meta]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openPatientMetaEditor(b.dataset.editMeta)}));
    els.tbody.querySelectorAll('[data-trash-row]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation();const n=state.notes.find(x=>x.id===b.dataset.trashRow);if(n)await moveToTrash(n.id)}));
    els.tbody.querySelectorAll('[data-restore-row]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation();await restoreNote(b.dataset.restoreRow)}));
    els.tbody.querySelectorAll('[data-delete-forever]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation();const n=state.notes.find(x=>x.id===b.dataset.deleteForever);if(n)await deleteNoteForever(n,true)}));

    updateSideActions();
    hydrateQuickReferenceImages().catch(err=>console.warn('Consulta rápida:',err));
  }

  async function quickUpdate(id,patch){
    const note=state.notes.find(n=>n.id===id);
    if(!note||note.user_id!==state.user?.id)return;

    const now=new Date().toISOString();
    Object.assign(note,patch,{updated_at:now});
    persistLocalNote(note);
    cacheNotes();
    renderNotes();

    setSyncStatus('syncing');
    const {data,error}=await supabase.from('notes')
      .update({...patch,updated_at:now})
      .eq('id',id)
      .select('*')
      .maybeSingle();

    if(error||!data){
      if(error)console.error('Falha ao sincronizar atualização rápida:',error);
      showToast('Alteração salva neste aparelho; sincronização pendente.');
      setSyncStatus(navigator.onLine?'syncing':'offline');
      return;
    }

    Object.assign(note,data,{local_only:false,cloud_confirmed:true});
    persistLocalNote(note);
    cacheNotes();
    renderNotes();
    setSyncStatus('ok');
  }

  document.querySelectorAll('.notes-table th[data-sort]').forEach(th=>th.addEventListener('click',()=>{const key=th.dataset.sort;if(state.sortKey===key)state.sortDir=state.sortDir==='asc'?'desc':'asc';else{state.sortKey=key;state.sortDir=key==='title'||key==='synthetic_local'?'asc':'desc';}renderNotes();}));

  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    state.filter=b.dataset.filter;
    state.selectedId=null;
    renderNotes();
  }));
  els.noteSearch.addEventListener('input',()=>{state.search=els.noteSearch.value.trim().toLowerCase();renderNotes();});
  els.labelFilter.addEventListener('change',()=>{state.label=els.labelFilter.value;renderNotes();});

  els.manageLabels.addEventListener('click',()=>renderLabelsManager());
  function renderLabelsManager(){
    els.labelsManagerList.innerHTML=state.labels.map(l=>`<div class="label-manager-row" data-label-row="${l.id}"><input value="${esc(l.name)}" aria-label="Nome da etiqueta"><div><button class="btn btn-light" data-save-label="${l.id}">Salvar</button><button class="btn btn-danger" data-delete-label="${l.id}">Excluir</button></div></div>`).join('')||'<p>Nenhuma etiqueta criada.</p>';
    els.labelsManagerList.querySelectorAll('[data-save-label]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('[data-label-row]');const name=row.querySelector('input').value.trim();if(!name)return;const{error}=await supabase.from('labels').update({name}).eq('id',btn.dataset.saveLabel);if(error){showToast('Não foi possível renomear a etiqueta.');return;}await Promise.all([loadLabels(),loadNotes()]);renderLabelsManager();renderNotes();}));
    els.labelsManagerList.querySelectorAll('[data-delete-label]').forEach(btn=>btn.addEventListener('click',async()=>{const l=state.labels.find(x=>x.id===btn.dataset.deleteLabel);if(!l||!confirm(`Excluir a etiqueta "${l.name}"? As notas não serão apagadas.`))return;const{error}=await supabase.from('labels').delete().eq('id',l.id);if(error){showToast('Não foi possível excluir a etiqueta.');return;}await Promise.all([loadLabels(),loadNotes()]);renderLabelsManager();renderNotes();}));
    els.labelsDialog.showModal();
  }


  function queuePatientMetaDraft(note){
    const existing=getDraft(note.id)||{};
    const d={
      ...existing,
      id:note.id,
      user_id:state.user.id,
      title:note.title||'Sem título',
      content_html:note.content_html||'',
      color:note.color||'#ffffff',
      reminder_at:note.reminder_at||null,
      labels_text:existing.labels_text!==undefined
        ? existing.labels_text
        : (note.note_labels||[]).map(x=>x.labels?.name).filter(Boolean).join(', '),
      created_at:note.created_at||new Date().toISOString(),
      updated_at:new Date().toISOString(),
      synthetic_local:note.synthetic_local,
      synthetic_age:note.synthetic_age,
      synthetic_record:note.synthetic_record,
      patient_meta:note.patient_meta||{},
      metadata_only:true,
      pending_create:!!note.local_only
    };

    state.localDrafts.set(note.id,d);
    if(state.localPersistenceReady){
      idbPut('drafts',{
        key:draftId(note.id),userId:state.user.id,noteId:note.id,data:d,updatedAt:Date.now()
      }).catch(persistenceError);
    }
  }

  function openPatientMetaEditor(noteId){
    const note=state.notes.find(n=>n.id===noteId);
    if(!note)return;

    state.patientMetaNoteId=noteId;
    const meta=extractPatientMetadata(note);
    const manual=note.patient_meta||{};

    els.patientMetaName.value=String(manual.name||meta.auto.name||'');
    els.patientMetaAge.value=String(manual.age||meta.auto.age||'');
    els.patientMetaRecord.value=String(manual.record||meta.auto.record||'');

    els.patientMetaDetected.innerHTML=
      `<strong>Reconhecimento automático atual:</strong><br>`+
      `Nome: ${esc(meta.auto.name||'não identificado')}<br>`+
      `Idade: ${esc(meta.auto.age||'não identificada')}<br>`+
      `Prontuário/POL: ${esc(meta.auto.record||'não identificado')}`;

    els.patientMetaDialog.showModal();
  }

  async function savePatientMeta(manualMeta){
    const note=state.notes.find(n=>n.id===state.patientMetaNoteId);
    if(!note)return;

    note.patient_meta=manualMeta;
    note.updated_at=new Date().toISOString();

    if(state.current?.id===note.id){
      state.current.patient_meta=manualMeta;
    }

    // Sempre salva primeiro no IndexedDB. Isso impede que o refresh periódico
    // do armazenamento local faça a edição manual desaparecer.
    queuePatientMetaDraft(note);
    cacheNotes();
    renderNotes();
    els.patientMetaDialog.close();

    if(!true||note.local_only){
      setSyncStatus('offline');
      showToast('Identificação salva neste aparelho e será salva localmente.',3600);
      return;
    }

    setSyncStatus('syncing');

    const {data,error}=await supabase.from('notes')
      .update({
        patient_meta:manualMeta,
        updated_at:note.updated_at
      })
      .eq('id',note.id)
      .select('id,patient_meta')
      .maybeSingle();

    if(error){
      console.error('Erro ao salvar identificação:',error);
      setSyncStatus('ok');

      const msg=String(error.message||'');
      if(/patient_meta|column|schema|42703/i.test(msg)){
        showToast('Correção preservada no aparelho. Falta aplicar a atualização SQL patient_meta no armazenamento local.',5200);
      }else{
        showToast('Identificação preservada localmente; salvamento local pendente.',4200);
      }
      return;
    }

    // Só remove a cópia local quando o armazenamento local devolver exatamente os mesmos dados.
    const expected=JSON.stringify(manualMeta||{});
    const confirmed=JSON.stringify(data?.patient_meta||{});

    if(expected!==confirmed){
      setSyncStatus('ok');
      showToast('Identificação preservada localmente; o armazenamento local ainda não confirmou a alteração.',4500);
      return;
    }

    clearDraft(note.id);

    // Mantém a alteração manual na memória enquanto atualiza a lista.
    await loadNotes();
    const refreshed=state.notes.find(n=>n.id===note.id);
    if(refreshed)refreshed.patient_meta=manualMeta;
    cacheNotes();
    renderNotes();

    setSyncStatus('ok');
    showToast('Identificação sincronizada.');
  }

  els.editPatientMeta.addEventListener('click',()=>{
    if(state.selectedId)openPatientMetaEditor(state.selectedId);
  });

  els.patientMetaSave.addEventListener('click',async()=>{
    await savePatientMeta({
      name:els.patientMetaName.value.trim(),
      age:els.patientMetaAge.value.trim(),
      record:els.patientMetaRecord.value.trim(),
      manual:true,
      updated_at:new Date().toISOString()
    });
  });

  els.patientMetaAuto.addEventListener('click',async()=>{
    await savePatientMeta({});
  });

  els.patientMetaCancel.addEventListener('click',()=>els.patientMetaDialog.close());
  els.closePatientMeta.addEventListener('click',()=>els.patientMetaDialog.close());

  els.openSelected.addEventListener('click',()=>{
    if(state.selectedId) openNote(state.selectedId);
  });
  els.restoreSelected.addEventListener('click',async()=>{
    if(state.selectedId) await restoreNote(state.selectedId);
  });
  els.deleteSelected.addEventListener('click',async()=>{
    const n=state.notes.find(x=>x.id===state.selectedId);
    if(n) await deleteNoteForever(n,true);
  });

  async function moveToTrash(id){
    const note=state.notes.find(n=>n.id===id);
    if(!note||note.user_id!==state.user?.id)return;

    const now=new Date().toISOString();
    note.deleted=true;
    note.archived=false;
    note.updated_at=now;
    if(state.current?.id===id)Object.assign(state.current,{deleted:true,archived:false,updated_at:now});
    clearDraft(id);
    writeTrashGuard(note,now,state.user.id);
    persistLocalNote(note);
    cacheNotes();
    renderNotes();

    setSyncStatus('syncing');
    try{await supabase.from('note_versions').delete().eq('note_id',id)}catch{}
    const {data,error}=await supabase.from('notes')
      .update({deleted:true,archived:false,updated_at:now})
      .eq('id',id)
      .select('*')
      .maybeSingle();

    if(error||!data){
      if(error)console.error('Falha ao sincronizar lixeira:',error);
      showToast('Nota movida para a lixeira neste aparelho; sincronização pendente.');
      setSyncStatus(navigator.onLine?'syncing':'offline');
      return;
    }

    Object.assign(note,data,{local_only:false,cloud_confirmed:true});
    writeTrashGuard(note,note.updated_at||now,state.user.id);
    persistLocalNote(note);
    cacheNotes();
    renderNotes();
    setSyncStatus('ok');
  }

  async function restoreNote(id){
    const note=state.notes.find(n=>n.id===id);
    if(!note||note.user_id!==state.user?.id)return;

    const now=new Date().toISOString();
    note.deleted=false;
    note.updated_at=now;
    clearTrashGuard(id,state.user.id);
    persistLocalNote(note);
    cacheNotes();
    state.selectedId=null;
    renderNotes();

    setSyncStatus('syncing');
    const {data,error}=await supabase.from('notes')
      .update({deleted:false,updated_at:now})
      .eq('id',id)
      .select('*')
      .maybeSingle();

    if(error||!data){
      if(error)console.error('Falha ao restaurar na nuvem:',error);
      showToast('Nota restaurada neste aparelho; sincronização pendente.');
      setSyncStatus(navigator.onLine?'syncing':'offline');
      return;
    }

    Object.assign(note,data,{local_only:false,cloud_confirmed:true});
    clearTrashGuard(id,state.user.id);
    persistLocalNote(note);
    cacheNotes();
    renderNotes();
    setSyncStatus('ok');
  }

  async function removeStorageFiles(note){
    const paths=(note.attachments||[]).map(a=>a.storage_path).filter(Boolean);
    if(paths.length){
      await supabase.storage.from('note-images').remove(paths);
    }
  }

  async function deleteNoteForever(note,ask=true){
    if(!note)return;
    if(!state.user?.id||note.user_id!==state.user.id){
      showToast('Somente o criador desta nota pode excluí-la.');
      return;
    }
    if(ask&&!confirm('Excluir definitivamente esta nota? Esta ação não poderá ser desfeita.'))return;

    setSyncStatus('syncing');
    const uid=state.user.id;
    const snapshot=v64Clone(note);

    // O tombstone é gravado de forma síncrona antes da chamada remota. Assim,
    // mesmo que a aba seja fechada imediatamente depois do clique, nenhum cache
    // ou rascunho antigo poderá recriar esta nota no próximo login.
    writeHardDeleteGuard(note,uid);
    clearDraft(note.id);
    await waitDraftWrite(note.id);

    const {error}=await supabase.from('notes').delete().eq('id',note.id);
    if(error){
      clearHardDeleteGuard(note.id,uid);
      await persistLocalNote(snapshot).catch(()=>{});
      alert('Não foi possível excluir definitivamente a nota. Tente novamente com conexão ativa.');
      setSyncStatus(navigator.onLine?'ok':'offline');
      return;
    }

    try{await removeStorageFiles(note)}catch{}
    clearTrashGuard(note.id,uid);
    try{await deleteLocalAttachmentsForNote(note.id)}catch{}
    try{await removeLocalNote(note.id)}catch{}

    state.notes=state.notes.filter(n=>n.id!==note.id);
    state.localNotesCache=(state.localNotesCache||[]).filter(n=>n.id!==note.id);
    state.selectedId=null;

    if(state.current?.id===note.id){
      state.current=null;
      els.editorPage.classList.add('hidden');
      els.keepPage.classList.remove('hidden');
    }

    cacheNotes();
    try{await state.cacheSnapshotChain}catch{}
    renderNotes();
    setSyncStatus('ok');
  }

  els.emptyTrash.addEventListener('click',async()=>{
    const trashed=state.notes.filter(n=>n.deleted&&n.user_id===state.user?.id);
    if(!trashed.length)return;
    if(!confirm(`Esvaziar a lixeira e excluir definitivamente ${trashed.length} nota(s)? Esta ação não poderá ser desfeita.`))return;

    setSyncStatus('syncing');
    const uid=state.user.id;
    let failed=0;
    for(const note of trashed){
      const snapshot=v64Clone(note);
      writeHardDeleteGuard(note,uid);
      clearDraft(note.id);
      await waitDraftWrite(note.id);

      const {error}=await supabase.from('notes').delete().eq('id',note.id);
      if(error){
        clearHardDeleteGuard(note.id,uid);
        await persistLocalNote(snapshot).catch(()=>{});
        console.warn('Falha ao excluir nota da lixeira',note.id,error);
        failed++;
        continue;
      }
      try{await removeStorageFiles(note)}catch{}
      clearTrashGuard(note.id,uid);
      try{await deleteLocalAttachmentsForNote(note.id)}catch{}
      try{await removeLocalNote(note.id)}catch{}
      state.notes=state.notes.filter(n=>n.id!==note.id);
      state.localNotesCache=(state.localNotesCache||[]).filter(n=>n.id!==note.id);
    }
    state.selectedId=null;
    cacheNotes();
    try{await state.cacheSnapshotChain}catch{}
    renderNotes();
    if(failed)showToast(`${failed} nota(s) não puderam ser apagadas da nuvem e permaneceram na lixeira.`,5000);
    setSyncStatus(navigator.onLine?'ok':'offline');
  });


  els.newNote.addEventListener('click', async()=>{
    if(!state.user?.id)return;
    const meta=randomMeta();
    const id=crypto.randomUUID();
    const now=new Date().toISOString();
    let note={
      id,user_id:state.user.id,title:'Nova nota',content_html:'',
      color:'#ffffff',reminder_at:null,created_at:now,updated_at:now,
      pinned:false,archived:false,deleted:false,patient_meta:{},
      local_only:true,...meta,note_labels:[],attachments:[]
    };

    // A nova nota passa a existir localmente ANTES de qualquer chamada de rede.
    state.notes.unshift(note);
    v64WriteJournal(note);
    const initialLocalOk=await persistLocalNote(note);
    cacheNotes();

    // Recupera a visibilidade da nova nota mesmo se o usuário estava em Arquivo/Lixeira/busca.
    state.filter='all';state.search='';state.label='';state.selectedId=null;
    if(els.noteSearch)els.noteSearch.value='';
    if(els.labelFilter)els.labelFilter.value='';
    document.querySelectorAll('.filter[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));

    let cloudSaved=false;
    if(navigator.onLine){
      try{
        const remote=await v64UpsertNote(note);
        note={...note,...remote,local_only:false,cloud_confirmed:true,note_labels:[],attachments:[]};
        const idx=state.notes.findIndex(n=>n.id===id);if(idx>=0)state.notes[idx]=note;
        await persistLocalNote(note);
        cacheNotes();
        v64DeleteJournal(id);
        cloudSaved=true;
      }catch(err){
        console.error('v64: criação remota pendente:',err);
      }
    }

    if(!cloudSaved){
      const localDraft={
        id,user_id:state.user.id,title:'Nova nota',content_html:'',
        color:'#ffffff',reminder_at:null,labels_text:'',created_at:now,updated_at:now,
        synthetic_local:note.synthetic_local,synthetic_age:note.synthetic_age,
        synthetic_record:note.synthetic_record,patient_meta:{},pending_create:true,
        revision:++state.editRevision
      };
      state.localDrafts.set(id,localDraft);
      if(state.localPersistenceReady)queueDraftWrite(localDraft);
    }

    openNote(id);
    if(cloudSaved){
      state.isDirty=false;
      const localOk=initialLocalOk||await verifyDurableLocalNote(id,note);
      setAutosave(localOk?'Salvo na nuvem e neste aparelho':'Salvo na nuvem • cópia local pendente',localOk?'cloud-saved':'local-saved');
      setSyncStatus('ok');
    }else{
      state.isDirty=true;
      setAutosave('Salvo neste aparelho • sincronização pendente','local-saved');
      setSyncStatus(navigator.onLine?'syncing':'offline');
      if(navigator.onLine){clearTimeout(state.saveTimer);state.saveTimer=setTimeout(()=>flushSave(),350);}
    }
  });

  function openNote(id){
    const n=state.notes.find(x=>x.id===id); if(!n) return;
    const d=getDraft(id);
    const useDraft=!!d&&(d.pending_create||new Date(d.updated_at||0)>new Date(n.updated_at||0));
    const source=useDraft?{...n,...d}:n;

    state.current=JSON.parse(JSON.stringify(source));
    if(n.local_only)state.current.local_only=true;

    els.keepPage.classList.add('hidden');els.editorPage.classList.remove('hidden');
    applyKeepFocusMode(state.keepFocusMode);

    els.title.value=source.title||'';
    els.body.innerHTML=source.content_html||'';
    els.color.value=source.color||'#ffffff';
    els.reminder.value=toLocalInput(source.reminder_at);
    els.labelsInput.value=useDraft?(d.labels_text||''):(n.note_labels||[]).map(x=>x.labels?.name).filter(Boolean).join(', ');
    els.editorPage.style.background=source.color||'#fff';

    updateActionLabels();renderImages();

    if(useDraft){
      state.isDirty=true;
      setAutosave(true?'Rascunho recuperado • sincronizando...':'Salvo e sincronizado',true?'':'local-saved');
      if(true){clearTimeout(state.saveTimer);state.saveTimer=setTimeout(flushSave,100);}
    }else{
      state.isDirty=false;
      setAutosave('Salvo','local-saved');
    }
  }
  els.back.addEventListener('click',async()=>{
    if(state.current){
      if(state.isDirty){
        persistDraftNow();
        await waitDraftWrite(state.current.id);
        await waitLocalNote(state.current.id);
        try{await flushSave()}catch(err){console.warn('Sincronização ao voltar:',err)}
      }

      const cached=state.notes.find(n=>n.id===state.current.id);
      if(cached){
        cached.title=compactTitleForStorage(els.title.value)||'Sem título';
        cached.content_html=compactHtmlForStorage(els.body.innerHTML);
        cached.color=els.color.value;
        cached.reminder_at=els.reminder.value?new Date(els.reminder.value).toISOString():null;
        cached.patient_meta=state.current.patient_meta||cached.patient_meta||{};
        cached.updated_at=state.current.updated_at||new Date().toISOString();
        persistLocalNote(cached);
      }
      cacheNotes();
    }

    els.editorPage.classList.add('hidden');
    els.keepPage.classList.remove('hidden');
    state.current=null;
    renderNotes();
    applyKeepFocusMode(state.keepFocusMode);

    // Atualização remota ocorre após a lista local estar estabilizada.
    setTimeout(()=>syncFromCloud(),350);
  });

  function updateActionLabels(){
    if(!state.current)return;
    els.pin.textContent=state.current.pinned?'★ Fixada':'☆ Fixar';
    els.archive.textContent=state.current.archived?'▣ Restaurar':'▣ Arquivar';
    els.trash.textContent=state.current.deleted?'↩ Restaurar':'🗑 Excluir';
    els.permanentDelete.classList.toggle('hidden',!state.current.deleted);
  }
  function markDirty(){
    if(!state.current)return;
    state.editRevision++;
    state.isDirty=true;

    // Salva primeiro no aparelho; a nuvem é uma segunda etapa.
    persistDraftNow();

    setAutosave('Salvando...','local-saved');
    clearTimeout(state.saveTimer);
    state.saveTimer=setTimeout(()=>flushSave(),650);
  }
  [els.title,els.body,els.color,els.reminder,els.labelsInput].forEach(el=>el.addEventListener('input',markDirty));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'&&state.current){
      persistDraftNow();
      flushSave().catch(()=>{});
    }
  });
  window.addEventListener('pagehide',()=>{
    if(state.current){
      persistDraftNow();
      flushSave().catch(()=>{});
    }
  });
  els.color.addEventListener('change',()=>{els.editorPage.style.background=els.color.value;markDirty();});
  els.reminder.addEventListener('change',async()=>{if(els.reminder.value&&'Notification'in window&&Notification.permission==='default'){try{await Notification.requestPermission();}catch{}}markDirty();});

  async function ensureLabels(names){
    const clean=[...new Set(names.map(s=>s.trim()).filter(Boolean))]; const ids=[];
    for(const name of clean){ let l=state.labels.find(x=>x.name.toLowerCase()===name.toLowerCase());
      if(!l){ const {data,error}=await supabase.from('labels').insert({user_id:state.user.id,name}).select().single(); if(error) continue; l=data; state.labels.push(l); }
      ids.push(l.id);
    }
    return ids;
  }
  async function syncLabels(noteId){
    const ids=await ensureLabels(els.labelsInput.value.split(',')); await supabase.from('note_labels').delete().eq('note_id',noteId); if(ids.length) await supabase.from('note_labels').insert(ids.map(label_id=>({note_id:noteId,label_id,user_id:state.user.id})));
  }
  async function createVersionIfNeeded(){
    const n=state.current;
    if(!n||n.local_only||!true)return;

    const currentTitle=compactTitleForStorage(els.title.value);
    const currentHtml=compactHtmlForStorage(els.body.innerHTML);
    const oldTitle=compactTitleForStorage(n.title||'');
    const oldHtml=compactHtmlForStorage(n.content_html||'');

    if(currentTitle===oldTitle && currentHtml===oldHtml)return;

    const last=state.versionTimer||0;
    if(Date.now()-last<1800000)return;

    const {data:lastVersion}=await supabase.from('note_versions')
      .select('id,title,content_html,created_at')
      .eq('note_id',n.id)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();

    if(lastVersion &&
       compactTitleForStorage(lastVersion.title||'')===oldTitle &&
       compactHtmlForStorage(lastVersion.content_html||'')===oldHtml){
      state.versionTimer=Date.now();
      return;
    }

    state.versionTimer=Date.now();

    await supabase.from('note_versions').insert({
      note_id:n.id,
      user_id:state.user.id,
      title:oldTitle,
      content_html:oldHtml
    });

    const {data:versions}=await supabase.from('note_versions')
      .select('id,created_at')
      .eq('note_id',n.id)
      .order('created_at',{ascending:false});

    if((versions||[]).length>3){
      const excess=versions.slice(3).map(v=>v.id);
      if(excess.length)await supabase.from('note_versions').delete().in('id',excess);
    }
  }

  async function syncDraftRecord(d){
    if(!state.user?.id||!d?.id)return{ok:false,error:new Error('Nota ou usuário indisponível.')};
    if(!navigator.onLine)return{ok:false,error:new Error('Sem conexão.')};

    const local=state.notes.find(n=>n.id===d.id)||state.current||{};
    const note={
      ...local,
      id:d.id,user_id:state.user.id,
      title:d.metadata_only?(local.title||'Sem título'):(compactTitleForStorage(d.title)||'Sem título'),
      content_html:d.metadata_only?(local.content_html||''):compactHtmlForStorage(d.content_html||''),
      color:d.metadata_only?(local.color||'#ffffff'):(d.color||local.color||'#ffffff'),
      reminder_at:d.metadata_only?(local.reminder_at||null):(d.reminder_at||null),
      patient_meta:d.patient_meta||local.patient_meta||{},
      google_doc_id:d.google_doc_id||local.google_doc_id||null,
      pinned:!!local.pinned,archived:!!local.archived,deleted:!!local.deleted,
      synthetic_local:d.synthetic_local??local.synthetic_local??null,
      synthetic_age:d.synthetic_age??local.synthetic_age??null,
      synthetic_record:d.synthetic_record??local.synthetic_record??null,
      created_at:d.created_at||local.created_at||new Date().toISOString(),
      updated_at:d.updated_at||new Date().toISOString(),
      local_only:false
    };

    try{
      const saved=await v64UpsertNote(note);
      const verify=await v64FetchCloudNote(d.id);
      if(!verify)throw new Error('A nota não foi encontrada na releitura do servidor.');
      if(compactTitleForStorage(verify.title||'')!==compactTitleForStorage(note.title||'') ||
         compactHtmlForStorage(verify.content_html||'')!==compactHtmlForStorage(note.content_html||'')){
        throw new Error('A releitura do servidor não corresponde à nota enviada.');
      }

      if(!d.metadata_only){
        try{
          const names=(d.labels_text||'').split(',').map(x=>x.trim()).filter(Boolean);
          const ids=await ensureLabels(names);
          await supabase.from('note_labels').delete().eq('note_id',d.id);
          if(ids.length)await supabase.from('note_labels').insert(ids.map(label_id=>({note_id:d.id,label_id,user_id:state.user.id})));
        }catch(err){console.warn('v64: nota confirmada; etiquetas pendentes:',err)}
      }
      return{ok:true,data:{...saved,note_labels:local.note_labels||[],attachments:local.attachments||[]}};
    }catch(error){
      console.error('v64: falha ao gravar/confirmar nota:',error);
      return{ok:false,error};
    }
  }

  async function pruneCompactHistory(){
    if(!true||!state.user)return;
    try{
      const {data,error}=await supabase.from('note_versions')
        .select('id,note_id,created_at')
        .order('created_at',{ascending:false});
      if(error||!data)return;

      const seen=new Map();
      const excess=[];
      for(const row of data){
        const count=seen.get(row.note_id)||0;
        if(count>=3)excess.push(row.id);
        else seen.set(row.note_id,count+1);
      }

      for(let i=0;i<excess.length;i+=100){
        await supabase.from('note_versions').delete().in('id',excess.slice(i,i+100));
      }
    }catch(err){
      console.warn('Limpeza compacta do histórico:',err);
    }
  }

  async function syncPendingDrafts(){
    if(state.pendingSyncRunning||!true||!state.user||state.saveInFlight)return;
    const list=pendingDrafts();
    if(!list.length)return;

    state.pendingSyncRunning=true;
    setSyncStatus('syncing');
    try{
      for(const d of list){
        if(state.current?.id===d.id&&state.isDirty)continue;
        const result=await syncDraftRecord(d);
        if(!result.ok)continue;

        const idx=state.notes.findIndex(n=>n.id===d.id);
        let localOk=true;
        if(idx>=0){
          Object.assign(state.notes[idx],result.data,{local_only:false,cloud_confirmed:true});
          await persistLocalNote(state.notes[idx]);
          localOk=await verifyDurableLocalNote(d.id,state.notes[idx]);
        }
        const latest=getDraft(d.id);
        if(localOk&&latest&&latest.updated_at===d.updated_at){
          clearDraft(d.id);
        }else if(!localOk){
          state.localDrafts.set(d.id,{...d,pending_create:false});
          if(idx>=0)v64WriteJournal(state.notes[idx]);
        }
      }
      await Promise.all([loadNotes(),loadLabels()]);
      await syncPendingLocalAttachments();
      if(!els.keepPage.classList.contains('hidden'))renderNotes();
    }finally{
      state.pendingSyncRunning=false;
      setSyncStatus(navigator.onLine?'ok':'offline');
    }
  }

  async function flushSave(){
    if(!state.current||!state.isDirty)return true;

    if(state.saveInFlight){
      state.saveAgain=true;
      try{await state.saveInFlight}catch{}
      return !state.isDirty;
    }

    const revisionAtStart=state.editRevision;
    const d=persistDraftNow()||buildDraft();
    if(!d)return false;
    await waitDraftWrite(d.id);
    await waitLocalNote(d.id);

    if(!navigator.onLine){
      state.isDirty=true;
      setAutosave('Salvo neste aparelho • offline','local-saved');
      setSyncStatus('offline');
      return false;
    }

    const run=(async()=>{
      setSyncStatus('syncing');
      setAutosave('Salvando...','local-saved');

      if(!d.pending_create&&!state.current.local_only){
        try{await createVersionIfNeeded()}catch(err){console.warn('Histórico:',err)}
      }

      const result=await syncDraftRecord(d);
      if(!result.ok){
        state.isDirty=true;
        setAutosave('Salvo neste aparelho • sincronização pendente','local-saved');
        setSyncStatus('syncing');
        clearTimeout(state.saveRetryTimer);
        state.saveRetryTimer=setTimeout(()=>{if(navigator.onLine)flushSave()},3000);
        return false;
      }

      const idx=state.notes.findIndex(n=>n.id===d.id);
      const latest=getDraft(d.id);
      const unchangedRevision=state.editRevision===revisionAtStart;
      const unchangedDraft=!latest||latest.updated_at===d.updated_at;

      if(!unchangedRevision||!unchangedDraft){
        const localNow=idx>=0?state.notes[idx]:state.current;
        if(localNow){localNow.local_only=false;localNow.cloud_confirmed=true;await persistLocalNote(localNow)}
        state.current.local_only=false;state.current.cloud_confirmed=true;
        cacheNotes();state.isDirty=true;state.saveAgain=true;
        setAutosave('Salvando alterações mais recentes...','local-saved');
        return true;
      }

      const merged={
        ...(idx>=0?state.notes[idx]:state.current),
        ...(result.data||{}),local_only:false,cloud_confirmed:true
      };
      if(idx>=0)state.notes[idx]=merged;
      state.current={...state.current,...merged};
      await persistLocalNote(merged);
      cacheNotes();
      const localConfirmed=await verifyDurableLocalNote(d.id,merged);
      const cloudConfirmed=await v64FetchCloudNote(d.id);
      const remoteOk=!!cloudConfirmed &&
        compactTitleForStorage(cloudConfirmed.title||'')===compactTitleForStorage(merged.title||'') &&
        compactHtmlForStorage(cloudConfirmed.content_html||'')===compactHtmlForStorage(merged.content_html||'');

      if(!remoteOk){
        state.isDirty=true;
        setAutosave('Salvo neste aparelho • confirmação da nuvem pendente','local-saved');
        clearTimeout(state.saveRetryTimer);
        state.saveRetryTimer=setTimeout(()=>{if(navigator.onLine)flushSave()},3000);
        return false;
      }

      if(localConfirmed){
        clearDraft(d.id);
      }else{
        // Mantém o journal/rascunho até o espelho local também ficar confirmado.
        state.localDrafts.set(d.id,{...d,pending_create:false});
        v64WriteJournal(merged);
      }
      state.isDirty=false;
      clearTimeout(state.saveRetryTimer);state.saveRetryTimer=null;
      setAutosave(
        localConfirmed
          ? `Salvo e sincronizado ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`
          : `Salvo na nuvem • cópia local pendente`,
        localConfirmed?'cloud-saved':'local-saved'
      );
      setSyncStatus('ok');
      try{await loadLabels()}catch{}
      scheduleGoogleBackup(d.id);
      return true;
    })();

    state.saveInFlight=run;
    let ok=false;
    try{ok=await run}finally{state.saveInFlight=null}
    if(state.saveAgain){
      state.saveAgain=false;
      if(state.isDirty)return flushSave();
    }
    return ok;
  }

  els.pin.addEventListener('click',async()=>{state.current.pinned=!state.current.pinned;await quickCurrent({pinned:state.current.pinned});});
  els.archive.addEventListener('click',async()=>{state.current.archived=!state.current.archived;await quickCurrent({archived:state.current.archived});});
  els.trash.addEventListener('click',async()=>{
    if(!state.current) return;
    if(state.current.deleted){
      await restoreNote(state.current.id);
      state.current.deleted=false;
      updateActionLabels();
    } else {
      const id=state.current.id;
      await flushSave();
      await moveToTrash(id);
      els.editorPage.classList.add('hidden');
      els.keepPage.classList.remove('hidden');
      state.current=null;
      state.filter='trash';
      document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter==='trash'));
      renderNotes();
    }
  });
  els.permanentDelete.addEventListener('click',async()=>{
    if(!state.current) return;
    const n=state.notes.find(x=>x.id===state.current.id) || state.current;
    await deleteNoteForever(n,true);
  });
  async function quickCurrent(p){
    if(!state.current||!state.user?.id)return;
    if(state.current.user_id&&state.current.user_id!==state.user.id)return;

    const now=new Date().toISOString();
    Object.assign(state.current,p,{updated_at:now});
    const local=state.notes.find(n=>n.id===state.current.id);
    if(local)Object.assign(local,p,{updated_at:now});
    if(local)persistLocalNote(local);
    cacheNotes();
    updateActionLabels();

    setSyncStatus('syncing');
    const {data,error}=await supabase.from('notes')
      .update({...p,updated_at:now})
      .eq('id',state.current.id)
      .select('*')
      .maybeSingle();

    if(error||!data){
      if(error)console.error('Falha ao sincronizar ação da nota:',error);
      showToast('Alteração salva neste aparelho; sincronização pendente.');
      setSyncStatus(navigator.onLine?'syncing':'offline');
      return;
    }

    Object.assign(state.current,data,{local_only:false,cloud_confirmed:true});
    if(local)Object.assign(local,data,{local_only:false,cloud_confirmed:true});
    if(local)persistLocalNote(local);
    cacheNotes();
    setSyncStatus('ok');
  }

  els.duplicate.addEventListener('click',async()=>{
    await flushSave();const source=state.current;const m=randomMeta();
    const{data,error}=await supabase.from('notes').insert({user_id:state.user.id,title:`${els.title.value||'Sem título'} (cópia)`,content_html:els.body.innerHTML,color:els.color.value,reminder_at:source.reminder_at||null,...m}).select().single();
    if(error){showToast('Não foi possível duplicar a nota.');return;}
    const labelIds=await ensureLabels(els.labelsInput.value.split(','));if(labelIds.length)await supabase.from('note_labels').insert(labelIds.map(label_id=>({note_id:data.id,label_id,user_id:state.user.id})));
    for(const att of(source.attachments||[])){try{const{data:blob,error:downErr}=await supabase.storage.from('note-images').download(att.storage_path);if(downErr||!blob)continue;const safe=(att.file_name||'imagem').replace(/[^a-zA-Z0-9._-]/g,'_');const newPath=`${state.user.id}/${data.id}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safe}`;const up=await supabase.storage.from('note-images').upload(newPath,blob,{upsert:false});if(up.error)continue;await supabase.from('attachments').insert({user_id:state.user.id,note_id:data.id,storage_path:newPath,public_url:'',file_name:att.file_name||safe});}catch{}}
    await Promise.all([loadNotes(),loadLabels()]);openNote(data.id);showToast('Cópia criada.');
  });

  const calcState={expr:'',lastResult:null};

  function calcPretty(expr){
    return String(expr||'').replace(/\*/g,'×').replace(/\//g,'÷').replace(/\./g,',');
  }

  function calcRender(){
    if(!els.calculatorDisplay)return;
    els.calculatorExpression.textContent=calcState.expr?calcPretty(calcState.expr):'\u00a0';
    if(calcState.lastResult!==null){
      els.calculatorDisplay.textContent=String(calcState.lastResult).replace('.',',');
    }else{
      els.calculatorDisplay.textContent=calcState.expr?calcPretty(calcState.expr):'0';
    }
  }

  function calcEvaluate(expression){
    const s=String(expression||'').replace(/,/g,'.');
    if(!s.trim())return 0;
    if(!/^[0-9+\-*/().\s]+$/.test(s))throw new Error('Expressão inválida');

    let i=0;
    const skip=()=>{while(/\s/.test(s[i]||''))i++;};
    const number=()=>{
      skip();
      let start=i;
      while(/[0-9.]/.test(s[i]||''))i++;
      if(start===i)throw new Error('Número esperado');
      const n=Number(s.slice(start,i));
      if(!Number.isFinite(n))throw new Error('Número inválido');
      return n;
    };
    const factor=()=>{
      skip();
      if(s[i]==='+'){i++;return factor();}
      if(s[i]==='-'){i++;return -factor();}
      if(s[i]==='('){
        i++;
        const v=expressionParser();
        skip();
        if(s[i]!==')')throw new Error('Parêntese');
        i++;
        return v;
      }
      return number();
    };
    const term=()=>{
      let v=factor();
      while(true){
        skip();
        const op=s[i];
        if(op!=='*'&&op!=='/')break;
        i++;
        const rhs=factor();
        v=op==='*'?v*rhs:v/rhs;
        if(!Number.isFinite(v))throw new Error('Divisão inválida');
      }
      return v;
    };
    const expressionParser=()=>{
      let v=term();
      while(true){
        skip();
        const op=s[i];
        if(op!=='+'&&op!=='-')break;
        i++;
        const rhs=term();
        v=op==='+'?v+rhs:v-rhs;
      }
      return v;
    };
    const value=expressionParser();
    skip();
    if(i!==s.length)throw new Error('Expressão inválida');
    return Math.round((value+Number.EPSILON)*1e12)/1e12;
  }

  function openCalculator(){
    calcRender();
    els.calculatorDialog?.showModal();
  }

  els.calculatorMenu?.addEventListener('click',openCalculator);
  els.calculatorEditor?.addEventListener('click',openCalculator);
  els.calculatorClose?.addEventListener('click',()=>els.calculatorDialog?.close());

  els.calculatorKeys?.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-calc]');
    if(!btn)return;
    const key=btn.dataset.calc;

    if(key==='clear'){
      calcState.expr='';
      calcState.lastResult=null;
    }else if(key==='back'){
      calcState.expr=calcState.expr.slice(0,-1);
      calcState.lastResult=null;
    }else if(key==='equals'){
      try{
        const result=calcEvaluate(calcState.expr);
        calcState.lastResult=result;
        calcState.expr=String(result);
      }catch{
        calcState.lastResult='Erro';
      }
    }else if(key==='paren'){
      const open=(calcState.expr.match(/\(/g)||[]).length;
      const close=(calcState.expr.match(/\)/g)||[]).length;
      calcState.expr+=open>close?')':'(';
      calcState.lastResult=null;
    }else if(key==='sign'){
      if(calcState.expr){
        calcState.expr=`-(${calcState.expr})`;
      }else{
        calcState.expr='-';
      }
      calcState.lastResult=null;
    }else{
      if(calcState.lastResult!==null && /^[0-9.]$/.test(key)){
        calcState.expr='';
      }
      calcState.lastResult=null;
      calcState.expr+=key;
    }
    calcRender();
  });


  const GOOGLE_CLIENT_ID_KEY='aghuNotes.googleClientId';
  const GOOGLE_ACCOUNT_KEY_PREFIX='aghuNotes.googleAccount:';
  const GOOGLE_AUTO_KEY_PREFIX='aghuNotes.googleAuto:';
  const GOOGLE_SCOPE='https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents';

  function googleAutoKey(){
    return state.user?GOOGLE_AUTO_KEY_PREFIX+state.user.id:null;
  }
  function googleAutoEnabled(){
    const key=googleAutoKey();
    return !!key && localStorage.getItem(key)!=='0';
  }
  function setGoogleStatus(text,type=''){
    if(!els.googleDocsStatus)return;
    els.googleDocsStatus.textContent=text;
    els.googleDocsStatus.classList.remove('ok','error');
    if(type)els.googleDocsStatus.classList.add(type);
  }
  function googleConnected(){
    return !!state.googleToken && Date.now()<state.googleTokenExpiresAt-30000;
  }
  async function loadGoogleIdentity(){
    if(window.google?.accounts?.oauth2)return true;
    if(document.querySelector('script[data-aghu-google-identity]')){
      await new Promise((resolve,reject)=>{
        const start=Date.now();
        const t=setInterval(()=>{
          if(window.google?.accounts?.oauth2){clearInterval(t);resolve()}
          else if(Date.now()-start>10000){clearInterval(t);reject(new Error('Google Identity não carregou.'))}
        },100);
      });
      return true;
    }
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client';
      s.async=true;s.defer=true;s.dataset.aghuGoogleIdentity='1';
      s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar a autenticação Google.'));
      document.head.appendChild(s);
    });
    return true;
  }
  function googleAccountKey(){
    return state.user?GOOGLE_ACCOUNT_KEY_PREFIX+state.user.id:null;
  }
  function googleAccountEmail(){
    return (els.googleAccountInput?.value||(googleAccountKey()?localStorage.getItem(googleAccountKey()):'')||'').trim();
  }
  function isValidGoogleClientId(value){
    const v=String(value||'').trim();
    if(!/^[0-9A-Za-z._-]+\.apps\.googleusercontent\.com$/.test(v))return false;
    if(/^x{4,}[0-9A-Za-z._-]*\.apps\.googleusercontent\.com$/i.test(v))return false;
    if(/^example[0-9A-Za-z._-]*\.apps\.googleusercontent\.com$/i.test(v))return false;
    return true;
  }
  function googleClientId(){
    const configured=String(cfg.GOOGLE_CLIENT_ID||'').trim();
    if(isValidGoogleClientId(configured))return configured;
    const input=String(els.googleClientIdInput?.value||'').trim();
    if(isValidGoogleClientId(input))return input;
    const stored=String(localStorage.getItem(GOOGLE_CLIENT_ID_KEY)||'').trim();
    return isValidGoogleClientId(stored)?stored:'';
  }

  function googleOAuthOrigin(){
    if(location.protocol==='file:')return 'file:// (arquivo local)';
    return location.origin;
  }

  function validateGoogleOAuthEnvironment(){
    const clientId=googleClientId();

    if(location.protocol==='file:'){
      throw new Error(
        'O Google OAuth não funciona quando o AGHU Notes é aberto diretamente como arquivo local (file://). '+
        'Abra a versão publicada no GitHub Pages e tente novamente.'
      );
    }

    if(location.protocol!=='https:' &&
       !(location.protocol==='http:' && ['localhost','127.0.0.1'].includes(location.hostname))){
      throw new Error('O Google exige HTTPS para autenticação OAuth em aplicações web.');
    }

    if(!clientId){
      throw new Error('Configuração técnica do Google Docs pendente: informe um OAuth Client ID válido do aplicativo. Ele não é o seu e-mail e precisa terminar em .apps.googleusercontent.com.');
    }

    return {
      clientId,
      origin: location.origin
    };
  }

  function explainGoogleOAuthSetup(){
    const origin=googleOAuthOrigin();
    if(els.googleOAuthOrigin)els.googleOAuthOrigin.textContent=origin;

    if(location.protocol==='file:'){
      setGoogleStatus(
        'Abra o AGHU Notes pelo GitHub Pages. O Google bloqueia autenticação OAuth iniciada por arquivo local.',
        'error'
      );
      if(els.googleConnect)els.googleConnect.disabled=true;
      return;
    }

    const clientId=googleClientId();
    if(els.googleConnect)els.googleConnect.disabled=false;

    if(clientId){
      setGoogleStatus(
        googleConnected()
          ? 'Google conectado. As notas podem ser copiadas automaticamente.'
          : 'Configuração OAuth reconhecida. Clique em “Conectar Google” para autorizar a conta.',
        googleConnected()?'ok':''
      );
    }else{
      setGoogleStatus(
        'Clique em “Conectar Google”. Sem um OAuth Client ID real, o app abrirá o Google Docs em modo direto; a sincronização automática exige um Client ID válido.',
        ''
      );
    }
  }

  async function requestGoogleToken(interactive=true){
    const env=validateGoogleOAuthEnvironment();
    const clientId=env.clientId;
    localStorage.setItem(GOOGLE_CLIENT_ID_KEY,clientId);
    await loadGoogleIdentity();

    return await new Promise((resolve,reject)=>{
      state.googleTokenClient=google.accounts.oauth2.initTokenClient({
        client_id:clientId,
        scope:GOOGLE_SCOPE,
        login_hint:googleAccountEmail()||undefined,
        callback:resp=>{
          if(resp?.error){reject(new Error(resp.error_description||resp.error));return}
          state.googleToken=resp.access_token;
          state.googleTokenExpiresAt=Date.now()+(Number(resp.expires_in)||3600)*1000;
          setGoogleStatus('Google conectado. As notas podem ser copiadas automaticamente.','ok');
          resolve(resp.access_token);
        },
        error_callback:err=>{
          const type=err?.type||err?.message||'';
          let message='Não foi possível concluir a autorização Google.';
          if(/popup_failed_to_open/i.test(type))message='O navegador bloqueou a janela de autorização Google. Permita pop-ups para este site.';
          else if(/popup_closed/i.test(type))message='A janela de autorização Google foi fechada antes da conclusão.';
          else if(type)message+=` (${type})`;
          reject(new Error(message));
        }
      });
      try{state.googleTokenClient.requestAccessToken({prompt:interactive?'consent':'',login_hint:googleAccountEmail()||undefined})}
      catch(err){reject(err)}
    });
  }
  async function ensureGoogleToken(interactive=false){
    if(googleConnected())return state.googleToken;
    if(!interactive)return null;
    return await requestGoogleToken(true);
  }
  async function googleFetch(url,options={}){
    const token=await ensureGoogleToken(false);
    if(!token)throw new Error('Google não conectado nesta sessão.');
    const headers=new Headers(options.headers||{});
    headers.set('Authorization',`Bearer ${token}`);
    const response=await fetch(url,{...options,headers});
    if(response.status===401){
      state.googleToken=null;state.googleTokenExpiresAt=0;
      throw new Error('A autorização Google expirou. Conecte novamente.');
    }
    if(!response.ok){
      let detail='';
      try{detail=(await response.json())?.error?.message||''}catch{}
      throw new Error(detail||`Google API: ${response.status}`);
    }
    if(response.status===204)return null;
    return await response.json();
  }
  async function ensureGoogleFolder(){
    if(state.googleFolderId)return state.googleFolderId;
    const q=encodeURIComponent("name='AGHU Notes' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const found=await googleFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=10`);
    if(found?.files?.length){
      state.googleFolderId=found.files[0].id;
      return state.googleFolderId;
    }
    const folder=await googleFetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:'AGHU Notes',mimeType:'application/vnd.google-apps.folder'})
    });
    state.googleFolderId=folder.id;
    return folder.id;
  }
  function htmlToGoogleText(html=''){
    const box=document.createElement('div');
    box.innerHTML=String(html)
      .replace(/<br\s*\/?>/gi,'\n')
      .replace(/<\/(?:p|div|h[1-6]|li|blockquote)>/gi,'\n')
      .replace(/<li\b[^>]*>/gi,'• ');
    return (box.textContent||box.innerText||'')
      .replace(/\u00a0/g,' ')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }
  async function createGoogleDoc(note){
    const folderId=await ensureGoogleFolder();
    const title=(note.title||'Sem título').slice(0,240);
    const file=await googleFetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        name:title,
        mimeType:'application/vnd.google-apps.document',
        parents:[folderId]
      })
    });
    return file.id;
  }
  async function replaceGoogleDocContent(docId,note){
    const docData=await googleFetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`);
    const content=docData?.body?.content||[];
    const last=content[content.length-1];
    const endIndex=Number(last?.endIndex)||1;
    const bodyText=htmlToGoogleText(note.content_html||'');
    const requests=[];

    if(endIndex>2){
      requests.push({deleteContentRange:{range:{startIndex:1,endIndex:endIndex-1}}});
    }
    if(bodyText){
      requests.push({insertText:{location:{index:1},text:bodyText}});
    }
    if(requests.length){
      await googleFetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}:batchUpdate`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({requests})
      });
    }
    await googleFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(docId)}?fields=id,name`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:(note.title||'Sem título').slice(0,240)})
    });
  }
  async function syncNoteToGoogle(noteId,{interactive=false}={}){
    if(!state.user)return false;
    const token=await ensureGoogleToken(interactive);
    if(!token){
      if(interactive)throw new Error('Google não conectado.');
      return false;
    }
    let note=state.notes.find(n=>n.id===noteId);
    if(state.current?.id===noteId){
      note={...(note||{}),...buildDraft(),google_doc_id:state.current.google_doc_id||note?.google_doc_id};
    }
    if(!note)return false;

    setGoogleStatus('Copiando nota para o Google Docs...');
    let docId=note.google_doc_id;
    if(!docId)docId=await createGoogleDoc(note);
    await replaceGoogleDocContent(docId,note);

    if(note.google_doc_id!==docId){
      await supabase.from('notes').update({google_doc_id:docId}).eq('id',noteId);
      const cached=state.notes.find(n=>n.id===noteId);
      if(cached)cached.google_doc_id=docId;
      if(state.current?.id===noteId)state.current.google_doc_id=docId;
    }
    setGoogleStatus('Cópia Google Docs atualizada automaticamente.','ok');
    return true;
  }
  function scheduleGoogleBackup(noteId){
    if(!state.user||!googleAutoEnabled()||!googleConnected())return;
    clearTimeout(state.googleSyncTimers.get(noteId));
    const t=setTimeout(()=>{
      syncNoteToGoogle(noteId).catch(err=>{
        console.warn('Google Docs:',err);
        setGoogleStatus(err.message||'Falha ao atualizar Google Docs.','error');
      });
      state.googleSyncTimers.delete(noteId);
    },900);
    state.googleSyncTimers.set(noteId,t);
  }
  function openGoogleDocsSettings(){
    if(!state.user){showToast('Faça login primeiro.');return}

    const legacy=String(localStorage.getItem(GOOGLE_CLIENT_ID_KEY)||'').trim();
    const looksLikeEmail=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(legacy) && !isValidGoogleClientId(legacy);
    if(looksLikeEmail){
      const key=googleAccountKey();
      if(key&&!localStorage.getItem(key))localStorage.setItem(key,legacy);
      localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
    }

    const accountKey=googleAccountKey();
    const suggested=(accountKey?localStorage.getItem(accountKey):'')||
      (String(state.user?.login||'').includes('@')?state.user.login:'');
    if(els.googleAccountInput)els.googleAccountInput.value=suggested||'';

    const configured=String(cfg.GOOGLE_CLIENT_ID||'').trim();
    const stored=String(localStorage.getItem(GOOGLE_CLIENT_ID_KEY)||'').trim();
    els.googleClientIdInput.value=isValidGoogleClientId(configured)?configured:(isValidGoogleClientId(stored)?stored:'');
    els.googleClientIdInput.disabled=isValidGoogleClientId(configured);

    els.googleAutoBackup.checked=googleAutoEnabled();
    if(els.googleOAuthOrigin)els.googleOAuthOrigin.textContent=googleOAuthOrigin();
    els.googleDocsDialog.showModal();

    if(googleConnected()){
      setGoogleStatus('Google conectado. Alterações serão copiadas sem abrir nova aba.','ok');
      if(els.googleConnect)els.googleConnect.disabled=false;
    }else{
      explainGoogleOAuthSetup();
    }
  }

  async function openGoogleDocsDirect(){
    const opened=window.open('https://docs.new','_blank');
    try{if(opened)opened.opener=null}catch{}
    let copied=false;
    try{
      let note=state.current;
      if(note){
        const title=compactTitleForStorage(els.title?.value||note.title||'Sem título');
        const bodyText=htmlToGoogleText(els.body?.innerHTML||note.content_html||'');
        const text=[title,bodyText].filter(Boolean).join('\n\n');
        if(text){await navigator.clipboard.writeText(text);copied=true;}
      }
    }catch{}
    if(!opened)throw new Error('O navegador bloqueou a abertura do Google Docs. Permita pop-ups para este site.');
    return {opened:true,copied};
  }

  els.copyDocs?.addEventListener('click',openGoogleDocsSettings);
  els.googleDocsClose?.addEventListener('click',()=>els.googleDocsDialog.close());
  els.googleDocsCancel?.addEventListener('click',()=>els.googleDocsDialog.close());
  els.googleOpenDirect?.addEventListener('click',async()=>{
    try{
      const r=await openGoogleDocsDirect();
      setGoogleStatus(r.copied?'Google Docs aberto. O texto da nota foi copiado; cole no documento com Ctrl+V.':'Google Docs aberto em uma nova aba.','ok');
    }catch(err){
      setGoogleStatus(err.message||'Não foi possível abrir o Google Docs.','error');
    }
  });
  els.copyGoogleOrigin?.addEventListener('click',async()=>{
    const origin=location.protocol==='file:'?'https://appcarlosfranca.github.io':location.origin;
    try{
      await navigator.clipboard.writeText(origin);
      showToast('Origem Google copiada.');
    }catch{
      showToast(`Origem: ${origin}`,3500);
    }
  });
  els.googleAccountInput?.addEventListener('input',()=>{
    const key=googleAccountKey();
    if(key)localStorage.setItem(key,els.googleAccountInput.value.trim());
  });
  els.googleClientIdInput?.addEventListener('input',()=>{
    const value=els.googleClientIdInput.value.trim();
    if(isValidGoogleClientId(value))localStorage.setItem(GOOGLE_CLIENT_ID_KEY,value);
    else if(!value)localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
    explainGoogleOAuthSetup();
  });
  els.googleAutoBackup?.addEventListener('change',()=>{
    const key=googleAutoKey();if(key)localStorage.setItem(key,els.googleAutoBackup.checked?'1':'0');
  });
  els.googleConnect?.addEventListener('click',async()=>{
    const clientId=googleClientId();

    // Sem OAuth Client ID real, o botão continua funcional:
    // abre o Google Docs e leva o conteúdo da nota pela área de transferência.
    if(!clientId){
      try{
        const r=await openGoogleDocsDirect();
        setGoogleStatus(
          r.copied
            ? 'Google Docs aberto em modo direto. O conteúdo da nota foi copiado para colar com Ctrl+V. Para sincronização automática, configure um OAuth Client ID real.'
            : 'Google Docs aberto em modo direto. Para sincronização automática, configure um OAuth Client ID real.',
          'ok'
        );
      }catch(err){
        setGoogleStatus(err.message||'Não foi possível abrir o Google Docs.','error');
      }
      return;
    }

    setGoogleStatus('Abrindo autorização segura do Google...');
    try{
      await requestGoogleToken(true);
      const key=googleAutoKey();
      if(key)localStorage.setItem(key,els.googleAutoBackup.checked?'1':'0');
      if(state.current)await syncNoteToGoogle(state.current.id);
    }catch(err){
      // Se a configuração OAuth estiver incorreta, não deixa o botão "morto":
      // oferece automaticamente o modo direto como fallback.
      try{
        const r=await openGoogleDocsDirect();
        setGoogleStatus(
          `${err.message||'A autorização Google não foi concluída.'} Modo direto aberto${r.copied?' e conteúdo copiado para Ctrl+V':''}.`,
          'error'
        );
      }catch{
        setGoogleStatus(err.message||'Não foi possível conectar ao Google.','error');
      }
    }
  });
  els.googleSyncNow?.addEventListener('click',async()=>{
    if(!state.current){setGoogleStatus('Abra uma nota antes de copiar.','error');return}
    try{
      if(!googleConnected())await requestGoogleToken(true);
      await syncNoteToGoogle(state.current.id);
    }catch(err){setGoogleStatus(err.message||'Não foi possível copiar a nota.','error')}
  });

  function notePlainText(){return `${els.title.value.trim()||'Sem título'}

${stripHtml(els.body.innerHTML)}`.trim();}
  els.share.addEventListener('click',()=>openInternalShareDialog(state.current));

  $('shareDirectBtn')?.addEventListener('click',()=>openInternalShareDialog(state.current));
  $('shareSelectedBtn')?.addEventListener('click',()=>{
    const note=state.notes.find(n=>n.id===state.selectedId);
    if(note)openInternalShareDialog(note);
  });

  let shareTargetNote=null;
  const shareUi={dialog:$('notesShareDialog'),close:$('notesShareCloseBtn'),cancel:$('notesShareCancelBtn'),login:$('notesShareLogin'),send:$('notesShareSendBtn'),status:$('notesShareStatus'),existing:$('notesShareExisting'),receivedDialog:$('receivedSharesDialog'),receivedClose:$('receivedSharesCloseBtn'),receivedCloseBottom:$('receivedSharesCloseBottomBtn'),receivedList:$('receivedSharesList'),viewer:$('sharedNoteViewerDialog'),viewerTitle:$('sharedNoteViewerTitle'),viewerMeta:$('sharedNoteViewerMeta'),viewerBody:$('sharedNoteViewerBody'),viewerImport:$('sharedNoteImportBtn'),viewerClose:$('sharedNoteViewerCloseBtn'),viewerCloseBottom:$('sharedNoteViewerCloseBottomBtn')};
  let currentReceivedShare=null;
  function setShareStatus(msg,type=''){shareUi.status.textContent=msg||'';shareUi.status.className=`notes-share-status ${type}`.trim()}
  async function renderCurrentNoteShares(){if(!shareTargetNote)return;try{const rows=await window.AGhuShareCrypto.listSharesForNote(shareTargetNote.id);shareUi.existing.innerHTML=rows.length?rows.map(r=>`<div class="share-chip-row"><span><strong>${esc(r.recipient_login||'Conta destinatária')}</strong><br><small>Atualizado em ${new Date(r.updated_at||r.created_at).toLocaleString('pt-BR')}</small></span><button type="button" data-revoke-share="${r.id}">Revogar</button></div>`).join(''):'<div style="color:#7a858e">Ainda não compartilhada com nenhuma conta.</div>';shareUi.existing.querySelectorAll('[data-revoke-share]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Revogar este compartilhamento?'))return;try{await window.AGhuShareCrypto.revokeShare(b.dataset.revokeShare);await renderCurrentNoteShares();showToast('Compartilhamento revogado.')}catch(e){showToast(e.message||'Falha ao revogar.')}}))}catch(e){shareUi.existing.innerHTML=`<div style="color:#a22d35">${esc(e.message||'Falha ao carregar.')}</div>`}}
  async function openInternalShareDialog(note=state.current){if(!note){showToast('Selecione ou abra uma nota primeiro.');return}shareTargetNote=note;setShareStatus('');shareUi.login.value='';try{await window.AGhuShareCrypto.ensure()}catch(e){setShareStatus(e.message||'Falha ao preparar compartilhamento.','error')}await renderCurrentNoteShares();shareUi.dialog.showModal()}
  shareUi.send?.addEventListener('click',async()=>{const login=shareUi.login.value.trim();if(!login){setShareStatus('Informe o login do destinatário.','error');return}shareUi.send.disabled=true;setShareStatus('Criptografando e compartilhando...');try{const r=await window.AGhuShareCrypto.shareNoteWithLogin(shareTargetNote,login);setShareStatus(`Nota compartilhada com ${r.recipient_login||login}.`,'ok');shareUi.login.value='';await renderCurrentNoteShares()}catch(e){setShareStatus(e.message||'Não foi possível compartilhar.','error')}finally{shareUi.send.disabled=false}});
  shareUi.close?.addEventListener('click',()=>{shareTargetNote=null;shareUi.dialog.close()});shareUi.cancel?.addEventListener('click',()=>{shareTargetNote=null;shareUi.dialog.close()});
  async function openReceivedShares(){shareUi.receivedList.innerHTML='<div style="padding:18px;color:#78838c">Carregando...</div>';shareUi.receivedDialog.showModal();try{const rows=await window.AGhuShareCrypto.listReceivedShares();if(!rows.length){shareUi.receivedList.innerHTML='<div style="padding:18px;color:#78838c">Nenhuma nota compartilhada com esta conta.</div>';return}shareUi.receivedList.innerHTML=rows.map(r=>`<div class="received-share-row"><div class="received-share-main"><strong>${esc(r.payload?.title||'Nota criptografada')}</strong><small>De: ${esc(r.owner_login||'outra conta')} • ${esc(new Date(r.updated_at||r.created_at).toLocaleString('pt-BR'))}</small></div><button type="button" data-view-share="${r.id}">Visualizar</button></div>`).join('');shareUi.receivedList.querySelectorAll('[data-view-share]').forEach(b=>b.addEventListener('click',()=>{const r=rows.find(x=>x.id===b.dataset.viewShare);if(!r?.payload){showToast('Não foi possível descriptografar esta nota.');return}currentReceivedShare=r;shareUi.viewerTitle.textContent=r.payload.title||'Nota compartilhada';shareUi.viewerMeta.textContent=`Compartilhada por ${r.owner_login||'outra conta'} em ${new Date(r.updated_at||r.created_at).toLocaleString('pt-BR')}`;shareUi.viewerBody.innerHTML=r.payload.content_html||'<em>Sem conteúdo.</em>';shareUi.viewer.showModal()}))}catch(e){shareUi.receivedList.innerHTML=`<div style="padding:18px;color:#a22d35">${esc(e.message||'Falha ao carregar notas compartilhadas.')}</div>`}}
  $('sharedNotesBtn')?.addEventListener('click',openReceivedShares);shareUi.receivedClose?.addEventListener('click',()=>shareUi.receivedDialog.close());shareUi.receivedCloseBottom?.addEventListener('click',()=>shareUi.receivedDialog.close());shareUi.viewerClose?.addEventListener('click',()=>shareUi.viewer.close());shareUi.viewerCloseBottom?.addEventListener('click',()=>shareUi.viewer.close());
  shareUi.viewerImport?.addEventListener('click',async()=>{if(!currentReceivedShare?.payload)return;const p=currentReceivedShare.payload,m=randomMeta();try{const {error}=await supabase.from('notes').insert({user_id:state.user.id,title:p.title||'Nota compartilhada',content_html:p.content_html||'',color:p.color||'#ffffff',reminder_at:null,...m});if(error)throw error;await loadNotes();renderNotes();shareUi.viewer.close();showToast('Cópia adicionada às suas notas.')}catch(e){showToast(e.message||'Não foi possível copiar a nota.')}});

  // Google Docs agora é gerenciado pelo backup automático acima.

  function initDrawing(){
    const canvas=els.drawCanvas,ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';let drawing=false,last=null;
    const point=e=>{const r=canvas.getBoundingClientRect(),p=e;return{x:(p.clientX-r.left)*(canvas.width/r.width),y:(p.clientY-r.top)*(canvas.height/r.height)}};
    const start=e=>{drawing=true;last=point(e);e.preventDefault();};const move=e=>{if(!drawing)return;const p=point(e);ctx.strokeStyle=els.drawColor.value;ctx.lineWidth=Number(els.drawSize.value);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault();};const end=e=>{drawing=false;last=null;e.preventDefault();};
    canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',e=>{if(drawing)end(e)});
    els.clearDraw.addEventListener('click',()=>ctx.clearRect(0,0,canvas.width,canvas.height));els.draw.addEventListener('click',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);els.drawDialog.showModal();});const close=()=>{try{els.drawDialog.close()}catch{}};els.closeDraw.addEventListener('click',close);els.cancelDraw.addEventListener('click',close);
    els.saveDraw.addEventListener('click',async()=>{
      if(!state.current)return;
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)return;
      const fileName=`desenho-${Date.now()}.png`;

      try{
        if(!true){
          await queueLocalAttachment(blob,fileName,state.current.id);
          await renderImages();
          setAutosave('Desenho salvo neste aparelho • aguardando internet','local-saved');
        }else{
          try{
            await uploadAttachment(blob,fileName);
            await renderImages();
            setAutosave('Desenho salvo localmente','local-saved');
          }catch(uploadErr){
            await queueLocalAttachment(blob,fileName,state.current.id);
            await renderImages();
            setAutosave('Desenho salvo neste aparelho • salvamento local pendente','local-saved');
          }
        }
        close();
      }catch(err){
        persistenceError(err);
      }
    });
  }
  initDrawing();

  els.history.addEventListener('click',async()=>{
    if(!state.current)return; const {data}=await supabase.from('note_versions').select('*').eq('note_id',state.current.id).order('created_at',{ascending:false}).limit(50);
    els.historyList.innerHTML=(data||[]).map(v=>`<div class="history-item"><strong>${esc(v.title||'Sem título')}</strong><br><small>${fmtDate(v.created_at)}</small><button class="btn btn-light" data-restore="${v.id}">Restaurar esta versão</button></div>`).join('')||'<p>Sem versões anteriores.</p>';
    els.historyList.querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',()=>restoreVersion((data||[]).find(v=>v.id===b.dataset.restore)))); els.historyDialog.showModal();
  });
  async function restoreVersion(v){ if(!v)return; els.title.value=v.title;els.body.innerHTML=v.content_html;markDirty();els.historyDialog.close(); }

  function editorCommand(cmd,value=null){els.body.focus();try{document.execCommand('styleWithCSS',false,true);document.execCommand(cmd,false,value)}catch(e){console.warn(e)}markDirty()}
  document.querySelectorAll('#wordToolbar [data-cmd]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>editorCommand(b.dataset.cmd,b.dataset.value||null))});
  $('paragraphStyleSelect')?.addEventListener('change',e=>editorCommand('formatBlock',e.target.value||'P'));
  $('fontNameSelect')?.addEventListener('change',e=>editorCommand('fontName',e.target.value));
  $('fontSizeSelect')?.addEventListener('change',e=>editorCommand('fontSize',e.target.value));
  let fontColorSavedRange=null;
  let pendingTypingColor=null;

  function selectionInsideEditor(sel=window.getSelection()){
    if(!sel||!sel.rangeCount)return false;
    const r=sel.getRangeAt(0);
    const node=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
    return !!(node&&els.body.contains(node));
  }

  function saveFontColorSelection(){
    const s=window.getSelection();
    if(!selectionInsideEditor(s))return;
    try{fontColorSavedRange=s.getRangeAt(0).cloneRange()}catch{}
  }

  // Mantém a última seleção válida mesmo quando o seletor nativo de cor rouba o foco.
  document.addEventListener('selectionchange',()=>{
    const s=window.getSelection();
    if(selectionInsideEditor(s))saveFontColorSelection();
  });
  els.body.addEventListener('mouseup',saveFontColorSelection);
  els.body.addEventListener('keyup',saveFontColorSelection);
  els.body.addEventListener('touchend',saveFontColorSelection,{passive:true});

  function restoreFontColorSelection(){
    if(!fontColorSavedRange)return false;
    const s=window.getSelection();
    if(!s)return false;
    try{s.removeAllRanges();s.addRange(fontColorSavedRange);return true}catch{return false}
  }

  function setSpanFontColor(span,color){
    span.dataset.userFontColor=color;
    span.style.setProperty('color',color,'important');
    span.style.setProperty('-webkit-text-fill-color',color,'important');
  }

  function applyColorToSavedRange(color){
    if(!fontColorSavedRange)return false;
    const range=fontColorSavedRange.cloneRange();
    if(!els.body.contains(range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement))return false;

    // Seleção vazia: prepara a cor para o texto digitado a seguir.
    if(range.collapsed){
      pendingTypingColor=color;
      restoreFontColorSelection();
      els.body.focus({preventScroll:true});
      try{
        document.execCommand('styleWithCSS',false,true);
        document.execCommand('foreColor',false,color);
      }catch{}
      return true;
    }

    // Caminho determinístico: envolve exatamente a seleção em um span persistente.
    const span=document.createElement('span');
    setSpanFontColor(span,color);
    try{
      range.surroundContents(span);
    }catch{
      try{
        const frag=range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }catch(err){
        console.warn('Não foi possível aplicar a cor à seleção:',err);
        return false;
      }
    }

    const newRange=document.createRange();
    newRange.selectNodeContents(span);
    const s=window.getSelection();
    try{s.removeAllRanges();s.addRange(newRange)}catch{}
    fontColorSavedRange=newRange.cloneRange();
    return true;
  }

  // Se o usuário escolheu uma cor sem texto selecionado, garante que os próximos
  // caracteres sejam inseridos com essa cor, sem depender do execCommand do browser.
  els.body.addEventListener('beforeinput',e=>{
    if(!pendingTypingColor||!e.data||e.inputType!=='insertText')return;
    const s=window.getSelection();
    if(!selectionInsideEditor(s)||!s.getRangeAt(0).collapsed)return;
    e.preventDefault();
    const r=s.getRangeAt(0);
    const span=document.createElement('span');
    setSpanFontColor(span,pendingTypingColor);
    span.textContent=e.data;
    r.insertNode(span);
    r.setStartAfter(span);r.collapse(true);
    s.removeAllRanges();s.addRange(r);
    fontColorSavedRange=r.cloneRange();
    markDirty();
  });

  const fontColorInput=$('fontColorInput');
  fontColorInput?.addEventListener('pointerdown',saveFontColorSelection);
  fontColorInput?.addEventListener('mousedown',saveFontColorSelection);
  fontColorInput?.addEventListener('touchstart',saveFontColorSelection,{passive:true});

  const applyFontColor=e=>{
    const c=String(e.target.value||'').trim();
    if(!/^#[0-9a-f]{6}$/i.test(c))return;
    const ok=applyColorToSavedRange(c);
    if(ok){
      pendingTypingColor=c;
      markDirty();
    }
  };
  fontColorInput?.addEventListener('input',applyFontColor);
  fontColorInput?.addEventListener('change',applyFontColor);
  $('highlightColorInput')?.addEventListener('input',e=>{els.body.focus();try{document.execCommand('hiliteColor',false,e.target.value)}catch{document.execCommand('backColor',false,e.target.value)}markDirty()});
  $('lineSpacingSelect')?.addEventListener('change',e=>{const v=e.target.value;if(!v)return;const s=window.getSelection();let node=s?.anchorNode;if(node?.nodeType===3)node=node.parentElement;while(node&&node.parentElement!==els.body)node=node.parentElement;if(node&&node!==els.body)node.style.lineHeight=v;else els.body.style.lineHeight=v;markDirty();e.target.value=''});
  // Paste padrão do navegador: preserva rich text permitido, sem limpeza automática.

  async function uploadAttachment(fileOrBlob,fileName){
    if(!fileOrBlob||!state.current)return null;const safe=(fileName||'arquivo').replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${state.user.id}/${state.current.id}/${Date.now()}-${safe}`;
    const up=await supabase.storage.from('note-images').upload(path,fileOrBlob,{upsert:false});if(up.error)throw up.error;
    const{data,error}=await supabase.from('attachments').insert({user_id:state.user.id,note_id:state.current.id,storage_path:path,public_url:'',file_name:fileName||safe}).select().single();
    if(error){await supabase.storage.from('note-images').remove([path]);throw error;}state.current.attachments=state.current.attachments||[];state.current.attachments.push(data);return data;
  }
  els.imageInput.addEventListener('change',async()=>{
    const file=els.imageInput.files?.[0];
    if(!file||!state.current)return;

    if(!true){
      try{
        await queueLocalAttachment(file,file.name,state.current.id);
        await renderImages();
        setAutosave('Imagem salva neste aparelho • aguardando internet','local-saved');
        showToast('Imagem guardada no aparelho e será enviada quando a conexão voltar.',3800);
      }catch(err){persistenceError(err);}
      els.imageInput.value='';
      return;
    }

    setAutosave('Enviando imagem...','local-saved');
    try{
      await uploadAttachment(file,file.name);
      await renderImages();
      setAutosave('Imagem salva e sincronizada','local-saved');
    }catch(err){
      console.error(err);
      try{
        await queueLocalAttachment(file,file.name,state.current.id);
        await renderImages();
        setAutosave('Imagem salva neste aparelho • salvamento local pendente','local-saved');
        showToast('Falha de rede: a imagem ficou preservada no aparelho.',3800);
      }catch(localErr){persistenceError(localErr);}
    }
    els.imageInput.value='';
  });
  async function signedImageUrl(path){const{data,error}=await supabase.storage.from('note-images').createSignedUrl(path,3600);if(error)return'';return data?.signedUrl||'';}
  async function renderImages(){
    const remote=(state.current?.attachments||[]).filter(a=>!(a.quick_ref===true||a.quick_ref==='true'));
    let pending=[];
    try{
      pending=state.current?await localAttachmentsForNote(state.current.id):[];
    }catch(err){
      console.warn('Anexos locais:',err);
    }

    if(!remote.length&&!pending.length){
      els.imageGallery.innerHTML='';
      return;
    }

    els.imageGallery.innerHTML=
      remote.map(x=>`
        <div class="image-card" data-image-card="${x.id}">
          <div class="image-loading">Carregando...</div>
          <button data-delimg="${x.id}" data-path="${esc(x.storage_path)}">Remover</button>
        </div>`).join('')+
      pending.map(x=>`
        <div class="image-card local-pending-image" data-local-image="${x.id}">
          <img alt="${esc(x.fileName||'Imagem local')}">
          <small>Pendente de armazenamento local</small>
          <button data-del-local-image="${x.id}">Remover</button>
        </div>`).join('');

    for(const x of remote){
      const card=els.imageGallery.querySelector(`[data-image-card="${x.id}"]`);
      if(!card)continue;
      const url=await signedImageUrl(x.storage_path);
      const loading=card.querySelector('.image-loading');
      if(url)loading.outerHTML=`<img src="${esc(url)}" alt="${esc(x.file_name||'Imagem')}">`;
      else loading.textContent='Imagem indisponível';
    }

    for(const x of pending){
      const img=els.imageGallery.querySelector(`[data-local-image="${x.id}"] img`);
      if(img){
        const objectUrl=URL.createObjectURL(x.blob);
        img.src=objectUrl;
        img.onload=()=>URL.revokeObjectURL(objectUrl);
      }
    }

    els.imageGallery.querySelectorAll('[data-delimg]').forEach(b=>b.addEventListener('click',async()=>{
      await supabase.storage.from('note-images').remove([b.dataset.path]);
      await supabase.from('attachments').delete().eq('id',b.dataset.delimg);
      state.current.attachments=state.current.attachments.filter(x=>x.id!==b.dataset.delimg);
      await renderImages();
      showToast('Imagem removida.');
    }));

    els.imageGallery.querySelectorAll('[data-del-local-image]').forEach(b=>b.addEventListener('click',async()=>{
      await deleteLocalAttachment(b.dataset.delLocalImage);
      await renderImages();
      showToast('Imagem local removida.');
    }));
  }


  els.quickImageInput?.addEventListener('change',async()=>{
    const noteId=state.quickImageTargetNoteId||state.selectedId;
    const files=[...(els.quickImageInput.files||[])];
    if(noteId&&files.length)await addQuickImagesToNote(noteId,files);
    els.quickImageInput.value='';
    state.quickImageTargetNoteId=null;
  });

  // Fluxo rápido no computador: clique no paciente/modelo e pressione Ctrl+V.
  document.addEventListener('paste',async e=>{
    if(els.keepPage.classList.contains('hidden'))return;
    if(els.editorPage && !els.editorPage.classList.contains('hidden'))return;
    if(e.target.closest('input,textarea,[contenteditable="true"]'))return;
    if(!state.selectedId)return;

    const files=imageFilesFromClipboard(e);
    if(files.length){
      e.preventDefault();
      await addQuickImagesToNote(state.selectedId,files);
    }
  });

  els.quickImageViewerClose?.addEventListener('click',()=>{
    try{els.quickImageViewer.close()}catch{}
    els.quickImageViewerImg.removeAttribute('src');
  });

  document.querySelector('[data-page="keep"]')?.addEventListener('click',openKeepModule);

  function setMainSidebarRetracted(retracted){
    const sidebar=document.getElementById('mainSidebar');
    const app=document.getElementById('appShell');
    const button=document.getElementById('collapseSidebar');
    if(!sidebar||!app||!button)return;
    sidebar.classList.toggle('is-retracted',!!retracted);
    app.classList.toggle('sidebar-retracted',!!retracted);
    button.setAttribute('aria-expanded',retracted?'false':'true');
    button.title=retracted?'Expandir menu':'Recolher menu';
    localStorage.setItem('aghuNotes.sidebarRetracted',retracted?'1':'0');
  }
  const sidebarToggle=document.getElementById('collapseSidebar');
  sidebarToggle?.addEventListener('click',()=>{
    const sidebar=document.getElementById('mainSidebar');
    setMainSidebarRetracted(!sidebar?.classList.contains('is-retracted'));
  });
  setMainSidebarRetracted(localStorage.getItem('aghuNotes.sidebarRetracted')==='1');


  const AGHU_THEMES=['navy','white','cyan','violet','magenta','emerald','gold','ruby','turquoise','silver'];


  function applyReadableThemeText(theme){
    const root=document.body;
    if(!root)return;
    let text='#eef7ff';
    let muted='#bdd5ea';

    if(theme==='white'){
      text='#111111';
      muted='#4f5963';
    }else if(theme==='navy'){
      text='#eef7ff';
      muted='#bdd5ea';
    }else{
      const cs=getComputedStyle(root);
      const customText=(cs.getPropertyValue('--custom-text')||'').trim();
      const customMuted=(cs.getPropertyValue('--custom-muted')||'').trim();
      text=customText||'#eefaff';
      muted=customMuted||'#9cc8d3';
    }

    root.style.setProperty('--aghu-dynamic-text',text);
    root.style.setProperty('--aghu-dynamic-muted',muted);
    root.classList.add('aghu-readable-applied');
  }


  function setSidebarTheme(theme){
    const sidebar=document.getElementById('mainSidebar');
    const app=document.getElementById('appShell');
    if(!sidebar)return;

    if(!AGHU_THEMES.includes(theme))theme='navy';
    const isWhite=theme==='white';
    const isNavy=theme==='navy';
    const isCustom=!isWhite&&!isNavy;

    // Classes legadas continuam válidas para Azul e Branco.
    sidebar.classList.toggle('sidebar-light-theme',isWhite);
    document.body.classList.toggle('app-theme-white-active',isWhite);
    document.body.classList.toggle('app-theme-navy-active',isNavy);
    document.body.classList.toggle('app-theme-custom-active',isCustom);

    app?.classList.toggle('app-theme-white',isWhite);
    app?.classList.toggle('app-theme-navy',isNavy);
    app?.classList.toggle('app-theme-custom',isCustom);

    document.body.dataset.aghuTheme=theme;
    applyReadableThemeText(theme);

    document.querySelectorAll('[data-sidebar-theme]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.sidebarTheme===theme);
    });

    localStorage.setItem(THEME_BASE_KEY,theme);
    if(state.user?.id)localStorage.setItem(userThemeKey(state.user.id),theme);
  }

  document.querySelectorAll('[data-sidebar-theme]').forEach(btn=>{
    btn.addEventListener('click',()=>setSidebarTheme(btn.dataset.sidebarTheme));
  });

  const THEME_BASE_KEY='aghuNotes.sidebarTheme';
  function userThemeKey(userId=state.user?.id){
    return userId?`${THEME_BASE_KEY}:${userId}`:THEME_BASE_KEY;
  }
  function preferredThemeForUser(user){
    if(user?.first_access===true)return 'white';
    const own=user?.id?localStorage.getItem(userThemeKey(user.id)):null;
    const legacy=localStorage.getItem(THEME_BASE_KEY);
    const candidate=own||legacy||'white';
    return AGHU_THEMES.includes(candidate)?candidate:'white';
  }

  const savedTheme=localStorage.getItem(THEME_BASE_KEY)||'white';
  setSidebarTheme(AGHU_THEMES.includes(savedTheme)?savedTheme:'white');


  document.querySelectorAll('.inert-menu-item').forEach(button=>{
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      showToast('Item visual inativo neste aplicativo.');
    });
  });

  const googleSideMenu=document.getElementById('googleDocsMenuBtn');
  googleSideMenu?.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();openGoogleDocsSettings();
  });

  const menuSearch=document.getElementById('menuSearch');
  menuSearch?.addEventListener('input',event=>{
    const q=event.target.value.trim().toLowerCase();
    document.querySelectorAll('#sideMenu .menu-item').forEach(button=>{
      button.style.display=!q||button.textContent.toLowerCase().includes(q)?'':'none';
    });
  });

  window.addEventListener('online',async()=>{
    refreshAppCounters();
    setSyncStatus('syncing');
    await syncPendingDrafts();
    await syncPendingLocalAttachments();
    await syncFromCloud();
    if(state.current&&!getDraft(state.current.id)){
      try{
        const cloud=await v64FetchCloudNote(state.current.id);
        setAutosave(cloud?'Salvo e sincronizado':'Salvo neste aparelho • sincronização pendente',cloud?'cloud-saved':'local-saved');
      }catch{setAutosave('Salvo neste aparelho • sincronização pendente','local-saved')}
    }
  });
  window.addEventListener('offline',()=>{
    if(state.current&&state.isDirty)persistDraftNow();
    setSyncStatus('offline');
    if(state.current)setAutosave(state.isDirty?'Salvo neste aparelho • offline':'Offline • última versão preservada neste aparelho','local-saved');
  });
  window.addEventListener('focus',()=>{syncFromCloud();});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
        syncFromCloud();
    }
  });
  window.addEventListener('pagehide',()=>{
    if(state.current&&state.isDirty)persistDraftNow();
    if(state.isDirty&&true)flushSave();
  });
  window.addEventListener('beforeunload',()=>{
    if(state.current&&state.isDirty)persistDraftNow();
  });
  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    window.addEventListener('load', async()=>{
      try{
        const reg = await navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'});
        await reg.update();
      }catch(err){
        console.warn('Service Worker:',err);
      }
    });
  }
  window.addEventListener('resize',()=>{
    const wasCompact=els.keepPage?.classList.contains('compact-name-only');
    const isCompact=updateCompactNameOnlyMode();
    if(wasCompact!==isCompact && !els.keepPage?.classList.contains('hidden'))renderNotes();
  });


// v42 - rebrand, simplificação visual e menu interno corrigido
window.AGhuBuildVersion='69.16';
const AGHU_V42_BRAND = 'Anotações Gerais de Histórias e Unidades';
function applyV42BrandingAndLayout(){
  document.body.classList.add('v44-sidebar-menu');
  document.querySelectorAll('.aghu-word small').forEach(el=>el.textContent=AGHU_V42_BRAND);
  const authPrivacy=document.querySelector('.auth-privacy');
  if(authPrivacy)authPrivacy.textContent='Aplicativo independente para anotações pessoais. Sincronização online e offline por usuário.';
  const authDisclaimer=document.querySelector('.auth-disclaimer');
  if(authDisclaimer)authDisclaimer.textContent='Notas criptografadas • login pessoal • salva offline • sincroniza quando houver internet';
  const keepTabOpen=document.getElementById('keepTabOpenBtn');
  if(keepTabOpen)keepTabOpen.innerHTML='🗒 Notas';
  const keepTab=document.getElementById('keepTab');
  if(keepTab)keepTab.classList.add('active');
  const theadRow=document.querySelector('.notes-table thead tr');
  if(theadRow){
    theadRow.innerHTML=`<th data-sort="title">Título <span class="sort-glyph">↕</span></th><th class="icon-col" title="Abrir"></th><th class="icon-col" title="Fixar"></th><th class="icon-col" title="Arquivar"></th><th class="icon-col" title="Excluir"></th><th class="icon-col blue-cap" title="Editar nota"></th>`;
  }
  const openSel=document.getElementById('openSelectedBtn');
  if(openSel)openSel.textContent='Abrir nota';
  const editBtn=document.getElementById('editPatientMetaBtn');
  if(editBtn){
    editBtn.textContent='Editar nota';
    editBtn.onclick=()=>{if(state.selectedId)openNote(state.selectedId);};
  }
}

extractPatientMetadata=function(note){
  const title=String(note?.title||'').trim() || 'Sem título';
  return {
    name:title,
    age:'',
    record:'',
    recognized:{name:true,age:false,record:false},
    manual:{name:false,age:false,record:false},
    auto:{name:'',age:'',record:''}
  };
};

actionCells=function(n){
  const I=window.AGhuNoteActionIcon;
  if(n.deleted){
    return `<td class="row-action"><button class="grid-icon-btn action-restore" title="Restaurar" aria-label="Restaurar" data-restore-row="${n.id}">${I('restore')}</button></td><td class="row-action"><button class="grid-icon-btn danger action-delete-forever" title="Excluir definitivamente" aria-label="Excluir definitivamente" data-delete-forever="${n.id}">${I('trash')}</button></td><td class="row-action"></td><td class="row-action"></td><td class="row-action"></td>`;
  }
  return `<td class="row-action"><button class="grid-icon-btn action-open" title="Abrir" aria-label="Abrir" data-open="${n.id}">${I('open')}</button></td><td class="row-action"><button class="grid-icon-btn action-pin" title="Fixar" aria-label="Fixar" data-star="${n.id}">${I('pin')}</button></td><td class="row-action"><button class="grid-icon-btn action-archive" title="${n.archived?'Restaurar do arquivo':'Arquivar'}" aria-label="${n.archived?'Restaurar do arquivo':'Arquivar'}" data-archive-row="${n.id}">${I('archive')}</button></td><td class="row-action"><button class="grid-icon-btn danger action-trash" title="Mover para a lixeira" aria-label="Mover para a lixeira" data-trash-row="${n.id}">${I('trash')}</button></td><td class="row-action"><button class="grid-icon-btn action-edit" title="Editar nota" aria-label="Editar nota" data-open="${n.id}">${I('edit')}</button></td>`;
};

renderNotes=function(){
  const rows=filteredNotes();
  updateCompactNameOnlyMode();

  els.empty.classList.toggle('hidden',rows.length>0);
  els.emptyTrash.classList.toggle('hidden',state.filter!=='trash');
  if(state.selectedId && !rows.some(n=>n.id===state.selectedId))state.selectedId=null;

  const one=n=>{
    const title=String(n?.title||'').trim() || 'Sem título';
    const qrefs=quickReferenceAttachments(n);
    const hint=qrefs.length ? `<span class="quick-ref-count" title="Imagens para consulta rápida">${qrefs.length} img</span>` : '';
    const accent=noteAccentColor(n);
    const noteBg=noteCardBackground(n);
    return `<tr data-id="${n.id}" class="${state.selectedId===n.id?'selected':''}" style="--note-accent:#d6dbe1;--note-bg:#ffffff">
      <td data-label="Nome" class="patient-name-cell" data-name-cell="${n.id}">
        <div class="patient-name-main">
          <strong>${esc(title)}</strong>
          ${hint}
          <button class="quick-ref-add" type="button" data-add-quick-image="${n.id}" title="Adicionar imagem para consulta rápida">＋ imagem</button>
        </div>
        <div class="keep-card-preview">${esc(stripHtml(n.content_html||'').slice(0,420))}</div>
        <div class="quick-ref-zone" data-quick-zone="${n.id}" tabindex="0" aria-label="Cole uma imagem para consulta rápida">
          <div class="quick-ref-paste-hint">Selecione esta nota e cole um print com Ctrl+V, ou use “＋ imagem”.</div>
          <div class="quick-ref-strip" data-quick-strip="${n.id}"></div>
        </div>
      </td>
      ${actionCells(n)}
    </tr>`;
  };

  let h='';
  if(state.filter==='all'){
    const fixed=rows.filter(n=>n.pinned),normal=rows.filter(n=>!n.pinned);
    if(fixed.length)h+=`<tr class="notes-group-row pinned-group"><td colspan="6">Fixadas</td></tr>`+fixed.map(one).join('');
    if(normal.length)h+=`<tr class="notes-group-row"><td colspan="6">Não Fixadas</td></tr>`+normal.map(one).join('');
  }else h=rows.map(one).join('');

  els.tbody.innerHTML=h;

  els.tbody.querySelectorAll('tr[data-id]').forEach(tr=>{
    tr.addEventListener('click',e=>{
      if(e.target.closest('button')||e.target.closest('input')||e.target.closest('.quick-ref-thumb'))return;
      state.selectedId=tr.dataset.id;
      renderNotes();
    });
    tr.addEventListener('dblclick',e=>{
      if(e.target.closest('.quick-ref-zone')||e.target.closest('button')||e.target.closest('input'))return;
      openNote(tr.dataset.id);
    });
  });

  els.tbody.querySelectorAll('[data-quick-zone]').forEach(zone=>{
    zone.addEventListener('click',e=>{e.stopPropagation(); state.selectedId=zone.dataset.quickZone;});
    zone.addEventListener('paste',e=>handleQuickReferencePaste(e,zone.dataset.quickZone));
    zone.addEventListener('dragover',e=>{ if([...(e.dataTransfer?.items||[])].some(i=>i.kind==='file')){ e.preventDefault(); zone.classList.add('quick-ref-active'); } });
    zone.addEventListener('dragleave',()=>zone.classList.remove('quick-ref-active'));
    zone.addEventListener('drop',async e=>{
      zone.classList.remove('quick-ref-active');
      const files=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/'));
      if(files.length){ e.preventDefault(); e.stopPropagation(); await addQuickImagesToNote(zone.dataset.quickZone,files); }
    });
  });

  els.tbody.querySelectorAll('[data-add-quick-image]').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    state.quickImageTargetNoteId=b.dataset.addQuickImage;
    state.selectedId=b.dataset.addQuickImage;
    els.quickImageInput.value='';
    els.quickImageInput.click();
  }));

  els.tbody.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation(); openNote(b.dataset.open)}));
  els.tbody.querySelectorAll('[data-star]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation(); const n=state.notes.find(x=>x.id===b.dataset.star); if(n)await quickUpdate(n.id,{pinned:!n.pinned})}));
  els.tbody.querySelectorAll('[data-archive-row]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation(); const n=state.notes.find(x=>x.id===b.dataset.archiveRow); if(n)await quickUpdate(n.id,{archived:!n.archived})}));
  els.tbody.querySelectorAll('[data-trash-row]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation(); const n=state.notes.find(x=>x.id===b.dataset.trashRow); if(n)await moveToTrash(n.id)}));
  els.tbody.querySelectorAll('[data-restore-row]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation(); await restoreNote(b.dataset.restoreRow)}));
  els.tbody.querySelectorAll('[data-delete-forever]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation(); const n=state.notes.find(x=>x.id===b.dataset.deleteForever); if(n)await deleteNoteForever(n,true)}));

  updateSideActions();
  hydrateQuickReferenceImages().catch(err=>console.warn('Consulta rápida:',err));
};

applyV42BrandingAndLayout();

  // v59: aviso comercial fixo somente enquanto a tela de login estiver visível.
  function syncAccessNoticeVisibility(){
    const banner=document.getElementById('campaignJK');
    const auth=document.getElementById('authScreen');
    if(!banner||!auth)return;
    const visible=!auth.classList.contains('hidden');
    banner.classList.toggle('campaign-login-active',visible);
    banner.classList.toggle('campaign-visible',visible);
    banner.setAttribute('aria-hidden',visible?'false':'true');
  }
  const campaignAuthScreen=document.getElementById('authScreen');
  if(campaignAuthScreen){
    new MutationObserver(syncAccessNoticeVisibility).observe(campaignAuthScreen,{attributes:true,attributeFilter:['class']});
    syncAccessNoticeVisibility();
  }

  bootstrap();
})();

  
//script 5

(function(){
  const KEY='aghuNotes.v51ResponsiveInitialized';

  function applyResponsiveStartup(){
    const app=document.getElementById('appShell');
    const sidebar=document.getElementById('mainSidebar');
    if(!app||!sidebar)return;

    const compact=window.matchMedia('(max-width:1100px)').matches;
    if(compact && sessionStorage.getItem(KEY)!=='1'){
      try{
        if(typeof window.setMainSidebarRetracted==='function'){
          window.setMainSidebarRetracted(true);
        }else{
          sidebar.classList.add('is-retracted');
          app.classList.add('sidebar-retracted');
          const b=document.getElementById('collapseSidebar');
          if(b)b.setAttribute('aria-expanded','false');
        }
      }catch{}
      sessionStorage.setItem(KEY,'1');
    }
  }

  function normalizeViewport(){
    document.documentElement.style.setProperty('--aghu-vw',`${document.documentElement.clientWidth}px`);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      normalizeViewport();
      setTimeout(applyResponsiveStartup,0);
    },{once:true});
  }else{
    normalizeViewport();
    setTimeout(applyResponsiveStartup,0);
  }

  window.addEventListener('resize',normalizeViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',normalizeViewport,{passive:true});
})();

//script 6

(()=>{
  const cfg=window.APP_CONFIG||{};
  const $=id=>document.getElementById(id);
  const purchaseBtn=$('purchaseAccessBtn');
  const dialog=$('purchaseAccessDialog');
  const closeBtn=$('purchaseCloseBtn');
  const form=$('purchaseForm');
  const nameInput=$('purchaseName');
  const emailInput=$('purchaseEmail');
  const cpfInput=$('purchaseCpf');
  const genBtn=$('purchaseGenerateBtn');
  const status=$('purchaseStatus');
  const result=$('purchasePixResult');
  const qr=$('purchaseQrImage');
  const pixCode=$('purchasePixCode');
  const copyBox=pixCode?.closest('.purchase-copy-box');
  const copyBtn=$('purchaseCopyBtn');
  const payState=$('purchasePaymentState');
  const ticket=$('purchaseTicketLink');
  const activateLink=$('purchaseActivateLink');

  const activationDialog=$('activationDialog');
  const activationClose=$('activationCloseBtn');
  const activationForm=$('activationForm');
  const activationLogin=$('activationLogin');
  const activationPassword=$('activationPassword');
  const activationConfirm=$('activationPasswordConfirm');
  const activationSubmit=$('activationSubmitBtn');
  const activationStatus=$('activationStatus');

  let purchasePollTimer=null;
  let currentPurchase=null;

  const jsonHeaders=()=>({
    'Content-Type':'application/json',
    'apikey':cfg.SUPABASE_ANON_KEY||''
  });

  async function functionCall(name,payload){
    const r=await fetch(`${cfg.SUPABASE_URL}/functions/v1/${name}`,{
      method:'POST',
      headers:jsonHeaders(),
      body:JSON.stringify(payload)
    });
    let data={};
    try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data?.error||data?.detail||`Falha HTTP ${r.status}`);
    return data;
  }

  function setPurchaseStatus(message,type=''){
    status.textContent=message||'';
    status.className=`purchase-status${type?` ${type}`:''}`;
  }

  function stopPurchasePolling(){
    if(purchasePollTimer){clearInterval(purchasePollTimer);purchasePollTimer=null}
  }

  function savePendingPurchase(p){
    try{
      if(p) sessionStorage.setItem('aghuNotes.pendingPix',JSON.stringify(p));
      else sessionStorage.removeItem('aghuNotes.pendingPix');
    }catch{}
  }

  function renderStoredPurchase(p){
    if(!p)return;
    result.classList.remove('hidden');

    const code=String(p.qr_code||'').trim();
    pixCode.value=code;
    if(code) copyBox?.classList.remove('hidden');
    else copyBox?.classList.add('hidden');

    if(p.qr_code_base64){
      qr.src=p.qr_code_base64.startsWith('data:')
        ? p.qr_code_base64
        : `data:image/png;base64,${p.qr_code_base64}`;
      qr.classList.remove('hidden');
    }else{
      qr.removeAttribute('src');
      qr.classList.add('hidden');
    }

    if(p.ticket_url){
      ticket.href=p.ticket_url;
      ticket.classList.remove('hidden');
    }else{
      ticket.removeAttribute('href');
      ticket.classList.add('hidden');
    }

    activateLink.classList.add('hidden');
    if(p.activation_url&&!p.activated){
      activateLink.href=p.activation_url;
      activateLink.classList.remove('hidden');
    }

    if(p.activated){
      payState.textContent='Acesso já ativado.';
    }else if(p.approved||p.status==='approved'){
      payState.textContent='Pagamento confirmado!';
    }else{
      payState.textContent='Consultando pagamento...';
    }
  }

  function cpfDigits(value){
    return String(value||'').replace(/\D/g,'').slice(0,11);
  }

  function validCpf(value){
    const cpf=cpfDigits(value);
    if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
    const calc=(base,factor)=>{
      let sum=0;
      for(const d of base)sum+=Number(d)*factor--;
      const r=(sum*10)%11;
      return r===10?0:r;
    };
    return calc(cpf.slice(0,9),10)===Number(cpf[9]) &&
           calc(cpf.slice(0,10),11)===Number(cpf[10]);
  }

  cpfInput?.addEventListener('input',()=>{
    const d=cpfDigits(cpfInput.value);
    let v=d;
    if(d.length>3)v=d.slice(0,3)+'.'+d.slice(3);
    if(d.length>6)v=d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6);
    if(d.length>9)v=d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9,11);
    cpfInput.value=v;
  });

  function showPix(p){
    currentPurchase={
      order_id:p.order_id,
      status_token:p.status_token,
      status:p.status||'pending',
      qr_code:p.qr_code||'',
      qr_code_base64:p.qr_code_base64||'',
      ticket_url:p.ticket_url||'',
      approved:p.status==='approved'
    };
    savePendingPurchase(currentPurchase);
    renderStoredPurchase(currentPurchase);

    if(!currentPurchase.qr_code&&!currentPurchase.qr_code_base64&&!currentPurchase.ticket_url){
      setPurchaseStatus('O Mercado Pago criou a cobrança, mas não devolveu os dados do Pix. Gere uma nova cobrança e confira o CPF informado.','error');
    }else{
      payState.textContent=currentPurchase.approved?'Pagamento confirmado.':'Aguardando confirmação do pagamento...';
    }

    startPurchasePolling();
  }

  async function checkPurchase(){
    if(!currentPurchase)return;
    try{
      const p=await functionCall('pix-status',currentPurchase);
      if(p.approved){
        stopPurchasePolling();
        currentPurchase={
          ...(currentPurchase||{}),
          status:p.status||'approved',
          approved:true,
          activated:!!p.activated,
          activation_url:p.activation_url||currentPurchase?.activation_url||'',
          activation_expires_at:p.activation_expires_at||null
        };
        renderStoredPurchase(currentPurchase);
        payState.textContent=p.activated?'Acesso já ativado.':'Pagamento confirmado!';
        setPurchaseStatus(
          p.email_sent
            ? 'Pagamento aprovado. O link de ativação também foi enviado ao e-mail informado.'
            : 'Pagamento aprovado. Seu link de ativação já está disponível.',
          'ok'
        );
        if(p.activated){
          savePendingPurchase(null);
        }else{
          savePendingPurchase(currentPurchase);
        }
      }else if(['rejected','cancelled','expired','error'].includes(p.status)){
        stopPurchasePolling();
        payState.textContent='Pagamento não aprovado.';
        setPurchaseStatus(`Status do pagamento: ${p.status}.`,'error');
        savePendingPurchase(null);
      }
    }catch(e){
      console.warn('Consulta Pix:',e);
    }
  }

  function startPurchasePolling(){
    stopPurchasePolling();
    checkPurchase();
    purchasePollTimer=setInterval(checkPurchase,8000);
  }

  purchaseBtn?.addEventListener('click',()=>{
    setPurchaseStatus('');
    const remembered=localStorage.getItem('aghuNotes.lastLogin')||'';
    if(!emailInput.value&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(remembered))emailInput.value=remembered;
    dialog.showModal();
    try{
      const pending=JSON.parse(sessionStorage.getItem('aghuNotes.pendingPix')||'null');
      if(pending?.order_id&&pending?.status_token){
        currentPurchase=pending;
        renderStoredPurchase(pending);
        if(pending.approved&&pending.activation_url&&!pending.activated){
          setPurchaseStatus('Pagamento aprovado. Seu link de ativação já está disponível.','ok');
        }else{
          payState.textContent='Consultando pagamento anterior...';
        }
        startPurchasePolling();
      }
    }catch{}
  });

  closeBtn?.addEventListener('click',()=>{stopPurchasePolling();dialog.close()});

  form?.addEventListener('submit',async e=>{
    e.preventDefault();
    setPurchaseStatus('');
    result.classList.add('hidden');
    activateLink.classList.add('hidden');
    genBtn.disabled=true;
    genBtn.textContent='Gerando Pix...';
    try{
      if(!validCpf(cpfInput?.value||'')){
        throw new Error('Informe um CPF válido para gerar o Pix.');
      }
      const p=await functionCall('pix-create',{
        name:nameInput.value.trim(),
        email:emailInput.value.trim(),
        cpf:cpfDigits(cpfInput.value),
        request_id:crypto.randomUUID()
      });
      setPurchaseStatus('Pix gerado. Faça o pagamento pelo QR Code ou Pix Copia e Cola.','ok');
      showPix(p);
    }catch(e){
      setPurchaseStatus(e?.message||'Não foi possível gerar o Pix.','error');
    }finally{
      genBtn.disabled=false;
      genBtn.textContent='Gerar Pix';
    }
  });

  copyBtn?.addEventListener('click',async()=>{
    const value=pixCode.value;
    if(!value)return;
    try{
      await navigator.clipboard.writeText(value);
      copyBtn.textContent='Copiado';
    }catch{
      pixCode.focus();pixCode.select();
      try{document.execCommand('copy');copyBtn.textContent='Copiado'}catch{}
    }
    setTimeout(()=>copyBtn.textContent='Copiar Pix',1600);
  });

  async function tokenHash(rawToken){
    const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rawToken));
    return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function activationTokenFromUrl(){
    return new URL(location.href).searchParams.get('activate')||'';
  }

  async function validateActivationToken(raw){
    const h=await tokenHash(raw);
    const r=await window.AGhuCloudRaw.rpc('validate_paid_activation',{token_hash_arg:h});
    if(r.error)throw r.error;
    return r.data;
  }

  function setActivationStatus(message,type=''){
    activationStatus.textContent=message||'';
    activationStatus.className=`purchase-status${type?` ${type}`:''}`;
  }

  async function openActivationFromUrl(){
    const raw=activationTokenFromUrl();
    if(!raw)return;
    activationDialog.showModal();
    activationSubmit.disabled=true;
    setActivationStatus('Validando seu link...');
    try{
      const v=await validateActivationToken(raw);
      if(!v?.valid){
        setActivationStatus('Este link é inválido, expirou ou já foi utilizado.','error');
        return;
      }
      setActivationStatus('Pagamento confirmado. Defina seu login e sua senha.','ok');
      activationSubmit.disabled=false;
    }catch(e){
      setActivationStatus(e?.message||'Não foi possível validar o link.','error');
    }
  }

  activationClose?.addEventListener('click',()=>activationDialog.close());

  activationForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const raw=activationTokenFromUrl();
    const login=activationLogin.value.trim().toLowerCase();
    const password=activationPassword.value;
    if(!raw){setActivationStatus('Link de ativação ausente.','error');return}
    if(password.length<6){setActivationStatus('A senha deve ter pelo menos 6 caracteres.','error');return}
    if(password!==activationConfirm.value){setActivationStatus('As senhas não coincidem.','error');return}
    activationSubmit.disabled=true;
    activationSubmit.textContent='Criando conta...';
    setActivationStatus('');
    try{
      const created=await functionCall('activate-account',{token:raw,login,password});
      if(!created?.ok)throw new Error('Não foi possível concluir a ativação.');
      const u=new URL(location.href);u.searchParams.delete('activate');history.replaceState({},'',u.pathname+u.search+u.hash);
      activationDialog.close();
      const loginInput=document.getElementById('loginEmail'),loginError=document.getElementById('loginError');
      if(loginInput)loginInput.value=created.login||login;
      if(loginError){loginError.textContent='Conta criada com sucesso. Entre com o login e a senha que você acabou de definir.';loginError.style.color='#287b58';}
    }catch(e){setActivationStatus(String(e?.message||e||'Não foi possível criar a conta.'),'error');}
    finally{activationSubmit.disabled=false;activationSubmit.textContent='Criar minha conta';}
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openActivationFromUrl,{once:true});
  else setTimeout(openActivationFromUrl,0);
})();

//script 7

window.AGHU_NOTES_RELEASE=Object.freeze({version:'v69.12',project:'imwwqdgovfxhntsdkxlz',storage:'vault_records',pix:true,exclusiveSession:true});

//script 8

(function(){
  function enforceOriginal(){
    document.documentElement.dataset.uiMode='original';
    try{
      localStorage.setItem('aghuNotes.uiMode','original');
      }catch(_){}
  }
  window.AGhuSetUiMode=function(){ enforceOriginal(); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enforceOriginal,{once:true});
  else enforceOriginal();
})();
