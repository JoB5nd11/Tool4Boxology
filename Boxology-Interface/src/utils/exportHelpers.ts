// exportHelpers.ts
import * as go from "gojs";

/** 1) Canonical process names (semantic, not UI) - UPDATED to match BoxologyValidation.js */
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

/** 4) Build a plain component object (keep both name + UI label, but label is display-only) */
function toComponent(n: any) {
  return {
    id: n.key,
    name: n.name ?? "",
    label: n.label ?? n.text ?? "",
  };
}

/** 5) Main export - Uses raw GoJS model data like save function */
export function exportBoxologyJSON(diagram: go.Diagram) {
  const model = diagram.model as go.GraphLinksModel;
  
  // Get raw data directly from model (like save function does)
  const rawJson = JSON.parse(model.toJson());
  const nodes = rawJson.nodeDataArray || [];
  const links = rawJson.linkDataArray || [];

  console.log("🔍 Export Debug - Total nodes:", nodes.length);
  console.log("🔍 Export Debug - Total links:", links.length);
  console.log("🔍 All links:", links);

  const nodeByKey = new Map<string, any>(nodes.map((n: any) => [n.key, n]));
  const groups = nodes.filter((n: any) => n.isGroup);

  console.log("🔍 Export Debug - Groups found:", groups.length);

  const patterns: any[] = [];

  // Build each pattern
  for (const g of groups) {
    console.log(`\n🔍 Processing group: ${g.key} - ${g.label}`);
    
    // Get all nodes inside this group
    const inside = nodes.filter((n: any) => !n.isGroup && n.group === g.key);
    const insideKeys = new Set(inside.map((n: any) => n.key));
    
    console.log(`  Nodes inside: ${inside.map((n: any) => `${n.key}(${n.name})`).join(', ')}`);

    // Get all links related to this group
    const internal = links.filter((L: any) => insideKeys.has(L.from) && insideKeys.has(L.to));
    const outgoing = links.filter((L: any) => insideKeys.has(L.from) && !insideKeys.has(L.to));

    console.log(`  Internal links: ${internal.length}, Outgoing: ${outgoing.length}`);

    // Find process nodes
    const processNodes = inside.filter((n: any) => isProcessNode(n));
    console.log(`  Process nodes: ${processNodes.map((p: any) => p.key).join(', ')}`);

    // INPUTS: nodes that connect TO a process
    const inputMap = new Map<string, any>();
    
    // Check internal connections to process
    for (const L of internal) {
      const src = nodeByKey.get(L.from);
      const tgt = nodeByKey.get(L.to);
      if (src && tgt && !isProcessNode(src) && isProcessNode(tgt)) {
        console.log(`    INPUT (internal): ${src.key}(${src.name}) → ${tgt.key}(${tgt.name})`);
        inputMap.set(src.key, toComponent(src));
      }
    }

    // OUTPUTS: nodes that receive FROM a process
    const outputsMap = new Map<string, any>();
    
    for (const L of internal) {
      const src = nodeByKey.get(L.from);
      const tgt = nodeByKey.get(L.to);
      if (src && tgt && isProcessNode(src) && !isProcessNode(tgt)) {
        console.log(`    OUTPUT (internal): ${src.key}(${src.name}) → ${tgt.key}(${tgt.name})`);
        outputsMap.set(tgt.key, toComponent(tgt));
      }
    }

    // Build process object
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

    patterns.push({
      id: g.key,
      label: g.label ?? g.text ?? "DesignPattern",
      input: inputArr,
      output: outputField,
      process,
    });
  }

  // SECOND PASS: Handle cross-pattern connections (shared components)
  console.log("\n🔍 Second Pass - Looking for cross-pattern links:");
  
  for (const link of links) {
    const fromNode = nodeByKey.get(link.from);
    const toNode = nodeByKey.get(link.to);
    
    if (!fromNode || !toNode) {
      console.log(`  ⚠️ Link references missing node: ${link.from} → ${link.to}`);
      continue;
    }
    
    const fromGroup = fromNode.group;
    const toGroup = toNode.group;
    
    // Cross-pattern link detected
    if (fromGroup && toGroup && fromGroup !== toGroup) {
      console.log(`  🔗 Cross-pattern link found: ${fromNode.key}(${fromNode.name}) [${fromGroup}] → ${toNode.key}(${toNode.name}) [${toGroup}]`);
      
      // If target is a process, source becomes input to target's pattern
      if (isProcessNode(toNode)) {
        const targetPattern = patterns.find(p => p.id === toGroup);
        if (targetPattern) {
          const sharedComp = toComponent(fromNode);
          const alreadyExists = targetPattern.input.some((inp: any) => inp.id === sharedComp.id);
          
          if (!alreadyExists) {
            console.log(`    ✅ Adding ${fromNode.key}(${fromNode.name}) as INPUT to pattern ${toGroup}`);
            targetPattern.input.push(sharedComp);
          } else {
            console.log(`    ℹ️ ${fromNode.key} already exists as input in pattern ${toGroup}`);
          }
        } else {
          console.log(`    ⚠️ Target pattern ${toGroup} not found!`);
        }
      } else {
        console.log(`    ℹ️ Target ${toNode.key}(${toNode.name}) is not a process, skipping`);
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
    const outs = Array.isArray(p.output) ? p.output : (p.output ? [p.output] : []);
    for (const c of outs) add(c);
  }
  
  const sharedComponents = [...appearances.entries()]
    .filter(([, cnt]) => cnt > 1)
    .map(([id]) => id);

  console.log("\n🔍 Final shared components:", sharedComponents);
  console.log("\n🔍 Final patterns:", JSON.stringify(patterns, null, 2));

  return {
    id: "id1",
    label: "Boxology",
    DesignPatterns: patterns,
    sharedComponents,
  };
}

/**
 * Export all pages in RML-compatible format
 */
export const generateMultiPageRMLExport = (pages: any[]): any => {
  const boxologies = pages.map(page => {
    // Use the same logic as exportBoxologyJSON but for page data
    const nodes = page.nodeDataArray || [];
    const links = page.linkDataArray || [];
    
    const nodeByKey = new Map<string, any>(nodes.map((n: any) => [n.key, n]));
    const groups = nodes.filter((n: any) => n.isGroup);
    
    const patterns: any[] = [];
    
    for (const g of groups) {
      const inside = nodes.filter((n: any) => !n.isGroup && n.group === g.key);
      const insideKeys = new Set(inside.map((n: any) => n.key));
      
      const internal = links.filter((L: any) => insideKeys.has(L.from) && insideKeys.has(L.to));
      
      const processNodes = inside.filter((n: any) => isProcessNode(n));
      
      const inputMap = new Map<string, any>();
      for (const L of internal) {
        const src = nodeByKey.get(L.from);
        const tgt = nodeByKey.get(L.to);
        if (src && tgt && !isProcessNode(src) && isProcessNode(tgt)) {
          inputMap.set(src.key, toComponent(src));
        }
      }
      
      const outputsMap = new Map<string, any>();
      for (const L of internal) {
        const src = nodeByKey.get(L.from);
        const tgt = nodeByKey.get(L.to);
        if (src && tgt && isProcessNode(src) && !isProcessNode(tgt)) {
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
        const targetPattern = patterns.find(p => p.id === toGroup);
        if (targetPattern) {
          const sharedComp = toComponent(fromNode);
          const alreadyExists = targetPattern.input.some((inp: any) => inp.id === sharedComp.id);
          if (!alreadyExists) {
            targetPattern.input.push(sharedComp);
          }
        }
      }
    }
    
    return {
      id: page.id.replace(/-/g, '_'),
      label: page.name,
      DesignPattern: patterns
    };
  });
  
  return { boxologies };
};

/**
 * Enhanced JSON export that generates RML-compatible structure - NOT USED
 */
export const generateRMLCompatibleJSON = (diagram: go.Diagram): any => {
  return exportBoxologyJSON(diagram);
};
