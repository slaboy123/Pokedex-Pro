# Sistema de Sprites Animadas - Guia Completo

## 📋 Visão Geral

Sistema completo de renderização de sprites animadas para batalhas estilo Pokémon Showdown. Suporta:

- ✅ Sprites animadas (GIF, WebP)
- ✅ PNG sprite sheets
- ✅ Fallback automático em cascata
- ✅ Cache LRU inteligente
- ✅ Animações sincronizadas com battle engine
- ✅ Componentes React prontos
- ✅ Suporte a shiny variants

## 🏗️ Estrutura

```
src/features/battle/
├── sprite-engine/
│   ├── sprite-engine.types.ts       # Tipos e interfaces
│   ├── sprite-engine.ts             # Motor principal
│   ├── sprite-loader.ts             # Cache + Loader
│   ├── sprite-urls.ts               # Gerador de URLs
│   ├── sprite-animations.ts         # Gerenciador de animações
│   ├── predefined-animations.ts     # Animações prontas
│   └── index.ts                     # Exportações
├── components/
│   ├── PokemonSprite.tsx            # Componente de sprite
│   ├── BattleField.tsx              # Campo de batalha
│   ├── BattleSimulator.tsx          # (existente)
├── hooks/
│   └── useSprites.ts                # Hook React
└── battle-ui.tsx                    # (integrar aqui)
```

## 🚀 Uso Básico

### 1. Setup no Componente de Batalha

```typescript
import { useSprites } from '@/features/battle/hooks/useSprites';
import { BattleField } from '@/features/battle/components/BattleField';
import { globalSpriteEngine } from '@/features/battle/sprite-engine';

export const BattleView = () => {
  const sprites = useSprites({ autoStart: true });
  
  const [playerPokemon, setPlayerPokemon] = useState<BattleFighter | null>(null);
  const [enemyPokemon, setEnemyPokemon] = useState<BattleFighter | null>(null);

  return (
    <div>
      <BattleField
        playerPokemon={playerPokemon}
        enemyPokemon={enemyPokemon}
        spriteEngine={globalSpriteEngine}
      />
    </div>
  );
};
```

### 2. Disparar Animações

```typescript
// Quando um ataque acontece
sprites.playAttack(playerPokemon.id, 'player', () => {
  console.log('Ataque terminado');
});

// Quando recebe dano
sprites.playDamage(enemyPokemon.id, 'enemy', () => {
  console.log('Impacto terminado');
});

// Quando desmaiar
sprites.playFaint(enemyPokemon.id, 'enemy', () => {
  console.log('Pokémon desmaiou');
});

// Troca de Pokémon
sprites.playSwitch(newPokemon.id, 'player', () => {
  console.log('Pokémon entrou em campo');
});
```

### 3. Integração com Battle Engine

No `processEvent` da `battle-ui.tsx`:

```typescript
const processEvent = async (event: BattleEvent): Promise<void> => {
  // ... código existente ...

  if (event.type === 'attack' && event.move) {
    const attacker = event.side === 'player' ? player : enemy;
    
    // Registra Pokémon se ainda não estiver
    sprites.registerPokemon(attacker.id, attacker.name);
    
    // Toca animação de ataque
    await new Promise(resolve => {
      sprites.playAttack(attacker.id, event.side, resolve);
    });
    return;
  }

  if (event.type === 'damage' && event.nextHp !== undefined) {
    const target = event.side === 'player' ? player : enemy;
    
    // Toca animação de dano
    await Promise.all([
      new Promise(resolve => {
        sprites.playDamage(target.id, event.side, resolve);
      }),
      animateHPBar(side, event.nextHp, animationController),
    ]);

    // Atualiza HP
    if (event.side === 'player') {
      setPlayer(prev => prev ? { ...prev, currentHp: event.nextHp ?? 0 } : null);
    } else {
      setEnemy(prev => prev ? { ...prev, currentHp: event.nextHp ?? 0 } : null);
    }
    return;
  }
};
```

## 🎨 Customizar Animações

### Modificar Animação Existente

