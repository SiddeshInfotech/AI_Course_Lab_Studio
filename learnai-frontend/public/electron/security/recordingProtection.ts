import { exec } from 'child_process';
import { setInterval, clearInterval } from 'timers';

const KNOWN_RECORDING_SOFTWARE = {
  darwin: [
    'QuickTime Player',
    'ScreenFlow',
    'Camtasia',
    'OBS',
    'ShadowPlay',
    'Fraps'
  ],
  win32: [
    'obs64', 'obs32',        // OBS
    'GameBarPresenceWriter',  // Windows Game Bar
    'xboxgips',              // Xbox overlay
    'fraps',
    'camtasia',
    'screencapture',
    'ShareX',
    'Lightshot'
  ]
};

class RecordingProtection {
  private checkInterval: NodeJS.Timeout | null = null;
  private onDetectedCallback: (() => void) | null = null;
  private isEnabled: boolean = false;

  enable(callback?: () => void) {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.onDetectedCallback = callback || this.defaultAction;

    // Check every 2 seconds
    this.checkInterval = setInterval(() => {
      this.checkForRecordingSoftware();
    }, 2000);

    console.log('[Security] Recording protection enabled');
  }

  disable() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isEnabled = false;
    console.log('[Security] Recording protection disabled');
  }

  private checkForRecordingSoftware() {
    const platform = process.platform as keyof typeof KNOWN_RECORDING_SOFTWARE;
    const softwareList = KNOWN_RECORDING_SOFTWARE[platform];

    if (!softwareList) return;

    const cmd = platform === 'darwin'
      ? `ps aux | grep -E '${softwareList.join('|')}' | grep -v grep`
      : `tasklist | findstr /i "${softwareList.join(' ')}"`;

    exec(cmd, (error, stdout) => {
      if (stdout && stdout.trim()) {
        console.warn('[Security] Recording software detected:', stdout);
        this.onDetectedCallback?.();
      }
    });
  }

  private defaultAction() {
    console.log('[Security] Recording software detected - logging incident');
    // Could: send to server, show warning, etc.
  }
}

export const recordingProtection = new RecordingProtection();
