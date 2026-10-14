import unittest
from rdflib import Graph
from property_schema import build_property_schema, load_property_schema

TTL = """
@prefix beam: <http://w3id.org/beam/core#> .
@prefix t4b:  <http://tool4boxology.org/> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
beam:StatisticalModel rdfs:subClassOf beam:Model .
t4b:StatisticalModel rdfs:subClassOf beam:StatisticalModel .
beam:version a owl:DatatypeProperty ; rdfs:label "version" ; rdfs:domain beam:Model ; rdfs:range xsd:String .
beam:homepage a owl:DatatypeProperty ; rdfs:domain beam:Model ; rdfs:range xsd:anyURI .
beam:description a owl:DatatypeProperty ; rdfs:domain beam:Model ; rdfs:range xsd:string .
"""


def _schema():
    g = Graph()
    g.parse(data=TTL, format="turtle")
    return build_property_schema(g)


class PropertySchemaTest(unittest.TestCase):
    def test_inherited_through_subclass_closure(self):
        labels = [p["label"] for p in _schema()["StatisticalModel"]]
        self.assertIn("version", labels)

    def test_range_mapping_and_label_fallback(self):
        by_label = {p["label"]: p for p in _schema()["Model"]}
        self.assertEqual(by_label["version"]["datatype"], "xsd:string")
        self.assertEqual(by_label["homepage"]["datatype"], "xsd:string")

    def test_tool_filled_properties_excluded(self):
        labels = [p["label"] for p in _schema()["Model"]]
        self.assertNotIn("description", labels)

    def test_real_bundle_has_draft_metric_properties(self):
        by_label = {p["label"]: p for p in load_property_schema()["PerformanceMetric"]}
        self.assertEqual(by_label["metricValue"]["datatype"], "xsd:decimal")
        self.assertEqual(by_label["measuredOn"]["datatype"], "xsd:date")
        self.assertEqual(by_label["metricValue"]["iri"], "http://w3id.org/beam/core#metricValue")


if __name__ == "__main__":
    unittest.main()
