import {TYPES,W,H,EDGE,advance} from './physics.js';

const edgeDistance=p=>Math.min(p.x-EDGE,W-EDGE-p.x,p.y-EDGE,H-EDGE-p.y);
const copy=state=>state.map(p=>({...p,vx:0,vy:0}));

// Every candidate runs through the same friction, collisions and elimination as play.
export function predictShot(state,shot,dt=1/240){
  const result=copy(state),actor=result.find(p=>p.id===shot.id);
  if(!actor?.alive||actor.team!==1)throw new Error('Invalid AI actor');
  actor.vx=Math.cos(shot.angle)*shot.pull*7;
  actor.vy=Math.sin(shot.angle)*shot.pull*7;
  let active=true;
  for(let i=0;i<Math.ceil(4/dt)&&active;i++)active=advance(result,dt);
  return result;
}

export function scorePosition(before,after){
  let score=0,own=0,enemy=0;
  for(let i=0;i<before.length;i++){
    const a=before[i],b=after[i];if(!a.alive)continue;
    const value=1000+TYPES[a.type].mass*22;
    if(!b.alive){score+=a.team===0?value:-value*1.3;continue}
    if(a.team===1)own++;else enemy++;
    // Reward pushing enemies toward an edge and keeping our own pieces safe.
    const change=Math.max(-b.r,edgeDistance(b))-Math.max(-a.r,edgeDistance(a));
    score+=a.team===0?-change*.8:change*.6;
    if(a.team===1&&edgeDistance(b)<b.r)score-=(b.r-edgeDistance(b))*2;
  }
  // Safe approach moves are useful when no immediate elimination is available.
  const targets=after.filter(p=>p.alive&&p.team===0);
  if(targets.length)for(const p of after){
    if(!p.alive||p.team!==1)continue;
    const old=before.find(q=>q.id===p.id);
    const near=q=>Math.min(...targets.map(e=>Math.hypot(e.x-q.x,e.y-q.y)));
    score+=(near(old)-near(p))*.12;
  }
  if(enemy===0&&own>0)score+=100000;
  if(own===0&&enemy>0)score-=100000;
  return score;
}

function candidates(state,level){
  const shots=[],own=state.filter(p=>p.alive&&p.team===1),enemies=state.filter(p=>p.alive&&p.team===0);
  const offsets=level==='hard'?[-.8,-.4,0,.4,.8]:level==='easy'?[0]:[-.65,0,.65];
  for(const p of own)for(const target of enemies){
    const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
    const base=Math.atan2(dy,dx);
    for(const offset of offsets){
      const angle=base+Math.asin(Math.min(.9,(target.r+p.r)*offset/Math.max(d,1)));
      const nx=Math.cos(angle),ny=Math.sin(angle);
      // Estimate the first contact, including intervening friendly pieces.
      let first=null,contact=Infinity;
      for(const q of state){if(!q.alive||q===p)continue;
        const qx=q.x-p.x,qy=q.y-p.y,along=qx*nx+qy*ny,side=Math.abs(qx*ny-qy*nx),r=p.r+q.r;
        if(along<=0||side>=r)continue;
        const at=Math.max(0,along-Math.sqrt(r*r-side*side));
        if(at<contact){contact=at;first=q}
      }
      if(!first)continue;
      for(const pull of [45,65,85,105,125]){
        const speed=pull*7,resistance=380*Math.pow(TYPES[p.type].mass,.12);
        const reach=speed/.45-resistance/(.45*.45)*Math.log1p(.45*speed/resistance);
        if(contact>reach+2)continue;
        const priority=(first.team===0?250:-250)-contact*.25-edgeDistance(first)*.25+Math.min(4,TYPES[p.type].mass/TYPES[first.type].mass)*25;
        shots.push({id:p.id,angle,pull,priority});
      }
    }
  }
  // Allow useful repositioning when no direct attack can reach the opponent.
  for(const p of own){const nearest=enemies.reduce((a,b)=>Math.hypot(b.x-p.x,b.y-p.y)<Math.hypot(a.x-p.x,a.y-p.y)?b:a,enemies[0]);if(!nearest)continue;
    for(const pull of [35,55,75])shots.push({id:p.id,angle:Math.atan2(nearest.y-p.y,nearest.x-p.x),pull,priority:-500});
  }
  return shots.sort((a,b)=>b.priority-a.priority);
}

export async function planShot(state,level='normal',valid=()=>true){
  const choices=candidates(state,level),budget=level==='hard'?520:level==='easy'?180:340;
  // Sample across the sorted list so quieter positioning moves are still considered.
  const shortlist=choices.length<=budget?choices:choices.filter((_,i)=>i<budget*.7||i%Math.max(1,Math.ceil((choices.length-budget*.7)/(budget*.3)))===0).slice(0,budget);
  let ranked=[];
  for(let i=0;i<shortlist.length;i++){
    if(!valid())return null;
    const shot=shortlist[i],after=predictShot(state,shot,1/120);
    let score=scorePosition(state,after);
    ranked.push({...shot,score:score-shot.pull*.004});
    if(i%12===11)await new Promise(resolve=>setTimeout(resolve,0));
  }
  ranked.sort((a,b)=>b.score-a.score);
  let best=null;
  for(const shot of ranked.slice(0,16)){
    if(!valid())return null;
    // Refine finalists at the exact gameplay time step.
    const after=predictShot(state,shot),score=scorePosition(state,after)-shot.pull*.004;
    if(!best||score>best.score)best={...shot,score};
  }
  return best;
}
