'use strict';

setTimeout(() => {
    const model = new Model();
    new ResetController(model);
    new UndoController(model);
    new NextView(model);
    new BoardViewController(model);
    document.getElementById('players').value = '2';
    document.getElementById('size').value = '10';
    document.getElementById('reset').click();
});

class Model {
    #observers = [];
    addObserver(observer) {
        this.#observers.push(observer);
    }
    #notifyObservers() {
        for (const observer of this.#observers)
            observer.notify();
    }
    #strategy;
    #board;
    #next;
    #records;
    reset(players, size) {
        if (players === 2) {
            this.#strategy = new Strategy2(size);
        } else if (players === 3) {
            this.#strategy = new Strategy3(size);
        } else {
            console.error(`Invalid players: ${players}`);
        }
        this.#board = this.#strategy.initializeBoard();
        this.#next = 1;
        this.#records = [];
        this.#notifyObservers();
    }
    get(vertex) {
        const [i, j] = vertex;
        return this.#board[i][j];
    }
    #set(vertex, player) {
        const [i, j] = vertex;
        this.#board[i][j] = player;
    }
    next() {
        return this.#next;
    }
    #toggleNext() {
        this.#next = this.#strategy.next(this.#next);
    }
    #revertNext() {
        this.#next = this.#strategy.prev(this.#next);
    }
    put(vertex) {
        if (this.get(vertex) !== 0) return;
        this.#set(vertex, this.next());
        this.#toggleNext();
        this.#records.push(vertex);
        this.#notifyObservers();
    }
    undo() {
        if (this.#records.length === 0) return;
        const vertex = this.#records.pop();
        this.#set(vertex, 0);
        this.#revertNext();
        this.#notifyObservers();
    }
    *vertices() {
        yield* this.#strategy.vertices();
    }
}

class Strategy2 {
    #size;
    constructor(size) {
        this.#size = size;
    }
    initializeBoard() {
        const n = this.#size;
        const board = seq(0, n).map(() => seq(0, n).map(() => 0))
        for (const i of seq(1, n - 1)) {
            board[0][i] = 1;
            board[n][i] = 1;
            board[i][0] = 2;
            board[i][n] = 2;
        }
        return board;
    }
    *vertices() {
        const n = this.#size;
        for (const i of seq(0, n))
            for (const j of seq(0, n))
                if (this.#isVertex([i, j]))
                    yield [i, j];
    }
    #isVertex(vertex) {
        const n = this.#size;
        const [i, j] = vertex;
        const conditions = [i, j, n - i, n - j];
        if (conditions.some((x) => x < 0)) return false;
        if (conditions.filter((x) => x === 0).length === 2) return false;
        return true;
    }
    next(player) {
        if (player === 1) return 2;
        if (player === 2) return 1;
        console.error(`Invalid player: ${player}`);
    }
    prev(player) {
        if (player === 1) return 2;
        if (player === 2) return 1;
        console.error(`Invalid player: ${player}`);
    }
}

class Strategy3 {
    #size;
    constructor(size) {
        this.#size = size;
    }
    initializeBoard() {
        const n = this.#size;
        const board = seq(0, 2 * n).map(() => seq(0, 2 * n).map(() => 0))
        for (const i of seq(1, n - 1)) {
            board[0 + 0][0 + i] = 1;
            board[n + n][n + i] = 1;
            board[0 + i][0 + 0] = 2;
            board[n + i][n + n] = 2;
            board[0 + i][n + i] = 3;
            board[n + i][0 + i] = 3;
        }
        return board;
    }
    *vertices() {
        const n = this.#size;
        for (const i of seq(0, 2 * n))
            for (const j of seq(0, 2 * n))
                if (this.#isVertex([i, j]))
                    yield [i, j];
    }
    #isVertex(vertex) {
        const n = this.#size;
        const [i, j] = vertex;
        const conditions = [i, j, 2 * n - i, 2 * n - j, n + i - j, n - i + j];
        if (conditions.some((x) => x < 0)) return false;
        if (conditions.filter((x) => x === 0).length === 2) return false;
        return true;
    }
    next(player) {
        if (player === 1) return 2;
        if (player === 2) return 3;
        if (player === 3) return 1;
        console.error(`Invalid player: ${player}`);
    }
    prev(player) {
        if (player === 1) return 3;
        if (player === 2) return 1;
        if (player === 3) return 2;
        console.error(`Invalid player: ${player}`);
    }
}

class ResetController {
    constructor(model) {
        document.getElementById('reset').addEventListener('click', () => {
            const players = Number(document.getElementById('players').value);
            const size = Number(document.getElementById('size').value);
            model.reset(players, size);
        });
    }
}

