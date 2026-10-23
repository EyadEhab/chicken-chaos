import { useEffect, useRef, useState } from "react";

const DB = "chickenchaos:players"; // { [name]: { best, games } }
const ME = "chickenchaos:me";
const GOOD = ["🐔", "🐥", "🐓"];
const BAD = ["💣", "💩", "🌶️"];
const ROUND = 30;
const JOKES = [
  "The chickens are laughing at you.",
  "Not bad for a human.",
  "Egg-cellent clicking!",
  "You're on a roll... of eggs.",
  "Chicken dinner secured!",
  "Poop dodger of the year!",
];

const load = () => { try { return JSON.parse(localStorage.getItem(DB)) || {}; } catch { return {}; } };
const save = (d) => { try { localStorage.setItem(DB, JSON.stringify(d)); } catch {} };
const rand = (a) => a[Math.floor(Math.random() * a.length)];

export default function App() {
  const [me, setMe] = useState(() => { try { return localStorage.getItem(ME) || ""; } catch { return ""; } });
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(load);
  const [phase, setPhase] = useState("menu"); // menu | play | over
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(ROUND);
  const [items, setItems] = useState([]);
  const [pops, setPops] = useState([]);
  const scoreRef = useRef(0);
  const id = useRef(0);

  const login = (e) => {
    e.preventDefault();
    const n = name.trim().slice(0, 14);
    if (!n) return;
    try { localStorage.setItem(ME, n); } catch {}
    const d = load();
    if (!d[n]) d[n] = { best: 0, games: 0 };
    save(d); setPlayers(d); setMe(n);
  };
  const logout = () => { try { localStorage.removeItem(ME); } catch {} setMe(""); setName(""); setPhase("menu"); };

  const start = () => { scoreRef.current = 0; setScore(0); setTime(ROUND); setItems([]); setPhase("play"); };

  useEffect(() => {
    if (phase !== "play") return;
    const clock = setInterval(() => setTime((t) => t - 1), 1000);
    const spawn = setInterval(() => {
      const bad = Math.random() < 0.3;
      const it = { id: id.current++, e: rand(bad ? BAD : GOOD), bad, x: 5 + Math.random() * 80, y: 5 + Math.random() * 75 };
      setItems((l) => [...l.slice(-6), it]);
      setTimeout(() => setItems((l) => l.filter((i) => i.id !== it.id)), 1100);
    }, 450);
    return () => { clearInterval(clock); clearInterval(spawn); };
  }, [phase]);

  useEffect(() => {
    if (phase === "play" && time <= 0) {
      const d = load();
      const p = d[me] || { best: 0, games: 0 };
      d[me] = { best: Math.max(p.best, scoreRef.current), games: p.games + 1 };
      save(d); setPlayers(d); setPhase("over");
    }
  }, [time, phase, me]);

  const hit = (it) => {
    setItems((l) => l.filter((i) => i.id !== it.id));
    const pts = it.bad ? -3 : 1;
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    setScore(scoreRef.current);
    const pid = id.current++;
    setPops((l) => [...l, { id: pid, x: it.x, y: it.y, t: it.bad ? "-3 OUCH" : "+1" , bad: it.bad }]);
    setTimeout(() => setPops((l) => l.filter((p) => p.id !== pid)), 700);
  };

  const board = Object.entries(players).map(([n, v]) => ({ n, ...v })).sort((a, b) => b.best - a.best).slice(0, 10);

  if (!me) {
    return (
      <main className="wrap">
        <h1 className="logo">Chicken Chaos <span className="bob">🐔</span></h1>
        <p className="sub">Tap the chickens. Dodge the bombs, poop and spicy peppers.</p>
        <form onSubmit={login} className="card">
          <label htmlFor="n">What's your name?</label>
          <input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sir Cluckington" maxLength={14} autoFocus />
          <button className="btn" disabled={!name.trim()}>Let me in</button>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header className="top">
        <span>Hi, <b>{me}</b>! Best: <b>{players[me]?.best ?? 0}</b></span>
        <button className="link" onClick={logout}>Switch player</button>
      </header>

      {phase === "play" ? (
        <>
          <div className="hud"><span>⭐ {score}</span><span>⏱ {time}s</span></div>
          <div className="arena">
            {items.map((it) => (
              <button key={it.id} className="item" style={{ left: it.x + "%", top: it.y + "%" }}
                onPointerDown={() => hit(it)} aria-label={it.bad ? "Bad thing" : "Chicken"}>{it.e}</button>
            ))}
            {pops.map((p) => (
              <span key={p.id} className={"pop " + (p.bad ? "badpop" : "")} style={{ left: p.x + "%", top: p.y + "%" }}>{p.t}</span>
            ))}
          </div>
        </>
      ) : (
        <section className="card center">
          {phase === "over" ? (
            <>
              <h2>Time's up! You got {score}</h2>
              <p className="sub">{score >= (players[me]?.best ?? 0) && score > 0 ? "New personal best! 🎉" : rand(JOKES)}</p>
            </>
          ) : (
            <h2>Ready? You have {ROUND} seconds.</h2>
          )}
          <button className="btn" onClick={start}>{phase === "over" ? "Play again" : "Start"}</button>
        </section>
      )}

      <section className="card">
        <h3>🏆 Leaderboard</h3>
        {board.length === 0 ? <p className="sub">No scores yet. Be the first!</p> : (
          <ol className="board">
            {board.map((p) => (
              <li key={p.n} className={p.n === me ? "me" : ""}><span>{p.n}</span><b>{p.best}</b></li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
