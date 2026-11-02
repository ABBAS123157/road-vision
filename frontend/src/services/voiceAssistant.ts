// =====================================================================
// RoadVision AI - Multilingual Voice Assistant Service
// Supports 12 Languages with Web Speech Recognition & SpeechSynthesis
// =====================================================================

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string; // BCP-47 tag for speech synthesis & recognition
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-US' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechCode: 'ml-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', speechCode: 'ur-PK' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechCode: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', speechCode: 'fr-FR' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA' },
];

export interface VoiceSettings {
  voiceOutputEnabled: boolean;
  speechRate: number; // 0.5 to 2.0
  pitch: number;      // 0.5 to 2.0
  volume: number;     // 0.0 to 1.0
  preferredVoiceURI: string;
}

export type AlertEventType =
  | 'person_detected'
  | 'vehicle_detected'
  | 'motorcycle_detected'
  | 'pothole_detected'
  | 'danger_stop'
  | 'caution'
  | 'safe_proceed'
  | 'recording_started'
  | 'recording_stopped'
  | 'gps_acquired'
  | 'gps_unavailable'
  | 'welcome';

// Dictionary of localized voice announcement phrases
const TRANSLATIONS: Record<string, Record<AlertEventType, string>> = {
  en: {
    welcome: 'RoadVision AI active. Multilingual Voice Assistant ready.',
    person_detected: 'Pedestrian detected near vehicle path.',
    vehicle_detected: 'Vehicle detected ahead.',
    motorcycle_detected: 'Motorcycle detected nearby.',
    pothole_detected: 'Warning: Pothole detected ahead. Reduce speed.',
    danger_stop: 'Danger! Obstacle detected. Stop immediately.',
    caution: 'Caution. Surrounding road hazards detected.',
    safe_proceed: 'Path clear. Safe to proceed.',
    recording_started: 'Automatic road detection video recording started.',
    recording_stopped: 'Road recording stopped. Video saved to secure storage.',
    gps_acquired: 'Live GPS location acquired.',
    gps_unavailable: 'Device GPS location unavailable. Please enable permissions.'
  },
  ta: {
    welcome: 'ரோடுவிஷன் ஏஐ தயார். பலமொழி குரல் உதவியாளர் தயாராக உள்ளது.',
    person_detected: 'வாகன பாதையில் பாதசாரி கண்டறியப்பட்டார்.',
    vehicle_detected: 'முன்னால் வாகனம் கண்டறியப்பட்டது.',
    motorcycle_detected: 'அருகில் மோட்டார் சைக்கிள் கண்டறியப்பட்டது.',
    pothole_detected: 'எச்சரிக்கை: முன்னால் குழி உள்ளது. வேகத்தைக் குறைக்கவும்.',
    danger_stop: 'ஆபத்து! தடை உள்ளது. உடனடியாக நிறுத்தவும்.',
    caution: 'கவனம். சாலை ஆபத்துகள் உள்ளன.',
    safe_proceed: 'பாதை தெளிவாக உள்ளது. பாதுகாப்பாக செல்லலாம்.',
    recording_started: 'சாலை வீடியோ பதிவு தொடங்கியது.',
    recording_stopped: 'வீடியோ பதிவு முடிந்தது. பாதுகாப்பாக சேமிக்கப்பட்டது.',
    gps_acquired: 'ஜிபிஎஸ் இருப்பிடம் பெறப்பட்டது.',
    gps_unavailable: 'ஜிபிஎஸ் இருப்பிடம் கிடைக்கவில்லை.'
  },
  te: {
    welcome: 'రోడ్‌విజన్ ఏఐ సిద్ధంగా ఉంది. వాయిస్ అసిస్టెంట్ ఆన్‌లో ఉంది.',
    person_detected: 'వాహనం మార్గంలో పాదచారి గుర్తించబడ్డారు.',
    vehicle_detected: 'ముందు వాహనం గుర్తించబడింది.',
    motorcycle_detected: 'మోటార్ సైకిల్ గుర్తించబడింది.',
    pothole_detected: 'హెచ్చరిక: ముందు గుంత ఉంది. వేగాన్ని తగ్గించండి.',
    danger_stop: 'ప్రమాదం! అడ్డంకి ఉంది. వెంటనే ఆపండి.',
    caution: 'జాగ్రత్త. రోడ్డు ప్రమాదాలు ఉన్నాయి.',
    safe_proceed: 'దారి స్పష్టంగా ఉంది. సురక్షితంగా వెళ్ళండి.',
    recording_started: 'వీడియో రికార్డింగ్ ప్రారంభమైంది.',
    recording_stopped: 'వీడియో రికార్డింగ్ పూర్తయింది. భద్రపరచబడింది.',
    gps_acquired: 'జిపిఎస్ స్థానం కనుగొనబడింది.',
    gps_unavailable: 'జిపిఎస్ స్థానం అందుబాటులో లేదు.'
  },
  hi: {
    welcome: 'रोडविज़न एआई सक्रिय है। बहुभाषी आवाज़ सहायक तैयार है।',
    person_detected: 'सड़क पर पैदल यात्री देखा गया। सावधानी बरतें।',
    vehicle_detected: 'आगे वाहन देखा गया।',
    motorcycle_detected: 'पास में मोटरसाइकिल देखी गई।',
    pothole_detected: 'चेतावनी: आगे गड्ढा है। गति धीमी करें।',
    danger_stop: 'खतरा! रुकावट देखी गई। तुरंत वाहन रोकें।',
    caution: 'सावधानी। सड़क पर खतरा देखा गया।',
    safe_proceed: 'रास्ता साफ़ है। आगे बढ़ना सुरक्षित है।',
    recording_started: 'सड़क वीडियो रिकॉर्डिंग शुरू हो गई है।',
    recording_stopped: 'रिकॉर्डिंग समाप्त। वीडियो सुरक्षित कर लिया गया है।',
    gps_acquired: 'जीपीएस स्थान प्राप्त हुआ।',
    gps_unavailable: 'जीपीएस स्थान अनुपलब्ध है। कृपया अनुमति दें।'
  },
  ml: {
    welcome: 'റോഡ്‌വിഷൻ എഐ സജ്ജമാണ്. വോയ്സ് അസിസ്റ്റന്റ് തയ്യാറാണ്.',
    person_detected: 'പാതയിൽ കാൽനടയാത്രക്കാരനെ കണ്ടെത്തി.',
    vehicle_detected: 'മുന്നിൽ വാഹനം കണ്ടെത്തി.',
    motorcycle_detected: 'മോട്ടോർ സൈക്കിൾ കണ്ടെത്തി.',
    pothole_detected: 'മുന്നറിയിപ്പ്: മുന്നിൽ കുഴിയുണ്ട്. വേഗത കുറയ്ക്കുക.',
    danger_stop: 'അപകടം! വാഹനം ഉടൻ നിർത്തുക.',
    caution: 'ശ്രദ്ധിക്കുക. അപകടസാധ്യത കണ്ടെത്തി.',
    safe_proceed: 'പാത വ്യക്തമാണ്. സുരക്ഷിതമായി മുന്നോട്ട് പോകാം.',
    recording_started: 'റോഡ് വീഡിയോ റെക്കോർഡിംഗ് ആരംഭിച്ചു.',
    recording_stopped: 'വീഡിയോ സേവ് ചെയ്തു.',
    gps_acquired: 'ജിപിഎസ് ലൊക്കേഷൻ കണ്ടെത്തി.',
    gps_unavailable: 'ജിപിഎസ് ലഭ്യമല്ല.'
  },
  kn: {
    welcome: 'ರೋಡ್‌ವಿಷನ್ ಎಐ ಸಕ್ರಿಯವಾಗಿದೆ. ಧ್ವನಿ ಸಹಾಯಕ ಸಿದ್ಧವಾಗಿದೆ.',
    person_detected: 'ವಾಹನದ ಹಾದಿಯಲ್ಲಿ ಪಾದಚಾರಿ ಕಂಡುಬಂದಿದ್ದಾರೆ.',
    vehicle_detected: 'ಮುಂದೆ ವಾಹನ ಪತ್ತೆಯಾಗಿದೆ.',
    motorcycle_detected: 'ಮೋಟಾರ್ ಸೈಕಲ್ ಪತ್ತೆಯಾಗಿದೆ.',
    pothole_detected: 'ಎಚ್ಚರಿಕೆ: ಮುಂದೆ ಗುಂಡಿ ಇದೆ. ವೇಗವನ್ನು ಕಡಿಮೆ ಮಾಡಿ.',
    danger_stop: 'ಅಪಾಯ! ಅಡೆತಡೆ ಇದೆ. ತಕ್ಷಣ ನಿಲ್ಲಿಸಿ.',
    caution: 'ಎಚ್ಚರ. ರಸ್ತೆ ಅಪಾಯಗಳು ಪತ್ತೆಯಾಗಿವೆ.',
    safe_proceed: 'ರಸ್ತೆ ಸ್ಪಷ್ಟವಾಗಿದೆ. ಸುರಕ್ಷಿತವಾಗಿ ಮುಂದುವರಿಯಿರಿ.',
    recording_started: 'ವೀಡಿಯೊ ರೆಕಾರ್ಡಿಂಗ್ ಪ್ರಾರಂಭವಾಯಿತು.',
    recording_stopped: 'ವೀಡಿಯೊ ರೆಕಾರ್ಡಿಂಗ್ ಉಳಿಸಲಾಗಿದೆ.',
    gps_acquired: 'ಜಿಪಿಎಸ್ ಸ್ಥಳ ಪತ್ತೆಯಾಗಿದೆ.',
    gps_unavailable: 'ಜಿಪಿಎಸ್ ಸ್ಥಳ ಲಭ್ಯವಿಲ್ಲ.'
  },
  bn: {
    welcome: 'রোডভিশন এআই সক্রিয়। বহুভাষিক ভয়েস সহকারী প্রস্তুত।',
    person_detected: 'রাস্তায় পথচারী সনাক্ত হয়েছে।',
    vehicle_detected: 'সামনে যানবাহন সনাক্ত হয়েছে।',
    motorcycle_detected: 'কাছে মোটরসাইকেল সনাক্ত হয়েছে।',
    pothole_detected: 'সতর্কতা: সামনে গর্ত আছে। গতি কমান।',
    danger_stop: 'বিপদ! সামনে বাধা। অবিলম্বে থামুন।',
    caution: 'সতর্কতা অবলম্বন করুন।',
    safe_proceed: 'পথ পরিষ্কার। নিরাপদে এগিয়ে যান।',
    recording_started: 'ভিডিও রেকর্ডিং শুরু হয়েছে।',
    recording_stopped: 'ভিডিও সংরক্ষিত হয়েছে।',
    gps_acquired: 'জিপিএস অবস্থান পাওয়া গেছে।',
    gps_unavailable: 'জিপিএস অনুপলব্ধ।'
  },
  mr: {
    welcome: 'रोडव्हिजन एआय सक्रिय आहे. व्हॉईस असिस्टंट तयार आहे.',
    person_detected: 'रस्त्यावर पादचारी आढळले.',
    vehicle_detected: 'पुढे वाहन आढळले.',
    motorcycle_detected: 'जवळच मोटरसायकल आढळली.',
    pothole_detected: 'चेतावणी: पुढे खड्डा आहे. वेग कमी करा.',
    danger_stop: 'धोका! त्वरित थांबा.',
    caution: 'सावधानता बाळगा.',
    safe_proceed: 'रस्ता मोकळा आहे. सुरक्षित पुढे जा.',
    recording_started: 'व्हिडिओ रेकॉर्डिंग सुरू झाले.',
    recording_stopped: 'व्हिडिओ सेव्ह केला गेला.',
    gps_acquired: 'जीपीएस स्थान प्राप्त झाले.',
    gps_unavailable: 'जीपीएस स्थान उपलब्ध नाही.'
  },
  ur: {
    welcome: 'روڈ ویژن اے آئی تیار ہے۔ وائس اسسٹنٹ فعال ہے۔',
    person_detected: 'راستے میں پیدل چلنے والا دیکھا گیا۔',
    vehicle_detected: 'سامنے گاڑی دیکھی گئی۔',
    motorcycle_detected: 'قریب موٹر سائیکل موجود ہے۔',
    pothole_detected: 'خبردار: آگے گڑھا ہے۔ رفتار کم کریں۔',
    danger_stop: 'خطرہ! فوری طور پر رکیں۔',
    caution: 'احتیاط برتیں۔',
    safe_proceed: 'راستہ صاف ہے۔ محفوظ طریقے سے آگے بڑھیں۔',
    recording_started: 'ویڈیو ریکارڈنگ شروع ہوگئی۔',
    recording_stopped: 'ویڈیو محفوظ کر لی گئی۔',
    gps_acquired: 'جی پی ایس لوکیشن مل گئی۔',
    gps_unavailable: 'جی پی ایس دستیاب نہیں ہے۔'
  },
  es: {
    welcome: 'RoadVision AI activo. Asistente de voz multilingüe listo.',
    person_detected: 'Peatón detectado cerca de la trayectoria del vehículo.',
    vehicle_detected: 'Vehículo detectado adelante.',
    motorcycle_detected: 'Motocicleta detectada cerca.',
    pothole_detected: 'Advertencia: Bache detectado. Reduzca la velocidad.',
    danger_stop: '¡Peligro! Obstáculo detectado. Deténgase inmediatamente.',
    caution: 'Precaución. Peligros en la carretera detectados.',
    safe_proceed: 'Camino despejado. Seguro para continuar.',
    recording_started: 'Grabación de video de detección de carretera iniciada.',
    recording_stopped: 'Grabación detenida y guardada de forma segura.',
    gps_acquired: 'Ubicación GPS adquirida.',
    gps_unavailable: 'Ubicación GPS no disponible.'
  },
  fr: {
    welcome: 'RoadVision AI actif. Assistant vocal multilingue prêt.',
    person_detected: 'Piéton détecté près de la trajectoire.',
    vehicle_detected: 'Véhicule détecté devant.',
    motorcycle_detected: 'Moto détectée à proximité.',
    pothole_detected: 'Attention: Nid-de-poule détecté. Réduisez votre vitesse.',
    danger_stop: 'Danger! Obstacle détecté. Arrêtez-vous immédiatement.',
    caution: 'Attention. Dangers routiers détectés.',
    safe_proceed: 'Voie libre. Vous pouvez avancer en toute sécurité.',
    recording_started: 'Enregistrement vidéo de la route démarré.',
    recording_stopped: 'Enregistrement terminé et sauvegardé.',
    gps_acquired: 'Position GPS acquise.',
    gps_unavailable: 'Position GPS indisponible.'
  },
  ar: {
    welcome: 'رود فيجن للذكاء الاصطناعي نشط. المساعد الصوتي جاهز.',
    person_detected: 'تم رصد أحد المشاة بالقرب من مسار السيارة.',
    vehicle_detected: 'تم رصد مركبة في الأمام.',
    motorcycle_detected: 'تم رصد دراجة نارية قريبة.',
    pothole_detected: 'تحذير: تم رصد حفرة في الطريق. قلل السرعة.',
    danger_stop: 'خطر! تم رصد عائق. توقف فوراً.',
    caution: 'تنبيه. مخاطر على الطريق.',
    safe_proceed: 'الطريق سالك. يمكنك التقدم بأمان.',
    recording_started: 'بدأ تسجيل فيديو الطريق.',
    recording_stopped: 'تم إيقاف التسجيل وحفظ الفيديو.',
    gps_acquired: 'تم تحديد موقع جي بي إس.',
    gps_unavailable: 'موقع جي بي إس غير متوفر.'
  }
};

