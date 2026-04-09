import { exec } from 'child_process';
import { setInterval, clearInterval } from 'timers';

const KNOWN_RECORDING_SOFTWARE: Record<string, string[]> = {
  darwin: [
    'QuickTime Player',
    'ScreenFlow',
    'OBS',
    'Camtasia',
    'ShadowPlay',
    'Fraps',
    'ScreenCapture',
    'screencap',
    'recordmydesktop',
    'peek',
    'kooha',
    'vokoscreen',
    'kazam',
    'simplescreenrecorder',
  ],
  win32: [
    'obs64',
    'obs32',
    'obs.exe',
    'GameBarPresenceWriter',
    'xboxgips',
    'fraps',
    'fraps.exe',
    'camtasia',
    'camtasia.exe',
    'screencapture',
    'ShareX',
    'ShareX.exe',
    'Lightshot',
    'Lightshot.exe',
    'Bandicam',
    'bandicam.exe',
    'Action',
    'action.exe',
    'Dxtory',
    'dxtory.exe',
    'Snagit',
    'snagit.exe',
    'Movavi',
    'movavi.exe',
    'ScreenRec',
    'ScreenRec.exe',
    'Bandizip',
    'bandizip.exe',
  ],
  linux: [
    'obs',
    'obs-studio',
    'obs64',
    'kazam',
    'simplescreenrecorder',
    'ffmpeg',
    'recordmydesktop',
    'vlc',
    'kooha',
    'peek',
    'vokoscreen',
    'vokoscreen-ng',
    'blue-recorder',
    'green-recorder',
    'spectacle',
    'flameshot',
    'gscreenshot',
    'screencast',
    'wf-recorder',
  ],
};

export interface RecordingDetectionEvent {
  detected: boolean;
  killed?: number;
  processes?: string[];
  timestamp: number;
}

export class RecordingProtection {
  private checkInterval: NodeJS.Timeout | null = null;
  private onDetectedCallback: ((event: RecordingDetectionEvent) => void) | null = null;
  private isEnabled: boolean = false;
  private killOnDetect: boolean = true;

  enable(callback?: (event: RecordingDetectionEvent) => void, killProcesses: boolean = true) {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.killOnDetect = killProcesses;
    this.onDetectedCallback = callback || this.defaultAction.bind(this);

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

  private killProcess(processName: string): boolean {
    const platform = process.platform;
    
    return new Promise<boolean>((resolve) => {
      try {
        if (platform === 'win32') {
          exec(`taskkill /F /IM "${processName}" /T`, (error) => {
            resolve(!error);
          });
        } else if (platform === 'darwin' || platform === 'linux') {
          exec(`pkill -9 "${processName}"`, (error) => {
            resolve(!error);
          });
        } else {
          resolve(false);
        }
      } catch {
        resolve(false);
      }
    }) as unknown as boolean;
  }

  private async checkForRecordingSoftware(): Promise<void> {
    const platform = process.platform as keyof typeof KNOWN_RECORDING_SOFTWARE;
    const softwareList = KNOWN_RECORDING_SOFTWARE[platform];

    if (!softwareList) return;

    const cmd = platform === 'darwin' || platform === 'linux'
      ? `ps -A -o comm=`
      : `tasklist /FO CSV /NH`;

    exec(cmd, (error, stdout) => {
      if (error || !stdout) return;

      const lines = stdout.toLowerCase().split(/\r?\n/);
      const detectedProcesses: string[] = [];
      let killedCount = 0;

      for (const processName of softwareList) {
        const searchName = processName.toLowerCase().replace('.exe', '');
        
        const isRunning = lines.some((line) => {
          if (platform === 'win32') {
            return line.includes(searchName);
          }
          return line.trim() === searchName || line.includes(searchName);
        });

        if (isRunning) {
          detectedProcesses.push(processName);
          console.warn(`[Security] Recording software detected: ${processName}`);
          
          if (this.killOnDetect) {
            if (this.killProcess(processName)) {
              killedCount++;
            }
          }
        }
      }

      if (detectedProcesses.length > 0) {
        const event: RecordingDetectionEvent = {
          detected: true,
          killed: killedCount,
          processes: detectedProcesses,
          timestamp: Date.now(),
        };
        this.onDetectedCallback?.(event);
      }
    });
  }

  private defaultAction(event: RecordingDetectionEvent) {
    console.log('[Security] Recording software detected:', event.processes, '| Killed:', event.killed);
  }

  async checkNow(): Promise<RecordingDetectionEvent> {
    return new Promise((resolve) => {
      const platform = process.platform as keyof typeof KNOWN_RECORDING_SOFTWARE;
      const softwareList = KNOWN_RECORDING_SOFTWARE[platform];

      if (!softwareList) {
        resolve({ detected: false, timestamp: Date.now() });
        return;
      }

      const cmd = platform === 'darwin' || platform === 'linux'
        ? `ps -A -o comm=`
        : `tasklist /FO CSV /NH`;

      exec(cmd, (error, stdout) => {
        if (error || !stdout) {
          resolve({ detected: false, timestamp: Date.now() });
          return;
        }

        const lines = stdout.toLowerCase().split(/\r?\n/);
        const detected = softwareList.some((proc) => {
          const searchName = proc.toLowerCase().replace('.exe', '');
          return lines.some((line) => {
            if (platform === 'win32') {
              return line.includes(searchName);
            }
            return line.trim() === searchName || line.includes(searchName);
          });
        });

        resolve({
          detected,
          timestamp: Date.now(),
        });
      });
    });
  }
}

export const recordingProtection = new RecordingProtection();
