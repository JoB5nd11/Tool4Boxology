import React, { useState, useEffect } from 'react';
import * as go from 'gojs';
import { 
  FormatAlignLeft,
  FormatAlignCenter, 
  FormatAlignRight,
  VerticalAlignTop,
  VerticalAlignCenter,
  VerticalAlignBottom,
  SwapHoriz,
  SwapVert
} from '@mui/icons-material';

interface RightSidebarProps {
  selectedData: {
    key: string | number;
    name: string;
    label: string;
    color: string;
    stroke: string;
    shape: string;
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

  // Sync local state when selectedData changes
  useEffect(() => {
    if (selectedData) {
      setLocalLabel(selectedData.label || '');
      setLocalColor(selectedData.color || '#ffffff');
      setLocalStroke(selectedData.stroke || '#000000');
      setLocalShape(selectedData.shape || 'Rectangle');
    }
  }, [selectedData]);

  const handleSidebarChange = (field: string, value: string) => {
    if (!selectedData || !diagramRef.current) return;
    
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

  // Alignment functions
  const alignNodes = (alignment: string) => {
    if (!diagramRef.current) return;
    
    const diagram = diagramRef.current;
    const selectedNodes = diagram.selection.filter(part => part instanceof go.Node);
    
    if (selectedNodes.count < 2) {
      alert('Please select at least 2 nodes to align');
      return;
    }

    diagram.startTransaction('align nodes');
    
    try {
      const nodes = selectedNodes.toArray() as go.Node[];
      const bounds = nodes.map(node => node.actualBounds);
      
      switch (alignment) {
        case 'left':
          const leftX = Math.min(...bounds.map(b => b.x));
          nodes.forEach(node => node.move(new go.Point(leftX, node.position.y)));
          break;
          
        case 'right':
          const rightX = Math.max(...bounds.map(b => b.right));
          nodes.forEach(node => node.move(new go.Point(rightX - node.actualBounds.width, node.position.y)));
          break;
          
        case 'top':
          const topY = Math.min(...bounds.map(b => b.y));
          nodes.forEach(node => node.move(new go.Point(node.position.x, topY)));
          break;
          
        case 'bottom':
          const bottomY = Math.max(...bounds.map(b => b.bottom));
          nodes.forEach(node => node.move(new go.Point(node.position.x, bottomY - node.actualBounds.height)));
          break;
          
        case 'centerH':
          const centerY = bounds.reduce((sum, b) => sum + b.centerY, 0) / bounds.length;
          nodes.forEach(node => node.move(new go.Point(node.position.x, centerY - node.actualBounds.height / 2)));
          break;
          
        case 'centerV':
          const centerX = bounds.reduce((sum, b) => sum + b.centerX, 0) / bounds.length;
          nodes.forEach(node => node.move(new go.Point(centerX - node.actualBounds.width / 2, node.position.y)));
          break;
      }
    } catch (error) {
      console.error('Error aligning nodes:', error);
    }
    
    diagram.commitTransaction('align nodes');
  };

  // Distribution functions
  const distributeNodes = (direction: 'horizontal' | 'vertical') => {
    if (!diagramRef.current) return;
    
    const diagram = diagramRef.current;
    const selectedNodes = diagram.selection.filter(part => part instanceof go.Node);
    
    if (selectedNodes.count < 3) {
      alert('Please select at least 3 nodes to distribute');
      return;
    }

    diagram.startTransaction('distribute nodes');
    
    try {
      const nodes = selectedNodes.toArray() as go.Node[];
      
      if (direction === 'horizontal') {
        nodes.sort((a, b) => a.position.x - b.position.x);
        const first = nodes[0].position.x;
        const last = nodes[nodes.length - 1].position.x;
        const gap = (last - first) / (nodes.length - 1);
        
        nodes.forEach((node, index) => {
          node.move(new go.Point(first + gap * index, node.position.y));
        });
      } else {
        nodes.sort((a, b) => a.position.y - b.position.y);
        const first = nodes[0].position.y;
        const last = nodes[nodes.length - 1].position.y;
        const gap = (last - first) / (nodes.length - 1);
        
        nodes.forEach((node, index) => {
          node.move(new go.Point(node.position.x, first + gap * index));
        });
      }
    } catch (error) {
      console.error('Error distributing nodes:', error);
    }
    
    diagram.commitTransaction('distribute nodes');
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
      
      {selectedData && (
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
        </div>
      )}

      {/* Alignment Tools with Material-UI Icons */}
      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>Alignment Tools</h4>
        
        {/* Horizontal & Vertical Alignment */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: '11px', color: '#666', margin: '0 0 6px 0' }}>Align Objects:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            <button 
              onClick={() => alignNodes('left')} 
              style={iconButtonStyle} 
              title="Align Left"
              onMouseEnter={(e) => Object.assign(e.target.style, iconButtonHoverStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, iconButtonStyle)}
            >
              <FormatAlignLeft fontSize="small" />
            </button>
            <button 
              onClick={() => alignNodes('centerV')} 
              style={iconButtonStyle} 
              title="Center Vertically"
              onMouseEnter={(e) => Object.assign(e.target.style, iconButtonHoverStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, iconButtonStyle)}
            >
              <FormatAlignCenter fontSize="small" />
            </button>
            <button 
              onClick={() => alignNodes('right')} 
              style={iconButtonStyle} 
              title="Align Right"
              onMouseEnter={(e) => Object.assign(e.target.style, iconButtonHoverStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, iconButtonStyle)}
            >
              <FormatAlignRight fontSize="small" />
            </button>
            <button 
              onClick={() => alignNodes('top')} 
              style={iconButtonStyle} 
              title="Align Top"
              onMouseEnter={(e) => Object.assign(e.target.style, iconButtonHoverStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, iconButtonStyle)}
            >
              <VerticalAlignTop fontSize="small" />
            </button>
            <button 
              onClick={() => alignNodes('centerH')} 
              style={iconButtonStyle} 
              title="Center Horizontally"
              onMouseEnter={(e) => Object.assign(e.target.style, iconButtonHoverStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, iconButtonStyle)}
            >
              <VerticalAlignCenter fontSize="small" />
            </button>
            <button 
              onClick={() => alignNodes('bottom')} 
              style={iconButtonStyle} 
              title="Align Bottom"
              onMouseEnter={(e) => Object.assign(e.target.style, iconButtonHoverStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, iconButtonStyle)}
            >
              <VerticalAlignBottom fontSize="small" />
            </button>
          </div>
        </div>

        {/* Distribution */}
        <div>
          <p style={{ fontSize: '11px', color: '#666', margin: '0 0 6px 0' }}>Distribute Objects:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <button 
              onClick={() => distributeNodes('horizontal')} 
              style={iconButtonStyle} 
              title="Distribute Horizontally"
              onMouseEnter={(e) => Object.assign(e.target.style, iconButtonHoverStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, iconButtonStyle)}
            >
              <SwapHoriz fontSize="small" />
            </button>
            <button 
              onClick={() => distributeNodes('vertical')} 
              style={iconButtonStyle} 
              title="Distribute Vertically"
              onMouseEnter={(e) => Object.assign(e.target.style, iconButtonHoverStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, iconButtonStyle)}
            >
              <SwapVert fontSize="small" />
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div style={{ 
          marginTop: 12, 
          padding: 8, 
          backgroundColor: '#e3f2fd', 
          borderRadius: 4,
          fontSize: '11px',
          color: '#1976d2'
        }}>
          💡 <strong>Tip:</strong> Select multiple objects first, then use alignment tools
        </div>
      </div>
    </div>
  );
}
