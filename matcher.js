/* 선출 화면 상대 팀 스프라이트 매칭 (순수 JS — 브라우저/Node 공용)
 * 이미지 = {data:Uint8Array(RGBA), width, height} */
"use strict";
(function(root){
const M = {};

// ---- 기본 유틸 ----
function px(img,x,y){const i=(y*img.width+x)*4;return [img.data[i],img.data[i+1],img.data[i+2],img.data[i+3]];}
function crop(img,x0,y0,w,h){
  const out=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const si=((y0+y)*img.width+(x0+x))*4, di=(y*w+x)*4;
    out[di]=img.data[si];out[di+1]=img.data[si+1];out[di+2]=img.data[si+2];out[di+3]=img.data[si+3];
  }
  return {data:out,width:w,height:h};
}
function padSquare(img,fill){ // 종횡비 보존: 중앙 정렬 정사각 패딩
  const s=Math.max(img.width,img.height);
  const out=new Uint8Array(s*s*4);
  if(fill)for(let i=0;i<s*s;i++){out[i*4]=fill[0];out[i*4+1]=fill[1];out[i*4+2]=fill[2];out[i*4+3]=255;}
  const ox=(s-img.width)>>1,oy=(s-img.height)>>1;
  for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){
    const si=(y*img.width+x)*4,di=((y+oy)*s+(x+ox))*4;
    out[di]=img.data[si];out[di+1]=img.data[si+1];out[di+2]=img.data[si+2];out[di+3]=img.data[si+3];
  }
  return {data:out,width:s,height:s};
}
function resize(img,w,h){ // 박스 평균 리샘플
  const out=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const x0=Math.floor(x*img.width/w),x1=Math.max(x0+1,Math.floor((x+1)*img.width/w));
    const y0=Math.floor(y*img.height/h),y1=Math.max(y0+1,Math.floor((y+1)*img.height/h));
    let r=0,g=0,b=0,a=0,n=0;
    for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){
      const i=(yy*img.width+xx)*4;r+=img.data[i];g+=img.data[i+1];b+=img.data[i+2];a+=img.data[i+3];n++;
    }
    const o=(y*w+x)*4;out[o]=r/n;out[o+1]=g/n;out[o+2]=b/n;out[o+3]=a/n;
  }
  return {data:out,width:w,height:h};
}

// ---- 1. 상대 카드 밴드 검출 ----
// 화면 우측 열에서 카드(자홍색 계열) 세로 밴드 6개 탐지
const isCard=(r,g,b)=>r>70&&r-g>45&&r-b>15&&g<120;
M.detectCards=function(img){
  const W=img.width,H=img.height;
  // 카드 x 범위 추정: 우측 35% 영역에서 카드색 픽셀의 열 히스토그램
  const colCnt=new Int32Array(W);
  for(let y=Math.floor(H*0.05);y<H*0.95;y+=4)
    for(let x=Math.floor(W*0.65);x<W;x+=2){
      const[r,g,b]=px(img,x,y);if(isCard(r,g,b))colCnt[x]+=1;
    }
  let xL=-1,xR=-1;const thr=H*0.9/4*0.25; // 열의 25% 이상이 카드색
  for(let x=Math.floor(W*0.65);x<W;x++){if(colCnt[x]>thr){if(xL<0)xL=x;xR=x;}}
  if(xL<0)return null;
  // 카드 좌단 안쪽 열에서 y 밴드 탐지
  const probe=Math.floor(xL+(xR-xL)*0.04);
  const bands=[];let s=-1;
  for(let y=0;y<H;y++){
    const[r,g,b]=px(img,probe,y);
    if(isCard(r,g,b)){if(s<0)s=y;}
    else{if(s>=0&&y-s>H*0.04)bands.push([s,y]);s=-1;}
  }
  if(s>=0&&H-s>H*0.04)bands.push([s,H]);
  if(bands.length<3)return null;
  // 카드 높이 = 중앙값. 배너 등 이질적 높이 제거
  const hs=bands.map(b=>b[1]-b[0]).sort((a,b)=>a-b);
  const med=hs[Math.floor(hs.length/2)];
  const cards=bands.filter(b=>{const h=b[1]-b[0];return h>med*0.7&&h<med*1.3;});
  if(cards.length<3)return null;
  return {xL,xR,bands:cards.slice(0,6)};
};

