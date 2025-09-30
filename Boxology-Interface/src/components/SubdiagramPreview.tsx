import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as go from 'gojs';
import { mapShapeToGoJSFigure } from '../utils/shapeMapping';

interface SubdiagramPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  subdiagramData: any;
}

const SubdiagramPreview: React.FC<SubdiagramPreviewProps> = ({
  isOpen,
  onClose,
  subdiagramData
}) => {
  const previewDivRef = useRef<HTMLDivElement>(null);
  const previewDiagramRef = useRef<go.Diagram | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Zoom functions
  const handleZoomIn = () => {
    if (previewDiagramRef.current) {
      previewDiagramRef.current.commandHandler.increaseZoom();
    }
  };

  const handleZoomOut = () => {
    if (previewDiagramRef.current) {
      previewDiagramRef.current.commandHandler.decreaseZoom();
    }
  };

  const handleZoomToFit = () => {
    if (previewDiagramRef.current) {
      previewDiagramRef.current.zoomToFit();
    }
  };

  // Drag functionality
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Keep window within viewport bounds
    const maxX = window.innerWidth - dimensions.width;
    const maxY = window.innerHeight - dimensions.height;
    
    setPosition({
      x: Math.max(-dimensions.width / 2, Math.min(maxX + dimensions.width / 2, newX)),
      y: Math.max(-dimensions.height / 2, Math.min(maxY + dimensions.height / 2, newY))
    });
  }, [isDragging, dragStart, dimensions]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeHandle) return;

    const rect = document.querySelector('.preview-modal')?.getBoundingClientRect();
    if (!rect) return;

    let newWidth = dimensions.width;
    let newHeight = dimensions.height;

    if (resizeHandle.includes('right')) {
      newWidth = Math.max(400, e.clientX - rect.left + 10);
    }
    if (resizeHandle.includes('left')) {
      newWidth = Math.max(400, rect.right - e.clientX + 10);
    }
    if (resizeHandle.includes('bottom')) {
      newHeight = Math.max(300, e.clientY - rect.top + 10);
    }
    if (resizeHandle.includes('top')) {
      newHeight = Math.max(300, rect.bottom - e.clientY + 10);
    }

    setDimensions({ width: newWidth, height: newHeight });
  }, [isResizing, resizeHandle, dimensions]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeHandle('');
  }, []);

  // Event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Reset position when window opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !previewDivRef.current || !subdiagramData) return;

    const $ = go.GraphObject.make;

    // Clean up existing diagram
    if (previewDiagramRef.current) {
      previewDiagramRef.current.div = null;
      previewDiagramRef.current = null;
    }

    // Create preview diagram
    const previewDiagram = $(go.Diagram, previewDivRef.current, {
      isReadOnly: true, // Make it read-only for preview
      allowMove: true,
      allowCopy: false,
      allowDelete: false,
      allowSelect: true,
      allowZoom: true,
      allowHorizontalScroll: true,
      allowVerticalScroll: true,
      grid: $(
        go.Panel,
        'Grid',
        { gridCellSize: new go.Size(20, 20) },
        $(go.Shape, 'LineH', { stroke: '#f0f0f0' }),
        $(go.Shape, 'LineV', { stroke: '#f0f0f0' })
      ),
    });

    // Node template for preview
    previewDiagram.nodeTemplate = $(
      go.Node,
      'Auto',
      {
        locationSpot: go.Spot.Center,
        selectable: false,

      },
      new go.Binding('location', 'loc', go.Point.parse),
      $(
        go.Shape,
        {
          strokeWidth: 1,
          stroke: '#999',
          width: 100,
          height: 60,
        },
        new go.Binding('fill', 'color'),
        new go.Binding('stroke', 'stroke'),
        new go.Binding('figure', 'shape', (shapeType) => {
          const figure = mapShapeToGoJSFigure(shapeType);
          return figure;
        }),
        new go.Binding('width', 'width'),
        new go.Binding('height', 'height'),
        new go.Binding('strokeWidth', 'strokeWidth'),
        new go.Binding('parameter1', 'parameter1')
      ),
      $(
        go.TextBlock,
        {
          margin: 8,
          font: 'bold 12px sans-serif',
          stroke: '#333',
          maxLines: 2,
          overflow: go.TextBlock.OverflowEllipsis
        },
        new go.Binding('text', 'label')
      )
    );

    // Link template for preview
    previewDiagram.linkTemplate = $(
      go.Link,
      { routing: go.Link.AvoidsNodes, corner: 5, selectable: false },
      $(go.Shape, { strokeWidth: 2, stroke: "#555" }),
      $(go.Shape, { toArrow: "Triangle", fill: "#555", stroke: null })
    );

    // Load the subdiagram data
    previewDiagram.model = new go.GraphLinksModel(
      subdiagramData.nodeDataArray || [],
      subdiagramData.linkDataArray || []
    );

    previewDiagramRef.current = previewDiagram;

    // Fit contents to view
    setTimeout(() => {
      if (previewDiagramRef.current) {
        previewDiagramRef.current.zoomToFit();
      }
    }, 100);

    // Cleanup
    return () => {
      if (previewDiagramRef.current) {
        previewDiagramRef.current.div = null;
        previewDiagramRef.current = null;
      }
    };
  }, [isOpen, subdiagramData, dimensions]);

  if (!isOpen) return null;

  const resizeHandleStyle = {
    position: 'absolute' as const,
    backgroundColor: 'transparent',
    zIndex: 10,
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isResizing ? 'grabbing' : isDragging ? 'grabbing' : 'default',
        backgroundColor: 'rgba(0, 0, 0, 0.3)'
      }}
      // Removed onClick={onClose} so clicking outside doesn't close the window
    >
      <div
        className="preview-modal"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '95vw',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging || isResizing ? 'none' : 'transform 0.2s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resize handles */}
        {/* Top edge */}
        <div
          style={{
            ...resizeHandleStyle,
            top: '-3px',
            left: '10px',
            right: '10px',
            height: '6px',
            cursor: 'n-resize'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'top')}
        />
        
        {/* Bottom edge */}
        <div
          style={{
            ...resizeHandleStyle,
            bottom: '-3px',
            left: '10px',
            right: '10px',
            height: '6px',
            cursor: 's-resize'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'bottom')}
        />
        
        {/* Left edge */}
        <div
          style={{
            ...resizeHandleStyle,
            left: '-3px',
            top: '10px',
            bottom: '10px',
            width: '6px',
            cursor: 'w-resize'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'left')}
        />
        
        {/* Right edge */}
        <div
          style={{
            ...resizeHandleStyle,
            right: '-3px',
            top: '10px',
            bottom: '10px',
            width: '6px',
            cursor: 'e-resize'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'right')}
        />
        
        {/* Corner handles */}
        {/* Top-left corner */}
        <div
          style={{
            ...resizeHandleStyle,
            top: '-3px',
            left: '-3px',
            width: '13px',
            height: '13px',
            cursor: 'nw-resize'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'top-left')}
        />
        
        {/* Top-right corner */}
        <div
          style={{
            ...resizeHandleStyle,
            top: '-3px',
            right: '-3px',
            width: '13px',
            height: '13px',
            cursor: 'ne-resize'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'top-right')}
        />
        
        {/* Bottom-left corner */}
        <div
          style={{
            ...resizeHandleStyle,
            bottom: '-3px',
            left: '-3px',
            width: '13px',
            height: '13px',
            cursor: 'sw-resize'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
        />
        
        {/* Bottom-right corner */}
        <div
          style={{
            ...resizeHandleStyle,
            bottom: '-3px',
            right: '-3px',
            width: '13px',
            height: '13px',
            cursor: 'se-resize'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
        />

        {/* Draggable header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            borderBottom: '1px solid #eee',
            paddingBottom: '10px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
          onMouseDown={handleDragStart}
        >
          <h3 style={{ margin: 0, color: '#333', pointerEvents: 'none' }}>Subdiagram Preview</h3>
          
          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleZoomOut}
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#495057',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#adb5bd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
              }}
              title="Zoom Out"
            >
              −
            </button>
            
            <button
              onClick={handleZoomToFit}
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#495057',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#adb5bd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
              }}
              title="Fit to View"
            >
              Fit
            </button>
            
            <button
              onClick={handleZoomIn}
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#495057',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#adb5bd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
              }}
              title="Zoom In"
            >
              +
            </button>
            
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '0',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Close Preview"
            >
              ×
            </button>
          </div>
        </div>
        <div
          ref={previewDivRef}
          style={{
            flex: 1,
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#fff'
          }}
        />
        <div
          style={{
            marginTop: '15px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px'
          }}
        >
          Drag to move. Resize from edges or corners.
        </div>
      </div>
    </div>
  );
};

export default SubdiagramPreview;