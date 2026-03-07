// main.js - esqueleto inicial para el juego de cartas

const gameState = {
  selectedCardId: null,
  running: false,
  score: 0,
  coins: 0, // Monedas acumuladas desde partidas anteriores
  coinsMilestone: 0, // Milestone interno para premiar por cada 1000 puntos
  albums: [],
  enemies: [],
  bullets: [],
  keys: { left: false, right: false, fire: false },
  rafId: null,
  lastFrame: 0,
  canvas: null,
  ctx: null,
  playerImg: null,
  playerCard: null,
  onScoreUpdate: null,
};

function loadCoins() {
  const raw = localStorage.getItem('juegoCartasCoins');
  const n = parseInt(raw, 10);
  gameState.coins = Number.isFinite(n) ? n : 0;
}

function saveCoins() {
  localStorage.setItem('juegoCartasCoins', String(gameState.coins));
}

function loadAlbums() {
  try {
    const raw = localStorage.getItem('juegoCartasAlbums');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) gameState.albums = parsed;
    else gameState.albums = [];
  } catch {
    gameState.albums = [];
  }
}

function saveAlbums() {
  localStorage.setItem('juegoCartasAlbums', JSON.stringify(gameState.albums || []));
}

function generateId() {
  return 'alb_' + Math.random().toString(16).slice(2);
}

function getAlbumById(id) {
  return (gameState.albums || []).find(a => a.id === id) || null;
}

function saveAlbumsAndRender() {
  saveAlbums();
  const container = document.getElementById('albums');
  // Evitar sobrescribir la vista de álbum cuando se está dentro de ella.
  if (container && !container.classList.contains('album-view')) {
    renderAlbumsSection();
  }
}

function createAlbum(name, background) {
  const album = {
    id: generateId(),
    name: name || 'Nuevo álbum',
    background: background || '#ffffff',
    cardIds: [],
    createdAt: Date.now(),
  };
  gameState.albums = gameState.albums || [];
  gameState.albums.push(album);
  saveAlbumsAndRender();
  return album;
}

function updateAlbum(album) {
  const idx = (gameState.albums || []).findIndex(a => a.id === album.id);
  if (idx === -1) return;
  gameState.albums[idx] = album;
  saveAlbumsAndRender();
}

function deleteAlbum(id) {
  gameState.albums = (gameState.albums || []).filter(a => a.id !== id);
  saveAlbumsAndRender();
}

function getCardById(cardId) {
  if (!window.cards) return null;
  const coll = window.cards.getCollection();
  return coll && coll[cardId] ? coll[cardId].card : null;
}

function updateCoinDisplay() {
  const el = document.getElementById('coinCounter');
  if (!el) return;
  el.textContent = `Monedas: ${gameState.coins}`;
}

function addScore(points) {
  gameState.score += points;
  if (typeof gameState.onScoreUpdate === 'function') gameState.onScoreUpdate(gameState.score);
  updateCoinsFromScore();
}

function updateCoinsFromScore() {
  const milestone = Math.floor(gameState.score / 1000);
  if (milestone <= gameState.coinsMilestone) return;
  const delta = milestone - gameState.coinsMilestone;
  gameState.coins += delta * 100;
  gameState.coinsMilestone = milestone;
  saveCoins();
  updateCoinDisplay();
}

function pointsForRarity(rarity) {
  switch ((rarity || '').toLowerCase()) {
    case 'diamond': return 500;
    case 'legendary': return 200;
    case 'epic': return 100;
    case 'rare': return 50;
    case 'common': return 10;
    default: return 10;
  }
}

function getSelectedCard() {
  if (!window.cards) return null;
  const coll = window.cards.getCollection();
  if (!coll || !gameState.selectedCardId) return null;
  return coll[gameState.selectedCardId] ? coll[gameState.selectedCardId].card : null;
}

function selectPlayerCard(cardId) {
  gameState.selectedCardId = cardId;
  gameState.playerCard = getSelectedCard();
  gameState.playerImg = null;

  if (gameState.playerCard && gameState.playerCard.image) {
    const img = new Image();
    img.src = gameState.playerCard.image;
    img.onload = () => { gameState.playerImg = img; };
    img.onerror = () => { gameState.playerImg = null; };
  }

  updatePlaySelectionUI();
}

document.addEventListener('DOMContentLoaded', () => {
  // Punto de entrada: inicializa la UI y el estado del juego
  init();
});

