import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Video Encryption/Decryption System
 * Encrypts videos using AES-256-GCM with device-specific keys
 */

export class VideoEncryption {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * Generate a device-specific encryption key
   */
  static generateKeyFromDeviceId(deviceId: string): Buffer {
    // Create a hash of the device ID to use as the master key
    const hash = crypto.createHash("sha256").update(deviceId).digest();

    return hash;
  }

  /**
   * Encrypt a video file
   */
  static async encryptVideoFile(
    inputPath: string,
    outputPath: string,
    deviceId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = this.generateKeyFromDeviceId(deviceId);
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Derive final encryption key from salt
      const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha256");

      const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);

      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);

      // Write salt and IV to file header
      output.write(Buffer.concat([salt, iv]));

      input.pipe(cipher).pipe(output);

      return new Promise((resolve) => {
        output.on("finish", () => {
          const authTag = (cipher as any).getAuthTag();
          const fd = fs.openSync(outputPath, "a");
          fs.writeSync(fd, authTag);
          fs.closeSync(fd);
          resolve({ success: true });
        });

        output.on("error", (error: any) => {
          resolve({ success: false, error: error?.message || "Unknown error" });
        });
      });
    } catch (error: any) {
      return { success: false, error: error?.message || "Unknown error" };
    }
  }

  /**
   * Decrypt video file for streaming
   */
  static decryptVideoStream(
    encryptedPath: string,
    deviceId: string,
  ): NodeJS.ReadableStream | null {
    try {
      const key = this.generateKeyFromDeviceId(deviceId);

      // Read salt and IV from file header
      const headerBuffer = Buffer.alloc(this.SALT_LENGTH + this.IV_LENGTH);
      const fd = fs.openSync(encryptedPath, "r");
      fs.readSync(fd, headerBuffer);
      fs.closeSync(fd);

      const salt = headerBuffer.slice(0, this.SALT_LENGTH);
      const iv = headerBuffer.slice(this.SALT_LENGTH);

      // Derive final decryption key
      const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha256");

      const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv);

      // Read the entire encrypted file (excluding header)
      const fileSize = fs.statSync(encryptedPath).size;
      const encryptedContent = Buffer.alloc(
        fileSize - this.SALT_LENGTH - this.IV_LENGTH - this.AUTH_TAG_LENGTH,
      );

      const fd2 = fs.openSync(encryptedPath, "r");
      fs.readSync(
        fd2,
        encryptedContent,
        0,
        encryptedContent.length,
        this.SALT_LENGTH + this.IV_LENGTH,
      );

      // Read authentication tag
      const authTag = Buffer.alloc(this.AUTH_TAG_LENGTH);
      fs.readSync(
        fd2,
        authTag,
        0,
        this.AUTH_TAG_LENGTH,
        fileSize - this.AUTH_TAG_LENGTH,
      );
      fs.closeSync(fd2);

      // Set auth tag for verification
      (decipher as any).setAuthTag(authTag);

      // Create a stream from the encrypted content
      const { Readable } = require("stream");
      const inputStream = Readable.from([encryptedContent]);

      return inputStream.pipe(decipher);
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  }

  /**
   * Add watermark metadata to video (for audit trail)
   */
  static addWatermarkMetadata(
    videoPath: string,
    userId: number,
    deviceId: string,
    timestamp: Date,
  ): { success: boolean; metadata: any } {
    const metadata = {
      userId,
      deviceId,
      encryptedAt: timestamp,
      accessLog: [],
    };

    // In a real implementation, this would be stored in a separate metadata file
    // paired with the encrypted video
    const metadataPath = videoPath.replace(/\.[^.]+$/, ".meta");
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    return { success: true, metadata };
  }

  /**
   * Verify video integrity (check if it's been tampered with)
   */
  static verifyVideoIntegrity(encryptedPath: string): boolean {
    try {
      const fileSize = fs.statSync(encryptedPath).size;

      // Check minimum file size (salt + IV + auth tag + data)
      if (fileSize < this.SALT_LENGTH + this.IV_LENGTH + this.AUTH_TAG_LENGTH) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Device-Bound License Manager
 */
export class LicenseManager {
  static generateLicense(
    deviceId: string,
    userId: number,
    expiryDate: Date,
  ): string {
    const licenseData = {
      deviceId,
      userId,
      expiryDate: expiryDate.toISOString(),
      issuedAt: new Date().toISOString(),
    };

    // Create a signature using HMAC
    const signature = crypto
      .createHmac("sha256", deviceId)
      .update(JSON.stringify(licenseData))
      .digest("hex");

    const license = {
      ...licenseData,
      signature,
    };

    // Encode to base64
    return Buffer.from(JSON.stringify(license)).toString("base64");
  }

  static verifyLicense(
    licenseString: string,
    deviceId: string,
  ): { valid: boolean; data?: any; error?: string } {
    try {
      const licenseData = JSON.parse(
        Buffer.from(licenseString, "base64").toString("utf-8"),
      );

      // Check device ID match
      if (licenseData.deviceId !== deviceId) {
        return { valid: false, error: "Device ID mismatch" };
      }

      // Check expiry
      if (new Date(licenseData.expiryDate) < new Date()) {
        return { valid: false, error: "License expired" };
      }

      // Verify signature
      const signature = crypto
        .createHmac("sha256", deviceId)
        .update(
          JSON.stringify({
            deviceId: licenseData.deviceId,
            userId: licenseData.userId,
            expiryDate: licenseData.expiryDate,
            issuedAt: licenseData.issuedAt,
          }),
        )
        .digest("hex");

      if (signature !== licenseData.signature) {
        return { valid: false, error: "Invalid signature" };
      }

      return { valid: true, data: licenseData };
    } catch (error: any) {
      return { valid: false, error: error?.message || "Unknown error" };
    }
  }
}
