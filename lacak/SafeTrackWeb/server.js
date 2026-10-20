// SafeTrack server — tanpa dependensi. Jalankan: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DB=path.join(__dirname,'data.json'),PUB=path.join(__dirname,'public');
let D={users:{},grants:[],loc:{}};try{D=JSON.parse(fs.readFileSync(DB))}catch{}
const save=()=>fs.writeFile(DB,JSON.stringify(D),()=>{});
const norm=p=>{let d=String(p||'').replace(/\D/g,'');if(d.startsWith('0'))d='62'+d.slice(1);return d};
const rid=()=>crypto.randomBytes(6).toString('hex');
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
const send=(res,c,o)=>{res.writeHead(c,{'content-type':'application/json'});res.end(JSON.stringify(o))};
const findUser=t=>t&&Object.values(D.users).find(u=>u.token===t);
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(!u.pathname.startsWith('/api/')){
    const f=path.join(PUB,u.pathname==='/'?'index.html':path.normalize(u.pathname).replace(/^(\.\.[\/\\])+/,''));
    return fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(b)});
  }
  let body='';req.on('data',c=>body+=c);req.on('end',()=>{
    let b={};try{b=JSON.parse(body||'{}')}catch{}
    const route=u.pathname.slice(5),me=findUser(req.headers['x-token']);
    try{
      if(route==='register'){
        const phone=norm(b.phone),name=String(b.name||'').trim().slice(0,40);
        if(phone.length<8||!name)return send(res,400,{error:'Isi nama dan nomor HP yang valid'});
        const ex=D.users[phone];
        if(ex&&ex.token!==req.headers['x-token'])return send(res,409,{error:'Nomor ini sudah terdaftar di perangkat lain'});
        D.users[phone]={phone,name,token:ex?ex.token:crypto.randomBytes(16).toString('hex')};save();
        return send(res,200,{token:D.users[phone].token});
      }
      if(!me)return send(res,401,{error:'auth'});
      const nm=p=>(D.users[p]||{}).name||'+'+p;
      if(route==='state'){
        const out=D.grants.filter(g=>g.from===me.phone).map(g=>({id:g.id,phone:g.to,name:nm(g.to),status:g.status,at:(D.loc[g.to]||{}).t}));
        const inn=D.grants.filter(g=>g.to===me.phone).map(g=>({id:g.id,phone:g.from,name:nm(g.from),status:g.status,lastViewed:g.lastViewed}));
        return send(res,200,{me:{name:me.name,phone:me.phone},out,in:inn});
      }
      if(route==='request'){
        const to=norm(b.phone);if(to.length<8||to===me.phone)return send(res,400,{error:'Nomor tidak valid'});
        let g=D.grants.find(x=>x.from===me.phone&&x.to===to);
        if(!g){g={id:rid(),from:me.phone,to,status:'pending',createdAt:Date.now()};D.grants.push(g)}
        else if(g.status==='denied'||g.status==='revoked'){g.status='pending';g.createdAt=Date.now()}
        save();return send(res,200,{grant:g,reused:g.status==='granted'});
      }
      if(route==='respond'||route==='revoke'){
        const g=D.grants.find(x=>x.id===b.id);if(!g)return send(res,404,{error:'Tidak ditemukan'});
        if(route==='respond'){if(g.to!==me.phone||g.status!=='pending')return send(res,403,{error:'Tidak diizinkan'});g.status=b.allow?'granted':'denied';if(b.allow)g.grantedAt=Date.now()}
        else{if(g.to!==me.phone&&g.from!==me.phone)return send(res,403,{error:'Tidak diizinkan'});g.status='revoked'}
        save();return send(res,200,{ok:1});
      }
      if(route==='location'){
        const lat=+b.lat,lng=+b.lng;if(!isFinite(lat)||!isFinite(lng))return send(res,400,{error:'Koordinat salah'});
        const l=D.loc[me.phone]||(D.loc[me.phone]={trail:[]});
        Object.assign(l,{lat,lng,acc:+b.acc||0,t:Date.now()});l.trail.push([lat,lng,l.t]);if(l.trail.length>300)l.trail.shift();
        save();return send(res,200,{ok:1});
      }
      if(route.startsWith('track/')){
        const g=D.grants.find(x=>x.id===route.slice(6));
        if(!g||g.from!==me.phone||g.status!=='granted')return send(res,403,{error:'Belum ada izin'});
        g.lastViewed=Date.now();const l=D.loc[g.to];
        return send(res,200,{name:nm(g.to),loc:l?{lat:l.lat,lng:l.lng,acc:l.acc,t:l.t}:null,trail:l?l.trail.map(p=>[p[0],p[1]]):[]});
      }
      send(res,404,{error:'Rute tidak ada'});
    }catch(e){send(res,500,{error:'Server error'})}
  });
}).listen(PORT,()=>console.log('SafeTrack berjalan di http://localhost:'+PORT));