class VoiceAssistantService {
  private defaultLanguage: string = 'en';
  private preferredLanguages: string[] = ['en'];
  private voiceSettings: VoiceSettings = {
    voiceOutputEnabled: true,
    speechRate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    preferredVoiceURI: ''
  };

  private recognition: any = null;
  private isListening: boolean = false;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onCommandCallback: ((command: string, params?: any) => void) | null = null;
  private cooldowns: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 7000; // 7 seconds cooldown between repetitive alerts

  constructor() {
    this.loadSettings();
    this.initSpeechRecognition();
  }

  private loadSettings() {
    try {
      const savedLang = localStorage.getItem('roadvision_default_lang');
      if (savedLang) this.defaultLanguage = savedLang;

      const savedPreferred = localStorage.getItem('roadvision_preferred_langs');
      if (savedPreferred) this.preferredLanguages = JSON.parse(savedPreferred);

      const savedSettings = localStorage.getItem('roadvision_voice_settings');
      if (savedSettings) this.voiceSettings = { ...this.voiceSettings, ...JSON.parse(savedSettings) };
    } catch (e) {
      console.warn('VoiceAssistantService: error reading localStorage settings', e);
    }
  }

  public saveSettings(defaultLang: string, preferredLangs: string[], settings: Partial<VoiceSettings>) {
    this.defaultLanguage = defaultLang;
    this.preferredLanguages = preferredLangs;
    this.voiceSettings = { ...this.voiceSettings, ...settings };

    try {
      localStorage.setItem('roadvision_default_lang', defaultLang);
      localStorage.setItem('roadvision_preferred_langs', JSON.stringify(preferredLangs));
      localStorage.setItem('roadvision_voice_settings', JSON.stringify(this.voiceSettings));
    } catch (e) {}

    // Re-initialize recognition with new language
    this.initSpeechRecognition();
  }

