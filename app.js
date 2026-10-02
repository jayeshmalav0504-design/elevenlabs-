/**
 * CricVoice Studio AI — ElevenLabs Voice & Speech Engine
 * Features:
 * - Direct ElevenLabs API Integration with live account quota & voice fetch
 * - Cricket Legend Personas: Virat Kohli (#18), Rohit Sharma (#45), Ravi Shastri (🎙️)
 * - Fine-tuning presets (Stability, Similarity Boost, Style Exaggeration, Speaker Boost)
 * - HTML5 Canvas Realtime Audio Spectrum Visualizer with Web Audio API
 * - Studio Audio Player with speed controls, scrubbing, and MP3 download
 * - Generation History and Template Library
 */

// ElevenLabs API Key default
// Kept safe in localStorage so it persists in your browser without exposing secrets on public GitHub
const DEFAULT_API_KEY = localStorage.getItem('cricvoice_elevenlabs_key') || '';
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Cricket Legends Personas Configuration
const PERSONA_CONFIGS = {
  virat: {
    id: 'virat',
    name: 'Virat Kohli',
    label: 'King Kohli • #18',
    avatarEmoji: '👑',
    accentColor: '#EF4444',
    badgeClass: 'badge-virat',
    defaultVoiceHint: ['liam', 'antoni', 'charlie', 'adam'],
    settings: {
      stability: 0.38,
      similarity_boost: 0.85,
      style: 0.45,
      use_speaker_boost: true
    },
    presetName: 'Aggressive Match Chase',
    defaultText: "When you are in the middle of a high-pressure chase against Pakistan in Melbourne, with 90,000 people roaring, you don't think about the noise. You back your preparation, watch the ball like a hawk, and say to yourself: I am finishing this game for my country!"
  },
  rohit: {
    id: 'rohit',
    name: 'Rohit Sharma',
    label: 'Hitman • #45',
    avatarEmoji: '🧢',
    accentColor: '#3B82F6',
    badgeClass: 'badge-rohit',
    defaultVoiceHint: ['george', 'callum', 'adam', 'brian'],
    settings: {
      stability: 0.62,
      similarity_boost: 0.80,
      style: 0.20,
      use_speaker_boost: true
    },
    presetName: 'Composed Captain Wit',
    defaultText: "Dekho simple baat hai, koi garden me ghumne nahi aaya hai! When you step onto the cricket pitch, everyone has a job to do. Back your instincts, enjoy the pressure, and keep the trophy in sight."
  },
  ravi: {
    id: 'ravi',
    name: 'Ravi Shastri',
    label: 'The Voice of Cricket • 🎙️',
    avatarEmoji: '🎙️',
    accentColor: '#F59E0B',
    badgeClass: 'badge-ravi',
    defaultVoiceHint: ['charlie', 'george', 'bill', 'daniel'],
    settings: {
      stability: 0.32,
      similarity_boost: 0.90,
      style: 0.70,
      use_speaker_boost: true
    },
    presetName: 'Stadium Commentary Thunder',
    defaultText: "It's high, it's handsome, and it's into the crowd! What an unbelievable strike! That didn't just clear the ropes, that went like a tracer bullet! Absolutely magnificent batting!"
  },
  custom: {
    id: 'custom',
    name: 'Custom / All Voices',
    label: 'ElevenLabs VoiceLab',
    avatarEmoji: '✨',
    accentColor: '#10B981',
    badgeClass: 'badge-custom',
    defaultVoiceHint: [],
    settings: {
      stability: 0.50,
      similarity_boost: 0.80,
      style: 0.30,
      use_speaker_boost: true
    },
    presetName: 'Standard Studio Natural',
    defaultText: "Welcome to CricVoice Studio. You can generate studio quality speech using any voice from your ElevenLabs library, including personal cloned voices and custom community models."
  }
};

