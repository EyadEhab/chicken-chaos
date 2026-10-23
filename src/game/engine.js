export const SKILLS = [
  { key: "rate", icon: "🔫", name: "Trigger Finger", desc: "+18% fire rate", max: 3 },
  { key: "multi", icon: "🌪️", name: "Shotgun Diplomacy", desc: "+1 bullet per shot", max: 2 },
  { key: "hull", icon: "🥫", name: "Cardboard Armor", desc: "+30 max HP & heal 30", max: 5 },
  { key: "pierce", icon: "🪡", name: "Personal Space? Never", desc: "Bullets pierce +1 enemy", max: 3 },
  { key: "magnet", icon: "🧲", name: "Snack Magnet", desc: "Loot flies to you", max: 3 },
];

const TYPES = [
  { e: "👽", hp: 1, r: 0.032, vy: 0.13, sc: 10, xp: 16, w: 4, dmg: 10 },
  { e: "🛸", hp: 2, r: 0.037, vy: 0.11, sc: 18, xp: 24, w: 3, dmg: 12, wob: 0.7 },
  { e: "👾", hp: 2, r: 0.03, vy: 0.17, sc: 24, xp: 28, w: 3, dmg: 12 },
  { e: "🪨", hp: 5, r: 0.046, vy: 0.085, sc: 38, xp: 44, w: 2, dmg: 16 },
  { e: "💀", hp: 3, r: 0.03, vy: 0.21, sc: 48, xp: 54, w: 1.4, dmg: 18 },
];

const BONUS = [
  { e: "⭐", kind: "star", hp: 1, r: 0.03, vy: 0.12, w: 1.2, dmg: 4, sc: 35, xp: 30 },
  { e: "🍕", kind: "pizza", hp: 1, r: 0.033, vy: 0.13, w: 1, dmg: 4, sc: 0, xp: 6 },
  { e: "💣", kind: "bomb", hp: 2, r: 0.034, vy: 0.16, w: 1.4, dmg: 22, sc: 60, xp: 55 },
];

const QUIPS = [
  "THE ALIENS WANT TO UNIONIZE",
  "SPACE LAWYERS ARE ON THEIR WAY",
  "THAT ROCK HAD A FAMILY",
  "YOUR INSURANCE SAYS NO",
  "AGGRESSIVELY HARMLESS",
  "HR HAS BEEN NOTIFIED",
  "CERTIFIED MENACE",
  "WRONG GALAXY, BUDDY",
  "OW, MY DIGNITY",
  "PLEASE STOP, THEY'RE FRIENDLY",
  "THAT WAS SOMEONE'S LUNCH",
  "GALAXY'S WORST TOURIST",
];

