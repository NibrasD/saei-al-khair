
(()=>{
const T=THREE,$=id=>document.getElementById(id),clamp=(a,lo,hi)=>Math.max(lo,Math.min(hi,a)),V=(x,y,z)=>new T.Vector3(x,y,z);
const ssm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const mtEnv=z=>{const u=(((-z)/440)%7+7)%7;return ssm(2.85,3.15,u)*(1-ssm(3.85,4.0,u))};
const cx=z=>Math.sin(z*.011)*16+Math.sin(z*.027+1.3)*6+Math.sin(z*.0041+.6)*11+mtEnv(z)*Math.sin(z*.052)*8;
const dcx=z=>.176*Math.cos(z*.011)+.162*Math.cos(z*.027+1.3)+.0451*Math.cos(z*.0041+.6)+mtEnv(z)*.416*Math.cos(z*.052);
const HZ=0xe9977f;
const R=new T.WebGLRenderer({antialias:devicePixelRatio<2,powerPreference:'high-performance'});R.setPixelRatio(Math.min(devicePixelRatio,1.5));R.outputEncoding=T.LinearEncoding;R.toneMapping=T.NoToneMapping;R.toneMappingExposure=1;R.shadowMap.enabled=false;document.body.prepend(R.domElement);
const S=new T.Scene();S.background=new T.Color(HZ);S.fog=new T.Fog(HZ,35,230);
const C=new T.PerspectiveCamera(60,1,.1,700);
function rs(){R.setSize(innerWidth,innerHeight);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix()}
addEventListener('resize',rs);rs();

const hemi=new T.HemisphereLight(0xffc49a,0x5a4a4a,.95);S.add(hemi);
const sunL=new T.DirectionalLight(0xff9d5c,1.1);sunL.position.set(-80,26,-100);sunL.castShadow=false;sunL.shadow.mapSize.set((navigator.hardwareConcurrency||4)>=8&&innerWidth>800?1024:512,(navigator.hardwareConcurrency||4)>=8&&innerWidth>800?1024:512);sunL.shadow.camera.left=-38;sunL.shadow.camera.right=38;sunL.shadow.camera.top=34;sunL.shadow.camera.bottom=-16;sunL.shadow.camera.near=.5;sunL.shadow.camera.far=240;sunL.shadow.bias=-.00025;sunL.shadow.normalBias=.035;sunL.shadow.camera.updateProjectionMatrix();S.add(sunL);S.add(sunL.target);
// Subtle warm bounce and cool sky-fill preserve shape detail without replacing the original lighting cycle.
const warmFill=new T.DirectionalLight(0xffd6b4,0);warmFill.position.set(38,15,24);S.add(warmFill);
const skyFill=new T.DirectionalLight(0x879dce,0);skyFill.position.set(-24,10,35);S.add(skyFill);

function tex(st){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);st.forEach(s=>gr.addColorStop(s[0],s[1]));g.fillStyle=gr;g.fillRect(0,0,64,64);return new T.CanvasTexture(c)}
const glowT=tex([[0,'rgba(255,240,190,1)'],[.25,'rgba(255,200,120,.5)'],[1,'rgba(255,170,90,0)']]);
const shT=tex([[0,'rgba(0,0,0,.55)'],[1,'rgba(0,0,0,0)']]);
const cloudT=tex([[0,'rgba(255,225,225,.9)'],[.5,'rgba(255,190,200,.45)'],[1,'rgba(255,170,190,0)']]);

// sky, mountains, clouds
const sky=new T.Mesh(new T.SphereGeometry(450,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sd:{value:V(-.55,.16,-.82).normalize()},hor:{value:V(.91,.59,.5)},mid:{value:V(.85,.5,.62)},top:{value:V(.24,.22,.47)},su:{value:1}},
vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:'varying vec3 p;uniform vec3 sd,hor,mid,top;uniform float su;void main(){vec3 d=normalize(p);float h=max(d.y,0.);vec3 c=mix(hor,mid,smoothstep(0.,.25,h));c=mix(c,top,smoothstep(.2,.9,h));float s=max(dot(d,sd),0.);c+=(vec3(1.,.6,.3)*pow(s,6.)*.55+vec3(1.,.85,.6)*pow(s,120.)*1.2)*su;gl_FragColor=vec4(c,1.);}'}));
sky.renderOrder=-2;S.add(sky);
const mt=new T.Group();
for(let i=0;i<12;i++){const a=i/12*6.283+.3,r=300+(i%3)*20,h=45+((i*37)%40),w=45+((i*53)%40);
const m=new T.Mesh(new T.SphereGeometry(1,20,10,0,6.283,0,1.57),new T.MeshBasicMaterial({color:i%2?0x74507a:0x8a5c80,fog:false}));m.scale.set(w*1.6,h,w*1.2);m.position.set(Math.sin(a)*r,-4,Math.cos(a)*r);mt.add(m)}
S.add(mt);
const cld=new T.Group();
for(let i=0;i<16;i++){const s=new T.Sprite(new T.SpriteMaterial({map:cloudT,fog:false,depthWrite:false,opacity:.8})),a=i*2.4,e=.16+(i%5)*.06;
s.position.set(Math.sin(a)*Math.cos(e)*380,Math.sin(e)*380,Math.cos(a)*Math.cos(e)*380);s.scale.set(140+(i%4)*40,45+(i%3)*15,1);cld.add(s)}
S.add(cld);

// ---- terrain: hills along the road (applied to every vertex in the shader, so all scenery rises and falls together) ----
const HA=[.5,.12,.2,1,.15,.3,.08];
function hillAmp(z){const u=(((-z)/440)%7+7)%7,k=Math.floor(u),f=u-k,tt=Math.min(1,Math.max(0,(f-.8)/.2)),sm=tt*tt*(3-2*tt);return HA[k]+(HA[(k+1)%7]-HA[k])*sm}
function hillJ(z){return hillAmp(z)*(5*Math.sin(z*.0145)+2.5*Math.sin(z*.0331+1.7))}
T.ShaderChunk.common+=`
float hillAmpG(float k){return k<.5?.5:k<1.5?.12:k<2.5?.2:k<3.5?1.0:k<4.5?.15:k<5.5?.3:.08;}
float hillH(float z){float u=mod(-z/440.0,7.0);float k=floor(u),f=u-k;float a=mix(hillAmpG(k),hillAmpG(mod(k+1.0,7.0)),smoothstep(.8,1.0,f));return a*(5.0*sin(z*.0145)+2.5*sin(z*.0331+1.7));}
`;
T.ShaderChunk.project_vertex=T.ShaderChunk.project_vertex.replace('gl_Position = projectionMatrix * mvPosition;','{float hwz=(modelMatrix*vec4(transformed,1.0)).z;mvPosition.xyz+=(viewMatrix*vec4(0.0,hillH(hwz),0.0,0.0)).xyz;}\n\tgl_Position = projectionMatrix * mvPosition;');
T.ShaderLib.sprite.vertexShader=T.ShaderLib.sprite.vertexShader.replace('vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );','vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );\n\tmvPosition.xyz += (viewMatrix*vec4(0.0,hillH((modelMatrix*vec4(0.0,0.0,0.0,1.0)).z),0.0,0.0)).xyz;');
const gnd=new T.Mesh(new T.PlaneGeometry(700,700,1,100).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:0x4d6c35}));gnd.receiveShadow=false;S.add(gnd);

// shared scenery assets
const L=(c,o)=>new T.MeshLambertMaterial(Object.assign({color:c},o||{}));
const foliage=[0x3f5f2b,0x2f4c25,0x58742f,0x6d7f33,0x4a6a3a].map(c=>L(c));
const bark=L(0x4a3428),wood=L(0x6f4c36),roofM=L(0x393341),poleM=L(0x5a4a40),roadM=L(0xffffff,{vertexColors:true});
const fieldMs=[L(0x86a23a),L(0x6f9a3c)];
const trunkG=new T.CylinderGeometry(.14,.24,3,5).translate(0,1.5,0),leafG=(g=>{const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+.16*Math.sin(x*4.1+y*2.3)*Math.cos(z*3.7+x);p.setXYZ(i,x*k,y*k*.92,z*k)}g.computeVertexNormals();return g})(new T.SphereGeometry(1,10,8));
const shG=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),shM=new T.MeshBasicMaterial({map:shT,transparent:true,depthWrite:false});
const poleG=new T.CylinderGeometry(.09,.13,8,5).translate(0,4,0),armG=new T.BoxGeometry(2.2,.12,.12).translate(0,7.4,0);
const wireM=new T.LineBasicMaterial({color:0x2a2028});
const fieldG=new T.PlaneGeometry(14,40).rotateX(-Math.PI/2);
const glowM=new T.SpriteMaterial({map:glowT,blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:.55});
const roofG=new T.ConeGeometry(5,1.9,4).rotateY(Math.PI/4),winG=new T.PlaneGeometry(1.3,1),winM=new T.MeshBasicMaterial({color:0xffd98a});
const vG=new T.BoxGeometry(.8,1.8,.9).translate(0,.9,0),vM=L(0xdedbd4),vpG=new T.PlaneGeometry(.7,1.2);
function cv(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'));return new T.CanvasTexture(c)}
const vT=cv(64,96,g=>{g.fillStyle='#f4f4f0';g.fillRect(0,0,64,96);const cs=['#e63946','#2a9d8f','#f4a261','#457b9d','#e9c46a','#8ecae6'];for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=cs[(x*3+y*5)%6];g.fillRect(4+x*15,6+y*16,11,12)}g.fillStyle='#ffe9a8';g.fillRect(4,72,56,18)});
const vpM=new T.MeshBasicMaterial({map:vT});
const sT=cv(128,128,g=>{g.translate(64,64);g.rotate(Math.PI/4);g.fillStyle='#f2c230';g.fillRect(-42,-42,84,84);g.strokeStyle='#222';g.lineWidth=6;g.strokeRect(-42,-42,84,84);g.rotate(-Math.PI/4);g.lineWidth=9;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(-8,32);g.lineTo(-8,-2);g.lineTo(20,-30);g.stroke()});
const signM=new T.MeshBasicMaterial({map:sT,transparent:true,alphaTest:.5,side:T.DoubleSide}),signG=new T.PlaneGeometry(1.6,1.6),postG=new T.CylinderGeometry(.04,.04,2.4,5).translate(0,1.2,0);

function rng(i){let a=(i*7919+13)>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function tree(g,x,z,s,r){const m=foliage[(r()*5)|0],a=new T.Mesh(leafG,m),b=new T.Mesh(leafG,m),t=new T.Mesh(trunkG,bark),sh=new T.Mesh(shG,shM),o=new T.Group();
t.scale.setScalar(s);a.position.set(0,3.4*s,0);a.scale.set(1.7*s,1.9*s,1.7*s);a.rotation.y=r()*6;b.position.set(.7*s,2.6*s,.2*s);b.scale.setScalar(1.25*s);const c=new T.Mesh(leafG,m);c.position.set(-.8*s,2.9*s,-.3*s);c.scale.setScalar(1.3*s);o.add(c);
sh.position.y=.06;sh.scale.set(4*s,1,4*s);o.add(t,a,b,sh);o.position.set(x,0,z);g.add(o)}
function house(g,sg,z,r){const h=new T.Group(),b=new T.Mesh(new T.BoxGeometry(6,3.2,5),wood),rf=new T.Mesh(roofG,roofM);b.position.y=1.6;rf.position.y=4.15;rf.scale.set(1,1,.82);
for(let k=-1;k<=1;k+=2){const w=new T.Mesh(winG,winM);w.position.set(-sg*3.02,1.8,k*1.2);w.rotation.y=-sg*Math.PI/2;const s=new T.Sprite(glowM);s.position.set(-sg*3.4,1.8,k*1.2);s.scale.set(3,3,1);h.add(w,s)}
h.add(b,rf);h.position.set(cx(z)+sg*(10+r()*3),0,z);h.rotation.y=Math.atan(dcx(z));g.add(h);return h}
function vend(g,sg,z){const v=new T.Group(),b=new T.Mesh(vG,vM),p=new T.Mesh(vpG,vpM),s=new T.Sprite(glowM);
p.position.set(-sg*.41,1.1,0);p.rotation.y=-sg*Math.PI/2;s.position.set(-sg*.9,1.1,0);s.scale.set(3.2,3.2,1);v.add(b,p,s);v.position.set(cx(z)+sg*4.6,0,z);v.rotation.y=Math.atan(dcx(z));g.add(v)}
function stall(g,sg,z,r){const o=new T.Group();
 const table=new T.Mesh(bxG,wood);table.scale.set(1.7,.06,.9);table.position.set(0,.72,0);o.add(table);
 [[-.7,-.35],[.7,-.35],[-.7,.35],[.7,.35]].forEach(p=>{const l=new T.Mesh(cylG,wood);l.scale.set(.03,.72,.03);l.position.set(p[0],.36,p[1]);o.add(l)});
 const awn=new T.Mesh(bxG,vpM);awn.scale.set(1.9,.06,1.1);awn.position.set(0,1.65,-.05);o.add(awn);
 [[-.85,-.45],[.85,-.45]].forEach(p=>{const pl=new T.Mesh(cylG,poleM);pl.scale.set(.025,1.65,.025);pl.position.set(p[0],.82,p[1]);o.add(pl)});
 [redM,orgM,ringM].forEach((m,k)=>{const gd=new T.Mesh(bxG,m);gd.scale.set(.22,.18,.22);gd.position.set(-.5+k*.5,.84,.05+r()*.1);o.add(gd)});
 o.position.set(cx(z)+sg*4.7,0,z);o.rotation.y=Math.atan(dcx(z));g.add(o)}
const waterM=L(0x3a6a9a,{transparent:true,opacity:.88}),reedM=L(0x6f8a3a);
function reeds(g,x,z,r){for(let k=0;k<4;k++){const rd=new T.Mesh(cylG,reedM);rd.scale.set(.02,.5+r()*.4,.02);rd.position.set(x+(r()-.5)*.6,.3,z+(r()-.5)*.6);g.add(rd)}}
const rockBigM=L(0x7a7268),pineM2=L(0x24432c);
function boulder(g,x,z,s,r){const m=new T.Mesh(leafG,rockBigM);m.scale.set(s*(1+r()*.4),s*.78,s*(1+r()*.3));m.position.set(x,s*.38,z);m.rotation.y=r()*6;g.add(m)}
function pine2(g,x,z,s,r){const tr=new T.Mesh(trunkG,bark);tr.scale.setScalar(s);tr.position.y=1.5*s;const top=new T.Mesh(new T.ConeGeometry(1,2.6,8),pineM2);top.scale.set(s,s,s);top.position.y=3.4*s;top.rotation.y=r()*6;g.add(tr,top)}
function sign(g,z,variant){const o=new T.Group();o.add(new T.Mesh(postG,poleM));const p=new T.Mesh(signG,variant===1?stopM:variant===2?xingM:signM);p.position.y=2.5;o.add(p);o.position.set(cx(z)+4.1,0,z);o.rotation.y=Math.atan(dcx(z));g.add(o)}
const stopT=cv(128,128,q=>{q.fillStyle='#c62d3a';const R=54,cx0=64,cy0=64;q.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,px2=cx0+R*Math.cos(a),py2=cy0+R*Math.sin(a);i?q.lineTo(px2,py2):q.moveTo(px2,py2)}q.closePath();q.fill();q.fillStyle='#fff';q.font='bold 26px Arial';q.textAlign='center';q.fillText('STOP',64,73)}),
stopM=new T.MeshBasicMaterial({map:stopT,transparent:true,alphaTest:.5,side:T.DoubleSide}),
xingT=cv(128,128,q=>{q.translate(64,64);q.rotate(Math.PI/4);q.fillStyle='#f2c230';q.fillRect(-42,-42,84,84);q.strokeStyle='#222';q.lineWidth=6;q.strokeRect(-42,-42,84,84);q.rotate(-Math.PI/4);q.fillStyle='#222';q.beginPath();q.arc(64,44,7,0,6.283);q.fill();q.fillRect(58,52,12,20);q.fillRect(48,58,10,6);q.fillRect(70,58,10,6);q.fillRect(52,72,8,16);q.fillRect(68,72,8,16)}),
xingM=new T.MeshBasicMaterial({map:xingT,transparent:true,alphaTest:.5,side:T.DoubleSide});
function crosswalk(g,z){const yaw=Math.atan(dcx(z)),cwM=new T.MeshBasicMaterial({color:0xf2f2ea});for(let k=-3;k<=3;k+=2){const st=new T.Mesh(new T.PlaneGeometry(.42,1.6).rotateX(-Math.PI/2),cwM);st.position.set(cx(z)+k*.62,.018,z);st.rotation.y=yaw;g.add(st)}}
const poleX=z=>cx(z)+4.6;

const BIOME=[0,4,1,3,2,5,6],CL=40,chunks=new Map();
const dashM=L(0xf2f0e6,{emissive:0x444440}),railM=L(0xe9e9e4),lhWhite=L(0xf4f1ea),lhRed=L(0xc8352f),lhLamp=L(0xfff0a8,{emissive:0xffd860});
// ---- park and city streets ----
const benchWood=L(0x7a5236),benchMetal=L(0x2b2b30),stoneM=L(0xbdb6a8),lampPostM=L(0x23262d),bulbM=new T.MeshBasicMaterial({color:0xfff0b8}),sidewalkM=L(0xaaa79f);
function bench(g,sg,z){const o=new T.Group(),seat=new T.Mesh(new T.BoxGeometry(1.5,.08,.5),benchWood),back=new T.Mesh(new T.BoxGeometry(1.5,.5,.06),benchWood);seat.position.y=.46;back.position.set(0,.74,.22);o.add(seat,back);
 [-.65,.65].forEach(x=>{const l=new T.Mesh(new T.BoxGeometry(.06,.46,.46),benchMetal);l.position.set(x,.23,0);o.add(l)});o.position.set(cx(z)+sg*3.9,0,z);o.rotation.y=sg*Math.PI/2+Math.atan(dcx(z));g.add(o)}
function parkLamp(g,x,z){const p=new T.Mesh(new T.CylinderGeometry(.05,.07,3.4,6),lampPostM);p.position.set(x,1.7,z);const b=new T.Mesh(new T.SphereGeometry(.2,8,6),bulbM);b.position.set(x,3.5,z);g.add(p,b);const gl=new T.Sprite(glowM);gl.position.set(x,3.5,z);gl.scale.set(3.2,3.2,1);g.add(gl)}
function fountain(g,x,z){const o=new T.Group(),add=(m,px,py,pz)=>{m.position.set(px,py,pz);o.add(m);return m};
 add(new T.Mesh(new T.CylinderGeometry(2.3,2.5,.6,24),stoneM),0,.3,0);add(new T.Mesh(new T.CircleGeometry(2.05,24).rotateX(-Math.PI/2),waterM),0,.62,0);
 add(new T.Mesh(new T.CylinderGeometry(.28,.38,1.5,10),stoneM),0,1.2,0);add(new T.Mesh(new T.CylinderGeometry(1.0,.55,.28,16),stoneM),0,2.0,0);
 add(new T.Mesh(new T.ConeGeometry(.16,1.1,8),new T.MeshBasicMaterial({color:0xbfe6ff,transparent:true,opacity:.7})),0,2.7,0);o.position.set(x,0,z);g.add(o)}
function parkScene(g,z0,zm,r,skip,i){for(const sg of[-1,1]){if(skip===sg)continue;
  for(let k=0;k<7;k++){const z=z0-r()*CL;tree(g,cx(z)+sg*(4.6+r()*16),z,.9+r()*1.2,r)}
  for(let k=0;k<3;k++)bench(g,sg,z0-6-k*13);
  for(let k=0;k<3;k++){const z=z0-r()*CL;flowers(g,cx(z)+sg*(3.6+r()*.8),z,r);bush(g,cx(z)+sg*(4.8+r()),z+2,.8,r)}
  for(let k=0;k<3;k++){const z=z0-3-k*13;parkLamp(g,cx(z)+sg*3.7,z)}}
 if(i%3===0&&!skip)fountain(g,cx(zm)+(r()<.5?-1:1)*11,zm)}
const CITY_M=[0,1,2].map(n=>{const t=cv(128,256,q=>{q.fillStyle=['#5b5f6a','#7a6f66','#4c5a6a'][n];q.fillRect(0,0,128,256);for(let y=0;y<16;y++)for(let x=0;x<8;x++){q.fillStyle=((x*7+y*13+n*5)%5)<2?'#ffd88a':'#26303f';q.fillRect(6+x*15,6+y*15,10,10)}});return L(0xffffff,{map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.3})});
function cityScene(g,z0,zm,r,skip,i){for(const sg of[-1,1]){if(skip===sg)continue;
  for(let k=0;k<3;k++){if(k===1&&i%3===1){r();r();continue}const zc=z0-6.7-k*13.3,w=12+r()*6,hh=14+r()*24,b=new T.Mesh(new T.BoxGeometry(w,hh,12.6),CITY_M[(r()*3)|0]);b.position.set(cx(zc)+sg*(8.6+w/2),hh/2,zc);b.rotation.y=Math.atan(dcx(zc));g.add(b)}
  for(let k=0;k<4;k++){const zc=z0-5-k*10,sw=new T.Mesh(new T.BoxGeometry(2.8,.12,10.4),sidewalkM);sw.position.set(cx(zc)+sg*6.1,.06,zc);sw.rotation.y=Math.atan(dcx(zc));g.add(sw)}
  for(let k=0;k<3;k++){const z=z0-3-k*13;parkLamp(g,cx(z)+sg*7.3,z)}}
}
const tlights=[];
function addTL(g,z){const o=new T.Group(),mk=c=>new T.MeshBasicMaterial({color:c}),mr=mk(0x3a1210),my=mk(0x3a3000),mg=mk(0x0e3a1a);
 const pole=new T.Mesh(new T.CylinderGeometry(.09,.11,5.6,8),lampPostM);pole.position.set(4.6,2.8,0);const arm=new T.Mesh(new T.BoxGeometry(4.0,.12,.12),lampPostM);arm.position.set(2.6,5.5,0);
 const head=new T.Mesh(new T.BoxGeometry(.5,1.35,.34),lampPostM);head.position.set(.7,5.0,0);o.add(pole,arm,head);
 [[mr,5.45],[my,5.0],[mg,4.55]].forEach(q=>{const d=new T.Mesh(new T.CircleGeometry(.15,16),q[0]);d.position.set(.7,q[1],.19);o.add(d)});
 const stop=new T.Mesh(new T.BoxGeometry(8.2,.02,.45),new T.MeshBasicMaterial({color:0xf2f2ea}));stop.position.set(0,.05,7.0);o.add(stop);
 const side=new T.Mesh(new T.PlaneGeometry(76,9).rotateX(-Math.PI/2),L(0x343439));side.position.set(0,.034,0);o.add(side);
 const zeb=new T.MeshBasicMaterial({color:0xf2f2ea});for(let q=-4;q<=4;q++){const zs=new T.Mesh(new T.BoxGeometry(.55,.02,2.2),zeb);zs.position.set(q*.98,.052,5.2);o.add(zs)}
 o.position.set(cx(z),0,z);o.rotation.y=Math.atan(dcx(z));g.add(o);
 const ei=tlights.findIndex(q=>q.sd===-z);if(ei>=0)tlights.splice(ei,1);
 tlights.push({sd:-z,ph:(-z/CL)*3.7,r:mr,y:my,g:mg,prev:null,waited:false})}
function tlState(l){const c=(t+l.ph)%16;return c<8?0:c<10?1:2}
function updateLights(){for(let i=tlights.length-1;i>=0;i--)if(tlights[i].sd<s-150)tlights.splice(i,1);
 tlights.forEach(l=>{const st=tlState(l);l.r.color.setHex(st===2?0xff3b30:0x3a1210);l.y.color.setHex(st===1?0xffcc00:0x3a3000);l.g.color.setHex(st===0?0x30d158:0x0e3a1a);
  const line=l.sd-7.0,d=line-s;if(st===2&&d>0&&d<9&&v<.6)l.waited=true;
  if(l.prev!==null&&l.prev<line&&s>=line){if(st===2&&v>1.5){money=Math.max(0,money-30);SV.money=money;svSave();say('Red light! Always stop for the signal.  −¥30')}else if(l.waited&&st===0){money+=10;SV.money=money;svSave();say('Patient rider — you waited for the green light.  +¥10')}}
  l.prev=s})}
// ---- each landscape has its own ground, road width and props ----
const HW={0:3.7,1:3.3,2:2.9,3:3.0,4:4.0,5:2.5,6:4.3};
const GRC={1:0xb99d6c,3:0x7d7266,4:0xd9c493,5:0x4a8a38,6:0x7a7a80},GRM={};
function biomeAt(z){const n=BIOME.length;return BIOME[((Math.floor((-z)/440)%n)+n)%n]}
const duneM=L(0xcdb77e),parasolM=[L(0xd94b3d),L(0x2f7fd6),L(0xf2c230)],parasolPole=L(0xe9e5d8);
function dune(g,x,z,s){const d=new T.Mesh(new T.SphereGeometry(1,12,7),duneM);d.scale.set(4.2*s,.75*s,3*s);d.position.set(x,0,z);g.add(d)}
function parasol(g,x,z){const p=new T.Mesh(new T.CylinderGeometry(.04,.04,2.3,6),parasolPole);p.position.set(x,1.15,z);const c=new T.Mesh(new T.ConeGeometry(1.4,.55,10),parasolM[Math.abs(Math.floor(x*7+z))%3]);c.position.set(x,2.4,z);g.add(p,c)}
function coastScene(g,z0,zm,r,skip){for(let k=0;k<5;k++){const z=z0-r()*CL;if(skip===1&&Math.abs(z-zm)<13)continue;dune(g,cx(z)+7+r()*16,z,1+r()*1.3)}
 for(let k=0;k<3;k++){const z=z0-r()*CL;if(skip===1&&Math.abs(z-zm)<13)continue;boulder(g,cx(z)+5.8+r()*9,z,.7+r()*1.1,r)}
 if(skip!==1&&r()<.5)house(g,1,z0-6-r()*28,r);
 for(let k=0;k<2;k++){const z=z0-4-k*18;parkLamp(g,cx(z)+5.2,z)}
 if(skip!==1&&r()<.6){const z=z0-r()*CL;parasol(g,cx(z)+7.5+r()*5,z)}}
function mkDoor(sg,z){const g=new T.Group(),dm=L(0x5a3a22),aw=L(0xc8352f),wh=L(0xf1ede2),WN=new T.MeshBasicMaterial({color:0xffd98a});
 const add=(m,x,y,zz)=>{m.position.set(x,y,zz);g.add(m);return m};
 add(new T.Mesh(new T.BoxGeometry(1.7,2.7,.25),dm),0,1.35,0);const awn=add(new T.Mesh(new T.BoxGeometry(3.6,.12,1.6),aw),0,2.95,-.75);awn.rotation.x=.18;
 add(new T.Mesh(new T.BoxGeometry(3.6,.5,.1),wh),0,2.6,-1.45);add(new T.Mesh(new T.BoxGeometry(.9,1.0,.08),WN),-2.2,1.6,-.05);add(new T.Mesh(new T.BoxGeometry(.9,1.0,.08),WN),2.2,1.6,-.05);
 const gl=new T.Sprite(glowM);gl.position.set(0,1.6,-1.2);gl.scale.set(7,5,1);g.add(gl);
 g.position.set(cx(z)+sg*8.55,0,z);g.rotation.y=sg*Math.PI/2+Math.atan(dcx(z));S.add(g);return g}

// ---- the boy walks to wherever the task is, and the camera follows him ----
const _bw=new T.Vector3();
function taskGoal(){
 if(mi===0&&catStage>=1&&tg&&tg.g){const g=tg.g;g.updateMatrixWorld(true);return{p:g.localToWorld(new T.Vector3(0,0,-1.5)),face:g.localToWorld(new T.Vector3(0,0,-.62))}}
 if(walletStage===1&&tg&&tg.g){const w=tg.g.position;return{p:new T.Vector3(w.x,0,w.z+.65),face:new T.Vector3(w.x,0,w.z)}}
 if(walletStage===2&&tg&&tg.g){const g=tg.g;g.updateMatrixWorld(true);return{p:g.localToWorld(new T.Vector3(0,0,-1.1)),face:g.position.clone()}}
 if(jobStage===1&&tg&&tg.g){const g=tg.g.position;return{p:new T.Vector3(g.x-3.3,0,g.z+.4),face:g.clone()}}
 if(jobStage===3&&tg&&tg.g){const g=tg.g;g.updateMatrixWorld(true);return{p:g.localToWorld(new T.Vector3(0,0,-1.1)),face:g.position.clone()}}
 if(famStage>=1)return homeStand();
 if(hurtAnimal&&healStage>=1){const d=hurtAnimal.g.position;return{p:new T.Vector3(d.x,0,d.z+1.5),face:d.clone()}}
 return null}
function boyAtGoal(){return!realRider||(realRider.mode==='stand'&&realRider.atGoal)}
let elderIn=null;
function startBoard(){const e=elder;e.userData.waveTarget=0;npcPlay(e.userData,'idle',.2);e.userData.walking=true;elderIn={e};say(passKind==='kid'?'Your brother runs over to the bike...':'Grandpa walks over to the bike...')}
function updateElderIn(dt){const o=elderIn;if(!o)return;const e=o.e,tw=inner.localToWorld(new T.Vector3(0,0,1.45)),dx=tw.x-e.position.x,dz=tw.z-e.position.z,dist=Math.hypot(dx,dz);
 if(dist>.3){const st=Math.min(dist,1.7*dt);e.position.x+=dx/dist*st;e.position.z+=dz/dist*st;turnYaw(e,Math.atan2(-dx,-dz),dt)}
 else{e.userData.walking=false;S.remove(e);inner.add(e);e.position.set(0,e.userData.seatY||ELD_Y,1.2);e.rotation.set(0,0,0);e.scale.setScalar(1);npcPlay(e.userData,'sit',.25);say(passKind==='kid'?'Hop on, little brother! Hold on tight.':'Hop on, grandpa! Easy does it.');elderIn=null}}
