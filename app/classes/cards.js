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
    // Probabilidades por carta (aprox):
    //  - Diamond: muy raro (0.1%) pero puede salir más de uno en un sobre.
    //  - Legendary: decente (≈4% por carta → ~1 legendaria cada 5 sobres).
    //  - Epic: bastante frecuente dentro de lo "raro".
    //  - Rare: buen balance entre comunes y raras.
    //  - Common: la mayoría de cartas.
    
    if (r < 0.001) return 'diamond';        // 0.1%
    if (r < 0.041) return 'legendary';     // +4.0% (total 4.1%)
    if (r < 0.161) return 'epic';          // +12.0% (total 16.1%)
    if (r < 0.341) return 'rare';          // +18.0% (total 34.1%)
    return 'common';                       // ~65.9%
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

  function openPack(countOrOpts) {
    const opts = {
      count: 5,
      banner: 'general', // 'general' o 'jeffrey'
      pity: null, // { general: number, jeffrey: number }
      ...(
        typeof countOrOpts === 'number'
          ? { count: countOrOpts }
          : (typeof countOrOpts === 'object' && countOrOpts !== null ? countOrOpts : {})
      ),
    };

    const out = [];
    for (let i = 0; i < opts.count; i++) {
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
    }

    // Pity system
    const pity = opts.pity;
    if (pity && typeof pity === 'object') {
      const hasDiamond = out.some(c => c && c.rarity && c.rarity.toLowerCase() === 'diamond');
      const hasJeffrey = out.some(c => c && c.id === 'D2');

      // Banner general: garantizado diamond en 70 si no ha salido antes
      if (opts.banner === 'general') {
        if (!hasDiamond) {
          pity.general = (pity.general || 0) + 1;
        } else {
          pity.general = 0;
        }
        if (pity.general >= 70) {
          // Asegurar diamond: reemplazar una carta al azar de menor rareza
          const candidates = out.filter(c => c && c.rarity && c.rarity.toLowerCase() !== 'diamond');
          const replaceIndex = candidates.length ? out.indexOf(candidates[Math.floor(Math.random() * candidates.length)]) : 0;
          const allDiamond = (Object.values(allCardsMap || {}).filter(c => c.rarity === 'diamond'));
          if (allDiamond.length) {
            const forced = randomFrom(allDiamond);
            if (forced) {
              out[replaceIndex] = forced;
              addToCollection(forced);
            }
          }
          pity.general = 0;
        }
      }

      // Banner Jeffrey: si no sale Jeffrey, se cuenta para un pity de 70 tiradas.
      if (opts.banner === 'jeffrey') {
        if (!hasJeffrey) {
          pity.jeffrey = (pity.jeffrey || 0) + 1;
        } else {
          pity.jeffrey = 0;
        }

        if ((pity.jeffrey || 0) >= 70) {
          // Garantizar al menos un Jeffrey en el paquete (reemplazando aleatoriamente una carta)
          const allJeffrey = Object.values(allCardsMap || {}).filter(c => c.id === 'D2');
          if (allJeffrey.length) {
            const forced = allJeffrey[0];
            const replaceIndex = Math.floor(Math.random() * out.length);
            out[replaceIndex] = forced;
            addToCollection(forced);
          }
          pity.jeffrey = 0;
        }
      }
    }

    // Añadir a colección una vez que se haya aplicado el pity
    out.forEach(card => {
      if (card) addToCollection(card);
    });

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
