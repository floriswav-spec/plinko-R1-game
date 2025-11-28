const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// FIXED PORTRAIT SIZE
const FIXED_WIDTH = 400;
const FIXED_HEIGHT = 700;

let screenWidth = FIXED_WIDTH;
let screenHeight = FIXED_HEIGHT;

// COLORS
const BG = "#000000";
const PEG_COLOR = "#D2D2DC";
const DIVIDER = "#AAAAFF";
const TEXT = "#DCDCE6";

// PEG SETTINGS
const pegRadius = 5;
const pegRowsPattern = [11, 12, 11, 12, 11, 12, 11];
const pegSpacingX = 35;
const pegSpacingY = 38;

// BINS
const slotLabels = ["100", "250", "50", "500", "50", "250", "100"];
const slotY = 560;
const slotHeight = 120;

// BALL PHYSICS
const ballRadius = 7;
const gravity = 0.21;
const friction = 0.985;

// SCALED VALUES
let pegLayout = [];
let dividerPositions = [];
let diagonalWalls = [];

// ------------------ BUILD PEGS ------------------
function buildPegs() {
    pegLayout = [];
    const centerX = screenWidth / 2;

    for (let r = 0; r < pegRowsPattern.length; r++) {
        const cols = pegRowsPattern[r];
        const rowWidth = (cols - 1) * pegSpacingX;
        const startX = centerX - rowWidth / 2;
        for (let c = 0; c < cols; c++) {
            const x = startX + c * pegSpacingX;
            const y = (screenHeight - (pegRowsPattern.length - 1) * pegSpacingY) / 2 + r * pegSpacingY;
            pegLayout.push([x, y]);
        }
    }
}

// ------------------ BUILD DIAGONAL WALLS ------------------
function buildDiagonalWalls() {
    diagonalWalls = [];
    const pegTop = (screenHeight - (pegRowsPattern.length - 1) * pegSpacingY) / 2;
    diagonalWalls.push({ x1: screenWidth * 0.18, y1: pegTop - 20, x2: screenWidth * 0.10, y2: slotY });
    diagonalWalls.push({ x1: screenWidth * 0.82, y1: pegTop - 20, x2: screenWidth * 0.90, y2: slotY });
}

// ------------------ BUILD DIVIDERS ------------------
function buildDividers() {
    dividerPositions = [];
    const binsWidth = screenWidth * 0.8;
    const binsStart = (screenWidth - binsWidth) / 2;
    const slotW = binsWidth / slotLabels.length;

    for (let i = 0; i <= slotLabels.length; i++) {
        dividerPositions.push(binsStart + i * slotW);
    }
}

// ------------------ BALL CLASS ------------------
class Ball {
    constructor() {
        this.x = screenWidth / 2;
        this.y = 50; // spawn near top
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = 0;
        this.active = true;
    }

    update() {
        if (!this.active) return;

        this.vy += gravity;
        this.x += this.vx;
        this.y += this.vy;

        this.vx *= friction;
        this.vy *= friction;

        // walls
        if (this.x < ballRadius) { this.x = ballRadius; this.vx *= -0.4; }
        if (this.x > screenWidth - ballRadius) { this.x = screenWidth - ballRadius; this.vx *= -0.4; }

        // peg collisions
        for (let [px, py] of pegLayout) {
            const dx = this.x - px;
            const dy = this.y - py;
            const dist = Math.hypot(dx, dy);
            if (dist < pegRadius + ballRadius) {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 1.0;
                this.vy = Math.sin(angle) * 1.0;
                const overlap = pegRadius + ballRadius - dist;
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }

        // diagonal walls
        for (let seg of diagonalWalls) {
            const A = { x: seg.x1, y: seg.y1 };
            const B = { x: seg.x2, y: seg.y2 };
            const P = { x: this.x, y: this.y };
            const ABx = B.x - A.x;
            const ABy = B.y - A.y;
            const APx = P.x - A.x;
            const APy = P.y - A.y;
            const t = Math.max(0, Math.min(1, (APx * ABx + APy * ABy) / (ABx*ABx + ABy*ABy)));
            const closestX = A.x + ABx * t;
            const closestY = A.y + ABy * t;
            const dx = P.x - closestX;
            const dy = P.y - closestY;
            const dist = Math.hypot(dx, dy);
            if (dist < ballRadius) {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 1.2;
                this.vy = Math.sin(angle) * 1.2;
                const overlap = ballRadius - dist;
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }

        // dividers
        const binsWidth = screenWidth * 0.8;
        const binsStart = (screenWidth - binsWidth) / 2;
        const slotW = binsWidth / slotLabels.length;
        for (let i = 0; i <= slotLabels.length; i++) {
            const dividerX = binsStart + i * slotW;
            if (Math.abs(this.x - dividerX) < ballRadius * 1.15 && this.y >= slotY && this.y <= slotY + slotHeight) {
                this.vx *= -0.55;
            }
        }

        if (this.y > screenHeight - 10) this.active = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#FFEBC4";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, ballRadius - 2, 0, Math.PI * 2);
        ctx.fillStyle = "#FFB450";
        ctx.fill();
    }
}

// ------------------ GAME SETUP ------------------
let balls = [];
canvas.width = FIXED_WIDTH;
canvas.height = FIXED_HEIGHT;

buildPegs();
buildDiagonalWalls();
buildDividers();

// input
canvas.addEventListener("click", () => balls.push(new Ball()));
canvas.addEventListener("touchstart", e => { e.preventDefault(); balls.push(new Ball()); }, { passive:false });

// ------------------ DRAW ------------------
function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // pegs
    for (let [x, y] of pegLayout) {
        ctx.beginPath();
        ctx.arc(x, y, pegRadius, 0, Math.PI * 2);
        ctx.fillStyle = PEG_COLOR;
        ctx.fill();
    }

    // diagonal walls
    ctx.strokeStyle = "#66AAFF";
    ctx.lineWidth = 4;
    for (let seg of diagonalWalls) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
    }

    // dividers
    const binsWidth = screenWidth * 0.8;
    const binsStart = (screenWidth - binsWidth) / 2;
    const slotW = binsWidth / slotLabels.length;
    ctx.strokeStyle = DIVIDER;
    ctx.lineWidth = 3;
    for (let i = 0; i <= slotLabels.length; i++) {
        const x = binsStart + i * slotW;
        ctx.beginPath();
        ctx.moveTo(x, slotY);
        ctx.lineTo(x, slotY + slotHeight);
        ctx.stroke();
    }

    // labels
    ctx.fillStyle = TEXT;
    ctx.textAlign = "center";
    ctx.font = `18px Arial`;
    for (let i = 0; i < slotLabels.length; i++) {
        const cx = binsStart + i * slotW + slotW/2;
        ctx.fillText(slotLabels[i], cx, slotY + 20);
    }

    for (let b of balls) b.draw();
}

// ------------------ UPDATE ------------------
function update() {
    for (let b of balls) b.update();
    balls = balls.filter(b => b.active);
}

// ------------------ LOOP ------------------
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
