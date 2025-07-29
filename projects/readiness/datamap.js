// DataMap.js - Client-side version of Datamap.py logic for browser use

// --- CONFIGURATION ---
// --- CONFIGURATION (SQDCI version) ---
const data_point_categories = {
  /* S — SAFETY (People + Environment) */
  "Safety": [
    "safety-incident data",          // OSHA recordables, first-aid, lost-time
    "near-miss data",                // anonymous & formal
    "loto-compliance data",          // permit start / stop, audits
    "machine-guard-audit data",      // light-curtain, interlock, guard checks
    "ppe-compliance data",           // smart PPE or checklist logs
    "confined-space-permit data",
    "hot-work-permit data",
    "arc-flash-setting data",        // boundaries & label revision
    "noise-exposure data",           // dosimeter download
    "vibration-exposure data",       // hand-arm & whole-body
    "chemical-inventory data",       // SDS, quantities, storage class
    "air-monitor data",              // VOC, dust, pathogens, Legionella tests
    "ergonomic-assessment data",     // RULA / REBA scores
    "safety-training-record data",   // onboarding & refresh completion
    "emergency-drill data"           // drill type, attendance, findings
  ],

  /* Q — QUALITY (Product + Process) */
  "Quality": [
    "spc-chart data",                // Cp/Cpk, rule violations
    "inspection-result data",        // AOI, CMM, manual checks
    "vision-inspection data",        // AI / CV verdicts & metrics
    "first-pass-yield data",         // line-level & model-level
    "defect-code data",              // rework / scrap categorisation
    "calibration-status data",       // gauge status & due dates
    "gauge-rr data",
    "supplier-ppap data",            // FAIR, C of C, FAI
    "material-cert data",            // heat numbers, lot numbers
    "traceability data",             // genealogy, e-traveller
    "field-return data",             // RMA, MTBF
    "warranty-claim data (field)",
    "audit-finding data",            // ISO, FDA, customer audits
    "capa-action data",              // action owner, due, verified
    "environmental-contamination data" // temp, RH, ISO-class excursions
  ],

  /* D — DELIVERY (Flow + Time) */
  "Delivery": [
    "production-schedule-adherence data",  // planned vs actual
    "dispatch-list data",
    "downtime-event data",                 // reason-coded
    "changeover-duration data",            // SMED actuals
    "cycle-time data",
    "capacity-utilisation data",           // bottleneck OEE or TEEP
    "lead-time data",                      // SO -> ship
    "on-time-delivery data",               // promise vs ship
    "queue-length data",                   // WIP in front of each resource
    "asn-accuracy data",                   // inbound logistics
    "logistics-status data",               // carrier EDI / API
    "expedite-order data",                 // rush / hot list count
    "regulatory-hold data",                // lots frozen by FDA/FAA/etc.
    "cyber-incident data",                 // downtime minutes lost
    "labor-availability data"              // attendance vs required head-count
  ],

  /* C — COST (Loss + Waste) */
  "Cost": [
    "scrap-cost data",
    "rework-hour data",
    "oee-loss data",                      // $/shift of availability, speed, quality
    "consumable-usage data",              // gloves, tips, grinding discs
    "energy-consumption data",            // kWh by area / asset
    "demand-charge data",                 // peak kW
    "maintenance-cost data",              // parts + labor
    "overtime-cost data",
    "premium-freight-cost data",
    "warranty-cost data",
    "regulatory-fine data",
    "carrying-cost data",                 // $ inventory * rate
    "capital-tied-up data",               // WIP $ & FG $
    "training-recruitment-cost data",
    "insurance-claim data"
  ],

  /* I — INVENTORY (Material + Data) */
  "Inventory": [
    "item-master data",
    "raw-stock-level data",
    "wip-balance data",
    "finished-goods-quantity data",
    "cycle-count-accuracy data",
    "inventory-turns data",
    "stockout-event data",
    "shelf-life-expiry data",
    "obsolescence data",
    "kanban-card data",                  // electronic or physical kanban status
    "mro-spare-level data",
    "moq-exception data",                // buys > demand
    "consignment-inventory data",
    "warehouse-space-utilisation data",
    "inbound-asn data",                  // for flow link to Delivery
    "outbound-shipment data"             // for flow link to Delivery
  ]
};