function init() {
  // Crear contenedores básicos si no existen
  let app = document.getElementById('app');
  if (!app) {
    app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
  }

  loadCoins();
  loadAlbums();

  // Cabecera y botón para barajar/repartir
  const header = document.createElement('h1');
  header.textContent = 'Juego de Cartas';
  app.appendChild(header);

  const coinCounter = document.createElement('div');
  coinCounter.id = 'coinCounter';
  coinCounter.className = 'coin-counter';
  app.appendChild(coinCounter);
  updateCoinDisplay();

  // Navegación: botones para ir a "Abrir sobres", "Colección" o "Jugar"
  const nav = document.createElement('div');
  nav.className = 'nav';
  const btnOpen = document.createElement('button');
  btnOpen.id = 'nav-open';
  btnOpen.className = 'nav-btn';
  btnOpen.textContent = 'Abrir sobres';
  btnOpen.addEventListener('click', () => showSection('left'));
  const btnCollection = document.createElement('button');
  btnCollection.id = 'nav-collection';
  btnCollection.className = 'nav-btn';
  btnCollection.textContent = 'Ver colección';
  btnCollection.addEventListener('click', () => showSection('right'));
  const btnPlay = document.createElement('button');
  btnPlay.id = 'nav-play';
  btnPlay.className = 'nav-btn';
  btnPlay.textContent = 'Jugar';
  btnPlay.addEventListener('click', () => showSection('play'));

  nav.appendChild(btnOpen);
  nav.appendChild(btnCollection);
  nav.appendChild(btnPlay);
  app.appendChild(nav);
  // Layout: izquierda abrir sobres, centro jugar, derecha colección
  const layout = document.createElement('div');
  layout.className = 'layout';

  const left = document.createElement('div');
  left.className = 'left';

  // Área central para el minijuego
  const center = document.createElement('div');
  center.className = 'center';

  const right = document.createElement('div');
  right.className = 'right';

  // Controles para apertura de sobres (izquierda)
  const controls = document.createElement('div');
  controls.className = 'controls';

  const packLabel = document.createElement('label');
  packLabel.textContent = 'Tamaño del sobre:';
  const packInput = document.createElement('input');
  packInput.type = 'number';
  packInput.min = '1';
  packInput.value = '5';
  packInput.id = 'packSize';

  const openBtn = document.createElement('button');
  openBtn.className = 'btn';
  openBtn.textContent = 'Abrir sobre';
  openBtn.addEventListener('click', onOpenPack);
  // Desactivar por defecto hasta que las cartas JSON se carguen
  openBtn.disabled = true;

  controls.appendChild(packLabel);
  controls.appendChild(packInput);
  controls.appendChild(openBtn);

  // Área donde se mostrarán las cartas del sobre (izquierda)
  const board = document.createElement('div');
  board.id = 'board';

  left.appendChild(controls);
  left.appendChild(board);

  // Área de colección del jugador (derecha)
  const colHeader = document.createElement('h2');
  colHeader.textContent = 'Colección';

  // Tabs para ver cartas o álbumes
  const tabs = document.createElement('div');
  tabs.className = 'collection-tabs';

  const tabCards = document.createElement('button');
  tabCards.className = 'tab-btn active';
  tabCards.dataset.tab = 'cards';
  tabCards.textContent = 'Cartas';
  tabCards.addEventListener('click', () => setCollectionTab('cards'));

  const tabAlbums = document.createElement('button');
  tabAlbums.className = 'tab-btn';
  tabAlbums.dataset.tab = 'albums';
  tabAlbums.textContent = 'Álbumes';
  tabAlbums.addEventListener('click', () => setCollectionTab('albums'));

  tabs.appendChild(tabCards);
  tabs.appendChild(tabAlbums);

  // Controles de colección (filtro por rareza)
  const collectionControls = document.createElement('div');
  collectionControls.className = 'collection-controls';
  const filterLabel = document.createElement('label');
  filterLabel.textContent = 'Filtrar por calidad:';
  filterLabel.htmlFor = 'collectionFilter';
  const filterSelect = document.createElement('select');
  filterSelect.id = 'collectionFilter';
  ['all', 'common', 'rare', 'epic', 'legendary', 'diamond'].forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt === 'all' ? 'Todas' : opt.charAt(0).toUpperCase() + opt.slice(1);
    filterSelect.appendChild(o);
  });
  filterSelect.addEventListener('change', () => updateCollectionDisplay());
  collectionControls.appendChild(filterLabel);
  collectionControls.appendChild(filterSelect);

  const collection = document.createElement('div');
  collection.id = 'collection';

  const albumsSection = document.createElement('div');
  albumsSection.id = 'albums';
  albumsSection.style.display = 'none';

  right.appendChild(colHeader);
  right.appendChild(tabs);
  right.appendChild(collectionControls);
  right.appendChild(collection);
  right.appendChild(albumsSection);

  layout.appendChild(left);
  layout.appendChild(center);
  layout.appendChild(right);
  app.appendChild(layout);

  initPlaySection(center);
  setCollectionTab('cards');

  // Mostrar solo la sección de abrir sobres al iniciar
  showSection('left');

  // Habilitar botón cuando la carga de cartas finalice
  if (window.cards && window.cards.ready && typeof window.cards.ready.then === 'function') {
    window.cards.ready.then(() => {
      openBtn.disabled = false;
    }).catch(() => {
      // Si falla la carga, dejarlo deshabilitado y mostrar aviso en consola
      console.error('No se pudieron cargar las cartas desde JSON.');
    });
  } else {
    // Si no existe la promesa, habilitar por seguridad
    openBtn.disabled = false;
  }
}

