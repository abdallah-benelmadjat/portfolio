// DataMap.js - Client-side version of Datamap.py logic for browser use

// --- CONFIGURATION ---
const data_point_categories = {
    "Production & Operations": [
        "production-schedule data", "dispatch-list data", "line-speed-setpoint data", "piece-count data",
        "scrap-reason data", "cycle-time data", "downtime-event data", "change-overs data",
        "first-pass-yield data", "batch-step data", "operator-logbook data"
    ],
    "Maintenance": [
        "run-hours data", "vibration-trend data", "temperature-trend data", "lubrication-usage data",
        "maintenance-work-order data", "failure-mode data", "parts-usage data", "calibration-schedule data",
        "warranty-claim data (asset side)", "service-contract data"
    ],
    "Quality & Compliance": [
        "spc-chart data", "inspection-result data", "vision-inspection data", "deviation-ticket data",
        "rework-log data", "audit-compliance data", "gauge-rr data", "customer-return-quality data",
        "emissions data", "safety-incident data"
    ],
    "Inventory & Flow": [
        "item-master data", "wip-balance data", "finished-goods-location data", "cycle-count data",
        "shelf-life data", "inbound-asn data", "outbound-shipment data", "reorder-point data"
    ],
    "Customer & Finance": [
        "customer-order data", "customer-forecast data", "warranty-claim data (field)", "customer-feedback data",
        "service-ticket data", "cost-variance data", "energy-ledger data"
    ],
    "Core OT/IT": [
        "energy-meter data", "sub-meter data", "compressed-air data", "steam-flow data", "hvac_runtime data",
        "scada-alarm data", "opc-heartbeat data", "time-clock data", "overtime-hours data", "skill-matrix data"
    ]
};
const data_point_to_category_map = {};
Object.entries(data_point_categories).forEach(([cat, dps]) => {
    dps.forEach(dp => { data_point_to_category_map[dp] = cat; });
});

const question_ids = {
    "production_schedule": "production-schedule data", "dispatch_list": "dispatch-list data", "line_speed_setpoint": "line-speed-setpoint data", "piece_counts": "piece-count data", "scrap_reasons": "scrap-reason data", "cycle_time": "cycle-time data", "downtime_events": "downtime-event data", "change_overs": "change-over data", "first_pass_yield": "first-pass-yield data", "batch_step": "batch-step data", "operator_logbook": "operator-logbook data", "run_hours": "run-hours data", "vibration_trend": "vibration-trend data", "temperature_trend": "temperature-trend data", "lubrication_usage": "lubrication-usage data", "maintenance_work_orders": "maintenance-work-order data", "failure_modes": "failure-mode data", "parts_usage": "parts-usage data", "calibration_schedule": "calibration-schedule data", "warranty_claims_asset": "warranty-claim data (asset side)", "service_contracts": "service-contract data", "spc_charts": "spc-chart data", "inspection_results": "inspection-result data", "vision_inspection": "vision-inspection data", "deviation_tickets": "deviation-ticket data", "rework_logs": "rework-log data", "audit_compliance": "audit-compliance data", "gauge_rr": "gauge-rr data", "customer_return_quality": "customer-return-quality data", "emissions": "emissions data", "safety_incidents": "safety-incident data", "item_master": "item-master data", "wip_balance": "wip-balance data", "finished_goods_location": "finished-goods-location data", "cycle_counts": "cycle-count data", "shelf_life": "shelf-life data", "inbound_asn": "inbound-asn data", "outbound_shipments": "outbound-shipment data", "reorder_points": "reorder-point data", "energy_meter": "energy-meter data", "sub_meter": "sub-meter data", "compressed_air": "compressed-air data", "steam_flow": "steam-flow data", "hvac_runtime": "hvac-runtime data", "time_clock": "time-clock data", "overtime_hours": "overtime-hours data", "skill_matrix": "skill-matrix data", "customer_orders": "customer-order data", "customer_forecasts": "customer-forecast data", "warranty_claims_field": "warranty-claim data (field)", "customer_feedback": "customer-feedback data", "service_tickets": "service-ticket data", "scada_alarms": "scada-alarm data", "opc_heartbeats": "opc-heartbeat data", "cost_variances": "cost-variance data", "energy_ledger": "energy-ledger data"
};
const ideal_mapping = {
    "production-schedule data": "MES", "dispatch-list data": "MES", "line-speed-setpoint data": "SCADA", "piece-count data": "SCADA", "scrap-reason data": "MES", "cycle-time data": "MES", "downtime-event data": "MES", "change-over data": "MES", "first-pass-yield data": "MES", "batch-step data": "MES", "operator-logbook data": "MES", "run-hours data": "CMMS", "vibration-trend data": "SCADA", "temperature-trend data": "SCADA", "lubrication-usage data": "CMMS", "maintenance-work-order data": "CMMS", "failure-mode data": "CMMS", "parts-usage data": "CMMS", "calibration-schedule data": "CMMS", "warranty-claim data (asset side)": "CMMS", "service-contract data": "CMMS", "spc-chart data": "QMS", "inspection-result data": "QMS", "vision-inspection data": "QMS", "deviation-ticket data": "QMS", "rework-log data": "QMS", "audit-compliance data": "QMS", "gauge-rr data": "QMS", "customer-return-quality data": "QMS", "emissions data": "QMS", "safety-incident data": "QMS", "item-master data": "WMS", "wip-balance data": "WMS", "finished-goods-location data": "WMS", "cycle-count data": "WMS", "shelf-life data": "WMS", "inbound-asn data": "WMS", "outbound-shipment data": "WMS", "reorder-point data": "WMS", "energy-meter data": "SCADA", "sub-meter data": "SCADA", "compressed-air data": "SCADA", "steam-flow data": "SCADA", "hvac_runtime data": "SCADA", "time-clock data": "MES", "overtime-hours data": "MES", "skill-matrix data": "MES", "customer-order data": "CRM", "customer-forecast data": "CRM", "warranty-claim data (field)": "CRM", "customer-feedback data": "CRM", "service-ticket data": "CRM", "scada-alarm data": "SCADA", "opc-heartbeat data": "SCADA", "cost-variance data": "ERP", "energy-ledger data": "ERP"
};
const system_nodes = ["MES", "ERP", "SCADA", "WMS", "QMS", "CMMS", "CRM", "Spreadsheet", "Paper", "Whiteboard", "Legacy / Other"];
const i40_systems = ["MES", "ERP", "SCADA", "WMS", "QMS", "CMMS", "CRM"];
const legacy_systems = ["Spreadsheet", "Paper", "Whiteboard", "Legacy / Other"];

