/**
 * Animações Predefinidas para Battle
 * Biblioteca de animações prontas para usar
 */

import type { AnimationData } from './sprite-engine.types';

/**
 * Animação idle - movimento leve contínuo
 */
export const idleAnimation: AnimationData = {
  name: 'idle',
  duration: 2000,
  loop: true,
  startY: 0,
  endY: -5,
  opacity: { from: 1, to: 1 },
};

/**
 * Animação de ataque - avanço rápido
 */
export const attackAnimation: AnimationData = {
  name: 'attack',
  duration: 400,
  loop: false,
  startX: 0,
  endX: 20,
  scale: { from: 1, to: 1.1 },
  effect: 'blur',
};

/**
 * Animação de dano - shake
 */
export const hitAnimation: AnimationData = {
  name: 'hit',
  duration: 300,
  loop: false,
  effect: 'shake',
};

/**
 * Animação de flash (impacto)
 */
export const flashAnimation: AnimationData = {
  name: 'hit',
  duration: 200,
  loop: false,
  effect: 'flash',
};

/**
 * Animação de desmaio - fade out
 */
export const faintAnimation: AnimationData = {
  name: 'faint',
  duration: 800,
  loop: false,
  opacity: { from: 1, to: 0 },
  scale: { from: 1, to: 0.8 },
  effect: 'fade',
};

/**
 * Animação de entrada em campo
 */
export const switchInAnimation: AnimationData = {
  name: 'switch-in',
  duration: 500,
  loop: false,
  startX: -50,
  endX: 0,
  startY: 20,
  endY: 0,
  opacity: { from: 0, to: 1 },
  scale: { from: 0.5, to: 1 },
};

/**
 * Animação de saída de campo
 */
export const switchOutAnimation: AnimationData = {
  name: 'switch-out',
  duration: 400,
  loop: false,
  startX: 0,
  endX: 50,
  startY: 0,
  endY: -20,
  opacity: { from: 1, to: 0 },
  scale: { from: 1, to: 0.5 },
};

/**
 * Predefinições de animação por tipo de ataque
 */
export const attackAnimationsByType: Record<string, AnimationData> = {
  normal: {
    name: 'attack',
    duration: 350,
    loop: false,
    startX: 0,
    endX: 15,
    scale: { from: 1, to: 1.05 },
  },
  fighting: {
    name: 'attack',
    duration: 400,
    loop: false,
    startX: 0,
    endX: 25,
    scale: { from: 1, to: 1.15 },
    effect: 'shake',
  },
  flying: {
    name: 'attack',
    duration: 450,
    loop: false,
    startY: -15,
    endY: 0,
    scale: { from: 1.1, to: 1 },
  },
  poison: {
    name: 'attack',
    duration: 400,
    loop: false,
    startX: -5,
    endX: 5,
    effect: 'blur',
  },
  ground: {
    name: 'attack',
    duration: 400,
    loop: false,
    startY: 0,
    endY: 10,
    scale: { from: 1.1, to: 1 },
    effect: 'shake',
  },
  rock: {
    name: 'attack',
    duration: 400,
    loop: false,
    startX: -10,
    endX: 10,
    rotation: { from: -5, to: 5 },
    effect: 'shake',
  },
  bug: {
    name: 'attack',
    duration: 300,
    loop: false,
    startX: 0,
    endX: 10,
    scale: { from: 0.9, to: 1 },
  },
  ghost: {
    name: 'attack',
    duration: 500,
    loop: false,
    startY: -10,
    endY: 10,
    opacity: { from: 0.7, to: 1 },
  },
  steel: {
    name: 'attack',
    duration: 350,
    loop: false,
    startX: 0,
    endX: 20,
    scale: { from: 1, to: 1.2 },
    effect: 'flash',
  },
  fire: {
    name: 'attack',
    duration: 400,
    loop: false,
    scale: { from: 1, to: 1.1 },
    effect: 'flash',
  },
  water: {
    name: 'attack',
    duration: 450,
    loop: false,
    startY: -10,
    endY: 10,
    effect: 'blur',
  },
  grass: {
    name: 'attack',
    duration: 400,
    loop: false,
    startX: -5,
    endX: 10,
    scale: { from: 0.95, to: 1.05 },
  },
  electric: {
    name: 'attack',
    duration: 300,
    loop: false,
    rotation: { from: -10, to: 10 },
    scale: { from: 1, to: 1.1 },
    effect: 'flash',
  },
  psychic: {
    name: 'attack',
    duration: 450,
    loop: false,
    startY: -20,
    endY: 0,
    opacity: { from: 0.8, to: 1 },
  },
  ice: {
    name: 'attack',
    duration: 400,
    loop: false,
    scale: { from: 1.1, to: 1 },
    opacity: { from: 0.9, to: 1 },
  },
  dragon: {
    name: 'attack',
    duration: 500,
    loop: false,
    startX: 0,
    endX: 30,
    scale: { from: 1, to: 1.2 },
    effect: 'shake',
  },
  dark: {
    name: 'attack',
    duration: 400,
    loop: false,
    startX: -10,
    endX: 10,
    opacity: { from: 0.7, to: 1 },
  },
  fairy: {
    name: 'attack',
    duration: 400,
    loop: false,
    startY: -10,
    endY: 10,
    scale: { from: 0.9, to: 1.1 },
    opacity: { from: 0.8, to: 1 },
  },
};

/**
 * Retorna animação de ataque baseado no tipo
 */
export const getAttackAnimation = (type: string = 'normal'): AnimationData => {
  return attackAnimationsByType[type.toLowerCase()] ?? attackAnimation;
};

/**
 * Coleção de todas as animações predefinidas
 */
export const defaultAnimations: Record<string, AnimationData> = {
  idle: idleAnimation,
  attack: attackAnimation,
  hit: hitAnimation,
  faint: faintAnimation,
  'switch-in': switchInAnimation,
  'switch-out': switchOutAnimation,
};
