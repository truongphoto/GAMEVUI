"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "playing" | "paused" | "finished";
type Hud = { phase: Phase; score: number; time: number; combo: number; best: number; sound: boolean; music: boolean; zone: number; tier: number; message: string };
type FallingItem = {
  id: number;
  kind: "pill" | "logo" | "coffee" | "heart";
  x: number; y: number; r: number; speed: number; drift: number;
  points: number; color: string; shape: number; rotation: number; spin: number;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string };

const WIDTH = 960;
const HEIGHT = 620;
const ROUND_SECONDS = 60;
const ASSET_BASE = import.meta.env.BASE_URL;
const ZONES = ["Khu Cấp cứu", "Bệnh viện Nhi", "Trung tâm Phẫu thuật", "Khu Điều trị Nội trú", "Khu Nghiên cứu & Giáo dục", "Toàn cảnh bệnh viện"];
const HOSPITAL_TIERS = [
  { name: "Bệnh viện ban đầu", short: "Ban đầu", image: `${ASSET_BASE}hospital-map.jpg`, icon: "🏥" },
  { name: "Cấp 1 · Hiện đại", short: "Hiện đại", image: `${ASSET_BASE}hospital-upgrade-1.jpg`, icon: "✨" },
  { name: "Cấp 2 · Tương lai", short: "Tương lai", image: `${ASSET_BASE}hospital-upgrade-2.jpg`, icon: "🚀" },
  { name: "Cấp 3 · Vũ trụ", short: "Vũ trụ", image: `${ASSET_BASE}hospital-upgrade-3.jpg`, icon: "🪐" },
  { name: "Cấp 4 · Siêu cấp", short: "Siêu cấp", image: `${ASSET_BASE}hospital-upgrade-4.jpg`, icon: "🌌" },
];
const COLORS = ["#34a853", "#13a6c7", "#f3b61f", "#ff7a45", "#e95c78"];
// Mỗi màn là một góc bệnh viện khác nhau; scale là phần ảnh gốc camera nhìn thấy.
const CAMERAS = [
  { x: 0.28, y: 0.56, scale: 0.3 },  // Khoa Cấp cứu
  { x: 0.78, y: 0.32, scale: 0.32 }, // Bệnh viện Nhi
  { x: 0.51, y: 0.31, scale: 0.34 }, // Trung tâm Phẫu thuật
  { x: 0.68, y: 0.55, scale: 0.36 }, // Khu Nội trú
  { x: 0.84, y: 0.5, scale: 0.4 },   // Khu Nghiên cứu
  { x: 0.5, y: 0.5, scale: 1 },      // Toàn cảnh bệnh viện
];
const MUSIC_NOTES = [523.25, 659.25, 783.99, 659.25, 698.46, 880, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 659.25, 783.99, 1046.5, 783.99];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const random = (min: number, max: number) => Math.random() * (max - min) + min;

function getResult(score: number) {
  if (score >= 350) return { icon: "🏆", title: "Bàn tay vàng!", copy: "Ca trực căng thẳng đã được xử lý cực gọn." };
  if (score >= 240) return { icon: "✨", title: "Năng lượng đầy bình!", copy: "Một phút vui vẻ, tinh thần đã tươi mới hơn rồi." };
  return { icon: "🌿", title: "Thư giãn thành công!", copy: "Không cần thắng thua — bạn vừa dành một phút cho chính mình." };
}

