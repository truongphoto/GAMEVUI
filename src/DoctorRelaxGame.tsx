"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "playing" | "paused" | "reveal" | "finished";
type Hud = { phase: Phase; score: number; dropBudget: number; time: number; bonusPhase: boolean; bonusBank: number; bonusTotal: number; combo: number; roundBestCombo: number; best: number; sound: boolean; music: boolean; zone: number; tier: number; unlockedTier: number; message: string };
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
const MOBILE_WIDTH = 620;
const MOBILE_HEIGHT = 820;
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
  const actionsRef = useRef({ start: () => {}, pause: () => {}, restart: () => {}, skipReveal: () => {}, selectTier: (_tier: number) => {}, toggleSound: () => {}, toggleMusic: () => {} });
  const [hud, setHud] = useState<Hud>({ phase: "idle", score: 0, dropBudget: SCENE_BALANCE[0].target, time: ROUND_SECONDS, bonusPhase: false, bonusBank: 0, bonusTotal: 0, combo: 0, roundBestCombo: 0, best: 0, sound: true, music: true, zone: 0, tier: 0, unlockedTier: 0, message: "Chạm Bắt đầu để thư giãn" });
  const [showTierPicker, setShowTierPicker] = useState(false);
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
    let message = "Chạm Bắt đầu để thư giãn";
    let messageUntil = 0;
    const mobileLayout = window.matchMedia("(max-width: 720px)").matches;
    const WIDTH = mobileLayout ? MOBILE_WIDTH : DESKTOP_WIDTH;
    const HEIGHT = mobileLayout ? MOBILE_HEIGHT : DESKTOP_HEIGHT;

    const mapImages = HOSPITAL_TIERS.map((hospitalTier) => {
      const image = new Image();
      image.src = hospitalTier.image;
      return image;
    });
    const logoImage = new Image();
    logoImage.src = `${ASSET_BASE}logo.png`;

    const syncHud = () => setHud({ phase, score: Math.round(score), dropBudget, time: Math.max(0, Math.ceil(timeLeft)), bonusPhase, bonusBank: Math.max(0, Math.ceil(bonusTimeBank)), bonusTotal: bonusTimeTotal, combo, roundBestCombo, best, sound, music, zone, tier, unlockedTier, message });
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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gameCanvas.width = WIDTH * dpr;
      gameCanvas.height = HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        color: kind === "badPill" ? "#171c22" : COLORS[Math.max(0, points - 1) % COLORS.length], shape: Math.random() < 0.48 ? 0 : 1, rotation: random(-0.5, 0.5), spin: random(-0.25, 0.25), hits: kind === "blackhole" ? 0 : undefined });
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
      if (score > best) { best = Math.round(score); localStorage.setItem("gpp-relax-best", String(best)); }
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
      phase = "playing"; score = 0; timeLeft = ROUND_SECONDS; baseTimeLeft = ROUND_SECONDS; bonusTimeBank = 0; bonusTimeTotal = 0; bonusPhase = false; roundElapsed = 0; combo = 0; roundBestCombo = 0; lastHitAt = 0; spawnClock = 0;
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
        const cleared = items.filter((entry) => entry.kind === "pill").length;
        score += 18 + cleared * 2;
        items.filter((entry) => entry.kind === "pill").forEach((entry) => burst(entry.x, entry.y, entry.color, 8));
        items = items.filter((entry) => entry.kind !== "pill" && entry.id !== item.id);
        burst(item.x, item.y, "#ffd84a", 46);
        rewardSound(650);
        setMessage(`Logo GPP! Dọn màn hình +${18 + cleared * 2}`, 1.5);
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
        doubleUntil = now + 5000; score += 25; burst(item.x, item.y, `hsl(${now / 8 % 360} 90% 60%)`, 70); victorySound();
        setMessage("Logo GPP cầu vồng: nhân đôi điểm 5 giây! 🌈", 2);
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
      if (phase !== "reveal") {
        const labelWidth = mobileLayout ? WIDTH - 32 : 390;
        roundedRect(mobileLayout ? 16 : 24, mobileLayout ? 15 : 22, labelWidth, mobileLayout ? 42 : 46, 22); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fill();
        ctx.fillStyle = "#075a78"; ctx.font = `700 ${mobileLayout ? 15 : 17}px Arial, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`${HOSPITAL_TIERS[tier].short} · Màn ${zone + 1}/${ZONES.length} · ${ZONES[zone]} · Rơi ${dropBudget} điểm`, mobileLayout ? 32 : 43, mobileLayout ? 36 : 45, labelWidth - 28);
      }
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
        if (item.kind === "pill") {
          ctx.fillStyle = "white"; ctx.font = `900 ${item.r * .66}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.shadowColor = "rgba(0,40,55,.45)"; ctx.shadowBlur = 3; ctx.fillText(String(item.points), 0, -item.r * .28);
        }
      } else {
        // Viên nang hai đầu: nửa trắng, nửa màu và đường ráp ở chính giữa.
        const width = item.r * 2.8;
        const height = item.r * 1.42;
        roundedRect(-width / 2, -height / 2, width, height, height / 2);
        ctx.save(); ctx.clip();
        const left = ctx.createLinearGradient(-width / 2, -height / 2, 0, height / 2);
        left.addColorStop(0, item.kind === "badPill" ? "#4a4f55" : "#ffffff"); left.addColorStop(1, item.kind === "badPill" ? "#101419" : "#dfeef0");
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
        if (item.kind === "pill") {
          ctx.fillStyle = "white"; ctx.font = `900 ${item.r * .68}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.shadowColor = "rgba(0,40,55,.5)"; ctx.shadowBlur = 3; ctx.fillText(String(item.points), width * .25, 1);
        }
      }
      if (item.kind === "badPill") {
        ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 8; ctx.fillStyle = "#fff"; ctx.font = `900 ${item.r * 1.05}px Arial, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("☠", 0, 1);
      }
      ctx.restore();
    }
    function drawSpecial(item: FallingItem) {
      ctx.save(); ctx.translate(item.x, item.y);
      const now = performance.now();
      const isLogo = item.kind === "logo" || item.kind === "rainbowLogo";
      ctx.shadowColor = item.kind === "rainbowLogo" ? `hsl(${now / 7 % 360} 95% 58%)` : item.kind === "logo" ? "rgba(255,204,30,.8)" : "rgba(0,82,106,.3)"; ctx.shadowBlur = item.kind === "rainbowLogo" ? 34 : 22;
      if (isLogo) {
        // Giữ nguyên toàn bộ logo người dùng gửi, không cắt chỉ còn chữ GPP.
        roundedRect(-item.r * .96, -item.r * .96, item.r * 1.92, item.r * 1.92, 17);
        ctx.fillStyle = "rgba(255,255,255,.96)"; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = item.kind === "rainbowLogo" ? `hsl(${now / 6 % 360} 95% 55%)` : "#f4c430"; ctx.lineWidth = item.kind === "rainbowLogo" ? 6 : 3; ctx.stroke();
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
    function drawFrame() {
      ctx.clearRect(0, 0, WIDTH, HEIGHT); drawBackground();
      ctx.save();
      if (performance.now() < shakeUntil) ctx.translate(random(-6, 6), random(-5, 5));
      items.forEach((item) => item.kind === "pill" || item.kind === "badPill" ? drawPill(item) : drawSpecial(item));
      ctx.restore();
      for (const particle of particles) {
        ctx.globalAlpha = clamp(particle.life * 2, 0, 1); ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color; ctx.fill();
      }
      ctx.globalAlpha = 1;
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
      spawnClock -= delta; specialClock -= delta;
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
        const nextPoints = baseTimeLeft > 10 && earlyPillPlan.length > 0 ? earlyPillPlan.shift()! : earlyPillPlan.length > 0 ? earlyPillPlan.shift()! : latePillPlan.shift()!;
        spawn("pill", nextPoints);
        const remainingForWindow = baseTimeLeft > 10 ? earlyPillPlan.length : earlyPillPlan.length + latePillPlan.length;
        const secondsToWindowEnd = Math.max(.8, baseTimeLeft - (baseTimeLeft > 10 ? 10 : 2));
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
    resizeCanvas(); gameCanvas.addEventListener("pointerdown", onPointer); document.addEventListener("visibilitychange", onVisibilityChange);
    syncHud(); animationFrame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animationFrame); if (revealTimer !== null) window.clearTimeout(revealTimer); stopMusic(); gameCanvas.removeEventListener("pointerdown", onPointer); document.removeEventListener("visibilitychange", onVisibilityChange); audioContext?.close(); };
  }, []);

  const result = getResult(hud.score);
  const sceneBalance = SCENE_BALANCE[hud.zone];
  const medal = getMedal(hud.score, sceneBalance.target);
  const progress = clamp((hud.time / (hud.bonusPhase ? Math.max(1, hud.bonusTotal) : ROUND_SECONDS)) * 100, 0, 100);
  const isChapterComplete = hud.zone === ZONES.length - 1;
  const isSuperComplete = isChapterComplete && hud.tier === HOSPITAL_TIERS.length - 1;
  const nextTier = HOSPITAL_TIERS[Math.min(hud.tier + 1, HOSPITAL_TIERS.length - 1)];
  const completedUpgradeCount = Math.min(4, hud.tier);
  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo-wrap"><img src={`${ASSET_BASE}logo.png`} alt="Logo Trường GPP" className="brand-logo" /></div>
          <div><p className="eyebrow">TRƯỜNG GPP · PHÚT GIẢI LAO</p><h1>Bác Sĩ Thư Giãn</h1><p className="tagline">6 màn mỗi chặng · Nâng cấp đến Bệnh viện Siêu cấp</p></div>
        </div>
        <div className="top-actions">
          {!installed && <button className="icon-button install-button" onClick={installGame}>📲 Cài game</button>}
          {updateRegistration && <button className="icon-button update-button" onClick={updateGame}>⬆ Cập nhật</button>}
          <button className="icon-button" onClick={() => actionsRef.current.toggleMusic()} aria-label={hud.music ? "Tắt nhạc nền" : "Bật nhạc nền"}>{hud.music ? "🎵 Nhạc nền" : "🎼 Bật nhạc"}</button>
          <button className="icon-button" onClick={() => actionsRef.current.toggleSound()} aria-label={hud.sound ? "Tắt hiệu ứng" : "Bật hiệu ứng"}>{hud.sound ? "🔊 Hiệu ứng" : "🔇 Bật tiếng"}</button>
          <button className="icon-button" onClick={() => actionsRef.current.pause()} disabled={hud.phase === "idle" || hud.phase === "reveal" || hud.phase === "finished"}>{hud.phase === "paused" ? "▶ Tiếp tục" : "Ⅱ Tạm dừng"}</button>
        </div>
      </header>
      <section className={`game-card ${hud.phase === "reveal" ? "cinematic-reveal" : ""}`} aria-label="Trò chơi Bác Sĩ Thư Giãn">
        <div className="upgrade-roadmap" aria-label="Lộ trình nâng cấp bệnh viện">
          {HOSPITAL_TIERS.map((hospitalTier, index) => {
            const locked = index > hud.unlockedTier;
            const selectable = !locked && (hud.phase === "idle" || hud.phase === "finished");
            return <button type="button" key={hospitalTier.name} disabled={!selectable} onClick={() => actionsRef.current.selectTier(index)} className={`upgrade-step ${index === hud.tier ? "current" : ""} ${index <= hud.unlockedTier && index !== hud.tier ? "complete" : ""} ${locked ? "locked" : ""}`}>
              <span>{locked ? "🔒" : index <= hud.unlockedTier && index !== hud.tier ? "✓" : hospitalTier.icon}</span><div><small>{index === 0 ? "Khởi đầu" : `Cấp ${index}`}</small><strong>{hospitalTier.short}</strong></div>
            </button>;
          })}
        </div>
        <div className="hud">
          <div className="hud-item tier"><span>Cấp bệnh viện</span><strong>{hud.tier === 0 ? "Gốc" : `${hud.tier}/4`}</strong></div>
          <div className="hud-item level"><span>Màn</span><strong>{hud.zone + 1}/{ZONES.length}</strong></div>
          <div className="hud-item score-target"><span>Điểm · Rơi đủ {hud.dropBudget}</span><strong>{hud.score}</strong></div>
          <div className={`hud-item timer ${hud.bonusPhase ? "bonus" : ""}`}><span>{hud.bonusPhase ? "❤️ Thời gian thưởng" : hud.bonusBank > 0 ? `Thời gian · +${hud.bonusBank}s` : "Thời gian"}</span><strong>{hud.time}s</strong></div>
          <div className={`hud-item combo ${hud.combo >= 5 ? "active" : ""}`}><span>Chuỗi</span><strong>{hud.combo}</strong></div>
          <div className="hud-item best"><span>Kỷ lục</span><strong>{hud.best}</strong></div>
        </div>
        <div className={`time-track ${hud.bonusPhase ? "bonus" : ""}`} aria-label={`Còn ${hud.time} giây`}><span style={{ width: `${progress}%` }} /></div>
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
          {hud.phase === "reveal" && <div className="panorama-reveal-overlay">
            <div className="panorama-unlocked">🏥 Toàn cảnh bệnh viện đã được mở khóa</div>
            <button onClick={() => actionsRef.current.skipReveal()}>Bỏ qua</button>
          </div>}
          {hud.phase === "finished" && <div className={`game-overlay result-panel tier-result-${hud.tier} ${isSuperComplete ? "ultimate-result" : ""}`}>
            {isChapterComplete && <div className="celebration-burst" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>}
            <div className={`result-icon ${isSuperComplete ? "rainbow-result-logo" : ""}`}>{isSuperComplete ? <img src={`${ASSET_BASE}logo-icon.png`} alt="Logo GPP cầu vồng" /> : isChapterComplete ? "🏆" : result.icon}</div>
            <p className="overlay-kicker">{isChapterComplete ? "Hoàn thành toàn cảnh bệnh viện" : `Hoàn thành màn ${hud.zone + 1}/${ZONES.length}`}</p>
            <h2>{isSuperComplete ? "🏆 Hoàn thành toàn bộ hành trình!" : isChapterComplete ? "🎉 Nâng cấp thành công!" : result.title}</h2>
            {isChapterComplete && <div className="chapter-complete-title">Bạn đã hoàn thành <strong>{HOSPITAL_TIERS[hud.tier].name}</strong></div>}
            {isChapterComplete ? <div className="achievement-stats">
              <div><span>Điểm</span><strong>{hud.score}</strong></div><div><span>Kỷ lục</span><strong>{hud.best}</strong></div><div><span>Combo cao nhất</span><strong>{hud.roundBestCombo}</strong></div><div><span>Tiến độ</span><strong>{completedUpgradeCount}/4</strong></div>
            </div> : <div className="result-score"><strong>{hud.score}</strong><span>điểm</span></div>}
            <div className={`medal-badge medal-${medal.name.includes("Vàng") ? "gold" : medal.name.includes("Bạc") ? "silver" : medal.name.includes("Đồng") ? "bronze" : "green"}`}><span>{medal.icon}</span><strong>{medal.name}</strong><small>{medal.copy}</small></div>
            {isChapterComplete && <div className={`unlock-banner ${isSuperComplete ? "super" : ""}`}>
              <span>{isSuperComplete ? "🌌" : nextTier.icon}</span>
              <div><small>{isSuperComplete ? "BỆNH VIỆN GPP SIÊU CẤP" : "CẤP MỚI ĐÃ MỞ KHÓA"}</small><strong>{isSuperComplete ? "Bạn đã hoàn thành tất cả cấp độ!" : nextTier.name}</strong>{!isSuperComplete && <em>{TIER_INTROS[Math.min(hud.tier + 1, 4)]}</em>}</div>
            </div>}
            <p>{isSuperComplete ? "Bạn đã xây dựng thành công Bệnh viện GPP Siêu cấp. Một hành trình thư giãn thật tuyệt vời!" : isChapterComplete ? "Bệnh viện đã được nâng cấp. Hãy tiếp tục khám phá 6 màn thử thách mới!" : result.copy}</p>
            <div className="result-actions">
              <button className={`primary-button ${isChapterComplete ? "challenge-button" : ""}`} onClick={() => actionsRef.current.restart()}>{isSuperComplete ? "🔄 Chơi lại hành trình" : isChapterComplete ? `Tiếp tục thử thách Cấp ${hud.tier + 1} →` : `Sang màn ${hud.zone + 2}`}</button>
              {isChapterComplete && !isSuperComplete && <button className="secondary-button" onClick={() => setShowTierPicker(true)}>🏥 Chọn cấp đã mở</button>}
            </div>
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
      {showTierPicker && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Chọn cấp bệnh viện">
        <div className="tier-picker-panel"><button className="modal-close" onClick={() => setShowTierPicker(false)} aria-label="Đóng">×</button><img src={`${ASSET_BASE}logo-icon.png`} alt="Biểu tượng GPP" /><h2>Chọn cấp đã mở</h2><p>Tiến độ được lưu tự động trên thiết bị này.</p><div className="tier-picker-grid">
          {HOSPITAL_TIERS.map((hospitalTier, index) => <button key={hospitalTier.name} disabled={index > hud.unlockedTier} onClick={() => { actionsRef.current.selectTier(index); setShowTierPicker(false); }}><span>{index > hud.unlockedTier ? "🔒" : hospitalTier.icon}</span><strong>{hospitalTier.name}</strong></button>)}
        </div></div>
      </div>}
      {showInstallHelp && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cài game">
        <div className="install-panel"><button className="modal-close" onClick={() => setShowInstallHelp(false)} aria-label="Đóng">×</button><img src={`${ASSET_BASE}logo-icon.png`} alt="Biểu tượng GPP" /><h2>Tạo lối tắt game</h2><p><strong>iPhone/iPad:</strong> bấm Chia sẻ rồi chọn “Thêm vào màn hình chính”.</p><p><strong>PC/Android:</strong> mở menu trình duyệt và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.</p><button className="primary-button" onClick={() => setShowInstallHelp(false)}>Đã hiểu</button></div>
      </div>}
    </main>
  );
}
