'strict';

class Model {
    constructor() {
        this.view = null;
        this.controller = null;

        this.size = null;
        this.nextPlayer = null;
        this.p1Coords = null;
        this.p2Coords = null;
    }
    reset(size) {
        this.size = size;
        this.nextPlayer = 'p1';
        this.p1Coords = [];
        this.p2Coords = [];
    }
    undo() {
        if (this.nextPlayer === 'p1') {
            if (this.p2Coords.pop() !== this.undefined) {
                this.nextPlayer = 'p2';
            }
        } else {
            this.p1Coords.pop();
            this.nextPlayer = 'p1';
        }
    }
    move(i, j) {
        for (let coord of this.p1Coords) {
            if (i === coord[0] && j === coord[1]) {
                return;
            }
        }
        for (let coord of this.p2Coords) {
            if (i === coord[0] && j === coord[1]) {
                return;
            }
        }
        if (this.nextPlayer === 'p1') {
            this.p1Coords.push([i, j]);
            this.nextPlayer = 'p2';
        } else {
            this.p2Coords.push([i, j]);
            this.nextPlayer = 'p1';
        }
    }
}

class View {
    constructor(model) {
        this.model = model;
        this.controller = null;

        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');

        this.bgcolor = '#fdf6e3';
        this.fgcolor = '#002b36';
        this.p1Color = '#2aa198';
        this.p2Color = '#cb4b16';
        this.cos3 = 0.5
        this.sin3 = Math.sqrt(1 - this.cos3 ** 2)
        this.size = null;
        this.unit = null;
        this.offsetX = null;
        this.offsetY = null;
    }
    update() {
        this.initialize();
        this.drawBoard();
        this.drawSentinels();
        this.drawPieces();
        this.drawSimplices();
        this.drawNext();
    }
    initialize() {
        this.canvas.width = canvas.clientWidth;
        this.canvas.height = canvas.clientHeight;

        this.size = this.model.size;
        this.unit = Math.floor(Math.min(
            this.canvas.width / (this.size + this.cos3 * this.size + 1),
            this.canvas.height / (this.sin3 * this.size + 1)));
        this.offsetX = Math.floor((this.canvas.width - (this.size + this.cos3 * this.size) * this.unit) / 2);
        this.offsetY = Math.floor((this.canvas.height - (this.sin3 * this.size) * this.unit) / 2);
    }
    drawBoard() {
        this.context.fillStyle = this.bgcolor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.strokeStyle = this.fgcolor;
        for (let i = 0; i <= this.size; i++)
            this.drawLine(i, 0, i, this.size);
        for (let i = 0; i <= this.size; i++)
            this.drawLine(0, i, this.size, i);
        for (let i = 1; i <= this.size; i++)
            this.drawLine(0, i, i, 0);
        for (let i = 1; i < this.size; i++)
            this.drawLine(i, this.size, this.size, i);
    }
    drawSentinels() {
        this.context.fillStyle = this.p1Color;
        for (let i = 1; i < this.size; i++) {
            this.drawPiece(i, 0);
            this.drawPiece(i, this.size);
        }
        this.context.fillStyle = this.p2Color;
        for (let j = 1; j < this.size; j++) {
            this.drawPiece(0, j);
            this.drawPiece(this.size, j);
        }
    }
    drawPieces() {
        this.context.fillStyle = this.p1Color;
        for (let coord of this.model.p1Coords) {
            this.drawPiece(...coord);
        }
        this.context.fillStyle = this.p2Color;
        for (let coord of this.model.p2Coords) {
            this.drawPiece(...coord);
        }
    }
    drawSimplices() {
        const board = [];
        for (let i = 0; i <= this.size + 1; i++) {
            const row = [];
            for (let j = 0; j <= this.size + 1; j++) {
                row.push('');
            }
            board.push(row);
        }
        for (let i = 1; i < this.size; i++) {
            board[i][0] = 'p1';
            board[i][this.size] = 'p1';
            board[0][i] = 'p2';
            board[this.size][i] = 'p2';
        }
        for (let coord of this.model.p1Coords) {
            board[coord[0]][coord[1]] = 'p1';
        }
        for (let coord of this.model.p2Coords) {
            board[coord[0]][coord[1]] = 'p2';
        }
        this.context.lineWidth = 0.2 * this.unit;
        this.context.strokeStyle = this.p1Color;
        this.context.fillStyle = this.p1Color;
        for (let i = 0; i <= this.size; i++) {
            for (let j = 0; j <= this.size; j++) {
                if (board[i][j] === 'p1' && board[i][j + 1] === 'p1') {
                    this.drawLine(i, j, i, j + 1);
                }
                if (board[i][j] === 'p1' && board[i + 1][j] === 'p1') {
                    this.drawLine(i, j, i + 1, j);
                }
                if (board[i][j + 1] === 'p1' && board[i + 1][j] === 'p1') {
                    this.drawLine(i, j + 1, i + 1, j);
                }
                if (board[i][j] === 'p1' && board[i][j + 1] === 'p1' && board[i + 1][j] === 'p1') {
                    this.drawTriangle(i, j, i, j + 1, i + 1, j);
                }
                if (board[i][j + 1] === 'p1' && board[i + 1][j] === 'p1' && board[i + 1][j + 1] === 'p1') {
                    this.drawTriangle(i, j + 1, i + 1, j, i + 1, j + 1);
                }
            }
        }
        this.context.strokeStyle = this.p2Color;
        this.context.fillStyle = this.p2Color;
        for (let i = 0; i <= this.size; i++) {
            for (let j = 0; j <= this.size; j++) {
                if (board[i][j] === 'p2' && board[i][j + 1] === 'p2') {
                    this.drawLine(i, j, i, j + 1);
                }
                if (board[i][j] === 'p2' && board[i + 1][j] === 'p2') {
                    this.drawLine(i, j, i + 1, j);
                }
                if (board[i][j + 1] === 'p2' && board[i + 1][j] === 'p2') {
                    this.drawLine(i, j + 1, i + 1, j);
                }
                if (board[i][j] === 'p2' && board[i][j + 1] === 'p2' && board[i + 1][j] === 'p2') {
                    this.drawTriangle(i, j, i, j + 1, i + 1, j);
                }
                if (board[i][j + 1] === 'p2' && board[i + 1][j] === 'p2' && board[i + 1][j + 1] === 'p2') {
                    this.drawTriangle(i, j + 1, i + 1, j, i + 1, j + 1);
                }
            }
        }
    }
    drawNext() {
        const next_box = document.getElementById('next');
        if (this.model.nextPlayer === 'p1') {
            next_box.value = 'Player 1';
            next_box.style.backgroundColor = this.p1Color;
            next_box.style.color = this.bgcolor;
        } else {
            next_box.value = 'Player 2';
            next_box.style.backgroundColor = this.p2Color;
            next_box.style.color = this.bgcolor;
        }
    }
    drawPiece(i, j) {
        const x = this.getX(i, j);
        const y = this.getY(i, j);
        const r = 0.4 * this.unit;
        const n = 6;
        this.context.beginPath();
        for (let k = 0; k < n; k++) {
            this.context.lineTo(
                x + r * Math.cos(2 * Math.PI * k / n),
                y + r * Math.sin(2 * Math.PI * k / n));
        }
        this.context.closePath();
        this.context.fill();
    }
    drawLine(i0, j0, i1, j1) {
        this.context.beginPath();
        this.context.moveTo(this.getX(i0, j0), this.getY(i0, j0));
        this.context.lineTo(this.getX(i1, j1), this.getY(i1, j1));
        this.context.stroke();
    }
    drawTriangle(i0, j0, i1, j1, i2, j2) {
        this.context.beginPath();
        this.context.moveTo(this.getX(i0, j0), this.getY(i0, j0));
        this.context.lineTo(this.getX(i1, j1), this.getY(i1, j1));
        this.context.lineTo(this.getX(i2, j2), this.getY(i2, j2));
        this.context.closePath();
        this.context.fill();
    }
    getX(i, j) {
        return Math.floor(this.offsetX + i * this.cos3 * this.unit + j * this.unit);
    }
    getY(i, j) {
        return Math.floor(this.offsetY + i * this.sin3 * this.unit);
    }
    getCoord(x, y) {
        for (let i = 1; i < this.size; i++) {
            for (let j = 1; j < this.size; j++) {
                if (this.getDistance(x, y, this.getX(i, j), this.getY(i, j)) < 0.3 * this.unit) {
                    return [i, j];
                }
            }
        }
        return null;
    }
    getDistance(x0, y0, x1, y1) {
        return Math.hypot(x1 - x0, y1 - y0);
    }
}

class Controller {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        document.getElementById('reset').onclick = () => this.reset();
        document.getElementById('undo').onclick = () => this.undo();
        document.getElementById('canvas').onclick = (event) => this.move(event);
    }
    reset() {
        const size = Number(document.getElementById('size').value);
        this.model.reset(size);
        this.view.update();
    }
    undo() {
        this.model.undo();
        this.view.update();
    }
    move(event) {
        event.preventDefault();
        const coord = this.view.getCoord(event.offsetX, event.offsetY);
        if (coord === null) {
            return;
        }
        this.model.move(...coord);
        this.view.update();
    }
}

const model = new Model();
const view = new View(model);
const controller = new Controller(model, view);

controller.reset();
