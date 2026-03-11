import crypto from 'node:crypto';
import {Logger} from '@/logger';
import {NodeConfig, NodeCert} from '@/node/config';
import {CAApi} from "@/node/caApi";
import {NetworkPacket, PacketType} from '@/node/types';
import {assert} from "@/helpers/assert";
import {PacketAssembler} from "@/node/PacketAssembler";
import {NodeFSM} from "@/node/NodeFSM";
import {PoissonLoss} from "@/node/PoissonLoss";

// Types for Advanced TLS Handshake
type HandshakeStep = 'CLIENT_HELLO' | 'SERVER_HELLO' | 'KEY_EXCHANGE' | 'FINISHED';

interface HandshakePayload {
  step: HandshakeStep;
  data: string;       // Randoms, Encrypted Secrets, or "READY"
  certificate?: string; // Sent during SERVER_HELLO
}

export class Node {
  private readonly logger: Logger;
  private readonly ca: CAApi;
  private readonly assembler = new PacketAssembler();
  private readonly fsm = new NodeFSM();
  private readonly poissonLoss: PoissonLoss;
  private certData?: NodeCert;

  private sessionKeys = new Map<string, Buffer>(); // TargetID -> AES Key
  private handshakeContexts = new Map<string, { clientRandom: string, serverRandom: string }>();
  private seenBroadcasts = new Set<string>();

  constructor(private readonly config: NodeConfig) {
    this.logger = new Logger(config);
    this.ca = new CAApi(this.config.caUrl);
    this.poissonLoss = new PoissonLoss(this.config.poissonLambda);
    this.logger.log(`[FSM] Initial state: ${this.fsm.getState()}`);
    this.logger.log(`[POISSON] λ=${this.config.poissonLambda} → drop probability ≈ ${(this.poissonLoss.dropProbability() * 100).toFixed(1)}%`);
    this.init();
  }

  private async init() {
    await this.setupSecurity();
    this.startServer();
  }

  private async setupSecurity() {
    try {
      const data = await this.ca.issueCertificate(this.config.nodeId);

      this.certData = {
        certificate: data.certificate,
        key: data.key,
        issuedAt: new Date(),
        revoked: false
      };

      this.logger.log('Advanced Security:  RSA Keys generated and CA Certificate stored');
    } catch (err: any) {
      this.logger.log(`Security Setup Failed: ${err.message}`);
      throw err;
    }
  }

  private startServer() {
    Bun.serve({
      port: this.config.port,
      hostname: "0.0.0.0",
      fetch: (req) => this.handleHttpRequest(req),
    });
    this.logger.log(`Node ${this.config.nodeId} active on port ${this.config.port}`);
  }

