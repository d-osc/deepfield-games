const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let created=0,starts=0,stops=0,disconnected=0;const voices=[];
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
function voice(){const node={frequency:param(),gain:param(),connect(){},disconnect(){disconnected++;},start(){starts++;},stop(){stops++;}};voices.push(node);return node;}
class AudioContext{
 constructor(){created++;this.state='suspended';this.currentTime=0;this.sampleRate=44100;this.destination={};}
 resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
 createOscillator(){return voice();}createGain(){return voice();}createBiquadFilter(){return voice();}createBufferSource(){return voice();}
 createBuffer(channels,size){return {getChannelData:()=>new Float32Array(size)};}
}
const box={AudioContext,document:{hidden:false}};vm.createContext(box);vm.runInContext(fs.readFileSync('audio.js','utf8')+';globalThis.sound=SoundFX',box);
box.sound.play('impact',true);assert.equal(created,0);assert.equal(starts,0);
box.sound.unlock();assert.equal(created,1);
for(const kind of ['start','press','miss','impact'])box.sound.play(kind,true);
assert.equal(starts,stops);assert(starts>=10);
for(const node of voices)node.onended?.();assert(disconnected>0);
let before=starts;box.sound.toggle();box.sound.play('impact');assert.equal(starts,before);
box.sound.toggle();box.document.hidden=true;box.sound.play('impact');assert.equal(starts,before);
box.document.hidden=false;box.sound.play('impact');assert(starts>before);
console.log('PASS: lazy audio activation, synthesized effects, finite voices, cleanup, mute and hidden-page silence');
