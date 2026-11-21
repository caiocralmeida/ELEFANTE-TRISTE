# Elefante Triste Studio — reconstrução independente

Site responsivo em HTML, CSS e JavaScript, preparado para GitHub Pages e Supabase.

## O que está incluído
- Início, catálogo, página dinâmica de jogo, sobre e contato.
- Design escuro com destaque lima, layout responsivo e navegação mobile.
- Catálogo inicial com GridLife e Shift's Over.
- Busca e filtros de status.
- Painel administrativo com login Supabase e CRUD do catálogo.
- Campos para capa, descrições, status, link de ação e HTML extra isolado em iframe.
- SQL inicial com tabela e políticas RLS.

## 1. Configurar o Supabase
1. Crie um projeto em https://supabase.com/.
2. No SQL Editor, execute `sql/schema.sql`.
3. Em Authentication > Providers, mantenha Email habilitado.
4. Crie manualmente seu usuário em Authentication > Users. Desabilite cadastro público se estiver habilitado.
5. Copie o UUID desse usuário e execute no SQL Editor: `insert into public.admin_users (user_id) values ('SEU-UUID-AQUI');`
6. Copie `js/config.example.js` para `js/config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` com os dados de Project Settings > API.
7. **Nunca coloque a chave `service_role` no JavaScript ou no GitHub.**

> Segurança: a política de escrita usa uma allowlist na tabela `admin_users`. Somente o UUID inserido nessa tabela pode alterar o catálogo. Não compartilhe a conta administrativa.

## 2. Testar localmente
Como o projeto usa módulos JavaScript, abra com um servidor local (não `file://`). Exemplo com Python:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000`.

## 3. Publicar no GitHub Pages
1. Crie um repositório GitHub e envie todos os arquivos.
2. Em Settings > Pages, escolha Deploy from a branch, selecione `main` e `/ (root)`.
3. Aguarde o endereço `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
4. Se usar repositório de projeto, mantenha os caminhos relativos como estão.

## 4. Imagens e identidade
As artes gráficas atuais são placeholders CSS originais, não são imagens extraídas do Wix. Substitua por arquivos próprios em `assets/images/` e atualize os campos de capa no painel.

## Limitações desta primeira entrega
- O login e o catálogo remoto funcionam após configurar Supabase e executar o SQL.
- A seção de configurações gerais do painel é um ponto de expansão, não um editor completo ainda.
- O upload de imagens no painel e a biblioteca de mídia ainda precisam ser conectados ao Supabase Storage.
- Os blocos HTML são exibidos em iframe sandbox; scripts que precisem de permissões adicionais devem ser avaliados individualmente.
- Não existe checkout/pagamento: a loja foi definida como catálogo.
