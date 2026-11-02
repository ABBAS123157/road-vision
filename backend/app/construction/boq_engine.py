from typing import Dict, Any, List
from ..schemas.schemas import BOQCalculationRequest, BOQCalculationResponse, BOQItemDetail

def calculate_preliminary_boq(req: BOQCalculationRequest) -> BOQCalculationResponse:
    """
    Computes professional civil engineering preliminary Bill of Quantities (BOQ)
    using configurable material densities, compaction factors, and standard CPWD/IRC specifications.
    """
    area_sqm = round(req.length_m * req.width_m, 2)
    depth_m = req.depth_cm / 100.0
    volume_cum = round(area_sqm * depth_m, 3)

    # Engineering constants (Indian Road Congress / Standard Pavement Eng.)
    ASPHALT_DENSITY = 2.40 # Metric tons per cubic meter
    AGGREGATE_DENSITY = 2.15 # Metric tons per cubic meter
    TACK_COAT_RATE = 0.70 # Litres of bitumen emulsion per sqm
    WASTE_MULTIPLIER = 1.0 + (req.waste_factor_pct / 100.0)

    # 1. Asphalt DBM / BC calculation
    asphalt_tons = round(volume_cum * ASPHALT_DENSITY * WASTE_MULTIPLIER, 2)
    asphalt_cost = round(asphalt_tons * req.asphalt_rate_per_ton, 2)

    # 2. Bitumen Tack / Prime Coat calculation
    bitumen_liters = round(area_sqm * TACK_COAT_RATE * WASTE_MULTIPLIER, 1)
    bitumen_cost = round(bitumen_liters * req.bitumen_rate_per_ltr, 2)

    # 3. Aggregate Granular Sub-base (for deep patches or repairs > 5cm)
    if req.depth_cm > 5.0:
        subbase_thick_m = 0.10
        aggregate_tons = round(area_sqm * subbase_thick_m * AGGREGATE_DENSITY * WASTE_MULTIPLIER, 2)
    else:
        aggregate_tons = round(area_sqm * 0.05 * AGGREGATE_DENSITY * WASTE_MULTIPLIER, 2)
    aggregate_cost = round(aggregate_tons * req.aggregate_rate_per_ton, 2)

    # 4. Skilled & Unskilled Labour
    # Approximately 1 labour-day per 3 sqm of localized patch repair + tacking
    labour_days = max(1.5, round(area_sqm / 2.5, 1))
    labour_cost = round(labour_days * req.labour_daily_rate, 2)

    # 5. Plant & Equipment (Vibratory Roller Compactor, Asphalt Cutter, Emulsion Sprayer)
    equipment_hours = max(2.0, round(area_sqm * 0.4 + 1.0, 1))
    equipment_cost = round(equipment_hours * req.equipment_rate_per_hr, 2)

    # 6. Transport & Tipper Truck
    transport_trips = max(1, int((asphalt_tons + aggregate_tons) / 8.0) + 1)
    transport_cost = round(transport_trips * req.transport_rate_per_trip, 2)

    total_cost = round(asphalt_cost + bitumen_cost + aggregate_cost + labour_cost + equipment_cost + transport_cost, 2)

    # Select recommended repair method based on physical dimensions & damage category
    dt = req.damage_type.lower()
    if "alligator" in dt or area_sqm > 15.0:
        recommended_repair = "Full-Depth Pavement Reconstruction & Sub-base Stabilization"
    elif "crack" in dt:
        recommended_repair = "Hot-Pour Elastomeric Crack Sealing with Routing"
    elif req.depth_cm >= 8.0:
        recommended_repair = "Deep Patch Excavation with Dense Bituminous Macadam (DBM)"
    elif area_sqm > 5.0:
        recommended_repair = "Mill and Inlay Overlay Resurfacing"
    else:
        recommended_repair = "Standard Semi-Dense Pothole Patching with Edge Saw-Cutting"

    items = [
        BOQItemDetail(
            item_name="Dense Bituminous Macadam (DBM) / Asphalt Concrete",
            description=f"Compacted hot-mix asphalt (VG-30 grade) with {req.waste_factor_pct}% wastage factor",
            quantity=asphalt_tons,
            unit="Metric Ton",
            unit_rate=req.asphalt_rate_per_ton,
            total_amount=asphalt_cost
        ),
        BOQItemDetail(
            item_name="Rapid Setting Bitumen Emulsion Tack Coat (RS-1)",
            description=f"Application of tack coat @ {TACK_COAT_RATE} L/sq.m on cleaned dry surface",
            quantity=bitumen_liters,
            unit="Litres",
            unit_rate=req.bitumen_rate_per_ltr,
            total_amount=bitumen_cost
        ),
        BOQItemDetail(
            item_name="Crushed Granular Sub-base (GSB) Aggregate",
            description="Graded aggregate base course compacted with vibratory roller",
            quantity=aggregate_tons,
            unit="Metric Ton",
            unit_rate=req.aggregate_rate_per_ton,
            total_amount=aggregate_cost
        ),
        BOQItemDetail(
            item_name="Skilled & Unskilled Paving Labour",
            description="Tacking, spreading, edging, raking, and site safety management",
            quantity=labour_days,
            unit="Man-Days",
            unit_rate=req.labour_daily_rate,
            total_amount=labour_cost
        ),
        BOQItemDetail(
            item_name="Compactor / Vibratory Roller & Asphalt Cutter Plant",
            description="Mechanical pavement cutting, clearing, and 8-10 ton roller passes",
            quantity=equipment_hours,
            unit="Hours",
            unit_rate=req.equipment_rate_per_hr,
            total_amount=equipment_cost
        ),
        BOQItemDetail(
            item_name="Tipper Haulage & Material Transport",
            description="Batching plant to site hot delivery within regulated temperature limits",
            quantity=float(transport_trips),
            unit="Trips",
            unit_rate=req.transport_rate_per_trip,
            total_amount=transport_cost
        )
    ]

    disclaimer = (
        "Engineering Notice: Preliminary BOQ generated algorithmically from optical inspection dimensions. "
        "Physical core drilling and subgrade moisture testing required by a certified civil engineer before final tender issuance."
    )

    return BOQCalculationResponse(
        surface_area_sqm=area_sqm,
        volume_cum=volume_cum,
        asphalt_metric_tons=asphalt_tons,
        bitumen_liters=bitumen_liters,
        aggregate_metric_tons=aggregate_tons,
        labour_days=labour_days,
        equipment_hours=equipment_hours,
        transport_trips=transport_trips,
        total_estimated_cost_inr=total_cost,
        recommended_repair=recommended_repair,
        items=items,
        disclaimer=disclaimer
    )

