const CHANNEL = 'slaboe-zveno-sync-v1';

export type SyncMessage = { type: 'snapshot'; snapshot: string };

export function openSyncChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL);
}

export function postSnapshot(channel: BroadcastChannel, snapshot: unknown): void {
  channel.postMessage({ type: 'snapshot', snapshot: JSON.stringify(snapshot) } satisfies SyncMessage);
}
