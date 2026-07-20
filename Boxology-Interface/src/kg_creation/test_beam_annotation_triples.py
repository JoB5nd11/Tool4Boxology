import unittest
from beam_annotation_triples import (
    generate_annotation_triples,
    generate_component_triples,
    generate_risk_marker_triples,
)

T4B = "http://tool4boxology.org/"
BEAM = "http://w3id.org/beam/core#"
BEAMR = "http://w3id.org/beam/risk#"


def _box(annotations=None, annotation_links=None, nodes=None, workflow_links=None):
    return {"boxologies": [{
        "id": "b1",
        "annotations": annotations or [],
        "annotationLinks": annotation_links or [],
        "nodeDataArray": nodes or [],
        "workflowLinks": workflow_links or [],
    }]}


def _alink(f, t, ftype, ttype, f_ann, t_ann):
    return {"from": f, "to": t, "fromType": ftype, "toType": ttype,
            "fromIsAnnotation": f_ann, "toIsAnnotation": t_ann}


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


class TestBoxLevelHasRisk(unittest.TestCase):
    def test_no_box_has_risk_for_risk_control(self):
        source = _box(annotations=[{"key": "rc", "name": "RiskControl", "label": "RC"}])
        result = generate_annotation_triples(source)
        self.assertNotIn(f"<{BEAMR}hasRisk>", result)

    def test_no_box_has_risk_for_consequence_impact_source(self):
        source = _box(annotations=[
            {"key": "c", "name": "Consequence", "label": "C"},
            {"key": "i", "name": "Impact", "label": "I"},
            {"key": "s", "name": "RiskSource", "label": "S"},
        ])
        self.assertNotIn(f"<{BEAMR}hasRisk>", generate_annotation_triples(source))

    def test_box_has_risk_kept_for_unlinked_risk(self):
        source = _box(annotations=[{"key": "r", "name": "Risk", "label": "R"}])
        self.assertIn(
            f"<{T4B}Boxology/b1> <{BEAMR}hasRisk> <{T4B}Annotation/b1/r> .",
            generate_annotation_triples(source),
        )

    def test_box_has_risk_dropped_for_element_linked_risk(self):
        source = _box(
            annotations=[{"key": "r", "name": "Risk", "label": "R"}],
            annotation_links=[_alink("r", "n1", "Risk", "KG", True, False)],
        )
        result = generate_annotation_triples(source)
        self.assertNotIn(f"<{T4B}Boxology/b1> <{BEAMR}hasRisk>", result)
        # the element-level link is still there
        self.assertIn(
            f"<{T4B}Component/n1> <{BEAMR}hasRisk> <{T4B}Annotation/b1/r> .", result)


class TestElementLinks(unittest.TestCase):
    def test_risk_control_associated_to_subtype_element(self):
        # "KG" is a subtype name, not one of the base workflow types
        source = _box(
            annotations=[{"key": "rc", "name": "RiskControl", "label": "RC"}],
            annotation_links=[_alink("rc", "n1", "RiskControl", "KG", True, False)],
        )
        self.assertIn(
            f"<{T4B}Annotation/b1/rc> <{BEAMR}associatedTo> <{T4B}Component/n1> .",
            generate_annotation_triples(source),
        )

    def test_risk_source_originated_from_subtype_element(self):
        source = _box(
            annotations=[{"key": "rs", "name": "RiskSource", "label": "RS"}],
            annotation_links=[_alink("rs", "n1", "RiskSource", "Dataset", True, False)],
        )
        self.assertIn(
            f"<{T4B}Annotation/b1/rs> <{BEAMR}originatedFrom> <{T4B}Component/n1> .",
            generate_annotation_triples(source),
        )

    def test_reverse_drawn_element_link_still_resolves(self):
        # link drawn element -> card instead of card -> element
        source = _box(
            annotations=[{"key": "rc", "name": "RiskControl", "label": "RC"}],
            annotation_links=[_alink("n1", "rc", "Text", "RiskControl", False, True)],
        )
        self.assertIn(
            f"<{T4B}Annotation/b1/rc> <{BEAMR}associatedTo> <{T4B}Component/n1> .",
            generate_annotation_triples(source),
        )


