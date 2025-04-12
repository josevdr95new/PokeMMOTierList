// API URLs
const POKEMMO_TIERS_API = 'https://pokemmotiers-api.josevdr95.workers.dev';
const POKEAPI_URL = 'https://pokeapi.co/api/v2';

// DOM Elements
const pokemonGrid = document.getElementById('pokemon-grid');
const loading = document.getElementById('loading');
const lastUpdated = document.getElementById('last-updated');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const tierButtons = document.querySelectorAll('.filter-btn');
const modal = document.getElementById('pokemon-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close-modal');

// Stats Elements
const totalCount = document.querySelector('#total-count .stat-value');
const ubersCount = document.querySelector('#ubers-count .stat-value');
const ouCount = document.querySelector('#ou-count .stat-value');
const uuCount = document.querySelector('#uu-count .stat-value');
const nuCount = document.querySelector('#nu-count .stat-value');
const untieredCount = document.querySelector('#untiered-count .stat-value');

// Global Variables
let allPokemon = [];
let currentFilter = 'all';
let currentSort = 'id';

// Cache for PokeAPI data to avoid repeated fetches
const pokeApiCache = {};

// Fetch metadata
async function fetchMetadata() {
    try {
        const response = await fetch(`${POKEMMO_TIERS_API}/metadata`);
        const data = await response.json();
        
        // Update stats
        totalCount.textContent = data.metadata.count_total;
        ubersCount.textContent = data.metadata.count_ubers;
        ouCount.textContent = data.metadata.count_ou;
        uuCount.textContent = data.metadata.count_uu;
        nuCount.textContent = data.metadata.count_nu;
        untieredCount.textContent = data.metadata.count_untiered;
        
        // Format and display last updated date
        const lastUpdatedDate = new Date(data.metadata.last_updated_date);
        lastUpdated.textContent = `Last updated: ${lastUpdatedDate.toLocaleDateString()}`;
        
        return data;
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return null;
    }
}

// Fetch all tiers pokemon
async function fetchAllPokemon() {
    loading.style.display = 'flex';
    
    try {
        // Fetch all pokemon from the complete list endpoint
        const response = await fetch(`${POKEMMO_TIERS_API}/pokemon`);
        const data = await response.json();
        
        // Process pokemon data
        const processedPokemon = data.results.map(pokemon => ({
            ...pokemon,
            tier: pokemon.tier // Tier is already included in the response
        }));
        
        allPokemon = processedPokemon;
        
        // Enhance pokemon data with PokeAPI information
        await enhancePokemonData();
        
        // Initial display
        applyFiltersAndSort();
        
    } catch (error) {
        console.error('Error fetching all pokemon:', error);
    } finally {
        loading.style.display = 'none';
    }
}

// Enhance pokemon data with information from PokeAPI
async function enhancePokemonData() {
    const enhancedData = [];
    
    for (const pokemon of allPokemon) {
        try {
            let pokeApiData;
            
            // Check if we have cached data
            if (pokeApiCache[pokemon.id]) {
                pokeApiData = pokeApiCache[pokemon.id];
            } else {
                // Fetch data from PokeAPI
                const response = await fetch(`${POKEAPI_URL}/pokemon/${pokemon.id}`);
                pokeApiData = await response.json();
                
                // Cache the data
                pokeApiCache[pokemon.id] = pokeApiData;
            }
            
            // Enhance with PokeAPI data
            enhancedData.push({
                ...pokemon,
                sprites: pokeApiData.sprites,
                types: pokeApiData.types,
                stats: pokeApiData.stats,
                abilities: pokeApiData.abilities,
                height: pokeApiData.height,
                weight: pokeApiData.weight,
                speciesUrl: pokeApiData.species.url
            });
            
        } catch (error) {
            console.error(`Error fetching data for ${pokemon.name}:`, error);
            enhancedData.push(pokemon);
        }
    }
    
    allPokemon = enhancedData;
}