// ---- road surfaces: every landscape has its own pavement, markings and edges ----
const ROADT={},ROADM={};
function roadTex(kind){return ROADT[kind]||(ROADT[kind]=(()=>{let sd=kind.length*977+13;const rn=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
 const t=cv(256,256,q=>{const W=256;
  const speck=(n,cols,s)=>{for(let i=0;i<n;i++){q.fillStyle=cols[(rn()*cols.length)|0];q.fillRect(rn()*W,rn()*W,s*(.5+rn()),s*(.5+rn()))}};
  const crack=n=>{q.strokeStyle='rgba(8,8,10,.55)';q.lineWidth=1.2;for(let c=0;c<n;c++){let x=rn()*W,y=rn()*W;q.beginPath();q.moveTo(x,y);for(let k=0;k<7;k++){x+=(rn()-.5)*26;y+=rn()*20;q.lineTo(x,y)}q.stroke()}};
  if(kind==='city'||kind==='coast'){q.fillStyle='#2b2b2f';q.fillRect(0,0,W,W);speck(2600,['#3c3c42','#222226','#46464c','#1c1c20'],2);
   q.fillStyle='rgba(120,120,126,.28)';q.fillRect(0,0,W*.09,W);q.fillRect(W*.91,0,W*.09,W);
   crack(5);q.fillStyle='rgba(20,20,22,.5)';q.fillRect(W*.22,W*.3,W*.16,W*.22);q.fillStyle='rgba(60,60,66,.4)';q.fillRect(W*.66,W*.7,W*.1,W*.14);
   q.fillStyle='#ecebe4';q.fillRect(W*.075,0,5,W);q.fillRect(W*.925-5,0,5,W);
   if(kind==='city'){q.fillRect(W*.5-3,0,6,W*.42)}else{q.fillStyle='#e8c23a';q.fillRect(W*.5-8,0,5,W);q.fillRect(W*.5+3,0,5,W)}}
  else if(kind==='cobble'){q.fillStyle='#c9a898';q.fillRect(0,0,W,W);for(let r=0;r<16;r++)for(let c=0;c<9;c++){const x=c*32-(r%2?16:0),sh=190+((rn()*60)|0);q.fillStyle='rgb('+sh+','+(sh-34)+','+(sh-48)+')';q.fillRect(x+1,r*16+1,30,14)}speck(900,['rgba(0,0,0,.18)','rgba(255,255,255,.12)'],2)}
  else if(kind==='stone'){q.fillStyle='#d8d2c4';q.fillRect(0,0,W,W);q.fillStyle='#b4ad9d';for(let i=0;i<=4;i++){q.fillRect(i*64-1,0,3,W);q.fillRect(0,i*64-1,W,3)}for(let r=0;r<4;r++)for(let c=0;c<4;c++){const s=(rn()*26)|0;q.fillStyle='rgba('+(120+s)+','+(116+s)+','+(104+s)+',.16)';q.fillRect(c*64+3,r*64+3,58,58)}speck(700,['rgba(0,0,0,.1)'],2)}
  else if(kind==='gravel'){q.fillStyle='#d9d3c9';q.fillRect(0,0,W,W);speck(5200,['#a39a8e','#c4bcaf','#8c8378','#e8e2d6'],3)}
  else{q.fillStyle='#fff';q.fillRect(0,0,W,W);speck(3200,['rgba(120,100,80,.30)','rgba(255,255,255,.4)','rgba(70,55,40,.28)'],2.4);
   q.fillStyle='rgba(60,45,30,.2)';q.fillRect(W*.27,0,14,W);q.fillRect(W*.67,0,14,W);speck(260,['rgba(150,140,125,.9)'],4)}});
 t.wrapT=T.RepeatWrapping;t.wrapS=T.ClampToEdgeWrapping;t.anisotropy=4;t.encoding=T.LinearEncoding;return t})())}
function roadMat(kind){return ROADM[kind]||(ROADM[kind]=L(0xffffff,{vertexColors:true,map:roadTex(kind)}))}
const ROADK={0:'dirt',1:'cobble',2:'dirt',3:'gravel',4:'coast',5:'stone',6:'city'};
const curbM=L(0xb9b5aa);
function curbs(g,z0,hw,low){for(const sg of[-1,1])for(let k=0;k<4;k++){const zc=z0-5-k*10,c=new T.Mesh(new T.BoxGeometry(.2,low?.1:.16,10.4),curbM);c.position.set(cx(zc)+sg*(hw+.1),low?.05:.08,zc);c.rotation.y=Math.atan(dcx(zc));g.add(c)}}
function mSideOf(mci){const bb=BIOME[Math.floor((mci*CL)/440)%BIOME.length];return bb===4?1:(rng(mci*977+13)()<.5?-1:1)}
function build(i){const g=new T.Group(),r=rng(i),z0=-i*CL,N=10,P=[],Co=[],I=[],off=[-3.7,-2.9,2.9,3.7],col=[[.5,.45,.3],[.42,.36,.3],[.42,.36,.3],[.5,.45,.3]],bi=BIOME[((Math.floor((-z0)/440)%BIOME.length)+BIOME.length)%BIOME.length];if(bi===4||bi===6){col[0]=col[1]=col[2]=col[3]=[1,1,1]}if(bi===5){col[0]=col[3]=[.8,.76,.68];col[1]=col[2]=[.72,.68,.6]}
if(bi===1){col[0]=col[3]=[.52,.37,.31];col[1]=col[2]=[.42,.29,.24]}if(bi===3){col[0]=col[3]=[.5,.47,.43];col[1]=col[2]=[.4,.37,.34]}if(bi===2){col[0]=col[3]=[.62,.55,.42];col[1]=col[2]=[.52,.46,.36]}
{const hw=HW[bi];off[0]=-hw;off[1]=-hw+.8;off[2]=hw-.8;off[3]=hw}
for(let k=0;k<=N;k++){const z=z0-k*CL/N,x=cx(z);for(let j=0;j<4;j++){P.push(x+off[j],.03,z);Co.push(...col[j])}}
for(let k=0;k<N;k++)for(let j=0;j<3;j++){const a=k*4+j,b=a+4;I.push(a,a+1,b,a+1,b+1,b)}
const gm=new T.BufferGeometry();gm.setAttribute('position',new T.Float32BufferAttribute(P,3));gm.setAttribute('color',new T.Float32BufferAttribute(Co,3));{const UV=[],hw2=HW[bi];for(let k=0;k<=N;k++){const zz=z0-k*CL/N;for(let j=0;j<4;j++)UV.push((off[j]+hw2)/(2*hw2),(-zz)/6)}gm.setAttribute('uv',new T.Float32BufferAttribute(UV,2))}gm.setIndex(I);gm.computeVertexNormals();const rd=new T.Mesh(gm,roadMat(ROADK[bi]));rd.userData.keep=1;rd.receiveShadow=walkMode;g.add(rd);
if(bi===4||bi===6)curbs(g,z0,HW[bi],false);if(bi===5)curbs(g,z0,HW[bi],true);
const zm=z0-CL/2,xm=cx(zm),yaw=Math.atan(dcx(zm)),mci=Math.round((i-5)/8)*8+5,hasM=(i===mci),skipSide=(Math.abs(i-mci)<=1&&mci>=5)?mSideOf(mci):0,mSg=skipSide;
if(GRC[bi]){const gp=new T.Mesh(new T.PlaneGeometry(160,CL+6,1,4).rotateX(-Math.PI/2),GRM[bi]||(GRM[bi]=L(GRC[bi])));gp.position.set(xm,.01+(i%2)*.004,zm);gp.rotation.y=yaw;g.add(gp)}
if(hasM){const mo=mkMosque();mo.position.set(cx(zm)+mSg*12.5,0,zm);mo.rotation.y=mSg*Math.PI/2+yaw;g.add(mo);g.updateMatrixWorld(true);const door=mo.localToWorld(new T.Vector3(0,0,-5.4));const ei=mosqueList.findIndex(q=>q.sd===-zm);if(ei>=0)mosqueList.splice(ei,1);mosqueList.push({sd:-zm,x:mo.position.x,z:zm,door})}
if(bi===4){const sea=new T.Mesh(new T.PlaneGeometry(120,CL+4,1,4).rotateX(-Math.PI/2),waterM);sea.position.set(xm-69,.02,zm);g.add(sea);
  for(let k=0;k<10;k++){const zz=z0-1-k*4,p1=new T.Mesh(new T.BoxGeometry(.12,.7,.12),railM);p1.position.set(cx(zz)-4.7,.35,zz);g.add(p1)}
  if(i%9===2){const lx=xm-34,tw=new T.Mesh(new T.CylinderGeometry(1.1,1.7,13,12),lhWhite);tw.position.set(lx,6.5,zm);const bd=new T.Mesh(new T.CylinderGeometry(1.3,1.45,2.4,12),lhRed);bd.position.set(lx,8.6,zm);const lp=new T.Mesh(new T.SphereGeometry(1.1,10,8),lhLamp);lp.position.set(lx,13.6,zm);g.add(tw,bd,lp)}}
 if(bi===3){for(const sg of[-1,1]){if(skipSide===sg)continue;for(let k=0;k<4;k++){const z=z0-r()*CL;pine2(g,cx(z)+sg*(4.6+r()*6),z,1+r()*.9,r)}
  for(let k=0;k<3;k++){const z=z0-r()*CL;boulder(g,cx(z)+sg*(4.2+r()*3),z,1.3+r()*1.6,r)}}}
 else if(bi===4)coastScene(g,z0,zm,r,skipSide);else if(bi===5)parkScene(g,z0,zm,r,skipSide,i);else if(bi===6)cityScene(g,z0,zm,r,skipSide,i);else for(const sg of[-1,1]){if(bi===4&&sg<0)continue;if(skipSide===sg)continue;const fld=r()<.45;
 if(fld){const f=new T.Mesh(fieldG,bi===2?waterM:fieldMs[(r()*2)|0]);f.position.set(xm+sg*21,.02,zm);f.rotation.y=yaw;g.add(f);if(bi===2)for(let k=0;k<4;k++)reeds(g,cx(z0-r()*CL)+sg*(4.3+r()*2),z0-r()*CL,r)}
 for(let k=0;k<(fld?3:6);k++){const z=z0-r()*CL;tree(g,cx(z)+sg*(4.8+r()*(fld?3:16)),z,.9+r()*1.1,r)}
 if(!fld){for(let k=0;k<3;k++){const z=z0-r()*CL;tree(g,cx(z)+sg*(20+r()*20),z,1.6+r()*.8,r)}
  if(bi===1){if(r()<.55)stall(g,sg,z0-6-r()*28,r);else if(r()<.5)house(g,sg,z0-6-r()*28,r)}
  else if(r()<.4)house(g,sg,z0-6-r()*28,r);else if(r()<.3)vend(g,sg,z0-6-r()*28)}}
if(bi===0||bi===1||bi===2)for(let k=0;k<9;k++){const z=z0-r()*CL,sg=r()<.5?-1:1,o=4.3+r()*2.6;if(r()<.6)bush(g,cx(z)+sg*o,z,.5+r()*.6,r);else flowers(g,cx(z)+sg*(3.9+r()*.8),z,r)}
if(r()<.3)sign(g,z0-8-r()*24,(r()*3)|0);if(i%7===0&&r()<.7)crosswalk(g,z0-18-r()*10);
const W=[];
for(const zz of((bi===3||bi===5||bi===6)?[]:[z0,z0-20])){const p=new T.Group(),a=new T.Mesh(poleG,poleM),b=new T.Mesh(armG,poleM);p.add(a,b);p.position.set(poleX(zz),0,zz);p.rotation.y=Math.atan(dcx(zz));g.add(p);
 const za=zz,zb=zz-20,xa=poleX(za),xb=poleX(zb);
 for(const o of[-.9,0,.9])for(let k=0;k<8;k++){const f=t=>[xa+(xb-xa)*t+o,7.4-4*t*(1-t)+(o?0:.35),za+(zb-za)*t];W.push(...f(k/8),...f((k+1)/8))}}
const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(W,3));g.add(new T.LineSegments(wg,wireM));
g.userData.d=[gm,wg];merge(g);if(bi===6&&i%3===1)addTL(g,z0-CL/2);return g}
function upd(s){const c=Math.floor(s/CL);
 for(let i=c-1;i<=c+7;i++)if(!chunks.has(i)){const g=build(i);S.add(g);chunks.set(i,g)}
 for(const[i,g]of chunks)if(i<c-2){S.remove(g);g.userData.d.forEach(d=>d.dispose());chunks.delete(i)}}

// fireflies
const FN=110,fp=new Float32Array(FN*3),fb=new Float32Array(FN),fg=new T.BufferGeometry();
function fr(k,s,near){const z=-s-6-Math.random()*(near?70:20)-(near?0:60),sd=Math.random()<.5?-1:1;fp[k*3]=cx(z)+sd*(3+Math.random()*14);fb[k]=.4+Math.random()*3;fp[k*3+1]=fb[k];fp[k*3+2]=z}
for(let k=0;k<FN;k++)fr(k,0,true);
fg.setAttribute('position',new T.BufferAttribute(fp,3));
const ff=new T.Points(fg,new T.PointsMaterial({map:glowT,color:0xd6ff8a,size:.7,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false}));ff.frustumCulled=false;S.add(ff);

// rider
const rider=new T.Group(),inner=new T.Group();rider.add(inner);S.add(rider);const lamp=new T.PointLight(0xffe2a8,0,16,1.6);lamp.position.set(0,1.2,-1.3);rider.add(lamp);
const COLORS=[[0xb5432f,'كرزي',0],[0x2f6f4f,'أخضر صنوبر',150],[0x2f5f8f,'أزرق بحري',300],[0xd9a520,'كهرماني',450]];
const red=L(COLORS[0][0]),metal=L(0x2b2b30),skin=L(0xf0c4a4),hairM=L(0x1c1418),blouse=L(0x3aa6a0),skirtM=L(0x2d3a5c),shoe=L(0x6b3a2a),bask=L(0x9a7448);
const cylG=new T.CylinderGeometry(1,1,1,7),up=V(0,1,0);
function limb(m,a,b,rad){const d=new T.Vector3().subVectors(b,a),len=d.length();m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(up,d.normalize());m.scale.set(rad,len,rad)}
function part(mat,a,b,rad){const m=new T.Mesh(cylG,mat);if(a)limb(m,a,b,rad);inner.add(m);return m}
[[V(0,.35,.55),V(0,.35,.05)],[V(0,.35,.05),V(0,.93,.3)],[V(0,.35,.05),V(0,1,-.5)],[V(0,.35,.55),V(0,.93,.3)]].forEach(t=>part(red,t[0],t[1],.025));
part(metal,V(0,.35,-.55),V(0,1.02,-.5),.022);part(metal,V(-.3,1.05,-.52),V(.3,1.05,-.52),.02);
const seat=new T.Mesh(new T.BoxGeometry(.22,.05,.3),metal);seat.position.set(0,.95,.3);inner.add(seat);
const bk=new T.Mesh(new T.BoxGeometry(.4,.22,.32),bask);bk.position.set(0,1.15,-.8);inner.add(bk);const bottle=new T.Mesh(new T.CylinderGeometry(.045,.055,.2,8),L(0x3a8fd8,{transparent:true,opacity:.85}));bottle.position.set(0,1.28,-.8);bottle.visible=false;inner.add(bottle);
const aidKit=new T.Group();{const box=new T.Mesh(new T.BoxGeometry(.16,.1,.12),new T.MeshBasicMaterial({color:0xffffff}));const c1=new T.Mesh(new T.BoxGeometry(.09,.022,.022),new T.MeshBasicMaterial({color:0xd6303a}));const c2=new T.Mesh(new T.BoxGeometry(.022,.022,.09),new T.MeshBasicMaterial({color:0xd6303a}));c1.position.z=.061;c2.position.z=.061;aidKit.add(box,c1,c2)}aidKit.position.set(0,1.12,-.92);aidKit.visible=false;inner.add(aidKit);const rk=new T.Mesh(new T.BoxGeometry(.3,.03,.34),metal);rk.position.set(0,.9,.72);inner.add(rk);
const tG=new T.TorusGeometry(.35,.03,6,24).rotateY(Math.PI/2),spG=new T.BoxGeometry(.02,.68,.02),spG2=new T.BoxGeometry(.02,.02,.68);
function wheel(z){const w=new T.Group();w.add(new T.Mesh(tG,metal),new T.Mesh(spG,metal),new T.Mesh(spG2,metal));w.position.set(0,.35,z);inner.add(w);return w}
const wF=wheel(-.55),wR=wheel(.55);
const riderMark0=inner.children.length;
part(blouse,V(0,1.02,.3),V(0,1.56,.14),.15);
const sk=new T.Mesh(new T.CylinderGeometry(.17,.2,.26,10),skirtM);sk.position.set(0,.93,.3);inner.add(sk);
const hd=new T.Mesh(new T.SphereGeometry(.15,10,8),skin);hd.position.set(0,1.75,.1);inner.add(hd);
const hr=new T.Mesh(new T.SphereGeometry(.165,10,8),hairM);hr.position.set(0,1.78,.15);inner.add(hr);const cap=new T.Mesh(new T.SphereGeometry(.175,10,8,0,6.283,0,1.45),L(0xd64541));cap.position.set(0,1.8,.13);cap.rotation.x=-.25;inner.add(cap);
const pony=new T.Group(),pm=new T.Mesh(new T.BoxGeometry(.3,.4,.15),L(0xf08a24));pony.add(pm);pony.position.set(0,1.3,.36);inner.add(pony);
for(const sd of[-1,1]){part(blouse,V(sd*.2,1.5,.12),V(sd*.3,1.28,-.2),.05);part(skin,V(sd*.3,1.28,-.2),V(sd*.28,1.05,-.5),.04)}
const legs=[-1,1].map(()=>({a:part(skin),b:part(skin),f:(()=>{const m=new T.Mesh(new T.BoxGeometry(.1,.08,.24),shoe);inner.add(m);return m})()}));
const riderMark1=inner.children.length;
function legUpd(a){legs.forEach((lg,n)=>{const sd=n?1:-1,ph=a+(n?Math.PI:0),Fy=.35+Math.cos(ph)*.17,Fz=.05-Math.sin(ph)*.17,Hy=.98,Hz=.32;
 let dy=Fy-Hy,dz=Fz-Hz,d=Math.min(Math.hypot(dy,dz),.86);dy/=Math.hypot(Fy-Hy,Fz-Hz);dz/=Math.hypot(Fy-Hy,Fz-Hz);
 const Lh=.44,ah=d/2,h=Math.sqrt(Math.max(Lh*Lh-ah*ah,0)),Ky=Hy+dy*ah-dz*h,Kz=Hz+dz*ah+dy*h;
 const H3=V(sd*.1,Hy,Hz),K3=V(sd*.14,Ky,Kz),F3=V(sd*.17,Fy,Fz);limb(lg.a,H3,K3,.06);limb(lg.b,K3,F3,.05);lg.f.position.set(sd*.17,Fy,Fz-.04)})}
function standPose(bend){legs.forEach((lg,n)=>{const sd=n?1:-1,H3=V(sd*.1,.98,.32),K3=V(sd*.12,.52,.3),F3=V(sd*.13,.04,.3+bend*.18);limb(lg.a,H3,K3,.06);limb(lg.b,K3,F3,.05);lg.f.position.set(sd*.13,.04,F3.z-.04)})}
const bsh=new T.Mesh(shG,shM);bsh.position.y=.07;bsh.scale.set(1.1,1,2.6);rider.add(bsh);

// audio
let AC,mg,wg2,wf,rg,scf,scg,NB,muted=true;
function initAudio(){AC=new(window.AudioContext||window.webkitAudioContext)();mg=AC.createGain();mg.gain.value=.5;mg.connect(AC.destination);
 NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 const ns=()=>{const s=AC.createBufferSource();s.buffer=NB;s.loop=true;s.start();return s};
 /* no continuous background layers: only event sounds and the bird chirps remain */
}
function chirp(){if(!AC)return;const t=AC.currentTime,n=2+(Math.random()*2|0),f0=2600+Math.random()*1200,fl=AC.createBiquadFilter();fl.type='bandpass';fl.Q.value=6;fl.frequency.value=f0;fl.connect(mg);
 for(let i=0;i<n;i++){const o=AC.createOscillator(),g=AC.createGain(),s=t+i*.1;o.type='sine';o.frequency.setValueAtTime(f0,s);o.frequency.exponentialRampToValueAtTime(f0*1.4,s+.05);g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.035,s+.008);g.gain.exponentialRampToValueAtTime(.0001,s+.07);o.connect(g);g.connect(fl);o.start(s);o.stop(s+.08)}}
function tick(){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain(),t=AC.currentTime,fr=1000+Math.random()*300;s.buffer=NB;f.type='bandpass';f.frequency.value=fr;f.Q.value=2.2;g.gain.setValueAtTime(.018,t);g.gain.exponentialRampToValueAtTime(.0001,t+.04);s.connect(f);f.connect(g);g.connect(mg);s.start(0,Math.random());s.stop(t+.05)}
function bell(){if(!AC)return;const t=AC.currentTime;[[1174.7,.55,.02],[1760,.4,.045]].forEach(([f,g,at],i)=>{const o=AC.createOscillator(),e=AC.createGain(),fl=AC.createBiquadFilter();o.type='sine';fl.type='lowpass';fl.frequency.value=2600;o.frequency.setValueAtTime(f,t+at);e.gain.setValueAtTime(0,t+at);e.gain.linearRampToValueAtTime(g*.1,t+at+.035);e.gain.exponentialRampToValueAtTime(.0001,t+at+.55);o.connect(fl);fl.connect(e);e.connect(mg);o.start(t+at);o.stop(t+at+.6)})}
function meow(){if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();o.type='triangle';f.type='bandpass';f.Q.value=2.2;f.frequency.setValueAtTime(900,t);f.frequency.linearRampToValueAtTime(1500,t+.15);f.frequency.linearRampToValueAtTime(750,t+.5);o.frequency.setValueAtTime(440,t);o.frequency.linearRampToValueAtTime(680,t+.15);o.frequency.linearRampToValueAtTime(360,t+.55);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.07);g.gain.exponentialRampToValueAtTime(.0001,t+.58);o.connect(f);f.connect(g);g.connect(mg);o.start(t);o.stop(t+.6)}
function purr(){if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain(),lf=AC.createOscillator(),lg=AC.createGain();o.type='sawtooth';o.frequency.value=55;lf.frequency.value=24;lg.gain.value=18;lf.connect(lg);lg.connect(o.frequency);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.15);g.gain.linearRampToValueAtTime(.05,t+1.1);g.gain.linearRampToValueAtTime(0,t+1.4);o.connect(g);g.connect(mg);o.start(t);lf.start(t);o.stop(t+1.45);lf.stop(t+1.45)}
function coin(){if(!AC)return;const t=AC.currentTime;[[988,0],[1319,.07],[1568,.14]].forEach(([f,dl])=>{const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.09,t+dl);g.gain.exponentialRampToValueAtTime(.0001,t+dl+.28);o.connect(g);g.connect(mg);o.start(t+dl);o.stop(t+dl+.3)})}
// input
const K={};let ptr=null,started=false;
addEventListener('keydown',e=>{K[e.code]=1;if(started&&e.code==='Space'){e.preventDefault();bell();scare();if(mi===0&&tg&&Math.abs(tg.sd-s)<16){tg.g.userData.alert=1;tg.g.userData.head.rotation.y=.7;say('The cat perks up its ears')}}if(e.code==='KeyM')toggleMute()});
function toggleMute(){muted=!muted;if(mg)mg.gain.value=muted?0:.5;$('mute').textContent=muted?'🔇':'🔊'}
$('mute').addEventListener('pointerdown',e=>{e.stopPropagation();toggleMute()});
addEventListener('keyup',e=>K[e.code]=0);
R.domElement.addEventListener('pointerdown',e=>{ptr={x:e.clientX}});
addEventListener('pointermove',e=>{if(ptr)ptr.x=e.clientX});
addEventListener('pointerup',()=>ptr=null);
const ROUTES=[['🌾','الطريق الريفي'],['🌊','طريق الساحل'],['🏪','شارع السوق'],['⛰','الطريق الجبلي'],['💧','طريق القناة'],['🌳','الحديقة'],['🚦','شوارع المدينة']];let startRoute=0;
function renderRoutes(){const el=$('routes');el.innerHTML='<div style="width:100%;font-size:13px;opacity:.85;margin-bottom:2px">اختر الطريق</div>';ROUTES.forEach((q,i)=>{const b=document.createElement('button');b.textContent=q[0]+' '+q[1];if(i===startRoute)b.className='sel';b.onpointerdown=e=>{e.stopPropagation();startRoute=i;renderRoutes()};el.appendChild(b)})}
const DAYS=[['☀️','يوم عادي'],['🕌','يوم الجمعة'],['🌙','شهر رمضان']];let dayChoice=0;
function renderDays(){const el=$('days');el.innerHTML='<div style="width:100%;font-size:13px;opacity:.85;margin-bottom:2px">اختر اليوم</div>';DAYS.forEach((q,i)=>{const b=document.createElement('button');b.textContent=q[0]+' '+q[1];if(i===dayChoice)b.className='sel';b.onpointerdown=e=>{e.stopPropagation();dayChoice=i;renderDays()};el.appendChild(b)})}
let modeChoice=0;function renderModes(){const el=$('modes');el.innerHTML='<div style="width:100%;font-size:13px;opacity:.85;margin-bottom:2px">اختر المرحلة</div>';[['🚲','قيادة الدراجة'],['🏘','المشي في الحارة']].forEach((q,i)=>{const b=document.createElement('button');b.textContent=q[0]+' '+q[1];if(i===modeChoice)b.className='sel';b.onpointerdown=e=>{e.stopPropagation();modeChoice=i;renderModes();$('routes').style.display=i?'none':'flex'};el.appendChild(b)})}
renderModes();renderDays();renderRoutes();
$('ov').addEventListener('pointerdown',()=>{dayType=['normal','friday','ramadan'][dayChoice];startWd=dayChoice===1?5:2;ramStart=dayChoice===2?3:0;gmin=dayChoice===1?10*60:dayChoice===2?10*60:9*60;dayN=0;lastDay=0;iftarDone=false;buildPRY();if(modeChoice===1){startWalkMode();return}gnd.visible=true;document.body.classList.remove('walk-mode');if(startRoute>0){chunks.forEach(g=>{S.remove(g);g.userData.d.forEach(d=>d.dispose())});chunks.clear();mosqueList.length=0;tlights.length=0;s=440*startRoute+10;first=true}started=true;$('bk').style.display='block';$('goals').style.display='block';$('ov').style.display='none';initAudio();mg.gain.value=0;AC.resume();spawn();say('اضغط W للتحرك، وA وD للتوجيه، وS للفرملة');setTimeout(()=>$('keys').style.opacity=0,14000)});

// missions
const $m=$('mis'),$a=$('act'),$menu=$('menu'),$t=$('toast'),MS=[{t:'A thirsty cat',d:'A cat is waiting by the road. Pour water into its bowl.'},{t:'Grandpa needs a ride',d:'Stop and help him onto the back seat.'},{t:'Take him home',d:'Ride gently to his house. No speeding, no swerving.'},{t:'Hungry?',d:'Stop at a food stall and buy something to eat.'},{t:'Uh oh...',d:'Your ball got away from you near a neighbor\'s house.'},{t:'A lost wallet',d:'Someone dropped a wallet on the road. Stop right at it and pick it up.'},{t:'Return the trust',d:'Find the owner and give the wallet back, exactly as you found it.'},{t:'Delivery job',d:'Pick up a parcel at the shop. Honest work earns halal money.'},{t:'Deliver the parcel',d:'Hand the parcel to the customer on time.'},{t:'Mom is calling',d:'Go home — your family needs you.'}],COST=[100,180,260];
function ld(){try{return JSON.parse(localStorage.getItem('er_save')||'{}')}catch(e){return{}}}
const SV=ld(),today=new Date().toISOString().slice(0,10);
for(const k of['jobs','earned','famSpent','charity','saved','treats','prayers','trusts','obeyed','postponed','iftars','fastKept','fastBroken','knowledge','schoolRuns','helped','salams','errands','trusts','slips','peace','mercy'])if(SV[k]==null)SV[k]=0;
if(SV.day!==today){SV.day=today;SV.cats=0;SV.elders=0;SV.shops=0;SV.claimed=false}
SV.money=SV.money||0;SV.owned=SV.owned||[0];SV.color=SV.color||0;
function svSave(){try{localStorage.setItem('er_save',JSON.stringify(SV))}catch(e){}}
const CH=[{k:'cats',t:2,l:'اسقِ قطتين عطشتين'},{k:'elders',t:1,l:'ساعد شخصًا مسنًا في الوصول'},{k:'shops',t:1,l:'اشترِ وجبة خفيفة'}];
function chDone(){return CH.every(c=>SV[c.k]>=c.t)}
function renderGarage(){const g=$('gar');g.innerHTML='';COLORS.forEach((c,i)=>{const d=document.createElement('div');d.style.background='#'+c[0].toString(16).padStart(6,'0');if(i===SV.color)d.classList.add('sel');
 const owned=SV.owned.includes(i);const s=document.createElement('span');s.textContent=owned?c[1]:c[1]+' ¥'+c[2];d.appendChild(s);
 d.onpointerdown=e=>e.stopPropagation();d.onclick=()=>{if(!owned){if(SV.money<c[2])return;SV.money-=c[2];SV.owned.push(i)}SV.color=i;svSave();renderGarage();$('ovmoney').textContent=SV.money;red.color.setHex(c[0])};
 g.appendChild(d)});
 $('dc').innerHTML=CH.map(c=>'<li>'+(SV[c.k]>=c.t?'✓ ':'· ')+c.l+' ('+Math.min(SV[c.k],c.t)+'/'+c.t+')</li>').join('')+'<li style="margin-top:8px;opacity:.9">📒 التوصيلات '+SV.jobs+' · الأرباح ¥'+SV.earned+' · مصروف الأسرة ¥'+SV.famSpent+' · الصدقات ¥'+SV.charity+' · المدخرات ¥'+SV.saved+' · الصلوات '+SV.prayers+' · توصيلات المدرسة '+SV.schoolRuns+' · الدروس '+SV.knowledge+' · المساعدات '+SV.helped+' · السلام '+SV.salams+' · الأمانات المُعادة '+SV.trusts+'</li>'+(chDone()&&!SV.claimed?'<li><b>اكتملت التحديات اليومية، وستحصل على المكافأة عند العودة.</b></li>':'')}
