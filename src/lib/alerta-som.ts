/** Bipe curto via Web Audio (sem arquivo de áudio) */
let ctx: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Precisa de um toque do usuário no mobile/Chrome para liberar o áudio */
export async function liberarAudioAlerta(): Promise<boolean> {
  const audio = obterContexto();
  if (!audio) return false;
  if (audio.state === "suspended") {
    try {
      await audio.resume();
    } catch {
      return false;
    }
  }
  return audio.state === "running";
}

export function tocarAlertaPedido(vezes = 2) {
  const audio = obterContexto();
  if (!audio || audio.state !== "running") return;

  const agora = audio.currentTime;
  for (let i = 0; i < vezes; i++) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "square";
    osc.frequency.value = i === 0 ? 880 : 660;
    gain.gain.setValueAtTime(0.0001, agora + i * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.18, agora + i * 0.22 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, agora + i * 0.22 + 0.18);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(agora + i * 0.22);
    osc.stop(agora + i * 0.22 + 0.2);
  }
}
