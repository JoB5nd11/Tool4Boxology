try:
    from in_memory_rdfizer.generator import kg_generation
except:
    from .in_memory_rdfizer.generator import kg_generation

try:
    from beam_enrichment import enrich_with_beam
except:
    from .beam_enrichment import enrich_with_beam

try:
    from beam_annotation_triples import generate_annotation_triples
except:
    from .beam_annotation_triples import generate_annotation_triples

from SPARQLWrapper import SPARQLWrapper, POST, DIGEST, JSON
import os
import socket

global SPARQL_ENDPOINT , SPARQL_UPDATE_ENDPOINT

def _detect_host(service_name: str = "boxology_kg") -> str:
    env_host = os.getenv("SPARQL_HOST")
    if env_host:
        return env_host
    try:
        socket.gethostbyname(service_name)
        return service_name
    except OSError:
        return "localhost"

_host = _detect_host()
SPARQL_ENDPOINT = f"http://{_host}:8890/sparql"
SPARQL_UPDATE_ENDPOINT = f"http://{_host}:8890/sparql-auth"
print(f"[KG] Using Virtuoso host={_host}")

def _get_query_sparql():
    sparql = SPARQLWrapper(SPARQL_ENDPOINT, defaultGraph=SPARQL_ENDPOINT)
    sparql.setReturnFormat(JSON)
    return sparql


def _get_update_sparql():
    sparql = SPARQLWrapper(SPARQL_UPDATE_ENDPOINT, defaultGraph=SPARQL_ENDPOINT)
    sparql.setReturnFormat(JSON)
    sparql.setMethod(POST)           # <- update MUST be POST
    sparql.setHTTPAuth(DIGEST)
    sparql.setCredentials("dba", "dba")  # or your own user + password
    return sparql

def boxology_exists(source):
	sparql = _get_query_sparql()
	#sparql = SPARQLWrapper(SPARQL_ENDPOINT,defaultGraph=SPARQL_ENDPOINT)
	for boxology in source["boxologies"]:
		boxology_entity = "<http://tool4boxology.org/Boxology/" + boxology["id"] + ">"
		query = "ASK WHERE { " + boxology_entity + " a <http://tool4boxology.org/Boxology> .}"
		sparql.setReturnFormat(JSON)
		sparql.setQuery(query)
		results = sparql.query().convert()
		print(results, "BOXOLOGY EXISTS?")
		if results["boolean"] == True:
			return True
	return False

def insert_triples(triples):
	sparql = _get_update_sparql()
	#sparql = SPARQLWrapper(SPARQL_ENDPOINT,defaultGraph=SPARQL_ENDPOINT)
	query = "INSERT DATA { " + triples + "}"
	sparql.setReturnFormat(JSON)
	sparql.setQuery(query)
	results = sparql.query().convert()

def _delete_stale_beam(sparql, boxology_entity):
	# The main DELETE below clears each component's rdf:type triples (including the
	# inferred beam:* types) and the T4B role properties. It does NOT touch the
	# inferred BEAM object properties (use/usedBy/produce/producedBy), so we scrub
	# those explicitly here while the T4B structure is still present to locate them.
	beam = "http://w3id.org/beam/core#"
	t4b = "http://tool4boxology.org/"
	query = (
		"DELETE { "
		"?in <" + beam + "usedBy> ?pr . "
		"?pr <" + beam + "use> ?in . "
		"?pr <" + beam + "produce> ?out . "
		"?out <" + beam + "producedBy> ?pr . "
		"} WHERE { "
		+ boxology_entity + " <" + t4b + "hasPattern> ?dp . "
		"?dp <" + t4b + "hasInput> ?in . "
		"?dp <" + t4b + "hasProcess> ?pr . "
		"?dp <" + t4b + "hasOutput> ?out . "
		"}"
	)
	sparql.setReturnFormat(JSON)
	sparql.setQuery(query)
	sparql.query().convert()

