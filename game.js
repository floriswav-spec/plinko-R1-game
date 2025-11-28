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

// PEG SETTINGS (base)
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
const gravityBase = 0.21;            // slightly heavier gravity
const friction = 0.985;              // heavier air drag

let pegLayout = [];
let dividerPositions = [];

let scale = 1;
let pegRadiusScaled = pegRadius;
let ballRadiusScaled = ballRadius;

let pegSpacingXScaled = pegSpacingX;
let pegSpacingYScaled = pegSpacingY;
let pegStartYScaled = pegStartY;

let slotYScaled = baseSlotY;
let slotHeightScaled = baseSlotHeight;

let gravityScaled = gravityBase;

// zigzag wall config
let zigzagWalls = [];
const zigzagSegments = 12;   // number of zig zags per side
const zigzagWidthRatio = 0.06; // how far zig zag extends inward


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


// Build zig-zag side walls
function buildZigZagWalls() {
    zigzagWalls = [];

    const zigWidth = screenWidth * zigzagWidthRatio;
    const segmentH = (slotYScaled - pegStartYScaled) / zigzagSegments;

    let leftX1 = screenWidth * 0.08;
    let rightX1 = screenWidth * 0.92;

    for (let i = 0; i < zigzagSegments; i++) {
        let y1 = pegStartYScaled + i * segmentH;
        let y2 = y1 + segmentH;

        let lxA = leftX1 + (i % 2 === 0 ? zigWidth : 0);
        let lxB = leftX1 + (i % 2 === 1 ? zigWidth : 0);

        let rxA = rightX1 - (i % 2 === 0 ? zigWidth : 0);
        let rxB = rightX1 - (i % 2 === 1 ? zigWidth : 0);

        zigzagWalls.push({ x1: lxA, y1, x2: lxB, y2 });
        zigzagWalls.push({ x1: rxA, y1, x2: rxB, y2 });
    }
}


// Build bin dividers
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

    // scaled values
    pegRadiusScaled = pegRadius * Math.max(0.6, scale);
    ballRadiusScaled = ballRadius * Math.max(0.65, scale);
    pegSpacingXScaled = pegSpacingX * scale;
    pegSpacingYScaled = pegSpacingY * scale;
    pegStartYScaled = pegStartY * scale;

    slotYScaled = Math.round(screenHeight * 0.72);
    slotHeightScaled = Math.round(screenHeight * 0.20);

    gravityScaled = gravityBase * (0.8 + scale * 0.4);

    buildPegs();
    buildDividers();
    buildZigZagWalls();
}


// Ball object with heavy physics
class Ball {
    constructor() {
        this.x = screenWidth / 2;
        this.y = screenHeight * 0.05;
        this.vx = (Math.random() - 0.5) * 1.2; // smaller initial speed
        this.vy = 0;
        this.active = true;
    }

    update() {
        if (!this.active) return;

        this.vy += gravityScaled;
        this.x += this.vx;
        this.y += this.vy;

        // heavy damping for heavy ball feel
        this.vx *= friction;
        this.vy *= friction;

        // Side walls (simple)
        if (this.x < ballRadiusScaled) {
            this.x = ballRadiusScaled;
            this.vx *= -0.4;   // soft bounce
        }
        if (this.x > screenWidth - ballRadiusScaled) {
            this.x = screenWidth - ballRadiusScaled;
            this.vx *= -0.4;
        }

        // Peg collisions (softer)
        for (let [px, py] of pegLayout) {
            const dx = this.x - px;
            const dy = this.y - py;
            const dist = Math.hypot(dx, dy);

            if (dist < ballRadiusScaled + pegRadiusScaled) {
                const angle = Math.atan2(dy, dx);

                this.vx = Math.cos(angle) * 1.2; // softer bounce
                this.vy = Math.sin(angle) * 1.2;

                const overlap = (ballRadiusScaled + pegRadiusScaled) - dist;
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }

        // Zig-zag wall collisions
        for (let seg of zigzagWalls) {
            const { x1, y1, x2, y2 } = seg;

            const A = { x: x1, y: y1 };
            const B = { x: x2, y: y2 };
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

                // softer but directional bounce
                this.vx = Math.cos(angle) * 1.4;
                this.vy = Math.sin(angle) * 1.4;

                const overlap = ballRadiusScaled - dist;
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }

        // Divider collisions (even softer)
        const binsWidth = screenWidth * 0.8;
        const binsStart = (screenWidth - binsWidth) / 2;
        const slotW = binsWidth / slotLabels.length;

        for (let i = 0; i <= slotLabels.length; i++) {
            const dividerX = binsStart + i * slotW;

            if (Math.abs(this.x - dividerX) < ballRadiusScaled * 1.1 &&
                this.y >= slotYScaled && this.y <= slotYScaled + slotHeightScaled) {
                if (this.x < dividerX) this.x = dividerX - ballRadiusScaled;
                else this.x = dividerX + ballRadiusScaled;

                this.vx *= -0.55; // soft bounce
                this.vy *= 0.8;
            }
        }

        // stop at bottom
        if (this.y > screenHeight - 10) {
            this.active = false;
        }
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

let balls = [];

// Input
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

    ctx.fillStyle = BOARD;

    for (let [x, y] of pegLayout) {
        ctx.beginPath();
        ctx.arc(x, y, pegRadiusScaled, 0, Math.PI * 2);
        ctx.fillStyle = PEG_COLOR;
        ctx.fill();
    }

    // zigzag walls
    ctx.strokeStyle = "#6666FF";
    ctx.lineWidth = 3;
    for (let seg of zigzagWalls) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
    }

    // dividers
    const binsWidth = screenWidth * 0.8;
    const binsStart = (screenWidth - binsWidth) / 2;
    const slotW = binsWidth / slotLabels.length;

    ctx.lineWidth = 3;
    ctx.strokeStyle = DIVIDER;
    for (let i = 0; i <= slotLabels.length; i++) {
        const x = binsStart + i * slotW;
        ctx.beginPath();
        ctx.moveTo(x, slotYScaled);
        ctx.lineTo(x, slotYScaled + slotHeightScaled);
        ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = TEXT;
    ctx.font = `${Math.floor(18 * scale)}px Arial`;

    for (let i = 0; i < slotLabels.length; i++) {
        const cx = binsStart + i * slotW + slotW / 2;
        ctx.fillText(slotLabels[i], cx, slotYScaled + 30 * scale);
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