// Preset Templates
const SCRIPT_TEMPLATES = {
  virat_chase: "Every single training session, every single drop of sweat was for this moment. When the required run rate climbs above 12, that's where character is tested. You don't bow down, you take the attack to the bowler!",
  rohit_press: "Honestly, results are a byproduct of our process. People outside will talk, they will speculate. But in our dressing room, we know what each guy brings to the table. We just go out and execute our plans.",
  ravi_six_sixes: "Six in an over! Can you believe it?! Yuvraj Singh has launched it into orbit! One, two, three, four, five, and now six! History created in Durban!",
  ravi_dhoni_finish: "Dhoni finishes off in style! A magnificent strike into the crowd! India lift the World Cup after 28 years! The party has started in the dressing room, and it's an Indian captain who's been absolutely magnificent!",
  virat_hindi: "Bhai hum yahan jeetne aaye hain. Agar unhone ek baat boli, toh hum das baatein wapas denge. Ground pe intensity kam nahi honi chahiye, full dam lagao!",
  rohit_garden: "Arey bhai, agar koi garden me ghuma na idhar udhar, toh main seedha batata hoon... execution chahiye match me, masti room pe!"
};

// Global Application State
const state = {
  apiKey: localStorage.getItem('cricvoice_elevenlabs_key') || DEFAULT_API_KEY,
  voices: [],
  currentPersona: 'virat',
  selectedVoiceId: '',
  userTier: null,
  currentAudioUrl: null,
  isPlaying: false,
  audioDuration: 0,
  history: JSON.parse(localStorage.getItem('cricvoice_history') || '[]'),
  audioContext: null,
  analyser: null,
  sourceNode: null,
  isVisualizerInitialized: false
};

// DOM Elements
const elements = {
  // Navigation & Quota
  quotaDisplay: document.getElementById('quota-display'),
  quotaPill: document.getElementById('quota-pill'),
  btnSettingsToggle: document.getElementById('btn-settings-toggle'),
  btnGuideToggle: document.getElementById('btn-guide-toggle'),

  // Persona Grid
  legendsGrid: document.getElementById('legends-grid'),
  currentPersonaLabel: document.getElementById('current-persona-label'),
  voiceCountBadge: document.getElementById('voice-count-badge'),

  // Script Input & Presets
  ttsText: document.getElementById('tts-text'),
  currentChars: document.getElementById('current-chars'),
  estDuration: document.getElementById('est-duration'),
  btnClearText: document.getElementById('btn-clear-text'),
  btnQuickTemplates: document.getElementById('btn-quick-templates'),
  templatesMenu: document.getElementById('templates-menu'),

  // Fine-tuning Controls
  voiceSelect: document.getElementById('voice-select'),
  modelSelect: document.getElementById('model-select'),
  currentPresetBadge: document.getElementById('current-preset-badge'),
  stabilitySlider: document.getElementById('stability-slider'),
  stabilityVal: document.getElementById('stability-val'),
  similaritySlider: document.getElementById('similarity-slider'),
  similarityVal: document.getElementById('similarity-val'),
  styleSlider: document.getElementById('style-slider'),
  styleVal: document.getElementById('style-val'),
  speakerBoost: document.getElementById('speaker-boost'),
  customVoiceId: document.getElementById('custom-voice-id'),
  btnApplyCustomId: document.getElementById('btn-apply-custom-id'),

  // Generation
  btnGenerate: document.getElementById('btn-generate'),
  btnGenerateText: document.getElementById('btn-generate-text'),

  // Player & Visualizer
  audioPlayer: document.getElementById('audio-player'),
  visualizerCanvas: document.getElementById('audio-visualizer'),
  visualizerHint: document.getElementById('visualizer-hint'),
  playerStatusBadge: document.getElementById('player-status-badge'),
  currentTrackTitle: document.getElementById('current-track-title'),
  currentTrackMeta: document.getElementById('current-track-meta'),
  trackAvatarEmoji: document.getElementById('track-avatar-emoji'),
  timeCurrent: document.getElementById('time-current'),
  timeTotal: document.getElementById('time-total'),
  audioScrubber: document.getElementById('audio-scrubber'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  iconPlay: document.getElementById('icon-play'),
  iconPause: document.getElementById('icon-pause'),
  btnSkipBack: document.getElementById('btn-skip-back'),
  btnSkipForward: document.getElementById('btn-skip-forward'),
  btnDownloadAudio: document.getElementById('btn-download-audio'),
  historyList: document.getElementById('history-list'),
  btnClearHistory: document.getElementById('btn-clear-history'),

  // Modals
  modalApiSettings: document.getElementById('modal-api-settings'),
  modalCloseSettings: document.getElementById('modal-close-settings'),
  modalCancelSettings: document.getElementById('modal-cancel-settings'),
  apiKeyInput: document.getElementById('api-key-input'),
  btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
  btnSaveApiKey: document.getElementById('btn-save-api-key'),
  settingsStatusLabel: document.getElementById('settings-status-label'),
  settingsUserTier: document.getElementById('settings-user-tier'),
  settingsStatusDot: document.getElementById('settings-status-dot'),

  modalCloneGuide: document.getElementById('modal-clone-guide'),
  modalCloseGuide: document.getElementById('modal-close-guide'),
  btnCloseGuideFooter: document.getElementById('btn-close-guide-footer'),
  toastContainer: document.getElementById('toast-container')
};

// ===================================================================
// Initialization
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateTextStats();
  renderHistory();
  initVisualizerIdleAnimation();
  
  // Verify API Key and load voices
  loadElevenLabsData();
});

