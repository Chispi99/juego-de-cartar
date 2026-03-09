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
    }
  }


  function pickRarity() {
    const r = Math.random();

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
      banner: 'general', 
      pity: null, 
      ...(
        typeof countOrOpts === 'number'
          ? { count: countOrOpts }
          : (typeof countOrOpts === 'object' && countOrOpts !== null ? countOrOpts : {})
      ),
    };

    const out = [];
    for (let i = 0; i < opts.count; i++) {
      const rarity = pickRarity();
      let pool = [];
      const allCards = Object.values(allCardsMap || {});
      if (allCards.length) {
        pool = allCards.filter(c => c.rarity === rarity);
      }

      if (!pool || pool.length === 0) {
        pool = (POOL[rarity] && POOL[rarity].length) ? POOL[rarity] : [];
      }

      if (!pool || pool.length === 0) {
        pool = allCards.length ? allCards : (POOL.common && POOL.common.length ? POOL.common : []);
      }

      const picked = randomFrom(pool);
      const fullCard = picked && picked.id ? (allCardsMap[picked.id] || picked) : picked;
      out.push(fullCard);
    }

    const pity = opts.pity;
    if (pity && typeof pity === 'object') {
      const hasDiamond = out.some(c => c && c.rarity && c.rarity.toLowerCase() === 'diamond');
      const hasJeffrey = out.some(c => c && c.id === 'D2');

      if (opts.banner === 'general') {
        if (!hasDiamond) {
          pity.general = (pity.general || 0) + 1;
        } else {
          pity.general = 0;
        }
        if (pity.general >= 70) {
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

      if (opts.banner === 'jeffrey') {
        if (!hasJeffrey) {
          pity.jeffrey = (pity.jeffrey || 0) + 1;
        } else {
          pity.jeffrey = 0;
        }

        if ((pity.jeffrey || 0) >= 70) {
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
  
  const ready = loadCardsData();  if (window.cards) window.cards.ready = ready;
})();
