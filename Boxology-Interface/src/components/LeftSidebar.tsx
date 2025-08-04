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

export default function Sidebar({ 
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
          onClick={handleAddGroup} 
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
              <ShapeGroup 
                title={group} 
                shapes={shapes}
                onSelect={() => setSelectedGroup(group)}
                isSelected={selectedGroup === group}
              />
            </div>
          ))}
        </div>

        {/* New Custom Group Input */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '16px' 
        }}>
          <input 
            type="text" 
            value={newGroupName} 
            onChange={(e) => setNewGroupName(e.target.value)} 
            placeholder="New custom group name"
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '14px',
              marginRight: '8px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#80bdff'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
          />
          <button 
            onClick={handleAddGroup}
            style={{
              padding: '8px 12px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#0056b3'}
            onMouseOut={(e) => e.currentTarget.style.background = '#007bff'}
          >
            Create Group
          </button>
        </div>

        {/* Save to Custom Group Button */}
        {selectedGroup && (
          <div style={{ 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            background: '#e8f5e9',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #c8e6c9',
          }}>
            <span style={{ 
              flex: 1, 
              fontSize: '14px', 
              color: '#2e7d32',
              fontWeight: '500',
              marginRight: '8px'
            }}>
              Save to "{selectedGroup}"
            </span>
            <button 
              onClick={handleSaveAsCustomShape}
              style={{
                padding: '8px 12px',
                background: '#2e7d32',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#256029'}
              onMouseOut={(e) => e.currentTarget.style.background = '#2e7d32'}
            >
              Save Shape
            </button>
          </div>
        )}

        {/* Empty State for Custom Groups */}
        {Object.keys(customGroups).length === 0 && (
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
            No custom groups found. Create a new group to save shapes.
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