$('ovmoney').textContent=SV.money;red.color.setHex(COLORS[SV.color][0]);renderGarage();$('mute').textContent='🔇';
let mi=0,tg=null,prog=0,money=SV.money,comfort=100,elder,menuOpen=false,msgT=0,wait=0,actHeld=false,pact=false,wt=0,catStage=0,hurtAnimal=null,healProg=0,healStage=0,healPact=false,walletStage=0,walletT=0,walletHeld=false;
function claimDaily(){if(chDone()&&!SV.claimed){SV.claimed=true;money+=150;SV.money=money;svSave();say('اكتملت التحديات اليومية! +¥150')}}
function pickNext(){if(jobHas)return 8;const k=[0,1,3,4,5,7,7][(Math.random()*7)|0];if(k===1){const hh=hourNow();passKind=(hh>=6.3&&hh<9&&Math.random()<.7)?'kid':'elder'}return k}
$a.addEventListener('pointerdown',()=>actHeld=true);addEventListener('pointerup',()=>actHeld=false);
function say(x){$t.textContent=walkMode?String(x).replace(/\s{2,}/g,' ').trim():x;$t.style.opacity=1;msgT=4}
function clr(){if(tg){S.remove(tg.m);tg=null}}
function place(g,z,sg,o){g.position.set(cx(z)+sg*o,0,z);g.rotation.y=sg*Math.PI/2+Math.atan(dcx(z));S.add(g)}
function beam(){const g=new T.Group(),s=new T.Sprite(new T.SpriteMaterial({map:glowT,fog:false,depthWrite:false,blending:T.AdditiveBlending,opacity:.9}));s.position.y=8;s.scale.set(16,16,1);g.add(new T.Mesh(new T.CylinderGeometry(.3,.3,40,8).translate(0,20,0),new T.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.3,depthWrite:false})),s);return g}
// ---- real (CC0, Kenney) character models, loaded from embedded data. Primitives remain as a fallback. ----
const REAL={boy:null,cat:null,elder:null,medic:null,owner:null,kid:null};let realRider=null;const catMixers=[],catObjs=[],npcWaves=[],_qn=new T.Quaternion(),_ex=new T.Vector3(1,0,0),_qw=new T.Quaternion(),_az=new T.Vector3(0,0,1),_ay=new T.Vector3(0,1,0);
const _qa=new T.Quaternion(),_ax=new T.Vector3(1,0,0);
const RS=2.3,RIDE_Y=.95-.169*2.3,LEG_BASE=-.6,LEG_SWING=.45,CAT_S=.16;
const CAT_COL={White:0xf0eee8,Grey:0x3b3b44,Pink:0xf2a0b8};
function greyTint(g){g.scene.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m.userData.grey)return;m.userData.grey=1;
 m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLP=position;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLP;').replace('#include <map_fragment>','#include <map_fragment>\n float mk=max(step(.535,vLP.y),step(.25,vLP.y)*step(vLP.y,.455)*step(.09,vLP.z));float lum=dot(diffuseColor.rgb,vec3(.3,.5,.2));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.84,.85,.88)*(.5+.5*lum),mk);float tr=step(.045,vLP.y)*step(vLP.y,.218);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.2,.22,.28)*(.65+.5*lum),tr);')}})}
function fixModel(g){g.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map){m.map.encoding=T.LinearEncoding;m.map.needsUpdate=true}if(CAT_COL[m.name]!==undefined){m.color.setHex(CAT_COL[m.name]);m.flatShading=true;m.needsUpdate=true}m.roughness=1;m.metalness=0})}})}
function tuneWalkModel(root){root.traverse(o=>{if(!o.isMesh||!o.material)return;const tune=m=>{const c=m.clone();if(c.map){c.map=c.map.clone();c.map.encoding=T.sRGBEncoding;c.map.needsUpdate=true}if(c.emissiveMap){c.emissiveMap=c.emissiveMap.clone();c.emissiveMap.encoding=T.sRGBEncoding;c.emissiveMap.needsUpdate=true}if('roughness'in c)c.roughness=Math.max(c.roughness||.65,.78);if('metalness'in c)c.metalness=0;disableTownTerrainWarp(c);c.needsUpdate=true;return c};o.material=Array.isArray(o.material)?o.material.map(tune):tune(o.material)})}
async function loadReal(){
 if(!(T.GLTFLoader&&T.SkeletonUtils))return;
 const ld=new T.GLTFLoader();
 const models=[
  ['boy','assets/models/boy.glb',g=>{fixModel(g);REAL.boy=g;installRealRider()}],
  ['cat','assets/models/cat.glb',g=>{fixModel(g);REAL.cat=g}],
  ['kid','assets/models/kid.glb',g=>{fixModel(g);REAL.kid=g}],
  ['owner','assets/models/owner.glb',g=>{fixModel(g);REAL.owner=g}],
  ['medic','assets/models/medic.glb',g=>{fixModel(g);REAL.medic=g}],
  ['elder','assets/models/elder.glb',g=>{fixModel(g);greyTint(g);REAL.elder=g}]
 ];
 try{
  const loaded=await Promise.all(models.map(async ([name,url,ready])=>{
   const response=await fetch(url);
   if(!response.ok)throw new Error(name+' model request failed: '+response.status+' '+url);
   return {name,buffer:await response.arrayBuffer(),ready};
  }));
  const cib=window.createImageBitmap;
  window.createImageBitmap=undefined;
  try{loaded.forEach(({name,buffer,ready})=>ld.parse(buffer,'',ready,e=>console.warn(name+' model failed',e)))}
  finally{window.createImageBitmap=cib}
 }catch(e){console.warn('Character models failed to load; the game will use its built-in fallback characters.',e)}
}
function installRealRider(){
 if(realRider||!REAL.boy)return;
 const m=T.SkeletonUtils.clone(REAL.boy.scene);m.scale.setScalar(RS);m.rotation.y=Math.PI;m.position.set(0,RIDE_Y,.33);
 const b=rigBones(m);
 const mixer=new T.AnimationMixer(m),acts={};REAL.boy.animations.forEach(c=>{acts[c.name]=mixer.clipAction(c)});
 const pm=L(0x1a1a1c),pedL=new T.Mesh(new T.BoxGeometry(.13,.03,.09),pm),pedR=new T.Mesh(new T.BoxGeometry(.13,.03,.09),pm);
 const prim=inner.children.slice(riderMark0,riderMark1);
 inner.add(m,pedL,pedR);prim.forEach(o=>o.visible=false);
 const hand=b['arm-right'],ho=(()=>{try{return handOffset(m,'arm-right')}catch(e){console.warn('hand measure failed',e);return null}})();if(hand&&ho){hand.add(bottle,aidKit,walletHand,parcelHand);parcelHand.position.copy(ho);parcelHand.scale.setScalar(1/RS);bottle.position.copy(ho);aidKit.position.copy(ho);walletHand.position.copy(ho);bottle.scale.setScalar(1/RS);aidKit.scale.setScalar(1/RS);walletHand.scale.setScalar(1/RS)}
 realRider={m,mixer,acts,b,pedL,pedR,mode:'ride',cur:null,side:1,pp:{lf:0,rf:0,al:0,ar:0,lean:0,twist:0,roll:0},wph:0};if(acts['drive']){acts['drive'].play();realRider.cur='drive'}poseRide();
}
// measure the hand: the centroid of the skinned vertices farthest from the arm bone, expressed in that bone's local space
function handOffset(m,boneName){const bone=m.getObjectByName(boneName);if(!bone)return null;let best=null;m.updateMatrixWorld(true);
 m.traverse(o=>{if(!o.isSkinnedMesh||best)return;const idx=o.skeleton.bones.indexOf(bone);if(idx<0)return;const g=o.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,v=new T.Vector3(),bp=new T.Vector3();bone.getWorldPosition(bp);const pts=[];
  for(let i=0;i<g.attributes.position.count;i++){let w=0;for(let k=0;k<4;k++)if(si.array[i*si.itemSize+k]===idx)w+=sw.array[i*sw.itemSize+k];if(w>.5){o.boneTransform(i,v);v.applyMatrix4(o.matrixWorld);pts.push(v.clone())}}
  if(!pts.length)return;pts.sort((a,b)=>b.distanceTo(bp)-a.distanceTo(bp));const n=Math.max(3,Math.floor(pts.length*.12)),c=new T.Vector3();for(let i=0;i<n;i++)c.add(pts[i]);c.multiplyScalar(1/n);best=bone.worldToLocal(c)});
 return best}
const qY=a=>new T.Quaternion().setFromAxisAngle(_ay,a),qZ=a=>new T.Quaternion().setFromAxisAngle(_az,a),qX=a=>new T.Quaternion().setFromAxisAngle(_ex,a);
function setB(o,qa){if(o)o.quaternion.copy(o.userData.rest).multiply(qa)}
function bodyPose(b,o){setB(b['leg-left'],qX(-(o.lf||0)));setB(b['leg-right'],qX(-(o.rf||0)));
 setB(b['arm-left'],qZ(-1.05).multiply(qX(.6-(o.al||0))));setB(b['arm-right'],qZ(1.05).multiply(qX(.6-(o.ar||0))));setB(b.torso,qX(o.lean||0).multiply(qY(o.twist||0)).multiply(qZ(o.roll||0)))}
function rigBones(m){const b={};['leg-left','leg-right','arm-left','arm-right','torso'].forEach(n=>{const o=m.getObjectByName(n);if(o){o.userData.rest=o.quaternion.clone();b[n]=o}});return b}
function walkOff(ph,A){const s=Math.sin(ph),k=A/.5;return{lf:A*s,rf:-A*s,al:-.34*k*s,ar:.34*k*s,twist:-.11*k*s,roll:.03*k*Math.cos(ph),lean:.05*k}}
function easePose(cur,tgt,k){for(const n of['lf','rf','al','ar','lean','twist','roll'])cur[n]+=((tgt[n]||0)-cur[n])*k}
function relRot(o,a){if(o)o.quaternion.copy(o.userData.rest).multiply(_qa.setFromAxisAngle(_ax,a))}
function poseRide(){const R_=realRider,ph=crank;
 relRot(R_.b['leg-left'],LEG_BASE-Math.sin(ph)*LEG_SWING);relRot(R_.b['leg-right'],LEG_BASE-Math.sin(ph+Math.PI)*LEG_SWING);
 R_.pedL.position.set(-.16,.35+Math.cos(ph)*.17,.05-Math.sin(ph)*.17);R_.pedR.position.set(.16,.35+Math.cos(ph+Math.PI)*.17,.05-Math.sin(ph+Math.PI)*.17)}
function standAnim(){return'idle'}
function turnYaw(o,target,dt){const d=((target-o.rotation.y+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;o.rotation.y+=d*(1-Math.exp(-8*dt))}
function updateReal(dt,dismounted){
 catMixers.forEach(mx=>mx.update(dt));
 catObjs.forEach(u=>{u.eatAmt+=(u.eatTarget-u.eatAmt)*(1-Math.exp(-6*dt));if(u.eatAmt>.01){const a=-(1.0+Math.sin(t*5)*.14)*u.eatAmt/2;u.neck.forEach(b=>b.quaternion.multiply(_qn.setFromAxisAngle(_ex,a)))}});
 npcWaves.forEach(u=>{if(u.walking&&u.bones){u.wph+=dt*5;bodyPose(u.bones,walkOff(u.wph,.42))}u.waveAmt+=(u.waveTarget-u.waveAmt)*(1-Math.exp(-7*dt));if(u.waveAmt>.01&&u.waveBone)u.waveBone.quaternion.multiply(_qw.setFromAxisAngle(_az,-(1.9+Math.sin(t*8)*.32)*u.waveAmt))});
 updateElderOut(dt);updateElderIn(dt);updateRescue(dt);
 if(realRider){const rm=realRider.mode;walletHand.visible=walletHeld&&rm!=='ride';walletBasket.visible=walletHeld&&rm==='ride'}
 npcWaves.forEach(u=>{if(u.waveFar&&u.grp&&Math.hypot(u.grp.position.x-rider.position.x,u.grp.position.z-rider.position.z)>30)u.waveTarget=0});
 const R_=realRider;if(!R_)return;const m=R_.m;
 if(dismounted&&R_.mode==='ride'){R_.mode='stand';R_.mixer.stopAllAction();R_.cur=null;m.position.y=0;
  let tx=1;if(hurtAnimal)tx=hurtAnimal.g.position.x-rider.position.x;else if(tg&&tg.g)tx=tg.g.position.x-rider.position.x;R_.side=tx<0?-1:1}
 else if(!dismounted&&R_.mode==='stand'){R_.mode='mounting';R_.mixer.stopAllAction();R_.cur=null}
 if(R_.mode==='ride'){m.position.set(0,RIDE_Y,.33);m.rotation.y=Math.PI;R_.mixer.update(dt);poseRide();return}
 const pg=(prayStage===2||prayStage===3)&&prayGoal,tgl=(!pg&&R_.mode==='stand')?taskGoal():null;let gx,gz;
 if(pg){gx=prayGoal.x;gz=prayGoal.z}else if(tgl){const lp=inner.worldToLocal(tgl.p.clone());gx=lp.x;gz=lp.z}else{gx=R_.mode==='mounting'?0:R_.side*.95;gz=R_.mode==='mounting'?.33:.15}
 const dx=gx-m.position.x,dz=gz-m.position.z,dist=Math.hypot(dx,dz),walking=dist>.06;R_.atGoal=!walking&&R_.mode==='stand'&&!pg;
 if(walking){const st=Math.min(dist,(pg?2.3:(tgl?2.0:1.7))*dt);m.position.x+=dx/dist*st;m.position.z+=dz/dist*st;m.position.y=0;turnYaw(m,Math.atan2(dx,dz),dt)}
 else if(R_.mode==='mounting'){R_.mode='ride';R_.cur=null;R_.mixer.stopAllAction();if(R_.acts['drive']){R_.acts['drive'].reset().play();R_.cur='drive'}m.position.set(0,RIDE_Y,.33);m.rotation.y=Math.PI;return}
 else{let tr=R_.side*Math.PI/2;if(tgl){const fl=inner.worldToLocal(tgl.face.clone());tr=Math.atan2(fl.x-m.position.x,fl.z-m.position.z)}turnYaw(m,tr,dt)}
 const a=standAnim();if(R_.cur!==a){const nx=R_.acts[a];if(nx){nx.reset().fadeIn(.2).play();if(R_.cur&&R_.acts[R_.cur])R_.acts[R_.cur].fadeOut(.2);R_.cur=a;if(a==='idle')nx.paused=true}}R_.mixer.update(dt);
 boyPose(R_,walking,dt)
}
function boyPose(R_,walking,dt){let o;
 if(walking){R_.wph+=dt*5.0;o=walkOff(R_.wph,.42)}
 else if(walletStage===1||prayStage===1||prayStage===5||jobStage===1)o={lean:.3,ar:.75,al:.25}
 else if(walletStage===2||jobStage===3)o={ar:1.05}
 else if(mi===0&&catStage===2)o={ar:1.25}
 else o={};
 easePose(R_.pp,o,Math.min(1,9*dt));bodyPose(R_.b,R_.pp)}
loadReal();
function catPlay(u,n){if(!u||!u.acts)return;u.eatTarget=(n==='eat')?1:0}
function mkCat(){if(!REAL.cat)return mkCatPrim();
 const g=new T.Group(),m=T.SkeletonUtils.clone(REAL.cat.scene);if(walkMode)tuneWalkModel(m);m.scale.setScalar(CAT_S);m.rotation.y=Math.PI/2;g.add(m);
 const bowl=new T.Mesh(new T.CylinderGeometry(.17,.12,.09,10),L(0x4a6fa5)),wat=new T.Mesh(new T.CircleGeometry(.14,10).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x9fdcff}));
 bowl.scale.set(1.3,1.3,1.3);wat.scale.setScalar(.01);bowl.position.set(0,.06,-.62);wat.position.set(0,.12,-.62);g.add(bowl,wat);
 const mixer=new T.AnimationMixer(m),acts={};REAL.cat.animations.forEach(c=>{acts[c.name]=mixer.clipAction(c)});
 g.userData={head:new T.Object3D(),tail:new T.Object3D(),eyes:[new T.Object3D(),new T.Object3D()],wat,blink:2+Math.random()*2,alert:0,mixer,acts,cur:null,neck:[m.getObjectByName('Bone002'),m.getObjectByName('Bone003')].filter(Boolean),eatAmt:0,eatTarget:0};
 if(acts['CatArmature|Idle'])acts['CatArmature|Idle'].play();
 catMixers.push(mixer);catObjs.push(g.userData);if(catMixers.length>10){catMixers.shift();catObjs.shift()}return g}
function mkCatPrim(){const g=new T.Group(),c=L(0xe0913a),belly=L(0xf5ddb0),pink=L(0xe38a9e),dark=L(0x1a1a1a),wskM=new T.MeshBasicMaterial({color:0xfff8ee}),
 body=new T.Mesh(new T.SphereGeometry(1,10,8),c),chest=new T.Mesh(new T.SphereGeometry(1,8,6),belly),
 head=new T.Group(),skull=new T.Mesh(new T.SphereGeometry(.1,10,8),c),muzzle=new T.Mesh(new T.SphereGeometry(.052,8,6),belly),nose=new T.Mesh(new T.SphereGeometry(.012,5,4),pink),
 tail=new T.Mesh(cylG,c),tailTip=new T.Mesh(new T.SphereGeometry(.032,6,5),c),
 bowl=new T.Mesh(new T.CylinderGeometry(.17,.12,.09,10),L(0x4a6fa5)),wat=new T.Mesh(new T.CircleGeometry(.14,10).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x9fdcff})),eyes=[];
 body.scale.set(.13,.115,.27);body.position.y=.145;chest.scale.set(.09,.085,.1);chest.position.set(0,.13,-.13);
 skull.scale.set(1,.9,.92);muzzle.position.set(0,-.015,.09);nose.position.set(0,.005,.135);head.add(skull,muzzle,nose);
 for(const k of[-1,1]){const e=new T.Mesh(new T.ConeGeometry(.038,.08,4),c);e.position.set(k*.052,.085,-.005);e.rotation.z=k*-.15;head.add(e);
  const ei=new T.Mesh(new T.ConeGeometry(.02,.045,4),pink);ei.position.set(k*.052,.07,.008);ei.rotation.z=k*-.15;head.add(ei);
  const ey=new T.Mesh(new T.SphereGeometry(.017,6,5),dark);ey.position.set(k*.042,.0,.085);head.add(ey);eyes.push(ey);
  for(let n=-1;n<=1;n++){const wh=new T.Mesh(cylG,wskM);wh.scale.set(.004,.09,.004);wh.rotation.z=Math.PI/2;wh.rotation.y=k*(.45+n*.18);wh.position.set(k*.07,n*.008,.115);head.add(wh)}}
 head.position.set(0,.31,-.2);
 limb(tail,V(0,.14,.24),V(.13,.4,.4),.026);tailTip.position.set(.15,.42,.43);
 const legs=[];for(const k of[-1,1])for(const j of[-1,1]){const lg=new T.Mesh(cylG,c),pw=new T.Mesh(new T.SphereGeometry(.026,6,5),c);
  limb(lg,V(k*.065,.14,j*.11-.02),V(k*.065,0,j*.11-.02),.019);pw.position.set(k*.065,0,j*.11-.02);legs.push(lg,pw);g.add(lg,pw)}
 bowl.position.set(0,.045,-.6);wat.position.set(0,.09,-.6);wat.scale.setScalar(.01);
 g.add(body,chest,head,tail,tailTip,bowl,wat);g.userData={head,wat,tail,eyes,blink:2+Math.random()*2,alert:0};return g}

// ---- grandfather: climbs down, walks to his door, waves and thanks you ----
let elderOut=null;
function startAlight(){const e=elder,wp=new T.Vector3();e.getWorldPosition(wp);inner.remove(e);S.add(e);e.position.set(wp.x,0,wp.z);e.rotation.set(0,rider.rotation.y,0);e.scale.setScalar(1);e.userData.waveTarget=0;
 const hp=tg.g.position,gp=tg.g.userData.gate;elderOut={e,phase:'walk',tx:gp?gp.x:hp.x+3.3,tz:gp?gp.z:hp.z+1.4,tip:passKind==='kid'?40+Math.round(comfort*.6):80+Math.round(comfort*1.4)};
 npcPlay(e.userData,'idle',.2);e.userData.walking=true;say(passKind==='kid'?'Your brother climbs down and walks to the school gate...':'Grandpa climbs down and walks to his door...');clr();wait=11;$a.style.display='none'}
function updateElderOut(dt){const o=elderOut;if(!o)return;const e=o.e,u=e.userData;
 if(o.phase==='walk'){const dx=o.tx-e.position.x,dz=o.tz-e.position.z,dist=Math.hypot(dx,dz);
  if(dist>.12){const st=Math.min(dist,2.1*dt);e.position.x+=dx/dist*st;e.position.z+=dz/dist*st;turnYaw(e,Math.atan2(-dx,-dz),dt)}
  else{o.phase='thanks';u.walking=false;npcPlay(u,'idle',.3);u.waveTarget=1;money+=o.tip;SV.money=money;if(passKind==='kid')SV.schoolRuns++;else SV.elders++;svSave();claimDaily();fan();coin();if(passKind==='kid'){say('شكرًا يا أخي!   \u2066+¥'+o.tip+'\u2069');openQuiz()}else say('Thank you, my boy!  +\u00a5'+o.tip+'   \u2067\u062c\u0632\u0627\u0643 \u0627\u0644\u0644\u0647 \u062e\u064a\u0631\u064b\u0627\u2069')}}
 else{const dx=rider.position.x-e.position.x,dz=rider.position.z-e.position.z;turnYaw(e,Math.atan2(-dx,-dz),dt);if(Math.hypot(dx,dz)>32){u.waveTarget=0;elderOut=null}}}

// ---- injured animal: call for help and a rescuer arrives by bicycle ----
let rescue=null;const RESC_SPD=7.5;
function lockRide(){return(mi===0&&catStage>=1)||(hurtAnimal&&healStage>=1)||walletStage>=1||prayStage>=1||!!elderIn||taskStand()}
function makeRig(m,gl){const b=rigBones(m);const mixer=new T.AnimationMixer(m),acts={};gl.animations.forEach(c=>{acts[c.name]=mixer.clipAction(c)});return{m,b,mixer,acts,cur:null}}
function rigPlay(r,n,f){const a=r.acts[n];if(!a||r.cur===n)return;a.reset().fadeIn(f||.2).play();if(n==='idle')a.paused=true;if(r.cur&&r.acts[r.cur])r.acts[r.cur].fadeOut(f||.2);r.cur=n}
function mkBikeGroup(col){const g=new T.Group(),fm=L(col),mm=L(0x2b2b30),wk=[];
 const bp=(mat,a,b,r)=>{const e=new T.Mesh(cylG,mat);limb(e,a,b,r);g.add(e)};
 bp(fm,V(0,.35,.55),V(0,.35,.05),.025);bp(fm,V(0,.35,.05),V(0,.93,.3),.025);bp(fm,V(0,.35,.05),V(0,1,-.5),.025);bp(fm,V(0,.35,.55),V(0,.93,.3),.025);
 bp(mm,V(0,.35,-.55),V(0,1.02,-.5),.022);bp(mm,V(-.3,1.05,-.52),V(.3,1.05,-.52),.02);
 const seat=new T.Mesh(new T.BoxGeometry(.22,.05,.3),mm);seat.position.set(0,.95,.3);g.add(seat);
 const crate=new T.Mesh(new T.BoxGeometry(.4,.28,.34),new T.MeshLambertMaterial({color:0xf4f4f0}));crate.position.set(0,1.1,.82);g.add(crate);
 [[.26,.07,.02],[.07,.26,.02]].forEach(s=>{const c=new T.Mesh(new T.BoxGeometry(s[0],s[1],s[2]),new T.MeshBasicMaterial({color:0xd62f38}));c.position.set(0,1.1,.995);g.add(c);const c2=c.clone();c2.position.z=.655;g.add(c2)});
 [-.55,.55].forEach(z=>{const w=new T.Group();w.add(new T.Mesh(new T.TorusGeometry(.35,.03,6,24).rotateY(Math.PI/2),mm),new T.Mesh(new T.BoxGeometry(.02,.68,.02),mm),new T.Mesh(new T.BoxGeometry(.02,.02,.68),mm));w.position.set(0,.35,z);g.add(w);wk.push(w)});
 g.userData.wheels=wk;return g}
function placeBike(r){r.rg.position.set(cx(r.z)+r.lane,0,r.z);r.rg.rotation.y=Math.atan(dcx(r.z))}
function pedalRig(rig,ph){relRot(rig.b['leg-left'],LEG_BASE-Math.sin(ph)*LEG_SWING);relRot(rig.b['leg-right'],LEG_BASE-Math.sin(ph+Math.PI)*LEG_SWING)}
function startRescue(){const dog=hurtAnimal,dz=dog.g.position.z,rg=new T.Group();
 if(!REAL.medic){rescue={phase:'fallback',t:0,dog};return}
 const bk2=mkBikeGroup(0x2f7de1);rg.add(bk2);const m=T.SkeletonUtils.clone(REAL.medic.scene);m.scale.setScalar(RS);m.rotation.y=Math.PI;m.position.set(0,RIDE_Y,.33);rg.add(m);
 const rig=makeRig(m,REAL.medic);rigPlay(rig,'drive',.01);rg.userData.wheels=bk2.userData.wheels;S.add(rg);
 rescue={rg,rig,dog,phase:'ride',t:0,z:dz+48,park:dz+2.6,lane:clamp(dog.l||0,-1.5,1.5),ph:0};placeBike(rescue)}
function finishRescue(r){const dp=r.dog.g.position;burst(dp.x,.6,dp.z,10,0xff8aa0,3);fan();SV.helped=(SV.helped||0)+1;money+=25;SV.money=money;svSave();
 say('The rescuer takes the dog to the vet \u2014 thank you for calling for help! +\u00a525');
 S.remove(r.dog.g);const hi=OB.indexOf(r.dog);if(hi>=0)OB.splice(hi,1);hurtAnimal=null;healStage=0;healProg=0}
function updateRescue(dt){const r=rescue;if(!r)return;
 if(r.phase==='fallback'){r.t+=dt;if(r.t>5){finishRescue(r);rescue=null}return}
 const rig=r.rig;rig.mixer.update(dt);if(r.phase!=='ride'&&r.phase!=='leave'){if(rig.walking){rig.wph=(rig.wph||0)+dt*5;bodyPose(rig.b,walkOff(rig.wph,.42))}else if(rig.treating)bodyPose(rig.b,{lean:.4,ar:.95,al:.95})}
 if(r.phase==='ride'||r.phase==='leave'){r.z-=RESC_SPD*dt;r.ph+=RESC_SPD*dt*1.05;placeBike(r);r.rg.userData.wheels.forEach(w=>w.rotation.x-=RESC_SPD*dt/.35);pedalRig(rig,r.ph);
  if(r.phase==='ride'&&r.z<=r.park){r.phase='dismount'}
  if(r.phase==='leave'&&r.z<rider.position.z-90){S.remove(r.rg);rescue=null}return}
 const m=rig.m,dp=r.dog.g.position;
 if(r.phase==='dismount'){const wp=new T.Vector3();m.getWorldPosition(wp);r.rg.remove(m);S.add(m);m.position.set(wp.x,0,wp.z);rigPlay(rig,'idle',.15);rig.walking=true;r.phase='toDog'}
 if(r.phase==='toDog'){const tx=dp.x,tz=dp.z+1.0,dx=tx-m.position.x,dz=tz-m.position.z,dist=Math.hypot(dx,dz);
  if(dist>.12){const st=Math.min(dist,1.7*dt);m.position.x+=dx/dist*st;m.position.z+=dz/dist*st;turnYaw(m,Math.atan2(dx,dz),dt)}else{r.phase='treat';r.t=0;rig.walking=false;rig.treating=true}return}
 if(r.phase==='treat'){r.t+=dt;turnYaw(m,Math.atan2(dp.x-m.position.x,dp.z-m.position.z),dt);if(r.t>4.5){finishRescue(r);r.phase='back';rig.treating=false;rig.walking=true}return}
 if(r.phase==='back'){const bx=r.rg.position.x,bz=r.rg.position.z,dx=bx-m.position.x,dz=bz-m.position.z,dist=Math.hypot(dx,dz);
  if(dist>.3){const st=Math.min(dist,1.7*dt);m.position.x+=dx/dist*st;m.position.z+=dz/dist*st;turnYaw(m,Math.atan2(dx,dz),dt)}
  else{S.remove(m);r.rg.add(m);m.position.set(0,RIDE_Y,.33);m.rotation.y=Math.PI;rig.walking=false;rigPlay(rig,'drive',.1);r.phase='leave'}}}
