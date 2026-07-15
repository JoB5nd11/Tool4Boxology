import unittest
from beam_annotation_triples import generate_risk_marker_triples


class TestGenerateRiskMarkerTriples(unittest.TestCase):
    def test_emits_rdf_type_for_marked_node(self):
        nodes = [
            {"key": "extraction", "riskMarker": "RiskControl"},
        ]
        result = generate_risk_marker_triples(nodes)
        self.assertIn(
            "<http://tool4boxology.org/Component/extraction> "
            "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> "
            "<http://w3id.org/beam/risk#RiskControl> .",
            result,
        )

    def test_emits_risk_type_correctly(self):
        nodes = [{"key": "kg_query", "riskMarker": "Risk"}]
        result = generate_risk_marker_triples(nodes)
        self.assertIn(
            "<http://tool4boxology.org/Component/kg_query> "
            "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> "
            "<http://w3id.org/beam/risk#Risk> .",
            result,
        )

    def test_skips_nodes_without_marker(self):
        nodes = [{"key": "a"}, {"key": "b", "riskMarker": None}]
        result = generate_risk_marker_triples(nodes)
        self.assertEqual(result, "")

    def test_skips_unknown_marker_values(self):
        nodes = [{"key": "a", "riskMarker": "NotARealMarker"}]
        result = generate_risk_marker_triples(nodes)
        self.assertEqual(result, "")

    def test_multiple_marked_nodes(self):
        nodes = [
            {"key": "a", "riskMarker": "Risk"},
            {"key": "b", "riskMarker": "RiskControl"},
        ]
        result = generate_risk_marker_triples(nodes)
        self.assertEqual(len(result.strip().splitlines()), 2)


if __name__ == "__main__":
    unittest.main()
