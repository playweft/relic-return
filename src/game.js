// Pure fixed-step simulation: human and agent actions share this exact path.
export const ROOMS = [
 {name:'苔光营地',x:0,z:0,w:16,d:16,color:0x506c62},
 {name:'回声中庭',x:0,z:-20,w:16,d:16,color:0x53696b},
 {name:'琥珀庭院',x:-20,z:-20,w:16,d:16,color:0x7b7053},
 {name:'星核圣所',x:0,z:-40,w:16,d:16,color:0x475c73},
];
export const PATHS=[{x:0,z:-10,w:5,d:8},{x:-10,z:-20,w:8,d:5},{x:0,z:-30,w:5,d:8}];
export const KEY={x:-23,z:-23}, CORE={x:0,z:-44}, CAMP={x:0,z:3};
export const ACTION_SCHEMA={moveX:'number [-1,1]',moveY:'number [-1,1], forward relative to camera',lookX:'radians per step',lookY:'radians per step',jump:'boolean, rising edge',attack:'boolean, rising edge',dodge:'boolean, rising edge',interact:'boolean, rising edge'};
export function createGame(level=2){return {level:Math.max(1,Math.min(3,Math.round(Number(level)||2))),status:'playing',time:0,p:{x:0,z:4,y:0,vy:0,hp:100,angle:Math.PI,inv:0,dodge:0,attack:0,cool:0},camera:{yaw:0,pitch:.55},key:false,door:false,core:false,enemy:{x:0,z:-39,hp:3,phase:'idle',timer:0,dirX:0,dirZ:1},events:[],damage:{guard:0,trap:0,fall:0},prev:{},message:'寻找西侧琥珀庭院的钥匙',steps:0};}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function walkable(x,z,margin=0){return [...ROOMS,...PATHS].some(r=>Math.abs(x-r.x)<=r.w/2-margin&&Math.abs(z-r.z)<=r.d/2-margin);}
export function nearPrompt(s){if(distance(s.p,CAMP)<2.8&&s.core)return 'E · 交付能量核心';if(!s.key&&!s.door&&distance(s.p,KEY)<2.3)return 'E · 拾取琥珀钥匙';if(!s.door&&distance(s.p,{x:0,z:-29})<3)return s.key?'E · 消耗钥匙，开启封印':'封印需要琥珀钥匙';if(!s.core&&distance(s.p,CORE)<2.5)return s.enemy.hp>0?'先击败守卫，再拾取核心':'E · 拾取能量核心';return '';}
function log(s,type,detail){s.events.push({time:+s.time.toFixed(2),type,detail});s.message=detail;}
function hit(s,kind,amount){if(s.p.inv>0)return;s.p.hp=Math.max(0,s.p.hp-amount);s.p.inv=1;s.damage[kind]+=amount;log(s,'damage',({guard:'未避开守卫挥击',trap:'踏入激活的符文陷阱',fall:'跌落遗迹边缘'})[kind]+` −${amount}`);if(!s.p.hp){s.status='lost';log(s,'end','远征失败');}}
export function step(s,a={},dt=1/60){if(s.status!=='playing')return;s.time+=dt;s.steps++;const p=s.p,e=s.enemy,edge=k=>!!a[k]&&!s.prev[k];
 const num=(v,max=1)=>Math.max(-max,Math.min(max,Number(v)||0));s.camera.yaw+=num(a.lookX,.15);s.camera.pitch=Math.max(.25,Math.min(.95,s.camera.pitch+num(a.lookY,.1)));
 for(const k of ['inv','dodge','attack','cool'])p[k]=Math.max(0,p[k]-dt);
 let mx=num(a.moveX),my=num(a.moveY),n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n;}let dx=mx*Math.cos(s.camera.yaw)-my*Math.sin(s.camera.yaw),dz=-mx*Math.sin(s.camera.yaw)-my*Math.cos(s.camera.yaw);
 if(n>.01)p.angle=Math.atan2(dx,dz);
 if(edge('dodge')&&!p.cool){p.dodge=.23;p.inv=.32;p.cool=.85;log(s,'dodge','闪避');}
 if(p.dodge>0){dx=Math.sin(p.angle);dz=Math.cos(p.angle);}
 const speed=p.dodge>0?12:5.5;let nx=p.x+dx*speed*dt,nz=p.z+dz*speed*dt;
 if(!s.door&&Math.abs(nx)<3.1&&nz< -29&&p.z>=-29)nz=-29;
 p.x=nx;p.z=nz;
 if(edge('jump')&&p.y===0){p.vy=7.5;log(s,'jump','跳跃');}p.vy-=20*dt;p.y+=p.vy*dt;if(p.y<0){p.y=0;p.vy=0;}
 if(!walkable(p.x,p.z)&&p.y===0){hit(s,'fall',25);p.x=0;p.z=s.door?-24:-20;p.y=0;}
 if(edge('attack')&&!p.attack){p.attack=.45;let d=distance(p,e),facing=(Math.sin(p.angle)*(e.x-p.x)+Math.cos(p.angle)*(e.z-p.z))/Math.max(.01,d);if(e.hp>0&&d<2.8&&facing>-.15&&p.y<1.6){e.hp--;log(s,'attack',e.hp?'击中守卫':'守卫已击败');}}
 if(s.door&&e.hp>0){const d=distance(p,e);e.timer=Math.max(0,e.timer-dt);if(e.phase==='windup'&&e.timer===0){e.phase='strike';e.timer=.23;const facing=(e.dirX*(p.x-e.x)+e.dirZ*(p.z-e.z))/Math.max(.01,d);if(d<3.2&&facing>-.2&&p.y<1.5)hit(s,'guard',s.level===3?35:25);}else if(e.phase==='strike'&&e.timer===0){e.phase='recover';e.timer=1.05;}else if(e.phase==='recover'&&e.timer===0)e.phase='idle';else if(e.phase==='idle'&&d<9){if(d<2.7){e.phase='windup';e.timer=s.level===3?.65:1;e.dirX=(p.x-e.x)/Math.max(.01,d);e.dirZ=(p.z-e.z)/Math.max(.01,d);}else{const x=e.x+(p.x-e.x)/d*1.7*dt,z=e.z+(p.z-e.z)/d*1.7*dt;if(z<-33&&walkable(x,z,.7)){e.x=x;e.z=z;}}}}
 if(s.level>1&&Math.sin(s.time*2)>0.35&&Math.abs(p.x)<2.5&&Math.abs(p.z+24)<1.15&&p.y<.75)hit(s,'trap',20);
 if(edge('interact')){if(s.core&&distance(p,CAMP)<2.8){s.status='won';log(s,'end','核心已交付，营地重新亮起');}else if(!s.key&&!s.door&&distance(p,KEY)<2.3){s.key=true;log(s,'item','拾取琥珀钥匙');}else if(s.key&&!s.door&&distance(p,{x:0,z:-29})<3){s.key=false;s.door=true;log(s,'door','封印已开启，前往星核圣所');}else if(!s.core&&e.hp===0&&distance(p,CORE)<2.5){s.core=true;log(s,'item','取得能量核心，返回营地');}}
 if(s.time>=300&&s.status==='playing'){s.status='lost';log(s,'end','超过五分钟：检查探索路线与返回路径');}s.prev={...a};
}
export function observe(s){return structuredClone({version:1,status:s.status,level:s.level,time:s.time,player:s.p,camera:s.camera,inventory:s.core?'core':s.key?'key':null,doorOpen:s.door,enemy:s.enemy,objective:s.core?'return':!s.door?s.key?'unlock':'key':s.enemy.hp?'guard':'core',prompt:nearPrompt(s),damage:s.damage,events:s.events});}
