(function () {
  let POOL = {
    common: [],
    rare: [],
    epic: [],
    legendary: [],
    diamond: []
  };

  let allCardsMap = {};

  async function loadCardsData() {
    try {
      const response = await fetch('./classes/cardsData.json');
      if (!response.ok) throw new Error('No se pudo cargar cardsData.json');
      const data = await response.json();
      

      data.cards.forEach(card => {
        allCardsMap[card.id] = card;
        if (!POOL[card.rarity]) POOL[card.rarity] = [];
        POOL[card.rarity].push(card);
      });
      
      console.log('Cartas cargadas:', Object.keys(allCardsMap).length);
    } catch (error) {
      console.error('Error cargando cardsData.json:', error);
      // No usar pool por defecto: dejaremos POOL vacío y confiaremos en allCardsMap cuando esté disponible
    }
  }


  function pickRarity() {
    const r = Math.random();
    // diamond is the rarest<br>    if (r < 0.005) return 'diamond';
    if (r < 0.005) return 'diamond';  // ~0.5% chance
    if (r < 0.025) return 'legendary';  // ~2% chance
    if (r < 0.10) return 'epic';
    if (r < 0.30) return 'rare';
    return 'common';
  }

  function randomFrom(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  }

  const collection = {}; 

  function addToCollection(card) {
    if (!collection[card.id]) collection[card.id] = { card: card, count: 0 };
    collection[card.id].count += 1;
  }

  function getCollection() {
    return collection;
  }

  function openPack(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const rarity = pickRarity();
      // Si las cartas del JSON están cargadas, selecciona directamente de ellas
      let pool = [];
      const allCards = Object.values(allCardsMap || {});
      if (allCards.length) {
        pool = allCards.filter(c => c.rarity === rarity);
      }

      // Si no hay resultado para la rareza en el JSON, intentar POOL (fallback)
      if (!pool || pool.length === 0) {
        pool = (POOL[rarity] && POOL[rarity].length) ? POOL[rarity] : [];
      }

      // Último recurso: usar todas las cartas disponibles
      if (!pool || pool.length === 0) {
        pool = allCards.length ? allCards : (POOL.common && POOL.common.length ? POOL.common : []);
      }

      const picked = randomFrom(pool);
      const fullCard = picked && picked.id ? (allCardsMap[picked.id] || picked) : picked;
      out.push(fullCard);
      addToCollection(fullCard);
    }
    return out;
  }

  function resetCollection() {
    Object.keys(collection).forEach(k => delete collection[k]);
  }

  window.cards = {
    openPack,
    addToCollection,
    getCollection,
    resetCollection,
    loadCardsData,
    POOL,
    allCardsMap,
  };
  
  // Cargar datos al iniciar y exponer la promesa para que la UI espere si hace falta
  const ready = loadCardsData();
  // Exponer la promesa en la API pública
  if (window.cards) window.cards.ready = ready;
})();
