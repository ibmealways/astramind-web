const GENRES = ["country rap","country hip hop","hip hop","hip-hop","r&b","rnb","country","pop","rock","gospel","jazz","blues","electronic","cinematic","reggae","latin","classical"];
const INSTRUCTION_WORDS = new Set(["create","generate","write","compose","make","produce","song","track","lyrics","lyric","anthem","ballad","describing","describe","about","please","original","vibrant","upbeat","slow","fast","minute","minutes","second","seconds","bpm","using","include","featuring","style","music","form"]);
const FILLER_WORDS = new Set(["a","an","the","and","or","but","to","of","for","from","in","on","with","that","this","it","its","how","has","have","do","does","everything","something","my","our","your"]);

function tidy(value){return String(value||"").replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/\s+/g," ").trim();}
function titleCase(value){return value.replace(/\b[a-z]/g,(letter)=>letter.toUpperCase());}
function unique(values){return [...new Set(values)];}

export function extractLyricTheme(prompt="") {
  const original=tidy(prompt).slice(0,1200);
  let candidate=original;
  const marker=candidate.match(/\b(?:about|describing|describe|centered on|focused on|telling (?:a )?story (?:about|of))\s+(.+)/i);
  if(marker?.[1])candidate=marker[1];
  candidate=candidate
    .replace(new RegExp(`\\b(?:${GENRES.map((item)=>item.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})\\b`,"gi")," ")
    .replace(/\b\d{2,3}\s*bpm\b/gi," ")
    .replace(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*[- ]?(?:minute|second)s?\b/gi," ")
    .replace(/\bmake it\b.*$/i," ")
    .replace(/\b(?:create|generate|write|compose|make|produce)\b(?:\s+(?:me|us))?/gi," ")
    .replace(/\b(?:a|an)\s+(?:song|track|anthem|ballad|lyric draft)\b/gi," ")
    .replace(/\b(?:in (?:the )?(?:style|form|voice|sound) of|like|imitating|modeled after)\b.*$/i," ")
    .replace(/\b(?:for|to)\s+(?:tiktok|youtube|instagram|a music video|radio|streaming)\b.*$/i," ")
    .replace(/[.;]+$/g,"");
  const words=(candidate.toLowerCase().match(/[a-z][a-z'-]*/g)||[]).filter((word)=>!INSTRUCTION_WORDS.has(word));
  const keywords=unique(words.filter((word)=>word.length>2&&!FILLER_WORDS.has(word))).slice(0,8);
  const theme=tidy(candidate).replace(/^[-,: ]+|[-,: ]+$/g,"")||"finding purpose and moving forward";
  return {original,theme:theme.slice(0,140),keywords:keywords.length?keywords:["purpose","future"],suggestedTitle:titleCase((keywords.length?keywords:["finding","our","way"]).slice(0,4).join(" "))};
}

function conceptProfile(keywords=[]) {
  const has=(...terms)=>terms.some((term)=>keywords.includes(term));
  if(has("america","american","patriot","patriotic","civic","constitution","conservative","government","rights","socialism","socialist","agenda","values","tradition","traditional","liberty","freedom"))return "values";
  if(has("love","romance","partner","heart","together"))return "love";
  if(has("family","home","roots","community"))return "home";
  if(has("faith","god","grace","prayer"))return "faith";
  if(has("grief","loss","goodbye","heartbreak","gone"))return "loss";
  if(has("resilience","overcome","adversity","struggle","survive","strong"))return "resilience";
  if(has("dream","success","future","build","building","ambition"))return "future";
  return "purpose";
}

function hashText(value="") { let hash=2166136261; for(const character of value){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);} return hash>>>0; }
function rotate(values,offset=0){if(!values.length)return values;const start=offset%values.length;return [...values.slice(start),...values.slice(0,start)];}

function personalizeProfile(profile,profileName,theme){
  const seed=hashText(theme.original);
  const primary=theme.keywords[0]||"purpose";
  const secondary=theme.keywords[1]||"future";
  const focus=theme.theme.replace(/\b(?:in the|with the|for the)\b.*$/i,"").trim();
  const topical={
    values:[
      "I will ask the hard questions when the headlines fill the air",
      "A promise made in public still needs truth and care",
      `No slogan owns my conscience, no crowd can choose my view`,
      `Liberty needs honest work and neighbors seeing through`,
    ],
    love:[`Every word about ${primary} finds a rhythm in your name`,`We turn ${secondary} into something neither distance nor time can change`],
    home:[`The story of ${primary} lives in every open door`,`We carry ${secondary} forward, stronger than before`],
    faith:[`I bring the weight of ${primary} into the quiet place`,`Even through ${secondary}, I keep reaching for grace`],
    loss:[`The memory of ${primary} still moves beside me here`,`I carry ${secondary} with me through another year`],
    resilience:[`I faced ${primary} head-on and kept my footing true`,`What ${secondary} tried to break became a strength I never knew`],
    future:[`We turn ${primary} into plans that hands can build`,`Let ${secondary} become the promise that we choose to fulfill`],
    purpose:[`I put ${primary} in the center of the work I choose`,`When ${secondary} tests the road, I find another way to move`],
  }[profileName]||[];
  const rotated=rotate(topical,seed);
  const verse1=[...rotate(profile.verse1,seed).slice(0,4),...rotated.slice(0,2)];
  const verse2=[...rotate(profile.verse2,seed>>>4).slice(0,4),...rotate(rotated,2).slice(0,2)];
  const hook=profileName==="values"?"My conscience is not property; no agenda owns my voice":profile.hook;
  return {...profile,verse1,verse2,hook,chorus:[...rotate(profile.chorus,seed>>>8).slice(0,3),hook],themeFocus:focus};
}

const PROFILE_LINES = {
  values:{
    verse1:["Sunrise breaking on a two-lane road","Lessons in the dust are the ones I know","Truth in my word, steady in my stride","Love at the center, my people by my side","Hands to the work when the daylight calls","Stand for the promise that belongs to us all"],
    verse2:["I learned that freedom carries its weight","You tend what you treasure before it gets late","Keep an open table and a light by the door","Leave every hometown a little stronger than before","No borrowed thunder, no need to pretend","A life built on love is a life we defend"],
    pre:["No matter how far these wheels may roll","I keep that compass written in my soul"],
    chorus:["Love is the reason I stand my ground","Hope for the future when the world spins round","Hands to the work, let the good ring true","Home in my heart, and my word comes through"],
    bridge:["Different roads can still meet under one sky","Listen with courage, let the truth reply","Hold to conviction without closing the door","Love gives our values something worth standing for"],
    hook:"Love is the reason I stand my ground",
  },
  love:{
    verse1:["Morning finds your shadow dancing on the wall","Coffee getting cold while we forget it all","Every little scar has a story we can hold","You make an ordinary room feel bright as gold"],
    verse2:["Years may turn the seasons, roads may pull us wide","Still I hear your laughter riding by my side","No perfect promise, just a choice we make","To meet each new tomorrow with a love that will not break"],
    pre:["When the noise fades out and the night comes through","Every road in me keeps leading back to you"],
    chorus:["You are the light I can always find","The steady rhythm underneath my life","Whatever comes, whatever we go through","I keep choosing us, I keep choosing you"],
    bridge:["Let the years write silver in our hair","I will still reach out and find you there","Not just a feeling that the moment knew","Love is the work I gladly do with you"],
    hook:"I keep choosing us, I keep choosing you",
  },
  home:{verse1:["Dust on the porch and a key in the door","Names in the hallway that still mean more","A table set wide when the hard days come","We learn who we are from the place we call home"],verse2:["Miles in the mirror, new streets ahead","I carry the stories and words that were said","Wherever I wander, whatever I roam","The people I love are the map leading home"],pre:["Every road bends, every season moves","Roots hold steady while the whole world turns"],chorus:["Home is a light that the distance cannot hide","A hand on your shoulder, a place by your side","More than four walls, more than wood and stone","Love makes a family, and family makes home"],bridge:["Leave the door open, make room at the table","Carry one another whenever we are able","What we pass forward is the best we have known","A heart full of welcome is the heart of a home"],hook:"Love makes a family, and family makes home"},
  faith:{verse1:["Before the dawn has written out the day","I find a quiet place to kneel and pray","Not every answer comes when I call","Still there is grace enough to carry it all"],verse2:["Through every valley, over every stone","I never walk the longest mile alone","Mercy meets me where my courage ends","And turns a broken road toward hope again"],pre:["When I cannot see beyond tonight","I take one more step toward the light"],chorus:["Faith is the fire I carry within","Grace is the place where I begin again","Storms may rise, but they will not decide","Hope has a name and it walks by my side"],bridge:["Let my life be more than words I say","Let it be love in the work of every day","Open my hands, make my purpose clear","Teach me to serve instead of serving fear"],hook:"Hope has a name and it walks by my side"},
  loss:{verse1:["Your coat is gone but the hook knows its shape","Silence fills the rooms that memory makes","I reach for a voice that the night cannot bring","Then hold to the love underneath everything"],verse2:["Grief moves slowly, never walks a line","Some days are heavy, some almost kind","I carry your story wherever I go","A flame in the window, a name that I know"],pre:["I cannot keep the moment from moving on","But love does not vanish when someone is gone"],chorus:["I will say your name when the night comes down","Keep your light alive when you are not around","Every goodbye leaves a door in the heart","Love is the place where we never depart"],bridge:["Tears are not weakness, they measure the cost","Of having held something too precious to lose","I will keep living the love that you gave","Turning remembrance into something brave"],hook:"Love is the place where we never depart"},
  resilience:{verse1:["I have worn the miles like dust on my shoes","Paid for every lesson I did not choose","Bent in the weather but I did not break","Learned how much a steady heart can take"],verse2:["Now every scar is a line on the map","Proof I kept moving when the road pushed back","I do not need easy, I just need true","A reason to rise and the courage to move"],pre:["One more breath, one more honest try","The ground cannot hold what was born to rise"],chorus:["I get back up when the hard rain falls","Turn every setback into stronger walls","The road gets rough, but I know my name","I walk through the fire and come out changed"],bridge:["Strength is not thunder or never feeling fear","It is taking the next step when the way is unclear","I carry the proof in the beat of my chest","I have made it this far; I can handle the rest"],hook:"I get back up when the hard rain falls"},
  future:{verse1:["Blueprint dreams on a kitchen table","Making what I can with the hands I am able","Small first step, but the vision runs wide","I can see tomorrow forming on the other side"],verse2:["Every closed door taught another design","Every slow season put patience in mine","Now the work has a rhythm and the purpose is clear","What once felt distant is already near"],pre:["Brick by brick, day by day","We turn a possibility into a way"],chorus:["We build tomorrow with the work of today","Light one signal and keep on making a way","Dreams need courage, plans need hands","We raise the future where the present stands"],bridge:["Measure the progress, remember the why","Leave room to learn every time that we try","No magic ladder, no overnight flight","Just a faithful direction and a future in sight"],hook:"We build tomorrow with the work of today"},
  purpose:{verse1:["A new day opens like a road without a name","I bring what I have and I enter the frame","No perfect answer, no borrowed disguise","Only an honest direction and fire in my eyes"],verse2:["I have changed my pace, but I still know the call","Meaning is made in the giving of all","Every small action can widen the view","The life I am building begins with what I do"],pre:["I hear that steady rhythm under the doubt","A reason within me is finding its way out"],chorus:["I know where I am going, even when it is slow","Purpose is a seed and I am helping it grow","Step after step, let the true work begin","I meet the road ahead with the light from within"],bridge:["Not for the noise and not for the praise","I want a life that can carry its weight","When all is quiet and the bright lights are gone","The good that we give is what keeps moving on"],hook:"Purpose is a seed and I am helping it grow"},
};
const PROFILE_TITLES = {values:"Love Stands Ground",love:"Choosing You",home:"The Map Leading Home",faith:"Hope Has a Name",loss:"Where Love Remains",resilience:"Back Up in the Rain",future:"We Build Tomorrow",purpose:"Light from Within"};

function applyPerspective(line,perspective){
  if(perspective==="second person")return line.replace(/\bI am\b/g,"You are").replace(/\bI have\b/g,"You have").replace(/\bI\b/g,"You").replace(/\bmy\b/gi,(word)=>word[0]==="M"?"Your":"your").replace(/\bme\b/gi,"you");
  if(perspective==="third person")return line.replace(/\bI am\b/g,"They are").replace(/\bI have\b/g,"They have").replace(/\bI\b/g,"They").replace(/\bmy\b/gi,(word)=>word[0]==="M"?"Their":"their").replace(/\bme\b/gi,"them");
  return line;
}

function sectionLines(section,profile,genre){
  const name=section.toLowerCase();
  let lines=name.includes("pre")?profile.pre:name.includes("chorus")?profile.chorus:name.includes("bridge")?profile.bridge:name.includes("intro")?profile.pre.slice(0,1):name.includes("outro")?[profile.hook]:name.includes("2")?profile.verse2:profile.verse1;
  if(/country rap|hiphop|hip hop|rap/i.test(genre)&&name.includes("verse"))lines=[...lines,...lines.slice(0,2).map((line,index)=>index?`Keep the beat moving while the meaning stays clear`:`No empty slogan, put the truth in every line`)];
  if(name.includes("final chorus"))lines=[...lines,profile.hook];
  return lines;
}

export function generateLocalLyrics({prompt,structure,perspective="first person",genre="Pop"}={}){
  const theme=extractLyricTheme(prompt);
  const profileName=conceptProfile(theme.keywords);
  const profile=personalizeProfile(PROFILE_LINES[profileName],profileName,theme);
  const sections=String(structure||"Verse 1, Pre-Chorus, Chorus, Verse 2, Bridge, Final Chorus").split(",").map((item)=>item.trim()).filter(Boolean).slice(0,10);
  const lyrics=sections.map((section)=>`[${section}]\n${sectionLines(section,profile,genre).map((line)=>applyPerspective(line,perspective)).join("\n")}`).join("\n\n");
  const suggestedTitle=theme.suggestedTitle&&theme.suggestedTitle!=="Finding Our Way"?theme.suggestedTitle:(PROFILE_TITLES[profileName]||theme.suggestedTitle);
  return {lyrics,theme:theme.theme,keywords:theme.keywords,suggestedTitle,hook:applyPerspective(profile.hook,perspective),engine:"aigenikz-local-lyric-v3"};
}
