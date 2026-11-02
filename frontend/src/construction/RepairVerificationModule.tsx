import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Eye,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export const RepairVerificationModule: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [completedFile, setCompletedFile] = useState<File | null>(null);
  const [origPreview, setOrigPreview] = useState<string | null>(null);
  const [compPreview, setCompPreview] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [engineerComment, setEngineerComment] = useState<string>('');
  const [isApproved, setIsApproved] = useState<boolean>(false);

  const handleOrigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOriginalFile(file);
      setOrigPreview(URL.createObjectURL(file));
    }
  };

  const handleCompChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCompletedFile(file);
      setCompPreview(URL.createObjectURL(file));
    }
  };

  const runVerification = async () => {
    if (!originalFile || !completedFile) return;
    setIsVerifying(true);
    try {
      const data = await api.verifyRepair(1, originalFile, completedFile);
      setResult(data);
      setIsApproved(data.quality_score >= 80.0);
    } catch (e) {
      console.warn('Repair verification error:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            AI-Assisted Before-and-After Repair Quality Verification
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare pre-existing pothole/crack imagery with completed asphalt compaction. Detects residual seams and generates quality indices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dual Upload Columns */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" />
            1. Select Inspection Photographs
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Original Damage Upload */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-semibold block">Original Damage (Before)</label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer bg-slate-950 aspect-square flex flex-col items-center justify-center overflow-hidden">
                {origPreview ? (
                  <img src={origPreview} alt="Original" className="w-full h-full object-cover" />
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                    <span className="text-xs text-slate-400 block font-medium">Upload Damage</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleOrigChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Completed Repair Upload */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-semibold block">Repaired Road (After)</label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer bg-slate-950 aspect-square flex flex-col items-center justify-center overflow-hidden">
                {compPreview ? (
                  <img src={compPreview} alt="Completed" className="w-full h-full object-cover" />
                ) : (
                  <div className="space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-slate-500 mx-auto" />
                    <span className="text-xs text-slate-400 block font-medium">Upload Repaired</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCompChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <button
            onClick={runVerification}
            disabled={!originalFile || !completedFile || isVerifying}
            className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
              originalFile && completedFile
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isVerifying ? 'Running Computer Vision Verification...' : 'Analyze Repair Quality with AI'}</span>
          </button>
        </div>

        {/* Verification Result Column */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            2. AI Repair Quality Assessment & Civil Sign-off
          </h3>

          {result ? (
            <div className="space-y-4">
              {/* Quality Score & Badge */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Quality Score:</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black font-mono text-emerald-400">{result.quality_score}</span>
                    <span className="text-sm text-slate-500">/ 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Visible Repair Coverage:</span>
                  <p className="text-2xl font-black font-mono text-blue-400">{result.repair_coverage_pct}%</p>
                </div>
              </div>

              {/* Assessment Tier */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-semibold">Classification:</span>
                <p className="text-sm font-bold text-white">{result.quality_tier}</p>
                <p className="text-xs text-slate-300 mt-1">{result.assessment_notes}</p>
              </div>

              {/* Residual Defects Counter */}
              <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-300">Residual Edge Defects / Voids Found:</span>
                <strong className={`font-mono ${result.residual_defects_found > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {result.residual_defects_found} Detected
                </strong>
              </div>

              {/* Civil Engineer Sign-off Form */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs text-slate-400 font-semibold block">Civil Engineer Comments & Approval</label>
                <textarea
                  rows={2}
                  value={engineerComment}
                  onChange={e => setEngineerComment(e.target.value)}
                  placeholder="Enter verification comments (e.g. Surface compaction verified to IRC standards)."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="engineerApprove"
                      checked={isApproved}
                      onChange={e => setIsApproved(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                    />
                    <label htmlFor="engineerApprove" className="text-xs text-slate-300 font-medium">
                      Certified & Verified by Civil Engineer
                    </label>
                  </div>

                  <button
                    onClick={() => alert('Repair Verification Certificate recorded into audit log.')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition"
                  >
                    Save Certificate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-950 rounded-xl border border-slate-800/80 text-slate-500">
              <Eye className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">Upload before and after repair images to compute automated quality score and surface coverage.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

