import React, { useState } from 'react';
import { shapes } from '../data/shape';
import type { ShapeDefinition } from '../types';
import ShapeGroup from './ShapeGroup';

interface ShapeGroupMap {
  [group: string]: ShapeDefinition[];
}

function groupShapesByCategory(shapes: ShapeDefinition[]): ShapeGroupMap {
  return shapes.reduce((acc, shape) => {
    acc[shape.group] = acc[shape.group] || [];
    acc[shape.group].push(shape);
    return acc;
  }, {} as ShapeGroupMap);
}

interface LeftSidebarProps {
  containers: string[];
  onAddContainer: () => void;
  customContainerShapes: { [key: string]: any[] };
}

export default function Sidebar({ containers, onAddContainer, customContainerShapes }: LeftSidebarProps) {
  const [customGroups, setCustomGroups] = useState<string[]>([]);

  const addGroup = () => {
    const name = prompt('Enter name for new shape group:');
    if (name && name.trim()) {
      setCustomGroups([...customGroups, name.trim()]);
    }
  };

  const addContainer = () => {
    const name = prompt('Container name?');
    if (name && name.trim() && !containers.includes(name.trim())) {
      onAddContainer();
    }
  };

  const grouped = groupShapesByCategory(shapes);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #dee2e6',
        boxShadow: 'inset -1px 0 3px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #dee2e6',
        }}
      >
        <span style={{ 
          fontWeight: '600', 
          fontSize: '14px',
          letterSpacing: '0.5px'
        }}>
          Shape Library
        </span>
        <button 
          onClick={addGroup} 
          style={{ 
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Add new shape group"
        >
          ＋
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px',
        }}
      >
        {/* Static Shape Groups */}
        <div style={{ marginBottom: '16px' }}>
          {Object.entries(grouped).map(([group, groupShapes]) => (
            <div key={group} style={{ marginBottom: '8px' }}>
              <ShapeGroup 
                title={group} 
                shapes={groupShapes}
              />
            </div>
          ))}
        </div>

        {/* Custom Groups Section */}
        {customGroups.length > 0 && (
          <div>
            <div style={{
              padding: '8px 12px',
              background: '#e3f2fd',
              border: '1px solid #bbdefb',
              borderRadius: '6px',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#1976d2',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Custom Groups
            </div>
            {customGroups.map((group) => (
              <div key={group} style={{ marginBottom: '8px' }}>
                <ShapeGroup 
                  title={group} 
                  shapes={[]}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty State for Custom Groups */}
        {customGroups.length === 0 && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#6c757d',
            fontSize: '12px',
            fontStyle: 'italic',
            background: '#f8f9fa',
            border: '1px dashed #dee2e6',
            borderRadius: '6px',
            margin: '8px 0'
          }}>
            Click + to add custom shape groups
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 12px',
        background: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        fontSize: '11px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        {Object.values(grouped).reduce((total, shapes) => total + shapes.length, 0)} shapes available
      </div>
    </div>
  );
}
