// GraphRAG Chatbot BEAM notation example — reproduces Figure 3 from the BEAM paper.
// Annotation/risk nodes use category:'beamCard' for the two-section card template.

export const graphragExampleData = {
  nodeDataArray: [
    // ── MAIN DATA-FLOW NODES ────────────────────────────────────────────────
    {
      key: 'nlq', label: 'Natural Language Question',
      name: 'Data', type: 'Data', shape: 'Rectangle',
      color: '#90ee90', stroke: '#2d7a2d',
      loc: '20 560', width: 160, height: 60,
    },
    {
      key: 'extraction', label: 'Event ID Extraction',
      name: 'Infer', type: 'Infer', shape: 'RoundedRectangle',
      color: '#fffacd', stroke: '#b8860b',
      loc: '220 560', width: 150, height: 60,
    },
    {
      key: 'event_id', label: 'Event ID',
      name: 'Data', type: 'Data', shape: 'Rectangle',
      color: '#90ee90', stroke: '#2d7a2d',
      loc: '410 560', width: 110, height: 60,
    },
    {
      key: 'kg_query', label: 'KG Querying (Retrieval)',
      name: 'Transform', type: 'Transform', shape: 'RoundedRectangle',
      color: '#ffb6c1', stroke: '#cd5c5c',
      loc: '560 560', width: 165, height: 60,
    },
    {
      key: 'kg_subgraph', label: 'Event KG Subgraph on Event ID',
      name: 'Data', type: 'Data', shape: 'Rectangle',
      color: '#bdbdbd', stroke: '#424242',
      loc: '775 560', width: 185, height: 60,
    },
    {
      key: 'llm_prompt', label: 'LLM Prompting (Generation)',
      name: 'Engineer', type: 'Engineer', shape: 'RoundedRectangle',
      color: '#ffb6c1', stroke: '#c1307a',
      loc: '1010 560', width: 185, height: 60,
    },
    {
      key: 'summary', label: 'Event Summary',
      name: 'Data', type: 'Data', shape: 'Rectangle',
      color: '#90ee90', stroke: '#2d7a2d',
      loc: '1245 560', width: 140, height: 60,
    },

    // ── INPUT TEMPLATES ──────────────────────────────────────────────────────
    {
      key: 'sparql_tmpl', label: 'SPARQL Query Template',
      name: 'Symbol', type: 'Symbol', shape: 'Rectangle',
      color: '#d0d0d0', stroke: '#808080',
      loc: '535 665', width: 195, height: 55,
    },
    {
      key: 'sys_prompt_tmpl', label: 'System Prompt Template',
      name: 'Symbol', type: 'Symbol', shape: 'Rectangle',
      color: '#d0d0d0', stroke: '#808080',
      loc: '975 665', width: 200, height: 55,
    },

    // ── DATA STORES (hexagons) ───────────────────────────────────────────────
    {
      key: 'event_kg', label: 'Event KG',
      name: 'SemanticModel', type: 'SemanticModel', shape: 'Hexagon',
      color: '#00bcd4', stroke: '#006064',
      loc: '540 445', width: 135, height: 75,
    },
    {
      key: 'llm', label: 'LLM',
      name: 'StatisticalModel', type: 'StatisticalModel', shape: 'Hexagon',
      color: '#42a5f5', stroke: '#1565c0',
      loc: '1030 445', width: 105, height: 65,
    },

    // ── ANNOTATION: SYSTEM + CONTEXT — beamCard two-section layout ───────────
    {
      key: 'system_box',
      category: 'beamCard',
      label: 'System: Simple RAG-based Chatbot',
      subtext: 'The workflow describes a simplified event information chatbot based on the GraphRAG approach.',
      name: 'System', type: 'System',
      color: '#e8f5e9', stroke: '#388e3c',
      loc: '340 105', size: '720 90',
    },
    {
      key: 'context_box',
      category: 'beamCard',
      label: 'Context',
      subtext: 'The system will be used in a demonstration environment (not real-world use case) to showcase RAG systems for potential users.',
      name: 'Context', type: 'Context',
      color: '#f5f5f5', stroke: '#757575',
      loc: '20 105', size: '300 90',
    },

    // ── ANNOTATION: RISKS ────────────────────────────────────────────────────
    {
      key: 'risk_leakage',
      category: 'beamCard',
      label: 'Risk: Information Leakage',
      subtext: 'Private information stored in the KG may be leaked out.',
      name: 'Risk', type: 'Risk',
      color: '#fff3e0', stroke: '#fb8c00',
      loc: '20 220', size: '220 90',
    },
    {
      key: 'risk_malicious',
      category: 'beamCard',
      label: 'Risk: Malicious Knowledge Injection',
      subtext: 'Malicious Knowledge Injection to produce malicious prompt.',
      name: 'Risk', type: 'Risk',
      color: '#fff3e0', stroke: '#fb8c00',
      loc: '260 220', size: '240 90',
    },
    {
      key: 'risk_context',
      category: 'beamCard',
      label: 'Risk: Context too long',
      subtext: 'The length of the prompt is above the allowed threshold.',
      name: 'Risk', type: 'Risk',
      color: '#fff3e0', stroke: '#fb8c00',
      loc: '520 220', size: '200 90',
    },
    {
      key: 'risk_halluc',
      category: 'beamCard',
      label: 'Risk: Hallucination',
      subtext: 'The answers from the chatbot deviate from the truth.',
      name: 'Risk', type: 'Risk',
      color: '#fff3e0', stroke: '#fb8c00',
      loc: '740 220', size: '190 90',
    },

    // ── ANNOTATION: RISK CONTROLS + RISK SOURCE ──────────────────────────────
    {
      key: 'rc_exclusion',
      category: 'beamCard',
      label: 'Risk Control: Exclusion of sensitive data',
      subtext: 'Sensitive data is filtered out during the construction of the KG.',
      name: 'RiskControl', type: 'RiskControl',
      color: '#e8f5e9', stroke: '#388e3c',
      loc: '20 335', size: '250 90',
    },
    {
      key: 'rc_dqc',
      category: 'beamCard',
      label: 'Risk Control: Data Quality Control',
      subtext: 'Sanitize query results.',
      name: 'RiskControl', type: 'RiskControl',
      color: '#e8f5e9', stroke: '#388e3c',
      loc: '290 335', size: '225 90',
    },
    {
      key: 'rc_warning',
      category: 'beamCard',
      label: 'Risk Control: Warning in Flow Editor',
      subtext: 'Display a descriptive warning message in the demonstration.',
      name: 'RiskControl', type: 'RiskControl',
      color: '#e8f5e9', stroke: '#388e3c',
      loc: '535 335', size: '230 90',
    },
    {
      key: 'rs_insuf',
      category: 'beamCard',
      label: 'Risk Source: Insufficient Information for Event Summarization',
      subtext: 'The resulted KG subgraph does not contain enough information.',
      name: 'RiskSource', type: 'RiskSource',
      color: '#fffde7', stroke: '#f9a825',
      loc: '785 335', size: '280 90',
    },

    // ── ANNOTATION: CONSEQUENCE + IMPACTS ────────────────────────────────────
    {
      key: 'consequence',
      category: 'beamCard',
      label: 'Consequence: Offensive Behaviour',
      subtext: 'The answers from the chatbot contain offensive content.',
      name: 'Consequence', type: 'Consequence',
      color: '#fce4ec', stroke: '#e91e63',
      loc: '310 20', size: '250 90',
    },
    {
      key: 'impact_offended',
      category: 'beamCard',
      label: 'Impact: Offended Users',
      subtext: 'The users are offended by the chatbot\'s responses, causing a bad impression of the showcased system.',
      name: 'Impact', type: 'Impact',
      color: '#ef9a9a', stroke: '#c62828',
      loc: '50 20', size: '240 90',
    },
    {
      key: 'impact_cost',
      category: 'beamCard',
      label: 'Impact: Cost Overrun',
      subtext: 'The cost for running the query is higher than the ChatBot service fee.',
      name: 'Impact', type: 'Impact',
      color: '#ef9a9a', stroke: '#c62828',
      loc: '585 20', size: '195 90',
    },
    {
      key: 'impact_rep',
      category: 'beamCard',
      label: 'Impact: Reputational Damage',
      subtext: 'Reputational damage for the ChatBot provider and its clients.',
      name: 'Impact', type: 'Impact',
      color: '#ef9a9a', stroke: '#c62828',
      loc: '800 20', size: '210 90',
    },
  ],

  linkDataArray: [
    // ── DATA FLOW (solid arrows) ─────────────────────────────────────────────
    { from: 'nlq',             to: 'extraction' },
    { from: 'extraction',      to: 'event_id' },
    { from: 'event_id',        to: 'kg_query' },
    { from: 'kg_query',        to: 'kg_subgraph' },
    { from: 'kg_subgraph',     to: 'llm_prompt' },
    { from: 'llm_prompt',      to: 'summary' },
    { from: 'sparql_tmpl',     to: 'kg_query' },
    { from: 'sys_prompt_tmpl', to: 'llm_prompt' },
    { from: 'event_kg',        to: 'kg_query' },
    { from: 'llm',             to: 'llm_prompt' },

    // ── ANNOTATION CONNECTORS (dotted) ────────────────────────────────────────
    { from: 'risk_leakage',  to: 'event_kg',      category: 'annotation' },
    { from: 'risk_malicious', to: 'kg_query',      category: 'annotation' },
    { from: 'risk_context',  to: 'llm_prompt',     category: 'annotation' },
    { from: 'risk_halluc',   to: 'llm_prompt',     category: 'annotation' },

    { from: 'rc_exclusion',  to: 'risk_leakage',   category: 'annotation' },
    { from: 'rc_dqc',        to: 'risk_malicious',  category: 'annotation' },
    { from: 'rc_warning',    to: 'risk_context',    category: 'annotation' },
    { from: 'rs_insuf',      to: 'risk_halluc',     category: 'annotation' },

    { from: 'risk_malicious', to: 'consequence',   category: 'annotation' },
    { from: 'consequence',   to: 'impact_offended', category: 'annotation' },
    { from: 'risk_context',  to: 'impact_cost',     category: 'annotation' },
    { from: 'risk_halluc',   to: 'impact_rep',      category: 'annotation' },
  ],
};
