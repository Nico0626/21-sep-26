/* =====================================================================
   ATRAPA LAS FLORES
   Juego web 2D — HTML5 Canvas + JavaScript vanilla. Sin librerías.

   Orden del archivo:
     1. CONFIG            — todos los valores que vas a querer tocar
     2. ASSETS            — rutas de imágenes y sonidos
     3. Loader            — carga con dibujo de reserva si falta un archivo
     4. Audio
     5. Screens           — loading / menú / juego / resultado
     6. Input             — teclado, botones táctiles y arrastre
     7. Estado del juego
     8. Player
     9. Flowers / Obstacles / Particles
    10. Colisiones
    11. Bucle principal y render
    12. Resultado
    13. Arranque
   ===================================================================== */
'use strict';

/* =====================================================================
   1. CONFIG
   ===================================================================== */

const CONFIG = {
  GAME_DURATION: 30,        // segundos de partida
  INITIAL_LIVES: 3,         // corazones
  FLOWER_POINTS: 1,         // puntos por flor

  designHeight: 640,        // alto de referencia; todo escala a partir de acá
  countdownSteps: ['3', '2', '1', '¡Ya!'],
  countdownStepMs: 700,

  player: {
    heightRatio: 0.24,      // alto del personaje respecto del alto del canvas
    speedRatio: 0.85,       // ancho de pantalla por segundo
    // Zona de la canasta dentro del sprite (0–1 sobre el ancho y alto del sprite)
    basket: { x: 0.14, y: 0.58, w: 0.72, h: 0.28 },
    hitTolerance: 0.12      // margen extra de colisión (fracción del sprite)
  },

  flower: {
    sizeRatio: 0.095,       // tamaño respecto del alto del canvas
    sizeJitter: 0.25,       // variación de tamaño ±25 %
    speedRatio: 0.34,       // caída base: alto de pantalla por segundo
    speedJitter: 0.35,
    spinMax: 2.2            // rad/s
  },

  obstacle: {
    sizeRatio: 0.085,
    sizeJitter: 0.18,
    speedRatio: 0.38,
    speedJitter: 0.3,
    spinMax: 1.4
  },

  // Dificultad: se interpola de "start" a "end" a lo largo de la partida
  difficulty: {
    spawnIntervalStart: 0.50,   // segundos entre objetos al empezar
    spawnIntervalEnd:   0.25,   // ...y al terminar
    speedMultStart: 1.0,
    speedMultEnd:   1.55,
    obstacleChanceStart: 0.18,  // probabilidad de que el objeto sea obstáculo
    obstacleChanceEnd:   0.45,
    doubleSpawnChance: 0.18     // a veces caen dos a la vez (en la 2ª mitad)
  },

  effects: {
    maxParticles: 90,
    particlesPerCatch: 8,
    shakeOnHit: 12,             // píxeles de sacudida
    invulnerableAfterHit: 0.6   // segundos sin poder recibir otro golpe
  },

  // Rangos del resultado. Editá los mínimos, el ramo, la chica y el mensaje.
  RESULT_TIERS: [
    { min: 0,  bouquet: 'bouquetSmall',  girl: 'girlSmall',  label: 'pequeño',
      message: '¡Wooow que ramo mas grande!!(sarcasmo) 🌼' },
    { min: 25, bouquet: 'bouquetMedium', girl: 'girlMedium', label: 'mediano',
      message: '¡Re inutil! Pero grachias! 💛' },
    { min: 35, bouquet: 'bouquetBig',    girl: 'girlBig',    label: 'grande',
      message: '¡Me encantaaaa! 🌼🌼🌼' },
    { min: 50, bouquet: 'bouquetHuge',   girl: 'girlHuge',   label: 'enorme',
      message: '¡Y yo que hago con tantas flores! te amu<3 💐✨' }
  ],

  // El ramo además crece de forma continua según la puntuación
  bouquetScale: { min: 0.55, perFlower: 0.022, max: 1.6 },

  loadingScreen: {
    flowerCount: 46,
    minMs: 1400,      // tiempo mínimo en pantalla
    clearMs: 900      // duración de la animación de despeje
  },

  audioVolume: 0.5,
  dragToMove: true    // en celular también se puede arrastrar el dedo
};

