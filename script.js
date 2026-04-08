// ================= CONFIG =================
const API_BASE = "https://pokeapi.co/api/v2";

const GENERATIONS = {
  1: [1, 151],
  2: [152, 251],
  3: [252, 386],
  4: [387, 493],
  5: [494, 649],
  6: [650, 721],
  7: [722, 809],
  8: [810, 905],
  9: [906, 1025]
};

const TYPE_COLORS = {
  fire:'#f87171', water:'#60a5fa', grass:'#4ade80', electric:'#facc15',
  psychic:'#f472b6', ice:'#67e8f9', dragon:'#a78bfa', dark:'#374151',
  fairy:'#f9a8d4', normal:'#d1d5db', fighting:'#fb923c', flying:'#c4b5fd',
  poison:'#a78bfa', ground:'#fbbf24', rock:'#a3a3a3', bug:'#a3e635',
  ghost:'#818cf8', steel:'#94a3b8'
};

const TYPE_NAMES_EN = {
  normal: 'Normal', fire: 'Fire', water: 'Water', grass: 'Grass', electric: 'Electric',
  ice: 'Ice', fighting: 'Fighting', poison: 'Poison', ground: 'Ground', flying: 'Flying',
  psychic: 'Psychic', bug: 'Bug', rock: 'Rock', ghost: 'Ghost', dark: 'Dark',
  dragon: 'Dragon', steel: 'Steel', fairy: 'Fairy'
};

// ================= DOM =================
const grid = document.getElementById('grid');
const loader = document.getElementById('loader');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const searchInput = document.getElementById('search');
const themeToggle = document.getElementById('themeToggle');

// ================= STATE =================
let state = {
  currentGeneration: 1,
  pokemons: [],
  cache: new Map(),
  theme: 'dark'
};

const THEME_STORAGE_KEY = 'pokedex-pro-theme';

function applyTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ================= UTIL =================

// Capitaliza nomes (inclusive compostos)
function capitalize(name){
  return name
    .split('-')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('-');
}

// Formata número do Pokémon como 0001
function formatId(id){
  return String(id).padStart(4,'0');
}

// Limpeza de texto profissional
function cleanText(text){
  return text
    .replace(/\n|\f/g, ' ')
    .replace(/POKéMON/g, 'Pokémon')
    .replace(/\s+/g, ' ')
    .trim();
}

function translateToPT(text) {
  return text; // keep in English
}

// Best description (English first)
function getBestDescription(entries){
  let entry = entries.find(e => e.language.name === 'en');
  if(!entry){
    entry = entries.find(e => e.language.name === 'pt-BR');
  }
  if(!entry){
    entry = entries.find(e => e.language.name === 'pt');
  }

  const text = cleanText(entry?.flavor_text || 'No description available.');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Resumo inteligente
function smartShort(text){
  if(text.length < 120) return text;

  const cut = text.slice(0,120);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0,lastSpace) + '...';
}

// Debounce
const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// ================= DATA =================
async function fetchPokemon(id) {
  if (state.cache.has(id)) return state.cache.get(id);

  const [pokemonRes, speciesRes] = await Promise.all([
    fetch(`${API_BASE}/pokemon/${id}`).then(r => r.json()),
    fetch(`${API_BASE}/pokemon-species/${id}`).then(r => r.json())
  ]);

  const full = getBestDescription(speciesRes.flavor_text_entries);
  const short = smartShort(full);

  const pokemonTypes = pokemonRes.types.map(t => {
    const key = t.type.name;
    return {
      key,
      label: TYPE_NAMES_EN[key] || capitalize(key),
      color: TYPE_COLORS[key] || '#999'
    };
  });

  const data = {
    id,
    name: capitalize(pokemonRes.name), // 🔥 corrigido
    img: pokemonRes.sprites.other['official-artwork'].front_default,
    types: pokemonTypes,
    color: pokemonTypes[0]?.color || '#888',
    short,
    full
  };

  state.cache.set(id, data);
  return data;
}

// ================= RENDER =================
function createCard(pokemon) {
  const el = document.createElement('div');
  el.className = 'card';
  el.style.borderTop = `4px solid ${pokemon.color}`;

  el.innerHTML = `
    <img src="${pokemon.img}" loading="lazy" />
    <div class="card-header">
      <span class="card-number">#${formatId(pokemon.id)}</span>
      <h3>${pokemon.name}</h3>
    </div>
    <div class="card-types">
      ${pokemon.types.map(t =>
        `<span class="type" style="background:${t.color};">${t.label}</span>`
      ).join('')}
    </div>
    <p class="desc-short">${pokemon.short}</p>
  `;

  el.onclick = () => openModal(pokemon);
  return el;
}