const STREAKS = [5, 10, 20, 35, 50, 75, 100];
const STREAK_TEXT = {
  5: "NICE SHOOTING",
  10: "KILLING SPREE",
  20: "UNHINGED",
  35: "MASSACRE INCOMING",
  50: "THEY FEAR YOU",
  75: "GALACTIC WAR CRIME",
  100: "DELETE THE GALAXY",
};

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class SpaceGame {
  constructor(canvas, cb = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cb = cb;
    this.w = 0;
    this.h = 0;
    this.raf = 0;
    this.last = 0;
    this.paused = false;
    this.over = false;
    this.keys = {};
    this.drag = false;
    this.sig = "";
    this.skills = { rate: 0, multi: 0, hull: 0, pierce: 0, magnet: 0 };

    this.bullets = [];
    this.enemies = [];
    this.parts = [];
    this.rings = [];
    this.floats = [];
    this.pickups = [];
    this.msgs = [];
    this.stars = [];

    this.time = 0;
    this.score = 0;
    this.combo = 0;
    this.comboT = 0;
    this.level = 1;
    this.xp = 0;
    this.points = 0;
    this.ultT = 0;
    this.ultMax = 18;
    this.spawnT = 1.2;
    this.msgT = 6;
    this.shake = 0;
    this.flashRed = 0;
    this.beam = 0;
    this.fireT = 0;

    this.ship = { x: 0, y: 0, tx: 0, tilt: 0, hp: 60, maxHp: 60, inv: 0, r: 20 };

    this.onResize = this.onResize.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointer = this.onPointer.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);
    this.loop = this.loop.bind(this);

    this.ro = new ResizeObserver(this.onResize);
    this.ro.observe(canvas);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onPointer);
    window.addEventListener("pointerup", this.onUp);
    this._vis = () => { if (document.hidden) this.setPaused(true); };
    document.addEventListener("visibilitychange", this._vis);

    this.onResize();
    this.ship.x = this.w / 2;
    this.ship.tx = this.w / 2;
    this.ship.r = this.h * 0.03;
    for (let i = 0; i < 130; i++) {
      this.stars.push({ x: Math.random(), y: Math.random(), z: rnd(0.2, 1), tw: Math.random() * 6 });
    }
    this.pushStats(true);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onPointer);
    window.removeEventListener("pointerup", this.onUp);
    document.removeEventListener("visibilitychange", this._vis);
  }

  onResize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (r.width * dpr > 1900) dpr = Math.max(1, 1900 / r.width);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width;
    this.h = r.height;
    this.bgG = null;
    this.ship.y = this.h - Math.max(56, this.h * 0.1);
    this.ship.x = clamp(this.ship.x || this.w / 2, 20, this.w - 20);
    this.ship.tx = clamp(this.ship.tx || this.w / 2, 20, this.w - 20);
    this.ship.r = Math.max(16, this.h * 0.03);
  }

  buildBg() {
    const { ctx, w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#05030f");
    g.addColorStop(0.5, "#0a0a1f");
    g.addColorStop(1, "#12082a");
    this.bgG = g;
    const n1 = ctx.createRadialGradient(w * 0.2, h * 0.25, 10, w * 0.2, h * 0.25, h * 0.6);
    n1.addColorStop(0, "rgba(120,60,255,0.20)");
    n1.addColorStop(1, "rgba(120,60,255,0)");
    this.neb1 = n1;
    const n2 = ctx.createRadialGradient(w * 0.85, h * 0.7, 10, w * 0.85, h * 0.7, h * 0.55);
    n2.addColorStop(0, "rgba(0,220,255,0.14)");
    n2.addColorStop(1, "rgba(0,220,255,0)");
    this.neb2 = n2;
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
    v.addColorStop(0, "rgba(255,0,60,0)");
    v.addColorStop(1, "rgba(255,20,60,0.7)");
    this.vigG = v;
  }

  local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onDown(e) {
    this.drag = true;
    const p = this.local(e);
    this.ship.tx = p.x;
  }
  onUp() { this.drag = false; }
  onPointer(e) {
    if (!this.drag && e.pointerType === "mouse" && e.buttons === 0) return;
    this.ship.tx = this.local(e).x;
  }
  onKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault();
    if (e.key.toLowerCase() === "e") this.useUlt();
    if (e.key === "Escape" && !this.over) this.setPaused(!this.paused);
  }

  togglePause() {
    if (this.over) return;
    this.setPaused(!this.paused);
  }
  onKeyUp(e) { this.keys[e.key.toLowerCase()] = false; }

  setPaused(p) {
    if (this.over) return;
    this.paused = p;
    this.last = performance.now();
    this.pushStats(true);
    if (this.cb.onPause) this.cb.onPause(p);
  }

  get maxHp() { return 60 + 30 * this.skills.hull; }
  canUpgrade() { return this.points > 0 && SKILLS.some((s) => this.skills[s.key] < s.max); }

  spend(key) {
    const s = SKILLS.find((x) => x.key === key);
    if (!s || this.points < 1 || this.skills[key] >= s.max) return false;
    this.points--;
    this.skills[key]++;
    if (key === "hull") {
      this.ship.maxHp = this.maxHp;
      this.ship.hp = Math.min(this.ship.maxHp, this.ship.hp + 30);
    } else {
      this.ship.maxHp = this.maxHp;
    }
    this.pushStats(true);
    return true;
  }

  useUlt() {
    if (this.paused || this.over || this.ultT < this.ultMax) return;
    this.ultT = 0;
    this.beam = 0.5;
    this.shake = 22;
    this.rings.push({ x: this.ship.x, y: this.ship.y, r: 10, max: this.h * 0.9, life: 0.7, t: 0, c: "#7ef9ff" });
    for (const e of this.enemies) {
      e.hp -= 14;
      e.flash = 1;
      this.burst(e.x, e.y, 8, "#7ef9ff", 1.4);
    }
    this.floats.push({ x: this.w / 2, y: this.h * 0.4, t: "MEGA BEAM!", c: "#7ef9ff", life: 1.2, vy: -30, size: 42, big: true });
    for (const e of this.enemies) {
      if (e.hp <= 0 && !e.gone) {
        e.gone = true;
        this.kill(e);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.gone && e.hp > 0);
    this.pushStats(true);
  }

  stats() {
    return {
      score: Math.round(this.score),
      hp: Math.max(0, Math.round(this.ship.hp)),
      maxHp: this.ship.maxHp,
      level: this.level,
      xp: this.xp,
      xpNeed: this.xpNeed(),
      points: this.points,
      up: this.canUpgrade(),
      combo: this.combo,
      mult: this.mult(),
      ult: this.ultT / this.ultMax,
      skills: { ...this.skills },
      time: this.time,
    };
  }

  xpNeed(l = this.level) { return 110 + l * 95; }
  mult() { return 1 + Math.min(this.combo, 60) * 0.04; }

  pushStats(force) {
    const s = this.stats();
    const sig = [
      s.score, s.hp, s.maxHp, s.level, s.points, s.combo,
      Math.round(s.xp / 4), Math.round(s.ult * 40), Math.floor(s.time),
      Object.values(s.skills).join(""),
    ].join("|");
    if (force || sig !== this.sig) {
      this.sig = sig;
      if (this.cb.onStats) this.cb.onStats(s);
    }
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.over) {
      if (this.paused) this.updateBg(dt);
      else this.update(dt);
      this.pushStats(false);
    }
    this.draw(dt);
  }

  updateBg(dt) {
    for (const s of this.stars) {
      s.y += dt * 0.03 * s.z;
      if (s.y > 1) { s.y = 0; s.x = Math.random(); }
    }
    this.shake *= 0.9;
    this.flashRed *= 0.92;
    if (this.beam > 0) this.beam = Math.max(0, this.beam - dt);
    this.rings = this.rings.filter((r) => (r.t += dt) < r.life);
    this.parts = this.parts.filter((p) => (p.life -= dt) > 0);
    this.floats = this.floats.filter((f) => (f.life -= dt) > 0);
  }

  update(dt) {
    this.time += dt;
    const { w, h, ship } = this;

    for (const s of this.stars) {
      s.y += dt * (0.03 + 0.12 * s.z);
      if (s.y > 1) { s.y = 0; s.x = Math.random(); }
    }

    const left = this.keys["a"] || this.keys["arrowleft"];
    const right = this.keys["d"] || this.keys["arrowright"];
    const moveSpeed = w * 1.1;
    if (left) { ship.tx -= moveSpeed * dt; ship.dragOff = 0.12; }
    if (right) { ship.tx += moveSpeed * dt; ship.dragOff = 0.12; }
    ship.tx = clamp(ship.tx, 16, w - 16);
    const dx = ship.tx - ship.x;
    ship.x += dx * Math.min(1, dt * 16);
    ship.tilt += (clamp(dx * 0.01, -0.4, 0.4) - ship.tilt) * Math.min(1, dt * 10);
    if (ship.inv > 0) ship.inv -= dt;

    this.fireT -= dt;
    const interval = 0.26 * Math.pow(0.86, this.skills.rate);
    if (this.fireT <= 0) {
      this.fireT = interval;
      this.fire();
    }

    this.ultT = Math.min(this.ultMax, this.ultT + dt);
    this.comboT -= dt;
    if (this.comboT <= 0 && this.combo > 0) { this.combo = 0; }

    this.spawnT -= dt;
    const spawnEvery = clamp(1.0 - this.time * 0.012, 0.24, 1.0);
    if (this.spawnT <= 0) {
      this.spawnT = spawnEvery;
      this.spawn(Math.min(4, 1 + Math.floor(this.time / 35)));
    }

    this.msgT -= dt;
    if (this.msgT <= 0) {
      this.msgT = rnd(9, 15);
      this.msgs.push({ text: pick(QUIPS), x: w + 10, y: rnd(h * 0.12, h * 0.4), life: 9, size: rnd(16, 30) });
    }

    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 7) b.trail.shift();
    }
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.y > -40 && b.x > -40 && b.x < w + 40);

    const magnetR = this.skills.magnet ? 90 + 110 * this.skills.magnet : 0;
    for (const p of this.pickups) {
      p.vy += (h * p.vy0 - p.vy) * dt * 0.4;
      p.y += p.vy * dt;
      p.x += Math.sin(this.time * 3 + p.ph) * 18 * dt;
      if (magnetR) {
        const d = Math.hypot(p.x - ship.x, p.y - ship.y);
        if (d < magnetR + h * 0.25) {
          p.x += ((ship.x - p.x) / d) * 460 * dt;
          p.y += ((ship.y - p.y) / d) * 460 * dt;
        }
      }
      if (Math.hypot(p.x - ship.x, p.y - ship.y) < ship.r + h * 0.035) {
        p.dead = true;
        this.collect(p);
      }
      if (p.y > h + 40) p.dead = true;
    }
    this.pickups = this.pickups.filter((p) => !p.dead);

    for (const e of this.enemies) {
      e.y += e.vy * dt;
      e.rot += e.spin * dt;
      if (e.wob) e.x += Math.sin(this.time * e.wob * 3 + e.ph) * 60 * dt;
      e.x = clamp(e.x, e.r, w - e.r);
      if (e.flash > 0) e.flash -= dt * 4;

      const d = Math.hypot(e.x - ship.x, e.y - ship.y);
      if (d < e.r + ship.r * 0.8) {
        e.hp = 0;
        e.gone = true;
        this.hurt(e.dmg || 8);
        this.explode(e.x, e.y, e.r, "#ff5d73");
      } else if (e.y - e.r > h) {
        e.hp = 0;
        e.gone = true;
        this.hurt(e.kind === "bomb" ? 25 : 10);
        this.explode(e.x, h - 6, e.r, e.kind === "bomb" ? "#ffd166" : "#ff5d73");
      }
    }

    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.gone || e.hp <= 0) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
          e.hp -= b.dmg;
          e.flash = 1;
          b.hits++;
          this.burst(b.x, b.y, 4, "#7ef9ff", 1);
          if (e.hp <= 0) {
            e.gone = true;
            this.kill(e);
          }
          if (b.hits > b.pierce) { b.dead = true; break; }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.gone && e.hp > 0);

    for (const m of this.msgs) { m.x -= 42 * dt; m.life -= dt; }
    this.msgs = this.msgs.filter((m) => m.life > 0 && m.x > -700);

    this.updateFx(dt);
    if (ship.hp <= 0 && !this.over) this.gameOver();
  }

  updateFx(dt) {
    this.shake *= Math.pow(0.001, dt);
    this.flashRed *= Math.pow(0.02, dt);
    if (this.beam > 0) this.beam = Math.max(0, this.beam - dt);
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.vx *= 0.98;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.life);
    for (const f of this.floats) { f.y += f.vy * dt; f.life -= dt; f.vy *= 0.96; }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  fire() {
    const n = 1 + this.skills.multi;
    const h = this.h;
    const dmg = 9 * (1 + Math.min(1, this.time / 110));
    const spread = 0.13;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * spread;
      this.bullets.push({
        x: this.ship.x + Math.cos(a) * 14,
        y: this.ship.y - 16,
        vx: Math.cos(a) * h * 1.5,
        vy: Math.sin(a) * h * 1.5,
        r: Math.max(4, h * 0.009),
        dmg,
        pierce: this.skills.pierce,
        hits: 0,
        life: 2.4,
        trail: [],
      });
    }
    this.burst(this.ship.x, this.ship.y - 22, 2, "#ffe66d", 0.5);
  }

  spawn(count = 1) {
    if (this.enemies.length > 30) return;
    const t = this.time;
    const pool = [];
    for (const T of TYPES) pool.push({ T, w: T.w });
    for (const B of BONUS) {
      let w = B.w;
      if (B.kind === "bomb") w *= 1 + Math.min(1.8, t / 40);
      pool.push({ T: B, w });
    }
    const total = pool.reduce((s, p) => s + p.w, 0);
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total;
      let def = pool[0];
      for (const p of pool) { r -= p.w; if (r <= 0) { def = p; break; } }
      const T = def.T;
      const size = this.h * T.r;
      const x0 = Math.min(size + 4, this.w / 2);
      const x1 = Math.max(x0, this.w - size - 4);
      this.enemies.push({
        x: rnd(x0, x1),
        y: -size - rnd(0, 60),
        r: size,
        hp: T.hp || 1,
        maxHp: T.hp || 1,
        vy: this.h * T.vy * (1 + Math.min(1.9, t / 42)),
        e: T.e,
        kind: T.kind || "enemy",
        dmg: T.dmg || 8,
        sc: T.sc || 0,
        xp: T.xp || 0,
        wob: T.wob || 0,
        rot: 0,
        spin: rnd(-1, 1) * 1.4,
        ph: Math.random() * 9,
        flash: 0,
        gone: false,
      });
    }
  }

  kill(e) {
    const pts = Math.round((e.sc || 10) * this.mult());
    this.score += pts;
    this.combo++;
    this.comboT = 2.6;
    if (STREAKS.includes(this.combo)) {
      this.floats.push({ x: this.w / 2, y: this.h * 0.3, t: STREAK_TEXT[this.combo], c: "#ffe66d", life: 1.4, vy: -20, size: 34, big: true });
      this.shake = Math.max(this.shake, 8);
    }
    this.gainXp(e.xp || 14);
    if (e.kind === "pizza") {
      this.floats.push({ x: e.x, y: e.y, t: "YOU WASTED THE PIZZA 😭", c: "#ff9f43", life: 1.3, vy: -70, size: 20 });
    } else {
      this.floats.push({ x: e.x, y: e.y, t: "+" + pts, c: "#8dff9b", life: 0.85, vy: -80, size: 20 });
    }
    if (e.kind === "enemy" && Math.random() < 0.09) {
      this.floats.push({ x: e.x, y: e.y - 26, t: pick(QUIPS), c: "#ff9ff3", life: 1.6, vy: -40, size: 15 });
    }
    this.explode(e.x, e.y, e.r, e.kind === "bomb" ? "#ffd166" : "#ff6b9d");
    if (e.kind === "bomb") {
      const R = this.h * 0.3;
      this.rings.push({ x: e.x, y: e.y, r: e.r, max: R, life: 0.5, t: 0, c: "#ffd166" });
      this.shake = Math.max(this.shake, 16);
      for (const o of this.enemies) {
        if (o === e || o.gone) continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) < R) {
          o.gone = true;
          const p = Math.round((o.sc || 10) * this.mult());
          this.score += p;
          this.gainXp(o.xp || 12);
          this.floats.push({ x: o.x, y: o.y, t: "+" + p, c: "#8dff9b", life: 0.8, vy: -70, size: 18 });
          this.explode(o.x, o.y, o.r, "#ffd166");
        }
      }
    }
    if (e.kind === "enemy" && Math.random() < 0.3) {
      this.pickups.push({ x: e.x, y: e.y, vy: 40, vy0: 0.1, kind: "star", ph: Math.random() * 9, r: this.h * 0.026, dead: false });
    }
    if (e.kind === "enemy" && Math.random() < 0.1 && this.ship.hp < this.ship.maxHp * 0.8) {
      this.pickups.push({ x: e.x + rnd(-30, 30), y: e.y, vy: 40, vy0: 0.1, kind: "pizza", ph: Math.random() * 9, r: this.h * 0.028, dead: false });
    }
    this.pushStats(true);
  }

  collect(p) {
    if (p.kind === "star") {
      const pts = Math.round(30 * this.mult());
      this.score += pts;
      this.gainXp(26);
      this.floats.push({ x: p.x, y: p.y, t: "+" + pts + " ⭐", c: "#ffe66d", life: 0.9, vy: -90, size: 22 });
    } else {
      this.ship.hp = Math.min(this.ship.maxHp, this.ship.hp + 20);
      this.floats.push({ x: p.x, y: p.y, t: "+20 HP", c: "#8dff9b", life: 1, vy: -90, size: 22 });
    }
    this.burst(p.x, p.y, 10, p.kind === "star" ? "#ffe66d" : "#ff9f43", 1.2);
    this.pushStats(true);
  }

  gainXp(n) {
    this.xp += n;
    let ups = 0;
    while (this.xp >= this.xpNeed()) {
      this.xp -= this.xpNeed();
      this.level++;
      this.points++;
      ups++;
    }
    if (ups) {
      const up = this.canUpgrade();
      this.floats.push({ x: this.w / 2, y: this.h * 0.45, t: "LEVEL " + this.level + (up ? " — SKILL POINT!" : " — MAXED OUT"), c: "#7ef9ff", life: 1.6, vy: -14, size: 30, big: true });
      this.rings.push({ x: this.ship.x, y: this.ship.y, r: 10, max: this.h * 0.5, life: 0.7, t: 0, c: "#7ef9ff" });
      this.pushStats(true);
      if (up && this.cb.onLevelUp) this.cb.onLevelUp();
    }
  }

  hurt(n) {
    if (this.ship.inv > 0) return;
    this.ship.hp -= n;
    this.ship.inv = 0.9;
    this.combo = 0;
    this.shake = Math.max(this.shake, 14);
    this.flashRed = 0.55;
    this.floats.push({ x: this.ship.x, y: this.ship.y - 40, t: "-" + n + " HP", c: "#ff5d73", life: 0.9, vy: -70, size: 24 });
    if (this.ship.hp <= 0) this.ship.hp = 0;
    this.pushStats(true);
  }

  gameOver() {
    this.over = true;
    this.explode(this.ship.x, this.ship.y, this.ship.r * 3, "#7ef9ff");
    this.shake = 30;
    if (this.cb.onGameOver) this.cb.onGameOver({ score: Math.round(this.score), time: this.time, level: this.level });
  }

  burst(x, y, n, color, scale = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rnd(60, 320) * scale;
      this.parts.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rnd(0.25, 0.65),
        max: 0.65,
        r: rnd(1.5, 4.5) * scale,
        c: color,
      });
    }
    const cap = 240;
    if (this.parts.length > cap) this.parts.splice(0, this.parts.length - cap);
  }

  explode(x, y, r, color) {
    this.burst(x, y, 16, color, 1.2);
    this.burst(x, y, 8, "#ffffff", 0.7);
    this.rings.push({ x, y, r: r * 0.5, max: r * 4.5, life: 0.4, t: 0, c: color });
    this.shake = Math.max(this.shake, 6);
  }

  draw(dt) {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    ctx.save();
    const sh = this.shake;
    if (sh > 0.5) ctx.translate(rnd(-sh, sh) * 0.4, rnd(-sh, sh) * 0.4);

    if (!this.bgG) this.buildBg();
    ctx.fillStyle = this.bgG;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.fillStyle = this.neb1;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = this.neb2;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#ffffff";
    for (const s of this.stars) {
      const tw = 0.6 + 0.4 * Math.sin(this.time * 3 + s.tw);
      ctx.globalAlpha = (0.25 + 0.7 * s.z) * tw;
      ctx.fillRect(s.x * w, s.y * h, s.z * 2.2, s.z * 2.2);
    }
    ctx.globalAlpha = 1;

    for (const m of this.msgs) {
      ctx.save();
      ctx.globalAlpha = clamp(m.life / 2, 0, 1) * 0.5;
      ctx.font = `900 ${m.size}px "Arial Black", system-ui, sans-serif`;
      ctx.fillStyle = "#ff9ff3";
      ctx.textAlign = "left";
      ctx.fillText(m.text, m.x, m.y);
      ctx.restore();
    }

    for (const p of this.pickups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(this.time * 4 + p.ph) * 0.4);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = p.kind === "star" ? "#ffe66d" : "#ff9f43";
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (!p.font) p.font = Math.round(p.r * 2.2) + "px serif";
      ctx.font = p.font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.e, 0, 0);
      ctx.restore();
    }

    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot * 0.5);
      if (e.kind === "bomb") {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#ff3b3b";
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (!e.font) e.font = Math.round(e.r * 2.1) + "px serif";
      ctx.font = e.font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(e.e, 0, 0);
      if (e.flash > 0) {
        ctx.globalAlpha = clamp(e.flash, 0, 1) * 0.85;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (e.maxHp > 2 && e.hp < e.maxHp) {
        const bw = e.r * 1.7;
        ctx.fillStyle = "rgba(0,0,0,.55)";
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw, 5);
        ctx.fillStyle = "#ff5d73";
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw * (e.hp / e.maxHp), 5);
      }
    }

    for (const b of this.bullets) {
      ctx.strokeStyle = "rgba(126,249,255,0.35)";
      ctx.lineWidth = b.r * 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (b.trail.length) {
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (const t of b.trail) ctx.lineTo(t.x, t.y);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(126,249,255,0.3)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#eaffff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.beam > 0) {
      const bw = this.beam * this.w * 0.6;
      const bg = ctx.createLinearGradient(this.ship.x - bw / 2, 0, this.ship.x + bw / 2, 0);
      bg.addColorStop(0, "rgba(126,249,255,0)");
      bg.addColorStop(0.5, "rgba(255,255,255,0.95)");
      bg.addColorStop(1, "rgba(126,249,255,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(this.ship.x - bw / 2, -20, bw, this.ship.y);
    }

    if (!this.over) this.drawShip();

    for (const r of this.rings) {
      const k = r.t / r.life;
      ctx.strokeStyle = r.c;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r + (r.max - r.r) * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const p of this.parts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    }
    ctx.globalAlpha = 1;

    for (const f of this.floats) {
      ctx.save();
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.font = `900 ${f.big ? f.size * (1 + (1 - f.life) * 0.1) : f.size}px "Arial Black", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(0,0,0,.65)";
      ctx.strokeText(f.t, f.x, f.y);
      ctx.fillStyle = f.c;
      ctx.fillText(f.t, f.x, f.y);
      ctx.restore();
    }

    if (this.flashRed > 0.01) {
      ctx.globalAlpha = clamp(this.flashRed, 0, 0.7) / 0.7;
      ctx.fillStyle = this.vigG;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  drawShip() {
    const { ctx, ship } = this;
    if (ship.inv > 0 && Math.floor(ship.inv * 14) % 2 === 0) return;
    const s = ship.r;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.tilt);

    const fl = (0.7 + Math.random() * 0.7) * s * 1.1;
    const fg = ctx.createLinearGradient(0, s * 0.5, 0, s * 0.5 + fl);
    fg.addColorStop(0, "#fff6b0");
    fg.addColorStop(0.45, "#ff9f1c");
    fg.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-s * 0.38, s * 0.5);
    ctx.lineTo(s * 0.38, s * 0.5);
    ctx.lineTo(0, s * 0.5 + fl);
    ctx.closePath();
    ctx.fill();

    const bg = ctx.createLinearGradient(-s, 0, s, 0);
    bg.addColorStop(0, "#5aa9e6");
    bg.addColorStop(0.5, "#f4fbff");
    bg.addColorStop(1, "#5aa9e6");
    ctx.fillStyle = bg;
    ctx.strokeStyle = "#0b1b33";
    ctx.lineWidth = Math.max(2, s * 0.13);
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.35);
    ctx.lineTo(s * 0.95, s * 0.75);
    ctx.lineTo(s * 0.4, s * 0.55);
    ctx.lineTo(-s * 0.4, s * 0.55);
    ctx.lineTo(-s * 0.95, s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#12e0d0";
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.3, s * 0.34, s * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ff5d73";
    ctx.beginPath();
    ctx.arc(-s * 0.95, s * 0.75, s * 0.16, 0, Math.PI * 2);
    ctx.arc(s * 0.95, s * 0.75, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.skills.magnet) {
      ctx.save();
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(this.time * 4);
      ctx.strokeStyle = "#7ef9ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, 90 + 110 * this.skills.magnet, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
