// The type of protocol being carried inside the packet
export type PacketType = 'HANDSHAKE' | 'DATA' | 'BROADCAST';

export interface PacketHeader {
  src: string;          // Origin node ID (e.g., 'a')
  dest: string;         // Final destination node ID (e.g., 'd')
  msgId: string;        // Unique identifier for the whole message
  packetIdx: number;    // Current fragment index (0-based)
  total: number;        // Total number of fragments
  type: PacketType;     // Helps the receiver decide which manager to use
}

export interface NetworkPacket {
  header: PacketHeader;
  body: string;         // The payload (can be a JSON string or encrypted text)
}
