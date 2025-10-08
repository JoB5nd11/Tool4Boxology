import React, { useEffect, useRef } from 'react';
import * as go from 'gojs';

interface SubDiagramProps {
  superNode: any;
  onSave: (nodeData: any, subDiagramData: any) => void;
  containers: string[];
  customGroups: Record<string, any[]>;
}

const SubDiagram: React.FC<SubDiagramProps> = ({
  superNode,
  onSave,
  containers,
  customGroups
}) => {
  const diagramDivRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<go.Diagram | null>(null);

  useEffect(() => {
    if (!diagramDivRef.current) return;

    const $ = go.GraphObject.make;

    // Create subdiagram with same settings as main diagram
    const diagram = $(go.Diagram, diagramDivRef.current, {
      'undoManager.isEnabled': true,
      allowDrop: true,
      grid: $(
        go.Panel,
        'Grid',
        { gridCellSize: new go.Size(20, 20) },
        $(go.Shape, 'LineH', { stroke: '#eee' }),
        $(go.Shape, 'LineV', { stroke: '#eee' })
      ),
    });

    // Same node template as main diagram
    diagram.nodeTemplate = $(
      go.Node,
      'Auto',
      {
        locationSpot: go.Spot.Center,
        selectable: true,
        movable: true,
      },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      $(
        go.Shape,
        {
          strokeWidth: 1,
          stroke: '#999',
          portId: '',
          fromLinkable: true,
          toLinkable: true,
          width: 100,
          height: 60,
          minSize: new go.Size(60, 40),
          maxSize: new go.Size(200, 120),
        },
        new go.Binding('fill', 'color'),
        new go.Binding('stroke', 'stroke'),
        new go.Binding('figure', 'shape'),
        new go.Binding('width', 'width'),
        new go.Binding('height', 'height')
      ),
      $(
        go.TextBlock,
        {
          margin: 8,
          font: 'bold 12px sans-serif',
          stroke: '#333',
          maxLines: 2,
        },
        new go.Binding('text', 'label').makeTwoWay()
      )
    );

    diagram.linkTemplate = $(
      go.Link,
      { routing: go.Link.AvoidsNodes, corner: 5 },
      $(go.Shape, { strokeWidth: 2, stroke: "#555" }),
      $(go.Shape, { toArrow: "Triangle", fill: "#555", stroke: null })
    );

    // ADD: same Cluster group template for sub-diagrams
    diagram.groupTemplateMap.add('ClusterGroup',
      $(go.Group, 'Spot',
        {
          isSubGraphExpanded: true,
          layerName: 'Background',
          selectable: true,
          movable: true,
          handlesDragDropForMembers: true,
          computesBoundsAfterDrag: true,
        },
        $(go.Panel, 'Auto',
          $(go.Shape, 'RoundedRectangle', {
            fill: '#e9ecef',
            stroke: '#adb5bd',
            strokeWidth: 1.5,
            parameter1: 6
          }),
          $(go.Placeholder, { padding: 20 })
        ),
        $(go.TextBlock,
          {
            alignment: go.Spot.TopLeft,
            alignmentFocus: go.Spot.TopLeft,
            margin: new go.Margin(6, 0, 0, 8),
            editable: true,
            font: 'bold 12px sans-serif',
            stroke: '#333',
          },
          new go.Binding('text', 'label').makeTwoWay()
        )
      )
    );

    // Load existing subdiagram data if available
    if (superNode?.subDiagramData) {
      diagram.model = new go.GraphLinksModel(
        superNode.subDiagramData.nodeDataArray,
        superNode.subDiagramData.linkDataArray
      );
    }

    diagramRef.current = diagram;

    return () => {
      if (diagramRef.current) {
        diagramRef.current.div = null;
        diagramRef.current = null;
      }
    };
  }, [superNode]);

  // Handle drag and drop from sidebar to diagram
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const shapeData = e.dataTransfer.getData('application/gojs-shape');
    
    if (shapeData && diagramRef.current) {
      const shape = JSON.parse(shapeData);
      const diagram = diagramRef.current;
      const pt = diagram.transformViewToDoc(new go.Point(e.clientX - e.currentTarget.getBoundingClientRect().left, e.clientY - e.currentTarget.getBoundingClientRect().top));
      
      diagram.startTransaction('add node');
      
      const generateUniqueKey = () => {
        let key = shape.name;
        let i = 1;
        const model = diagram.model as go.GraphLinksModel;
        while (model.findNodeDataForKey(key)) {
          key = `${shape.name}_${i++}`;
        }
        return key;
      };

      const newNodeData = {
        key: generateUniqueKey(),
        label: shape.name,
        shape: shape.shape,
        color: shape.color,
        stroke: shape.stroke,
        loc: go.Point.stringify(pt),
        width: shape.width || 100,
        height: shape.height || 60
      };
      diagram.model.addNodeData(newNodeData);
      diagram.commitTransaction('add node');
    }
  };

  // Auto-save when diagram changes
  useEffect(() => {
    if (!diagramRef.current) return;

    const handleModelChange = () => {
      if (!diagramRef.current) return;
      
      const model = diagramRef.current.model as go.GraphLinksModel;
      const subDiagramData = {
        nodeDataArray: model.nodeDataArray,
        linkDataArray: model.linkDataArray
      };

      onSave(superNode, subDiagramData);
    };

    const timer = setTimeout(() => {
      diagramRef.current?.addModelChangedListener(handleModelChange);
    }, 1000); // Debounce saves

    return () => {
      clearTimeout(timer);
      diagramRef.current?.removeModelChangedListener(handleModelChange);
    };
  }, [superNode, onSave]);

  return (
    <div
      ref={diagramDivRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        position: 'relative'
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    />
  );
};

export default SubDiagram;