function showSection(which) {
  const layout = document.querySelector('.layout');
  if (!layout) return;
  layout.classList.remove('show-left', 'show-right', 'show-both', 'show-play');
  if (which === 'left') layout.classList.add('show-left');
  else if (which === 'right') layout.classList.add('show-right');
  else if (which === 'play') layout.classList.add('show-play');
  else layout.classList.add('show-both');

  if (which === 'right') {
    updateCollectionDisplay();
    renderAlbumsSection();
  }
  if (which === 'play') updatePlaySelectionUI();

  // Marcar botón activo
  const btnOpen = document.getElementById('nav-open');
  const btnCollection = document.getElementById('nav-collection');
  const btnPlay = document.getElementById('nav-play');
  if (btnOpen) btnOpen.classList.toggle('active', which === 'left');
  if (btnCollection) btnCollection.classList.toggle('active', which === 'right');
  if (btnPlay) btnPlay.classList.toggle('active', which === 'play');
}

function onOpenPack() {
  const board = document.getElementById('board');
  const n = parseInt(document.getElementById('packSize').value, 10) || 5;

  if (!window.cards || typeof window.cards.openPack !== 'function') {
    const err = document.createElement('p');
    err.textContent = 'La lógica de cartas no está disponible.';
    board.innerHTML = '';
    board.appendChild(err);
    return;
  }

  const opened = window.cards.openPack(n);
  
  // Usar cardsViews para renderizar las cartas
  if (window.cardsView && window.cardsView.renderCardSet) {
    window.cardsView.renderCardSet(opened, board);
  } else {
    // Fallback si cardsViews no está disponible
    board.innerHTML = '';
    opened.forEach(c => {
      const el = document.createElement('div');
      el.className = 'card ' + c.rarity;
      
      if (c.image) {
        const img = document.createElement('img');
        img.src = c.image;
        img.alt = c.name;
        img.className = 'card-image';
        el.appendChild(img);
      }
      
      const textContainer = document.createElement('div');
      textContainer.className = 'card-text';
      
      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = c.name;
      
      const sub = document.createElement('div');
      sub.className = 'card-sub';
      sub.textContent = c.rarity;
      
      const desc = document.createElement('div');
      desc.className = 'card-description';
      desc.textContent = c.description || '';
      
      textContainer.appendChild(title);
      textContainer.appendChild(sub);
      textContainer.appendChild(desc);
      el.appendChild(textContainer);
      board.appendChild(el);
    });
  }

  updateCollectionDisplay();
}

function setCollectionTab(tab) {
  const tabBtns = document.querySelectorAll('.collection-tabs .tab-btn');
  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));

  const cardsSection = document.getElementById('collection');
  const albumsSection = document.getElementById('albums');
  if (cardsSection) cardsSection.style.display = tab === 'cards' ? 'block' : 'none';
  if (albumsSection) albumsSection.style.display = tab === 'albums' ? 'block' : 'none';

  if (tab === 'cards') updateCollectionDisplay();
  if (tab === 'albums') renderAlbumsSection();
}

