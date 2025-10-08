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
  lines.push(`  graph [compound=true, rankdir=TB, bgcolor="white"];`);
  lines.push(`  node  [style="filled", fontname="Helvetica"];`);
  lines.push(`  edge  [color="#555555"];`);

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
    const gid = idPart(`g_${g.key}`);
    lines.push(`  subgraph cluster_${gid} {`);
    lines.push(`    label="${esc(g.label ?? g.text ?? g.key)}";`);
    lines.push(`    style="filled";`);
    lines.push(`    color="${esc(g.color || '#d3d3d3')}";`);
    for (const n of (groupMembers[g.key] || [])) {
      if (superSet.has(String(n.key))) continue;
      const path = [...pathPrefix, String(n.key)];
      const attrs = nodeAttrs(n);
      attrs.push(`path="${esc(path.join('/'))}"`);
      lines.push(`    ${dotId(path)} [${attrs.join(', ')}];`);
    }
    lines.push('  }');
  }

  // Emit nodes not in any user group and not super nodes
  for (const n of nodes) {
    if (n.isGroup) continue;
    const inUserGroup = !!n.group && groups.some((g: any) => g.key === n.group);
    if (inUserGroup) continue;
    if (superSet.has(String(n.key))) continue;
    const path = [...pathPrefix, String(n.key)];
    const attrs = nodeAttrs(n);
    attrs.push(`path="${esc(path.join('/'))}"`);
    lines.push(`  ${dotId(path)} [${attrs.join(', ')}];`);
  }

  // Emit subdiagram clusters (recursive)
  for (const n of nodes) {
    if (n.isGroup) continue;
    const sd = getSubdiagramPayload(n);
    if (!sd) continue;

    const path = [...pathPrefix, String(n.key)];
    const cid = `cluster_sd_${dotId(path)}`;
    const label = n.label ?? n.text ?? n.name ?? n.key;
    const clusterStyle = (n.clusterStyle || 'filled,rounded').replace(/\s+/g, '');
    const clusterColor = n.clusterColor || '#e9ecef';

    lines.push(`  subgraph ${cid} {`);
    lines.push(`    label="${esc(label)}";`);
    lines.push(`    style="${clusterStyle}";`);
    lines.push(`    color="${esc(clusterColor)}";`);
    lines.push(`    sd="1";`);
    lines.push(`    path="${esc(path.join('/'))}";`);

    const hdr = headerId(path);
    const hdrAttrs = [
      `label="${esc(label)}"`,
      `shape=box`,
      `style="bold,filled"`,
      `fillcolor="white"`,
      `role="header"`,
      `nodeRef="${esc(String(n.key))}"`,
      `path="${esc(path.join('/'))}"`
    ];
    lines.push(`    ${hdr} [${hdrAttrs.join(', ')}];`);

    // Recurse into subdiagram content
    emitModel(lines, sd, path, groupCategory);

    lines.push('  }');
  }

  // Emit edges; if endpoint is super, connect to header
  for (const l of (links || [])) {
    const fromIsSuper = superSet.has(String(l.from));
    const toIsSuper = superSet.has(String(l.to));

    const fromPath = [...pathPrefix, String(l.from)];
    const toPath = [...pathPrefix, String(l.to)];

    const fromId = fromIsSuper ? headerId(fromPath) : dotId(fromPath);
    const toId = toIsSuper ? headerId(toPath) : dotId(toPath);

    const attrs: string[] = [];
    if (l.label) attrs.push(`label="${esc(l.label)}"`);
    if (l.color) attrs.push(`color="${esc(l.color)}"`);
    lines.push(
      attrs.length
        ? `  ${fromId} -> ${toId} [${attrs.join(', ')}];`
        : `  ${fromId} -> ${toId};`
    );
  }
}