/**
 * Load ElevenLabs Account Info & Voices
 */
async function loadElevenLabsData() {
  if (!state.apiKey) {
    updateQuotaUI('Enter API Key', 'pending');
    populateFallbackVoices();
    applyPersona(state.currentPersona);
    elements.settingsStatusLabel.textContent = 'API Key Required';
    elements.settingsStatusDot.className = 'status-dot';
    elements.settingsUserTier.textContent = 'Paste your ElevenLabs API Key in the box above to connect';
    return;
  }

  updateQuotaUI('Connecting...', 'pending');

  try {
    // 1. Fetch User Profile & Quota
    const userRes = await fetch(`${ELEVENLABS_API_BASE}/user`, {
      headers: { 'xi-api-key': state.apiKey }
    });

    if (userRes.ok) {
      const userData = await userRes.json();
      state.userTier = userData.subscription?.tier || 'Free';
      const count = userData.subscription?.character_count || 0;
      const limit = userData.subscription?.character_limit || 10000;
      const remaining = Math.max(0, limit - count);

      updateQuotaUI(`${remaining.toLocaleString()} chars left (${state.userTier})`, 'connected');
      elements.settingsStatusLabel.textContent = 'Connected to ElevenLabs';
      elements.settingsStatusDot.className = 'status-dot connected';
      elements.settingsUserTier.textContent = `Tier: ${state.userTier} • Used: ${count.toLocaleString()} / ${limit.toLocaleString()} chars`;
    } else {
      updateQuotaUI('API Key Active', 'connected');
    }

    // 2. Fetch Available Voices
    const voicesRes = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: { 'xi-api-key': state.apiKey }
    });

    if (voicesRes.ok) {
      const data = await voicesRes.json();
      state.voices = data.voices || [];
      populateVoiceDropdown();
      elements.voiceCountBadge.textContent = `${state.voices.length} voices ready`;
      showToast('Successfully connected to ElevenLabs Voice Engine!', 'success');
    } else {
      console.warn('Voices fetch returned status:', voicesRes.status);
      populateFallbackVoices();
    }
  } catch (error) {
    console.error('ElevenLabs API Load Error:', error);
    updateQuotaUI('Offline / Local Mode', 'error');
    populateFallbackVoices();
    showToast('ElevenLabs direct connection note: Loaded voice presets. You can also run the local server.', 'info');
  }

  // Apply current persona defaults
  applyPersona(state.currentPersona);
}

/**
 * Populate Voice Dropdown from ElevenLabs API
 */
function populateVoiceDropdown() {
  const select = elements.voiceSelect;
  select.innerHTML = '';

  if (!state.voices || state.voices.length === 0) {
    populateFallbackVoices();
    return;
  }

  // Group by category: Cloned vs Premade
  const clonedGroup = document.createElement('optgroup');
  clonedGroup.label = '⭐ My VoiceLab Clones (Personal)';

  const premadeGroup = document.createElement('optgroup');
  premadeGroup.label = '🎙️ ElevenLabs Voices Library';

  let hasClones = false;

  state.voices.forEach(voice => {
    const opt = document.createElement('option');
    opt.value = voice.voice_id;
    const accent = voice.labels?.accent ? `(${voice.labels.accent})` : '';
    opt.textContent = `${voice.name} ${accent}`.trim();

    if (voice.category === 'cloned') {
      clonedGroup.appendChild(opt);
      hasClones = true;
    } else {
      premadeGroup.appendChild(opt);
    }
  });

  if (hasClones) select.appendChild(clonedGroup);
  select.appendChild(premadeGroup);

  // Auto-select best match for current persona
  matchAndSelectVoice(state.currentPersona);
}