/* =====================================================================
   2. ASSETS  (cambiá acá las rutas; la lógica no depende de los archivos)
   ===================================================================== */

const IMAGE_PATHS = {
  player:        'assets/character/player.png',
  flower:        'assets/flowers/flower_yellow.png',
  obstacle:      'assets/obstacles/obstacle.png',
  heart:         'assets/ui/heart.png',
  heartEmpty:    'assets/ui/heart_empty.png',
  arrowLeft:     'assets/ui/arrow_left.png',
  arrowRight:    'assets/ui/arrow_right.png',
  background:    'assets/background/background.png',
  bouquetSmall:  'assets/bouquets/bouquet_small.png',
  bouquetMedium: 'assets/bouquets/bouquet_medium.png',
  bouquetBig:    'assets/bouquets/bouquet_big.png',
  bouquetHuge:   'assets/bouquets/bouquet_huge.png',
  girlSmall:     'assets/girl/girl_small.gif',
  girlMedium:    'assets/girl/girl_medium.gif',
  girlBig:       'assets/girl/girl_big.gif',
  girlHuge:      'assets/girl/girl_huge.gif'
};

const AUDIO_PATHS = {
  catch:    'assets/audio/catch.wav',
  hit:      'assets/audio/hit.wav',
  click:    'assets/audio/click.wav',
  gameover: 'assets/audio/gameover.wav'
};

/* =====================================================================
   3. LOADER
   Si un archivo no existe, se dibuja un reemplazo con Canvas para que el
   juego nunca se rompa. Al poner la imagen real, no hay nada más que tocar.
   ===================================================================== */

const Assets = { img: {} };

