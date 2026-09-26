(() => {
  const API = 'https://www.supermercadosriosul.com.br/api/promotions.php?orderr=id%20DESC&limit=500';
  const SITE_PHOTO_IDS = new Set([7,11,13,16,27,30,31,80,97,100,107,118,142,148]);
  const STORAGE_KEY = 'rio-sul-lista-v1';
  const money = value => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(value);
  const dateText = value => value.split('-').reverse().join('/');
  const today = new Date().toLocaleDateString('en-CA', {timeZone:'America/Sao_Paulo'});
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let offers = [];
  let category = 'Todas';
  let list = {};

  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) list = saved; } catch (_) { list = {}; }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) { status('Não foi possível salvar automaticamente neste navegador.'); } };
  const status = message => { $('listStatus').textContent = message; };
  const classify = name => /café|arroz|feijão|maionese|açúcar|óleo|farinha/i.test(name) ? 'Mercearia' : /frango|picanha|filé|coxa|linguiça|burguer/i.test(name) ? 'Açougue e congelados' : /sabão|omo|tixan|detergente/i.test(name) ? 'Limpeza e casa' : 'Outras ofertas';
  const readJson = async path => { const response = await fetch(path); if (!response.ok) throw Error(`Falha ao carregar ${path}`); return response.json(); };
  const isExpired = offer => today > offer.to;
  const isFuture = offer => today < offer.from;
  const availability = offer => isExpired(offer) ? 'Encerrada' : isFuture(offer) ? 'Em breve' : 'Válida agora';

  function offerImage(offer) {
    const siteId=offer.source==='site'?Number(offer.id.slice(5)):null;
    const image=offer.source==='site' ? (SITE_PHOTO_IDS.has(siteId)?`assets/site-promotions/${siteId}.webp`:null) : offer.image;
    const label=offer.source==='site'?'Oferta do site oficial':`Encarte · pág. ${offer.page}`;
    return `<div class="offer-visual ${image?'has-photo':'no-photo'}"><strong class="visual-fallback">${escapeHtml(offer.name.split(' ').slice(0,4).join(' '))}</strong>${image?`<img src="${escapeHtml(image)}" alt="Imagem ilustrativa de ${escapeHtml(offer.name)}" loading="lazy" decoding="async" onerror="this.parentElement.classList.add('no-photo');this.remove()">`:''}<span class="source-chip">${label}</span></div>`;
  }
  function renderCategories() {
    const categories = ['Todas','Ofertas do site','Mercearia','Laticínios','Padaria','Frios e congelados','Cuidados pessoais','Limpeza e casa','Açougue e congelados'];
    $('categories').innerHTML = categories.filter(item => item === 'Todas' || item === 'Ofertas do site' || offers.some(offer => offer.category === item)).map(item => `<button type="button" class="${category===item?'active':''}" data-category="${escapeHtml(item)}" aria-pressed="${category===item}">${escapeHtml(item)}</button>`).join('');
  }
  function renderOffers() {
    const query = normalize($('offerSearch').value.trim());
    const matches = offers.filter(offer => (category === 'Todas' || (category === 'Ofertas do site' ? offer.source === 'site' : offer.category === category)) && (!query || normalize(offer.name).includes(query)));
    const sort = $('offerSort').value;
    matches.sort((a,b) => sort === 'price-asc' ? a.price-b.price : sort === 'price-desc' ? b.price-a.price : sort === 'name' ? a.name.localeCompare(b.name,'pt-BR') : (a.source === b.source ? a.name.localeCompare(b.name,'pt-BR') : a.source === 'site' ? -1 : 1));
    $('resultCount').textContent = `${matches.length} ${matches.length===1?'oferta':'ofertas'}`;
    $('resultTitle').textContent=category==='Todas'?'Descubra as ofertas':category==='Ofertas do site'?'Ofertas do site oficial':category;
    $('resultSubtitle').textContent=query?'Resultados da sua busca.':'Selecione, compare e monte sua lista para a loja.';
    $('emptyOffers').hidden = matches.length > 0;
    $('offersGrid').innerHTML = matches.map((offer,index) => `<article class="offer-card ${isExpired(offer)?'expired':''} ${index===0&&matches.length>3&&!query&&category==='Todas'&&sort==='featured'?'offer-card-feature':''}">${offerImage(offer)}<div class="offer-card-body"><div class="offer-meta"><span>${escapeHtml(offer.category)}</span><span>${availability(offer)}</span></div><h3>${escapeHtml(offer.name)}</h3><div class="price-line"><strong>${money(offer.price)}</strong><span>por unidade anunciada</span></div><p class="validity">Válida de ${dateText(offer.from)} a ${dateText(offer.to)}${offer.source==='flyer'?' · Encarte':' · Site oficial'}</p><div class="card-actions"><button type="button" data-add="${offer.id}" class="${list[offer.id]?'selected':''}" ${isExpired(offer)||isFuture(offer)?'disabled':''} aria-label="${list[offer.id]?'Remover':'Adicionar'} ${escapeHtml(offer.name)} ${list[offer.id]?'da':'à'} lista">${list[offer.id]?'♥ Na lista':'♡ Adicionar'}</button>${offer.page?`<a href="encarte-rio-sul.pdf#page=${offer.page}" target="_blank" rel="noopener" aria-label="Ver página ${offer.page} do encarte">↗</a>`:''}</div></div></article>`).join('');
  }
  function quantityOf(id) { const entry=list[id]; return Number(entry && typeof entry==='object' ? entry.quantity : entry)||0; }
  function selected() { return Object.entries(list).map(([id,entry]) => ({offer:offers.find(item=>item.id===id)||(entry&&typeof entry==='object'?entry.offer:null), quantity:quantityOf(id)})).filter(item=>item.offer&&item.quantity>0); }
  function renderList() {
    const items = selected();
    const count = items.reduce((total,item)=>total+item.quantity,0);
    const total = items.reduce((sum,item)=>sum+item.offer.price*item.quantity,0);
    $('listCount').textContent = count; $('drawerCount').textContent = count; $('listTotal').textContent = money(total);
    $('emptyList').hidden = items.length > 0;
    $('selectedItems').innerHTML = items.map(({offer,quantity})=>`<div class="selected-item"><div><h3>${escapeHtml(offer.name)}</h3><p>${money(offer.price)} cada · até ${dateText(offer.to)}${isExpired(offer)?' · encerrada':''}</p><div class="qty-row"><button type="button" data-qty="${offer.id}" data-change="-1" aria-label="Reduzir quantidade de ${escapeHtml(offer.name)}">−</button><span>${quantity}</span><button type="button" data-qty="${offer.id}" data-change="1" aria-label="Aumentar quantidade de ${escapeHtml(offer.name)}">+</button><button class="remove-item" type="button" data-remove="${offer.id}">Remover</button></div></div><strong>${money(offer.price*quantity)}</strong></div>`).join('');
    for (const id of ['downloadPdf','shareNotes','shareWhatsapp']) $(id).disabled = !items.length;
  }
  function update() { save(); renderList(); renderOffers(); }
  function listText() {
    const lines = [`LISTA DE COMPRAS | RIO SUL`,`Gerada em ${new Date().toLocaleDateString('pt-BR')}`,''];
    for (const {offer,quantity} of selected()) lines.push(`${quantity}x ${offer.name} — ${money(offer.price)} cada = ${money(offer.price*quantity)}`,`   Promoção: ${dateText(offer.from)} a ${dateText(offer.to)}${isExpired(offer)?' (encerrada)':''}`,'');
    lines.push(`TOTAL ESTIMADO: ${money(selected().reduce((sum,item)=>sum+item.offer.price*item.quantity,0))}`,'Preços e disponibilidade sujeitos à confirmação na loja.','Encarte: https://wescostt.github.io/supermercados-rio-sul/encarte-digital.html');
    return lines.join('\n');
  }
  function download(blob, filename) { const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=filename; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000); }
  async function exportPdf() {
    try {
      if (!window.PDFLib) throw Error('O gerador de PDF não carregou.');
      const {PDFDocument,StandardFonts,rgb} = window.PDFLib;
      const doc=await PDFDocument.create(); const regular=await doc.embedFont(StandardFonts.Helvetica); const bold=await doc.embedFont(StandardFonts.HelveticaBold);
      const clean=text=>String(text).replace(/[–—]/g,'-').replace(/[’]/g,"'").replace(/[^\x20-\x7e\u00a0-\u00ff]/g,'');
      let page=doc.addPage([595,842]); let y=790;
      const line=(text,size=11,font=regular,color=rgb(.13,.18,.2))=>{if(y<65){page=doc.addPage([595,842]);y=790;}page.drawText(clean(text),{x:42,y,size,font,color});y-=size+9;};
      const wrap=(text,size=11,font=regular)=>{const words=clean(text).split(/\s+/);let current='';for(const word of words){const next=current?`${current} ${word}`:word;if(font.widthOfTextAtSize(next,size)>505&&current){line(current,size,font);current=word;}else current=next;}if(current)line(current,size,font);};
      line('RIO SUL  /  LISTA DE COMPRAS',19,bold,rgb(.67,.14,.2));y-=8;line(`Gerada em ${new Date().toLocaleDateString('pt-BR')}`,10);y-=14;
      for(const {offer,quantity} of selected()){wrap(`${quantity}x ${offer.name}`,12,bold);line(`${money(offer.price)} cada   |   ${money(offer.price*quantity)} no total`,10);line(`Promoção válida: ${dateText(offer.from)} a ${dateText(offer.to)}${isExpired(offer)?' (encerrada)':''}`,9);y-=10;}
      y-=10;line(`TOTAL ESTIMADO: ${money(selected().reduce((sum,item)=>sum+item.offer.price*item.quantity,0))}`,15,bold,rgb(.67,.14,.2));wrap('Preços e disponibilidade sujeitos à confirmação na loja.',9);
      download(new Blob([await doc.save()],{type:'application/pdf'}),'rio-sul-lista-de-compras.pdf');status('PDF da lista baixado.');
    } catch (error) { status(`Não foi possível criar o PDF: ${error.message}`); }
  }
  function openDrawer() { $('drawerScrim').hidden=false; $('listDrawer').inert=false; $('listDrawer').classList.add('open'); $('listDrawer').setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; $('closeList').focus(); }
  function closeDrawer() { $('listDrawer').classList.remove('open'); $('listDrawer').setAttribute('aria-hidden','true'); $('listDrawer').inert=true; $('drawerScrim').hidden=true; document.body.style.overflow=''; $('openList').focus(); }
  async function init() {
    let flyer=[]; let fallback=[];
    try { flyer=await readJson('offers.json'); } catch (error) { $('emptyOffers').textContent='Não foi possível carregar o encarte. Recarregue a página.'; }
    try { fallback=await readJson('promotions-current.json'); } catch (_) { /* O encarte local continua disponível. */ }
    let site=fallback;
    try { site=await readJson(API); } catch (_) { status('Ofertas extras exibidas a partir da última atualização do site oficial.'); }
    const activeSite=(Array.isArray(site)?site:[]).filter(item=>item.status==='active'&&item.startdate<=today&&item.enddate>=today&&Number.isFinite(Number(String(item.price).replace(',','.')))).map(item=>({id:`site-${item.id}`,name:item.description,price:Number(String(item.price).replace(',','.')),category:classify(item.description),from:item.startdate,to:item.enddate,source:'site'}));
    offers=[...activeSite,...flyer.map(item=>({...item,from:'2026-09-01',to:'2026-09-30',source:'flyer'}))];
    renderCategories(); renderOffers(); renderList(); save();
  }
  $('categories').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;category=button.dataset.category;renderCategories();renderOffers();});
  $('offerSearch').addEventListener('input',renderOffers); $('offerSort').addEventListener('change',renderOffers);
  $('offersGrid').addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(!button)return;const id=button.dataset.add;if(list[id])delete list[id];else list[id]={quantity:1,offer:offers.find(item=>item.id===id)};update();});
  $('selectedItems').addEventListener('click',event=>{const change=event.target.closest('[data-qty]');const remove=event.target.closest('[data-remove]');if(change){const id=change.dataset.qty;const quantity=Math.max(0,Math.min(99,quantityOf(id)+Number(change.dataset.change)));if(!quantity)delete list[id];else list[id]={quantity,offer:offers.find(item=>item.id===id)||(list[id]&&list[id].offer)};update();}else if(remove){delete list[remove.dataset.remove];update();}});
  for(const id of ['openList','openListBottom']) $(id).addEventListener('click',openDrawer);
  $('closeList').addEventListener('click',closeDrawer); $('drawerScrim').addEventListener('click',closeDrawer); document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('listDrawer').classList.contains('open'))closeDrawer();});
  $('downloadPdf').addEventListener('click',exportPdf);
  $('shareNotes').addEventListener('click',async()=>{const text=listText();if(navigator.share){try{await navigator.share({title:'Minha lista de compras Rio Sul',text});status('Lista enviada pelo menu de compartilhamento.');return;}catch(error){if(error.name==='AbortError')return;}}download(new Blob([text],{type:'text/plain;charset=utf-8'}),'rio-sul-lista-de-compras.txt');status('Arquivo de texto baixado. Você pode abri-lo nas Notas.');});
  $('shareWhatsapp').addEventListener('click',()=>{window.open(`https://wa.me/?text=${encodeURIComponent(listText())}`,'_blank','noopener,noreferrer');status('No WhatsApp, escolha a conversa “Mensagem para você”.');});
  init();
})();
