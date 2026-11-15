import puppeteer from 'puppeteer-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const serve=(dist,port)=>{const root=path.resolve(dist);return http.createServer((q,r)=>{
  let u;try{u=decodeURIComponent(q.url.split('?')[0])}catch{r.statusCode=400;return r.end()}
  const f=path.resolve(root,'.'+(u==='/'?'/index.html':u));
  if(f!==root&&!f.startsWith(root+path.sep)){r.statusCode=403;return r.end()}
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;return r.end()}
  r.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');r.end(fs.readFileSync(f))}).listen(port,'127.0.0.1')};
const dist=process.argv[2];const srv=serve(dist,8232);
const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:320,height:568,isMobile:true,hasTouch:true});
await p.goto('http://127.0.0.1:8232/');const sl=ms=>new Promise(r=>setTimeout(r,ms));await sl(500);
const flat=(n,d=0,o=[])=>{if(!n)return o;if(!['generic','none','StaticText','InlineTextBox'].includes(n.role)||n.role==='StaticText')o.push('  '.repeat(d)+n.role+': '+(n.name||'')+(n.checked!==undefined?' [checked='+n.checked+']':'')+(n.value!==undefined?' [value='+n.value+']':''));(n.children||[]).forEach(c=>flat(c,d+1,o));return o};
const snap=async t=>{console.log('## '+t);console.log(flat(await p.accessibility.snapshot({interestingOnly:true})).join('\n'))};
const click=async id=>{await p.evaluate(i=>document.getElementById(i)?.click(),id);await sl(400)};
await snap('menu');await click('btn-shop');await snap('boutique');await click('shop-back');await click('btn-settings');await snap('reglages');await click('settings-back');
await click('btn-play');await sl(2500);await snap('partie');await p.keyboard.press('Escape');await sl(400);await snap('pause');
await b.close();srv.close();
