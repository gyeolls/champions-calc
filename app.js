/* 포켓몬 챔피언스 데미지 계산기 v2
 * - 선출 화면 상대 6마리 스프라이트 매칭
 * - 스피드 비교 (최저/무보정/준속/최속/스카프/추정)
 * - 폼 선택 (메가 X/Y, 마이티폼 등)
 * - 파티 다중 저장 + 능력/스테이터스 화면 이미지 등록 */
"use strict";
const DB = window.DB;
const $ = id => document.getElementById(id);
const STATS = ["hp","atk","def","spa","spd","spe"];
const STAT_KO = {hp:"HP",atk:"공격",def:"방어",spa:"특수공격",spd:"특수방어",spe:"스피드"};
const STAT_KO_S = {hp:"HP",atk:"공",def:"방",spa:"특공",spd:"특방",spe:"스"};
const STAT_KO_M = {hp:"HP",atk:"공격",def:"방어",spa:"특공",spd:"특방",spe:"스피드"};
const SPKEY = {h:"hp",a:"atk",b:"def",c:"spa",d:"spd",s:"spe"};

const TYPE_COLORS = {Normal:"#9aa5ad",Fire:"#ff7f45",Water:"#4a90ff",Electric:"#f2c22e",Grass:"#5cb85c",Ice:"#66ccd6",
Fighting:"#d1495b",Poison:"#a25ec9",Ground:"#d8a35a",Flying:"#8fa8f0",Psychic:"#f06292",Bug:"#a3b545",
Rock:"#bfa864",Ghost:"#7a62a3",Dragon:"#6a5ae0",Dark:"#6b5a4e",Steel:"#8fa2ad",Fairy:"#eda0c9"};

const CHART = {
Normal:{Rock:.5,Ghost:0,Steel:.5},
Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},
Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},
Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},
Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},
Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},
Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},
Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},
Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},
Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},
Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},
Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},
Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},
Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},
Dragon:{Dragon:2,Steel:.5,Fairy:0},
Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},
Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},
Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5}};

const TYPE_ITEM = {"Charcoal":"Fire","Mystic Water":"Water","Magnet":"Electric","Miracle Seed":"Grass",
"Never-Melt Ice":"Ice","Black Belt":"Fighting","Poison Barb":"Poison","Soft Sand":"Ground","Sharp Beak":"Flying",
"Twisted Spoon":"Psychic","Silver Powder":"Bug","Hard Stone":"Rock","Spell Tag":"Ghost","Dragon Fang":"Dragon",
"Black Glasses":"Dark","Metal Coat":"Steel","Silk Scarf":"Normal","Fairy Feather":"Fairy"};

// 반감열매: 해당 타입의 효과굉장 데미지 0.5배 (시몬열매는 노말 무조건)
const RESIST_BERRY = {"Occa Berry":"Fire","Passho Berry":"Water","Wacan Berry":"Electric","Rindo Berry":"Grass",
"Yache Berry":"Ice","Chople Berry":"Fighting","Kebia Berry":"Poison","Shuca Berry":"Ground","Coba Berry":"Flying",
"Payapa Berry":"Psychic","Tanga Berry":"Bug","Charti Berry":"Rock","Kasib Berry":"Ghost","Haban Berry":"Dragon",
"Colbur Berry":"Dark","Babiri Berry":"Steel","Chilan Berry":"Normal","Roseli Berry":"Fairy"};

const MULTI_HIT = {"Icicle Spear":1,"Rock Blast":1,"Bullet Seed":1,"Pin Missile":1,"Scale Shot":1,"Water Shuriken":1,
"Bone Rush":1,"Tail Slap":1,"Arm Thrust":1,"Fury Swipes":1,"Double Hit":2,"Dual Wingbeat":2,"Dragon Darts":2,
"Twineedle":2,"Bonemerang":2,"Double Kick":2,"Dual Chop":2,"Gear Grind":2,"Tachyon Cutter":2,"Twin Beam":2,
"Triple Dive":3,"Surging Strikes":3,"Population Bomb":10};
// 위력이 타수마다 오르는 연속기: 타별 개별 표기
const ASCEND_HIT = {"Triple Axel":[20,40,60],"Triple Kick":[10,20,30]};

// ===== 이름 인덱스 =====
// 검색 목록 = 대표(기본) 폼만. 리전폼/특성폼(알로라 나인테일, 돌핀맨 마이티 등)은
// 대표 폼의 "폼" 드롭다운으로 접근 (중복 탭 제거)
const koToId = {};
const baseList = [];      // 검색/OCR 대상 대표 폼
const formOwner = {};     // 폼 id -> 대표 폼 id
{
  const isCandidate = id => !(id.includes("-Mega")||id.includes("-Gmax")||id.includes("-Totem")||id.includes("-Busted"));
  const cand = Object.keys(DB.creatures).filter(isCandidate);
  const candSet = new Set(cand);
  // ko 누락(영문 그대로)인 폼 보정
  for (const id of cand) {
    const c = DB.creatures[id];
    if (!/[가-힣]/.test(c.ko)) {
      const base = Object.values(DB.creatures).find(x=>x.base===c.base&&/[가-힣]/.test(x.ko));
      if (base) c.ko = base.ko;
    }
  }
  const hasUsage = id => !!(DB.usage[id+"|singles"]||DB.usage[id+"|doubles"]);
  const excluded = new Set();
  for (const b of cand) {
    for (const f of (DB.creatures[b].formes||[])) {
      if (!candSet.has(f)||f===b||excluded.has(b)) continue;
      const mutual = (DB.creatures[f].formes||[]).includes(b);
      if (!mutual) { excluded.add(f); formOwner[f]=b; continue; }
      // 상호 참조 쌍: 채용 데이터 있는 쪽 → id 짧은 쪽 → 사전순
      let keep = b;
      if (hasUsage(f)!==hasUsage(b)) keep = hasUsage(b)?b:f;
      else if (b.length!==f.length) keep = b.length<f.length?b:f;
      else keep = b<f?b:f;
      const drop = keep===b?f:b;
      excluded.add(drop); formOwner[drop]=keep;
    }
  }
  const seen = {};
  for (const id of cand) {
    if (excluded.has(id)) continue;
    baseList.push(id);
    const c = DB.creatures[id];
    let label = c.ko;
    if (seen[label]) { const alt = label+"("+(id.split("-").slice(1).join("-")||c.form)+")"; koToId[alt]=id; c._label=alt; continue; }
    seen[label]=id; koToId[label]=id; c._label=label;
  }
}
function resolveToBase(id){ // 특정 폼 id → {species(대표), forme}
  if (!id) return {species:null,forme:""};
  if (formOwner[id]) return {species:formOwner[id],forme:id};
  if (id.includes("-Mega")) { // 메가 → 소유 기본폼
    const owner = Object.keys(DB.creatures).find(b=>(DB.creatures[b].formes||[]).includes(id)&&!b.includes("-Mega"));
    if (owner) return {species:formOwner[owner]||owner,forme:id};
  }
  return {species:id,forme:""};
}
const koToMove = {};
for (const [id,m] of Object.entries(DB.moves)) koToMove[m.ko]=id;
koToMove["앵콜"]="Encore"; // 구표기 별칭 (기존 저장 파티/OCR 호환)
const koToAbility = {};
for (const [id,ko] of Object.entries(DB.abilities)) koToAbility[ko]=id;
const koToItem = {};
for (const [id,v] of Object.entries(DB.items)) koToItem[v.ko]=id;

// ===== 장착 가능 아이템 (챔피언스 화이트리스트) + 메가스톤 통합 =====
if(DB.items["Fairy Feather"])DB.items["Fairy Feather"].ko="요정의깃털";
koToItem["요정의깃털"]="Fairy Feather";
DB.items["__mega"]={ko:"메가스톤",mega:null};
const ITEM_WHITELIST_KO=("배리열매 바리비열매 루미열매 버치열매 유루열매 카리열매 로플열매 바코열매 마코열매 "+
"하반열매 수불열매 으름열매 과사열매 리샘열매 오카열매 오랭열매 꼬시개열매 야파열매 복슝열매 시몬열매 복분열매 "+
"린드열매 로셀열매 슈캐열매 자뭉열매 리체열매 초나열매 플카열매 큰뿌리 검은띠 검은안경 반짝가루 목탄 구애스카프 "+
"축축한바위 용의이빨 달인의띠 요정의깃털 기합의머리띠 기합의띠 딱딱한돌 뜨거운바위 차가운바위 검은철구 왕의징표석 "+
"먹다남은음식 생명의구슬 전기구슬 빛의점토 자석 멘탈허브 금속코트 메트로놈 기적의씨 힘의머리띠 신비의물방울 "+
"녹지않는얼음 독바늘 선제공격손톱 초점렌즈 예리한부리 아름다운허물 조개껍질방울 실크스카프 은빛가루 보송보송바위 "+
"부드러운모래 저주의부적 휘어진스푼 하양허브 광각렌즈 박식안경").split(" ");
const ITEM_ALLOW=new Set(["__mega"]);
for(const ko of ITEM_WHITELIST_KO){const id=koToItem[ko];if(id)ITEM_ALLOW.add(id);}
const isMegaStone=id=>!!(DB.items[id]&&DB.items[id].mega);
const normItem=id=>!id?"":(isMegaStone(id)?"__mega":id);
// 파티 스캔용 사전: 화이트리스트 + 메가스톤명(→통합)
const koToItemScan={"메가스톤":"__mega"};
for(const id of ITEM_ALLOW)if(id!=="__mega")koToItemScan[DB.items[id].ko]=id;
for(const[id,v]of Object.entries(DB.items))if(v.mega)koToItemScan[v.ko]=id;
function mergeMegaItems(it){ // 채용률 목록에서 메가스톤들을 하나로 합산 [id,%,원본스톤]
  const out=[];let mega=null;
  for(const e of it||[]){
    const id=e[0],p=e[1];
    if(isMegaStone(id)){
      if(!mega){mega=["__mega",p,id];out.push(mega);}
      else mega[1]=Math.round((mega[1]+p)*10)/10;
    }else out.push([id,p]);
  }
  return out;
}
for(const k of Object.keys(DB.usage))DB.usage[k].it=mergeMegaItems(DB.usage[k].it);

{
  const dl=$("dlMon");
  baseList.sort((a,b)=>DB.creatures[a]._label.localeCompare(DB.creatures[b]._label,"ko"));
  for(const id of baseList){const o=document.createElement("option");o.value=DB.creatures[id]._label;dl.appendChild(o);}
  const dm=$("dlMove");
  Object.values(DB.moves).sort((a,b)=>a.ko.localeCompare(b.ko,"ko")).forEach(m=>{const o=document.createElement("option");o.value=m.ko;dm.appendChild(o);});
}

// ===== 상태 =====
const state = {
  weather:"none", terrain:"none", crit:false,
  opp:{species:null,forme:"",ability:"",item:"",nature:"Serious",curType:"",pts:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},
       boosts:{atk:0,def:0,spa:0,spd:0,spe:0},burn:false,screen:false},
  oppTeam:[null,null,null,null,null,null],
  parties:[{name:"파티 1",mons:[null,null,null,null,null,null]}],
  activeParty:0, meSel:0,
};
function newMon(species){
  return {species,forme:"",ability:"",item:"",nature:"Serious",curType:"",
    pts:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},boosts:{atk:0,def:0,spa:0,spd:0,spe:0},
    burn:false,screen:false,moves:["","","",""]};
}
function save(){
  try{
    localStorage.setItem("cc_v2",JSON.stringify({parties:state.parties,active:state.activeParty,oppTeam:state.oppTeam}));
  }catch(e){}
}
function load(){
  try{
    const v2=JSON.parse(localStorage.getItem("cc_v2"));
    if(v2&&v2.parties){state.parties=v2.parties;state.activeParty=Math.min(v2.active||0,v2.parties.length-1);
      if(v2.oppTeam)state.oppTeam=v2.oppTeam;return;}
    const v1=JSON.parse(localStorage.getItem("cc_team")); // 구버전 이전
    if(v1&&v1.slots){
      state.parties=[{name:"파티 1",mons:v1.slots.map(m=>{
        if(!m)return null; m.forme=""; delete m.mega; return m;})}];
    }
  }catch(e){}
}
function normalizeParties(){ // 메가스톤 → 통합 항목으로 정규화
  for(const p of state.parties)for(const m of p.mons)if(m&&m.item)m.item=normItem(m.item);
  if(state.opp.item)state.opp.item=normItem(state.opp.item);
}
const party=()=>state.parties[state.activeParty];
const mySel=()=>party().mons[state.meSel];

