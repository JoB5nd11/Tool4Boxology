"""Every arrow the editor can draw must map to at least one relation triple
between its two ends (spec: 2026-10-14-arrow-relation-mapping-design.md)."""
import itertools
import unittest

from beam_annotation_triples import (
    generate_annotation_triples,
    generate_workflow_link_triples,
)

T4B = "http://tool4boxology.org/"
BEAM = "http://w3id.org/beam/core#"
BEAMR = "http://w3id.org/beam/risk#"
BOX = f"{T4B}Boxology/b1"

CARDS = ["System", "Context", "Note", "Risk", "RiskSource", "Consequence", "Impact",
         "RiskControl", "PerformanceMetric"]  # last one: a card type with no rules yet
ELEMENTS = {"process": "Train", "agent": "Actor", "resource": "Data"}


def _card_iri(name, key):
    return BOX if name == "System" else f"{T4B}Annotation/b1/{key}"


def _card_source(a, b):
    """One annotation link a → b; each end is ('card', name) or ('elem', name)."""
    annotations, keys = [], {}
    for i, (kind, name) in enumerate((a, b)):
        key = f"k{i}"
        keys[i] = key
        if kind == "card":
            annotations.append({"key": key, "name": name, "label": name, "subtext": ""})
    link = {
        "from": keys[0], "to": keys[1],
        "fromType": a[1], "toType": b[1],
        "fromIsAnnotation": a[0] == "card", "toIsAnnotation": b[0] == "card",
    }
    return {"boxologies": [{"id": "b1", "annotations": annotations, "annotationLinks": [link]}]}


def _iri(end, key):
    kind, name = end
    return _card_iri(name, key) if kind == "card" else f"{T4B}Component/{key}"


def _relation(out, x, y):
    """Predicates of triples linking x and y, in either direction."""
    preds = []
    for line in out.splitlines():
        parts = line.split(" ")
        if len(parts) >= 3 and {parts[0], parts[2]} == {f"<{x}>", f"<{y}>"}:
            preds.append(parts[1].strip("<>"))
    return preds


def _workflow_source(from_name, to_name, dash=False):
    link = {"from": "f", "to": "t", **({"dash": True} if dash else {})}
    return {"boxologies": [{"id": "b1", "nodeDataArray": [
        {"key": "f", "name": from_name, "type": from_name},
        {"key": "t", "name": to_name, "type": to_name},
    ], "workflowLinks": [link]}]}


class EveryArrowIsMappedTest(unittest.TestCase):
    def test_every_card_connector(self):
        ends = [("card", c) for c in CARDS] + [("elem", e) for e in ELEMENTS.values()]
        for a, b in itertools.product(ends, repeat=2):
            if a[0] == "elem" and b[0] == "elem":
                continue  # not a card connector
            if a == b and a[1] == "System":
                continue  # both ends would be the boxology itself
            with self.subTest(frm=a, to=b):
                out = generate_annotation_triples(_card_source(a, b))
                self.assertTrue(_relation(out, _iri(a, "k0"), _iri(b, "k1")), out)

    def test_every_workflow_arrow(self):
        for (fa, f), (ta, t), dash in itertools.product(ELEMENTS.items(), ELEMENTS.items(), (False, True)):
            with self.subTest(frm=fa, to=ta, dash=dash):
                out = generate_workflow_link_triples(_workflow_source(f, t, dash))
                self.assertTrue(_relation(out, f"{T4B}Component/f", f"{T4B}Component/t"), out)


