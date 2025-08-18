import React, { useEffect, useRef } from 'react';
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
      allowMove: false,
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
  }, [isOpen, subdiagramData]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: '800px',
          height: '600px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            borderBottom: '1px solid #eee',
            paddingBottom: '10px'
          }}
        >
          <h3 style={{ margin: 0, color: '#333' }}>Subdiagram Preview</h3>
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
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
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
          Read-only preview • Double-click super node to edit
        </div>
      </div>
    </div>
  );
};

export default SubdiagramPreview;