// ===== 유틸 =====
const cre=id=>DB.creatures[id];
function effSpecies(side){
  if(!side||!side.species)return null;
  if(side.forme&&DB.creatures[side.forme])return side.forme;
  return side.species;
}
// ===== 실시간 채용률 (championsbattledata.com API) =====
const API_BASE="https://championsbattledata.com";
const showdownId=id=>id.toLowerCase().replace(/[^a-z0-9]/g,"");
const liveUsage={};   // id -> usage (메모리)
const livePending={}; // 중복 요청 방지
let liveSrcNote="";
function rowsToUsage(rows){
  const u={ab:[],it:[],na:[],sp:[],mv:[]};
  for(const r of [...rows].sort((a,b)=>(a.rank||0)-(b.rank||0))){
    const p=r.percentage_value;
    if(p==null)continue;
    if(r.category==="move")u.mv.push([r.name,p]);
    else if(r.category==="held_item")u.it.push([r.name,p]);
    else if(r.category==="ability")u.ab.push([r.name,p]);
    else if(r.category==="stat_alignment")u.na.push([r.name,p]);
    else if(r.category==="stat_points")u.sp.push([{h:+r.hp_points||0,a:+r.attack_points||0,b:+r.defense_points||0,
      c:+r.sp_atk_points||0,d:+r.sp_def_points||0,s:+r.speed_points||0},p]);
  }
  u.it=mergeMegaItems(u.it);
  return (u.mv.length||u.it.length||u.sp.length)?u:null;
}
async function fetchLiveUsage(id){
  if(liveUsage[id]!==undefined)return liveUsage[id];
  const s=showdownId(id);
  try{const c=JSON.parse(localStorage.getItem("cc_live2_"+s));
    if(c&&Date.now()-c.t<6*3600e3){liveUsage[id]=c.u;return c.u;}}catch(e){}
  if(livePending[id])return livePending[id];
  livePending[id]=(async()=>{
    for(const fmt of["Singles","Doubles"]){
      try{
        const r=await fetch(`${API_BASE}/api/battle/${fmt}/${s}`);
        if(!r.ok)continue;
        const j=await r.json();
        const u=rowsToUsage(j.rows||[]);
        if(u){
          u._src=(j.season||"Current")+" "+fmt;
          liveUsage[id]=u;
          try{localStorage.setItem("cc_live2_"+s,JSON.stringify({t:Date.now(),u}));}catch(e){}
          return u;
        }
      }catch(e){}
    }
    liveUsage[id]=null; // 실패 표시 (번들 데이터 사용)
    return null;
  })();
  const out=await livePending[id];
  delete livePending[id];
  return out;
}
function usageOf(id){
  if(!id)return null;
  if(liveUsage[id])return liveUsage[id];
  return DB.usage[id+"|singles"]||DB.usage[id+"|doubles"]||null;
}
function usageIdFor(cfg){ // 리전폼 등은 폼 자체의 채용 데이터 사용 (메가는 기본폼에 통합)
  if(cfg.forme&&!cfg.forme.includes("-Mega"))return cfg.forme;
  return cfg.species;
}
function requestLive(id,onDone){
  if(!id||liveUsage[id]!==undefined)return;
  fetchLiveUsage(id).then(u=>{if(u&&onDone)onDone();});
}
// 신기술 한국어명 보완 (PokeAPI, 최초 1회 후 영구 캐시)
async function patchKoNames(){
  let cache={};try{cache=JSON.parse(localStorage.getItem("cc_konames")||"{}");}catch(e){}
  const apply=(kind,id,ko)=>{
    if(kind==="m"&&DB.moves[id]){DB.moves[id].ko=ko;koToMove[ko]=id;}
    if(kind==="a"&&DB.abilities[id]){DB.abilities[id]=ko;koToAbility[ko]=id;}
  };
  for(const[k,ko]of Object.entries(cache)){const[kind,id]=[k[0],k.slice(2)];apply(kind,id,ko);}
  const missM=Object.entries(DB.moves).filter(([id,m])=>!/[가-힣]/.test(m.ko)).map(([id])=>["m",id]);
  const missA=Object.entries(DB.abilities).filter(([id,ko])=>!/[가-힣]/.test(ko)).map(([id])=>["a",id]);
  let changed=false;
  for(const[kind,id]of[...missM,...missA]){
    const slug=id.toLowerCase().replace(/['’.]/g,"").replace(/[^a-z0-9]+/g,"-");
    try{
      const r=await fetch(`https://pokeapi.co/api/v2/${kind==="m"?"move":"ability"}/${slug}`);
      if(!r.ok)continue;
      const j=await r.json();
      const ko=(j.names||[]).find(n=>n.language&&n.language.name==="ko");
      if(ko&&ko.name){apply(kind,id,ko.name);cache[kind+":"+id]=ko.name;changed=true;}
    }catch(e){break;} // 오프라인이면 중단 (영문명 유지)
  }
  if(changed){
    try{localStorage.setItem("cc_konames",JSON.stringify(cache));}catch(e){}
    renderMy();renderResults();renderPartyPage();
  }
}
function calcStats(c,natureId,pts){
  const nat=DB.natures[natureId]||{};
  const out={};
  for(const s of STATS){
    const base=c.bs[s];
    if(s==="hp"){out[s]=Math.floor((2*base+31)*50/100)+60+(pts[s]||0);continue;}
    let v=Math.floor((2*base+31)*50/100)+5+(pts[s]||0);
    if(nat.up===s)v=Math.floor(v*1.1);
    else if(nat.dn===s)v=Math.floor(v*0.9);
    out[s]=v;
  }
  return out;
}
const boostMul=s=>s>=0?(2+s)/2:2/(2-s);
function typeEff(t,defTypes){let e=1;for(const d of defTypes){const r=(CHART[t]||{})[d];if(r!==undefined)e*=r;}return e;}
const pm=(v,m)=>Math.floor(v*m);
const acTx=mv=>mv.ac===0?"필중":mv.ac+"%";
function natLabel(n){const d=DB.natures[n];if(!d)return n;let s=d.ko;if(d.up)s+=` (${STAT_KO_S[d.up]}↑${STAT_KO_S[d.dn]}↓)`;else s+=" (무보정)";return s;}
function spLabel(sp){const p=[];for(const[k,v]of Object.entries(sp))if(v>0)p.push(`${STAT_KO_S[SPKEY[k]]}${v}`);return p.join(" ")||"무보정";}
function natureFrom(up,dn){
  if(!up&&!dn)return "Serious";
  for(const[id,d]of Object.entries(DB.natures))if(d.up===up&&d.dn===dn)return id;
  return "Serious";
}
const FORM_SUFFIX={"Mega-X":"메가진화 X","Mega-Y":"메가진화 Y","Mega":"메가진화","Hero":"마이티폼",
"Blade":"블레이드폼","Shield":"실드폼","Alola":"알로라폼","Galar":"가라르폼","Hisui":"히스이폼",
"Paldea":"팔데아폼","Hoenn":"호연폼","Therian":"영물폼","Incarnate":"화신폼","Origin":"오리진폼",
"Zen":"달마모드","School":"군집폼","Solo":"단독폼"};
function formeLabel(f){
  const suf=f.split("-").slice(1).join("-");
  if(FORM_SUFFIX[suf])return FORM_SUFFIX[suf];
  for(const[k,v]of Object.entries(FORM_SUFFIX))if(suf.startsWith(k))return v+suf.slice(k.length).replace(/-/g," ");
  return suf.replace(/-/g," ")||f;
}
function formeOptions(baseId){
  const c=cre(baseId);if(!c)return [];
  const opts=[[baseId,"기본"]];
  const seen=new Set([baseId]);
  const addFrom=id=>{
    for(const f of (cre(id).formes||[])){
      if(!DB.creatures[f]||seen.has(f))continue;
      if(f.includes("-Gmax")||f.includes("-Totem")||f.includes("-Busted"))continue;
      seen.add(f);opts.push([f,formeLabel(f)]);
      addFrom(f); // 리전폼의 메가 등 연쇄 폼도 수집
    }
  };
  addFrom(baseId);
  return opts;
}
function grounded(side){
  return !side.types.includes("Flying")&&side.ability!=="Levitate"&&side.item!=="Air Balloon";
}
function matchMoveLoose(t){ // 앞뒤에 붙은 노이즈 글자를 잘라내며 기술 매칭 재시도
  if(!t)return null;
  const cands=[t];
  if(t.length>=3){cands.push(t.slice(1),t.slice(0,-1));}
  if(t.length>=4){cands.push(t.slice(2),t.slice(1,-1));}
  for(const c of cands){
    const id=fuzzyFind(c,koToMove);
    if(id)return id;
  }
  return null;
}
function fuzzyFind(txt,dict){ // dict: ko -> id
  if(dict[txt])return dict[txt];
  if(txt.length<2)return null;
  let best=null,bd=9;
  for(const[ko,id]of Object.entries(dict)){
    if(Math.abs(ko.length-txt.length)>1)continue;
    const d=lev(txt,ko);
    const lim=txt.length>=5?2:1;
    if(d<=lim&&d<bd){bd=d;best=id;}
  }
  return best;
}

// ===== 데미지 계산 =====
function calcDamage(atk,def,moveId){
  const mv=DB.moves[moveId];if(!mv)return null;
  const ov=DB.overrides[moveId]||{};
  const notes=[];
  if(ov.fixedDamage){
    if(typeEff(mv.t,def.types)===0)return {min:0,max:0,eff:0,mv,notes};
    return {min:ov.fixedDamage,max:ov.fixedDamage,eff:1,mv,notes:["고정 데미지"]};
  }
  if(mv.c==="Status"||(!mv.p&&!ov.weightTargetPower&&!ov.weightRatioPower&&!ov.extraAtkSpe&&!ov.extraDefSpe))return null;

  const moldBreaker=["Mold Breaker","Teravolt","Turboblaze"].includes(atk.ability);
  const dAb=moldBreaker?"":def.ability;

  let eff=typeEff(mv.t,def.types);
  const IMMUNE={Ground:["Levitate","Earth Eater"],Water:["Water Absorb","Storm Drain","Dry Skin"],
    Electric:["Volt Absorb","Lightning Rod","Motor Drive"],Fire:["Flash Fire","Well-Baked Body"],Grass:["Sap Sipper"]};
  if((IMMUNE[mv.t]||[]).includes(dAb))return {min:0,max:0,eff:0,mv,notes:["특성 "+(DB.abilities[dAb]||dAb)+" 무효"]};
  if(mv.t==="Ground"&&def.item==="Air Balloon")return {min:0,max:0,eff:0,mv,notes:["풍선 무효"]};
  if(dAb==="Wonder Guard"&&eff<2)return {min:0,max:0,eff:0,mv,notes:["불가사의부적"]};
  if(eff===0)return {min:0,max:0,eff:0,mv,notes};

  let P=mv.p;
  if(ov.weightTargetPower){const w=def.c.w||50;P=w>=200?120:w>=100?100:w>=50?80:w>=25?60:w>=10?40:20;}
  if(ov.weightRatioPower){const r=(atk.c.w||50)/(def.c.w||50);P=r>=5?120:r>=4?100:r>=3?80:r>=2?60:40;}
  if(ov.extraAtkHp){notes.push("HP 비례기(만피 가정)");if(moveId==="Flail"||moveId==="Reversal"){P=20;}}
  if(ov.extraAtkSpe){const r=atk.st.spe*boostMul(atk.boosts.spe)/(def.st.spe*boostMul(def.boosts.spe));P=r>=4?150:r>=3?120:r>=2?80:r>=1?60:40;}
  if(ov.extraDefSpe){P=Math.min(150,Math.floor(25*(def.st.spe*boostMul(def.boosts.spe))/(atk.st.spe*boostMul(atk.boosts.spe)))+1);}
  if(moveId==="Facade"&&atk.burn){P*=2;notes.push("페이스 위력 2배");}
  if(moveId==="Acrobatics"&&!atk.item)P*=2;
  let pMod=1;
  if(TYPE_ITEM[atk.item]===mv.t)pMod*=1.2;
  if(atk.item==="Muscle Band"&&mv.c==="Physical")pMod*=1.1;
  if(atk.item==="Wise Glasses"&&mv.c==="Special")pMod*=1.1;
  if(atk.ability==="Technician"&&P<=60)pMod*=1.5;
  if(atk.ability==="Tough Claws"&&mv.ct)pMod*=1.3;
  if(atk.ability==="Iron Fist"&&mv.pu)pMod*=1.2;
  if(atk.ability==="Sharpness"&&mv.sl)pMod*=1.5;
  if(atk.ability==="Punk Rock"&&mv.sd)pMod*=1.3;
  if(atk.ability==="Sheer Force"&&mv.se)pMod*=1.3;
  if(atk.ability==="Water Bubble"&&mv.t==="Water")pMod*=2;
  if((atk.ability==="Steelworker"||atk.ability==="Steely Spirit")&&mv.t==="Steel")pMod*=1.5;
  if(atk.ability==="Dragon's Maw"&&mv.t==="Dragon")pMod*=1.5;
  if(atk.ability==="Transistor"&&mv.t==="Electric")pMod*=1.3;
  if(atk.ability==="Rocky Payload"&&mv.t==="Rock")pMod*=1.5;
  if(dAb==="Heatproof"&&mv.t==="Fire")pMod*=0.5;
  if(dAb==="Purifying Salt"&&mv.t==="Ghost")pMod*=0.5;
  if(dAb==="Dry Skin"&&mv.t==="Fire")pMod*=1.25;
  P=Math.max(1,pm(P,pMod));

  let aKey=mv.c==="Physical"?"atk":"spa";
  let dKey=mv.c==="Physical"?"def":"spd";
  if(ov.atkPtKey)aKey=ov.atkPtKey;
  if(ov.defPtKey)dKey=ov.defPtKey;
  const aSrc=ov.atkRowFromDefender?def:atk;
  let A=aSrc.st[aKey];
  A=pm(A,state.crit&&aSrc.boosts[aKey]<0?1:boostMul(aSrc.boosts[aKey]));
  let D=def.st[dKey];
  D=pm(D,state.crit&&def.boosts[dKey]>0?1:boostMul(def.boosts[dKey]));

  if((atk.ability==="Huge Power"||atk.ability==="Pure Power")&&aKey==="atk")A=pm(A,2);
  if(atk.ability==="Hustle"&&aKey==="atk")A=pm(A,1.5);
  if(atk.ability==="Guts"&&atk.burn&&aKey==="atk")A=pm(A,1.5);
  if(atk.ability==="Solar Power"&&state.weather==="sun"&&aKey==="spa")A=pm(A,1.5);
  if(atk.item==="Choice Band"&&aKey==="atk")A=pm(A,1.5);
  if(atk.item==="Choice Specs"&&aKey==="spa")A=pm(A,1.5);
  if(atk.item==="Light Ball"&&atk.c.base==="Pikachu")A=pm(A,2);
  if(dAb==="Fur Coat"&&dKey==="def")D=pm(D,2);
  if(dAb==="Ice Scales"&&mv.c==="Special")D=pm(D,2);
  if(def.item==="Assault Vest"&&dKey==="spd")D=pm(D,1.5);
  if(def.item==="Eviolite"&&def.c.nfe)D=pm(D,1.5);
  if(state.weather==="sand"&&def.types.includes("Rock")&&dKey==="spd")D=pm(D,1.5);
  if(state.weather==="snow"&&def.types.includes("Ice")&&dKey==="def")D=pm(D,1.5);

  let base=Math.floor(Math.floor(Math.floor(2*50/5+2)*P*A/D)/50)+2;

  let mod=1;
  if(state.weather==="sun"){if(mv.t==="Fire")mod*=1.5;if(mv.t==="Water")mod*=0.5;}
  if(state.weather==="rain"){if(mv.t==="Water")mod*=1.5;if(mv.t==="Fire")mod*=0.5;}
  if(state.terrain==="electric"&&mv.t==="Electric"&&grounded(atk))mod*=1.3;
  if(state.terrain==="grassy"&&mv.t==="Grass"&&grounded(atk))mod*=1.3;
  if(state.terrain==="psychic"&&mv.t==="Psychic"&&grounded(atk))mod*=1.3;
  if(state.terrain==="misty"&&mv.t==="Dragon"&&grounded(def)){mod*=0.5;notes.push("미스트필드");}
  if(state.terrain==="grassy"&&["Earthquake","Bulldoze","Magnitude"].includes(moveId)){mod*=0.5;notes.push("그래스필드 반감");}
  if(def.screen&&!state.crit)mod*=0.5;
  if(state.crit)mod*=1.5;
  // 변환자재/리베로: 모든 기술이 자속
  const protean=atk.ability==="Protean"||atk.ability==="Libero";
  const stab=(protean||atk.types.includes(mv.t))?(atk.ability==="Adaptability"?2:1.5):1;
  if(protean&&!atk.types.includes(mv.t))notes.push("변환자재 자속");
  const burnMod=(atk.burn&&mv.c==="Physical"&&atk.ability!=="Guts"&&moveId!=="Facade")?0.5:1;
  let post=1;
  if(atk.ability==="Tinted Lens"&&eff<1)post*=2;
  if(atk.ability==="Neuroforce"&&eff>1)post*=1.25;
  if((dAb==="Filter"||dAb==="Solid Rock"||dAb==="Prism Armor")&&eff>1)post*=0.75;
  if(dAb==="Multiscale"||dAb==="Shadow Shield"){post*=0.5;notes.push("멀티스케일(만피 가정)");}
  if(dAb==="Thick Fat"&&(mv.t==="Fire"||mv.t==="Ice"))post*=0.5;
  if(dAb==="Fluffy"){if(mv.ct)post*=0.5;if(mv.t==="Fire")post*=2;}
  if(atk.item==="Life Orb")post*=1.3;
  if(atk.item==="Expert Belt"&&eff>1)post*=1.2;
  // 반감열매: 계산에는 미적용, 경고만 표시 (1회용이라 발동 여부 불확실)
  const rbType=RESIST_BERRY[def.item];
  if(rbType===mv.t&&(eff>1||rbType==="Normal"))
    notes.push("⚠ "+(DB.items[def.item]?DB.items[def.item].ko:def.item)+" 발동 시 반감");
  // 변환자재/리베로: 현재 속성 미지정 시에만 경고 (지정 시 해당 타입으로 계산됨)
  if((dAb==="Protean"||dAb==="Libero")&&!(def.cfg&&def.cfg.curType))
    notes.push("⚠ 변환자재: '현재 속성'을 지정하면 정확히 계산돼요");
  else if((dAb==="Protean"||dAb==="Libero")&&def.cfg&&def.cfg.curType)
    notes.push("현재 속성 "+(DB.typesKo[def.cfg.curType]||def.cfg.curType)+" 기준");

  const dmg=r=>Math.max(1,Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(pm(base,mod)*r/100)*stab)*eff)*burnMod)*post));
  let min,max,perRoll,hitParts=null;
  const asc=ASCEND_HIT[moveId];
  if(asc){ // 트리플악셀류: 타별 위력(20/40/60 등)으로 개별 계산
    const per=asc.map(hp2=>{
      const b2=Math.floor(Math.floor(Math.floor(2*50/5+2)*Math.max(1,pm(hp2,pMod))*A/D)/50)+2;
      const d2=r=>Math.max(1,Math.floor(Math.floor(Math.floor(Math.floor(Math.floor(pm(b2,mod)*r/100)*stab)*eff)*burnMod)*post));
      return {min:d2(85),max:d2(100),d2};
    });
    min=per.reduce((a,x)=>a+x.min,0);max=per.reduce((a,x)=>a+x.max,0);
    perRoll=Array.from({length:16},(_,i)=>per.reduce((a,x)=>a+x.d2(85+i),0));
    hitParts=per.map(x=>({min:x.min,max:x.max}));
    let cum=0;
    notes.push(per.map((x,i)=>{cum+=x.max;return `${i+1}타 ${x.min}~${x.max}(누적~${cum})`;}).join(" · "));
    if(mv.ac)notes.push("각 타 명중 "+mv.ac+"%");
  }else{
    min=dmg(85);max=dmg(100);
    perRoll=Array.from({length:16},(_,i)=>dmg(85+i));
    const hits=MULTI_HIT[moveId];
    if(hits!==undefined){
      if(hits===1)notes.push("연속기 2~5회 (1회당 표시)");
      else{
        hitParts=Array.from({length:hits},()=>({min,max}));
        notes.push(hits+"회 합산 · 1회당 "+min+"~"+max);
        min*=hits;max*=hits;
      }
    }
  }
  // 기합의띠: 만피 확정 1타여도 1회 버팀
  if(def.item==="Focus Sash"&&min>=def.st.hp)notes.push("기합의띠: 만피 시 1회 버팀");
  return {min,max,eff,mv,notes,perRoll,hitParts};
}
function koText(res,hp){
  if(!res||res.max===0)return {t:"무효",c:"ko3"};
  const nMax=Math.ceil(hp/res.max),nMin=Math.ceil(hp/res.min);
  if(nMax===1&&nMin===1)return {t:"확정 1타",c:"ko1"};
  if(nMax===1){let cnt=0;if(res.perRoll)for(const d of res.perRoll)if(d>=hp)cnt++;
    return {t:"난수 1타"+(cnt?` (${(cnt/16*100).toFixed(0)}%)`:""),c:"ko2"};}
  if(nMax===nMin)return {t:`확정 ${nMax}타`,c:nMax===2?"ko2":"ko3"};
  return {t:`난수 ${nMax}타`,c:nMax===2?"ko2":"ko3"};
}
const isProtean=ab=>ab==="Protean"||ab==="Libero";
function buildSide(cfg){
  const spec=effSpecies(cfg);if(!spec)return null;
  const c=cre(spec);
  // 변환자재/리베로 + 현재 속성 지정 시: 해당 단일 타입으로 수비 상성 계산
  const types=(isProtean(cfg.ability)&&cfg.curType)?[cfg.curType]:c.types;
  return {c,types,st:calcStats(c,cfg.nature,cfg.pts),ability:cfg.ability,
    item:cfg.item,boosts:cfg.boosts,burn:cfg.burn,screen:false,cfg};
}

