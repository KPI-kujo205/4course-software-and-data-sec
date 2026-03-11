/**
 * NodeFSM — Finite State Machine for a network node.
 *
 * States:
 *   IDLE         – The node is listening / waiting for activity.
 *   RECEIVING    – The node is currently reassembling an inbound packet stream.
 *   TRANSMITTING – The node is sending its own data or relaying a forwarded packet.
 *
 * Half-duplex radio rule: the channel is blocked for inbound traffic while the
 * node is TRANSMITTING.  Use `canReceive()` to enforce this at the call-site.
 */

export type NodeState = 'IDLE' | 'RECEIVING' | 'TRANSMITTING';

export class NodeFSM {
  private state: NodeState = 'IDLE';

  getState(): NodeState {
    return this.state;
  }

  /**
   * Returns true when the channel is free to accept an inbound packet.
   * A node that is currently TRANSMITTING cannot receive (half-duplex).
   */
  canReceive(): boolean {
    return this.state !== 'TRANSMITTING';
  }

  /**
   * Transition to RECEIVING state.
   * Valid from: IDLE
   */
  startReceiving(): void {
    if (this.state === 'IDLE') {
      this.state = 'RECEIVING';
    }
  }

  /**
   * Transition to TRANSMITTING state.
   * Valid from: IDLE or RECEIVING (relay case — packet arrived and must be forwarded).
   */
  startTransmitting(): void {
    if (this.state === 'IDLE' || this.state === 'RECEIVING') {
      this.state = 'TRANSMITTING';
    }
  }

  /**
   * Return to IDLE (reception or transmission is complete).
   */
  finish(): void {
    this.state = 'IDLE';
  }
}