// Apply current filters and sort to pokemon list
function applyFiltersAndSort() {
    let filteredPokemon = [...allPokemon];
    
    // Apply tier filter
    if (currentFilter !== 'all') {
        filteredPokemon = filteredPokemon.filter(pokemon => 
            pokemon.tier.toLowerCase() === currentFilter
        );
    }
    
    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredPokemon = filteredPokemon.filter(pokemon => 
            pokemon.name.toLowerCase().includes(searchTerm) || 
            pokemon.id.toString().includes(searchTerm)
        );
    }
    
    // Apply sorting
    switch (currentSort) {
        case 'id':
            filteredPokemon.sort((a, b) => a.id - b.id);
            break;
        case 'name':
            filteredPokemon.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'win':
            filteredPokemon.sort((a, b) => b.win_percentage - a.win_percentage);
            break;
    }
    
    // Render the filtered and sorted list
    renderPokemonList(filteredPokemon);
}

// Render the pokemon list to the grid
function renderPokemonList(pokemonList) {
    pokemonGrid.innerHTML = '';
    
    if (pokemonList.length === 0) {
        pokemonGrid.innerHTML = '<div class="no-results">No Pokémon found matching your filters</div>';
        return;
    }
    
    for (const pokemon of pokemonList) {
        const pokemonCard = document.createElement('div');
        pokemonCard.classList.add('pokemon-card');
        pokemonCard.dataset.id = pokemon.id;
        
        // Default sprite URL if enhanced data isn't available
        let spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        
        // Use official artwork if available from enhanced data
        if (pokemon.sprites && pokemon.sprites.other && pokemon.sprites.other["official-artwork"]) {
            spriteUrl = pokemon.sprites.other["official-artwork"].front_default || spriteUrl;
        }
        
        const tierClass = pokemon.tier.toLowerCase();
        
        pokemonCard.innerHTML = `
            <div class="tier-badge ${tierClass}">${pokemon.tier}</div>
            <img class="pokemon-image" src="${spriteUrl}" alt="${pokemon.name}">
            <div class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</div>
            <div class="pokemon-name">${pokemon.name}</div>
            <div class="win-rate">Win rate: ${pokemon.win_percentage}%</div>
        `;
        
        // Add type badges if available
        if (pokemon.types) {
            const typesContainer = document.createElement('div');
            typesContainer.classList.add('modal-types');
            
            pokemon.types.forEach(typeInfo => {
                const typeBadge = document.createElement('span');
                typeBadge.classList.add('type-badge', `type-${typeInfo.type.name}`);
                typeBadge.textContent = typeInfo.type.name;
                typesContainer.appendChild(typeBadge);
            });
            
            pokemonCard.appendChild(typesContainer);
        }
        
        // Add click event to show modal
        pokemonCard.addEventListener('click', () => showPokemonDetails(pokemon));
        
        pokemonGrid.appendChild(pokemonCard);
    }
}

// Show detailed pokemon information in modal
async function showPokemonDetails(pokemon) {
    modalBody.innerHTML = '<div class="loading"><div class="pokeball"></div><p>Loading details...</p></div>';
    modal.style.display = 'flex';
    
    try {
        // Fetch additional species data if not already fetched
        let speciesData;
        if (!pokemon.species) {
            const speciesResponse = await fetch(pokemon.speciesUrl);
            speciesData = await speciesResponse.json();
            pokemon.species = speciesData;
        } else {
            speciesData = pokemon.species;
        }
        
        // Fetch ability descriptions
        const abilityPromises = pokemon.abilities.map(async (abilityInfo) => {
            const abilityResponse = await fetch(abilityInfo.ability.url);
            return await abilityResponse.json();
        });
        
        const abilityData = await Promise.all(abilityPromises);
        
        // Fetch evolution chain
        let evolutionData = null;
        if (speciesData.evolution_chain) {
            const evolutionResponse = await fetch(speciesData.evolution_chain.url);
            evolutionData = await evolutionResponse.json();
        }
        
        // Calculate type weaknesses
        const typeWeaknesses = await calculateTypeWeaknesses(pokemon.types);
        
        // Render modal content
        renderPokemonModal(pokemon, speciesData, abilityData, evolutionData, typeWeaknesses);
        
    } catch (error) {
        console.error('Error fetching pokemon details:', error);
        modalBody.innerHTML = '<div class="error">Error loading Pokémon details. Please try again.</div>';
    }
}