export default function DoctorRelaxGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actionsRef = useRef({ start: () => {}, pause: () => {}, restart: () => {}, toggleSound: () => {}, toggleMusic: () => {} });
  const [hud, setHud] = useState<Hud>({ phase: "idle", score: 0, time: ROUND_SECONDS, combo: 0, best: 0, sound: true, music: true, zone: 0, tier: 0, message: "Chạm Bắt đầu để thư giãn" });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const gameCanvas = canvas;
    const ctx = context;
    let animationFrame = 0;
    let lastFrame = performance.now();
    let itemId = 0;
    let audioContext: AudioContext | null = null;
    let musicTimer: number | null = null;
    let musicStarting = false;
    let musicIndex = 0;
    let items: FallingItem[] = [];
    let particles: Particle[] = [];
    let phase: Phase = "idle";
    let score = 0;
    let timeLeft = ROUND_SECONDS;
    let roundElapsed = 0;
    let combo = 0;
    let lastHitAt = 0;
    let spawnClock = 0;
    let specialClock = 8;
    let slowUntil = 0;
    let zone = 0;
    let tier = 0;
    // Bật âm thanh mặc định; chỉ tắt khi người chơi đã chủ động chọn yên lặng.
    let sound = localStorage.getItem("gpp-relax-sound") !== "off";
    let music = localStorage.getItem("gpp-relax-music-v2") !== "off";
    let best = Number(localStorage.getItem("gpp-relax-best") || 0);
    let message = "Chạm Bắt đầu để thư giãn";
    let messageUntil = 0;

    const mapImages = HOSPITAL_TIERS.map((hospitalTier) => {
      const image = new Image();
      image.src = hospitalTier.image;
      return image;
    });
    const logoImage = new Image();
    logoImage.src = `${ASSET_BASE}logo.png`;

    const syncHud = () => setHud({ phase, score: Math.round(score), time: Math.max(0, Math.ceil(timeLeft)), combo, best, sound, music, zone, tier, message });
    function setMessage(next: string, duration = 1.5) {
      message = next;
      messageUntil = performance.now() + duration * 1000;
      syncHud();
    }
    function tone(frequency: number, length = 0.09, volume = 0.12) {
      if (!sound) return;
      audioContext ??= new AudioContext();
      const play = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gain.gain.setValueAtTime(volume, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + length);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + length);
      };
      if (audioContext.state === "suspended") audioContext.resume().then(play).catch(() => {});
      else play();
    }
    function playMusicNote() {
      if (!music || phase !== "playing" || !audioContext) return;
      const startAt = audioContext.currentTime;
      const lead = audioContext.createOscillator();
      const bass = audioContext.createOscillator();
      const leadGain = audioContext.createGain();
      const bassGain = audioContext.createGain();
      const frequency = MUSIC_NOTES[musicIndex % MUSIC_NOTES.length];
      lead.type = "triangle";
      bass.type = "sine";
      lead.frequency.setValueAtTime(frequency, startAt);
      bass.frequency.setValueAtTime(frequency / 4, startAt);
      leadGain.gain.setValueAtTime(0.001, startAt);
      leadGain.gain.exponentialRampToValueAtTime(0.065, startAt + 0.025);
      leadGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.3);
      bassGain.gain.setValueAtTime(0.001, startAt);
      bassGain.gain.exponentialRampToValueAtTime(musicIndex % 4 === 0 ? 0.045 : 0.018, startAt + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.26);
      lead.connect(leadGain).connect(audioContext.destination);
      bass.connect(bassGain).connect(audioContext.destination);
      lead.start(startAt); bass.start(startAt);
      lead.stop(startAt + 0.32); bass.stop(startAt + 0.28);
      musicIndex++;
    }
    function startMusic() {
      if (!music || phase !== "playing" || musicTimer !== null || musicStarting) return;
      audioContext ??= new AudioContext();
      musicStarting = true;
      const begin = () => {
        musicStarting = false;
        if (!music || phase !== "playing" || musicTimer !== null) return;
        playMusicNote();
        musicTimer = window.setInterval(playMusicNote, 360);
      };
      if (audioContext.state === "suspended") audioContext.resume().then(begin).catch(() => { musicStarting = false; });
      else begin();
    }
    function stopMusic() {
      musicStarting = false;
      if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null; }
    }
    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gameCanvas.width = WIDTH * dpr;
      gameCanvas.height = HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(kind: FallingItem["kind"] = "pill") {
      const r = kind === "logo" ? 50 : kind === "pill" ? random(25, 31) : 31;
      const points = kind === "pill" ? Math.ceil(random(0, 5)) : 0;
      items.push({ id: ++itemId, kind, x: random(r + 18, WIDTH - r - 18), y: -r - random(0, 70), r,
        speed: kind === "logo" ? 76 : random(88, 132), drift: random(-16, 16), points,
        color: COLORS[Math.max(0, points - 1)] || "#0979a6", shape: Math.random() < 0.48 ? 0 : 1, rotation: random(-0.5, 0.5), spin: random(-0.25, 0.25) });
    }
    function burst(x: number, y: number, color: string, count = 18) {
      for (let i = 0; i < count; i++) {
        const angle = random(0, Math.PI * 2);
        const speedValue = random(55, 210);
        particles.push({ x, y, vx: Math.cos(angle) * speedValue, vy: Math.sin(angle) * speedValue, life: random(0.35, 0.75), size: random(2, 7), color });
      }
      if (particles.length > 260) particles = particles.slice(-260);
    }
    function finishRound() {
      phase = "finished";
      stopMusic();
      timeLeft = 0;
      combo = 0;
      if (score > best) { best = Math.round(score); localStorage.setItem("gpp-relax-best", String(best)); }
      tone(660, 0.16, 0.055);
      window.setTimeout(() => tone(820, 0.18, 0.045), 90);
      window.setTimeout(() => tone(980, 0.2, 0.05), 190);
      window.setTimeout(() => tone(1174, 0.28, 0.055), 310);
      message = "Hoàn thành một phút nạp năng lượng!";
      syncHud();
    }
    function resetRound(nextZone = true) {
      if (nextZone && phase !== "idle") {
        if (zone < ZONES.length - 1) zone += 1;
        else if (tier < HOSPITAL_TIERS.length - 1) { tier += 1; zone = 0; }
        else { tier = 0; zone = 0; }
      }
      phase = "playing"; score = 0; timeLeft = ROUND_SECONDS; roundElapsed = 0; combo = 0; lastHitAt = 0; spawnClock = 0;
      specialClock = random(7, 10); slowUntil = 0; items = []; particles = [];
      message = "Chạm vào thuốc để ghi điểm!"; messageUntil = performance.now() + 1800;
      for (let i = 0; i < 4; i++) { spawn("pill"); items[items.length - 1].y -= i * 100; }
      syncHud();
    }
    actionsRef.current.start = () => { tone(520, 0.14, 0.13); resetRound(false); startMusic(); };
    actionsRef.current.restart = () => { tone(520, 0.14, 0.13); resetRound(true); startMusic(); };
    actionsRef.current.pause = () => {
      if (phase === "playing") { phase = "paused"; stopMusic(); message = "Đã tạm dừng — cứ thong thả nhé"; }
      else if (phase === "paused") { phase = "playing"; startMusic(); message = "Tiếp tục nào!"; messageUntil = performance.now() + 1200; }
      syncHud();
    };
    actionsRef.current.toggleSound = () => {
      sound = !sound;
      localStorage.setItem("gpp-relax-sound", sound ? "on" : "off");
      if (sound) tone(540, 0.08);
      syncHud();
    };
    actionsRef.current.toggleMusic = () => {
      music = !music;
      localStorage.setItem("gpp-relax-music-v2", music ? "on" : "off");
      if (music) startMusic(); else stopMusic();
      syncHud();
    };
    function hitItem(item: FallingItem) {
      const now = performance.now();
      if (item.kind === "pill") {
        combo = now - lastHitAt < 1500 ? combo + 1 : 1;
        lastHitAt = now;
        const multiplier = Math.min(5, 1 + Math.floor(combo / 5));
        score += item.points * multiplier;
        burst(item.x, item.y, item.color, 16 + multiplier * 2);
        tone(380 + item.points * 65 + multiplier * 20);
        setMessage(combo >= 5 ? `Chuỗi ${combo} · x${multiplier} điểm!` : `+${item.points * multiplier} điểm`, 0.7);
      } else if (item.kind === "logo") {
        const cleared = items.filter((entry) => entry.kind === "pill").length;
        score += 18 + cleared * 2;
        items.filter((entry) => entry.kind === "pill").forEach((entry) => burst(entry.x, entry.y, entry.color, 8));
        items = items.filter((entry) => entry.kind !== "pill" && entry.id !== item.id);
        burst(item.x, item.y, "#ffd84a", 46);
        tone(720, 0.16, 0.06);
        setMessage(`Logo GPP! Dọn màn hình +${18 + cleared * 2}`, 1.5);
        syncHud(); return;
      } else if (item.kind === "coffee") {
        slowUntil = now + 5000; score += 10; burst(item.x, item.y, "#d98b52", 28); tone(520, 0.12);
        setMessage("Cà phê: chậm lại 5 giây ☕", 1.5);
      } else {
        timeLeft = Math.min(70, timeLeft + 5); score += 8; burst(item.x, item.y, "#ef5c79", 30); tone(620, 0.14);
        setMessage("Thêm 5 giây yêu thương ❤️", 1.5);
      }
      items = items.filter((entry) => entry.id !== item.id);
      syncHud();
    }
    function onPointer(event: PointerEvent) {
      if (phase !== "playing") return;
      event.preventDefault();
      const rect = gameCanvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
      const chosen = [...items].reverse().find((item) => (x - item.x) ** 2 + (y - item.y) ** 2 <= (item.r + 13) ** 2);
      if (chosen) hitItem(chosen);
      else { combo = 0; setMessage("Không sao, thử viên tiếp theo nhé 🙂", 0.7); }
    }
    function roundedRect(x: number, y: number, w: number, h: number, radius: number) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
    }
    function drawBackground() {
      const base = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      base.addColorStop(0, "#dff6f1"); base.addColorStop(1, "#dbeefa");
      ctx.fillStyle = base; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const mapImage = mapImages[tier];
      if (mapImage.complete && mapImage.naturalWidth > 0) {
        const camera = CAMERAS[zone];
        const zoomProgress = clamp(roundElapsed / ROUND_SECONDS, 0, 1);
        const movement = zoomProgress * Math.PI * 2;
        const isFinalScene = zone === ZONES.length - 1;
        // 5 màn đầu chỉ hé lộ từng khu; màn cuối bắt đầu và kết thúc ở toàn cảnh 100%.
        const scale = isFinalScene
          ? 1 - (1 - Math.cos(movement)) * 0.012
          : camera.scale * (1 - (1 - Math.cos(movement)) * 0.02);
        const sw = mapImage.naturalWidth * scale;
        const sh = mapImage.naturalHeight * scale;
        const panX = Math.sin(movement) * (isFinalScene ? 0.004 : 0.012);
        const panY = Math.sin(movement * 0.72) * (isFinalScene ? 0.003 : 0.008);
        const focusX = mapImage.naturalWidth * (camera.x + panX);
        const focusY = mapImage.naturalHeight * (camera.y + panY);
        const sx = clamp(focusX - sw / 2, 0, mapImage.naturalWidth - sw);
        const sy = clamp(focusY - sh / 2, 0, mapImage.naturalHeight - sh);
        // Mỗi góc ảnh đều được kéo phủ kín toàn màn chơi, không thu thành ảnh nhỏ.
        ctx.drawImage(mapImage, sx, sy, sw, sh, 0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "rgba(241,250,251,.4)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
      const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 30, WIDTH / 2, HEIGHT / 2, 520);
      glow.addColorStop(0, "rgba(255,255,255,.08)"); glow.addColorStop(1, "rgba(8,92,122,.15)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      roundedRect(24, 22, 390, 46, 22); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fill();
      ctx.fillStyle = "#075a78"; ctx.font = "700 17px Arial, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`${HOSPITAL_TIERS[tier].short} · Màn ${zone + 1}/${ZONES.length} · ${ZONES[zone]}`, 43, 45);
    }
    function drawPill(item: FallingItem) {
      ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.rotation);
      ctx.shadowColor = "rgba(0,57,77,.22)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
      if (item.shape === 0) {
        // Viên nén tròn: thân thuốc liền màu và rãnh bẻ đôi thật ở giữa.
        const gradient = ctx.createRadialGradient(-item.r * .35, -item.r * .4, 2, 0, 0, item.r);
        gradient.addColorStop(0, "#ffffff"); gradient.addColorStop(.3, item.color); gradient.addColorStop(1, item.color);
        ctx.beginPath(); ctx.arc(0, 0, item.r, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(0,55,70,.2)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-item.r * .68, 5); ctx.lineTo(item.r * .68, 5);
        ctx.strokeStyle = "rgba(0,52,67,.42)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-item.r * .64, 3); ctx.lineTo(item.r * .64, 3);
        ctx.strokeStyle = "rgba(255,255,255,.42)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = `900 ${item.r * .66}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,40,55,.45)"; ctx.shadowBlur = 3; ctx.fillText(String(item.points), 0, -item.r * .28);
      } else {
        // Viên nang hai đầu: nửa trắng, nửa màu và đường ráp ở chính giữa.
        const width = item.r * 2.8;
        const height = item.r * 1.42;
        roundedRect(-width / 2, -height / 2, width, height, height / 2);
        ctx.save(); ctx.clip();
        const left = ctx.createLinearGradient(-width / 2, -height / 2, 0, height / 2);
        left.addColorStop(0, "#ffffff"); left.addColorStop(1, "#dfeef0");
        ctx.fillStyle = left; ctx.fillRect(-width / 2, -height / 2, width / 2, height);
        const right = ctx.createLinearGradient(0, -height / 2, width / 2, height / 2);
        right.addColorStop(0, item.color); right.addColorStop(1, item.color);
        ctx.fillStyle = right; ctx.fillRect(0, -height / 2, width / 2, height);
        ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(-width / 2 + 7, -height / 2 + 5, width - 14, height * .22);
        ctx.restore();
        ctx.shadowBlur = 0; roundedRect(-width / 2, -height / 2, width, height, height / 2);
        ctx.strokeStyle = "rgba(0,55,70,.22)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -height / 2 + 2); ctx.lineTo(0, height / 2 - 2);
        ctx.strokeStyle = "rgba(0,55,70,.28)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = `900 ${item.r * .68}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,40,55,.5)"; ctx.shadowBlur = 3; ctx.fillText(String(item.points), width * .25, 1);
      }
      ctx.restore();
    }
    function drawSpecial(item: FallingItem) {
      ctx.save(); ctx.translate(item.x, item.y);
      ctx.shadowColor = item.kind === "logo" ? "rgba(255,204,30,.8)" : "rgba(0,82,106,.3)"; ctx.shadowBlur = 22;
      if (item.kind === "logo") {
        // Giữ nguyên toàn bộ logo người dùng gửi, không cắt chỉ còn chữ GPP.
        roundedRect(-item.r * .96, -item.r * .96, item.r * 1.92, item.r * 1.92, 17);
        ctx.fillStyle = "rgba(255,255,255,.96)"; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = "#f4c430"; ctx.lineWidth = 3; ctx.stroke();
        if (logoImage.complete && logoImage.naturalWidth > 0) {
          ctx.drawImage(logoImage, -item.r * .84, -item.r * .84, item.r * 1.68, item.r * 1.68);
        } else {
          ctx.font = "bold 19px Arial, sans-serif"; ctx.fillStyle = "#087aa5"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("TRƯỜNG GPP", 0, 0);
        }
      } else {
        ctx.beginPath(); ctx.arc(0, 0, item.r, 0, Math.PI * 2);
        ctx.fillStyle = item.kind === "coffee" ? "#fff1df" : "#ffe4eb"; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(5,112,145,.3)"; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = `${item.r * 1.15}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(item.kind === "coffee" ? "☕" : "❤️", 0, 3);
      }
      ctx.restore();
    }
    function drawFrame() {
      ctx.clearRect(0, 0, WIDTH, HEIGHT); drawBackground();
      items.forEach((item) => item.kind === "pill" ? drawPill(item) : drawSpecial(item));
      for (const particle of particles) {
        ctx.globalAlpha = clamp(particle.life * 2, 0, 1); ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color; ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function handlePillCollisions() {
      const pills = items.filter((item) => item.kind === "pill");
      for (let i = 0; i < pills.length; i++) {
        for (let j = i + 1; j < pills.length; j++) {
          const a = pills[i];
          const b = pills[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 0.001;
          const radiusA = a.r * (a.shape === 0 ? 0.95 : 1.18);
          const radiusB = b.r * (b.shape === 0 ? 0.95 : 1.18);
          const minDistance = radiusA + radiusB;
          if (distance >= minDistance) continue;

          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = minDistance - distance;
          a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;

          const relativeSpeed = (b.drift - a.drift) * nx + (b.speed - a.speed) * ny;
          if (relativeSpeed < 0) {
            const impulse = -(1 + 0.72) * relativeSpeed / 2;
            a.drift -= impulse * nx; a.speed -= impulse * ny;
            b.drift += impulse * nx; b.speed += impulse * ny;
            a.spin -= nx * 0.7; b.spin += nx * 0.7;
          }
          a.drift = clamp(a.drift, -68, 68); b.drift = clamp(b.drift, -68, 68);
          a.speed = clamp(a.speed, -45, 175); b.speed = clamp(b.speed, -45, 175);
        }
      }
    }
    function update(delta: number, now: number) {
      if (phase !== "playing") return;
      timeLeft -= delta;
      roundElapsed += delta;
      if (timeLeft <= 0) { finishRound(); return; }
      spawnClock -= delta; specialClock -= delta;
      if (spawnClock <= 0 && items.length < 18) { spawn("pill"); spawnClock = random(0.55, 0.78); }
      if (specialClock <= 0) {
        const roll = Math.random();
        spawn(roll < 0.45 ? "logo" : roll < 0.73 ? "coffee" : "heart"); specialClock = random(8, 12);
        setMessage(roll < 0.45 ? "Logo GPP xuất hiện!" : roll < 0.73 ? "Cà phê thư giãn xuất hiện!" : "Trái tim cộng thời gian!", 1.4);
      }
      const slowFactor = now < slowUntil ? 0.48 : 1;
      for (const item of items) {
        if (item.kind === "pill") item.speed = Math.min(175, item.speed + 22 * delta);
        item.y += item.speed * slowFactor * delta; item.x += item.drift * delta; item.rotation += item.spin * delta;
        if (item.x < item.r) { item.x = item.r; item.drift = Math.abs(item.drift) * 0.8; }
        if (item.x > WIDTH - item.r) { item.x = WIDTH - item.r; item.drift = -Math.abs(item.drift) * 0.8; }
      }
      handlePillCollisions();
      items = items.filter((item) => item.y < HEIGHT + item.r);
      if (combo > 0 && now - lastHitAt > 1500) combo = 0;
      if (messageUntil && now > messageUntil) {
        messageUntil = 0; message = now < slowUntil ? "Đang chậm lại — tận hưởng nhé ☕" : "Chạm vào thuốc để ghi điểm!"; syncHud();
      }
      for (const particle of particles) { particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.vy += 220 * delta; particle.life -= delta; }
      particles = particles.filter((particle) => particle.life > 0);
    }
    let hudClock = 0;
    function loop(now: number) {
      const delta = Math.min(0.035, (now - lastFrame) / 1000 || 0); lastFrame = now; update(delta, now); drawFrame(); hudClock += delta;
      if (hudClock > 0.2) { hudClock = 0; syncHud(); }
      animationFrame = requestAnimationFrame(loop);
    }
    function onVisibilityChange() {
      if (document.hidden && phase === "playing") { phase = "paused"; stopMusic(); message = "Game tự tạm dừng để bạn nghỉ một chút"; syncHud(); }
    }
    resizeCanvas(); gameCanvas.addEventListener("pointerdown", onPointer); document.addEventListener("visibilitychange", onVisibilityChange);
    syncHud(); animationFrame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animationFrame); stopMusic(); gameCanvas.removeEventListener("pointerdown", onPointer); document.removeEventListener("visibilitychange", onVisibilityChange); audioContext?.close(); };
  }, []);

  const result = getResult(hud.score);
  const progress = clamp((hud.time / ROUND_SECONDS) * 100, 0, 100);
  const isChapterComplete = hud.zone === ZONES.length - 1;
  const isSuperComplete = isChapterComplete && hud.tier === HOSPITAL_TIERS.length - 1;
  const nextTier = HOSPITAL_TIERS[Math.min(hud.tier + 1, HOSPITAL_TIERS.length - 1)];
  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo-wrap"><img src={`${ASSET_BASE}logo.png`} alt="Logo Trường GPP" className="brand-logo" /></div>
          <div><p className="eyebrow">TRƯỜNG GPP · PHÚT GIẢI LAO</p><h1>Bác Sĩ Thư Giãn</h1><p className="tagline">6 màn mỗi chặng · Nâng cấp đến Bệnh viện Siêu cấp</p></div>
        </div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => actionsRef.current.toggleMusic()} aria-label={hud.music ? "Tắt nhạc nền" : "Bật nhạc nền"}>{hud.music ? "🎵 Nhạc nền" : "🎼 Bật nhạc"}</button>
          <button className="icon-button" onClick={() => actionsRef.current.toggleSound()} aria-label={hud.sound ? "Tắt hiệu ứng" : "Bật hiệu ứng"}>{hud.sound ? "🔊 Hiệu ứng" : "🔇 Bật tiếng"}</button>
          <button className="icon-button" onClick={() => actionsRef.current.pause()} disabled={hud.phase === "idle" || hud.phase === "finished"}>{hud.phase === "paused" ? "▶ Tiếp tục" : "Ⅱ Tạm dừng"}</button>
        </div>
      </header>
      <section className="game-card" aria-label="Trò chơi Bác Sĩ Thư Giãn">
        <div className="upgrade-roadmap" aria-label="Lộ trình nâng cấp bệnh viện">
          {HOSPITAL_TIERS.map((hospitalTier, index) => <div key={hospitalTier.name} className={`upgrade-step ${index === hud.tier ? "current" : ""} ${index < hud.tier ? "complete" : ""}`}>
            <span>{index < hud.tier ? "✓" : hospitalTier.icon}</span><div><small>{index === 0 ? "Khởi đầu" : `Cấp ${index}`}</small><strong>{hospitalTier.short}</strong></div>
          </div>)}
        </div>
        <div className="hud">
          <div className="hud-item tier"><span>Cấp bệnh viện</span><strong>{hud.tier === 0 ? "Gốc" : `${hud.tier}/4`}</strong></div>
          <div className="hud-item level"><span>Màn</span><strong>{hud.zone + 1}/{ZONES.length}</strong></div>
          <div className="hud-item"><span>Điểm</span><strong>{hud.score}</strong></div>
          <div className="hud-item timer"><span>Thời gian</span><strong>{hud.time}s</strong></div>
          <div className={`hud-item combo ${hud.combo >= 5 ? "active" : ""}`}><span>Chuỗi</span><strong>{hud.combo}</strong></div>
          <div className="hud-item best"><span>Kỷ lục</span><strong>{hud.best}</strong></div>
        </div>
        <div className="time-track" aria-label={`Còn ${hud.time} giây`}><span style={{ width: `${progress}%` }} /></div>
        <div className="canvas-wrap">
          <canvas ref={canvasRef} className="game-canvas" aria-label="Khu vực chơi, chạm vào các viên thuốc" />
          {hud.phase === "idle" && <div className="game-overlay welcome-panel">
            <div className="pulse-icon">💊</div><p className="overlay-kicker">Luật chơi chỉ có một dòng</p><h2>Chạm thuốc để ghi điểm</h2>
            <p>Không có thua. Chỉ có 60 giây vui vẻ dành cho bạn.</p>
            <button className="primary-button" onClick={() => actionsRef.current.start()}>Bắt đầu thư giãn</button>
            <span className="microcopy">Logo GPP dọn màn hình · ☕ làm chậm · ❤️ thêm 5 giây</span>
          </div>}
          {hud.phase === "paused" && <div className="game-overlay compact-panel">
            <div className="breath">🌿</div><h2>Thở nhẹ một chút</h2><p>Game đang tạm dừng, điểm số vẫn được giữ nguyên.</p>
            <button className="primary-button" onClick={() => actionsRef.current.pause()}>Tiếp tục</button>
          </div>}
          {hud.phase === "finished" && <div className="game-overlay result-panel">
            {isChapterComplete && <div className="celebration-burst" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>}
            <div className="result-icon">{isChapterComplete ? "🏆" : result.icon}</div>
            <p className="overlay-kicker">{isChapterComplete ? "Hoàn thành toàn cảnh bệnh viện" : `Hoàn thành màn ${hud.zone + 1}/${ZONES.length}`}</p>
            <h2>{isChapterComplete ? "🎉 Chúc mừng!" : result.title}</h2>
            {isChapterComplete && <div className="chapter-complete-title">Bạn đã hoàn thành <strong>{HOSPITAL_TIERS[hud.tier].name}</strong></div>}
            <div className="result-score"><strong>{hud.score}</strong><span>điểm</span></div>
            {isChapterComplete && <div className={`unlock-banner ${isSuperComplete ? "super" : ""}`}>
              <span>{isSuperComplete ? "🌌" : nextTier.icon}</span>
              <div><small>{isSuperComplete ? "HOÀN THÀNH TOÀN BỘ HÀNH TRÌNH" : "NHIỆM VỤ MỚI ĐÃ MỞ KHÓA"}</small><strong>{isSuperComplete ? "Bệnh viện Cấp 4 · Siêu cấp" : nextTier.name}</strong></div>
            </div>}
            <p>{isSuperComplete ? "Bạn đã xây dựng thành công bệnh viện mạnh nhất. Một hành trình thư giãn thật tuyệt vời!" : isChapterComplete ? "Bệnh viện đã được nâng cấp. Hãy tiếp tục khám phá 6 màn thử thách mới!" : result.copy}</p>
            <button className={`primary-button ${isChapterComplete ? "challenge-button" : ""}`} onClick={() => actionsRef.current.restart()}>{isSuperComplete ? "↻ Bắt đầu hành trình mới" : isChapterComplete ? `Tiếp tục thử thách Cấp ${hud.tier + 1} →` : `Sang màn ${hud.zone + 2}`}</button>
          </div>}
        </div>
        <div className="status-row" aria-live="polite"><span className="live-dot" /><strong>{hud.message}</strong><span>{HOSPITAL_TIERS[hud.tier].name} · {ZONES[hud.zone]}</span></div>
      </section>
      <section className="tips" aria-label="Vật phẩm trong trò chơi">
        <article><span className="tip-icon logo-mark"><img src={`${ASSET_BASE}logo.png`} alt="Logo Trường GPP" /></span><div><strong>Logo đặc biệt</strong><p>Dọn thuốc và cộng điểm thưởng.</p></div></article>
        <article><span className="tip-icon">☕</span><div><strong>Cà phê thư giãn</strong><p>Làm mọi thứ chậm lại 5 giây.</p></div></article>
        <article><span className="tip-icon pink">❤️</span><div><strong>Trái tim</strong><p>Tặng thêm 5 giây vui vẻ.</p></div></article>
      </section>
      <nav className="zone-list" aria-label="Các khu vực bệnh viện">{ZONES.map((name, index) => <span key={name} className={index === hud.zone ? "current" : ""}>{index + 1}. {name}</span>)}</nav>
      <footer><span>Trường GPP</span><span>Chơi vui · Nghỉ ngắn · Không áp lực</span></footer>
    </main>
  );
}
