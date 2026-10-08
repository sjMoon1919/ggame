export const W=620,H=680,EDGE=13,MAX_PULL=125;
export const TYPES={pawn:{mass:1,radius:14,label:['卒','兵'],name:'졸·병'},horse:{mass:2,radius:18,label:['馬','馬'],name:'마'},elephant:{mass:2.7,radius:20,label:['象','象'],name:'상'},guard:{mass:3.5,radius:22,label:['士','士'],name:'사'},cannon:{mass:4.4,radius:24,label:['包','包'],name:'포'},rook:{mass:5.5,radius:27,label:['車','車'],name:'차'},king:{mass:7,radius:31,label:['楚','漢'],name:'궁'}};
// Dry board friction: finite stopping distance, with slightly more drag on heavy pieces.
export function decelerate(p,dt){const speed=Math.hypot(p.vx,p.vy);if(!speed)return;const resistance=380*Math.pow(TYPES[p.type].mass,.12)+speed*.45;const next=Math.max(0,speed-resistance*dt);p.vx*=next/speed;p.vy*=next/speed;}
export function collide(a,b){let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),sum=a.r+b.r;if(d>=sum)return false;if(d<.001){dx=1;dy=0;d=1}const nx=dx/d,ny=dy/d,ma=TYPES[a.type].mass,mb=TYPES[b.type].mass,inv=1/ma+1/mb,overlap=sum-d;a.x-=nx*overlap/ma/inv;a.y-=ny*overlap/ma/inv;b.x+=nx*overlap/mb/inv;b.y+=ny*overlap/mb/inv;const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(relative<0){const impulse=-(1+.94)*relative/inv;a.vx-=impulse*nx/ma;a.vy-=impulse*ny/ma;b.vx+=impulse*nx/mb;b.vy+=impulse*ny/mb;return true}return false}
export function advance(state,dt,onEvent=()=>{}){
  for(const p of state){if(!p.alive)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;decelerate(p,dt);
    if(p.x<EDGE-p.r||p.x>W-EDGE+p.r||p.y<EDGE-p.r||p.y>H-EDGE+p.r){p.alive=false;p.vx=p.vy=0;onEvent('out')}}
  for(let i=0;i<state.length;i++)for(let j=i+1;j<state.length;j++){const a=state[i],b=state[j];if(a.alive&&b.alive&&collide(a,b))onEvent('hit')}
  return state.some(p=>p.alive&&Math.hypot(p.vx,p.vy)>.1);
}
