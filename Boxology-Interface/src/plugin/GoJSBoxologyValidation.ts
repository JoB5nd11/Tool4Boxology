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
  { name: "transform data type", edges: [["data", "transform"], ["transform", "data"]] },
  { name: "generate_model from model and data", edges: [["model", "generate"], ["data", "generate"], ["generate", "model"]] },
  { name: "train_model (symbol)", edges: [["symbol", "generate"], ["generate", "model"]] },
  { name: "generate model (data → symbol → model)", edges: [["data", "generate"], ["symbol", "generate"], ["generate", "model"]] },
  { name: "generate_symbol from actor", edges: [["actor", "generate:engineer"], ["generate:engineer", "symbol"]] },
  { name: "data-symbol transform", edges: [["symbol", "transform"], ["data", "transform"], ["transform", "data"]] },
  { name: "actor generate model", edges: [["actor", "generate"], ["symbol", "generate"], ["generate", "model"]] },
  { name: "infer symbol from more model", edges: [["model", "infer:deduce"], ["data", "infer:deduce"], ["infer:deduce", "symbol"]] },
];

// FIXED: Complete validNext with both cases and all node types
const validNext: { [key: string]: string[] } = {
  // Lowercase versions (original)
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
  
  // Capitalized versions (for UI labels)
  "Symbol": ["Infer:deduce", "Generate:train", "Generate", "Generate:engineer", "Transform:embed", "Transform", "Symbol", "Symbol/data"],
  "Data": ["Infer:deduce", "Generate:train", "Generate", "Generate:engineer", "Transform", "Data", "Transform:embed", "Symbol/data"],
  "Symbol/data": ["Infer:deduce", "Transform:embed", "Generate", "Transform", "Symbol/data", "Generate", "Symbol", "Data", "Generate:train", "Generate:engineer"],
  "Infer:deduce": ["Symbol", "Model", "Infer:deduce", "Data", "Symbol/data", "Model:semantic", "Model:statistics"],
  "Model": ["Infer:deduce", "Model", "Generate", "Generate:train", "Generate:engineer", "Model:statistics", "Model:semantic", "Transform:embed", "Transform"],
  "Generate:train": ["Model", "Generate:train", "Model:semantic", "Model:statistics"],
  "Generate": ["Model", "Generate", "Model:semantic", "Model:statistics", "Data", "Symbol", "Symbol/data"],
  "Actor": ["Generate:engineer", "Actor"],
  "Generate:engineer": ["Model", "Generate:engineer", "Generate", "Data", "Symbol", "Symbol/data"],
  "Model:semantic": ["Infer:deduce", "Model", "Generate", "Generate:train", "Generate:engineer", "Model:statistics", "Model:semantic", "Transform:embed", "Transform"],
  "Model:statistics": ["Infer:deduce", "Model", "Generate", "Generate:train", "Generate:engineer", "Model:statistics", "Model:semantic", "Transform:embed", "Transform"],
  "Transform:embed": ["Data", "Transform:embed", "Symbol", "Transform", "Model:semantic", "Model:statistics", "Symbol/data", "Model"],
  "Transform": ["Data", "Symbol", "Symbol/data", "Transform", "Transform:embed", "Model", "Model:semantic", "Model:statistics"],
  "Infer": ["Symbol", "Model", "Data", "Symbol/data"],
  "Deduce": ["Symbol", "Model", "Data", "Symbol/data"],
};

// Check if a node should be ignored during validation - like original
function isIgnorable(nodeData: any): boolean {
  const ignoredNames = ["text", "conditions", "description", "note", "pre-conditions", "post-condition"];
  const ignoredTypes = ["group", "swimlane"];
  
  const label = (nodeData.label || nodeData.name || "").toLowerCase();
  const shape = (nodeData.shape || "").toLowerCase();
  
  return ignoredNames.includes(label) || ignoredTypes.includes(shape);
}

// FIXED: Get the correct node label with case normalization
function getNodeLabel(nodeData: any): string {
  return (nodeData.label || nodeData.name || "").trim();
}

// FIXED: Check if connection is valid (handle case variations)
function isValidConnection(source: string, target: string): boolean {
  // Try exact match first
  if (validNext[source] && validNext[source].includes(target)) {
    return true;
  }
  
  // Try lowercase match
  const sourceLower = source.toLowerCase();
  const targetLower = target.toLowerCase();
  if (validNext[sourceLower] && validNext[sourceLower].includes(targetLower)) {
    return true;
  }
  
  // Try capitalized match
  const sourceCapital = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
  const targetCapital = target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
  if (validNext[sourceCapital] && validNext[sourceCapital].includes(targetCapital)) {
    return true;
  }
  
  return false;
}

