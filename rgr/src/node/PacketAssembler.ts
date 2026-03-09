import {NetworkPacket} from './types';

export class PacketAssembler {
  private buffers = new Map<string, string[]>();

  /**
   * Adds a chunk to the buffer and returns the full message if complete.
   */
  assemble(packet: NetworkPacket): string | null {
    const {header, body} = packet;

    if (!this.buffers.has(header.msgId)) {
      this.buffers.set(header.msgId, new Array(header.total));
    }

    const chunks = this.buffers.get(header.msgId)!;
    chunks[header.packetIdx] = body;

    const receivedCount = chunks.filter((c) => c !== undefined).length;

    if (receivedCount === header.total) {
      this.buffers.delete(header.msgId);
      return chunks.join('');
    }

    return null;
  }
}
