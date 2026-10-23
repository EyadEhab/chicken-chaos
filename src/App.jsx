import { useCallback, useEffect, useRef, useState } from "react";
import { SpaceGame, SKILLS } from "./game/engine";
import { live as liveOn, fetchTop, submitScore, mergeBoards } from "./api";

const DB = "astrochaos:players"; // { [name]: { best, games, kills? } }
const ME = "astrochaos:me";

const RANKS = [
  [10000, "Certified Menace"],
  [4000, "Galaxy Bouncer"],
  [1500, "Captain Crunch"],
  [500, "Space Intern"],
  [100, "Cannon Fodder"],
  [0, "Fresh Recruit"],
];

const OVER_LINES = [
  "Your ship exploded. It was mostly tape anyway.",
  "The aliens threw a party. You weren't invited.",
  "Somewhere, a recruitment poster just got torn down.",
  "Report filed: pilot was too busy showing off.",
  "Great run! Terrible landings.",
  "You hit everything except the escape pod.",
  "The galaxy remains undefeated.",
];

const load = () => {
  try { return JSON.parse(localStorage.getItem(DB)) || {}; } catch { return {}; }
};
const save = (d) => { try { localStorage.setItem(DB, JSON.stringify(d)); } catch {} };
const pick = (a) => a[(Math.random() * a.length) | 0];
const rankOf = (s) => (RANKS.find(([m]) => s >= m) || RANKS[RANKS.length - 1])[1];

const EMPTY = {
  score: 0, hp: 50, maxHp: 50, level: 1, xp: 0, xpNeed: 205,
  points: 0, up: false, combo: 0, mult: 1, ult: 0, time: 0,
  skills: { rate: 0, multi: 0, hull: 0, pierce: 0, magnet: 0 },
};