function mkWalletMesh(){const g=new T.Group(),b=new T.Mesh(new T.BoxGeometry(.24,.05,.15),L(0x6b3f22)),c=new T.Mesh(new T.BoxGeometry(.05,.055,.04),L(0xe0b840,{emissive:0x403000}));c.position.set(0,0,.08);g.add(b,c);return g}
function mkWallet(){return mkWalletMesh()}
const walletHand=mkWalletMesh(),walletBasket=mkWalletMesh();walletHand.visible=walletBasket.visible=false;walletBasket.position.set(0,1.32,-.8);inner.add(walletBasket);
function mkOwner(){if(!REAL.owner)return mkElderPrim();
 const g=new T.Group(),m=T.SkeletonUtils.clone(REAL.owner.scene);m.scale.setScalar(1.65);m.rotation.y=Math.PI;g.add(m);
 const mixer=new T.AnimationMixer(m),acts={};REAL.owner.animations.forEach(c=>{acts[c.name]=mixer.clipAction(c)});
 g.userData={cane:new T.Object3D(),arm:new T.Object3D(),hd:new T.Object3D(),mixer,acts,cur:null,real:true,waveBone:m.getObjectByName('arm-right'),waveAmt:0,waveTarget:0,bones:rigBones(m),walking:false,wph:0,seatY:ELD_Y};npcWaves.push(g.userData);if(npcWaves.length>10)npcWaves.shift();
 npcPlay(g.userData,'idle',.01);catMixers.push(mixer);catObjs.push({neck:[],eatAmt:0,eatTarget:0});if(catMixers.length>10){catMixers.shift();catObjs.shift()}return g}
// ---- prayer times and the mosques along the road ----
let PRY=[{n:'الفجر',h:5,e:6.25,r:2},{n:'الظهر',h:12,e:15.25,r:4},{n:'العصر',h:15.5,e:17.75,r:4},{n:'المغرب',h:18,e:19.25,r:3},{n:'العشاء',h:19.5,e:23.9,r:4}];
let dayType='normal',startWd=2,ramStart=0,dayN=0,lastDay=0,iftarDone=false;
function wdNow(){return(startWd+dayN)%7}
function ramNow(){return dayType==='ramadan'&&(ramStart+dayN)>=1&&(ramStart+dayN)<=30}
function ramDay(){return ramStart+dayN}
function fastingNow(){const hh=hourNow();return ramNow()&&hh>=5&&hh<18}
function buildPRY(){const fri=wdNow()===5,ram=ramNow();PRY=[{n:'الفجر',h:5,e:6.25,r:2},{n:fri?'الجمعة':'الظهر',h:12,e:15.25,r:fri?2:4,j:fri},{n:'العصر',h:15.5,e:17.75,r:4},{n:'المغرب',h:18,e:19.25,r:3},{n:'العشاء',h:19.5,e:ram?20.0:23.9,r:4}];if(ram)PRY.push({n:'التراويح',h:20,e:23.9,r:8,t:true});pCur=-1;pPending=false}
let gmin=17*60+48,pCur=-1,pPending=false,pDone=false,prayStage=0,prayT=0,prayGoal=null,prayK=3,prayMo=null,pPact=false,mBeam=null;
const mosqueList=[];
function hourNow(){return(gmin/60)%24}
function fmtT(h){const m=Math.floor(h*60+1e-6)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function beamG(){const g=new T.Group(),s=new T.Sprite(new T.SpriteMaterial({map:glowT,fog:false,depthWrite:false,blending:T.AdditiveBlending,opacity:.9,color:0x7affc8}));s.position.y=10;s.scale.set(24,24,1);g.add(new T.Mesh(new T.CylinderGeometry(.5,.5,60,8).translate(0,30,0),new T.MeshBasicMaterial({color:0x7affc8,transparent:true,opacity:.5,depthWrite:false})),s);return g}
function mkMosque(){const g=new T.Group(),W=L(0xf3efe6),G=L(0x2f8f78,{emissive:0x0a2a22}),Y=L(0xd9b45a,{emissive:0x4a3800}),D=L(0x3a2a1c,{side:T.DoubleSide}),ST=L(0xb9b2a4),WIN=new T.MeshBasicMaterial({color:0xffd98a});
 const add=(m,x,y,z)=>{m.position.set(x,y,z);g.add(m);return m};
 add(new T.Mesh(new T.BoxGeometry(11,.4,9.4),ST),0,.2,0);
 add(new T.Mesh(new T.BoxGeometry(8,5,7),W),0,2.9,0);
 add(new T.Mesh(new T.CylinderGeometry(2.8,2.8,.9,20),W),0,5.85,0);
 add(new T.Mesh(new T.SphereGeometry(3,20,12,0,Math.PI*2,0,Math.PI/2),G),0,6.3,0);
 add(new T.Mesh(new T.CylinderGeometry(.06,.06,1.3,6),Y),0,9.5,0);
 add(new T.Mesh(new T.TorusGeometry(.5,.09,6,16),Y),0,10.2,0);
 [-1,1].forEach(sx=>{const x=sx*5.1,zz=-3.2;
  add(new T.Mesh(new T.CylinderGeometry(.75,.85,10,14),W),x,5.2,zz);
  add(new T.Mesh(new T.CylinderGeometry(1.15,1.0,.35,14),Y),x,8.9,zz);
  add(new T.Mesh(new T.CylinderGeometry(.6,.7,2.2,14),W),x,10.2,zz);
  add(new T.Mesh(new T.ConeGeometry(.85,2.3,14),G),x,12.5,zz);
  add(new T.Mesh(new T.TorusGeometry(.28,.06,6,12),Y),x,14.0,zz);
  [0,1].forEach(k=>add(new T.Mesh(new T.BoxGeometry(.5,.9,.1),WIN),x,4.6+k*2.0,zz-.78))});
 add(new T.Mesh(new T.BoxGeometry(1.9,3.0,.2),D),0,1.9,-3.58);
 const ar=new T.Mesh(new T.CircleGeometry(.95,16,0,Math.PI),D);ar.rotation.y=Math.PI;add(ar,0,3.4,-3.7);
 add(new T.Mesh(new T.BoxGeometry(3.4,.25,1.6),ST),0,.45,-4.4);
 add(new T.Mesh(new T.BoxGeometry(3.2,.06,3.6),L(0xcfc8b8)),0,.04,-7.0);
 [-2.8,-1.4,1.4,2.8].forEach(x=>add(new T.Mesh(new T.BoxGeometry(.8,1.7,.12),WIN),x,3.0,-3.56));
 const gl=new T.Sprite(glowM);gl.position.set(0,2.6,-4.8);gl.scale.set(12,7,1);g.add(gl);return g}
const chainM=L(0x9aa0aa,{emissive:0x222428}),padM=L(0xe0b840,{emissive:0x403000});
const lockChain=new T.Group();{const r1=new T.Mesh(new T.TorusGeometry(.4,.022,6,32).rotateY(Math.PI/2),chainM);r1.position.set(0,.35,.55);const r2=r1.clone();r2.scale.setScalar(.84);const pl=new T.Mesh(new T.BoxGeometry(.09,.11,.05),padM);pl.position.set(.02,.76,.55);lockChain.add(r1,r2,pl);lockChain.visible=false;inner.add(lockChain)}
function nextMosque(){let best=null;for(const m of mosqueList)if(m.sd>s-14&&(!best||m.sd<best.sd))best=m;return best}
const mapC=$('map'),mc=mapC.getContext('2d');let mapT=0;
function drawMap(px,z,dt){mapT+=dt;if(mapT<.06)return;mapT=0;const W=190,H=190,k=.8,ox=W/2,oy=H-40,c=mc;
 c.clearRect(0,0,W,H);c.save();c.beginPath();c.arc(W/2,H/2,W/2-2,0,Math.PI*2);c.clip();c.fillStyle='rgba(18,26,22,.62)';c.fillRect(0,0,W,H);
 c.strokeStyle='rgba(230,215,175,.9)';c.lineWidth=6;c.lineJoin='round';c.beginPath();
 for(let d=-34,f=1;d<=135;d+=5,f=0){const zz=z-d,X=ox+(cx(zz)-px)*k,Y=oy-d*k;f?c.moveTo(X,Y):c.lineTo(X,Y)}c.stroke();
 const pulse=.5+.5*Math.sin(Date.now()/250),due=pPending&&!pDone;
 for(const m of mosqueList){const d=z-m.z,X=ox+(m.x-px)*k,Y=oy-d*k;if(d<-34||d>150)continue;c.fillStyle=due?'rgba(120,255,200,'+(.6+.4*pulse)+')':'rgba(90,200,160,.85)';c.beginPath();c.arc(X,Y,due?9:7,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(X,Y+1,3.2,Math.PI,0);c.fill();c.fillRect(X-3.2,Y+1,6.4,3)}
 if(tg&&tg.g){const p=tg.g.position,d=z-p.z,X=ox+(p.x-px)*k,Y=oy-d*k;if(d>-34&&d<150){c.fillStyle='#ffd05a';c.beginPath();c.arc(X,Y,5,0,7);c.fill()}}
 c.fillStyle='#fff';c.beginPath();c.moveTo(ox,oy-9);c.lineTo(ox-6,oy+7);c.lineTo(ox+6,oy+7);c.closePath();c.fill();c.restore();
 const mo=nextMosque();if(due&&mo&&mo.sd-s>140){c.fillStyle='rgba(120,255,200,'+(.7+.3*pulse)+')';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText('🕌 ↑ '+Math.round(mo.sd-s)+' m',W/2,16)}}
function updatePrayer(dt,px,z){
 gmin+=dt*(window.__ts||.4);{const dN=Math.floor(gmin/1440);if(dN!==lastDay&&prayStage===0){lastDay=dN;dayN=dN;iftarDone=false;buildPRY()}}const h=hourNow();
 {const cb=$('clkB');cb.textContent=ramNow()?('🌙 رمضان '+ramDay()+(fastingNow()?' · صائم':'')):(wdNow()===5?'🕌 جمعة مباركة':'');cb.style.display=cb.textContent?'block':'none'}
 let k=-1;for(let i=0;i<PRY.length;i++)if(h>=PRY[i].h&&h<PRY[i].e)k=i;
 if(k!==pCur){
  if(pCur>=0&&pPending&&!pDone&&prayStage===0)say('فاتتك صلاة '+PRY[pCur].n+' في وقتها — حافظ على الصلاة في وقتها إن شاء الله');
  pCur=k;pPending=k>=0;pDone=false;
  if(k>=0)say('حان وقت صلاة '+PRY[k].n+' 🕌 اتبع الخريطة إلى أقرب مسجد')}
 const due=pPending&&!pDone,nxt=(()=>{for(let i=0;i<PRY.length;i++)if(PRY[i].h>h)return PRY[i];return PRY[0]})(),mo=nextMosque(),dm=mo?mo.sd-s:1e9;
 $('clk').classList.toggle('due',due);setH($('clkT'),fmtT(h));
 setH($('clkP'),due?('🕌 حان وقت '+PRY[pCur].n+(mo?' — المسجد على بعد '+Math.max(0,Math.round(dm))+' م':' — ابحث عن مسجد')):('الصلاة القادمة: '+nxt.n+' '+fmtT(nxt.h)));
 if(!mBeam){mBeam=beamG();S.add(mBeam)}
 if(mo){mBeam.position.set(mo.x,0,mo.z);const f=clamp(Math.abs(dm)/30,.04,1);mBeam.children[0].material.opacity=.5*f;mBeam.children[1].material.opacity=.9*f;mBeam.visible=due||prayStage>0}else mBeam.visible=false;
 if(prayStage===0&&due&&!lockRide()&&mo&&Math.abs(dm)<9&&v<.8){$a.style.display='block';$a.textContent='Press E: lock your bike and go to pray — '+PRY[pCur].n;if(K.KeyE&&!pPact){prayStage=1;prayT=0;prayK=pCur;prayMo=mo;say('تقفل دراجتك بالجنزير...')}}
 pPact=!!K.KeyE;
 if(prayStage===1){prayT+=dt;lockChain.visible=prayT>.7;if(prayT>1.7){prayStage=2;prayT=0;say('تتوضأ وتتوجه إلى المسجد...')}}
 else if(prayStage===2&&prayMo){prayGoal=inner.worldToLocal(prayMo.door.clone());const R_=realRider;
  if(!R_)prayStage=3;else if(Math.hypot(R_.m.position.x-prayGoal.x,R_.m.position.z-prayGoal.z)<.45){prayStage=3;prayT=0;R_.m.visible=false;$('pray').style.display='flex'}}
 else if(prayStage===3){prayT+=dt;const P=PRY[prayK],dur=P.r*2.4,f=clamp(prayT/dur,0,1);if(P.j&&f<.4){setH($('prT'),'خطبة الجمعة');setH($('prR'),'استماعٌ وإنصات')}else{setH($('prT'),(P.t?'':'الصلاة · ')+P.n);const f2=P.j?(f-.4)/.6:f;setH($('prR'),'الركعة '+Math.min(P.r,1+Math.floor(Math.max(0,f2)*P.r))+' / '+P.r)}$('prB').style.width=(f*100)+'%';
  if(prayT>=dur){prayStage=4;prayGoal=null;$('pray').style.display='none';if(realRider)realRider.m.visible=true}}
 else if(prayStage===4){const R_=realRider;if(!R_||Math.hypot(R_.m.position.x-R_.side*.95,R_.m.position.z-.15)<.08){prayStage=5;prayT=0;say('تفك الجنزير من الدراجة...')}}
 else if(prayStage===5){prayT+=dt;if(prayT>.5)lockChain.visible=false;if(prayT>1.4){prayStage=0;pDone=true;{const rw=PRY[prayK].j?150:PRY[prayK].t?120:100;money+=rw;SV.money=money;SV.prayers++;svSave();fan();say('تقبّل الله منا ومنك   \u2066+¥'+rw+'\u2069')}}}
 updateLights();updateCalls(dt);goalsUpdate();drawMap(px,z,dt)}
// ---- work, family and money ----
let jobStage=0,jobT=0,jobHas=false,jobLeft=0,callT=420+Math.random()*180,callOpen=false,famStage=0,famNeed='groceries',mom=null,callCount=0;
const parcelM=L(0xc8a060),tapeM=L(0xe9dcb8);
function mkParcelMesh(){const g=new T.Group(),b=new T.Mesh(new T.BoxGeometry(.36,.24,.28),parcelM),t=new T.Mesh(new T.BoxGeometry(.06,.25,.29),tapeM);g.add(b,t);return g}
const parcelHand=mkParcelMesh(),parcelBasket=mkParcelMesh();parcelHand.visible=parcelBasket.visible=false;parcelBasket.position.set(0,1.46,-.8);inner.add(parcelBasket);
function fmtMS(sec){sec=Math.max(0,Math.round(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}
function taskStand(){return jobStage===1||jobStage===3||famStage>=1}
const CALLS=[{t:'يا حبيبي، أختك سلمى عندها حرارة — تعال بسرعة!',en:'Your sister has a fever. Come home!',need:'medicine'},{t:'يا بني، نفد الخبز والخضار من البيت. هل تستطيع العودة؟',en:'We ran out of bread and vegetables.',need:'groceries'},{t:'مصروف أخيك للمدرسة انتهى، تعال نتفاهم يا بني.',en:"Your brother's school money ran out.",need:'school'},{t:'جدّك يسأل عنك ويريد أن يراك قبل المغرب.',en:'Grandpa is asking for you.',need:'visit'}];
let curCall=null;
function canCall(){return started&&!menuOpen&&!callOpen&&prayStage===0&&!lockRide()&&!rescue&&!elderOut&&mi!==2&&jobStage!==3&&famStage===0}
function openCall(sc){curCall=sc||pickCall();callCount++;callOpen=true;menuOpen=true;menuMode='call';
 $menu.innerHTML='<div><span style="direction:rtl;font-size:20px;line-height:1.7">📞 أمي تتصل<br>«'+curCall.t+'»<br><small style="opacity:.75;direction:ltr;display:block">'+curCall.en+'</small></span><button data-i="0">أنا قادم الآن يا أمي</button><button data-i="1">سأُنهي ما بيدي ثم آتي</button></div>';$menu.style.display='flex'}
function fastChoice(i){if(i===0){closeMenu();SV.fastKept++;svSave();say('صبرًا جميلًا — Patience. Iftar is soon.');clr();mi=pickNext();spawn()}else{SV.fastBroken++;svSave();menuMode='shop';$menu.innerHTML=shopMenuHTML;[...$menu.querySelectorAll('button')].forEach((b,j)=>b.disabled=money<COST[j]);say('You broke your fast. Remember your intention tomorrow.')}}
function openPM(){if(menuOpen||!started)return;menuOpen=true;menuMode='pm';$menu.innerHTML=walkMode?'<div class="walk-dialog" dir="rtl"><span>☰ القائمة</span><button data-i="0">▶ استئناف اللعب</button><button data-i="1">🗺 تغيير المرحلة أو الطريق</button><button data-i="2">🔊 تشغيل الصوت أو كتمه</button><button data-i="3">⏩ الانتقال إلى وقت الصلاة التالي</button></div>':'<div><span style="font-size:22px">☰ Menu</span><button data-i="0">▶ Resume</button><button data-i="1">🗺 Change route or stage</button><button data-i="2">🔊 Sound on/off</button><button data-i="3">⏩ Skip ahead to the next prayer time</button></div>';$menu.style.display='flex'}
function pmChoice(i){if(i===1){location.reload();return}closeMenu();if(i===2)toggleMute();if(i===3){skipToPrayer();say(walkMode?'تم تقديم الوقت إلى موعد الصلاة التالي.':'Time moves ahead to the next prayer...')}}
$('bk').addEventListener('pointerdown',e=>{e.stopPropagation();if(walkMode)$('bk').textContent='☰ القائمة';openPM()});
function closeMenu(){menuOpen=false;$menu.style.display='none';$menu.innerHTML=shopMenuHTML;menuMode='shop'}
function callChoice(i){closeMenu();callOpen=false;
 if(i===0&&curCall.need==='schoolrun'){passKind='kid';SV.obeyed++;svSave();if(tg&&tg.g&&mi!==2)S.remove(tg.g);clr();mi=1;spawn();say('Pick up your brother — follow the map.')}
 else if(i===0){famNeed=curCall.need;SV.obeyed++;svSave();if(tg&&tg.g&&mi!==2)S.remove(tg.g);clr();mi=9;spawn();say('You are going home — follow the map. Mom is waiting.')}
 else{SV.postponed++;svSave();callT=480+Math.random()*240;say('حسنًا يا بني، لا تتأخر — Mom: "Do not be late, my son."')}}
const FAMI=[{t:'🥤 Break your fast: dates and water',c:0,k:'iftars',m:'ذهب الظمأ وابتلّت العروق وثبت الأجر إن شاء الله'},{t:'🍲 Take a plate of food to the neighbor',c:40,k:'charity',m:'Feeding a fasting person is rewarded. جزاك الله خيرًا'},{t:'🤲 Give sadaqah to the poor',c:50,k:'charity',m:'Charity never decreases wealth. تقبّل الله منك.'},{t:'Not now',c:0,k:null,m:'Mom: Come and eat with us when you can.'}];
const FAM=[{t:'🍞 Bread & vegetables for the family',c:150,k:'famSpent',m:'بارك الله فيك يا بني — the family eats well tonight.'},{t:'💊 Medicine for your sister',c:120,k:'famSpent',m:'May Allah heal her. You thought of your family first.'},{t:'🎒 School supplies for your brother',c:100,k:'famSpent',m:'Knowledge is a gift — jazak Allahu khayran.'},{t:'🤲 Give sadaqah to a poor neighbor',c:50,k:'charity',m:'Charity never decreases wealth. تقبّل الله منك.'},{t:'🏦 Put ¥100 in the piggy bank',c:100,k:'saved',m:'Saving a little for hard days is wise.'},{t:'🍬 Treat yourself to a sweet',c:60,k:'treats',m:'Mom smiles: enjoy it — moderation is a virtue.'},{t:'Not now',c:0,k:null,m:'Mom: Take care, and come back soon.'}];
function openFam(){famStage=2;menuOpen=true;menuMode='fam';const need={medicine:'Your sister needs medicine.',groceries:'We need food for dinner.',school:"Your brother needs school money.",visit:'Grandpa wants to see you — and we need a few things.',iftar:'It is time to break the fast together.'}[famNeed];
 const LST=famNeed==='iftar'?FAMI:FAM;$menu.innerHTML='<div><span style="direction:rtl;font-size:19px">'+(famNeed==='iftar'?'أمك: «تعال يا بني، حان وقت الإفطار»':'أمك: «يا بني، نحتاج إلى بعض الأشياء»')+'<br><small style="direction:ltr;display:block;opacity:.8">'+need+' You have ¥'+money+'. Needs first — then charity, savings, and a little for you.</small></span>'+LST.map((f,i)=>'<button data-i="'+i+'"'+(f.c>money?' style="opacity:.4"':'')+'>'+f.t+(f.c?' — ¥'+f.c:'')+'</button>').join('')+'</div>';$menu.style.display='flex'}
function famChoice(i){const f=(famNeed==='iftar'?FAMI:FAM)[i];if(f.c>money)return;closeMenu();money-=f.c;if(f.k){SV[f.k]+=(f.k==='famSpent'||f.k==='charity'||f.k==='saved')?f.c:1}SV.money=money;svSave();if(f.c){fan();coin()}say(f.m);
 famStage=0;if(mom){mom.userData.waveTarget=1;mom.userData.waveFar=true;mom.userData.grp=mom}clr();wait=5;callT=540+Math.random()*240}
function homeStand(){return mom?{p:mom.localToWorld(new T.Vector3(0,0,-1.1)),face:mom.position.clone()}:null}
function updateCalls(dt){if(ramNow()&&!iftarDone){const hh=hourNow();if(hh>=17.4&&hh<18&&canCall()){iftarDone=true;openCall({t:'الإفطار جاهز يا بني — لا تتأخر!',en:'Iftar is ready. Come home and break your fast with us.',need:'iftar'})}}
 if(canCall()){callT-=dt;if(callT<=0)openCall()}
 if(realRider){const rm=realRider.mode;parcelHand.visible=jobHas&&rm!=='ride';parcelBasket.visible=jobHas&&rm==='ride'}}

// ---- the little brother and the school ----
let passKind='elder';const KS=1.3;
function mkKid(){if(!REAL.kid)return mkElder();
 const g=new T.Group(),m=T.SkeletonUtils.clone(REAL.kid.scene);m.scale.setScalar(KS);m.rotation.y=Math.PI;g.add(m);
 const mixer=new T.AnimationMixer(m),acts={};REAL.kid.animations.forEach(c=>{acts[c.name]=mixer.clipAction(c)});
 g.userData={cane:new T.Object3D(),arm:new T.Object3D(),hd:new T.Object3D(),mixer,acts,cur:null,real:true,waveBone:m.getObjectByName('arm-right'),waveAmt:0,waveTarget:0,bones:rigBones(m),walking:false,wph:0,seatY:.9-.169*KS};npcWaves.push(g.userData);if(npcWaves.length>10)npcWaves.shift();
 npcPlay(g.userData,'idle',.01);catMixers.push(mixer);catObjs.push({neck:[],eatAmt:0,eatTarget:0});if(catMixers.length>10){catMixers.shift();catObjs.shift()}return g}
function mkSchool(z,sg){
 if(biomeAt(z)===6){const d=mkDoor(sg,z);d.updateMatrixWorld(true);d.userData.gate=d.localToWorld(new T.Vector3(0,0,-2.4));return d}
 const g=new T.Group(),W=L(0xf0e6c8),RF=L(0xb5473a),GR=L(0x2f8f5a),FN=L(0xe9e5d8),WN=new T.MeshBasicMaterial({color:0xffd98a});
 const add=(m,x,y,zz)=>{m.position.set(x,y,zz);g.add(m);return m};
 add(new T.Mesh(new T.BoxGeometry(15,6,8),W),0,3,0);add(new T.Mesh(new T.BoxGeometry(15.8,.5,8.8),RF),0,6.25,0);
 add(new T.Mesh(new T.BoxGeometry(4.2,4.4,2.2),W),0,2.2,-4.9);add(new T.Mesh(new T.BoxGeometry(4.6,.4,2.6),RF),0,4.6,-4.9);
 add(new T.Mesh(new T.BoxGeometry(1.8,2.8,.2),L(0x4a3224)),0,1.4,-6.05);
 [-5.3,-3.4,3.4,5.3].forEach(x=>[1.6,4.2].forEach(y=>add(new T.Mesh(new T.BoxGeometry(1.1,1.3,.12),WN),x,y,-4.06)));
 add(new T.Mesh(new T.CylinderGeometry(.07,.07,6,6),FN),6.5,9,0);add(new T.Mesh(new T.BoxGeometry(2,1.1,.06),GR),7.5,11.5,0);
 const sign=new T.Mesh(new T.PlaneGeometry(4.2,1.05),new T.MeshBasicMaterial({map:cv(256,64,q=>{q.fillStyle='#2f8f5a';q.fillRect(0,0,256,64);q.fillStyle='#fff';q.font='bold 40px sans-serif';q.textAlign='center';q.textBaseline='middle';q.fillText('المدرسة',128,34)})}));sign.rotation.y=Math.PI;add(sign,0,5.4,-6.04);
 for(let k=-3;k<=3;k++)if(Math.abs(k)>0)add(new T.Mesh(new T.BoxGeometry(.12,1.0,.12),FN),k*1.9,.5,-8.2);
 add(new T.Mesh(new T.BoxGeometry(3.2,.06,5),L(0xcfc8b8)),0,.04,-8.6);
 g.position.set(cx(z)+sg*14.5,0,z);g.rotation.y=sg*Math.PI/2+Math.atan(dcx(z));S.add(g);g.updateMatrixWorld(true);g.userData.gate=g.localToWorld(new T.Vector3(0,0,-9.0));return g}
const QZ=[{q:'ماذا نقول قبل الأكل؟',o:['بسم الله','لا نقول شيئًا','الحمد لله فقط'],a:0},{q:'من أحق الناس بحسن صحبتي؟',o:['صديقي','أمي ثم أمي ثم أمي ثم أبي','جاري'],a:1},{q:'وجدنا محفظة ضائعة، ماذا نفعل؟',o:['نأخذ المال','نبحث عن صاحبها ونعيدها','نتركها'],a:1},{q:'ماذا نقول إذا عطسنا؟',o:['الحمد لله','لا شيء','نضحك'],a:0},{q:'بأي يد نأكل؟',o:['اليسرى','اليمنى','أي يد'],a:1},{q:'كيف نلقي التحية؟',o:['السلام عليكم','نصمت','نشير فقط'],a:0}];
let curQ=null;
function openQuiz(){curQ=QZ[(Math.random()*QZ.length)|0];menuOpen=true;menuMode='quiz';$menu.innerHTML='<div><span style="direction:rtl;font-size:20px;line-height:1.7">أخوك الصغير: «يا أخي، سألني المعلم:<br>'+curQ.q+'»<br><small style="direction:ltr;display:block;opacity:.8">Your little brother asks you to help with the teacher\'s question.</small></span>'+curQ.o.map((t,i)=>'<button data-i="'+i+'" style="direction:rtl">'+t+'</button>').join('')+'</div>';$menu.style.display='flex'}
function quizChoice(i){closeMenu();if(i===curQ.a){money+=50;SV.money=money;SV.knowledge++;svSave();fan();coin();say('أحسنت! الجواب الصحيح   \u2066+¥50\u2069')}else say('ليس تمامًا — الصحيح: «'+curQ.o[curQ.a]+'». لا بأس، نتعلّم معًا')}
const SCHOOLCALL={t:'أخوك تأخّر عن المدرسة — هل توصله يا بني؟',en:'Your little brother is late for school. Can you take him?',need:'schoolrun'};
function pickCall(){const hh=hourNow();return(hh>=6.3&&hh<8.8&&Math.random()<.6)?SCHOOLCALL:CALLS[(Math.random()*CALLS.length)|0]}
// ===== WALK MODE: the Alley (الحارة) — on foot =====
let walkMode=false,WK=null;
function disableTownTerrainWarp(mat){if(!mat||mat.userData.walkTownFlat)return mat;const original=mat.onBeforeCompile,oldKey=mat.customProgramCacheKey;mat.onBeforeCompile=function(shader,renderer){if(original)original.call(this,shader,renderer);shader.vertexShader=shader.vertexShader.replace(/\{float hwz=\(modelMatrix\*vec4\(transformed,1\.0\)\)\.z;mvPosition\.xyz\+=\(viewMatrix\*vec4\(0\.0,hillH\(hwz\),0\.0,0\.0\)\)\.xyz;\}\s*/,'')};mat.customProgramCacheKey=function(){return (oldKey?oldKey.call(this):'')+'|town-flat-v1'};mat.userData.walkTownFlat=true;mat.needsUpdate=true;return mat}
function flattenTownObject(root){root.traverse(o=>{if(!o.isMesh||!o.material)return;o.material=Array.isArray(o.material)?o.material.map(disableTownTerrainWarp):disableTownTerrainWarp(o.material)})}
const WZ=-2735,LN=[-72,-36,0,36,72],NZ=LN.map(v=>v+WZ),Zl=v=>v+WZ;
function mkRng(sd){return()=>{sd=(sd*16807)%2147483647;return sd/2147483647}}
let facM=null;
function facMats(){if(facM)return facM;
 const bases=['#c9a77d','#c78c79','#b8b4a1','#8eafbf','#bd8c9b','#b99b70','#a6be9b'];
 facM=bases.map((base,n)=>{const t=cv(256,512,q=>{
  const bg=q.createLinearGradient(0,0,0,512);bg.addColorStop(0,base);bg.addColorStop(1,n%2?'#b98d79':'#d9c8ad');q.fillStyle=bg;q.fillRect(0,0,256,512);
  for(let y=0;y<4;y++){const wy=28+y*104;for(let x=0;x<3;x++){const wx=21+x*80,lit=((x*7+y*11+n*5)%6===0);
    q.fillStyle='rgba(29,25,26,.65)';q.fillRect(wx-5,wy-5,37,58);q.fillStyle='#eee0c5';q.fillRect(wx-2,wy-2,31,52);
    const glass=q.createLinearGradient(wx,wy,wx+26,wy+48);glass.addColorStop(0,lit?'#f3c67d':'#64889b');glass.addColorStop(.55,lit?'#c68c52':'#344f60');glass.addColorStop(1,lit?'#8d603d':'#263b4a');
    q.fillStyle=glass;q.fillRect(wx,wy,26,48);q.fillStyle='rgba(255,255,255,.5)';q.fillRect(wx+3,wy+3,3,42);q.fillStyle='#efe0c8';q.fillRect(wx+12,wy,2,48);q.fillRect(wx,wy+22,26,3);
    q.fillStyle='rgba(75,49,37,.55)';q.fillRect(wx-7,wy+49,35,5);if((x+y+n)%3===0){q.fillStyle='rgba(81,55,38,.75)';q.fillRect(wx-8,wy-7,5,62);q.fillRect(wx+31,wy-7,5,62)}
   }q.fillStyle='rgba(70,49,37,.42)';q.fillRect(0,wy+68,256,5);q.fillStyle='rgba(255,245,224,.28)';q.fillRect(0,wy+70,256,2)}
  q.fillStyle='#554236';q.fillRect(95,414,66,98);q.fillStyle='#dbc9a9';q.fillRect(100,419,56,93);q.fillStyle='#5a7b83';q.fillRect(106,425,44,45);q.fillStyle='rgba(255,255,255,.45)';q.fillRect(110,429,5,36);q.fillStyle='#b89b70';q.fillRect(106,476,44,36);q.fillStyle='#513829';q.fillRect(139,491,4,4);
  q.fillStyle='rgba(70,45,35,.2)';for(let i=0;i<1800;i++){const x=(i*37+n*19)%256,y=(i*97+n*29)%512;q.fillRect(x,y,1+(i%3),1)}
  q.fillStyle='#eee0c7';q.fillRect(0,4,256,10);q.fillStyle='rgba(68,47,36,.3)';q.fillRect(0,500,256,12);
 });t.encoding=T.sRGBEncoding;t.needsUpdate=true;t.anisotropy=Math.min(8,R.capabilities.getMaxAnisotropy());return L(0xffffff,{map:t})});return facM}
const palmT=L(0x8a6a3e),palmL=L(0x3f8a45),binM=L(0x2f6b3a),bagM=[L(0xc8352f),L(0x2f7fd6)];
function doorProp(){const g=new T.Group(),dm=L(0x5a3a22),aw=L(0xc8352f),wh=L(0xf1ede2),WN=new T.MeshBasicMaterial({color:0xffd98a});
 const add=(m,x,y,zz)=>{m.position.set(x,y,zz);g.add(m);return m};
 add(new T.Mesh(new T.BoxGeometry(1.7,2.7,.25),dm),0,1.35,0);const awn=add(new T.Mesh(new T.BoxGeometry(3.6,.12,1.6),aw),0,2.95,-.75);awn.rotation.x=.18;
 add(new T.Mesh(new T.BoxGeometry(3.6,.5,.1),wh),0,2.6,-1.45);add(new T.Mesh(new T.BoxGeometry(.9,1.0,.08),WN),-2.2,1.6,-.05);add(new T.Mesh(new T.BoxGeometry(.9,1.0,.08),WN),2.2,1.6,-.05);return g}
function stallProp(col,goods){const g=new T.Group(),wd=L(0x8a5a36),aw=L(col),gd=goods.map(c=>L(c)),add=(m,x,y,z)=>{m.position.set(x,y,z);g.add(m);return m};
 add(new T.Mesh(new T.BoxGeometry(2.4,.9,.95),wd),0,.45,0);for(let i=0;i<5;i++)add(new T.Mesh(new T.BoxGeometry(.38,.22,.38),gd[i%gd.length]),-.95+i*.47,1.02,0);
 [-1.1,1.1].forEach(x=>add(new T.Mesh(new T.CylinderGeometry(.05,.05,2.4,6),wd),x,1.2,.4));const awn=add(new T.Mesh(new T.BoxGeometry(2.9,.1,1.7),aw),0,2.4,.1);awn.rotation.x=-.12;return g}
function benchAt(g,x,z,ry){const o=new T.Group(),seat=new T.Mesh(new T.BoxGeometry(1.5,.08,.5),benchWood),back=new T.Mesh(new T.BoxGeometry(1.5,.5,.06),benchWood);seat.position.y=.46;back.position.set(0,.74,.22);o.add(seat,back);
 [-.65,.65].forEach(px=>{const l=new T.Mesh(new T.BoxGeometry(.06,.46,.46),benchMetal);l.position.set(px,.23,0);o.add(l)});o.position.set(x,0,z);o.rotation.y=ry;g.add(o)}
function palm(g,x,z,hh){const t=new T.Mesh(new T.CylinderGeometry(.18,.3,hh,7),palmT);t.position.set(x,hh/2,z);g.add(t);for(let i=0;i<7;i++){const a=i/7*Math.PI*2,l=new T.Mesh(new T.BoxGeometry(.35,.06,2.8),palmL);l.position.set(x+Math.sin(a)*1.1,hh+.1,z+Math.cos(a)*1.1);l.rotation.y=a;l.rotation.x=-.5;g.add(l)}}
function buildAlley(){const g=new T.Group(),rects=[],rnd=mkRng(4242),fm=facMats(),stalls=[],awC=[0xc8352f,0x2f7fd6,0xf2c230,0x2f9a5a,0xe07a2f];const awningMats=awC.map(c=>L(c)),awningLight=L(0xf2e5ce);
 const stoneT=cv(256,256,q=>{q.fillStyle='#77736d';q.fillRect(0,0,256,256);for(let r=0;r<16;r++)for(let c=0;c<9;c++){const sh=104+((r*13+c*7)%25);q.fillStyle='rgb('+sh+','+(sh-3)+','+(sh-8)+')';q.fillRect(c*32-(r%2?16:0)+1,r*16+1,30,14)}});stoneT.encoding=T.sRGBEncoding;stoneT.needsUpdate=true;stoneT.wrapS=stoneT.wrapT=T.RepeatWrapping;stoneT.repeat.set(32,32);
 const gp=new T.Mesh(new T.PlaneGeometry(210,210,1,8).rotateX(-Math.PI/2),L(0xffffff,{map:stoneT}));gp.position.set(0,.03,WZ);g.add(gp);
 const asT=cv(256,512,q=>{const gr=q.createLinearGradient(0,0,256,512);gr.addColorStop(0,'#34353a');gr.addColorStop(.5,'#2a2b2f');gr.addColorStop(1,'#38393e');q.fillStyle=gr;q.fillRect(0,0,256,512);
  for(let i=0;i<14500;i++){const x=(i*73+Math.floor(i/17)*19)%256,y=(i*151+Math.floor(i/23)*31)%512,v=(i%5===0)?'#45464b':(i%3===0?'#202126':'#303136');q.fillStyle=v;q.globalAlpha=.22+(i%4)*.09;q.fillRect(x,y,1+(i%3),1+(i%2))}
  q.globalAlpha=1;for(let p=0;p<10;p++){const x=(p*67+23)%256,y=(p*113+37)%512;q.fillStyle='rgba(12,12,14,.17)';q.fillRect(x,y,18+p%5,12+p%4);q.fillStyle='rgba(110,110,110,.08)';q.fillRect(x+2,y+2,10,1)}
  q.strokeStyle='rgba(12,12,14,.5)';q.lineWidth=1;for(let c=0;c<9;c++){let x=(c*29+13)%256,y=(c*53+22)%512;q.beginPath();q.moveTo(x,y);for(let k=0;k<5;k++){x+=(c%2?1:-1)*(2+(k%3));y+=3+k%2;q.lineTo(x,y)}q.stroke()}
 });asT.encoding=T.sRGBEncoding;asT.needsUpdate=true;asT.wrapS=asT.wrapT=T.RepeatWrapping;asT.repeat.set(1,19);asT.anisotropy=Math.min(8,R.capabilities.getMaxAnisotropy());
 const asM=L(0xffffff,{map:asT}),SWM=L(0xcfc6b2),CURB=L(0xb9b5aa),jointM=L(0x918879),zebM=new T.MeshBasicMaterial({color:0xf4f1e8}),laneWhite=new T.MeshBasicMaterial({color:0xded8c9}),laneGold=new T.MeshBasicMaterial({color:0xe0bf74}),carCols=[0xc0392b,0x2980b9,0xecf0f1,0x27ae60,0xf1c40f,0x7f8c8d],tireM=L(0x1e1e22),cabM=L(0x9fc4d8);
 const signNames=['مخبز','صيدلية','بقالة','حلويات','مكتبة','عطارة'],signM=signNames.map((nm,k)=>new T.MeshBasicMaterial({map:cv(256,56,q=>{q.fillStyle=['#8a2b22','#1f5f8a','#2c7a45','#a0428a','#6b4a2a','#2c6b6b'][k];q.fillRect(0,0,256,56);q.fillStyle='#fff';q.strokeStyle='#e9c46a';q.lineWidth=3;q.strokeRect(4,4,248,48);q.font='bold 36px sans-serif';q.textAlign='center';q.textBaseline='middle';q.fillText(nm,128,30)})}));signM.forEach(m=>{if(m.map){m.map.encoding=T.sRGBEncoding;m.map.needsUpdate=true}});
 for(let a=0;a<5;a++){const ns=new T.Mesh(new T.PlaneGeometry(8,156,1,6).rotateX(-Math.PI/2),asM);ns.position.set(LN[a],.04,WZ);g.add(ns);const ew=new T.Mesh(new T.PlaneGeometry(8,156,1,6).rotateX(-Math.PI/2).rotateY(Math.PI/2),asM);ew.position.set(0,.045,NZ[a]);g.add(ew)}
 // On-foot road markings: lane edges, broken centre lines and zebra crossings at the inner junctions.
 for(let a=0;a<5;a++){
  for(const side of[-1,1]){const edge=new T.Mesh(new T.BoxGeometry(.08,.025,151),laneWhite);edge.position.set(LN[a]+side*3.55,.055,WZ);g.add(edge)}
  for(let z=WZ-72;z<WZ+72;z+=10){const dash=new T.Mesh(new T.BoxGeometry(.095,.028,3.7),laneGold);dash.position.set(LN[a],.058,z+1.4);g.add(dash)}
  for(const side of[-1,1]){const edge=new T.Mesh(new T.BoxGeometry(151,.025,.08),laneWhite);edge.position.set(0,.055,NZ[a]+side*3.55);g.add(edge)}
  for(let x=-72;x<72;x+=10){const dash=new T.Mesh(new T.BoxGeometry(3.7,.028,.095),laneGold);dash.position.set(x+1.4,.058,NZ[a]);g.add(dash)}
 }
 for(let a=1;a<4;a++)for(let b=1;b<4;b++)for(const side of[-1,1])for(let k=-2;k<=2;k++){
  const v=new T.Mesh(new T.BoxGeometry(6.9,.035,.34),zebM);v.position.set(LN[a],.063,NZ[b]+side*(5.1+k*.5));g.add(v);
  const h=new T.Mesh(new T.BoxGeometry(.34,.035,6.9),zebM);h.position.set(LN[a]+side*(5.1+k*.5),.064,NZ[b]);g.add(h)
 }
 const car=(x,z,alongZ,col)=>{const o=new T.Group(),bd=new T.Mesh(new T.BoxGeometry(1.8,.8,4.2),L(col)),cb=new T.Mesh(new T.BoxGeometry(1.6,.7,2.3),cabM);bd.position.y=.7;cb.position.set(0,1.45,-.2);o.add(bd,cb);[[-.95,1.3],[.95,1.3],[-.95,-1.3],[.95,-1.3]].forEach(p=>{const w=new T.Mesh(new T.BoxGeometry(.25,.6,.6),tireM);w.position.set(p[0],.3,p[1]);o.add(w)});o.position.set(x,0,z);o.rotation.y=alongZ?0:Math.PI/2;g.add(o);rects.push(alongZ?{x0:x-1,x1:x+1,z0:z-2.2,z1:z+2.2}:{x0:x-2.2,x1:x+2.2,z0:z-1,z1:z+1})};
 const facadeTrim=L(0xe7d8bc),facadeBase=L(0x806a59);const mkB=(cx,cz,bw,bd)=>{const hh=8+rnd()*7,face=fm[(rnd()*fm.length)|0],m=new T.Mesh(new T.BoxGeometry(bw,hh,bd),face);m.position.set(cx,hh/2,cz);g.add(m);
  const plinth=new T.Mesh(new T.BoxGeometry(bw+.12,.34,bd+.12),facadeBase);plinth.position.set(cx,.17,cz);g.add(plinth);
  const cornice=new T.Mesh(new T.BoxGeometry(bw+.24,.17,bd+.24),facadeTrim);cornice.position.set(cx,hh-.18,cz);g.add(cornice);
  const roof=new T.Mesh(new T.BoxGeometry(bw+.3,.16,bd+.3),roofM);roof.position.set(cx,hh+.015,cz);g.add(roof);
  rects.push({x0:cx-bw/2,x1:cx+bw/2,z0:cz-bd/2,z1:cz+bd/2})};
 const shop=(fx,fz,nx,nz)=>{const ci=(rnd()*awC.length)|0,col=awC[ci],aw=new T.Mesh(new T.BoxGeometry(nx?1.7:6.6,.12,nx?6.6:1.7),awningMats[ci]);aw.position.set(fx+nx*.85,3.3,fz+nz*.85);g.add(aw);
  for(let stripe=0;stripe<7;stripe++){const pale=stripe%2===0,sw=new T.Mesh(new T.BoxGeometry(nx?.14:.88,.28,nx?.88:.14),pale?awningLight:awningMats[ci]);sw.position.set(nx?fx+nx*1.7:fx-3.08+(stripe+.5)*6.16/7,3.12,nx?fz-3.08+(stripe+.5)*6.16/7:fz+nz*1.7);g.add(sw)}
  const sg=new T.Mesh(new T.PlaneGeometry(4,.9),signM[(rnd()*6)|0]);sg.position.set(fx+nx*.07,4.3,fz+nz*.07);sg.rotation.y=Math.atan2(nx,nz);g.add(sg);
  if(rnd()<.35){const st=stallProp(col,[0xd94b3d,0xf2c230,0x6bbf59,0xe8a24a]);st.position.set(fx+nx*1.3,0,fz+nz*1.3);st.rotation.y=Math.atan2(-nx,-nz);g.add(st);stalls.push({vx:fx+nx*.4,vz:fz+nz*.4,nx,nz})}};
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){const x0=LN[i]+6,x1=LN[i+1]-6,z0=NZ[j]+6,z1=NZ[j+1]-6,xm=(x0+x1)/2,zm=(z0+z1)/2;
  [[(x0+x1)/2,z0-1,28,2],[(x0+x1)/2,z1+1,28,2],[x0-1,zm,2,24],[x1+1,zm,2,24]].forEach(q=>{
  const s=new T.Mesh(new T.BoxGeometry(q[2],.12,q[3]),SWM);s.position.set(q[0],.06,q[1]);g.add(s);
  if(q[2]>=q[3]){for(let px=q[0]-q[2]/2+1.5;px<q[0]+q[2]/2;px+=1.5){const seam=new T.Mesh(new T.BoxGeometry(.025,.012,q[3]-.08),jointM);seam.position.set(px,.126,q[1]);g.add(seam)}}
  else{for(let pz=q[1]-q[3]/2+1.5;pz<q[1]+q[3]/2;pz+=1.5){const seam=new T.Mesh(new T.BoxGeometry(q[2]-.08,.012,.025),jointM);seam.position.set(q[0],.126,pz);g.add(seam)}}
 });
  [[xm,z0-2.1,24,.2],[xm,z1+2.1,24,.2],[x0-2.1,zm,.2,24],[x1+2.1,zm,.2,24]].forEach(q=>{const c=new T.Mesh(new T.BoxGeometry(q[2],.16,q[3]),CURB);c.position.set(q[0],.08,q[1]);g.add(c)});
  [[xm,z0-1],[xm,z1+1]].forEach(q=>{const p=new T.Mesh(new T.CylinderGeometry(.06,.08,4.2,6),lampPostM);p.position.set(q[0],2.1,q[1]);g.add(p);const b=new T.Mesh(new T.SphereGeometry(.22,8,6),bulbM);b.position.set(q[0],4.3,q[1]);g.add(b)});
  [[x0-1,zm],[x1+1,zm]].forEach(q=>{const p=new T.Mesh(new T.CylinderGeometry(.06,.08,4.2,6),lampPostM);p.position.set(q[0],2.1,q[1]);g.add(p);const b=new T.Mesh(new T.SphereGeometry(.22,8,6),bulbM);b.position.set(q[0],4.3,q[1]);g.add(b)});
  if(i===1&&j===2)continue;
  if((i+j)%2===0){[[x0,xm-2,-1],[xm+2,x1,1]].forEach(hf=>{for(let k=0;k<3;k++){const cz=z0+4+8*k;mkB((hf[0]+hf[1])/2,cz,10,8);if(rnd()<.45)shop(hf[2]<0?x0:x1,cz,hf[2],0)}});
   for(let n=0;n<2;n++){const zz=z0+5+rnd()*14,ln=new T.Mesh(new T.BoxGeometry(4,.03,.03),L(0x444444));ln.position.set(xm,6.2,zz);g.add(ln);for(let k=0;k<3;k++){const cl=new T.Mesh(new T.PlaneGeometry(.55,.75),L([0xe74c3c,0x3498db,0xf1c40f,0x2ecc71][(rnd()*4)|0],{side:T.DoubleSide}));cl.position.set(xm-1.2+k*1.2,5.8,zz);g.add(cl)}}}
  else{[[z0,zm-2,-1],[zm+2,z1,1]].forEach(hf=>{for(let k=0;k<3;k++){const cx0=x0+4+8*k;mkB(cx0,(hf[0]+hf[1])/2,8,10);if(rnd()<.45)shop(cx0,hf[2]<0?z0:z1,0,hf[2])}});
   for(let n=0;n<2;n++){const xx=x0+5+rnd()*14,ln=new T.Mesh(new T.BoxGeometry(.03,.03,4),L(0x444444));ln.position.set(xx,6.2,zm);g.add(ln);for(let k=0;k<3;k++){const cl=new T.Mesh(new T.PlaneGeometry(.55,.75),L([0xe74c3c,0x3498db,0xf1c40f,0x2ecc71][(rnd()*4)|0],{side:T.DoubleSide}));cl.position.set(xx,5.8,zm-1.2+k*1.2);cl.rotation.y=Math.PI/2;g.add(cl)}}}}
 for(let k=0;k<20;k++){const al=-76+7.8*(k+.5);[[82.5,al,9,7.8],[-82.5,al,9,7.8],[al,-82.5,7.8,9],[al,82.5,7.8,9]].forEach(q=>{const hh=8+rnd()*8,m=new T.Mesh(new T.BoxGeometry(q[2],hh,q[3]),fm[(rnd()*fm.length)|0]);m.position.set(q[0],hh/2,q[1]+WZ);g.add(m)})}
 [[0,-77,156,2],[0,77,156,2],[-77,0,2,156],[77,0,2,156]].forEach(q=>{const s=new T.Mesh(new T.BoxGeometry(q[2],.12,q[3]),SWM);s.position.set(q[0],.06,q[1]+WZ);g.add(s)});
 for(let n=0;n<16;n++){const a=(rnd()*5)|0,b=(rnd()*4)|0,vert=rnd()<.5,along=(vert?NZ[b]:LN[b])+8+rnd()*20,sd=rnd()<.5?-1:1;if(vert)car(LN[a]+sd*2.6,along,true,carCols[(rnd()*6)|0]);else car(along,NZ[a]+sd*2.6,false,carCols[(rnd()*6)|0])}
 for(let a=1;a<4;a++)for(let b=1;b<4;b++)[[0,1],[1,0]].forEach(d=>[-1,1].forEach(sg=>{for(let k=-3;k<=3;k++){const s=new T.Mesh(new T.BoxGeometry(d[0]?.5:2.2,.02,d[0]?2.2:.5),zebM);s.position.set(LN[a]+d[0]*sg*0+(d[1]?k*1.05:sg*(d[0]*0)),.055,NZ[b]);}}));
 const lanM=new T.MeshBasicMaterial({color:0xffd07a}),lant=[];
 const sx=-18,sz=18,zc=NZ[3]-6-5.2,sf=12+WZ;
 const pave=new T.Mesh(new T.PlaneGeometry(24,24).rotateX(-Math.PI/2),L(0xdcd5c6));pave.position.set(sx,.07,sz+WZ);g.add(pave);
 const bs=new T.Mesh(new T.CylinderGeometry(2.3,2.5,.6,24),stoneM);bs.position.set(sx,.3,sf);g.add(bs);const wt=new T.Mesh(new T.CircleGeometry(2.05,24).rotateX(-Math.PI/2),waterM);wt.position.set(sx,.62,sf);g.add(wt);
 const pl=new T.Mesh(new T.CylinderGeometry(.28,.38,1.5,10),stoneM);pl.position.set(sx,1.2,sf);g.add(pl);const bw2=new T.Mesh(new T.CylinderGeometry(1.0,.55,.28,16),stoneM);bw2.position.set(sx,2.0,sf);g.add(bw2);
 rects.push({x0:sx-2.6,x1:sx+2.6,z0:sf-2.6,z1:sf+2.6});
 [[sx-9,9+WZ],[sx+9,9+WZ],[sx-10,21+WZ],[sx+10,21+WZ]].forEach(q=>{palm(g,q[0],q[1],5.5);rects.push({x0:q[0]-.4,x1:q[0]+.4,z0:q[1]-.4,z1:q[1]+.4})});
 [[sx-5,sf,-Math.PI/2],[sx+5,sf,Math.PI/2],[sx,sf-5,0],[sx-8,16+WZ,Math.PI],[sx+8,16+WZ,Math.PI]].forEach(q=>{benchAt(g,q[0],q[1],q[2]);rects.push({x0:q[0]-.8,x1:q[0]+.8,z0:q[1]-.8,z1:q[1]+.8})});
 const mo=mkMosque();mo.position.set(sx,0,zc);g.add(mo);rects.push({x0:sx-6.1,x1:sx+6.1,z0:zc-4.9,z1:zc+4.9});
 for(let a=0;a<5;a++)for(let b=0;b<4;b++){const q=[LN[a],NZ[b]+18];lant.push(q);const s=new T.Mesh(new T.SphereGeometry(.2,8,6),lanM);s.position.set(q[0]+4.6,5,q[1]);g.add(s)}
 for(let n=0;n<14;n++){const sd=rnd()<.5?-1:1,a=1+((rnd()*3)|0),b=(rnd()*4)|0,pz=NZ[b]+8+rnd()*16;palm(g,LN[a]+sd*4.2,pz,5+rnd()*1.5);rects.push({x0:LN[a]+sd*4.2-.4,x1:LN[a]+sd*4.2+.4,z0:pz-.4,z1:pz+.4})}
 flattenTownObject(g);g.userData.d=[];merge(g);S.add(g);
 lant.forEach(q=>{const s=new T.Sprite(glowM);s.position.set(q[0]+4.6,5,q[1]);s.scale.set(3.2,3.2,1);S.add(s)});
 return{g,rects,stalls,sx,sz:sf,zq:sz+WZ,zc,door:{x:sx,z:zc-6.9}}}

let npcShadowTex=null,npcShadowGeo=null,npcShadowMat=null;
function npcGroundShadow(scale=1){if(!npcShadowTex){npcShadowTex=cv(128,128,q=>{const gr=q.createRadialGradient(64,64,3,64,64,63);gr.addColorStop(0,'rgba(14,12,12,.48)');gr.addColorStop(.35,'rgba(18,15,15,.28)');gr.addColorStop(1,'rgba(18,15,15,0)');q.fillStyle=gr;q.fillRect(0,0,128,128)});npcShadowGeo=new T.PlaneGeometry(1.15,1.55).rotateX(-Math.PI/2);npcShadowMat=disableTownTerrainWarp(new T.MeshBasicMaterial({map:npcShadowTex,transparent:true,opacity:.58,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2}))}
 const sh=new T.Mesh(npcShadowGeo,npcShadowMat);sh.position.y=.035;sh.scale.set(scale,scale,1);sh.renderOrder=2;return sh}
function addFullHijab(m,kind){const head=m.getObjectByName('head');if(!head||head.userData.fullHijab)return;const cloth=L(kind==='medic'?0x263746:0x252a34);cloth.side=T.DoubleSide;cloth.roughness=1;cloth.metalness=0;disableTownTerrainWarp(cloth);const hood=new T.Mesh(new T.SphereGeometry(.19,22,16,2.11,Math.PI*2-1.08,.025,Math.PI-.05),cloth);hood.position.set(0,.15,0);hood.scale.set(1.07,1.18,1.04);hood.frustumCulled=false;const drape=new T.Mesh(new T.ConeGeometry(.19,.39,20,1,true),cloth);drape.position.set(0,-.13,0);drape.scale.set(1.12,1,.88);drape.frustumCulled=false;head.add(hood,drape);head.userData.fullHijab=true}
function walkBodyPose(b,o){setB(b['leg-left'],qX(-(o.lf||0)));setB(b['leg-right'],qX(-(o.rf||0)));const al=(o.al||0)*.52,ar=(o.ar||0)*.52;setB(b['arm-left'],qZ(al).multiply(qX(al*.22)));setB(b['arm-right'],qZ(ar).multiply(qX(ar*.22)));setB(b.torso,qX(o.lean||0).multiply(qY(o.twist||0)).multiply(qZ(o.roll||0)))}
function mkNPC(kind,tint,pose){const src=REAL[kind];if(!src)return null;const g=new T.Group(),m=T.SkeletonUtils.clone(src.scene),sc={owner:1.55,medic:1.55,elder:1.6,kid:1.2,boy:1.45}[kind]*(.94+Math.random()*.12);m.scale.setScalar(sc);
 // Retain each model's authored colors while using display-correct color textures in the walking scene.
 if(walkMode){tuneWalkModel(m);if(kind==='owner'||kind==='medic')addFullHijab(m,kind)}
 if(walkMode)g.add(npcGroundShadow(.9+sc*.18));g.add(m);
 const mixer=new T.AnimationMixer(m),clip=src.animations.find(a=>a.name===(pose||'idle'));if(clip){const a=mixer.clipAction(clip);a.play();a.paused=true;mixer.update(.016)}
 m.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false}});
 g.userData={m,bones:rigBones(m),ph:Math.random()*6.28,kind,sc,waveBone:m.getObjectByName('arm-right'),waveAmt:0,waveTarget:0,waveT:0,mode:'stand'};S.add(g);return g}
