import {getPublishedGames} from './supabase.js';
const featured=document.querySelector('#featured-grid');
const coming=document.querySelector('#coming-grid');
const comingSection=document.querySelector('#coming-section');
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function imageMarkup(g){
  const src=g.home_image_url||g.cover_url||'';
  if(!src)return '';
  const fit=(g.home_fit||g.cover_fit)==='contain'?'contain':'cover';
  const x=Math.max(0,Math.min(100,Number(g.home_position_x??g.cover_position_x??50)));
  const y=Math.max(0,Math.min(100,Number(g.home_position_y??g.cover_position_y??50)));
  const zoom=Math.max(100,Math.min(200,Number(g.home_zoom??100)));
  return `<img class="public-frame-image" src="${safe(src)}" alt="Arte de ${safe(g.title)}" loading="lazy" style="object-fit:${fit};object-position:${x}% ${y}%;transform:scale(${zoom/100})">`;
}
try{
  const games=await getPublishedGames();
  if(games?.length){
    const marked=games.filter(g=>g.featured);
    const picks=(marked.length?marked:games).slice(0,2);
    if(picks.length)featured.innerHTML=picks.map((g,i)=>`<article class="feature-card home-project-card ${i===0?'home-project-primary':''}"><a class="home-project-art ${i===0?'art-gridlife':'art-shift'}" href="jogo.html?slug=${encodeURIComponent(g.slug)}" aria-label="Conheça ${safe(g.title)}"><span class="home-art-index">${safe(g.status_label||'PROJETO')} / ${String(i+1).padStart(3,'0')}</span>${imageMarkup(g)}<span class="home-art-word">${safe(g.title)}</span><span class="home-art-corner">${safe(g.category||'JOGO INDEPENDENTE')}</span></a><div class="feature-info home-project-info"><div><p class="eyebrow">${safe(g.category||'JOGO')}</p><h3>${safe(g.title)}</h3><p>${safe(g.short_description||'Conheça este projeto.')}</p></div><a class="round-arrow" href="jogo.html?slug=${encodeURIComponent(g.slug)}" aria-label="Ver ${safe(g.title)}">↗</a></div></article>`).join('');
    const soon=games.filter(g=>!picks.some(p=>p.id===g.id)).slice(0,3);
    if(soon.length){comingSection.hidden=false;coming.innerHTML=soon.map(g=>`<article class="coming-card"><span>${safe(g.status_label||'EM BREVE')}</span><div class="coming-art">${imageMarkup({...g,home_zoom:100})}</div><h3>${safe(g.title)}</h3><p>${safe(g.short_description||'Conteúdo em desenvolvimento')}</p></article>`).join('');}
  }
}catch(e){console.warn('Não foi possível carregar catálogo remoto:',e)}
