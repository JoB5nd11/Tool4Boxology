import React from 'react';

interface RightSidebarProps {
  selectedData: {
    key: string | number;
    label: string;
    color: string;
    stroke: string;
    shape: string;
    selectedData: any;
    diagramRef: React.RefObject<go.Diagram | null>;
  } | null;
  diagramRef: React.RefObject<any>;
}

export default function RightSidebar({ selectedData, diagramRef }: RightSidebarProps) {
  const handleSidebarChange = (field: keyof NonNullable<RightSidebarProps['selectedData']>, value: string) => {
    if (!selectedData || !diagramRef.current) return;
    const model = diagramRef.current.model;
    model.startTransaction('update');
    const nodeData = model.findNodeDataForKey(selectedData.key);
    if (nodeData) {
      model.setDataProperty(nodeData, field, value);
    }
    model.commitTransaction('update');
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
      <h3 style={{ marginTop: 0 }}>Selected Node</h3>
      {selectedData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Label:
            <input
              type="text"
              value={selectedData.label}
              onChange={(e) => handleSidebarChange('label', e.target.value)}
              style={{ width: '100%', padding: 6, marginTop: 4 }}
            />
          </label>
          <label>
            Fill Color:
            <input
              type="color"
              value={selectedData.color}
              onChange={(e) => handleSidebarChange('color', e.target.value)}
              style={{ width: '100%', padding: 4, marginTop: 4 }}
            />
          </label>
          <label>
            Stroke Color:
            <input
              type="color"
              value={selectedData.stroke}
              onChange={(e) => handleSidebarChange('stroke', e.target.value)}
              style={{ width: '100%', padding: 4, marginTop: 4 }}
            />
          </label>
          <label>
            Shape:
            <select
              value={selectedData.shape}
              onChange={(e) => handleSidebarChange('shape', e.target.value)}
              style={{ width: '100%', padding: 6, marginTop: 4 }}
            >
              <option value="Rectangle">Rectangle</option>
              <option value="RoundedRectangle">Rounded Rectangle</option>
              <option value="Diamond">Diamond</option>
              <option value="Ellipse">Ellipse</option>
              <option value="Triangle">Triangle</option>
              <option value="TriangleDown">Triangle Down</option>
              <option value="Hexagon">Hexagon</option>
            </select>
          </label>
        </div>
      ) : (
        <p>No node selected</p>
      )}
    </div>
  );
}
