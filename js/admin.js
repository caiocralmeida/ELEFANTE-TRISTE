import {supabase,supabaseReady} from './supabase.js';

const $ = id => document.getElementById(id);
const login = $('login-panel');
const dashboard = $('dashboard');
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
const EXT = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
let currentUser = null;
let games = [];
let mediaItems = [];
let selectedPreviewUrl = null;
let editingId = '';
let mediaFilter = 'all';
let slugEdited = false;

const imageAreas = [
  {key:'home',url:'home_image_url',fit:'home_fit',x:'home_x',y:'home_y',preview:'home_preview',frame:'home_frame'},
  {key:'catalog',url:'catalog_image_url',fit:'catalog_fit',x:'catalog_x',y:'catalog_y',preview:'catalog_preview',frame:'catalog_frame'},
  {key:'detail',url:'detail_image_url',fit:'detail_fit',x:'detail_x',y:'detail_y',preview:'detail_preview',frame:'detail_frame'}
];

if (!supabaseReady) {
  $('login-error').textContent = 'Supabase não configurado. Confira js/config.js.';
  $('login-form').addEventListener('submit',e=>{e.preventDefault();$('login-error').textContent='Configure o Supabase para habilitar o painel.';});
} else {
  try {
    const {data:{session}} = await supabase.auth.getSession();
    if(session) await showDashboard();
  } catch(err) {
    $('login-error').textContent = 'Não foi possível verificar a sessão: '+err.message;
  }
  $('login-form').addEventListener('submit',async e=>{
    e.preventDefault();
    $('login-error').textContent='Verificando acesso...';
    const {error} = await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
    if(error){$('login-error').textContent=error.message;return;}
    await showDashboard();
  });
}

async function showDashboard(){
  const {data:{user},error} = await supabase.auth.getUser();
  if(error || !user){$('login-error').textContent=error?.message||'Sessão inválida.';return;}
  currentUser=user;
  $('user-email').textContent=user.email||'Administrador';
  login.hidden=true;
  dashboard.hidden=false;
  await loadGames();
  await loadMedia();
  setView('overview');
}

$('logout').addEventListener('click',async()=>{await supabase.auth.signOut();location.reload();});

function setView(name){
  const views=['overview','projects','media','settings'];
  for(const view of views) $('view-'+view).hidden=view!==name;
  $('editor-view').hidden=name!=='editor';
  document.querySelectorAll('[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===(name==='editor'?'projects':name)));
  const titles={overview:'Visão geral',projects:'Projetos',media:'Biblioteca de mídia',settings:'Configurações',editor:'Editor de projeto'};
  $('page-title').textContent=titles[name]||'Painel';
  if(name==='media') renderMedia();
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
$('overview-all-projects').addEventListener('click',()=>setView('projects'));
$('top-new-project').addEventListener('click',()=>openEditor());
$('new-project').addEventListener('click',()=>openEditor());
$('back-projects').addEventListener('click',()=>setView('projects'));
$('clear-form').addEventListener('click',()=>{if(confirm('Descartar as alterações deste formulário?'))setView('projects');});
$('project-search').addEventListener('input',renderProjects);
$('project-filter').addEventListener('change',renderProjects);
$('refresh-media').addEventListener('click',loadMedia);
document.querySelectorAll('[data-media-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  mediaFilter=btn.dataset.mediaFilter;
  document.querySelectorAll('[data-media-filter]').forEach(b=>b.classList.toggle('active',b===btn));
  renderMedia();
}));

