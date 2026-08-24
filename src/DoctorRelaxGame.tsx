"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "playing" | "paused" | "reveal" | "finished";
type Hud = { phase: Phase; score: number; dropBudget: number; time: number; bonusPhase: boolean; bonusBank: number; bonusTotal: number; combo: number; roundBestCombo: number; best: number; roundNewBest: boolean; sound: boolean; music: boolean; zone: number; tier: number; unlockedTier: number; message: string; slowLeft: number; freezeLeft: number; magnetLeft: number; doubleLeft: number };
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type FallingItem = {
  id: number;
  kind: "pill" | "logo" | "coffee" | "heart" | "specialHeart" | "ambulance" | "magnet" | "spaceship" | "rainbowLogo" | "badPill" | "virus" | "meteor" | "blackhole";
  x: number; y: number; r: number; speed: number; drift: number;
  points: number; color: string; shape: number; rotation: number; spin: number;
  hits?: number;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string };

const DESKTOP_WIDTH = 960;
const DESKTOP_HEIGHT = 520;
const MOBILE_WIDTH = 960;
const MOBILE_HEIGHT = 520;
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
const TIER_INTROS = [
  "Chạm vào thuốc để ghi điểm!",
  "Cấp 1: 🚑 xe cấp cứu và ☠️ thuốc đầu lâu đã xuất hiện!",
  "Cấp 2: 🧲 nam châm và 🦠 virus đã được thêm vào!",
  "Cấp 3: 🚀 phi thuyền, trọng lực nhẹ và ☄️ thiên thạch!",
  "Cấp 4: 🌈 logo GPP cầu vồng và hố đen quá tải!",
];
const PILL_PALETTE = [
  { shell: "#55c9ad", accent: "#2da88f", glow: "rgba(85,201,173,.46)", text: "#114f5a" },
  { shell: "#67d4bc", accent: "#38b39a", glow: "rgba(103,212,188,.48)", text: "#114f5a" },
  { shell: "#52b9dd", accent: "#2799c3", glow: "rgba(82,185,221,.48)", text: "#ffffff" },
  { shell: "#63b9ee", accent: "#358fcd", glow: "rgba(99,185,238,.48)", text: "#ffffff" },
  { shell: "#858dda", accent: "#6972c9", glow: "rgba(133,141,218,.48)", text: "#ffffff" },
  { shell: "#9a94e5", accent: "#796fd4", glow: "rgba(154,148,229,.48)", text: "#ffffff" },
  { shell: "#ef8580", accent: "#db6765", glow: "rgba(239,133,128,.50)", text: "#ffffff" },
  { shell: "#ff9a83", accent: "#e87363", glow: "rgba(255,154,131,.52)", text: "#ffffff" },
  { shell: "#e8b94f", accent: "#cd9830", glow: "rgba(232,185,79,.55)", text: "#114f5a" },
  { shell: "#f4cb62", accent: "#d6a53c", glow: "rgba(244,203,98,.58)", text: "#114f5a" },
];
// Mỗi màn là một góc bệnh viện khác nhau; scale là phần ảnh gốc camera nhìn thấy.
const CAMERAS = [
  { x: 0.28, y: 0.56, scale: 0.3 },  // Khoa Cấp cứu
  { x: 0.78, y: 0.32, scale: 0.32 }, // Bệnh viện Nhi
  { x: 0.51, y: 0.31, scale: 0.34 }, // Trung tâm Phẫu thuật
  { x: 0.68, y: 0.55, scale: 0.36 }, // Khu Nội trú
  { x: 0.84, y: 0.5, scale: 0.4 },   // Khu Nghiên cứu
  { x: 0.5, y: 0.5, scale: 1 },      // Toàn cảnh bệnh viện
];
const SCENE_BALANCE = [
  { min: 650, max: 750, target: 700, speed: .85, spawn: [.58, .68] as const, maxItems: 18, dropCount: 96 },
  { min: 780, max: 900, target: 840, speed: .95, spawn: [.50, .60] as const, maxItems: 20, dropCount: 112 },
  { min: 920, max: 1050, target: 985, speed: 1.05, spawn: [.44, .54] as const, maxItems: 22, dropCount: 128 },
  { min: 1070, max: 1200, target: 1135, speed: 1.15, spawn: [.39, .48] as const, maxItems: 24, dropCount: 144 },
  { min: 1200, max: 1350, target: 1275, speed: 1.25, spawn: [.34, .43] as const, maxItems: 26, dropCount: 160 },
  { min: 1300, max: 1500, target: 1400, speed: 1.35, spawn: [.30, .39] as const, maxItems: 28, dropCount: 176 },
];
// Mỗi cấp có một đường máy quay riêng: xuất phát quanh TRƯỜNG GPP, lướt qua các khu rồi lùi ra toàn cảnh.
const MOBILE_CINEMATIC_PATHS = [
  [{ x:.50,y:.48 },{ x:.29,y:.57 },{ x:.78,y:.33 },{ x:.50,y:.29 },{ x:.72,y:.58 },{ x:.50,y:.50 }],
  [{ x:.50,y:.47 },{ x:.75,y:.52 },{ x:.30,y:.35 },{ x:.57,y:.26 },{ x:.30,y:.61 },{ x:.50,y:.50 }],
  [{ x:.50,y:.47 },{ x:.31,y:.31 },{ x:.77,y:.55 },{ x:.70,y:.27 },{ x:.34,y:.57 },{ x:.50,y:.50 }],
  [{ x:.55,y:.48 },{ x:.74,y:.34 },{ x:.31,y:.55 },{ x:.47,y:.27 },{ x:.75,y:.58 },{ x:.50,y:.50 }],
  [{ x:.55,y:.48 },{ x:.33,y:.58 },{ x:.76,y:.31 },{ x:.44,y:.25 },{ x:.71,y:.59 },{ x:.50,y:.50 }],
];
const MUSIC_NOTES = [523.25, 659.25, 783.99, 659.25, 698.46, 880, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 659.25, 783.99, 1046.5, 783.99];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const random = (min: number, max: number) => Math.random() * (max - min) + min;
const pillPalette = (points: number) => PILL_PALETTE[clamp(points, 1, 10) - 1];

function buildCappedSegment(total: number, count: number) {
  const base = Math.floor(total / count);
  const points = Array(count).fill(clamp(base, 1, 10)) as number[];
  let remainder = total - points.reduce((sum, value) => sum + value, 0);
  const order = Array.from({ length: count }, (_, index) => index).sort(() => Math.random() - .5);
  for (let cursor = 0; remainder > 0; cursor = (cursor + 1) % count) {
    const index = order[cursor];
    if (points[index] < 10) { points[index] += 1; remainder -= 1; }
  }
  for (let attempt = 0; attempt < count * 3; attempt++) {
    const from = Math.floor(random(0, count));
    const to = Math.floor(random(0, count));
    if (points[from] > 1 && points[to] < 10) { points[from] -= 1; points[to] += 1; }
  }
  return points;
}

function buildPillPointPlan(total: number, count: number) {
  const lateCount = Math.round(count * .2);
  const earlyCount = count - lateCount;
  const lateTotal = Math.round(total * .2);
  return {
    early: buildCappedSegment(total - lateTotal, earlyCount),
    late: buildCappedSegment(lateTotal, lateCount),
  };
}

function getResult(score: number) {
  if (score >= 350) return { icon: "🏆", title: "Bàn tay vàng!", copy: "Ca trực căng thẳng đã được xử lý cực gọn." };
  if (score >= 240) return { icon: "✨", title: "Năng lượng đầy bình!", copy: "Một phút vui vẻ, tinh thần đã tươi mới hơn rồi." };
  return { icon: "🌿", title: "Thư giãn thành công!", copy: "Không cần thắng thua — bạn vừa dành một phút cho chính mình." };
}

function getMedal(score: number, target: number) {
  if (score >= target) return { icon: "🥇", name: "Huy chương Vàng", copy: "Vượt mục tiêu màn!" };
  if (score >= target * .85) return { icon: "🥈", name: "Huy chương Bạc", copy: `Chỉ còn ${Math.max(0, target - score)} điểm để đạt Vàng.` };
  if (score >= target * .7) return { icon: "🥉", name: "Huy chương Đồng", copy: `Còn ${Math.max(0, target - score)} điểm để đạt Vàng.` };
  return { icon: "🌿", name: "Năng lượng xanh", copy: `Còn ${Math.max(0, target - score)} điểm để đạt huy chương.` };
}