// Calculate type weaknesses based on pokemon types
async function calculateTypeWeaknesses(types) {
    const typeNames = types.map(t => t.type.name);
    const typeEffectiveness = {};
    
    // Initialize all types with a multiplier of 1
    const allTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 
                      'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 
                      'dragon', 'dark', 'steel', 'fairy'];
    
    allTypes.forEach(type => {
        typeEffectiveness[type] = 1;
    });
    
    // Fetch type data for each of the pokemon's types
    for (const typeName of typeNames) {
        const response = await fetch(`${POKEAPI_URL}/type/${typeName}`);
        const typeData = await response.json();
        
        // Double damage from
        typeData.damage_relations.double_damage_from.forEach(type => {
            typeEffectiveness[type.name] *= 2;
        });
        
        // Half damage from
        typeData.damage_relations.half_damage_from.forEach(type => {
            typeEffectiveness[type.name] *= 0.5;
        });
        
        // No damage from
        typeData.damage_relations.no_damage_from.forEach(type => {
            typeEffectiveness[type.name] = 0;
        });
    }
    
    // Convert to array of objects with type and multiplier
    return Object.entries(typeEffectiveness)
        .map(([type, multiplier]) => ({ type, multiplier }))
        .filter(item => item.multiplier !== 1) // Only include non-neutral effectiveness
        .sort((a, b) => b.multiplier - a.multiplier); // Sort by effectiveness
}

