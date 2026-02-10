
/**
 * Generates a high-pitched safety alert sound using the Web Audio API.
 * This ensures notifications have an audible component without requiring external audio files.
 */
export const playAlertSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = audioCtx.currentTime;
    // Triple pulse "Critical Alert" sound
    playTone(880, now, 0.12, 0.4); 
    playTone(880, now + 0.15, 0.12, 0.4); 
    playTone(880, now + 0.3, 0.2, 0.4); 
    
    // Close context after playback to save resources
    setTimeout(() => {
      if (audioCtx.state !== 'closed') audioCtx.close();
    }, 1500);
  } catch (e) {
    console.warn("Audio system blocked or unavailable:", e);
  }
};
