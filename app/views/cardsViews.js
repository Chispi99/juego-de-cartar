// cardsViews.js - Módulo de visualización mejorada de cartas

(function() {
  'use strict';

  // Renderizar una carta individual con estilos mejorados
  function renderCard(card) {
    console.log('renderCard', card.id, 'video?', card.video);
    const cardEl = document.createElement('div');
    cardEl.className = `card card-item ${card.rarity}`;
    cardEl.setAttribute('data-card-id', card.id);

    // Efecto de brillo según rareza
    const glowClass = `glow-${card.rarity}`;
    cardEl.classList.add(glowClass);

    // Contenedor de imagen
    const imageContainer = document.createElement('div');
    imageContainer.className = 'card-image-container';
    
    if (card.image) {
      const img = document.createElement('img');
      img.src = card.image;
      img.alt = card.name;
      img.className = 'card-image';
      img.loading = 'lazy';
  
      img.onerror = () => {
        img.remove();
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder';
        placeholder.textContent = '📷';
        imageContainer.appendChild(placeholder);
      };
      imageContainer.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'card-placeholder';
      placeholder.textContent = '📷';
      imageContainer.appendChild(placeholder);
    }
    
    // Banner de rareza en la esquina
    const rarityBanner = document.createElement('div');
    rarityBanner.className = `rarity-banner ${card.rarity}`;
    rarityBanner.textContent = card.rarity.toUpperCase();
    imageContainer.appendChild(rarityBanner);
    
    cardEl.appendChild(imageContainer);

    // Contenedor de información
    const infoContainer = document.createElement('div');
    infoContainer.className = 'card-info';

    // Nombre de la carta
    const nameEl = document.createElement('h3');
    nameEl.className = 'card-name';
    nameEl.textContent = card.name;
    infoContainer.appendChild(nameEl);

    // Descripción
    const descEl = document.createElement('p');
    descEl.className = 'card-desc';
    descEl.textContent = card.description || 'Sin descripción';
    infoContainer.appendChild(descEl);

    // Video botón si hay vídeo asociado (o si es la carta D2, garantizamos un botón)
    const hasVideo = card.video || card.id === 'D2';
    if (hasVideo) {
      const vidBtn = document.createElement('button');
      vidBtn.className = 'video-btn';
      vidBtn.type = 'button';
      vidBtn.textContent = '▶ Ver vídeo';

      vidBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // prefer la ruta que venga en el objeto, pero si no existe usar la conocida
        if (!card.video && card.id === 'D2') {
          card.video = './Video/Epstein -.- 1.mp4';
        }
        const videoModal = renderVideoModal(card);
        document.body.appendChild(videoModal);

        // same close handlers as card modal
        videoModal.addEventListener('click', function onBackdrop(ev) {
          if (ev.target === videoModal) {
            document.body.removeChild(videoModal);
            document.removeEventListener('keydown', onKey);
          }
        });
        function onKey(ev) {
          if (ev.key === 'Escape') {
            if (document.body.contains(videoModal)) document.body.removeChild(videoModal);
            document.removeEventListener('keydown', onKey);
          }
        }
        document.addEventListener('keydown', onKey);

        const closeV = videoModal.querySelector('.modal-close');
        if (closeV) {
          closeV.addEventListener('click', () => {
            if (document.body.contains(videoModal)) document.body.removeChild(videoModal);
            document.removeEventListener('keydown', onKey);
          });
        }
      });
      infoContainer.appendChild(vidBtn);
    }

    // Footer con ID
    const footerEl = document.createElement('div');
    footerEl.className = 'card-footer';
    footerEl.textContent = `#${card.id}`;
    infoContainer.appendChild(footerEl);

    cardEl.appendChild(infoContainer);

    return cardEl;
  }

  // Renderizar conjunto de cartas
  function renderCardSet(cards, container) {
    if (!container) return;
    container.innerHTML = '';

    if (!cards || cards.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = 'No hay cartas para mostrar';
      container.appendChild(emptyMsg);
      return;
    }

    // Crear grid de cartas
    const grid = document.createElement('div');
    grid.className = 'cards-grid';

    cards.forEach(card => {
      const cardEl = renderCard(card);
      grid.appendChild(cardEl);
    });

    container.appendChild(grid);
  }

  // Renderizar colección mejorada (grid visual, clicable -> modal)
  function renderCollection(collectionData, container, filterRarity = 'all') {
    if (!container) return;
    container.innerHTML = '';

    if (!collectionData || Object.keys(collectionData).length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = 'Colección vacía. ¡Abre sobres para obtener cartas!';
      container.appendChild(emptyMsg);
      return;
    }

    // Convertir a array y aplicar filtro
    let entries = Object.values(collectionData);
    if (filterRarity && filterRarity !== 'all') {
      entries = entries.filter(e => e.card.rarity === filterRarity);
    }

    if (entries.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = 'No hay cartas con esa rareza';
      container.appendChild(emptyMsg);
      return;
    }

    // Agrupar por rareza
    const grouped = {
      diamond: [],
      legendary: [],
      epic: [],
      rare: [],
      common: []
    };

    entries.forEach(e => {
      if (grouped[e.card.rarity]) grouped[e.card.rarity].push(e);
    });

    const collectionWrapper = document.createElement('div');
    collectionWrapper.className = 'collection-wrapper';

    const raritySectionOrder = ['diamond','legendary', 'epic', 'rare', 'common'];
    raritySectionOrder.forEach(rarity => {
      const items = grouped[rarity];
      if (!items || items.length === 0) return;

      const section = document.createElement('div');
      section.className = `collection-section ${rarity}`;

      const header = document.createElement('h4');
      header.className = 'section-header';
      header.textContent = `${rarity.toUpperCase()} (${items.length})`;
      section.appendChild(header);

      // Grid para mostrar mini-cards
      const grid = document.createElement('div');
      grid.className = 'cards-grid collection-grid';

      items.forEach(entry => {
        const card = entry.card;
        // Reusar renderCard para crear una vista (pequeña)
        const preview = renderCard(card);
        preview.classList.add('collection-preview');
        preview.setAttribute('data-count', entry.count || 1);
        preview.style.cursor = 'pointer';
        preview.tabIndex = 0;

        // Badge de cantidad
        const badge = document.createElement('div');
        badge.className = 'count-badge';
        badge.textContent = `×${entry.count}`;
        preview.appendChild(badge);

        // Click para abrir modal con imagen y descripción
        preview.addEventListener('click', () => {
          const modal = renderCardModal(card);
          document.body.appendChild(modal);

          // Cierre por click en backdrop
          modal.addEventListener('click', function onBackdrop(e) {
            if (e.target === modal) {
              document.body.removeChild(modal);
              document.removeEventListener('keydown', onKey);
            }
          });

          // Cierre por ESC
          function onKey(ev) {
            if (ev.key === 'Escape') {
              if (document.body.contains(modal)) document.body.removeChild(modal);
              document.removeEventListener('keydown', onKey);
            }
          }
          document.addEventListener('keydown', onKey);

          // Handler del botón cerrar (usar onKey del scope)
          const closeBtn = modal.querySelector('.modal-close');
          if (closeBtn) {
            closeBtn.addEventListener('click', () => {
              if (document.body.contains(modal)) document.body.removeChild(modal);
              document.removeEventListener('keydown', onKey);
            });
          }
        });

        // Enter key opens modal too
        preview.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') preview.click();
        });

        grid.appendChild(preview);
      });

      section.appendChild(grid);
      collectionWrapper.appendChild(section);
    });

    container.appendChild(collectionWrapper);
  }

  // Renderizar una carta en modo vista expandida/modal
  function renderCardModal(card) {
    const modal = document.createElement('div');
    modal.className = 'card-modal';

    const content = document.createElement('div');
    content.className = `card-modal-content ${card.rarity}`;

    // Imagen grande
    const imgContainer = document.createElement('div');
    imgContainer.className = 'modal-image-container';
    
    if (card.image) {
      const img = document.createElement('img');
      img.src = card.image;
      img.alt = card.name;
      img.className = 'modal-image';
      imgContainer.appendChild(img);
    }
    
    content.appendChild(imgContainer);
    
      // Botón de cierre
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.type = 'button';
      closeBtn.innerHTML = '×';
      content.appendChild(closeBtn);

    // Información
    const infoEl = document.createElement('div');
    infoEl.className = 'modal-info';

    const titleEl = document.createElement('h2');
    titleEl.className = 'modal-title';
    titleEl.textContent = card.name;

    const rarityEl = document.createElement('div');
    rarityEl.className = `modal-rarity ${card.rarity}`;
    rarityEl.textContent = card.rarity.toUpperCase();

    const descEl = document.createElement('p');
    descEl.className = 'modal-description';
    descEl.textContent = card.description || 'Sin descripción';

    infoEl.appendChild(titleEl);
    infoEl.appendChild(rarityEl);
    infoEl.appendChild(descEl);

    // Botón para seleccionar esta carta como nave en el minijuego
    if (window.game && typeof window.game.selectPlayerCard === 'function') {
      const selectBtn = document.createElement('button');
      selectBtn.className = 'btn select-ship-btn';
      selectBtn.type = 'button';
      selectBtn.textContent = 'Usar como nave';
      selectBtn.addEventListener('click', () => {
        window.game.selectPlayerCard(card.id);
        if (document.body.contains(modal)) document.body.removeChild(modal);
      });
      infoEl.appendChild(selectBtn);
    }

    // añadir botón de vídeo dentro del modal si existe
    if (card.video) {
      const vidBtn = document.createElement('button');
      vidBtn.className = 'video-btn';
      vidBtn.type = 'button';
      vidBtn.textContent = '▶ Reproducir vídeo';
      vidBtn.addEventListener('click', () => {
        // sustituir el contenido por el vídeo
        const videoEl = document.createElement('video');
        videoEl.controls = true;
        videoEl.src = resolveMediaPath(card.video);
        videoEl.className = 'modal-video';
        videoEl.autoplay = true;

        videoEl.addEventListener('error', () => {
          console.error('Error cargando vídeo en modal:', videoEl.src);
          const errMsg = document.createElement('div');
          errMsg.className = 'video-error';
          errMsg.textContent = 'No se pudo cargar el vídeo. Revisa la ruta o el archivo.';
          if (!content.querySelector('.video-error')) {
            content.appendChild(errMsg);
          }
        });

        content.innerHTML = '';
        content.appendChild(videoEl);

        const closeBtn2 = document.createElement('button');
        closeBtn2.className = 'modal-close';
        closeBtn2.type = 'button';
        closeBtn2.innerHTML = '×';
        content.appendChild(closeBtn2);
      });
      infoEl.appendChild(vidBtn);
    }
    
    content.appendChild(infoEl);
    modal.appendChild(content);
    return modal;
  }

  // Normalize and resolve a media path relative to the current page
  function resolveMediaPath(src) {
    if (!src) return src;
    // strip accidental "./app/" prefixes that users sometimes include
    if (src.startsWith('./app/')) {
      src = src.slice(6);
    }
    try {
      // let the URL constructor handle relative paths correctly
      return new URL(src, window.location.href).href;
    } catch (e) {
      console.warn('resolveMediaPath failed for', src, e);
      return src; // fall back to raw string
    }
  }

  // Renderizar modal de vídeo
  function renderVideoModal(card) {
    const modal = document.createElement('div');
    modal.className = 'card-modal';

    const content = document.createElement('div');
    content.className = 'card-modal-content video-modal';

    // video elemento
    const videoEl = document.createElement('video');
    videoEl.controls = true;
    videoEl.src = resolveMediaPath(card.video);
    videoEl.className = 'modal-video';
    videoEl.autoplay = true;

    // log if loading fails, and show a message inside the modal
    videoEl.addEventListener('error', () => {
      console.error('Error cargando vídeo:', videoEl.src);
      const errMsg = document.createElement('div');
      errMsg.className = 'video-error';
      errMsg.textContent = 'No se pudo cargar el vídeo. Revisa la ruta o el archivo.';
      // avoid duplicating message
      if (!content.querySelector('.video-error')) {
        content.appendChild(errMsg);
      }
    });

    content.appendChild(videoEl);

    // cerrar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '×';
    content.appendChild(closeBtn);

    modal.appendChild(content);
    return modal;
  }

  // Exportar funciones
  window.cardsView = {
    renderCard,
    renderCardSet,
    renderCollection,
    renderCardModal,
    renderVideoModal
  };

  console.log('cardsViews.js cargado ✓');
})();