async function loadGames(){
  $('projects-list').innerHTML='<div class="empty-state">Carregando projetos...</div>';
  const {data,error}=await supabase.from('games').select('*').order('sort_order',{ascending:true});
  if(error){$('projects-list').innerHTML='<div class="empty-state">Não foi possível carregar os projetos: '+escapeHtml(error.message)+'</div>';return;}
  games=data||[];
  renderProjects();
  renderOverview();
}
function renderOverview(){
  $('stat-total').textContent=games.length;
  $('stat-published').textContent=games.filter(g=>g.published).length;
  $('stat-development').textContent=games.filter(g=>g.status==='desenvolvimento').length;
  $('stat-media').textContent=mediaItems.length;
  const recent=[...games].sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0)).slice(0,5);
  $('overview-recent').innerHTML=recent.length?recent.map(g=>`<div class="recent-row"><span><strong>${escapeHtml(g.title)}</strong><br><small class="muted">${escapeHtml(g.category||'Sem categoria')}</small></span><span class="status-pill ${g.published?'live':'draft'}">${g.published?'Publicado':'Rascunho'}</span></div>`).join(''):'<p class="muted">Nenhum projeto cadastrado ainda.</p>';
}
function renderProjects(){
  const q=$('project-search').value.trim().toLowerCase();
  const filter=$('project-filter').value;
  const list=games.filter(g=>(filter==='all'||(filter==='published'?g.published:!g.published))&&`${g.title} ${g.category||''} ${g.short_description||''}`.toLowerCase().includes(q));
  $('projects-list').innerHTML=list.length?list.map(g=>{
    const src=g.catalog_image_url||g.cover_url||'';
    return `<article class="project-card"><div class="project-thumb">${src?`<img src="${escapeAttr(src)}" alt="">`:`<div class="thumb-empty">${escapeHtml((g.initials||g.title?.slice(0,2)||'ET').toUpperCase())}</div>`}</div><div class="project-content"><div><span class="status-pill ${g.published?'live':'draft'}">${g.published?'Publicado':'Rascunho'}</span><h3>${escapeHtml(g.title)}</h3><p>${escapeHtml(g.category||'Sem categoria')}</p></div><div class="project-actions"><button class="small-btn" data-edit="${escapeAttr(g.id)}">Editar projeto</button><button class="small-btn" data-delete="${escapeAttr(g.id)}">Excluir</button></div></div></article>`;
  }).join(''):'<div class="empty-state" style="grid-column:1/-1">Nenhum projeto encontrado. Tente outra busca ou adicione um projeto.</div>';
  $('projects-list').querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>openEditor(games.find(g=>g.id===btn.dataset.edit))));
  $('projects-list').querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>deleteGame(btn.dataset.delete)));
}
async function deleteGame(id){
  const game=games.find(g=>g.id===id);
  if(!game||!confirm(`Excluir definitivamente "${game.title}"? Essa ação não pode ser desfeita.`))return;
  const {error}=await supabase.from('games').delete().eq('id',id);
  if(error){alert('Não foi possível excluir: '+error.message);return;}
  await loadGames();
}

function openEditor(game=null){
  editingId=game?.id||'';
  $('game-form').reset();
  $('game-id').value=game?.id||'';
  $('form-heading').textContent=game?'Editar projeto':'Novo projeto';
  $('editor-mode').textContent=game?'EDITANDO PROJETO':'NOVO PROJETO';
  $('editor-mode').className='status-pill '+(game?'live':'draft');
  for(const key of ['title','slug','category','short_description','description','cover_url','status','action_label','action_url','body_html']){
    const el=$(key);el.value=game?.[key]??(key==='status'?'desenvolvimento':'');
  }
  $('home_image_url').value=game?.home_image_url||'';
  $('home_fit').value=game?.home_fit||game?.cover_fit||'cover';
  $('home_x').value=game?.home_position_x??game?.cover_position_x??50;
  $('home_y').value=game?.home_position_y??game?.cover_position_y??50;
  $('catalog_image_url').value=game?.catalog_image_url||'';
  $('catalog_fit').value=game?.catalog_fit||game?.cover_fit||'cover';
  $('catalog_x').value=game?.catalog_position_x??game?.cover_position_x??50;
  $('catalog_y').value=game?.catalog_position_y??game?.cover_position_y??50;
  $('detail_image_url').value=game?.detail_image_url||'';
  $('detail_fit').value=game?.detail_fit||game?.cover_fit||'cover';
  $('detail_x').value=game?.detail_position_x??game?.cover_position_x??50;
  $('detail_y').value=game?.detail_position_y??game?.cover_position_y??50;
  $('featured').checked=!!game?.featured;
  $('published').checked=game?!!game.published:true;
  slugEdited=!!game;
  if(selectedPreviewUrl){URL.revokeObjectURL(selectedPreviewUrl);selectedPreviewUrl=null;}
  $('cover-file').value='';
  $('save-status').textContent='As alterações ainda não foram salvas.';
  updateAllPreviews();
  setView('editor');
  window.scrollTo({top:0,behavior:'smooth'});
}

