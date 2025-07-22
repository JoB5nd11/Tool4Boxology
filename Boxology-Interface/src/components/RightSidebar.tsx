import React from 'react';
import * as go from 'gojs';

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

export default function RightSidebar({ selectedData, diagramRef }: RightSidebarProps) {
  // Local state for immediate UI updates
  const [localLabel, setLocalLabel] = React.useState('');
  const [localColor, setLocalColor] = React.useState('#ffffff');
  const [localStroke, setLocalStroke] = React.useState('#999999');
  const [localShape, setLocalShape] = React.useState('Rectangle');

  // Default color combinations like Draw.io
  const colorPresets = [
    { fill: '#ffffff', stroke: '#000000', name: 'White' },
    { fill: '#f8cecc', stroke: '#b85450', name: 'Light Red' },
    { fill: '#d5e8d4', stroke: '#82b366', name: 'Light Green' },
    { fill: '#dae8fc', stroke: '#6c8ebf', name: 'Light Blue' },
    { fill: '#fff2cc', stroke: '#d6b656', name: 'Light Yellow' },
    { fill: '#e1d5e7', stroke: '#9673a6', name: 'Light Purple' },
    { fill: '#fce5cd', stroke: '#d79b00', name: 'Light Orange' },
    { fill: '#f5f5f5', stroke: '#666666', name: 'Light Gray' },
    { fill: '#ffcccc', stroke: '#cc0000', name: 'Pink' },
    { fill: '#ccffcc', stroke: '#00cc00', name: 'Green' },
    { fill: '#ccccff', stroke: '#0000cc', name: 'Blue' },
    { fill: '#ffffcc', stroke: '#cccc00', name: 'Yellow' },
  ];

  // Update local state when selectedData changes
  React.useEffect(() => {
    if (selectedData) {
      setLocalLabel(selectedData.label || '');
      setLocalColor(selectedData.color || '#ffffff');
      setLocalStroke(selectedData.stroke || '#999999');
      setLocalShape(selectedData.shape || 'Rectangle');
    }
  }, [selectedData]);

  // Add debugging to see what we receive
  React.useEffect(() => {
    console.log('🎛️ RIGHTSIDEBAR PROPS CHANGED:', {
      selectedData,
      hasDiagramRef: !!diagramRef.current,
      timestamp: new Date().toISOString()
    });
  }, [selectedData, diagramRef]);

  const handleSidebarChange = (field: keyof NonNullable<RightSidebarProps['selectedData']>, value: string) => {
    console.log('🎛️ SIDEBAR CHANGE INITIATED:', {
      action: 'User changing property in sidebar',
      field,
      newValue: value,
      selectedNodeKey: selectedData?.key,
      timestamp: new Date().toISOString()
    });

    // Update local state immediately for UI responsiveness
    switch (field) {
      case 'label':
        setLocalLabel(value);
        break;
      case 'color':
        setLocalColor(value);
        break;
      case 'stroke':
        setLocalStroke(value);
        break;
      case 'shape':
        setLocalShape(value);
        break;
    }

    if (!selectedData || !diagramRef.current) {
      console.log('❌ SIDEBAR CHANGE FAILED:', {
        reason: !selectedData ? 'No node selected' : 'Diagram reference null',
        selectedData: !!selectedData,
        diagramRef: !!diagramRef.current,
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const model = diagramRef.current.model;
      model.startTransaction(`update ${field}`);
      
      const nodeData = model.findNodeDataForKey(selectedData.key);
      if (nodeData) {
        console.log('🔄 UPDATING NODE DATA:', {
          action: 'Setting property on node data',
          nodeKey: selectedData.key,
          field,
          oldValue: nodeData[field],
          newValue: value,
          timestamp: new Date().toISOString()
        });
        
        model.setDataProperty(nodeData, field, value);
        console.log('✅ NODE DATA UPDATED:', {
          action: 'Property successfully updated',
          nodeKey: selectedData.key,
          field,
          updatedValue: nodeData[field],
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('❌ NODE NOT FOUND:', {
          reason: 'Could not find node data for key',
          searchKey: selectedData.key,
          timestamp: new Date().toISOString()
        });
      }
      
      model.commitTransaction(`update ${field}`);
    } catch (error) {
      console.error('❌ SIDEBAR CHANGE ERROR:', {
        error: error instanceof Error ? error.message : String(error),
        field,
        value,
        nodeKey: selectedData?.key,
        timestamp: new Date().toISOString()
      });
      // Rollback transaction if it was started
      if (diagramRef.current?.model && diagramRef.current.isModified) {
        diagramRef.current.model.rollbackTransaction();
      }
    }
  };

  return (
    <div
      style={{
        width: 240,
        background: '#f9f9f9',
        padding: 10,
        overflowY: 'auto',
        height: '100%',
        borderRight: '1px solid #ddd',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 15, color: '#333', fontSize: '16px' }}>Selected Node</h3>
      {selectedData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {/* Node Label */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: 6, 
              fontWeight: '600', 
              color: '#333',
              fontSize: '14px'
            }}>
              Label:
            </label>
            <input
              type="text"
              value={localLabel}
              onChange={(e) => {
                console.log('🔤 LABEL CHANGED:', e.target.value);
                handleSidebarChange('label', e.target.value);
              }}
              style={{ 
                width: '100%', 
                padding: '8px 10px', 
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter text to display"
            />
          </div>

          {/* Shape Type */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: 6, 
              fontWeight: '600', 
              color: '#333',
              fontSize: '14px'
            }}>
              Shape:
            </label>
            <select
              value={localShape}
              onChange={(e) => handleSidebarChange('shape', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'white',
                boxSizing: 'border-box'
              }}
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

          {/* Color Presets */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: 8, 
              fontWeight: '600', 
              color: '#333',
              fontSize: '14px'
            }}>
              Color Presets:
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '6px',
              marginBottom: '12px'
            }}>
              {colorPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    handleSidebarChange('color', preset.fill);
                    handleSidebarChange('stroke', preset.stroke);
                  }}
                  style={{
                    width: '40px',
                    height: '30px',
                    border: `2px solid ${preset.stroke}`,
                    backgroundColor: preset.fill,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 6, 
                fontWeight: '600', 
                color: '#333',
                fontSize: '14px'
              }}>
                Fill Color:
              </label>
              <input
                type="color"
                value={localColor}
                onChange={(e) => handleSidebarChange('color', e.target.value)}
                style={{ 
                  width: '100%', 
                  height: '36px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 6, 
                fontWeight: '600', 
                color: '#333',
                fontSize: '14px'
              }}>
                Stroke Color:
              </label>
              <input
                type="color"
                value={localStroke}
                onChange={(e) => handleSidebarChange('stroke', e.target.value)}
                style={{ 
                  width: '100%', 
                  height: '36px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Node Info Display */}
          <div style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            <strong>Node Type:</strong> {selectedData.name || 'Unknown'}
          </div>
        </div>
      ) : (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No node selected</p>
      )}
    </div>
  );
}
