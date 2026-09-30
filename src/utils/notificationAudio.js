/**
 * Synthesizer sound generator using Web Audio API for Live Order alerts
 */
export const playNotificationSound = (themeName = 'chime') => {
  const selectedTheme = themeName || localStorage.getItem('live_order_sound_theme') || 'chime';
  if (selectedTheme === 'mute') return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const playTone = (freq, duration, type = 'sine', delay = 0) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    };

    switch (selectedTheme) {
      case 'chime':
        playTone(587.33, 0.22, 'sine', 0); // D5
        playTone(880, 0.35, 'sine', 0.16); // A5
        break;
      case 'beep':
        playTone(987.77, 0.25, 'triangle', 0); // B5
        break;
      case 'doorbell':
        playTone(659.25, 0.35, 'sine', 0); // E5
        playTone(523.25, 0.5, 'sine', 0.22); // C5
        break;
      case 'arcade': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
        break;
      }
      case 'mute':
      default:
        break;
    }
  } catch (err) {
    console.warn('Audio playback warning:', err);
  }
};