// ===== UI 공통 =====
function typeBadges(el,types){
  el.innerHTML="";
  for(const t of types){const s=document.createElement("span");s.className="tb";
    s.style.background=TYPE_COLORS[t];s.textContent=DB.typesKo[t]||t;el.appendChild(s);}
}
function statBars(el,c,stats){
  el.innerHTML="";
  for(const s of STATS){
    const d=document.createElement("div");d.className="st";
    const pct=Math.min(100,c.bs[s]/180*100);
    const col=c.bs[s]>=120?"#4ade80":c.bs[s]>=90?"#facc15":c.bs[s]>=60?"#fb923c":"#f87171";
    d.innerHTML=`<span>${STAT_KO_S[s]}</span><span style="color:var(--tx2)">${c.bs[s]}</span>
      <div class="bar"><i style="width:${pct}%;background:${col}"></i></div><span class="rv">${stats[s]}</span>`;
    el.appendChild(d);
  }
}
function fillSelect(sel,arr,cur){
  sel.innerHTML="";for(const[v,l]of arr){const o=document.createElement("option");o.value=v;o.textContent=l;sel.appendChild(o);}
  if(cur!==undefined)sel.value=cur;
}
function boostSelects(el,boosts,onCh){
  el.innerHTML="";
  for(const k of["atk","def","spa","spd","spe"]){
    const s=document.createElement("select");
    for(let v=6;v>=-6;v--){const o=document.createElement("option");o.value=v;o.textContent=(v>0?"+":"")+v;s.appendChild(o);}
    s.value=boosts[k];s.onchange=()=>{boosts[k]=+s.value;onCh();};
    el.appendChild(s);
  }
}
function spriteUrl(c){return c&&c.sprite?`assets/sprites/${c.sprite}.webp`:"";}

