import React, { useRef, useState, useEffect } from 'react';
import './App.css';
import Toolbar from './Toolbar';
import LeftSidebar from './components/LeftSidebar';
import GoDiagram from './GoDiagram';
import * as go from 'gojs';
import RightSidebar from './components/RightSidebar';
import ContextMenu from './ContextMenu';
import { validateGoJSDiagram, setupDiagramValidation } from './plugin/GoJSBoxologyValidation';

function App() {
  const diagramRef = useRef<go.Diagram | null>(null);
  const [containers, setContainers] = useState<string[]>(['General', 'Annotation']);
  const [customContainerShapes, setCustomContainerShapes] = useState<{ [key: string]: any[] }>({});
  const [selectedData, setSelectedData] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [customGroups, setCustomGroups] = useState<{ [key: string]: any[] }>({});

  // Add useEffect to track containers changes
  useEffect(() => {
    console.log('📦 CONTAINERS STATE CHANGED:', {
      newContainers: containers,
      containerCount: containers.length,
      timestamp: new Date().toISOString()
    });
    
    // Check if diagram still has content after container change
    if (diagramRef.current) {
      const nodeCount = diagramRef.current.nodes.count;
      const linkCount = diagramRef.current.links.count;
      console.log('🎨 DIAGRAM CONTENT AFTER CONTAINER CHANGE:', {
        nodeCount,
        linkCount,
        diagramExists: !!diagramRef.current
      });
    }
  }, [containers]);


  const handleSave = () => {
    console.log('💾 SAVE ACTION:', {
      action: 'User saving diagram',
      timestamp: new Date().toISOString()
    });
    if (diagramRef.current) {
      const json = diagramRef.current.model.toJson();
      localStorage.setItem('diagramData', json);
      console.log('💾 DIAGRAM SAVED:', {
        action: 'Diagram saved to localStorage',
        timestamp: new Date().toISOString(),
        dataSize: json.length
      });
      alert('Diagram saved!');
    }
  };



  const handleOpen = () => {
    console.log('📂 OPEN ACTION:', {
      action: 'User opening diagram',
      timestamp: new Date().toISOString()
    });
    const json = localStorage.getItem('diagramData');
    if (json && diagramRef.current) {
      diagramRef.current.model = go.Model.fromJson(json);
      console.log('📂 DIAGRAM LOADED:', {
        action: 'Diagram loaded from localStorage',
        timestamp: new Date().toISOString(),
        dataSize: json.length
      });
    }
  };

  const handleUndo = () => {
    diagramRef.current?.undoManager?.undo();
  };

  const handleRedo = () => {
    diagramRef.current?.undoManager?.redo();
  };

  const handleAbout = () => {
    alert('Custom Diagram Editor using GoJS');
  };

  const handleValidate = () => {
    console.log('✅ VALIDATION STARTED:', {
      action: 'User initiated validation',
      timestamp: new Date().toISOString()
    });
    
    if (!diagramRef.current) {
      alert('❌ Diagram not ready for validation.');
      return;
    }

    const diagram = diagramRef.current;
    
    // Always get fresh selection - don't cache
    const currentSelection = diagram.selection;
    const selectedCount = currentSelection.count;
    
    console.log(`🔍 Validation started - ${selectedCount} items selected`);
    
    if (selectedCount === 0) {
      alert("⚠️ No selection made! Please select shapes to validate.");
      return;
    }
    
    // Clear any previous validation state/cache
    // Force fresh validation by clearing selection and reselecting
    const selectedParts: go.Part[] = [];
    currentSelection.each(part => selectedParts.push(part));
    
    // Clear selection temporarily
    diagram.clearSelection();
    
    // Reselect the same parts (this ensures fresh state)
    selectedParts.forEach(part => part.isSelected = true);
    
    try {
      // validateGoJSDiagram should always work with current selection
      const result = validateGoJSDiagram(diagram);
      console.log('✅ VALIDATION COMPLETED:', {
        action: 'Validation finished',
        timestamp: new Date().toISOString(),
        result: result
      });
      alert(result);
    } catch (error) {
      console.error('Validation error:', error);
      alert('❌ Validation failed. Check console for details.');
    }
    
    console.log('✅ Validation completed');
  };

  interface ContextMenuPosition {
    x: number;
    y: number;
  }

  interface SelectedData {
    key: string;
    [key: string]: any;
  }

  const handleMoveNodeToContainer = (container: string | null) => {
    // ALWAYS close the context menu first
    setContextMenu(null);
    
    if (container) {
      // Handle moving node to container logic here
      console.log('Moving node to:', container);
      // Add your actual move logic here
    }
  };

  const handleAddToGroup = (group: string, shape: any) => {
    // ALWAYS close the context menu first
    setContextMenu(null);
    
    if (group) {
      console.log('Adding to group:', group);
      // Add your actual group logic here
    }
  };

  function handleAddContainer(name: string) {
    console.log('� HANDLE ADD CONTAINER CALLED!', {
      functionCalled: 'handleAddContainer',
      inputName: name,
      timestamp: new Date().toISOString()
    });
    
    console.log('�📦 CONTAINER DEBUG - Input received:', {
      name,
      currentContainers: containers,
      alreadyExists: containers.includes(name)
    });
    
    if (name && !containers.includes(name)) {
      console.log('📦 CONTAINER ADDED:', {
        action: 'New container created',
        timestamp: new Date().toISOString(),
        containerName: name,
        totalContainers: containers.length + 1,
        oldContainers: [...containers],
        newContainers: [...containers, name]
      });
      
      // Update both states
      setContainers(prev => {
        const newContainers = [...prev, name];
        console.log('📦 SETTING NEW CONTAINERS:', newContainers);
        console.log('📦 PREVIOUS CONTAINERS WERE:', prev);
        console.log('📦 ADDING CONTAINER:', name);
        return newContainers;
      });
      
      setCustomContainerShapes(prev => {
        const newShapes = { ...prev, [name]: [] };
        console.log('📦 SETTING CUSTOM CONTAINER SHAPES:', newShapes);
        return newShapes;
      });
      
      // Let's also check after a short delay to see if state updated
      setTimeout(() => {
        console.log('📦 STATE CHECK AFTER 100ms:', {
          containersAfterUpdate: containers,
          containersLength: containers.length
        });
      }, 100);
      
    } else if (name && containers.includes(name)) {
      console.log('⚠️ CONTAINER ALREADY EXISTS:', {
        containerName: name,
        existingContainers: containers
      });
      alert(`Container "${name}" already exists.`);
    }
  }

  function handleCreatePatternFromSelection() {
    if (!diagramRef.current) return;
    
    console.log('🎨 PATTERN CREATION STARTED:', {
      action: 'Starting pattern creation',
      timestamp: new Date().toISOString()
    });
    
    // Get current state values directly - React guarantees these are current in event handlers
    const currentContainers = containers;
    const currentCustomContainerShapes = customContainerShapes;
    
    console.log('🎨 PATTERN CREATION DEBUG:', {
      action: 'Using current state values',
      timestamp: new Date().toISOString(),
      currentContainers: currentContainers,
      containerCount: currentContainers.length,
      containersArray: JSON.stringify(currentContainers),
      currentCustomContainerShapes: Object.keys(currentCustomContainerShapes),
      customContainerCount: Object.keys(currentCustomContainerShapes).length
    });
    
    // Continue with pattern creation using current values
    continuePatternCreation(currentContainers, currentCustomContainerShapes);
  }
  
  function continuePatternCreation(currentContainers: string[], currentCustomContainerShapes: { [key: string]: any[] }) {
    if (!diagramRef.current) return;
    
    const diagram = diagramRef.current;
    const selectedNodes = new Set<go.Node>();
    const selectedLinks = new Set<go.Link>();
    
    // Collect selected nodes and related links
    diagram.selection.each(part => {
      if (part instanceof go.Node) {
        selectedNodes.add(part);
      } else if (part instanceof go.Link) {
        selectedLinks.add(part);
      }
    });

    // Also include links between selected nodes
    diagram.links.each(link => {
      const fromNode = link.fromNode;
      const toNode = link.toNode;
      if (fromNode && toNode && selectedNodes.has(fromNode) && selectedNodes.has(toNode)) {
        selectedLinks.add(link);
      }
    });

    if (selectedNodes.size === 0) {
      alert('Please select some nodes to create a pattern.');
      return;
    }

    const patternName = prompt('Enter a name for this pattern:');
    if (!patternName) return;

    // Get all available containers (including custom ones) - use current states
    const allAvailableContainers = [...new Set([...currentContainers, ...Object.keys(currentCustomContainerShapes)])];

    console.log('🎨 CONTAINER SELECTION DEBUG:', {
      action: 'About to show container selection',
      timestamp: new Date().toISOString(),
      availableContainers: currentContainers,
      customContainerKeys: Object.keys(currentCustomContainerShapes),
      allContainers: allAvailableContainers,
      containerOptions: allAvailableContainers.join(', ')
    });

    const selectedContainer = prompt(`Which container should this pattern be added to?\nAvailable: ${allAvailableContainers.join(', ')}`);
    if (!selectedContainer || !allAvailableContainers.includes(selectedContainer)) {
      console.log('❌ INVALID CONTAINER:', {
        selectedContainer,
        availableContainers: currentContainers,
        customContainers: Object.keys(currentCustomContainerShapes),
        allAvailableContainers,
        isValid: allAvailableContainers.includes(selectedContainer || '')
      });
      alert(`Invalid container name. Available containers: ${allAvailableContainers.join(', ')}`);
      return;
    }

    // Calculate bounding box to normalize positions
    let minX = Infinity, minY = Infinity;
    selectedNodes.forEach(node => {
      const loc = node.location;
      minX = Math.min(minX, loc.x);
      minY = Math.min(minY, loc.y);
    });

    // Create pattern shapes from selected nodes
    const patternShapes = Array.from(selectedNodes).map(node => {
      const data = node.data;
      const loc = node.location;
      return {
        key: data.key,
        label: data.label || '',
        shape: data.shape || 'Rectangle',
        color: data.color || '#ffffff',
        stroke: data.stroke || '#000000',
        loc: `${loc.x - minX} ${loc.y - minY}`,
        width: data.width || 100,
        height: data.height || 50,
      };
    });

    // Create pattern links from selected links
    const patternLinks = Array.from(selectedLinks).map(link => ({
      from: link.data.from,
      to: link.data.to,
    }));

    // Calculate pattern dimensions
    let maxX = 0, maxY = 0;
    patternShapes.forEach(shape => {
      const [x, y] = shape.loc.split(' ').map(Number);
      maxX = Math.max(maxX, x + shape.width);
      maxY = Math.max(maxY, y + shape.height);
    });

    const newPattern = {
      name: patternName,
      description: `Custom pattern with ${patternShapes.length} shapes`,
      isPattern: true as const,
      group: selectedContainer,
      shapes: patternShapes,
      links: patternLinks,
      dimensions: {
        width: maxX,
        height: maxY
      }
    };

    // Add to custom container shapes - use currentCustomContainerShapes
    setCustomContainerShapes(prev => ({
      ...prev,
      [selectedContainer]: [...(prev[selectedContainer] || []), newPattern]
    }));

    // Ensure the container is in the containers list - use currentContainers
    if (!currentContainers.includes(selectedContainer)) {
      setContainers(prev => [...prev, selectedContainer]);
    }

    console.log('🎨 PATTERN CREATED:', {
      action: 'Custom pattern created from selection',
      timestamp: new Date().toISOString(),
      patternName: patternName,
      container: selectedContainer,
      shapeCount: patternShapes.length,
      linkCount: patternLinks.length,
      dimensions: newPattern.dimensions
    });

    alert(`Pattern "${patternName}" added to ${selectedContainer} container!`);
  }

  const handleExportSVG = () => {
    if (diagramRef.current) {
      const svg = diagramRef.current.makeSvg({
        scale: 1,
        background: 'white',
        document: document
      });

      if (!svg) {
        alert('Failed to export SVG: Diagram rendering failed.');
        return;
      }
      
      const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagram_${new Date().toISOString().slice(0, 10)}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportPNG = () => {
    if (diagramRef.current) {
      const img = diagramRef.current.makeImage({
        scale: 2, // Higher resolution
        background: 'white',
        type: 'image/png',
        details: 0.05
      });

      if (!img) {
        alert('Failed to export PNG: Diagram rendering failed.');
        return;
      }
      
      const link = document.createElement('a');
      link.href = img.src;
      link.download = `diagram_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportJPG = () => {
    if (diagramRef.current) {
      const img = diagramRef.current.makeImage({
        scale: 2,
        background: 'white',
        type: 'image/jpeg',
        details: 0.05
      });

      if (!img) {
        alert('Failed to export JPG: Diagram rendering failed.');
        return;
      }
      
      const link = document.createElement('a');
      link.href = img.src;
      link.download = `diagram_${new Date().toISOString().slice(0, 10)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportXML = () => {
    if (diagramRef.current) {
      const model = diagramRef.current.model;
      const json = model.toJson();
      
      // Convert JSON to XML format
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<diagram>
  <metadata>
    <created>${new Date().toISOString()}</created>
    <tool>GoJS Diagram Editor</tool>
  </metadata>
  <data>
    ${json}
  </data>
</diagram>`;
      
      const xmlBlob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(xmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagram_${new Date().toISOString().slice(0, 10)}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="app" style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        onOpen={handleOpen}
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAbout={handleAbout}
        onValidate={handleValidate}
        onExportSVG={handleExportSVG}
        onExportPNG={handleExportPNG}
        onExportJPG={handleExportJPG}
        onExportXML={handleExportXML}
        onCreatePattern={handleCreatePatternFromSelection}
      />
      <div
        className="main"
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          minWidth: 0,
          height: '100%',
          width: '100%',
        }}
      >
        {/* Left Sidebar */}
        <div
          style={{
            width: 300,
            minWidth: 180,
            maxWidth: 400,
            background: '#f9f9f9',
            borderRight: '1px solid #ddd',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1, // Ensure it appears above the canvas
            boxShadow: '0 0 5px rgba(0,0,0,0.1)',
            boxSizing: 'content-box',
            overflowX: 'hidden',
          }}
        >
          <LeftSidebar
            containers={containers}
            customContainerShapes={customContainerShapes}
            onAddContainer={handleAddContainer}
          />
        </div>
        {/* Canvas */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            height: '100%',
            display: 'flex',
          }}
        >
          <GoDiagram
            diagramRef={diagramRef}
            setSelectedData={setSelectedData}
            setContextMenu={setContextMenu}
            containers={containers}
          />
          <ContextMenu 
            contextMenu={contextMenu} 
            containers={containers} 
            customGroups={Object.keys(customGroups)}
            onMove={handleMoveNodeToContainer}
            onAddToGroup={handleAddToGroup}
          />
        </div>
        {/* Right Sidebar */}
        <div
          style={{
            width: 280,
            minWidth: 200,
            maxWidth: 340,
            background: '#f9f9f9',
            borderLeft: '1px solid #ddd',
            height: '100%',
            overflowY: 'auto',
          }}
        >
          <RightSidebar
            selectedData={selectedData} // <-- Replace null with actual selected node data from GoDiagram
            diagramRef={diagramRef}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
