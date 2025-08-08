import React, { useRef, useState, useEffect } from 'react';
import './App.css';
import Toolbar from './Toolbar';
import LeftSidebar from './components/LeftSidebar';
import GoDiagram from './GoDiagram';
import * as go from 'gojs';
import RightSidebar from './components/RightSidebar';
import ContextMenu from './ContextMenu';
import { validateGoJSDiagram, setupDiagramValidation } from './plugin/GoJSBoxologyValidation';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const diagramRef = useRef<go.Diagram | null>(null);
  const [containers, setContainers] = useState<string[]>(['General', 'Annotation']);
  const [customContainerShapes, setCustomContainerShapes] = useState<{ [key: string]: any[] }>({});
  const [selectedData, setSelectedData] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [customGroups, setCustomGroups] = useState<{ [key: string]: any[] }>({});

  // Consolidated container management
  const handleAddContainer = (containerName: string) => {
    if (containerName && !containers.includes(containerName)) {
      setContainers(prev => [...prev, containerName]);
      alert(`Container "${containerName}" added!`);
    } else if (containerName) {
      alert('Container already exists!');
    }
  };

  // Consolidated custom group management
  const handleCustomGroupAction = (action: 'create' | 'save', groupName?: string) => {
    if (action === 'create') {
      const name = prompt('Enter a name for your new group:');
      if (!name) return;
      if (customGroups[name]) {
        alert('A group with this name already exists.');
        return;
      }
      setCustomGroups(prev => ({ ...prev, [name]: [] }));
      return;
    } else if (action === 'save' && groupName) {
      handleSaveToCustomGroup(groupName);
    }
  };

  // Consolidated save to custom group function
  const handleSaveToCustomGroup = (groupName: string) => {
    if (!diagramRef.current) {
      alert('No diagram available');
      return;
    }

    const diagram = diagramRef.current;
    const selectedNodes = diagram.selection.toArray();
    let dataToSave;

    let shapeName = prompt('Enter a name for this shape:', `Custom Shape ${Date.now()}`);
    if (!shapeName) shapeName = `Custom Shape ${Date.now()}`;

    if (selectedNodes.length > 0) {
      // Save selected nodes and their connections
      const selectedKeys = selectedNodes.map(node => node.key);
      const nodeData = selectedNodes.map(node => diagram.model.copyNodeData(node.data));
      const links = Array.from(diagram.links).filter(link => 
        selectedKeys.includes(link.fromNode?.key) && selectedKeys.includes(link.toNode?.key)
      );
      const linkData = links.map(link => ({ ...link.data }));

      dataToSave = {
        nodeDataArray: nodeData,
        linkDataArray: linkData,
        name: shapeName,
        type: 'selection',
        thumbnail: null as string | null
      };
    } else {
      // Save entire diagram
      const model = diagram.model;
      const json = JSON.parse(model.toJson());
      dataToSave = {
        nodeDataArray: model.nodeDataArray.map(node => model.copyNodeData(node)),
        linkDataArray: json.linkDataArray || [],
        name: shapeName,
        type: 'diagram',
        thumbnail: null as string | null
      };
    }

    // Generate thumbnail
    try {
      const img = diagram.makeImageData({
        scale: 0.3,
        background: 'white',
        parts: selectedNodes.length > 0 ? selectedNodes : undefined,
        type: 'image/png'
      });
      if (typeof img === 'string') {
        dataToSave.thumbnail = img;
      } else if (img instanceof HTMLImageElement) {
        dataToSave.thumbnail = img.src;
      } else {
        dataToSave.thumbnail = null;
      }
    } catch (error) {
      console.warn('Could not generate thumbnail:', error);
    }

    setCustomGroups(prev => ({
      ...prev,
      [groupName]: [...(prev[groupName] || []), dataToSave]
    }));

    alert(`${selectedNodes.length > 0 ? 'Selection' : 'Diagram'} saved as custom shape in "${groupName}" group!`);
  };

  // Consolidated file operations
  const handleFileOperation = (operation: 'save' | 'open') => {
    if (!diagramRef.current) return;

    if (operation === 'save') {
      const json = diagramRef.current.model.toJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagram_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert('Diagram saved!');
    } else if (operation === 'open') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && diagramRef.current) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const json = event.target?.result as string;
              diagramRef.current!.model = go.Model.fromJson(json);
              alert('Diagram loaded successfully!');
            } catch (error) {
              alert('Error loading diagram: Invalid file format');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  // Consolidated export function
  const handleExport = (format: 'svg' | 'png' | 'jpg' | 'xml') => {
    if (!diagramRef.current) return;

    const diagram = diagramRef.current;
    const timestamp = new Date().toISOString().slice(0, 10);

    switch (format) {
      case 'svg':
        const svg = diagram.makeSvg({ scale: 1, background: 'white', document: document });
        if (!svg) {
          alert('Failed to export SVG: Diagram rendering failed.');
          return;
        }
        const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
        downloadFile(svgBlob, `diagram_${timestamp}.svg`);
        break;

      case 'png':
        const pngImg = diagram.makeImage({ scale: 2, background: 'white', type: 'image/png', details: 0.05 });
        if (!pngImg) {
          alert('Failed to export PNG: Diagram rendering failed.');
          return;
        }
        downloadImageFile(pngImg.src, `diagram_${timestamp}.png`);
        break;

      case 'jpg':
        const jpgImg = diagram.makeImage({ scale: 2, background: 'white', type: 'image/jpeg', details: 0.05 });
        if (!jpgImg) {
          alert('Failed to export JPG: Diagram rendering failed.');
          return;
        }
        downloadImageFile(jpgImg.src, `diagram_${timestamp}.jpg`);
        break;

      case 'xml':
        const json = diagram.model.toJson();
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
        downloadFile(xmlBlob, `diagram_${timestamp}.xml`);
        break;
    }
  };

  // Helper functions for downloads
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadImageFile = (src: string, filename: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Diagram operations
  const handleDiagramOperation = (operation: 'undo' | 'redo' | 'validate') => {
    if (!diagramRef.current) return;

    switch (operation) {
      case 'undo':
        diagramRef.current.undoManager?.undo();
        break;
      case 'redo':
        diagramRef.current.undoManager?.redo();
        break;
      case 'validate':
        const result = validateGoJSDiagram(diagramRef.current);
        alert(result);
        break;
    }
  };

  // Context menu handler
  const handleContextMenuAction = (action: string, target?: string) => {
    setContextMenu(null);
  

    switch (action) {
      case 'move':
        if (target) {
          console.log('Moving node to:', target);
          // Add your actual move logic here
        }
        break;
      case 'create_group':
        handleCustomGroupAction('create');
        break;
      case 'save_to_group':
        if (target) {
          handleCustomGroupAction('save', target);
          return;
        }
        break;
      default:
        if (target) {
          console.log('Adding to group:', target);
        }
    }
  };

  const handleAbout = () => {
    alert('Custom Diagram Editor using GoJS');
  };

  return (
    <div className="app" style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        onOpen={() => handleFileOperation('open')}
        onSave={() => handleFileOperation('save')}
        onUndo={() => handleDiagramOperation('undo')}
        onRedo={() => handleDiagramOperation('redo')}
        onAbout={handleAbout}
        onValidate={() => handleDiagramOperation('validate')}
        onExportSVG={() => handleExport('svg')}
        onExportPNG={() => handleExport('png')}
        onExportJPG={() => handleExport('jpg')}
        onExportXML={() => handleExport('xml')}
      />
      <div className="main" style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0, height: '100%', width: '100%' }}>
        <div style={{ width: 300, minWidth: 180, maxWidth: 400, background: '#f9f9f9', borderRight: '1px solid #ddd', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, boxShadow: '0 0 5px rgba(0,0,0,0.1)', boxSizing: 'content-box', overflowX: 'hidden' }}>
          <LeftSidebar
            containers={containers}
            customContainerShapes={customContainerShapes}
            customGroups={customGroups}
            onAddContainer={handleAddContainer}
            onCustomGroupAction={handleCustomGroupAction}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', height: '100%', display: 'flex' }}>
          <GoDiagram
            diagramRef={diagramRef}
            setSelectedData={setSelectedData}
            setContextMenu={setContextMenu}
            containers={containers}
            customGroups={customGroups} // <-- add this prop
          />
          <ContextMenu 
            contextMenu={contextMenu} 
            containers={containers} 
            customGroups={[...Object.keys(customGroups), 'CREATE_NEW', 'SAVE_TO_GROUP']}
            onAction={handleContextMenuAction}
          />
        </div>
        <div style={{ width: 280, minWidth: 200, maxWidth: 340, background: '#f9f9f9', borderLeft: '1px solid #ddd', height: '100%', overflowY: 'auto' }}>
          <RightSidebar
            selectedData={selectedData}
            diagramRef={diagramRef}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
