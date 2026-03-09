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
  }
}

