// Staged scenes for screenshots: ?shot=start|play|end (with &seed=N) paints one
// fixed scene instead of running the loop, paints it twice, and sets
// window.__shotReady so a screenshot tool knows the frame is settled.
//   start — the title screen over the foyer, guards on patrol.
//   play  — mid-sneak: Wren crouched behind a case, a guard's cone sweeping past.
//   end   — the win screen after the last wing is cleared.

export function stageShot(name, world) {
  const state = world.state;
  if (name === 'start') {
    world.loadLevel(0);
    return { screen: 'title', best: 0 };
  }
  if (name === 'play') {
    world.loadLevel(1);
    // Wren crouched behind the long hall's first case, a guard closing in.
    state.player.x = 150;
    state.player.y = 380;
    state.player.sneaking = true;
    state.player.facing = Math.PI / 2;
    state.artefacts[0].taken = true;
    state.artefactsGot = 1;
    state.score = 250;
    state.coins = 2;
    // Put the nearest guard mid-patrol with its cone brushing the player.
    const guard = state.guards[0];
    guard.x = 150;
    guard.y = 260;
    guard.facing = Math.PI / 2;
    guard.detection = 0.55;
    guard.waypointIndex = 1;
    const guard2 = state.guards[1];
    guard2.x = 700;
    guard2.y = 480;
    guard2.facing = 0;
    return { screen: 'play', best: 1250 };
  }
  if (name === 'end') {
    world.loadLevel(2);
    state.artefacts.forEach((a) => { a.taken = true; });
    state.artefactsGot = state.artefacts.length;
    state.exitOpen = true;
    state.score = 4860;
    state.won = true;
    return { screen: 'win', best: 4860 };
  }
  return { screen: 'title', best: 0 };
}
