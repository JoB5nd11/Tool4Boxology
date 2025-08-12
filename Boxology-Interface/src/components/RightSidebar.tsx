import React, { useState, useEffect } from 'react';
import * as go from 'gojs';

interface RightSidebarProps {
  selectedData: {
    key: string | number;
    name: string;
    label: string;
    color: string;
    stroke: string;
    shape: string;
    isSuperNode?: boolean;
  } | null;
  diagramRef: React.RefObject<go.Diagram | null>;
}

// Predefined color themes (just colors, no names)
const colorPresets = [
  { color: '#ccffccff', stroke: '#218721ff' }, 
  { color: '#b7eaffff', stroke: '#1E5F8B' },  
  { color: '#f4ccf4ff', stroke: '#8B4F8B' },   
  { color: '#f8ce92ff', stroke: '#000000ff' }, 
  { color: '#fbf2a2ff', stroke: '#B8A600' },   // Transform
  { color: '#ff81f7ff', stroke: '#4c003bff' }, // Inference
  { color: '#FFA07A', stroke: '#CD5C5C' },     // Generate
  { color: '#f067acff', stroke: '#C1307A' },   // Engineer
  { color: '#F5F5DC', stroke: '#A9A9A9' },     // Comment
  { color: '#FFE4B5', stroke: '#FF8C00' },     // Warning
  { color: '#FFB6C1', stroke: '#DC143C' },     // Error
  { color: '#90EE90', stroke: '#228B22' },     // Success
];