function renderList(list) {
  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  list.forEach(p => fragment.appendChild(createCard(p)));
  grid.appendChild(fragment);
}

// ================= MODAL =================
async function openModal(p) {
  modal.style.display = 'flex';

  // Buscar dados completos (stats, altura, etc)
  const res = await fetch(`${API_BASE}/pokemon/${p.id}`).then(r => r.json());

  const STAT_LABELS_EN = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Special Attack',
    'special-defense': 'Special Defense',
    speed: 'Speed'
  };

  const stats = res.stats.map(s => {
    const raw = s.base_stat;
    const scaled = Math.min(15, Math.max(1, Math.round((raw / 255) * 14) + 1));
    return {
      name: STAT_LABELS_EN[s.stat.name] || capitalize(s.stat.name),
      value: raw,
      scaled,
      score: `${scaled}/15`
    };
  });

  const abilityNames = res.abilities.map(a => capitalize(a.ability.name));
  const abilityBadges = abilityNames.map(name => `<span class="ability-badge">${name}</span>`).join('');

  const speciesData = await fetch(`${API_BASE}/pokemon-species/${p.id}`).then(r => r.json());
  const evoData = await fetch(speciesData.evolution_chain.url).then(r => r.json());

  const evolutionNames = [];
  function collectEvolution(node){
    if(node?.species?.name) evolutionNames.push(node.species.name);
    node.evolves_to.forEach(collectEvolution);
  }
  collectEvolution(evoData.chain);

  async function getPokemonByName(name){
    const existing = state.pokemons.find(x => x.name.toLowerCase() === capitalize(name).toLowerCase());
    if(existing) return existing;
    const base = await fetch(`${API_BASE}/pokemon/${name}`).then(r => r.json());
    return fetchPokemon(base.id);
  }

  const evolutionPokemons = await Promise.all(evolutionNames.map(n => getPokemonByName(n)));

  const specialFormNames = (speciesData.varieties || [])
    .map(v => v.pokemon?.name)
    .filter(Boolean)
    .filter(name => name.includes('-mega') || name.includes('-gmax'));

  const specialForms = await Promise.all(
    [...new Set(specialFormNames)].map(name => getPokemonByName(name).catch(() => null))
  );

  const megaForms = specialForms
    .filter(Boolean)
    .filter(form => form.name.toLowerCase().includes('-mega'));

  const gigamaxForms = specialForms
    .filter(Boolean)
    .filter(form => form.name.toLowerCase().includes('-gmax'));

  const typeTypeData = await Promise.all(p.types.map(t => fetch(`${API_BASE}/type/${t.key}`).then(r => r.json())));
  const weaknessKeys = [...new Set(typeTypeData.flatMap(data => data.damage_relations.double_damage_from.map(i => i.name)))];
  const weaknesses = weaknessKeys.map(key => ({
    key,
    label: TYPE_NAMES_EN[key] || capitalize(key),
    color: TYPE_COLORS[key] || '#ef4444'
  }));

  modalContent.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${p.name} #${String(p.id).padStart(4,'0')}</h2>
        <button class="close-btn" style="background:${p.color};" onclick="closeModal()" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">

      <div class="modal-top-grid">

        <!-- IMAGEM -->
        <div class="modal-image-wrap">
          <img src="${p.img}" style="width:180px">
        </div>

        <!-- INFO -->
        <div class="modal-info-panel">
          <p><strong>Height:</strong> ${(res.height / 10).toFixed(1)} m</p>
          <p><strong>Weight:</strong> ${(res.weight / 10).toFixed(1)} kg</p>
          <p><strong>Abilities:</strong></p>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
            ${abilityBadges}
          </div>

          <div style="margin-top:10px">
            ${p.types.map(t =>
              `<span style="background:${t.color}; padding:4px 10px; border-radius:999px; margin-right:5px; color:#000">
                ${t.label}
              </span>`
            ).join('')}
          </div>
        </div>
      </div>

      <!-- WEAKNESSES -->
      <div class="modal-section-card">
        <h3>Weaknesses</h3>
        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
          ${weaknesses.length > 0 ? weaknesses.map(w => `<span class="type" style="background:${w.color}; color:#000;">${w.label}</span>`).join('') : '<span>No weaknesses</span>'}
        </div>
      </div>

      <!-- EVOLUTION -->
      <div class="modal-section-card">
        <h3>Evolution</h3>
        <div class="evolution-grid">
          ${evolutionPokemons.map(ep =>
            `<button onclick="openModalById(${ep.id})" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); border-radius:12px; padding:8px; min-width:100px; cursor:pointer;">
              <img src="${ep.img}" alt="${ep.name}" style="width:60px;height:60px; object-fit:contain;" />
              <small>#${formatId(ep.id)}</small>
              <span style="font-weight:600;">${ep.name}</span>
            </button>`
          ).join('')}
        </div>
      </div>

      <!-- MEGA EVOLUTIONS -->
      ${megaForms.length > 0 ? `
      <div class="modal-section-card">
        <h3>Mega Evoluções</h3>
        <div class="evolution-grid">
          ${megaForms.map(form => `
            <button onclick="openModalById(${form.id})" class="form-card form-card--mega">
              <img src="${form.img}" alt="${form.name}" class="form-card__img" />
              <small>#${formatId(form.id)}</small>
              <span>${capitalize(form.name.replace(/-/g, ' '))}</span>
            </button>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- GIGANTAMAX -->
      ${gigamaxForms.length > 0 ? `
      <div class="modal-section-card">
        <h3>Gigantamax</h3>
        <div class="evolution-grid">
          ${gigamaxForms.map(form => `
            <button onclick="openModalById(${form.id})" class="form-card form-card--gmax">
              <img src="${form.img}" alt="${form.name}" class="form-card__img" />
              <small>#${formatId(form.id)}</small>
              <span>${capitalize(form.name.replace(/-/g, ' '))}</span>
            </button>
          `).join('')}
        </div>
      </div>` : ''}
      </div>

      <!-- DESCRIÇÃO -->
      <div class="modal-section-card modal-description">
        ${p.full}
      </div>

      <!-- STATS -->
      <div class="modal-section-card modal-stats">
        <h3>Stats</h3>
        ${stats.map(s => `
          <div class="stat-row">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <small>${s.name}</small>
              <small>${s.score}</small>
            </div>
            <div class="stat-bar">
              <div class="stat-fill" style="width:${Math.round((s.value/255)*100)}%; background:${p.color};"></div>
            </div>
          </div>
        `).join('')}
      </div>

    </div>
  `;
}

function closeModal() {
  modal.style.display = 'none';
}

function openModalById(id) {
  const pokemon = state.pokemons.find(p => p.id === id);
  if (pokemon) {
    openModal(pokemon);
  } else {
    fetchPokemon(id).then(openModal);
  }
}

// ================= LOAD =================
async function loadGeneration(gen) {
  state.currentGeneration = gen;
  const [start, end] = GENERATIONS[gen];

  loader.style.display = 'block';
  grid.innerHTML = '';

  const batchSize = 20;
  const results = [];

  for (let i = start; i <= end; i += batchSize) {
    const batch = [];

    for (let j = i; j < i + batchSize && j <= end; j++) {
      batch.push(fetchPokemon(j));
    }

    const data = await Promise.all(batch);
    results.push(...data);

    renderList(results);
  }

  state.pokemons = results;
  loader.style.display = 'none';
}

function setGen(button, gen) {
  document.querySelectorAll('.generations button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  loadGeneration(gen);
}

// ================= SEARCH =================
const handleSearch = debounce((value) => {
  const filtered = state.pokemons.filter(p =>
    p.name.toLowerCase().includes(value.toLowerCase())
  );

  renderList(filtered);
});

searchInput.addEventListener('input', (e) => {
  handleSearch(e.target.value);
});

themeToggle.addEventListener('click', toggleTheme);

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
applyTheme(savedTheme === 'light' ? 'light' : 'dark');

// ================= UI =================
function setActive(btn, gen) {
  document.querySelectorAll('.generations button')
    .forEach(b => b.classList.remove('active'));

  btn.classList.add('active');
  loadGeneration(gen);
}

// ================= INIT =================
function init() {
  document.querySelector('.generations button')?.classList.add('active');
  loadGeneration(1);
}

init();