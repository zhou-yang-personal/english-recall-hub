export type DeviceAccessStatus = 'loading' | 'paired' | 'unpaired' | 'unavailable';

export interface DeviceAccessClient {
  getStatus(): Promise<boolean>;
  pair(pairingCode: string): Promise<void>;
  unpair(): Promise<void>;
}
