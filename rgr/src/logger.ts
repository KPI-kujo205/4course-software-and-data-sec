import {NodeConfig} from './node/config'

export class Logger {
  private nodeId: string;

  constructor(private configOrId: NodeConfig | string) {
    if (configOrId instanceof NodeConfig) {
      this.nodeId = configOrId.nodeId;
    } else {
      this.nodeId = configOrId;
    }
  }

  log(message: string): void {
    console.log(`[node ${this.nodeId}] ${message}`);
  }
}
