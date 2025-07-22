import React, { useState, useEffect } from 'react';
import { shapes, patterns, libraryItems } from '../data/shape';
import type { ShapeDefinition, PatternDefinition, LibraryItem } from '../types/types';
import ShapeGroup from './ShapeGroup';

interface ShapeGroupMap {
  [group: string]: LibraryItem[];
}

function groupItemsByCategory(items: LibraryItem[]): ShapeGroupMap {
  return items.reduce((acc, item) => {
    const group = item.group || 'General';
    acc[group] = acc[group] || [];
    acc[group].push(item);
    return acc;
  }, {} as ShapeGroupMap);
}

interface LeftSidebarProps {
  containers: string[];
  onAddContainer: (name: string) => void;
  customContainerShapes: { [key: string]: any[] };
}

export default function Sidebar({ containers, onAddContainer, customContainerShapes }: LeftSidebarProps) {
  const [customGroups, setCustomGroups] = useState<string[]>([]);

  // Add debugging for component lifecycle
  useEffect(() => {
    console.log('🔄 LEFTSIDEBAR MOUNTED/UPDATED');
    return () => {
      console.log('💀 LEFTSIDEBAR UNMOUNTING');
    };
  }, []);

  useEffect(() => {
    console.log('📦 LEFTSIDEBAR - CONTAINERS PROP CHANGED:', containers);
  }, [containers]);

  const addGroup = () => {
    const name = prompt('Enter name for new shape group:');
    if (name && name.trim()) {
      setCustomGroups([...customGroups, name.trim()]);
    }
  };

  const addContainer = (e?: React.MouseEvent) => {
    // Prevent any default behavior that might cause page refresh
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🚀 ADD CONTAINER FUNCTION CALLED IN LEFTSIDEBAR');
    console.log('🔍 CURRENT CONTAINERS PROP:', containers);
    console.log('🔍 CONTAINERS TYPE:', typeof containers, 'IS ARRAY:', Array.isArray(containers));
    
    try {
      const name = prompt('Container name?');
      console.log('📝 USER ENTERED NAME:', name);
      console.log('📝 TRIMMED NAME:', name?.trim());
      
      if (name && name.trim()) {
        const trimmedName = name.trim();
        const alreadyExists = containers.includes(trimmedName);
        
        console.log('🔍 DETAILED CHECK:', {
          hasName: !!trimmedName,
          trimmedName: trimmedName,
          alreadyExists: alreadyExists,
          currentContainers: containers,
          containersLength: containers.length
        });
        
        if (!alreadyExists) {
          console.log('✅ CALLING onAddContainer with:', trimmedName);
          onAddContainer(trimmedName);
        } else {
          console.log('❌ CONTAINER ALREADY EXISTS');
        }
      } else {
        console.log('❌ NO VALID NAME PROVIDED');
      }
    } catch (error) {
      console.error('❌ ERROR IN ADD CONTAINER:', error);
    }
  };

  const grouped = groupItemsByCategory(libraryItems);

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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addContainer(e);
          }}
          type="button"
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
          title="Add new container"
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

        {/* Custom Containers Section - Show each container with its contents */}
        {containers.slice(2).map((containerName) => ( // Skip first 2 default containers
          <div key={containerName} style={{ marginBottom: '16px' }}>
            <ShapeGroup 
              title={containerName} 
              shapes={customContainerShapes[containerName] || []}
            />
          </div>
        ))}

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
        {Object.values(grouped).reduce((total, shapes) => total + shapes.length, 0) + 
         Object.values(customContainerShapes).reduce((total, shapes) => total + shapes.length, 0)} shapes/patterns available
      </div>
    </div>
  );
}
