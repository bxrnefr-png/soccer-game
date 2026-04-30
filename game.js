const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

// Game constants
const FIELD_WIDTH = canvas.width;
const FIELD_HEIGHT = canvas.height;
const PLAYER_SIZE = 20;
const BALL_RADIUS = 8;
const KICK_FORCE = 15;
const FRICTION = 0.98;
const PLAYER_SPEED = 5;
const OBSTACLE_SCORE_THRESHOLD = 20;

// Game state
const player = {
    x: FIELD_WIDTH / 2,
    y: FIELD_HEIGHT - 100,
    vx: 0,
    vy: 0,
    size: PLAYER_SIZE
};

const ball = {
    x: FIELD_WIDTH / 2,
    y: FIELD_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS
};

const keys = {};
let score = 0;
let lastKickTime = 0;
const KICK_COOLDOWN = 500; // ms
let obstacles = [];
let obstaclesGenerated = false;

// Input handling
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ') {
        e.preventDefault();
        kickBall();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function generateObstacles() {
    obstacles = [];
    const netX = FIELD_WIDTH / 2;
    const netY = 10;
    
    // Generate 3-4 random obstacles in the goal area
    const numObstacles = 3 + Math.floor(Math.random() * 2); // 3-4 obstacles
    
    for (let i = 0; i < numObstacles; i++) {
        const obstacleWidth = 20 + Math.random() * 30;
        const obstacleHeight = 15 + Math.random() * 20;
        
        // Random X position across the goal width (centered around net)
        const minX = netX - 70;
        const maxX = netX + 70;
        const x = minX + Math.random() * (maxX - minX);
        
        // Random Y position in goal area
        const y = netY + Math.random() * 30;
        
        obstacles.push({
            x: x,
            y: y,
            width: obstacleWidth,
            height: obstacleHeight
        });
    }
    
    obstaclesGenerated = true;
}

function checkObstacleCollision(circleX, circleY, circleRadius) {
    for (let obstacle of obstacles) {
        // Find closest point on rectangle to circle
        const closestX = Math.max(obstacle.x - obstacle.width / 2, 
                                  Math.min(circleX, obstacle.x + obstacle.width / 2));
        const closestY = Math.max(obstacle.y - obstacle.height / 2, 
                                  Math.min(circleY, obstacle.y + obstacle.height / 2));
        
        // Calculate distance
        const distX = circleX - closestX;
        const distY = circleY - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        if (distance < circleRadius) {
            return true; // Collision detected
        }
    }
    return false;
}

function kickBall() {
    const now = Date.now();
    if (now - lastKickTime < KICK_COOLDOWN) return;
    lastKickTime = now;

    // Calculate direction from player to ball
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 60) { // Kick range
        const angle = Math.atan2(dy, dx);
        ball.vx = Math.cos(angle) * KICK_FORCE;
        ball.vy = Math.sin(angle) * KICK_FORCE;
    }
}

function updatePlayer() {
    let accel_x = 0;
    let accel_y = 0;

    // Handle input (arrow keys or WASD)
    if (keys['arrowup'] || keys['w']) accel_y = -PLAYER_SPEED;
    if (keys['arrowdown'] || keys['s']) accel_y = PLAYER_SPEED;
    if (keys['arrowleft'] || keys['a']) accel_x = -PLAYER_SPEED;
    if (keys['arrowright'] || keys['d']) accel_x = PLAYER_SPEED;

    player.vx = accel_x;
    player.vy = accel_y;

    player.x += player.vx;
    player.y += player.vy;

    // Boundary collision
    player.x = Math.max(player.size, Math.min(FIELD_WIDTH - player.size, player.x));
    player.y = Math.max(player.size, Math.min(FIELD_HEIGHT - player.size, player.y));
}

