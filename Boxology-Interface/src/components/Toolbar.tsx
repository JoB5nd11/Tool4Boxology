import React from 'react';
import * as go from 'gojs';
// Add MUI imports for alignment buttons
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom';
import AlignVerticalCenterIcon from '@mui/icons-material/AlignVerticalCenter';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Define ToolbarProps type
interface ToolbarProps {
  diagram: go.Diagram | null;
  onOpen: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAbout: () => void;
  onValidate: () => void;
  onExportSVG: () => void;
  onExportPNG: () => void;
  onExportJPG: () => void;
  onExportXML: () => void;
  onExportJSON: () => void;
  onExportDrawio: () => void;
  onExportDOT: () => void;
  onOpenGraphviz: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  diagram,
  onOpen,
  onSave,
  onUndo,
  onRedo,
  onAbout,
  onValidate,
  onExportSVG,
  onExportPNG,
  onExportJPG,
  onExportXML,
  onExportJSON,
  onExportDrawio,
  onExportDOT,
  onOpenGraphviz,
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);
  // Simple small button style for existing buttons
  const simpleButtonStyle: React.CSSProperties = {
    padding: '4px 8px',
    margin: '2px',
    border: '1px solid #ccc',
    backgroundColor: '#f8f8f8',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'normal',
    color: '#333',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // MUI icon button style for alignment tools
  const iconButtonStyle: React.CSSProperties = {
    padding: '4px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '28px',
    minWidth: '28px',
    color: '#555',
    margin: '1px',
  };

  const iconButtonHoverStyle = {
    backgroundColor: '#f0f0f0',
    borderColor: '#999',
  };

  // Alignment functions
  const alignNodes = (alignment: string) => {
    if (!diagram) return;
    
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

  const distributeNodes = (direction: 'horizontal' | 'vertical') => {
    if (!diagram) return;
    
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

  const organizeHorizontally = () => {
    if (!diagram) return;
    
    const selectedNodes = diagram.selection.filter(part => part instanceof go.Node);
    
    if (selectedNodes.count < 2) {
      alert('Please select at least 2 nodes to organize horizontally');
      return;
    }

    diagram.startTransaction('organize horizontally');
    
    try {
      const nodes = selectedNodes.toArray() as go.Node[];
      nodes.sort((a, b) => a.position.x - b.position.x);
      
      let currentX = nodes[0].position.x;
      const baseY = nodes[0].position.y;
      
      nodes.forEach((node, index) => {
        node.move(new go.Point(currentX, baseY));
        if (index < nodes.length - 1) {
          currentX += node.actualBounds.width + 40;
        }
      });
    } catch (error) {
      console.error('Error organizing nodes horizontally:', error);
    }
    
    diagram.commitTransaction('organize horizontally');
  };

  const organizeVertically = () => {
    if (!diagram) return;
    
    const selectedNodes = diagram.selection.filter(part => part instanceof go.Node);
    
    if (selectedNodes.count < 2) {
      alert('Please select at least 2 nodes to organize vertically');
      return;
    }

    diagram.startTransaction('organize vertically');
    
    try {
      const nodes = selectedNodes.toArray() as go.Node[];
      nodes.sort((a, b) => a.position.y - b.position.y);
      
      const baseX = nodes[0].position.x;
      let currentY = nodes[0].position.y;
      
      nodes.forEach((node, index) => {
        node.move(new go.Point(baseX, currentY));
        if (index < nodes.length - 1) {
          currentY += node.actualBounds.height + 40;
        }
      });
    } catch (error) {
      console.error('Error organizing nodes vertically:', error);
    }
    
    diagram.commitTransaction('organize vertically');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #ddd',
      flexWrap: 'wrap',
      minHeight: '36px'
    }}>
      {/* Existing toolbar buttons - made smaller and simpler */}
      <button onClick={onAbout} style={simpleButtonStyle}>ℹ️ About</button>
      <button onClick={onOpen} style={simpleButtonStyle}>📁 Open</button>
      <button onClick={onSave} style={simpleButtonStyle}>💾 Save</button>
      
      {/* Export Dropdown Menu */}
      <div ref={exportMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button 
          onClick={() => setShowExportMenu(!showExportMenu)}
          style={{
            ...simpleButtonStyle,
            backgroundColor: showExportMenu ? '#e9ecef' : 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          📤 Export {showExportMenu ? '▲' : '▼'}
        </button>
        
        {showExportMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: '160px',
            padding: '4px 0'
          }}>
            <button
              onClick={() => {
                onExportJSON();
                setShowExportMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              📄 JSON
            </button>

            <button
              onClick={() => {
                onExportDOT();        // NEW
                setShowExportMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              🟦 Graphviz DOT
            </button>

            <button
              onClick={() => {
                onExportDrawio();
                setShowExportMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🎨 Draw.io XML
            </button>
            
            <button
              onClick={() => {
                onExportSVG();
                setShowExportMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🖼️ SVG
            </button>
            
            <button
              onClick={() => {
                onExportPNG();
                setShowExportMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              �️ PNG
            </button>
            
            <div style={{
              borderTop: '1px solid #eee',
              margin: '4px 0'
            }} />
            
            <button
              onClick={() => {
                onExportXML();
                setShowExportMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#666'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              📋 XML (Legacy)
            </button>
          </div>
        )}
      </div>
      
      {/* NEW: Open in Graphviz (Visual Editor) */}
      <button
        onClick={onOpenGraphviz}
        style={simpleButtonStyle}
        title="Open DOT in Graphviz Visual Editor"
      >
        🟦 Graphviz
      </button>

      <div style={{ width: '1px', height: '20px', background: '#ccc', margin: '0 4px' }} />

      <button onClick={onUndo} style={simpleButtonStyle}>🔄 Undo</button>
      <button onClick={onRedo} style={simpleButtonStyle}>🔃 Redo</button>
      <button onClick={onValidate} style={simpleButtonStyle}>✅ Validate</button>
      
      {/* Separator */}
      <div style={{ width: '1px', height: '20px', backgroundColor: '#ccc', margin: '0 4px' }} />

      {/* Alignment Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '11px', color: '#666', marginRight: '4px' }}>Align:</span>
        
        {/* Row 1: Left, Center V, Right */}
        <button 
          onClick={() => alignNodes('left')} 
          style={iconButtonStyle} 
          title="Align Left"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconButtonHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconButtonStyle)}
        >
          <AlignHorizontalLeftIcon fontSize="small" />
        </button>
        
        <button 
          onClick={() => alignNodes('centerV')} 
          style={iconButtonStyle} 
          title="Align Center Vertically"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconButtonHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconButtonStyle)}
        >
          <AlignHorizontalCenterIcon fontSize="small" />
        </button>
        
        <button 
          onClick={() => alignNodes('right')} 
          style={iconButtonStyle} 
          title="Align Right"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconButtonHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconButtonStyle)}
        >
          <AlignHorizontalRightIcon fontSize="small" />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* Row 2: Top, Center H, Bottom */}
        <button 
          onClick={() => alignNodes('top')} 
          style={iconButtonStyle} 
          title="Align Top"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconButtonHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconButtonStyle)}
        >
          <AlignVerticalTopIcon fontSize="small" />
        </button>
        
        <button 
          onClick={() => alignNodes('centerH')} 
          style={iconButtonStyle} 
          title="Align Center Horizontally"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconButtonHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconButtonStyle)}
        >
          <AlignVerticalCenterIcon fontSize="small" />
        </button>
        
        <button 
          onClick={() => alignNodes('bottom')} 
          style={iconButtonStyle} 
          title="Align Bottom"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconButtonHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconButtonStyle)}
        >
          <AlignVerticalBottomIcon fontSize="small" />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '20px', backgroundColor: '#ccc', margin: '0 4px' }} />

      {/* Distribution Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '11px', color: '#666', marginRight: '4px' }}>Distribute:</span>
        
        <button 
          onClick={() => distributeNodes('horizontal')} 
          style={iconButtonStyle} 
          title="Distribute Horizontal"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconButtonHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconButtonStyle)}
        >
          <AlignHorizontalCenterIcon fontSize="small" />
          <span style={{ fontSize: '8px', marginLeft: '2px' }}>⟷</span>
        </button>
        
        <button 
          onClick={() => distributeNodes('vertical')} 
          style={iconButtonStyle} 
          title="Distribute Vertical"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconButtonHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconButtonStyle)}
        >
          <AlignVerticalCenterIcon fontSize="small" />
          <span style={{ fontSize: '8px', marginLeft: '2px' }}>⟱</span>
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '20px', backgroundColor: '#ccc', margin: '0 4px' }} />

      {/* Organize Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '11px', color: '#666', marginRight: '4px' }}>Organize:</span>
        
        <button 
          onClick={organizeHorizontally} 
          style={{
            ...iconButtonStyle,
            backgroundColor: '#e3f2fd',
            borderColor: '#1976d2',
            color: '#1976d2'
          }} 
          title="Organize Horizontally (80px spacing)"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, { backgroundColor: '#bbdefb', borderColor: '#1565c0' })}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: '#e3f2fd', borderColor: '#1976d2' })}
        >
          <ViewColumnIcon fontSize="small" />
        </button>
        
        <button 
          onClick={organizeVertically} 
          style={{
            ...iconButtonStyle,
            backgroundColor: '#e3f2fd',
            borderColor: '#1976d2',
            color: '#1976d2'
          }} 
          title="Organize Vertically (80px spacing)"
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, { backgroundColor: '#bbdefb', borderColor: '#1565c0' })}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, { backgroundColor: '#e3f2fd', borderColor: '#1976d2' })}
        >
          <ViewStreamIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

