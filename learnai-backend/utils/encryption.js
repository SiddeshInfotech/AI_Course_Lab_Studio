import crypto from "crypto";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { createReadStream, createWriteStream } from "fs";

/**
 * Backend Video Encryption Service
 * Handles encryption of uploaded videos
 */

export class BackendVideoEncryption {
  static ALGORITHM = "aes-256-gcm";
  static SALT_LENGTH = 16;
  static IV_LENGTH = 16;
  static AUTH_TAG_LENGTH = 16;

  /**
   * Master encryption key (stored securely on server)
   * In production, this should come from environment or secure vault
   */
  static getMasterKey() {
    const masterKeyEnv = process.env.VIDEO_MASTER_KEY;
    if (!masterKeyEnv) {
      throw new Error("VIDEO_MASTER_KEY not set in environment");
    }
    return Buffer.from(masterKeyEnv, "hex");
  }

  /**
   * Encrypt uploaded video file
   */
  static async encryptUploadedVideo(inputPath, outputPath, userId) {
    try {
      const masterKey = this.getMasterKey();
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Derive user-specific encryption key
      const userKey = crypto
        .createHmac("sha256", masterKey)
        .update(`${userId}:${salt.toString("hex")}`)
        .digest();

      const derivedKey = crypto.pbkdf2Sync(userKey, salt, 100000, 32, "sha256");

      const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);

      // Create output stream with header
      const outputStream = createWriteStream(outputPath);
      await outputStream.write(Buffer.concat([salt, iv]));

      // Pipe input through cipher to output
      const inputStream = createReadStream(inputPath);
      await pipeline(inputStream, cipher, outputStream);

      // Append auth tag
      return new Promise((resolve) => {
        outputStream.on("finish", () => {
          const authTag = cipher.getAuthTag();
          const fd = fs.openSync(outputPath, "a");
          fs.writeSync(fd, authTag);
          fs.closeSync(fd);

          // Generate encryption metadata
          const metadata = {
            algorithm: this.ALGORITHM,
            userId,
            encryptedAt: new Date(),
            saltLength: this.SALT_LENGTH,
            ivLength: this.IV_LENGTH,
            authTagLength: this.AUTH_TAG_LENGTH,
          };

          resolve({
            success: true,
            encryptionKey: salt.toString("hex"), // Salt for device binding
            metadata,
          });
        });

        outputStream.on("error", (error) => {
          resolve({ success: false, error: error.message });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create decryption endpoint payload
   * This data is sent to client to decrypt video
   */
  static createDecryptionPayload(encryptedVideoPath, userId, deviceId) {
    try {
      // Read salt and IV from encrypted file
      const headerBuffer = Buffer.alloc(this.SALT_LENGTH + this.IV_LENGTH);
      const fd = fs.openSync(encryptedVideoPath, "r");
      fs.readSync(fd, headerBuffer);
      fs.closeSync(fd);

      const salt = headerBuffer.slice(0, this.SALT_LENGTH);

      return {
        videoPath: encryptedVideoPath,
        saltHex: salt.toString("hex"),
        metadata: {
          userId,
          deviceId,
          encryptedAt: new Date(),
          algorithm: this.ALGORITHM,
        },
      };
    } catch (error) {
      throw new Error(`Failed to create decryption payload: ${error.message}`);
    }
  }

  /**
   * Generate a device-specific decryption key
   * (Called on server with valid license)
   */
  static generateDeviceDecryptionKey(userId, deviceId, saltHex) {
    const masterKey = this.getMasterKey();
    const salt = Buffer.from(saltHex, "hex");

    // Derive the same key used for encryption
    const userKey = crypto
      .createHmac("sha256", masterKey)
      .update(`${userId}:${saltHex}`)
      .digest();

    const derivedKey = crypto.pbkdf2Sync(userKey, salt, 100000, 32, "hex");

    // Add device binding
    const deviceBoundKey = crypto
      .createHmac("sha256", derivedKey)
      .update(deviceId)
      .digest("hex");

    return deviceBoundKey;
  }

  /**
   * Verify video file integrity
   */
  static verifyVideoIntegrity(encryptedPath) {
    try {
      if (!fs.existsSync(encryptedPath)) {
        return { valid: false, error: "File not found" };
      }

      const stat = fs.statSync(encryptedPath);
      const minSize = this.SALT_LENGTH + this.IV_LENGTH + this.AUTH_TAG_LENGTH;

      if (stat.size < minSize) {
        return { valid: false, error: "File too small" };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

/**
 * Backend License Management
 */
export class BackendLicenseManager {
  static getMasterSecret() {
    const secret = process.env.LICENSE_MASTER_SECRET;
    if (!secret) {
      throw new Error("LICENSE_MASTER_SECRET not set");
    }
    return secret;
  }

  /**
   * Create a device-bound license
   */
  static createLicense(userId, deviceId, durationDays = 365) {
    const masterSecret = this.getMasterSecret();
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    const licenseData = {
      userId,
      deviceId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Create signature
    const signature = crypto
      .createHmac("sha256", masterSecret)
      .update(JSON.stringify(licenseData))
      .digest("hex");

    const license = {
      ...licenseData,
      signature,
    };

    const encodedLicense = Buffer.from(JSON.stringify(license)).toString(
      "base64url",
    );

    return {
      license: encodedLicense,
      expiresAt,
    };
  }

  /**
   * Verify and validate license
   */
  static verifyLicense(licenseString, deviceId) {
    try {
      const masterSecret = this.getMasterSecret();

      const licenseData = JSON.parse(
        Buffer.from(licenseString, "base64url").toString("utf-8"),
      );

      // Validate device match
      if (licenseData.deviceId !== deviceId) {
        return { valid: false, error: "Device ID mismatch" };
      }

      // Validate expiration
      const expiresAt = new Date(licenseData.expiresAt);
      if (expiresAt < new Date()) {
        return { valid: false, error: "License expired" };
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", masterSecret)
        .update(
          JSON.stringify({
            userId: licenseData.userId,
            deviceId: licenseData.deviceId,
            issuedAt: licenseData.issuedAt,
            expiresAt: licenseData.expiresAt,
          }),
        )
        .digest("hex");

      if (licenseData.signature !== expectedSignature) {
        return { valid: false, error: "Invalid signature" };
      }

      return { valid: true, userId: licenseData.userId };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Revoke a license
   */
  static revokeLicense(licenseString) {
    try {
      // In production, store revoked licenses in database
      // For now, just validate the license format
      const licenseData = JSON.parse(
        Buffer.from(licenseString, "base64url").toString("utf-8"),
      );

      // TODO: Store revoked license in database
      console.log(`License revoked for user ${licenseData.userId}`);

      return { revoked: true };
    } catch (error) {
      return { revoked: false, error: error.message };
    }
  }
}