export default function RightSidebar({ selectedData, diagramRef }: RightSidebarProps) {
  const [localLabel, setLocalLabel] = useState('');
  const [localColor, setLocalColor] = useState('#ffffff');
  const [localStroke, setLocalStroke] = useState('#000000');
  const [localShape, setLocalShape] = useState('Rectangle');
  const [selectedCount, setSelectedCount] = useState(0);

  // Check how many objects are selected
  useEffect(() => {
    if (diagramRef.current) {
      const diagram = diagramRef.current;
      setSelectedCount(diagram.selection.count);
      
      // Listen for selection changes
      const handleSelectionChanged = () => {
        setSelectedCount(diagram.selection.count);
      };
      
      diagram.addDiagramListener('ChangedSelection', handleSelectionChanged);
      
      return () => {
        diagram.removeDiagramListener('ChangedSelection', handleSelectionChanged);
      };
    }
  }, [diagramRef]);

  // Sync local state when selectedData changes (only for single selection)
  useEffect(() => {
    if (selectedData && selectedCount === 1) {
      setLocalLabel(selectedData.label || '');
      setLocalColor(selectedData.color || '#ffffff');
      setLocalStroke(selectedData.stroke || '#000000');
      setLocalShape(selectedData.shape || 'Rectangle');
    }
  }, [selectedData, selectedCount]);

  const handleSidebarChange = (field: string, value: string) => {
    if (!selectedData || !diagramRef.current || selectedCount !== 1) return;
    
    try {
      const diagram = diagramRef.current;
      const model = diagram.model;
      
      model.startTransaction('update property');
      
      const nodeData = model.findNodeDataForKey(selectedData.key);
      if (nodeData) {
        model.setDataProperty(nodeData, field, value);
      }
      
      model.commitTransaction('update property');
    } catch (error) {
      console.error('Error updating property:', error);
    }
  };

  const handleLabelChange = (label: string) => {
    setLocalLabel(label);
    handleSidebarChange('label', label);
  };

  const handleColorChange = (color: string) => {
    setLocalColor(color);
    handleSidebarChange('color', color);
  };

  const handleStrokeChange = (stroke: string) => {
    setLocalStroke(stroke);
    handleSidebarChange('stroke', stroke);
  };

  const handleShapeChange = (shape: string) => {
    setLocalShape(shape);
    handleSidebarChange('shape', shape);
  };

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    setLocalColor(preset.color);
    setLocalStroke(preset.stroke);
    handleSidebarChange('color', preset.color);
    handleSidebarChange('stroke', preset.stroke);
  };

  const iconButtonStyle: React.CSSProperties = {
    padding: '6px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '36px',
    minWidth: '36px',
    color: '#555',
  };

  const iconButtonHoverStyle = {
    backgroundColor: '#f0f0f0',
    borderColor: '#999',
  };

  return (
    <div
      style={{
        width: 260,
        background: '#f9f9f9',
        padding: 12,
        overflowY: 'auto',
        height: '100%',
        borderLeft: '1px solid #ddd',
        fontSize: '13px',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 16, color: '#333', fontSize: '16px' }}>Properties</h3>
      
      {/* Show properties only when exactly ONE shape is selected */}
      {selectedData && selectedCount === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Simple Label Editor */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: '12px' }}>
              Label:
            </label>
            <input
              type="text"
              value={localLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Enter text..."
              style={{ 
                width: '100%', 
                padding: 6, 
                border: '1px solid #ccc',
                borderRadius: 3,
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Color Presets - Just Colors */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: '12px' }}>
              Presets:
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: 4 
            }}>
              {colorPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyColorPreset(preset)}
                  style={{
                    width: 32,
                    height: 32,
                    border: `2px solid ${preset.stroke}`,
                    backgroundColor: preset.color,
                    borderRadius: 4,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title="Apply color preset"
                />
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ fontSize: '12px' }}>
              <strong>Fill:</strong>
              <input
                type="color"
                value={localColor}
                onChange={(e) => handleColorChange(e.target.value)}
                style={{ width: '100%', height: 28, marginTop: 4, border: 'none', borderRadius: 3 }}
              />
            </label>
            <label style={{ fontSize: '12px' }}>
              <strong>Stroke:</strong>
              <input
                type="color"
                value={localStroke}
                onChange={(e) => handleStrokeChange(e.target.value)}
                style={{ width: '100%', height: 28, marginTop: 4, border: 'none', borderRadius: 3 }}
              />
            </label>
          </div>

          {/* Shape Selector */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: '12px' }}>
              Shape:
            </label>
            <select
              value={localShape}
              onChange={(e) => handleShapeChange(e.target.value)}
              style={{ width: '100%', padding: 6, border: '1px solid #ccc', borderRadius: 3, fontSize: '13px' }}
            >
              <option value="Rectangle">Rectangle</option>
              <option value="RoundedRectangle">Rounded Rectangle</option>
              <option value="Diamond">Diamond</option>
              <option value="Ellipse">Ellipse</option>
              <option value="Triangle">Triangle</option>
              <option value="TriangleDown">Triangle Down</option>
              <option value="Hexagon">Hexagon</option>
            </select>
          </div>

          {/* Show object type only (no ID) */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '12px'
          }}>
            <h4 style={{ 
              fontSize: '14px', 
              color: '#555', 
              marginBottom: '8px',
              marginTop: 0,
              fontWeight: '600'
            }}>
              Object Info
            </h4>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Type:</strong> {selectedData.shape || 'Unknown'}
              </p>
              {selectedData.isSuperNode && (
                <p style={{ 
                  margin: '4px 0', 
                  color: '#1976d2',
                  fontWeight: '500'
                }}>
                  🔗 Super Node
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show message when multiple objects are selected */}
      {selectedCount > 1 && (
        <div style={{ 
          padding: '16px', 
          textAlign: 'center', 
          color: '#666',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            <strong>{selectedCount} objects selected</strong>
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
            Use alignment tools in the toolbar to organize multiple objects
          </p>
        </div>
      )}

      {/* Show message when no objects are selected */}
      {selectedCount === 0 && (
        <div style={{ 
          padding: '16px', 
          textAlign: 'center', 
          color: '#666'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Select an object to edit its properties
          </p>
        </div>
      )}
    </div>
  );
}
