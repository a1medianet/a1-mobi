// G2.7 reusable browser Web Component. No auth credentials embedded or extra login.
// The host serves a same-origin, session/CSRF-protected API behind a feature flag.
const style=`
:host{display:block;direction:rtl;font:inherit;color:var(--a1-support-text,#172339)}
*{box-sizing:border-box}button,input,textarea,select{font:inherit}
main{max-width:1000px;margin:auto;padding:16px}h2{margin:0 0 8px}
.top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}
.grid{display:grid;grid-template-columns:minmax(210px,1fr) minmax(0,1.6fr);gap:12px}
section,.compose{border:1px solid #d8e0e9;border-radius:12px;padding:14px;background:#fff}
button{cursor:pointer;border:1px solid #ccd6e1;background:#f7f9fb;border-radius:8px;padding:8px 12px}
button:focus-visible{outline:3px solid #4b91f3}button.primary{background:#1768bd;color:#fff;border-color:#1768bd}
button.item{display:block;text-align:right;width:100%;margin:6px 0;white-space:normal;overflow-wrap:anywhere}
button.item[aria-current=true]{background:#e8f2fe;border-color:#1768bd}
input,textarea,select{width:100%;padding:9px;border:1px solid #ccd6e1;border-radius:8px;margin:5px 0 10px}
textarea{min-height:90px;resize:vertical}.actions{display:flex;gap:8px;flex-wrap:wrap}
.message{padding:10px;margin:8px 0;border-radius:10px;background:#f2f5f9;overflow-wrap:anywhere;white-space:pre-wrap}
.message.mine{background:#e8f2fe}.muted{color:#66768a;font-size:.9em}.error{color:#9f2020}
[hidden]{display:none!important}@media(max-width:640px){.grid{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}}
`;
function elt(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x;}
export function resolveSupportApiBase(candidate,baseURI,origin){
 const base=new URL(candidate||'/api/a1-support/',baseURI);
 if(base.origin!==origin||!['http:','https:'].includes(base.protocol)||
    !base.pathname.startsWith('/api/')||base.search||base.hash)throw Error('SUPPORT_ORIGIN_DENIED');
 if(!base.pathname.endsWith('/'))base.pathname+='/';
 return base;
}
export class A1SupportCenter extends HTMLElement{
 #csrf='';#tickets=[];#selected=null;
 set csrfToken(v){this.#csrf=typeof v==='string'?v:'';}
 get csrfToken(){return this.#csrf;}
 connectedCallback(){
  const root=this.shadowRoot??this.attachShadow({mode:'open'});
  root.innerHTML=`<style>${style}</style><main><header class="top"><div><h2>المساعدة والدعم</h2><p class="muted">طلبات الدعم والشكاوى والاقتراحات</p></div><button class="primary" id="new">طلب جديد</button></header><p id="notice" role="status" aria-live="polite"></p><div class="compose" id="compose" hidden><form id="create"><label>عنوان الطلب<input name="subject" required maxlength="200"></label><label>النوع<select name="category"><option value="support">دعم فني</option><option value="complaint">شكوى</option><option value="feedback">اقتراح</option></select></label><label>التفاصيل<textarea name="message" required maxlength="8000"></textarea></label><button class="primary" type="submit">إرسال الطلب</button></form></div><div class="grid"><section><strong>طلباتي</strong><div id="list"></div></section><section><div id="thread"></div><form id="reply" hidden><label>الرد<textarea name="message" required maxlength="8000"></textarea></label><button class="primary" type="submit">إرسال الرد</button></form></section></div></main>`;
  root.getElementById('new').addEventListener('click',()=>{root.getElementById('compose').hidden=!root.getElementById('compose').hidden;});
  root.getElementById('create').addEventListener('submit',e=>{e.preventDefault();void this.#create(e.currentTarget);});
  root.getElementById('reply').addEventListener('submit',e=>{e.preventDefault();void this.#reply(e.currentTarget);});
  if(this.getAttribute('enabled')==='true')void this.reload();
  else this.#notice('خدمة الدعم غير مفعلة حاليًا.');
 }
 #notice(message,error=false){const n=this.shadowRoot.getElementById('notice');n.textContent=message;n.className=error?'error':'muted';}
 #apiBase(){return resolveSupportApiBase(this.getAttribute('api-base'),document.baseURI,location.origin);}
 async #request(path,body){
  const url=new URL(path,this.#apiBase());
  if(url.origin!==location.origin)throw Error('SUPPORT_ORIGIN_DENIED');
  const headers={'accept':'application/json'};
  if(body){if(!this.#csrf)throw Error('SUPPORT_CSRF_REQUIRED');headers['content-type']='application/json';headers['x-csrf-token']=this.#csrf;}
  const result=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers,body:body?JSON.stringify(body):undefined,redirect:'error'});
  if(!result.ok)throw Error('SUPPORT_REQUEST_FAILED');
  return result.json();
 }
 async reload(){if(this.getAttribute('enabled')!=='true')return;
  try{this.#tickets=await this.#request('tickets');this.#renderList();this.#notice('');}
  catch{this.#notice('تعذّر تحميل الطلبات. تحقق من الاتصال أو صلاحية الجلسة.',true);}
 }
 #renderList(){
  const list=this.shadowRoot.getElementById('list');list.replaceChildren();
  if(!Array.isArray(this.#tickets)){this.#notice('استجابة غير صالحة.',true);return;}
  if(!this.#tickets.length)list.append(elt('p','لا توجد طلبات حتى الآن.','muted'));
  for(const t of this.#tickets){
   const b=elt('button',t.subject+' — '+t.status,'item');b.type='button';
   b.setAttribute('aria-current',String(t.id===this.#selected));
   b.addEventListener('click',()=>{void this.#open(t.id);});list.append(b);
  }
 }
 async #open(id){try{
  const t=await this.#request('thread?ticketId='+encodeURIComponent(id));
  if(!t){this.#notice('لا يمكن عرض هذه التذكرة.',true);return;}
  this.#selected=id;this.#renderList();const target=this.shadowRoot.getElementById('thread');target.replaceChildren();
  target.append(elt('h3',t.subject),elt('p','الحالة: '+t.status,'muted'));
  for(const m of t.messages??[]){const b=elt('div',m.body,'message'+(m.direction==='incoming'?' mine':''));target.append(b);}
  this.shadowRoot.getElementById('reply').hidden=false;this.#notice('');
 }catch{this.#notice('لا يمكن تحميل المحادثة.',true);}}
 async #create(form){const data=new FormData(form);try{
  const result=await this.#request('tickets',{subject:String(data.get('subject')||''),category:String(data.get('category')||'support'),message:String(data.get('message')||'')});
  form.reset();this.shadowRoot.getElementById('compose').hidden=true;await this.reload();
  if(result?.id)await this.#open(result.id);
 }catch{this.#notice('لم يُرسل الطلب. تحقق من الجلسة وصلاحية الكتابة.',true);}}
 async #reply(form){if(!this.#selected)return;const data=new FormData(form);try{
  await this.#request('reply',{ticketId:this.#selected,message:String(data.get('message')||'')});
  form.reset();await this.#open(this.#selected);
 }catch{this.#notice('لم يُرسل الرد.',true);}}
}
if(typeof customElements!=='undefined'&&!customElements.get('a1-support-center'))customElements.define('a1-support-center',A1SupportCenter);
