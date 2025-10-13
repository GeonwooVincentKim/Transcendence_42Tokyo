/**
 * Two-Factor Authentication Service
 * 
 * Handles TOTP-based 2FA setup, verification, and backup codes
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { DatabaseService } from './databaseService';
import crypto from 'crypto';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class TwoFactorService {
  /**
   * Generate 2FA secret and QR code for user
   */
  static async setupTwoFactor(userId: string, username: string): Promise<TwoFactorSetup> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Pong Game (${username})`,
      length: 32
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store in database (disabled by default)
    const existing = await DatabaseService.query(
      'SELECT id FROM user_2fa WHERE user_id = $1',
      [userId]
    );

    if (existing.length > 0) {
      // Update existing
      await DatabaseService.run(
        'UPDATE user_2fa SET secret = $1, backup_codes = $2, enabled = 0 WHERE user_id = $3',
        [secret.base32, JSON.stringify(backupCodes), userId]
      );
    } else {
      // Create new
      await DatabaseService.run(
        'INSERT INTO user_2fa (user_id, secret, backup_codes, enabled) VALUES ($1, $2, $3, 0)',
        [userId, secret.base32, JSON.stringify(backupCodes)]
      );
    }

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Verify 2FA token and enable 2FA
   */
  static async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    const result = await DatabaseService.query(
      'SELECT secret FROM user_2fa WHERE user_id = $1',
      [userId]
    );

    if (result.length === 0) {
      throw new Error('2FA not set up for this user');
    }

    const { secret } = result[0];

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps for clock skew
    });

    if (!verified) {
      return false;
    }

    // Enable 2FA
    await DatabaseService.run(
      'UPDATE user_2fa SET enabled = 1, enabled_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    return true;
  }

  /**
   * Disable 2FA
   */
  static async disableTwoFactor(userId: string, token: string): Promise<boolean> {
    const result = await DatabaseService.query(
      'SELECT secret, enabled FROM user_2fa WHERE user_id = $1',
      [userId]
    );

    if (result.length === 0 || !result[0].enabled) {
      throw new Error('2FA is not enabled for this user');
    }

    const { secret } = result[0];

    // Verify token before disabling
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return false;
    }

    // Disable 2FA (keep secret for potential re-enable)
    await DatabaseService.run(
      'UPDATE user_2fa SET enabled = 0 WHERE user_id = $1',
      [userId]
    );

    return true;
  }

  /**
   * Verify 2FA token during login
   */
  static async verifyToken(userId: string, token: string): Promise<boolean> {
    const result = await DatabaseService.query(
      'SELECT secret, enabled, backup_codes FROM user_2fa WHERE user_id = $1',
      [userId]
    );

    if (result.length === 0 || !result[0].enabled) {
      throw new Error('2FA is not enabled for this user');
    }

    const { secret, backup_codes } = result[0];

    // Try TOTP verification
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (verified) {
      return true;
    }

    // Try backup codes
    if (backup_codes) {
      const codes: string[] = JSON.parse(backup_codes);
      const codeIndex = codes.indexOf(token);
      
      if (codeIndex !== -1) {
        // Remove used backup code
        codes.splice(codeIndex, 1);
        await DatabaseService.run(
          'UPDATE user_2fa SET backup_codes = $1 WHERE user_id = $2',
          [JSON.stringify(codes), userId]
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has 2FA enabled
   */
  static async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const result = await DatabaseService.query(
      'SELECT enabled FROM user_2fa WHERE user_id = $1',
      [userId]
    );

    return result.length > 0 && result[0].enabled === 1;
  }

  /**
   * Get backup codes for user
   */
  static async getBackupCodes(userId: string): Promise<string[]> {
    const result = await DatabaseService.query(
      'SELECT backup_codes FROM user_2fa WHERE user_id = $1',
      [userId]
    );

    if (result.length === 0) {
      return [];
    }

    const codes = result[0].backup_codes;
    return codes ? JSON.parse(codes) : [];
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    const result = await DatabaseService.query(
      'SELECT secret, enabled FROM user_2fa WHERE user_id = $1',
      [userId]
    );

    if (result.length === 0 || !result[0].enabled) {
      throw new Error('2FA is not enabled for this user');
    }

    const { secret } = result[0];

    // Verify token before regenerating
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      throw new Error('Invalid 2FA token');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();

    await DatabaseService.run(
      'UPDATE user_2fa SET backup_codes = $1 WHERE user_id = $2',
      [JSON.stringify(backupCodes), userId]
    );

    return backupCodes;
  }

  /**
   * Generate random backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}

