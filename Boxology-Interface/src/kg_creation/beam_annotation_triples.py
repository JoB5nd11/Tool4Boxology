"""
Generate BEAM / BEAMR triples for annotation and risk nodes.

beamCard nodes (System, Context, Note, Risk, RiskSource, Consequence, Impact,
RiskControl) are BEAM-native — they map directly to beam: / beamr: classes,
not through the T4B bridge.  This module takes the annotation data that the
frontend includes in the export JSON and emits the corresponding RDF triples.
"""

BEAM = "http://w3id.org/beam/core#"
BEAMR = "http://w3id.org/beam/risk#"
T4B = "http://tool4boxology.org/"
RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"

# beamCard name → RDF class IRI
_TYPE_MAP = {
    "System":      BEAM + "System",
    "Context":     None,  # metadata on the boxology, not a standalone instance
    "Note":        BEAM + "Note",
    "Risk":        BEAMR + "Risk",
    "RiskSource":  BEAMR + "RiskSource",
    "Consequence": BEAMR + "Consequence",
    "Impact":      BEAMR + "Impact",
    "RiskControl": BEAMR + "RiskControl",
}

_RISK_TYPES = {"Risk", "RiskSource", "Consequence", "Impact", "RiskControl"}
_WORKFLOW_TYPES = {
    "Data", "Symbol", "Model", "SemanticModel", "StatisticalModel",
    "Train", "Engineer", "Infer", "Transform", "Actor",
    "Generate", "Deduce", "Embed", "Embedding",
}

# (from_type, to_type) → predicate IRI.  Checked in order; first match wins.
_LINK_RULES = [
    # Risk chain
    ({"RiskSource"},  {"Risk"},         BEAMR + "isRiskSourceFor"),
    ({"Risk"},        {"Consequence"},  BEAMR + "hasConsequence"),
    ({"Consequence"}, {"Impact"},       BEAMR + "hasImpact"),
    # Risk controls modify any risk concept
    ({"RiskControl"}, _RISK_TYPES,      BEAMR + "modifiesRiskConcept"),
    # Risk source originates from a workflow element
    ({"RiskSource"},  _WORKFLOW_TYPES,  BEAMR + "originatedFrom"),
    # Risk control associated to a workflow element
    ({"RiskControl"}, _WORKFLOW_TYPES,  BEAMR + "associatedTo"),
]


def _iri(uri):
    return f"<{uri}>"


def _lit(text):
    escaped = text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def _annotation_iri(boxology_id, node_key):
    return f"{T4B}Annotation/{boxology_id}/{node_key}"


def _component_iri(node_key):
    return f"{T4B}Component/{node_key}"


def _resolve_link_property(from_type, to_type, from_is_annotation, to_is_annotation):
    """Pick the BEAMR property for an annotation link based on endpoint types."""
    # Risk → workflow element: reverse direction → element hasRisk risk
    if from_type == "Risk" and not to_is_annotation:
        return BEAMR + "hasRisk", True  # reversed
    # Risk → Impact direct shortcut (paper allows it)
    if from_type == "Risk" and to_type == "Impact":
        return BEAMR + "hasConsequence", False

    for from_set, to_set, prop in _LINK_RULES:
        if from_type in from_set and to_type in to_set:
            return prop, False

    # Note / System / Context links to elements
    if from_type == "Note" and not to_is_annotation:
        return BEAM + "note", True  # element beam:note note
    if from_type == "System" and not to_is_annotation:
        return BEAM + "note", True

    return None, False


def generate_annotation_triples(source):
    """Return a string of N-Triple lines for all annotation/risk nodes in source."""
    lines = []

    for boxology in source.get("boxologies", []):
        box_id = boxology.get("id", "")
        box_iri = f"{T4B}Boxology/{box_id}"
        annotations = boxology.get("annotations", [])
        annotation_links = boxology.get("annotationLinks", [])

        if not annotations:
            continue

        node_map = {}  # key → { iri, name, is_annotation }

        for ann in annotations:
            key = ann["key"]
            name = ann.get("name", "")
            label = ann.get("label", "")
            subtext = ann.get("subtext", "")
            rdf_type = _TYPE_MAP.get(name)
            ann_iri = _annotation_iri(box_id, key)
            node_map[key] = {"iri": ann_iri, "name": name, "is_annotation": True}

            if name == "Context":
                # Context is metadata on the boxology, not a standalone node
                if subtext:
                    lines.append(f"{_iri(box_iri)} {_iri(BEAM + 'context')} {_lit(subtext)} .")
                continue

            if name == "System":
                # System card adds description to the boxology
                if subtext:
                    lines.append(f"{_iri(box_iri)} {_iri(BEAM + 'description')} {_lit(subtext)} .")
                continue

            if rdf_type:
                lines.append(f"{_iri(ann_iri)} {_iri(RDF_TYPE)} {_iri(rdf_type)} .")

            if label:
                lines.append(f"{_iri(ann_iri)} {_iri(RDFS_LABEL)} {_lit(label)} .")

            if subtext:
                lines.append(f"{_iri(ann_iri)} {_iri(BEAM + 'description')} {_lit(subtext)} .")

            # Link risk/annotation nodes to their parent boxology
            if name in _RISK_TYPES:
                lines.append(f"{_iri(box_iri)} {_iri(BEAMR + 'hasRisk')} {_iri(ann_iri)} .")
            elif name == "Note":
                lines.append(f"{_iri(box_iri)} {_iri(BEAM + 'note')} {_iri(ann_iri)} .")

        # Process annotation links
        for link in annotation_links:
            from_key = link["from"]
            to_key = link["to"]
            from_type = link.get("fromType", "")
            to_type = link.get("toType", "")
            from_is_ann = link.get("fromIsAnnotation", False)
            to_is_ann = link.get("toIsAnnotation", False)

            # Resolve IRIs — annotation nodes use Annotation/ prefix, workflow nodes use Component/
            if from_key in node_map:
                from_iri = node_map[from_key]["iri"]
            else:
                from_iri = _component_iri(from_key)
                node_map[from_key] = {"iri": from_iri, "name": from_type, "is_annotation": False}

            if to_key in node_map:
                to_iri = node_map[to_key]["iri"]
            else:
                to_iri = _component_iri(to_key)
                node_map[to_key] = {"iri": to_iri, "name": to_type, "is_annotation": False}

            prop, reversed_dir = _resolve_link_property(
                from_type, to_type, from_is_ann, to_is_ann
            )
            if prop is None:
                continue

            if reversed_dir:
                lines.append(f"{_iri(to_iri)} {_iri(prop)} {_iri(from_iri)} .")
            else:
                lines.append(f"{_iri(from_iri)} {_iri(prop)} {_iri(to_iri)} .")

    return "\n".join(lines) + "\n" if lines else ""