  private async handleHttpRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/receive" && req.method === "POST") {
      const packet: NetworkPacket = await req.json();
      return this.onPacketReceived(packet);
    }

    if (url.pathname === "/status" && req.method === "GET") {
      return Response.json({
        nodeId: this.config.nodeId,
        state: this.fsm.getState(),
        poissonLambda: this.config.poissonLambda,
        dropProbability: `${(this.poissonLoss.dropProbability() * 100).toFixed(1)}%`,
      });
    }

    if (url.pathname === "/initiate" && req.method === "POST") {
      const {target, data, isBroadcast} = await req.json();

      if (isBroadcast) {
        await this.initiateBroadcast(data);
        return Response.json({status: "Broadcast Started"});
      }

      await this.initiateSecureTransmission(target, data);
      return Response.json({status: "Secure Handshake/Transmission Started"});
    }

    return new Response("Not Found", {status: 404});
  }

  private async onPacketReceived(packet: NetworkPacket): Promise<Response> {
    // --- Half-duplex radio: channel is blocked while transmitting ---
    if (!this.fsm.canReceive()) {
      this.logger.log(`[CHANNEL BUSY] Packet from ${packet.header.src} to ${packet.header.dest} idx=${packet.header.packetIdx} dropped — node is TRANSMITTING (half-duplex)`);
      return new Response("Channel Busy", {status: 503});
    }

    // --- Poisson loss simulation on inbound packets ---
    if (this.poissonLoss.shouldDrop()) {
      this.logger.log(`[POISSON DROP] Packet from ${packet.header.src} to ${packet.header.dest} idx=${packet.header.packetIdx}/${packet.header.total - 1} dropped (λ=${this.config.poissonLambda})`);
      // Return OK to the sender so it doesn't know the packet was lost
      return new Response("OK");
    }

    const isForMe = packet.header.dest === this.config.nodeId || packet.header.dest === 'ALL';

    this.logger.log(`[RECEIVE] Packet from ${packet.header.src} to ${packet.header.dest} (type: ${packet.header.type}, isForMe: ${isForMe})`);

    // Transition to RECEIVING state
    this.fsm.startReceiving();
    this.logger.log(`[FSM] State → ${this.fsm.getState()}`);

    if (isForMe) {
      this.processInbound(packet);
      // If it's a broadcast, we still need to forward it to others
      if (packet.header.dest === 'ALL') {
        const result = await this.forward(packet);
        this.fsm.finish();
        this.logger.log(`[FSM] State → ${this.fsm.getState()}`);
        return result;
      }
      this.fsm.finish();
      this.logger.log(`[FSM] State → ${this.fsm.getState()}`);
      return new Response("Received");
    }

    // Packet is for someone else — relay (hub behaviour)
    this.logger.log(`[FSM] Relaying packet → transitioning to TRANSMITTING`);
    this.fsm.startTransmitting();
    this.logger.log(`[FSM] State → ${this.fsm.getState()}`);
    const result = await this.forward(packet);
    this.fsm.finish();
    this.logger.log(`[FSM] State → ${this.fsm.getState()}`);
    return result;
  }

  private async forward(packet: NetworkPacket): Promise<Response> {
    if (packet.header.dest === 'ALL') {
      if (this.seenBroadcasts.has(packet.header.msgId)) {
        return new Response("Already Processed");
      }
      this.seenBroadcasts.add(packet.header.msgId);

      //  Broadcast forwarding — send to all neighbours (except the sender)
      const neighbours = this.config.topology.getNeighbours();

      for (const neighbour of neighbours) {
        // Do not send back to the originator
        if (neighbour === packet.header.src) continue;

        const nextHopUrl = this.config.topology.getNextHopUrl(neighbour);
        if (!nextHopUrl) continue;

        this.logger.log(`[FORWARDING BROADCAST] from ${packet.header.src} to ${neighbour} (idx: ${packet.header.packetIdx}/${packet.header.total})`);

        try {
          await fetch(`${nextHopUrl}/receive`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(packet),
          });
        } catch (e: any) {
          this.logger.log(`[FORWARDING ERROR] Broadcast to ${neighbour} failed: ${e.message}`);
        }
      }

      return new Response("Broadcast Forwarded");
    }

    //  Unicast forwarding (standard routing)
    if (packet.header.type === "DATA") {
      this.logger.log(`[SNOOPING ATTEMPT] Packet body (encrypted): ${packet.body.substring(0, 50)}...`);
    }

    this.logger.log(`[FORWARDING] Packet from ${packet.header.src} to ${packet.header.dest} (type: ${packet.header.type}, idx: ${packet.header.packetIdx}/${packet.header.total})`);

    const nextHopUrl = this.config.topology.getNextHopUrl(packet.header.dest);

    if (!nextHopUrl) {
      this.logger.log(`[FORWARDING ERROR] No route to ${packet.header.dest}`);
      return new Response("No Route", {status: 404});
    }

    this.logger.log(`[FORWARDING] Next hop: ${nextHopUrl}`);

    try {
      await fetch(`${nextHopUrl}/receive`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(packet),
      });
      return new Response("Forwarded");
    } catch (e: any) {
      this.logger.log(`[FORWARDING ERROR] Failed to forward to ${nextHopUrl}: ${e.message}`);
      return new Response("Forwarding Error", {status: 502});
    }
  }

  private processInbound(packet: NetworkPacket) {
    const fullMessage = this.assembler.assemble(packet);
    if (!fullMessage) return;

    switch (packet.header.type) {
      case "HANDSHAKE":
        this.handleHandshake(JSON.parse(fullMessage), packet.header.src);
        break;
      case "DATA":
        this.handleSecureData(fullMessage, packet.header.src);
        break;
      case "BROADCAST":
        this.logger.log(`[BROADCAST FROM ${packet.header.src}]:  ${fullMessage}`);
        break;
    }
  }

  private async handleHandshake(payload: HandshakePayload, from: string) {
    switch (payload.step) {
      case 'CLIENT_HELLO': {
        const serverRandom = crypto.randomBytes(16).toString('hex');
        this.handshakeContexts.set(from, {clientRandom: payload.data, serverRandom});

        await this.transmit(from, JSON.stringify({
          step: 'SERVER_HELLO',
          data: serverRandom,
          certificate: this.certData?.certificate
        }), "HANDSHAKE");
        break;
      }

      case 'SERVER_HELLO': {
        assert(payload.certificate, "No certificate provided");
        this.logger.log(`Verifying certificate for ${from}... `);

        // check certificate validity with CA
        try {
          const validation = await this.ca.validateCertificate(payload.certificate);

          if (!validation.valid) {
            this.logger.log(`❌ Certificate REJECTED: ${validation.reason}`);
            return;
          }

          this.logger.log(`✅ Certificate validated for node ${validation.nodeId}`);
        } catch (err: any) {
          this.logger.log(`❌ Validation error: ${err.message}`);
          return;
        }

        const premaster = crypto.randomBytes(32);
        const publicKey = crypto.createPublicKey(payload.certificate.trim());

        const encryptedPremaster = crypto.publicEncrypt(
          {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          premaster
        );

        const ctx = this.handshakeContexts.get(from);
        this.sessionKeys.set(from, this.deriveSessionKey(premaster, ctx!.clientRandom, payload.data));

        await this.transmit(from, JSON.stringify({
          step: 'KEY_EXCHANGE',
          data: encryptedPremaster.toString('base64')
        }), "HANDSHAKE");
        break;
      }

      case 'KEY_EXCHANGE': {
        assert(this.certData?.key, "Private key missing");

        const encryptedBuffer = Buffer.from(payload.data, 'base64');

        this.logger.log(`[DEBUG] Received Payload Length: ${payload.data.length}`);
        this.logger.log(`[DEBUG] Encrypted Buffer Byte Length: ${encryptedBuffer.length}`);

        const decryptedPremaster = crypto.privateDecrypt(
          {
            key: this.certData.key,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          encryptedBuffer
        );

        const sCtx = this.handshakeContexts.get(from);

        this.sessionKeys.set(from, this.deriveSessionKey(decryptedPremaster, sCtx!.clientRandom, sCtx!.serverRandom));
        await this.transmit(from, JSON.stringify({step: 'FINISHED', data: 'READY'}), "HANDSHAKE");
        break;
      }

      case 'FINISHED':
        this.logger.log(`TLS Handshake Complete with ${from}. Channel Secure.`);
        break;
    }
  }

  // --- DATA TRANSMISSION ---

  private async initiateSecureTransmission(target: string, data: string) {
    if (!this.sessionKeys.has(target)) {
      this.logger.log(`Starting Handshake with ${target}...`);
      const clientRandom = crypto.randomBytes(16).toString('hex');
      this.handshakeContexts.set(target, {clientRandom, serverRandom: ''});
      await this.transmit(target, JSON.stringify({step: 'CLIENT_HELLO', data: clientRandom}), "HANDSHAKE");
      // In a real app, we'd queue the data until FINISHED
      return;
    }

    // Advanced: AES-GCM Encryption
    const encrypted = this.encrypt(data, this.sessionKeys.get(target)!);
    await this.transmit(target, encrypted, "DATA");
  }

  private async initiateBroadcast(data: string) {
    const msgId = crypto.randomUUID();
    this.logger.log(`Initiating broadcast ${msgId}`);
    await this.transmit('ALL', data, 'BROADCAST', msgId);
  }

  private async transmit(target: string, data: string, type: PacketType, existingMsgId?: string) {
    const MTU = 500;
    const msgId = existingMsgId || crypto.randomUUID();
    const total = Math.ceil(data.length / MTU);

    // Transition FSM to TRANSMITTING
    this.fsm.startTransmitting();
    this.logger.log(`[FSM] State → ${this.fsm.getState()} (sending ${total} fragment(s) to ${target})`);

    // broadcast
    if (target === 'ALL') {
      const neighbours = this.config.topology.getNeighbours();

      if (!neighbours || neighbours.length === 0) {
        this.logger.log(`No neighbours to broadcast to`);
        this.fsm.finish();
        this.logger.log(`[FSM] State → ${this.fsm.getState()}`);
        return;
      }

      // Send to all neighbours
      for (const neighbour of neighbours) {
        const nextHop = this.config.topology.getNextHopUrl(neighbour);

        if (!nextHop) continue;

        for (let i = 0; i < total; i++) {
          const chunk = data.substring(i * MTU, (i + 1) * MTU);
          const packet = this.createPacket(target, msgId, chunk, i, total, type);

          try {
            const response = await fetch(`${nextHop}/receive`, {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify(packet),
            });

            if (!response.ok) {
              this.logger.log(`Broadcast chunk ${i} failed to send to ${neighbour}`);
            }
          } catch (e: any) {
            this.logger.log(`Broadcast error to ${neighbour}: ${e.message}`);
          }
        }
      }

      this.fsm.finish();
      this.logger.log(`[FSM] State → ${this.fsm.getState()}`);
      return;
    }

    // Unicast transmission
    const nextHop = this.config.topology.getNextHopUrl(target);
    assert(nextHop, `Unreachable: ${target}`);

    let failedCount = 0;
    for (let i = 0; i < total; i++) {
      const chunk = data.substring(i * MTU, (i + 1) * MTU);
      const packet = this.createPacket(target, msgId, chunk, i, total, type);

      const response = await fetch(`${nextHop}/receive`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(packet),
      });

      if (!response.ok) {
        failedCount++;
        this.logger.log(`Chunk ${i} failed to deliver to ${nextHop}`);
      }
    }

    if (failedCount > 0) {
      this.logger.log(`[TRANSMIT] ${failedCount}/${total} fragment(s) were not acknowledged — handshake/message may fail`);
    }

    this.fsm.finish();
    this.logger.log(`[FSM] State → ${this.fsm.getState()}`);
  }

  // --- CRYPTO UTILS ---

  private deriveSessionKey(premaster: Buffer, r1: string, r2: string): Buffer {
    return crypto.createHash('sha256').update(Buffer.concat([premaster, Buffer.from(r1), Buffer.from(r2)])).digest();
  }

  private encrypt(text: string, key: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private handleSecureData(data: string, from: string) {
    const key = this.sessionKeys.get(from);
    assert(key, `No session key established for node ${from}`);

    try {
      const [ivHex, tagHex, encryptedHex] = data.split(':');

      if (!ivHex || !tagHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format');
      }

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivHex, 'hex')
      );

      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      this.logger.log(`[SECURE DATA FROM ${from}] (Decrypted): ${decrypted}`);
    } catch (err: any) {
      this.logger.log(`Decryption failed from ${from}:  ${err.message}`);
    }
  }

  private createPacket(dest: string, msgId: string, body: string, idx: number, total: number, type: PacketType): NetworkPacket {
    return {header: {src: this.config.nodeId, dest, msgId, packetIdx: idx, total, type}, body};
  }
}

export default new Node(new NodeConfig())
