const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(process.argv[2],'utf8');
function scenario(saved, action){
 const requests=[], nodes=[], store={netra_analytics_consent:saved};
 const createElement=tag=>({tag,style:{},children:[],setAttribute(){},appendChild(n){this.children.push(n);},addEventListener(k,fn){this[k]=fn;},remove(){}});
 const document={readyState:'complete',head:{appendChild(n){requests.push(n.src);}},body:{appendChild(n){nodes.push(n);}},createElement,getElementById(){return null;},querySelectorAll(){return []}};
 const window={};
 vm.runInNewContext(source,{window,document,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},Date,encodeURIComponent});
 if(action) nodes[0].children.find(n=>n.textContent===action).click();
 return {requests,nodes,window};
}
for(const [saved,action,count] of [[null,null,0],['no',null,0],[null,'No thanks',0],[null,'Accept',1],['yes',null,1]]){
 const r=scenario(saved,action);
 assert.equal(r.requests.length,count);
 assert(!r.requests.some(u=>/clarity/.test(u)));
 assert.equal(r.window.clarity,undefined);
 if(count)assert(r.requests[0].startsWith('https://www.googletagmanager.com/gtag/js?id=G-'));
 if(r.nodes.length)assert.equal(r.nodes[0].children[0].children[0].href,'https://netraeco.dpdns.org/legal/data-safety.html');
}
console.log('PASS fresh/accept/decline/returning consent, absolute privacy URL, no Clarity on any page (including future forms)');
