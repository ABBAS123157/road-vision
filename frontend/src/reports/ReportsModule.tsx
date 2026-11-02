import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Official Civil & Inspection Reports (PDF & Excel)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ReportLab vector PDF generation with inspection metadata, damage coordinates, and OpenPyXL Excel registers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inspection PDF Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Road Inspection Survey Report</h3>
            <p className="text-xs text-slate-400">
              Comprehensive report detailing road segment defects, severity indices, GPS coordinates, and inspector sign-off.
            </p>
          </div>

          <a
            href={api.getInspectionPdfUrl(1)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Inspection PDF</span>
          </a>
        </div>

        {/* Construction BOQ PDF Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Preliminary BOQ & Cost Estimate</h3>
            <p className="text-xs text-slate-400">
              Preliminary Bill of Quantities including asphalt metric tons, bitumen emulsion, aggregate, plant, and labor breakdown in INR.
            </p>
          </div>

          <a
            href={api.getBOQPdfUrl(1)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Download BOQ PDF</span>
          </a>
        </div>

        {/* Excel Spreadsheet Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Complete Master Dataset (Excel)</h3>
            <p className="text-xs text-slate-400">
              Multi-tab OpenPyXL spreadsheet containing all damage logs, maintenance ranking priorities, and construction budgets.
            </p>
          </div>

          <a
            href={api.getExcelExportUrl()}
            download="RoadVision_AI_Export.xlsx"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </a>
        </div>
      </div>
    </div>
  );
};

