import * as go from 'gojs';

// All valid shapes - exactly like original BoxologyValidation.js
const shapes = [
  "symbol",
  "data", 
  "symbol/data",
  "model",
  "actor",
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
  "text",
  "conditions",
  "description",
  "note",
  "pre-conditions",
  "post-condition",
  "group",
];

// List of all patterns - exactly like original BoxologyValidation.js
const allPatterns = [
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
  // New rules from JS
  { name: "generate_model from model and data", edges: [["model", "generate"], ["data", "generate"], ["generate", "model"]] },
  { name: "train_model (symbol)", edges: [["symbol", "generate"], ["generate", "model"]] },
  { name: "generate model (data → symbol → model)", edges: [["data", "generate"], ["symbol", "generate"], ["generate", "model"]] },
  { name: "generate_symbol from actor", edges: [["actor", "generate:engineer"], ["generate:engineer", "symbol"]] },
  { name: "data-symbol transform", edges: [["symbol", "transform"], ["data", "transform"], ["transform", "data"]] },
  { name: "actor generate model", edges: [["actor", "generate"], ["symbol", "generate"], ["generate", "model"]] },
  { name: "infer symbol from more model", edges: [["model", "infer:deduce"], ["data", "infer:deduce"], ["infer:deduce", "symbol"]] },
];

// To limit user for connecting nodes, which logically can not be next step in flow - exactly like JS
const validNext: { [key: string]: string[] } = {
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
};

// Check if a node should be ignored during validation - like original
function isIgnorable(nodeData: any): boolean {
  const ignoredNames = ["text", "conditions", "description", "note", "pre-conditions", "post-condition"];
  const ignoredTypes = ["group", "swimlane"];
  
  const name = (nodeData.name || "").toLowerCase();
  const label = (nodeData.label || "").toLowerCase(); 
  const shape = (nodeData.shape || "").toLowerCase();
  
  return ignoredNames.includes(name) || ignoredNames.includes(label) || ignoredTypes.includes(shape);
}

// Get the correct node name for validation (semantic type) - corresponds to cell.name in JS
function getNodeName(nodeData: any): string {
  return (nodeData.name || "").trim();
}

// Get the correct node label for display and merging - corresponds to cell.value in JS  
function getNodeLabel(nodeData: any): string {
  return (nodeData.label || "").trim();
}

// Check if connection is valid using node names - exactly like JS version
function isValidConnection(sourceName: string, targetName: string): boolean {
  // Use exact names as in JS (no toLowerCase conversion)
  if (validNext[sourceName] && validNext[sourceName].includes(targetName)) {
    return true;
  }
  
  return false;
}

// Merge nodes only if same label (like JS version: source.value === target.value)
function mergeIdenticalNodes(diagram: go.Diagram, edge: go.Link): void {
  const source = edge.fromNode;
  const target = edge.toNode;
  
  if (!source || !target || source === target) return;
  
  const sourceLabel = getNodeLabel(source.data);
  const targetLabel = getNodeLabel(target.data);
  
  // Only merge if labels are identical (like JS: source.value === target.value)
  if (sourceLabel === targetLabel) {
    diagram.startTransaction("merge identical nodes");
    
    try {
      // Get all links connected to target node (excluding the connecting link)
      const targetLinks: go.Link[] = [];
      target.findLinksConnected().each(link => {
        if (link !== edge) targetLinks.push(link);
      });
      
      // Redirect all target's connections to source
      targetLinks.forEach(link => {
        if (link.fromNode === target) {
          diagram.model.setDataProperty(link.data, "from", source.data.key);
        }
        if (link.toNode === target) {
          diagram.model.setDataProperty(link.data, "to", source.data.key);
        }
      });
      
      // Remove the connecting link and target node
      diagram.remove(edge);
      diagram.remove(target);
      
      console.log(`✅ Merged identical nodes: label="${sourceLabel}"`);
      
    } catch (error) {
      console.error("Error merging nodes:", error);
    } finally {
      diagram.commitTransaction("merge identical nodes");
    }
  }
}

// FIXED: Setup validation listeners with better error handling
export function setupDiagramValidation(diagram: go.Diagram): void {
  console.log("✅ GoJS Boxology Plugin Loading...");
  
  // Add listener for when links are drawn
  diagram.addDiagramListener("LinkDrawn", (e) => {
    const link = e.subject as go.Link;
    if (!link || !link.fromNode || !link.toNode) return;

    const sourceName = getNodeName(link.fromNode.data);
    const targetName = getNodeName(link.toNode.data);
    
    console.log(`🔗 Attempting connection: "${sourceName}" → "${targetName}"`);

    // Skip validation for ignorable nodes
    if (isIgnorable(link.fromNode.data) || isIgnorable(link.toNode.data)) {
      console.log("🔄 Skipping validation for ignorable nodes");
      return;
    }

    // Use node names for validation (like JS: edge.source.name → edge.target.name)
    if (!isValidConnection(sourceName, targetName)) {
      console.log(`❌ Invalid connection blocked: "${sourceName}" → "${targetName}"`);
      alert(`❌ Invalid connection! Edge will be removed.`);
      
      diagram.startTransaction("remove invalid link");
      try {
        diagram.remove(link);
      } catch (error) {
        console.error("Error removing link:", error);
        diagram.remove(link);
      }
      diagram.commitTransaction("remove invalid link");
      return;
    }

    console.log(`✅ Valid connection allowed: "${sourceName}" → "${targetName}"`);

    // If same name nodes are connected, merge them (like JS: edge.source.name === edge.target.name)
    if (sourceName === targetName) {
      console.log(`🔄 Merging identical nodes: name="${sourceName}"`);
      mergeIdenticalNodes(diagram, link);
    }
  });

  // Add listener for link relinking
  diagram.addDiagramListener("LinkRelinked", (e) => {
    const link = e.subject as go.Link;
    if (!link || !link.fromNode || !link.toNode) return;

    const sourceName = getNodeName(link.fromNode.data);
    const targetName = getNodeName(link.toNode.data);

    if (isIgnorable(link.fromNode.data) || isIgnorable(link.toNode.data)) {
      return;
    }

    // Use node names for validation
    if (!isValidConnection(sourceName, targetName)) {
      alert(`❌ Invalid connection! "${sourceName}" → "${targetName}" will be removed.`);
      diagram.startTransaction("remove invalid relink");
      try {
        diagram.remove(link);
      } catch (error) {
        diagram.remove(link);
      }
      diagram.commitTransaction("remove invalid relink");
    }
  });

  console.log("✅ GoJS Boxology Plugin Loaded Successfully");
}

