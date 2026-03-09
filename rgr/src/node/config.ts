import * as process from "node:process";
import {assert} from "@/helpers/assert";
import {Topology} from "@/node/Topology";

export interface NodeCert {
  certificate: string
  key: string
  issuedAt: Date
  revoked?: boolean
}


export class NodeConfig {
  /**
   * Id of a node, like a,b,c etc
   */
  nodeId: string;

  /**
   * url of the CA server to request certificates from
   */
  caUrl: string;

  topology: Topology

  /**
   * port of a node
   */
  port: number;

  /**
   * Lambda (λ) for the Poisson loss model.
   * Drop probability per packet = 1 − e^{-λ}.
   * Defaults to 0.3 (~26% drop rate) when the env var is absent.
   */
  poissonLambda: number;

  constructor() {
    const envsVars = [
      'NODE_ID', 'CA_URL', 'TOPOLOGY_NEIGHBOURS', 'TOPOLOGY_PORTS', 'NODE_PORT'
    ] as const

    for (const envVar of envsVars) {
      assert(process.env[envVar], `${envVar} environment variable is not set`);
    }

    this.nodeId = process.env.NODE_ID!;
    this.caUrl = process.env.CA_URL!
    this.port = Number(process.env.NODE_PORT!)
    this.topology = new Topology(process.env.TOPOLOGY_NEIGHBOURS!, process.env.TOPOLOGY_PORTS!, this.nodeId)
    this.poissonLambda = process.env.POISSON_LAMBDA ? Number(process.env.POISSON_LAMBDA) : 0.3;
    if (isNaN(this.poissonLambda) || this.poissonLambda < 0) {
      throw new RangeError(`POISSON_LAMBDA must be a non-negative number, got: ${process.env.POISSON_LAMBDA}`);
    }
  }
}