function drawFallback(key) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');

  const circle = (x, y, r, fill) => {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
  };
  const flowerAt = (cx, cy, r, petal, core) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      circle(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.42, petal);
    }
    circle(cx, cy, r * 0.38, core);
  };

  if (key === 'player') {
    c.width = 112; c.height = 136;
    g.fillStyle = '#ffd6af'; g.fillRect(40, 8, 32, 34);          // cabeza
    g.fillStyle = '#4a3026'; g.fillRect(36, 4, 40, 14);          // pelo
    g.fillStyle = '#282028'; g.fillRect(48, 24, 6, 6); g.fillRect(62, 24, 6, 6);
    g.fillStyle = '#4a90e2'; g.fillRect(34, 44, 44, 40);         // torso
    g.fillStyle = '#3d445e'; g.fillRect(40, 84, 12, 36); g.fillRect(60, 84, 12, 36);
    g.fillStyle = '#c98d4a'; g.fillRect(14, 78, 84, 42);         // canasta
    g.fillStyle = '#96622e';
    for (let x = 18; x < 96; x += 12) g.fillRect(x, 78, 4, 42);
  } else if (key === 'flower') {
    c.width = c.height = 64;
    g.fillStyle = '#56a84a'; g.fillRect(29, 34, 6, 28);
    flowerAt(32, 28, 26, '#ffd030', '#f78d20');
  } else if (key === 'obstacle') {
    c.width = c.height = 64;
    g.fillStyle = '#8a7e74';
    g.beginPath(); g.ellipse(32, 36, 26, 20, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b2a69a';
    g.beginPath(); g.ellipse(26, 28, 14, 8, -0.3, 0, Math.PI * 2); g.fill();
  } else if (key === 'heart' || key === 'heartEmpty') {
    c.width = c.height = 64;
    g.fillStyle = key === 'heart' ? '#e83e5c' : '#46424f';
    g.beginPath();
    g.moveTo(32, 56); g.bezierCurveTo(-6, 30, 12, 4, 32, 22);
    g.bezierCurveTo(52, 4, 70, 30, 32, 56); g.fill();
  } else if (key === 'arrowLeft' || key === 'arrowRight') {
    c.width = c.height = 128;
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath();
    if (key === 'arrowLeft') { g.moveTo(84, 28); g.lineTo(84, 100); g.lineTo(40, 64); }
    else { g.moveTo(44, 28); g.lineTo(44, 100); g.lineTo(88, 64); }
    g.closePath(); g.fill();
  } else if (key === 'background') {
    c.width = 720; c.height = 1200;
    const grad = g.createLinearGradient(0, 0, 0, 1200);
    grad.addColorStop(0, '#7ec8f0'); grad.addColorStop(.6, '#a8ddf5');
    grad.addColorStop(1, '#8ccf7a');
    g.fillStyle = grad; g.fillRect(0, 0, 720, 1200);
    g.fillStyle = '#66b25a'; g.fillRect(0, 1080, 720, 120);
  } else if (key.startsWith('bouquet')) {
    const n = { bouquetSmall: 4, bouquetMedium: 9, bouquetBig: 16, bouquetHuge: 28 }[key] || 6;
    c.width = c.height = 128;
    g.strokeStyle = '#367a32'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(64, 120); g.lineTo(64, 60); g.stroke();
    g.fillStyle = '#f6eace'; g.fillRect(50, 78, 28, 44);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, rad = 34 * Math.sqrt(i / n);
      flowerAt(64 + Math.cos(a) * rad, 54 + Math.sin(a) * rad * .85, 12, '#ffd030', '#f78d20');
    }
  } else if (key.startsWith('girl')) {
    const n = { girlSmall: 3, girlMedium: 7, girlBig: 13, girlHuge: 22 }[key] || 5;
    c.width = 160; c.height = 184;
    g.fillStyle = '#ffd6af'; g.fillRect(60, 24, 40, 40);
    g.fillStyle = '#4a3026'; g.fillRect(54, 16, 52, 20);
    g.fillRect(54, 26, 10, 44); g.fillRect(96, 26, 10, 44);
    g.fillStyle = '#282028'; g.fillRect(68, 42, 6, 6); g.fillRect(86, 42, 6, 6);
    g.fillStyle = '#e86e96';
    g.beginPath(); g.moveTo(64, 64); g.lineTo(96, 64); g.lineTo(112, 132);
    g.lineTo(48, 132); g.closePath(); g.fill();
    g.fillStyle = '#ffd6af'; g.fillRect(64, 132, 12, 32); g.fillRect(84, 132, 12, 32);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, rad = 20 * Math.sqrt(i / n);
      flowerAt(80 + Math.cos(a) * rad, 96 + Math.sin(a) * rad * .8, 9, '#ffd030', '#f78d20');
    }
  } else {
    c.width = c.height = 48;
    g.fillStyle = '#e86e96'; g.fillRect(0, 0, 48, 48);
  }
  return c.toDataURL('image/png');
}

function loadImage(key, path) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {                     // archivo ausente → reemplazo
      const alt = new Image();
      alt.onload = () => resolve(alt);
      alt.src = drawFallback(key);
    };
    img.src = path;
  });
}

async function loadAllImages() {
  const keys = Object.keys(IMAGE_PATHS);
  const imgs = await Promise.all(keys.map(k => loadImage(k, IMAGE_PATHS[k])));
  keys.forEach((k, i) => { Assets.img[k] = imgs[i]; });
}

/* =====================================================================
   4. AUDIO  (si falta un archivo, el juego sigue sin errores)
   ===================================================================== */

const Sound = {
  clips: {},
  enabled: true,

  init() {
    for (const [key, path] of Object.entries(AUDIO_PATHS)) {
      const a = new Audio();
      a.preload = 'auto';
      a.volume = CONFIG.audioVolume;
      a.addEventListener('error', () => { this.clips[key] = null; }, { once: true });
      a.src = path;
      this.clips[key] = a;
    }
  },

  play(key) {
    if (!this.enabled) return;
    const base = this.clips[key];
    if (!base) return;
    try {
      const node = base.cloneNode();
      node.volume = CONFIG.audioVolume;
      const p = node.play();
      if (p && p.catch) p.catch(() => {});   // autoplay bloqueado: se ignora
    } catch (_) { /* sin audio, sin drama */ }
  }
};

