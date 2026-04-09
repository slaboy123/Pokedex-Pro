/**
 * Índice do Sistema de Sprites para Battle
 * Exporta o motor principal e componentes
 */

// Types
export * from './sprite-engine.types';

// Motor
export { SpriteEngine, globalSpriteEngine } from './sprite-engine';

// Animações
export {
  AnimationQueue,
  SpriteRenderStateManager,
  NumberInterpolator,
  TransformCalculator,
} from './sprite-animations';

// Loader e Cache
export { SpriteLoader, globalSpriteLoader } from './sprite-loader';

// URLs
export {
  normalizePokemonName,
  getShowdownGifUrl,
  getShowdownWebpUrl,
  getPokeApiStaticUrl,
  getSpriteSheetUrl,
  get3DModelUrl,
  getSpriteWithFallback,
  getCompleteSpriteSet,
  validateSpriteUrl,
  supportsWebP,
  getBestSpriteFormat,
} from './sprite-urls';

// Animações predefinidas
export * from './predefined-animations';

// Reexporta battle-animations original para compatibilidade
export * from '../battle-animations';
