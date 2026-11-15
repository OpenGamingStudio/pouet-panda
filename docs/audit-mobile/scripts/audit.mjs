import puppeteer from '/root/.npm/_npx/8003d8991b0d346b/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [dist, out] = process.argv.slice(2);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const srv = http.createServer((q,r)=>{let f=path.join(dist,q.url==='/'?'index.html':q.url.split('?')[0]);if(!fs.existsSync(f)){r.statusCode=404;return r.end()}r.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');r.end(fs.readFileSync(f))}).listen(8231);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox'] });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cfgs=[['phone320',{width:320,height:568,deviceScaleFactor:2,isMobile:true,hasTouch:true}],['zoom200',{width:640,height:360,deviceScaleFactor:2}],['zoom400',{width:320,height:180,deviceScaleFactor:2}]];
const rep={};
for (const [name,vp] of cfgs){
  const p=await b.newPage(); await p.setViewport(vp);
  await p.goto('http://127.0.0.1:8231/',{waitUntil:'load'}); await sleep(600);
  const measure=async(screen)=>{
    const r=await p.evaluate(()=>{
      const vis=e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0&&!e.closest('[hidden]')};
      const els=[...document.querySelectorAll('button,a,input,[role=tab],[role=switch],[role=radio],[tabindex]')].filter(vis);
      const small=els.map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className.toString().slice(0,30)||e.tagName,w:Math.round(r.width),h:Math.round(r.height),off:r.right>innerWidth+1||r.left<-1||r.bottom>innerHeight+1&&false}}).filter(x=>x.w<44||x.h<44);
      return {n:els.length,small,hscroll:document.documentElement.scrollWidth>innerWidth+1,clipped:els.filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left<-1}).map(e=>e.id)};
    });
    (rep[name] ??= {})[screen]=r;
    await p.screenshot({path:`${out}/${name}-${screen}.png`});
  };
  const click=async id=>{await p.evaluate(i=>document.getElementById(i)?.click(),id);await sleep(400)};
  await measure('menu');
  await click('btn-shop'); await measure('boutique'); await click('shop-back');
  await click('btn-settings'); await measure('reglages'); await click('settings-back');
  await click('btn-play'); await sleep(2500); await measure('partie');
  await p.keyboard.press('Escape'); await sleep(400); await measure('pause');
  await click('btn-pause-menu'); await sleep(300);
  await p.close();
}
console.log(JSON.stringify(rep,null,1));
await b.close(); srv.close();
