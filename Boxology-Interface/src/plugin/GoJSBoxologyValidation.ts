import * as go from "gojs";

// --- Pattern and connection rules ---

const validNext: Record<string, string[]> = {
	"actor": ["engineering", "actor", "transform","deduce"],
	"artifacts": ["artifacts","symbol", "data","deduce","engineering", "transform:embed", "generate", "transform", "generate", "training"],
  "symbol": ["deduce", "training", "generate","engineering", "embed", "transform", "symbol", "artifacts"],
  "data": ["deduce", "training", "generate","engineering", "transform", "data", "embed", "artifacts"],
  "deduce": ["symbol", "model", "deduce", "data", "artifacts", "SemanticModel", "StatisticalModel"],
  "model": ["deduce", "model", "generate", "training","engineering", "StatisticalModel", "SemanticModel", "embed", "transform"],
  "training": ["model", "training", "SemanticModel", "StatisticalModel", "training", "generate"],
  "generate": ["model", "generate", "SemanticModel", "StatisticalModel", "data", "symbol", "artifacts","training","engineering"],
  "engineering": ["model","StatisticalModel","SemanticModel", "engineering", "generate", "data", "symbol", "artifacts"],
  "SemanticModel": ["deduce", "model", "generate", "training", "StatisticalModel", "SemanticModel", "embed", "transform"],
  "StatisticalModel": ["deduce", "model", "generate", "training", "StatisticalModel", "SemanticModel", "embed", "transform"],
  "embed": ["data", "embed", "symbol", "transform", "SemanticModel", "StatisticalModel", "artifacts", "model"],
  "transform": ["data", "symbol", "artifacts", "transform", "embed", "model", "SemanticModel", "StatisticalModel"],
  "infer": ["symbol", "model", "data", "artifacts"],
  "induce": ["symbol", "model", "data", "artifacts"],
};

const allPatterns: { name: string; edges: [string, string][] }[] = [
  // Train model with artifacts
  { name: "train_model (symbol)", edges: [["symbol", "training"], ["training", "model"]] },
  { name: "train_model (data)", edges: [["data", "training"], ["training", "model"]] },
  { name: "generate_model from model and data ", edges: [["model", "training"], ["data", "training"], ["training", "model"]] },
  { name: "generate_model from model and symbol ", edges: [["model", "training"], ["symbol", "training"], ["training", "model"]] },
  { name: "generate_model from model and artifacts ", edges: [["model", "training"], ["artifacts", "training"], ["training", "model"]] },
  
  // Transform data with symbol/artifacts/data
  { name: "transform to data (symbol)", edges: [["symbol", "transform"], ["transform", "data"]] },
  { name: "transform to data (data)", edges: [["data", "transform"], ["transform", "data"]] },
  { name: "transform to symbol (data)", edges: [["data", "transform"], ["transform", "symbol"]] },
  { name: "transform to symbol (symbol)", edges: [["symbol", "transform"], ["transform", "symbol"]] },
  { name: "transform_model (model)", edges: [["model", "transform"], ["transform", "model"]] },
  
  //engineer model from actor and artifacts
  { name: "actor engineer model", edges: [["actor", "engineering"], ["engineering", "model"]] },
  { name: "actor engineer data from data", edges: [["actor", "engineering"], ["data", "engineering"], ["engineering", "data"]] },
  { name: "actor engineer symbol", edges: [["actor", "engineering"], ["engineering", "symbol"]] },
  { name: "actor engineer data", edges: [["actor", "engineering"], ["engineering", "data"]] },
  { name: "actor engineer symbol from symbol", edges: [["actor", "engineering"], ["symbol", "engineering"], ["engineering", "symbol"]] },
  { name: "actor engineer model from model", edges: [["actor", "engineering"], ["model", "engineering"], ["engineering", "model"]] },
  { name: "actor engineer data from model", edges: [["actor", "engineering"], ["model", "engineering"], ["engineering", "data"]] },
  { name: "actor engineer symbol from model", edges: [["actor", "engineering"], ["model", "engineering"], ["engineering", "symbol"]] },
  { name: "actor engineer model from symbol", edges: [["actor", "engineering"], ["symbol", "engineering"], ["engineering", "model"]] },
  { name: "actor engineer model from data", edges: [["actor", "engineering"], ["data", "engineering"], ["engineering", "model"]] },
  { name: "actor engineer data from symbol", edges: [["actor", "engineering"], ["symbol", "engineering"], ["engineering", "data"]] },
  { name: "actor engineer symbol from data", edges: [["actor", "engineering"], ["data", "engineering"], ["engineering", "symbol"]] },

  { name: "infer_symbol (symbol → model → symbol)", edges: [["model", "deduce"], ["symbol", "deduce"], ["deduce", "symbol"]] },
  { name: "infer_symbol (data → model → symbol)", edges: [["model", "deduce"], ["data", "deduce"], ["deduce", "symbol"]] },
  { name: "infer_model (symbol → model → model)", edges: [["model", "deduce"], ["symbol", "deduce"], ["deduce", "model"]] },
  { name: "infer_model (data → model → model)", edges: [["model", "deduce"], ["data", "deduce"], ["deduce", "model"]] },
  { name: "infer_data (data → model → data)", edges: [["model", "deduce"], ["data", "deduce"], ["deduce", "data"]] },
  { name: "infer_data (symbol → model → data)", edges: [["model", "deduce"], ["symbol", "deduce"], ["deduce", "data"]] },
  { name: "embed transform", edges: [["symbol", "embed"], ["data", "embed"], ["embed", "model"]] },

  { name: "data-symbol transform", edges: [["symbol", "transform"], ["data", "transform"], ["transform", "data"]] },

  { name: "infer symbol from more model", edges: [["model", "deduce"], ["data", "deduce"], ["deduce", "symbol"]] }
];