/* =====================================================================
   5. SCREENS
   ===================================================================== */

const screens = {
  loading: document.getElementById('screen-loading'),
  menu:    document.getElementById('screen-menu'),
  game:    document.getElementById('screen-game'),
  result:  document.getElementById('screen-result')
};

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('is-active', key === name);
  }
}

/* ---- pantalla de carga: campo de flores que después se despeja -------- */
function buildLoadingField() {
  const field = document.getElementById('loading-field');
  const url = `url("${Assets.img.flower.src}")`;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < CONFIG.loadingScreen.flowerCount; i++) {
    const el = document.createElement('div');
    el.className = 'bloom';
    const size = 46 + Math.random() * 86;
    const x = Math.random() * 100, y = Math.random() * 100;
    el.style.cssText =
      `--flower:${url};--s:${size}px;--r:${Math.random() * 360}deg;` +
      `--d:${(1.6 + Math.random() * 1.6).toFixed(2)}s;` +
      `--delay:${(-Math.random() * 2).toFixed(2)}s;` +
      `--fx:${((x - 50) * 3.2).toFixed(0)}vw;--fy:${((y - 50) * 3.2).toFixed(0)}vh;` +
      `left:${x}%;top:${y}%;`;
    frag.appendChild(el);
  }
  field.appendChild(frag);
  return field;
}

function clearLoadingField(field) {
  field.classList.add('is-clearing');
}

/* =====================================================================
   6. INPUT
   ===================================================================== */