class TestRiskChain(unittest.TestCase):
    def test_consequence_links_to_multiple_impacts(self):
        source = _box(
            annotations=[
                {"key": "c", "name": "Consequence", "label": "C"},
                {"key": "i1", "name": "Impact", "label": "I1"},
                {"key": "i2", "name": "Impact", "label": "I2"},
            ],
            annotation_links=[
                _alink("c", "i1", "Consequence", "Impact", True, True),
                _alink("c", "i2", "Consequence", "Impact", True, True),
            ],
        )
        result = generate_annotation_triples(source)
        self.assertIn(f"<{T4B}Annotation/b1/c> <{BEAMR}hasImpact> <{T4B}Annotation/b1/i1> .", result)
        self.assertIn(f"<{T4B}Annotation/b1/c> <{BEAMR}hasImpact> <{T4B}Annotation/b1/i2> .", result)

    def test_reverse_drawn_chain_link_still_resolves(self):
        source = _box(
            annotations=[
                {"key": "c", "name": "Consequence", "label": "C"},
                {"key": "i", "name": "Impact", "label": "I"},
            ],
            annotation_links=[_alink("i", "c", "Impact", "Consequence", True, True)],
        )
        self.assertIn(
            f"<{T4B}Annotation/b1/c> <{BEAMR}hasImpact> <{T4B}Annotation/b1/i> .",
            generate_annotation_triples(source),
        )


class TestGenerateComponentTriples(unittest.TestCase):
    def test_types_and_labels_every_node(self):
        source = _box(nodes=[
            {"key": "n1", "name": "KG", "type": "KG", "label": "Event KG Subgraph"},
        ])
        result = generate_component_triples(source)
        self.assertIn(
            f"<{T4B}Component/n1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <{T4B}KG> .",
            result,
        )
        self.assertIn(
            f'<{T4B}Component/n1> <http://www.w3.org/2000/01/rdf-schema#label> "Event KG Subgraph" .',
            result,
        )
        # beam_core.ttl defines no generic hasElement — KG resolves to
        # beam:Symbol -> beam:Resource, so the System-level link is hasResource.
        self.assertIn(f"<{T4B}Boxology/b1> <{BEAM}hasResource> <{T4B}Component/n1> .", result)
        self.assertNotIn(f"{BEAM}hasElement", result)

    def test_process_type_gets_hasProcess(self):
        source = _box(nodes=[{"key": "p", "name": "Transform", "type": "Transform", "label": "Proc"}])
        result = generate_component_triples(source)
        self.assertIn(f"<{T4B}Boxology/b1> <{BEAM}hasProcess> <{T4B}Component/p> .", result)
        self.assertNotIn(f"{BEAM}hasElement", result)

    def test_agent_type_gets_hasAgent(self):
        source = _box(nodes=[{"key": "a", "name": "Actor", "type": "Actor", "label": "User"}])
        result = generate_component_triples(source)
        self.assertIn(f"<{T4B}Boxology/b1> <{BEAM}hasAgent> <{T4B}Component/a> .", result)

    def test_unresolvable_type_emits_no_system_link(self):
        source = _box(nodes=[{"key": "x", "name": "NotARealType", "type": "NotARealType", "label": "?"}])
        result = generate_component_triples(source)
        self.assertNotIn(f"<{T4B}Boxology/b1>", result)

    def test_workflow_link_roles(self):
        source = _box(
            nodes=[
                {"key": "d", "name": "Data", "type": "Data", "label": "In"},
                {"key": "p", "name": "Transform", "type": "Transform", "label": "Proc"},
                {"key": "o", "name": "Data", "type": "Data", "label": "Out"},
            ],
            workflow_links=[{"from": "d", "to": "p"}, {"from": "p", "to": "o"}],
        )
        result = generate_component_triples(source)
        self.assertIn(
            f"<{T4B}Component/d> <{T4B}inputRoleParticipatesInProcess> <{T4B}Component/p> .",
            result,
        )
        self.assertIn(
            f"<{T4B}Component/p> <{T4B}outputRoleParticipatesInProcess> <{T4B}Component/o> .",
            result,
        )

    def test_process_to_process_link_is_inform(self):
        source = _box(
            nodes=[
                {"key": "p1", "name": "Transform", "type": "Transform", "label": "A"},
                {"key": "p2", "name": "Infer", "type": "Infer", "label": "B"},
            ],
            workflow_links=[{"from": "p1", "to": "p2"}],
        )
        self.assertIn(
            f"<{T4B}Component/p1> <{BEAM}inform> <{T4B}Component/p2> .",
            generate_component_triples(source),
        )


if __name__ == "__main__":
    unittest.main()
