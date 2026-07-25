/** Alerta sonoro forte para a cozinha (Web Audio + vibração) */
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

/**
 * Sirene bem audível: vários bipos altos + vibração no celular.
 * `ciclos` = quantas vezes repetir o padrão (padrão 3).
 */
export function tocarAlertaPedido(ciclos = 3) {
  const audio = obterContexto();
  if (audio && audio.state === "running") {
    tocarSirene(audio, ciclos);
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      const padrao: number[] = [];
      for (let i = 0; i < ciclos; i++) {
        padrao.push(220, 80, 220, 80, 320, 160);
      }
      navigator.vibrate(padrao);
    } catch {
      /* vibração opcional */
    }
  }
}

function tocarSirene(audio: AudioContext, ciclos: number) {
  const agora = audio.currentTime;
  const notas = [1046, 784, 1046, 784]; // C6 / G5 — bem penetrante
  const passo = 0.2;
  const volume = 0.42;

  for (let c = 0; c < ciclos; c++) {
    for (let i = 0; i < notas.length; i++) {
      const t0 = agora + (c * notas.length + i) * passo;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "square";
      osc.frequency.value = notas[i]!;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t0);
      osc.stop(t0 + 0.18);
    }
  }
}
