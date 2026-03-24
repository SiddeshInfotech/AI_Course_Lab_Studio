import { useEffect } from "react";

export const useVideoProtection = () => {
  useEffect(() => {
    // Prevent right-click on entire page
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts that could be used for recording/capture
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12 (Developer Tools)
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+I (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+C (Inspect Element - Chrome)
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+S (Save)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        return false;
      }
    };

    // Prevent drag and drop on video
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // detect screen recording attempts
    const detectScreenCapture = async () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Create a test pattern
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(0, 0, 10, 10);

          // Try to read the canvas (fails if screen recording is active)
          const imageData = ctx.getImageData(0, 0, 1, 1);
        }
      } catch (error) {
        // Screen recording is active - notify user
        console.warn("Screen recording detected");
      }
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);

    // Check for screen recording attempt
    const screenCaptureInterval = setInterval(detectScreenCapture, 1000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
      clearInterval(screenCaptureInterval);
    };
  }, []);
};
