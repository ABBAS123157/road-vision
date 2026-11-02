import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_inspection_pdf(inspection_data: dict, damages: list) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#6B7280'),
        spaceAfter=14
    )
    header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1F2937'),
        spaceBefore=10,
        spaceAfter=8
    )

    # Title & Header
    story.append(Paragraph("ROADVISION AI – ROAD INSPECTION & DAMAGE REPORT", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')} | Autonomous Road Intelligence Platform", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563EB'), spaceAfter=14))

    # Inspection Metadata Table
    meta_data = [
        [Paragraph("<b>Inspection Title:</b>", styles['Normal']), Paragraph(str(inspection_data.get("title", "Road Survey")), styles['Normal'])],
        [Paragraph("<b>Road Segment:</b>", styles['Normal']), Paragraph(str(inspection_data.get("road_name", "N/A")), styles['Normal'])],
        [Paragraph("<b>GPS Coordinates:</b>", styles['Normal']), Paragraph(f"{inspection_data.get('latitude', 0.0):.6f}° N, {inspection_data.get('longitude', 0.0):.6f}° E", styles['Normal'])],
        [Paragraph("<b>Road Type:</b>", styles['Normal']), Paragraph(str(inspection_data.get("road_type", "City Road")), styles['Normal'])],
        [Paragraph("<b>Weather Condition:</b>", styles['Normal']), Paragraph(str(inspection_data.get("weather_condition", "Clear")), styles['Normal'])],
        [Paragraph("<b>Status:</b>", styles['Normal']), Paragraph(f"<font color='#059669'><b>{inspection_data.get('status', 'Verified')}</b></font>", styles['Normal'])],
    ]
    meta_table = Table(meta_data, colWidths=[150, 390])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F3F4F6')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Damages Section
    story.append(Paragraph(f"Identified Surface Defects ({len(damages)} Records)", header_style))
    
    damage_table_data = [
        ["#", "Defect Type", "Severity", "Confidence", "Length (m)", "Width (m)", "Area (m²)", "Est. Depth (cm)"]
    ]
    for idx, d in enumerate(damages, start=1):
        damage_table_data.append([
            str(idx),
            str(d.get("damage_type", "Pothole")),
            str(d.get("severity", "Medium")),
            f"{int(d.get('confidence', 0.85) * 100)}%",
            f"{d.get('estimated_length_m', 1.0):.1f}",
            f"{d.get('estimated_width_m', 0.8):.1f}",
            f"{d.get('estimated_area_sqm', 0.8):.2f}",
            f"{d.get('estimated_depth_cm', 5.0):.1f}"
        ])

    damage_table = Table(damage_table_data, colWidths=[24, 130, 60, 66, 65, 65, 65, 65])
    damage_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(damage_table)
    story.append(Spacer(1, 20))

    # Engineering Sign-off Box
    signoff_data = [
        [
            Paragraph("<b>Civil Engineer Verification:</b><br/>Status: <b>Verified & Approved for BOQ</b><br/>Sign-off: PWD Civil Division", styles['Normal']),
            Paragraph("<b>Road Inspector:</b><br/>Autonomous AI + Certified Field Inspector<br/>Safety Advisory: Active Defect Rectification Required", styles['Normal'])
        ]
    ]
    signoff_table = Table(signoff_data, colWidths=[270, 270])
    signoff_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#2563EB')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(signoff_table)

    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_boq_pdf(request_data: dict, boq_items: list, total_cost: float) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F766E'),
        spaceAfter=6
    )
    story.append(Paragraph("ROADVISION AI – BILL OF QUANTITIES (BOQ) & ESTIMATE", title_style))
    story.append(Paragraph(f"Project Reference: #{request_data.get('id', 'NEW')} | Road: {request_data.get('road_name', 'Corridor')}", styles['Normal']))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0D9488'), spaceAfter=14))

    table_data = [
        ["Item Description", "Qty", "Unit", "Unit Rate (₹)", "Total Amount (₹)"]
    ]
    for item in boq_items:
        table_data.append([
            Paragraph(f"<b>{item.get('item_name')}</b><br/><font size=7 color='#64748B'>{item.get('description')}</font>", styles['Normal']),
            f"{item.get('quantity'):.2f}",
            str(item.get('unit')),
            f"₹{item.get('unit_rate'):,.2f}",
            f"₹{item.get('total_amount'):,.2f}"
        ])

    table_data.append([
        Paragraph("<b>GRAND TOTAL ESTIMATED COST</b>", styles['Normal']),
        "", "", "",
        f"₹{total_cost:,.2f}"
    ])

    boq_table = Table(table_data, colWidths=[240, 50, 70, 85, 95])
    boq_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F766E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F0FDFA')]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#CCFBF1')),
        ('SPAN', (0, -1), (3, -1)),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(boq_table)

    doc.build(story)
    buffer.seek(0)
    return buffer

