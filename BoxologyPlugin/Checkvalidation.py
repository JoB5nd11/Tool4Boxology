import xml.etree.ElementTree as ET
import json


class BoxologyConverter:
    def __init__(self, drawio_file):
        self.drawio_file = drawio_file
        self.valid_next = {
            "symbol": ["infer:deduce", "generate:train", "transform:embed", "transform", "symbol"],
            "data": ["infer:deduce", "generate:train", "transform", "data"],
            "symbol/data": ["infer:deduce", "transform:embed", "transform", "symbol/data"],
            "infer:deduce": ["symbol", "model", "infer:deduce"],
            "model": ["infer:deduce", "model"],
            "generate:train": ["model", "generate:train", "model:semantic", "model:statics"],
            "actor": ["generate:engineer", "actor"],
            "generate:engineer": ["model", "generate:engineer"],
            "model:semantic": ["infer:deduce", "transform:embed", "model:semantic"],
            "model:statics": ["infer:deduce", "transform:embed", "model:statics"],
            "transform:embed": ["data", "transform:embed"],
            "transform": ["data", "symbol", "symbol/data", "transform"]
        }

    def parse_drawio(self):
        """Parses draw.io XML and extracts nodes and edges correctly."""
        tree = ET.parse(self.drawio_file)
        root = tree.getroot()
        nodes = {}
        edges = []

        # First, extract all nodes
        for cell in root.findall(".//mxCell"):
            cell_id = cell.get("id")
            value = cell.get("value")

            if value and not cell.get("edge"):  # Ignore edges, keep only nodes
                nodes[cell_id] = value

        # Now, extract edges using the correct node IDs
        for cell in root.findall(".//mxCell"):
            source = cell.get("source")
            target = cell.get("target")

            if source and target:
                source_value = nodes.get(source, f"Unknown ({source})")
                target_value = nodes.get(target, f"Unknown ({target})")
                edges.append((source_value, target_value))

        return nodes, edges

    def validate_pattern(self):
        """Validates extracted patterns against predefined grammar rules."""
        _, edges = self.parse_drawio()
        invalid_edges = []

        for source, target in edges:
            if target not in self.valid_next.get(source, []):
                invalid_edges.append((source, target))

        if invalid_edges:
            print("❌ Invalid connections detected:")
            for edge in invalid_edges:
                print(f"   {edge[0]} → {edge[1]}")
        else:
            print("✅ All connections are valid!")


if __name__ == "__main__":
    """Add .drawio file to check validation."""
    converter = BoxologyConverter("actor-generate-model.drawio")
    converter.validate_pattern()