```typescript
import { SpriteEngine } from '@/features/battle/sprite-engine';
import { getAttackAnimation } from '@/features/battle/sprite-engine/predefined-animations';

const engine = new SpriteEngine();

// Criar config customizada
const charizardConfig: PokemonSpriteConfig = {
  pokemonId: 6,
  pokemonName: 'Charizard',
  sprites: getCompleteSpriteSet(6, 'Charizard'),
  animations: {
    idle: {
      name: 'idle',
      duration: 2000,
      loop: true,
      startY: 0,
      endY: -8,
    },
    attack: {
      name: 'attack',
      duration: 500,
      loop: false,
      startX: 0,
      endX: 30,
      scale: { from: 1, to: 1.15 },
      effect: 'shake',
    },
    hit: {
      name: 'hit',
      duration: 300,
      loop: false,
      effect: 'shake',
    },
  },
};

engine.registerPokemon(charizardConfig);
```

### Criar Animação por Tipo

```typescript
// fire-type attack
const fireAttack: AnimationData = {
  name: 'attack',
  duration: 400,
  loop: false,
  scale: { from: 1, to: 1.1 },
  effect: 'flash', // Flash effect para fogo
};

// water-type attack
const waterAttack: AnimationData = {
  name: 'attack',
  duration: 450,
  loop: false,
  startY: -10,
  endY: 10,
  effect: 'blur', // Blur para água
};
```

## 📊 Gerenciar Cache

```typescript
import { globalSpriteLoader } from '@/features/battle/sprite-engine';

// Ver estatísticas
const stats = globalSpriteLoader.getCacheStats();
console.log(stats);
// {
//   totalLoaded: 25,
//   totalCached: 25,
//   memoryUsage: 5242880, // bytes
//   hitRate: 0.92 // 92% hit rate
// }

// Limpar cache
globalSpriteLoader.clearCache();

// Remover cache específico
globalSpriteLoader.evict('https://...url...);

// Ajustar limite de cache (padrão 50MB)
globalSpriteLoader.setMaxRetries(5);
globalSpriteLoader.setRetryDelay(500);
```

## 🎯 Sincronização com Battle Events

No `resolveTurn` da `battle-engine.ts`, adicionar eventos de sprite:

```typescript
export const resolveTurn = (
  attacker: BattleFighter,
  defender: BattleFighter,
  move: BattleMove,
): BattleEvent[] => {
  const events: BattleEvent[] = [];
  const damage = calculateDamage(attacker, defender, move);

  // Event de sprite: ataque
  events.push({
    id: crypto.randomUUID(),
    batchId: crypto.randomUUID(),
    type: 'attack',
    side: /* attacker side */,
    move,
    text: `${attacker.name} usa ${move.name}!`,
    tone: 'neutral',
  });

  // Event de sprite: dano
  events.push({
    id: crypto.randomUUID(),
    batchId: crypto.randomUUID(),
    type: 'damage',
    side: /* defender side */,
    damage,
    nextHp: Math.max(0, defender.currentHp - damage),
    text: `Acertou em cheio!`,
    tone: damage >= 50 ? 'danger' : 'neutral',
  });

  return events;
};
```

## 🔧 Configuração do Motor

```typescript
import { SpriteEngine } from '@/features/battle/sprite-engine';

// Criar instância customizada
const engine = new SpriteEngine();

// Registrar Pokémon
engine.registerPokemon(charizardConfig);
engine.registerPokemon(blastioConfig);

// Iniciar
engine.start();

// Gerenciar animações
const id = engine.playAnimation(6, 'player', 'attack', () => {
  console.log('Ataque terminado');
});

// Parar tudo
engine.stop();

// Limpar recursos
engine.dispose();
```

## 📈 Performance

### Otimizações Automáticas

- ✅ Lazy loading de sprites
- ✅ Cache LRU com limite de memória
- ✅ Fallback automático (WebP → GIF → PNG)
- ✅ RequestAnimationFrame para smooth 60fps
- ✅ Preload com Promise.all
- ✅ Retry automático com backoff exponencial

### Monitorar Performance

```typescript
// Hook para monitorar eventos
sprites.on((event) => {
  console.log(event.type, event.data);
  // 'animation-start': animação iniciada
  // 'animation-end': animação terminada
  // 'sprite-loaded': sprite carregada com sucesso
  // 'sprite-failed': sprite falhou ao carregar
});
```

## 🎮 Exemplo Completo (Mini Battle)

