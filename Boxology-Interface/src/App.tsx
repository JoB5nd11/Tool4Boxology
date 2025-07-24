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


  const handleSave = () => {
    if (diagramRef.current) {
      const json = diagramRef.current.model.toJson();
      localStorage.setItem('diagramData', json);
      alert('Diagram saved!');
    }
  };



  const handleOpen = () => {
    const json = localStorage.getItem('diagramData');
    if (json && diagramRef.current) {
      diagramRef.current.model = go.Model.fromJson(json);
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

  function handleAddContainer() {
    const name = prompt('Container name?');
    if (name && !containers.includes(name)) {
      setContainers([...containers, name]);
      setCustomContainerShapes(prev => ({ ...prev, [name]: [] }));
    }
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