const Input = {
  left: false,
  right: false,
  dragX: null,          // posición horizontal del dedo/mouse sobre el canvas
  isTouch: false,

  init(canvas) {
    /* --- teclado --- */
    const keyMap = {
      ArrowLeft: 'left', ArrowRight: 'right',
      a: 'left', A: 'left', d: 'right', D: 'right'
    };
    addEventListener('keydown', e => {
      const dir = keyMap[e.key];
      if (dir) { this[dir] = true; e.preventDefault(); }
    });
    addEventListener('keyup', e => {
      const dir = keyMap[e.key];
      if (dir) { this[dir] = false; e.preventDefault(); }
    });
    addEventListener('blur', () => { this.left = this.right = false; this.dragX = null; });

    /* --- botones táctiles (Pointer Events: touch, mouse y lápiz) --- */
    const bind = (el, dir) => {
      let activeId = null;
      const press = e => {
        e.preventDefault();
        activeId = e.pointerId;
        this[dir] = true;
        el.classList.add('is-down');
        if (el.setPointerCapture && e.pointerId != null) {
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
        }
      };
      const release = e => {
        // Con dos dedos en pantalla, solo suelta el que había presionado
        if (e && e.pointerId != null && activeId != null && e.pointerId !== activeId) return;
        activeId = null;
        this[dir] = false;
        el.classList.remove('is-down');
      };
      el.addEventListener('pointerdown', press);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('contextmenu', e => e.preventDefault());
      // Red de seguridad: si el pointerup se pierde, soltamos igual
      addEventListener('pointerup', release);
      addEventListener('pointercancel', release);
    };
    bind(document.getElementById('btn-left'), 'left');
    bind(document.getElementById('btn-right'), 'right');

    /* --- arrastre sobre el canvas: alternativa cómoda a una mano --- */
    if (CONFIG.dragToMove) {
      const setDrag = e => {
        const r = canvas.getBoundingClientRect();
        this.dragX = e.clientX - r.left;
      };
      canvas.addEventListener('pointerdown', e => { e.preventDefault(); setDrag(e); });
      canvas.addEventListener('pointermove', e => { if (this.dragX !== null) setDrag(e); });
      const stop = () => { this.dragX = null; };
      canvas.addEventListener('pointerup', stop);
      canvas.addEventListener('pointercancel', stop);
      canvas.addEventListener('pointerleave', stop);
    }

    /* --- detectar si conviene mostrar las flechas --- */
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const controls = document.getElementById('touch-controls');
    controls.style.setProperty('--arrow-left', `url("${Assets.img.arrowLeft.src}")`);
    controls.style.setProperty('--arrow-right', `url("${Assets.img.arrowRight.src}")`);
    controls.classList.toggle('is-on', this.isTouch);
    if (this.isTouch) {
      document.getElementById('menu-hint').textContent =
        'Usá las flechas de abajo, o deslizá el dedo';
    }

    /* --- nada de scroll ni zoom mientras se juega --- */
    document.addEventListener('touchmove', e => {
      if (e.target.closest('.panel')) return;   // los paneles sí pueden scrollear
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
  },

  reset() { this.left = this.right = false; this.dragX = null; }
};

/* =====================================================================
   7. ESTADO DEL JUEGO
   ===================================================================== */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const view = { w: 0, h: 0, scale: 1, dpr: 1 };

const State = {
  phase: 'idle',          // idle | countdown | playing | over
  score: 0,
  lives: CONFIG.INITIAL_LIVES,
  timeLeft: CONFIG.GAME_DURATION,
  elapsed: 0,
  spawnTimer: 0,
  invulnerable: 0,
  shake: 0,
  endedByLives: false
};

const flowers = [];
const obstacles = [];
const particles = [];
const pops = [];          // pequeños destellos al atrapar/golpear

function resetState() {
  State.score = 0;
  State.lives = CONFIG.INITIAL_LIVES;
  State.timeLeft = CONFIG.GAME_DURATION;
  State.elapsed = 0;
  State.spawnTimer = 0;
  State.invulnerable = 0;
  State.shake = 0;
  State.endedByLives = false;
  flowers.length = obstacles.length = particles.length = pops.length = 0;
  Input.reset();
  Player.reset();
  UI.renderAll();
}

/* ---- canvas responsive (nítido, sin deformar sprites) ---------------- */
function resize() {
  const rect = canvas.getBoundingClientRect();
  view.dpr = Math.min(devicePixelRatio || 1, 2);   // tope 2 por rendimiento
  view.w = Math.max(1, rect.width);
  view.h = Math.max(1, rect.height);
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;               // pixel art nítido
  view.scale = view.h / CONFIG.designHeight;
  Player.resize();
}

/* =====================================================================
   8. PLAYER
   ===================================================================== */

const Player = {
  x: 0, y: 0, w: 0, h: 0,
  tilt: 0,

  resize() {
    const img = Assets.img.player;
    this.h = view.h * CONFIG.player.heightRatio;
    this.w = this.h * (img.width / img.height);
    this.y = view.h - this.h - view.h * 0.03;
    this.x = Math.min(Math.max(this.x || view.w / 2, this.w / 2), view.w - this.w / 2);
  },

  reset() {
    this.x = view.w / 2;
    this.tilt = 0;
    this.resize();
  },

  update(dt) {
    const speed = view.w * CONFIG.player.speedRatio;
    let dir = 0;
    if (Input.left) dir -= 1;
    if (Input.right) dir += 1;

    if (dir !== 0) {
      this.x += dir * speed * dt;
    } else if (Input.dragX !== null) {
      // seguimiento suave del dedo
      const diff = Input.dragX - this.x;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
      this.x += step;
      dir = Math.sign(diff) * (Math.abs(diff) > 2 ? 1 : 0);
    }

    // límites de pantalla
    const half = this.w / 2;
    this.x = Math.min(Math.max(this.x, half), view.w - half);

    // pequeña inclinación al moverse
    this.tilt += (dir * 0.09 - this.tilt) * Math.min(1, dt * 10);
  },

  /** Rectángulo de la canasta, con tolerancia. */
  basketRect() {
    const b = CONFIG.player.basket;
    const tol = CONFIG.player.hitTolerance;
    const left = this.x - this.w / 2;
    return {
      x: left + this.w * (b.x - tol / 2),
      y: this.y + this.h * (b.y - tol / 2),
      w: this.w * (b.w + tol),
      h: this.h * (b.h + tol)
    };
  },

  draw() {
    const img = Assets.img.player;
    ctx.save();
    ctx.translate(this.x, this.y + this.h);
    ctx.rotate(this.tilt);
    ctx.drawImage(img, -this.w / 2, -this.h, this.w, this.h);
    ctx.restore();
  }
};

/* =====================================================================
   9. FLOWERS / OBSTACLES / PARTICLES
   ===================================================================== */

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }

/** Progreso de dificultad: 0 al empezar, 1 al terminar. */
function progress() {
  return Math.min(1, State.elapsed / CONFIG.GAME_DURATION);
}

function spawnOne() {
  const p = progress();
  const d = CONFIG.difficulty;
  const isObstacle = Math.random() < lerp(d.obstacleChanceStart, d.obstacleChanceEnd, p);
  const cfg = isObstacle ? CONFIG.obstacle : CONFIG.flower;
  const img = isObstacle ? Assets.img.obstacle : Assets.img.flower;
  const speedMult = lerp(d.speedMultStart, d.speedMultEnd, p);

  const size = view.h * cfg.sizeRatio * rand(1 - cfg.sizeJitter, 1 + cfg.sizeJitter);
  const obj = {
    w: size,
    h: size * (img.height / img.width),
    x: rand(size, view.w - size),
    y: -size,
    vy: view.h * cfg.speedRatio * rand(1 - cfg.speedJitter, 1 + cfg.speedJitter) * speedMult,
    rot: rand(0, Math.PI * 2),
    spin: rand(-cfg.spinMax, cfg.spinMax),
    sway: rand(0, Math.PI * 2),
    swayAmp: isObstacle ? 0 : rand(0, view.w * 0.03)
  };
  (isObstacle ? obstacles : flowers).push(obj);
}

function updateSpawner(dt) {
  const d = CONFIG.difficulty;
  State.spawnTimer -= dt;
  if (State.spawnTimer <= 0) {
    spawnOne();
    if (progress() > 0.5 && Math.random() < d.doubleSpawnChance) spawnOne();
    State.spawnTimer = lerp(d.spawnIntervalStart, d.spawnIntervalEnd, progress());
  }
}

function updateFalling(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
    o.y += o.vy * dt;
    o.rot += o.spin * dt;
    o.sway += dt * 2;
    if (o.y - o.h > view.h) list.splice(i, 1);       // fuera de pantalla
  }
}

