export const RHYME_COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb7185", "#60a5fa", "#c084fc"];

function cleanWord(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9']/g, "").replace(/^'+|'+$/g, ""); }
function rhymeKey(word) {
  const value = cleanWord(word); if (value.length < 2) return null;
  const vowelMatches = [...value.matchAll(/[aeiouy]+/g)];
  if (!vowelMatches.length) return value.slice(-2);
  const last = vowelMatches.at(-1); let start = last.index;
  if (start > 0 && value.length - start < 2 && vowelMatches.length > 1) start = vowelMatches.at(-2).index;
  return value.slice(start).replace(/e$/g, "").slice(-5) || value.slice(-2);
}
function words(line) { return String(line).match(/[A-Za-z0-9']+/g) || []; }

export function analyzeRhymes(lyrics = "") {
  const lines = String(lyrics).split(/\r?\n/);
  const endings = lines.map((line) => words(line).at(-1) || null);
  const counts = new Map();
  for (const line of lines) for (const word of words(line)) { const key=rhymeKey(word); if(key)counts.set(key,(counts.get(key)||0)+1); }
  const families = new Map(); let familyIndex = 0;
  for (const ending of endings) { const key=rhymeKey(ending); if(key&&!families.has(key))families.set(key,{id:String.fromCharCode(65+familyIndex),key,color:RHYME_COLORS[familyIndex++%RHYME_COLORS.length]}); }
  for (const [key,count] of counts) if(count>=2&&!families.has(key))families.set(key,{id:String.fromCharCode(65+familyIndex),key,color:RHYME_COLORS[familyIndex++%RHYME_COLORS.length]});
  const analyzedLines = lines.map((line,index)=>{
    const ending=cleanWord(endings[index]); const endingFamily=families.get(rhymeKey(ending));
    const tokens=line.split(/(\s+|[^A-Za-z0-9'\s]+)/).filter((token)=>token!=="").map((text)=>{const word=cleanWord(text);const family=word?families.get(rhymeKey(word)):null;return{text,word,familyId:family?.id||null,color:family?.color||null,isLineEnding:Boolean(word&&word===ending&&family)};});
    return {index,text:line,endingWord:ending||null,familyId:endingFamily?.id||"–",color:endingFamily?.color||null,tokens};
  });
  const usedFamilies=[...families.values()].map((family)=>({...family,words:[...new Set(analyzedLines.flatMap((line)=>line.tokens.filter((token)=>token.familyId===family.id&&token.word).map((token)=>token.word)))]})).filter(({words:familyWords})=>familyWords.length>0);
  return {lines:analyzedLines,families:usedFamilies,scheme:analyzedLines.map(({familyId})=>familyId).join(" "),wordCount:lines.flatMap(words).length,lineCount:lines.length,algorithm:"astramind-rhyme-map-v1"};
}

export default analyzeRhymes;