def _delete_stale_annotations(sparql, boxology_entity):
	beam = "http://w3id.org/beam/core#"
	q_meta = (
		"DELETE { "
		+ boxology_entity + " <" + beam + "description> ?d . "
		+ boxology_entity + " <" + beam + "context> ?c . "
		"} WHERE { "
		"{ " + boxology_entity + " <" + beam + "description> ?d } "
		"UNION "
		"{ " + boxology_entity + " <" + beam + "context> ?c } "
		"}"
	)
	sparql.setReturnFormat(JSON)
	sparql.setQuery(q_meta)
	sparql.query().convert()
	box_iri = boxology_entity.strip("<>")
	box_id = box_iri.split("/")[-1]
	ann_prefix = "http://tool4boxology.org/Annotation/" + box_id + "/"
	q_ann_out = (
		"DELETE { ?ann ?p ?o } "
		"WHERE { ?ann ?p ?o . FILTER(STRSTARTS(STR(?ann), '" + ann_prefix + "')) }"
	)
	sparql.setReturnFormat(JSON)
	sparql.setQuery(q_ann_out)
	sparql.query().convert()
	q_ann_in = (
		"DELETE { ?s ?p ?ann } "
		"WHERE { ?s ?p ?ann . FILTER(STRSTARTS(STR(?ann), '" + ann_prefix + "')) }"
	)
	sparql.setReturnFormat(JSON)
	sparql.setQuery(q_ann_in)
	sparql.query().convert()

def update_kg(source,triples):
	sparql = _get_update_sparql()
	#sparql = SPARQLWrapper(SPARQL_ENDPOINT,defaultGraph=SPARQL_ENDPOINT)
	for boxology in source["boxologies"]:
		boxology_entity = "<http://tool4boxology.org/Boxology/" + boxology["id"] + ">"
		_delete_stale_beam(sparql, boxology_entity)
		_delete_stale_annotations(sparql, boxology_entity)
		query = "DELETE WHERE {"
		query += boxology_entity + " a <http://tool4boxology.org/Boxology> .\n"
		query += boxology_entity + " <http://www.w3.org/2000/01/rdf-schema#label> ?boxology_label .\n"
		query += boxology_entity + " <http://tool4boxology.org/hasPattern> ?design_pattern .\n"
		query += "?design_pattern a <http://tool4boxology.org/DesignPattern> .\n"
		query += "?design_pattern <http://www.w3.org/2000/01/rdf-schema#label> ?pattern_label .\n"
		query += "?design_pattern <http://tool4boxology.org/hasInput> ?input_component .\n"
		query += "?design_pattern <http://tool4boxology.org/hasOutput> ?output_component .\n"
		query += "?design_pattern <http://tool4boxology.org/hasProcess> ?process_component .\n"
		query += "?input_component a <http://tool4boxology.org/Component> .\n"
		query += "?input_component <http://www.w3.org/2000/01/rdf-schema#label> ?input_component_label .\n"
		query += "?input_component <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?input_component_type .\n"
		query += "?process_component a <http://tool4boxology.org/Component> .\n"
		query += "?process_component <http://www.w3.org/2000/01/rdf-schema#label> ?process_component_label .\n"
		query += "?process_component <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?process_component_type .\n"
		query += "?output_component a <http://tool4boxology.org/Component> .\n"
		query += "?output_component <http://www.w3.org/2000/01/rdf-schema#label> ?output_component_label .\n"
		query += "?output_component <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?output_component_type .\n"
		query += "?input_component <http://tool4boxology.org/inputRoleParticipatesInProcess> ?process_component .\n"
		query += "?process_component <http://tool4boxology.org/outputRoleParticipatesInProcess> ?output_component .\n"
		query += "}"
		sparql.setReturnFormat(JSON)
		sparql.setQuery(query)
		results = sparql.query().convert()
	insert_triples(triples)

def create_kg(source):
	knowledge_graph = kg_generation(source)
	knowledge_graph = enrich_with_beam(knowledge_graph)
	annotation_triples = generate_annotation_triples(source)
	if annotation_triples:
		knowledge_graph = knowledge_graph + annotation_triples
	update_needed = boxology_exists(source)
	if update_needed:
		update_kg(source,knowledge_graph)
		mode = "update"
	else:
		insert_triples(knowledge_graph)
		mode = "insert"
	triples_len = sum(1 for line in knowledge_graph.splitlines() if line.strip())
	return {"mode": mode, "triples_len": triples_len}