function drawFalling(list, img) {
  for (const o of list) {
    ctx.save();
    ctx.translate(o.x + Math.sin(o.sway) * o.swayAmp, o.y);
    ctx.rotate(o.rot);
    ctx.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
    ctx.restore();
  }
}

/* ---- partículas y destellos ------------------------------------------ */
function spawnParticles(x, y, color, count) {
  const room = CONFIG.effects.maxParticles - particles.length;
  const n = Math.min(count, Math.max(0, room));
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(60, 220) * view.scale;
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60 * view.scale,
      life: rand(0.35, 0.7), age: 0,
      size: rand(3, 7) * view.scale,
      color
    });
  }
}

function spawnPop(x, y, img, size) {
  pops.push({ x, y, img, size, age: 0, life: 0.35 });
}

function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 900 * view.scale * dt;
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    pops[i].age += dt;
    if (pops[i].age >= pops[i].life) pops.splice(i, 1);
  }
}

function drawEffects() {
  for (const p of particles) {
    const t = 1 - p.age / p.life;
    ctx.globalAlpha = t;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const p of pops) {
    const t = p.age / p.life;
    ctx.globalAlpha = 1 - t;
    const s = p.size * (1 + t * 1.1);
    ctx.drawImage(p.img, p.x - s / 2, p.y - s / 2 - t * 30 * view.scale, s, s);
  }
  ctx.globalAlpha = 1;
}

/* =====================================================================
   10. COLISIONES
   ===================================================================== */

function overlaps(rect, o) {
  const ox = o.x + Math.sin(o.sway) * o.swayAmp;
  return ox + o.w * 0.4 > rect.x &&
         ox - o.w * 0.4 < rect.x + rect.w &&
         o.y + o.h * 0.4 > rect.y &&
         o.y - o.h * 0.4 < rect.y + rect.h;
}

