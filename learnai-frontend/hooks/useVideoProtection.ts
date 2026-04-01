import { useEffect } from "react";

/**
 * Real Video Content Protection Hook
 *
 * ⚠️ IMPORTANT: This hook provides application-level protections only.
 * It CANNOT prevent operating system-level screen recording tools
 * (OBS, ScreenFlow, NVIDIA ShadowPlay, GPU-level capture, etc).
 *
 * What THIS DOES protect:
 * - In-app copy/paste operations
 * - Right-click context menu access
 * - Drag-drop file export
 * - Basic browser-level attempts
 * - Video file caching/downloading
 *
 * What THIS DOES NOT protect:
 * - OS-level screenshot tools
 * - Third-party screen recording software
 * - GPU/display buffer capture
 * - Physical device recording
 * - Audio extraction
 *
 * For comprehensive protection, combine with:
 * - Watermarking video frames with user identification
 * - Real-time license validation
 * - Device fingerprinting & binding
 * - Access logging & anomaly detection
 * - Legal terms of service enforcement
 */
export const useVideoProtection = () => {
  useEffect(() => {
    // CSS protections: Prevent text selection and drag operations
    const style = document.createElement("style");
    style.innerHTML = `
      * {
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-app-region: no-drag;
      }

      input, textarea, select, button, a {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }

      video {
        -webkit-user-select: none;
        -moz-user-select: none;
        user-select: none;
      }

      canvas[data-video-watermark="true"],
      #screenshotCanvas {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isBlockedKey =
        e.key === "F12" ||
        e.key === "PrintScreen" ||
        key === "f12" ||
        ((e.ctrlKey || e.metaKey) && key === "s") ||
        ((e.ctrlKey || e.metaKey) && key === "p") ||
        ((e.ctrlKey || e.metaKey) && key === "c") ||
        ((e.ctrlKey || e.metaKey) && key === "u") ||
        ((e.ctrlKey || e.metaKey) && key === "a") ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (key === "i" || key === "c" || key === "j" || key === "s"));

      if (isBlockedKey) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Best-effort clipboard clear when print-screen is pressed
      if (e.key === "PrintScreen" && navigator.clipboard?.writeText) {
        hideSensitiveContent();
        window.setTimeout(showSensitiveContent, 500);
        navigator.clipboard.writeText("").catch(() => {
          // Ignore clipboard failures on unsupported/blocked contexts
        });
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const hideSensitiveContent = () => {
      document.body.classList.add("video-protection-hidden");
    };

    const showSensitiveContent = () => {
      document.body.classList.remove("video-protection-hidden");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideSensitiveContent();
      } else {
        showSensitiveContent();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("cut", handleCopy, true);
    document.addEventListener("paste", handleCopy, true);
    document.addEventListener("visibilitychange", handleVisibilityChange, true);
    window.addEventListener("blur", hideSensitiveContent);
    window.addEventListener("focus", showSensitiveContent);

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    // Block print dialog (application-level only)
    window.print = () => {
      console.warn("Printing is not allowed on this page");
      return false;
    };

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("cut", handleCopy, true);
      document.removeEventListener("paste", handleCopy, true);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
        true,
      );
      window.removeEventListener("blur", hideSensitiveContent);
      window.removeEventListener("focus", showSensitiveContent);
      document.body.classList.remove("video-protection-hidden");
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
};
