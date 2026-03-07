// main.js - esqueleto inicial para el juego de cartas

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

  // Cabecera y botón para barajar/repartir
  const header = document.createElement('h1');
  header.textContent = 'Juego de Cartas';
  app.appendChild(header);

  // Navegación: botones para ir a "Abrir sobres" o a "Colección"
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
  nav.appendChild(btnOpen);
  nav.appendChild(btnCollection);
  app.appendChild(nav);
  // Layout: izquierda abrir sobres, derecha colección
  const layout = document.createElement('div');
  layout.className = 'layout';

  const left = document.createElement('div');
  left.className = 'left';

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

  right.appendChild(colHeader);
  right.appendChild(collectionControls);
  right.appendChild(collection);

  layout.appendChild(left);
  layout.appendChild(right);
  app.appendChild(layout);

  updateCollectionDisplay();

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
  layout.classList.remove('show-left', 'show-right', 'show-both');
  if (which === 'left') layout.classList.add('show-left');
  else if (which === 'right') layout.classList.add('show-right');
  else layout.classList.add('show-both');

  if (which === 'right') updateCollectionDisplay();
  // Marcar botón activo
  const btnOpen = document.getElementById('nav-open');
  const btnCollection = document.getElementById('nav-collection');
  if (btnOpen) btnOpen.classList.toggle('active', which === 'left');
  if (btnCollection) btnCollection.classList.toggle('active', which === 'right');
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

function updateCollectionDisplay() {
  const container = document.getElementById('collection');
  if (!container) return;

  if (!window.cards) {
    container.textContent = 'No hay datos de colección.';
    return;
  }

  const coll = window.cards.getCollection();
  
  // Obtener filtro si existe
  const filterEl = document.getElementById('collectionFilter');
  const filter = filterEl ? filterEl.value : 'all';

  // Usar cardsViews para renderizar la colección
  if (window.cardsView && window.cardsView.renderCollection) {
    window.cardsView.renderCollection(coll, container, filter);
  } else {
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
      list.appendChild(li);
    });
    container.appendChild(list);
  }
}

// Exportar funciones para pruebas o para que `cards.js` las llame
window.game = {
  init,
  onOpenPack,
};
