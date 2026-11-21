import {supabase,supabaseReady} from './supabase.js';

const $ = id => document.getElementById(id);
const login = $('login-panel');
const dash = $('dashboard');
let currentUser = null;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
const EXT = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
let selectedPreviewUrl = null;

if (!supabaseReady) {
  $('login-error').textContent = 'Supabase ainda não configurado. Confira js/config.js.';
  $('login-form').addEventListener('submit', e => {
    e.preventDefault();
    $('login-error').textContent = 'Configure o Supabase para habilitar autenticação segura.';
  });
} else {
  const {data:{session}} = await supabase.auth.getSession();
  if (session) await showDashboard();
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('login-error').textContent = 'Verificando acesso...';
    const {error} = await supabase.auth.signInWithPassword({
      email:$('email').value,
      password:$('password').value
    });
    if (error) {
      $('login-error').textContent = error.message;
      return;
    }
    await showDashboard();
  });
}

async function showDashboard() {
  const {data:{user}} = await supabase.auth.getUser();
  currentUser = user;
  login.hidden = true;
  dash.hidden = false;
  await loadGames();
  await loadMedia();
}

$('logout').addEventListener('click', async () => {
  if (supabase) await supabase.auth.signOut();
  location.reload();
});

async function loadGames() {
  const {data,error} = await supabase.from('games').select('*').order('sort_order');
  if (error) {
    $('games-list').textContent = error.message;
    return;
  }
  const list = $('games-list');
  list.innerHTML = '';
  (data || []).forEach(g => {
    const row = document.createElement('div');
    row.className = 'game-row';
    const name = document.createElement('span');
    name.textContent = `${g.title} · ${g.published ? 'Publicado' : 'Rascunho'}`;
    const actions = document.createElement('span');
    const edit = document.createElement('button');
    edit.textContent = 'Editar';
    edit.onclick = () => fillForm(g);
    const del = document.createElement('button');
    del.textContent = 'Excluir';
    del.onclick = async () => {
      if (!confirm(`Excluir ${g.title}?`)) return;
      const {error} = await supabase.from('games').delete().eq('id',g.id);
      if (error) alert(error.message);
      else {
        await loadGames();
        await loadMedia();
      }
    };
    actions.append(edit,del);
    row.append(name,actions);
    list.append(row);
  });
}

function fillForm(g) {
  $('form-heading').textContent = 'Editar jogo';
  for (const k of ['id','title','slug','category','short_description','description','cover_url','status','action_label','action_url','body_html']) {
    $(k === 'id' ? 'game-id' : k).value = g[k] ?? '';
  }
  $('home_image_url').value = g.home_image_url || '';
  $('home_fit').value = g.home_fit || g.cover_fit || 'cover';
  $('home_x').value = g.home_position_x ?? g.cover_position_x ?? 50;
  $('home_y').value = g.home_position_y ?? g.cover_position_y ?? 50;
  $('catalog_image_url').value = g.catalog_image_url || '';
  $('catalog_fit').value = g.catalog_fit || g.cover_fit || 'cover';
  $('catalog_x').value = g.catalog_position_x ?? g.cover_position_x ?? 50;
  $('catalog_y').value = g.catalog_position_y ?? g.cover_position_y ?? 50;
  $('detail_image_url').value = g.detail_image_url || '';
  $('detail_fit').value = g.detail_fit || g.cover_fit || 'cover';
  $('detail_x').value = g.detail_position_x ?? g.cover_position_x ?? 50;
  $('detail_y').value = g.detail_position_y ?? g.cover_position_y ?? 50;
  updateAllPreviews();
  $('featured').checked = !!g.featured;
  $('published').checked = !!g.published;
  updateCoverPreview();
  window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
}

$('clear-form').onclick = () => {
  $('game-form').reset();
  $('game-id').value = '';
  $('form-heading').textContent = 'Adicionar jogo';
  updateCoverPreview();
};

$('game-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('game-id').value;
  const payload = {
    title:$('title').value.trim(),
    slug:$('slug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-'),
    category:$('category').value,
    short_description:$('short_description').value,
    description:$('description').value,
    cover_url:$('cover_url').value || null,
    home_image_url:$('home_image_url').value || null,
    home_fit:$('home_fit').value,
    home_position_x:Number($('home_x').value),
    home_position_y:Number($('home_y').value),
    catalog_image_url:$('catalog_image_url').value || null,
    catalog_fit:$('catalog_fit').value,
    catalog_position_x:Number($('catalog_x').value),
    catalog_position_y:Number($('catalog_y').value),
    detail_image_url:$('detail_image_url').value || null,
    detail_fit:$('detail_fit').value,
    detail_position_x:Number($('detail_x').value),
    detail_position_y:Number($('detail_y').value),
    status:$('status').value,
    status_label:$('status').selectedOptions[0].text.toUpperCase(),
    action_label:$('action_label').value,
    action_url:$('action_url').value || null,
    body_html:$('body_html').value,
    featured:$('featured').checked,
    published:$('published').checked,
    updated_at:new Date().toISOString()
  };
  const result = id
    ? await supabase.from('games').update(payload).eq('id',id)
    : await supabase.from('games').insert({...payload,sort_order:100});
  if (result.error) {
    alert(result.error.message);
    return;
  }
  alert('Jogo salvo. A capa será atualizada no catálogo e na página do projeto.');
  $('clear-form').click();
  await loadGames();
  await loadMedia();
});

