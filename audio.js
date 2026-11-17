// Small synthesized effects: offline, no audio downloads and no autoplay on load.
const SoundFX=(()=>{
 let context=null,enabled=true,noise=null;
 function unlock(){
  if(!enabled)return;
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;context??=new Audio();if(context.state==='suspended')context.resume().catch(()=>{});}catch{}
 }
 function tone(frequency,time,duration,volume,type='sine',end=frequency){
  const voice=context.createOscillator(),gain=context.createGain();voice.type=type;voice.frequency.setValueAtTime(frequency,time);voice.frequency.exponentialRampToValueAtTime(end,time+duration);
  gain.gain.setValueAtTime(0.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  voice.connect(gain);gain.connect(context.destination);voice.onended=()=>{voice.disconnect();gain.disconnect();};voice.start(time);voice.stop(time+duration+.01);
 }
 function play(kind,perfect=false){
  if(!enabled||!context||context.state!=='running'||globalThis.document?.hidden)return;
  try{
   const t=context.currentTime;
   if(kind==='start')tone(430,t,.07,.025,'sine',650);
   else if(kind==='miss')tone(180,t,.14,.045,'triangle',70);
   else if(kind==='press'){
    tone(perfect?880:560,t,.12,.045,'triangle',perfect?1320:760);
    if(perfect)tone(1760,t+.055,.2,.025);
   }else if(kind==='impact'){
    tone(perfect?130:100,t,.24,perfect?.1:.07,'sine',38);
    tone(1600,t,.055,.025,'triangle',420);
    if(!noise){noise=context.createBuffer(1,Math.ceil(context.sampleRate*.2),context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);}
    const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();source.buffer=noise;filter.type='lowpass';filter.frequency.value=perfect?2200:1300;
    gain.gain.setValueAtTime(perfect?.12:.08,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.2);source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(t);source.stop(t+.21);
    if(perfect){tone(1046,t+.04,.22,.035);tone(1318,t+.1,.22,.03);tone(1568,t+.16,.28,.025);}
   }
  }catch{}
 }
 function toggle(){enabled=!enabled;if(!enabled&&context)context.suspend().catch(()=>{});else unlock();return enabled;}
 return {unlock,play,toggle};
})();