// Render pokemon details in modal
function renderPokemonModal(pokemon, speciesData, abilityData, evolutionData, typeWeaknesses) {
    // Get English flavor text
    let flavorText = 'No description available.';
    if (speciesData.flavor_text_entries) {
        const englishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
        if (englishEntry) {
            flavorText = englishEntry.flavor_text.replace(/\f/g, ' ');
        }
    }
    
    // Get sprites
    let officialArtwork = pokemon.sprites.other["official-artwork"].front_default;
    let frontDefault = pokemon.sprites.front_default;
    let backDefault = pokemon.sprites.back_default;
    let frontShiny = pokemon.sprites.front_shiny;
    let backShiny = pokemon.sprites.back_shiny;
    
    // Build modal HTML
    const tierClass = pokemon.tier.toLowerCase();
    
    let modalHTML = `
        <div class="modal-top">
            <div class="modal-image-container">
                <img class="modal-image" src="${officialArtwork}" alt="${pokemon.name}">
                <div class="modal-sprite-section">
                    <img class="sprite" src="${frontDefault}" alt="Front">
                    <img class="sprite" src="${backDefault}" alt="Back">
                    <img class="sprite" src="${frontShiny}" alt="Shiny">
                    <img class="sprite" src="${backShiny}" alt="Shiny Back">
                </div>
            </div>
            
            <div class="modal-info">
                <span class="modal-tier ${tierClass}">${pokemon.tier}</span>
                <div class="modal-header">
                    <h2 class="modal-name">${pokemon.name}</h2>
                    <div class="modal-id">#${pokemon.id.toString().padStart(3, '0')}</div>
                </div>
                
                <div class="modal-types">
                    ${pokemon.types.map(typeInfo => 
                        `<span class="type-badge type-${typeInfo.type.name}">${typeInfo.type.name}</span>`
                    ).join('')}
                </div>
                
                <p class="modal-description">${flavorText}</p>
                
                <div class="modal-physical">
                    <p>Height: ${pokemon.height / 10}m</p>
                    <p>Weight: ${pokemon.weight / 10}kg</p>
                </div>
                
                <p class="win-rate"><strong>Win rate in PokeMMO:</strong> ${pokemon.win_percentage}%</p>
            </div>
        </div>
        
        <div class="stats-section">
            <h3>Base Stats</h3>
            <div class="stat-bars">
    `;
    
    // Add stat bars
    pokemon.stats.forEach(stat => {
        const statName = stat.stat.name.replace('-', ' ');
        const statValue = stat.base_stat;
        const percentage = Math.min(100, (statValue / 255) * 100);
        
        let barColor;
        if (statValue < 50) barColor = '#FF5252';
        else if (statValue < 90) barColor = '#FFC107';
        else barColor = '#4CAF50';
        
        modalHTML += `
            <div class="stat-bar">
                <div class="stat-name">${statName}</div>
                <div class="stat-value-number">${statValue}</div>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: ${percentage}%; background-color: ${barColor}"></div>
                </div>
            </div>
        `;
    });
    
    modalHTML += `
            </div>
        </div>
        
        <div class="abilities-section">
            <h3>Abilities</h3>
    `;
    
    // Add abilities with descriptions
    pokemon.abilities.forEach((abilityInfo, index) => {
        const ability = abilityData[index];
        let description = 'No description available.';
        
        if (ability.effect_entries) {
            const englishEntry = ability.effect_entries.find(entry => entry.language.name === 'en');
            if (englishEntry) {
                description = englishEntry.short_effect;
            }
        }
        
        modalHTML += `
            <div class="ability-item">
                <div class="ability-name">${ability.name} ${abilityInfo.is_hidden ? '(Hidden)' : ''}</div>
                <div class="ability-description">${description}</div>
            </div>
        `;
    });
    
    modalHTML += `
        </div>
        
        <div class="weaknesses-section">
            <h3>Type Effectiveness</h3>
            <div class="weakness-grid">
    `;
    
    // Add type weaknesses
    typeWeaknesses.forEach(weakness => {
        const multiplierText = weakness.multiplier === 0 ? 'Immune' : 
                              weakness.multiplier === 0.25 ? '¼×' :
                              weakness.multiplier === 0.5 ? '½×' : 
                              `${weakness.multiplier}×`;
        
        modalHTML += `
            <div class="weakness-item">
                <span class="type-badge type-${weakness.type}">${weakness.type}</span>
                <span class="weakness-multiplier">${multiplierText}</span>
            </div>
        `;
    });
    
    modalHTML += `
            </div>
        </div>
    `;
    
    // Add evolution chain if available
    if (evolutionData && evolutionData.chain) {
        modalHTML += `
            <div class="evolution-section">
                <h3>Evolution Chain</h3>
                <div class="evolution-chain">
        `;
        
        // Process evolution chain
        const processEvolutionChain = async (chain) => {
            const evolutionHTML = [];
            let currentChain = chain;
            
            // Helper function to get pokemon ID from URL
            const getPokemonIdFromSpeciesUrl = (url) => {
                const parts = url.split('/');
                return parts[parts.length - 2];
            };
            
            while (currentChain) {
                const pokemonId = getPokemonIdFromSpeciesUrl(currentChain.species.url);
                const evolutionSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
                
                evolutionHTML.push(`
                    <div class="evolution-item">
                        <img class="evolution-image" src="${evolutionSprite}" alt="${currentChain.species.name}">
                        <div class="evolution-name">${currentChain.species.name}</div>
                    </div>
                `);
                
                if (currentChain.evolves_to.length > 0) {
                    evolutionHTML.push(`<div class="evolution-arrow">→</div>`);
                    currentChain = currentChain.evolves_to[0];
                } else {
                    break;
                }
            }
            
            return evolutionHTML.join('');
        };
        
        processEvolutionChain(evolutionData.chain).then(evolutionChainHTML => {
            const evolutionSection = document.querySelector('.evolution-chain');
            if (evolutionSection) {
                evolutionSection.innerHTML = evolutionChainHTML;
            }
        });
        
        modalHTML += `
                </div>
            </div>
        `;
    }
    
    modalBody.innerHTML = modalHTML;
}

// Event Listeners
searchInput.addEventListener('input', () => {
    applyFiltersAndSort();
});

sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    applyFiltersAndSort();
});

tierButtons.forEach(button => {
    button.addEventListener('click', () => {
        tierButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.dataset.tier;
        applyFiltersAndSort();
    });
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Initialize the app
async function initApp() {
    await fetchMetadata();
    await fetchAllPokemon();
}

// Start the app
initApp();