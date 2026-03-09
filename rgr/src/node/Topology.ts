export class Topology {
  private nodeId: string;
  private neighboursMap: Record<string, Set<string>> = {};
  private portsMap: Record<string, number> = {};

  /**
   * @param neighboursRaw - string like "a:b,b:c"
   * @param portsRaw - string like "a:6000,b:6001"
   * @param nodeId - current node identifier
   */
  constructor(neighboursRaw: string, portsRaw: string, nodeId: string) {
    this.nodeId = nodeId.toLowerCase();

    // 1. Parse ports mapping: "a:6000" -> { a: 6000 }
    for (const entry of portsRaw.split(',')) {
      const [id, port] = entry.split(':');
      if (id && port) {
        this.portsMap[id.trim().toLowerCase()] = Number(port.trim());
      }
    }

    // 2. Parse neighbor connections to build an undirected graph
    for (const pair of neighboursRaw.split(',')) {
      const parts = pair.split(':');
      if (parts.length !== 2) continue;

      const u = parts[0].trim().toLowerCase();
      const v = parts[1].trim().toLowerCase();

      if (!this.neighboursMap[u]) this.neighboursMap[u] = new Set();
      if (!this.neighboursMap[v]) this.neighboursMap[v] = new Set();

      this.neighboursMap[u].add(v);
      this.neighboursMap[v].add(u);
    }
  }

  /**
   * Finds the full URL of the next hop on the shortest path to destinationId.
   * Implementation uses BFS (Breadth-First Search).
   */
  getNextHopUrl(destinationId: string): string | null {
    const target = destinationId.toLowerCase();

    // Return null if target is self or port information is missing
    if (target === this.nodeId || !this.portsMap[target]) {
      return null;
    }

    const startNeighbours = this.neighboursMap[this.nodeId];
    if (!startNeighbours) return null;

    // Direct neighbor optimization
    if (startNeighbours.has(target)) {
      return this.formatUrl(target);
    }

    // BFS to find the shortest path in the topology graph
    // Queue stores [currentNode, firstStepNode]
    const queue: [string, string][] = [];
    for (const neighbor of startNeighbours) {
      queue.push([neighbor, neighbor]);
    }

    const visited = new Set([this.nodeId]);

    while (queue.length > 0) {
      const [current, firstStep] = queue.shift()!;

      if (current === target) {
        // Path found! Return the URL of the node that starts this path
        return this.formatUrl(firstStep);
      }

      visited.add(current);

      const currentNeighbours = this.neighboursMap[current];
      if (currentNeighbours) {
        for (const n of currentNeighbours) {
          if (!visited.has(n)) {
            queue.push([n, firstStep]);
          }
        }
      }
    }

    // No path found in the graph
    return null;
  }

  /**
   * Formats the internal node ID into a reachable Docker service URL.
   */
  private formatUrl(id: string): string {
    const port = this.portsMap[id];
    return `http://node_${id}:${port}`;
  }

  getNeighbours(): string[] {
    return Array.from(this.neighboursMap[this.nodeId] || []);
  }
}
