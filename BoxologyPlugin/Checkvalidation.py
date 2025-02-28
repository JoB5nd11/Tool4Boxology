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

        self.valid_patterns = [
            ["symbol", "generate:train", "model:semantic"],
            ["data", "generate:train", "model:statics"],
            ["symbol/data", "transform", "data"],
            ["actor", "generate:engineer", "model"],
            ["model:semantic", "infer:deduce", "symbol", "symbol"],
            ["data", "infer:deduce", "symbol", "model"],
            ["symbol/data", "infer:deduce", "model", "model"],
            ["symbol", "transform:embed", "data", "model:semantic"]
        ]

    def parse_drawio(self):
        """Parses draw.io XML and extracts nodes and edges correctly."""
        tree = ET.parse(self.drawio_file)
        root = tree.getroot()
        nodes = {}
        edges = []

        for cell in root.findall(".//mxCell"):
            cell_id = cell.get("id")
            value = cell.get("value")
            if value and not cell.get("edge"):  # Ignore edges, keep only nodes
                nodes[cell_id] = value

        for cell in root.findall(".//mxCell"):
            source = cell.get("source")
            target = cell.get("target")
            if source and target:
                source_value = nodes.get(source, f"Unknown ({source})")
                target_value = nodes.get(target, f"Unknown ({target})")
                edges.append((source_value, target_value))

        return nodes, edges

    def validate_pattern(self):
        """Validates connections and full patterns."""
        _, edges = self.parse_drawio()
        invalid_edges = []
        valid_edges = []
        extracted_sequence = []

        for source, target in edges:
            extracted_sequence.append(source)
            if target in self.valid_next.get(source, []):
                valid_edges.append((source, target))
            else:
                invalid_edges.append((source, target))

        extracted_sequence.append(edges[-1][1])  # Ensure last node is included

        is_valid_pattern = any(
            all(node in extracted_sequence for node in pattern) for pattern in self.valid_patterns
        )

        if valid_edges:
            print("✅ Valid connections:")
            for edge in valid_edges:
                print(f"   {edge[0]} → {edge[1]}")

        if invalid_edges:
            print("❌ Invalid connections detected:")
            for edge in invalid_edges:
                print(f"   {edge[0]} → {edge[1]}")
        else:
            print("✅ All connections are valid!")

        if is_valid_pattern:
            print("✅ The full pattern is valid!")
        else:
            print("❌ The full pattern does not match any predefined valid patterns!")


if __name__ == "__main__":
    """Add your Diagram here."""
    converter = BoxologyConverter("example.drawio")
    converter.validate_pattern()