// --- Utility functions ---
function getNodeName(node: go.Node): string {
  // Use only the stable semantic identity
  const nm = (node.data?.name ?? '').toString().trim();
  return nm || (node.data?.key?.toString() ?? 'Unnamed');
}

function isIgnorable(node: go.Node): boolean {
  // Ignore by stable name (not label). Also ignore groups.
  const ignored = new Set([
    'comment', 'cluster', 'text', 'note', 'conditions', 'description',
    'pre-conditions', 'post-condition'
  ]);

  // Ignore GoJS Group nodes (clusters)
  if (node instanceof go.Group) return true;
  if (node.category === 'ClusterGroup') return true;

  const nm = (node.data?.name ?? '').toString().toLowerCase().trim();
  return nm.length > 0 && ignored.has(nm);
}

// --- Merge duplicate nodes (by name) if connected ---
function mergeIdenticalNodes(diagram: go.Diagram, fromNode: go.Node, toNode: go.Node) {
  if (!fromNode || !toNode) return;
  if (getNodeName(fromNode) !== getNodeName(toNode)) return;
  if (fromNode.key === toNode.key) return;

  const model = diagram.model as go.GraphLinksModel;
  model.startTransaction("merge nodes");

  // 🎯 FIRST: Remove the connecting link between the two identical nodes
  const connectingLinks = [...diagram.links].filter(link => 
    (link.fromNode === fromNode && link.toNode === toNode) ||
    (link.fromNode === toNode && link.toNode === fromNode)
  );
  
  connectingLinks.forEach(link => {
    model.removeLinkData(link.data);
  });

  // THEN: Rewire all OTHER links of toNode to fromNode
  diagram.links.each(link => {
    // Skip the links we just removed
    if (connectingLinks.includes(link)) return;
    
    if (link.fromNode === toNode) {
      model.set(link.data, "from", fromNode.key);
    }
    if (link.toNode === toNode) {
      model.set(link.data, "to", fromNode.key);
    }
  });

  // Finally: Remove the duplicate node
  model.removeNodeData(toNode.data);

  model.commitTransaction("merge nodes");
}

// --- Prevent invalid edges and merge on link creation ---
export function setupDiagramValidation(diagram: go.Diagram) {
  // Prevent invalid connections and merge duplicate nodes
  diagram.addDiagramListener("LinkDrawn", e => {
    const link = e.subject as go.Link;
    if (!link.fromNode || !link.toNode) return;

    const fromName = getNodeName(link.fromNode);
    const toName = getNodeName(link.toNode);

    // Prevent invalid connection by rule table
    if (!validNext[fromName] || !validNext[fromName].includes(toName)) {
      diagram.model.startTransaction("remove invalid link");
      (diagram.model as go.GraphLinksModel).removeLinkData(link.data);
      diagram.model.commitTransaction("remove invalid link");
      alert("Invalid connection. Edge removed.");
      return;
    }

    // Enforce process output cardinality: exactly one of symbol/model/data
    if (PROCESS_NODES.has(fromName) && OUTPUT_TARGETS.has(toName)) {
      const outCount = countProcessOutputs(link.fromNode);
      if (outCount > 1) {
        diagram.model.startTransaction("enforce process output cardinality");
        (diagram.model as go.GraphLinksModel).removeLinkData(link.data);
        diagram.model.commitTransaction("enforce process output cardinality");
        alert("A process can have exactly one output (symbol, model, or data).");
        return;
      }
    }

    // 🎯 FIXED: Only merge nodes if they have SAME NAME AND SAME LABEL
    const fromLabel = link.fromNode.data.label || "";
    const toLabel = link.toNode.data.label || "";
    
    if (fromName === toName && fromLabel === toLabel) {
      // Same name AND same label = merge required
      mergeIdenticalNodes(diagram, link.fromNode, link.toNode);
    }
    // If same name but different labels = allow connection (no merge)
  });
}

