import {NetworkPacket} from './types';

interface AssemblyBuffer {
  chunks: (string | undefined)[];
  total: number;
  receivedAt: number;
}

/**
 * PacketAssembler — collects fragments of a segmented message and reconstructs
 * the original payload once all fragments have arrived.
 *
 * If one or more fragments are lost (e.g. dropped by the Poisson channel), the
 * message can never be fully assembled.  Callers may use the `isFailed` helper
 * to detect permanently incomplete messages after a timeout.
 */
export class PacketAssembler {
  private buffers = new Map<string, AssemblyBuffer>();

  /**
   * Adds a fragment to the buffer and returns the full message when every
   * fragment has been received, or null if assembly is still in progress.
   */
  assemble(packet: NetworkPacket): string | null {
    const {header, body} = packet;

    if (!this.buffers.has(header.msgId)) {
      this.buffers.set(header.msgId, {
        chunks: new Array(header.total),
        total: header.total,
        receivedAt: Date.now(),
      });
    }

    const buf = this.buffers.get(header.msgId)!;
    buf.chunks[header.packetIdx] = body;

    const receivedCount = buf.chunks.filter((c) => c !== undefined).length;

    if (receivedCount === header.total) {
      this.buffers.delete(header.msgId);
      return buf.chunks.join('');
    }

    return null;
  }

  /**
   * Returns true when the message has been waiting longer than `timeoutMs` but
   * is still not complete — indicating that at least one fragment was lost.
   *
   * **Side-effect**: any incomplete buffer that has exceeded the timeout is
   * permanently removed from the internal map.  Subsequent calls to
   * `isFailed()` or `getProgress()` for the same `msgId` will return `false`
   * / `null` respectively.
   */
  isFailed(msgId: string, timeoutMs = 5000): boolean {
    const buf = this.buffers.get(msgId);
    if (!buf) return false;

    if (Date.now() - buf.receivedAt >= timeoutMs) {
      const received = buf.chunks.filter((c) => c !== undefined).length;
      if (received < buf.total) {
        this.buffers.delete(msgId);
        return true;
      }
    }
    return false;
  }

  /**
   * Returns diagnostic information about the named in-flight message, or null
   * if the message is not currently being assembled.
   */
  getProgress(msgId: string): { received: number; total: number } | null {
    const buf = this.buffers.get(msgId);
    if (!buf) return null;
    return {
      received: buf.chunks.filter((c) => c !== undefined).length,
      total: buf.total,
    };
  }
}