function checkCollisions() {
  const basket = Player.basketRect();

  // canasta + flor = capturada
  for (let i = flowers.length - 1; i >= 0; i--) {
    const f = flowers[i];
    if (!overlaps(basket, f)) continue;
    flowers.splice(i, 1);
    State.score += CONFIG.FLOWER_POINTS;
    spawnParticles(f.x, f.y, '#ffd030', CONFIG.effects.particlesPerCatch);
    spawnPop(f.x, f.y, Assets.img.flower, f.w);
    Sound.play('catch');
    UI.renderScore(true);
  }

  // canasta + obstáculo = daño
  if (State.invulnerable <= 0) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (!overlaps(basket, o)) continue;
      obstacles.splice(i, 1);
      State.lives--;
      State.invulnerable = CONFIG.effects.invulnerableAfterHit;
      State.shake = CONFIG.effects.shakeOnHit * view.scale;
      spawnParticles(o.x, o.y, '#8a7e74', 10);
      spawnPop(o.x, o.y, Assets.img.obstacle, o.w);
      Sound.play('hit');
      UI.renderLives(true);
      if (State.lives <= 0) { State.endedByLives = true; endGame(); }
      break;
    }
  }
}

/* =====================================================================
   11. UI, BUCLE PRINCIPAL Y RENDER
   ===================================================================== */

const UI = {
  score: document.querySelector('#hud-score b'),
  time:  document.querySelector('#hud-time b'),
  timeBox: document.getElementById('hud-time'),
  scoreBox: document.getElementById('hud-score'),
  livesBox: document.getElementById('hud-lives'),
  lastTime: -1,

  renderAll() { this.renderScore(); this.renderLives(); this.renderTime(true); },

  renderScore(pulse) {
    this.score.textContent = State.score;
    if (pulse) this.bump(this.scoreBox);
  },

  renderLives(pulse) {
    if (this.livesBox.children.length !== CONFIG.INITIAL_LIVES) {
      this.livesBox.innerHTML = '';
      for (let i = 0; i < CONFIG.INITIAL_LIVES; i++) {
        const img = new Image();
        img.src = Assets.img.heart.src;
        img.alt = '';
        this.livesBox.appendChild(img);
      }
    }
    [...this.livesBox.children].forEach((img, i) => {
      const lost = i >= State.lives;
      img.classList.toggle('is-lost', lost);
      img.src = lost ? Assets.img.heartEmpty.src : Assets.img.heart.src;
    });
    if (pulse) this.bump(this.livesBox);
  },

  renderTime(force) {
    const t = Math.max(0, Math.ceil(State.timeLeft));
    if (t === this.lastTime && !force) return;
    this.lastTime = t;
    this.time.textContent = t;
    this.timeBox.classList.toggle('is-urgent', t <= 5);
    if (t <= 5 && t > 0) this.bump(this.timeBox);
  },

  bump(el) {
    el.classList.remove('is-pulsing');
    void el.offsetWidth;                  // reinicia la animación
    el.classList.add('is-pulsing');
  }
};

let lastFrame = 0;
let rafId = 0;

function loop(now) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);   // tope: evita saltos
  lastFrame = now;
  if (dt <= 0) return;

  if (State.phase === 'playing') {
    State.elapsed += dt;
    State.timeLeft = Math.max(0, CONFIG.GAME_DURATION - State.elapsed);
    State.invulnerable = Math.max(0, State.invulnerable - dt);
    State.shake *= Math.pow(0.001, dt);

    Player.update(dt);
    updateSpawner(dt);
    updateFalling(flowers, dt);
    updateFalling(obstacles, dt);
    checkCollisions();
    UI.renderTime();

    if (State.timeLeft <= 0) endGame();
  } else if (State.phase === 'countdown') {
    Player.update(dt);
  }

  if (State.phase === 'idle') return;   // menú o carga: no hace falta dibujar
  updateEffects(dt);
  render();
}

