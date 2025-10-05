const canvas = document.createElement('canvas');
document.body.prepend(canvas);
const ctx = canvas.getContext('2d');
canvas.style.position = 'fixed';
canvas.style.top = 0;
canvas.style.left = 0;
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const points = Array.from({length: 120}, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  dx: (Math.random() - 0.5) * 0.6,
  dy: (Math.random() - 0.5) * 0.6
}));

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    p.x += p.dx; p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#19b5ff';
    ctx.fill();

    for (let j = i + 1; j < points.length; j++) {
      const q = points[j];
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      if (dist < 140) {
        ctx.strokeStyle = 'rgba(25,181,255,' + (1 - dist / 140) + ')';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(draw);
}
draw();
