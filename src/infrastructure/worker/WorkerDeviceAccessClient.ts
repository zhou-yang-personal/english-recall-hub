import type { DeviceAccessClient } from '../../features/sync-access/deviceAccessClient';
import type { WorkerApiClient } from './WorkerApiClient';

export class WorkerDeviceAccessClient implements DeviceAccessClient {
  constructor(private readonly api: WorkerApiClient) {}

  async getStatus(): Promise<boolean> {
    const result = await this.api.request<{ paired: boolean }>('/device/status');
    return result.paired;
  }

  async pair(pairingCode: string): Promise<void> {
    await this.api.request('/device/pair', {
      method: 'POST',
      body: JSON.stringify({ pairingCode: pairingCode.trim() }),
    });
  }

  async unpair(): Promise<void> {
    await this.api.request('/device/unpair', { method: 'POST' });
  }
}