/**
 * Fallback Voices if offline or network blocks
 */
function populateFallbackVoices() {
  const select = elements.voiceSelect;
  select.innerHTML = `
    <optgroup label="✨ Recommended Expressive Voices">
      <option value="21m00Tcm4TlvDq8ikWAM" selected>Rachel (Expressive / Storytelling)</option>
      <option value="AZnzlk1XvdvUeBnXmlld">Domi (Dynamic & Clear)</option>
      <option value="EXAVITQu4vr4xnSDxMaL">Bella (High Energy)</option>
      <option value="ErXwobaYiN019PkySvjV">Antoni (Passionate & Intense)</option>
      <option value="VR6AewLTigWG4xSOukaG">Arnold (Deep & Authoritative)</option>
      <option value="pNInz6obpgDQGcFmaJgB">Adam (Deep Dynamic Baritone)</option>
      <option value="yoZ06aMxZJJ28mfd3POQ">Sam (Crisp Narrator)</option>
      <option value="TX3LPaxmHKxFdv7VOQHJ">Liam (Energetic Modern Cadence)</option>
    </optgroup>
  `;
  state.selectedVoiceId = select.value;
}

/**
 * Automatically match best voice in the user's account for the given cricket persona
 */
function matchAndSelectVoice(personaKey) {
  const config = PERSONA_CONFIGS[personaKey];
  if (!config) return;

  const select = elements.voiceSelect;
  if (!select.options.length) return;

  // 1. Look for cloned voice with matching name (e.g. "Virat", "Rohit", "Shastri")
  for (let opt of select.options) {
    const lowerName = opt.textContent.toLowerCase();
    if (lowerName.includes(config.id) || lowerName.includes(config.name.toLowerCase().split(' ')[0])) {
      select.value = opt.value;
      state.selectedVoiceId = opt.value;
      return;
    }
  }

  // 2. Look for hint voices
  if (config.defaultVoiceHint && config.defaultVoiceHint.length > 0) {
    for (let hint of config.defaultVoiceHint) {
      for (let opt of select.options) {
        if (opt.textContent.toLowerCase().includes(hint)) {
          select.value = opt.value;
          state.selectedVoiceId = opt.value;
          return;
        }
      }
    }
  }

  // Default to first available option
  select.selectedIndex = 0;
  state.selectedVoiceId = select.value;
}

/**
 * Apply a Persona (Virat Kohli, Rohit Sharma, Ravi Shastri)
 */
function applyPersona(personaKey) {
  const config = PERSONA_CONFIGS[personaKey];
  if (!config) return;

  state.currentPersona = personaKey;

  // Update Active Card Styling
  document.querySelectorAll('.legend-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-persona') === personaKey);
  });

  // Update UI Labels
  elements.currentPersonaLabel.textContent = config.name;
  elements.currentPresetBadge.textContent = config.presetName;

  // Apply Persona Voice Tuning Sliders
  elements.stabilitySlider.value = config.settings.stability;
  elements.stabilityVal.textContent = config.settings.stability.toFixed(2);

  elements.similaritySlider.value = config.settings.similarity_boost;
  elements.similarityVal.textContent = config.settings.similarity_boost.toFixed(2);

  elements.styleSlider.value = config.settings.style;
  elements.styleVal.textContent = config.settings.style.toFixed(2);

  elements.speakerBoost.checked = config.settings.use_speaker_boost;

  // Select matched voice
  matchAndSelectVoice(personaKey);

  // Update Player Avatar
  elements.trackAvatarEmoji.textContent = config.avatarEmoji;
  elements.currentTrackTitle.textContent = `${config.name} Speech Take`;
}

