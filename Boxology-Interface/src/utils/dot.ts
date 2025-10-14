export type BoxologyModel = {
  nodeDataArray: any[];
  linkDataArray: any[];
};

type ExportOpts = {
  graphLabel?: string;
  groupCategory?: string; // default 'ClusterGroup'
};

const esc = (s: any) => (s ?? '').toString().replace(/"/g, '\\"');
const idPart = (s: any) => String(s).replace(/[^A-Za-z0-9_]/g, '_');
const dotId = (path: string[]) => `n_${path.map(idPart).join('__')}`;
const headerId = (path: string[]) => `${dotId(path)}__hdr`;

const mapShape = (shape?: string) => {
  switch (shape) {
    case 'Rectangle': return 'box';
    case 'RoundedRectangle': return 'box';
    case 'Ellipse': return 'ellipse';
    case 'Diamond': return 'diamond';
    case 'Triangle': return 'triangle';
    case 'TriangleDown': return 'invtriangle';
    case 'Hexagon': return 'hexagon';
    case 'Parallelogram': return 'parallelogram';
    default: return 'box';
  }
};

function nodeAttrs(n: any) {
  const attrs: string[] = [];
  const label = n.label ?? n.text ?? n.name ?? n.key;
  attrs.push(`label="${esc(label)}"`);
  attrs.push(`shape=${mapShape(n.shape)}`);
  const style: string[] = [];
  if (n.shape === 'RoundedRectangle') style.push('rounded');
  style.push('filled');
  if (n.bold) style.push('bold');
  attrs.push(`style="${style.join(',')}"`);
  if (n.fill || n.color) attrs.push(`fillcolor="${esc(n.fill || n.color)}"`);
  if (n.stroke) attrs.push(`color="${esc(n.stroke)}"`);
  attrs.push(`fontname="Helvetica"`);
  return attrs;
}

// Accept both "subDiagram" and "subdiagramData"
function getSubdiagramPayload(n: any): BoxologyModel | null {
  const sd = n?.subDiagram ?? n?.subdiagramData;
  if (!sd) return null;
  if (sd.nodeDataArray && sd.linkDataArray) return sd as BoxologyModel;
  return null;
}

export function modelToDOT(model: BoxologyModel, opts: ExportOpts = {}): string {
  const groupCategory = opts.groupCategory ?? 'ClusterGroup';

  const lines: string[] = [];
  lines.push(`digraph ${esc(opts.graphLabel || 'Boxology')} {`);
  lines.push(`    rankdir=TB;`);
  lines.push(``);

  emitModel(lines, model, [], groupCategory);

  lines.push('}');
  return lines.join('\n');
}

function emitModel(
  lines: string[],
  model: BoxologyModel,
  pathPrefix: string[],
  groupCategory: string
) {
  const nodes = model.nodeDataArray || [];
  const links = model.linkDataArray || [];

  // Helper function to get node identifier (name takes priority over label for DOT node ID)
  const getNodeId = (n: any): string => {
    return n.name || n.label || n.text || n.key;
  };

  // Helper function to get display label (label takes priority over name for display)
  const getDisplayLabel = (n: any): string => {
    return n.label || n.text || n.name || n.key;
  };

  // User groups (clusters)
  const groups = nodes.filter((n: any) => n.isGroup && (!n.category || n.category === groupCategory));
  const groupMembers: Record<string, any[]> = {};
  for (const g of groups) groupMembers[g.key] = [];
  for (const n of nodes) {
    if (!n.isGroup && n.group && groupMembers[n.group]) groupMembers[n.group].push(n);
  }

  // Super nodes
  const superSet = new Set(
    nodes
      .filter((n: any) => !n.isGroup && getSubdiagramPayload(n))
      .map((n: any) => String(n.key))
  );

  // Emit user clusters with only regular members (exclude super nodes)
  for (const g of groups) {
    const gid = idPart(`${g.key}`);
    lines.push(`    // Subgraph - ${esc(getDisplayLabel(g))}`);
    lines.push(`    subgraph cluster_${gid} {`);
    lines.push(`        label="${esc(getDisplayLabel(g))}";`);
    lines.push(`        style=filled;`);
    lines.push(`        color=${esc(g.color || 'lightgrey')};`);
    lines.push(``);
    
    // Define nodes with their attributes using name as ID but label for display
    for (const n of (groupMembers[g.key] || [])) {
      if (superSet.has(String(n.key))) continue;
      
      const nodeId = getNodeId(n);
      const displayLabel = getDisplayLabel(n);
      const shape = mapShape(n.shape);
      const fillcolor = n.fill || n.color || 'white';
      
      lines.push(`        "${esc(displayLabel)}" [label="${esc(nodeId)}", shape=${shape}, fillcolor="${esc(fillcolor)}"];`);
    }
    
    lines.push(`        `);
    lines.push(`    }`);
    lines.push(``);
  }

  // Emit nodes not in any user group and not super nodes
  for (const n of nodes) {
    if (n.isGroup) continue;
    const inUserGroup = !!n.group && groups.some((g: any) => g.key === n.group);
    if (inUserGroup) continue;
    if (superSet.has(String(n.key))) continue;
    
    const nodeId = getNodeId(n);
    const displayLabel = getDisplayLabel(n);
    const shape = mapShape(n.shape);
    const fillcolor = n.fill || n.color || 'white';
    const filled = n.fill || n.color ? true : false;

    lines.push(`    "${esc(displayLabel)}" [label="${esc(nodeId)}", shape=${shape}, style=${filled ? 'filled' : 'unfilled'}, fillcolor="${esc(fillcolor)}"];`);
  }

  // Emit subdiagram clusters (recursive)
  for (const n of nodes) {
    if (n.isGroup) continue;
    const sd = getSubdiagramPayload(n);
    if (!sd) continue;

    const path = [...pathPrefix, String(n.key)];
    const cid = `cluster_sd_${dotId(path)}`;
    const displayLabel = getDisplayLabel(n);
    const clusterStyle = (n.clusterStyle || 'filled').replace(/\s+/g, '');
    const clusterColor = n.clusterColor || 'lightgrey';

    lines.push(`    // Subgraph - ${esc(displayLabel)}`);
    lines.push(`    subgraph ${cid} {`);
    lines.push(`        label="${esc(displayLabel)}";`);
    lines.push(`        style=${clusterStyle};`);
    lines.push(`        color=${esc(clusterColor)};`);
    lines.push(``);

    const hdr = headerId(path);
    const hdrAttrs = [
      `label="${esc(displayLabel)}"`,
      `shape=box`,
      `fillcolor="white"`
    ];
    lines.push(`        ${hdr} [${hdrAttrs.join(', ')}];`);

    // Recurse into subdiagram content
    emitModel(lines, sd, path, groupCategory);

    lines.push(`    }`);
    lines.push(``);
  }

  // Emit edges at the end, using node names (not labels) as identifiers
  if (links && links.length > 0) {
    for (const l of links) {
      const fromNode = nodes.find((n: any) => n.key === l.from);
      const toNode = nodes.find((n: any) => n.key === l.to);
      
      if (fromNode && toNode) {
        const fromNodeId = getDisplayLabel(fromNode);
        const toNodeId = getDisplayLabel(toNode);

        const fromIsSuper = superSet.has(String(l.from));
        const toIsSuper = superSet.has(String(l.to));
        
        const fromId = fromIsSuper ? headerId([...pathPrefix, String(l.from)]) : `"${esc(fromNodeId)}"`;
        const toId = toIsSuper ? headerId([...pathPrefix, String(l.to)]) : `"${esc(toNodeId)}"`;
        
        lines.push(`        ${fromId} -> ${toId};`);
      }
    }
  }
}