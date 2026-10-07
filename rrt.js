// Live RRT in the hero background: grows a tree from a start point toward a goal,
// avoiding circular obstacles, then traces the found path. Click to move the goal.
(() => {
  const canvas = document.getElementById("rrt");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const STEP = 22, GOAL_BIAS = 0.06, PER_FRAME = 8, MAX_NODES = 2500;
  let W, H, start, goal, obstacles, nodes, path, holdUntil;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function collides(x, y) {
    return obstacles.some(o => (x - o.x) ** 2 + (y - o.y) ** 2 < o.r ** 2);
  }

  function segmentFree(a, b) {
    for (let t = 0; t <= 1; t += 0.2) {
      if (collides(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }

  function reset(newGoal) {
    start = { x: W * 0.06, y: H * 0.85 };
    goal = newGoal || { x: W * rand(0.75, 0.95), y: H * rand(0.1, 0.4) };
    obstacles = [];
    for (let i = 0; i < Math.round((W * H) / 60000); i++) {
      const o = { x: rand(0, W), y: rand(0, H), r: rand(14, 44) };
      const clear = p => (p.x - o.x) ** 2 + (p.y - o.y) ** 2 > (o.r + 30) ** 2;
      if (clear(start) && clear(goal)) obstacles.push(o);
    }
    nodes = [{ x: start.x, y: start.y, parent: -1 }];
    path = null;
    holdUntil = 0;
  }

  function extend() {
    const s = Math.random() < GOAL_BIAS ? goal : { x: rand(0, W), y: rand(0, H) };
    let best = 0, bd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = (nodes[i].x - s.x) ** 2 + (nodes[i].y - s.y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const n = nodes[best], d = Math.sqrt(bd);
    if (d < 1) return;
    const k = Math.min(STEP, d) / d;
    const q = { x: n.x + (s.x - n.x) * k, y: n.y + (s.y - n.y) * k, parent: best };
    if (!segmentFree(n, q)) return;
    nodes.push(q);
    if ((q.x - goal.x) ** 2 + (q.y - goal.y) ** 2 < STEP ** 2) {
      path = [goal];
      for (let i = nodes.length - 1; i !== -1; i = nodes[i].parent) path.push(nodes[i]);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(148, 163, 184, 0.045)";
    for (const o of obstacles) { ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); }

    ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i], p = nodes[n.parent];
      ctx.moveTo(p.x, p.y); ctx.lineTo(n.x, n.y);
    }
    ctx.stroke();

    if (path) {
      ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }

    dot(start, "#38bdf8");
    dot(goal, "#f59e0b");
  }

  function dot(p, c) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
  }

  function frame(t) {
    if (!path && nodes.length < MAX_NODES) {
      for (let i = 0; i < PER_FRAME && !path; i++) extend();
    } else if (!holdUntil) {
      holdUntil = t + 4000;
    } else if (t > holdUntil) {
      reset();
    }
    draw();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("click", e => {
    const r = canvas.getBoundingClientRect();
    const g = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (reduced) { reset(g); while (!path && nodes.length < MAX_NODES) extend(); draw(); return; }
    reset(g);
  });
  window.addEventListener("resize", () => { resize(); reset(); });

  resize();
  reset();
  if (reduced) {
    while (!path && nodes.length < MAX_NODES) extend();
    draw();
  } else {
    requestAnimationFrame(frame);
  }
})();
