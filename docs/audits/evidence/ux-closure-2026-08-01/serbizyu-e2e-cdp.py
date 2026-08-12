#!/usr/bin/env python3
import json, os, socket, subprocess, sys, tempfile, time
from pathlib import Path
import requests, websocket

BASE='https://daviddatux25.github.io/Serbizyu-2.0/app/?independent-e2e=1#/'
MODE=sys.argv[1] if len(sys.argv)>1 else 'shell'

class CDP:
    def __init__(self):
        sock=socket.socket(); sock.bind(('127.0.0.1',0)); self.port=sock.getsockname()[1]; sock.close()
        self.tmp=tempfile.TemporaryDirectory(prefix='serbizyu-cdp-')
        self.proc=subprocess.Popen([
            '/usr/bin/google-chrome','--headless','--no-sandbox','--disable-gpu',
            '--remote-allow-origins=*',f'--remote-debugging-port={self.port}',
            f'--user-data-dir={self.tmp.name}','--window-size=390,844',BASE
        ],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        deadline=time.time()+15; pages=[]
        while time.time()<deadline:
            try:
                pages=requests.get(f'http://127.0.0.1:{self.port}/json',timeout=1).json()
                pages=[p for p in pages if p.get('type')=='page' and 'daviddatux25.github.io/Serbizyu-2.0/app/' in p.get('url','')]
                if pages: break
            except Exception: pass
            time.sleep(.15)
        if not pages: raise RuntimeError('Chrome CDP page unavailable')
        self.ws=websocket.create_connection(pages[0]['webSocketDebuggerUrl'],timeout=10,http_proxy_host=None,http_proxy_port=None)
        self.i=0
    def call(self,method,params=None):
        self.i+=1; ident=self.i
        self.ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
        while True:
            msg=json.loads(self.ws.recv())
            if msg.get('id')==ident:
                if 'error' in msg: raise RuntimeError(msg['error'])
                return msg.get('result',{})
    def eval(self,expr,awaitPromise=False):
        r=self.call('Runtime.evaluate',{'expression':expr,'returnByValue':True,'awaitPromise':awaitPromise})
        if 'exceptionDetails' in r: raise RuntimeError(r['exceptionDetails'])
        return r.get('result',{}).get('value')
    def wait(self,s=.7): time.sleep(s)
    def wait_for(self,expr,timeout=12):
        deadline=time.time()+timeout
        while time.time()<deadline:
            try:
                if self.eval(expr): return True
            except Exception: pass
            time.sleep(.15)
        try:
            diag=self.eval("({href:location.href,title:document.title,body:(document.body?.innerText||'').slice(0,300)})")
        except Exception as e:
            diag={'diagnostic_error':str(e)}
        raise RuntimeError(f'DOM readiness timeout: {expr}; page={diag}')
    def close(self):
        try:self.ws.close()
        except:pass
        self.proc.terminate()
        try:self.proc.wait(timeout=3)
        except: self.proc.kill()
        try:self.tmp.cleanup()
        except OSError: pass

def jsstr(s): return json.dumps(s)
def click_text(c,text,selector='button, a'):
    return c.eval(f'''(()=>{{const t={jsstr(text)};const e=[...document.querySelectorAll({jsstr(selector)})].find(x=>x.innerText.trim()===t||x.innerText.includes(t));if(!e)return false;e.click();return true}})()''')
def set_first(c,selector,value):
    return c.eval(f'''(()=>{{const e=document.querySelector({jsstr(selector)});if(!e)return false;const p=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLInputElement?HTMLInputElement.prototype:HTMLSelectElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,{jsstr(value)});e.dispatchEvent(new Event('input',{{bubbles:true}}));e.dispatchEvent(new Event('change',{{bubbles:true}}));return true}})()''')
def state(c):
    return c.eval('''(()=>({hash:location.hash,h1:document.querySelector('main h1')?.innerText||'',main:document.querySelector('main')?.innerText||'',buttons:[...document.querySelectorAll('main button')].map(b=>({text:b.innerText.trim(),disabled:b.disabled})),links:[...document.querySelectorAll('main a')].map(a=>a.innerText.trim())}))()''')

def shell(c):
    out=[]; c.wait_for("document.querySelector('main h1')?.innerText.includes('Ano ang')")
    out.append({'step':'home','state':state(c)})
    out.append({'step':'click_offer','clicked':click_text(c,'I offer a service','button')}); c.wait_for("location.hash==='#/me'")
    out.append({'step':'offer_result','state':state(c)})
    c.eval("location.hash='#/explore'"); c.wait_for("document.querySelector('main h1')?.innerText==='Browse near you'"); c.wait_for("!!document.querySelector('button[aria-label=\"Open Basic trouser alteration\"]')")
    out.append({'step':'browse','state':state(c)})
    clicked=c.eval("(()=>{const b=document.querySelector('button[aria-label=\"Open Basic trouser alteration\"]');if(!b)return false;b.click();return true})()")
    c.wait(); out.append({'step':'open_trouser','clicked':clicked,'state':state(c)})
    c.eval("location.hash='#/payments'"); c.wait(); out.append({'step':'payments_hash','state':state(c)})
    return out

def quickdeal(c):
    out=[]; c.wait_for("!!document.querySelector('main h1')"); c.eval("location.hash='#/quick-deal'"); c.wait_for("document.querySelector('main h1')?.innerText.includes('₱')")
    out.append({'step':'ready','state':state(c)})
    for label,step in [('+₱50','adjust'),('Send ','send'),('Other phone scanned · accept','accept'),('Both agree · confirm','confirm'),('Save when connected','sync')]:
        ok=click_text(c,label); c.wait(); out.append({'step':step,'clicked':ok,'state':state(c)})
    c.eval("location.hash='#/activity'"); c.wait(1); s=state(c)
    out.append({'step':'activity_after_sync','receipt_visible':'QD-' in s['main'],'state':s})
    c.call('Page.reload',{'ignoreCache':True}); c.wait(1); out.append({'step':'after_reload','state':state(c)})
    return out

def activity(c):
    out=[]; c.wait_for("!!document.querySelector('main h1')"); c.eval("location.hash='#/activity'"); c.wait_for("document.querySelector('main h1')?.innerText==='Your activity'")
    out.append({'step':'initial','state':state(c)})
    set_first(c,"input[placeholder='e.g. Pick up ice']",'Collect cake'); c.wait(.2)
    ok=click_text(c,'Add task'); c.wait(); out.append({'step':'add_task','clicked':ok,'state':state(c)})
    before=state(c); ok=click_text(c,'Manage listing'); c.wait(); after=state(c)
    out.append({'step':'manage_listing','clicked':ok,'hash_before':before['hash'],'hash_after':after['hash'],'unchanged':before['main']==after['main']})
    c.call('Page.reload',{'ignoreCache':True}); c.wait(1); s=state(c)
    out.append({'step':'after_reload','collect_cake_visible':'Collect cake' in s['main'],'state':s})
    c.eval("location.hash='#/me'"); c.wait(); out.append({'step':'me','state':state(c)})
    return out

c=CDP()
try:
    fn={'shell':shell,'quickdeal':quickdeal,'activity':activity}[MODE]
    result={'mode':MODE,'base':BASE,'ran_at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'steps':fn(c)}
    print(json.dumps(result,indent=2,ensure_ascii=False))
finally:c.close()