const imageAreas = [
  {key:'home',url:'home_image_url',fit:'home_fit',x:'home_x',y:'home_y',preview:'home_preview'},
  {key:'catalog',url:'catalog_image_url',fit:'catalog_fit',x:'catalog_x',y:'catalog_y',preview:'catalog_preview'},
  {key:'detail',url:'detail_image_url',fit:'detail_fit',x:'detail_x',y:'detail_y',preview:'detail_preview'}
];
function updateAreaPreview(area) {
  const img=$(area.preview);
  const customSource=$(area.url).value.trim();
  const defaultSource=$('cover_url').value.trim();
  const source=customSource || defaultSource || ((area.key==='detail' && $('media-kind').value==='banners') || (area.key!=='detail' && $('media-kind').value==='covers') ? selectedPreviewUrl : null);
  img.style.objectFit=$(area.fit).value;
  img.style.objectPosition=$(area.x).value+'% '+$(area.y).value+'%';
  $(area.x+'_value').textContent=$(area.x).value+'%';
  $(area.y+'_value').textContent=$(area.y).value+'%';
  if(source){img.src=source;img.hidden=false;}else{img.removeAttribute('src');img.hidden=true;}
}
function updateAllPreviews(){imageAreas.forEach(updateAreaPreview);}
for(const area of imageAreas){
  [area.url,area.fit,area.x,area.y].forEach(id=>$(id).addEventListener('input',()=>updateAreaPreview(area)));
  $(area.fit).addEventListener('change',()=>updateAreaPreview(area));
}
function updateCoverPreview(){updateAllPreviews();}
$('cover_url').addEventListener('input',updateAllPreviews);
$('cover-file').addEventListener('change',() => {
  const file = $('cover-file').files[0];
  if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
  selectedPreviewUrl = null;
  if (!file) { updateAllPreviews(); return; }
  try {
    validateImage(file);
    selectedPreviewUrl = URL.createObjectURL(file);
    updateAllPreviews();
  } catch (err) {
    alert(err.message);
    $('cover-file').value='';
    updateAllPreviews();
  }
});
$('media-kind').addEventListener('change',updateAllPreviews);

function validateImage(file) {
  if (!file) throw new Error('Escolha uma imagem primeiro.');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('A imagem ultrapassa o limite de 5 MB.');
  if (!TYPES.includes(file.type)) throw new Error('Formato não permitido. Use JPG, PNG, WebP ou GIF.');
}

function safeSlug(value) {
  return (value || 'projeto').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-');
}

async function uploadImage(file, path, replace = false) {
  validateImage(file);
  const {error} = await supabase.storage.from('game-media').upload(path,file,{
    cacheControl:'3600',
    upsert:replace,
    contentType:file.type
  });
  if (error) throw error;
  const {data} = supabase.storage.from('game-media').getPublicUrl(path);
  return data.publicUrl;
}

$('upload-cover').addEventListener('click',async () => {
  const file = $('cover-file').files[0];
  const folder = $('media-kind').value;
  try {
    validateImage(file);
    const slug = safeSlug($('slug').value || $('title').value);
    const path = `${folder}/${slug}-${Date.now()}.${EXT[file.type]}`;
    const btn = $('upload-cover');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    const publicUrl = await uploadImage(file,path);
    if (folder === 'covers') {
      $('cover_url').value = publicUrl;
      updateAllPreviews();
      alert('Imagem enviada como capa padrão. Se quiser, ajuste as imagens específicas de cada área antes de salvar.');
    } else {
      $('detail_image_url').value = publicUrl;
      updateAreaPreview(imageAreas[2]);
      alert('Banner aplicado à página do jogo. Clique em “Salvar jogo” para publicar.');
    }
    $('cover-file').value = '';
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    selectedPreviewUrl = null;
    updateAllPreviews();
    await loadMedia();
    btn.disabled = false;
    btn.textContent = 'Enviar imagem';
  } catch (err) {
    console.error('Falha no upload de imagem:',err);
    alert('O Supabase recusou o envio da imagem. Detalhe: ' + (err.message || err.error_description || String(err)));
    $('upload-cover').disabled = false;
    $('upload-cover').textContent = 'Enviar imagem';
  }
});