// ===== 상대 =====
function setOpp(id){
  const rb=resolveToBase(id);
  state.opp.species=rb.species;
  state.opp.forme=rb.forme; // 팀 슬롯에 고정된 폼(메가 포함) 유지 — 자동 메가는 없음
  applyOppUsageDefaults();
  const disp=cre(rb.species);
  $("oppSearch").value=rb.species?(disp._label||disp.ko):"";
  renderOpp();
  // 실시간 채용률 갱신 후 재적용
  const uid=usageIdFor(state.opp);
  requestLive(uid,()=>{
    if(usageIdFor(state.opp)===uid){applyOppUsageDefaults();renderOpp();}
  });
}
function applyOppUsageDefaults(){
  const o=state.opp;if(!o.species)return;
  const u=usageOf(usageIdFor(o));
  if(!u){o.ability=Object.values(cre(effSpecies(o)).ab)[0]||"";o.item="";o.nature="Serious";
    o.pts={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};return;}
  o.ability=u.ab[0]?u.ab[0][0]:"";o.item=u.it[0]?u.it[0][0]:"";o.nature=u.na[0]?u.na[0][0]:"Serious";
  o.pts={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
  if(u.sp[0])for(const[k,s]of Object.entries(u.sp[0][0]))o.pts[SPKEY[k]]=s;
  o.curType="";
  // 기본 폼 우선: 메가스톤이 1위여도 자동 메가진화하지 않음
}
// ===== 현재 속성 (변환자재/리베로) =====
function renderCurTypeRow(side){ // 'opp' | 'my'
  const cfg=side==="opp"?state.opp:mySel();
  const row=$(side+"CurTypeRow"),btn=$(side+"CurType");
  if(!cfg||!isProtean(cfg.ability)){row.style.display="none";if(cfg)cfg.curType="";return;}
  row.style.display="";
  if(cfg.curType){
    btn.innerHTML=`<span class="tb" style="background:${TYPE_COLORS[cfg.curType]}">${DB.typesKo[cfg.curType]}</span>`;
  }else btn.textContent="원래 타입";
}
let typePickTarget=null;
function openTypePicker(side){
  typePickTarget=side;
  const g=$("typeGrid");g.innerHTML="";
  const cfg=side==="opp"?state.opp:mySel();
  for(const t of Object.keys(CHART)){
    const b=document.createElement("button");
    b.className="btn";
    b.style.background=TYPE_COLORS[t];b.style.color="#fff";b.style.borderColor="transparent";
    if(cfg&&cfg.curType===t)b.style.outline="2px solid var(--tx)";
    b.textContent=DB.typesKo[t]||t;
    b.onclick=()=>{pickCurType(t);};
    g.appendChild(b);
  }
  $("typeModal").classList.add("on");
}
function pickCurType(t){
  const cfg=typePickTarget==="opp"?state.opp:mySel();
  if(cfg){cfg.curType=t;if(typePickTarget!=="opp")save();}
  $("typeModal").classList.remove("on");
  if(typePickTarget==="opp")renderOpp();else renderMy();
}
function renderOppTeam(){
  const el=$("oppTeam");el.innerHTML="";
  state.oppTeam.forEach((id,i)=>{
    const d=document.createElement("div");
    d.className="slot"+(id&&resolveToBase(id).species===state.opp.species?" sel":"");
    if(id){const img=document.createElement("img");img.src=spriteUrl(cre(id));img.title=cre(id).ko;d.appendChild(img);}
    else d.innerHTML='<span class="empty">·</span>';
    d.onclick=()=>{if(id)setOpp(id);};
    d.oncontextmenu=e=>{e.preventDefault();state.oppTeam[i]=null;save();renderOppTeam();renderSpeed();};
    el.appendChild(d);
  });
  const clr=document.createElement("button");clr.className="btn";clr.textContent="비우기";clr.style.padding="4px 8px";
  clr.onclick=()=>{state.oppTeam=[null,null,null,null,null,null];save();renderOppTeam();renderSpeed();};
  el.appendChild(clr);
}
function renderOpp(){
  const o=state.opp;
  renderOppTeam();
  if(!o.species){$("oppName").textContent="—";$("oppImg").src="";$("oppTypes").innerHTML="";$("oppStats").innerHTML="";
    fillSelect($("oppForm"),[]);fillSelect($("oppAb"),[]);fillSelect($("oppNat"),[]);fillSelect($("oppSp"),[]);
    $("oppItemBtn").innerHTML="—";
    renderSpeed();renderResults();return;}
  const spec=effSpecies(o),c=cre(spec),u=usageOf(usageIdFor(o));
  const live=u&&u._src?` · 실시간 ${u._src}`:"";
  $("oppName").innerHTML=c.ko+(o.forme?" ("+formeLabel(o.forme)+")":"")+`<span class="small">${live}</span>`;
  $("oppImg").src=spriteUrl(c);
  statBars($("oppStats"),c,calcStats(c,o.nature,o.pts));
  fillSelect($("oppForm"),formeOptions(o.species),o.forme||o.species);
  const pct=v=>` (${v}%)`;
  let abList=u?u.ab.map(([a,p])=>[a,(DB.abilities[a]||a)+pct(p)]):Object.values(cre(o.species).ab).map(a=>[a,DB.abilities[a]||a]);
  if(o.forme){const ma=Object.values(c.ab);
    for(const a of ma)if(!abList.find(x=>x[0]===a))abList.unshift([a,(DB.abilities[a]||a)+" (폼)"]);
    if(!abList.find(x=>x[0]===o.ability))o.ability=ma[0]||o.ability;}
  if(!abList.find(x=>x[0]===o.ability))o.ability=abList[0]?abList[0][0]:"";
  fillSelect($("oppAb"),abList,o.ability);
  // 특성 확정 후에 타입 배지/현재속성 행 렌더 (메가 폼 특성 반영)
  typeBadges($("oppTypes"),(isProtean(o.ability)&&o.curType)?[o.curType]:c.types);
  renderCurTypeRow("opp");
  renderItemBtn($("oppItemBtn"),o.item,u,o);
  fillSelect($("oppNat"),u?u.na.map(([n,p])=>[n,natLabel(n)+pct(p)]):Object.keys(DB.natures).map(n=>[n,natLabel(n)]),o.nature);
  fillSelect($("oppSp"),u?u.sp.map(([sp,p],i)=>[i,spLabel(sp)+pct(p)]):[[0,"무보정"]],0);
  boostSelects($("oppBoost"),o.boosts,()=>{renderSpeed();renderResults();});
  $("oppBurn").checked=o.burn;$("oppScreen").checked=o.screen;
  renderSpeed();renderResults();
}
// ===== 아이템 버튼/피커 =====
function itemIconUrl(id){return "assets/item_icons/"+id.toLowerCase().replace(/[^a-z0-9]/g,"")+".png";}
function itemIconCdn(id){return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/"+
  id.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".png";}
function iconImg(id){ // 로컬 → CDN → 숨김 폴백 체인
  return `<img src="${itemIconUrl(id)}" data-cdn="${itemIconCdn(id)}" `+
    `onerror="if(!this.dataset.f){this.dataset.f=1;this.src=this.dataset.cdn;}else this.style.visibility='hidden';">`;
}
function megaStoneFor(cfg){ // 해당 포켓몬 전용 메가스톤 (아이콘 표시용)
  if(!cfg||!cfg.species)return null;
  const target=cfg.forme&&cfg.forme.includes("-Mega")?cfg.forme:null;
  const megas=formeOptions(cfg.species).map(x=>x[0]).filter(f=>f.includes("-Mega"));
  let first=null;
  for(const[id,v]of Object.entries(DB.items)){
    if(!v.mega)continue;
    if(target&&v.mega===target)return id;
    if(!first&&megas.includes(v.mega))first=id;
  }
  return first;
}
function itemDisplayIcon(itemId,cfg){
  if(itemId==="__mega"){const st=megaStoneFor(cfg);return st?iconImg(st):"";}
  return itemId?iconImg(itemId):"";
}
function renderItemBtn(btn,itemId,usage,cfg){
  const ko=itemId?(DB.items[itemId]?DB.items[itemId].ko:itemId):"(없음)";
  let rate="";
  if(itemId&&usage){const hit=usage.it.find(e=>e[0]===itemId);if(hit)rate=` (${hit[1]}%)`;}
  btn.innerHTML=itemDisplayIcon(itemId,cfg)+`<span>${ko}${rate}</span>`;
}
let itemPickTarget=null; // 'opp' | 'my'
function openItemPicker(target){
  itemPickTarget=target;
  $("itemSearch").value="";
  renderItemList("");
  $("itemModal").classList.add("on");
  $("itemSearch").focus();
}
function renderItemList(q){
  const el=$("itemList");el.innerHTML="";
  q=q.trim();
  const cfg=itemPickTarget==="opp"?state.opp:mySel();
  const cur=cfg?cfg.item:"";
  const u=itemPickTarget==="opp"?usageOf(usageIdFor(state.opp)):null;
  const add=(id,pctTx)=>{
    const d=document.createElement("div");
    d.className="pickItem"+(id===cur?" cur":"");
    const ko=DB.items[id]?DB.items[id].ko:id;
    d.innerHTML=itemDisplayIcon(id,cfg)+`<span>${ko}</span>`+
      (pctTx?`<span class="pct">${pctTx}</span>`:"");
    d.onclick=()=>{pickItem(id);};
    el.appendChild(d);
  };
  const matches=(id)=>{
    if(!q)return true;
    const ko=DB.items[id]?DB.items[id].ko:id;
    return ko.includes(q)||id.toLowerCase().includes(q.toLowerCase());
  };
  if(u&&!q){
    const h=document.createElement("div");h.className="pickHead";h.textContent="채용률 상위";el.appendChild(h);
    for(const e of u.it)if(DB.items[e[0]])add(e[0],e[1]+"%");
  }
  const h2=document.createElement("div");h2.className="pickHead";h2.textContent=q?"검색 결과":"장착 가능 아이템";el.appendChild(h2);
  [...ITEM_ALLOW]
    .filter(id=>matches(id))
    .sort((a,b)=>DB.items[a].ko.localeCompare(DB.items[b].ko,"ko"))
    .forEach(id=>add(id,""));
}
function pickItem(id){
  if(itemPickTarget==="opp"){state.opp.item=id;renderOpp();}
  else{const m=mySel();if(m){m.item=id;save();renderMy();renderPartyPage();}}
  $("itemModal").classList.remove("on");
}

// ===== 기술 피커 =====
const TYPE_ORDER=["Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground",
"Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"];
function learnMovesFor(cfg){ // 해당 포켓몬이 배울 수 있는 기술 id 목록
  if(!cfg||!cfg.species)return Object.keys(DB.moves);
  const tryKeys=[];
  const spec=effSpecies(cfg),c=cre(spec),bc=cre(cfg.species);
  for(const x of [c,bc]){
    if(!x)continue;
    tryKeys.push(x.safe);
    if(x.safe)tryKeys.push(x.safe.split("_")[0]);
    if(x.base)tryKeys.push(x.base.toLowerCase().replace(/[^a-z0-9]/g,""));
  }
  for(const k of tryKeys)if(k&&DB.learn[k])return DB.learn[k];
  return Object.keys(DB.moves);
}
let mvPickSlot=0;
function openMovePicker(slot){
  const m=mySel();if(!m||!m.species)return;
  mvPickSlot=slot;
  $("mvTitle").textContent=cre(effSpecies(m)).ko+" — 기술 "+(slot+1);
  $("mvSearch").value="";
  renderMoveList("");
  $("mvModal").classList.add("on");
  $("mvSearch").focus();
}
function renderMoveList(q){
  const el=$("mvList");el.innerHTML="";
  q=q.trim();
  const m=mySel();if(!m)return;
  const learn=new Set(learnMovesFor(m));
  const curId=m.moves[mvPickSlot]?(koToMove[m.moves[mvPickSlot]]||null):null;
  const u=usageOf(usageIdFor(m));
  const row=(id,pctTx)=>{
    const mv=DB.moves[id];
    const d=document.createElement("div");
    d.className="pickItem"+(id===curId?" cur":"");
    const cat=mv.c==="Physical"?"물리":mv.c==="Special"?"특수":"변화";
    d.innerHTML=`<span class="tb" style="background:${TYPE_COLORS[mv.t]};font-size:10px;min-width:34px;text-align:center">${DB.typesKo[mv.t]}</span>`+
      `<span>${mv.ko}</span><span class="sub">${cat}${mv.p?" "+mv.p:""} · 명중 ${acTx(mv)}${mv.pr>0?" · 선공+"+mv.pr:""}${pctTx?" · "+pctTx:""}</span>`;
    d.onclick=()=>{m.moves[mvPickSlot]=mv.ko;save();renderMy();renderPartyPage();$("mvModal").classList.remove("on");};
    el.appendChild(d);
  };
  const match=id=>{
    if(!q)return true;
    return DB.moves[id].ko.includes(q)||id.toLowerCase().includes(q.toLowerCase());
  };
  // 채용률 상위 (습득 가능 기술만)
  if(u&&!q){
    const top=u.mv.filter(([id])=>DB.moves[id]&&learn.has(id)).slice(0,10);
    if(top.length){
      const h=document.createElement("div");h.className="pickHead";h.textContent="채용률 상위";el.appendChild(h);
      for(const[id,p]of top)row(id,p+"%");
    }
  }
  // 타입별 → 가나다순 (습득 가능 기술만)
  for(const t of TYPE_ORDER){
    const ids=[...learn].filter(id=>DB.moves[id]&&DB.moves[id].t===t&&match(id))
      .sort((a,b)=>DB.moves[a].ko.localeCompare(DB.moves[b].ko,"ko"));
    if(!ids.length)continue;
    const h=document.createElement("div");h.className="pickHead";
    h.innerHTML=`<span class="tb" style="background:${TYPE_COLORS[t]};font-size:10px">${DB.typesKo[t]}</span> 타입`;
    el.appendChild(h);
    for(const id of ids)row(id,"");
  }
}

function ptsFromValue(base,key,value,up,dn){ // 실수치 → 포인트 역산 (Lv50, IV31)
  if(value==null||!base)return null;
  if(key==="hp"){
    const bc=Math.floor((2*base+31)*50/100)+60;
    const p=value-bc;
    return p>=0&&p<=32?p:null;
  }
  const bc=Math.floor((2*base+31)*50/100)+5;
  const mult=up===key?1.1:dn===key?0.9:1;
  for(let p=0;p<=32;p++)if(Math.floor((bc+p)*mult)===value)return p;
  return null;
}

// ===== 내 포켓몬 =====
function renderSlots(){
  const el=$("slots");el.innerHTML="";
  party().mons.forEach((m,i)=>{
    const d=document.createElement("div");d.className="slot"+(i===state.meSel?" sel":"");
    if(m&&m.species){const img=document.createElement("img");img.src=spriteUrl(cre(effSpecies(m)));img.title=cre(m.species).ko;d.appendChild(img);}
    else d.innerHTML='<span class="empty">+</span>';
    d.onclick=()=>{state.meSel=i;renderMy();};
    d.oncontextmenu=e=>{e.preventDefault();if(confirm("이 슬롯을 비울까요?")){party().mons[i]=null;save();renderMy();renderPartyPage();}};
    el.appendChild(d);
  });
  $("myPartyName").textContent="— "+party().name;
}
function renderMy(){
  renderSlots();
  const m=mySel();
  if(!m||!m.species){$("myName").textContent="—";$("myImg").src="";$("myTypes").innerHTML="";$("myStats").innerHTML="";
    $("myPts").innerHTML="";$("myMoves").innerHTML="";fillSelect($("myForm"),[]);fillSelect($("myAb"),[]);$("myItemBtn").innerHTML="—";
    $("myNatBtn").textContent="—";$("mySearch").value="";renderSpeed();renderResults();return;}
  const spec=effSpecies(m),c=cre(spec),bc=cre(m.species);
  $("myName").textContent=c.ko+(m.forme?" ("+formeLabel(m.forme)+")":"");
  $("myImg").src=spriteUrl(c);
  $("mySearch").value=bc._label||bc.ko;
  statBars($("myStats"),c,calcStats(c,m.nature,m.pts));
  fillSelect($("myForm"),formeOptions(m.species),m.forme||m.species);
  const abs=Object.values(c.ab).map(a=>[a,DB.abilities[a]||a]);
  if(!m.ability||!abs.find(x=>x[0]===m.ability))m.ability=abs[0]?abs[0][0]:"";
  fillSelect($("myAb"),abs,m.ability);
  // 특성 확정 후에 타입 배지/현재속성 행 렌더 (메가 폼 특성 반영)
  typeBadges($("myTypes"),(isProtean(m.ability)&&m.curType)?[m.curType]:c.types);
  renderCurTypeRow("my");
  renderItemBtn($("myItemBtn"),m.item,null,m);
  $("myNatBtn").textContent=natLabel(m.nature);
  const pts=$("myPts");pts.innerHTML="";
  const ptsTotal=()=>STATS.reduce((a,s)=>a+(m.pts[s]||0),0);
  const updateTotal=()=>{
    const t=ptsTotal();
    const el=$("myPtsTotal");
    el.textContent=t+"/66";
    el.style.color=t>66?"var(--red)":t===66?"var(--grn)":"var(--tx2)";
  };
  updateTotal();
  for(const s of STATS){
    const d=document.createElement("div");
    d.innerHTML=`<label>${STAT_KO_M[s]}</label>`;
    const inp=document.createElement("input");inp.type="number";inp.min=0;inp.max=32;inp.value=m.pts[s]||0;
    inp.onchange=()=>{
      let v=Math.max(0,Math.min(32,+inp.value||0));
      const others=ptsTotal()-(m.pts[s]||0);
      if(others+v>66)v=Math.max(0,66-others); // 총합 66 초과 방지
      m.pts[s]=v;save();renderMy();renderPartyPage();
    };
    d.appendChild(inp);pts.appendChild(d);
  }
  if(m.moves.every(x=>!x)){
    const u=usageOf(usageIdFor(m));
    if(u){m.moves=u.mv.slice(0,4).map(([id])=>DB.moves[id]?DB.moves[id].ko:"");
      while(m.moves.length<4)m.moves.push("");save();}
  }
  const mvEl=$("myMoves");mvEl.innerHTML="";
  m.moves.forEach((mvKo,i)=>{
    const b=document.createElement("button");b.className="btn mvBtn";
    const id=mvKo?(koToMove[mvKo]||fuzzyFind(mvKo,koToMove)):null;
    if(id){const mv=DB.moves[id];
      b.innerHTML=`<span class="tb" style="background:${TYPE_COLORS[mv.t]};font-size:10px">${DB.typesKo[mv.t]}</span>`+
        `<span>${mv.ko}</span><span class="small" style="margin-left:auto">${mv.c==="Physical"?"물":mv.c==="Special"?"특":"변"}${mv.p||""} · ${acTx(mv)}</span>`;}
    else b.innerHTML=`<span class="small">기술 ${i+1} 선택...</span>`;
    b.onclick=()=>openMovePicker(i);
    mvEl.appendChild(b);
  });
  boostSelects($("myBoost"),m.boosts,()=>{renderSpeed();renderResults();});
  $("myBurn").checked=m.burn;$("myScreen").checked=m.screen;
  renderSpeed();renderResults();
}

// ===== 스피드 비교 =====
function mySpeed(){
  const m=mySel();if(!m||!m.species)return null;
  const c=cre(effSpecies(m));
  const st=calcStats(c,m.nature,m.pts);
  let s=pm(st.spe,boostMul(m.boosts.spe));
  if(m.item==="Choice Scarf")s=Math.floor(s*1.5);
  if(m.item==="Iron Ball")s=Math.floor(s*0.5);
  const ab=m.ability,w=state.weather;
  if((ab==="Swift Swim"&&w==="rain")||(ab==="Chlorophyll"&&w==="sun")||(ab==="Sand Rush"&&w==="sand")||(ab==="Slush Rush"&&w==="snow"))s*=2;
  if($("twMy").checked)s*=2;
  return s;
}
function spdScenarios(id){
  const b=cre(id).bs.spe;
  const lo=Math.floor((Math.floor(2*b*50/100)+5)*0.9);
  const neu=Math.floor((2*b+31)*50/100)+5;
  const semi=neu+32;
  const mx=Math.floor((neu+32)*1.1);
  const scarf=Math.floor(mx*1.5);
  let est=null,estTip="";
  const u=usageOf(id);
  if(u){
    let estId=id;
    const topEntry=u.it[0];
    const topItem=topEntry?topEntry[0]:"";
    if(topItem==="__mega"){ // 통합 메가스톤: 원본 스톤(topEntry[2]) → 메가폼, 없으면 첫 메가폼
      const stone=topEntry[2]&&DB.items[topEntry[2]];
      let mid=stone&&stone.mega;
      if(!mid){const c0=cre(id);mid=(c0.formes||[]).find(f=>f.includes("-Mega"));}
      if(mid&&DB.creatures[mid])estId=mid;
    }else{
      const mi=DB.items[topItem];
      if(mi&&mi.mega&&DB.creatures[mi.mega])estId=mi.mega;
    }
    const be=cre(estId).bs.spe;
    const nat=u.na[0]?DB.natures[u.na[0][0]]:null;
    const sp=u.sp[0]?u.sp[0][0]:null;const p=sp?(sp.s||0):0;
    let v=Math.floor((2*be+31)*50/100)+5+p;
    if(nat){if(nat.up==="spe")v=Math.floor(v*1.1);else if(nat.dn==="spe")v=Math.floor(v*0.9);}
    if(topItem==="Choice Scarf")v=Math.floor(v*1.5);
    est=v;
    estTip=(u.na[0]?DB.natures[u.na[0][0]].ko:"")+" 스"+p+(topItem?" · "+(DB.items[topItem]?DB.items[topItem].ko:topItem):"")+(estId!==id?" · 메가":"");
  }
  return {lo,neu,semi,mx,scarf,est,estTip};
}
function spdCell(v,my){
  if(v==null)return '<td class="spdCell ko3">—</td>';
  if(my==null)return `<td class="spdCell">${v}</td>`;
  const tr=$("trickRoom").checked;
  let cls;
  if(v===my)cls="spdTie";
  else{const iWin=my>v;cls=(tr?!iWin:iWin)?"spdWin":"spdLose";}
  return `<td class="spdCell ${cls}">${v}</td>`;
}
function renderSpeed(){
  const my=mySpeed();
  const m=mySel();
  $("spdMyName").textContent=m&&m.species?cre(effSpecies(m)).ko:"포켓몬";
  $("spdMyVal").textContent=my==null?"—":my;
  const tb=$("spdTbl");tb.innerHTML="";
  let ids=state.oppTeam.filter(x=>x);
  if(!ids.length&&state.opp.species)ids=[state.opp.species];
  const twOpp=$("twOpp").checked?2:1;
  for(const id of ids){
    const s=spdScenarios(id);
    const f=v=>v==null?null:Math.floor(v*twOpp);
    const tr=document.createElement("tr");
    tr.innerHTML=`<td><div class="spdMon"><img src="${spriteUrl(cre(id))}"><b>${cre(id).ko}</b><span class="small">${cre(id).bs.spe}</span></div></td>`
      +spdCell(f(s.lo),my)+spdCell(f(s.neu),my)+spdCell(f(s.semi),my)+spdCell(f(s.mx),my)+spdCell(f(s.scarf),my)
      +(s.est!=null?`<td class="spdCell ${spdCell(f(s.est),my).match(/spd\w+/)?spdCell(f(s.est),my).match(/spd\w+/)[0]:""}" title="${s.estTip}">${f(s.est)}<div class="small">${s.estTip}</div></td>`:'<td class="spdCell ko3">—</td>');
    tr.style.cursor="pointer";
    tr.onclick=()=>setOpp(id);
    tb.appendChild(tr);
  }
  if(!ids.length)tb.innerHTML='<tr><td colspan="7" class="small">상대 팀이 비어 있습니다 — 선출 화면을 인식시키거나 포켓몬을 검색하세요</td></tr>';
}

// ===== 데미지 결과 =====
function renderResults(){
  const o=state.opp,m=mySel();
  const oppSide=o.species?buildSide(o):null;
  const mySide=(m&&m.species)?buildSide(m):null;
  const t1=$("tblOpp"),t2=$("tblMy");t1.innerHTML="";t2.innerHTML="";
  $("titleOppAtk").textContent=(oppSide?oppSide.c.ko:"상대")+" → "+(mySide?mySide.c.ko:"내 포켓몬")+" (채용률순)";
  $("titleMyAtk").textContent=(mySide?mySide.c.ko:"내 포켓몬")+" → "+(oppSide?oppSide.c.ko:"상대");
  if(oppSide&&mySide){
    const u=usageOf(usageIdFor(o));
    const rows=[];
    if(u)for(const[id,rate]of u.mv){
      const mv=DB.moves[id];if(!mv)continue;
      if(mv.c==="Status"&&!DB.overrides[id])continue;
      rows.push([id,rate]);if(rows.length>=8)break;
    }
    const hp=mySide.st.hp;
    for(const[id,rate]of rows){
      const def={...mySide,screen:o.screen};
      const res=calcDamage({...oppSide},def,id);
      t1.appendChild(dmgRow(DB.moves[id],res,hp,rate));
    }
    if(!rows.length)t1.innerHTML='<tr><td colspan="5" class="small">채용률 데이터 없음</td></tr>';
  }
  if(mySide&&oppSide){
    const hp=oppSide.st.hp;
    for(const mvKo of m.moves){
      if(!mvKo)continue;
      const id=koToMove[mvKo]||fuzzyFind(mvKo,koToMove);
      if(!id){t2.appendChild(simpleRow(mvKo,"기술을 찾을 수 없음"));continue;}
      const mv=DB.moves[id];
      if(mv.c==="Status"&&!DB.overrides[id]){t2.appendChild(simpleRow(mv.ko,"변화기"));continue;}
      const def={...oppSide,screen:m.screen};
      const res=calcDamage({...mySide},def,id);
      t2.appendChild(dmgRow(mv,res,hp,null));
    }
  }
}
function dmgRow(mv,res,hp,rate){
  const tr=document.createElement("tr");
  const badge=`<span class="tb" style="background:${TYPE_COLORS[mv.t]};font-size:10px">${DB.typesKo[mv.t]}</span>`;
  const cat=mv.c==="Physical"?"물리":mv.c==="Special"?"특수":"변화";
  const pri=mv.pr>0?` <span class="small" style="color:var(--yel)">선공+${mv.pr}</span>`:"";
  let dtxt,btxt="",ko={t:"—",c:"ko3"};
  if(!res){dtxt="—";}
  else if(res.max===0){dtxt="무효";ko=koText(res,hp);}
  else{
    const pmin=res.min/hp*100,pmax=res.max/hp*100;
    dtxt=`${res.min}~${res.max} <span class="small">(${pmin.toFixed(1)}~${pmax.toFixed(1)}%)</span>`;
    const w=Math.min(100,pmax),w2=Math.min(100,pmin);
    const col=pmax>=100?"var(--red)":pmax>=50?"var(--yel)":"var(--grn)";
    // 연속기: 타수 경계마다 얇은 눈금 (트리플악셀은 타별 데미지가 달라 간격이 다름)
    let divs="";
    if(res.hitParts&&res.hitParts.length>1){
      let cum=0;
      for(let i=0;i<res.hitParts.length-1;i++){
        cum+=res.hitParts[i].max;
        const p=cum/hp*100;
        if(p<100)divs+=`<i class="dmgdiv" style="left:${p}%"></i>`;
      }
    }
    btxt=`<div class="dmgbar"><i style="width:${w}%;background:${col};opacity:.35"></i><i style="width:${w2}%;background:${col}"></i>${divs}</div>`;
    ko=koText(res,hp);
  }
  const note=res&&res.notes&&res.notes.length?`<div class="small warn">${res.notes.join(" · ")}</div>`:"";
  const effTx=res&&res.eff!==1&&res.max>0?` <span class="small">x${res.eff}</span>`:"";
  tr.innerHTML=`<td>${badge} ${mv.ko}${effTx}${pri} <span class="small">${cat}${mv.p?" "+mv.p:""} · 명중 ${acTx(mv)}</span>${note}</td>
    <td class="rate">${rate!=null?rate+"%":""}</td>
    <td class="dmgtx">${dtxt}</td><td>${btxt}</td><td class="${ko.c}">${ko.t}</td>`;
  return tr;
}
function simpleRow(name,msg){
  const tr=document.createElement("tr");
  tr.innerHTML=`<td>${name}</td><td></td><td class="small" colspan="3">${msg}</td>`;
  return tr;
}

// ===== 성격 그리드 =====
function buildNatGrid(){
  const order=["atk","def","spa","spd","spe"];
  const t=$("natTable");
  let html='<tr><th></th>'+order.map(s=>`<th class="dn">${STAT_KO[s]}↓</th>`).join("")+"</tr>";
  for(const up of order){
    html+=`<tr><th class="up">${STAT_KO[up]}↑</th>`;
    for(const dn of order){
      if(up===dn)html+=`<td><div class="natCell neutral" data-nat="Serious">무보정</div></td>`;
      else{const n=natureFrom(up,dn);html+=`<td><div class="natCell" data-nat="${n}">${DB.natures[n]?DB.natures[n].ko:n}</div></td>`;}
    }
    html+="</tr>";
  }
  t.innerHTML=html;
  t.querySelectorAll(".natCell").forEach(c=>{
    c.onclick=()=>{
      const m=mySel();if(m){m.nature=c.dataset.nat;save();renderMy();renderPartyPage();}
      $("natModal").classList.remove("on");
    };
  });
}
function openNatGrid(){
  const m=mySel();if(!m)return;
  $("natTable").querySelectorAll(".natCell").forEach(c=>c.classList.toggle("cur",c.dataset.nat===m.nature&&(m.nature!=="Serious"||c.classList.contains("neutral"))));
  $("natModal").classList.add("on");
}

// ===== 파티 페이지 =====
function renderPartyTabs(){
  const el=$("partyTabs");el.innerHTML="";
  state.parties.forEach((p,i)=>{
    const b=document.createElement("div");b.className="ptab"+(i===state.activeParty?" on":"");
    b.textContent=p.name;
    b.onclick=()=>{state.activeParty=i;state.meSel=0;save();renderPartyPage();renderMy();};
    el.appendChild(b);
  });
}
function renderPartyPage(){
  renderPartyTabs();
  const g=$("partyGrid");g.innerHTML="";
  party().mons.forEach((m,i)=>{
    const d=document.createElement("div");
    if(!m||!m.species){
      d.className="pcard empty";d.textContent="+ 슬롯 "+(i+1);d.style.cursor="pointer";
      d.onclick=()=>{state.meSel=i;renderMy();openMonModal();};
      g.appendChild(d);return;
    }
    d.className="pcard";
    const c=cre(effSpecies(m));
    const nat=DB.natures[m.nature];
    const ptsTx=STATS.filter(s=>m.pts[s]>0).map(s=>STAT_KO_M[s]+m.pts[s]).join(" ")||"무보정";
    d.innerHTML=`<img class="spr" src="${spriteUrl(c)}">
      <div class="info"><b>${c.ko}</b> <span class="small">${m.forme?formeLabel(m.forme):""}</span><br>
      <span class="small">특성</span> ${DB.abilities[m.ability]||m.ability||"—"} · <span class="small">아이템</span> ${m.item?(DB.items[m.item]?DB.items[m.item].ko:m.item):"—"}<br>
      <span class="small">성격</span> ${nat?natLabel(m.nature):"—"} · <span class="small">노력치</span> ${ptsTx}<br>
      <div class="mvs">${m.moves.filter(x=>x).map(x=>`<span>${x}</span>`).join("")}</div></div>`;
    d.style.cursor="pointer";
    d.onclick=()=>{state.meSel=i;renderMy();openMonModal();};
    g.appendChild(d);
  });
}
// 파티 탭에서 슬롯 편집: 계산기의 "내 포켓몬" 패널을 모달로 재사용
const monPanelMarker=document.createElement("div");
monPanelMarker.style.display="none";
function openMonModal(){
  const p=$("myPanel");
  if(p.parentElement&&p.parentElement.id!=="monHolder"){
    p.parentElement.insertBefore(monPanelMarker,p);
    $("monHolder").appendChild(p);
  }
  $("monModal").classList.add("on");
}
function closeMonModal(){
  const p=$("myPanel");
  if(monPanelMarker.parentElement){
    monPanelMarker.parentElement.insertBefore(p,monPanelMarker);
    monPanelMarker.remove();
  }
  $("monModal").classList.remove("on");
  renderPartyPage();
}

// ===== 탭 =====
let curTab="calc";
function switchTab(t){
  curTab=t;
  if(typeof closeMonModal==="function"&&monPanelMarker.parentElement)closeMonModal();
  $("tabCalc").classList.toggle("on",t==="calc");
  $("tabParty").classList.toggle("on",t==="party");
  $("pageCalc").style.display=t==="calc"?"":"none";
  $("pageParty").style.display=t==="party"?"block":"none";
}
$("tabCalc").onclick=()=>switchTab("calc");
$("tabParty").onclick=()=>switchTab("party");

// ===== 테마 (라이트/다크) =====
function applyTheme(t){
  document.body.classList.toggle("light",t==="light");
  $("themeBtn").textContent=t==="light"?"🌙":"☀️";
  try{localStorage.setItem("cc_theme",t);}catch(e){}
}
$("themeBtn").onclick=()=>{
  applyTheme(document.body.classList.contains("light")?"dark":"light");
};

// ===== 이벤트 =====
$("weather").onchange=e=>{state.weather=e.target.value;renderSpeed();renderResults();};
$("terrain").onchange=e=>{state.terrain=e.target.value;renderResults();};
$("crit").onchange=e=>{state.crit=e.target.checked;renderResults();};
["twMy","twOpp","trickRoom"].forEach(id=>{$(id).onchange=()=>renderSpeed();});
$("oppSearch").addEventListener("change",e=>{
  const id=koToId[e.target.value.trim()];
  if(id)setOpp(id);
});
$("oppForm").onchange=e=>{
  const o=state.opp;
  o.forme=e.target.value===o.species?"":e.target.value;
  // 상대 팀 슬롯에 폼 고정 → 스피드 비교표에도 반영
  const idx=state.oppTeam.findIndex(t=>t&&resolveToBase(t).species===o.species);
  if(idx>=0){state.oppTeam[idx]=o.forme||o.species;save();}
  renderOpp();
};
$("oppAb").onchange=e=>{state.opp.ability=e.target.value;renderOpp();};
$("oppCurType").onclick=()=>openTypePicker("opp");
$("myCurType").onclick=()=>openTypePicker("my");
$("typeReset").onclick=()=>{
  const cfg=typePickTarget==="opp"?state.opp:mySel();
  if(cfg){cfg.curType="";if(typePickTarget!=="opp")save();}
  $("typeModal").classList.remove("on");
  if(typePickTarget==="opp")renderOpp();else renderMy();
};
$("typeClose").onclick=()=>$("typeModal").classList.remove("on");
$("typeModal").onclick=e=>{if(e.target.id==="typeModal")$("typeModal").classList.remove("on");};
$("oppItemBtn").onclick=()=>{if(state.opp.species)openItemPicker("opp");};
$("oppNat").onchange=e=>{state.opp.nature=e.target.value;renderOpp();};
$("oppSp").onchange=e=>{
  const u=usageOf(state.opp.species);if(!u)return;
  const sp=u.sp[+e.target.value];if(!sp)return;
  state.opp.pts={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
  for(const[k,v]of Object.entries(sp[0]))state.opp.pts[SPKEY[k]]=v;
  const c=cre(effSpecies(state.opp));
  statBars($("oppStats"),c,calcStats(c,state.opp.nature,state.opp.pts));
  renderSpeed();renderResults();
};
$("oppBurn").onchange=e=>{state.opp.burn=e.target.checked;renderResults();};
$("oppScreen").onchange=e=>{state.opp.screen=e.target.checked;renderResults();};

$("mySearch").addEventListener("change",e=>{
  const id=koToId[e.target.value.trim()];
  if(id){
    if(!mySel())party().mons[state.meSel]=newMon(id);
    else{const m=mySel();m.species=id;m.forme="";m.moves=["","","",""];m.ability="";}
    save();renderMy();renderPartyPage();
  }
});
$("myForm").onchange=e=>{const m=mySel();if(m){m.forme=e.target.value===m.species?"":e.target.value;save();renderMy();renderPartyPage();}};
$("myAb").onchange=e=>{const m=mySel();if(m){m.ability=e.target.value;save();renderMy();renderPartyPage();}};
$("myItemBtn").onclick=()=>{if(mySel())openItemPicker("my");};
$("myNatBtn").onclick=openNatGrid;
$("natClose").onclick=()=>$("natModal").classList.remove("on");
$("natModal").onclick=e=>{if(e.target.id==="natModal")$("natModal").classList.remove("on");};
$("itemSearch").oninput=e=>renderItemList(e.target.value);
$("itemNone").onclick=()=>pickItem("");
$("itemClose").onclick=()=>$("itemModal").classList.remove("on");
$("itemModal").onclick=e=>{if(e.target.id==="itemModal")$("itemModal").classList.remove("on");};
$("mvSearch").oninput=e=>renderMoveList(e.target.value);
$("mvNone").onclick=()=>{const m=mySel();if(m){m.moves[mvPickSlot]="";save();renderMy();renderPartyPage();}$("mvModal").classList.remove("on");};
$("mvClose").onclick=()=>$("mvModal").classList.remove("on");
$("mvModal").onclick=e=>{if(e.target.id==="mvModal")$("mvModal").classList.remove("on");};
$("monClose").onclick=()=>closeMonModal();
$("monModal").onclick=e=>{if(e.target.id==="monModal")closeMonModal();};
$("myBurn").onchange=e=>{const m=mySel();if(m){m.burn=e.target.checked;renderResults();}};
$("myScreen").onchange=e=>{const m=mySel();if(m){m.screen=e.target.checked;renderResults();}};

$("btnNewParty").onclick=()=>{
  const name=prompt("새 파티 이름","파티 "+(state.parties.length+1));
  if(!name)return;
  state.parties.push({name,mons:[null,null,null,null,null,null]});
  state.activeParty=state.parties.length-1;state.meSel=0;
  save();renderPartyPage();renderMy();
};
$("btnRenParty").onclick=()=>{
  const name=prompt("파티 이름",party().name);
  if(name){party().name=name;save();renderPartyPage();renderSlots();}
};
$("btnDelParty").onclick=()=>{
  if(state.parties.length<=1){alert("마지막 파티는 삭제할 수 없어요.");return;}
  if(!confirm(`"${party().name}" 파티를 삭제할까요?`))return;
  state.parties.splice(state.activeParty,1);
  state.activeParty=0;state.meSel=0;
  save();renderPartyPage();renderMy();
};
$("partyFilePick").onclick=()=>$("partyFile").click();
$("partyFile").onchange=async e=>{
  for(const f of e.target.files)if(f.type.startsWith("image"))await loadImageBlob(f,"party");
  e.target.value="";
};

// ===== 인식 (Ctrl+V / 드래그&드롭 전용) =====
let worker=null,lastDetect="";
const status=t=>{$("ocrStatus").textContent=t;};
const pstatus=t=>{$("partyStatus").textContent=t;};

window.addEventListener("paste",e=>{
  for(const item of (e.clipboardData||{}).items||[]){
    if(item.type.startsWith("image")){loadImageBlob(item.getAsFile(),curTab);e.preventDefault();return;}
  }
});
function bindDrop(el,mode){
  el.addEventListener("dragover",e=>{e.preventDefault();el.classList.add("drag");});
  el.addEventListener("dragleave",()=>el.classList.remove("drag"));
  el.addEventListener("drop",e=>{
    e.preventDefault();el.classList.remove("drag");
    for(const f of e.dataTransfer.files)if(f.type.startsWith("image"))loadImageBlob(f,mode);
  });
}
bindDrop($("captureBar"),"calc");
bindDrop($("partyDrop"),"party");

function loadImageBlob(blob,mode){
  return new Promise(res=>{
    const img=new Image();
    img.onload=async()=>{
      const cv=$("work");cv.width=img.width;cv.height=img.height;
      cv.getContext("2d").drawImage(img,0,0);
      URL.revokeObjectURL(img.src);
      if(mode==="party")await parsePartyImage(cv);
      else await recognizeCalc(cv);
      res();
    };
    img.src=URL.createObjectURL(blob);
  });
}

// ---- 스프라이트 에셋 인덱스 (사전 계산본 디코드) ----
let assetList=null;
function ensureAssets(){
  if(assetList)return;
  assetList=[];
  for(const[id,b64]of Object.entries(window.SPRITE_INDEX||{})){
    const bin=atob(b64);
    const arr=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
    assetList.push({id,img:{data:arr,width:40,height:40}});
  }
}

// ---- 계산기 페이지 인식 ----
let ocrBusy=false;
async function recognizeCalc(cv){
  if(ocrBusy)return;ocrBusy=true;
  try{
    // 1) 선출 화면: 상대 카드 스프라이트 매칭
    ensureAssets();
    const ctx=cv.getContext("2d");
    const idata=ctx.getImageData(0,0,cv.width,cv.height);
    const img={data:idata.data,width:cv.width,height:cv.height};
    const res=window.SpriteMatcher?SpriteMatcher.recognizeTeam(img,assetList):null;
    if(res){
      const decided=res.map(r=>SpriteMatcher.decide(r));
      const ids=decided.map(d=>d?d.id:null);
      const good=ids.filter(x=>x);
      const shinyCnt=decided.filter(d=>d&&d.shiny).length;
      if(good.length>=3){
        state.oppTeam=[...ids];while(state.oppTeam.length<6)state.oppTeam.push(null);
        state.oppTeam=state.oppTeam.slice(0,6);
        save();
        setOpp(good[0]);
        for(const id of good)requestLive(usageIdFor(resolveToBase(id)),()=>renderSpeed()); // 실시간 채용률 프리페치
        status("선출 화면 인식 완료: "+good.map(id=>cre(id).ko).join(", ")+(shinyCnt?` (이로치 추정 ${shinyCnt}마리 포함)`:""));
        renderChips(good.map(id=>({id,side:"opp"})));
        ocrBusy=false;return;
      }
    }
    // 2) 배틀 화면: 한국어 OCR
    await ocrBattle(cv);
  }catch(err){status("인식 오류: "+err.message);}
  ocrBusy=false;
}
async function ensureWorker(onstat){
  if(worker)return;
  (onstat||status)("OCR 엔진 로딩 중... (최초 1회, 인터넷 필요)");
  worker=await Tesseract.createWorker("kor",1,{logger:m=>{if(m.status==="recognizing text")(onstat||status)("인식 중... "+Math.round(m.progress*100)+"%");}});
}
function scaleCanvas(cv,targetW){
  const scale=Math.max(0.5,Math.min(2.5,targetW/cv.width));
  const c2=document.createElement("canvas");
  c2.width=Math.round(cv.width*scale);c2.height=Math.round(cv.height*scale);
  const ctx=c2.getContext("2d");ctx.imageSmoothingEnabled=true;
  ctx.drawImage(cv,0,0,c2.width,c2.height);
  return c2;
}
function grayCanvas(c2,normalize){
  // 그레이스케일 (+옵션: 1~99% 퍼센타일 대비 스트레칭 — 스타일 폰트 OCR 향상)
  const g=document.createElement("canvas");g.width=c2.width;g.height=c2.height;
  const ctx=g.getContext("2d");ctx.drawImage(c2,0,0);
  const id=ctx.getImageData(0,0,g.width,g.height);const px=id.data;
  const n=px.length/4;
  const hist=new Uint32Array(256);
  for(let i=0;i<px.length;i+=4){
    const v=(px[i]*.3+px[i+1]*.59+px[i+2]*.11)|0;
    px[i]=px[i+1]=px[i+2]=v;hist[v]++;
  }
  if(normalize){
    let lo=0,hi=255,acc=0;
    for(let v=0;v<256;v++){acc+=hist[v];if(acc>=n*0.01){lo=v;break;}}
    acc=0;
    for(let v=255;v>=0;v--){acc+=hist[v];if(acc>=n*0.01){hi=v;break;}}
    const range=Math.max(1,hi-lo);
    for(let i=0;i<px.length;i+=4){
      const v=Math.max(0,Math.min(255,(px[i]-lo)*255/range));
      px[i]=px[i+1]=px[i+2]=v;
    }
  }
  ctx.putImageData(id,0,0);
  return g;
}
async function ocrBattle(cv){
  await ensureWorker();
  const c2=scaleCanvas(cv,1800);
  status("인식 중...");
  const {data}=await worker.recognize(grayCanvas(c2),{},{text:true,blocks:true});
  handleOcr(data,c2.height);
}
function norm(s){return (s||"").replace(/[^가-힣A-Za-z0-9]/g,"");}
function wordsFrom(data){ // tesseract v5(words) / v6(blocks) 호환
  if(data.words&&data.words.length)return data.words;
  const out=[];
  for(const b of (data.blocks||[]))
    for(const p of (b.paragraphs||[]))
      for(const l of (p.lines||[]))
        for(const w of (l.words||[]))out.push(w);
  return out;
}
function lev(a,b){
  const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 9;
  const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
  for(let j=0;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[m][n];
}
function handleOcr(data,imgH){
  const words=wordsFrom(data).map(w=>({t:norm(w.text),y:(w.bbox?(w.bbox.y0+w.bbox.y1)/2:0)})).filter(w=>w.t.length>=2);
  const joined=norm(data.text);
  const found=[];
  for(const id of baseList){
    const c=DB.creatures[id];const name=norm(c.ko);
    if(name.length<2)continue;
    let hit=null;
    for(const w of words){
      if(w.t===name||w.t.includes(name)){hit=w;break;}
      if(name.length>=3&&lev(w.t,name)<=1){hit=w;break;}
    }
    if(!hit&&joined.includes(name))hit={t:name,y:0};
    if(hit)found.push({id,y:hit.y,side:hit.y<imgH*0.5?"opp":"me"});
  }
  found.sort((a,b)=>DB.creatures[b.id].ko.length-DB.creatures[a.id].ko.length);
  const uniq=[];
  for(const f of found){
    if(!uniq.find(u=>norm(DB.creatures[u.id].ko).includes(norm(DB.creatures[f.id].ko))))uniq.push(f);
  }
  renderChips(uniq);
  if(!uniq.length){status("포켓몬을 찾지 못했습니다. 이름이 보이는 화면에서 다시 시도하세요.");return;}
  const opp=uniq.find(f=>f.side==="opp")||uniq[0];
  const mine=uniq.find(f=>f.side==="me"&&f.id!==opp.id);
  const key=opp.id+"|"+(mine?mine.id:"");
  if(key!==lastDetect){
    lastDetect=key;
    setOpp(opp.id);
    if(mine){
      const idx=party().mons.findIndex(s=>s&&s.species===mine.id);
      if(idx>=0){state.meSel=idx;renderMy();}
    }
  }
  status("인식: 상대 "+cre(opp.id).ko+(mine?" / 내 "+cre(mine.id).ko:""));
}
function renderChips(found){
  const el=$("chips");el.innerHTML="";
  for(const f of found.slice(0,8)){
    const s=document.createElement("span");s.className="chip"+(f.side==="me"?" mine":"");
    s.textContent=(f.side==="me"?"내: ":"")+cre(f.id).ko;
    s.onclick=()=>setOpp(f.id);
    el.appendChild(s);
  }
}

// ===== 파티 이미지 등록 =====
async function parsePartyImage(cv){
  if(ocrBusy)return;ocrBusy=true;
  try{
    await ensureWorker(pstatus);
    const c2=scaleCanvas(cv,2400);
    const W=c2.width,H=c2.height;
    const colorData=c2.getContext("2d").getImageData(0,0,W,H);
    // 2패스 OCR: 대비강화 → 미인식 슬롯만 원본 그레이로 재시도 (폰트 인식 변동성 보완)
    const applied=new Set();
    let screenType=null,total=0;
    for(const normalize of [true,false]){
      if(applied.size>=6)break;
      pstatus("파티 화면 인식 중..."+(normalize?"":" (2차 보완)"));
      const {data}=await worker.recognize(grayCanvas(c2,normalize),{},{text:true,blocks:true});
      const words=wordsFrom(data).map(w=>({
        t:norm(w.text),x0:w.bbox.x0,x1:w.bbox.x1,y0:w.bbox.y0,y1:w.bbox.y1,
        yc:(w.bbox.y0+w.bbox.y1)/2,xc:(w.bbox.x0+w.bbox.x1)/2
      })).filter(w=>w.t.length>=1);
      const runs=mergeWords(words,W);
      if(screenType===null){
        const statCnt=runs.filter(r=>r.t==="공격"||r.t==="방어"||r.t==="스피드").length;
        screenType=statCnt>=5?"stats":"ability";
      }
      let slots=[];
      if(screenType==="stats")slots=applyStatsScreen(runs,colorData,W,H,applied);
      else{
        const cards=findPartyCards(runs,W,H).filter(c=>!applied.has(c.slot));
        slots=applyAbilityScreen(cards,runs,W,H);
      }
      slots.forEach(s=>applied.add(s));
      total=applied.size;
    }
    if(!total)pstatus("포켓몬을 찾지 못했습니다. 능력/스테이터스 화면 전체가 보이게 캡처해주세요.");
    else pstatus((screenType==="stats"?"스테이터스":"능력")+" 화면 등록 완료: "+total+"마리"+(total<6?" (누락 슬롯은 카드 클릭으로 수동 등록)":""));
    save();renderPartyPage();renderMy();
  }catch(err){pstatus("인식 오류: "+err.message);}
  ocrBusy=false;
}
function mergeWords(words,W){
  // 음절 단위로 쪼개진 OCR 단어를 가로 인접 병합 (한글↔숫자 경계는 병합 안 함)
  const sorted=[...words].sort((a,b)=>a.yc-b.yc);
  const rows=[];
  for(const w of sorted){
    const h=w.y1-w.y0;
    const r=rows.find(r=>Math.abs(r.yc-w.yc)<Math.max(8,h*0.6));
    if(r)r.items.push(w);
    else rows.push({yc:w.yc,items:[w]});
  }
  const runs=[];
  const isNum=t=>/^\d+$/.test(t);
  for(const r of rows){
    r.items.sort((a,b)=>a.x0-b.x0);
    let cur=null;
    for(const w of r.items){
      const boundary=cur&&(isNum(cur.t)!==isNum(w.t));
      if(cur&&!boundary&&w.x0-cur.x1<W*0.02){
        cur.t+=w.t;cur.x1=Math.max(cur.x1,w.x1);
        cur.y0=Math.min(cur.y0,w.y0);cur.y1=Math.max(cur.y1,w.y1);
      }else{
        if(cur)runs.push(cur);
        cur={t:w.t,x0:w.x0,x1:w.x1,y0:w.y0,y1:w.y1};
      }
    }
    if(cur)runs.push(cur);
  }
  runs.forEach(r=>{r.xc=(r.x0+r.x1)/2;r.yc=(r.y0+r.y1)/2;});
  return runs;
}
function matchCreature(t,wideRun){
  if(!t||!/[가-힣]/.test(t))return null;
  if(koToId[t])return koToId[t];
  if(t.length>=3)for(const[ko,cid]of Object.entries(koToId)){
    if(Math.abs(ko.length-t.length)<=1&&lev(t,ko)<=1)return cid;
  }
  // 고유 접두어 (글리프가 잘려 나온 경우: 2글자 이상, 또는 런 폭이 넓은 1글자)
  if(t.length>=2||wideRun){
    const hits=Object.entries(koToId).filter(([ko])=>ko.startsWith(t));
    if(hits.length===1)return hits[0][1];
  }
  return null;
}
function slotify(anchors,W,H,baseFrac){
  // 좌열=슬롯 0,2,4(표시 1,3,5) / 우열=1,3,5(표시 2,4,6)
  if(!anchors.length)return [];
  // 행 클러스터링: 3행이 모두 보이면 순서 기반 (레터박스/창모드 등 세로 오프셋 무관)
  const rows=[];
  for(const a of [...anchors].sort((x,y)=>x.yc-y.yc)){
    const r=rows.find(r=>Math.abs(r.y-a.yc)<H*0.07);
    if(r){r.n++;r.y=r.y+(a.yc-r.y)/r.n;}
    else rows.push({y:a.yc,n:1});
  }
  rows.sort((a,b)=>a.y-b.y);
  let rowIdxOf;
  if(rows.length>=3){
    const r3=rows.slice(0,3);
    rowIdxOf=y=>{let bi=0,bd=1e9;r3.forEach((r,i)=>{const d=Math.abs(r.y-y);if(d<bd){bd=d;bi=i;}});return bi;};
  }else{
    // 일부 행 누락: 절대 위치 폴백 (16:9 전체화면 기준, 슬롯 밀림 방지)
    rowIdxOf=y=>{
      let bi=-1,bd=1e9;
      for(let k=0;k<3;k++){const d=Math.abs(y/H-(baseFrac+0.2*k));if(d<bd){bd=d;bi=k;}}
      return bd>0.09?-1:bi;
    };
  }
  const out=[];
  for(const a of anchors){
    const row=rowIdxOf(a.yc);if(row<0||row>2)continue;
    const slot=row*2+(a.xc<W*0.5?0:1);
    if(!out.find(o=>o.slot===slot))out.push({slot,...a});
  }
  return out;
}
function findPartyCards(runs,W,H){
  const anchors=[];
  for(const r of runs){
    if(r.yc<H*0.15)continue;
    const wide=(r.x1-r.x0)>(r.y1-r.y0)*1.5;
    const id=matchCreature(r.t,wide);
    if(id&&!anchors.find(a=>Math.abs(a.yc-r.yc)<H*0.05&&Math.abs(a.xc-r.xc)<W*0.25))
      anchors.push({id,...r});
  }
  return slotify(anchors,W,H,0.267); // 이름 행
}
function applyAbilityScreen(cards,runs,W,H){
  const applied=[];
  for(const card of cards){
    // 이름 행 포함(첫 기술이 이름과 같은 줄), 이름 런 자체는 제외
    const cardRuns=runs.filter(r=>r.yc>card.y0-H*0.01&&r.yc<card.yc+H*0.16&&
      r.x0>card.x0-W*0.03&&r.x0<card.x0+W*0.38&&
      !(r.x0===card.x0&&r.y0===card.y0));
    const split=card.x0+W*0.19;
    // 라인 조립: 숫자 포함(10만볼트)과 숫자 제외(아이콘 노이즈 '9' 등) 두 버전 유지
    const lines=arr=>{
      const out=[];
      for(const w of arr.sort((a,b)=>a.yc-b.yc||a.x0-b.x0)){
        if(w.t.length===1&&!/[가-힣0-9]/.test(w.t))continue; // 한 글자 비한글 노이즈
        const ln=out.find(l=>Math.abs(l.yc-w.yc)<H*0.016);
        if(ln){ln.t+=w.t;if(!/^\d+$/.test(w.t))ln.tn+=w.t;}
        else out.push({t:w.t,tn:/^\d+$/.test(w.t)?"":w.t,yc:w.yc});
      }
      return out;
    };
    const lLines=lines(cardRuns.filter(r=>r.x0<split));
    const rLines=lines(cardRuns.filter(r=>r.x0>=split));
    const mon=party().mons[card.slot]&&party().mons[card.slot].species===card.id?
      party().mons[card.slot]:newMon(card.id);
    mon.species=card.id;
    for(const l of lLines){
      const ab=fuzzyFind(l.tn,koToAbility)||fuzzyFind(l.t,koToAbility);
      if(ab&&!mon._gotAb){mon.ability=ab;mon._gotAb=1;continue;}
      // "~나이트 / ~나이트X / ~나이트Y" = 메가스톤 (DB에 한국어명 없는 스톤도 커버)
      if(/나이트[A-Za-z]?$/.test(l.tn)&&l.tn.length>=4){mon.item="__mega";continue;}
      const it=fuzzyFind(l.tn,koToItemScan)||fuzzyFind(l.t,koToItemScan);
      if(it)mon.item=normItem(it);
    }
    delete mon._gotAb;
    const mvs=[];
    for(const l of rLines){
      // 숫자 포함 원문 우선(10만볼트), 실패 시 숫자 제거판(아이콘 노이즈 제거)
      const mid=matchMoveLoose(l.t)||matchMoveLoose(l.tn);
      if(mid&&mvs.length<4&&!mvs.includes(DB.moves[mid].ko))mvs.push(DB.moves[mid].ko);
    }
    if(mvs.length){mon.moves=mvs;while(mon.moves.length<4)mon.moves.push("");}
    party().mons[card.slot]=mon;
    applied.push(card.slot);
  }
  return applied;
}
function applyStatsScreen(runs,colorData,W,H,skip){
  // 앵커 = 각 카드의 '공격' 라벨 (2열×3행)
  let anchors=slotify(runs.filter(r=>r.t==="공격"&&r.yc>H*0.15),W,H,0.34);
  if(skip)anchors=anchors.filter(a=>!skip.has(a.slot));
  const applied=[];
  // 셀 배치: (행 오프셋, 좌/우) — HP|특공 / 공격|특방 / 방어|스피드
  const CELLS={hp:[-0.042,0],spa:[-0.042,1],atk:[0,0],spd:[0,1],def:[0.042,0],spe:[0.042,1]};
  for(const a of anchors){
    const cells=[];
    let up=null,dn=null;
    for(const[key,[dy,side]]of Object.entries(CELLS)){
      const cy=a.yc+dy*H;
      const xa=a.x0+(side?W*0.165:-W*0.012),xb=a.x0+(side?W*0.37:W*0.165);
      const cell=runs.filter(r=>Math.abs(r.yc-cy)<H*0.018&&r.xc>=xa&&r.xc<xb);
      let nums=cell.filter(r=>/^\d+$/.test(r.t)).sort((x,y)=>x.x0-y.x0);
      if(!nums.length)continue;
      let value=null,pt=null;
      if(nums.length===1&&nums[0].t.length>=4){ // '15632' 같은 병합 토큰 분리
        const t=nums[0].t;
        const tail2=+t.slice(-2),tail1=+t.slice(-1);
        if(tail2<=32){value=+t.slice(0,-2);pt=tail2;}
        else if(tail1<=9){value=+t.slice(0,-1);pt=tail1;}
      }else{
        value=+nums[0].t;
        pt=nums.length>=2?+nums[nums.length-1].t:null;
      }
      if(pt!=null&&pt>32)pt=null;
      cells.push({key,value,pt});
      // 화살표: 값 왼쪽 스트립 (라벨과 값 사이)
      const vx=nums[0].x0;
      const arrow=arrowColor(colorData,W,H,vx-W*0.05,vx-3,nums[0].y0-4,nums[0].y1+4);
      if(arrow==="up")up=key;else if(arrow==="down")dn=key;
    }
    if(cells.length<3)continue;
    // 이름: 앵커 위쪽에서 탐색, 실패 시 기존 슬롯 종 유지
    let id=null;
    for(const r of runs){
      if(r.yc>a.yc-H*0.10&&r.yc<a.yc-H*0.035&&r.xc>a.x0-W*0.03&&r.xc<a.x0+W*0.25){
        const wide=(r.x1-r.x0)>(r.y1-r.y0)*1.5;
        id=matchCreature(r.t,wide);if(id)break;
      }
    }
    const exist=party().mons[a.slot];
    if(!id&&exist)id=exist.species;
    if(!id)continue;
    // 포인트: 실수치에서 역산(정확) → 실패 시 OCR 포인트값 → 0
    const c=cre(id);
    const pts={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
    for(const cell of cells){
      let p=cell.value!=null?ptsFromValue(c.bs[cell.key],cell.key,cell.value,up,dn):null;
      if(p==null)p=cell.pt!=null?cell.pt:0;
      pts[cell.key]=p;
    }
    // 챔피언스 노력치 총합 66 규칙: 숫자 인식이 통째로 실패한 스탯 1개 보정
    {
      const foundKeys=new Set(cells.map(x=>x.key));
      const missing=STATS.filter(s=>!foundKeys.has(s));
      const sum=STATS.reduce((a,s)=>a+pts[s],0);
      if(missing.length===1&&sum<66){
        const r=66-sum;
        if(r>=0&&r<=32)pts[missing[0]]=r;
      }
    }
    const mon=exist&&exist.species===id?exist:newMon(id);
    mon.species=id;mon.pts=pts;mon.nature=natureFrom(up,dn);
    party().mons[a.slot]=mon;
    applied.push(a.slot);
  }
  return applied;
}
function arrowColor(colorData,W,H,x0,x1,y0,y1){
  x0=Math.max(0,Math.round(x0));x1=Math.min(W-1,Math.round(x1));
  y0=Math.max(0,Math.round(y0));y1=Math.min(H-1,Math.round(y1));
  let red=0,blue=0;
  const d=colorData.data;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const i=(y*W+x)*4,r=d[i],g=d[i+1],b=d[i+2];
    if(r>190&&r-g>60&&b>100)red++;      // 분홍빛 상승 화살표
    else if(b>200&&b-r>80)blue++;        // 하늘색 하락 화살표
  }
  if(red>=10&&red>blue*1.5)return "up";
  if(blue>=10&&blue>red*1.5)return "down";
  return null;
}

// ===== 초기화 =====
load();
normalizeParties();
buildNatGrid();
renderPartyPage();
renderSlots();
renderMy();
if(!state.opp.species&&DB.creatures["Garchomp"])setOpp("Garchomp");
else renderOpp();
switchTab("calc");
try{applyTheme(localStorage.getItem("cc_theme")||"dark");}catch(e){}
patchKoNames(); // 백그라운드: 신기술/특성 한국어명 보완
