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

export interface LeftSidebarProps {
  containers: string[];
  customContainerShapes: { [key: string]: any[] };
  customGroups: { [key: string]: any[] };
  onAddContainer: (containerName: string) => void;
  onCustomGroupAction: (action: 'create' | 'save', groupName?: string) => void;
}

export default function LeftSidebar({ 
  containers, 
  onAddContainer, 
  customContainerShapes,
  customGroups,
  onCustomGroupAction
}: LeftSidebarProps) {
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      onCustomGroupAction('create');
      setNewGroupName('');
    }
  };

  const handleSaveAsCustomShape = () => {
    if (selectedGroup) {
      onCustomGroupAction('save', selectedGroup);
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
          onClick={() => onCustomGroupAction('create')} 
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
          {Object.entries(customGroups).map(([group, shapes]) => (
            <div key={group} style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{group}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {shapes.map((shape: any) => (
                  <div
                    key={shape.id}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('application/custom-group-shape', JSON.stringify({
                        group: group,
                        shapeId: shape.id
                      }));
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      marginBottom: 8,
                      cursor: 'pointer',
                      border: '1px solid #e0e0e0',
                      borderRadius: 4,
                      padding: 4,
                      background: '#fff',
                      width: 64
                    }}
                    title={shape.name}
                  >
                    {shape.thumbnail ? (
                      <img
                        src={shape.thumbnail}
                        alt={shape.name}
                        style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 4 }}
                      />
                    ) : (
                      <div style={{
                        width: 48,
                        height: 48,
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#aaa',
                        marginBottom: 4
                      }}>
                        ?
                      </div>
                    )}
                    <div style={{
                      fontSize: 12,
                      fontWeight: 500,
                      textAlign: 'center',
                      maxWidth: 60,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {shape.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
    </div>
  );
}