function renderAlbumsSection() {
  const container = document.getElementById('albums');
  if (!container) return;

  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'albums-header';

  const title = document.createElement('h2');
  title.textContent = 'Álbumes';
  header.appendChild(title);

  const createBtn = document.createElement('button');
  createBtn.className = 'btn';
  createBtn.textContent = 'Crear álbum';
  createBtn.addEventListener('click', () => openAlbumEditor());
  header.appendChild(createBtn);

  container.appendChild(header);

  const list = document.createElement('div');
  list.className = 'album-list';

  const albums = gameState.albums || [];
  if (albums.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-message';
    empty.textContent = 'No tienes álbumes aún. Crea uno para organizar tus cartas.';
    container.appendChild(empty);
    return;
  }

  albums.forEach(album => {
    const card = document.createElement('div');
    card.className = 'album-card';
    card.style.background = album.background || '#fafafa';

    const info = document.createElement('div');
    info.className = 'album-info';

    const name = document.createElement('h3');
    name.textContent = album.name || 'Álbum sin nombre';
    info.appendChild(name);

    const albumIds = Array.isArray(album.cardIds) ? album.cardIds : [];
    const count = document.createElement('div');
    count.className = 'album-meta';
    count.textContent = `${albumIds.length} / 20 cartas`;
    info.appendChild(count);

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn view-album-btn';
    viewBtn.textContent = 'Ver álbum';
    viewBtn.style.marginTop = '0.5rem';
    viewBtn.addEventListener('click', () => openAlbumView(album.id));
    info.appendChild(viewBtn);

    card.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'album-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-small';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => openAlbumEditor(album.id));
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-small delete';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', () => {
      if (confirm('¿Eliminar este álbum?')) deleteAlbum(album.id);
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    list.appendChild(card);
  });

  container.appendChild(list);
}

function openAlbumView(albumId) {
  const album = getAlbumById(albumId);
  if (!album) return;

  const container = document.getElementById('albums');
  if (!container) return;

  // Convert the albums panel into a full-size overlay view for this album
  container.classList.add('album-view');

  container.innerHTML = '';
  container.style.background = album.background || 'transparent';

  let cleanBtn = null;
  const cleanExit = document.createElement('button');
  cleanExit.className = 'clean-exit';
  cleanExit.textContent = 'Cerrar';
  cleanExit.style.display = 'none';
  cleanExit.addEventListener('click', () => {
    container.classList.remove('album-view-clean');
    if (cleanBtn) cleanBtn.textContent = 'Ver solo';
    cleanExit.style.display = 'none';
  });
  container.appendChild(cleanExit);

  const header = document.createElement('div');
  header.className = 'albums-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn';
  backBtn.textContent = '← Volver';
  backBtn.addEventListener('click', () => {
    container.style.background = '';
    container.classList.remove('album-view', 'album-view-clean');
    renderAlbumsSection();
  });
  header.appendChild(backBtn);

  const title = document.createElement('h2');
  title.textContent = album.name || 'Álbum sin nombre';
  header.appendChild(title);

  const editBtn = document.createElement('button');
  editBtn.className = 'btn';
  editBtn.textContent = 'Editar álbum';
  editBtn.addEventListener('click', () => openAlbumEditor(albumId));
  header.appendChild(editBtn);

  cleanBtn = document.createElement('button');
  cleanBtn.className = 'btn';
  cleanBtn.textContent = 'Ver solo';
  let cleanMode = false;
  cleanBtn.addEventListener('click', () => {
    cleanMode = !cleanMode;
    container.classList.toggle('album-view-clean', cleanMode);
    cleanBtn.textContent = cleanMode ? 'Salir ver solo' : 'Ver solo';
    const cleanExit = container.querySelector('.clean-exit');
    if (cleanExit) cleanExit.style.display = cleanMode ? 'block' : 'none';
  });
  header.appendChild(cleanBtn);

  container.appendChild(header);

  const tabBar = document.createElement('div');
  tabBar.className = 'collection-tabs';

  const tabCards = document.createElement('button');
  tabCards.className = 'tab-btn active';
  tabCards.textContent = 'Cartas';
  tabCards.addEventListener('click', () => setAlbumViewTab('cards', album));

  const tabBackground = document.createElement('button');
  tabBackground.className = 'tab-btn';
  tabBackground.textContent = 'Fondo';
  tabBackground.addEventListener('click', () => setAlbumViewTab('background', album));

  tabBar.appendChild(tabCards);
  tabBar.appendChild(tabBackground);
  container.appendChild(tabBar);

  const content = document.createElement('div');
  content.id = 'albumViewContent';
  container.appendChild(content);

  setAlbumViewTab('cards', album);
}