class CardRuleTest(unittest.TestCase):
    def _preds(self, a, b):
        out = generate_annotation_triples(_card_source(a, b))
        return out, _relation(out, _iri(a, "k0"), _iri(b, "k1"))

    def test_context_is_a_node_with_has_context(self):
        out, preds = self._preds(("elem", "Data"), ("card", "Context"))
        self.assertEqual(preds, [BEAM + "hasContext"])
        self.assertIn(f"<{T4B}Component/k0> <{BEAM}hasContext> <{T4B}Annotation/b1/k1> .", out)
        self.assertIn(f"<{T4B}Annotation/b1/k1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <{BEAM}Context> .", out)

    def test_context_literal_still_on_boxology(self):
        src = _card_source(("elem", "Data"), ("card", "Context"))
        src["boxologies"][0]["annotations"][0]["subtext"] = "Speed up reading"
        self.assertIn(f'<{BOX}> <{BEAM}context> "Speed up reading" .', generate_annotation_triples(src))

    def test_system_card_with_context(self):
        _, preds = self._preds(("card", "System"), ("card", "Context"))
        self.assertEqual(preds, [BEAM + "hasContext"])

    def test_note_wins_over_other_rules(self):
        _, preds = self._preds(("card", "Risk"), ("card", "Note"))
        self.assertEqual(preds, [BEAM + "note"])

    def test_element_to_consequence(self):
        out, preds = self._preds(("card", "Impact"), ("elem", "Train"))
        self.assertEqual(preds, [T4B + "hasRiskConcept"])
        self.assertIn(f"<{T4B}Component/k1> <{T4B}hasRiskConcept> <{T4B}Annotation/b1/k0> .", out)

    def test_system_card_to_element_uses_system_link(self):
        _, preds = self._preds(("card", "System"), ("elem", "Train"))
        self.assertEqual(preds, [BEAM + "hasProcess"])

    def test_system_card_to_risk(self):
        _, preds = self._preds(("card", "System"), ("card", "Risk"))
        self.assertEqual(preds, [BEAMR + "hasRisk"])

    def test_unknown_pair_falls_back_in_drawn_direction(self):
        out, preds = self._preds(("card", "Impact"), ("card", "RiskSource"))
        self.assertEqual(preds, [T4B + "relatedTo"])
        self.assertIn(f"<{T4B}Annotation/b1/k0> <{T4B}relatedTo> <{T4B}Annotation/b1/k1> .", out)


class WorkflowRuleTest(unittest.TestCase):
    def _preds(self, f, t, dash=False):
        out = generate_workflow_link_triples(_workflow_source(f, t, dash))
        return out, _relation(out, f"{T4B}Component/f", f"{T4B}Component/t")

    def test_dashed_is_risk_relation_only(self):
        out, preds = self._preds("Data", "Train", dash=True)
        self.assertEqual(preds, [T4B + "hasRiskRelation"])

    def test_agent_participates_in_process_either_direction(self):
        out, preds = self._preds("Train", "Actor")
        self.assertEqual(preds, [BEAM + "participatedIn"])
        self.assertIn(f"<{T4B}Component/t> <{BEAM}participatedIn> <{T4B}Component/f> .", out)

    def test_resource_to_resource_flows(self):
        _, preds = self._preds("Data", "Data")
        self.assertEqual(preds, [T4B + "flowsTo"])

    def test_existing_roles_unchanged(self):
        self.assertEqual(self._preds("Data", "Train")[1], [T4B + "inputRoleParticipatesInProcess"])
        self.assertEqual(self._preds("Train", "Data")[1], [T4B + "outputRoleParticipatesInProcess"])
        self.assertEqual(self._preds("Train", "Train")[1], [BEAM + "inform"])


class StaleRelationQueryTest(unittest.TestCase):
    def test_query_parses_and_targets_relations_between_nodes(self):
        from rdflib.plugins.sparql.parser import parseUpdate
        from beam_annotation_triples import stale_relation_delete_query
        q = stale_relation_delete_query(BOX, ["n1", "n2"])
        parseUpdate(q)
        self.assertIn(f"VALUES ?s {{ <{BOX}> <{T4B}Component/n1> <{T4B}Component/n2> }}", q)
        self.assertIn(f"VALUES ?o {{ <{BOX}> <{T4B}Component/n1> <{T4B}Component/n2> }}", q)
        for p in (BEAM + "inform", BEAM + "participatedIn", BEAM + "usedBy",
                  T4B + "flowsTo", T4B + "hasRiskRelation", BEAM + "hasResource"):
            self.assertIn(f"<{p}>", q)


if __name__ == "__main__":
    unittest.main()