function render() {
  const shake = State.shake > 0.3
    ? { x: rand(-State.shake, State.shake), y: rand(-State.shake, State.shake) }
    : { x: 0, y: 0 };

  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawBackground();
  drawFalling(flowers, Assets.img.flower);
  drawFalling(obstacles, Assets.img.obstacle);

  // parpadeo tras recibir un golpe
  const blink = State.invulnerable > 0 && Math.floor(State.invulnerable * 12) % 2 === 0;
  if (!blink) Player.draw();

  drawEffects();
  ctx.restore();
}

function drawBackground() {
  const img = Assets.img.background;
  // "cover": llena la pantalla sin deformar la imagen
  const scale = Math.max(view.w / img.width, view.h / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (view.w - w) / 2, view.h - h, w, h);
}

/* =====================================================================
   FLUJO DE PARTIDA
   ===================================================================== */

function startGame() {
  resetState();
  showScreen('game');
  resize();
  State.phase = 'countdown';
  runCountdown(() => { State.phase = 'playing'; });
}

function runCountdown(done) {
  const el = document.getElementById('countdown');
  let i = 0;
  const step = () => {
    if (i >= CONFIG.countdownSteps.length) { el.classList.remove('is-on'); done(); return; }
    el.textContent = CONFIG.countdownSteps[i++];
    el.classList.remove('is-on');
    void el.offsetWidth;
    el.classList.add('is-on');
    setTimeout(step, CONFIG.countdownStepMs);
  };
  step();
}

function endGame() {
  if (State.phase === 'over') return;
  State.phase = 'over';
  Input.reset();
  Sound.play('gameover');
  setTimeout(() => showResult(), 550);
}

/* =====================================================================
   12. RESULTADO
   ===================================================================== */

function tierFor(score) {
  let tier = CONFIG.RESULT_TIERS[0];
  for (const t of CONFIG.RESULT_TIERS) if (score >= t.min) tier = t;
  return tier;
}

function showResult() {
  const score = State.score;
  const tier = tierFor(score);

  document.getElementById('result-title').textContent =
    State.endedByLives ? '¡Se acabaron los corazones!' : '¡Tiempo terminado!';

  document.getElementById('result-message').textContent = tier.message;
  document.getElementById('result-player').src = Assets.img.player.src;
  document.getElementById('result-girl').src = Assets.img[tier.girl].src;

  const bq = document.getElementById('result-bouquet');
  bq.src = Assets.img[tier.bouquet].src;
  bq.alt = `Ramo ${tier.label}`;
  const s = CONFIG.bouquetScale;
  bq.style.setProperty('--bq',
    Math.min(s.max, s.min + score * s.perFlower).toFixed(2));

  showScreen('result');
  countUpTo(score);
}

/** El contador sube desde 0 para darle un poco de emoción al final. */
function countUpTo(target) {
  const el = document.getElementById('result-count');
  const dur = Math.min(1200, 260 + target * 45);
  const t0 = performance.now();
  el.classList.add('is-counting');
  const tick = now => {
    const t = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
    else el.classList.remove('is-counting');
  };
  requestAnimationFrame(tick);
}

/* =====================================================================
   13. ARRANQUE
   ===================================================================== */

async function boot() {
  await loadAllImages();
  Sound.init();

  const field = buildLoadingField();
  Input.init(canvas);
  resize();
  UI.renderAll();

  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 150));

  document.getElementById('btn-play').addEventListener('click', () => {
    Sound.play('click');
    startGame();
  });
  document.getElementById('btn-replay').addEventListener('click', () => {
    Sound.play('click');
    startGame();
  });

  lastFrame = performance.now();
  rafId = requestAnimationFrame(loop);

  // Despejar el campo de flores y mostrar el menú
  setTimeout(() => {
    clearLoadingField(field);
    setTimeout(() => showScreen('menu'), CONFIG.loadingScreen.clearMs * 0.5);
  }, CONFIG.loadingScreen.minMs);
}

// Pausa la partida si la pestaña queda en segundo plano
document.addEventListener('visibilitychange', () => {
  if (document.hidden) Input.reset();
  lastFrame = performance.now();
});

boot();