function setAlbumViewTab(tab, album) {
  const container = document.getElementById('albums');
  if (!container) return;

  const content = document.getElementById('albumViewContent');
  if (!content) return;

  const tabBtns = container.querySelectorAll('.collection-tabs .tab-btn');
  tabBtns.forEach(btn => btn.classList.toggle('active', btn.textContent.toLowerCase() === tab));

  content.innerHTML = '';

  if (tab === 'cards') {
    const meta = document.createElement('div');
    meta.className = 'album-meta-row';
    meta.textContent = `Fondo: ${album.background || 'ninguno'} • ${album.cardIds.length} / 20 cartas`;
    content.appendChild(meta);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.textContent = 'Añadir cartas';
    addBtn.disabled = (album.cardIds || []).length >= 20;
    addBtn.addEventListener('click', () => openAddCardsModal(album.id));
    content.appendChild(addBtn);

    const list = document.createElement('div');
    list.className = 'album-cards';

    (album.cardIds || []).forEach((cardId, index) => {
      const card = getCardById(cardId);
      const item = document.createElement('div');
      item.className = 'album-card-item';

      const info = document.createElement('div');
      info.className = 'album-card-info';

      if (card && card.image) {
        const img = document.createElement('img');
        img.src = card.image;
        img.alt = card.name;
        img.className = 'album-card-thumb';
        info.appendChild(img);
      }

      const text = document.createElement('div');
      text.className = 'album-card-text';
      text.textContent = (card && card.name) ? card.name : 'Carta desconocida';
      info.appendChild(text);

      item.appendChild(info);

      const controls = document.createElement('div');
      controls.className = 'album-card-controls';

      const up = document.createElement('button');
      up.className = 'btn btn-small';
      up.textContent = '↑';
      up.disabled = index === 0;
      up.addEventListener('click', () => {
        const ids = album.cardIds;
        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
        updateAlbum(album);
        setAlbumViewTab('cards', album);
      });
      controls.appendChild(up);

      const down = document.createElement('button');
      down.className = 'btn btn-small';
      down.textContent = '↓';
      down.disabled = index === (album.cardIds.length - 1);
      down.addEventListener('click', () => {
        const ids = album.cardIds;
        [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
        updateAlbum(album);
        setAlbumViewTab('cards', album);
      });
      controls.appendChild(down);

      const remove = document.createElement('button');
      remove.className = 'btn btn-small delete';
      remove.textContent = 'Eliminar';
      remove.addEventListener('click', () => {
        album.cardIds = album.cardIds.filter(id => id !== cardId);
        updateAlbum(album);
        setAlbumViewTab('cards', album);
      });
      controls.appendChild(remove);

      item.appendChild(controls);
      list.appendChild(item);
    });

    content.appendChild(list);
  }

  if (tab === 'background') {
    const info = document.createElement('p');
    info.textContent = 'Configura el fondo y el nombre del álbum.';
    content.appendChild(info);

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Nombre del álbum:';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = album.name || '';
    nameLabel.appendChild(nameInput);
    content.appendChild(nameLabel);

    const bgLabel = document.createElement('label');
    bgLabel.textContent = 'Color de fondo:';
    const bgInput = document.createElement('input');
    bgInput.type = 'color';
    bgInput.value = album.background || '#ffffff';
    bgLabel.appendChild(bgInput);
    content.appendChild(bgLabel);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn';
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', () => {
      album.name = nameInput.value.trim() || album.name;
      album.background = bgInput.value;
      updateAlbum(album);
      setAlbumViewTab('background', album);
    });
    content.appendChild(saveBtn);
  }
}

function openAlbumEditor(albumId) {
  const album = albumId ? getAlbumById(albumId) : null;
  const isNew = !album;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';

  const title = document.createElement('h2');
  title.textContent = isNew ? 'Crear álbum' : 'Editar álbum';
  dialog.appendChild(title);

  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Nombre:';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = album ? album.name : '';
  nameLabel.appendChild(nameInput);
  dialog.appendChild(nameLabel);

  const bgLabel = document.createElement('label');
  bgLabel.textContent = 'Color de fondo:';
  const bgInput = document.createElement('input');
  bgInput.type = 'color';
  bgInput.value = album ? (album.background || '#ffffff') : '#ffffff';
  bgLabel.appendChild(bgInput);
  dialog.appendChild(bgLabel);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.textContent = isNew ? 'Crear' : 'Guardar';
  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const bg = bgInput.value;
    if (!name) {
      alert('Elige un nombre para el álbum.');
      return;
    }

    if (isNew) {
      const created = createAlbum(name, bg);
      openAlbumView(created.id);
    } else {
      album.name = name;
      album.background = bg;
      updateAlbum(album);
      openAlbumView(album.id);
    }

    closeModal(modal);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', () => closeModal(modal));

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  dialog.appendChild(actions);

  modal.appendChild(dialog);
  document.body.appendChild(modal);
}