// ===================================================================
// Event Listeners
// ===================================================================
function initEventListeners() {
  // Persona Card Selection
  elements.legendsGrid.addEventListener('click', (e) => {
    // If quote sample clicked
    const quoteBtn = e.target.closest('.btn-quote-sample');
    if (quoteBtn) {
      const card = quoteBtn.closest('.legend-card');
      const personaKey = card.getAttribute('data-persona');
      applyPersona(personaKey);
      elements.ttsText.value = quoteBtn.textContent.replace(/^"|"$/g, '');
      updateTextStats();
      elements.ttsText.focus();
      return;
    }

    const card = e.target.closest('.legend-card');
    if (card) {
      const persona = card.getAttribute('data-persona');
      applyPersona(persona);
    }
  });

  // Textarea input & stats
  elements.ttsText.addEventListener('input', updateTextStats);

  elements.btnClearText.addEventListener('click', () => {
    elements.ttsText.value = '';
    updateTextStats();
    elements.ttsText.focus();
  });

  // Quick Templates Dropdown Toggle
  elements.btnQuickTemplates.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.templatesMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!elements.templatesMenu.contains(e.target) && e.target !== elements.btnQuickTemplates) {
      elements.templatesMenu.classList.remove('show');
    }
  });

  // Template Item Selection
  elements.templatesMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item');
    if (item) {
      const key = item.getAttribute('data-template');
      if (SCRIPT_TEMPLATES[key]) {
        elements.ttsText.value = SCRIPT_TEMPLATES[key];
        updateTextStats();

        // Switch to corresponding persona
        if (key.startsWith('virat')) applyPersona('virat');
        else if (key.startsWith('rohit')) applyPersona('rohit');
        else if (key.startsWith('ravi')) applyPersona('ravi');

        elements.templatesMenu.classList.remove('show');
        showToast('Template script loaded!', 'info');
      }
    }
  });

  // Sliders
  elements.stabilitySlider.addEventListener('input', (e) => {
    elements.stabilityVal.textContent = parseFloat(e.target.value).toFixed(2);
  });

  elements.similaritySlider.addEventListener('input', (e) => {
    elements.similarityVal.textContent = parseFloat(e.target.value).toFixed(2);
  });

  elements.styleSlider.addEventListener('input', (e) => {
    elements.styleVal.textContent = parseFloat(e.target.value).toFixed(2);
  });

  elements.voiceSelect.addEventListener('change', (e) => {
    state.selectedVoiceId = e.target.value;
  });

  // Custom Voice ID Manual Override
  elements.btnApplyCustomId.addEventListener('click', () => {
    const customId = elements.customVoiceId.value.trim();
    if (customId) {
      state.selectedVoiceId = customId;
      showToast(`Custom Voice ID "${customId}" applied!`, 'success');
    } else {
      showToast('Please paste a valid ElevenLabs Voice ID', 'error');
    }
  });

  // Generate Button Click
  elements.btnGenerate.addEventListener('click', handleGenerateSpeech);

  // Audio Player Controls
  elements.btnPlayPause.addEventListener('click', togglePlayPause);

  elements.audioPlayer.addEventListener('timeupdate', updateAudioProgress);
  elements.audioPlayer.addEventListener('ended', onAudioEnded);
  elements.audioPlayer.addEventListener('loadedmetadata', onAudioLoaded);

  elements.audioScrubber.addEventListener('input', (e) => {
    if (state.audioDuration > 0) {
      const newTime = (parseFloat(e.target.value) / 100) * state.audioDuration;
      elements.audioPlayer.currentTime = newTime;
    }
  });

  elements.btnSkipBack.addEventListener('click', () => {
    elements.audioPlayer.currentTime = Math.max(0, elements.audioPlayer.currentTime - 5);
  });

  elements.btnSkipForward.addEventListener('click', () => {
    elements.audioPlayer.currentTime = Math.min(state.audioDuration, elements.audioPlayer.currentTime + 5);
  });

  // Speed Toggles
  document.querySelectorAll('.btn-speed').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const speed = parseFloat(e.target.getAttribute('data-speed'));
      elements.audioPlayer.playbackRate = speed;
    });
  });

  // History Clear
  elements.btnClearHistory.addEventListener('click', () => {
    state.history = [];
    localStorage.removeItem('cricvoice_history');
    renderHistory();
    showToast('Generation history cleared', 'info');
  });

  // History List Actions (Play/Download)
  elements.historyList.addEventListener('click', (e) => {
    const playBtn = e.target.closest('.btn-history-play');
    if (playBtn) {
      const idx = parseInt(playBtn.getAttribute('data-index'));
      playHistoryTake(idx);
    }
  });

  // Modals
  elements.btnSettingsToggle.addEventListener('click', () => openSettingsModal());
  elements.modalCloseSettings.addEventListener('click', () => closeSettingsModal());
  elements.modalCancelSettings.addEventListener('click', () => closeSettingsModal());

  elements.btnGuideToggle.addEventListener('click', () => openGuideModal());
  elements.modalCloseGuide.addEventListener('click', () => closeGuideModal());
  elements.btnCloseGuideFooter.addEventListener('click', () => closeGuideModal());

  // API Key Visibility Toggle
  elements.btnToggleKeyVisibility.addEventListener('click', () => {
    const type = elements.apiKeyInput.type === 'password' ? 'text' : 'password';
    elements.apiKeyInput.type = type;
    elements.btnToggleKeyVisibility.textContent = type === 'password' ? 'Show' : 'Hide';
  });

  // Save API Key
  elements.btnSaveApiKey.addEventListener('click', async () => {
    const newKey = elements.apiKeyInput.value.trim();
    if (!newKey) {
      showToast('API Key cannot be empty', 'error');
      return;
    }

    state.apiKey = newKey;
    localStorage.setItem('cricvoice_elevenlabs_key', newKey);
    closeSettingsModal();
    showToast('ElevenLabs API Key saved!', 'success');
    await loadElevenLabsData();
  });
}

