// exportHelpers.ts
import * as go from "gojs";

/** 1) Canonical process names (semantic, not UI) */
const PROCESS_SET = new Set<string>([
  "generate",
  "generate:train",
  "generate:engineer",
  "infer:deduce",
  "model:semantic",
  "model:statistics",
  "infer",
  "deduce",
  "transform",
  "transform:embed",
]);

/** 2) Normalize to compare safely */
const norm = (s?: string) => (s ?? "").trim().toLowerCase();

/** 3) True iff node is a *process* by its semantic name (NEVER by label) */
function isProcessNode(n: any): boolean {
  const name = norm(n.name);
  return PROCESS_SET.has(name);
}

/** 4) Build a plain component object (name = semantic, label = UI display) */
function toComponent(n: any) {
  return {
    id: n.key,
    name: n.type ?? n.name ?? "",  // 🔧 FIX: Use type field (not subtype)
    label: n.label ?? n.text ?? "",
  };
}

/** 5) Main export function */
export function exportBoxologyJSON(diagram: go.Diagram) {
  const model = diagram.model as go.GraphLinksModel;
  const nodes = model.nodeDataArray;
  const links = model.linkDataArray;

  const nodeByKey = new Map<string, any>(nodes.map((n: any) => [n.key, n]));
  
  // Find all groups (clusters)
  const groups = nodes.filter((n: any) => n.category === 'ClusterGroup');

  const patterns: any[] = [];

  // For each group, build a DesignPattern
  for (const g of groups) {
    // 1) Find nodes inside this group
    const inside = nodes.filter((n: any) => n.group === g.key);
    const insideKeys = new Set(inside.map((n: any) => n.key));

    // 2) Internal links (both endpoints inside group)
    const internal = links.filter(
      (L: any) => insideKeys.has(L.from) && insideKeys.has(L.to)
    );
    
    // 3) Outgoing links (from inside to outside)
    const outgoing = links.filter(
      (L: any) => insideKeys.has(L.from) && !insideKeys.has(L.to)
    );

    // 4) Find process nodes
    const processNodes = inside.filter((n: any) => isProcessNode(n));

    // 5) Build inputs: non-process nodes that connect TO a process
    const inputMap = new Map<string, any>();
    for (const L of internal) {
      const src = nodeByKey.get(L.from);
      const tgt = nodeByKey.get(L.to);
      if (src && tgt && !isProcessNode(src) && isProcessNode(tgt)) {
        inputMap.set(src.key, toComponent(src));
      }
    }

    // 6) Build outputs: non-process nodes that receive FROM a process
    const outputsMap = new Map<string, any>();
    for (const L of internal) {
      const src = nodeByKey.get(L.from);
      const tgt = nodeByKey.get(L.to);
      if (src && tgt && isProcessNode(src) && !isProcessNode(tgt)) {
        outputsMap.set(tgt.key, toComponent(tgt));
      }
    }

    // 7) Build process field
    let process: any = undefined;
    if (processNodes.length === 1) {
      const p = processNodes[0];
      process = {
        id: p.key,
        name: p.type ?? p.name ?? "",  // 🔧 FIX: Use type field
        label: p.label ?? p.text ?? "",
      };
    } else if (processNodes.length > 1) {
      process = processNodes.map((p: any) => ({
        id: p.key,
        name: p.type ?? p.name ?? "",  // 🔧 FIX: Use type field
        label: p.label ?? p.text ?? "",
      }));
    }

    // 8) Convert to arrays
    const inputArr = Array.from(inputMap.values());
    const outputArr = Array.from(outputsMap.values());

    // 9) Output field: single object if one output, else array
    const outputField = outputArr.length === 1 ? outputArr[0] : outputArr;

    patterns.push({
      id: g.key,
      label: g.label ?? g.text ?? "DesignPattern",
      input: inputArr,
      output: outputField,
      process,
    });
  }

  // SECOND PASS: cross-pattern connections (shared components)
  for (const link of links) {
    const fromNode = nodeByKey.get(link.from);
    const toNode = nodeByKey.get(link.to);
    if (!fromNode || !toNode) continue;

    const fromGroup = fromNode.group;
    const toGroup = toNode.group;

    // If link crosses patterns and target is a process
    if (fromGroup && toGroup && fromGroup !== toGroup) {
      if (isProcessNode(toNode)) {
        const targetPattern = patterns.find((p) => p.id === toGroup);
        if (targetPattern) {
          const sharedComp = toComponent(fromNode);
          const alreadyExists = targetPattern.input.some(
            (inp: any) => inp.id === sharedComp.id
          );
          if (!alreadyExists) {
            targetPattern.input.push(sharedComp);
          }
        }
      }
    }
  }

  // Calculate shared components
  const appearances = new Map<string, number>();
  for (const p of patterns) {
    const add = (c: any) => {
      if (c && c.id) {
        appearances.set(c.id, (appearances.get(c.id) ?? 0) + 1);
      }
    };
    if (p.input && Array.isArray(p.input)) {
      for (const c of p.input) add(c);
    }
    const outs = Array.isArray(p.output) ? p.output : p.output ? [p.output] : [];
    for (const c of outs) add(c);
  }
  const sharedComponents = [...appearances.entries()]
    .filter(([, cnt]) => cnt > 1)
    .map(([id]) => id);

  return {
    id: "id1",
    label: "Boxology",
    DesignPattern: patterns,
    sharedComponents,
  };
}

