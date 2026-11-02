import React, { useState, useEffect } from 'react';
import {
  Hammer,
  Calculator,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Briefcase,
  CheckCircle,
  Clock,
  Send,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { api, BOQResponse } from '../services/api';

export const ConstructionModule: React.FC = () => {
  // BOQ Calculator Inputs
  const [damageType, setDamageType] = useState('Pothole');
  const [lengthM, setLengthM] = useState(2.5);
  const [widthM, setWidthM] = useState(1.8);
  const [depthCm, setDepthCm] = useState(6.0);
  const [wastePct, setWastePct] = useState(10.0);
  const [boqResult, setBoqResult] = useState<BOQResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Construction Requests & Projects
  const [requests, setRequests] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newRoad, setNewRoad] = useState('');
  const [newPriority, setNewPriority] = useState('High');

  // Quotation Submission Modal State
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [quoteCompany, setQuoteCompany] = useState('');
  const [quoteAmount, setQuoteAmount] = useState<number>(0);
  const [quoteDays, setQuoteDays] = useState<number>(7);

  useEffect(() => {
    handleCalculateBOQ();
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await api.getConstructionRequests();
      setRequests(data);
    } catch (e) {
      console.warn('Failed to load construction requests:', e);
    }
  };

  const handleCalculateBOQ = async () => {
    setIsCalculating(true);
    try {
      const result = await api.calculateBOQ({
        damage_type: damageType,
        length_m: lengthM,
        width_m: widthM,
        depth_cm: depthCm,
        waste_factor_pct: wastePct
      });
      setBoqResult(result);
    } catch (e) {
      console.warn('BOQ calculation error:', e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newRoad) return;
    try {
      await fetch('/api/construction/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          road_name: newRoad,
          priority: newPriority,
          estimated_budget: boqResult?.total_estimated_cost_inr || 50000
        })
      });
      setNewTitle('');
      setNewRoad('');
      loadRequests();
    } catch (e) {
      console.warn('Create request error:', e);
    }
  };

  const handleStatusChange = async (reqId: number, status: string) => {
    try {
      await api.updateProjectStatus(reqId, status);
      loadRequests();
    } catch (e) {
      console.warn('Update status error:', e);
    }
  };

  const handleSubmitQuote = async () => {
    if (!selectedRequestId || !quoteCompany || quoteAmount <= 0) return;
    try {
      await api.submitQuotation({
        request_id: selectedRequestId,
        company_name: quoteCompany,
        quotation_amount: quoteAmount,
        timeline_days: quoteDays
      });
      setSelectedRequestId(null);
      setQuoteCompany('');
      setQuoteAmount(0);
      loadRequests();
    } catch (e) {
      console.warn('Submit quotation error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Hammer className="w-5 h-5 text-blue-400" />
            Construction Management & Preliminary BOQ Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Parametric road repair cost estimation, CPWD/IRC unit rates, material quantities, and 8-stage contractor lifecycle.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BOQ Estimator Column */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Preliminary Bill of Quantities (BOQ) Parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Defect Category</label>
              <select
                value={damageType}
                onChange={e => setDamageType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Pothole">Pothole (Local Cavity)</option>
                <option value="Longitudinal Crack">Longitudinal Surface Crack</option>
                <option value="Alligator Cracks">Alligator Cracking (Subgrade Failure)</option>
                <option value="Waterlogged Depression">Waterlogged Edge Depression</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Length (meters)</label>
                <input
                  type="number"
                  step="0.1"
                  value={lengthM}
                  onChange={e => setLengthM(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Width (meters)</label>
                <input
                  type="number"
                  step="0.1"
                  value={widthM}
                  onChange={e => setWidthM(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Depth (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={depthCm}
                  onChange={e => setDepthCm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Wastage Factor (%)</label>
                <input
                  type="number"
                  value={wastePct}
                  onChange={e => setWastePct(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                />
              </div>
            </div>

            <button
              onClick={handleCalculateBOQ}
              disabled={isCalculating}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Calculator className="w-4 h-4" />
              <span>{isCalculating ? 'Computing...' : 'Recalculate BOQ & Quantities'}</span>
            </button>
          </div>

          {/* Computed Physical Quantities Summary */}
          {boqResult && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <span className="text-xs text-slate-400">Recommended Repair Methodology:</span>
                <p className="text-xs font-bold text-blue-400">{boqResult.recommended_repair}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400">Surface Area:</span>
                  <p className="font-mono font-bold text-white">{boqResult.surface_area_sqm} m²</p>
                </div>
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400">Excavation Vol:</span>
                  <p className="font-mono font-bold text-white">{boqResult.volume_cum} m³</p>
                </div>
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400">Asphalt DBM:</span>
                  <p className="font-mono font-bold text-amber-400">{boqResult.asphalt_metric_tons} Tons</p>
                </div>
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400">Bitumen Tack:</span>
                  <p className="font-mono font-bold text-amber-400">{boqResult.bitumen_liters} Litres</p>
                </div>
              </div>

              {/* Total Estimated Cost */}
              <div className="bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-300">Total Preliminary Estimate:</span>
                  <p className="text-xl font-black font-mono text-emerald-400">
                    ₹{boqResult.total_estimated_cost_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <a
                  href="/api/reports/construction/1/pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF BOQ</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Contractor Projects & Tender Lifecycle Column */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4 text-blue-400" />
              Repair Requests & Contractor Lifecycle ({requests.length})
            </h3>
          </div>

          {/* Quick Create Request Form */}
          <form onSubmit={handleCreateRequest} className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Title (e.g. NH-48 Pothole Patching)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2"
              required
            />
            <input
              type="text"
              placeholder="Road Name"
              value={newRoad}
              onChange={e => setNewRoad(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg p-2 flex items-center justify-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Request</span>
            </button>
          </form>

          {/* Lifecycle Request Cards */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {requests.map(req => (
              <div key={req.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-400 font-bold">#{req.id}</span>
                      <h4 className="font-bold text-white text-sm">{req.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{req.road_name}</p>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      req.status === 'Completed'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : req.status === 'In Progress'
                        ? 'bg-blue-950 border-blue-500 text-blue-300'
                        : req.status === 'Quality Inspection'
                        ? 'bg-purple-950 border-purple-500 text-purple-300'
                        : 'bg-amber-950 border-amber-500 text-amber-300'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <span>
                    Est. Budget: <strong className="text-white">₹{req.estimated_budget?.toLocaleString('en-IN')}</strong>
                  </span>
                  <span>
                    Quotations: <strong className="text-white">{req.quotations_count || 0}</strong>
                  </span>
                </div>

                {/* Workflow Status Controls */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-slate-500">Lifecycle Action:</span>
                  <select
                    value={req.status}
                    onChange={e => handleStatusChange(req.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Approved">Approved</option>
                    <option value="Open for Quotation">Open for Quotation</option>
                    <option value="Contractor Assigned">Contractor Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Quality Inspection">Quality Inspection</option>
                    <option value="Completed">Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <button
                    onClick={() => {
                      setSelectedRequestId(req.id);
                      setQuoteAmount(Math.round(req.estimated_budget * 0.95));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1 transition"
                  >
                    <Send className="w-3 h-3 text-blue-400" />
                    <span>Quote</span>
                  </button>

                  <a
                    href={`/api/reports/construction/${req.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1 transition"
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>Report</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contractor Quotation Modal */}
      {selectedRequestId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Submit Contractor Quotation (#{selectedRequestId})
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Company / Contractor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Civil Highway Paving Pvt Ltd"
                  value={quoteCompany}
                  onChange={e => setQuoteCompany(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tender Quotation Amount (₹)</label>
                <input
                  type="number"
                  value={quoteAmount}
                  onChange={e => setQuoteAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Estimated Completion (Days)</label>
                <input
                  type="number"
                  value={quoteDays}
                  onChange={e => setQuoteDays(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRequestId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitQuote}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow"
              >
                Submit Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