// ===================================================================
// Text Stats & Helpers
// ===================================================================
function updateTextStats() {
  const text = elements.ttsText.value || '';
  elements.currentChars.textContent = text.length;

  // Estimate speech duration (approx ~140 words per minute)
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estSeconds = Math.max(1, Math.round((words / 140) * 60));
  elements.estDuration.textContent = `• ~${estSeconds}s audio (${words} words)`;
}

function updateQuotaUI(text, statusClass) {
  elements.quotaDisplay.textContent = text;
  const dot = elements.quotaPill.querySelector('.status-dot');
  if (dot) {
    dot.className = `status-dot ${statusClass}`;
  }
}

// ===================================================================
// Speech Generation Engine (ElevenLabs API)
// ===================================================================
async function handleGenerateSpeech() {
  const text = elements.ttsText.value.trim();
  if (!text) {
    showToast('Please enter some dialogue or commentary text!', 'error');
    elements.ttsText.focus();
    return;
  }

  const voiceId = state.selectedVoiceId || elements.voiceSelect.value;
  if (!voiceId) {
    showToast('Please select or specify a Voice ID first.', 'error');
    return;
  }

  const modelId = elements.modelSelect.value;
  const stability = parseFloat(elements.stabilitySlider.value);
  const similarity_boost = parseFloat(elements.similaritySlider.value);
  const style = parseFloat(elements.styleSlider.value);
  const use_speaker_boost = elements.speakerBoost.checked;

  // Set Loading State
  setGeneratingLoading(true);
  elements.playerStatusBadge.textContent = 'Synthesizing...';
  elements.visualizerHint.textContent = 'ElevenLabs AI is generating speech...';

  try {
    const endpoint = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`;
    const payload = {
      text: text,
      model_id: modelId,
      voice_settings: {
        stability: stability,
        similarity_boost: similarity_boost,
        style: style,
        use_speaker_boost: use_speaker_boost
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': state.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = `ElevenLabs error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.detail && errJson.detail.message) {
          errorMsg = errJson.detail.message;
        }
      } catch (e) {
        // Fallback to text
        const errTxt = await response.text();
        if (errTxt) errorMsg = errTxt;
      }
      throw new Error(errorMsg);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Load Audio into Studio Player
    loadAudioTrack(audioUrl, text);

    // Save to History
    saveToHistory(text, audioBlob);

    showToast('Speech generation complete! Playing preview...', 'success');
  } catch (error) {
    console.error('Speech Generation Error:', error);
    showToast(`Generation Failed: ${error.message}`, 'error');
    elements.playerStatusBadge.textContent = 'Error';
    elements.visualizerHint.textContent = 'Generation encountered an error. Check API key and quota.';
  } finally {
    setGeneratingLoading(false);
  }
}