// ---- 2. 카드에서 스프라이트 전경 추출 ----
M.extractSprite=function(img,card,band){
  const cw=card.xR-card.xL;
  const x0=Math.floor(card.xL+cw*0.12),x1=Math.floor(card.xL+cw*0.62);
  const y0=Math.max(0,band[0]+2),y1=Math.min(img.height,band[1]-2);
  if(x1-x0<8||y1-y0<8)return null;
  // 배경색: 좌측/우측(스프라이트 밖) 두 스트립에서 행별 추정
  function strip(a,b,y){let r=0,g=0,bl=0,n=0;
    for(let x=Math.floor(card.xL+cw*a);x<card.xL+cw*b;x++){const p=px(img,x,y);r+=p[0];g+=p[1];bl+=p[2];n++;}
    return [r/n,g/n,bl/n];}
  const bgL=[],bgR=[];
  for(let y=y0;y<y1;y++){bgL.push(strip(0.02,0.09,y));bgR.push(strip(0.63,0.66,y));}
  // 전경 = 두 배경 추정치 모두와 색 거리가 큰 픽셀
  const w=x1-x0,h=y1-y0;
  const fg=new Uint8Array(w*h);
  const colCnt=new Int32Array(w),rowCnt=new Int32Array(h);
  for(let y=0;y<h;y++){
    const bl=bgL[y],br=bgR[y];
    for(let x=0;x<w;x++){
      const p=px(img,x0+x,y0+y);
      const dl=Math.abs(p[0]-bl[0])+Math.abs(p[1]-bl[1])+Math.abs(p[2]-bl[2]);
      const dr=Math.abs(p[0]-br[0])+Math.abs(p[1]-br[1])+Math.abs(p[2]-br[2]);
      if(Math.min(dl,dr)>85){fg[y*w+x]=1;colCnt[x]++;rowCnt[y]++;}
    }
  }
  // 프로파일 트리밍: 밀도 최대 지점을 포함하는 연속 구간만 사용 (줄무늬/그림자 노이즈 제거)
  function seg(cnt,len,minFrac){
    let peak=0;for(let i=1;i<len;i++)if(cnt[i]>cnt[peak])peak=i;
    if(cnt[peak]<3)return null;
    const thr=Math.max(2,(len===cnt.length?0:0), (minFrac));
    let a=peak,b=peak;
    while(a>0&&cnt[a-1]>=thr)a--;
    while(b<len-1&&cnt[b+1]>=thr)b++;
    return [a,b];
  }
  const sx=seg(colCnt,w,Math.max(2,Math.floor(h*0.05)));
  const sy=seg(rowCnt,h,Math.max(2,Math.floor(w*0.05)));
  if(!sx||!sy)return null;
  if(sx[1]-sx[0]<w*0.2||sy[1]-sy[0]<h*0.2)return null;
  const c=crop(img,x0+sx[0],y0+sy[0],sx[1]-sx[0]+1,sy[1]-sy[0]+1);
  // 패딩 색 = 카드 배경 평균
  let br=0,bg=0,bb=0,bn=0;
  for(let y=Math.floor((y0+y1)/2)-3;y<Math.floor((y0+y1)/2)+3;y++){
    const p=px(img,Math.floor(card.xL+cw*0.05),y);br+=p[0];bg+=p[1];bb+=p[2];bn++;
  }
  const out=M.blur(resize(padSquare(c,[br/bn,bg/bn,bb/bn]),40,40));
  out._rect=[x0+sx[0],y0+sy[0],sx[1]-sx[0]+1,sy[1]-sy[0]+1];
  return out;
};

