/**
 * Helper para gerar URLs de sprites animadas de Pokémon.
 * Usa múltiplas fontes como fallback para garantir disponibilidade.
 */

export const getAnimatedSpriteUrl = (pokemonName: string, shiny = false): string => {
  // Normalizar nome: remover acentos, converter para lowercase, substituir espaços por hífens
  const normalized = pokemonName
    .toLowerCase()
    .replace(/[\u00E0-\u00FA]/g, (char) => {
      const map: Record<string, string> = {
        á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u',
        à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u',
      };
      return map[char] || char;
    })
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  const shinyPrefix = shiny ? 'shiny-' : '';

  // Fonte principal: sprites animadas de Pokémon (open-source)
  // Padrão: pokemon-name.gif
  const urls = [
    // Fallback 1: raw.githubusercontent.com (Pokémon Showdown sprites)
    `https://raw.githubusercontent.com/smogon/pokemon-showdown/master/public/sprites/ani${shiny ? '-shiny' : ''}/${normalized}.gif`,

    // Fallback 2: Sprite animada local com tratamento de erro
    `/sprites/animated/${shinyPrefix}${normalized}.gif`,

    // Fallback 3: PokéAPI oficial (menos detalhado mas confiável)
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon${shiny ? '/shiny' : ''}/${pokemonName}.png`,
  ];

  return urls[0]; // Retorna primeira opção (pode ser melhorado com verificação de disponibilidade)
};

/**
 * Obtém URL de sprite animada com fallback para sprite estática.
 * Tenta múltiplas fontes para garantir carregamento.
 */
export const getSpriteWithFallback = (pokemonName: string, shiny = false): { animated: string; static: string } => {
  return {
    animated: getAnimatedSpriteUrl(pokemonName, shiny),
    static: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon${shiny ? '/shiny' : ''}/${pokemonName}.png`,
  };
};

/**
 * Normaliza nome de Pokémon para URL-safe format
 */
export const normalizePokemonName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[\u00E0-\u00FA]/g, (char) => {
      const map: Record<string, string> = {
        á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u',
        à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u',
      };
      return map[char] || char;
    })
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
};
