const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
let n=0;
function env(){const state={props:{},locks:0,sheets:0,mails:0,now:200000,quota:100};const c={Date:{now:()=>state.now},JSON,Object,String,Array,Number,Math,Error,RegExp,
PropertiesService:{getScriptProperties:()=>({getProperty:k=>state.props[k]||null,setProperty:(k,v)=>state.props[k]=v})},
LockService:{getScriptLock:()=>({waitLock:()=>state.locks++,releaseLock:()=>{}})},
Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,x)=>crypto.createHash('sha256').update(x).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url')},
MailApp:{getRemainingDailyQuota:()=>state.quota,sendEmail:()=>{state.mails++;}},
ContentService:{MimeType:{JSON:'json'},createTextOutput:x=>({setMimeType:()=>JSON.parse(x)})},
};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/staff-patched.gs','utf8'),c);return {c,state};}
function t(name,f){f();n++;console.log('PASS',name)}
t('malformed/unknown requests never lock or send',()=>{let {c,state}=env();for(const raw of ['{','[]',JSON.stringify({action:'x'})])assert.equal(c.doPost({postData:{contents:raw}}).ok,false);assert.equal(state.locks,0);assert.equal(state.mails,0)});
t('oversized password rejects before lock',()=>{let {c,state}=env();assert.equal(c.doPost({postData:{contents:JSON.stringify({action:'loginPassword',email:'a@b.com',password:'x'.repeat(2049)})}}).ok,false);assert.equal(state.locks,0)});
t('account cap shared across login actions',()=>{let {c}=env();for(let i=0;i<6;i++)assert.equal(c.abuseAdmission_({action:i%2?'verifyOtp':'requestOtp',email:'a@b.com'}),true);assert.equal(c.abuseAdmission_({action:'loginPassword',email:'a@b.com'}),false)});
t('global cap blocks rotation across accounts',()=>{let {c}=env();for(let i=0;i<30;i++)assert.equal(c.abuseAdmission_({action:'requestOtp',email:(i%10)+'@b.com'}),true);assert.equal(c.abuseAdmission_({action:'requestOtp',email:'new@b.com'}),false)});
t('window recovers; account storage bounded',()=>{let {c,state}=env();for(let i=0;i<24;i++)c.abuseAdmission_({action:'requestOtp',email:i+'@b.com'});assert.equal(c.abuseAdmission_({action:'requestOtp',email:'new@b.com'}),false);assert.equal(Object.keys(JSON.parse(state.props['abuse:login:v1']).accounts).length,24);state.now+=60000;assert.equal(c.abuseAdmission_({action:'requestOtp',email:'new@b.com'}),true)});
t('private authorization not bypassed',()=>{let {c}=env();assert.equal(c.doPost({postData:{contents:JSON.stringify({action:'listAppointments',token:'invalid'})}}).ok,false)});
t('daily mail cap blocks without send',()=>{let {c,state}=env();state.props['abuse:mail:v1']=JSON.stringify(Array(60).fill(state.now));assert.equal(c.abuseMailCanSend_(),false);assert.throws(()=>c.abuseSendMail_('a@b.com','x','x'));assert.equal(state.mails,0)});
t('shared account quota reserve blocks',()=>{let {c,state}=env();state.quota=10;assert.equal(c.abuseMailCanSend_(),false)});
t('mail reservation occurs before send; old usage expires',()=>{let {c,state}=env();state.props['abuse:mail:v1']=JSON.stringify([state.now-86400000]);c.abuseSendMail_('a@b.com','x','x');assert.equal(state.mails,1);assert.equal(JSON.parse(state.props['abuse:mail:v1']).length,1)});
t('corrupt limit state fails closed',()=>{let {c,state}=env();state.props['abuse:login:v1']='{';assert.equal(c.abuseAdmission_({action:'requestOtp',email:'a@b.com'}),false)});
t('future customer namespace reusable, no customer login enabled',()=>{let {c}=env();assert.equal(c.CUSTOMER_LOGIN_ENABLED,false);for(let i=0;i<6;i++)assert.equal(c.abuseAdmission_({action:'forgotPassword',kind:'customer',mobile:'9876543210'}),true);assert.equal(c.abuseAdmission_({action:'forgotPassword',kind:'customer',mobile:'9876543210'}),false)});
console.log(n+' adapter tests passed. All Google services mocked; no email, data or deployment changed.');