function openAddCardsModal(albumId) {
  const album = getAlbumById(albumId);
  if (!album) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';

  const title = document.createElement('h2');
  title.textContent = 'Agregar cartas al álbum';
  dialog.appendChild(title);

  const maxAdd = 20 - (album.cardIds || []).length;
  const info = document.createElement('p');
  info.textContent = `Puedes agregar hasta ${maxAdd} carta(s).`;
  dialog.appendChild(info);

  const list = document.createElement('div');
  list.className = 'modal-card-list';

  const coll = window.cards ? window.cards.getCollection() : {};
  const available = Object.values(coll).filter(e => !album.cardIds.includes(e.card.id));
  if (available.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No hay cartas disponibles en tu colección.';
    dialog.appendChild(empty);
  } else {
    available.forEach(e => {
      const row = document.createElement('label');
      row.className = 'modal-card-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = e.card.id;
      row.appendChild(cb);

      const name = document.createElement('span');
      name.textContent = `${e.card.name} (${e.card.rarity})`;
      row.appendChild(name);

      list.appendChild(row);
    });
    dialog.appendChild(list);
  }

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.textContent = 'Agregar';
  addBtn.addEventListener('click', () => {
    const checked = Array.from(dialog.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
    if (!checked.length) return;
    const remaining = 20 - (album.cardIds || []).length;
    const toAdd = checked.slice(0, remaining);
    album.cardIds = (album.cardIds || []).concat(toAdd);
    updateAlbum(album);
    openAlbumView(album.id);
    closeModal(modal);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', () => closeModal(modal));

  actions.appendChild(addBtn);
  actions.appendChild(cancelBtn);
  dialog.appendChild(actions);

  modal.appendChild(dialog);
  document.body.appendChild(modal);
}

function closeModal(modal) {
  if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
}

function updateCollectionDisplay() {
  const container = document.getElementById('collection');
  if (!container) return;

  if (!window.cards) {
    container.textContent = 'No hay datos de colección.';
    return;
  }

  const coll = window.cards.getCollection();
  const filterEl = document.getElementById('collectionFilter');
  const filter = filterEl ? filterEl.value : 'all';

  // Usar cardsViews para renderizar la colección
  if (window.cardsView && window.cardsView.renderCollection) {
    window.cardsView.renderCollection(coll, container, filter);

    // Resaltar la carta seleccionada en la colección
    if (gameState.selectedCardId) {
      const selectedEl = container.querySelector(`[data-card-id="${gameState.selectedCardId}"]`);
      if (selectedEl) selectedEl.classList.add('selected-in-collection');
    }

    // Hacer que la lista sea interactiva para seleccionar la nave
    container.querySelectorAll('[data-card-id]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const cardId = el.getAttribute('data-card-id');
        if (cardId) selectPlayerCard(cardId);
      });
    });
    return;
  }

  // Fallback si cardsViews no está disponible
  container.innerHTML = '';
  
  let entries = Object.values(coll);
  if (entries.length === 0) {
    container.textContent = 'Colección vacía. Abre sobres para obtener cartas.';
    return;
  }

  // Aplicar filtro si hay select
  if (filter && filter !== 'all') {
    entries = entries.filter(e => e.card.rarity === filter);
  }

  if (entries.length === 0) {
    container.textContent = 'No hay cartas que coincidan con el filtro.';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'collection-list';
  entries.forEach(e => {
    const li = document.createElement('li');
    li.className = 'collection-item ' + e.card.rarity;
    li.title = e.card.description || '';
    li.tabIndex = 0;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'col-name';
    nameSpan.textContent = e.card.name;

    const badge = document.createElement('span');
    badge.className = 'rarity-badge ' + e.card.rarity;
    badge.textContent = e.card.rarity;

    const countSpan = document.createElement('span');
    countSpan.className = 'col-count';
    countSpan.textContent = '× ' + e.count;

    li.appendChild(nameSpan);
    li.appendChild(badge);
    li.appendChild(countSpan);

    li.addEventListener('click', () => selectPlayerCard(e.card.id));
    li.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') selectPlayerCard(e.card.id);
    });

    if (gameState.selectedCardId === e.card.id) {
      li.classList.add('selected-in-collection');
    }

    list.appendChild(li);
  });
  container.appendChild(list);
}

