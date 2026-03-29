/**
 * Video Watermarking Utility
 * Adds user identification watermark to video frames
 * Creates accountability and deters unauthorized sharing
 */

export type WatermarkPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center-left"
  | "center-right";

export interface WatermarkConfig {
  userId: string;
  username?: string;
  opacity?: number;
  fontSize?: number;
  position?: WatermarkPosition;
  positions?: WatermarkPosition[];
  movementIntervalMs?: number;
  sessionLabel?: string;
}

const getWatermarkText = (config: WatermarkConfig) => {
  // Show only the name, no timestamp
  return config.username || config.userId;
};

const resolveWatermarkPosition = ({
  width,
  height,
  textWidth,
  fontSize,
  padding,
  position,
}: {
  width: number;
  height: number;
  textWidth: number;
  fontSize: number;
  padding: number;
  position: WatermarkPosition;
}) => {
  const centerY = Math.max(padding, height / 2 - fontSize / 2);

  switch (position) {
    case "top-left":
      return { x: padding, y: padding };
    case "top-right":
      return { x: width - textWidth - padding, y: padding };
    case "bottom-left":
      return { x: padding, y: height - fontSize - padding };
    case "bottom-right":
      return { x: width - textWidth - padding, y: height - fontSize - padding };
    case "center-left":
      return { x: padding, y: centerY };
    case "center-right":
      return { x: width - textWidth - padding, y: centerY };
    default:
      return { x: width - textWidth - padding, y: height - fontSize - padding };
  }
};

/**
 * Creates a canvas overlay for watermarking
 * Returns a canvas element that can be overlaid on video
 */
export const createWatermarkCanvas = (
  width: number,
  height: number,
  config: WatermarkConfig,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Transparent background
  ctx.clearRect(0, 0, width, height);

  // Watermark text with timestamp
  const watermarkText = getWatermarkText(config);

  // Set text properties
  const fontSize = config.fontSize || 14;
  ctx.font = `${fontSize}px 'Courier New', monospace`;
  ctx.fillStyle = `rgba(255, 255, 255, ${config.opacity || 0.3})`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Calculate position
  const padding = 20;
  const metrics = ctx.measureText(watermarkText);
  const { x, y } = resolveWatermarkPosition({
    width,
    height,
    textWidth: metrics.width,
    fontSize,
    padding,
    position: config.position || "bottom-right",
  });

  // Draw semi-transparent background for text
  const bgPadding = 8;
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(
    x - bgPadding,
    y - bgPadding,
    metrics.width + bgPadding * 2,
    fontSize + bgPadding * 2,
  );

  // Draw watermark text
  ctx.fillStyle = `rgba(255, 255, 255, ${config.opacity || 0.3})`;
  ctx.fillText(watermarkText, x, y);

  return canvas;
};

/**
 * Adds watermark to HTML5 video element using canvas overlay
 * Runs continuously as video plays
 */
export const addWatermarkToVideo = (
  videoElement: HTMLVideoElement,
  containerElement: HTMLElement,
  config: WatermarkConfig,
): (() => void) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.warn("Could not get canvas context for watermark");
    return () => {};
  }

  // Set canvas size to match video
  const updateCanvasSize = () => {
    const rect = videoElement.getBoundingClientRect();
    canvas.width = rect.width || videoElement.videoWidth || 1280;
    canvas.height = rect.height || videoElement.videoHeight || 720;
  };

  // Position canvas absolutely over video
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "10";
  canvas.dataset.videoWatermark = "true";

  containerElement.style.position = "relative";
  containerElement.appendChild(canvas);

  updateCanvasSize();

  const watermarkPositions: WatermarkPosition[] =
    config.positions && config.positions.length > 0
      ? config.positions
      : [
          config.position || "bottom-right",
          "top-left",
          "center-right",
          "bottom-left",
        ];
  const movementIntervalMs = Math.max(config.movementIntervalMs || 4000, 1500);
  const animationStartTime = performance.now();

  // Draw watermark on every frame
  const drawWatermark = () => {
    if (videoElement.paused && videoElement.ended) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Watermark text
    const watermarkText = getWatermarkText(config);

    const fontSize = config.fontSize || 14;
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.fillStyle = `rgba(255, 255, 255, ${config.opacity || 0.3})`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Calculate position
    const padding = 20;
    const metrics = ctx.measureText(watermarkText);
    const elapsed = performance.now() - animationStartTime;
    const positionIndex =
      Math.floor(elapsed / movementIntervalMs) % watermarkPositions.length;
    const activePosition = watermarkPositions[positionIndex];
    const { x, y } = resolveWatermarkPosition({
      width: canvas.width,
      height: canvas.height,
      textWidth: metrics.width,
      fontSize,
      padding,
      position: activePosition,
    });

    // Semi-transparent background
    const bgPadding = 8;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(
      x - bgPadding,
      y - bgPadding,
      metrics.width + bgPadding * 2,
      fontSize + bgPadding * 2,
    );

    // Draw text
    ctx.fillStyle = `rgba(255, 255, 255, ${config.opacity || 0.3})`;
    ctx.fillText(watermarkText, x, y);

    requestAnimationFrame(drawWatermark);
  };

  // Handle resize
  const handleResize = () => {
    updateCanvasSize();
  };

  window.addEventListener("resize", handleResize);
  drawWatermark();

  // Cleanup function
  return () => {
    window.removeEventListener("resize", handleResize);
    if (containerElement.contains(canvas)) {
      containerElement.removeChild(canvas);
    }
  };
};

/**
 * Extracts watermark metadata from user context
 * @param showId - if true, shows ID in watermark; if false, shows only name
 */
export const getWatermarkConfig = (
  userId: string,
  username?: string,
  showId: boolean = false,
): WatermarkConfig => {
  const compactUserId = userId.length > 6 ? userId.slice(-6) : userId;
  const displayName = username || userId;

  return {
    userId,
    username: displayName,
    opacity: 0.28,
    fontSize: 14,
    position: "bottom-right",
    positions: [
      "bottom-right",
      "top-left",
      "center-right",
      "bottom-left",
      "top-right",
      "center-left",
    ],
    movementIntervalMs: 4500,
    sessionLabel: showId ? `ID:${compactUserId}` : displayName,
  };
};