// FIXED: Merge identical nodes using correct GoJS methods
function mergeIdenticalNodes(diagram: go.Diagram, edge: go.Link): void {
  const source = edge.fromNode;
  const target = edge.toNode;
  
  if (!source || !target || source === target) return;
  
  const sourceName = getNodeLabel(source.data);
  const targetName = getNodeLabel(target.data);
  
  if (sourceName === targetName) {
    diagram.startTransaction("merge identical nodes");
    
    try {
      // Get all links connected to target node (excluding the connecting link)
      const targetLinks: go.Link[] = [];
      target.findLinksConnected().each(link => {
        if (link !== edge) targetLinks.push(link);
      });
      
      // FIXED: Use correct GoJS model property names
      targetLinks.forEach(link => {
        if (link.fromNode === target) {
          // Use the correct property name for GoJS links
          diagram.model.setDataProperty(link.data, "from", source.data.key);
        }
        if (link.toNode === target) {
          // Use the correct property name for GoJS links  
          diagram.model.setDataProperty(link.data, "to", source.data.key);
        }
      });
      
      // Remove the connecting link and target node
      diagram.remove(edge);
      diagram.remove(target);
      
      console.log(`✅ Merged identical nodes: "${sourceName}"`);
      
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

    const source = getNodeLabel(link.fromNode.data);
    const target = getNodeLabel(link.toNode.data);
    
    console.log(`🔗 Attempting connection: "${source}" → "${target}"`);

    // Skip validation for ignorable nodes
    if (isIgnorable(link.fromNode.data) || isIgnorable(link.toNode.data)) {
      console.log("🔄 Skipping validation for ignorable nodes");
      return;
    }

    // FIXED: Use improved validation function
    if (!isValidConnection(source, target)) {
      console.log(`❌ Invalid connection blocked: "${source}" → "${target}"`);
      alert(`❌ Invalid connection! "${source}" → "${target}" will be removed.`);
      
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

    console.log(`✅ Valid connection allowed: "${source}" → "${target}"`);

    // If same name nodes are connected, merge them
    if (source === target) {
      console.log(`🔄 Merging identical nodes: "${source}"`);
      mergeIdenticalNodes(diagram, link);
    }
  });

  // Add listener for link relinking
  diagram.addDiagramListener("LinkRelinked", (e) => {
    const link = e.subject as go.Link;
    if (!link || !link.fromNode || !link.toNode) return;

    const source = getNodeLabel(link.fromNode.data);
    const target = getNodeLabel(link.toNode.data);

    if (isIgnorable(link.fromNode.data) || isIgnorable(link.toNode.data)) {
      return;
    }

    if (!isValidConnection(source, target)) {
      alert(`❌ Invalid connection! "${source}" → "${target}" will be removed.`);
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

// UPDATED: More flexible pattern matching that allows partial patterns
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

  // Group edges by their types for flexible pattern matching
  const edgesByType: { [key: string]: Array<{from: string, to: string, edge: go.Link}> } = {};
  
  edges.forEach(edge => {
    const source = getNodeLabel(edge.fromNode!.data).toLowerCase();
    const target = getNodeLabel(edge.toNode!.data).toLowerCase();
    const edgeType = `${source}->${target}`;
    
    if (!edgesByType[edgeType]) {
      edgesByType[edgeType] = [];
    }
    edgesByType[edgeType].push({from: source, to: target, edge});
  });

  const matchedPatterns: { name: string, instances: number, type: string }[] = [];
  const usedEdges = new Set<go.Link>();

  // Enhanced pattern matching logic - now allows partial patterns
  allPatterns.forEach(pattern => {
    console.log(`🔍 Checking pattern: ${pattern.name}`);
    
    const requiredEdges = [...pattern.edges];
    
    // Check for complete pattern instances first
    let completeInstances = checkCompletePattern(pattern, edgesByType, usedEdges);
    if (completeInstances > 0) {
      matchedPatterns.push({ 
        name: pattern.name, 
        instances: completeInstances, 
        type: "complete" 
      });
    }
    
    // Then check for partial patterns (multiple inputs OR multiple outputs)
    let partialInstances = checkPartialPattern(pattern, edgesByType, usedEdges);
    if (partialInstances > 0) {
      matchedPatterns.push({ 
        name: `${pattern.name} (partial)`, 
        instances: partialInstances, 
        type: "partial" 
      });
    }
  });

  // Build result summary
  const allUsedNodes = new Set<string>();
  usedEdges.forEach(edge => {
    allUsedNodes.add(edge.fromNode!.data.key);
    allUsedNodes.add(edge.toNode!.data.key);
  });

  const unmatchedNodes = nodes.filter(n => !allUsedNodes.has(n.data.key));
  const isolatedNodes = nodes.filter(n => {
    let hasConnections = false;
    n.findLinksConnected().each(() => { hasConnections = true; });
    return !hasConnections;
  });

  if (matchedPatterns.length > 0) {
    let summary = "✅ Valid pattern(s) detected:\n\n";
    matchedPatterns.forEach(({ name, instances, type }) => {
      const emoji = type === "complete" ? "🎯" : "🔄";
      if (instances === 1) {
        summary += `${emoji} ${name}\n`;
      } else {
        summary += `${emoji} ${name} (${instances} instances)\n`;
      }
    });
    
    if (unmatchedNodes.length > 0) {
      summary += `\n⚠️ ${unmatchedNodes.length} unmatched nodes:\n`;
      unmatchedNodes.forEach(node => {
        summary += `  • ${getNodeLabel(node.data)}\n`;
      });
    }
    
    return summary;
  } else {
    return `❌ No valid patterns found in selection.\n\nSelected: ${nodes.map(n => getNodeLabel(n.data)).join(', ')}`;
  }
}

// Check for complete pattern instances (all edges must exist)
function checkCompletePattern(
  pattern: any, 
  edgesByType: { [key: string]: Array<{from: string, to: string, edge: go.Link}> },
  usedEdges: Set<go.Link>
): number {
  const requiredEdges = [...pattern.edges];
  let maxPossibleInstances = Infinity;
  
  // Check availability of each required edge type
  for (const [from, to] of requiredEdges) {
    const edgeType = `${from}->${to}`;
    const availableEdges = edgesByType[edgeType] || [];
    const unusedEdges = availableEdges.filter(e => !usedEdges.has(e.edge));
    
    if (unusedEdges.length === 0) {
      return 0; // Can't form complete pattern without this edge type
    }
    
    maxPossibleInstances = Math.min(maxPossibleInstances, unusedEdges.length);
  }
  
  // Try to match complete instances
  let actualInstances = 0;
  for (let i = 0; i < maxPossibleInstances; i++) {
    const edgesForThisInstance = new Set<go.Link>();
    let canFormInstance = true;
    
    // Try to find all required edges for one complete instance
    for (const [from, to] of requiredEdges) {
      const edgeType = `${from}->${to}`;
      const availableEdges = edgesByType[edgeType] || [];
      const unusedEdges = availableEdges.filter(e => 
        !usedEdges.has(e.edge) && !edgesForThisInstance.has(e.edge)
      );
      
      if (unusedEdges.length === 0) {
        canFormInstance = false;
        break;
      }
      
      edgesForThisInstance.add(unusedEdges[0].edge);
    }
    
    if (canFormInstance) {
      edgesForThisInstance.forEach(edge => usedEdges.add(edge));
      actualInstances++;
    } else {
      break;
    }
  }
  
  console.log(`  Complete instances: ${actualInstances}`);
  return actualInstances;
}

// Check for partial pattern instances (multiple inputs OR multiple outputs)
function checkPartialPattern(
  pattern: any, 
  edgesByType: { [key: string]: Array<{from: string, to: string, edge: go.Link}> },
  usedEdges: Set<go.Link>
): number {
  const requiredEdges = [...pattern.edges];
  
  // For 2-edge patterns like ["symbol", "generate:train"], ["generate:train", "model"]
  if (requiredEdges.length === 2) {
    const [edge1, edge2] = requiredEdges;
    const [from1, to1] = edge1;
    const [from2, to2] = edge2;
    
    // Check if we have the connecting node (middle node)
    const middleNode = to1 === from2 ? to1 : (from1 === to2 ? from1 : null);
    
    if (middleNode) {
      let partialInstances = 0;
      
      const inputEdges = edgesByType[`${from1}->${to1}`] || [];
      const outputEdges = edgesByType[`${from2}->${to2}`] || [];
      
      const unusedInputs = inputEdges.filter(e => !usedEdges.has(e.edge));
      const unusedOutputs = outputEdges.filter(e => !usedEdges.has(e.edge));
      
      console.log(`  Checking partial pattern for ${pattern.name}:`);
      console.log(`    Input edges (${from1}->${to1}): ${unusedInputs.length}`);
      console.log(`    Output edges (${from2}->${to2}): ${unusedOutputs.length}`);
      
      // Case 1: Multiple inputs (≥2) with any number of outputs (≥0)
      if (unusedInputs.length >= 2) {
        console.log(`  ✅ Found MULTIPLE INPUTS pattern: ${unusedInputs.length} inputs`);
        
        // Find middle nodes that have multiple inputs
        const inputMiddleNodes = new Map<string, number>();
        unusedInputs.forEach(e => {
          const key = e.edge.toNode!.data.key;
          inputMiddleNodes.set(key, (inputMiddleNodes.get(key) || 0) + 1);
        });
        
        // Count middle nodes that have 2+ inputs
        const multiInputMiddleNodes = Array.from(inputMiddleNodes.entries())
          .filter(([key, count]) => count >= 2);
        
        partialInstances += multiInputMiddleNodes.length;
        console.log(`    Found ${multiInputMiddleNodes.length} nodes with multiple inputs`);
        
        // Mark all input edges as used
        unusedInputs.forEach(e => usedEdges.add(e.edge));
        
        // If there are also output edges from these middle nodes, mark them as used too
        if (unusedOutputs.length > 0) {
          const validOutputs = unusedOutputs.filter(e => 
            multiInputMiddleNodes.some(([key]) => e.edge.fromNode!.data.key === key)
          );
          validOutputs.forEach(e => usedEdges.add(e.edge));
        }
      }
      
      // Case 2: Multiple outputs (≥2) with any number of inputs (≥0) 
      // Only check this if we haven't already found multiple inputs
      else if (unusedOutputs.length >= 2) {
        console.log(`  ✅ Found MULTIPLE OUTPUTS pattern: ${unusedOutputs.length} outputs`);
        
        // Find middle nodes that have multiple outputs
        const outputMiddleNodes = new Map<string, number>();
        unusedOutputs.forEach(e => {
          const key = e.edge.fromNode!.data.key;
          outputMiddleNodes.set(key, (outputMiddleNodes.get(key) || 0) + 1);
        });
        
        // Count middle nodes that have 2+ outputs
        const multiOutputMiddleNodes = Array.from(outputMiddleNodes.entries())
          .filter(([key, count]) => count >= 2);
        
        partialInstances += multiOutputMiddleNodes.length;
        console.log(`    Found ${multiOutputMiddleNodes.length} nodes with multiple outputs`);
        
        // Mark all output edges as used
        unusedOutputs.forEach(e => usedEdges.add(e.edge));
        
        // If there are also input edges to these middle nodes, mark them as used too
        if (unusedInputs.length > 0) {
          const validInputs = unusedInputs.filter(e => 
            multiOutputMiddleNodes.some(([key]) => e.edge.toNode!.data.key === key)
          );
          validInputs.forEach(e => usedEdges.add(e.edge));
        }
      }
      
      console.log(`  Partial instances found: ${partialInstances}`);
      return partialInstances;
    }
  }
  
  // For 3+ edge patterns, check for partial matches
  else if (requiredEdges.length >= 3) {
    // For complex patterns like inference, check if we have some of the required edges
    let foundEdgeTypes = 0;
    const totalEdgeTypes = requiredEdges.length;
    
    for (const [from, to] of requiredEdges) {
      const edgeType = `${from}->${to}`;
      const availableEdges = edgesByType[edgeType] || [];
      const unusedEdges = availableEdges.filter(e => !usedEdges.has(e.edge));
      
      if (unusedEdges.length > 0) {
        foundEdgeTypes++;
        // Mark first edge of each type as used for this partial pattern
        usedEdges.add(unusedEdges[0].edge);
      }
    }
    
    // Consider it a partial match if we have at least 2 out of 3+ required edges
    if (foundEdgeTypes >= 2) {
      console.log(`  ✅ Found PARTIAL COMPLEX pattern: ${foundEdgeTypes}/${totalEdgeTypes} edge types`);
      return 1;
    }
  }
  
  return 0;
}

// Export validation shapes and patterns for external use
export { shapes as validationShapes, allPatterns as validationPatterns, validNext as validationRules };