function getCardFromCollection(cardId) {
  if (!window.cards) return null;
  const coll = window.cards.getCollection();
  return coll && coll[cardId] ? coll[cardId].card : null;
}

function initPlaySection(container) {
  if (!container) return;
  container.innerHTML = '';

  const header = document.createElement('h2');
  header.textContent = 'Jugar';
  container.appendChild(header);

  const notice = document.createElement('p');
  notice.id = 'playNotice';
  notice.textContent = 'Selecciona una carta en la colección para usarla como nave.';
  container.appendChild(notice);

  const selectedCardArea = document.createElement('div');
  selectedCardArea.id = 'selectedCard';
  selectedCardArea.className = 'selected-card';
  container.appendChild(selectedCardArea);

  const controls = document.createElement('div');
  controls.className = 'play-controls';

  const startBtn = document.createElement('button');
  startBtn.id = 'playStart';
  startBtn.className = 'btn';
  startBtn.textContent = 'Iniciar partida';
  startBtn.disabled = true;
  startBtn.addEventListener('click', () => startGame());
  controls.appendChild(startBtn);

  const stopBtn = document.createElement('button');
  stopBtn.id = 'playStop';
  stopBtn.className = 'btn';
  stopBtn.textContent = 'Detener';
  stopBtn.disabled = true;
  stopBtn.addEventListener('click', () => stopGame());
  controls.appendChild(stopBtn);

  container.appendChild(controls);

  const score = document.createElement('div');
  score.id = 'playScore';
  score.className = 'play-score';
  score.textContent = 'Puntaje: 0';
  container.appendChild(score);

  const canvas = document.createElement('canvas');
  canvas.id = 'playCanvas';
  canvas.width = 720;
  canvas.height = 420;
  canvas.className = 'play-canvas';
  container.appendChild(canvas);

  gameState.canvas = canvas;
  gameState.ctx = canvas.getContext('2d');
  gameState.onScoreUpdate = (s) => {
    const scoreEl = document.getElementById('playScore');
    if (scoreEl) scoreEl.textContent = 'Puntaje: ' + s;
  };

  window.addEventListener('keydown', onPlayKeyDown);
  window.addEventListener('keyup', onPlayKeyUp);

  updatePlaySelectionUI();
}

function updatePlaySelectionUI() {
  const selectedCard = getSelectedCard();
  const selectedCardArea = document.getElementById('selectedCard');
  const startBtn = document.getElementById('playStart');
  const stopBtn = document.getElementById('playStop');
  const notice = document.getElementById('playNotice');

  if (!selectedCardArea || !startBtn || !stopBtn || !notice) return;

  selectedCardArea.innerHTML = '';
  if (!selectedCard) {
    notice.textContent = 'Selecciona una carta en la colección para usarla como nave.';
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }

  notice.textContent = 'Usa las flechas ←/→ para moverte y espacio para disparar.';
  startBtn.disabled = false;
  stopBtn.disabled = !gameState.running;

  const cardEl = document.createElement('div');
  cardEl.className = 'card selected-card-preview ' + (selectedCard.rarity || '');

  if (selectedCard.image) {
    const img = document.createElement('img');
    img.src = selectedCard.image;
    img.alt = selectedCard.name;
    img.className = 'card-image';
    cardEl.appendChild(img);
  }

  const info = document.createElement('div');
  info.className = 'card-text';
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = selectedCard.name;
  info.appendChild(title);
  const rarity = document.createElement('div');
  rarity.className = 'card-sub';
  rarity.textContent = selectedCard.rarity;
  info.appendChild(rarity);
  cardEl.appendChild(info);

  selectedCardArea.appendChild(cardEl);
}

function onPlayKeyDown(event) {
  if (!gameState.running) return;
  if (event.key === 'ArrowLeft') gameState.keys.left = true;
  if (event.key === 'ArrowRight') gameState.keys.right = true;
  if (event.key === ' ' || event.key === 'Spacebar') gameState.keys.fire = true;
}

function onPlayKeyUp(event) {
  if (event.key === 'ArrowLeft') gameState.keys.left = false;
  if (event.key === 'ArrowRight') gameState.keys.right = false;
  if (event.key === ' ' || event.key === 'Spacebar') gameState.keys.fire = false;
}

