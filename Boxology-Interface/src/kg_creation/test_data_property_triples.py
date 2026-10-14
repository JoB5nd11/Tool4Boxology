import unittest
from data_property_triples import (
    generate_property_triples,
    typed_literal,
    custom_property_iri,
    stale_property_delete_query,
)

T4B = "http://tool4boxology.org/"
XSD = "http://www.w3.org/2001/XMLSchema#"
MV = "http://w3id.org/beam/core#metricValue"


def _src(annotations=(), nodes=()):
    return {"boxologies": [{"id": "b1", "annotations": list(annotations), "nodeDataArray": list(nodes)}]}


def _p(label, datatype, value, iri=None):
    return {"iri": iri, "label": label, "datatype": datatype, "value": value}


class TypedLiteralTest(unittest.TestCase):
    def test_types(self):
        self.assertEqual(typed_literal("0.87", "xsd:decimal"), f'"0.87"^^<{XSD}decimal>')
        self.assertEqual(typed_literal(" 12 ", "xsd:integer"), f'"12"^^<{XSD}integer>')
        self.assertEqual(typed_literal("2026-10-05", "xsd:date"), f'"2026-10-05"^^<{XSD}date>')
        self.assertEqual(typed_literal("TRUE", "xsd:boolean"), f'"true"^^<{XSD}boolean>')
        self.assertEqual(typed_literal('say "hi"\nok', "xsd:string"), '"say \\"hi\\"\\nok"')
        self.assertEqual(typed_literal("x", "xsd:anyURI"), '"x"')

    def test_invalid_values_skipped(self):
        for v, dt in [("0,87", "xsd:decimal"), ("1.5", "xsd:integer"), ("2026-13-01", "xsd:date"),
                      ("yes", "xsd:boolean"), ("", "xsd:string"), (None, "xsd:string")]:
            self.assertIsNone(typed_literal(v, dt), (v, dt))


class CustomIriTest(unittest.TestCase):
    def test_slug(self):
        self.assertEqual(custom_property_iri(" gpu hours! "), T4B + "prop/gpu_hours")
        self.assertIsNone(custom_property_iri("!!!"))


class GenerateTest(unittest.TestCase):
    def test_component_schema_and_custom(self):
        out = generate_property_triples(_src(nodes=[{"key": "n1", "props": [
            _p("metricValue", "xsd:decimal", "0.87", MV), _p("gpu hours", "xsd:integer", "12")]}]))
        self.assertIn(f'<{T4B}Component/n1> <{MV}> "0.87"^^<{XSD}decimal> .', out)
        self.assertIn(f'<{T4B}Component/n1> <{T4B}prop/gpu_hours> "12"^^<{XSD}integer> .', out)

    def test_card_subjects(self):
        out = generate_property_triples(_src(annotations=[
            {"key": "r", "name": "Risk", "props": [_p("odds", "xsd:string", "low")]},
            {"key": "s", "name": "System", "props": [_p("owner", "xsd:string", "lab")]},
            {"key": "c", "name": "Context", "props": [_p("why", "xsd:string", "x")]},
        ]))
        self.assertIn(f'<{T4B}Annotation/b1/r> <{T4B}prop/odds> "low" .', out)
        self.assertIn(f'<{T4B}Boxology/b1> <{T4B}prop/owner> "lab" .', out)
        self.assertIn(f'<{T4B}Annotation/b1/c> <{T4B}prop/why> "x" .', out)

    def test_groups_cards_and_bad_entries_skipped(self):
        out = generate_property_triples(_src(nodes=[
            {"key": "g", "isGroup": True, "props": [_p("a", "xsd:string", "v")]},
            {"key": "k", "category": "beamCard", "props": [_p("a", "xsd:string", "v")]},
            {"key": "n", "props": [_p("!!!", "xsd:string", "v"), _p("a", "xsd:decimal", "abc")]},
        ]))
        self.assertEqual(out, "")

    def test_unknown_schema_iri_still_exported(self):
        out = generate_property_triples(_src(nodes=[{"key": "n", "props": [
            _p("old", "xsd:string", "v", "http://example.org/dropped")]}]))
        self.assertIn("<http://example.org/dropped>", out)


class StaleQueryTest(unittest.TestCase):
    def test_query_shape(self):
        q = stale_property_delete_query(T4B + "Boxology/b1", ["n1"], {MV})
        self.assertIn(f"<{T4B}Boxology/b1> <{T4B}Component/n1>", q)
        self.assertIn(f"STRSTARTS(STR(?p), \"{T4B}prop/\")", q)
        self.assertIn(f"?p IN (<{MV}>)", q)
        self.assertIn("isLiteral(?o)", q)


if __name__ == "__main__":
    unittest.main()
