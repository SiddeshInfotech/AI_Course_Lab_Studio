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

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent copy to clipboard
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent cut to clipboard
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent paste from clipboard
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Block developer tools only for browser-level inspection
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only block developer tools access (F12, Ctrl+Shift+I, Ctrl+Shift+J)
      // NOT screenshot shortcuts (they don't reach the browser)
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+S (Save page)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("paste", handlePaste, true);

    // Block print dialog (application-level only)
    window.print = () => {
      console.warn("Printing is not allowed on this page");
      return false;
    };

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("paste", handlePaste, true);
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
};
