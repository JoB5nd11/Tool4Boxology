import * as go from "gojs";

/**
 * Maps custom shape names to GoJS figure names
 */
export const mapShapeToGoJSFigure = (shapeType: string): string => {
  switch (shapeType) {
    case 'Rectangle':
      return "Rectangle";
      
    case 'RoundedRectangle':
      return "RoundedRectangle";
      
    case 'Ellipse':
    case 'Circle':
      return "Ellipse";
      
    case 'Diamond':
      return "Diamond";
      
    case 'Triangle':
      return "Triangle";
      
    case 'TriangleDown':
      return "TriangleDown";
      
    case 'Hexagon':
      return "CustomHexagon"; // Use our custom hexagon definition
      
    case 'Pentagon':
      return "Pentagon"; // Try basic pentagon name
      
    case 'Star':
      return "FivePointedStar";
      
    default:
      return "Rectangle";
  }
};

go.Shape.defineFigureGenerator("CustomHexagon", function(shape, w, h) {
  const geo = new go.Geometry();
  const fig = new go.PathFigure(w * 0.5, 0, true); // start at top center
  
  // Create hexagon points (6 sides)
  fig.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.25));      // top-right
  fig.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.7));      // bottom-right  
  fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.5, h));       // bottom
  fig.add(new go.PathSegment(go.PathSegment.Line, 0, h * 0.75));      // bottom-left
  fig.add(new go.PathSegment(go.PathSegment.Line, 0, h * 0.25));      // top-left
  fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.5, 0).close()); // back to top
  
  geo.add(fig);
  return geo;
});