function setGeneratingLoading(isLoading) {
  if (isLoading) {
    elements.btnGenerate.classList.add('loading');
    elements.btnGenerate.disabled = true;
    elements.btnGenerateText.textContent = 'Crafting Voice with AI...';
  } else {
    elements.btnGenerate.classList.remove('loading');
    elements.btnGenerate.disabled = false;
    elements.btnGenerateText.textContent = 'Generate Speech with ElevenLabs';
  }
}

// ===================================================================
// Audio Studio Player & Web Audio API Visualizer
// ===================================================================
function loadAudioTrack(url, snippetText) {
  state.currentAudioUrl = url;
  elements.audioPlayer.src = url;

  const persona = PERSONA_CONFIGS[state.currentPersona];
  elements.currentTrackTitle.textContent = `${persona.name} Take`;
  elements.currentTrackMeta.textContent = snippetText.substring(0, 48) + (snippetText.length > 48 ? '...' : '');

  // Enable controls
  elements.btnPlayPause.classList.remove('disabled');
  elements.btnDownloadAudio.classList.remove('disabled');
  elements.btnDownloadAudio.href = url;
  elements.btnDownloadAudio.download = `${persona.name.replace(/\s+/g, '_')}_CricVoice.mp3`;

  elements.playerStatusBadge.textContent = 'Playing';
  elements.visualizerHint.style.opacity = '0';

  // Connect Web Audio API Visualizer
  initWebAudioVisualizer();

  // Auto-play generated speech
  elements.audioPlayer.play().then(() => {
    state.isPlaying = true;
    updatePlayPauseUI();
  }).catch(e => {
    console.warn('Auto-play blocked by browser. User must click play.', e);
    state.isPlaying = false;
    updatePlayPauseUI();
  });
}

function togglePlayPause() {
  if (!state.currentAudioUrl) return;

  if (state.isPlaying) {
    elements.audioPlayer.pause();
    state.isPlaying = false;
    elements.playerStatusBadge.textContent = 'Paused';
  } else {
    // If audioContext is suspended, resume it
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
    elements.audioPlayer.play();
    state.isPlaying = true;
    elements.playerStatusBadge.textContent = 'Playing';
  }
  updatePlayPauseUI();
}

function updatePlayPauseUI() {
  if (state.isPlaying) {
    elements.iconPlay.classList.add('hidden');
    elements.iconPause.classList.remove('hidden');
  } else {
    elements.iconPlay.classList.remove('hidden');
    elements.iconPause.classList.add('hidden');
  }
}

function onAudioLoaded() {
  state.audioDuration = elements.audioPlayer.duration || 0;
  elements.timeTotal.textContent = formatTime(state.audioDuration);
  elements.timeCurrent.textContent = '0:00';
  elements.audioScrubber.value = 0;
}

function updateAudioProgress() {
  const current = elements.audioPlayer.currentTime || 0;
  elements.timeCurrent.textContent = formatTime(current);

  if (state.audioDuration > 0) {
    const percent = (current / state.audioDuration) * 100;
    elements.audioScrubber.value = percent;
  }
}

function onAudioEnded() {
  state.isPlaying = false;
  updatePlayPauseUI();
  elements.playerStatusBadge.textContent = 'Ready';
  elements.visualizerHint.style.opacity = '1';
  elements.visualizerHint.textContent = 'Finished. Click Play or download MP3.';
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// ===================================================================
// HTML5 Canvas Audio Spectrum Visualizer
// ===================================================================
function initWebAudioVisualizer() {
  if (state.isVisualizerInitialized) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContext();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 128;

    state.sourceNode = state.audioContext.createMediaElementSource(elements.audioPlayer);
    state.sourceNode.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);

    state.isVisualizerInitialized = true;
    drawActiveVisualizer();
  } catch (e) {
    console.warn('Web Audio API Visualizer warning:', e);
  }
}

