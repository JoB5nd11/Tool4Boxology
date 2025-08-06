import React, { useEffect, useRef } from 'react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  contextMenu: ContextMenuPosition | null;
  containers: string[];
  customGroups: string[];
  onAction: (action: string, target?: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ 
  contextMenu, 
  containers, 
  customGroups,
  onAction
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onAction('close');
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onAction('close');
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
  }, [contextMenu, onAction]);

  if (!contextMenu) return null;

  // Separate containers and groups for better organization
  const systemContainers = containers.filter(c => c !== 'PatternLib');
  const allGroups = customGroups.filter(g => g !== 'CREATE_NEW' && g !== 'SAVE_TO_GROUP');
  const hasSaveToGroup = customGroups.includes('SAVE_TO_GROUP');

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: Math.min(contextMenu.x, window.innerWidth - 200),
        top: Math.min(contextMenu.y, window.innerHeight - 300),
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
              onClick={() => onAction('move', container)}
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
            fontWeight: 600,
            fontSize: '13px',
            color: '#444',
            padding: '8px 16px 4px 16px'
          }}>
            Add to Group:
          </div>
          {allGroups.map(group => (
            <div
              key={group}
              style={{
                padding: '6px 24px',
                cursor: 'pointer',
                color: '#512da8',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => onAction('save_to_group', group)}
            >
              <span style={{ marginRight: 8 }}>👥</span>
              {group}
            </div>
          ))}
        </>
      )}

      {/* Save to Group Option */}
      {hasSaveToGroup && (
        <div
          style={{ 
            cursor: 'pointer', 
            padding: '8px 12px',
            fontSize: '14px',
            color: '#28a745',
            fontWeight: '500',
            borderBottom: '1px solid #f0f0f0',
            transition: 'background-color 0.2s ease'
          }}
          onClick={() => onAction('save_to_group')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0fff0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          💾 Save to Group
        </div>
      )}

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
        onClick={() => onAction('close')}
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