function startGame() {
  if (gameState.running) return;
  const selected = getSelectedCard();
  if (!selected) return;

  gameState.running = true;
  gameState.score = 0;
  gameState.coinsMilestone = 0;
  gameState.enemies = [];
  gameState.bullets = [];
  gameState.lastFrame = performance.now();
  gameState.spawnTimer = 0;

  if (typeof gameState.onScoreUpdate === 'function') gameState.onScoreUpdate(gameState.score);
  updateCoinsFromScore();

  selectPlayerCard(gameState.selectedCardId);
  updatePlaySelectionUI();

  gameState.rafId = requestAnimationFrame(gameLoop);
}

function stopGame() {
  gameState.running = false;
  if (gameState.rafId) cancelAnimationFrame(gameState.rafId);
  gameState.rafId = null;
  updatePlaySelectionUI();
}

function gameLoop(timestamp) {
  if (!gameState.running) return;
  const delta = Math.min(0.05, (timestamp - gameState.lastFrame) / 1000);
  gameState.lastFrame = timestamp;

  updateGame(delta);
  renderGame();

  gameState.rafId = requestAnimationFrame(gameLoop);
}

function updateGame(delta) {
  const canvas = gameState.canvas;
  if (!canvas) return;

  const speed = 280;
  if (gameState.keys.left) gameState.playerX = Math.max(0, gameState.playerX - speed * delta);
  if (gameState.keys.right) gameState.playerX = Math.min(canvas.width - 40, (gameState.playerX || 0) + speed * delta);

  if (gameState.keys.fire) {
    if (!gameState.lastShot || performance.now() - gameState.lastShot > 250) {
      gameState.bullets.push({ x: (gameState.playerX || 0) + 18, y: canvas.height - 60, speed: 420 });
      gameState.lastShot = performance.now();
    }
  }

  // Mover balas
  gameState.bullets = gameState.bullets.filter(b => b.y > -10);
  gameState.bullets.forEach(b => { b.y -= b.speed * delta; });

  // Enemigos
  gameState.spawnTimer += delta;
  if (gameState.spawnTimer > 1) {
    gameState.spawnTimer = 0;
    const enemy = createEnemy();
    if (enemy) gameState.enemies.push(enemy);
  }

  gameState.enemies.forEach(e => {
    e.y += e.speed * delta;
  });

  // Colisiones
  gameState.enemies = gameState.enemies.filter(enemy => {
    // Off-screen
    if (enemy.y > canvas.height + 40) return false;

    let alive = true;
    gameState.bullets = gameState.bullets.filter(bullet => {
      const hit = bullet.x > enemy.x && bullet.x < enemy.x + enemy.w && bullet.y > enemy.y && bullet.y < enemy.y + enemy.h;
      if (hit) {
        alive = false;
        const pts = pointsForRarity(enemy.card && enemy.card.rarity);
        addScore(pts);
      }
      return !hit;
    });

    return alive;
  });
}

function renderGame() {
  const ctx = gameState.ctx;
  const canvas = gameState.canvas;
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fondo simple
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0b1223');
  gradient.addColorStop(1, '#07111e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar jugador
  if (typeof gameState.playerX !== 'number') {
    gameState.playerX = (canvas.width - 40) / 2;
  }
  const px = gameState.playerX;
  const py = canvas.height - 60;
  if (gameState.playerImg) {
    ctx.drawImage(gameState.playerImg, px, py, 44, 44);
  } else {
    ctx.fillStyle = '#10b981';
    ctx.fillRect(px, py, 44, 44);
  }

  // Balas
  ctx.fillStyle = '#facc15';
  gameState.bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));

  // Enemigos
  gameState.enemies.forEach(e => {
    if (e.img && e.img.complete) {
      ctx.drawImage(e.img, e.x, e.y, e.w, e.h);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
  });
}

function createEnemy() {
  if (!window.cards) return null;
  const coll = window.cards.getCollection();
  const entries = Object.values(coll);
  if (entries.length === 0) return null;

  const pick = entries[Math.floor(Math.random() * entries.length)];
  const card = pick.card;
  const size = 38 + Math.random() * 24;
  const x = Math.random() * (gameState.canvas.width - size);
  const y = -size - 10;
  const speed = 80 + Math.random() * 60;

  const enemy = { x, y, w: size, h: size, speed, card };
  if (card && card.image) {
    const img = new Image();
    img.src = card.image;
    enemy.img = img;
  }
  return enemy;
}

// Exportar funciones para pruebas o para que `cards.js` las llame
window.game = {
  init,
  onOpenPack,
  selectPlayerCard,
  getSelectedCard,
  startGame,
  stopGame,
};