function blocked(x,z,r){r=r||.35;if(Math.abs(x)>77||z<WZ-77||z>WZ+77)return true;const R=WK.rects;for(let i=0;i<R.length;i++){const q=R[i];if(x>q.x0-r&&x<q.x1+r&&z>q.z0-r&&z<q.z1+r)return true}return false}
function nextNode(u){const nb=[],i=u.node[0],j=u.node[1];[[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{const a=i+d[0],b=j+d[1];if(a>=0&&a<5&&b>=0&&b<5&&!(u.prev&&u.prev[0]===a&&u.prev[1]===b))nb.push([a,b])});const nx=nb.length?nb[(Math.random()*nb.length)|0]:u.prev;u.prev=u.node;u.node=nx;u.tx=LN[nx[0]]+u.off;u.tz=NZ[nx[1]]+u.off}
function npcUpdate(n,dt){const u=n.userData;{const fd=Math.hypot(n.position.x-WK.x,n.position.z-WK.z);const far=fd>58;if(far!==!n.visible){n.visible=!far}if(far&&u.mode!=='walk')return}u.waveAmt+=(u.waveTarget-u.waveAmt)*(1-Math.exp(-7*dt));if(u.waveT>0){u.waveT-=dt;if(u.waveT<=0)u.waveTarget=0}let posed=false;
 if(u.mode==='walk'){const dx=u.tx-n.position.x,dz=u.tz-n.position.z,d=Math.hypot(dx,dz);
  if(d<.3){if(Math.random()<.3){u.mode='wait';u.wt=1+Math.random()*3}else nextNode(u)}
  else{let vx=dx/d*u.sp,vz=dz/d*u.sp;const P=WK,ex=n.position.x-P.x,ez=n.position.z-P.z,ed=Math.hypot(ex,ez);
   if(ed<1.9){const k=(1.9-ed)*1.6;vx+=ex/(ed+.01)*k;vz+=ez/(ed+.01)*k;if(ed<1.2&&(dx*-ex+dz*-ez)>0){vx*=.2;vz*=.2}if(ed<.75){n.position.x+=ex/(ed+.01)*(.75-ed);n.position.z+=ez/(ed+.01)*(.75-ed)}}
   for(const o of WK.walkers){if(o===n)continue;const fx=n.position.x-o.position.x,fz=n.position.z-o.position.z,fd=Math.hypot(fx,fz);if(fd<1.1&&fd>.01){vx+=fx/fd*(1.1-fd)*1.4;vz+=fz/fd*(1.1-fd)*1.4}}
   n.position.x+=vx*dt;n.position.z+=vz*dt;const sp=Math.hypot(vx,vz);if(sp>.05)turnYaw(n,Math.atan2(vx,vz),dt);u.ph+=dt*sp*4.8;walkBodyPose(u.bones,walkOff(u.ph,.2+.1*Math.min(sp,1.6)))}posed=true}
 else if(u.mode==='wait'){u.wt-=dt;if(u.wt<=0){u.mode='walk';nextNode(u)}walkBodyPose(u.bones,{});posed=true}
 else if(u.mode==='stand'){const b=Math.sin(t*1.25+u.ph);walkBodyPose(u.bones,{lean:.012*b,twist:.018*Math.sin(t*.7+u.ph),al:.025*Math.sin(t*.9+u.ph),ar:.03*Math.cos(t*1.05+u.ph)});posed=true}
 else if(u.mode==='talk'){walkBodyPose(u.bones,{ar:.45+.35*Math.sin(t*2.1+u.ph),al:.2+.2*Math.sin(t*1.7+u.ph*1.3),lean:.03,twist:.07*Math.sin(t*.9+u.ph)});posed=true}
 else if(u.mode==='argue'){walkBodyPose(u.bones,{ar:.9+.5*Math.sin(t*5+u.ph),al:.7+.5*Math.sin(t*4.2+u.ph),lean:.1,twist:.1*Math.sin(t*3+u.ph)});posed=true}
 else if(u.mode==='run'){if(Math.hypot(WK.x-n.position.x,WK.z-n.position.z)<1.7){walkBodyPose(u.bones,{});posed=true}else{u.a+=dt*u.w;const sx=WK.world.sx,sz=WK.world.sz;n.position.set(sx+Math.cos(u.a)*u.r,0,sz+Math.sin(u.a)*u.r);n.rotation.y=Math.atan2(-Math.sin(u.a),Math.cos(u.a))*(u.w>0?1:-1);u.ph+=dt*11;walkBodyPose(u.bones,walkOff(u.ph,.5));posed=true}}
 if(u.waveAmt>.01){if(!posed)walkBodyPose(u.bones,{});u.waveBone.quaternion.multiply(qZ(-(1.9+Math.sin(t*8)*.32)*u.waveAmt))}}
function showDlg(ar,en,ch){menuOpen=true;menuMode='dlg';WK.dlg=ch;$menu.innerHTML='<div class="walk-dialog" dir="rtl"><span>'+ar+'</span>'+ch.map((c,i)=>'<button data-i="'+i+'">'+c.t+'</button>').join('')+'</div>';$menu.style.display='flex'}
function dlgChoice(i){const c=WK&&WK.dlg&&WK.dlg[i];closeMenu();if(c&&c.fn)c.fn()}
function pay(n,msg){money+=n;SV.money=money;svSave();if(n>0){fan();coin()}if(msg)say(msg)}
function greet(n){const u=n.userData;u.waveTarget=1;u.waveT=2.4;SV.salams=(SV.salams||0)+1;svSave();say('السلام عليكم  ←  '+['وعليكم السلام ورحمة الله وبركاته','وعليكم السلام يا بني','أهلاً بك يا ولدي'][(Math.random()*3)|0]);if(Math.random()<.2){pay(5)}}
function escort(npc,dest,ev,msg,reward){const w=WK;w.fol={npc,dest,done(){w.fol=null;ev.done=true;const u=npc.userData;u.waveTarget=1;u.waveT=5;pay(reward,msg+'   \u2066+¥'+reward+'\u2069');SV.helped=(SV.helped||0)+1;svSave()}}}
function evOldWoman(it){const ev=it.ev;if(ev.done)return say('تلوّح لك شاكرةً: «جزاك الله خيرًا يا بني»');if(WK.fol)return;
 showDlg('عجوز: «يا بني، الأكياس ثقيلة عليّ… هل تساعدني؟»','An old woman struggles with heavy bags.',[{t:'نعم يا خالتي، سأوصلك 🤝',fn:()=>{escort(ev.npc,ev.dest,ev,'جزاك الله خيرًا يا بني',60);say('امشِ مع السيدة حتى باب منزلها. ستجد وجهتك على الخريطة.')}},{t:'آسف، أنا مستعجل',fn:()=>say('تبدو متعبة. يمكنك مساعدتها في وقت آخر.')}])}
function evLost(it){const ev=it.ev;if(ev.done)return;if(WK.fol)return;
 showDlg('طفل يبكي: «أضعتُ أمي!»','A little boy is crying: "I lost my mother!"',[{t:'لا تخف، سآخذك إلى الساحة لنجد أمك',fn:()=>{escort(ev.npc,ev.dest,ev,'لمّ الله شملكما',80);say('رافق الطفل إلى الساحة؛ سنبحث عن أمه بجوار النافورة.')}},{t:'لا أعرف… سأتركه الآن',fn:()=>say('يبدو الطفل خائفًا. الأفضل ألا تتركه وحده.')}])}
function evChange(it){const ev=it.ev;
 if(ev.stage===0)showDlg('البائع: «تفضّل يا ولدي، تمر طازج بعشرة قروش»','Vendor: Fresh dates, ¥10.',[{t:'🌴 اشترِ التمر  ¥10',fn:()=>{if(money<10)return say('لا تملك ما يكفي. تحتاج إلى ١٠ جنيهات.');pay(-10);pay(50);ev.stage=1;showDlg('انتبهتَ: البائع أعطاك خمسين زيادة عن الباقي!','You notice the vendor gave you ¥50 too much change.',[{t:'أُعيد له الزيادة — الأمانة',fn:()=>{pay(-50);SV.trusts=(SV.trusts||0)+1;ev.stage=2;pay(15,'«أدّ الأمانة إلى من ائتمنك». ابتسم البائع ودعا لك.  \u2066+¥15\u2069')}},{t:'أحتفظ بها',fn:()=>{SV.slips=(SV.slips||0)+1;svSave();say('تشعر أن الاحتفاظ بالمال الزائد ليس صوابًا. يمكنك إعادته لصاحبه.')}}])}},{t:'لا شكرًا',fn:()=>{}}]);
 else if(ev.stage===1)showDlg('ضميرك يؤنّبك على الخمسين الزائدة…','Your conscience troubles you about the extra ¥50.',[{t:'أعيدها الآن',fn:()=>{pay(-50);SV.trusts=(SV.trusts||0)+1;ev.stage=2;pay(15,'إعادة المال الزائد أمانة تستحق الثواب.  \u2066+¥15\u2069')}},{t:'لاحقًا',fn:()=>{}}]);
 else say('يبتسم لك ويقول: «بارك الله فيك»')}
function evDare(it){const ev=it.ev;if(ev.done)return say('يومئ صديقك موافقًا: «معك حق»');
 showDlg('صاحبك: «خذ برتقالة بسرعة، البائع لا ينظر!»','Your friend dares you to take an orange while the seller is not looking.',[{t:'لا، هذه سرقة — سندفع ثمنها',fn:()=>{pay(-8);ev.done=true;SV.trusts=(SV.trusts||0)+1;ev.npc.userData.waveTarget=1;ev.npc.userData.waveT=3;say('يقتنع صديقك بكلامك. دفعتَ ٨ جنيهات ثمن البرتقال.')}},{t:'حسنًا، سآخذ واحدة',fn:()=>{SV.slips=(SV.slips||0)+1;svSave();showDlg('أخذتها… وشعرتَ بثقل في صدرك.','You took it and your heart feels heavy.',[{t:'أرجع وأدفع ثمنها  ¥8',fn:()=>{pay(-8);ev.done=true;SV.trusts=(SV.trusts||0)+1;say('«والتائب من الذنب كمن لا ذنب له». أعدتَ الحق واعتذرت.')}},{t:'أتركها',fn:()=>{}}])}}])}
function evCat(it){const ev=it.ev;if(ev.done)return say('تخرخر القطة وتتمسّح بساقك في امتنان.');
 showDlg('قطة جائعة تموء عند الحاويات…','A hungry stray cat. Sardines cost ¥10.',[{t:'🐟 أُطعمها  ¥10',fn:()=>{if(money<10)return say('لا تملك ما يكفي. تحتاج إلى ١٠ جنيهات.');pay(-10);ev.done=true;const cu=WK.cat.userData;cu.eatTarget=1;setTimeout(()=>{cu.eatTarget=0},5000);SV.mercy=(SV.mercy||0)+1;pay(0,'«في كل كبدٍ رطبةٍ أجر» — الرحمة بالحيوان باب للأجر.')}},{t:'لا الآن',fn:()=>{}}])}
function evArgue(it){const ev=it.ev;if(ev.done)return say('تصالح الجاران وتصافحا مبتسمين.');
 showDlg('رجلان يتجادلان بصوت عالٍ…','Two neighbors are arguing loudly over a small matter.',[{t:'السلام عليكم… هلّا هدأتما؟ 🕊',fn:()=>{ev.done=true;ev.npcs.forEach(n=>{n.userData.mode='stand';n.userData.waveTarget=1;n.userData.waveT=3});SV.peace=(SV.peace||0)+1;pay(30,'«فَاتَّقُوا اللَّهَ وَأَصْلِحُوا ذَاتَ بَيْنِكُمْ» (الأنفال ١)   \u2066+¥30\u2069')}},{t:'أصرخ عليهما',fn:()=>say('رفع الصوت يزيد الخلاف. جرّب الكلام الهادئ.')},{t:'أمضي في طريقي',fn:()=>{}}])}
function startPrayerWalk(){const w=WK;w.pray={t:0,k:pCur};w.boy.visible=false;$('pray').style.display='flex'}
const ERR=[{id:'baker',ar:'الخبّاز',itemAr:'خبزًا للعشاء',en:'bread',cost:25,kind:'elder',col:0xe07a2f,sx:4.9,zl:-20,rot:Math.PI/2,vx:5.7,ix:3.4},{id:'grocer',ar:'البقّال',itemAr:'خضارًا للغداء',en:'vegetables',cost:40,kind:'owner',col:0x2f9a5a,sx:-40.9,zl:40,rot:-Math.PI/2,vx:-41.7,ix:-38.6},{id:'pharm',ar:'الصيدلي',itemAr:'دواءً لأختك',en:'medicine for your sister',cost:60,kind:'medic',col:0x2f7fd6,sx:40.9,zl:-20,rot:Math.PI/2,vx:41.7,ix:38.6},{id:'books',ar:'صاحب المكتبة',itemAr:'دفترًا لأختك',en:'a notebook for your sister',cost:15,kind:'elder',col:0xf2c230,sx:-4.9,zl:-50,rot:-Math.PI/2,vx:-5.7,ix:-2.6}];
function activeWalkObjective(w=WK){if(!w)return null;const id=(pPending&&!pDone)?'mosque':w.q===1?ERR[w.err].id:'mom';return w.items.find(i=>i.id===id)||null}
function makeWalkGoalMarker(){const g=new T.Group(),gold=disableTownTerrainWarp(new T.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:.96,depthWrite:false,toneMapped:false})),beamM=disableTownTerrainWarp(new T.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide,toneMapped:false})),ring=new T.Mesh(new T.TorusGeometry(.78,.075,8,28),gold.clone()),beam=new T.Mesh(new T.CylinderGeometry(.09,.34,2.35,10,1,true),beamM),cap=new T.Mesh(new T.OctahedronGeometry(.22),gold.clone());ring.rotation.x=Math.PI/2;ring.position.y=.08;beam.position.y=1.25;cap.position.y=2.6;g.add(beam,ring,cap);g.userData={ring,beam,cap};return g}
function updateWalkGoalMarker(w,dt){const m=w&&w.goalMarker,o=activeWalkObjective(w);if(!m)return;if(!o){m.visible=false;return}m.visible=true;m.position.set(o.x,0,o.z);const d=Math.hypot(w.x-o.x,w.z-o.z),p=.88+.14*Math.sin(t*2.8);m.userData.ring.scale.setScalar(p);m.userData.cap.position.y=2.55+.16*Math.sin(t*3.2);m.userData.ring.material.opacity=d<2.8?.22:.96;m.userData.beam.material.opacity=d<5?.035:.16;m.userData.cap.material.opacity=d<2.8?.28:.96}
function updQuest(){const w=WK;if(!w)return;const e=ERR[w.err],step=w.q===0?'١':w.q===1?'٢':'٣';let ar,head;if(pPending&&!pDone){head='هدف عاجل · الصلاة';ar='توجّه إلى المسجد في الساحة وأدِّ الصلاة في وقتها.'}else{head='المهمة الأساسية · الخطوة '+step+' من ٣';if(w.q===0)ar='تكلّم مع أمك عند باب المنزل لتعرف ما تحتاجه الأسرة.';else if(w.q===1)ar='اذهب إلى '+e.ar+' واشترِ '+e.itemAr+' ثم عُد إلى المنزل.';else ar='عُد إلى المنزل وسلّم '+e.itemAr+' إلى أمك.'}setH($m,'<b>'+head+'</b><span class="mission-copy">'+ar+'</span>')}
function talkMom(){const w=WK,e=ERR[w.err];
 if(w.q===0)showDlg('أمك: «يا بني، اذهب إلى '+e.ar+' واشترِ لنا '+e.itemAr+'. خذ هذه النقود.»','',[{t:'حاضر يا أمي',fn:()=>{pay(e.cost+20,'استلمتَ مصروف المشوار. اتبع العلامة الذهبية إلى '+e.ar+'.');w.q=1;updQuest()}}]);
 else if(w.q===1)showDlg('أمك: «'+e.ar+' ينتظرك يا بني»','',[{t:'حسنًا، سأذهب إليه',fn:()=>{}},{t:'أحتاج إلى بقية المال',fn:()=>{if(money<e.cost){const extra=e.cost-money+5;pay(extra,'أعطتك أمك '+extra+' لتكمل شراء '+e.itemAr+'.')}else say('معك ما يكفي لشراء المطلوب.')}}]);
 else if(w.q===2&&w.item)showDlg('أمك: «جزاك الله خيرًا يا بني، ما أطيبك!»','',[{t:'تفضّلي يا أمي',fn:()=>{w.item=false;SV.errands=(SV.errands||0)+1;pay(40,'فرحت أمك بإنجازك للمشوار. +¥40');w.err=(w.err+1)%ERR.length;w.q=0;updQuest()}}]);
 else showDlg('أمك: «لا تتأخر، وصلِّ في وقتها يا بني»','',[{t:'إن شاء الله',fn:()=>{}}])}
