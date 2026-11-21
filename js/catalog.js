import {getPublishedGames} from './supabase.js';
const grid=document.querySelector('#catalog-grid'),search=document.querySelector('#game-search'),empty=document.querySelector('#empty-state');
let games=[{title:'GridLife',slug:'gridlife',category:'SIMULAÇÃO · MOTORSPORT',short_description:'Domine as pistas neste simulador e gerenciador de carreira motorsport.',status:'desenvolvimento',status_label:'DESTAQUE',initials:'GL',featured:true},{title:'Shift’s Over',slug:'shifts-over',category:'SIMULAÇÃO · GESTÃO',short_description:'Você é capaz de gerenciar um estabelecimento sozinho ou com amigos?',status:'desenvolvimento',status_label:'EM DESENVOLVIMENTO',initials:'SO'}];
let filter='todos';
try{const remote=await getPublishedGames();if(remote?.length)games=remote;}catch(e){console.warn(e)}
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function imageMarkup(g){
 const src=g.catalog_image_url||g.cover_url||'';
 if(!src)return '';
 const fit=(g.catalog_fit||g.cover_fit)==='contain'?'contain':'cover';
 const x=Math.max(0,Math.min(100,Number(g.catalog_position_x??g.cover_position_x??50)));
 const y=Math.max(0,Math.min(100,Number(g.catalog_position_y??g.cover_position_y??50)));
 const zoom=Math.max(100,Math.min(200,Number(g.catalog_zoom??100)));
 return `<img class="public-frame-image" src="${safe(src)}" alt="Arte de ${safe(g.title)}" loading="lazy" style="object-fit:${fit};object-position:${x}% ${y}%;transform:scale(${zoom/100})">`;
}
function render(){
 const q=search.value.toLowerCase();
 const list=games.filter(g=>(filter==='todos'||g.status===filter)&&`${g.title} ${g.category} ${g.short_description}`.toLowerCase().includes(q));
 grid.innerHTML=list.map(g=>`<article class="catalog-card"><div class="catalog-art ${g.slug==='gridlife'?'art-gridlife':'art-shift'}">${imageMarkup(g)}<span>${safe(g.status_label||'PROJETO')}</span></div><div class="catalog-info"><p class="eyebrow">${safe(g.category||'JOGO')}</p><h2>${safe(g.title)}</h2><p>${safe(g.short_description||'Conheça este projeto.')}</p><a class="text-link" href="jogo.html?slug=${encodeURIComponent(g.slug)}">Ver projeto ↗</a></div></article>`).join('');
 empty.hidden=list.length>0;
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render()}));
search.addEventListener('input',render);render();
