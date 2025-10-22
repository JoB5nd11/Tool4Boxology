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

// Simplified color presets
const colorPresets = [
  '#ccffcc', '#b7eaff', '#f4ccf4', '#f8ce92', 
  '#fbf2a2', '#ff81f7', '#FFA07A', '#f067ac',
  '#F5F5DC', '#FFE4B5', '#FFB6C1', '#90EE90'
];

const strokePresets = [
  '#218721', '#1E5F8B', '#8B4F8B', '#000000',
  '#B8A600', '#4c003b', '#CD5C5C', '#C1307A',
  '#A9A9A9', '#FF8C00', '#DC143C', '#228B22'
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
      
      const handleSelectionChanged = () => {
        setSelectedCount(diagram.selection.count);
      };
      
      diagram.addDiagramListener('ChangedSelection', handleSelectionChanged);
      
      return () => {
        diagram.removeDiagramListener('ChangedSelection', handleSelectionChanged);
      };
    }
  }, [diagramRef]);

  // Sync local state when selectedData changes
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

  return (
    <div
      style={{
        width: 260,
        background: '#f9f9f9',
        padding: 12,
        overflowY: 'auto',
        height: '100%',
        borderLeft: '1px solid #ddd',
        fontSize: '13px'
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 16, color: '#333', fontSize: '16px' }}>Properties</h3>

      {!selectedData ? (
        <p style={{ color: '#666', fontSize: '13px' }}>Select an object to edit properties</p>
      ) : (
        <>
          {/* REMOVE THIS ENTIRE LABEL SECTION */}
          {/* 
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: 4, color: '#555' }}>
              Label:
            </label>
            <input
              type="text"
              value={localLabel}
              onChange={(e) => {
                setLocalLabel(e.target.value);
                handleSidebarChange('label', e.target.value);
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
          */}

          {/* Keep the rest: Color section */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: 8, color: '#555' }}>
              Fill Color:
            </label>
            {/* Color presets */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 4,
              marginBottom: 8
            }}>
              {colorPresets.map((color, index) => (
                <div
                  key={index}
                  onClick={() => handleColorChange(color)}
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    border: localColor === color ? '2px solid #000' : '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
            {/* Custom color input */}
            <input
              type="color"
              value={localColor}
              onChange={(e) => handleColorChange(e.target.value)}
              style={{ 
                width: '100%', 
                height: '32px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Keep: Stroke Color section */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: 8, color: '#555' }}>
              Stroke Color:
            </label>
            {/* Stroke presets */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 4,
              marginBottom: 8
            }}>
              {strokePresets.map((stroke, index) => (
                <div
                  key={index}
                  onClick={() => handleStrokeChange(stroke)}
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: stroke,
                    border: localStroke === stroke ? '2px solid #fff' : '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: localStroke === stroke ? '0 0 0 1px #000' : 'none'
                  }}
                />
              ))}
            </div>
            {/* Custom stroke input */}
            <input
              type="color"
              value={localStroke}
              onChange={(e) => handleStrokeChange(e.target.value)}
              style={{ 
                width: '100%', 
                height: '32px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
