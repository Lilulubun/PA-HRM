import neo4j from "neo4j-driver";
import type { Driver } from "neo4j-driver";

export type GraphLabelCount = { label: string; count: number };
export type GraphRelCount = { type: string; count: number };
export type GraphSummary = { nodes: number; relationships: number; labels: GraphLabelCount[]; relationshipTypes: GraphRelCount[]; status: "ok" | "unavailable"; error?: string };

const uri = process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687";
const user = process.env.NEO4J_USER ?? "neo4j";
const password = process.env.NEO4J_PASSWORD ?? "neo4j";

export async function graphSummary(): Promise<GraphSummary> {
  let driver: Driver | null = null;
  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    const session = driver.session();
    try {
      const nodes = await session.run("MATCH (n) RETURN count(n) AS c");
      const rels = await session.run("MATCH ()-[r]->() RETURN count(r) AS c");
      const labels = await session.run("MATCH (n) UNWIND labels(n) AS l RETURN l, count(*) AS c ORDER BY l");
      const types = await session.run("MATCH ()-[r]->() RETURN type(r) AS t, count(*) AS c ORDER BY t");
      return {
        nodes: Number(nodes.records[0]?.get("c") ?? 0),
        relationships: Number(rels.records[0]?.get("c") ?? 0),
        labels: labels.records.map((r) => ({ label: String(r.get("l")), count: Number(r.get("c")) })),
        relationshipTypes: types.records.map((r) => ({ type: String(r.get("t")), count: Number(r.get("c")) })),
        status: "ok",
      };
    } finally { await session.close(); }
  } catch (error) {
    return { nodes: 0, relationships: 0, labels: [], relationshipTypes: [], status: "unavailable", error: (error as Error).message };
  } finally { await driver?.close(); }
}

export type EntityNode = { id: string; label: string; properties: Record<string, unknown> };
export type EntityEdge = { from: string; to: string; type: string };
export type EntityGraph = { center: EntityNode | null; nodes: EntityNode[]; edges: EntityEdge[]; status: "ok" | "unavailable"; error?: string };

type RawNode = { elementId: string; labels: string[]; properties: Record<string, unknown> };
type RawRel = { type: string; startNodeElementId: string; endNodeElementId: string };

function toNode(n: RawNode): EntityNode {
  return { id: String(n.properties.id ?? n.properties.name ?? ""), label: n.labels[0] ?? "", properties: { name: n.properties.name, text: n.properties.text, rating: n.properties.rating, classification: n.properties.classification } };
}

export async function entityGraph(employeeId = "employee-001"): Promise<EntityGraph> {
  let driver: Driver | null = null;
  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (e:Employee {id:$employeeId})
        OPTIONAL MATCH (e)-[r1]-(n1)
        OPTIONAL MATCH (n1)-[r2]-(n2)
        WITH e, collect(DISTINCT n1) + collect(DISTINCT n2) AS rawNodes, collect(DISTINCT r1) + collect(DISTINCT r2) AS rawRels
        RETURN e AS center, rawNodes, rawRels`, { employeeId });
      const record = result.records[0];
      if (!record) return { center: null, nodes: [], edges: [], status: "ok" };
      const centerRaw = record.get("center") as RawNode;
      const center = toNode(centerRaw);
      const nodeByElementId: Record<string, EntityNode> = { [centerRaw.elementId]: center };
      const nodes: EntityNode[] = [center];
      for (const n of record.get("rawNodes") as RawNode[]) {
        const node = toNode(n);
        if (!node.id || nodeByElementId[n.elementId]) continue;
        nodeByElementId[n.elementId] = node;
        nodes.push(node);
      }
      const edges: EntityEdge[] = [];
      const seenEdge: Record<string, true> = {};
      for (const rel of record.get("rawRels") as RawRel[]) {
        const from = nodeByElementId[rel.startNodeElementId]?.id;
        const to = nodeByElementId[rel.endNodeElementId]?.id;
        if (!from || !to) continue;
        const key = `${from}|${rel.type}|${to}`;
        if (seenEdge[key]) continue;
        seenEdge[key] = true;
        edges.push({ from, to, type: rel.type });
      }
      return { center, nodes, edges, status: "ok" };
    } finally { await session.close(); }
  } catch (error) {
    return { center: null, nodes: [], edges: [], status: "unavailable", error: (error as Error).message };
  } finally { await driver?.close(); }
}
