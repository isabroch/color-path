/* initialize canvas */
const canvas = document.querySelector('#grid');
const settingsMenu = document.querySelector('#settings');
const ctx = canvas.getContext("2d");

// changeable variables and their defaults
const settings = {
    gridCount: 20,
    canvasSize: 300,
    opacity: 0.2,
    speed: 10,
    hueShift: 0.5, // any value between 0 - 360. 0 and 360 will never change color
    saturation: 80,
    lightness: 75,
    format: "grid", // "full" - solid block has no gap, "grid" - solid block has gap, "border" - only outer rectangle
    pathLimit: 30, // in "border" mode, shows a path of where the line has been going, declares the length of that path (i.e. 10 blocks long)
    minimumOpacity: 1, // minimum opacity every cell must be before square is considered complete, Infinity will never finish, 0 will finish once every cell has been touched at least once
}

function setSettings(newOpts) {
    Object.assign(settings, newOpts);
    settings.gridSize = settings.canvasSize / settings.gridCount;
}


function hslColor(hue) {
    return `hsl(${hue} ${settings.saturation}% ${settings.lightness}% / ${settings.opacity})`;
}


function drawCell([x, y], color) {
    let gap = 1;

    ctx.fillStyle = color;
    switch (settings.format) {
        case "full":
            ctx.fillRect(x * settings.gridSize, y * settings.gridSize, settings.gridSize, settings.gridSize)
            break;
        case "grid":
            ctx.fillRect(x * settings.gridSize + gap, y * settings.gridSize + gap, settings.gridSize - (2 * gap), settings.gridSize - (2 * gap));
            break;
        case "border":
            if (color == null) {
                return ctx.clearRect(x * settings.gridSize + gap, y * settings.gridSize + gap, settings.gridSize - (2 * gap), settings.gridSize - (2 * gap));
            }
            ctx.fillRect(x * settings.gridSize, y * settings.gridSize, settings.gridSize, settings.gridSize)
            break;
    }
}

let i = 0;

/* for path drawings */
const history = (() => {
    const state = [];
    const add = (coordinates) => {
        state.push(coordinates);
        if (state.length > settings.pathLimit) {
            const droppedCoords = state.shift();

            const isInHistory = state.some(oldCoords => oldCoords[0] == droppedCoords[0] && oldCoords[1] == droppedCoords[1]);
            if (!isInHistory) {
                drawCell(droppedCoords, null);
            }
        }
    }
    const clear = () => state.splice(0, state.length);
    const first = () => state[0];
    const last = () => state[state.length - 1];

    return { state, add, first, last, clear }
})();

/* for filling canvas */
const canvasState = new Map();
function generateKeys() {
    // generate all possible keys
    for (let x = 0; x < settings.gridCount; x++) {
        for (let y = 0; y < settings.gridCount; y++) {
            canvasState.set(makeKey([x, y]), undefined);
        }
    }
}

function getNewCoords([x, y], dir) {
    const [min, max] = [0, settings.gridCount - 1];

    /*  1 up left
        2 up
        3 up right
        4 left
        5 right
        6 down left
        7 down
        8 down right  */

    /* handle x */
    switch (dir) {
        case 1:
        case 4:
        case 6:
            x += -1;
            break;
        case 2:
        case 7:
            x += 0;
            break;
        case 3:
        case 5:
        case 8:
            x += 1;
            break;
    }

    /* handle y */
    switch (dir) {
        case 1:
        case 2:
        case 3:
            y += -1;
            break;
        case 4:
        case 5:
            y += 0;
            break;
        case 6:
        case 7:
        case 8:
            y += 1;
            break;
    }

    if (x <= min) { x = min; }
    if (x >= max) { x = max; }
    if (y <= min) { y = min; }
    if (y >= max) { y = max; }

    return [x, y]
}

function getRandomDir() {
    const min = 0;
    const max = 8;
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomCoords() {
    const last = history.last();
    const dir = getRandomDir();
    const newCoords = getNewCoords(last, dir);

    if (newCoords[0] == last[0] && newCoords[1] == last[1]) {
        return getRandomCoords();
    }

    return newCoords;
}

function makeKey([x, y]) {
    return `${x} ${y}`
}
/* start path */
function nextCell(coords = getRandomCoords()) {
    if (!isRunning) { return };

    history.add(coords);
    const color = hslColor(i * settings.hueShift);
    drawCell(coords, color);
    i++;

    // check if canvas is full. if not, continue generating.
    const existingOpacity = canvasState.get(makeKey(coords))?.opacity ?? 0;
    canvasState.set(makeKey(coords), { color, opacity: existingOpacity + settings.opacity });
    const isInProgress = [...canvasState.values()].some(value => value == undefined || value?.opacity < settings.minimumOpacity);
    if (!isInProgress) {
        if (settings.format == "border") {
            history.state.forEach(coord => {
                drawCell(coord, null);
            });
        }
        document.querySelector('.message').innerHTML = `Square done after ${i} color fills!`;
        return;
    }

    setTimeout(() => {
        nextCell();
    }, settings.speed);
}

isRunning = true;

function play(coord) {
    isRunning = true;
    nextCell(coord);
}

function pause() {
    isRunning = false;
}

function restart(opts) {
    setSettings(opts);
    canvas.width = settings.canvasSize;
    canvas.height = settings.canvasSize;
    ctx.clearRect(0, 0, settings.canvasSize, settings.canvasSize);
    history.clear();
    canvasState.clear();
    i = 0;
    generateKeys();
    play([0, 0]);
}

document.addEventListener('keydown', function (e) {
    if (e.code == "KeyS" && e.shiftKey) {
        pause();
        settingsMenu.showModal();
    }
});

settingsMenu.addEventListener('close', function (e) {
    play();
});

settingsMenu.querySelector('form').addEventListener('submit', e => {
    // e.preventDefault();
    const data = new FormData(e.target);
    const opts = [...data.entries()].reduce((obj, [key, value]) => {
        if (key !== "format") {
            value = Number.parseFloat(value);
        }
        return Object.assign(obj, {[key]: value})
    }, {});
    restart(opts);
    // settingsMenu.close()
    return false;
})

restart();