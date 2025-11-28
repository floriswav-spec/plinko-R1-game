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
const pegRowsPattern = [11, 12, 11, 12, 11, 12, 11, 12, 11];
const pegSpacingX = 35;
const pegSpacingY = 38;
const pegStartY = 95;
let pegLayout = [];

// BINS
const slotLabels = ["100", "250", "50", "500", "50", "250", "100"];
const slotY = 500;
const slotHeight = 90;
let dividerPositions = [];

// BALL PHYSICS
const ballRadius = 7;
const gravity = 0.18;
const friction = 0.992;

class Ball {
    constructor() {
        this.x = screenWidth / 2;
        this.y = 50;
        this.vx = Math.random() * 1.6 - 0.8;
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

        // Walls
        if (this.x < ballRadiusScaled || this.x > screenWidth - ballRadiusScaled) {
            this.vx *= -0.7;
        }

        // Peg collisions
        for (let [px, py] of pegLayout) {
            let dx = this.x - px;
            let dy = this.y - py;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ballRadiusScaled + pegRadiusScaled) {
                let angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 1.4;
                this.vy = Math.sin(angle) * 1.4;
            }
        }

        // Divider collisions
        let binsWidth = screenWidth * 0.8;
        let binsStart = (screenWidth - binsWidth) / 2;
        let slotW = binsWidth / slotLabels.length;

        for (let i = 0; i <= slotLabels.length; i++) {
            let dividerX = binsStart + i * slotW;
            if (Math.abs(this.x - dividerX) < ballRadiusScaled) {
                if (this.y >= slotY && this.y <= slotY + slotHeight) {
                    this.vx *= -0.7;
                    this.x += this.x < dividerX ? -ballRadiusScaled : ballRadiusScaled;
                }
            }
        }

        // Bottom stop
        if (this.y > screenHeight - 40) this.active = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, ballRadiusScaled, 0, Math.PI * 2);
        ctx.fillStyle = "#FFEBC4";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, ballRadiusScaled - 3, 0, Math.PI * 2);
        ctx.fillStyle = "#FFB450";
        ctx.fill();
    }
}

let balls = [];

// SCALE VARIABLES
let scale = 1;
let pegRadiusScaled = pegRadius;
let ballRadiusScaled = ballRadius;
let pegSpacingXScaled = pegSpacingX;
let pegSpacingYScaled = pegSpacingY;

// BUILD PEGS
function buildPegs() {
    pegLayout = [];
    let centerX = screenWidth / 2;
    for (let r = 0; r < pegRowsPattern.length; r++) {
        let cols = pegRowsPattern[r];
        let rowWidth = (cols - 1) * pegSpacingXScaled;
        let startX = centerX - rowWidth / 2;
        for (let c = 0; c < cols; c++) {
            let x = startX + c * pegSpacingXScaled;
            let y = pegStartY * scale + r * pegSpacingYScaled;
            pegLayout.push([x, y]);
        }
    }
}

// BUILD DIVIDERS
function buildDividers() {
    dividerPositions = [];
    let n = slotLabels.length;
    let slotW = screenWidth / n;
    for (let i = 0; i <= n; i++) dividerPositions.push(i * slotW);
}

// RESIZE CANVAS FOR MOBILE
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.95;
    canvas.height = window.innerHeight * 0.95;
    screenWidth = canvas.width;
    screenHeight = canvas.height;

    scale = screenWidth / 600; // base width
    pegRadiusScaled = pegRadius * scale;
    ballRadiusScaled = ballRadius * scale;
    pegSpacingXScaled = pegSpacingX * scale;
    pegSpacingYScaled = pegSpacingY * scale;

    buildPegs();
    buildDividers();
}

// Initial resize
resizeCanvas();

// Resize on window change
window.addEventListener("resize", resizeCanvas);

// CLICK / TAP INPUT
canvas.addEventListener("click", () => balls.push(new Ball()));
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    balls.push(new Ball());
});

// DRAW EVERYTHING
function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.fillStyle = FRAME;
    ctx.fillRect(15, 15, screenWidth - 30, screenHeight - 30);
    ctx.fillStyle = BOARD;
    ctx.fillRect(25, 25, screenWidth - 50, screenHeight - 50);

    // Pegs
    for (let [x, y] of pegLayout) {
        ctx.beginPath();
        ctx.arc(x, y, pegRadiusScaled, 0, Math.PI * 2);
        ctx.fillStyle = PEG_COLOR;
        ctx.fill();
    }

    // Dividers
    let binsWidth = screenWidth * 0.8;
    let binsStart = (screenWidth - binsWidth) / 2;
    let slotW = binsWidth / slotLabels.length;

    for (let i = 0; i <= slotLabels.length; i++) {
        let x = binsStart + i * slotW;
        ctx.strokeStyle = DIVIDER;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, slotY);
        ctx.lineTo(x, slotY + slotHeight);
        ctx.stroke();
    }

    // Slot labels
    ctx.fillStyle = TEXT;
    ctx.font = `${18 * scale}px Arial`;
    ctx.textAlign = "center";
    for (let i = 0; i < slotLabels.length; i++) {
        let cx = binsStart + i * slotW + slotW / 2;
        ctx.fillText(slotLabels[i], cx, slotY + 25);
    }

    // Balls
    for (let b of balls) b.draw();
}

// UPDATE
function update() {
    for (let b of balls) b.update();
    balls = balls.filter(b => b.active);
}

// GAME LOOP
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
