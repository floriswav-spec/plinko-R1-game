const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let screenWidth, screenHeight;

// COLORS
const BG = "#000000";
const FRAME = "#23232D";
const BOARD = "#37465A";
const PEG_COLOR = "#D2D2DC";
const TEXT = "#DCDCE6";
const DIVIDER = "#AAAAFF";

// PEG SETTINGS
const pegRadius = 5;
const pegRowsPattern = [11, 12, 11, 12, 11, 12, 11];
const pegSpacingX = 35;
const pegSpacingY = 38;
const pegStartY = 95;

// BINS
const slotLabels = ["100", "250", "50", "500", "50", "250", "100"];
const baseSlotY = 500;
const baseSlotHeight = 90;

// BALL PHYSICS
const ballRadius = 7;
const gravityBase = 0.21;    
const friction = 0.985;      

// SCALED VALUES
let pegLayout = [];
let dividerPositions = [];

let scale = 1;
let pegRadiusScaled, ballRadiusScaled;
let pegSpacingXScaled, pegSpacingYScaled, pegStartYScaled;
let slotYScaled, slotHeightScaled, gravityScaled;

// DIAGONAL WALLS
let diagonalWalls = [];

// Build pegs
function buildPegs() {
    pegLayout = [];
    const centerX = screenWidth / 2;

    for (let r = 0; r < pegRowsPattern.length; r++) {
        const cols = pegRowsPattern[r];
        const rowWidth = (cols - 1) * pegSpacingXScaled;
        const startX = centerX - rowWidth / 2;

        for (let c = 0; c < cols; c++) {
            const x = startX + c * pegSpacingXScaled;
            const y = pegStartYScaled + r * pegSpacingYScaled;
            pegLayout.push([x, y]);
        }
    }
}

// Build diagonal walls (LEFT and RIGHT)
function buildDiagonalWalls() {
    diagonalWalls = [];

    // Range from top of peg field to bins
    const topY = pegStartYScaled - 20 * scale;
    const bottomY = slotYScaled;

    // left diagonal wall
    diagonalWalls.push({
        x1: screenWidth * 0.18,
        y1: topY,
        x2: screenWidth * 0.10,
        y2: bottomY
    });

    // right diagonal wall
    diagonalWalls.push({
        x1: screenWidth * 0.82,
        y1: topY,
        x2: screenWidth * 0.90,
        y2: bottomY
    });
}

// Build dividers
function buildDividers() {
    dividerPositions = [];
    const n = slotLabels.length;

    const binsWidth = screenWidth * 0.8;
    const binsStart = (screenWidth - binsWidth) / 2;
    const slotW = binsWidth / n;

    for (let i = 0; i <= n; i++) {
        dividerPositions.push(binsStart + i * slotW);
    }
}

// Resize canvas
function resizeCanvas() {
    canvas.width = Math.floor(window.innerWidth * 0.95);
    canvas.height = Math.floor(window.innerHeight * 0.95);

    screenWidth = canvas.width;
    screenHeight = canvas.height;

    scale = screenWidth / 600;

    pegRadiusScaled = pegRadius * Math.max(0.6, scale);
    ballRadiusScaled = ballRadius * Math.max(0.6, scale);

    pegSpacingXScaled = pegSpacingX * scale;
    pegSpacingYScaled = pegSpacingY * scale;
    pegStartYScaled = pegStartY * scale;

    slotYScaled = Math.round(screenHeight * 0.72);
    slotHeightScaled = Math.round(screenHeight * 0.20);

    gravityScaled = gravityBase * (0.8 + scale * 0.4);

    buildPegs();
    buildDividers();
    buildDiagonalWalls();
}


// Ball class
class Ball {
    constructor() {
        this.x = screenWidth / 2;
        this.y = screenHeight * 0.05;
        this.vx = (Math.random() - 0.5) * 0.8; 
        this.vy = 0;
        this.active = true;
    }

    update() {
        if (!this.active) return;

        this.vy += gravityScaled;
        this.x += this.vx;
        this.y += this.vy;

        this.vx *= friction;
        this.vy *= friction;

        // boundary walls
        if (this.x < ballRadiusScaled) {
            this.x = ballRadiusScaled;
            this.vx *= -0.4;
        }
        if (this.x > screenWidth - ballRadiusScaled) {
            this.x = screenWidth - ballRadiusScaled;
            this.vx *= -0.4;
        }

        // peg collisions (soft)
        for (let [px, py] of pegLayout) {
            const dx = this.x - px;
            const dy = this.y - py;
            const dist = Math.hypot(dx, dy);

            if (dist < pegRadiusScaled + ballRadiusScaled) {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 1.0;
                this.vy = Math.sin(angle) * 1.0;

                const overlap = pegRadiusScaled + ballRadiusScaled - dist;
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }

        // diagonal walls collision
        for (let seg of diagonalWalls) {
            const A = { x: seg.x1, y: seg.y1 };
            const B = { x: seg.x2, y: seg.y2 };
            const P = { x: this.x, y: this.y };

            const ABx = B.x - A.x;
            const ABy = B.y - A.y;

            const APx = P.x - A.x;
            const APy = P.y - A.y;

            const t = Math.max(0, Math.min(1, (APx * ABx + APy * ABy) / (ABx * ABx + ABy * ABy)));

            const closestX = A.x + ABx * t;
            const closestY = A.y + ABy * t;

            const dx = P.x - closestX;
            const dy = P.y - closestY;
            const dist = Math.hypot(dx, dy);

            if (dist < ballRadiusScaled) {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 1.2;
                this.vy = Math.sin(angle) * 1.2;

                const overlap = ballRadiusScaled - dist;
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }

        // divider collisions
        const binsWidth = screenWidth * 0.8;
        const binsStart = (screenWidth - binsWidth) / 2;
        const slotW = binsWidth / slotLabels.length;

        for (let i = 0; i <= slotLabels.length; i++) {
            const dividerX = binsStart + i * slotW;

            if (Math.abs(this.x - dividerX) < ballRadiusScaled * 1.15 &&
                this.y >= slotYScaled && this.y <= slotYScaled + slotHeightScaled) {
                this.vx *= -0.55;
            }
        }

        if (this.y > screenHeight - 10) this.active = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, ballRadiusScaled, 0, Math.PI * 2);
        ctx.fillStyle = "#FFEBC4";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, ballRadiusScaled - 2, 0, Math.PI * 2);
        ctx.fillStyle = "#FFB450";
        ctx.fill();
    }
}



// balls array
let balls = [];

// input
canvas.addEventListener("click", () => balls.push(new Ball()));
canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    balls.push(new Ball());
}, { passive: false });

window.addEventListener("resize", resizeCanvas);

resizeCanvas();


// DRAW
function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // draw pegs
    for (let [x, y] of pegLayout) {
        ctx.beginPath();
        ctx.arc(x, y, pegRadiusScaled, 0, Math.PI * 2);
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
        ctx.moveTo(x, slotYScaled);
        ctx.lineTo(x, slotYScaled + slotHeightScaled);
        ctx.stroke();
    }

    // labels
    ctx.fillStyle = TEXT;
    ctx.textAlign = "center";
    ctx.font = `${Math.floor(18 * scale)}px Arial`;
    for (let i = 0; i < slotLabels.length; i++) {
        const cx = binsStart + i * slotW + slotW / 2;
        ctx.fillText(slotLabels[i], cx, slotYScaled + 20 * scale);
    }

    for (let b of balls) b.draw();
}

// UPDATE
function update() {
    for (let b of balls) b.update();
    balls = balls.filter(b => b.active);
}

// LOOP
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