async function loadMedia() {
  const area = $('media-list');
  if (!area || !supabaseReady || !currentUser) return;
  area.innerHTML = 'Carregando biblioteca...';
  const folders = ['covers','banners'];
  const results = await Promise.all(folders.map(folder =>
    supabase.storage.from('game-media').list(folder,{limit:100,sortBy:{column:'created_at',order:'desc'}})
      .then(result => ({folder,...result}))
  ));
  area.innerHTML = '';
  const failed = results.find(result => result.error);
  if (failed) {
    area.textContent = 'Não foi possível listar a biblioteca: ' + failed.error.message;
    return;
  }
  let count = 0;
  for (const result of results) {
    for (const file of (result.data || [])) {
      if (!file.name || file.name === '.emptyFolderPlaceholder') continue;
      count++;
      const path = result.folder + '/' + file.name;
      const {data:urlData} = supabase.storage.from('game-media').getPublicUrl(path);
      const item = document.createElement('div');
      item.className = 'media-item';
      const img = document.createElement('img');
      img.src = urlData.publicUrl;
      img.alt = file.name;
      const name = document.createElement('span');
      name.textContent = (result.folder === 'covers' ? 'CAPA · ' : 'BANNER · ') + file.name;
      const makeApplyButton = (label, target) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.onclick = () => {
          if (target === 'cover_url') {
            $(target).value = urlData.publicUrl;
            updateAllPreviews();
          } else {
            $(target).value = urlData.publicUrl;
            const area = imageAreas.find(item => item.url === target);
            if (area) updateAreaPreview(area);
          }
          window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
          alert('Imagem aplicada. Clique em “Salvar jogo” para publicar.');
        };
        return button;
      };
      const useDefault = makeApplyButton('Usar como padrão', 'cover_url');
      const useHome = makeApplyButton('Usar na página inicial', 'home_image_url');
      const useCatalog = makeApplyButton('Usar na loja', 'catalog_image_url');
      const useDetail = makeApplyButton('Usar na página do jogo', 'detail_image_url');
      const replaceInput = document.createElement('input');
      replaceInput.type = 'file';
      replaceInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
      replaceInput.hidden = true;
      const replace = document.createElement('button');
      replace.type = 'button';
      replace.textContent = 'Substituir arquivo';
      replace.onclick = () => replaceInput.click();
      replaceInput.onchange = async () => {
        const replacement = replaceInput.files[0];
        if (!replacement) return;
        try {
          validateImage(replacement);
          if (!confirm('Substituir esta imagem mantendo o mesmo endereço? As páginas que usam essa URL passarão a exibir o novo arquivo.')) return;
          replace.disabled = true;
          await uploadImage(replacement,path,true);
          alert('Imagem substituída com sucesso.');
          await loadMedia();
        } catch (err) {
          alert('Não foi possível substituir a imagem: ' + err.message);
        } finally {
          replace.disabled = false;
          replaceInput.value = '';
        }
      };
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Excluir imagem';
      remove.onclick = async () => {
        if (!confirm('Excluir esta imagem do Storage?')) return;
        try {
          const {data:games,error:gamesError} = await supabase.from('games').select('title,cover_url,home_image_url,catalog_image_url,detail_image_url');
          if (gamesError) throw gamesError;
          const inUse = (games || []).filter(game => [game.cover_url,game.home_image_url,game.catalog_image_url,game.detail_image_url].includes(urlData.publicUrl));
          if (inUse.length) {
            alert('Esta imagem está sendo usada por: ' + inUse.map(game => game.title).join(', ') + '. Troque a capa desses jogos antes de excluir.');
            return;
          }
          const {error} = await supabase.storage.from('game-media').remove([path]);
          if (error) throw error;
          await loadMedia();
        } catch (err) {
          alert('Não foi possível excluir a imagem: ' + err.message);
        }
      };
      item.append(img,name,useDefault,useHome,useCatalog,useDetail,replace,replaceInput,remove);
      area.append(item);
    }
  }
  if (!count) area.textContent = 'Nenhuma imagem enviada ainda.';
}

document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click',() => {
    document.querySelectorAll('[data-tab]').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    if (button.dataset.tab === 'settings') {
      $('editor').innerHTML = '<h2>Configurações gerais</h2><p>Editor de banners do site, rodapé, redes sociais e navegação poderá ser adicionado em uma próxima etapa. O gerenciamento de capas, banners de projeto e biblioteca de mídia fica na aba Loja / Jogos.</p>';
    }
  });
});
