# best-stealth-game-21-nov-2026

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/dajinxiaodui/best-stealth-game-21-nov-2026/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/dajinxiaodui/best-stealth-game-21-nov-2026/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**The Quiet Gallery** — a top-down stealth game. You are Wren, a thief in a closed museum after dark. Slip past patrolling guards with ray-cast vision cones, pocket every glowing artefact, and reach the green exit unseen — across three wings, each harder than the last.

## How it plays

- **Move** with WASD or arrow keys. **Shift** to sneak: slower, quieter, and harder for guards to spot.
- **Guards patrol** fixed routes and watch a yellow vision cone that stops at walls and display cases. If they see you, a suspicion arc fills; at full, the alarm sounds and they chase. Break line of sight and they give up and go back to patrol.
- **Running is loud** — guards nearby hear your footsteps and come to look.
- **Click to toss a coin** (3 per wing) and lure a guard away from your route.
- **Collect all 3 artefacts** to unlock the exit. Clearing a wing unseen earns a ghost bonus; getting caught costs a life (3 per run).
- Synthesised WebAudio sound: footsteps, artefact chimes, alarm stings. No audio files, no network — the whole game is static files under `game/`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Node.js 22 or later.

Screenshots were taken from the game's own code in headless Chromium (`?shot=start|play|end&seed=1`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=qtgxrqfw&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
