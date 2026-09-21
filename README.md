# 🌼 Atrapa las Flores

Juego web 2D en HTML5 Canvas + JavaScript vanilla. Sin backend, sin base de datos,
sin librerías y sin instalación: se abre con un enlace desde PC, tablet o celular.

```
atrapa-las-flores/
├── index.html
├── style.css
├── game.js
├── build_single_file.py     ← opcional: arma un único .html con todo embebido
└── assets/
    ├── character/player.png
    ├── flowers/flower_yellow.png
    ├── obstacles/obstacle.png
    ├── girl/girl_small.gif · girl_medium.gif · girl_big.gif · girl_huge.gif
    ├── bouquets/bouquet_small.png · _medium · _big · _huge
    ├── ui/heart.png · heart_empty.png · arrow_left.png · arrow_right.png
    ├── background/background.png
    └── audio/catch.wav · hit.wav · click.wav · gameover.wav
```

Todos los assets incluidos son **placeholders en pixel art** generados para que el
juego funcione de punta a punta desde el primer momento. Se reemplazan por los
tuyos sin tocar una línea de lógica.

---

## 1. Cómo ejecutarlo localmente

El juego carga imágenes y sonidos, así que conviene servirlo por HTTP en lugar de
abrir el archivo con doble clic (algunos navegadores bloquean `file://`).

```bash
cd atrapa-las-flores
python3 -m http.server 8000
```

Abrí `http://localhost:8000`.

Para probarlo desde el celular en la misma red WiFi, averiguá la IP de la
computadora (`ipconfig` en Windows, `ip a` en Linux/Mac) y entrá desde el teléfono
a `http://TU-IP:8000`.

Alternativas: `npx serve`, la extensión *Live Server* de VS Code, o cualquier
servidor estático.

---

## 2. Cómo agregar o reemplazar imágenes

Dejá el archivo nuevo con **el mismo nombre y en la misma carpeta**, y listo.

Si querés usar otros nombres o formatos, están todos juntos arriba de `game.js`:

```js
const IMAGE_PATHS = {
  player:   'assets/character/player.png',
  flower:   'assets/flowers/flower_yellow.png',
  obstacle: 'assets/obstacles/obstacle.png',
  ...
};
```

Recomendaciones:

- PNG con **fondo transparente** para personaje, flores, obstáculos, ramos y corazones.
- El personaje se escala por altura y conserva su proporción: no importa el tamaño
  exacto del archivo, pero sí que la canasta esté en la parte baja del sprite.
- Si cambiás la composición del personaje, ajustá la zona de la canasta en
  `CONFIG.player.basket` (valores de 0 a 1 sobre el ancho y alto del sprite).
- La chica del final usa GIF animado; se puede usar PNG sin problema.
- Si falta un archivo, el juego **no se rompe**: dibuja un reemplazo con Canvas.

---

## 3. Cómo cambiar la duración

En `game.js`, arriba de todo:

```js
CONFIG.GAME_DURATION = 30;   // segundos
CONFIG.INITIAL_LIVES = 3;    // corazones
CONFIG.FLOWER_POINTS = 1;    // puntos por flor
```

La cuenta regresiva inicial también es configurable:

```js
CONFIG.countdownSteps  = ['3', '2', '1', '¡Ya!'];
CONFIG.countdownStepMs = 700;
```

---

## 4. Cómo cambiar la dificultad

Todo el bloque `CONFIG.difficulty` interpola linealmente entre el inicio (`...Start`)
y el final (`...End`) de la partida:

```js
difficulty: {
  spawnIntervalStart: 0.70,  // segundos entre objetos al empezar
  spawnIntervalEnd:   0.32,  // ...y al terminar  (más chico = más objetos)
  speedMultStart: 1.0,
  speedMultEnd:   1.55,      // más grande = caen más rápido sobre el final
  obstacleChanceStart: 0.12, // 12 % de los objetos son obstáculos al empezar
  obstacleChanceEnd:   0.34,
  doubleSpawnChance:   0.18  // en la segunda mitad, a veces caen dos juntos
}
```