```typescript
import { useSprites } from '@/features/battle/hooks/useSprites';
import { BattleField } from '@/features/battle/components/BattleField';
import { globalSpriteEngine } from '@/features/battle/sprite-engine';

const MiniBattle = () => {
  const sprites = useSprites({ autoStart: true });
  const [playerPokemon, setPlayerPokemon] = useState<BattleFighter | null>(null);
  const [enemyPokemon, setEnemyPokemon] = useState<BattleFighter | null>(null);

  const handleAttack = async () => {
    if (!playerPokemon || !enemyPokemon) return;

    // Simula ataque do jogador
    await new Promise(resolve => {
      sprites.playAttack(playerPokemon.id, 'player', resolve);
    });

    // Simula dano do inimigo
    await new Promise(resolve => {
      sprites.playDamage(enemyPokemon.id, 'enemy', resolve);
    });

    // Contra-ataque
    await new Promise(resolve => {
      sprites.playAttack(enemyPokemon.id, 'enemy', resolve);
    });

    // Dano no jogador
    await new Promise(resolve => {
      sprites.playDamage(playerPokemon.id, 'player', resolve);
    });
  };

  const handleSwitch = async (pokemonId: number) => {
    if (!playerPokemon) return;

    // Switch out
    await new Promise(resolve => {
      sprites.playSwitch(playerPokemon.id, 'player', resolve);
    });

    // Switch in
    const newPokemon = { ...playerPokemon, id: pokemonId };
    setPlayerPokemon(newPokemon);
    sprites.registerPokemon(pokemonId, newPokemon.name);
    
    await new Promise(resolve => {
      sprites.playSwitch(pokemonId, 'player', resolve);
    });
  };

  return (
    <div className="space-y-4">
      <BattleField
        playerPokemon={playerPokemon}
        enemyPokemon={enemyPokemon}
        spriteEngine={globalSpriteEngine}
      />
      
      <div className="flex gap-4">
        <button onClick={handleAttack} className="px-4 py-2 bg-red-500 text-white rounded">
          Atacar
        </button>
        <button onClick={() => handleSwitch(25)} className="px-4 py-2 bg-blue-500 text-white rounded">
          Trocar
        </button>
      </div>
    </div>
  );
};
```

## 🐛 Debug & Troubleshooting

### Sprites não carregando?

```typescript
// Verificar URLs
import { validateSpriteUrl } from '@/features/battle/sprite-engine';

const isValid = await validateSpriteUrl('https://...');
console.log('URL válida:', isValid);

// Monitorar eventos de erro
sprites.on(event => {
  if (event.type === 'sprite-failed') {
    console.error('Falha ao carregar:', event.data);
  }
});
```

### Animações não sincronizam?

```typescript
// Verificar logs de animação
const events = sprites.events;
events.forEach(event => {
  console.log(`[${event.timestamp}] ${event.type}`, event);
});

// Pausar para debug
const engine = sprites.engine;
engine.stop(); // Pausa animações
// ... inspecionar estados ...
engine.start(); // Retoma
```

### Performance lenta?

```typescript
// Verificar cache
const stats = globalSpriteLoader.getCacheStats();
console.log('Cache hit rate:', (stats.hitRate * 100).toFixed(1) + '%');
console.log('Memory:', (stats.memoryUsage / 1024 / 1024).toFixed(1) + 'MB');

// Limpar cache se necessário
if (stats.memoryUsage > 100 * 1024 * 1024) { // > 100MB
  globalSpriteLoader.clearCache();
}
```

## 📚 Referência de Tipos

Ver `sprite-engine.types.ts` para todas as interfaces disponíveis.

## 📝 Notas Técnicas

- Motor usa RAF (RequestAnimationFrame) para smooth 60fps
- Fallback em cascata: WebP → GIF → PNG
- Cache LRU com limite configurável (padrão 50MB)
- Animações são event-driven, não baseadas em delay fixo
- Suporte a múltiplas sprites por Pokémon (front, back, shiny)
- Integração com Framer Motion para renders suaves

## 🚀 Próximos Passos

1. Integrar com `battle-ui.tsx`
2. Adicionar suporte a modelo 3D (Three.js)
3. Criar painel de debug visual
4. Adicionar mais predefinições de animação
5. Otimizar para mobile