// ---- 2b. 색상 불변 윤곽 기반 추출 (이로치 대응 corr 경로 전용) ----
M.extractSpriteEdge=function(img,card,band){
  const cw=card.xR-card.xL;
  const x0=Math.floor(card.xL+cw*0.12),x1=Math.floor(card.xL+cw*0.62);
  const y0=Math.max(1,band[0]+4),y1=Math.min(img.height-1,band[1]-4);
  if(x1-x0<8||y1-y0<8)return null;
  const w=x1-x0,h=y1-y0;
  const colCnt=new Int32Array(w),rowCnt=new Int32Array(h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const gx=x0+x,gy=y0+y;
    let g=0;
    for(let c=0;c<3;c++){
      const a=px(img,gx+1,gy)[c]-px(img,gx-1,gy)[c];
      const b=px(img,gx,gy+1)[c]-px(img,gx,gy-1)[c];
      const m=Math.abs(a)+Math.abs(b);
      if(m>g)g=m;
    }
    if(g>60){colCnt[x]++;rowCnt[y]++;}
  }
  function seg(cnt,len,thr){
    let peak=0;for(let i=1;i<len;i++)if(cnt[i]>cnt[peak])peak=i;
    if(cnt[peak]<3)return null;
    let a=peak,b=peak;
    // 짧은 공백(윤곽 없는 평탄 구간) 허용하며 확장
    while(a>0&&(cnt[a-1]>=thr||cnt[Math.max(0,a-2)]>=thr||cnt[Math.max(0,a-3)]>=thr))a--;
    while(b<len-1&&(cnt[b+1]>=thr||cnt[Math.min(len-1,b+2)]>=thr||cnt[Math.min(len-1,b+3)]>=thr))b++;
    return [a,b];
  }
  const sx=seg(colCnt,w,2);
  const sy=seg(rowCnt,h,2);
  if(!sx||!sy)return null;
  if(sx[1]-sx[0]<w*0.15||sy[1]-sy[0]<h*0.15)return null;
  const c=crop(img,x0+sx[0],y0+sy[0],sx[1]-sx[0]+1,sy[1]-sy[0]+1);
  return M.blur(resize(padSquare(c,[128,128,128]),40,40));
};

// ---- 3. 스프라이트 에셋 인덱스 ----
// asset: RGBA(투명 배경) → 알파 bbox 크롭 → 40x40
M.indexAsset=function(img){
  let bx0=1e9,bx1=-1,by0=1e9,by1=-1;
  for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){
    if(img.data[(y*img.width+x)*4+3]>100){if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;}
  }
  if(bx1<0)return null;
  return M.blur(resize(padSquare(crop(img,bx0,by0,bx1-bx0+1,by1-by0+1),null),40,40));
};

