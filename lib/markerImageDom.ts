import {
  getMarkerImageLayoutMode,
  isPlatformIconUrl,
} from "@/lib/getMemberDisplayImage";

export function applyMarkerImageLayout(
  root: HTMLElement,
  mode: "cover" | "contain",
  isPlatformIcon: boolean,
  blurFilter = "none"
): void {
  const shell = root.querySelector("[data-marker-shell]") as HTMLElement | null;
  const wrap = root.querySelector("[data-marker-image-wrap]") as HTMLElement | null;
  const img = root.querySelector("[data-marker-image]") as HTMLImageElement | null;
  if (!shell || !wrap || !img) return;

  const industryColor = shell.dataset.industryColor || "#ccc";
  shell.dataset.layoutMode = mode;
  img.style.filter = blurFilter;

  if (mode === "contain") {
    shell.style.backgroundColor = "#ffffff";
    wrap.style.position = "absolute";
    wrap.style.inset = "6% 6% 14% 6%";
    wrap.style.transform = "rotate(35deg)";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";
    wrap.style.backgroundColor = "#ffffff";

    img.style.display = "block";
    img.style.maxWidth = isPlatformIcon ? "92%" : "88%";
    img.style.maxHeight = isPlatformIcon ? "72%" : "82%";
    img.style.width = "auto";
    img.style.height = "auto";
    img.style.objectFit = "contain";
    img.style.objectPosition = "center";
    img.style.backgroundColor = "transparent";
  } else {
    shell.style.backgroundColor = industryColor;
    wrap.style.position = "absolute";
    wrap.style.top = "50%";
    wrap.style.left = "50%";
    wrap.style.inset = "";
    wrap.style.width = "128%";
    wrap.style.height = "125%";
    wrap.style.transform = "translate(-50%, -50%) rotate(35deg)";
    wrap.style.display = "block";
    wrap.style.backgroundColor = "transparent";

    img.style.display = "block";
    img.style.maxWidth = "";
    img.style.maxHeight = "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.objectPosition = "center";
    img.style.backgroundColor = "#ffffff";
  }
}

export function syncMarkerImageLayoutFromImage(
  root: HTMLElement,
  fields: Record<string, unknown>,
  blurFilter = "none"
): void {
  const img = root.querySelector("[data-marker-image]") as HTMLImageElement | null;
  if (!img?.naturalWidth) return;

  const mode = getMarkerImageLayoutMode(fields);
  applyMarkerImageLayout(root, mode, isPlatformIconUrl(img.src), blurFilter);
}
