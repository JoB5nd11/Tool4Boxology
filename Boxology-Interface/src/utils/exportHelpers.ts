// exportHelpers.ts
import * as go from "gojs";

/** Normalize */
const norm = (s?: string) => (s ?? '').trim().toLowerCase();

// UPDATED: include 'embed' and common variants, detect by type/subtype/name/label
const PROCESS_TYPES = new Set<string>([
  'transform', 'deduce', 'training', 'engineering',
  'generate', 'generate:train', 'generate:engineer',
  "classification", "prediction",
  "Symbolic Learning", "Statistical Learning", "Deep Learning", "Reinforcement Learning",
  'infer', 'infer:deduce', 'transform:embed', 'embed','normalize','aggregate'// <-- added 'embed'
]);

// UPDATED: check type, then subtype, then name, then label (case-insensitive)
const isProcess = (n: any) => {
  const t = norm(n?.type ?? n?.subtype ?? n?.name ?? n?.label);
  return PROCESS_TYPES.has(t);
};

function toComponent(n: any) {
  return {
    id: n.key,
    // Prefer semantic type/subtype, then name/label
    name: n.type ?? n.subtype ?? n.name ?? n.label ?? '',
    label: n.label ?? n.text ?? n.name ?? ''
  };
}

function singleOrArray(arr: any[]) {
  if (!arr || arr.length === 0) return undefined;
  return arr.length === 1 ? arr[0] : arr;
}

/**
 * Build design patterns from raw model data (no Diagram instance needed)
 *
 * - finds ClusterGroup nodes
 * - collects member nodes
 * - finds intra-cluster links
 * - picks the process node (first matching PROCESS_TYPES)
 * - computes inputs as nodes that link -> process (from anywhere)
 * - computes outputs as nodes that link <- process (to anywhere)
 * - exports only id,label,input,output,process for each cluster
 */
export function buildDesignPatternsFromModelData(
  nodeDataArray: any[],
  linkDataArray: any[]
) {
  const nodeByKey = new Map<string, any>(nodeDataArray.map((n: any) => [String(n.key), n]));
  const groups = nodeDataArray.filter((n: any) => n.isGroup && n.category === 'ClusterGroup');

  const links = (linkDataArray ?? []).map((l: any) => ({
    from: String(l.from),
    to: String(l.to),
    raw: l
  }));

  const patterns: any[] = [];

  for (const g of groups) {
    const gKey = String(g.key);

    // members of this cluster
    const members = nodeDataArray.filter((n: any) => !n.isGroup && String(n.group) === gKey);
    const memberKeys = new Set(members.map(m => String(m.key)));

    // intra-cluster links (both ends in same cluster)
    const intraLinks = links.filter(l => memberKeys.has(l.from) && memberKeys.has(l.to));

    // find process node among members (UI should enforce exactly one)
    const processNodes = members.filter(isProcess);
    const processNode = processNodes[0] ?? null;

    // direct inputs: nodes (anywhere) that have a link -> process
    const inputNodes = processNode
      ? links
          .filter(l => l.to === String(processNode.key))
          .map(l => nodeByKey.get(l.from))
          .filter(Boolean)
      : [];

    // direct outputs: nodes (anywhere) that have a link from process
    const outputNodes = processNode
      ? links
          .filter(l => l.from === String(processNode.key))
          .map(l => nodeByKey.get(l.to))
          .filter(Boolean)
      : [];

    // fallback: if no process, treat cluster sources/sinks as inputs/outputs (intra-cluster)
    let inputs = inputNodes;
    let outputs = outputNodes;
    if (!processNode) {
      const incomingSet = new Set(intraLinks.map(l => l.to));
      const outgoingSet = new Set(intraLinks.map(l => l.from));
      const sources = members.filter(m => !incomingSet.has(String(m.key)));
      const sinks = members.filter(m => !outgoingSet.has(String(m.key)));
      inputs = sources;
      outputs = sinks;
    }

    const pattern: any = {
      id: g.key,
      label: g.label ?? g.text ?? 'Cluster'
    };

    const mappedInputs = inputs.map(toComponent);
    const mappedOutputs = outputs.map(toComponent);

    const mappedProcess = processNode ? toComponent(processNode) : undefined;

    if (mappedInputs.length > 0) pattern.input = singleOrArray(mappedInputs);
    if (mappedOutputs.length > 0) pattern.output = singleOrArray(mappedOutputs);
    if (mappedProcess) pattern.process = mappedProcess;

    patterns.push(pattern);
  }

  return patterns;
}

/**
 * Export all pages in RML-compatible format
 */
export const generateMultiPageRMLExport = (pages: any[]): any => {
  const boxologies = pages.map(page => {
    const patterns = buildDesignPatternsFromModelData(page.nodeDataArray ?? [], page.linkDataArray ?? []);
    return {
      id: page.id,
      label: `Diagram`,
      DesignPattern: patterns
    };
  });

  return { boxologies };
};