function talkShop(i){const w=WK,e=ERR[i];
 if(w.q===1&&w.err===i&&!w.item)showDlg('«أهلًا يا ولدي، '+e.itemAr+' بـ'+e.cost+' جنيهًا. هل تشتريه؟»','',[{t:'اشترِ المطلوب · '+e.cost+' جنيهًا',fn:()=>{if(money<e.cost)return say('لا تملك ما يكفي للشراء. عُد إلى أمك لطلب المبلغ الناقص.');pay(-e.cost);w.item=true;w.q=2;updQuest();say('اشتريت المطلوب. عُد به إلى المنزل وسلّمه إلى أمك.')}},{t:'سأعود لاحقًا',fn:()=>{}}]);
 else say('«أهلًا بك يا بني، تفضّل»')}
let walkShadowCellX=NaN,walkShadowCellZ=NaN;
function syncWalkShadowAnchor(x,z,force=false){const gx=Math.floor(x/24),gz=Math.floor((z-WZ)/24);if(!force&&gx===walkShadowCellX&&gz===walkShadowCellZ)return;walkShadowCellX=gx;walkShadowCellZ=gz;const tx=gx*24,tz=WZ+gz*24;sunL.position.set(tx-34,36,tz-48);sunL.target.position.set(tx,0,tz);sunL.target.updateMatrixWorld();R.shadowMap.needsUpdate=true}
function configureWalkVisuals(x,z){gnd.visible=false;R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.22;R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;R.shadowMap.autoUpdate=false;S.fog.near=38;S.fog.far=300;sunL.castShadow=true;gnd.receiveShadow=true;sunL.shadow.mapSize.set((navigator.hardwareConcurrency||4)>=8&&innerWidth>800?1024:512,(navigator.hardwareConcurrency||4)>=8&&innerWidth>800?1024:512);sunL.shadow.camera.left=-38;sunL.shadow.camera.right=38;sunL.shadow.camera.top=34;sunL.shadow.camera.bottom=-16;sunL.shadow.camera.near=.5;sunL.shadow.camera.far=240;sunL.shadow.camera.updateProjectionMatrix();syncWalkShadowAnchor(x,z,true)}
function startWalkMode(){started=true;walkMode=true;document.body.classList.add('walk-mode');configureWalkVisuals(-72,Zl(-44));$('bk').style.display='block';$('goals').style.display='block';$('ov').style.display='none';initAudio();mg.gain.value=0;AC.resume();
 chunks.forEach(g=>{S.remove(g);g.userData.d.forEach(d=>d.dispose())});chunks.clear();mosqueList.length=0;tlights.length=0;rider.visible=false;if(mBeam)mBeam.visible=false;$('spd').style.display='none';
 const W=buildAlley();WK={world:W,rects:W.rects,x:-72,z:Zl(-44),yaw:0,spd:0,ph:0,pp:{lf:0,rf:0,al:0,ar:0,lean:0,twist:0,roll:0},q:0,err:0,item:false,fol:null,pray:null,pe:false,items:[],npcs:[],ev:{},cam:new T.Vector3(),dlg:null,mapT:0};
 const PG=new T.Group(),w=WK,rb=T.SkeletonUtils.clone(REAL.boy.scene);tuneWalkModel(rb);rb.scale.setScalar(1.5);w.boy=new T.Group();w.boy.add(rb);rb.traverse(o=>{if(o.isMesh)o.frustumCulled=false});
 {const mx=new T.AnimationMixer(rb),cl=REAL.boy.animations.find(a=>a.name==='idle');if(cl){const a=mx.clipAction(cl);a.play();a.paused=true;mx.update(.016)}}
 w.bones=rigBones(rb);w.root=rb.getObjectByName('root');w.rootY=w.root.position.y;const sh=npcGroundShadow(1.08);sh.scale.set(1.08,1.55,1);sh.position.y=.038;w.boy.add(sh);S.add(w.boy);
 const rnd=mkRng(99),kinds=['owner','medic','elder','kid','boy'];
 const mk=(kind,x,zl,ry,mode)=>{const n=mkNPC(kind,true);if(!n)return null;n.position.set(x,0,Zl(zl));n.rotation.y=ry||0;n.userData.mode=mode||'stand';w.npcs.push(n);return n};
 const it=(id,x,zl,label,fn,extra)=>{const o=Object.assign({id,x,z:Zl(zl),r:2.4,label,fn},extra||{});w.items.push(o);return o};
 for(let n=0;n<17;n++){const k=kinds[(rnd()*5)|0],npc=mkNPC(k,true);if(!npc)continue;const u=npc.userData;u.mode='walk';u.sp=1.0+rnd()*.8;u.off=(rnd()<.5?-1:1)*(4.2+rnd()*1.2);u.node=[(rnd()*5)|0,(rnd()*5)|0];u.prev=null;npc.position.set(LN[u.node[0]]+u.off,0,NZ[u.node[1]]+u.off);nextNode(u);w.npcs.push(npc)}
 W.stalls.slice(0,6).forEach(s=>{const n=mkNPC(rnd()<.5?'elder':'owner',true);if(!n)return;n.position.set(s.vx,0,s.vz);n.rotation.y=Math.atan2(s.nx,s.nz);w.npcs.push(n)});
 [[31.2,-12,1],[-40.8,20,1],[-67.6,20,1],[-52,-31.2,0],[20,4.8,0]].forEach((q,i)=>{const a=mkNPC(kinds[(i+1)%5],true),b=mkNPC(kinds[(i+3)%5],true);if(!a||!b)return;const ax=q[2]===0;a.position.set(q[0]-(ax?.55:0),0,Zl(q[1])-(ax?0:.55));b.position.set(q[0]+(ax?.55:0),0,Zl(q[1])+(ax?0:.55));a.rotation.y=ax?Math.PI/2:0;b.rotation.y=ax?-Math.PI/2:Math.PI;a.userData.mode=b.userData.mode='talk';w.npcs.push(a,b)});
 for(let i=0;i<4;i++){const n=mkNPC('kid',true);if(!n)continue;const u=n.userData;u.mode='run';u.a=i*1.6;u.r=4.2+i*1.1;u.w=(i%2?1:-1)*(.55+i*.08);w.npcs.push(n)}
 [[W.sx-5,W.sz,-Math.PI/2],[W.sx+5,W.sz,Math.PI/2]].forEach(q=>{const n=mkNPC('elder',false,'sit');if(!n)return;n.position.set(q[0],.2,q[1]);n.rotation.y=q[2]+Math.PI;n.userData.mode='sit';w.npcs.push(n)});
 const hd=doorProp();hd.position.set(-65.9,0,Zl(-52));hd.rotation.y=Math.PI/2;PG.add(hd);const mom=mk('owner',-67.6,-50,-Math.PI/2);it('mom',-67.6,-50,'Talk to Mom',talkMom,{npc:mom});
 ERR.forEach((e,i)=>{const st=stallProp(e.col,[0xc99a5b,0xd8b073,0x6bbf59,0xd94b3d]);st.position.set(e.sx,0,Zl(e.zl));st.rotation.y=e.rot;PG.add(st);w.rects.push({x0:e.sx-.6,x1:e.sx+.6,z0:Zl(e.zl)-1.25,z1:Zl(e.zl)+1.25});const v=mk(e.kind,e.vx,e.zl,-e.rot);it(e.id,e.ix,e.zl,'Talk to the '+e.ar,()=>talkShop(i),{npc:v})});
 const ow=mk('owner',-31.2,-10,-Math.PI/2),dd=doorProp();dd.position.set(-30.1,0,Zl(-58));dd.rotation.y=Math.PI/2;PG.add(dd);[[-.6,.6],[-.4,-.3]].forEach((o,k)=>{const b=new T.Mesh(new T.BoxGeometry(.4,.5,.3),bagM[k]);b.position.set(-31.2+o[0],.25,Zl(-10)+o[1]);PG.add(b)});
 it('ow',-31.2,-10,'Talk to the old woman',evOldWoman,{ev:{npc:ow,dest:{x:-31.4,z:Zl(-58)},done:false}});
 const lc=mk('kid',31.2,-52,Math.PI/2),lm=mk('medic',W.sx,4.8,0);it('lost',31.2,-52,'Talk to the crying boy',evLost,{ev:{npc:lc,dest:{x:W.sx,z:Zl(4.8)},done:false}});
 const cs=stallProp(0xc8352f,[0x7a4a2a,0x5a3a22]);cs.position.set(40.9,0,Zl(15));cs.rotation.y=Math.PI/2;PG.add(cs);w.rects.push({x0:40.3,x1:41.5,z0:Zl(15)-1.25,z1:Zl(15)+1.25});const vend=mk('elder',41.7,15,-Math.PI/2);it('change',39.4,15,'Buy dates',evChange,{ev:{stage:0},npc:vend});
 const os=stallProp(0xe07a2f,[0xf08a24,0xf2a33a]);os.position.set(-31.1,0,Zl(-24));os.rotation.y=Math.PI/2;PG.add(os);w.rects.push({x0:-31.7,x1:-30.5,z0:Zl(-24)-1.25,z1:Zl(-24)+1.25});const fr=mk('boy',-33.2,-21,0);it('dare',-33.2,-21,'Talk to your friend',evDare,{ev:{done:false,npc:fr},npc:fr});
 const cg=mkCat();cg.position.set(-3.6,0,Zl(45));S.add(cg);w.cat=cg;[[-5,44],[-5,46.3]].forEach(q=>{const b=new T.Mesh(new T.CylinderGeometry(.35,.3,.9,8),binM);b.position.set(q[0],.45,Zl(q[1]));PG.add(b)});it('cat',-3,45,'Look at the stray cat',evCat,{ev:{done:false}});
 const a1=mk('elder',31.2,60,0,'argue'),a2=mk('boy',31.2,62.2,Math.PI,'argue');it('argue',32.6,61,'Calm the neighbors',evArgue,{ev:{done:false,npcs:[a1,a2]}});
 it('mosque',W.door.x,W.door.z-WZ,()=>(pPending&&!pDone)?'ادخل المسجد للصلاة':'زر المسجد',()=>{if(pPending&&!pDone)startPrayerWalk();else say('المسجد هادئ الآن. عُد عند دخول وقت الصلاة.')},{r:3});
 flattenTownObject(PG);PG.userData.d=[];merge(PG);S.add(PG);w.walkers=w.npcs.filter(n=>n.userData.mode==='walk');w.goalMarker=makeWalkGoalMarker();S.add(w.goalMarker);
 w.cam.set(w.x,2.3,w.z-4.4);updQuest();$('keys').textContent='W للحركة · A/D للتوجيه · زر Shift للجري · E للتحدث والتفاعل · M للصوت — للهاتف: اضغط للحركة واسحب للتوجيه';$('keys').style.opacity=1;setTimeout(()=>$('keys').style.opacity=0,16000);
 say('ابدأ بالتحدث مع أمك عند باب المنزل. العلامة الذهبية هي هدفك الحالي؛ والأنشطة الأخرى اختيارية.')}
function hitNpc(x,z){for(const n of WK.npcs){const u=n.userData;if(u.mode==='sit'||u.mode==='run'||u.mode==='follow')continue;const dx=x-n.position.x,dz=z-n.position.z;if(dx*dx+dz*dz<.55)return true}return false}
function helpSum(){return(SV.helped||0)+(SV.trusts||0)+(SV.peace||0)+(SV.mercy||0)+(SV.elders||0)+(SV.schoolRuns||0)}
function skipToPrayer(){const h=hourNow();let t=null;for(const p of PRY){if(p.h>h){t=p.h;break}}let g=Math.floor(gmin/1440)*1440;if(t===null){g+=1440;t=PRY[0].h}gmin=g+t*60-2}
function goalsUpdate(){if(!SV.base||SV.baseDay!==today){SV.base={pr:SV.prayers||0,jb:SV.jobs||0,hp:helpSum(),er:SV.errands||0,ob:SV.obeyed||0,sa:SV.salams||0};SV.baseDay=today;svSave()}
 const B=SV.base,G=walkMode?[['الصلاة في وقتها × 3',(SV.prayers||0)-B.pr,3],['مساعدة 3 أشخاص',helpSum()-B.hp,3],['إنجاز مشوارين للأسرة',(SV.errands||0)-B.er,2],['إلقاء السلام على 5 أشخاص',(SV.salams||0)-B.sa,5]]:[['Pray 3 prayers on time',(SV.prayers||0)-B.pr,3],['Deliver 2 parcels',(SV.jobs||0)-B.jb,2],['Help 3 people',helpSum()-B.hp,3],['Answer Mom (call or errand)',(SV.obeyed||0)-B.ob+(SV.errands||0)-B.er,1]];
 let html='<b>'+(walkMode?'أهداف اليوم · مهام جانبية':'Today\'s goals')+'</b><br>',all=true;G.forEach(q=>{const dn=q[1]>=q[2];if(!dn)all=false;html+=(dn?'✔ ':'○ ')+q[0]+' ('+Math.min(q[1],q[2])+'/'+q[2]+')<br>'});
 if(all&&SV.bonusDay!==today){SV.bonusDay=today;money+=300;SV.money=money;svSave();fan();coin();say((walkMode?'اكتملت أهداف اليوم! مكافأة إضافية +¥300':'🌟 All of today\'s goals are done!  +¥300'))}
 setH($('goals'),html)}
