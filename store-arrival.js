(() => {
  const $ = id => document.getElementById(id);
  const apiKey = document.querySelector('meta[name="google-maps-api-key"]')?.content.trim() || '';
  const hero = $('locatorHero');
  const stage = $('mapStage');
  const modeSwitch = $('modeSwitch');
  const layers = [$('heroPhotoA'), $('heroPhotoB')];
  const facade = $('facadePhoto');
  const facadeScreen = $('facadeScreen');
  const credit = $('storePhotoCredit');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Google Maps cover photos and addresses checked against the official store records.
  // A store is omitted until its exterior photo has been verified.
  const curated = {
    '1': {
      query: 'Rio Sul Vila São Luís Super Loja Avenida Expedicionário José Amaro 654 Duque de Caxias RJ',
      streetWords: ['expedicionario', 'jose', 'amaro'],
      number: '654',
      photoIndex: 0
    },
    '35': {
      query: 'Rio Sul Supermercados Penha Centro Avenida Lobo Júnior 1615 Rio de Janeiro RJ',
      streetWords: ['lobo', 'junior'],
      number: '1615',
      photoIndex: 0
    }
  };

  let placesPromise;
  let requestToken = 0;
  let lookupTimer;
  let arrivalTimer;
  let activeLayer = 0;
  let hasPhoto = false;
  let manuallyChangedMode = false;

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const radians = value => value * Math.PI / 180;
  const distance = (a, b, c, d) => {
    const dLat = radians(c - a);
    const dLng = radians(d - b);
    const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a)) * Math.cos(radians(c)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  };

  function setMode(mode) {
    if (mode === 'facade' && !hasPhoto) return;
    stage.dataset.mode = mode;
    facadeScreen.setAttribute('aria-hidden', String(mode !== 'facade'));
    $('storeMap').tabIndex = mode === 'facade' ? -1 : 0;
    for (const button of modeSwitch.querySelectorAll('button[data-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
  }

  function removeHiddenSources() {
    for (const layer of layers) {
      if (!layer.classList.contains('is-visible')) layer.removeAttribute('src');
    }
  }

  function hidePhoto() {
    hasPhoto = false;
    hero.classList.remove('has-store-photo');
    layers.forEach(layer => layer.classList.remove('is-visible'));
    modeSwitch.hidden = true;
    credit.hidden = true;
    facade.removeAttribute('src');
    facade.alt = '';
    setMode('map');
    window.setTimeout(removeHiddenSources, 1200);
  }

  function loadPlaces() {
    if (!apiKey) return Promise.resolve(null);
    if (placesPromise) return placesPromise;
    if (window.google?.maps?.importLibrary) {
      placesPromise = window.google.maps.importLibrary('places');
      return placesPromise;
    }
    placesPromise = new Promise((resolve, reject) => {
      const callback = '__rioSulGoogleMapsReady';
      const script = document.createElement('script');
      window[callback] = () => {
        delete window[callback];
        resolve();
      };
      script.onerror = () => {
        delete window[callback];
        reject(new Error('Google Maps não carregou.'));
      };
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(apiKey) +
        '&v=weekly&libraries=places&loading=async&callback=' + callback;
      document.head.appendChild(script);
    }).then(() => window.google.maps.importLibrary('places'));
    return placesPromise;
  }

  async function findVerifiedPhoto(store) {
    const entry = curated[String(store.id)];
    if (!entry || !apiKey) return null;
    const { Place } = await loadPlaces();
    const response = await Place.searchByText({
      textQuery: entry.query,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      maxResultCount: 5,
      region: 'br'
    });
    const matchingPlace = (response.places || []).find(place => {
      const address = normalize(place.formattedAddress);
      const name = normalize(place.displayName);
      const point = place.location;
      const lat = typeof point?.lat === 'function' ? point.lat() : Number(point?.lat);
      const lng = typeof point?.lng === 'function' ? point.lng() : Number(point?.lng);
      return name.includes('rio sul') &&
        address.includes(entry.number) &&
        entry.streetWords.every(word => address.includes(word)) &&
        Number.isFinite(lat) && Number.isFinite(lng) &&
        distance(Number(store.lat), Number(store.lng), lat, lng) < 0.5;
    });
    if (!matchingPlace) return null;
    await matchingPlace.fetchFields({ fields: ['photos', 'googleMapsURI'] });
    const photo = matchingPlace.photos?.[entry.photoIndex];
    if (!photo || photo.widthPx < 800 || photo.heightPx < 450) return null;
    return {
      uri: photo.getURI({ maxWidth: 2200 }),
      source: photo.googleMapsURI || matchingPlace.googleMapsURI || $('mapStoreLink').href,
      attributions: photo.authorAttributions || []
    };
  }

  function setCredit(photo) {
    credit.replaceChildren(document.createTextNode('Fachada no Google Maps'));
    for (const author of photo.attributions) {
      if (!author.displayName) continue;
      credit.append(document.createTextNode(' · Foto: '));
      if (author.uri) {
        const link = document.createElement('a');
        link.href = author.uri;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = author.displayName;
        credit.append(link);
      } else {
        credit.append(document.createTextNode(author.displayName));
      }
    }
    const source = document.createElement('a');
    source.href = photo.source;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'Ver foto';
    credit.append(document.createTextNode(' · '), source);
    credit.hidden = false;
  }

  function revealPhoto(store, photo, token) {
    const preload = new Image();
    preload.onload = () => {
      if (token !== requestToken) return;
      activeLayer = 1 - activeLayer;
      const next = layers[activeLayer];
      const previous = layers[1 - activeLayer];
      next.src = photo.uri;
      facade.src = photo.uri;
      facade.alt = 'Fachada da loja Rio Sul ' + store.name + ', ' + store.city;
      setCredit(photo);
      modeSwitch.hidden = false;
      hasPhoto = true;
      window.requestAnimationFrame(() => {
        if (token !== requestToken) return;
        hero.classList.add('has-store-photo');
        next.classList.add('is-visible');
        previous.classList.remove('is-visible');
      });
      window.setTimeout(removeHiddenSources, 1200);
      arrivalTimer = window.setTimeout(() => {
        if (token === requestToken && !manuallyChangedMode) setMode('facade');
      }, reducedMotion.matches ? 0 : 850);
    };
    preload.onerror = () => {};
    preload.src = photo.uri;
  }

  document.addEventListener('rio-sul:store-selected', event => {
    requestToken += 1;
    const token = requestToken;
    window.clearTimeout(lookupTimer);
    window.clearTimeout(arrivalTimer);
    manuallyChangedMode = false;
    hidePhoto();
    const store = event.detail.store;
    if (!store || !curated[String(store.id)] || !apiKey) return;
    lookupTimer = window.setTimeout(async () => {
      try {
        const photo = await findVerifiedPhoto(store);
        if (photo && token === requestToken) revealPhoto(store, photo, token);
      } catch (_) {
        // Keep the map and dark background when Google cannot return a verified facade.
      }
    }, 380);
  });

  modeSwitch.addEventListener('click', event => {
    const button = event.target.closest('button[data-mode]');
    if (!button) return;
    manuallyChangedMode = true;
    window.clearTimeout(arrivalTimer);
    setMode(button.dataset.mode);
  });

  let parallaxFrame = 0;
  window.addEventListener('scroll', () => {
    if (!hasPhoto || reducedMotion.matches || parallaxFrame) return;
    parallaxFrame = window.requestAnimationFrame(() => {
      parallaxFrame = 0;
      const bounds = hero.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const shift = Math.min(18, Math.max(-18, window.scrollY * .035));
      hero.style.setProperty('--store-parallax', shift.toFixed(1) + 'px');
    });
  }, { passive: true });
})();