/**
 * Export all pages in RML-compatible format
 */
export const generateMultiPageRMLExport = (pages: any[]): any => {
  const boxologies = pages.map(page => {
    const nodes = page.nodeDataArray || [];
    const links = page.linkDataArray || [];
    
    console.log('📦 Processing page:', page.name);
    console.log('  Total nodes:', nodes.length);
    console.log('  Total links:', links.length);
    console.log('  Node sample:', nodes.slice(0, 3));
    
    const nodeByKey = new Map<string, any>(nodes.map((n: any) => [n.key, n]));
    
    // Check for groups
    const groups = nodes.filter((n: any) => n.isGroup === true);
    console.log('  Groups found:', groups.length);
    console.log('  Group details:', groups.map((g: { key: string; label?: string; isGroup: boolean; category?: string }) => ({
      key: g.key,
      label: g.label,
      isGroup: g.isGroup,
      category: g.category
    })));
    
    const patterns: any[] = [];
    
    for (const g of groups) {
      console.log(`\n  Processing group: ${g.key} - ${g.label}`);
      
      const inside = nodes.filter((n: any) => n.group === g.key);
      console.log(`    Nodes inside: ${inside.length}`, inside.map((n: any) => `${n.key}(${n.name})`));
      
      const insideKeys = new Set(inside.map((n: any) => n.key));
      
      const internal = links.filter(
        (L: any) => insideKeys.has(L.from) && insideKeys.has(L.to)
      );
      console.log(`    Internal links: ${internal.length}`, internal.map((l: any) => `${l.from}→${l.to}`));
      
      const processNodes = inside.filter((n: any) => isProcessNode(n));
      console.log(`    Process nodes: ${processNodes.length}`, processNodes.map((p: any) => p.name));
      
      const inputMap = new Map<string, any>();
      for (const L of internal) {
        const src = nodeByKey.get(L.from);
        const tgt = nodeByKey.get(L.to);
        if (src && tgt && !isProcessNode(src) && isProcessNode(tgt)) {
          console.log(`      INPUT: ${src.name} → ${tgt.name}`);
          inputMap.set(src.key, toComponent(src));
        }
      }
      
      const outputsMap = new Map<string, any>();
      for (const L of internal) {
        const src = nodeByKey.get(L.from);
        const tgt = nodeByKey.get(L.to);
        if (src && tgt && isProcessNode(src) && !isProcessNode(tgt)) {
          console.log(`      OUTPUT: ${src.name} → ${tgt.name}`);
          outputsMap.set(tgt.key, toComponent(tgt));
        }
      }
      
      let process: any = undefined;
      if (processNodes.length === 1) {
        const p = processNodes[0];
        process = {
          id: p.key,
          name: p.name,
          label: p.label ?? p.text ?? "",
        };
      } else if (processNodes.length > 1) {
        process = processNodes.map((p: any) => ({
          id: p.key,
          name: p.name,
          label: p.label ?? p.text ?? "",
        }));
      }
      
      const inputArr = Array.from(inputMap.values());
      const outputArr = Array.from(outputsMap.values());
      const outputField = outputArr.length === 1 ? outputArr[0] : outputArr;
      
      console.log(`    Final - Inputs: ${inputArr.length}, Outputs: ${outputArr.length}, Process: ${process ? 'Yes' : 'No'}`);
      
      patterns.push({
        id: g.key,
        label: g.label ?? g.text ?? "DesignPattern",
        input: inputArr,
        output: outputField,
        process,
      });
    }
    
    // Second pass for cross-pattern links
    for (const link of links) {
      const fromNode = nodeByKey.get(link.from);
      const toNode = nodeByKey.get(link.to);
      
      if (!fromNode || !toNode) continue;
      
      const fromGroup = fromNode.group;
      const toGroup = toNode.group;
      
      if (fromGroup && toGroup && fromGroup !== toGroup && isProcessNode(toNode)) {
        console.log(`  Cross-pattern link: ${fromNode.name}[${fromGroup}] → ${toNode.name}[${toGroup}]`);
        const targetPattern = patterns.find(p => p.id === toGroup);
        if (targetPattern) {
          const sharedComp = toComponent(fromNode);
          const alreadyExists = targetPattern.input.some((inp: any) => inp.id === sharedComp.id);
          if (!alreadyExists) {
            console.log(`    Adding shared input: ${fromNode.name}`);
            targetPattern.input.push(sharedComp);
          }
        }
      }
    }
    
    console.log(`\n✅ Page complete - ${patterns.length} patterns created\n`);
    
    return {
      id: page.id.replace(/-/g, '_'),
      label: page.name,
      DesignPattern: patterns
    };
  });
  
  return { boxologies };
};
