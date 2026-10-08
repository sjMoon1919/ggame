import assert from 'node:assert/strict';
import {planShot,predictShot} from '../ai.js';
import {TYPES,advance} from '../physics.js';
const p=(id,type,team,x,y)=>({id,type,team,x,y,r:TYPES[type].radius,vx:0,vy:0,alive:true});
const cases=[
  {name:'clear knockout',state:[p(0,'rook',1,300,250),p(1,'pawn',0,300,70)]},
  {name:'avoid friendly blocker',state:[p(0,'king',1,300,250),p(1,'pawn',1,300,180),p(2,'rook',1,130,70),p(3,'pawn',0,300,70)]},
  {name:'light attacker against heavy target',state:[p(0,'pawn',1,300,90),p(1,'king',0,300,220),p(2,'rook',1,100,220)]}
];
for(const test of cases){
  const snapshot=JSON.stringify(test.state),start=performance.now();
  for(const level of ['easy','normal','hard']){
    const shot=await planShot(test.state,level);assert.ok(shot);assert.ok(Number.isFinite(shot.score));
    const result=predictShot(test.state,shot);
    assert.equal(JSON.stringify(test.state),snapshot,'planning must not mutate live board');
    if(test.name!=='light attacker against heavy target'){
      assert.equal(result.find(q=>q.team===0).alive,false,'take available knockout');
      assert.ok(result.filter(q=>q.team===1).every(q=>q.alive),'keep own pieces');
    }else assert.ok(result.filter(q=>q.team===1).every(q=>q.alive),'avoid suicidal recoil');
    // Prediction and gameplay use identical integration, down to final positions.
    const actual=test.state.map(q=>({...q})),actor=actual.find(q=>q.id===shot.id);
    actor.vx=Math.cos(shot.angle)*shot.pull*7;actor.vy=Math.sin(shot.angle)*shot.pull*7;
    for(let i=0;i<960;i++)if(!advance(actual,1/240))break;
    assert.deepEqual(actual,result);
  }
  console.log('PASS:',test.name,Math.round(performance.now()-start)+'ms');
}
assert.equal(await planShot(cases[0].state,'normal',()=>false),null,'reset cancels stale AI');
console.log('PASS: reset cancellation, deterministic simulation and all difficulties');
const initial=[];
const add=(type,team,col,row)=>initial.push(p(initial.length,type,team,40+col*67.5,40+row*600/9));
for(let team=0;team<2;team++){
  ['rook','horse','elephant','guard',null,'guard','elephant','horse','rook'].forEach((type,c)=>{if(type)add(type,team,c,team===0?9:0)});
  add('king',team,4,team===0?8:1);
  [1,7].forEach(c=>add('cannon',team,c,team===0?7:2));
  [0,2,4,6,8].forEach(c=>add('pawn',team,c,team===0?6:3));
}
const started=performance.now(),opening=await planShot(initial,'normal');
assert.ok(opening);const board=predictShot(initial,opening);
assert.equal(board.filter(q=>q.team===1&&q.alive).length,16,'opening avoids losing own pieces');
assert.ok(board.some((q,i)=>q.x!==initial[i].x||q.y!==initial[i].y),'opening makes progress');
console.log('PASS: 32-piece opening',Math.round(performance.now()-started)+'ms',JSON.stringify(opening));