// ---- 4. 매칭: 알파 마스크 MSE (블러 + 오프셋 탐색) ----
M.blur=function(img){ // 3x3 평균 블러 (RGB만)
  const w=img.width,h=img.height,out=new Uint8Array(img.data);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let r=0,g=0,b=0,n=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const yy=y+dy,xx=x+dx;
      if(yy<0||yy>=h||xx<0||xx>=w)continue;
      const i=(yy*w+xx)*4;r+=img.data[i];g+=img.data[i+1];b+=img.data[i+2];n++;
    }
    const o=(y*w+x)*4;out[o]=r/n;out[o+1]=g/n;out[o+2]=b/n;
  }
  return {data:out,width:w,height:h};
};
M.compareAt=function(region,asset,dx,dy){
  let sum=0,n=0;
  for(let y=0;y<40;y++)for(let x=0;x<40;x++){
    const ai=(y*40+x)*4;
    if(asset.data[ai+3]<140)continue;
    const rx=x+dx,ry=y+dy;
    if(rx<0||rx>=40||ry<0||ry>=40)continue;
    const ri=(ry*40+rx)*4;
    const dr=region.data[ri]-asset.data[ai];
    const dg=region.data[ri+1]-asset.data[ai+1];
    const db=region.data[ri+2]-asset.data[ai+2];
    sum+=dr*dr+dg*dg+db*db;n++;
  }
  return n<200?1e9:sum/n;
};
M.compare=function(region,asset){
  let best=1e9;
  for(const dy of [-2,0,2])for(const dx of [-2,0,2]){
    const s=M.compareAt(region,asset,dx,dy);
    if(s<best)best=s;
  }
  return best;
};
// ---- 색상 불변(이로치 대응) 윤곽 그라디언트 상관계수 ----
// 부분 색변경(이로치)에도 윤곽/음영 구조는 유지되므로 그라디언트 맵의 NCC 사용
M.gradOf=function(img){
  // 채널별 그라디언트의 최댓값: 채널 치환(이로치 색변경)에 불변
  const w=img.width,h=img.height,d=img.data;
  const G=new Float32Array(w*h);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x;
    let m=0;
    for(let c=0;c<3;c++){
      const g=Math.abs(d[(i+1)*4+c]-d[(i-1)*4+c])+Math.abs(d[(i+w)*4+c]-d[(i-w)*4+c]);
      if(g>m)m=g;
    }
    G[i]=m;
  }
  return G;
};
M.corrAt=function(rg,asset,ag,dx,dy){
  let n=0,sr=0,sa=0,srr=0,saa=0,sra=0;
  for(let y=1;y<39;y++)for(let x=1;x<39;x++){
    const ai=y*40+x;
    if(asset.data[ai*4+3]<140)continue;
    const rx=x+dx,ry=y+dy;
    if(rx<1||rx>=39||ry<1||ry>=39)continue;
    const gr=rg[ry*40+rx],ga=ag[ai];
    n++;sr+=gr;sa+=ga;srr+=gr*gr;saa+=ga*ga;sra+=gr*ga;
  }
  if(n<200)return -1;
  const den=Math.sqrt((n*srr-sr*sr)*(n*saa-sa*sa));
  return den>1e-6?(n*sra-sr*sa)/den:-1;
};
M.corr=function(rg,asset){
  if(!asset._grad)asset._grad=M.gradOf(asset);
  let best=-1;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
    const c=M.corrAt(rg,asset,asset._grad,dx,dy);
    if(c>best)best=c;
  }
  return best;
};
M.matchAll=function(region,regionEdge,assets){ // assets: [{id,img}]
  const rg=regionEdge?M.gradOf(regionEdge):null;
  const scored=[];
  for(const a of assets){
    scored.push({id:a.id,score:M.compare(region,a.img),corr:rg?M.corr(rg,a.img):-1});
  }
  scored.sort((a,b)=>a.score-b.score);
  return scored;
};

// ---- 전체 파이프라인 ----
M.recognizeTeam=function(img,assets){
  const card=M.detectCards(img);
  if(!card)return null;
  const out=[];
  for(const band of card.bands){
    const region=M.extractSprite(img,card,band);
    if(!region){out.push(null);continue;}
    const regionEdge=M.extractSpriteEdge(img,card,band);
    const ranked=M.matchAll(region,regionEdge,assets);
    const byCorr=[...ranked].sort((a,b)=>b.corr-a.corr);
    out.push({best:ranked[0],top:ranked.slice(0,5),bestCorr:byCorr[0]});
  }
  return out;
};
// 판정: 색상 일치 우선, 실패 시 명암 패턴(이로치 의심)으로 폴백
M.decide=function(r,colorThr,corrThr){
  if(!r)return null;
  if(r.best.score<(colorThr||7500))return {id:r.best.id,shiny:false};
  if(r.bestCorr&&r.bestCorr.corr>(corrThr||0.80))return {id:r.bestCorr.id,shiny:true};
  return null;
};

if(typeof module!=="undefined")module.exports=M;
else root.SpriteMatcher=M;
})(typeof window!=="undefined"?window:globalThis);