// --- Pattern validation for selection ---
export function validateGoJSDiagram(diagram: go.Diagram): string {
  const selection = diagram.selection;
  if (selection.count === 0) {
    return "⚠️ No selection made! Please select a pattern before validation.";
  }

  // Gather nodes and links from selection
  const nodes: go.Node[] = [];
  const links: go.Link[] = [];
  selection.each(part => {
    if (part instanceof go.Node && !isIgnorable(part)) nodes.push(part);
    else if (part instanceof go.Link && part.fromNode && part.toNode) links.push(part);
  });

  // Cardinality issues within the selection
  const tooManyOutputs: string[] = [];
  const missingOutputs: string[] = [];

  nodes.forEach(node => {
    const name = getNodeName(node);
    if (!PROCESS_NODES.has(name)) return;
    const outSel = links.filter(l =>
      l.fromNode === node &&
      l.toNode &&
      OUTPUT_TARGETS.has(getNodeName(l.toNode))
    ).length;
    if (outSel > 1) tooManyOutputs.push(name);
    if (outSel === 0) missingOutputs.push(name);
  });

  // Group nodes by name (logical nodes)
  const nodesByName: { [logicalName: string]: go.Node[] } = {};
  nodes.forEach(node => {
    const nodeName = getNodeName(node);
    if (!nodesByName[nodeName]) nodesByName[nodeName] = [];
    nodesByName[nodeName].push(node);
  });

  // Map node key to logical name
  const nodeKeyToLogicalName: { [key: string]: string } = {};
  Object.entries(nodesByName).forEach(([logicalName, nodeArr]) => {
    nodeArr.forEach(node => {
      nodeKeyToLogicalName[node.data.key] = logicalName;
    });
  });

  // Extract edge names as [sourceName, targetName]
  const edgeNameList: [string, string][] = links.map(link => [
    getNodeName(link.fromNode!),
    getNodeName(link.toNode!)
  ]);

  // Pattern matching
  const matchedPatterns: { name: string }[] = [];
  const matchedLogicalNodes = new Set<string>();
  const matchedNodesByPattern: { [pattern: string]: Set<string> } = {};
  const usedEdgeIndices = new Set<number>();

  allPatterns.forEach(pattern => {
    const required = [...pattern.edges];
    const tempEdges = edgeNameList.map((edge, i) => ({ edge, i }));

    while (true) {
      const currentMatchIndices: number[] = [];
      const involvedLogicalNodes = new Set<string>();
      let stillValid = true;

      for (const [from, to] of required) {
        const match = tempEdges.find(({ edge: [s, t], i }) =>
          s === from && t === to && !usedEdgeIndices.has(i)
        );
        if (!match) {
          stillValid = false;
          break;
        }
        currentMatchIndices.push(match.i);
        const sourceLogicalName = nodeKeyToLogicalName[links[match.i].fromNode!.data.key];
        const targetLogicalName = nodeKeyToLogicalName[links[match.i].toNode!.data.key];
        if (sourceLogicalName) involvedLogicalNodes.add(sourceLogicalName);
        if (targetLogicalName) involvedLogicalNodes.add(targetLogicalName);
      }

      if (!stillValid) break;

      matchedPatterns.push({ name: pattern.name });
      matchedNodesByPattern[pattern.name] = matchedNodesByPattern[pattern.name] || new Set();
      currentMatchIndices.forEach(i => usedEdgeIndices.add(i));
      involvedLogicalNodes.forEach(logicalName => {
        matchedLogicalNodes.add(logicalName);
        matchedNodesByPattern[pattern.name].add(logicalName);
      });
    }
  });

  // Find unmatched logical nodes
  const unmatchedLogicalNodes = Object.keys(nodesByName).filter(
    logicalName => !matchedLogicalNodes.has(logicalName)
  );

  // Find isolated logical nodes (no connections)
  const isolatedLogicalNodes = Object.entries(nodesByName).filter(([logicalName, nodeArr]) => {
    return !nodeArr.some(node => node.findLinksConnected().count > 0);
  }).map(([logicalName]) => logicalName);

  // Find disconnected nodes (no in/out edges)
  const disconnectedNodes = nodes.filter(node => {
    return node.findLinksConnected().count === 0;
  });

  // Build result summary
  if (
    matchedPatterns.length > 0 &&
    unmatchedLogicalNodes.length === 0 &&
    isolatedLogicalNodes.length === 0 &&
    disconnectedNodes.length === 0 &&
    tooManyOutputs.length === 0 &&
    missingOutputs.length === 0
  ) {
    let summary = "✅ Valid pattern(s) detected:\n\n";
    for (const [pattern] of Object.entries(matchedNodesByPattern)) {
      summary += `• ${pattern}\n`;
    }
    return summary;
  } else {
    let summary = "❌ Invalid pattern: Issues detected.\n\n";
    if (matchedPatterns.length > 0) {
      summary += "✅ Partial matches found:\n";
      for (const [pattern] of Object.entries(matchedNodesByPattern)) {
        summary += `  • ${pattern}\n`;
      }
    }
    if (tooManyOutputs.length > 0) {
      summary += `\n⚠️ Processes with more than one output (symbol/model/data): ${Array.from(new Set(tooManyOutputs)).join(", ")}`;
    }
    if (missingOutputs.length > 0) {
      summary += `\n⚠️ Processes with no output (symbol/model/data): ${Array.from(new Set(missingOutputs)).join(", ")}`;
    }
    if (unmatchedLogicalNodes.length > 0) {
      summary += `\n⚠️ Unmatched logical nodes: ${unmatchedLogicalNodes.join(", ")}`;
    }
    if (isolatedLogicalNodes.length > 0) {
      summary += `\n⚠️ Isolated logical nodes: ${isolatedLogicalNodes.join(", ")}`;
    }
    if (disconnectedNodes.length > 0) {
      const disconnectedLabels = disconnectedNodes.map(node =>
        getNodeName(node) || "Unnamed"
      );
      summary += `\n⚠️ Disconnected nodes: ${disconnectedLabels.join(", ")}`;
    }
    return summary;
  }
}

