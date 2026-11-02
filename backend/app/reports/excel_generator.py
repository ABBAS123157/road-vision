import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def generate_excel_export(inspections: list, damages: list, maintenance: list) -> io.BytesIO:
    wb = Workbook()
    
    # 1. Damage Records Sheet
    ws1 = wb.active
    ws1.title = "Road Damage Register"

    headers1 = ["Damage ID", "Inspection ID", "Defect Type", "Severity", "Confidence", "Length (m)", "Width (m)", "Area (m²)", "Depth (cm)", "Verified", "Date"]
    ws1.append(headers1)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center")

    for col_idx in range(1, len(headers1) + 1):
        cell = ws1.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    for d in damages:
        ws1.append([
            d.get("id"),
            d.get("inspection_id"),
            d.get("damage_type"),
            d.get("severity"),
            f"{int(d.get('confidence', 0.85) * 100)}%",
            d.get("estimated_length_m"),
            d.get("estimated_width_m"),
            d.get("estimated_area_sqm"),
            d.get("estimated_depth_cm"),
            "Yes" if d.get("verified_by_engineer") else "No",
            str(d.get("created_at"))[:19]
        ])

    # 2. Maintenance Priorities Sheet
    ws2 = wb.create_sheet(title="Maintenance Priorities")
    headers2 = ["Rank", "Road Segment", "Total Score (100)", "Risk Category", "Severity Score", "Traffic Score", "Pedestrian Score", "Flood Score", "Emergency Score", "Recommended Repair", "Est. Budget (₹)"]
    ws2.append(headers2)

    header2_fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")
    for col_idx in range(1, len(headers2) + 1):
        cell = ws2.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header2_fill
        cell.alignment = center_align

    for m in maintenance:
        ws2.append([
            m.get("rank"),
            m.get("road_segment"),
            m.get("total_priority_score"),
            m.get("risk_category"),
            m.get("damage_severity_score"),
            m.get("traffic_volume_score"),
            m.get("pedestrian_risk_score"),
            m.get("flood_risk_score"),
            m.get("emergency_importance_score"),
            m.get("recommended_repair"),
            m.get("estimated_budget")
        ])

    # Auto-adjust column widths
    for sheet in [ws1, ws2]:
        for col in sheet.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or "")
                max_len = max(max_len, len(val_str))
            sheet.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer

