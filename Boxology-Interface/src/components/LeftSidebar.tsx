import React, { useState, useMemo } from 'react';
import { shapes } from '../data/shape';
import type { ShapeDefinition } from '../types';

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

// Define category order and icons for existing shapes
const categoryOrder = [
  'Data & Information',
  'Actors & Entities', 
  'AI & Models',
  'Processes & Actions',
  'Documentation'
];

const categoryIcons: { [key: string]: string } = {
  'Data & Information': '📊',
  'Actors & Entities': '👥',
  'AI & Models': '🤖',
  'Processes & Actions': '⚙️',
  'Documentation': '📝'
};

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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

  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Filter shapes based on search term
  const filteredShapes = useMemo(() => {
    if (!searchTerm.trim()) return shapes;
    
    const term = searchTerm.toLowerCase();
    return shapes.filter(shape => 
      shape.name.toLowerCase().includes(term) ||
      shape.label.toLowerCase().includes(term) ||
      shape.group.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const grouped = groupShapesByCategory(filteredShapes);
  
  // Sort categories by defined order
  const sortedCategories = categoryOrder.filter(category => grouped[category]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  const renderShape = (shape: ShapeDefinition) => {
    return (
      <div
        key={shape.name}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/gojs-shape', JSON.stringify(shape));
          e.dataTransfer.effectAllowed = 'copy';
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          background: '#fafafa',
          cursor: 'grab',
          minWidth: '70px',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#f0f0f0';
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#fafafa';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title={shape.label}
      >
        <div style={{
          width: '32px',
          height: '20px',
          background: shape.color,
          border: `1px solid ${shape.stroke}`,
          borderRadius: shape.shape === 'RoundedRectangle' ? '8px' : 
                     shape.shape === 'Ellipse' ? '50%' : 
                     shape.shape === 'Diamond' ? '2px' :
                     shape.shape === 'Triangle' ? '0' : '2px',
          clipPath: shape.shape === 'Triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' :
                   shape.shape === 'Diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
                   shape.shape === 'Hexagon' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : 'none',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} />
        <div style={{
          fontSize: '10px',
          fontWeight: '500',
          textAlign: 'center',
          color: '#333',
          lineHeight: '1.2'
        }}>
          {shape.label}
        </div>
      </div>
    );
  };

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

      {/* Search Bar */}
      <div style={{
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid #dee2e6',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search shapes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 32px 8px 12px',
              border: '1px solid #ddd',
              borderRadius: '20px',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              background: '#f8f9fa'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#ddd';
              e.target.style.background = '#f8f9fa';
            }}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#999',
                padding: '2px'
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#999',
            fontSize: '14px',
            pointerEvents: 'none'
          }}>
            🔍
          </div>
        </div>
        {searchTerm && (
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#666',
            textAlign: 'center'
          }}>
            {filteredShapes.length} shape(s) found
          </div>
        )}
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
          {searchTerm ? (
            // Show all results in a single group when searching
            filteredShapes.length > 0 ? (
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                  border: '1px solid #bbdefb',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1976d2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🔍 Search Results ({filteredShapes.length})
                </div>
                <div style={{ 
                  padding: '12px', 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  background: '#fff',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0'
                }}>
                  {filteredShapes.map((shape) => renderShape(shape))}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#999',
                fontStyle: 'italic'
              }}>
                No shapes found matching "{searchTerm}"
              </div>
            )
          ) : (
            // Show organized categories when not searching
            sortedCategories.map((category) => (
              <div key={category} style={{ marginBottom: '8px' }}>
                <div
                  onClick={() => toggleCategory(category)}
                  style={{
                    padding: '10px 12px',
                    background: collapsedCategories.has(category) 
                      ? 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)'
                      : 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                    border: `1px solid ${collapsedCategories.has(category) ? '#ccc' : '#bbdefb'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: collapsedCategories.has(category) ? '#666' : '#1976d2',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!collapsedCategories.has(category)) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #bbdefb 0%, #e1bee7 100%)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!collapsedCategories.has(category)) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>
                      {categoryIcons[category] || '📁'}
                    </span>
                    <span>{category}</span>
                    <span style={{
                      background: 'rgba(25, 118, 210, 0.1)',
                      color: '#1976d2',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      {grouped[category].length}
                    </span>
                  </div>
                  <span style={{
                    transform: collapsedCategories.has(category) ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.2s ease',
                    fontSize: '12px'
                  }}>
                    ▶
                  </span>
                </div>
                
                {!collapsedCategories.has(category) && (
                  <div style={{
                    padding: '12px',
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderTop: 'none',
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    {grouped[category].map((shape) => renderShape(shape))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Custom Groups Section */}
        {Object.keys(customGroups).length > 0 && (
          <div>
            <div style={{
              padding: '8px 12px',
              background: 'linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%)',
              border: '1px solid #ffcc02',
              borderRadius: '6px',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#e65100',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⭐</span>
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
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 12px',
        background: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        fontSize: '11px',
        color: '#6c757d',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{shapes.length} total shapes</span>
        <span>{Object.keys(grouped).length} categories</span>
      </div>
    </div>
  );
}