Para hacerlo más fácil: subí `spawnIntervalEnd`, bajá `speedMultEnd` y bajá
`obstacleChanceEnd`.

La velocidad base y el tamaño de cada objeto están en `CONFIG.flower` y
`CONFIG.obstacle`. Los valores son proporcionales al alto de la pantalla, así que
la dificultad se siente igual en celular y en PC.

La tolerancia de las colisiones se ajusta con `CONFIG.player.hitTolerance`
(más alto = más fácil atrapar, pero también más fácil recibir golpes).

---

## 5. Cómo cambiar los rangos del resultado

```js
RESULT_TIERS: [
  { min: 0,  bouquet: 'bouquetSmall',  girl: 'girlSmall',  label: 'pequeño',
    message: '¡Cada flor cuenta! 🌼' },
  { min: 10, bouquet: 'bouquetMedium', girl: 'girlMedium', label: 'mediano',
    message: '¡Muy lindo ramo! 💛' },
  { min: 20, bouquet: 'bouquetBig',    girl: 'girlBig',    label: 'grande',
    message: '¡Qué cantidad de flores! 🌼🌼🌼' },
  { min: 30, bouquet: 'bouquetHuge',   girl: 'girlHuge',   label: 'enorme',
    message: '¡Un ramo enorme! 💐✨' }
]
```

Se toma el último rango cuyo `min` sea menor o igual a la puntuación, así que podés
agregar o quitar rangos libremente (por ejemplo uno de `min: 45`), siempre en orden
ascendente. `bouquet` y `girl` son claves de `IMAGE_PATHS`.

Además del cambio de imagen, el ramo **crece de forma continua** con la puntuación:

```js
bouquetScale: { min: 0.55, perFlower: 0.022, max: 1.6 }
```

Es decir: escala = `min + flores × perFlower`, con tope en `max`. Con 0 flores el
ramo se ve mínimo; con 40 o más, enorme.

---

## 6. Cómo publicarlo gratis con GitHub Pages

1. Creá un repositorio en GitHub, por ejemplo `atrapa-las-flores`.
2. Subí el contenido de esta carpeta a la raíz del repo (que `index.html` quede
   arriba de todo, no dentro de otra carpeta):

```bash
cd atrapa-las-flores
git init
git add .
git commit -m "Atrapa las Flores"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/atrapa-las-flores.git
git push -u origin main
```

3. En GitHub: **Settings → Pages**. En *Source* elegí `Deploy from a branch`,
   rama `main`, carpeta `/ (root)`. Guardá.
4. En uno o dos minutos el juego queda en:
   `https://TU-USUARIO.github.io/atrapa-las-flores/`

Ese enlace se abre igual desde Android, iPhone, tablet o PC.

Detalles a tener en cuenta:

- GitHub Pages distingue mayúsculas de minúsculas en los nombres de archivo.
  `Player.PNG` no es lo mismo que `player.png`.
- Si actualizás un asset y seguís viendo el viejo, es la caché: recargá con
  Ctrl+F5, o renombrá el archivo.
- Netlify y Vercel funcionan igual: arrastrás la carpeta y te dan el enlace.

### Versión de un solo archivo

`build_single_file.py` arma un `atrapa-las-flores.html` con el CSS, el JS y todos
los assets embebidos en base64. Sirve para mandar el juego por WhatsApp o mail, o
para subir un único archivo a cualquier hosting:

```bash
python3 build_single_file.py
```

Para trabajar y mantener el proyecto, usá siempre la versión de tres archivos.

---

## Controles

| | |
|---|---|
| PC | ← → o A / D |
| Celular | flechas táctiles abajo, o arrastrar el dedo sobre el juego |

Las flechas aparecen solas cuando el navegador informa una pantalla táctil
(`pointer: coarse`). Para forzarlas siempre, cambiá `Input.isTouch` en `game.js`.