$('title').addEventListener('input',()=>{
  if(!slugEdited)$('slug').value=slugify($('title').value);
});
$('slug').addEventListener('input',()=>{slugEdited=true;});
$('game-form').addEventListener('input',e=>{
  if(e.target.id!=='cover-file')$('save-status').textContent='Alterações pendentes de salvamento.';
});

function updateAreaPreview(area){
  const img=$(area.preview);
  const custom=$(area.url).value.trim();
  const isLocal=(area.key==='detail'&&$('media-kind').value==='banners')||(area.key!=='detail'&&$('media-kind').value==='covers');
  const src=(isLocal&&area.key==='detail'&&selectedPreviewUrl)?selectedPreviewUrl:(custom||(isLocal?selectedPreviewUrl:null)||$('cover_url').value.trim());
  img.style.objectFit=$(area.fit).value;
  img.style.objectPosition=$(area.x).value+'% '+$(area.y).value+'%';
  $(area.x+'_value').textContent=$(area.x).value+'%';
  $(area.y+'_value').textContent=$(area.y).value+'%';
  const empty=$(area.frame).querySelector('.preview-empty');
  if(src){img.hidden=false;empty.hidden=true;if(img.src!==src)img.src=src;}
  else{img.hidden=true;img.removeAttribute('src');empty.hidden=false;}
}
function updateAllPreviews(){imageAreas.forEach(updateAreaPreview);}
for(const area of imageAreas){
  [area.url,area.fit,area.x,area.y].forEach(id=>$(id).addEventListener('input',()=>updateAreaPreview(area)));
  $(area.fit).addEventListener('change',()=>updateAreaPreview(area));
  const frame=$(area.frame);
  let dragging=false;
  frame.addEventListener('pointerdown',e=>{
    const img=$(area.preview);if(img.hidden)return;
    dragging=true;frame.setPointerCapture(e.pointerId);moveImage(e);
  });
  frame.addEventListener('pointermove',e=>{if(dragging)moveImage(e);});
  frame.addEventListener('pointerup',()=>dragging=false);
  frame.addEventListener('pointercancel',()=>dragging=false);
  function moveImage(e){
    const rect=frame.getBoundingClientRect();
    const x=Math.max(0,Math.min(100,Math.round((e.clientX-rect.left)/rect.width*100)));
    const y=Math.max(0,Math.min(100,Math.round((e.clientY-rect.top)/rect.height*100)));
    $(area.x).value=x;$(area.y).value=y;updateAreaPreview(area);
  }
}
$('cover_url').addEventListener('input',updateAllPreviews);
$('media-kind').addEventListener('change',updateAllPreviews);

$('cover-file').addEventListener('change',()=>{
  const file=$('cover-file').files[0];
  if(selectedPreviewUrl){URL.revokeObjectURL(selectedPreviewUrl);selectedPreviewUrl=null;}
  if(!file){updateAllPreviews();return;}
  try{validateImage(file);selectedPreviewUrl=URL.createObjectURL(file);updateAllPreviews();$('upload-status').textContent='Prévia carregada. Envie para guardar na biblioteca.';}
  catch(err){alert(err.message);$('cover-file').value='';$('upload-status').textContent=err.message;}
});
const drop=$('upload-drop');
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});
drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));
drop.addEventListener('drop',e=>{
  e.preventDefault();drop.classList.remove('dragover');
  const file=e.dataTransfer.files?.[0];if(!file)return;
  const dt=new DataTransfer();dt.items.add(file);$('cover-file').files=dt.files;$('cover-file').dispatchEvent(new Event('change'));
});