// The function which checks validation for each pattern separately - matches JS version
export function validateGoJSDiagram(diagram: go.Diagram): string {
  const selectedCells = diagram.selection;
  if (selectedCells.count === 0) {
    return "⚠️ No selection made! Please select a pattern before validation.";
  }

  // Filter relevant nodes and edges
  const nodes: go.Node[] = [];
  const edges: go.Link[] = [];
  
  selectedCells.each(part => {
    if (part instanceof go.Node && !isIgnorable(part.data)) {
      nodes.push(part);
    } else if (part instanceof go.Link && part.fromNode && part.toNode) {
      edges.push(part);
    }
  });

  console.log(`🔍 Validating ${nodes.length} nodes and ${edges.length} edges`);

  // Group nodes by their "name" attribute to treat duplicates as single logical nodes (like JS)
  const nodesByName: { [key: string]: go.Node[] } = {};
  nodes.forEach(node => {
    const nodeName = getNodeName(node.data);
    if (!nodesByName[nodeName]) {
      nodesByName[nodeName] = [];
    }
    nodesByName[nodeName].push(node);
  });

  // Extract edge names as [sourceName, targetName] - using "name" attribute only (like JS)
  const edgeNameList = edges.map(edge => {
    const source = getNodeName(edge.fromNode!.data);
    const target = getNodeName(edge.toNode!.data);
    return [source, target];
  });

  // Create a mapping from physical node ID to logical node name for tracking (like JS)
  const nodeIdToLogicalName: { [key: string]: string } = {};
  Object.entries(nodesByName).forEach(([logicalName, physicalNodes]) => {
    physicalNodes.forEach(node => {
      nodeIdToLogicalName[node.data.key] = logicalName;
    });
  });

  const matchedPatterns: { name: string }[] = [];
  const matchedLogicalNodes = new Set<string>(); // Track by logical name, not physical ID (like JS)
  const matchedNodesByPattern: { [key: string]: Set<string> } = {};
  const usedEdgeIndices = new Set<number>();

  // Pattern matching logic - exactly like JS version
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
        // Track logical nodes (by name) instead of physical nodes (by ID) - like JS
        const sourceLogicalName = nodeIdToLogicalName[edges[match.i].fromNode!.data.key];
        const targetLogicalName = nodeIdToLogicalName[edges[match.i].toNode!.data.key];
        if (sourceLogicalName) involvedLogicalNodes.add(sourceLogicalName);
        if (targetLogicalName) involvedLogicalNodes.add(targetLogicalName);
      }

      if (!stillValid) break;

      // Record the matched pattern instance
      matchedPatterns.push({ name: pattern.name });
      matchedNodesByPattern[pattern.name] = matchedNodesByPattern[pattern.name] || new Set();
      currentMatchIndices.forEach(i => usedEdgeIndices.add(i));
      
      // Add all logical nodes involved in this pattern
      involvedLogicalNodes.forEach(logicalName => {
        matchedLogicalNodes.add(logicalName);
        matchedNodesByPattern[pattern.name].add(logicalName);
      });
    }
  });

  // Find unmatched logical nodes (like JS)
  const unmatchedLogicalNodes = Object.keys(nodesByName).filter(
    logicalName => !matchedLogicalNodes.has(logicalName)
  );

  // Find isolated logical nodes (nodes with no connections) - like JS
  const isolatedLogicalNodes = Object.entries(nodesByName).filter(([logicalName, physicalNodes]) => {
    // Check if ANY physical instance of this logical node has connections
    const hasConnections = physicalNodes.some(node => {
      let connectionCount = 0;
      node.findLinksConnected().each(() => { connectionCount++; });
      return connectionCount > 0;
    });
    return !hasConnections;
  }).map(([logicalName]) => logicalName);

  // Check for disconnected physical nodes (like JS)
  const disconnectedNodes = nodes.filter(node => {
    let connectionCount = 0;
    node.findLinksConnected().each(() => { connectionCount++; });
    return connectionCount === 0;
  });

  // Build result summary based on logical nodes (like JS)
  if (matchedPatterns.length > 0 && unmatchedLogicalNodes.length === 0 && isolatedLogicalNodes.length === 0 && disconnectedNodes.length === 0) {
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
        getNodeLabel(node.data) || getNodeName(node.data) || "Unnamed"
      );
      summary += `\n⚠️ Disconnected nodes: ${disconnectedLabels.join(", ")}`;
    }
    
    return summary;
  }
}

// Export validation shapes and patterns for external use
export { shapes as validationShapes, allPatterns as validationPatterns, validNext as validationRules };