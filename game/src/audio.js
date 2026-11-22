// All sound is synthesised with WebAudio: no audio files, no network. A soft
// footstep tick, a chime for artefacts, a low sting when a guard spots you, and
// a quiet room tone under everything. The context is created on the first
// key press or click, so browsers' autoplay rules are satisfied.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
      startRoomTone();
    } catch {
      return false;
    }
    return true;
  }

  function startRoomTone() {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    lfo.start();
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    footstep(sneaking) {
      blip(sneaking ? 180 : 130, 0.06, 'triangle', sneaking ? 0.12 : 0.3);
    },
    artefact() {
      blip(880, 0.18, 'sine', 0.5);
      blip(1318, 0.28, 'sine', 0.4, 0.07);
    },
    spotted() {
      blip(196, 0.35, 'sawtooth', 0.35);
      blip(147, 0.5, 'sawtooth', 0.3, 0.08);
    },
    alarm() {
      blip(110, 0.5, 'square', 0.3);
      blip(165, 0.5, 'square', 0.28, 0.16);
    },
    caught() {
      blip(98, 0.7, 'sawtooth', 0.4);
      blip(65, 0.9, 'sawtooth', 0.35, 0.15);
    },
    levelClear() {
      [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.3, 'sine', 0.4, i * 0.09));
    },
    coin() {
      blip(1568, 0.12, 'sine', 0.35);
      blip(1175, 0.16, 'sine', 0.3, 0.05);
    },
  };
}