function validateImage(file){
  if(!file)throw new Error('Escolha uma imagem primeiro.');
  if(!TYPES.includes(file.type))throw new Error('Formato não permitido. Use JPG, PNG, WebP ou GIF.');
  if(file.size>MAX_IMAGE_SIZE)throw new Error('A imagem ultrapassa o limite de 5 MB.');
}
function slugify(value){return (value||'projeto').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-');}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeAttr(v){return escapeHtml(v).replace(/\`/g,'&#96;');}

$('game-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('save-game');btn.disabled=true;btn.textContent='Salvando...';
  const slug=slugify($('slug').value);
  const fullPayload={
    title:$('title').value.trim(),slug,category:$('category').value.trim(),
    short_description:$('short_description').value,description:$('description').value,
    cover_url:$('cover_url').value.trim()||null,
    home_image_url:$('home_image_url').value.trim()||null,home_fit:$('home_fit').value,home_position_x:Number($('home_x').value),home_position_y:Number($('home_y').value),
    catalog_image_url:$('catalog_image_url').value.trim()||null,catalog_fit:$('catalog_fit').value,catalog_position_x:Number($('catalog_x').value),catalog_position_y:Number($('catalog_y').value),
    detail_image_url:$('detail_image_url').value.trim()||null,detail_fit:$('detail_fit').value,detail_position_x:Number($('detail_x').value),detail_position_y:Number($('detail_y').value),
    status:$('status').value,status_label:$('status').selectedOptions[0].text.toUpperCase(),
    action_label:$('action_label').value,action_url:$('action_url').value.trim()||null,body_html:$('body_html').value,
    featured:$('featured').checked,published:$('published').checked,updated_at:new Date().toISOString()
  };
  try{
    let result=await saveGame(fullPayload);
    let partial=false;
    if(result.error&&isMissingImageColumns(result.error)){
      partial=true;
      const fallback={...fullPayload};
      for(const key of ['home_image_url','home_fit','home_position_x','home_position_y','catalog_image_url','catalog_fit','catalog_position_x','catalog_position_y','detail_image_url','detail_fit','detail_position_x','detail_position_y'])delete fallback[key];
      result=await saveGame(fallback);
    }
    if(result.error)throw result.error;
    alert(partial?'Projeto salvo. As imagens e enquadramentos individuais ainda não foram gravados porque falta aplicar a migração SQL de imagens independentes no Supabase.':'Projeto salvo com sucesso!');
    await loadGames();setView('projects');
  }catch(err){alert('Não foi possível salvar o projeto: '+(err.message||String(err)));}
  finally{btn.disabled=false;btn.textContent='Salvar projeto';}
});
async function saveGame(payload){
  const id=$('game-id').value;
  return id?await supabase.from('games').update(payload).eq('id',id):await supabase.from('games').insert({...payload,sort_order:100});
}
function isMissingImageColumns(error){return /column .* does not exist|could not find .* column|schema cache|PGRST204|42703/i.test(error.message||'');}