const data_point_to_category_map = {};
Object.entries(data_point_categories).forEach(([cat, dps]) => {
    dps.forEach(dp => { data_point_to_category_map[dp] = cat; });
});

/* ----------------------------------------------------------------------
 * 1️⃣  QUESTION-ID ⇢ DATAPOINT MAP
 * -------------------------------------------------------------------- */
const question_ids = {
  /* ---------- S — SAFETY ---------- */
  safety_incidents:              "safety-incident data",
  near_misses:                   "near-miss data",
  loto_compliance:               "loto-compliance data",
  machine_guard_audits:          "machine-guard-audit data",
  ppe_compliance:                "ppe-compliance data",
  confined_space_permits:        "confined-space-permit data",
  hot_work_permits:              "hot-work-permit data",
  arc_flash_settings:            "arc-flash-setting data",
  noise_exposure:                "noise-exposure data",
  vibration_exposure:            "vibration-exposure data",
  chemical_inventory:            "chemical-inventory data",
  air_monitor:                   "air-monitor data",
  ergonomic_assessments:         "ergonomic-assessment data",
  safety_training_records:       "safety-training-record data",
  emergency_drills:              "emergency-drill data",

  /* ---------- Q — QUALITY ---------- */
  spc_charts:                    "spc-chart data",
  inspection_results:            "inspection-result data",
  vision_inspection:             "vision-inspection data",
  first_pass_yield:              "first-pass-yield data",
  defect_codes:                  "defect-code data",
  calibration_status:            "calibration-status data",
  gauge_rr:                      "gauge-rr data",
  supplier_ppap:                 "supplier-ppap data",
  material_certs:                "material-cert data",
  traceability:                  "traceability data",
  field_returns:                 "field-return data",
  warranty_claims_field:         "warranty-claim data (field)",
  audit_findings:                "audit-finding data",
  capa_actions:                  "capa-action data",
  environmental_contamination:   "environmental-contamination data",

  /* ---------- D — DELIVERY ---------- */
  production_schedule_adherence: "production-schedule-adherence data",
  dispatch_list:                 "dispatch-list data",
  downtime_events:               "downtime-event data",
  changeover_duration:           "changeover-duration data",
  cycle_time:                    "cycle-time data",
  capacity_utilisation:          "capacity-utilisation data",
  lead_time:                     "lead-time data",
  on_time_delivery:              "on-time-delivery data",
  queue_length:                  "queue-length data",
  asn_accuracy:                  "asn-accuracy data",
  logistics_status:              "logistics-status data",
  expedite_orders:               "expedite-order data",
  regulatory_holds:              "regulatory-hold data",
  cyber_incidents:               "cyber-incident data",
  labor_availability:            "labor-availability data",

  /* ---------- C — COST ---------- */
  scrap_cost:                    "scrap-cost data",
  rework_hours:                  "rework-hour data",
  oee_loss:                      "oee-loss data",
  consumable_usage:              "consumable-usage data",
  energy_consumption:            "energy-consumption data",
  demand_charge:                 "demand-charge data",
  maintenance_cost:              "maintenance-cost data",
  overtime_cost:                 "overtime-cost data",
  premium_freight_cost:          "premium-freight-cost data",
  warranty_cost:                 "warranty-cost data",
  regulatory_fine:               "regulatory-fine data",
  carrying_cost:                 "carrying-cost data",
  capital_tied_up:               "capital-tied-up data",
  training_recruitment_cost:     "training-recruitment-cost data",
  insurance_claim:               "insurance-claim data",

  /* ---------- I — INVENTORY ---------- */
  item_master:                   "item-master data",
  raw_stock_level:               "raw-stock-level data",
  wip_balance:                   "wip-balance data",
  finished_goods_quantity:       "finished-goods-quantity data",
  cycle_count_accuracy:          "cycle-count-accuracy data",
  inventory_turns:               "inventory-turns data",
  stockout_events:               "stockout-event data",
  shelf_life_expiry:             "shelf-life-expiry data",
  obsolescence:                  "obsolescence data",
  kanban_card:                   "kanban-card data",
  mro_spare_level:               "mro-spare-level data",
  moq_exception:                 "moq-exception data",
  consignment_inventory:         "consignment-inventory data",
  warehouse_space_utilisation:   "warehouse-space-utilisation data",
  inbound_asn:                   "inbound-asn data",
  outbound_shipments:            "outbound-shipment data"
};