function drawWalkMap(w){
 w.mapT++;if(w.mapT%2)return;
 const c=mc,sc=.82,center=95,P=(x,z)=>({x:(x-w.x)*sc,y:-(z-w.z)*sc});
 c.clearRect(0,0,190,190);c.save();c.beginPath();c.arc(center,center,92,0,Math.PI*2);c.clip();c.fillStyle='#b5b0a2';c.fillRect(0,0,190,190);
 // Rotate the town around the player, so the arrow's top always means straight ahead.
 c.translate(center,center);c.rotate(-w.yaw);
 // Building blocks between streets: fewer, clearer shapes than plotting every collision box.
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){
  if(i===1&&j===2)continue;
  const x0=LN[i]+4.3,x1=LN[i+1]-4.3,z0=NZ[j]+4.3,z1=NZ[j+1]-4.3,top=P(x0,z1);
  c.fillStyle=((i+j)%2===0)?'#817c72':'#898477';c.fillRect(top.x,top.y,(x1-x0)*sc,(z1-z0)*sc)
 }
 // Clear road grid.
 c.fillStyle='#4b5154';
 for(const x of LN){const top=P(x-3.6,WZ+77);c.fillRect(top.x,top.y,7.2*sc,154*sc)}
 for(const z of NZ){const top=P(-77,z+3.6);c.fillRect(top.x,top.y,154*sc,7.2*sc)}
 // Central square and fountain.
 const plaza=P(w.world.sx-12,w.world.zq+12);c.fillStyle='#708a70';c.fillRect(plaza.x,plaza.y,24*sc,24*sc);
 const fountain=P(w.world.sx,w.world.zc);c.fillStyle='#d4c7a8';c.beginPath();c.arc(fountain.x,fountain.y,4.1,0,Math.PI*2);c.fill();c.fillStyle='#6a9da0';c.beginPath();c.arc(fountain.x,fountain.y,2.4,0,Math.PI*2);c.fill();
 const active=activeWalkObjective(w),prayerGoal=pPending&&!pDone;
 // The gold line leads to the current goal; distant goals get a direction marker at the map edge.
 if(active){
  const pt=P(active.x,active.z),dist=Math.hypot(pt.x,pt.y),edge=dist>83?{x:pt.x*83/dist,y:pt.y*83/dist}:pt;
  c.strokeStyle='rgba(255,218,123,.88)';c.lineWidth=1.6;c.setLineDash([3,3]);c.beginPath();c.moveTo(0,0);c.lineTo(edge.x,edge.y);c.stroke();c.setLineDash([]);
  c.fillStyle='#ffe28a';c.beginPath();c.arc(edge.x,edge.y,dist>83?4.2:5,0,Math.PI*2);c.fill();c.strokeStyle='#352b18';c.lineWidth=1.2;c.stroke()
 }
 for(const it of w.items){
  if((it.id==='mosque'&&!prayerGoal)||(it.ev&&it.ev.done)||(active&&it.id===active.id))continue;
  const p=P(it.x,it.z);if(Math.hypot(p.x,p.y)>87)continue;
  c.fillStyle=ERR.some(e=>e.id===it.id)?'rgba(255,155,93,.86)':'rgba(232,226,204,.72)';c.beginPath();c.arc(p.x,p.y,2.3,0,Math.PI*2);c.fill()
 }
 c.fillStyle='rgba(48,53,53,.8)';
 for(const n of w.npcs){const p=P(n.position.x,n.position.z);if(Math.hypot(p.x,p.y)<89){c.beginPath();c.arc(p.x,p.y,1.2,0,Math.PI*2);c.fill()}}
 // Player stays in the center, facing up.
 c.fillStyle='#fff2bd';c.strokeStyle='#202a30';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-8);c.lineTo(-5,5);c.lineTo(0,2);c.lineTo(5,5);c.closePath();c.fill();c.stroke();c.restore()
}
function walkActionLabel(it){if(!it)return'';const labels={mom:'تكلّم مع أمك',baker:'اذهب إلى الخبّاز',grocer:'اذهب إلى البقّال',pharm:'اذهب إلى الصيدلي',books:'اذهب إلى بائع الكتب',ow:'ساعد السيدة المسنّة',lost:'ساعد الطفل في العثور على أمه',change:'اشترِ التمر أو أعد المال الزائد',dare:'تكلّم مع صديقك',cat:'أطعم القطة',argue:'ساعد الجارين على التصالح'};if(it.id==='mosque')return(pPending&&!pDone)?'ادخل المسجد للصلاة':'زر المسجد';return labels[it.id]||'تفاعل'}
function walkLoop(dt){const w=WK;w.fc=(w.fc||0)+1;
 gmin+=dt*(window.__ts||.4);const h=hourNow();skyHour(h);{const dN=Math.floor(gmin/1440);if(dN!==lastDay){lastDay=dN;dayN=dN;buildPRY()}}
 let kk=-1;for(let i=0;i<PRY.length;i++)if(h>=PRY[i].h&&h<PRY[i].e)kk=i;
 if(kk!==pCur){pCur=kk;pPending=kk>=0;pDone=false;updQuest();if(kk>=0)say('حان وقت صلاة '+PRY[kk].n+' 🕌 المسجد في الساحة — اتبع الخريطة')}
 const due=pPending&&!pDone,nxt=(()=>{for(let i=0;i<PRY.length;i++)if(PRY[i].h>h)return PRY[i];return PRY[0]})();
 $('clk').classList.toggle('due',due);setH($('clkT'),fmtT(h));setH($('clkP'),due?('🕌 حان وقت '+PRY[pCur].n+' — المسجد في الساحة'):('الصلاة القادمة: '+nxt.n+' '+fmtT(nxt.h)));
 {const cb=$('clkB');cb.textContent=ramNow()?('🌙 رمضان '+ramDay()+(fastingNow()?' · صائم':'')):(wdNow()===5?'🕌 جمعة مباركة':'');cb.style.display=cb.textContent?'block':'none'}
 setH($('hud'),'الرصيد: ¥'+money+'<br><small style="opacity:.9;font-size:12px">'+(w.item?'معك: '+ERR[w.err].itemAr:'تجوّل وساعد الآخرين')+'</small>');
 const lock=!!(menuOpen||w.pray),fw=(K.KeyW||K.ArrowUp||ptr)?1:0,bw=(K.KeyS||K.ArrowDown)?1:0,tr=ptr?-clamp((ptr.x/innerWidth-.5)*2.4,-1,1):((K.KeyA||K.ArrowLeft)?1:0)-((K.KeyD||K.ArrowRight)?1:0),run=K.ShiftLeft||K.ShiftRight;
 const tgt=lock?0:(fw?(run?5.8:2.9):bw?-1.4:0);w.spd+=(tgt-w.spd)*Math.min(1,(tgt===0?10:7)*dt);if(!lock)w.yaw+=tr*(fw||bw?2.4:3.0)*dt;
 const fx=Math.sin(w.yaw),fz=Math.cos(w.yaw),nx=w.x+fx*w.spd*dt,nz=w.z+fz*w.spd*dt;if(!blocked(nx,w.z)&&!hitNpc(nx,w.z))w.x=nx;else w.spd*=.6;if(!blocked(w.x,nz)&&!hitNpc(w.x,nz))w.z=nz;else w.spd*=.6;
 const k2=Math.min(1,Math.abs(w.spd)/5.8);let o;
 if(Math.abs(w.spd)>.12){w.ph+=dt*Math.abs(w.spd)*2.6*(w.spd<0?-1:1);o=walkOff(w.ph,.2+.24*k2);o.lean=(o.lean||0)+.1*k2}else o={lean:.012*Math.sin(t*1.7)};
 easePose(w.pp,o,Math.min(1,10*dt));walkBodyPose(w.bones,w.pp);w.root.position.y=w.rootY+(Math.abs(w.spd)>.12?(.012+.012*k2)*Math.abs(Math.sin(w.ph)):0);
 w.boy.position.set(w.x,0,w.z);w.boy.rotation.y=w.yaw;syncWalkShadowAnchor(w.x,w.z);updateWalkGoalMarker(w,dt);
 for(const n of w.npcs)npcUpdate(n,dt);
 {const cu=w.cat.userData;cu.mixer.update(dt);cu.eatAmt+=(cu.eatTarget-cu.eatAmt)*(1-Math.exp(-6*dt));if(cu.eatAmt>.01){const a=-(1.0+Math.sin(t*5)*.14)*cu.eatAmt/2;cu.neck.forEach(b=>b.quaternion.multiply(_qn.setFromAxisAngle(_ex,a)))}}
 if(w.fol){const f=w.fol,n=f.npc,u=n.userData;u.mode='follow';const tx=w.x-fx*1.1-fz*.45,tz=w.z-fz*1.1+fx*.45,dx=tx-n.position.x,dz=tz-n.position.z,d=Math.hypot(dx,dz);
  if(d>.4){const sp=Math.min(2.0,.5+d*.8);n.position.x+=dx/d*sp*dt;n.position.z+=dz/d*sp*dt;turnYaw(n,Math.atan2(dx,dz),dt);u.ph+=dt*sp*4.8;walkBodyPose(u.bones,walkOff(u.ph,.26))}else walkBodyPose(u.bones,{});
  if(Math.hypot(w.x-f.dest.x,w.z-f.dest.z)<2.4&&Math.hypot(n.position.x-f.dest.x,n.position.z-f.dest.z)<4.5)f.done()}
 if(w.pray){const p=w.pray;p.t+=dt;const P=PRY[p.k],dur=P.r*2.4,f=clamp(p.t/dur,0,1);
  if(P.j&&f<.4){setH($('prT'),'خطبة الجمعة');setH($('prR'),'استماعٌ وإنصات')}else{setH($('prT'),(P.t?'':'الصلاة · ')+P.n);const f2=P.j?(f-.4)/.6:f;setH($('prR'),'الركعة '+Math.min(P.r,1+Math.floor(Math.max(0,f2)*P.r))+' / '+P.r)}$('prB').style.width=(f*100)+'%';
  if(p.t>=dur){w.pray=null;w.boy.visible=true;$('pray').style.display='none';pDone=true;updQuest();const rw=P.j?150:P.t?120:100;SV.prayers++;pay(rw,'تقبّل الله منا ومنك   \u2066+¥'+rw+'\u2069')}}
 let near=null,nd=1e9;for(const it of w.items){if(w.fol&&w.fol.npc===(it.ev&&it.ev.npc))continue;const d=Math.hypot(w.x-it.x,w.z-it.z);if(d<it.r&&d<nd){near=it;nd=d}}
 let gn=null;if(!near)for(const n of w.npcs){const u=n.userData;if(u.mode==='sit'||u.mode==='argue'||u.mode==='follow')continue;const d=Math.hypot(w.x-n.position.x,w.z-n.position.z);if(d<1.7&&d<nd){gn=n;nd=d}}
 const eNow=K.KeyE||actHeld,eE=eNow&&!w.pe;w.pe=!!eNow;
 if(!lock){if(near){$a.style.display='block';$a.textContent='اضغط E: '+walkActionLabel(near);if(eE)near.fn(near)}else if(gn){$a.style.display='block';$a.textContent='اضغط E لإلقاء السلام';if(eE)greet(gn)}else $a.style.display='none'}
 let cd=4.4;for(;cd>1.4;cd-=.5)if(!blocked(w.x-fx*cd,w.z-fz*cd,.25))break;
 const tp=new T.Vector3(w.x-fx*cd,2.3-(4.4-cd)*.25,w.z-fz*cd);w.cam.lerp(tp,1-Math.exp(-8*dt));const hl=hillJ(w.z);
 C.position.set(w.cam.x,w.cam.y+hl,w.cam.z);C.lookAt(w.x+fx*2.5,1.25+hl,w.z+fz*2.5);C.fov=run&&fw?64:58;C.updateProjectionMatrix();
 sky.position.copy(C.position);mt.position.set(C.position.x,0,C.position.z);cld.position.copy(C.position);gnd.position.set(0,0,WZ);
 goalsUpdate();drawWalkMap(w);R.render(S,C)}
function npcPlay(u,n,f){const a=u.acts&&u.acts[n];if(!a||u.cur===n)return;a.reset().fadeIn(f||.25).play();if(n==='idle')a.paused=true;if(u.cur&&u.acts[u.cur])u.acts[u.cur].fadeOut(f||.25);u.cur=n}
const ES=1.65,ELD_Y=.9-.169*ES;
function mkElder(){if(!REAL.elder)return mkElderPrim();
 const g=new T.Group(),m=T.SkeletonUtils.clone(REAL.elder.scene);m.scale.setScalar(ES);m.rotation.y=Math.PI;g.add(m);
 const mixer=new T.AnimationMixer(m),acts={};REAL.elder.animations.forEach(c=>{acts[c.name]=mixer.clipAction(c)});
 g.userData={cane:new T.Object3D(),arm:new T.Object3D(),hd:new T.Object3D(),mixer,acts,cur:null,real:true,waveBone:m.getObjectByName('arm-right'),waveAmt:0,waveTarget:0,bones:rigBones(m),walking:false,wph:0,seatY:ELD_Y};npcWaves.push(g.userData);if(npcWaves.length>10)npcWaves.shift();
 npcPlay(g.userData,'idle',.01);catMixers.push(mixer);catObjs.push({neck:[],eatAmt:0,eatTarget:0});if(catMixers.length>10){catMixers.shift();catObjs.shift()}return g}
function mkElderPrim(){const g=new T.Group(),rb=new T.Mesh(new T.CylinderGeometry(.17,.3,.75,10),L(0x5b7d5a)),hd=new T.Mesh(new T.SphereGeometry(.13,10,8),skin),hr=new T.Mesh(new T.SphereGeometry(.14,10,8,0,6.283,0,1.4),L(0xf1f1f1)),hat=new T.Mesh(new T.CylinderGeometry(.34,.34,.03,14),L(0xe2c98b)),cr=new T.Mesh(new T.CylinderGeometry(.13,.15,.11,10),L(0xe2c98b)),cane=new T.Mesh(cylG,L(0x6b4a2f)),bag=new T.Mesh(new T.BoxGeometry(.26,.26,.16),L(0x8a5a3a)),arm=new T.Mesh(cylG,skin);
 rb.position.y=.82;hd.position.y=1.32;hr.position.y=1.35;hat.position.y=1.5;cr.position.y=1.56;limb(cane,V(.3,0,0),V(.27,.95,0),.02);bag.position.set(-.3,.15,0);limb(arm,V(-.2,1.15,0),V(-.32,1.48,.05),.045);
 for(const k of[-1,1]){const lg=new T.Mesh(cylG,L(0x33333d));limb(lg,V(k*.08,0,0),V(k*.08,.5,0),.05);g.add(lg)}
 g.add(rb,hd,hr,hat,cr,cane,bag,arm);g.userData={cane,arm,hd};return g}
function mkShop(z,sg){const g=new T.Group(),f=-sg,b=new T.Mesh(new T.BoxGeometry(7,3.4,5),L(0xe8d9bd)),rf=new T.Mesh(new T.BoxGeometry(7.4,.3,5.4),roofM),aw=new T.Mesh(new T.BoxGeometry(2.2,.2,6.4),L(0xc0392b)),bd=new T.Mesh(new T.PlaneGeometry(3.6,.9),new T.MeshBasicMaterial({map:cv(256,64,q=>{q.fillStyle='#2b1d1a';q.fillRect(0,0,256,64);q.fillStyle='#ffd27a';q.font='bold 30px Georgia';q.textAlign='center';q.fillText('Corner Kitchen',128,42)})})),w=new T.Mesh(new T.PlaneGeometry(4,1.4),winM);
 b.position.y=1.7;rf.position.y=3.55;aw.position.set(f*3.9,2.8,0);bd.position.set(f*3.03,3.2,0);w.position.set(f*3.03,1.5,0);bd.rotation.y=w.rotation.y=f*Math.PI/2;
 for(const k of[-1,1]){const n=new T.Mesh(new T.SphereGeometry(.25,8,6),new T.MeshBasicMaterial({color:0xff5a3c}));n.position.set(f*4.6,2.5,k*3.1);g.add(n)}
 const gl=new T.Sprite(glowM);gl.position.set(f*3.6,1.5,0);gl.scale.set(9,6,1);g.add(b,rf,aw,bd,w,gl);g.position.set(cx(z)+sg*9.5,0,z);g.rotation.y=Math.atan(dcx(z));S.add(g);return g}
function spawn(){{const kd=passKind==='kid';MS[1].t=kd?"Brother's school run":'Grandpa needs a ride';MS[1].d=kd?'Stop and help your little brother onto the back seat.':'Stop and help him onto the back seat.';MS[2].t=kd?'Take him to school':'Take him home';MS[2].d=kd?'Ride gently to the school gate. No speeding.':'Ride gently to his house. No speeding, no swerving.'}const RG={0:[100,170],1:[130,190],3:[140,220],4:[120,190],5:[110,170],6:[120,180],7:[100,150],8:[120,190],9:[90,140]}[mi]||[110,140];const z=-(s+RG[0]+Math.random()*(RG[1]-RG[0]));let g;prog=0;
 if(mi===0){g=mkCat();place(g,z,1,4.6);g.scale.setScalar(g.userData.acts?1:1.8);catStage=0}else if(mi===1){g=elder=(passKind==='kid'?mkKid():mkElder());place(g,z,-1,4.4)}else if(mi===2)g=passKind==='kid'?mkSchool(z,-1):(biomeAt(z)===6?mkDoor(-1,z):house(S,-1,z,()=>.5));else if(mi===4)g=biomeAt(z)===6?mkDoor(1,z):house(S,1,z,()=>.5);else if(mi===5){g=mkWallet();g.position.set(cx(z)+(Math.random()-.5)*2.2,.04,z);g.rotation.y=Math.random()*6;S.add(g)}else if(mi===6){g=mkOwner();place(g,z,Math.random()<.5?-1:1,4.4)}else if(mi===7)g=biomeAt(z)===6?mkDoor(1,z):mkShop(z,1);else if(mi===8){g=mkOwner();place(g,z,Math.random()<.5?-1:1,4.4);if(jobLeft<=0)jobLeft=40}else if(mi===9){const sgh=Math.random()<.5?-1:1,city=biomeAt(z)===6;g=city?mkDoor(sgh,z):house(S,sgh,z,()=>.5);if(mom)S.remove(mom);mom=mkOwner();place(mom,z+1,sgh,city?6.3:8.2)}else g=biomeAt(z)===6?mkDoor(1,z):mkShop(z,1);
 const m=beam();m.position.copy(g.position);S.add(m);tg={g,m,sd:-z}}
function buy(i){if(money<COST[i])return;money-=COST[i];menuOpen=false;$menu.style.display='none';fan();coin();say(['You eat the onigiri on a bench. So good.','Warm taiyaki, red bean still hot.','Steaming ramen at sunset. Perfect.'][i]);SV.shops++;SV.money=money;svSave();claimDaily();clr();mi=pickNext();spawn()}
const shopMenuHTML=$menu.innerHTML;let menuMode='shop';
function confessChoice(i){menuOpen=false;$menu.style.display='none';$menu.innerHTML=shopMenuHTML;menuMode='shop';
 if(i===0){money+=30;SV.money=money;svSave();fan();coin();say('The neighbor smiles: "Thank you for telling me. Let\'s fix it together." +¥30')}
 else{say('The neighbor looks a little sad and walks back inside. No one saw... but you did.')}
 clr();mi=pickNext();spawn()}
$menu.addEventListener('click',e=>{const i=e.target.dataset.i;if(i==null)return;if(menuMode==='confess')confessChoice(+i);else if(menuMode==='call')callChoice(+i);else if(menuMode==='fam')famChoice(+i);else if(menuMode==='fast')fastChoice(+i);else if(menuMode==='quiz')quizChoice(+i);else if(menuMode==='pm')pmChoice(+i);else if(menuMode==='dlg')dlgChoice(+i);else buy(+i)});
addEventListener('keydown',e=>{if(!menuOpen||!/^Digit[123]$/.test(e.code))return;const i=Number(e.code.slice(-1))-1,btn=$menu.querySelector('button[data-i="'+i+'"]');if(btn){e.preventDefault();btn.click()}});
function mis(dt){
 if(!started)return;
 if(msgT>0&&(msgT-=dt)<=0)$t.style.opacity=0;
 const act=K.KeyE||K.KeyF||K.Enter||actHeld,edge=act&&!pact;pact=act;let lab='';
 if(wait>0){setH($m,'<b>Well done</b>');if((wait-=dt)<=0){mi=pickNext();spawn()}$a.style.display='none';return}
 const d=tg.sd-s,zone=Math.abs(d)<13,near=zone&&v<2.5;if(tg.m&&tg.m.children[0]){const f=clamp(Math.abs(d)/28,.04,1);tg.m.children[0].material.opacity=.3*f;if(tg.m.children[1])tg.m.children[1].material.opacity=.9*f}if(zone&&!near&&mi!==2)lab='Slow down: hold S to stop';
 if(d<-25){if(mi!==2)S.remove(tg.g);clr();spawn();say('Missed it! Another one is ahead.');return}
 if(mi===0){const u=tg.g.userData;if(u.acts)catPlay(u,(catStage===2&&act)?'eat':(catStage===3&&act)?'gesture-positive':'idle');u.tail.rotation.y=Math.sin(t*4)*.35;u.blink-=dt;if(u.blink<0){u.eyes.forEach(e=>e.scale.y=.1);if(u.blink<-.12){u.eyes.forEach(e=>e.scale.y=1);u.blink=2+Math.random()*3}}
  u.alert=Math.max(0,u.alert-dt);const lookAmt=Math.abs(d)<20?clamp(1-Math.abs(d)/20,0,1):0;u.head.rotation.y=(lookAmt)*(d<0?-.5:.5)*(1-u.alert);
  if(!near)u.head.rotation.x=Math.max(0,u.head.rotation.x-dt*2);
  const stopped=near&&v<.3;
  if(catStage===0){if(stopped){lab='Press E: park the bike here';if(edge){catStage=1;say('Bike parked. Now get the water out.')}}else if(near)lab='Come to a full stop to park';}
  else if(catStage===1){if(!boyAtGoal())lab='Walking to the cat...';else{if(edge){catStage=2;bottle.visible=true;say('Got the water bottle.')}lab='Press E: take out the water bottle'}}
  else if(catStage===2){lab='Hold E: pour the water';if(act){prog=Math.min(1,prog+dt/1.8);u.head.rotation.x=.5+Math.sin(wt+=dt*10)*.15;u.wat.scale.setScalar(.2+.8*prog);
   if(prog>=1){fan();meow();money+=20;SV.money=money;SV.cats++;svSave();claimDaily();say('The cat drinks happily. +¥20');bottle.visible=false;catStage=3;prog=0}}}
  else if(catStage===3){lab='Hold E: pet the cat';if(act){prog=Math.min(1,prog+dt/1.1);u.tail.rotation.y=Math.sin(t*14)*.5;if(prog>=1){purr();say('The cat purrs and rubs your leg.');SV.helped=(SV.helped||0)+1;catStage=0;catPlay(u,'idle');clr();wait=2.6}}}}
 else if(mi===1){const u=tg.g.userData;if(u.real){npcPlay(u,'idle');u.waveTarget=Math.abs(d)<30?1:0}if(Math.abs(d)<28){u.arm.rotation.z=Math.sin(t*5)*.35;u.hd.rotation.y=Math.sin(t*2)*.15}
  if(near){lab='Hold E: help him up';if(act){prog+=dt/.9;if(prog>=1&&elder.userData.real){startBoard();comfort=100;clr();mi=2;spawn()}else if(prog>=1){S.remove(elder);inner.add(elder);elder.position.set(0,elder.userData.real?ELD_Y:.5,elder.userData.real?1.2:.74);elder.rotation.set(0,0,0);elder.scale.setScalar(elder.userData.real?1:.75);if(elder.userData.real){elder.userData.waveTarget=0;npcPlay(elder.userData,'sit')}elder.userData.cane.visible=false;elder.userData.arm.rotation.z=0;comfort=100;say('Hop on, grandpa! Easy does it.');clr();mi=2;spawn()}}}}
 else if(mi===2){if(!elderIn)elder.rotation.z=Math.sin(t*2)*.05-lv*.03;elder.userData.hd.rotation.y=Math.sin(t*.8)*.25;
  if(v>8||Math.abs(lv)>3.2){comfort=Math.max(0,comfort-12*dt);if(msgT<=0)say('Slow down, dear!')}
  if(near&&elder.userData.real){startAlight();return}
  if(near){inner.remove(elder);S.add(elder);elder.position.set(tg.g.position.x+3.9,0,tg.g.position.z);elder.rotation.set(0,-Math.PI/2,0);elder.scale.setScalar(1);elder.userData.cane.visible=true;if(elder.userData.real)npcPlay(elder.userData,'emote-yes');elder.userData.arm.rotation.z=1.4;const tip=100+Math.round(comfort*4);money+=tip;SV.money=money;SV.elders++;svSave();claimDaily();fan();coin();say('Grandpa gives you ¥'+tip+' and a bow. Thank you, young man!');clr();wait=4;$a.style.display='none';return}}
 else if(mi===5){const nw=Math.abs(d)<3&&v<.6;
  if(walletStage===0){if(nw){lab='Press E: pick up the wallet';if(edge){walletStage=1;walletT=0;say('Someone dropped this. It is a trust (amanah) \u2014 we will find the owner.')}}else if(zone)lab='Stop right at the wallet'}
  else if(boyAtGoal()){walletT+=dt;if(walletT>.9&&tg.g.visible){tg.g.visible=false;walletHeld=true}if(walletT>1.8){walletStage=0;say('You have the wallet. Ride on and find its owner.');clr();mi=6;spawn()}}}
 else if(mi===6){const u=tg.g.userData;if(u.real){npcPlay(u,'idle');u.waveTarget=Math.abs(d)<35?1:0}const nw=Math.abs(d)<4.5&&v<.6;
  if(walletStage===0){if(nw){lab='Press E: give the wallet back';if(edge){walletStage=2;walletT=0;say('Excuse me, you dropped this.')}}else if(zone)lab='Stop next to the owner'}
  else if(boyAtGoal()){walletT+=dt;if(walletT>1.8){money+=150;SV.helped=(SV.helped||0)+1;SV.money=money;svSave();fan();coin();say('Thank you, honest boy!  +\u00a5150   \u2067\u062c\u0632\u0627\u0643 \u0627\u0644\u0644\u0647 \u062e\u064a\u0631\u064b\u0627\u2069');walletHeld=false;walletStage=0;if(u.real){u.waveTarget=1;u.waveFar=true;u.grp=tg.g}clr();wait=6;$a.style.display='none';return}}}
 else if(mi===7){const nw=Math.abs(d)<4.5&&v<.6;
  if(jobStage===0){if(nw){lab='Press E: go in and get the parcel';if(edge){jobStage=1;jobT=0;say('Collecting the parcel...')}}else if(zone)lab='Stop at the shop'}
  else if(boyAtGoal()){jobT+=dt;if(jobT>.8)jobHas=true;if(jobT>1.8){jobStage=0;jobT=0;jobLeft=0;say('Parcel ready! Deliver it on time.');clr();mi=8;spawn();jobLeft=30+Math.round((tg.sd-s)/6)}}}
 else if(mi===8){const u=tg.g.userData;if(u.real){npcPlay(u,'idle');u.waveTarget=Math.abs(d)<35?1:0}
  if(jobStage!==3&&!callOpen)jobLeft-=dt;MS[8].d='Hand the parcel to the customer  ⏱ '+fmtMS(jobLeft);const nw=Math.abs(d)<4.5&&v<.6;
  if(jobStage===0){if(nw){lab='Press E: hand over the parcel';if(edge){jobStage=3;jobT=0}}else if(zone)lab='Stop next to the customer'}
  else if(jobStage===3&&boyAtGoal()){jobT+=dt;if(jobT>1.6){const late=jobLeft<=0,pay=late?90:130+Math.min(70,Math.round(jobLeft*1.2));money+=pay;SV.money=money;SV.earned+=pay;SV.jobs++;svSave();fan();coin();say(late?'Thank you — a little late, but honest work.  +¥'+pay:'Thank you, right on time!  +¥'+pay+'  (halal earnings)');jobStage=0;jobHas=false;jobLeft=0;if(u.real){u.waveTarget=1;u.waveFar=true;u.grp=tg.g}clr();wait=5;$a.style.display='none';return}}}
 else if(mi===9){const nw=Math.abs(d)<5&&v<.6;
  if(famStage===0){if(nw){lab='Press E: go to Mom';if(edge){famStage=1;say('Mom is waiting for you...')}}else if(zone)lab='Stop at home'}
  else if(famStage===1&&boyAtGoal())openFam()}
 else if(mi===3&&near&&!menuOpen){lab='Press E: go in';if(edge){if(fastingNow()){menuMode='fast';menuOpen=true;$menu.innerHTML='<div><span style="direction:rtl;font-size:19px">🌙 أنت صائم اليوم<br><small style="direction:ltr;display:block;opacity:.85">It is Ramadan and you are fasting until Maghrib (18:00). Eating now breaks your fast.</small></span><button data-i="0">I will wait for iftar</button><button data-i="1">Eat anyway (break my fast)</button></div>';$menu.style.display='flex'}else{menuOpen=true;$menu.style.display='flex';[...$menu.querySelectorAll('button')].forEach((b,i)=>b.disabled=money<COST[i])}}}
 else if(mi===4&&near&&!menuOpen){lab='Press E';if(edge){nz(3200,.35,.22,'highpass',1.4);nz(1200,.25,.14,'bandpass',3);say('Crash! Your ball just broke the neighbor\'s window.',2.2);
  menuMode='confess';menuOpen=true;$menu.innerHTML='<div><span>The neighbor comes out: "Who did this?"</span><button data-i="0">Tell the truth</button><button data-i="1">Say nothing and ride off</button></div>';$menu.style.display='flex'}}
 const c=Math.ceil(comfort/20);
 setH($m,'<b>'+MS[mi].t+'</b><br>'+MS[mi].d+'<br>'+(Math.abs(d)>12?Math.round(Math.abs(d)/5)*5+' m ahead':'right here')+(mi===2?'<br>Comfort '+'★'.repeat(c)+'☆'.repeat(5-c):''));
 $a.style.display=lab?'block':'none';if($a.textContent!==lab)$a.textContent=lab}