  public getDefaultLanguage(): string {
    return this.defaultLanguage;
  }

  public getPreferredLanguages(): string[] {
    return this.preferredLanguages;
  }

  public getVoiceSettings(): VoiceSettings {
    return this.voiceSettings;
  }

  // --- Speech Synthesis (Voice Output) ---
  public speak(eventOrText: AlertEventType | string, customLang?: string, bypassCooldown: boolean = false) {
    if (!this.voiceSettings.voiceOutputEnabled) return;
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API not supported in this browser.');
      return;
    }

    const lang = customLang || this.defaultLanguage;

    // Check cooldown for known alert event types to prevent audio spam
    if (!bypassCooldown && typeof eventOrText === 'string' && TRANSLATIONS[lang]?.[eventOrText as AlertEventType]) {
      const now = Date.now();
      const lastSpoken = this.cooldowns.get(eventOrText) || 0;
      if (now - lastSpoken < this.COOLDOWN_MS) {
        return; // Suppress duplicate notification
      }
      this.cooldowns.set(eventOrText, now);
    }

    // Resolve phrase
    let textToSpeak = eventOrText;
    const langDict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    if (langDict && langDict[eventOrText as AlertEventType]) {
      textToSpeak = langDict[eventOrText as AlertEventType];
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending utterances
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];
      utterance.lang = langConfig.speechCode;
      utterance.rate = this.voiceSettings.speechRate;
      utterance.pitch = this.voiceSettings.pitch;
      utterance.volume = this.voiceSettings.volume;

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      if (this.voiceSettings.preferredVoiceURI) {
        const found = voices.find(v => v.voiceURI === this.voiceSettings.preferredVoiceURI);
        if (found) utterance.voice = found;
      } else {
        // Find best match for language code
        const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langConfig.code.toLowerCase()) || v.lang === langConfig.speechCode);
        if (matchedVoice) utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    }
  }

  // --- Web Speech Recognition (Voice Input) ---
  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === this.defaultLanguage) || SUPPORTED_LANGUAGES[0];
      this.recognition.lang = langConfig.speechCode;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (this.onTranscriptCallback && currentText) {
          this.onTranscriptCallback(currentText, !!finalTranscript);
        }

        if (finalTranscript) {
          this.parseVoiceCommand(finalTranscript.trim().toLowerCase());
        }
      };

      this.recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err.error);
        if (err.error === 'not-allowed') {
          this.isListening = false;
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    } catch (e) {
      console.error('Failed to initialize SpeechRecognition', e);
    }
  }

  public startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onCommand: (command: string, params?: any) => void
  ): boolean {
    this.onTranscriptCallback = onTranscript;
    this.onCommandCallback = onCommand;

    if (!this.recognition) {
      this.initSpeechRecognition();
    }

    if (!this.recognition) return false;

    try {
      const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === this.defaultLanguage) || SUPPORTED_LANGUAGES[0];
      this.recognition.lang = langConfig.speechCode;
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.warn('Speech recognition start failed or already active:', e);
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  // Multilingual Voice Command Parser
  private parseVoiceCommand(text: string) {
    if (!this.onCommandCallback) return;

    // Normalize command matching across English and Indian / international languages
    // 1. Camera commands
    if (
      text.includes('start camera') || text.includes('open camera') ||
      text.includes('கேமரா தொடங்கு') || text.includes('కెమెరా ప్రారంభించు') ||
      text.includes('कैमरा शुरू') || text.includes('कैमरा चालू') ||
      text.includes('iniciar cámara') || text.includes('démarrer caméra') ||
      text.includes('تشغيل الكاميرا')
    ) {
      this.onCommandCallback('START_CAMERA');
      this.speak('Camera started.', undefined, true);
    } else if (
      text.includes('stop camera') || text.includes('close camera') ||
      text.includes('கேமராவை நிறுத்து') || text.includes('కెమెరా ఆపు') ||
      text.includes('कैमरा बंद') || text.includes('detener cámara') ||
      text.includes('arrêter caméra') || text.includes('إيقاف الكاميرا')
    ) {
      this.onCommandCallback('STOP_CAMERA');
      this.speak('Camera stopped.', undefined, true);
    }

    // 2. Video Recording commands
    else if (
      text.includes('start record') || text.includes('record video') ||
      text.includes('பதிவு தொடங்கு') || text.includes('రికార్డింగ్ ప్రారంభించు') ||
      text.includes('रिकॉर्डिंग शुरू') || text.includes('grabar') ||
      text.includes('enregistrer') || text.includes('بدء التسجيل')
    ) {
      this.onCommandCallback('START_RECORDING');
      this.speak('recording_started', undefined, true);
    } else if (
      text.includes('stop record') || text.includes('save video') ||
      text.includes('பதிவை நிறுத்து') || text.includes('రికార్డింగ్ ఆపు') ||
      text.includes('रिकॉर्डिंग बंद') || text.includes('detener grabación') ||
      text.includes('إيقاف التسجيل')
    ) {
      this.onCommandCallback('STOP_RECORDING');
      this.speak('recording_stopped', undefined, true);
    }

    // 3. Navigation & GPS commands
    else if (
      text.includes('location') || text.includes('gps') || text.includes('where am i') ||
      text.includes('இருப்பிடம்') || text.includes('స్థానం') || text.includes('स्थान') ||
      text.includes('ubicación') || text.includes('موقعي')
    ) {
      this.onCommandCallback('SHOW_LOCATION');
      this.speak('Displaying current device GPS location.', undefined, true);
    }

    // 4. Video Gallery / Saved Videos
    else if (
      text.includes('saved video') || text.includes('open video') || text.includes('gallery') ||
      text.includes('வீடியோக்கள்') || text.includes('వీడియోలు') || text.includes('वीडियो खोलो') ||
      text.includes('ver videos') || text.includes('فيديوهات')
    ) {
      this.onCommandCallback('OPEN_VIDEOS');
      this.speak('Opening saved detection videos gallery.', undefined, true);
    }

    // 5. Detection History
    else if (
      text.includes('history') || text.includes('log') || text.includes('events') ||
      text.includes('வரலாறு') || text.includes('చరిత్ర') || text.includes('इतिहास')
    ) {
      this.onCommandCallback('SHOW_HISTORY');
      this.speak('Opening road detection event history.', undefined, true);
    }

    // 6. Voice alerts toggle
    else if (text.includes('mute') || text.includes('disable voice') || text.includes('आवाज़ बंद')) {
      this.voiceSettings.voiceOutputEnabled = false;
      this.onCommandCallback('MUTE_ALERTS');
      this.speak('Voice alerts disabled.', undefined, true);
    } else if (text.includes('unmute') || text.includes('enable voice') || text.includes('आवाज़ चालू')) {
      this.voiceSettings.voiceOutputEnabled = true;
      this.onCommandCallback('UNMUTE_ALERTS');
      this.speak('Voice alerts enabled.', undefined, true);
    }
  }
}

export const voiceAssistant = new VoiceAssistantService();