export default function DoctorRelaxGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actionsRef = useRef({ start: () => {}, pause: () => {}, restart: () => {}, skipReveal: () => {}, goHome: () => {}, selectTier: (_tier: number) => {}, toggleSound: () => {}, toggleMusic: () => {} });
  const [hud, setHud] = useState<Hud>({ phase: "idle", score: 0, dropBudget: SCENE_BALANCE[0].target, time: ROUND_SECONDS, bonusPhase: false, bonusBank: 0, bonusTotal: 0, combo: 0, roundBestCombo: 0, best: 0, roundNewBest: false, sound: true, music: true, zone: 0, tier: 0, unlockedTier: 0, message: "Chạm Bắt đầu để thư giãn", slowLeft: 0, freezeLeft: 0, magnetLeft: 0, doubleLeft: 0 });
  const [showTierPicker, setShowTierPicker] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    const onInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${ASSET_BASE}sw.js`).then((registration) => {
        if (registration.waiting) setUpdateRegistration(registration);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateRegistration(registration);
          });
        });
      }).catch(() => {});
    }
    return () => { window.removeEventListener("beforeinstallprompt", onInstallPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function enterImmersiveMode() {
    const phoneLike = window.matchMedia("(pointer: coarse)").matches;
    if (!phoneLike) return;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {}
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
      await orientation.lock?.("landscape");
    } catch {}
  }

  async function installGame() {
    if (!installPrompt) { setShowInstallHelp(true); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  function updateGame() {
    const waiting = updateRegistration?.waiting;
    if (!waiting) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const gameCanvas = canvas;
    const ctx = context;
    let animationFrame = 0;
    let revealTimer: number | null = null;
    let revealStartedAt = 0;
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
    let dropBudget = SCENE_BALANCE[0].target;
    let earlyPillPlan: number[] = [];
    let latePillPlan: number[] = [];
    let heartSchedule: Array<{ at: number; kind: "heart" | "specialHeart"; warned: boolean; spawned: boolean }> = [];
    let timeLeft = ROUND_SECONDS;
    let baseTimeLeft = ROUND_SECONDS;
    let bonusTimeBank = 0;
    let bonusTimeTotal = 0;
    let bonusPhase = false;
    let roundElapsed = 0;
    let combo = 0;
    let roundBestCombo = 0;
    let lastHitAt = 0;
    let spawnClock = 0;
    let continuitySpawnCooldown = 0;
    let specialClock = 8;
    let penaltyClock = 7;
    let goldenMomentAnnounced = false;
    let slowUntil = 0;
    let freezeUntil = 0;
    let magnetUntil = 0;
    let doubleUntil = 0;
    let shakeUntil = 0;
    let magnetX = 0;
    let magnetY = 0;
    let lastCollisionSound = 0;
    let zone = 0;
    let tier = 0;
    let unlockedTier = clamp(Number(localStorage.getItem("gpp-relax-unlocked-tier") || 0), 0, HOSPITAL_TIERS.length - 1);
    // Bật âm thanh mặc định; chỉ tắt khi người chơi đã chủ động chọn yên lặng.
    let sound = localStorage.getItem("gpp-relax-sound") !== "off";
    let music = localStorage.getItem("gpp-relax-music-v2") !== "off";
    let best = Number(localStorage.getItem("gpp-relax-best") || 0);
    let roundNewBest = false;
    let message = "Chạm Bắt đầu để thư giãn";
    let messageUntil = 0;
    const mobileLayout = window.matchMedia("(pointer: coarse)").matches || Math.min(window.innerWidth, window.innerHeight) <= 520 || Math.max(window.innerWidth, window.innerHeight) <= 1000;
    const landscapeViewportW = Math.max(window.innerWidth, window.innerHeight);
    const landscapeViewportH = Math.max(240, Math.min(window.innerWidth, window.innerHeight) - 76);
    const playableAspect = clamp(landscapeViewportW / landscapeViewportH, MOBILE_WIDTH / MOBILE_HEIGHT, 3.15);
    let WIDTH = mobileLayout ? Math.round(MOBILE_HEIGHT * playableAspect) : DESKTOP_WIDTH;
    let HEIGHT = mobileLayout ? MOBILE_HEIGHT : DESKTOP_HEIGHT;

    const mapImages = HOSPITAL_TIERS.map((hospitalTier) => {
      const image = new Image();
      image.src = hospitalTier.image;
      return image;
    });
    const logoImage = new Image();
    logoImage.src = `${ASSET_BASE}logo.png`;

    const syncHud = () => {
      const now = performance.now();
      setHud({
        phase, score: Math.round(score), dropBudget, time: Math.max(0, Math.ceil(timeLeft)), bonusPhase,
        bonusBank: Math.max(0, Math.ceil(bonusTimeBank)), bonusTotal: bonusTimeTotal, combo, roundBestCombo, best, roundNewBest,
        sound, music, zone, tier, unlockedTier, message,
        slowLeft: Math.max(0, Math.ceil((slowUntil - now) / 1000)),
        freezeLeft: Math.max(0, Math.ceil((freezeUntil - now) / 1000)),
        magnetLeft: Math.max(0, Math.ceil((magnetUntil - now) / 1000)),
        doubleLeft: Math.max(0, Math.ceil((doubleUntil - now) / 1000)),
      });
    };
    function setMessage(next: string, duration = 1.5) {
      message = next;
      messageUntil = performance.now() + duration * 1000;
      syncHud();
    }
    function tone(frequency: number, length = 0.09, volume = 0.12, wave: OscillatorType = "sine") {
      if (!sound) return;
      audioContext ??= new AudioContext();
      const play = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = wave;
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
    function rewardSound(base = 520) {
      tone(base, 0.09, 0.055, "triangle");
      window.setTimeout(() => tone(base * 1.28, 0.11, 0.05, "triangle"), 70);
      window.setTimeout(() => tone(base * 1.6, 0.14, 0.045, "sine"), 145);
    }
    function penaltySound() {
      tone(220, 0.13, 0.065, "square");
      window.setTimeout(() => tone(155, 0.18, 0.055, "sawtooth"), 85);
    }
    function victorySound() {
      [660, 820, 980, 1174].forEach((frequency, index) => window.setTimeout(() => tone(frequency, 0.2, 0.05, "triangle"), index * 90));
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
        musicTimer = window.setInterval(playMusicNote, bonusPhase ? 270 : 360);
      };
      if (audioContext.state === "suspended") audioContext.resume().then(begin).catch(() => { musicStarting = false; });
      else begin();
    }
    function stopMusic() {
      musicStarting = false;
      if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null; }
    }
    function resizeCanvas() {
      const rect = gameCanvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width || window.innerWidth);
      const cssH = Math.max(1, rect.height || window.innerHeight);
      if (mobileLayout) {
        // Luôn lấy tỷ lệ THỰC của vùng chơi sau khi xoay ngang / vào fullscreen.
        // Tránh lỗi canvas giữ kích thước từ lúc máy còn dọc nên chỉ vẽ ở 1 phần bên trái.
        const liveAspect = clamp(cssW / cssH, 1.45, 3.65);
        HEIGHT = MOBILE_HEIGHT;
        WIDTH = Math.round(HEIGHT * liveAspect);
      } else {
        WIDTH = DESKTOP_WIDTH;
        HEIGHT = DESKTOP_HEIGHT;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, mobileLayout ? 1.5 : 2);
      gameCanvas.width = Math.max(1, Math.round(WIDTH * dpr));
      gameCanvas.height = Math.max(1, Math.round(HEIGHT * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const item of items) item.x = clamp(item.x, item.r + 8, WIDTH - item.r - 8);
    }
    function spawn(kind: FallingItem["kind"] = "pill", forcedPoints?: number) {
      const isLogo = kind === "logo" || kind === "rainbowLogo";
      const isPill = kind === "pill" || kind === "badPill";
      const r = isLogo ? 50 : kind === "blackhole" ? 43 : kind === "meteor" ? 36 : kind === "specialHeart" ? 35 : isPill ? random(25, 31) : 31;
      const bonusPoints = () => Math.ceil(random(4 + zone, 8 + zone * 1.6));
      const points = kind === "pill" ? clamp(forcedPoints ?? (bonusPhase ? bonusPoints() : 1), 1, 10) : 0;
      const sceneSpeed = SCENE_BALANCE[zone].speed;
      const pointSpeed = kind === "pill" ? .8 + (points - 1) * (1.2 / 9) : 1;
      const verticalSpeed = kind === "specialHeart" ? 370 : (isLogo ? 76 : kind === "blackhole" ? 54 : kind === "meteor" ? 112 : random(88, 108)) * sceneSpeed * pointSpeed;
      items.push({ id: ++itemId, kind, x: random(r + 18, WIDTH - r - 18), y: -r - random(0, 70), r,
        speed: verticalSpeed, drift: kind === "specialHeart" ? random(-80, 80) : kind === "meteor" ? random(-55, 55) : random(-16, 16), points,
        color: kind === "badPill" ? "#171c22" : pillPalette(points).shell, shape: Math.random() < 0.48 ? 0 : 1, rotation: random(-0.5, 0.5), spin: random(-0.25, 0.25), hits: kind === "blackhole" ? 0 : undefined });
    }
    function takeNextPlannedPillPoints() {
      if (baseTimeLeft > 10 && earlyPillPlan.length > 0) return earlyPillPlan.shift()!;
      if (earlyPillPlan.length > 0) return earlyPillPlan.shift()!;
      if (latePillPlan.length > 0) return latePillPlan.shift()!;
      return undefined;
    }
    function spawnVisiblePill(forcedPoints?: number) {
      spawn("pill", forcedPoints);
      const pill = items[items.length - 1];
      // PA2.5: thuốc cứu nhịp phải xuất hiện THẬT trong vùng nhìn thấy, không chỉ nằm phía trên canvas.
      const visibleTopBand = Math.max(pill.r + 18, Math.min(HEIGHT * .13, pill.r + 64));
      pill.y = random(Math.max(8, pill.r * .18), visibleTopBand);
      pill.speed = Math.max(pill.speed, 100 * SCENE_BALANCE[zone].speed);
    }

    function isRewardKind(kind: FallingItem["kind"]) {
      return ["logo", "coffee", "heart", "specialHeart", "ambulance", "magnet", "spaceship", "rainbowLogo"].includes(kind);
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
      stopMusic();
      timeLeft = 0;
      combo = 0;
      roundNewBest = score > best;
      if (roundNewBest) { best = Math.round(score); localStorage.setItem("gpp-relax-best", String(best)); }
      const chapterComplete = zone === ZONES.length - 1;
      if (chapterComplete) {
        unlockedTier = Math.max(unlockedTier, Math.min(HOSPITAL_TIERS.length - 1, tier + 1));
        localStorage.setItem("gpp-relax-unlocked-tier", String(unlockedTier));
      }
      const showResult = () => {
        if (revealTimer !== null) { window.clearTimeout(revealTimer); revealTimer = null; }
        phase = "finished";
        victorySound();
        if (chapterComplete) window.setTimeout(() => tone(1260 + tier * 70, 0.28, 0.045, "triangle"), 360);
        message = chapterComplete ? "Nâng cấp bệnh viện thành công!" : "Hoàn thành một phút nạp năng lượng!";
        syncHud();
      };
      if (chapterComplete) {
        phase = "reveal"; items = []; particles = [];
        revealStartedAt = performance.now();
        message = mobileLayout ? "Toàn cảnh bệnh viện đã được mở khóa" : "Đang mở toàn cảnh bệnh viện…"; syncHud();
        if (mobileLayout) tone(392, .7, .025, "sine");
        revealTimer = window.setTimeout(showResult, mobileLayout ? 6000 : 2000);
      } else showResult();
      actionsRef.current.skipReveal = () => {
        if (phase !== "reveal" || performance.now() - revealStartedAt < 2000) return;
        showResult();
      };
    }
    function resetRound(nextZone = true) {
      if (nextZone && phase !== "idle") {
        if (zone < ZONES.length - 1) zone += 1;
        else if (tier < HOSPITAL_TIERS.length - 1) { tier += 1; zone = 0; }
        else { tier = 0; zone = 0; }
      }
      phase = "playing"; score = 0; timeLeft = ROUND_SECONDS; baseTimeLeft = ROUND_SECONDS; bonusTimeBank = 0; bonusTimeTotal = 0; bonusPhase = false; roundElapsed = 0; combo = 0; roundBestCombo = 0; roundNewBest = false; lastHitAt = 0; spawnClock = 0; continuitySpawnCooldown = 0;
      specialClock = random(7, 10); penaltyClock = random(6, 9); goldenMomentAnnounced = false; slowUntil = 0; freezeUntil = 0; magnetUntil = 0; doubleUntil = 0; shakeUntil = 0; items = []; particles = [];
      const balance = SCENE_BALANCE[zone];
      dropBudget = Math.floor(random(balance.min, balance.max + 1));
      const pointPlan = buildPillPointPlan(dropBudget, balance.dropCount);
      earlyPillPlan = pointPlan.early;
      latePillPlan = pointPlan.late;
      heartSchedule = [
        { at: random(12, 16), kind: "heart", warned: false, spawned: false },
        { at: random(26, 30), kind: "heart", warned: false, spawned: false },
        { at: random(40, 44), kind: "specialHeart", warned: false, spawned: false },
      ];
      message = `Màn này bắt buộc thả đủ ${dropBudget} điểm thuốc`;
      messageUntil = performance.now() + (tier === 0 ? 2200 : 3200);
      for (let i = 0; i < 4; i++) { spawn("pill", earlyPillPlan.shift()!); items[items.length - 1].y -= i * 100; }
      syncHud();
    }
    actionsRef.current.start = () => { tone(520, 0.14, 0.13); resetRound(false); startMusic(); };
    actionsRef.current.restart = () => { tone(520, 0.14, 0.13); resetRound(true); startMusic(); };
    actionsRef.current.selectTier = (nextTier: number) => {
      if (nextTier < 0 || nextTier > unlockedTier) return;
      tier = nextTier; zone = 0; phase = "idle";
      tone(560 + nextTier * 55, 0.12, 0.07, "triangle"); resetRound(false); startMusic();
    };
    actionsRef.current.pause = () => {
      if (phase === "playing") { phase = "paused"; stopMusic(); message = "Đã tạm dừng — cứ thong thả nhé"; }
      else if (phase === "paused") { phase = "playing"; startMusic(); message = "Tiếp tục nào!"; messageUntil = performance.now() + 1200; }
      syncHud();
    };
    actionsRef.current.goHome = () => {
      phase = "idle"; stopMusic();
      items = []; particles = []; combo = 0; bonusPhase = false; bonusTimeBank = 0; bonusTimeTotal = 0; timeLeft = ROUND_SECONDS; baseTimeLeft = ROUND_SECONDS;
      message = "Chạm Bắt đầu để thư giãn"; messageUntil = 0;
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
        roundBestCombo = Math.max(roundBestCombo, combo);
        lastHitAt = now;
        const multiplier = Math.min(5, 1 + Math.floor(combo / 5));
        const doubleMultiplier = now < doubleUntil ? 2 : 1;
        score += item.points * multiplier * doubleMultiplier;
        burst(item.x, item.y, item.color, 16 + multiplier * 2);
        tone(390 + item.points * 70 + multiplier * 22, 0.08, 0.055, "triangle");
        setMessage(combo >= 5 ? `Chuỗi ${combo} · x${multiplier * doubleMultiplier} điểm!` : `+${item.points * multiplier * doubleMultiplier} điểm`, 0.7);
      } else if (item.kind === "logo") {
        const pillEntries = items.filter((entry) => entry.kind === "pill");
        const cleared = pillEntries.length;
        score += 18 + cleared * 2;
        pillEntries.sort((a, b) => Math.hypot(a.x - item.x, a.y - item.y) - Math.hypot(b.x - item.x, b.y - item.y))
          .forEach((entry, index) => { window.setTimeout(() => burst(entry.x, entry.y, entry.color, 10), index * 18); });
        items = items.filter((entry) => entry.kind !== "pill" && entry.id !== item.id);
        burst(item.x, item.y, "#ffd84a", 64);
        rewardSound(650); window.setTimeout(() => tone(1020, 0.12, 0.04, "triangle"), 70); window.setTimeout(() => tone(1260, 0.16, 0.04, "sine"), 150);
        setMessage(`✨ GPP BONUS! Dọn màn +${18 + cleared * 2} điểm`, 1.7);
        syncHud(); return;
      } else if (item.kind === "coffee") {
        slowUntil = now + 5000; score += 10; burst(item.x, item.y, "#d98b52", 28); rewardSound(480);
        setMessage("Cà phê: chậm lại 5 giây ☕", 1.5);
      } else if (item.kind === "heart" || item.kind === "specialHeart") {
        if (!bonusPhase) bonusTimeBank = Math.min(15, bonusTimeBank + 5);
        const heartScore = item.kind === "specialHeart" ? 15 : 8;
        score += heartScore; burst(item.x, item.y, item.kind === "specialHeart" ? "#ffcf4a" : "#ef5c79", item.kind === "specialHeart" ? 52 : 30); rewardSound(item.kind === "specialHeart" ? 780 : 600);
        setMessage(bonusPhase ? `Trái tim thưởng +${heartScore} điểm ❤️` : item.kind === "specialHeart" ? `Bắt được Tim Sao Băng! +5 giây · +${heartScore} điểm 💖` : `Đã tích ${Math.ceil(bonusTimeBank)} giây thưởng ❤️`, 1.9);
      } else if (item.kind === "ambulance") {
        freezeUntil = now + 3000; score += 10; burst(item.x, item.y, "#20a8cf", 34); rewardSound(560);
        setMessage("Xe cấp cứu: đóng băng thuốc 3 giây 🚑", 1.7);
      } else if (item.kind === "magnet") {
        magnetUntil = now + 5000; magnetX = item.x; magnetY = HEIGHT * 0.52; score += 12; burst(item.x, item.y, "#e55d70", 36); rewardSound(610);
        setMessage("Nam châm y tế: gom thuốc 5 giây 🧲", 1.7);
      } else if (item.kind === "spaceship") {
        const cleared = items.filter((entry) => entry.kind === "pill").length;
        score += 15 + cleared;
        items.filter((entry) => entry.kind === "pill").forEach((entry) => burst(entry.x, entry.y, "#66ddff", 10));
        items = items.filter((entry) => entry.kind !== "pill" && entry.id !== item.id);
        rewardSound(720); setMessage(`Phi thuyền quét thuốc +${15 + cleared} 🚀`, 1.7); syncHud(); return;
      } else if (item.kind === "rainbowLogo") {
        doubleUntil = now + 5000; score += 25; burst(item.x, item.y, `hsl(${now / 8 % 360} 90% 60%)`, 86); victorySound();
        window.setTimeout(() => tone(1320, 0.1, 0.03, "triangle"), 80); window.setTimeout(() => tone(1560, 0.14, 0.035, "sine"), 160);
        setMessage("🌈 Logo GPP cầu vồng: nhân đôi điểm 5 giây!", 2.1);
      } else if (item.kind === "badPill") {
        score = Math.max(0, score - 5); burst(item.x, item.y, "#1b2026", 24); penaltySound();
        setMessage("Thuốc đầu lâu: trừ 5 điểm ☠️", 1.5);
      } else if (item.kind === "virus") {
        if (bonusPhase) bonusTimeBank = Math.max(0, bonusTimeBank - 3);
        else baseTimeLeft = Math.max(0, baseTimeLeft - 3);
        timeLeft = bonusPhase ? bonusTimeBank : baseTimeLeft;
        burst(item.x, item.y, "#7c4dcc", 26); penaltySound();
        setMessage("Virus tinh nghịch: trừ 3 giây 🦠", 1.5);
      } else if (item.kind === "meteor") {
        combo = 0; shakeUntil = now + 520; burst(item.x, item.y, "#845f4a", 32); penaltySound();
        setMessage("Thiên thạch làm mất chuỗi combo ☄️", 1.5);
      } else if (item.kind === "blackhole") {
        item.hits = (item.hits || 0) + 1;
        penaltySound();
        if (item.hits >= 3) {
          score += 8; burst(item.x, item.y, "#8d70ff", 52); rewardSound(620);
          items = items.filter((entry) => entry.id !== item.id);
          setMessage("Đã đóng hố đen! +8 điểm 🌌", 1.5); syncHud(); return;
        }
        setMessage(`Đóng hố đen: còn ${3 - item.hits} lần chạm`, 1.1);
        syncHud(); return;
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
      const chosen = [...items].reverse().find((item) => (x - item.x) ** 2 + (y - item.y) ** 2 <= (item.r + (item.kind === "specialHeart" ? 24 : 13)) ** 2);
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
        const mobileFinalReveal = isFinalScene && mobileLayout && (phase === "reveal" || phase === "finished");
        const cinematicProgress = isFinalScene && mobileLayout ? clamp(roundElapsed / (ROUND_SECONDS - 5), 0, 1) : zoomProgress;
        const path = MOBILE_CINEMATIC_PATHS[tier];
        const pathPosition = cinematicProgress * (path.length - 1);
        const pathIndex = Math.min(path.length - 2, Math.floor(pathPosition));
        const pathLocal = pathPosition - pathIndex;
        const pathEase = pathLocal * pathLocal * (3 - 2 * pathLocal);
        const pathFocus = {
          x: path[pathIndex].x + (path[pathIndex + 1].x - path[pathIndex].x) * pathEase,
          y: path[pathIndex].y + (path[pathIndex + 1].y - path[pathIndex].y) * pathEase,
        };
        const cinematicEase = cinematicProgress * cinematicProgress * (3 - 2 * cinematicProgress);
        // Điện thoại: chuyển động theo đường cong, không phóng to một chiều.
        const scale = isFinalScene && mobileLayout
          ? 0.30 + cinematicEase * 0.54 + Math.sin(cinematicProgress * Math.PI * 4) * .018
          : isFinalScene
          ? 1 - (1 - Math.cos(movement)) * 0.012
          : camera.scale * (1 - (1 - Math.cos(movement)) * 0.02);
        let sw = mapImage.naturalWidth * scale;
        let sh = sw / (WIDTH / HEIGHT);
        if (sh > mapImage.naturalHeight) {
          sh = mapImage.naturalHeight;
          sw = sh * (WIDTH / HEIGHT);
        }
        const panStrength = isFinalScene && mobileLayout ? 0.008 * (1 - cinematicProgress) : isFinalScene ? 0.004 : 0.012;
        const panX = Math.sin(movement) * panStrength;
        const panY = Math.sin(movement * 0.72) * (isFinalScene && mobileLayout ? panStrength * .65 : isFinalScene ? 0.003 : 0.008);
        const focus = isFinalScene && mobileLayout ? pathFocus : camera;
        const focusX = mapImage.naturalWidth * (focus.x + panX);
        const focusY = mapImage.naturalHeight * (focus.y + panY);
        const sx = clamp(focusX - sw / 2, 0, mapImage.naturalWidth - sw);
        const sy = clamp(focusY - sh / 2, 0, mapImage.naturalHeight - sh);
        const mobileWideHold = isFinalScene && mobileLayout && phase === "playing" && roundElapsed >= ROUND_SECONDS - 5;
        if (mobileFinalReveal || mobileWideHold) {
          ctx.save(); ctx.filter = "blur(22px) saturate(.85)"; ctx.globalAlpha = .68;
          ctx.drawImage(mapImage, -36, -36, WIDTH + 72, HEIGHT + 72); ctx.restore();
          const fitHeight = WIDTH / (mapImage.naturalWidth / mapImage.naturalHeight);
          const fitY = (HEIGHT - fitHeight) / 2;
          ctx.drawImage(mapImage, 0, 0, mapImage.naturalWidth, mapImage.naturalHeight, 0, fitY, WIDTH, fitHeight);
        } else {
          ctx.drawImage(mapImage, sx, sy, sw, sh, 0, 0, WIDTH, HEIGHT);
        }
        ctx.fillStyle = "rgba(241,250,251,.4)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        if (isFinalScene && tier < HOSPITAL_TIERS.length - 1 && (phase === "reveal" || phase === "finished")) {
          const nextImage = mapImages[tier + 1];
          if (nextImage.complete && nextImage.naturalWidth > 0) {
            const transition = phase === "finished" ? 1 : clamp((performance.now() - revealStartedAt) / 1800, 0, 1);
            ctx.save(); ctx.globalAlpha = transition;
            if (mobileLayout) {
              ctx.save(); ctx.filter = "blur(22px) saturate(.9)"; ctx.globalAlpha = transition * .7;
              ctx.drawImage(nextImage, -36, -36, WIDTH + 72, HEIGHT + 72); ctx.restore();
              const nextFitHeight = WIDTH / (nextImage.naturalWidth / nextImage.naturalHeight);
              ctx.drawImage(nextImage, 0, 0, nextImage.naturalWidth, nextImage.naturalHeight, 0, (HEIGHT - nextFitHeight) / 2, WIDTH, nextFitHeight);
            } else ctx.drawImage(nextImage, 0, 0, nextImage.naturalWidth, nextImage.naturalHeight, 0, 0, WIDTH, HEIGHT);
            ctx.restore();
          }
        }
      }
      const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 30, WIDTH / 2, HEIGHT / 2, 520);
      glow.addColorStop(0, "rgba(255,255,255,.08)"); glow.addColorStop(1, "rgba(8,92,122,.15)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      if (phase !== "reveal" && !mobileLayout) {
        const labelWidth = 390;
        roundedRect(24, 22, labelWidth, 46, 22); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fill();
        ctx.fillStyle = "#075a78"; ctx.font = "700 17px Arial, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`${HOSPITAL_TIERS[tier].short} · Màn ${zone + 1}/${ZONES.length} · ${ZONES[zone]} · Rơi ${dropBudget} điểm`, 43, 45, labelWidth - 28);
      }
    }
    function drawPill(item: FallingItem) {
      const palette = pillPalette(item.points || 1);
      ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.rotation);
      ctx.shadowColor = "rgba(6,68,84,.18)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 7;
      if (item.shape === 0) {
        const glow = ctx.createRadialGradient(0, 0, item.r * .25, 0, 0, item.r * 1.6);
        glow.addColorStop(0, "rgba(255,255,255,.34)"); glow.addColorStop(.55, palette.glow); glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = .22; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, item.r * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        const gradient = ctx.createRadialGradient(-item.r * .32, -item.r * .38, 2, 0, 0, item.r);
        gradient.addColorStop(0, "#fffefd"); gradient.addColorStop(.26, "#ffffff"); gradient.addColorStop(.6, palette.shell); gradient.addColorStop(1, palette.accent);
        ctx.beginPath(); ctx.arc(0, 0, item.r, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-item.r * .66, 4); ctx.lineTo(item.r * .66, 4);
        ctx.strokeStyle = "rgba(17,79,90,.34)"; ctx.lineWidth = 2.8; ctx.lineCap = "round"; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-item.r * .58, 2.5); ctx.lineTo(item.r * .58, 2.5);
        ctx.strokeStyle = "rgba(255,255,255,.52)"; ctx.lineWidth = 1.2; ctx.stroke();
        if (item.kind === "pill") {
          ctx.fillStyle = "rgba(255,255,255,.86)"; ctx.beginPath(); ctx.arc(0, -item.r * .18, item.r * .45, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = palette.text; ctx.font = `900 ${item.r * .62}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(item.points), 0, -item.r * .18);
        }
      } else {
        const width = item.r * 2.92;
        const height = item.r * 1.44;
        const halo = ctx.createRadialGradient(0, 0, item.r * .4, 0, 0, item.r * 1.9);
        halo.addColorStop(0, "rgba(255,255,255,.20)"); halo.addColorStop(.52, palette.glow); halo.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = .24; ctx.fillStyle = halo; ctx.beginPath(); ctx.ellipse(0, 0, item.r * 1.9, item.r * 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        roundedRect(-width / 2, -height / 2, width, height, height / 2);
        ctx.save(); ctx.clip();
        const left = ctx.createLinearGradient(-width / 2, -height / 2, 0, height / 2);
        left.addColorStop(0, item.kind === "badPill" ? "#505860" : "#ffffff"); left.addColorStop(1, item.kind === "badPill" ? "#151a1f" : "#edf7f8");
        ctx.fillStyle = left; ctx.fillRect(-width / 2, -height / 2, width / 2, height);
        const right = ctx.createLinearGradient(0, -height / 2, width / 2, height / 2);
        right.addColorStop(0, palette.shell); right.addColorStop(1, palette.accent);
        ctx.fillStyle = right; ctx.fillRect(0, -height / 2, width / 2, height);
        ctx.fillStyle = "rgba(255,255,255,.30)"; ctx.fillRect(-width / 2 + 7, -height / 2 + 5, width - 14, height * .22);
        ctx.restore();
        ctx.shadowBlur = 0; roundedRect(-width / 2, -height / 2, width, height, height / 2);
        ctx.strokeStyle = "rgba(255,255,255,.88)"; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -height / 2 + 2); ctx.lineTo(0, height / 2 - 2);
        ctx.strokeStyle = "rgba(17,79,90,.26)"; ctx.lineWidth = 2; ctx.stroke();
        if (item.kind === "pill") {
          ctx.fillStyle = "rgba(255,255,255,.88)"; roundedRect(width * .06, -height * .28, item.r * .98, item.r * .62, item.r * .31); ctx.fill();
          ctx.fillStyle = palette.text; ctx.font = `900 ${item.r * .56}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(item.points), width * .31, 1);
        }
      }
      if (item.kind === "badPill") {
        ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 8; ctx.fillStyle = "#fff"; ctx.font = `900 ${item.r * 1.05}px Arial, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("☠", 0, 1);
      }
      if (item.kind === "pill" && item.points >= 9) {
        ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,243,173,.95)"; ctx.font = `700 ${item.r * .42}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(item.points === 10 ? "★" : "✦", item.r * .62, -item.r * .62);
      }
      ctx.restore();
    }
    function drawSpecial(item: FallingItem) {
      ctx.save(); ctx.translate(item.x, item.y);
      const now = performance.now();
      const isLogo = item.kind === "logo" || item.kind === "rainbowLogo";
      ctx.shadowColor = item.kind === "rainbowLogo" ? `hsl(${now / 7 % 360} 95% 58%)` : item.kind === "logo" ? "rgba(255,204,30,.8)" : "rgba(0,82,106,.3)"; ctx.shadowBlur = item.kind === "rainbowLogo" ? 34 : 22;
      if (isLogo) {
        const logoPulse = 1 + Math.sin(now / 200 + item.id) * .03;
        ctx.save();
        ctx.globalAlpha = .28;
        for (let i = 0; i < 6; i++) {
          const rayAngle = now / 900 + (Math.PI * 2 * i) / 6;
          ctx.strokeStyle = item.kind === "rainbowLogo" ? `hsla(${(now / 6 + i * 30) % 360} 95% 68% / .36)` : "rgba(255,214,90,.34)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(rayAngle) * item.r * .8, Math.sin(rayAngle) * item.r * .8);
          ctx.lineTo(Math.cos(rayAngle) * item.r * 1.8, Math.sin(rayAngle) * item.r * 1.8);
          ctx.stroke();
        }
        ctx.restore();
        roundedRect(-item.r * .98 * logoPulse, -item.r * .98 * logoPulse, item.r * 1.96 * logoPulse, item.r * 1.96 * logoPulse, 18);
        ctx.fillStyle = "rgba(255,255,255,.97)"; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = item.kind === "rainbowLogo" ? `hsl(${now / 6 % 360} 95% 55%)` : "#f4c430"; ctx.lineWidth = item.kind === "rainbowLogo" ? 6 : 4; ctx.stroke();
        if (logoImage.complete && logoImage.naturalWidth > 0) {
          if (item.kind === "rainbowLogo") ctx.filter = `hue-rotate(${now / 10 % 360}deg) saturate(1.8)`;
          ctx.drawImage(logoImage, -item.r * .84, -item.r * .84, item.r * 1.68, item.r * 1.68);
          ctx.filter = "none";
        } else {
          ctx.font = "bold 19px Arial, sans-serif"; ctx.fillStyle = "#087aa5"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("TRƯỜNG GPP", 0, 0);
        }
        if (item.kind === "rainbowLogo") {
          ctx.font = "20px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("🌈", item.r * .7, -item.r * .7);
        }
      } else if (item.kind === "blackhole") {
        const pulse = 1 + Math.sin(now / 120) * .08;
        const gradient = ctx.createRadialGradient(0, 0, 3, 0, 0, item.r * pulse);
        gradient.addColorStop(0, "#02030a"); gradient.addColorStop(.42, "#14052f"); gradient.addColorStop(.7, "#704bd4"); gradient.addColorStop(1, "rgba(85,210,255,.1)");
        ctx.beginPath(); ctx.arc(0, 0, item.r * pulse, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = `hsl(${now / 9 % 360} 80% 65%)`; ctx.lineWidth = 5; ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "900 17px Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`${item.hits || 0}/3`, 0, 1);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, item.r, 0, Math.PI * 2);
        const backgrounds: Partial<Record<FallingItem["kind"], string>> = { coffee:"#fff1df", heart:"#ffe4eb", specialHeart:"#fff0c9", ambulance:"#e7f8ff", magnet:"#fff0f2", spaceship:"#e8f1ff", virus:"#efe5ff", meteor:"#f1e6dc" };
        ctx.fillStyle = backgrounds[item.kind] || "#eef8fa"; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = item.kind === "specialHeart" ? `hsl(${now / 8 % 360} 90% 58%)` : "rgba(5,112,145,.3)"; ctx.lineWidth = item.kind === "specialHeart" ? 5 : 3; ctx.stroke();
        ctx.font = `${item.r * 1.15}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const icons: Partial<Record<FallingItem["kind"], string>> = { coffee:"☕", heart:"❤️", specialHeart:"💖", ambulance:"🚑", magnet:"🧲", spaceship:"🚀", virus:"🦠", meteor:"☄️" };
        ctx.fillText(icons[item.kind] || "✨", 0, 3);
      }
      ctx.restore();
    }
    function itemFxColor(item: FallingItem) {
      if (item.kind === "rainbowLogo") return `hsl(${performance.now() / 8 % 360} 92% 62%)`;
      const colors: Partial<Record<FallingItem["kind"], string>> = { logo:"#ffd84a", coffee:"#f2a45f", heart:"#ff6d8c", specialHeart:"#ffd75a", ambulance:"#46c8ff", magnet:"#ff738b", spaceship:"#74b9ff", badPill:"#ff5b6e", virus:"#a986ff", meteor:"#ff9852", blackhole:"#8d70ff" };
      return colors[item.kind] || pillPalette(item.points || 1).shell || item.color || "#79e8df";
    }
    function drawItemAura(item: FallingItem) {
      const now = performance.now();
      const pulse = 1 + Math.sin(now / 150 + item.id * .7) * .08;
      const color = itemFxColor(item);
      ctx.save(); ctx.translate(item.x, item.y);
      if (item.kind === "pill") {
        const strength = .11 + item.points * .01;
        const glow = ctx.createRadialGradient(0,0,item.r*.42,0,0,item.r*1.78);
        glow.addColorStop(0, "rgba(255,255,255,.20)"); glow.addColorStop(.42, color); glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = strength; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0,0,item.r*1.75*pulse,0,Math.PI*2); ctx.fill();
        if (item.points >= 7) { ctx.globalAlpha=.34; ctx.strokeStyle=item.points >= 9 ? "#fff1a0" : "rgba(255,255,255,.8)"; ctx.lineWidth=2; ctx.setLineDash([7,7]); ctx.rotate(now/700); ctx.beginPath(); ctx.arc(0,0,item.r*1.26,0,Math.PI*2); ctx.stroke(); }
        if (item.points >= 9) { ctx.globalAlpha=.72; for(let i=0;i<3;i++){ const a=now/380+i*Math.PI*2/3; ctx.fillStyle=i===0?"#fff7be":"#ffffff"; ctx.beginPath(); ctx.arc(Math.cos(a)*item.r*1.46,Math.sin(a)*item.r*1.46,2.2,0,Math.PI*2); ctx.fill(); } }
      } else if (item.kind === "badPill") {
        ctx.globalAlpha=.34+.12*Math.sin(now/110); ctx.strokeStyle="#ff5b6e"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,item.r*1.38*pulse,0,Math.PI*2); ctx.stroke();
      } else if (item.kind === "logo" || item.kind === "rainbowLogo") {
        ctx.globalAlpha=.42; ctx.strokeStyle=color; ctx.lineWidth=3; ctx.setLineDash([12,8]); ctx.rotate(now/520); ctx.beginPath(); ctx.arc(0,0,item.r*1.22*pulse,0,Math.PI*2); ctx.stroke();
        ctx.rotate(-now/300); ctx.strokeStyle=item.kind === "rainbowLogo" ? `hsl(${now/6+140} 95% 63%)` : "#73ece1"; ctx.lineWidth=2; ctx.setLineDash([4,10]); ctx.beginPath(); ctx.arc(0,0,item.r*1.43,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        for(let i=0;i<5;i++){ const a=now/420+i*Math.PI*2/5; const rr=item.r*1.55; const x=Math.cos(a)*rr,y=Math.sin(a)*rr; ctx.globalAlpha=.75; ctx.fillStyle=i%2?"#fff1a8":"#8dfff1"; ctx.beginPath(); ctx.arc(x,y,2.6+(i%2),0,Math.PI*2); ctx.fill(); }
      } else if (item.kind === "heart" || item.kind === "specialHeart") {
        ctx.globalAlpha=.22+.12*Math.sin(now/135); ctx.strokeStyle=color; ctx.lineWidth=item.kind === "specialHeart"?4:3; ctx.beginPath(); ctx.arc(0,0,item.r*1.32*pulse,0,Math.PI*2); ctx.stroke();
        if(item.kind === "specialHeart"){ ctx.globalAlpha=.55; for(let i=0;i<4;i++){ const a=now/250+i*Math.PI/2; ctx.fillStyle=`hsl(${now/8+i*75} 90% 64%)`; ctx.beginPath(); ctx.arc(Math.cos(a)*item.r*1.52,Math.sin(a)*item.r*1.52,3,0,Math.PI*2); ctx.fill(); }}
      } else if (item.kind === "coffee") {
        ctx.globalAlpha=.34; ctx.strokeStyle="#fff0d8"; ctx.lineWidth=3; for(let i=-1;i<=1;i++){ ctx.beginPath(); for(let y=-item.r*1.8;y<-item.r*.65;y+=5){ const x=i*9+Math.sin(y*.12+now/260+i)*4; if(y===-item.r*1.8)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke(); }
      } else if (item.kind === "ambulance") {
        const flash=Math.sin(now/85)>0; ctx.globalAlpha=.58; ctx.fillStyle=flash?"#ff526d":"#59d7ff"; ctx.shadowColor=ctx.fillStyle as string; ctx.shadowBlur=16; ctx.beginPath(); ctx.arc(-item.r*.72,-item.r*.72,5,0,Math.PI*2); ctx.arc(item.r*.72,-item.r*.72,5,0,Math.PI*2); ctx.fill();
      } else if (item.kind === "magnet") {
        ctx.globalAlpha=.28; ctx.strokeStyle="#7ae9ff"; ctx.lineWidth=2.5; for(let r=1.25;r<=1.65;r+=.2){ctx.beginPath();ctx.arc(0,0,item.r*r,-Math.PI*.82,Math.PI*.82);ctx.stroke();}
      } else if (item.kind === "spaceship") {
        const grad=ctx.createLinearGradient(0,-item.r*.7,0,-item.r*2.4); grad.addColorStop(0,"rgba(126,235,255,.65)");grad.addColorStop(.45,"rgba(91,158,255,.35)");grad.addColorStop(1,"rgba(91,158,255,0)");ctx.globalAlpha=.8;ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(-8,-item.r*.5);ctx.lineTo(0,-item.r*2.2*(.85+.15*Math.sin(now/70)));ctx.lineTo(8,-item.r*.5);ctx.closePath();ctx.fill();
      } else if (item.kind === "virus") {
        ctx.globalAlpha=.3;ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.setLineDash([4,7]);ctx.rotate(now/500);ctx.beginPath();ctx.arc(0,0,item.r*1.4,0,Math.PI*2);ctx.stroke();
      } else if (item.kind === "meteor") {
        const grad=ctx.createLinearGradient(0,0,0,-item.r*2.8);grad.addColorStop(0,"rgba(255,177,76,.72)");grad.addColorStop(.35,"rgba(255,92,56,.38)");grad.addColorStop(1,"rgba(255,92,56,0)");ctx.globalAlpha=.9;ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(-item.r*.45,-item.r*.2);ctx.lineTo(0,-item.r*2.6);ctx.lineTo(item.r*.45,-item.r*.2);ctx.closePath();ctx.fill();
      }
      ctx.restore();
    }
    function drawAmbientFx() {
      const now = performance.now();
      ctx.save();
      for (let i = 0; i < (mobileLayout ? 8 : 12); i++) {
        const lane = (i * 137.3) % WIDTH;
        const x = (lane + now * (0.004 + (i % 3) * 0.0017)) % (WIDTH + 80) - 40;
        const y = ((i * 83 + now * (0.012 + (i % 4) * 0.002)) % (HEIGHT + 120)) - 60;
        const radius = 2 + (i % 4) * 1.2;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 5);
        glow.addColorStop(0, i % 3 === 0 ? "rgba(255,222,108,.28)" : "rgba(124,236,229,.24)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, radius * 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    function drawItemTrails() {
      ctx.save();
      for (const item of items) {
        const reward = isRewardKind(item.kind);
        const alpha = reward ? .16 : .065;
        const steps = reward ? 4 : 2;
        for (let i = steps; i >= 1; i--) {
          const ty = item.y - i * (reward ? 13 : 8);
          const tr = Math.max(3, item.r * (reward ? .18 : .10) * (1 - i / (steps + 2)));
          ctx.globalAlpha = alpha * (1 - i / (steps + 1));
          ctx.fillStyle = item.kind === "rainbowLogo" ? `hsl(${performance.now() / 8 + i * 35} 90% 62%)` : reward ? (item.kind === "logo" ? "#ffd968" : "#79e8df") : pillPalette(item.points || 1).shell;
          ctx.beginPath(); ctx.arc(item.x, ty, tr, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function drawForegroundFx() {
      const now = performance.now();
      ctx.save();
      const vignette = ctx.createRadialGradient(WIDTH * .5, HEIGHT * .48, HEIGHT * .18, WIDTH * .5, HEIGHT * .5, Math.max(WIDTH, HEIGHT) * .68);
      vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(1,33,45,.22)");
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const sweepX = ((now * .055) % (WIDTH + 420)) - 210;
      const sweep = ctx.createLinearGradient(sweepX - 130, 0, sweepX + 130, 0);
      sweep.addColorStop(0, "rgba(255,255,255,0)"); sweep.addColorStop(.5, "rgba(255,255,255,.045)"); sweep.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sweep; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      if (combo >= 5 && phase === "playing") {
        ctx.globalAlpha = Math.min(.18, .06 + combo * .002); ctx.strokeStyle = combo >= 10 ? "#ffd85e" : "#64ded4"; ctx.lineWidth = 3;
        roundedRect(7, 7, WIDTH - 14, HEIGHT - 14, 22); ctx.stroke();
      }
      ctx.restore();
    }
    function drawFrame() {
      ctx.clearRect(0, 0, WIDTH, HEIGHT); drawBackground(); drawAmbientFx(); drawItemTrails();
      items.forEach(drawItemAura);
      ctx.save();
      if (performance.now() < shakeUntil) ctx.translate(random(-6, 6), random(-5, 5));
      items.forEach((item) => item.kind === "pill" || item.kind === "badPill" ? drawPill(item) : drawSpecial(item));
      ctx.restore();
      for (const particle of particles) {
        ctx.globalAlpha = clamp(particle.life * 2, 0, 1); ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color; ctx.fill();
      }
      ctx.globalAlpha = 1; drawForegroundFx();
    }
    function handlePillCollisions() {
      const pills = items.filter((item) => item.kind === "pill" || item.kind === "badPill");
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
            const massA = (a.shape === 0 ? 1 : 1.28) * (.72 + Math.max(1, a.points) * .13);
            const massB = (b.shape === 0 ? 1 : 1.28) * (.72 + Math.max(1, b.points) * .13);
            const impulse = -(1 + 0.7) * relativeSpeed / (1 / massA + 1 / massB);
            a.drift -= impulse * nx / massA; a.speed -= impulse * ny / massA;
            b.drift += impulse * nx / massB; b.speed += impulse * ny / massB;
            a.spin -= (nx + ny) * 0.85 / massA; b.spin += (nx + ny) * 0.85 / massB;
            const now = performance.now();
            if (now - lastCollisionSound > 190 && Math.abs(relativeSpeed) > 35) {
              lastCollisionSound = now; tone(145 + Math.min(90, Math.abs(relativeSpeed)), 0.035, 0.018, "sine");
            }
          }
          a.drift = clamp(a.drift, -68, 68); b.drift = clamp(b.drift, -68, 68);
          a.speed = clamp(a.speed, -45, 360); b.speed = clamp(b.speed, -45, 360);
        }
      }
    }
    function update(delta: number, now: number) {
      if (phase !== "playing") return;
      roundElapsed += delta;
      if (bonusPhase) {
        bonusTimeBank -= delta;
        timeLeft = bonusTimeBank;
        if (bonusTimeBank <= 0) { finishRound(); return; }
      } else {
        baseTimeLeft -= delta;
        timeLeft = baseTimeLeft;
        if (baseTimeLeft <= 0) {
          if (bonusTimeBank <= 0) { finishRound(); return; }
          bonusPhase = true;
          bonusTimeTotal = bonusTimeBank;
          timeLeft = bonusTimeBank;
          items = items.filter((item) => item.kind !== "heart" && item.kind !== "specialHeart");
          stopMusic(); startMusic(); rewardSound(690);
          message = `❤️ Thời gian thưởng: ${Math.ceil(bonusTimeBank)} giây!`;
          messageUntil = now + 2400;
          syncHud();
        }
      }
      spawnClock -= delta; continuitySpawnCooldown = Math.max(0, continuitySpawnCooldown - delta); specialClock -= delta;
      penaltyClock -= delta;
      const sceneBalance = SCENE_BALANCE[zone];
      if (!bonusPhase) {
        for (const heartEvent of heartSchedule) {
          if (heartEvent.kind === "specialHeart" && !heartEvent.warned && roundElapsed >= heartEvent.at - .4) {
            heartEvent.warned = true;
            tone(980, .12, .05, "triangle");
            setMessage("💖 Tim Sao Băng đang đến — chuẩn bị!", .7);
          }
          if (!heartEvent.spawned && roundElapsed >= heartEvent.at) {
            heartEvent.spawned = true;
            spawn(heartEvent.kind);
            if (heartEvent.kind === "specialHeart") { rewardSound(720); setMessage("💖 Tim Sao Băng xuất hiện!", 1.1); }
            else setMessage("❤️ Trái tim +5 giây xuất hiện!", 1.1);
          }
        }
      }
      const mandatoryRemaining = earlyPillPlan.length + latePillPlan.length;
      const activeMandatoryCount = baseTimeLeft > 10 ? earlyPillPlan.length : mandatoryRemaining;
      const urgentDrop = !bonusPhase && baseTimeLeft <= 8 && mandatoryRemaining > 0;
      const normalItemLimit = sceneBalance.maxItems + (tier >= 3 ? 6 : 0);
      const pillCountOnScreen = items.filter((item) => item.kind === "pill").length;
      if (!bonusPhase && activeMandatoryCount > 0 && pillCountOnScreen < 3) spawnClock = 0;
      if (!bonusPhase && activeMandatoryCount > 0 && spawnClock <= 0 && items.length < (urgentDrop ? 44 : normalItemLimit)) {
        const nextPoints = takeNextPlannedPillPoints();
        if (nextPoints !== undefined) spawn("pill", nextPoints);
        const remainingForWindow = baseTimeLeft > 10 ? earlyPillPlan.length : earlyPillPlan.length + latePillPlan.length;
        const secondsToWindowEnd = Math.max(.8, baseTimeLeft - (baseTimeLeft > 10 ? 10 : .35));
        const evenlySpaced = secondsToWindowEnd / Math.max(1, remainingForWindow + 1);
        spawnClock = clamp(evenlySpaced, .1, sceneBalance.spawn[1]);
      } else if (bonusPhase && spawnClock <= 0 && items.length < normalItemLimit) {
        spawn("pill");
        spawnClock = random(sceneBalance.spawn[0], sceneBalance.spawn[1]) * .9;
      }
      if (!goldenMomentAnnounced && !bonusPhase && zone === ZONES.length - 1 && baseTimeLeft <= 5) {
        goldenMomentAnnounced = true; rewardSound(760); setMessage("✨ Khoảnh khắc vàng: 5 giây thưởng cuối!", 2.2);
      }
      if (specialClock <= 0) {
        const rewards: FallingItem["kind"][] = ["logo", "coffee"];
        if (tier >= 1) rewards.push("ambulance");
        if (tier >= 2) rewards.push("magnet");
        if (tier >= 3) rewards.push("spaceship");
        if (tier >= 4) rewards.push("rainbowLogo");
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        spawn(reward); specialClock = random(7.5, 11);
        const rewardNames: Partial<Record<FallingItem["kind"], string>> = { logo:"Logo GPP", coffee:"Cà phê", ambulance:"Xe cấp cứu", magnet:"Nam châm y tế", spaceship:"Phi thuyền", rainbowLogo:"Logo GPP cầu vồng" };
        setMessage(`${rewardNames[reward]} xuất hiện!`, 1.4);
      }
      if (tier >= 1 && penaltyClock <= 0) {
        const penalties: FallingItem["kind"][] = ["badPill"];
        if (tier >= 2) penalties.push("virus");
        if (tier >= 3) penalties.push("meteor");
        if (tier >= 4) penalties.push("blackhole");
        const penalty = penalties[Math.floor(Math.random() * penalties.length)];
        spawn(penalty); penaltyClock = random(6.5, 9.5);
        const penaltyNames: Partial<Record<FallingItem["kind"], string>> = { badPill:"Thuốc đầu lâu", virus:"Virus tinh nghịch", meteor:"Thiên thạch", blackhole:"Hố đen quá tải" };
        setMessage(`Cẩn thận: ${penaltyNames[penalty]}!`, 1.4);
      }
      const slowFactor = now < slowUntil ? 0.48 : 1;
      const lowGravityFactor = tier >= 3 ? 0.72 : 1;
      const blackholes = items.filter((entry) => entry.kind === "blackhole");
      for (const item of items) {
        const isMedicine = item.kind === "pill" || item.kind === "badPill";
        if (isMedicine) item.speed = Math.min(360, item.speed + (tier >= 3 ? 10 : 22) * SCENE_BALANCE[zone].speed * delta);
        if (now < magnetUntil && item.kind === "pill") {
          item.drift += clamp((magnetX - item.x) * 0.42 * delta, -18, 18);
          item.speed += clamp((magnetY - item.y) * 0.2 * delta, -12, 12);
        }
        if (blackholes.length && isRewardKind(item.kind)) {
          const hole = blackholes[0];
          const dx = hole.x - item.x; const dy = hole.y - item.y; const distance = Math.max(45, Math.hypot(dx, dy));
          item.drift += dx / distance * 34 * delta; item.speed += dy / distance * 25 * delta;
        }
        const freezeFactor = now < freezeUntil && isMedicine ? 0.04 : 1;
        const floatingDrift = tier >= 3 && isMedicine ? Math.sin(now / 520 + item.id) * 11 : 0;
        const specialHeartWave = item.kind === "specialHeart" ? Math.sin(now / 72 + item.id) * 235 : 0;
        const itemSlowFactor = item.kind === "specialHeart" ? 1 : slowFactor;
        const itemGravityFactor = item.kind === "specialHeart" ? 1 : lowGravityFactor;
        item.y += item.speed * itemSlowFactor * itemGravityFactor * freezeFactor * delta;
        item.x += (item.drift + floatingDrift + specialHeartWave) * delta; item.rotation += item.spin * delta;
        if (item.x < item.r) { item.x = item.r; item.drift = Math.abs(item.drift) * 0.8; }
        if (item.x > WIDTH - item.r) { item.x = WIDTH - item.r; item.drift = -Math.abs(item.drift) * 0.8; }
      }
      handlePillCollisions();
      const escapedBlackholes = items.filter((item) => item.kind === "blackhole" && item.y >= HEIGHT + item.r);
      for (const hole of escapedBlackholes) {
        const lostReward = items.find((item) => item.id !== hole.id && isRewardKind(item.kind));
        if (lostReward) {
          items = items.filter((item) => item.id !== lostReward.id);
          penaltySound(); setMessage("Hố đen đã hút mất một vật phẩm thưởng!", 1.7);
        }
      }
      items = items.filter((item) => item.y < HEIGHT + item.r);

      // PA2.5 · Anti-empty medicine guard:
      // Chỉ đếm thuốc đang nhìn thấy thật trong canvas. Giữ tối thiểu 2 viên làm lớp đệm
      // (1 viên trong khoảnh khắc cuối) để tuyệt đối không tạo khoảng chết không có thuốc.
      const visiblePillCount = items.filter((item) =>
        item.kind === "pill" && item.y >= -item.r * .12 && item.y <= HEIGHT - item.r * .08
      ).length;
      const continuityMinimum = timeLeft > .8 ? 2 : 1;
      if (visiblePillCount < continuityMinimum && timeLeft > .12 && continuitySpawnCooldown <= 0) {
        const plannedPoints = bonusPhase ? undefined : takeNextPlannedPillPoints();
        spawnVisiblePill(plannedPoints ?? (bonusPhase ? undefined : 1));
        continuitySpawnCooldown = .22;
        spawnClock = Math.max(spawnClock, .12);
      }

      if (combo > 0 && now - lastHitAt > 1500) combo = 0;
      if (messageUntil && now > messageUntil) {
        messageUntil = 0; message = bonusPhase ? "❤️ Thời gian thưởng — ghi điểm phá kỷ lục!" : now < slowUntil ? "Đang chậm lại — tận hưởng nhé ☕" : "Chạm vào thuốc để ghi điểm!"; syncHud();
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
    const queueResize = () => { window.requestAnimationFrame(() => { resizeCanvas(); window.requestAnimationFrame(resizeCanvas); }); };
    resizeCanvas();
    window.addEventListener("resize", queueResize);
    window.addEventListener("orientationchange", queueResize);
    window.visualViewport?.addEventListener("resize", queueResize);
    document.addEventListener("fullscreenchange", queueResize);
    const canvasResizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(queueResize) : null;
    if (gameCanvas.parentElement) canvasResizeObserver?.observe(gameCanvas.parentElement);
    gameCanvas.addEventListener("pointerdown", onPointer);
    document.addEventListener("visibilitychange", onVisibilityChange);
    syncHud(); animationFrame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animationFrame); if (revealTimer !== null) window.clearTimeout(revealTimer); stopMusic(); window.removeEventListener("resize", queueResize); window.removeEventListener("orientationchange", queueResize); window.visualViewport?.removeEventListener("resize", queueResize); document.removeEventListener("fullscreenchange", queueResize); canvasResizeObserver?.disconnect(); gameCanvas.removeEventListener("pointerdown", onPointer); document.removeEventListener("visibilitychange", onVisibilityChange); audioContext?.close(); };
  }, []);

  const result = getResult(hud.score);
  const sceneBalance = SCENE_BALANCE[hud.zone];
  const medal = getMedal(hud.score, sceneBalance.target);
  const progress = clamp((hud.time / (hud.bonusPhase ? Math.max(1, hud.bonusTotal) : ROUND_SECONDS)) * 100, 0, 100);
  const inActivePlay = hud.phase === "playing" || hud.phase === "paused";
  const showMenuShell = hud.phase === "idle" || hud.phase === "finished";
  const showPlayToast = inActivePlay && hud.message && hud.message !== "Chạm Bắt đầu để thư giãn";
  const isChapterComplete = hud.zone === ZONES.length - 1;
  const isSuperComplete = isChapterComplete && hud.tier === HOSPITAL_TIERS.length - 1;
  const nextTier = HOSPITAL_TIERS[Math.min(hud.tier + 1, HOSPITAL_TIERS.length - 1)];
  const completedUpgradeCount = Math.min(4, hud.tier);
  const eventDockMessage = [
    "Chạm Bắt đầu để thư giãn",
    "Chạm vào thuốc để ghi điểm!",
  ].includes(hud.message) ? "" : hud.message;
  const activeEffects = [
    hud.slowLeft > 0 ? `☕ Chậm ${hud.slowLeft}s` : "",
    hud.freezeLeft > 0 ? `🚑 Đông băng ${hud.freezeLeft}s` : "",
    hud.magnetLeft > 0 ? `🧲 Nam châm ${hud.magnetLeft}s` : "",
    hud.doubleLeft > 0 ? `🌈 ×2 ${hud.doubleLeft}s` : "",
  ].filter(Boolean);
  const compactEffects = [
    hud.slowLeft > 0 ? `☕${hud.slowLeft}s` : "",
    hud.freezeLeft > 0 ? `🚑${hud.freezeLeft}s` : "",
    hud.magnetLeft > 0 ? `🧲${hud.magnetLeft}s` : "",
    hud.doubleLeft > 0 ? `🌈×2 ${hud.doubleLeft}s` : "",
  ].filter(Boolean);
  return (
    <main className={`site-shell phase-${hud.phase} ${inActivePlay ? "in-play" : "in-menu"}`}>
      <header className={`topbar ${showMenuShell ? "" : "topbar-hidden"}`}>
        <div className="brand">
          <div className="brand-logo-wrap"><img src={`${ASSET_BASE}logo.png`} alt="Logo Trường GPP" className="brand-logo" /></div>
          <div><p className="eyebrow">TRƯỜNG GPP · PHÚT GIẢI LAO</p><h1>Bác Sĩ Thư Giãn</h1><p className="tagline">6 màn mỗi chặng · Nâng cấp đến Bệnh viện Siêu cấp</p></div>
        </div>
        <div className="top-actions">
          {!installed && <button className="icon-button install-button" onClick={installGame}>📲 Cài game</button>}
          {updateRegistration && <button className="icon-button update-button" onClick={updateGame}>⬆ Cập nhật</button>}
          <button className="icon-button" onClick={() => setShowHelpPanel(true)}>❔ Vật phẩm</button>
          <button className="icon-button" onClick={() => actionsRef.current.toggleMusic()} aria-label={hud.music ? "Tắt nhạc nền" : "Bật nhạc nền"}>{hud.music ? "🎵 Nhạc nền" : "🎼 Bật nhạc"}</button>
          <button className="icon-button" onClick={() => actionsRef.current.toggleSound()} aria-label={hud.sound ? "Tắt hiệu ứng" : "Bật hiệu ứng"}>{hud.sound ? "🔊 Hiệu ứng" : "🔇 Bật tiếng"}</button>
        </div>
      </header>
      <section className={`game-card ${hud.phase === "reveal" ? "cinematic-reveal" : ""}`} aria-label="Trò chơi Bác Sĩ Thư Giãn">
        {showMenuShell && <div className="menu-summary">
          <div className="menu-summary-main">
            <div className="menu-stage-chip">{HOSPITAL_TIERS[hud.tier].icon} {HOSPITAL_TIERS[hud.tier].name} · Màn {hud.zone + 1}/{ZONES.length}</div>
            <div className="menu-progress-dots" aria-label="Tiến trình bệnh viện">{HOSPITAL_TIERS.map((hospitalTier, index) => {
              const locked = index > hud.unlockedTier;
              const selectable = !locked && (hud.phase === "idle" || hud.phase === "finished");
              return <button type="button" key={hospitalTier.name} disabled={!selectable} onClick={() => actionsRef.current.selectTier(index)} className={`progress-dot ${index === hud.tier ? "current" : ""} ${index <= hud.unlockedTier ? "open" : "locked"}`} aria-label={hospitalTier.name}>{locked ? "🔒" : hospitalTier.icon}</button>;
            })}</div>
            <div className="menu-summary-copy"><strong>Mục tiêu màn:</strong> thả đủ <b>{hud.dropBudget}</b> điểm thuốc trong 60 giây · <strong>Kỷ lục:</strong> {hud.best}</div>
          </div>
          <div className="menu-summary-help">
            <button type="button" className="assist-chip" onClick={() => setShowHelpPanel(true)}>❔ Xem toàn bộ vật phẩm</button>
            <div className="assist-inline">{TIER_INTROS[hud.tier]}</div>
          </div>
        </div>}
        {inActivePlay && <div className="play-hud" aria-label="Thông tin trong lúc chơi">
          <div className="play-chip score"><span>⭐ Điểm</span><strong>{hud.score}</strong></div>
          <div className={`play-chip timer ${hud.bonusPhase ? "bonus" : ""}`}><span>{hud.bonusPhase ? "❤️ Thưởng" : "⏱ Thời gian"}</span><strong>{hud.time}s</strong></div>
          <button className="play-pause-button" onClick={() => actionsRef.current.pause()} aria-label={hud.phase === "paused" ? "Tiếp tục" : "Tạm dừng"}>{hud.phase === "paused" ? "▶" : "Ⅱ"}</button>
          <div className="play-floating-info" aria-live="polite">
            {eventDockMessage && <div className="floating-badge event">{eventDockMessage}</div>}
            {hud.combo >= 5 && <div className="floating-badge combo">🔥 ×{hud.combo}</div>}
            {hud.bonusBank > 0 && !hud.bonusPhase && <div className="floating-badge heart">❤️ +{hud.bonusBank}s</div>}
            {hud.bonusPhase && <div className="floating-badge heart">❤️ {hud.time}s</div>}
            {compactEffects.length > 0 && <div className="floating-badge effects">{compactEffects.join(" · ")}</div>}
            {!eventDockMessage && hud.combo < 5 && hud.bonusBank <= 0 && !hud.bonusPhase && activeEffects.length === 0 && <div className="floating-badge calm"><span className="mini-ecg" aria-hidden="true" /> GPP</div>}
          </div>
        </div>}
        <div className={`time-track ${hud.bonusPhase ? "bonus" : ""} ${inActivePlay ? "active" : "menu-track"}`} aria-label={`Còn ${hud.time} giây`}><span style={{ width: `${progress}%` }} /></div>
        <div className="canvas-wrap">
          <canvas ref={canvasRef} className="game-canvas" aria-label="Khu vực chơi, chạm vào các viên thuốc" />
          {hud.phase === "idle" && <div className="game-overlay welcome-panel">
            <div className="pulse-icon">💊</div><p className="overlay-kicker">Luật chơi trong một phút</p><h2>Chạm thuốc để ghi điểm</h2>
            <p>Thư giãn nhẹ nhàng trong 60 giây. Chỉ cần chạm đúng vật phẩm và tránh đồ nguy hiểm.</p>
            <button className="primary-button" onClick={() => { void enterImmersiveMode(); actionsRef.current.start(); }}>▶ Bắt đầu thư giãn</button>
            <div className="welcome-quick-actions">
              {!installed && <button type="button" className="secondary-button mobile-install-cta" onClick={installGame}>📲 Cài ứng dụng</button>}
              <button type="button" className="secondary-button mobile-fullscreen-cta" onClick={() => void enterImmersiveMode()}>⛶ Toàn màn hình</button>
              <button type="button" className="secondary-button mobile-help-cta" onClick={() => setShowHelpPanel(true)}>❔ Xem vật phẩm</button>
            </div>
            <span className="microcopy">GPP dọn màn · ☕ làm chậm · ❤️ cộng thời gian · 🌈 nhân đôi điểm</span>
          </div>}
          {hud.phase === "paused" && <div className="game-overlay compact-panel pause-panel-pro">
            <div className="breath">🌿</div><h2>Tạm dừng một chút</h2><p>Điểm và thời gian đã được giữ lại. Bạn có thể chỉnh nhanh ngay tại đây.</p>
            <div className="pause-actions-grid">
              <button className="primary-button" onClick={() => actionsRef.current.pause()}>▶ Tiếp tục</button>
              <button className="secondary-button" onClick={() => actionsRef.current.toggleMusic()}>{hud.music ? "🎵 Nhạc: Bật" : "🎼 Nhạc: Tắt"}</button>
              <button className="secondary-button" onClick={() => actionsRef.current.toggleSound()}>{hud.sound ? "🔊 Hiệu ứng: Bật" : "🔇 Hiệu ứng: Tắt"}</button>
              <button className="secondary-button" onClick={() => void enterImmersiveMode()}>⛶ Toàn màn hình</button>
              <button className="secondary-button" onClick={() => setShowHelpPanel(true)}>❔ Vật phẩm</button>
              <button className="secondary-button" onClick={() => actionsRef.current.goHome()}>⌂ Màn hình chính</button>
            </div>
          </div>}
          {hud.phase === "reveal" && <div className="panorama-reveal-overlay">
            <div className="panorama-unlocked">🏥 Toàn cảnh bệnh viện đã được mở khóa</div>
            <button onClick={() => actionsRef.current.skipReveal()}>Bỏ qua</button>
          </div>}
          {hud.phase === "finished" && <div className={`game-overlay result-panel tier-result-${hud.tier} ${isSuperComplete ? "ultimate-result" : ""}`} role="dialog" aria-modal="true" aria-label="Kết quả màn chơi">
            {isChapterComplete && <div className="celebration-burst" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>}
            <div className="result-scroll" tabIndex={0}>
              <div className="result-layout">
                <div className="result-hero">
                  <div className={`result-icon ${isSuperComplete ? "rainbow-result-logo" : ""}`}>{isSuperComplete ? <img src={`${ASSET_BASE}logo-icon.png`} alt="Logo GPP cầu vồng" /> : isChapterComplete ? "🏆" : result.icon}</div>
                  <p className="overlay-kicker">{isChapterComplete ? "Hoàn thành toàn cảnh bệnh viện" : `Hoàn thành màn ${hud.zone + 1}/${ZONES.length}`}</p>
                  <h2>{isSuperComplete ? "🏆 Hoàn thành toàn bộ hành trình!" : isChapterComplete ? "🎉 Nâng cấp thành công!" : result.title}</h2>
                  {hud.roundNewBest && <div className="new-record-badge" aria-label="Kỷ lục mới">🏆 KỶ LỤC MỚI!</div>}
                  {isChapterComplete && <div className="chapter-complete-title">Bạn đã hoàn thành <strong>{HOSPITAL_TIERS[hud.tier].name}</strong></div>}
                  {!isChapterComplete && <div className="result-score"><strong>{hud.score}</strong><span>điểm</span></div>}
                </div>
                <div className="result-details">
                  {isChapterComplete && <div className="achievement-stats">
                    <div><span>Điểm</span><strong>{hud.score}</strong></div><div><span>Kỷ lục</span><strong>{hud.best}</strong></div><div><span>Combo cao nhất</span><strong>{hud.roundBestCombo}</strong></div><div><span>Tiến độ</span><strong>{completedUpgradeCount}/4</strong></div>
                  </div>}
                  <div className={`medal-badge medal-${medal.name.includes("Vàng") ? "gold" : medal.name.includes("Bạc") ? "silver" : medal.name.includes("Đồng") ? "bronze" : "green"}`}><span>{medal.icon}</span><strong>{medal.name}</strong><small>{medal.copy}</small></div>
                  {isChapterComplete && <div className={`unlock-banner ${isSuperComplete ? "super" : ""}`}>
                    <span>{isSuperComplete ? "🌌" : nextTier.icon}</span>
                    <div><small>{isSuperComplete ? "BỆNH VIỆN GPP SIÊU CẤP" : "CẤP MỚI ĐÃ MỞ KHÓA"}</small><strong>{isSuperComplete ? "Bạn đã hoàn thành tất cả cấp độ!" : nextTier.name}</strong>{!isSuperComplete && <em>{TIER_INTROS[Math.min(hud.tier + 1, 4)]}</em>}</div>
                  </div>}
                  <p className="result-description">{isSuperComplete ? "Bạn đã xây dựng thành công Bệnh viện GPP Siêu cấp. Một hành trình thư giãn thật tuyệt vời!" : isChapterComplete ? "Bệnh viện đã được nâng cấp. Hãy tiếp tục khám phá 6 màn thử thách mới!" : result.copy}</p>
                </div>
              </div>
            </div>
            <div className="result-action-dock" aria-label="Hành động sau khi hoàn thành màn">
              {isChapterComplete && !isSuperComplete && <button className="secondary-button result-secondary-action" onClick={() => setShowTierPicker(true)}>🏥 Chọn cấp</button>}
              <button className={`primary-button result-primary-action ${isChapterComplete ? "challenge-button" : ""}`} onClick={() => { void enterImmersiveMode(); actionsRef.current.restart(); }}>{isSuperComplete ? "🔄 CHƠI LẠI HÀNH TRÌNH" : isChapterComplete ? `TIẾP TỤC CẤP ${hud.tier + 1} →` : `SANG MÀN ${hud.zone + 2} →`}</button>
            </div>
          </div>}
        </div>
        {showMenuShell && <div className="status-row" aria-live="polite"><span className="live-dot" /><strong>{hud.message}</strong><span>{HOSPITAL_TIERS[hud.tier].name} · {ZONES[hud.zone]}</span></div>}
        {showPlayToast && <div className="play-toast" aria-live="polite">{hud.message}</div>}

      </section>
      {inActivePlay && <div className="desktop-event-dock" aria-label="Bảng sự kiện trong lúc chơi">
          <div className="event-dock-brand"><strong>BÁC SĨ THƯ GIÃN · TRƯỜNG GPP</strong><span>EVENT DOCK</span></div>
          <div className={`event-dock-center ${eventDockMessage ? "has-event" : "is-idle"}`} aria-live="polite">
            {eventDockMessage ? <><span className="event-pulse-dot" /><strong>{eventDockMessage}</strong></> : <div className="ecg-idle" aria-label="Không có sự kiện"><span>ECG</span><i /><i /><i /><i /><i /><i /><i /></div>}
          </div>
          <div className="event-dock-metrics">
            <div className={`event-metric ${hud.combo >= 5 ? "active" : ""}`}><span>COMBO</span><strong>{hud.combo > 0 ? `×${hud.combo}` : "—"}</strong></div>
            <div className={`event-metric heart ${hud.bonusBank > 0 || hud.bonusPhase ? "active" : ""}`}><span>❤️ THỜI GIAN</span><strong>{hud.bonusPhase ? `${hud.time}s thưởng` : hud.bonusBank > 0 ? `+${hud.bonusBank}s` : "—"}</strong></div>
            <div className={`event-metric effects ${activeEffects.length ? "active" : ""}`}><span>HIỆU ỨNG</span><strong>{activeEffects.length ? activeEffects.join(" · ") : "Ổn định"}</strong></div>
          </div>
          <div className="event-dock-contact"><strong>Ngô Quang Trường</strong><span>0829076979 · Zalo truongphotoart</span></div>
        </div>}
      {showMenuShell && <section className="tips" aria-label="Vật phẩm nổi bật trong trò chơi">
        <article><span className="tip-icon logo-mark"><img src={`${ASSET_BASE}logo.png`} alt="Logo Trường GPP" /></span><div><strong>Logo GPP</strong><p>Dọn thuốc trên màn và tạo bonus lớn.</p></div></article>
        <article><span className="tip-icon">☕</span><div><strong>Cà phê thư giãn</strong><p>Làm chậm nhịp rơi để bạn dễ chạm hơn.</p></div></article>
        <article><span className="tip-icon pink">❤️</span><div><strong>Trái tim</strong><p>Tích thời gian thưởng cho giai đoạn bứt tốc.</p></div></article>
      </section>}
      {showMenuShell && <nav className="zone-list" aria-label="Các khu vực bệnh viện">{ZONES.map((name, index) => <span key={name} className={index === hud.zone ? "current" : ""}>{index + 1}. {name}</span>)}</nav>}
      {showMenuShell && <footer><span>Trường GPP</span><span>Chơi vui · Nghỉ ngắn · Không áp lực</span></footer>}
      <div className="rotate-phone-overlay" aria-hidden="true">
        <div className="rotate-phone-card"><span>📱↻</span><strong>Vui lòng xoay ngang điện thoại</strong><small>Game được tối ưu toàn màn hình ở chế độ ngang.</small></div>
      </div>
      {showTierPicker && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Chọn cấp bệnh viện">
        <div className="tier-picker-panel"><button className="modal-close" onClick={() => setShowTierPicker(false)} aria-label="Đóng">×</button><img src={`${ASSET_BASE}logo-icon.png`} alt="Biểu tượng GPP" /><h2>Chọn cấp đã mở</h2><p>Tiến độ được lưu tự động trên thiết bị này.</p><div className="tier-picker-grid">
          {HOSPITAL_TIERS.map((hospitalTier, index) => <button key={hospitalTier.name} disabled={index > hud.unlockedTier} onClick={() => { actionsRef.current.selectTier(index); setShowTierPicker(false); }}><span>{index > hud.unlockedTier ? "🔒" : hospitalTier.icon}</span><strong>{hospitalTier.name}</strong></button>)}
        </div></div>
      </div>}
      {showHelpPanel && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Vật phẩm trong game">
        <div className="help-panel"><button className="modal-close" onClick={() => setShowHelpPanel(false)} aria-label="Đóng">×</button><h2>Vật phẩm & chướng ngại</h2><p>Nhận diện nhanh để chạm đúng và đạt điểm tốt hơn.</p><div className="help-grid">
          <article><span>💊</span><div><strong>Thuốc điểm</strong><p>Mint → Aqua → Lavender → Coral → Gold. Càng vàng càng nhiều điểm.</p></div></article>
          <article><span><img src={`${ASSET_BASE}logo.png`} alt="Logo GPP" /></span><div><strong>Logo GPP</strong><p>Vật phẩm hiếm: dọn thuốc trên màn và thưởng điểm lớn.</p></div></article>
          <article><span>🌈</span><div><strong>Logo GPP cầu vồng</strong><p>Nhân đôi điểm trong 5 giây.</p></div></article>
          <article><span>☕</span><div><strong>Cà phê</strong><p>Làm chậm mọi vật đang rơi trong 5 giây.</p></div></article>
          <article><span>❤️</span><div><strong>Trái tim</strong><p>Tích thêm thời gian thưởng. Tim Sao Băng cho thưởng cao hơn.</p></div></article>
          <article><span>🚑</span><div><strong>Xe cấp cứu</strong><p>Đóng băng thuốc trong 3 giây.</p></div></article>
          <article><span>🧲</span><div><strong>Nam châm y tế</strong><p>Hút thuốc về giữa màn trong 5 giây.</p></div></article>
          <article><span>🚀</span><div><strong>Phi thuyền</strong><p>Quét sạch thuốc thường trên màn.</p></div></article>
          <article className="danger"><span>☠️</span><div><strong>Thuốc đầu lâu</strong><p>Chạm vào sẽ bị trừ 5 điểm.</p></div></article>
          <article className="danger"><span>🦠</span><div><strong>Virus</strong><p>Trừ 3 giây thời gian còn lại.</p></div></article>
          <article className="danger"><span>☄️</span><div><strong>Thiên thạch</strong><p>Làm mất chuỗi combo hiện tại.</p></div></article>
          <article className="danger"><span>🕳️</span><div><strong>Hố đen</strong><p>Chạm 3 lần để đóng, sau đó nhận thưởng nhỏ.</p></div></article>
        </div><button className="primary-button" onClick={() => setShowHelpPanel(false)}>Đã hiểu</button></div>
      </div>}
      {showInstallHelp && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cài game">
        <div className="install-panel"><button className="modal-close" onClick={() => setShowInstallHelp(false)} aria-label="Đóng">×</button><img src={`${ASSET_BASE}logo-icon.png`} alt="Biểu tượng GPP" /><h2>Tạo lối tắt game</h2><p><strong>iPhone/iPad:</strong> bấm Chia sẻ rồi chọn “Thêm vào màn hình chính”.</p><p><strong>PC/Android:</strong> mở menu trình duyệt và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.</p><button className="primary-button" onClick={() => setShowInstallHelp(false)}>Đã hiểu</button></div>
      </div>}
    </main>
  );
}