/* ----------------------------------------------------------------------
 * 2️⃣  IDEAL DATAPOINT ⇢ SYSTEM MAP
 * (kept to your existing MES / QMS / etc. universe)
 * -------------------------------------------------------------------- */
const ideal_mapping = {
  /* ---------- S ---------- */
  "safety-incident data":              "QMS",
  "near-miss data":                   "QMS",
  "loto-compliance data":             "QMS",
  "machine-guard-audit data":         "QMS",
  "ppe-compliance data":              "QMS",
  "confined-space-permit data":       "QMS",
  "hot-work-permit data":             "QMS",
  "arc-flash-setting data":           "QMS",
  "noise-exposure data":              "QMS",
  "vibration-exposure data":          "QMS",
  "chemical-inventory data":          "QMS",
  "air-monitor data":                 "QMS",
  "ergonomic-assessment data":        "QMS",
  "safety-training-record data":      "QMS",
  "emergency-drill data":             "QMS",

  /* ---------- Q ---------- */
  "spc-chart data":                   "QMS",
  "inspection-result data":           "QMS",
  "vision-inspection data":           "QMS",
  "first-pass-yield data":            "MES",
  "defect-code data":                 "MES",
  "calibration-status data":          "QMS",
  "gauge-rr data":                    "QMS",
  "supplier-ppap data":               "QMS",
  "material-cert data":               "QMS",
  "traceability data":                "MES",
  "field-return data":                "CRM",
  "warranty-claim data (field)":      "CRM",
  "audit-finding data":               "QMS",
  "capa-action data":                 "QMS",
  "environmental-contamination data": "QMS",

  /* ---------- D ---------- */
  "production-schedule-adherence data": "MES",
  "dispatch-list data":                 "MES",
  "downtime-event data":                "MES",
  "changeover-duration data":           "MES",
  "cycle-time data":                    "MES",
  "capacity-utilisation data":          "MES",
  "lead-time data":                     "ERP",
  "on-time-delivery data":              "ERP",
  "queue-length data":                  "MES",
  "asn-accuracy data":                  "WMS",
  "logistics-status data":              "WMS",
  "expedite-order data":                "ERP",
  "regulatory-hold data":               "QMS",
  "cyber-incident data":                "SCADA",
  "labor-availability data":            "MES",

  /* ---------- C ---------- */
  "scrap-cost data":                   "ERP",
  "rework-hour data":                  "MES",
  "oee-loss data":                     "MES",
  "consumable-usage data":             "ERP",
  "energy-consumption data":           "SCADA",
  "demand-charge data":                "ERP",
  "maintenance-cost data":             "CMMS",
  "overtime-cost data":                "ERP",
  "premium-freight-cost data":         "ERP",
  "warranty-cost data":                "ERP",
  "regulatory-fine data":              "ERP",
  "carrying-cost data":                "ERP",
  "capital-tied-up data":              "ERP",
  "training-recruitment-cost data":    "ERP",
  "insurance-claim data":              "ERP",

  /* ---------- I ---------- */
  "item-master data":                  "WMS",
  "raw-stock-level data":              "WMS",
  "wip-balance data":                  "WMS",
  "finished-goods-quantity data":      "WMS",
  "cycle-count-accuracy data":         "WMS",
  "inventory-turns data":              "WMS",
  "stockout-event data":               "WMS",
  "shelf-life-expiry data":            "WMS",
  "obsolescence data":                 "WMS",
  "kanban-card data":                  "MES",
  "mro-spare-level data":              "CMMS",
  "moq-exception data":                "ERP",
  "consignment-inventory data":        "WMS",
  "warehouse-space-utilisation data":  "WMS",
  "inbound-asn data":                  "WMS",
  "outbound-shipment data":            "WMS"
};