class UndoController {
    constructor(model) {
        document.getElementById('undo').addEventListener('click', () => {
            model.undo();
        })
    }
}

class NextView {
    #model;
    constructor(model) {
        this.#model = model;
        model.addObserver(this);
    }
    notify() {
        const p = this.#model.next();
        const nextInput = document.getElementById('next');
        nextInput.textContent = `Player ${p}`;
        nextInput.style.color = palette('bg');
        nextInput.style.backgroundColor = palette(p);
    }
}

class BoardViewController {
    #model;
    #canvas;
    #context;
    #unit;
    #offsetX;
    #offsetY;
    #xi = -1 / 2;
    #yi = Math.sqrt(3) / 2;
    #xj = 1;
    #yj = 0;
    constructor(model) {
        this.#model = model;
        this.#canvas = document.getElementById('canvas');
        model.addObserver(this);
        this.#canvas.addEventListener('click', (event) => {
            this.#handleClick(event);
        });
        window.addEventListener('resize', () => {
            this.#draw();
        });
    }
    notify() {
        this.#draw();
    }
    #draw() {
        this.#initialize();
        this.#drawPieces();
        this.#drawBorder();
    }
    #initialize() {
        const w = this.#canvas.clientWidth;
        const h = this.#canvas.clientHeight;
        this.#canvas.width = w;
        this.#canvas.height = h;
        this.#context = this.#canvas.getContext('2d');
        const xCoeffs = Array.from(this.#model.vertices(), ([i, j]) => i * this.#xi + j * this.#xj);
        const yCoeffs = Array.from(this.#model.vertices(), ([i, j]) => i * this.#yi + j * this.#yj);
        const xMinCoeff = Math.min(...xCoeffs);
        const yMinCoeff = Math.min(...yCoeffs);
        const xMaxCoeff = Math.max(...xCoeffs);
        const yMaxCoeff = Math.max(...yCoeffs);
        this.#unit = Math.min(
            w / (xMaxCoeff - xMinCoeff + 2),
            h / (yMaxCoeff - yMinCoeff + 2),
        );
        this.#offsetX = w / 2 - (xMinCoeff + xMaxCoeff) / 2 * this.#unit;
        this.#offsetY = h / 2 - (yMinCoeff + yMaxCoeff) / 2 * this.#unit;
    }
    #drawPieces() {
        const get = (v) => this.#model.get(v);
        for (const v of this.#model.vertices())
            if (get(v) !== 0)
                this.#fillHexagon(v, palette(get(v)));
    }
    #drawBorder() {
        for (const v of this.#model.vertices())
            this.#strokeHexagon(v, palette('fg'), 0.05);
    }
    #fillHexagon(vertex, color) {
        this.#context.fillStyle = color;
        this.#context.fill(this.#hexagon(vertex));
    }
    #strokeHexagon(vertex, color, lineWidth) {
        this.#context.strokeStyle = color;
        this.#context.lineWidth = lineWidth * this.#unit;
        this.#context.lineCap = 'round';
        this.#context.lineJoin = 'round';
        this.#context.stroke(this.#hexagon(vertex));
    }
    #hexagon(vertex) {
        const [x, y] = this.#coord(vertex);
        const r = this.#unit / Math.sqrt(3);
        const path = new Path2D;
        for (const k of seq(0, 5)) {
            const theta = (2 * k + 1) / 6 * Math.PI;
            path.lineTo(x + r * Math.cos(theta), y + r * Math.sin(theta));
        }
        path.closePath();
        return path;
    }
    #handleClick(ev) {
        const x0 = ev.offsetX;
        const y0 = ev.offsetY;
        const threshold = 0.4 * this.#unit;
        for (const v of this.#model.vertices()) {
            const [x, y] = this.#coord(v);
            const d = Math.hypot(x - x0, y - y0);
            if (d < threshold)
                this.#model.put(v);
        }
    }
    #coord(vertex) {
        const [i, j] = vertex;
        return [
            this.#offsetX + (i * this.#xi + j * this.#xj) * this.#unit,
            this.#offsetY + (i * this.#yi + j * this.#yj) * this.#unit,
        ];
    }
}

const palette = (key) => {
    if (key === 'fg') return '#eee8d5';
    if (key === 'bg') return '#fdf6e3';
    if (key === 1) return '#2aa198';
    if (key === 2) return '#cb4b16';
    if (key === 3) return '#859900';
    console.error(`Invalid key:: ${key}`);
}

const seq = (a, b) => {
    if (a > b) return [];
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}