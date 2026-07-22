import fs from "node:fs";
import path from "node:path";

const ROOT_NOTES = { C:48, D:50, E:52, F:53, G:55, A:57, B:59 };
const ROMAN_OFFSETS = { I:0, II:2, III:4, IV:5, V:7, VI:9, VII:11 };

function clamp(value,min,max){return Math.min(Math.max(value,min),max);}
function midiFrequency(note){return 440*Math.pow(2,(note-69)/12);}
function triangle(phase){return 2*Math.abs(2*(phase-Math.floor(phase+.5)))-1;}
function safeName(value){return String(value||"astramind-song").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"astramind-song";}
function chordOffset(symbol="I") { const roman=String(symbol).toUpperCase().match(/VII|VI|IV|V|III|II|I/)?.[0]||"I";return ROMAN_OFFSETS[roman]||0; }
function writeHeader(buffer,{sampleRate,samples}){
  const dataSize=samples*2;
  buffer.write("RIFF",0);buffer.writeUInt32LE(36+dataSize,4);buffer.write("WAVE",8);buffer.write("fmt ",12);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(sampleRate,24);buffer.writeUInt32LE(sampleRate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write("data",36);buffer.writeUInt32LE(dataSize,40);
}

export function buildWaveformBuffer(session,{durationSeconds=session?.durationSeconds||30,sampleRate=16000}={}){
  const duration=clamp(Number(durationSeconds)||30,1,180);
  const rate=clamp(Number(sampleRate)||16000,8000,24000);
  const samples=Math.floor(duration*rate);
  const output=Buffer.allocUnsafe(44+samples*2);
  writeHeader(output,{sampleRate:rate,samples});
  const names=(session?.tracks||[]).filter((track)=>!track.mute).map((track)=>String(track.name).toLowerCase());
  const has=(pattern)=>names.some((name)=>pattern.test(name));
  const drums=has(/drum|percussion/), bass=has(/bass|808/), harmony=has(/piano|guitar|banjo|organ|chord|string|brass/), lead=has(/lead|trumpet|fiddle|harmonica|synth|arp|treble/), guide=has(/vocal|choir/);
  const bpm=clamp(Number(session?.bpm)||120,50,200);
  const beatSeconds=60/bpm;
  const rootName=String(session?.key||"C minor").match(/[A-G]/)?.[0]||"C";
  const root=ROOT_NOTES[rootName]||48;
  const minor=/minor/i.test(session?.key||"");
  const third=minor?3:4;
  const progression=session?.progression?.length?session.progression:["I","V","vi","IV"];
  let noise=0x12345678;
  for(let index=0;index<samples;index+=1){
    const time=index/rate;
    const beat=time/beatSeconds;
    const beatPhase=beat-Math.floor(beat);
    const halfPhase=(beat*2)-Math.floor(beat*2);
    const bar=Math.floor(beat/4);
    const chordRoot=root+chordOffset(progression[bar%progression.length]);
    const rootHz=midiFrequency(chordRoot);
    let value=0;
    if(drums){
      const kickEnvelope=Math.exp(-beatPhase*18);value+=Math.sin(2*Math.PI*(52+35*kickEnvelope)*time)*kickEnvelope*.24;
      const beatInBar=Math.floor(beat)%4;if((beatInBar===1||beatInBar===3)&&beatPhase<.16){noise=(1664525*noise+1013904223)>>>0;value+=(((noise/4294967296)*2)-1)*Math.exp(-beatPhase*24)*.14;}
      if(halfPhase<.045){noise=(1664525*noise+1013904223)>>>0;value+=(((noise/4294967296)*2)-1)*Math.exp(-halfPhase*70)*.045;}
    }
    if(bass){const bassEnvelope=.45+.55*Math.exp(-beatPhase*5);value+=Math.sin(2*Math.PI*(rootHz/2)*time)*bassEnvelope*.18;}
    if(harmony){const pulse=.55+.45*Math.exp(-beatPhase*4);value+=(triangle(rootHz*time)+triangle(midiFrequency(chordRoot+third)*time)+triangle(midiFrequency(chordRoot+7)*time))*pulse*.045;}
    if(lead){const melody=[0,2,third,7,5,third,2,7][Math.floor(beat*2)%8];value+=Math.sin(2*Math.PI*midiFrequency(chordRoot+12+melody)*time)*(.08+.04*Math.sin(Math.PI*beatPhase));}
    if(guide){const melody=[0,third,5,7,5,third,2,0][Math.floor(beat)%8];value+=Math.sin(2*Math.PI*midiFrequency(root+12+melody)*time)*.045;}
    if(!drums&&!bass&&!harmony&&!lead&&!guide)value=Math.sin(2*Math.PI*rootHz*time)*.18;
    const fade=Math.min(1,time/.08,(duration-time)/.18);
    output.writeInt16LE(Math.round(clamp(value*fade,-.94,.94)*32767),44+index*2);
  }
  return {buffer:output,durationSeconds:duration,sampleRate:rate,channels:1,bitDepth:16};
}

export function renderAstraMindWaveform(session,{outputDir=path.resolve("public","renders","audio")}={}){
  if(!session?.id)throw new Error("A saved audio session is required for waveform rendering.");
  fs.mkdirSync(outputDir,{recursive:true});
  const rendered=buildWaveformBuffer(session);
  const filename=`${safeName(session.title)}-${session.id}.wav`;
  const outputPath=path.join(outputDir,filename);
  fs.writeFileSync(outputPath,rendered.buffer);
  return {provider:"astramind-native",status:"rendered",format:"wav",filename,publicUrl:`/renders/audio/${filename}`,durationSeconds:rendered.durationSeconds,sampleRate:rendered.sampleRate,channels:rendered.channels,bitDepth:rendered.bitDepth,renderedAt:new Date().toISOString(),limitations:["Native render is a procedural instrumental and guide-melody preview.","Sung vocals require a configured singing-voice provider."]};
}
