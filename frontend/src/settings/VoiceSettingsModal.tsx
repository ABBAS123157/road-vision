import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  Languages,
  Check,
  Play,
  Save,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, voiceAssistant, VoiceSettings } from '../services/voiceAssistant';
import { api } from '../services/api';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [defaultLang, setDefaultLang] = useState<string>(voiceAssistant.getDefaultLanguage());
  const [preferredLangs, setPreferredLangs] = useState<string[]>(voiceAssistant.getPreferredLanguages());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(voiceAssistant.getVoiceSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDefaultLang(voiceAssistant.getDefaultLanguage());
      setPreferredLangs(voiceAssistant.getPreferredLanguages());
      setVoiceSettings(voiceAssistant.getVoiceSettings());

      // Load browser voices
      if ('speechSynthesis' in window) {
        const updateVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          setAvailableVoices(voices);
        };
        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePreferredLang = (code: string) => {
    if (preferredLangs.includes(code)) {
      if (preferredLangs.length === 1) return; // Keep at least one
      setPreferredLangs(preferredLangs.filter(c => c !== code));
      if (defaultLang === code) {
        setDefaultLang(preferredLangs.find(c => c !== code) || 'en');
      }
    } else {
      setPreferredLangs([...preferredLangs, code]);
    }
  };

  const handleTestVoice = () => {
    voiceAssistant.saveSettings(defaultLang, preferredLangs, voiceSettings);
    voiceAssistant.speak('welcome', defaultLang, true);
  };

  const handleSave = async () => {
    setSaving(true);
    voiceAssistant.saveSettings(defaultLang, preferredLangs, voiceSettings);

    try {
      // Save in MongoDB if user is logged in
      await api.saveVoicePreferences({
        default_language: defaultLang,
        preferred_languages: preferredLangs,
        voice_settings: voiceSettings
      });
    } catch (e) {
      console.warn('Saved locally, remote MongoDB sync notice:', e);
    }

    setSaving(false);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      if (onSaved) onSaved();
      onClose();
    }, 600);
  };

  // Filter voices that match selected language or region
  const selectedLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === defaultLang);
  const filteredVoices = availableVoices.filter(v =>
    selectedLangConfig ? v.lang.toLowerCase().includes(selectedLangConfig.code) || v.lang === selectedLangConfig.speechCode : true
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-xl shadow-lg">
              <Languages className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Multilingual Voice Assistant <Sparkles className="w-4 h-4 text-cyan-400" />
              </h2>
              <p className="text-xs text-slate-400">
                12 languages supported with live voice commands and AI road hazard audio alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-semibold px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Multi-language selection */}
        <div className="mt-5">
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            1. Select Preferred Languages (Multiple Allowed)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {SUPPORTED_LANGUAGES.map(lang => {
              const isSelected = preferredLangs.includes(lang.code);
              const isDefault = defaultLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => togglePreferredLang(lang.code)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{lang.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <span className="text-xs text-slate-400 mt-1">{lang.nativeName}</span>
                  {isDefault && (
                    <span className="mt-2 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded w-max">
                      Default
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Default language picker */}
        <div className="mt-5">
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            2. Primary Active Voice Language
          </label>
          <select
            value={defaultLang}
            onChange={e => setDefaultLang(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            {preferredLangs.map(code => {
              const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
              return (
                <option key={code} value={code}>
                  {lang?.name} ({lang?.nativeName})
                </option>
              );
            })}
          </select>
        </div>

        {/* Voice synthesis controls */}
        <div className="mt-6 p-4 bg-slate-800/60 border border-slate-700/70 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {voiceSettings.voiceOutputEnabled ? (
                <Volume2 className="w-5 h-5 text-cyan-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <span className="font-semibold text-sm text-white">Voice Alerts & Announcements</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={voiceSettings.voiceOutputEnabled}
                onChange={e => setVoiceSettings({ ...voiceSettings, voiceOutputEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Voice selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Preferred Browser Voice
            </label>
            <select
              value={voiceSettings.preferredVoiceURI}
              onChange={e => setVoiceSettings({ ...voiceSettings, preferredVoiceURI: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">Auto-select optimal system voice</option>
              {(filteredVoices.length > 0 ? filteredVoices : availableVoices).map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speech Rate & Volume Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Speech Speed</span>
                <span className="font-mono text-cyan-400">{voiceSettings.speechRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSettings.speechRate}
                onChange={e => setVoiceSettings({ ...voiceSettings, speechRate: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Alert Volume</span>
                <span className="font-mono text-cyan-400">{Math.round(voiceSettings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={voiceSettings.volume}
                onChange={e => setVoiceSettings({ ...voiceSettings, volume: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Test Voice Button */}
          <div className="pt-2 flex justify-start">
            <button
              type="button"
              onClick={handleTestVoice}
              className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-white flex items-center space-x-2 transition-all"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Voice in {SUPPORTED_LANGUAGES.find(l => l.code === defaultLang)?.name}</span>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Preferences are synced to your MongoDB profile</span>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{savedNotice ? 'Saved!' : saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
