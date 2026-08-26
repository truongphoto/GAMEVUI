export type MobileOrientation = "portrait" | "landscape";

export function currentMobileOrientation(): MobileOrientation {
  return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
}

export function isPhoneLike(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || Math.min(window.innerWidth, window.innerHeight) <= 520;
}

export async function applyMobileOrientation(target: MobileOrientation): Promise<boolean> {
  if (!isPhoneLike()) return false;

  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {}

  try {
    const orientationApi = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    if (typeof orientationApi?.lock === "function") {
      await orientationApi.lock(target === "portrait" ? "portrait-primary" : "landscape-primary");
      return true;
    }
  } catch {}

  return false;
}
