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

// PEG SETTINGS (base values)
const pegRadius = 5;
const pegRowsPattern = [11, 12, 11, 12, 11, 12, 11, 12, 11];
const pegSpacingX = 35;
const pegSpacingY = 38;
const pegStartY = 95;

// BINS (base values)
const slotLabels = ["100", "250", "50", "500", "50", "250", "100"];
// base (logical) values will be scaled
const baseSlotY = 500;
const baseSlotHeight = 90;

// BALL PHYSICS (base)
const ballRadius = 7;
const gravityBase = 0.18;
const friction = 0.992;

let pegLayout = [];
let dividerPositions = [];

// scaled values (updated on resize)
let scale = 1;
let pegRadiusScaled = pegRadius;
let ballRadiusScaled = ballRadius;
let pegSpacingXScaled = pegSpacingX;
let pegSpacingYScaled = pegSpacingY;
let pegStartYScaled = pegStartY;
let slotYScaled = baseSlotY;
let slotHeightScaled = baseSlotHeight;
let gravityScaled = gravityBase;

// Build pegs (uses scaled spacing / start)
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

// Build dividers using the bins' area (correct)
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

// Resize canvas and recompute scaled values
function resizeCanvas() {
    // target size within viewport, leave small margin so mobile browsers' UI doesn't overlap
    const targetW = Math.max(320, Math.floor(window.innerWidth * 0.95));
    const targetH = Math.max(400, Math.floor(window.innerHeight * 0.95));

    // set actual canvas pixel size (keeps aspect consistent)
    canvas.width = targetW;
    canvas.height = targetH;

    // store for convenience
    screenWidth = canvas.width;
    screenHeight = canvas.height;

    // scale relative to a base width (600 is the base used previously)
    scale = screenWidth / 600;

    // scaled geometry
    pegRadiusScaled = pegRadius * Math.max(0.6, scale);
    ballRadiusScaled = ballRadius * Math.max(0.6, scale);
    pegSpacingXScaled = pegSpacingX * scale;
    pegSpacingYScaled = pegSpacingY * scale;
    pegStartYScaled = pegStartY * scale;

    // place bins near bottom but keep them proportional
    slotYScaled = Math.round(screenHeight * 0.72);   // ~72% down screen
    slotHeightScaled = Math.round(screenHeight * 0.20); // bottom 20%

    // gravity scales moderately with screen size so balls feel similar
    gravityScaled = gravityBase * Math.max(0.6, scale * 0.9);

    // rebuild dependent geometry
    buildPegs();
    buildDividers();

    // adjust font smoothing
    ctx.textBaseline = "top";
}

// Ball class uses scaled physics & collision checks
class Ball {
    constructor() {
        this.x = screenWidth / 2;
        this.y = Math.max(20, screenHeight * 0.05);
        this.vx = Math.random() * 1.6 - 0.8;
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

        // Walls: left / right bounce
        if (this.x < ballRadiusScaled) {
            this.x = ballRadiusScaled;
            this.vx *= -0.7;
        } else if (this.x > screenWidth - ballRadiusScaled) {
            this.x = screenWidth - ballRadiusScaled;
            this.vx *= -0.7;
        }

        // Peg collisions (circle-circle)
        for (let i = 0; i < pegLayout.length; i++) {
            const [px, py] = pegLayout[i];
            const dx = this.x - px;
            const dy = this.y - py;
            const dist = Math.hypot(dx, dy);
            if (dist < ballRadiusScaled + pegRadiusScaled && dist > 0) {
                const angle = Math.atan2(dy, dx);
                // give a slightly stronger bounce so ball moves visually
                this.vx = Math.cos(angle) * (1.4 + scale * 1.0);
                this.vy = Math.sin(angle) * (1.4 + scale * 1.0);
                // push out to avoid overlap
                const overlap = (ballRadiusScaled + pegRadiusScaled) - dist;
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }

        // Divider collisions (vertical lines in the slot area)
        const binsWidth = screenWidth * 0.8;
        const binsStart = (screenWidth - binsWidth) / 2;
        const slotW = binsWidth / slotLabels.length;

        for (let i = 0; i <= slotLabels.length; i++) {
            const dividerX = binsStart + i * slotW;
            // check x overlap with some tolerance, and only collide when ball is inside the slot vertical range
            if (Math.abs(this.x - dividerX) < ballRadiusScaled * 1.15 && this.y >= slotYScaled && this.y <= (slotYScaled + slotHeightScaled)) {
                // bounce horizontally
                if (this.x < dividerX) {
                    this.x = dividerX - ballRadiusScaled - 0.5;
                } else {
                    this.x = dividerX + ballRadiusScaled + 0.5;
                }
                this.vx *= -0.75 * (1 - Math.min(0.4, scale * 0.05)); // slightly scale bounce
                // small upward nudge so ball doesn't slide exactly on the line
                this.vy -= 0.4 * scale;
            }
        }

        // Stop at bottom: if below canvas bottom - small margin
        if (this.y > screenHeight - Math.max(10, Math.round(screenHeight * 0.03))) {
            this.active = false;
            // snap into a bin center (optional) — we leave it free so you can see ball resting
        }
    }

    draw() {
        // outer
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1, Math.floor(ballRadiusScaled)), 0, Math.PI * 2);
        ctx.fillStyle = "#FFEBC4";
        ctx.fill();

        // inner
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1, Math.floor(ballRadiusScaled - 3)), 0, Math.PI * 2);
        ctx.fillStyle = "#FFB450";
        ctx.fill();
    }
}

let balls = [];

// Input: click / tap to drop a ball
canvas.addEventListener("click", () => balls.push(new Ball()));
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    balls.push(new Ball());
}, { passive: false });

// resize handling
window.addEventListener("resize", () => {
    resizeCanvas();
});

// initial setup
resizeCanvas();

// Draw everything using scaled geometry
function draw() {
    // background
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // frame and board (drawn with small margins)
    ctx.fillStyle = FRAME;
    ctx.fillRect(15 * scale, 15 * scale, screenWidth - 30 * scale, screenHeight - 30 * scale);
    ctx.fillStyle = BOARD;
    ctx.fillRect(25 * scale, 25 * scale, screenWidth - 50 * scale, screenHeight - 50 * scale);

    // pegs
    for (let i = 0; i < pegLayout.length; i++) {
        const [x, y] = pegLayout[i];
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, pegRadiusScaled), 0, Math.PI * 2);
        ctx.fillStyle = PEG_COLOR;
        ctx.fill();
    }

    // dividers (bins)
    const binsWidth = screenWidth * 0.8;
    const binsStart = (screenWidth - binsWidth) / 2;
    const slotW = binsWidth / slotLabels.length;

    ctx.strokeStyle = DIVIDER;
    ctx.lineWidth = Math.max(1, Math.floor(3 * scale));
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
    const fontSize = Math.max(10, Math.floor(14 * scale));
    ctx.font = `${fontSize}px Arial`;
    for (let i = 0; i < slotLabels.length; i++) {
        const cx = binsStart + i * slotW + slotW / 2;
        ctx.fillText(slotLabels[i], cx, slotYScaled + Math.max(6, fontSize));
    }

    // balls
    for (let i = 0; i < balls.length; i++) {
        balls[i].draw();
    }
}

// update logic
function update() {
    for (let i = 0; i < balls.length; i++) {
        balls[i].update();
    }
    balls = balls.filter(b => b.active);
}

// main loop
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
