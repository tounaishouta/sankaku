'use strict';

setTimeout(() => {
    new Main(
        new Model(),
        new HtmlResetControl(),
        new HtmlUndoControl(),
        new HtmlNextView(),
        new CanvasBoardVC(),
    );
    document.getElementById('size').value = '12';
    document.getElementById('reset').click();
});

class Main {
    constructor(model, resetControl, undoControl, nextView, boardVC) {
        this.model = model;
        this.nextView = nextView;
        this.boardVC = boardVC;
        resetControl.subscribe(this);
        undoControl.subscribe(this);
        boardVC.subscribe(this);
    }
    updateView() {
        this.nextView.update(this.model);
        this.boardVC.update(this.model);
    }
    reset(n) {
        this.model.reset(n);
        this.updateView();
    }
    undo() {
        this.model.undo();
        this.updateView();
    }
    put(v) {
        this.model.put(v);
        this.updateView();
    }
}

class Model {
    #size;
    #board;
    #next;
    #records;
    reset(n) {
        this.#size = n;
        this.#board = this.#initialBoard(n);
        this.#next = 1;
        this.#records = [];
    }
    #initialBoard(n) {
        const board = range(n + 1).map(() => range(n + 1).map(() => 0));
        for (const i of range(1, n)) {
            board[0][i] = 1;
            board[n][i] = 1;
            board[i][0] = 2;
            board[i][n] = 2;
        }
        return board;
    }
    size() {
        return this.#size;
    }
    get(v) {
        const [i, j] = v;
        return this.#board[i][j];
    }
    next() {
        return this.#next;
    }
    #set(v, p) {
        const [i, j] = v;
        this.#board[i][j] = p;
    }
    #toggleNext() {
        this.#next = this.next() === 1 ? 2 : 1;
    }
    put(v) {
        if (!(this.get(v) === 0)) return;
        this.#set(v, this.next());
        this.#toggleNext();
        this.#records.push(v);
    }
    undo() {
        if (this.#records.length === 0) return;
        const v = this.#records.pop();
        this.#set(v, 0);
        this.#toggleNext();
    }
    *players() {
        yield 1;
        yield 2;
    }
    *vertices() {
        const n = this.size();
        for (const i of range(n + 1))
            for (const j of range(n + 1))
                yield [i, j];
    }
    *edges() {
        const n = this.size();
        for (const i of range(n + 1))
            for (const j of range(n))
                yield [[i, j], [i, j + 1]];
        for (const i of range(n))
            for (const j of range(n + 1))
                yield [[i, j], [i + 1, j]];
        for (const i of range(n))
            for (const j of range(n))
                yield [[i, j + 1], [i + 1, j]];
    }
    *triangles() {
        const n = this.size();
        for (const i of range(n))
            for (const j of range(n))
                yield [[i, j], [i, j + 1], [i + 1, j]];
        for (const i of range(n))
            for (const j of range(n))
                yield [[i, j + 1], [i + 1, j], [i + 1, j + 1]];
    }
}

class HtmlResetControl {
    constructor() {
        this.sizeInput = document.getElementById('size');
        this.resetButton = document.getElementById('reset');
    }
    subscribe(main) {
        this.resetButton.addEventListener('click', () => {
            const n = Number(this.sizeInput.value);
            main.reset(n);
        });
    }
}

class HtmlUndoControl {
    constructor() {
        this.undoButton = document.getElementById('undo');
    }
    subscribe(main) {
        this.undoButton.addEventListener('click', () => {
            main.undo();
        });
    }
}

class HtmlNextView {
    constructor() {
        this.nextInput = document.getElementById('next');
    }
    update(model) {
        const p = model.next();
        this.nextInput.value = `Player ${p}`;
        this.nextInput.style.backgroundColor = palette(p);
        this.nextInput.style.color = palette('bg');
    }
}

class CanvasBoardVC {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');
        this.xi = 0.5;
        this.yi = Math.sqrt(1 - this.xi ** 2);
        this.xj = 1;
        this.yj = 0;
        window.addEventListener('resize', () => this.redraw());
    }
    update(model) {
        this.model = model;
        this.redraw();
    }
    redraw() {
        this.initialize();
        this.drawLines();
        this.drawPieces();
        this.drawEdges();
        this.drawTriangles();
    }
    initialize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.canvas.width = w;
        this.canvas.height = h;
        this.size = this.model.size();
        this.unit = Math.floor(Math.min(
            w / (this.size * (this.xi + this.xj) + 1),
            h / (this.size * (this.yi + this.yj) + 1),
        ));
        this.offsetX = Math.floor((w - this.size * (this.xi + this.xj) * this.unit) / 2);
        this.offsetY = Math.floor((h - this.size * (this.yi + this.yj) * this.unit) / 2);
    }
    drawLines() {
        for (const e of this.model.edges())
            this.drawLine(e, palette('fg'), 0.03);
    }
    drawPieces() {
        for (const p of this.model.players())
            for (const v of this.model.vertices())
                if (this.model.get(v) === p)
                    this.drawPiece(v, palette(p), 0.4);
    }
    drawEdges() {
        for (const p of this.model.players())
            for (const e of this.model.edges())
                if (this.model.get(e[0]) === p && this.model.get(e[1]) === p)
                    this.drawLine(e, palette(p), 0.2);
    }
    drawTriangles() {
        for (const p of this.model.players())
            for (const t of this.model.triangles())
                if (t.every((v) => this.model.get(v) === p))
                    this.drawPolygon(t, palette(p));
    }
    drawPiece(v, color, scale) {
        const [x, y] = this.coord(v);
        const r = scale * this.unit;
        const n = 6;
        const theta = 2 * Math.PI / n;
        this.context.beginPath();
        for (let k = 0; k < n; k++)
            this.context.lineTo(x + r * Math.cos(k * theta), y + r * Math.sin(k * theta));
        this.context.closePath();
        this.context.fillStyle = color;
        this.context.fill();
    }
    drawLine(vertices, color, scale) {
        this.context.beginPath();
        for (const v of vertices)
            this.context.lineTo(...this.coord(v));
        this.context.strokeStyle = color;
        this.context.lineWidth = scale * this.unit;
        this.context.stroke();
    }
    drawPolygon(vertices, color) {
        this.context.beginPath();
        for (const v of vertices)
            this.context.lineTo(...this.coord(v));
        this.context.closePath();
        this.context.fillStyle = color;
        this.context.fill();
    }
    coord(v) {
        const [i, j] = v;
        return [
            this.offsetX + (i * this.xi + j * this.xj) * this.unit,
            this.offsetY + (i * this.yi + j * this.yj) * this.unit,
        ];
    }
    subscribe(main) {
        this.canvas.addEventListener('click', (ev) => {
            ev.preventDefault();
            const x0 = ev.offsetX;
            const y0 = ev.offsetY;
            const threshold = 0.3 * this.unit;
            for (const v of this.model.vertices()) {
                const [x, y] = this.coord(v);
                const distance = Math.hypot(x - x0, y - y0);
                if (distance < threshold) {
                    main.put(v);
                    return;
                }
            }
        });
    }
}

const palette = (key) => {
    return {
        fg: '#002b36',
        bg: '#fdf6e3',
        1: '#2aa198',
        2: '#cb4b16',
    }[key];
};

const range = (a, b) => {
    if (b == null) {
        return range(0, a);
    }
    return Array.from({ length: b - a }, (_, i) => a + i);
};
