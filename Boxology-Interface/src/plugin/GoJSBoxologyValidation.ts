import * as go from "gojs";

// --- Pattern and connection rules ---

const validNext: Record<string, string[]> = {
  "symbol": ["infer:deduce", "generate:train", "generate", "generate:engineer", "transform:embed", "transform", "symbol", "symbol/data"],
  "data": ["infer:deduce", "generate:train", "generate", "generate:engineer", "transform", "data", "transform:embed", "symbol/data"],
  "symbol/data": ["infer:deduce", "transform:embed", "generate", "transform", "symbol/data", "generate", "symbol", "data", "generate:train", "generate:engineer"],
  "infer:deduce": ["symbol", "model", "infer:deduce", "data", "symbol/data", "model:semantic", "model:statistics"],
  "model": ["infer:deduce", "model", "generate", "generate:train", "generate:engineer", "model:statistics", "model:semantic", "transform:embed", "transform"],
  "generate:train": ["model", "generate:train", "model:semantic", "model:statistics"],
  "generate": ["model", "generate", "model:semantic", "model:statistics", "data", "symbol", "symbol/data"],
  "actor": ["generate:engineer", "actor"],
  "generate:engineer": ["model", "generate:engineer", "generate", "data", "symbol", "symbol/data"],
  "model:semantic": ["infer:deduce", "model", "generate", "generate:train", "generate:engineer", "model:statistics", "model:semantic", "transform:embed", "transform"],
  "model:statistics": ["infer:deduce", "model", "generate", "generate:train", "generate:engineer", "model:statistics", "model:semantic", "transform:embed", "transform"],
  "transform:embed": ["data", "transform:embed", "symbol", "transform", "model:semantic", "model:statistics", "symbol/data", "model"],
  "transform": ["data", "symbol", "symbol/data", "transform", "transform:embed", "model", "model:semantic", "model:statistics"],
  "infer": ["symbol", "model", "data", "symbol/data"],
  "deduce": ["symbol", "model", "data", "symbol/data"],
};

const allPatterns: { name: string; edges: [string, string][] }[] = [
  { name: "train_model (symbol)", edges: [["symbol", "generate:train"], ["generate:train", "model"]] },
  { name: "train_model (data)", edges: [["data", "generate:train"], ["generate:train", "model"]] },
  { name: "transform symbol", edges: [["symbol", "transform"], ["transform", "data"]] },
  { name: "transform symbol/data", edges: [["symbol/data", "transform"], ["transform", "data"]] },
  { name: "transform data", edges: [["data", "transform"], ["transform", "data"]] },
  { name: "generate_model from actor", edges: [["actor", "generate:engineer"], ["generate:engineer", "model"]] },
  { name: "infer_symbol (symbol → model → symbol)", edges: [["model", "infer:deduce"], ["symbol", "infer:deduce"], ["infer:deduce", "symbol"]] },
  { name: "infer_symbol (symbol/data → model → symbol)", edges: [["model", "infer:deduce"], ["symbol/data", "infer:deduce"], ["infer:deduce", "symbol"]] },
  { name: "infer_symbol (data → model → symbol)", edges: [["model", "infer:deduce"], ["data", "infer:deduce"], ["infer:deduce", "symbol"]] },
  { name: "infer_model (symbol → model → model)", edges: [["model", "infer:deduce"], ["symbol", "infer:deduce"], ["infer:deduce", "model"]] },
  { name: "infer_model (symbol/data → model → model)", edges: [["model", "infer:deduce"], ["symbol/data", "infer:deduce"], ["infer:deduce", "model"]] },
  { name: "infer_model (data → model → model)", edges: [["model", "infer:deduce"], ["data", "infer:deduce"], ["infer:deduce", "model"]] },
  { name: "embed transform", edges: [["symbol", "transform:embed"], ["data", "transform:embed"], ["transform:embed", "model:semantic"]] },
  { name: "generate_model from model and data ", edges: [["model", "generate"], ["data", "generate"], ["generate", "model"]] },
  { name: "train_model (symbol)", edges: [["symbol", "generate"], ["generate", "model"]] },
  { name: "generate model (data → symbol → model)", edges: [["data", "generate"], ["symbol", "generate"], ["generate", "model"]] },
  { name: "generate_symbol from actor", edges: [["actor", "generate:engineer"], ["generate:engineer", "symbol"]] },
  { name: "data-symbol transform", edges: [["symbol", "transform"], ["data", "transform"], ["transform", "data"]] },
  { name: "actor generate model", edges: [["actor", "generate"], ["symbol", "generate"], ["generate", "model"]] },
  { name: "infer symbol from more model", edges: [["model", "infer:deduce"], ["data", "infer:deduce"], ["infer:deduce", "symbol"]] }
];

// --- Utility functions ---

function getNodeName(node: go.Node): string {
  return (node.data.name || node.data.label || "").trim();
}

function isIgnorable(node: go.Node): boolean {
  const ignoredNames = ["text", "conditions", "description", "note", "pre-conditions", "post-condition"];
  const ignoredTypes = ["group", "swimlane"];
  const label = (node.data.label || node.data.name || "").toLowerCase();
  const shape = (node.data.shape || "").toLowerCase();
  return ignoredNames.includes(label) || ignoredTypes.includes(shape);
}

// --- Merge duplicate nodes (by name) if connected ---
function mergeIdenticalNodes(diagram: go.Diagram, fromNode: go.Node, toNode: go.Node) {
  if (!fromNode || !toNode) return;
  if (getNodeName(fromNode) !== getNodeName(toNode)) return;
  if (fromNode.key === toNode.key) return;

  const model = diagram.model as go.GraphLinksModel;
  model.startTransaction("merge nodes");

  // Rewire all links of toNode to fromNode
  diagram.links.each(link => {
    if (link.fromNode === toNode) {
      model.set(link.data, "from", fromNode.key);
    }
    if (link.toNode === toNode) {
      model.set(link.data, "to", fromNode.key);
    }
  });

  // Remove the duplicate node
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

    // Prevent invalid connection
    if (!validNext[fromName] || !validNext[fromName].includes(toName)) {
      // Remove the link immediately
      diagram.model.startTransaction("remove invalid link");
      (diagram.model as go.GraphLinksModel).removeLinkData(link.data);
      diagram.model.commitTransaction("remove invalid link");
      // Optionally, show a warning (you can use a toast or alert)
      // alert("❌ Invalid connection! Edge will be removed.");
      return;
    }

    // Merge nodes if names are identical
    if (fromName === toName) {
      mergeIdenticalNodes(diagram, link.fromNode, link.toNode);
    }
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
    disconnectedNodes.length === 0
  ) {
    let summary = "✅ Valid pattern(s) detected:\n\n";
    for (const [pattern, logicalNodeSet] of Object.entries(matchedNodesByPattern)) {
      summary += `• ${pattern}\n`;
    }
    return summary;
  } else {
    let summary = "❌ Invalid pattern: Issues detected.\n\n";
    if (matchedPatterns.length > 0) {
      summary += "✅ Partial matches found:\n";
      for (const [pattern, logicalNodeSet] of Object.entries(matchedNodesByPattern)) {
        summary += `  • ${pattern}\n`;
      }
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