// --- Pattern validation for entire diagram ---
export function validateEntireDiagram(diagram: go.Diagram): string {
  console.log('🔍 Starting comprehensive diagram validation...');
  
  // Gather ALL nodes and links from the diagram
  const nodes: go.Node[] = [];
  const links: go.Link[] = [];
  
  diagram.nodes.each(node => {
    if (!isIgnorable(node)) {
      nodes.push(node);
      console.log(`Found node: "${getNodeName(node)}" (key: ${node.data.key})`);
    }
  });
  
  diagram.links.each(link => {
    if (link.fromNode && link.toNode) {
      links.push(link);
      console.log(`Found link: "${getNodeName(link.fromNode!)}" → "${getNodeName(link.toNode!)}"`);
    }
  });

  console.log(`📊 Total: ${nodes.length} nodes, ${links.length} links`);

  // Check if diagram is empty
  if (nodes.length === 0) {
    console.log('❌ Diagram is empty');
    return "❌ INVALID: Empty diagram - no valid nodes found.";
  }

  // Group nodes by name (logical nodes)
  const nodesByName: { [logicalName: string]: go.Node[] } = {};
  nodes.forEach(node => {
    const nodeName = getNodeName(node);
    if (!nodesByName[nodeName]) nodesByName[nodeName] = [];
    nodesByName[nodeName].push(node);
  });

  console.log('📋 Logical nodes found:', Object.keys(nodesByName));

  // Map node key to logical name
  const nodeKeyToLogicalName: { [key: string]: string } = {};
  Object.entries(nodesByName).forEach(([logicalName, nodeArr]) => {
    nodeArr.forEach(node => {
      nodeKeyToLogicalName[node.data.key] = logicalName;
    });
  });

  // Extract edge names as [sourceName, targetName]
  const edgeNameList: [string, string][] = links.map(link => [
    getNodeName(link.fromNode!),
    getNodeName(link.toNode!)
  ]);

  // Check for invalid connections first
  const invalidConnections: string[] = [];
  edgeNameList.forEach(([from, to]) => {
    if (!validNext[from] || !validNext[from].includes(to)) {
      invalidConnections.push(`${from} → ${to}`);
    }
  });

  if (invalidConnections.length > 0) {
    console.log('❌ Invalid connections found:', invalidConnections);
    let summary = "❌ INVALID: Invalid connections detected:\n\n";
    invalidConnections.forEach(conn => {
      summary += `• ${conn} (not allowed by Boxology rules)\n`;
    });
    summary += `\n📋 Valid connections should follow the Boxology pattern rules.`;
    return summary;
  }

  // Pattern matching
  const matchedPatterns: { name: string }[] = [];
  const matchedLogicalNodes = new Set<string>();
  const matchedNodesByPattern: { [pattern: string]: Set<string> } = {};
  const usedEdgeIndices = new Set<number>();

  console.log('🔍 Checking patterns...');
  allPatterns.forEach(pattern => {
    console.log(`  Checking pattern: ${pattern.name}`);
    const required = [...pattern.edges];
    const tempEdges = edgeNameList.map((edge, i) => ({ edge, i }));

    while (true) {
      const currentMatchIndices: number[] = [];
      const involvedLogicalNodes = new Set<string>();
      let stillValid = true;

      for (const [from, to] of required) {
        const match = tempEdges.find(({ edge: [s, t], i }) =>
          s === from && t === to && !usedEdgeIndices.has(i)
        );
        if (!match) {
          stillValid = false;
          break;
        }
        currentMatchIndices.push(match.i);
        const sourceLogicalName = nodeKeyToLogicalName[links[match.i].fromNode!.data.key];
        const targetLogicalName = nodeKeyToLogicalName[links[match.i].toNode!.data.key];
        if (sourceLogicalName) involvedLogicalNodes.add(sourceLogicalName);
        if (targetLogicalName) involvedLogicalNodes.add(targetLogicalName);
      }

      if (!stillValid) break;

      console.log(`    ✅ Pattern "${pattern.name}" matched!`);
      matchedPatterns.push({ name: pattern.name });
      matchedNodesByPattern[pattern.name] = matchedNodesByPattern[pattern.name] || new Set();
      currentMatchIndices.forEach(i => usedEdgeIndices.add(i));
      involvedLogicalNodes.forEach(logicalName => {
        matchedLogicalNodes.add(logicalName);
        matchedNodesByPattern[pattern.name].add(logicalName);
      });
    }
  });

  // Find unmatched logical nodes
  const unmatchedLogicalNodes = Object.keys(nodesByName).filter(
    logicalName => !matchedLogicalNodes.has(logicalName)
  );

  // Find isolated logical nodes (no connections)
  const isolatedLogicalNodes = Object.entries(nodesByName).filter(([logicalName, nodeArr]) => {
    return !nodeArr.some(node => node.findLinksConnected().count > 0);
  }).map(([logicalName]) => logicalName);

  // Find disconnected nodes (no in/out edges)
  const disconnectedNodes = nodes.filter(node => {
    return node.findLinksConnected().count === 0;
  });

  // Cardinality checks for whole diagram
  const tooManyOutputs: string[] = [];
  const missingOutputs: string[] = [];

  nodes.forEach(node => {
    const name = getNodeName(node);
    if (!PROCESS_NODES.has(name)) return;
    let out = 0;
    node.findLinksOutOf().each(l => {
      const t = l.toNode ? getNodeName(l.toNode) : '';
      if (OUTPUT_TARGETS.has(t)) out++;
    });
    if (out > 1) tooManyOutputs.push(`${name} (key ${node.data.key})`);
    if (out === 0) missingOutputs.push(`${name} (key ${node.data.key})`);
  });

  console.log('📊 Validation Results:', {
    matchedPatterns: matchedPatterns.length,
    unmatchedLogicalNodes: unmatchedLogicalNodes.length,
    isolatedLogicalNodes: isolatedLogicalNodes.length,
    disconnectedNodes: disconnectedNodes.length
  });

  // Determine validation status and build detailed report
  const totalLogicalNodes = Object.keys(nodesByName).length;
  const matchedNodeCount = matchedLogicalNodes.size;
  const coverage = totalLogicalNodes > 0 ? (matchedNodeCount / totalLogicalNodes) * 100 : 0;

  let status: string;
  let statusIcon: string;

  if (matchedPatterns.length > 0 && 
      unmatchedLogicalNodes.length === 0 && 
      isolatedLogicalNodes.length === 0 && 
      disconnectedNodes.length === 0) {
    status = "VALID";
    statusIcon = "✅";
  } else if (matchedPatterns.length > 0 && coverage >= 50) {
    status = "PARTIALLY VALID";
    statusIcon = "⚠️";
  } else {
    status = "INVALID";
    statusIcon = "❌";
  }

  // Build comprehensive report
  let summary = `${statusIcon} ${status}: Diagram validation results\n`;
  summary += `${'='.repeat(50)}\n\n`;

  // Validation overview
  summary += `📊 VALIDATION OVERVIEW:\n`;
  summary += `• Total logical nodes: ${totalLogicalNodes}\n`;
  summary += `• Nodes in patterns: ${matchedNodeCount}\n`;
  summary += `• Pattern coverage: ${coverage.toFixed(1)}%\n`;
  summary += `• Patterns matched: ${matchedPatterns.length}\n\n`;

  // Valid patterns found
  if (matchedPatterns.length > 0) {
    summary += `✅ VALID PATTERNS FOUND (${matchedPatterns.length}):\n`;
    for (const [pattern, logicalNodeSet] of Object.entries(matchedNodesByPattern)) {
      const nodeList = Array.from(logicalNodeSet).join(", ");
      summary += `  • ${pattern}\n    Nodes: ${nodeList}\n`;
    }
    summary += "\n";
  }

  // Issues detected
  const hasIssues = unmatchedLogicalNodes.length > 0 || 
                   isolatedLogicalNodes.length > 0 || 
                   disconnectedNodes.length > 0;

  if (hasIssues) {
    summary += `⚠️ ISSUES DETECTED:\n`;
    
    if (unmatchedLogicalNodes.length > 0) {
      summary += `  • Unmatched nodes (${unmatchedLogicalNodes.length}): ${unmatchedLogicalNodes.join(", ")}\n`;
      summary += `    These nodes don't fit any known Boxology pattern\n`;
    }
    
    if (isolatedLogicalNodes.length > 0) {
      summary += `  • Isolated nodes (${isolatedLogicalNodes.length}): ${isolatedLogicalNodes.join(", ")}\n`;
      summary += `    These nodes have no connections\n`;
    }
    
    if (disconnectedNodes.length > 0) {
      const disconnectedLabels = disconnectedNodes.map(node => getNodeName(node));
      summary += `  • Disconnected nodes (${disconnectedNodes.length}): ${disconnectedLabels.join(", ")}\n`;
      summary += `    These nodes are completely isolated\n`;
    }
    summary += "\n";
  }

  // Cardinality issues
  const hasCardinalityIssues = tooManyOutputs.length > 0 || missingOutputs.length > 0;

  if (hasCardinalityIssues) {
    summary += `⚠️ CARDINALITY ISSUES:\n`;
    if (tooManyOutputs.length > 0) {
      summary += `  • Processes with more than one output: ${tooManyOutputs.join(", ")}\n`;
    }
    if (missingOutputs.length > 0) {
      summary += `  • Processes with no output: ${missingOutputs.join(", ")}\n`;
    }
    summary += "\n";
  }

  // Recommendations
  summary += `💡 RECOMMENDATIONS:\n`;
  if (status === "VALID") {
    summary += `• Excellent! All nodes follow valid Boxology patterns\n`;
    summary += `• Diagram structure is correct and complete\n`;
  } else if (status === "PARTIALLY VALID") {
    summary += `• Good foundation with ${matchedPatterns.length} valid patterns\n`;
    summary += `• Review unmatched nodes and connect them properly\n`;
    summary += `• Check isolated nodes and ensure they have connections\n`;
    summary += `• Aim for 100% pattern coverage\n`;
  } else {
    summary += `• Critical issues need attention\n`;
    summary += `• Ensure all nodes follow Boxology connection rules\n`;
    summary += `• Create valid patterns between connected nodes\n`;
    summary += `• Remove or connect isolated nodes\n`;
  }

  console.log(`🏁 Final status: ${status}`);
  return summary;
}

const PROCESS_NODES = new Set(['training', 'engineering', 'transform', 'deduce']);
const OUTPUT_TARGETS = new Set(['symbol', 'model', 'data']);

function countProcessOutputs(node: go.Node): number {
  if (!node) return 0;
  let n = 0;
  node.findLinksOutOf().each(l => {
    const tgt = l.toNode ? getNodeName(l.toNode) : '';
    if (OUTPUT_TARGETS.has(tgt)) n++;
  });
  return n;
}