async function uploadSelectedImage(){
  const file=$('cover-file').files[0];const folder=$('media-kind').value;
  const status=$('upload-status');const btn=$('upload-cover');
  try{
    validateImage(file);
    if(!editingId&&!$('title').value.trim())throw new Error('Dê um nome ao projeto antes de enviar a imagem.');
    btn.disabled=true;btn.textContent='Enviando...';status.textContent='Enviando imagem para o Supabase...';
    const path=`${folder}/${slugify($('slug').value||$('title').value)}-${Date.now()}.${EXT[file.type]}`;
    const {error}=await supabase.storage.from('game-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error)throw error;
    const {data}=supabase.storage.from('game-media').getPublicUrl(path);
    if(folder==='covers')$('cover_url').value=data.publicUrl;
    else $('detail_image_url').value=data.publicUrl;
    if(selectedPreviewUrl){URL.revokeObjectURL(selectedPreviewUrl);selectedPreviewUrl=null;}
    $('cover-file').value='';updateAllPreviews();
    status.textContent='Imagem enviada e aplicada. Salve o projeto para publicar a alteração.';
    await loadMedia();
  }catch(err){
    console.error(err);status.textContent='Falha no envio: '+(err.message||String(err));
    alert('Não foi possível enviar a imagem. '+(err.message||String(err)));
  }finally{btn.disabled=false;btn.textContent='Enviar imagem';}
}
$('upload-cover').addEventListener('click',uploadSelectedImage);

async function loadMedia(){
  $('media-list').innerHTML='<div class="empty-state">Carregando biblioteca...</div>';
  const folders=['covers','banners'];
  const results=await Promise.all(folders.map(folder=>supabase.storage.from('game-media').list(folder,{limit:100,sortBy:{column:'created_at',order:'desc'}}).then(r=>({folder,...r}))));
  const failed=results.find(r=>r.error);
  if(failed){$('media-list').innerHTML='<div class="empty-state">Não foi possível abrir a biblioteca: '+escapeHtml(failed.error.message)+'</div>';return;}
  mediaItems=[];
  for(const result of results){
    for(const file of result.data||[]){
      if(!file.name||file.name==='.emptyFolderPlaceholder')continue;
      const path=result.folder+'/'+file.name;
      const {data}=supabase.storage.from('game-media').getPublicUrl(path);
      mediaItems.push({folder:result.folder,name:file.name,path,url:data.publicUrl,created:file.created_at});
    }
  }
  $('stat-media').textContent=mediaItems.length;
  renderMedia();
}
function renderMedia(){
  const items=mediaItems.filter(item=>mediaFilter==='all'||item.folder===mediaFilter);
  $('media-list').innerHTML=items.length?items.map((item,index)=>`<article class="media-item"><img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.name)}" loading="lazy"><strong>${escapeHtml(item.name)}</strong><small>${item.folder==='covers'?'CAPA':'BANNER'}</small><div class="media-apply"><button data-apply="${index}" data-target="cover_url">Padrão</button><button data-apply="${index}" data-target="home_image_url">Início</button><button data-apply="${index}" data-target="catalog_image_url">Loja</button><button data-apply="${index}" data-target="detail_image_url">Página</button></div><div class="media-apply"><button data-copy="${index}">Copiar URL</button><button data-remove="${index}">Excluir</button></div></article>`).join(''):'<div class="empty-state" style="grid-column:1/-1">Nenhuma imagem nesta categoria. Envie imagens pelo editor de um projeto.</div>';
  $('media-list').querySelectorAll('[data-apply]').forEach(btn=>btn.addEventListener('click',()=>{
    const item=items[Number(btn.dataset.apply)];
    if(!editingId){alert('Para aplicar uma imagem, abra primeiro um projeto em Projetos → Editar. Depois volte à Biblioteca de mídia.');setView('projects');return;}
    $(btn.dataset.target).value=item.url;
    updateAllPreviews();
    $('save-status').textContent='Imagem aplicada. Salve o projeto para confirmar.';
    setView('editor');
  }));
  $('media-list').querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',async()=>{
    const item=items[Number(btn.dataset.copy)];
    try{await navigator.clipboard.writeText(item.url);alert('URL copiada.');}catch{prompt('Copie a URL da imagem:',item.url);}
  }));
  $('media-list').querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>removeMedia(items[Number(btn.dataset.remove)])));
}
async function removeMedia(item){
  if(!confirm('Excluir este arquivo da biblioteca? Se algum projeto usa a URL, a imagem deixará de aparecer nele.'))return;
  const {error}=await supabase.storage.from('game-media').remove([item.path]);
  if(error){alert('Não foi possível excluir: '+error.message);return;}
  await loadMedia();
}