function drawActiveVisualizer() {
  const canvas = elements.visualizerCanvas;
  const ctx = canvas.getContext('2d');
  const bufferLength = state.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function renderFrame() {
    requestAnimationFrame(renderFrame);

    if (!state.isPlaying) {
      // Draw subtle gentle idle waves when paused
      drawIdleWave(ctx, canvas.width, canvas.height);
      return;
    }

    state.analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient fade
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#05070B');
    bgGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 1.8;
    let x = 0;

    const persona = PERSONA_CONFIGS[state.currentPersona];
    const accent = persona ? persona.accentColor : '#00E5FF';

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * (canvas.height * 0.85);

      // Create glowing gradient for bars
      const barGrad = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      barGrad.addColorStop(0, '#00E5FF');
      barGrad.addColorStop(0.5, accent);
      barGrad.addColorStop(1, '#1E3A8A');

      ctx.fillStyle = barGrad;
      ctx.shadowBlur = 12;
      ctx.shadowColor = accent;

      // Draw rounded top bars
      const y = canvas.height - barHeight;
      const w = Math.max(1, barWidth - 3);
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, barHeight, [4, 4, 0, 0]);
      } else {
        ctx.rect(x, y, w, barHeight);
      }
      ctx.fill();

      x += barWidth;
    }
  }

  renderFrame();
}

/**
 * Idle visualizer wave for when audio is not actively playing
 */
let idleWavePhase = 0;
function drawIdleWave(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);

  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#05070B');
  bgGrad.addColorStop(1, '#0A0F1A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00E5FF';

  ctx.beginPath();
  const centerY = height / 2;
  for (let x = 0; x < width; x += 4) {
    const y = centerY + Math.sin(x * 0.02 + idleWavePhase) * 8 * Math.sin(x * 0.005);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  idleWavePhase += 0.03;
}

function initVisualizerIdleAnimation() {
  const canvas = elements.visualizerCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function loop() {
    if (!state.isVisualizerInitialized || !state.isPlaying) {
      drawIdleWave(ctx, canvas.width, canvas.height);
    }
    requestAnimationFrame(loop);
  }
  loop();
}

// ===================================================================
// History Management
// ===================================================================
function saveToHistory(text, audioBlob) {
  const item = {
    id: Date.now(),
    personaKey: state.currentPersona,
    personaName: PERSONA_CONFIGS[state.currentPersona].name,
    textSnippet: text.substring(0, 60) + (text.length > 60 ? '...' : ''),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  state.history.unshift(item);
  if (state.history.length > 8) state.history.pop();

  localStorage.setItem('cricvoice_history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  const list = elements.historyList;
  list.innerHTML = '';

  if (!state.history || state.history.length === 0) {
    list.innerHTML = `<div class="history-empty">No voice takes generated yet. Try generating your first cricket commentary take!</div>`;
    return;
  }

  state.history.forEach((item, index) => {
    const config = PERSONA_CONFIGS[item.personaKey] || PERSONA_CONFIGS.custom;
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div class="history-item-left">
        <span class="history-persona-badge ${config.badgeClass}">${config.name.split(' ')[0]}</span>
        <span class="history-snippet" title="${item.textSnippet}">"${item.textSnippet}"</span>
      </div>
      <div class="history-actions">
        <span style="font-size:0.7rem; color:var(--text-dim); margin-right:4px;">${item.timestamp}</span>
        <button class="btn-history-play" data-index="${index}" title="Load Script">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      </div>
    `;
    list.appendChild(row);
  });
}

function playHistoryTake(index) {
  const item = state.history[index];
  if (!item) return;

  applyPersona(item.personaKey);
  elements.ttsText.value = item.textSnippet;
  updateTextStats();
  showToast(`Loaded ${item.personaName} take script! Click Generate Speech to render.`, 'info');
}

// ===================================================================
// Modals & Dialogs
// ===================================================================
function openSettingsModal() {
  elements.apiKeyInput.value = state.apiKey;
  elements.modalApiSettings.classList.add('show');
}

function closeSettingsModal() {
  elements.modalApiSettings.classList.remove('show');
}

function openGuideModal() {
  elements.modalCloneGuide.classList.add('show');
}

function closeGuideModal() {
  elements.modalCloneGuide.classList.remove('show');
}

// ===================================================================
// Toast Notifications System
// ===================================================================
function showToast(message, type = 'info') {
  const container = elements.toastContainer;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';

  toast.innerHTML = `
    <span>${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}