function updateBall() {
    // Apply friction
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collision with bounce
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx *= -0.8;
    }
    if (ball.x + ball.radius > FIELD_WIDTH) {
        ball.x = FIELD_WIDTH - ball.radius;
        ball.vx *= -0.8;
    }
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -0.8;
    }
    if (ball.y + ball.radius > FIELD_HEIGHT) {
        ball.y = FIELD_HEIGHT - ball.radius;
        ball.vy *= -0.8;
    }

    // Obstacle collision
    if (score >= OBSTACLE_SCORE_THRESHOLD) {
        if (checkObstacleCollision(ball.x, ball.y, ball.radius)) {
            // Bounce ball away from obstacle
            ball.vx *= -0.7;
            ball.vy *= -0.7;
        }
    }

    // Check goal (top area)
    if (ball.y - ball.radius < 20 && ball.x > FIELD_WIDTH / 2 - 80 && ball.x < FIELD_WIDTH / 2 + 80) {
        // If obstacles exist, check if ball got through them
        if (score >= OBSTACLE_SCORE_THRESHOLD) {
            if (!checkObstacleCollision(ball.x, ball.y, ball.radius)) {
                score++;
                scoreDisplay.textContent = score;
                resetBall();
            }
        } else {
            score++;
            scoreDisplay.textContent = score;
            resetBall();
            
            // Generate obstacles when reaching threshold
            if (score === OBSTACLE_SCORE_THRESHOLD) {
                generateObstacles();
            }
        }
    }

    // Player-ball collision
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = ball.radius + player.size;

    if (distance < minDistance && distance > 0) {
        const angle = Math.atan2(dy, dx);
        const speed = 3;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
    }
}

function resetBall() {
    ball.x = FIELD_WIDTH / 2;
    ball.y = FIELD_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
}

function drawField() {
    // Field background
    ctx.fillStyle = '#2a8f3d';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Field lines
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    // Center line
    ctx.beginPath();
    ctx.moveTo(FIELD_WIDTH / 2, 0);
    ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Goal area top
    ctx.strokeRect(FIELD_WIDTH / 2 - 100, 0, 200, 40);

    // Net visualization
    drawNet();
}

function drawNet() {
    const netX = FIELD_WIDTH / 2;
    const netY = -5;
    const netWidth = 160;
    const netHeight = 30;

    // Net goal opening
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(netX - netWidth / 2, netY, netWidth, netHeight);

    // Net pattern (grid)
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(netX - netWidth / 2 + (i * netWidth / 8), netY);
        ctx.lineTo(netX - netWidth / 2 + (i * netWidth / 8), netY + netHeight);
        ctx.stroke();
    }
    for (let i = 0; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(netX - netWidth / 2, netY + (i * netHeight / 3));
        ctx.lineTo(netX + netWidth / 2, netY + (i * netHeight / 3));
        ctx.stroke();
    }
}

function drawObstacles() {
    if (score >= OBSTACLE_SCORE_THRESHOLD && obstacles.length > 0) {
        ctx.fillStyle = '#FF0000';
        ctx.strokeStyle = '#CC0000';
        ctx.lineWidth = 2;
        
        for (let obstacle of obstacles) {
            ctx.fillRect(
                obstacle.x - obstacle.width / 2,
                obstacle.y - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            );
            ctx.strokeRect(
                obstacle.x - obstacle.width / 2,
                obstacle.y - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            );
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(
        player.x - player.size / 2,
        player.y - player.size / 2,
        player.size,
        player.size
    );

    // Direction indicator
    ctx.fillStyle = '#FF8888';
    ctx.beginPath();
    ctx.arc(player.x, player.y - player.size / 2 - 5, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawBall() {
    // Ball body
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Pentagon pattern on ball
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = ball.x + Math.cos(angle) * (ball.radius - 3);
        const y = ball.y + Math.sin(angle) * (ball.radius - 3);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
}

function gameLoop() {
    updatePlayer();
    updateBall();

    drawField();
    drawObstacles();
    drawPlayer();
    drawBall();

    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
