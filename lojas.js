(() => {
  const API='https://www.supermercadosriosul.com.br/api/stores.php?orderr=name%20ASC';
  const $=id=>document.getElementById(id);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let stores=[];let position=null;let limit=9;let selectedKey=null;
  function distance(lat1,lng1,lat2,lng2){const radians=n=>n*Math.PI/180;const dLat=radians(lat2-lat1),dLng=radians(lng2-lng1);const a=Math.sin(dLat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
  const keyOf=store=>`${store.lat},${store.lng}`;
  function showOnMap(store){
    if(!store)return;
    const key=keyOf(store);
    if(selectedKey!==key)$('storeMap').src=`https://maps.google.com/maps?q=${encodeURIComponent(key)}&z=15&output=embed`;
    selectedKey=key;
    $('storeMap').title=`Localização de ${store.name} no Google Maps`;
    $('mapStoreName').textContent=`${store.name} · ${store.district || store.city}`;
    $('mapStoreLink').href=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(key)}`;
  }
  function render(){
    const query=normalize($('storeSearch').value.trim());
    const matches=stores.filter(store=>normalize(`${store.name} ${store.city} ${store.district} ${store.address} ${store.zipCode}`).includes(query));
    if(position)matches.sort((a,b)=>a.distance-b.distance);else matches.sort((a,b)=>a.city.localeCompare(b.city,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'));
    $('storeCount').textContent=`${matches.length} ${matches.length===1?'loja':'lojas'}`;
    $('storesTitle').textContent=position?'Mais próximas de você':'Nossas lojas';
    $('showMore').hidden=matches.length<=limit;
    if(matches.length&&!matches.some(store=>keyOf(store)===selectedKey))showOnMap(matches[0]);
    $('storesGrid').innerHTML=matches.slice(0,limit).map((store,index)=>{
      const name=escapeHtml(store.name);
      const address=escapeHtml(`${store.address}, ${store.number} · ${store.district}`);
      const city=escapeHtml(`${store.city} - ${store.state} · CEP ${store.zipCode}`);
      const route=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(keyOf(store))}`;
      const phone=String(store.phone||'').replace(/[^\d+]/g,'');
      const whats=String(store.whatsapp||'').replace(/\D/g,'');
      const selected=selectedKey===keyOf(store);
      return `<article class="store-card ${selected?'is-selected':''}"><div class="store-index"><span>Unidade ${String(index+1).padStart(2,'0')}</span><span>${position?`${store.distance.toFixed(1).replace('.',',')} km`:`${escapeHtml(store.city)}`}</span></div><h3>${name}</h3><address>${address}<br>${city}</address><div class="store-actions"><button type="button" data-map="${escapeHtml(keyOf(store))}" aria-label="Ver loja ${name} no mapa" ${selected?'aria-current="true"':''}>Ver no mapa ↗</button><a href="${route}" target="_blank" rel="noopener noreferrer" aria-label="Traçar rota para loja ${name}">Traçar rota ↗</a>${phone?`<a href="tel:${phone}">Ligar</a>`:''}${whats?`<a href="https://wa.me/${whats}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`:''}</div></article>`;
    }).join('')||'<p class="empty-message">Nenhuma loja encontrada. Tente outra cidade ou bairro.</p>';
  }
  async function init(){try{const response=await fetch(API);if(!response.ok)throw Error('API indisponível');stores=await response.json();$('locatorStatus').textContent='Dados atualizados do site oficial. Toque em “Usar minha localização” para ver as lojas mais próximas.';}catch(_){try{const response=await fetch('stores.json');if(!response.ok)throw Error('Cadastro indisponível');stores=await response.json();$('locatorStatus').textContent='Mostrando o cadastro de lojas salvo em 25/09/2026.';}catch(error){$('locatorStatus').textContent='Não foi possível carregar as lojas. Atualize a página.';return;}}stores=stores.filter(store=>Number.isFinite(Number(store.lat))&&Number.isFinite(Number(store.lng))&&store.name);render();}
  $('storeSearch').addEventListener('input',()=>{limit=9;render();});$('showMore').addEventListener('click',()=>{limit+=12;render();});
  $('storesGrid').addEventListener('click',event=>{const button=event.target.closest('[data-map]');if(!button)return;const store=stores.find(item=>keyOf(item)===button.dataset.map);if(!store)return;showOnMap(store);render();document.querySelector('.map-stage').scrollIntoView({behavior:'smooth',block:'center'});});
  $('locateMe').addEventListener('click',()=>{if(!navigator.geolocation){$('locatorStatus').textContent='Seu navegador não oferece localização. Busque por cidade ou bairro.';return;}$('locatorStatus').textContent='Solicitando sua localização ao navegador...';navigator.geolocation.getCurrentPosition(({coords})=>{position={lat:coords.latitude,lng:coords.longitude};for(const store of stores)store.distance=distance(position.lat,position.lng,Number(store.lat),Number(store.lng));limit=9;$('locatorStatus').textContent='Lojas ordenadas pela distância aproximada em linha reta. Sua posição não é salva pelo site.';render();},()=>{$('locatorStatus').textContent='Não foi possível acessar sua localização. Você pode buscar por cidade, bairro ou rua.';},{enableHighAccuracy:false,timeout:12000,maximumAge:300000});});
  init();
})();
