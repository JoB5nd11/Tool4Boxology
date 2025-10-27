// exportHelpers.ts
import * as go from "gojs";

/** Normalize */
const norm = (s?: string) => (s ?? '').trim().toLowerCase();

const PROCESS_TYPES = new Set<string>([
  'transform', 'deduce', 'training', 'engineering',
  'generate', 'generate:train', 'generate:engineer',
  'infer', 'infer:deduce', 'transform:embed'
]);

const isProcess = (n: any) => PROCESS_TYPES.has(norm(n.type ?? n.name));

function toComponent(n: any) {
  return {
    id: n.key,
    name: n.type ?? n.name ?? '',
    label: n.label ?? n.text ?? '',
  };
}

// Build patterns from raw model data (no Diagram instance needed)
export function buildDesignPatternsFromModelData(
  nodeDataArray: any[],
  linkDataArray: any[]
) {
  const nodeByKey = new Map<string, any>(nodeDataArray.map((n: any) => [n.key, n]));
  const groups = nodeDataArray.filter((n: any) => n.isGroup && n.category === 'ClusterGroup');

  const patterns: any[] = [];

  for (const g of groups) {
    const members = nodeDataArray.filter((n: any) => !n.isGroup && n.group === g.key);

    // Identify process nodes (we will export exactly one; if multiple, take the first)
    const processNodes = members.filter(isProcess);
    const processNode = processNodes[0];

    // Compute intra-cluster links
    const memberKeys = new Set(members.map(m => m.key));
    const links = linkDataArray.filter(
      (l: any) => memberKeys.has(l.from) && memberKeys.has(l.to)
    );

    // Inputs: nodes with a link to the process
    const inputs = processNode
      ? links
          .filter((l: any) => l.to === processNode.key)
          .map((l: any) => nodeByKey.get(l.from))
          .filter((n: any) => n && !isProcess(n))
      : [];

    // Outputs: nodes with a link from the process
    const outputs = processNode
      ? links
          .filter((l: any) => l.from === processNode.key)
          .map((l: any) => nodeByKey.get(l.to))
          .filter((n: any) => n && !isProcess(n))
      : [];

    const pattern: any = {
      id: g.key,
      label: g.label ?? g.text ?? 'Cluster'
    };

    if (inputs.length > 0) pattern.input = inputs.map(toComponent);
    if (outputs.length > 0) pattern.output = outputs.length === 1 ? toComponent(outputs[0]) : outputs.map(toComponent);
    if (processNode) pattern.process = toComponent(processNode);

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
      label: page.name ?? 'Page',
      DesignPattern: patterns
    };
  });

  return { boxologies };
};
