import assert from 'node:assert/strict';
import {collide,TYPES,decelerate} from '../physics.js';
const sandbox={collide,types:TYPES,decelerate};
const piece=(type,x,vx)=>({type,x,y:0,vx,vy:0,r:19});
let a=piece('pawn',0,100),b=piece('pawn',37,0);sandbox.collide(a,b);assert.ok(Math.abs(a.vx-3)<1e-8);assert.ok(Math.abs(b.vx-97)<1e-8);assert.ok(Math.abs(a.x-b.x)>=38-1e-8);
a=piece('king',0,100);b=piece('pawn',37,0);sandbox.collide(a,b);const heavyImpact=b.vx;assert.ok(heavyImpact>97);assert.ok(a.vx>0);assert.ok(Math.abs(7*a.vx+b.vx-700)<1e-8);
a=piece('pawn',0,100);b=piece('king',37,0);sandbox.collide(a,b);assert.ok(b.vx<97);assert.ok(a.vx<0);
a=piece('pawn',0,-100);b=piece('pawn',37,0);sandbox.collide(a,b);assert.equal(a.vx,-100);assert.equal(b.vx,0);
a=piece('pawn',0,100);b=piece('pawn',100,0);assert.equal(sandbox.collide(a,b),false);
console.log('PASS: equal masses, heavy impact, momentum conservation, rebound, separation and no contact');

// A light attacker rebounds strongly from a king; the king barely moves.
assert.ok(b.vx===0); // prior no-contact pair
let light=piece('pawn',0,600),heavy=piece('king',37,0);sandbox.collide(light,heavy);
assert.ok(light.vx < -400);assert.ok(heavy.vx < 150);
// At full power a pawn stops within 1.7 seconds and 620 board pixels.
let slider=piece('pawn',0,875),distance=0;
for(let i=0;i<408;i++){distance+=slider.vx/240;sandbox.decelerate(slider,1/240)}
assert.equal(slider.vx,0);assert.ok(distance<620);
assert.ok(sandbox.types.king.radius/sandbox.types.pawn.radius>2);
console.log('PASS: strong recoil, finite stopping distance and distinct sizes');
