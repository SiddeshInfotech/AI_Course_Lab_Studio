import { useEffect, useRef, useCallback } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Real-time License Validation Hook
 * Continuously validates that the user's license is still valid during playback
 * Pauses video immediately if license expires or is revoked
 */

export interface LicenseStatus {
  id: string;
  valid: boolean;
  expired: boolean;
  expiresAt: string;
  revokedAt?: string;
  message?: string;
}

interface UseLicenseValidationProps {
  videoId: string;
  licenseId: string;
  onLicenseInvalid?: (reason: string) => void;
  checkInterval?: number; // ms between validation checks
}

export const useLicenseValidation = ({
  videoId,
  licenseId,
  onLicenseInvalid,
  checkInterval = 10000, // Check every 10 seconds
}: UseLicenseValidationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidationRef = useRef<number>(Date.now());

  const validateLicense = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/license/status/${licenseId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        console.error("License validation failed:", response.statusText);
        return;
      }

      const payload = await response.json();
      const license = payload?.data as
        | {
            status?: string;
            revokedAt?: string;
            expiresAt?: string;
          }
        | undefined;

      if (!license) {
        console.error("License validation returned no data");
        return;
      }

      const isExpired = license.status === "EXPIRED";
      const isRevoked = license.status === "REVOKED";
      const isValid = license.status === "VALID";

      // Check if license is still valid
      if (!isValid || isExpired || isRevoked) {
        console.warn("License invalid or expired", license);

        // Pause video
        if (videoRef.current) {
          videoRef.current.pause();
        }

        // Notify user
        const reason =
          isRevoked || license.revokedAt
            ? "Your license has been revoked"
            : "Your license has expired";

        onLicenseInvalid?.(reason);
        return;
      }

      // License is valid, update last validation time
      lastValidationRef.current = Date.now();
    } catch (error) {
      console.error("Error validating license:", error);
    }
  }, [licenseId, onLicenseInvalid]);

  // Set up periodic license validation
  useEffect(() => {
    // Initial validation
    validateLicense();

    // Set up interval for continuous validation
    checkIntervalRef.current = setInterval(() => {
      validateLicense();
    }, checkInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [validateLicense, checkInterval]);

  // Also validate on video play
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      // Validate immediately when play starts
      validateLicense();
    };

    video.addEventListener("play", handlePlay);

    return () => {
      video.removeEventListener("play", handlePlay);
    };
  }, [validateLicense]);

  return { videoRef };
};

/**
 * Higher-order hook for multiple licenses
 * Validates all licenses in a learning session
 */
export interface CourseAccessValidation {
  courseId: number;
  licensesValid: boolean;
  message?: string;
}

export const useCourseAccessValidation = (
  courseId: number,
  onAccessRevoked?: (reason: string) => void,
) => {
  const validationRef = useRef<boolean>(true);

  const validateCourseAccess = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/license/validate?courseId=${courseId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        console.error("Course access validation failed");
        return false;
      }

      const data: CourseAccessValidation = await response.json();
      validationRef.current = data.licensesValid;

      if (!data.licensesValid) {
        onAccessRevoked?.(data.message || "Course access has been revoked");
      }

      return data.licensesValid;
    } catch (error) {
      console.error("Error validating course access:", error);
      return false;
    }
  }, [courseId, onAccessRevoked]);

  // Validate on mount and periodically
  useEffect(() => {
    validateCourseAccess();

    const interval = setInterval(() => {
      validateCourseAccess();
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [validateCourseAccess]);

  return { isAccessValid: validationRef.current, validateCourseAccess };
};
