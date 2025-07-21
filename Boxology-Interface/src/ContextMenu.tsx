import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  contextMenu: { x: number; y: number } | null;
  containers: string[];
  customGroups?: string[];
  onMove: (container: string | null) => void;
  onAddToGroup: (group: string, shape: any) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ 
  contextMenu, 
  containers, 
  customGroups = [],
  onMove,
  onAddToGroup
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onMove(null); // Fix: Use onMove(null) instead of closeMenu()
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onMove(null); // Close menu
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [contextMenu, onMove]);

  if (!contextMenu) return null;

  // Separate containers and groups for better organization
  const systemContainers = containers.filter(c => c !== 'PatternLib');
  const allGroups = [...customGroups];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed', // Use fixed instead of absolute for better positioning
        left: Math.min(contextMenu.x, window.innerWidth - 200), // Prevent overflow
        top: Math.min(contextMenu.y, window.innerHeight - 300), // Prevent overflow
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        padding: 0,
        minWidth: '180px',
        maxHeight: '300px',
        overflowY: 'auto',
      }}
    >
      {/* Move to Container Section */}
      {systemContainers.length > 0 && (
        <>
          <div style={{ 
            padding: '8px 12px', 
            fontWeight: 'bold', 
            fontSize: '12px',
            color: '#666',
            borderBottom: '1px solid #eee',
            backgroundColor: '#f8f9fa'
          }}>
            Move to Container:
          </div>
          {systemContainers.map(container => (
            <div
              key={container}
              style={{ 
                cursor: 'pointer', 
                padding: '8px 12px',
                fontSize: '14px',
                transition: 'background-color 0.2s ease',
                borderBottom: '1px solid #f0f0f0'
              }}
              onClick={() => onMove(container)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e3f2fd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              📁 {container}
            </div>
          ))}
        </>
      )}

      {/* Add to Group Section */}
      {allGroups.length > 0 && (
        <>
          <div style={{ 
            padding: '8px 12px', 
            fontWeight: 'bold', 
            fontSize: '12px',
            color: '#666',
            borderBottom: '1px solid #eee',
            backgroundColor: '#f8f9fa'
          }}>
            Add to Group:
          </div>
          {allGroups.map(group => (
            <div
              key={group}
              style={{ 
                cursor: 'pointer', 
                padding: '8px 12px',
                fontSize: '14px',
                transition: 'background-color 0.2s ease',
                borderBottom: '1px solid #f0f0f0'
              }}
              onClick={() => onAddToGroup(group, null)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e8f5e8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              👥 {group}
            </div>
          ))}
        </>
      )}

      {/* Create New Group Option */}
      <div
        style={{ 
          cursor: 'pointer', 
          padding: '8px 12px',
          fontSize: '14px',
          color: '#007bff',
          fontWeight: '500',
          borderBottom: '1px solid #f0f0f0',
          transition: 'background-color 0.2s ease'
        }}
        onClick={() => {
          const groupName = prompt('Enter new group name:');
          if (groupName && groupName.trim()) {
            onAddToGroup(groupName.trim(), null);
          }
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f8ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ➕ Create New Group
      </div>

      {/* Cancel Option */}
      <div
        style={{ 
          cursor: 'pointer', 
          padding: '8px 12px',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          fontWeight: '500',
          transition: 'background-color 0.2s ease'
        }}
        onClick={() => onMove(null)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#fff3cd';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ✕ Cancel
      </div>
    </div>
  );
};

export default ContextMenu;