// --- MAIN FUNCTION ---
// Pass in the parsed responses.json object
function computeDataMap(answers) {
    // --- METRICS & GRAPH DATA CALCULATION ---
    const all_graph_nodes = new Set();
    const current_edges = [];
    const ideal_edges = [];
    const state_counts = { "Correctly Placed": 0, "Misaligned": 0, "Legacy": 0, "Disconnected": 0 };
    const system_usage = {};
    const opportunities = [];
    const category_totals = {};
    const category_digital_counts = {};

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
        if (storage && storage !== "Not Collected") all_graph_nodes.add(storage);

        // Calculate metrics
        if (!storage || storage === "Not Collected") {
            state_counts["Disconnected"]++;
            if (ideal_system) {
                opportunities.push({ name: data_category, reason: "Not Collected", target: ideal_system, priority: 1 });
            }
        } else {
            current_edges.push({ source: data_category, target: storage });
            if (legacy_systems.includes(storage)) {
                state_counts["Legacy"]++;
                inc(system_usage, storage);
                if (ideal_system) {
                    opportunities.push({ name: data_category, reason: `On ${storage}`, target: ideal_system, priority: 2 });
                }
            } else if (i40_systems.includes(storage)) {
                inc(system_usage, storage);
                inc(category_digital_counts, department);
                if (storage === ideal_system) {
                    state_counts["Correctly Placed"]++;
                } else {
                    state_counts["Misaligned"]++;
                    if (ideal_system) {
                        opportunities.push({ name: data_category, reason: `Misaligned in ${storage}`, target: ideal_system, priority: 3 });
                    }
                }
            }
        }
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

    // --- OUTPUT STRUCTURE ---
    return {
        correctnessScore: Number(correctness_score.toFixed(1)),
        fourStateData: Object.entries(state_counts).map(([k, v]) => ({ name: k, value: v })),
        departmentalScoresData: departmental_scores,
        systemWorkloadData: system_workload,
        topOpportunitiesData: top_opportunities,
        allNodes: Array.from(all_graph_nodes),
        systemNodes: system_nodes,
        currentEdges: current_edges,
        idealEdges: ideal_edges
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