// obstacles and physics
const OB=[],PR=[],whT=tex([[0,'rgba(255,255,255,1)'],[1,'rgba(255,255,255,0)']]);
let by=0,bvy=0,gh=0,pgh=0,air=false,sy=0,sv=0,shk=0,wob=0,slip=0,nextO=45,pi=0;
for(let i=0;i<40;i++){const q=new T.Sprite(new T.SpriteMaterial({map:whT,transparent:true,depthWrite:false}));q.visible=false;S.add(q);PR.push({q,vx:0,vy:0,vz:0,l:0})}
const skidG=new T.PlaneGeometry(.08,.5).rotateX(-Math.PI/2),SK=[];for(let i=0;i<28;i++){const m=new T.Mesh(skidG,new T.MeshBasicMaterial({color:0x141414,transparent:true,opacity:0,depthWrite:false}));m.visible=false;S.add(m);SK.push({m,l:0})}
let ski=0;function skidMark(x,z,yaw){const o=SK[ski++%28];o.m.visible=true;o.m.position.set(x,.015,z);o.m.rotation.y=yaw;o.m.material.opacity=.5;o.l=4}
const RG=[];for(let i=0;i<10;i++){const q=new T.Sprite(new T.SpriteMaterial({map:whT,transparent:true,depthWrite:false,opacity:0}));q.visible=false;S.add(q);RG.push({q,l:0,sc:0})}
let ri=0;function puffRing(x,y,z,col,sc0){const o=RG[ri++%10];o.q.visible=true;o.q.position.set(x,y,z);o.q.material.color.set(col);o.sc=sc0||.3;o.q.scale.setScalar(o.sc);o.q.material.opacity=.55;o.l=.45}
function burst(x,y,z,n,col,sp){for(let k=0;k<n;k++){const p=PR[pi++%40];p.q.visible=true;p.q.position.set(x,y,z);p.vx=(Math.random()-.5)*sp;p.vy=Math.random()*sp+.6;p.vz=(Math.random()-.5)*sp;p.l=.75;p.q.material.color.set(col);p.q.scale.setScalar(.22+Math.random()*.22)}}
function nz(f,d,g,ty,q){if(!AC)return;const s=AC.createBufferSource(),fl=AC.createBiquadFilter(),gn=AC.createGain(),t=AC.currentTime;s.buffer=NB;fl.type=ty||'lowpass';fl.frequency.value=f;fl.Q.value=q||1;gn.gain.setValueAtTime(g,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(gn);gn.connect(mg);s.start(0,Math.random());s.stop(t+d+.05)}
const crT=cv(64,64,q=>{q.fillStyle='#a9773f';q.fillRect(0,0,64,64);q.strokeStyle='#5a3b1e';q.lineWidth=6;q.strokeRect(3,3,58,58);q.beginPath();q.moveTo(3,3);q.lineTo(61,61);q.moveTo(61,3);q.lineTo(3,61);q.stroke()});
const coneG=new T.ConeGeometry(.2,.56,10),ringG=new T.CylinderGeometry(.115,.13,.08,10),cbG=new T.BoxGeometry(.42,.04,.42),bxG=new T.BoxGeometry(.8,.8,.8),sphG=new T.SphereGeometry(1,8,6);
const wedge=new T.Shape();wedge.moveTo(0,0);wedge.lineTo(3.4,0);wedge.lineTo(3.4,.7);
const rampG=new T.ExtrudeGeometry(wedge,{depth:2.4,bevelEnabled:false}).translate(0,0,-1.2).rotateY(Math.PI/2);
const coneM=L(0xff7a2a),ringM=L(0xf5f5f5),darkM=L(0x2b2b30),crM=L(0xffffff,{map:crT}),rampM=L(0x9a6b45),dogM=L(0x8a5a34),dkM=L(0x3a2418),redM=L(0xd63b3b),orgM=L(0xf0a030),whM=L(0xf4efe6);
const OT={c:{h:.6,r:.3,slow:.92,kick:1,shk:.15,gy:.28},x:{h:.8,r:.55,slow:.5,kick:3,shk:.5,gy:.4},h:{h:.4,r:.25,slow:.96,kick:1,shk:.1,gy:0,an:1,spd:1.3},d:{h:.6,r:.45,slow:.75,kick:2,shk:.3,gy:0,an:1,spd:2.6},r:{h:0,r:0,gy:0},p:{h:0,r:0,gy:0},o:{h:0,r:0,gy:.75}};
function mkOb(k){const g=new T.Group(),m=(ge,ma,x,y,z,a,b,c)=>{const e=new T.Mesh(ge,ma);e.position.set(x||0,y||0,z||0);if(a)e.scale.set(a,b,c);g.add(e);return e};
 if(k==='c'){m(coneG,coneM);m(ringG,ringM,0,.06);m(cbG,darkM,0,-.28)}
 else if(k==='x')m(bxG,crM);
 else if(k==='r')m(rampG,rampM);
 else if(k==='p')m(new T.CircleGeometry(1,20).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x9cc3e0,transparent:true,opacity:.7}),0,.05,0,1.5,1,1.3);
 else if(k==='o')m(coinG,coinM);else if(k==='h'){m(sphG,whM,0,.22,0,.13,.12,.17);m(sphG,whM,0,.33,-.14,.06,.06,.06);m(sphG,redM,0,.4,-.14,.02,.03,.04);m(sphG,orgM,0,.32,-.2,.02,.02,.04);m(cylG,orgM,-.04,.07,0,.012,.14,.012);m(cylG,orgM,.04,.07,0,.012,.14,.012);const wL=m(bxG,whM,-.12,.24,.03,.02,.08,.13),wR=m(bxG,whM,.12,.24,.03,.02,.08,.13);g.userData.wings=[wL,wR]}
 else{m(sphG,dogM,0,.34,0,.14,.15,.32);m(sphG,dogM,0,.46,-.34,.1,.1,.1);m(sphG,dkM,0,.42,-.44,.05,.04,.05);m(sphG,dkM,-.08,.54,-.32,.04,.07,.03);m(sphG,dkM,.08,.54,-.32,.04,.07,.03);[[-.08,-.2],[.08,-.2],[-.08,.2],[.08,.2]].forEach(q=>m(cylG,dogM,q[0],.13,q[1],.035,.26,.035));m(cylG,dkM,0,.44,.36,.03,.22,.03).rotation.x=.9}
 return g}
function add(k,sd,l,dir){const g=mkOb(k),o=Object.assign({k,g,sd,l,dir:dir||(Math.random()<.5?-1:1)},OT[k]);if(o.an)o.l=-o.dir*3.6;g.rotation.y=Math.atan(dcx(-sd));S.add(g);OB.push(o)}
function gen(sd){if(tg&&Math.abs(sd-tg.sd)<20)return;const r=Math.random(),rl=(a,b)=>a+Math.random()*(b-a);if(Math.random()<.6){const l0=rl(-2,2);for(let k=0;k<5;k++)add('o',sd+9+k*1.6,l0+Math.sin(k*.9)*.5)}
 if(r<.2){const l0=rl(-2.7,-.6);for(let k=0;k<4;k++)add('c',sd,l0+k*.8)}
 else if(r<.34){add('x',sd,rl(-2.2,2.2));if(Math.random()<.4)add('x',sd+1.4,rl(-2.2,2.2))}
 else if(r<.5)add('r',sd,rl(-1.5,1.5));
 else if(r<.68)add('p',sd,rl(-1.5,1.5));
 else if(r<.86){const n=2+(Math.random()*2|0),dr=Math.random()<.5?-1:1;for(let k=0;k<n;k++)add('h',sd+k*.9,0,dr)}
 else add('d',sd,0)}
function scare(){OB.forEach(o=>{if(o.an&&!o.dyn&&!o.fin&&o.sd-s>0&&o.sd-s<45){o.go=1;o.flee=1;o.dir=o.l>=0?1:-1}})}
function obs(dt,px,z,yaw){
 if(!started)return;
 if(nextO<s)nextO=s+40;
 while(nextO<s+200){gen(nextO);nextO+=(22-8*Math.min(1,s/1500))+Math.random()*(28-14*Math.min(1,s/1500))}
 pgh=gh;gh=0;slip-=dt;const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
 for(let i=OB.length-1;i>=0;i--){const o=OB[i],g=o.g;
  if(o.dyn){o.vy-=18*dt;g.position.x+=o.vx*dt;g.position.y+=o.vy*dt;g.position.z+=o.vz*dt;
   if(g.position.y<o.gy){g.position.y=o.gy;o.vy=o.vy<-1.5?-o.vy*.35:0;o.vx*=.85;o.vz*=.85;o.sp*=.9}
   g.rotation.x+=o.sp*dt;g.rotation.z+=o.sp*.6*dt}
  else{
   if(o.an&&!o.fin&&!o.hurt){const ds=o.sd-s;if(!o.go&&ds<30&&ds>0)o.go=1;
    if(o.go){o.l+=o.dir*(o.flee?5.5:o.spd)*dt;o.bob=Math.abs(Math.sin(t*(o.flee?18:11)))*.06;g.rotation.y=-o.dir*Math.PI/2;if(g.userData.wings){const fl=Math.sin(t*(o.flee?28:16));g.userData.wings[0].rotation.z=-.3-fl*.7;g.userData.wings[1].rotation.z=.3+fl*.7}if(Math.abs(o.l)>5.6){o.go=0;o.fin=1;o.bob=0}}}
   g.position.set(cx(-o.sd)+o.l,o.gy+(o.bob||0),-o.sd)}
  if(o.k==='o')g.rotation.y=t*3+o.sd;
  if(g.position.z>z+45){if(hurtAnimal===o)hurtAnimal=null;S.remove(g);OB.splice(i,1);continue}
  const dx=px-g.position.x,dz=z-g.position.z;
  if(o.k==='o'){if(Math.abs(s-o.sd)<1&&Math.abs(l-o.l)<1&&by<1.6){money+=10;coins++;coin();burst(g.position.x,.8,g.position.z,5,0xffd54a,3);S.remove(g);OB.splice(i,1)}continue}
  if(o.k==='r'){const u=(s-o.sd)/3.4;if(u>=0&&u<=1&&Math.abs(l-o.l)<1.2)gh=Math.max(gh,.7*u);continue}
  if(o.k==='p'){if(Math.abs(s-o.sd)<1.8&&Math.abs(l-o.l)<1.6&&by<.12){if(!o.in){o.in=1;splash();puffRing(g.position.x,.05,g.position.z,0xbfe3ff,.35)}slip=.7;v*=Math.exp(-.55*dt);lv+=(Math.random()-.5)*dt*22;if(Math.random()<.6)burst(px+(Math.random()-.5)*.6,.08,z+.35,2,0xdff3ff,5.5)}else o.in=0;continue}
  if(!o.hit&&by<o.h&&dx*dx+dz*dz<(o.r+.45)*(o.r+.45)){
   o.hit=true;bumps++;const cx0=g.position.x,cy0=Math.max(.25,by+.2),cz0=g.position.z;
   if(o.an){o.hurt=true;o.go=0;o.bob=0;g.rotation.z=1.35;hurtAnimal=o;healProg=0;v*=.85;shk=Math.max(shk,.22);wob=Math.max(wob,.3);
    if(o.k==='h'){cluck();burst(cx0,cy0,cz0,4,0xc9a26a,2.2);burst(cx0,cy0+.1,cz0,5,0xf4efe6,1.8);say('The chicken got hurt — stop and call for help.')}
    else{nz(220,.22,.22,'lowpass',.6);burst(cx0,cy0,cz0,5,0x8a5a34,2.4);say('The dog yelped — stop and call for help.')}}
   else{o.dyn=true;const f=v*.9+2;o.vx=fx*f+(Math.random()-.5)*4;o.vz=fz*f;o.vy=2.5+v*.25;o.sp=(Math.random()-.5)*14;
    v*=o.slow;lv+=(Math.random()-.5)*o.kick;shk=Math.max(shk,o.shk);wob=Math.max(wob,o.shk*1.5);
    nz(o.k==='c'?1600:170,.22,.32,o.k==='c'?'bandpass':'lowpass',o.k==='c'?.26:.4);burst(cx0,cy0,cz0,8,o.k==='c'?0xff8a2a:0xc9a26a,4.6);puffRing(cx0,cy0,cz0,o.k==='c'?0xffb066:0xd9c9a8,.38)}}}
 if(gh>.05)v*=Math.exp(-.35*dt);
 if(pgh>.3&&gh<.05&&!air&&by>=pgh-.06)bvy=Math.max(3,v*.42);
 if(by>gh+.02||bvy>0){bvy-=15*dt;by+=bvy*dt;air=true}
 if(by<=gh){if(air){if(bvy<-3){jumps++;shk=Math.max(shk,Math.min(.5,-bvy*.05));sv=bvy*.3;nz(220,.25,.45);burst(px,.1,z,8,0xc9a26a,3.5)}air=false}by=gh;bvy=0}
 sv+=(-90*sy-9*sv)*dt;sy+=sv*dt;shk*=Math.exp(-5*dt);
 for(const p of PR)if(p.q.visible){p.l-=dt;if(p.l<=0){p.q.visible=false;continue}p.vy-=9*dt;p.q.position.x+=p.vx*dt;p.q.position.y+=p.vy*dt;p.q.position.z+=p.vz*dt;p.q.material.opacity=p.l/.7}}
// polish: performance, scenery, dusk cycle, music, pause
const setH=(el,x)=>{if(el._h!==x){el._h=x;el.innerHTML=x}};
let pr=Math.min(devicePixelRatio,1.5),ema=.016,acc=0,pt=0,noUp=false,coins=0,jumps=0,bumps=0,paused=false;const PMAX=Math.min(devicePixelRatio,2);
function adapt(dt){ema+=(dt-ema)*.05;acc+=dt;if(acc<2)return;acc=0;
 if(ema>.024&&pr>.6){pr=Math.max(.6,pr-.2);noUp=true;R.setPixelRatio(pr);rs()}else if(!noUp&&ema<.0185&&pr<PMAX){pr=Math.min(PMAX,pr+.15);R.setPixelRatio(pr);rs()}}
function merge(g){g.updateMatrixWorld(true);const B=new Map(),rm=[];
 g.traverse(o=>{if(o.isMesh&&!o.userData.keep){const ge=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);if(!B.has(o.material))B.set(o.material,[]);B.get(o.material).push(ge);rm.push(o)}});
 rm.forEach(o=>o.parent.remove(o));
 B.forEach((a,m)=>{let n=0;a.forEach(x=>n+=x.attributes.position.count);const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let i=0;
  a.forEach(x=>{P.set(x.attributes.position.array,i*3);N.set(x.attributes.normal.array,i*3);U.set(x.attributes.uv.array,i*2);i+=x.attributes.position.count;x.dispose()});
  const ge=new T.BufferGeometry();ge.setAttribute('position',new T.BufferAttribute(P,3));ge.setAttribute('normal',new T.BufferAttribute(N,3));ge.setAttribute('uv',new T.BufferAttribute(U,2));const merged=new T.Mesh(ge,m);merged.castShadow=walkMode&&!m.transparent;merged.receiveShadow=walkMode;g.add(merged);g.userData.d.push(ge)})}
const flM=[0xf7a1c4,0xffffff,0xffe066,0xc89bff].map(c=>L(c,{emissive:c,emissiveIntensity:.25})),fG=new T.SphereGeometry(.09,5,4),stG=new T.CylinderGeometry(.012,.012,.22,4).translate(0,.11,0);
const coinG=new T.CylinderGeometry(.22,.22,.04,14).rotateX(Math.PI/2),coinM=L(0xffc93c,{emissive:0x664400});
function bush(g,x,z,s,r){const m=foliage[(r()*5)|0];for(const q of[[0,0],[.5,.2],[-.45,.15]]){const b=new T.Mesh(leafG,m);b.position.set(x+q[0]*s,.35*s,z+q[1]*s);b.scale.set(.6*s,.45*s,.6*s);g.add(b)}}
function flowers(g,x,z,r){const m=flM[(r()*4)|0];for(let k=0;k<6;k++){const px=x+(r()-.5)*1.4,pz=z+(r()-.5)*1.4,f=new T.Mesh(fG,m),st=new T.Mesh(stG,foliage[0]);f.position.set(px,.25,pz);st.position.set(px,0,pz);g.add(f,st)}}
const mtM=mt.children.map(m=>{m.material.userData.c0=m.material.color.clone();return m.material});
const stars=(()=>{const a=new Float32Array(600);for(let i=0;i<200;i++){const u=Math.random()*6.283,y=.12+Math.random()*.85,r=Math.sqrt(1-y*y);a[i*3]=Math.cos(u)*r*420;a[i*3+1]=y*420;a[i*3+2]=Math.sin(u)*r*420}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));const p=new T.Points(g,new T.PointsMaterial({color:0xfff4dc,size:2,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));p.frustumCulled=false;return p})();cld.add(stars);
const PA=[V(.91,.59,.5),V(.85,.5,.62),V(.24,.22,.47)],PB=[V(.42,.24,.36),V(.24,.18,.4),V(.04,.05,.16)],fcol=new T.Color();
const KF=[
 {h:0,hor:[.06,.07,.16],mid:[.05,.06,.15],top:[.02,.03,.09],su:0,sdY:-.34,hemi:.42,sun:.1,mt:.2,cl:.1,st:1,lamp:1.8,glow:.95},
 {h:4.5,hor:[.14,.16,.3],mid:[.1,.12,.26],top:[.04,.06,.16],su:0,sdY:-.3,hemi:.45,sun:.1,mt:.22,cl:.12,st:.8,lamp:1.6,glow:.9},
 {h:5.6,hor:[.88,.58,.52],mid:[.62,.5,.66],top:[.2,.26,.52],su:.8,sdY:.02,hemi:.75,sun:.55,mt:.7,cl:.6,st:0,lamp:.5,glow:.6},
 {h:7.5,hor:[.95,.86,.76],mid:[.62,.76,.94],top:[.3,.52,.88],su:1,sdY:.35,hemi:1,sun:1.15,mt:1,cl:.85,st:0,lamp:0,glow:.5},
 {h:12,hor:[.82,.9,.97],mid:[.52,.74,.96],top:[.24,.5,.92],su:1,sdY:.8,hemi:1.1,sun:1.3,mt:1,cl:.9,st:0,lamp:0,glow:.5},
 {h:15.5,hor:[.96,.84,.64],mid:[.72,.72,.88],top:[.3,.46,.82],su:1,sdY:.45,hemi:1,sun:1.15,mt:1,cl:.85,st:0,lamp:0,glow:.5},
 {h:17.8,hor:[.91,.59,.5],mid:[.85,.5,.62],top:[.24,.22,.47],su:1,sdY:.16,hemi:.95,sun:1.22,mt:1,cl:.8,st:0,lamp:0,glow:.55},
 {h:19.3,hor:[.42,.24,.36],mid:[.24,.18,.4],top:[.04,.05,.16],su:0,sdY:-.34,hemi:.45,sun:.12,mt:.22,cl:.12,st:1,lamp:1.8,glow:.95},
 {h:20.8,hor:[.06,.07,.16],mid:[.05,.06,.15],top:[.02,.03,.09],su:0,sdY:-.34,hemi:.42,sun:.1,mt:.2,cl:.1,st:1,lamp:1.8,glow:.95},
 {h:24,hor:[.06,.07,.16],mid:[.05,.06,.15],top:[.02,.03,.09],su:0,sdY:-.34,hemi:.42,sun:.1,mt:.2,cl:.1,st:1,lamp:1.8,glow:.95}];
function skyHour(hr){let i=0;while(i<KF.length-2&&hr>=KF[i+1].h)i++;const a=KF[i],b=KF[i+1],t0=clamp((hr-a.h)/(b.h-a.h),0,1),t=t0*t0*(3-2*t0),L2=(x,y)=>x+(y-x)*t,v3=(k,o)=>o.set(L2(a[k][0],b[k][0]),L2(a[k][1],b[k][1]),L2(a[k][2],b[k][2]));
 const u=sky.material.uniforms;v3('hor',u.hor.value);v3('mid',u.mid.value);v3('top',u.top.value);u.su.value=L2(a.su,b.su);u.sd.value.set(-.55,L2(a.sdY,b.sdY),-.82).normalize();
 const hz=u.hor.value;fcol.setRGB(hz.x,hz.y,hz.z);S.fog.color.copy(fcol);S.background.copy(fcol);
 const hi=L2(a.hemi,b.hemi),si=L2(a.sun,b.sun);hemi.intensity=hi+(walkMode?.32:0);sunL.intensity=si+(walkMode?.10:0);hemi.color.setHex(walkMode?0xfff1df:0xffc49a);hemi.groundColor.setHex(walkMode?0x85858b:0x5a4a4a);sunL.color.setHex(walkMode?0xffedda:0xff9d5c);warmFill.intensity=walkMode?.14+si*.12:0;skyFill.intensity=walkMode?.14+hi*.10:0;const mt=L2(a.mt,b.mt);mtM.forEach(m=>m.color.copy(m.userData.c0).multiplyScalar(mt));
 const cl=L2(a.cl,b.cl);cld.children.forEach(c=>{if(c.material)c.material.opacity=cl});stars.material.opacity=L2(a.st,b.st);lamp.intensity=L2(a.lamp,b.lamp);glowM.opacity=L2(a.glow,b.glow)}
function dusk(k){const u=sky.material.uniforms;['hor','mid','top'].forEach((n,i)=>u[n].value.lerpVectors(PA[i],PB[i],k));u.su.value=1-k;u.sd.value.set(-.55,.16-.5*k,-.82).normalize();
 const hz=u.hor.value;fcol.setRGB(hz.x,hz.y,hz.z);S.fog.color.copy(fcol);S.background.copy(fcol);
 hemi.intensity=.95-.5*k+(walkMode?.32:0);sunL.intensity=1.1*(1-k)+.12+(walkMode?.10:0);hemi.color.setHex(walkMode?0xfff1df:0xffc49a);hemi.groundColor.setHex(walkMode?0x85858b:0x5a4a4a);sunL.color.setHex(walkMode?0xffedda:0xff9d5c);warmFill.intensity=walkMode?.14+.15*(1-k):0;skyFill.intensity=walkMode?.14+.065*(.95-.5*k):0;mtM.forEach(m=>m.color.copy(m.userData.c0).multiplyScalar(1-.78*k));
 cld.children.forEach(c=>{if(c.material)c.material.opacity=.8*(1-.85*k)});stars.material.opacity=clamp(k*1.6-.5,0,1);lamp.intensity=k*1.8;glowM.opacity=.55+.4*k}
function cluck(){if(!AC)return;const t=AC.currentTime;[0,.09,.17].forEach((dl,i)=>{const o=AC.createOscillator(),e=AC.createGain(),fl=AC.createBiquadFilter();o.type='square';fl.type='bandpass';fl.frequency.value=900+i*130;fl.Q.value=4;o.frequency.setValueAtTime(380,t+dl);o.frequency.exponentialRampToValueAtTime(220,t+dl+.08);e.gain.setValueAtTime(.05,t+dl);e.gain.exponentialRampToValueAtTime(.0001,t+dl+.1);o.connect(fl);fl.connect(e);e.connect(mg);o.start(t+dl);o.stop(t+dl+.12)})}
function splash(){if(!AC)return;nz(2600,.28,.16,'bandpass',2.2);nz(700,.22,.09,'lowpass',1);const t=AC.currentTime;[1400,1900].forEach((f,i)=>{const s=t+i*.03,o=AC.createOscillator(),e=AC.createGain();o.type='sine';o.frequency.setValueAtTime(f,s);o.frequency.exponentialRampToValueAtTime(f*.6,s+.08);e.gain.setValueAtTime(.05,s);e.gain.exponentialRampToValueAtTime(.0001,s+.1);o.connect(e);e.connect(mg);o.start(s);o.stop(s+.12)})}
function fan(){if(!AC)return;const t=AC.currentTime;[523.3,659.3,784,1046.5].forEach((f,i)=>{const o=AC.createOscillator(),e=AC.createGain(),s=t+i*.08;o.type='sine';o.frequency.value=f;e.gain.setValueAtTime(0,s);e.gain.linearRampToValueAtTime(.08,s+.02);e.gain.exponentialRampToValueAtTime(.0001,s+.45);o.connect(e);e.connect(mg);o.start(s);o.stop(s+.5)})}
function pz(f){paused=f;$('pz').style.display=f?'flex':'none';if(AC)f?AC.suspend():AC.resume()}
addEventListener('keydown',e=>{if(started&&(e.code==='KeyP'||e.code==='Escape'))pz(!paused)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused)pz(true)});
$('pz').addEventListener('pointerdown',()=>pz(false));
// loop
let s=0,v=0,l=0,lv=0,crank=0,wr=0,wrv=0,skidAcc=0,lastRev=0,cyaw=0,first=true,t=0,last=performance.now(),nextChirp=4;const Rw=.35;let shadowCellX=NaN,shadowCellZ=NaN;
const camP=V(0,2,6);
upd(0);
function loop(now){requestAnimationFrame(loop);
 const raw=(now-last)/1000,dt=Math.min(raw,.05);last=now;if(paused)return;t+=dt;if(walkMode){walkLoop(Math.min(raw,.12));return}
 let thr=(K.KeyW||K.ArrowUp||ptr)?1:0,brk=(K.KeyS||K.ArrowDown)?1:0,st=((K.KeyD||K.ArrowRight)?1:0)-((K.KeyA||K.ArrowLeft)?1:0);
 if(ptr)st=clamp((ptr.x/innerWidth-.5)*2.4,-1,1);
 if(!started){thr=v<3.2?1:0;brk=0;st=clamp(-l*.6,-1,1)}
 if(menuOpen||lockRide()){thr=0;brk=1}const off=Math.abs(l)>3.3;
 if(brk)wrv=Math.max(0,wrv-14*dt);else wrv+=(v/Rw-wrv)*Math.min(1,11*dt);
 const slipV=v-wrv*Rw,skid=brk&&slipV>1.2&&v>1.8;
 const hzg=hillJ(-s+.6)-hillJ(-s-.6);v=Math.max(0,v+(hzg*6.5+(thr?2.6:0)-(.05*v+.018*v*v)-(brk?(skid?8:10):0)-(off?1.6+.2*v:0))*dt);
 if(!skid)wrv=v/Rw;
 s+=v*dt;const z=-s;
 lv+=(st*(1.1+v*.32)-lv)*Math.min(1,((slip>0||skid)?1.8:6)*dt);l=clamp(l+lv*dt,-5,5);
 const px=cx(z)+l,yaw=Math.atan(dcx(z))-lv*.05;
 const shadowX=Math.round(px/12)*12,shadowZ=Math.round(z/12)*12;if(shadowX!==shadowCellX||shadowZ!==shadowCellZ){shadowCellX=shadowX;shadowCellZ=shadowZ;sunL.position.set(shadowX-80,26,shadowZ-100);sunL.target.position.set(shadowX,0,shadowZ);R.shadowMap.needsUpdate=true}
 obs(dt,px,z,yaw);crank+=v*1.05*dt;wr+=wrv*dt;
 if(brk&&v>1){skidAcc+=v*dt;if(skidAcc>.09){skidAcc=0;const back=px-Math.sin(yaw)*.6,bz=z-Math.cos(yaw)*.6;burst(back+(Math.random()-.5)*.4,.06,bz,4,0xcdbfa3,3);skidMark(back,bz,yaw);puffRing(back,.08,bz,0xd8cdb5,.2);if(AC&&Math.random()<.85)nz(2800+Math.random()*600,.1,.08,'bandpass',10)}
  shk=Math.max(shk,Math.min(.15,v*.012))}else skidAcc=0;
 const rev=Math.floor(crank/6.283);if(rev!==lastRev)lastRev=rev;
 const dismounted=(mi===0&&catStage>=1)||(hurtAnimal&&healStage>=1)||walletStage>=1||prayStage>=1||taskStand();
 rider.position.set(px+(dismounted&&!realRider?.55:0),by,z);rider.rotation.y=yaw+(dismounted&&!realRider?-.5:0);bsh.position.y=.07-by;inner.rotation.z=-lv*.035+Math.sin(crank)*.012*(v/10)+Math.sin(t*45)*wob*.08;inner.rotation.x+=((air?-clamp(bvy*.03,-.4,.4):(gh>.05?.2:brk&&v>2?-.16:dismounted&&!realRider?(catStage===2||healStage===1?.55:.15):0))-inner.rotation.x)*Math.min(1,8*dt);inner.position.y=sy;wob=Math.max(0,wob-dt*1.5);
 wF.rotation.x=wR.rotation.x=-wr;pony.rotation.z=lv*.05+Math.sin(t*3)*.03;pony.rotation.x=.2+v*.02;if(realRider||catMixers.length)updateReal(dt,dismounted);if(!realRider){if(dismounted)standPose(catStage===2||healStage===1?.6:.15);else legUpd(crank)}
 cyaw+=(yaw-cyaw)*(1-Math.exp(-3*dt));
 let fx=px,fz=z,cd=6.4;if(realRider&&realRider.mode!=='ride'&&realRider.m.visible){realRider.m.getWorldPosition(_bw);fx=px+(_bw.x-px)*.6;fz=z+(_bw.z-z)*.6;cd=8.2}
 const sn=Math.sin(cyaw),cs=Math.cos(cyaw),brakeDip=brk&&v>1.4?Math.min(.16,v*.012):0,tp=V(fx+sn*cd,2.55+(cd-6.4)*.35+by*.6-brakeDip+hillJ(fz+cs*cd),fz+cs*cd);
 if(first){camP.copy(tp);first=false}else camP.lerp(tp,1-Math.exp(-7*dt));
 const sh=(off?v*.004:0)+shk;C.position.set(camP.x+(Math.random()-.5)*sh,camP.y+(Math.random()-.5)*sh,camP.z);
 C.lookAt(fx-sn*11,.85+by*.5+hillJ(fz-cs*11),fz-cs*11);C.fov=57+v*.8;C.updateProjectionMatrix();
 sky.position.copy(C.position);mt.position.set(C.position.x,0,C.position.z);cld.position.copy(C.position);gnd.position.set(px,0,z);
 upd(s);
 for(let k=0;k<FN;k++){if(fp[k*3+2]>z+8)fr(k,s,false);fp[k*3+1]=fb[k]+Math.sin(t*1.4+k)*.3}
 fg.attributes.position.needsUpdate=true;
 for(const o of SK)if(o.l>0){o.l-=dt;o.m.material.opacity=Math.max(0,o.l/4)*.5;if(o.l<=0)o.m.visible=false}
 for(const o of RG)if(o.l>0){o.l-=dt;o.sc+=dt*3.2;o.q.scale.setScalar(o.sc);o.q.material.opacity=Math.max(0,o.l/.45)*.5;if(o.l<=0)o.q.visible=false}
 mis(dt);setH($('hud'),'¥'+money+' · '+Math.round(s)+' m<br>'+(setH($('spdN'),''+Math.round(v*3.6)),'')+'<small style="opacity:.75;font-size:12px">wheel '+Math.round(wrv*Rw*3.6)+' km/h'+(skid?' — skidding!':'')+'</small>');if(Math.floor(t)%5===0&&!window._sv5){window._sv5=1;SV.money=money;svSave()}else if(Math.floor(t)%5!==0)window._sv5=0;if(started){pt+=dt;adapt(dt);skyHour(hourNow());updatePrayer(dt,px,z);lamp.position.y=1.2+hillJ(z)}
 if(hurtAnimal){const hpos=hurtAnimal.g.position,hd=Math.hypot(px-hpos.x,z-hpos.z),near2=hd<3.4&&v<1.2;
  if(!rescue&&healStage===0&&near2){$a.style.display='block';$a.textContent='Press E: call for help (a rescuer will come by bicycle)';
   if(K.KeyE&&!healPact){healStage=1;startRescue();say('You call for help. Stay with the dog until the rescuer arrives.')}}
  healPact=!!K.KeyE}
if(AC){const tt=AC.currentTime,vn=Math.min(v/10,1);
  if(t>nextChirp){chirp();nextChirp=t+3+Math.random()*5}}
 R.render(S,C)}
requestAnimationFrame(loop);
})();