export default function App() {
  const [me, setMe] = useState(() => { try { return localStorage.getItem(ME) || ""; } catch { return ""; } });
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(load);
  const [remoteBoard, setRemoteBoard] = useState([]);
  const [phase, setPhase] = useState("menu"); // menu | play | over
  const [stats, setStats] = useState(EMPTY);
  const [panel, setPanel] = useState(null); // null | "skills" | "pause"
  const [result, setResult] = useState(null);
  const [newBest, setNewBest] = useState(false);

  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const meRef = useRef(me);
  meRef.current = me;

  const login = (e) => {
    e.preventDefault();
    const n = name.trim().slice(0, 14);
    if (!n) return;
    try { localStorage.setItem(ME, n); } catch {}
    const d = load();
    if (!d[n]) d[n] = { best: 0, games: 0 };
    save(d); setPlayers(d); setMe(n);
  };

  const logout = () => {
    try { localStorage.removeItem(ME); } catch {}
    setMe(""); setName(""); setPhase("menu"); setPanel(null);
  };

  const start = useCallback(() => {
    setStats(EMPTY);
    setResult(null);
    setNewBest(false);
    setPanel(null);
    setPhase("play");
  }, []);

  const refreshRemote = useCallback(() => {
    if (!liveOn) return;
    fetchTop(60)
      .then((rows) => setRemoteBoard(rows))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshRemote();
  }, [refreshRemote, phase, me]);

  useEffect(() => {
    if (phase !== "play" || !canvasRef.current) return;
    const game = new SpaceGame(canvasRef.current, {
      onStats: setStats,
      onLevelUp: () => {
        setPanel((c) => c || "skills");
        gameRef.current?.setPaused(true);
      },
      onPause: (p) => setPanel((c) => (p ? c || "pause" : null)),
      onGameOver: ({ score, time, level }) => {
        const d = load();
        const p = d[meRef.current] || { best: 0, games: 0 };
        const best = Math.max(p.best, score);
        setNewBest(score > p.best && score > 0);
        d[meRef.current] = { best, games: p.games + 1 };
        save(d); setPlayers(d);
        submitScore(meRef.current, score).then(refreshRemote).catch(() => {});
        setResult({ score, time, level, line: pick(OVER_LINES) });
        setPanel(null);
        setPhase("over");
      },
    });
    gameRef.current = game;
    return () => { game.destroy(); gameRef.current = null; };
  }, [phase]);

  const spend = (key) => {
    const g = gameRef.current;
    if (!g) return;
    if (g.spend(key)) {
      setStats(g.stats());
      setPanel(null);
      g.setPaused(false);
    }
  };

  const closePanel = () => {
    const g = gameRef.current;
    if (!g) return;
    setPanel(null);
    g.setPaused(false);
  };

  const useUlt = () => gameRef.current?.useUlt();

  const merged = mergeBoards(players, remoteBoard);
  const board = merged.slice(0, 10);

  if (!me) {
    return (
      <main className="login">
        <div className="stars-bg" />
        <div className="floaters" aria-hidden>
          {["🚀", "👽", "🛸", "⭐", "💣", "🍕"].map((e, i) => (
            <span key={i} className={"floater f" + i}>{e}</span>
          ))}
        </div>
        <h1 className="logo">ASTRO CHAOS <span className="spin">🚀</span></h1>
        <p className="sub">Infinite space. Falling aliens. Zero refunds.<br />Shoot everything. Collect stars. Get ridiculous skills.</p>
        <form onSubmit={login} className="card">
          <label htmlFor="n">What do we call you, pilot?</label>
          <input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Captain Wobble" maxLength={14} autoFocus />
          <button className="btn" disabled={!name.trim()}>Launch me</button>
          <p className="tiny">Name only. No password. No nonsense.</p>
        </form>
      </main>
    );
  }

  const meBest = merged.find((p) => p.n === me)?.best ?? 0;

  return (
    <main className="app">
      {phase !== "play" && (
        <header className="topbar">
          <span className="who"> pilot <b>{me}</b> · best <b>{meBest}</b></span>
          <button className="link" onClick={logout}>switch pilot</button>
        </header>
      )}

      {phase === "menu" && (
        <section className="panel center">
          <h2 className="tag">Ready to cause problems?</h2>
          <ul className="howto">
            <li>🖱️ <b>Drag</b> (or A/D / ←→) to fly</li>
            <li>🔫 <b>Auto-fire</b> is on — just aim your face</li>
            <li>💣 Shoot bombs before they hit you</li>
            <li>🍕 Catch pizza. ⭐ Shoot stars.</li>
            <li>⭐ Level up → spend <b>skill points</b></li>
          </ul>
          <button className="btn big" onClick={start}>LAUNCH 🚀</button>
        </section>
      )}

      {phase === "play" && (
        <div className="stage">
          <canvas ref={canvasRef} className="game" />
          <div className="hud">
            <div className="hudRow">
              <div className="stat score">⭐ {stats.score}</div>
              <div className="stat">LV <b>{stats.level}</b></div>
              <div className="stat combo" data-hot={stats.combo > 4}>
                x{stats.mult.toFixed(2)} <small>{stats.combo} combo</small>
              </div>
              <button className="mini" onClick={() => { setPanel("pause"); gameRef.current?.setPaused(true); }}>⏸</button>
            </div>
            <div className="bars">
              <div className="bar hp"><i style={{ width: (stats.hp / stats.maxHp) * 100 + "%" }} /><span>{stats.hp}/{stats.maxHp} HP</span></div>
              <div className="bar xp"><i style={{ width: (stats.xp / stats.xpNeed) * 100 + "%" }} /><span>LV {stats.level}</span></div>
            </div>
            {stats.points > 0 && stats.up && !panel && (
              <button className="skillPing" onClick={() => { setPanel("skills"); gameRef.current?.setPaused(true); }}>
                +{stats.points} SKILL POINT{stats.points > 1 ? "S" : ""} — SPEND THEM
              </button>
            )}
          </div>

          <button className={"ult" + (stats.ult >= 1 ? " ready" : "")} onClick={useUlt} disabled={stats.ult < 1}>
            <span className="ultRing" style={{ "--p": stats.ult }} />
            <b>{stats.ult >= 1 ? "MEGA BEAM" : "CHARGING"}</b>
            <small>{stats.ult >= 1 ? "press E" : Math.ceil((1 - stats.ult) * 18) + "s"}</small>
          </button>

          {panel === "skills" && (
            <div className="overlay">
              <div className="sheet">
                <h3>🛠️ SKILL POINTS: <b>{stats.points}</b> <small className="tiny">— click a skill to upgrade</small></h3>
                <p className="tiny">Level {stats.level} · {stats.xp}/{stats.xpNeed} XP to next</p>
                <div className="skills">
                  {SKILLS.map((s) => {
                    const lv = stats.skills[s.key];
                    const full = lv >= s.max;
                    const can = stats.points > 0 && !full;
                    return (
                      <button key={s.key} className={"skill" + (can ? " can" : "")} disabled={!can}
                        onClick={() => spend(s.key)} title={s.desc}>
                        <span className="ic">{s.icon}</span>
                        <span className="nm">{s.name}</span>
                        <span className="ds">{s.desc}</span>
                        <span className="pips">{Array.from({ length: s.max }, (_, i) => <i key={i} className={i < lv ? "on" : ""} />)}</span>
                      </button>
                    );
                  })}
                </div>
                <button className="btn" onClick={closePanel}>Back to chaos</button>
              </div>
            </div>
          )}

          {panel === "pause" && (
            <div className="overlay">
              <div className="sheet center">
                <h3>⏸ Paused</h3>
                <p className="tiny">The aliens are also resting. Rude.</p>
                <button className="btn" onClick={closePanel}>Resume</button>
                <button className="btn ghost" onClick={() => { setPanel(null); setPhase("menu"); }}>Abandon run</button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "over" && result && (
        <section className="panel center over">
          <h2 className="tag">💀 GAME OVER</h2>
          <div className="bigScore">{result.score}</div>
          <p className="tiny">{rankOf(result.score)} · level {result.level} · survived {Math.round(result.time)}s</p>
          <p className="quip">“{result.line}”</p>
          {newBest && <p className="best">🎉 NEW PERSONAL BEST!</p>}
          <button className="btn big" onClick={start}>RUN IT BACK 🔁</button>
        </section>
      )}

      <section className="board">
        <h3>🏆 GALACTIC LEADERBOARD <span className="dot">{liveOn ? "· live" : "· this device"}</span></h3>
        {board.length === 0 ? (
          <p className="tiny">Nobody has embarrassed themselves yet.</p>
        ) : (
          <ol>
            {board.map((p, i) => (
              <li key={p.n} className={p.n === me ? "me" : ""}>
                <span className="medal">{["🥇", "🥈", "🥉"][i] || "#" + (i + 1)}</span>
                <span className="nm">{p.n}</span>
                <span className="rk">{rankOf(p.best)}</span>
                <b>{p.best}</b>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
