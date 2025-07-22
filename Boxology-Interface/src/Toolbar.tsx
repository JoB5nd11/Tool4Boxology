import React from 'react';
import './Toolbar.css';

export interface ToolbarProps {
  onOpen: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAbout: () => void;
  onValidate: () => void;
  onExportSVG: () => void;
  onExportPNG: () => void;
  onExportJPG: () => void;
  onExportXML: () => void;
  onCreatePattern: () => void;
}

export default function Toolbar({
  onOpen,
  onSave,
  onUndo,
  onRedo,
  onAbout,
  onValidate,
  onExportSVG,
  onExportPNG,
  onExportJPG,
  onExportXML,
  onCreatePattern,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button 
          className="toolbar-button"
          onClick={onOpen}
          title="Open diagram"
        >
          📁 Open
        </button>
        <button 
          className="toolbar-button"
          onClick={onSave}
          title="Save diagram"
        >
          💾 Save
        </button>
        <button 
          className="toolbar-button"
          onClick={onUndo}
          title="Undo last action"
        >
          ↶ Undo
        </button>
        <button 
          className="toolbar-button"
          onClick={onRedo}
          title="Redo last action"
        >
          ↷ Redo
        </button>
        <button 
          className="toolbar-button"
          onClick={onAbout}
          title="About this application"
        >
          ℹ️ About
        </button>
        <button
          className="toolbar-button validate-button"
          onClick={onValidate}
          title="Validate selected pattern"
          style={{
            marginLeft: '10px',
            background: '#4CAF50',
            color: 'white',
            fontWeight: 'bold',
            border: '2px solid #45a049',
          }}
        >
          ✓ Validate Pattern
        </button>
        <button
          className="toolbar-button create-pattern-button"
          onClick={onCreatePattern}
          title="Create pattern from selected shapes"
          style={{
            background: '#FF6B35',
            color: 'white',
            fontWeight: 'bold',
            border: '2px solid #E55A2B',
          }}
        >
          🎨 Create Pattern
        </button>
        <button
          className="toolbar-button export-button"
          onClick={onExportSVG}
          title="Export diagram as SVG"
        >
          📤 SVG
        </button>
        <button
          className="toolbar-button export-button"
          onClick={onExportPNG}
          title="Export diagram as PNG"
        >
          📤 PNG
        </button>
        <button
          className="toolbar-button export-button"
          onClick={onExportJPG}
          title="Export diagram as JPG"
        >
          📤 JPG
        </button>
        <button
          className="toolbar-button export-button"
          onClick={onExportXML}
          title="Export diagram as XML"
        >
          📤 XML
        </button>
      </div>
    </div>
  );
}