const system_nodes = ["MES", "ERP", "SCADA", "WMS", "QMS", "CMMS", "CRM", "Spreadsheet", "Paper", "Whiteboard", "Legacy / Other"];
const i40_systems = ["MES", "ERP", "SCADA", "WMS", "QMS", "CMMS", "CRM"];
const legacy_systems = ["Spreadsheet", "Paper", "Whiteboard", "Legacy / Other"];

// --- MAIN FUNCTION ---
// Pass in the parsed responses.json object
function computeDataMap(answers, priorities) {
    // --- METRICS & GRAPH DATA CALCULATION ---
    const all_graph_nodes = new Set();
    const current_edges = [];
    const ideal_edges = [];
    const state_counts = { "Correctly Placed": 0, "Misaligned": 0, "Legacy": 0, "Disconnected": 0 };
    const system_usage = {};
    const opportunities = [];
    const category_totals = {};
    const category_digital_counts = {};
    const data_point_details = []; // <-- Add this line

    // Helper for Counter-like behavior
    function inc(obj, key, amt = 1) { obj[key] = (obj[key] || 0) + amt; }

    Object.entries(question_ids).forEach(([qid, data_category]) => {
        const storage = (answers[qid] || "").trim();
        const department = data_point_to_category_map[data_category] || "Other";
        inc(category_totals, department);

        const ideal_system = ideal_mapping[data_category];

        // Add nodes to graph data regardless of state
        all_graph_nodes.add(data_category);
        if (ideal_system) all_graph_nodes.add(ideal_system);
        if (storage && storage !== "Not Collected") {
            all_graph_nodes.add(storage);
            current_edges.push({ source: data_category, target: storage });
            inc(system_usage, storage);
        }

        // Calculate metrics
        let state = "";
        if (!storage || storage === "Not Collected") {
            state = "Disconnected";
            inc(state_counts, state);
            opportunities.push({ name: data_category, reason: "Data is not collected", target: ideal_system, priority: 1 });
        } else {
            // No longer incrementing digital count here.
            if (legacy_systems.includes(storage)) {
                state = "Legacy";
                inc(state_counts, state);
                opportunities.push({ name: data_category, reason: `Stored in Legacy system (${storage})`, target: ideal_system, priority: 2 });
            } else if (storage === ideal_system) {
                state = "Correctly Placed";
                inc(state_counts, state);
                inc(category_digital_counts, department); // <-- FIX: Only count as digital if correctly placed...
            } else {
                state = "Misaligned";
                inc(state_counts, state);
                opportunities.push({ name: data_category, reason: `Misaligned in ${storage}`, target: ideal_system, priority: 3 });
                inc(category_digital_counts, department); // <-- FIX: ...or misaligned in another modern system.
            }
        }
        data_point_details.push({ data_point: data_category, state: state }); // <-- Add this line
    });

    // Build ideal-state edges
    Object.entries(ideal_mapping).forEach(([data_category, ideal_system]) => {
        ideal_edges.push({ source: data_category, target: ideal_system });
    });

    // --- FINAL ANALYSIS & METRIC STRUCTURING ---
    const total_points = Object.keys(question_ids).length;
    const collected_points = total_points - state_counts["Disconnected"];
    const correctness_score = collected_points ? (state_counts["Correctly Placed"] / collected_points * 100) : 0;
    const four_state_percentages = {};
    Object.entries(state_counts).forEach(([k, v]) => {
        four_state_percentages[k] = (v / total_points * 100);
    });
    const departmental_scores = Object.keys(data_point_categories).map(cat => ({
        name: cat,
        value: (category_digital_counts[cat] || 0) / (category_totals[cat] || 1) * 100
    }));
    const top_opportunities = opportunities.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.name.localeCompare(b.name);
    }).slice(0, 5);
    const system_workload = Object.entries(system_usage)
        .sort((a, b) => b[1] - a[1])
        .map(([sys, count]) => ({ name: sys, value: count }));

    // --- NEW: Process priorities for Gap Analysis ---
    console.log("4. [DataMap] Processing priorities for Gap Analysis. Priorities received:", priorities);
    const gapAnalysisData = [];
    if (priorities && priorities.ranking) {
        const rankedCategories = Object.entries(priorities.ranking)
            .filter(([, rank]) => rank && rank !== '99') // Filter out 'N/A'
            .map(([category, rank]) => ({
                category,
                rank: parseInt(rank, 10)
            }))
            .sort((a, b) => a.rank - b.rank); // Sort by rank 1, 2, 3...
        
        console.log("5. [DataMap] Sorted and ranked categories:", rankedCategories);

        rankedCategories.forEach(item => {
            const deptScore = departmental_scores.find(d => d.name === item.category);
            if (deptScore) {
                gapAnalysisData.push({
                    name: item.category,
                    priority: item.rank,
                    score: parseFloat(deptScore.value.toFixed(1))
                });
            }
        });
        console.log("6. [DataMap] Final gapAnalysisData created:", gapAnalysisData);
    } else {
        console.warn("7. [DataMap] No priorities.ranking object found. Skipping Gap Analysis.");
    }


    // --- NEW: Identify problematic data points for solution mapping ---
    const problematicDataPoints = data_point_details
        .filter(dp => ["Misaligned", "Disconnected", "Legacy"].includes(dp.state))
        .map(dp => dp.data_point);

    // --- 5. Calculate Correctness Score ---
    // This is a more robust calculation.
    // It rewards correct connections and penalizes for incorrect ones.
    const idealEdgeSet = new Set(ideal_edges.map(e => `${e.source}|${e.target}`));
    const currentEdgeSet = new Set(current_edges.map(e => `${e.source}|${e.target}`));

    let correctEdges = 0;
    currentEdgeSet.forEach(edge => {
        if (idealEdgeSet.has(edge)) {
            correctEdges++;
        }
    });

    const totalIdealEdges = idealEdgeSet.size;
    const totalCurrentEdges = currentEdgeSet.size;
    const incorrectEdges = totalCurrentEdges - correctEdges;

    let correctnessScore = 0;
    if (totalIdealEdges > 0) {
        // Calculate a score based on correct edges vs ideal edges,
        // then penalize for extra, incorrect edges.
        const baseScore = (correctEdges / totalIdealEdges) * 100;
        const penalty = (incorrectEdges / totalIdealEdges) * 100; // Penalty is proportional to the number of ideal edges
        correctnessScore = Math.max(0, baseScore - penalty);
    } else if (totalCurrentEdges > 0) {
        // If there are no ideal edges, any current edge is incorrect.
        correctnessScore = 0;
    } else {
        // If no ideal and no current edges, the state is perfect (100%).
        correctnessScore = 100;
    }
    correctnessScore = Math.round(correctnessScore);


    // --- OUTPUT STRUCTURE ---
    return {
        correctnessScore: Number(correctness_score.toFixed(1)),
        fourStateData: Object.entries(state_counts).map(([k, v]) => ({ name: k, value: v })),
        departmentalScoresData: departmental_scores,
        systemWorkloadData: system_workload,
        topOpportunitiesData: top_opportunities,
        gapAnalysisData: gapAnalysisData, // <-- FIX: Added missing comma
        allNodes: Array.from(all_graph_nodes),
        systemNodes: system_nodes,
        currentEdges: current_edges,
        idealEdges: ideal_edges,
        problematicDataPoints: problematicDataPoints, // <-- FIX: Removed trailing characters and ensured it's the last item
        dataPointToCategoryMap: data_point_to_category_map
};
}

// --- Example usage in browser ---
// 1. Let user upload responses.json
// 2. Call computeDataMap(responses) and use the result to render dashboard

// Example (uncomment for use):
// document.getElementById('fileInput').addEventListener('change', function(e) {
//     const file = e.target.files[0];
//     const reader = new FileReader();
//     reader.onload = function(ev) {
//         const responses = JSON.parse(ev.target.result);
//         const dashboardData = computeDataMap(responses);
//         // Use dashboardData to render charts, etc.
//         console.log(dashboardData);
//     };
//     reader.readAsText(file);
// });

export { computeDataMap };
