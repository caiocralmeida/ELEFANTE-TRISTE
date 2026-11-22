import {getPublishedGames} from './supabase.js';

const grid=document.querySelector('#catalog-grid');
const search=document.querySelector('#game-search');
const empty=document.querySelector('#empty-state');
let games=[
 {title:'GridLife',slug:'gridlife',category:'SIMULAÇÃO · MOTORSPORT',short_description:'Domine as pistas neste simulador e gerenciador de carreira motorsport.',status:'desenvolvimento',status_label:'DESTAQUE',featured:true},
 {title:'Shift’s Over',slug:'shifts-over',category:'SIMULAÇÃO · GESTÃO',short_description:'Você é capaz de gerenciar um estabelecimento sozinho ou com amigos?',status:'desenvolvimento',status_label:'EM DESENVOLVIMENTO'}
];
let filter='todos';

try{
 const remote=await getPublishedGames();
 if(remote?.length)games=remote;
}catch(error){console.warn('Não foi possível carregar o catálogo remoto:',error);}

function safe(value){
 return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function imageMarkup(game){
 const src=game.catalog_image_url||game.cover_url||'';
 if(!src)return '';
 const fit=(game.catalog_fit||game.cover_fit)==='contain'?'contain':'cover';
 const x=Math.max(0,Math.min(100,Number(game.catalog_position_x??game.cover_position_x??50)));
 const y=Math.max(0,Math.min(100,Number(game.catalog_position_y??game.cover_position_y??50)));
 const zoom=Math.max(100,Math.min(200,Number(game.catalog_zoom??100)));
 return `<img class="public-frame-image" src="${safe(src)}" alt="Arte de ${safe(game.title)}" loading="lazy" style="object-fit:${fit};object-position:${x}% ${y}%;transform:scale(${zoom/100})">`;
}
function render(){
 const query=search.value.trim().toLocaleLowerCase('pt-BR');
 const list=games.filter(game=>(filter==='todos'||game.status===filter)&&`${game.title} ${game.category||''} ${game.short_description||''}`.toLocaleLowerCase('pt-BR').includes(query));
 grid.innerHTML=list.map((game,index)=>{
  const artClass=game.slug==='gridlife'?'art-gridlife':'art-shift';
  const artWord=game.slug==='gridlife'?'GRID<span>LIFE</span>':`SHIFT’S<br><span>OVER</span>`;
  const status=safe(game.status_label||'PROJETO');
  return `<article class="catalog-card ${game.featured||index===0?'catalog-card-featured':''}">
   <a class="catalog-art ${artClass}" href="jogo.html?slug=${encodeURIComponent(game.slug)}" aria-label="Conhecer ${safe(game.title)}">
    ${imageMarkup(game)}
    <span class="catalog-status">${status}</span>
    <strong>${artWord}</strong><i>${String(index+1).padStart(2,'0')} / ${safe(game.category||'JOGO')}</i>
   </a>
   <div class="catalog-info">
    <p class="eyebrow">${safe(game.category||'JOGO INDEPENDENTE')}</p>
    <h2>${safe(game.title)}</h2>
    <p>${safe(game.short_description||'Conheça este projeto da Elefante Triste Studio.')}</p>
    <a class="catalog-card-link" href="jogo.html?slug=${encodeURIComponent(game.slug)}">Conhecer projeto <b>↗</b></a>
   </div>
  </article>`;
 }).join('');
 empty.hidden=list.length>0;
 grid.hidden=list.length===0;
}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-filter]').forEach(item=>item.classList.remove('active'));
 button.classList.add('active');
 filter=button.dataset.filter;
 render();
}));
search.addEventListener('input',render);
render();