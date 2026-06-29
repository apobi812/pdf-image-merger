(() => {
  'use strict';

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  }

  const MAX_FILES = 40;
  const MAX_PDF_OR_IMAGE_SIZE = 150 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 700 * 1024 * 1024;
  const MAX_FRAMES = 30;
  const MAX_IMAGE_PIXELS = 70_000_000;
  const STORE_KEY = 'toolkitStats.v1';
  const ADMIN_KEY = 'toolkitAdmin.v1';
  const SESSION_KEY = 'toolkitSession.v1';
  const ADMIN_TOKEN_KEY = 'toolkitAdminToken.v1';
  const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']);
  const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg', 'video/x-m4v']);
  const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp)$/i;
  const VIDEO_EXT_RE = /\.(mp4|m4v|mov|webm|ogv|ogg)$/i;
  const BASE_PATH = getBasePath();
  const API_BASE_URL = normalizeApiBaseUrl(window.TOOLKIT_CONFIG && window.TOOLKIT_CONFIG.apiBaseUrl);
  const routeMap = {
    '': 'home',
    '/': 'home',
    home: 'home',
    pdf: 'pdf',
    'word-count': 'word-count',
    word: 'word-count',
    'video-extractor': 'video-extractor',
    video: 'video-extractor',
    admin: 'admin',
    about: 'about',
    privacy: 'privacy',
    terms: 'terms',
    security: 'security'
  };
  const routePaths = {
    home: '',
    pdf: 'pdf/',
    'word-count': 'word-count/',
    'video-extractor': 'video-extractor/',
    admin: 'admin/',
    about: 'about/',
    privacy: 'privacy/',
    terms: 'terms/',
    security: 'security/'
  };

  const toolCatalog = [
    { route: 'pdf', symbol: 'PDF', title: 'PDF 관리', desc: 'PDF와 이미지를 병합', category: 'PDF', status: 'ready' },
    { route: 'word-count', symbol: 'TXT', title: '글자수 세기', desc: '글자, 단어, 문장 분석', category: '텍스트', status: 'ready' },
    { route: 'video-extractor', symbol: 'VID', title: '동영상 프레임 추출', desc: '영상에서 PNG 프레임 추출', category: '미디어', status: 'ready' },
    { symbol: 'SPL', title: 'PDF 분할', desc: '원하는 페이지를 분리', category: 'PDF', status: 'planned' },
    { symbol: 'ZIP', title: 'PDF 압축', desc: '용량 줄이기', category: 'PDF', status: 'planned' },
    { symbol: 'ROT', title: 'PDF 회전', desc: '페이지 방향 정리', category: 'PDF', status: 'planned' },
    { symbol: 'DEL', title: '페이지 삭제', desc: '불필요한 페이지 제거', category: 'PDF', status: 'planned' },
    { symbol: 'I2P', title: '이미지 PDF 변환', desc: '이미지를 PDF로 저장', category: 'PDF', status: 'planned' },
    { symbol: 'P2I', title: 'PDF 이미지 변환', desc: '페이지를 이미지로 추출', category: 'PDF', status: 'planned' },
    { symbol: 'LCK', title: 'PDF 보호', desc: '암호 설정', category: 'PDF', status: 'planned' },
    { symbol: 'ULK', title: 'PDF 잠금해제', desc: '권한 있는 문서 해제', category: 'PDF', status: 'planned' },
    { symbol: 'WMK', title: '워터마크', desc: '문서에 표시 추가', category: 'PDF', status: 'planned' },
    { symbol: 'OCR', title: 'OCR 텍스트 추출', desc: '이미지 문자를 텍스트로', category: '문서', status: 'planned' },
    { symbol: 'Aa', title: '대소문자 변환', desc: '영문 서식 변환', category: '텍스트', status: 'planned' },
    { symbol: 'DIF', title: '텍스트 비교', desc: '두 문장의 차이 확인', category: '텍스트', status: 'planned' },
    { symbol: 'KEY', title: '키워드 추출', desc: '반복 단어 요약', category: '텍스트', status: 'planned' },
    { symbol: 'UNQ', title: '중복 줄 제거', desc: '목록 정리', category: '텍스트', status: 'planned' },
    { symbol: 'IMG', title: '이미지 리사이즈', desc: '크기와 비율 조정', category: '이미지', status: 'planned' },
    { symbol: 'CMP', title: '이미지 압축', desc: '이미지 용량 줄이기', category: '이미지', status: 'planned' },
    { symbol: 'QR', title: 'QR 생성', desc: '텍스트를 QR로 변환', category: '기타', status: 'planned' }
  ];

  const languages = [
    ['ko', '🇰🇷', '한국어'], ['en', '🇺🇸', 'English'], ['ja', '🇯🇵', '日本語'],
    ['zh', '🇨🇳', '中文'], ['es', '🇪🇸', 'Español'], ['fr', '🇫🇷', 'Français'],
    ['de', '🇩🇪', 'Deutsch'], ['pt', '🇧🇷', 'Português'], ['hi', '🇮🇳', 'हिन्दी'],
    ['ar', '🇸🇦', 'العربية']
  ];

  const i18n = {
    ko: {
      brand: '툴킷', brandSub: '빠른 브라우저 도구', admin: '관리', adLabel: '광고 영역',
      about: '소개', privacy: '개인정보처리방침', terms: '이용약관', security: '보안',
      pdfTool: 'PDF 관리', wordTool: '글자수 세기', videoTool: '동영상 추출',
      saveAs: '저장할 파일명', fileName: '파일명', cancel: '취소', save: '저장',
      pdfTitle: 'PDF 관리', pdfDesc: 'PDF와 이미지를 선택해 순서를 정하고 하나의 PDF로 병합합니다. 파일은 서버로 업로드되지 않습니다.',
      wordTitle: '글자수 세기', wordDesc: '문장, 단어, 글자수, 읽기 시간을 즉시 계산합니다.',
      videoTitle: '동영상 프레임 추출', videoDesc: '동영상 파일에서 원하는 시점 또는 일정 간격의 프레임을 PNG 이미지로 추출합니다.',
      localNotice: '개인 파일은 이 브라우저 안에서 처리됩니다. 분석에는 파일명과 파일 내용이 저장되지 않습니다.',
      chooseFiles: '파일 선택', dropPdf: 'PDF 또는 이미지 파일을 여기에 놓거나 선택하세요', mergeDownload: 'PDF 병합 및 다운로드',
      clear: '초기화', emptyFiles: '아직 추가된 파일이 없습니다.', settings: '설정', outputName: '출력 파일명',
      homeTitle: '툴킷', homeDesc: '필요한 브라우저 도구를 선택하세요. 파일은 가능한 한 사용자의 기기 안에서 처리됩니다.',
      allTools: '전체 도구', availableNow: '사용 가능', plannedTools: '준비중', openTool: '열기', comingSoon: '준비중',
      textInput: '텍스트 입력', pasteText: '여기에 텍스트를 붙여넣으세요.', chars: '글자수', charsNoSpace: '공백 제외', words: '단어수',
      sentences: '문장', paragraphs: '문단', reading: '읽기 시간', keywords: '주요 단어',
      videoChoose: '동영상 선택', extractCurrent: '현재 프레임 추출', extractInterval: '간격 추출', frames: '추출 프레임',
      adminTitle: '관리 페이지', adminDesc: '이 정적 버전은 개인정보를 수집하지 않는 로컬 집계만 제공합니다. 서버형 분석은 Worker/D1 연결이 필요합니다.'
    }
  };

  const fallback = {
    brand: 'Toolkit', brandSub: 'Fast browser tools', admin: 'Admin', adLabel: 'Ad space',
    about: 'About', privacy: 'Privacy', terms: 'Terms', security: 'Security',
    pdfTool: 'PDF tools', wordTool: 'Word counter', videoTool: 'Video extraction',
    saveAs: 'Save as', fileName: 'File name', cancel: 'Cancel', save: 'Save',
    pdfTitle: 'PDF tools', pdfDesc: 'Merge PDFs and images in your browser. Files are not uploaded to a server.',
    wordTitle: 'Word counter', wordDesc: 'Count characters, words, sentences, paragraphs, and estimated reading time instantly.',
    videoTitle: 'Video frame extraction', videoDesc: 'Extract a current frame or interval frames from a video file as PNG images.',
    localNotice: 'Private files are processed in this browser. Analytics never stores file names or file contents.',
    chooseFiles: 'Choose files', dropPdf: 'Drop PDF or image files here, or choose files', mergeDownload: 'Merge and download PDF',
    clear: 'Clear', emptyFiles: 'No files added yet.', settings: 'Settings', outputName: 'Output file name',
    homeTitle: 'Toolkit', homeDesc: 'Choose a browser tool. Files are processed locally whenever possible.',
    allTools: 'All tools', availableNow: 'Available', plannedTools: 'Planned', openTool: 'Open', comingSoon: 'Soon',
    textInput: 'Text input', pasteText: 'Paste text here.', chars: 'Characters', charsNoSpace: 'No spaces', words: 'Words',
    sentences: 'Sentences', paragraphs: 'Paragraphs', reading: 'Reading time', keywords: 'Top words',
    videoChoose: 'Choose video', extractCurrent: 'Extract current frame', extractInterval: 'Extract by interval', frames: 'Extracted frames',
    adminTitle: 'Admin', adminDesc: 'This static version provides privacy-safe local aggregates only. Server analytics requires Worker/D1 integration.'
  };

  const localized = {
    en: fallback,
    ja: {
      brand: 'ツールキット', brandSub: '高速ブラウザツール', admin: '管理', adLabel: '広告枠',
      about: '概要', privacy: 'プライバシー', terms: '利用規約', security: 'セキュリティ',
      pdfTool: 'PDF管理', wordTool: '文字数カウント', videoTool: '動画抽出',
      saveAs: '名前を付けて保存', fileName: 'ファイル名', cancel: 'キャンセル', save: '保存',
      pdfTitle: 'PDF管理', pdfDesc: 'PDFと画像を並べ替えて1つのPDFに結合します。ファイルはサーバーへ送信されません。',
      wordTitle: '文字数カウント', wordDesc: '文字、単語、文、段落、読了時間をすぐに計算します。',
      videoTitle: '動画フレーム抽出', videoDesc: '動画から現在のフレームまたは一定間隔のフレームをPNGで抽出します.',
      localNotice: '個人ファイルはこのブラウザ内で処理されます。ファイル名や内容は分析に保存されません。'
    },
    zh: {
      brand: '工具箱', brandSub: '快速浏览器工具', admin: '管理', adLabel: '广告位',
      about: '介绍', privacy: '隐私政策', terms: '服务条款', security: '安全',
      pdfTool: 'PDF 管理', wordTool: '字数统计', videoTool: '视频提取',
      saveAs: '另存为', fileName: '文件名', cancel: '取消', save: '保存',
      pdfTitle: 'PDF 管理', pdfDesc: '在浏览器中合并 PDF 和图片，文件不会上传到服务器。',
      wordTitle: '字数统计', wordDesc: '即时统计字符、单词、句子、段落和阅读时间。',
      videoTitle: '视频帧提取', videoDesc: '从视频中提取当前帧或按间隔提取 PNG 图片。',
      localNotice: '私人文件仅在此浏览器中处理。分析不会保存文件名或文件内容。'
    },
    es: {
      brand: 'Kit de herramientas', brandSub: 'Herramientas rápidas', admin: 'Admin', adLabel: 'Espacio publicitario',
      about: 'Acerca de', privacy: 'Privacidad', terms: 'Términos', security: 'Seguridad',
      pdfTool: 'PDF', wordTool: 'Contador de palabras', videoTool: 'Extraer video',
      saveAs: 'Guardar como', fileName: 'Nombre de archivo', cancel: 'Cancelar', save: 'Guardar',
      pdfTitle: 'Herramientas PDF', pdfDesc: 'Une PDFs e imágenes en el navegador. Los archivos no se suben al servidor.',
      wordTitle: 'Contador de palabras', wordDesc: 'Cuenta caracteres, palabras, frases, párrafos y tiempo de lectura.',
      videoTitle: 'Extracción de fotogramas', videoDesc: 'Extrae el fotograma actual o fotogramas por intervalo como PNG.',
      localNotice: 'Los archivos privados se procesan en este navegador. No guardamos nombres ni contenido de archivos.'
    },
    fr: {
      brand: 'Boîte à outils', brandSub: 'Outils rapides', admin: 'Admin', adLabel: 'Espace publicitaire',
      about: 'À propos', privacy: 'Confidentialité', terms: 'Conditions', security: 'Sécurité',
      pdfTool: 'PDF', wordTool: 'Compteur de mots', videoTool: 'Extraction vidéo',
      saveAs: 'Enregistrer sous', fileName: 'Nom du fichier', cancel: 'Annuler', save: 'Enregistrer',
      pdfTitle: 'Outils PDF', pdfDesc: 'Fusionnez PDF et images dans le navigateur. Les fichiers ne sont pas envoyés au serveur.',
      wordTitle: 'Compteur de mots', wordDesc: 'Calcule caractères, mots, phrases, paragraphes et temps de lecture.',
      videoTitle: 'Extraction d’images vidéo', videoDesc: 'Extrayez l’image actuelle ou des images à intervalle régulier en PNG.',
      localNotice: 'Les fichiers privés sont traités dans ce navigateur. Aucun nom ni contenu de fichier n’est stocké.'
    },
    de: {
      brand: 'Werkzeugkasten', brandSub: 'Schnelle Browser-Tools', admin: 'Admin', adLabel: 'Werbefläche',
      about: 'Über', privacy: 'Datenschutz', terms: 'Bedingungen', security: 'Sicherheit',
      pdfTool: 'PDF', wordTool: 'Wörter zählen', videoTool: 'Video extrahieren',
      saveAs: 'Speichern als', fileName: 'Dateiname', cancel: 'Abbrechen', save: 'Speichern',
      pdfTitle: 'PDF-Werkzeuge', pdfDesc: 'PDFs und Bilder im Browser zusammenführen. Dateien werden nicht hochgeladen.',
      wordTitle: 'Wörter zählen', wordDesc: 'Zeichen, Wörter, Sätze, Absätze und Lesezeit sofort berechnen.',
      videoTitle: 'Videoframes extrahieren', videoDesc: 'Aktuelle oder regelmäßige Frames als PNG extrahieren.',
      localNotice: 'Private Dateien werden in diesem Browser verarbeitet. Dateinamen und Inhalte werden nicht gespeichert.'
    },
    pt: {
      brand: 'Kit de ferramentas', brandSub: 'Ferramentas rápidas', admin: 'Admin', adLabel: 'Espaço de anúncio',
      about: 'Sobre', privacy: 'Privacidade', terms: 'Termos', security: 'Segurança',
      pdfTool: 'PDF', wordTool: 'Contador de palavras', videoTool: 'Extrair vídeo',
      saveAs: 'Salvar como', fileName: 'Nome do arquivo', cancel: 'Cancelar', save: 'Salvar',
      pdfTitle: 'Ferramentas PDF', pdfDesc: 'Una PDFs e imagens no navegador. Os arquivos não são enviados ao servidor.',
      wordTitle: 'Contador de palavras', wordDesc: 'Conte caracteres, palavras, frases, parágrafos e tempo de leitura.',
      videoTitle: 'Extração de quadros', videoDesc: 'Extraia o quadro atual ou quadros por intervalo como PNG.',
      localNotice: 'Arquivos privados são processados neste navegador. Nome e conteúdo não são armazenados.'
    },
    hi: {
      brand: 'टूलकिट', brandSub: 'तेज़ ब्राउज़र टूल', admin: 'एडमिन', adLabel: 'विज्ञापन स्थान',
      about: 'परिचय', privacy: 'गोपनीयता', terms: 'शर्तें', security: 'सुरक्षा',
      pdfTool: 'PDF प्रबंधन', wordTool: 'शब्द गणना', videoTool: 'वीडियो निकालें',
      saveAs: 'इस नाम से सेव करें', fileName: 'फ़ाइल नाम', cancel: 'रद्द करें', save: 'सेव',
      pdfTitle: 'PDF प्रबंधन', pdfDesc: 'PDF और इमेज को ब्राउज़र में मिलाएं। फ़ाइलें सर्वर पर अपलोड नहीं होतीं।',
      wordTitle: 'शब्द गणना', wordDesc: 'अक्षर, शब्द, वाक्य, पैराग्राफ और पढ़ने का समय तुरंत देखें।',
      videoTitle: 'वीडियो फ़्रेम निकालें', videoDesc: 'वीडियो से मौजूदा या अंतराल वाले फ़्रेम PNG के रूप में निकालें।',
      localNotice: 'निजी फ़ाइलें इसी ब्राउज़र में प्रोसेस होती हैं। फ़ाइल नाम या सामग्री सेव नहीं होती।'
    },
    ar: {
      brand: 'مجموعة أدوات', brandSub: 'أدوات متصفح سريعة', admin: 'الإدارة', adLabel: 'مساحة إعلانية',
      about: 'حول', privacy: 'الخصوصية', terms: 'الشروط', security: 'الأمان',
      pdfTool: 'إدارة PDF', wordTool: 'عد الكلمات', videoTool: 'استخراج الفيديو',
      saveAs: 'حفظ باسم', fileName: 'اسم الملف', cancel: 'إلغاء', save: 'حفظ',
      pdfTitle: 'إدارة PDF', pdfDesc: 'ادمج ملفات PDF والصور داخل المتصفح. لا يتم رفع الملفات إلى الخادم.',
      wordTitle: 'عد الكلمات', wordDesc: 'احسب الأحرف والكلمات والجمل والفقرات ووقت القراءة فوراً.',
      videoTitle: 'استخراج إطارات الفيديو', videoDesc: 'استخرج الإطار الحالي أو إطارات بفواصل زمنية كصور PNG.',
      localNotice: 'تتم معالجة الملفات الخاصة داخل هذا المتصفح ولا يتم حفظ الأسماء أو المحتوى.'
    }
  };

  const state = {
    lang: localStorage.getItem('toolkitLang') || 'ko',
    route: readRoute(),
    pdfItems: [],
    pdfOutputName: 'merged.pdf',
    wordText: '',
    wordSettings: { includeSpaces: true, readingWpm: 250 },
    video: { file: null, url: '', duration: 0, interval: 5, maxFrames: 12, frames: [] },
    homeCategory: 'all',
    filenameResolver: null,
    sessionId: getSessionId(),
    adminToken: sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''
  };

  const $ = selector => document.querySelector(selector);
  const workspace = $('#workspace');
  const settingsPanel = $('#settingsPanel');

  function getBasePath() {
    const marker = '/pdf-image-merger/';
    if (location.pathname.includes(marker)) return marker;
    return '/';
  }

  function normalizeApiBaseUrl(value) {
    const raw = String(value || '').trim().replace(/\/+$/g, '');
    if (!raw) return '';
    if (raw.startsWith('/')) return raw;
    try {
      const url = new URL(raw);
      return url.origin + url.pathname.replace(/\/+$/g, '');
    } catch {
      console.warn('Invalid apiBaseUrl ignored');
      return '';
    }
  }

  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function hasAnalyticsBackend() {
    return Boolean(API_BASE_URL);
  }

  function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
  }

  function readRoute() {
    const hashRoute = location.hash.replace('#', '');
    if (hashRoute) return routeMap[hashRoute] || 'pdf';
    let path = location.pathname;
    if (path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length);
    path = path.replace(/^\/+|\/+$/g, '');
    return routeMap[path] || 'pdf';
  }

  function routeUrl(route) {
    const path = routePaths[route] ?? routePaths.pdf;
    return `${BASE_PATH}${path}`;
  }

  function absoluteRouteUrl(route) {
    const path = routePaths[route] ?? routePaths.pdf;
    return `https://apobi812.github.io/pdf-image-merger/${path}`;
  }

  function t(key) {
    return (i18n[state.lang] && i18n[state.lang][key])
      || (localized[state.lang] && localized[state.lang][key])
      || fallback[key]
      || i18n.ko[key]
      || key;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function showToast(message, tone = 'success') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.toggle('error', tone === 'error');
    toast.classList.toggle('warn', tone === 'warn');
    toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || { started: Date.now(), events: {}, tools: {}, days: {} };
    } catch {
      return { started: Date.now(), events: {}, tools: {}, days: {} };
    }
  }

  function track(eventName, tool = state.route) {
    const stats = loadStats();
    const day = new Date().toISOString().slice(0, 10);
    stats.events[eventName] = (stats.events[eventName] || 0) + 1;
    stats.tools[tool] = (stats.tools[tool] || 0) + 1;
    stats.days[day] = (stats.days[day] || 0) + 1;
    stats.lastSeen = Date.now();
    localStorage.setItem(STORE_KEY, JSON.stringify(stats));
    sendAnalyticsEvent(eventName, tool);
  }

  function sendAnalyticsEvent(eventName, tool) {
    if (!hasAnalyticsBackend()) return;
    const payload = JSON.stringify({
      event: eventName,
      tool,
      route: state.route,
      lang: state.lang,
      sessionId: state.sessionId,
      screen: `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`
    });
    fetch(apiUrl('/events'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      credentials: 'omit'
    }).catch(() => {});
  }

  function setRoute(route) {
    state.route = routeMap[route] || 'pdf';
    const nextUrl = routeUrl(state.route);
    if (location.pathname !== nextUrl) history.pushState({ route: state.route }, '', nextUrl);
    render();
    track('route_open', state.route);
  }

  function renderChrome() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });

    $('#languagePicker').innerHTML = languages.map(([code, flag, label]) => `
      <button class="flag-button ${state.lang === code ? 'active' : ''}" type="button" data-lang="${code}" title="${escapeHtml(label)}">${flag}</button>
    `).join('');

    document.querySelectorAll('.tool-link').forEach(button => {
      button.classList.toggle('active', button.dataset.route === state.route);
    });
  }

  function renderHeader(meta) {
    const title = state.route === 'home' ? '툴킷 - 무료 브라우저 도구 모음' : `${meta.title} - 툴킷`;
    document.title = title;
    const description = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (description) description.setAttribute('content', meta.description);
    if (canonical) canonical.setAttribute('href', absoluteRouteUrl(state.route));
    $('#toolEyebrow').textContent = meta.eyebrow;
    $('#toolTitle').textContent = meta.title;
    $('#toolDescription').textContent = meta.description;
    $('#noticeBand').textContent = t('localNotice');
  }

  function render() {
    renderChrome();
    if (state.route === 'home') renderHomePage();
    else if (state.route === 'word-count') renderWordTool();
    else if (state.route === 'video-extractor') renderVideoTool();
    else if (state.route === 'admin') renderAdminPage();
    else if (['about', 'privacy', 'terms', 'security'].includes(state.route)) renderLegalPage(state.route);
    else renderPdfTool();
  }

  function renderHomePage() {
    renderHeader({ eyebrow: 'Toolkit', title: t('homeTitle'), description: t('homeDesc') });
    const readyCount = toolCatalog.filter(tool => tool.status === 'ready').length;
    const plannedCount = toolCatalog.length - readyCount;
    const categories = ['all', ...new Set(toolCatalog.map(tool => tool.category))];
    const visibleTools = state.homeCategory === 'all'
      ? toolCatalog
      : toolCatalog.filter(tool => tool.category === state.homeCategory);
    workspace.innerHTML = `
      <section class="home-tools">
        <div class="home-tools-head">
          <div>
            <h2>${t('allTools')}</h2>
            <p>${readyCount} ${t('availableNow')} · ${plannedCount} ${t('plannedTools')}</p>
          </div>
          <div class="category-tabs" id="categoryTabs" aria-label="도구 카테고리">
            ${categories.map(category => `<button class="category-tab ${state.homeCategory === category ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category === 'all' ? '전체' : category)}</button>`).join('')}
          </div>
        </div>
        <div class="tool-grid">
          ${visibleTools.map(renderToolCard).join('')}
        </div>
      </section>
    `;
    const categoryCounts = categories.filter(category => category !== 'all').map(category => {
      const total = toolCatalog.filter(tool => tool.category === category).length;
      const ready = toolCatalog.filter(tool => tool.category === category && tool.status === 'ready').length;
      return `<div class="mini-stat"><span>${escapeHtml(category)}</span><strong>${ready}/${total}</strong></div>`;
    }).join('');
    settingsPanel.innerHTML = `
      <h2>${t('settings')}</h2>
      <div class="setting-group">
        <div class="setting-label">${t('availableNow')}</div>
        <div class="mini-stat-grid">
          <div class="mini-stat"><span>전체</span><strong>${readyCount}/${toolCatalog.length}</strong></div>
          ${categoryCounts}
        </div>
      </div>
      <div class="rail-ad"><span>${t('adLabel')}</span><small>300x250</small></div>
    `;
    bindHomeEvents();
  }

  function renderToolCard(tool) {
    const disabled = tool.status !== 'ready';
    return `<button class="tool-card ${disabled ? 'is-planned' : 'is-ready'}" type="button" ${disabled ? 'disabled' : `data-route="${tool.route}"`}>
      <span class="tool-symbol">${escapeHtml(tool.symbol)}</span>
      <span class="tool-card-body">
        <strong>${escapeHtml(tool.title)}</strong>
        <small>${escapeHtml(tool.desc)}</small>
      </span>
      <span class="tool-card-meta">${disabled ? t('comingSoon') : t('openTool')}</span>
    </button>`;
  }

  function bindHomeEvents() {
    workspace.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        state.homeCategory = button.dataset.category;
        renderHomePage();
      });
    });
    workspace.querySelectorAll('.tool-card[data-route]').forEach(button => {
      button.addEventListener('click', () => setRoute(button.dataset.route));
    });
  }

  function renderPdfTool() {
    renderHeader({ eyebrow: 'PDF', title: t('pdfTitle'), description: t('pdfDesc') });
    workspace.innerHTML = `
      <div class="tool-layout">
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">${t('pdfTool')}</h2>
            <div class="button-row">
              <button class="button" id="pdfChoose" type="button">${t('chooseFiles')}</button>
              <button class="button ghost" id="pdfClear" type="button">${t('clear')}</button>
            </div>
          </div>
          <div class="panel-body">
            <input class="hidden-input" id="pdfInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,application/pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp" multiple>
            <div class="drop-zone" id="pdfDrop">
              <div>
                <strong>${t('dropPdf')}</strong>
                <p>PDF, PNG, JPG, WebP, GIF, BMP · max ${Math.round(MAX_PDF_OR_IMAGE_SIZE / 1024 / 1024)}MB each</p>
              </div>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">${state.pdfItems.length} files</h2>
            <button class="button primary" id="pdfMerge" type="button" ${state.pdfItems.length ? '' : 'disabled'}>${t('mergeDownload')}</button>
          </div>
          <div class="panel-body">
            <div class="file-list" id="pdfList">${renderPdfList()}</div>
          </div>
        </section>
      </div>
    `;
    renderPdfSettings();
    bindPdfEvents();
  }

  function renderPdfList() {
    if (!state.pdfItems.length) return `<p class="file-meta">${t('emptyFiles')}</p>`;
    return state.pdfItems.map((item, index) => `
      <article class="file-row">
        <div>
          <div class="file-name">${escapeHtml(item.name)}</div>
          <div class="file-meta">${item.kind.toUpperCase()} · ${item.pages} page${item.pages === 1 ? '' : 's'} · ${formatSize(item.size)}</div>
        </div>
        <div class="row-actions">
          <button class="mini-button" data-pdf-action="up" data-index="${index}" title="up">↑</button>
          <button class="mini-button" data-pdf-action="down" data-index="${index}" title="down">↓</button>
          <button class="mini-button" data-pdf-action="remove" data-index="${index}" title="remove">×</button>
        </div>
      </article>
    `).join('');
  }

  function renderPdfSettings() {
    settingsPanel.innerHTML = `
      <h2>${t('settings')}</h2>
      <div class="setting-group">
        <label class="setting-label" for="pdfOutputName">${t('outputName')}</label>
        <input class="input" id="pdfOutputName" value="${escapeHtml(state.pdfOutputName)}">
      </div>
      <div class="setting-group">
        <div class="setting-label">Security guardrails</div>
        <label class="check-row"><input type="checkbox" checked disabled> Client-side processing only</label>
        <label class="check-row"><input type="checkbox" checked disabled> File type and size validation</label>
        <label class="check-row"><input type="checkbox" checked disabled> No file content analytics</label>
      </div>
      <div class="rail-ad"><span>${t('adLabel')}</span><small>300x250</small></div>
    `;
    $('#pdfOutputName').addEventListener('input', e => state.pdfOutputName = normalizeFileName(e.target.value || 'merged.pdf'));
  }

  function bindPdfEvents() {
    const input = $('#pdfInput');
    const drop = $('#pdfDrop');
    $('#pdfChoose').addEventListener('click', () => input.click());
    $('#pdfClear').addEventListener('click', () => {
      state.pdfItems = [];
      renderPdfTool();
      track('pdf_clear', 'pdf');
    });
    $('#pdfMerge').addEventListener('click', mergePdfItems);
    input.addEventListener('change', e => handlePdfFiles(e.target.files));
    ['dragover', 'drop'].forEach(type => drop.addEventListener(type, e => e.preventDefault()));
    drop.addEventListener('dragover', () => drop.classList.add('dragover'));
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => {
      drop.classList.remove('dragover');
      handlePdfFiles(e.dataTransfer.files);
    });
    $('#pdfList').addEventListener('click', e => {
      const button = e.target.closest('[data-pdf-action]');
      if (!button) return;
      const index = Number(button.dataset.index);
      const action = button.dataset.pdfAction;
      if (action === 'remove') state.pdfItems.splice(index, 1);
      if (action === 'up' && index > 0) [state.pdfItems[index - 1], state.pdfItems[index]] = [state.pdfItems[index], state.pdfItems[index - 1]];
      if (action === 'down' && index < state.pdfItems.length - 1) [state.pdfItems[index + 1], state.pdfItems[index]] = [state.pdfItems[index], state.pdfItems[index + 1]];
      renderPdfTool();
    });
  }

  async function handlePdfFiles(fileList) {
    const files = [...fileList].slice(0, MAX_FILES - state.pdfItems.length);
    if (!files.length) return;
    for (const file of files) {
      if (!isAllowedPdfFile(file)) {
        showToast(`${file.name}: unsupported or too large`, 'error');
        continue;
      }
      try {
        if (isPdf(file)) await addPdfFile(file);
        else await addImageFile(file);
      } catch (error) {
        console.error(error);
        showToast(`${file.name}: could not read file`, 'error');
      }
    }
    renderPdfTool();
    track('pdf_files_added', 'pdf');
  }

  function isPdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  }

  function isAllowedPdfFile(file) {
    const extOk = /\.pdf$/i.test(file.name) || IMAGE_EXT_RE.test(file.name);
    const typeOk = file.type === 'application/pdf' || ALLOWED_IMAGE_TYPES.has(file.type);
    return file.size > 0 && file.size <= MAX_PDF_OR_IMAGE_SIZE && (extOk || typeOk);
  }

  async function addPdfFile(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfSignature(data)) throw new Error('Invalid PDF signature');
    const pdf = await window.pdfjsLib.getDocument({ data: data.slice() }).promise;
    state.pdfItems.push({ id: uid(), kind: 'pdf', name: file.name, size: file.size, pages: pdf.numPages, data });
  }

  async function addImageFile(file) {
    const original = new Uint8Array(await file.arrayBuffer());
    const detected = detectImageKind(file, original);
    if (!detected) throw new Error('Unsupported image signature');
    const previewUrl = await bytesToObjectUrl(original, detected.mime);
    const info = await loadImage(previewUrl);
    if (!info.naturalWidth || !info.naturalHeight || info.naturalWidth * info.naturalHeight > MAX_IMAGE_PIXELS) {
      URL.revokeObjectURL(previewUrl);
      throw new Error('Image dimensions too large');
    }
    const isJpg = detected.kind === 'jpg';
    const isPng = detected.kind === 'png';
    const imageData = isJpg || isPng ? original : await imageToPngBytes(previewUrl);
    URL.revokeObjectURL(previewUrl);
    state.pdfItems.push({
      id: uid(), kind: 'image', name: file.name, size: file.size, pages: 1,
      imageData, imageKind: isJpg ? 'jpg' : 'png', width: info.naturalWidth, height: info.naturalHeight
    });
  }

  function hasPdfSignature(bytes) {
    return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }

  function detectImageKind(file, bytes) {
    const mime = file.type || '';
    const name = file.name || '';
    if (!ALLOWED_IMAGE_TYPES.has(mime) && !IMAGE_EXT_RE.test(name)) return null;
    if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return { kind: 'jpg', mime: 'image/jpeg' };
    if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: 'png', mime: 'image/png' };
    if (startsWithAscii(bytes, 'GIF87a') || startsWithAscii(bytes, 'GIF89a')) return { kind: 'gif', mime: 'image/gif' };
    if (startsWithAscii(bytes, 'BM')) return { kind: 'bmp', mime: 'image/bmp' };
    if (startsWithAscii(bytes, 'RIFF') && asciiAt(bytes, 8, 12) === 'WEBP') return { kind: 'webp', mime: 'image/webp' };
    return null;
  }

  async function mergePdfItems() {
    if (!state.pdfItems.length) return;
    const name = await requestFileName(state.pdfOutputName || 'merged.pdf');
    if (!name) return;
    try {
      showToast('Creating PDF...');
      const merged = await window.PDFLib.PDFDocument.create();
      for (const item of state.pdfItems) {
        if (item.kind === 'pdf') {
          const src = await window.PDFLib.PDFDocument.load(item.data, { ignoreEncryption: true });
          const copied = await merged.copyPages(src, src.getPageIndices());
          copied.forEach(page => merged.addPage(page));
        } else {
          await addImagePage(merged, item);
        }
      }
      const bytes = await merged.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), normalizeFileName(name));
      track('pdf_download', 'pdf');
      showToast('PDF created');
    } catch (error) {
      console.error(error);
      showToast('PDF creation failed', 'error');
    }
  }

  async function addImagePage(merged, item) {
    const image = item.imageKind === 'jpg' ? await merged.embedJpg(item.imageData) : await merged.embedPng(item.imageData);
    const dims = image.scale(1);
    const pageWidth = dims.width > dims.height ? 841.89 : 595.28;
    const pageHeight = dims.width > dims.height ? 595.28 : 841.89;
    const margin = 36;
    const scale = Math.min((pageWidth - margin * 2) / dims.width, (pageHeight - margin * 2) / dims.height);
    const width = dims.width * scale;
    const height = dims.height * scale;
    const page = merged.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
  }

  function renderWordTool() {
    renderHeader({ eyebrow: 'Text', title: t('wordTitle'), description: t('wordDesc') });
    const metrics = getTextMetrics(state.wordText);
    workspace.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">${t('textInput')}</h2>
          <div class="button-row">
            <button class="button" id="copyTextStats" type="button">Copy stats</button>
            <button class="button ghost" id="clearText" type="button">${t('clear')}</button>
          </div>
        </div>
        <div class="panel-body">
          <textarea class="textarea" id="wordText" placeholder="${t('pasteText')}">${escapeHtml(state.wordText)}</textarea>
        </div>
      </section>
      <section class="panel">
        <div class="panel-body stats-grid">
          ${statBox(t('chars'), metrics.chars)}
          ${statBox(t('charsNoSpace'), metrics.noSpace)}
          ${statBox(t('words'), metrics.words)}
          ${statBox(t('sentences'), metrics.sentences)}
          ${statBox(t('paragraphs'), metrics.paragraphs)}
          ${statBox(t('reading'), `${metrics.readingMinutes} min`)}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2 class="panel-title">${t('keywords')}</h2></div>
        <div class="panel-body">${metrics.keywords.length ? metrics.keywords.map(([word, count]) => `<span class="button ghost">${escapeHtml(word)} · ${count}</span>`).join(' ') : '<p class="file-meta">No keywords yet.</p>'}</div>
      </section>
    `;
    renderWordSettings();
    $('#wordText').addEventListener('input', e => {
      state.wordText = e.target.value;
      renderWordTool();
      $('#wordText').focus();
    });
    $('#clearText').addEventListener('click', () => { state.wordText = ''; renderWordTool(); track('word_clear', 'word'); });
    $('#copyTextStats').addEventListener('click', () => {
      navigator.clipboard?.writeText(JSON.stringify(metrics, null, 2));
      track('word_copy_stats', 'word');
      showToast('Stats copied');
    });
  }

  function statBox(label, value) {
    return `<div class="stat-box"><div class="stat-value">${escapeHtml(value)}</div><div class="stat-label">${escapeHtml(label)}</div></div>`;
  }

  function getTextMetrics(text) {
    const trimmed = text.trim();
    const chars = text.length;
    const noSpace = text.replace(/\s/g, '').length;
    const words = trimmed ? (trimmed.match(/[\p{L}\p{N}'’-]+/gu) || []).length : 0;
    const sentences = trimmed ? (trimmed.match(/[^.!?。！？]+[.!?。！？]?/g) || []).filter(s => s.trim()).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter(Boolean).length : 0;
    const readingMinutes = Math.max(0, Math.ceil(words / Math.max(120, state.wordSettings.readingWpm)));
    const counts = {};
    (trimmed.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []).forEach(word => counts[word] = (counts[word] || 0) + 1);
    const keywords = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
    return { chars, noSpace, words, sentences, paragraphs, readingMinutes, keywords };
  }

  function renderWordSettings() {
    settingsPanel.innerHTML = `
      <h2>${t('settings')}</h2>
      <div class="setting-group">
        <label class="setting-label" for="readingWpm">Reading speed</label>
        <input class="input" id="readingWpm" type="number" min="120" max="800" value="${state.wordSettings.readingWpm}">
      </div>
      <div class="rail-ad"><span>${t('adLabel')}</span><small>300x250</small></div>
    `;
    $('#readingWpm').addEventListener('input', e => {
      state.wordSettings.readingWpm = Number(e.target.value) || 250;
      renderWordTool();
    });
  }

  function renderVideoTool() {
    renderHeader({ eyebrow: 'Video', title: t('videoTitle'), description: t('videoDesc') });
    workspace.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">${t('videoTool')}</h2>
          <button class="button" id="videoChoose" type="button">${t('videoChoose')}</button>
        </div>
        <div class="panel-body">
          <input class="hidden-input" id="videoInput" type="file" accept=".mp4,.m4v,.mov,.webm,.ogv,.ogg,video/mp4,video/quicktime,video/webm,video/ogg">
          ${state.video.url ? `<video class="video-preview" id="videoElement" src="${state.video.url}" controls playsinline></video>` : `<div class="drop-zone" id="videoDrop"><div><strong>${t('videoChoose')}</strong><p>MP4, MOV, WebM · max ${Math.round(MAX_VIDEO_SIZE / 1024 / 1024)}MB</p></div></div>`}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">${t('frames')}</h2>
          <div class="button-row">
            <button class="button" id="extractCurrent" type="button" ${state.video.url ? '' : 'disabled'}>${t('extractCurrent')}</button>
            <button class="button primary" id="extractInterval" type="button" ${state.video.url ? '' : 'disabled'}>${t('extractInterval')}</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="frame-grid" id="frameGrid">${renderFrames()}</div>
        </div>
      </section>
    `;
    renderVideoSettings();
    bindVideoEvents();
  }

  function renderFrames() {
    if (!state.video.frames.length) return '<p class="file-meta">No frames extracted yet.</p>';
    return state.video.frames.map((frame, index) => `
      <article class="frame-card">
        <img src="${frame.url}" alt="frame ${index + 1}">
        <footer><span>${frame.time.toFixed(2)}s</span><a class="button" href="${frame.url}" download="frame-${index + 1}.png">Download</a></footer>
      </article>
    `).join('');
  }

  function renderVideoSettings() {
    settingsPanel.innerHTML = `
      <h2>${t('settings')}</h2>
      <div class="setting-group">
        <label class="setting-label" for="frameInterval">Interval seconds</label>
        <input class="input" id="frameInterval" type="number" min="1" max="60" value="${state.video.interval}">
      </div>
      <div class="setting-group">
        <label class="setting-label" for="maxFrames">Max frames</label>
        <input class="input" id="maxFrames" type="number" min="1" max="${MAX_FRAMES}" value="${state.video.maxFrames}">
      </div>
      <div class="rail-ad"><span>${t('adLabel')}</span><small>300x250</small></div>
    `;
    $('#frameInterval').addEventListener('input', e => state.video.interval = Math.max(1, Number(e.target.value) || 5));
    $('#maxFrames').addEventListener('input', e => state.video.maxFrames = Math.min(MAX_FRAMES, Math.max(1, Number(e.target.value) || 12)));
  }

  function bindVideoEvents() {
    const input = $('#videoInput');
    $('#videoChoose').addEventListener('click', () => input.click());
    input.addEventListener('change', e => handleVideoFile(e.target.files[0]));
    const drop = $('#videoDrop');
    if (drop) {
      ['dragover', 'drop'].forEach(type => drop.addEventListener(type, e => e.preventDefault()));
      drop.addEventListener('drop', e => handleVideoFile(e.dataTransfer.files[0]));
    }
    $('#extractCurrent').addEventListener('click', extractCurrentFrame);
    $('#extractInterval').addEventListener('click', extractIntervalFrames);
  }

  function handleVideoFile(file) {
    if (!file) return;
    const typeOk = ALLOWED_VIDEO_TYPES.has(file.type);
    const extOk = VIDEO_EXT_RE.test(file.name);
    if (!file.size || file.size > MAX_VIDEO_SIZE || (!typeOk && !extOk)) {
      showToast('Unsupported video or file too large', 'error');
      return;
    }
    if (state.video.url) URL.revokeObjectURL(state.video.url);
    state.video = { ...state.video, file, url: URL.createObjectURL(file), frames: [] };
    renderVideoTool();
    track('video_loaded', 'video');
  }

  async function extractCurrentFrame() {
    const video = $('#videoElement');
    if (!video) return;
    const url = captureVideoFrame(video);
    state.video.frames.unshift({ url, time: video.currentTime || 0 });
    renderVideoTool();
    track('video_frame_current', 'video');
  }

  async function extractIntervalFrames() {
    const video = $('#videoElement');
    if (!video) return;
    const duration = video.duration || 0;
    const interval = Math.max(1, state.video.interval);
    const max = Math.min(MAX_FRAMES, state.video.maxFrames);
    const frames = [];
    for (let t = 0; t <= duration && frames.length < max; t += interval) {
      await seekVideo(video, t);
      frames.push({ url: captureVideoFrame(video), time: t });
    }
    state.video.frames = frames.concat(state.video.frames).slice(0, MAX_FRAMES);
    renderVideoTool();
    track('video_frame_interval', 'video');
  }

  function seekVideo(video, time) {
    return new Promise(resolve => {
      const done = () => { video.removeEventListener('seeked', done); resolve(); };
      video.addEventListener('seeked', done, { once: true });
      video.currentTime = Math.min(time, Math.max(0, (video.duration || time) - 0.1));
    });
  }

  function captureVideoFrame(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  function renderLegalPage(page) {
    const content = legalContent()[page] || legalContent().about;
    renderHeader({ eyebrow: 'Docs', title: content.title, description: content.description });
    workspace.innerHTML = `<section class="panel legal-page"><div class="panel-body">
      <h2>${escapeHtml(content.title)}</h2>
      <p class="legal-lead">${escapeHtml(content.description)}</p>
      ${content.sections.map(section => `<section class="legal-section"><h3>${escapeHtml(section.title)}</h3><ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`).join('')}
      <section class="legal-section"><h3>문의 및 업데이트</h3><ul><li>문의: apobi812@gmail.com</li><li>마지막 업데이트: 2026-06-29</li></ul></section>
    </div></section>`;
    settingsPanel.innerHTML = `<h2>${t('settings')}</h2><div class="rail-ad"><span>${t('adLabel')}</span><small>300x250</small></div>`;
  }

  function legalContent() {
    return {
      about: {
        title: '소개',
        description: '툴킷은 PDF 관리, 글자수 세기, 동영상 프레임 추출을 제공하는 브라우저 기반 도구 모음입니다.',
        sections: [
          { title: '서비스 목적', items: ['반복적인 문서·텍스트·미디어 작업을 설치 없이 빠르게 처리할 수 있도록 돕습니다.', '현재 제공 기능은 PDF와 이미지 병합, 글자수·단어수 계산, 동영상 프레임 추출입니다.', '홈 화면은 약 20개 내외의 도구를 담을 수 있는 구조로 설계되어 향후 기능 확장이 가능합니다.'] },
          { title: '처리 방식', items: ['가능한 작업은 사용자의 브라우저 안에서 실행되며 원본 파일을 서버로 업로드하지 않습니다.', '서버형 분석을 연결하더라도 파일명, 파일 내용, 원본 문서, 원본 동영상은 수집하지 않습니다.', '광고 영역은 운영비를 충당하기 위한 위치이며 실제 광고 코드는 AdSense 승인 이후 별도로 연결합니다.'] },
          { title: '운영 원칙', items: ['기능은 단순하고 명확한 작업 흐름을 우선합니다.', '보안상 위험한 파일 형식은 허용하지 않고, 처리 가능한 형식도 크기와 시그니처를 확인합니다.', '중요한 업무 문서는 결과물을 다운로드한 뒤 사용자가 직접 검수해야 합니다.'] }
        ]
      },
      privacy: {
        title: '개인정보처리방침',
        description: '툴킷은 파일 처리 도구의 특성을 고려해 파일 원본과 파일명을 수집하지 않는 것을 기본 원칙으로 합니다.',
        sections: [
          { title: '수집하지 않는 정보', items: ['PDF, 이미지, 텍스트, 동영상 원본 파일은 서버로 업로드하지 않습니다.', '파일명, 파일 내용, 문서 안의 개인정보, 영상 프레임 내용은 분석 목적으로 저장하지 않습니다.', '기본 GitHub Pages 정적 배포 상태에서는 전체 사용자 분석 데이터베이스가 존재하지 않습니다.'] },
          { title: '브라우저 안에 저장되는 정보', items: ['언어 선택, 로컬 사용 횟수, 로컬 관리자 잠금 설정은 사용자의 브라우저 localStorage 또는 sessionStorage에 저장될 수 있습니다.', '이 정보는 같은 브라우저의 사용자 경험을 유지하기 위한 것이며, 정적 배포 상태에서는 운영자 서버로 전송되지 않습니다.', '사용자는 브라우저 사이트 데이터 삭제 기능으로 이 정보를 삭제할 수 있습니다.'] },
          { title: '서버형 분석 연결 시 수집될 수 있는 정보', items: ['Cloudflare Worker + D1 백엔드를 연결하면 이벤트명, 도구명, 경로, 언어, 화면 크기, 브라우저 계열, Cloudflare 국가 코드, 일별 방문자 해시가 저장될 수 있습니다.', '방문자 해시는 원 IP를 저장하지 않고 일 단위로 회전하도록 설계되어 장기 추적을 줄입니다.', '수집 목적은 접속자 수, 기능 사용 횟수, 국가·언어별 사용 통계를 확인하고 서비스를 개선하기 위한 것입니다.'] },
          { title: '광고와 쿠키', items: ['AdSense 등 광고를 연결하는 경우 광고 제공자가 쿠키 또는 유사 기술을 사용할 수 있습니다.', '광고와 쿠키 기반 분석을 실제로 활성화하기 전에는 별도의 고지와 필요한 동의 절차를 추가해야 합니다.', '광고 영역은 현재 자리만 마련되어 있으며, 승인 전에는 실제 광고 스크립트를 넣지 않습니다.'] },
          { title: '보관 기간과 권리', items: ['로컬 저장 정보는 사용자가 브라우저 데이터를 삭제할 때까지 남을 수 있습니다.', '서버형 집계 데이터의 보관 기간은 운영 정책에 따라 정하고, 법령 또는 보안상 필요한 경우를 제외하고 불필요한 장기 보관을 피합니다.', '개인정보 관련 문의, 삭제 요청, 오류 정정 요청은 문의 이메일로 접수할 수 있습니다.'] }
        ]
      },
      terms: {
        title: '이용약관',
        description: '본 약관은 사용자가 툴킷의 웹 도구를 이용할 때 적용되는 기본 조건입니다.',
        sections: [
          { title: '서비스 제공 범위', items: ['툴킷은 브라우저 기반 PDF, 텍스트, 미디어 처리 도구를 제공합니다.', '서비스는 무료로 제공될 수 있으며, 운영자는 광고, 유료 기능, 제휴 기능을 추후 추가할 수 있습니다.', '기능, 화면, 지원 형식, 사용 제한은 보안과 운영 상황에 따라 변경될 수 있습니다.'] },
          { title: '사용자의 책임', items: ['사용자는 본인이 처리 권한을 가진 파일과 텍스트만 사용해야 합니다.', '개인정보, 영업비밀, 저작권 자료 등 민감한 자료를 처리할 때는 결과물과 보관 위치를 직접 관리해야 합니다.', '중요한 문서, 법률 문서, 계약서, 제출용 파일은 다운로드 후 원본과 결과물을 반드시 직접 검수해야 합니다.'] },
          { title: '금지 행위', items: ['악성코드, 불법 자료, 타인의 권리를 침해하는 자료를 처리하거나 배포하는 행위는 금지됩니다.', '서비스 보안, 우회 제한, 과도한 자동화 요청, 비정상적인 트래픽으로 운영을 방해하는 행위는 금지됩니다.', '관리자 페이지, API, 분석 시스템에 무단 접근하거나 인증을 우회하려는 행위는 금지됩니다.'] },
          { title: '결과물과 책임 제한', items: ['툴킷은 사용자가 입력한 파일을 바탕으로 결과물을 생성하지만, 모든 환경에서 완전한 호환성을 보장하지 않습니다.', '암호화, 손상, 특수 포맷, 브라우저 제한, 기기 메모리 부족으로 작업이 실패할 수 있습니다.', '운영자는 고의 또는 중대한 과실이 없는 한 사용자가 결과물을 사용해 발생한 간접 손해, 영업 손실, 데이터 손실에 대해 책임을 지지 않습니다.'] },
          { title: '광고와 외부 서비스', items: ['서비스에는 광고 영역과 외부 광고 네트워크가 포함될 수 있습니다.', '외부 서비스의 개인정보 처리와 쿠키 사용은 해당 서비스의 정책이 함께 적용될 수 있습니다.', '사용자는 광고 차단, 쿠키 설정, 브라우저 개인정보 설정을 직접 관리할 수 있습니다.'] }
        ]
      },
      security: {
        title: '보안',
        description: '툴킷은 파일 처리 도구에서 가장 중요한 원칙을 원본 파일 최소 수집과 입력 검증으로 둡니다.',
        sections: [
          { title: '클라이언트 처리', items: ['PDF, 이미지, 텍스트, 동영상 처리는 가능한 한 브라우저 안에서 실행합니다.', '정적 배포 상태에서는 원본 파일을 받는 서버 업로드 엔드포인트가 없습니다.', '다운로드 결과물은 사용자의 브라우저에서 생성됩니다.'] },
          { title: '파일 입력 방어', items: ['PDF는 실제 PDF 시그니처를 확인한 뒤 처리합니다.', '이미지는 PNG, JPG, WebP, GIF, BMP 등 허용 형식만 받고 SVG 같은 능동 콘텐츠 가능성이 있는 형식은 병합 대상에서 제외합니다.', '이미지는 디코딩 후 픽셀 수 제한을 적용해 과도한 메모리 사용을 줄입니다.', '동영상은 MP4, MOV, WebM, OGG 계열의 일반 브라우저 지원 형식으로 제한합니다.'] },
          { title: '브라우저 보안 정책', items: ['Content Security Policy를 적용해 외부 스크립트와 임의 네트워크 연결을 기본 차단합니다.', 'object-src와 frame-ancestors를 차단해 임베드와 클릭재킹 위험을 줄입니다.', '서비스워커는 앱 셸 캐시를 관리하되 설정 파일과 내비게이션은 새 버전을 우선 확인하도록 설계했습니다.'] },
          { title: '관리자와 분석 보안', items: ['화면에서 관리자 링크를 노출하지 않고, 관리자는 직접 주소를 알고 접근하는 방식으로 분리합니다.', '정적 배포의 로컬 관리자 잠금은 운영 보안 경계가 아니며, 실제 운영용 관리는 Worker 백엔드의 서버 인증을 연결해야 합니다.', '서버형 분석은 파일명과 파일 내용을 저장하지 않고, 집계 통계와 일별 방문자 해시만 저장하도록 설계했습니다.'] },
          { title: '남은 운영 과제', items: ['도메인 연결 후에는 HTTPS, 보안 헤더, 관리자 비밀번호 정책, 백업, 로그 보관 기간을 운영 정책으로 확정해야 합니다.', '광고와 쿠키 기반 분석을 붙이면 동의 배너와 개인정보 고지를 보강해야 합니다.', '법적 문서는 실제 운영 주체, 국가, 수익 귀속 구조에 맞춰 법무·세무 검토가 필요합니다.'] }
        ]
      }
    };
  }

  async function renderAdminPage() {
    const adminDescription = hasAnalyticsBackend()
      ? '서버형 관리자 인증과 개인정보 보호 집계를 사용합니다. 파일명과 파일 내용은 수집하지 않습니다.'
      : t('adminDesc');
    renderHeader({ eyebrow: 'Admin', title: t('adminTitle'), description: adminDescription });
    if (hasAnalyticsBackend()) {
      await renderServerAdminPage();
      return;
    }
    const admin = getAdminConfig();
    if (!admin) {
      workspace.innerHTML = renderAdminSetup();
    } else if (!sessionStorage.getItem('toolkitAdminUnlocked')) {
      workspace.innerHTML = renderAdminLogin();
    } else {
      workspace.innerHTML = renderAdminDashboard();
    }
    settingsPanel.innerHTML = `<h2>${t('settings')}</h2><p class="file-meta">Production admin auth should move to Cloudflare Access, GitHub OAuth, or another server-side identity layer.</p>`;
    bindAdminEvents();
  }

  async function renderServerAdminPage() {
    settingsPanel.innerHTML = `<h2>${t('settings')}</h2><p class="file-meta">Server analytics is enabled. Admin sessions expire after 8 hours.</p>`;
    if (!state.adminToken) {
      workspace.innerHTML = renderServerAdminLogin();
      bindServerAdminEvents();
      return;
    }

    workspace.innerHTML = `<section class="panel"><div class="panel-body"><p class="file-meta">Loading server analytics...</p></div></section>`;
    try {
      const summary = await apiRequest('/admin/summary');
      workspace.innerHTML = renderServerAdminDashboard(summary);
      bindServerAdminEvents();
    } catch (error) {
      if (error.status === 401) {
        clearAdminToken();
        workspace.innerHTML = renderServerAdminLogin('Session expired. Sign in again.');
      } else {
        workspace.innerHTML = `<section class="panel admin-lock"><div class="panel-body"><h2>Server analytics unavailable</h2><p class="file-meta">${escapeHtml(error.message || 'Could not load analytics.')}</p></div></section>`;
      }
      bindServerAdminEvents();
    }
  }

  function renderServerAdminLogin(message = '') {
    return `<section class="panel admin-lock"><div class="panel-body"><h2>Server admin login</h2>${message ? `<p class="file-meta">${escapeHtml(message)}</p>` : ''}<input class="input" id="serverAdminPass" type="password" autocomplete="current-password" placeholder="Admin password"><button class="button primary" id="serverAdminLogin" type="button">Sign in</button></div></section>`;
  }

  function renderServerAdminDashboard(summary) {
    const tools = renderMetricRows(summary.tools, 'Tool');
    const events = renderMetricRows(summary.events, 'Event');
    const days = renderMetricRows(summary.days, 'Day');
    const countries = renderMetricRows(summary.countries, 'Country');
    const languages = renderMetricRows(summary.languages, 'Language');
    const browsers = renderMetricRows(summary.browsers, 'Browser');
    return `<section class="admin-dashboard">
      <div class="panel"><div class="panel-body stats-grid">
        ${statBox('Total events', summary.totals?.events || 0)}
        ${statBox('Unique visitors', summary.totals?.visitors || 0)}
        ${statBox('File names stored', summary.privacy?.fileNamesStored ? 'Yes' : 'No')}
        ${statBox('Raw IP stored', summary.privacy?.rawIpStored ? 'Yes' : 'No')}
      </div></div>
      <div class="panel"><div class="panel-header"><h2 class="panel-title">Server analytics</h2><div class="button-row"><button class="button" id="refreshServerStats" type="button">Refresh</button><button class="button" id="exportServerStats" type="button">Export</button><button class="button danger" id="logoutServerAdmin" type="button">Logout</button></div></div><div class="panel-body"><p class="file-meta">Generated ${escapeHtml(summary.generatedAt || '')}</p></div></div>
      ${metricTable('Tools', tools)}
      ${metricTable('Events', events)}
      ${metricTable('Last 30 days', days)}
      ${metricTable('Countries', countries)}
      ${metricTable('Languages', languages)}
      ${metricTable('Browsers', browsers)}
    </section>`;
  }

  function renderMetricRows(rows, label) {
    return (rows || []).map(row => `<tr><td>${escapeHtml(row.key)}</td><td>${row.count}</td><td>${row.visitors}</td></tr>`).join('')
      || `<tr><td colspan="3">No ${escapeHtml(label.toLowerCase())} data yet</td></tr>`;
  }

  function metricTable(title, rows) {
    return `<div class="panel"><div class="panel-header"><h2 class="panel-title">${escapeHtml(title)}</h2></div><div class="panel-body"><table class="data-table"><thead><tr><th>Name</th><th>Events</th><th>Visitors</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function renderAdminSetup() {
    return `<section class="panel admin-lock"><div class="panel-body"><h2>Set admin passcode</h2><p class="file-meta">This protects only local browser stats. It is not a server-side security boundary.</p><input class="input" id="adminPass" type="password" autocomplete="new-password"><button class="button primary" id="setAdminPass" type="button">Create lock</button></div></section>`;
  }

  function renderAdminLogin() {
    return `<section class="panel admin-lock"><div class="panel-body"><h2>Admin unlock</h2><input class="input" id="adminPass" type="password" autocomplete="current-password"><button class="button primary" id="unlockAdmin" type="button">Unlock</button></div></section>`;
  }

  function renderAdminDashboard() {
    const stats = loadStats();
    const rows = Object.entries(stats.events).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${value}</td></tr>`).join('');
    return `<section class="admin-dashboard">
      <div class="panel"><div class="panel-body stats-grid">
        ${statBox('Total events', Object.values(stats.events).reduce((a, b) => a + b, 0))}
        ${statBox('PDF uses', stats.tools.pdf || 0)}
        ${statBox('Text uses', stats.tools.word || 0)}
        ${statBox('Video uses', stats.tools.video || 0)}
      </div></div>
      <div class="panel"><div class="panel-header"><h2 class="panel-title">Local event counters</h2><div class="button-row"><button class="button" id="exportStats">Export</button><button class="button danger" id="resetStats">Reset</button></div></div><div class="panel-body"><table class="data-table"><thead><tr><th>Event</th><th>Count</th></tr></thead><tbody>${rows || '<tr><td colspan="2">No events yet</td></tr>'}</tbody></table></div></div>
    </section>`;
  }

  function bindAdminEvents() {
    const setButton = $('#setAdminPass');
    const unlockButton = $('#unlockAdmin');
    $('#exportStats')?.addEventListener('click', () => downloadBlob(new Blob([JSON.stringify(loadStats(), null, 2)], { type: 'application/json' }), 'toolkit-local-stats.json'));
    $('#resetStats')?.addEventListener('click', () => { localStorage.removeItem(STORE_KEY); renderAdminPage(); });
    setButton?.addEventListener('click', async () => {
      await setAdminPass($('#adminPass').value);
      renderAdminPage();
    });
    unlockButton?.addEventListener('click', async () => {
      if (await verifyAdminPass($('#adminPass').value)) {
        sessionStorage.setItem('toolkitAdminUnlocked', '1');
        renderAdminPage();
      } else showToast('Wrong passcode', 'error');
    });
  }

  function bindServerAdminEvents() {
    $('#serverAdminLogin')?.addEventListener('click', async () => {
      const password = $('#serverAdminPass')?.value || '';
      try {
        const result = await apiRequest('/admin/login', {
          method: 'POST',
          body: JSON.stringify({ password })
        });
        state.adminToken = result.token;
        sessionStorage.setItem(ADMIN_TOKEN_KEY, result.token);
        showToast('Server admin unlocked');
        renderAdminPage();
      } catch (error) {
        showToast(error.status === 401 ? 'Wrong admin password' : 'Login failed', 'error');
      }
    });
    $('#refreshServerStats')?.addEventListener('click', () => renderAdminPage());
    $('#exportServerStats')?.addEventListener('click', async () => {
      try {
        const result = await apiRequest('/admin/export');
        downloadBlob(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }), 'toolkit-server-analytics.json');
      } catch {
        showToast('Export failed', 'error');
      }
    });
    $('#logoutServerAdmin')?.addEventListener('click', () => {
      clearAdminToken();
      renderAdminPage();
    });
  }

  async function apiRequest(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (state.adminToken) headers.Authorization = `Bearer ${state.adminToken}`;
    const response = await fetch(apiUrl(path), {
      method: options.method || 'GET',
      headers,
      body: options.body,
      credentials: 'omit'
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function clearAdminToken() {
    state.adminToken = '';
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }

  function getAdminConfig() {
    try { return JSON.parse(localStorage.getItem(ADMIN_KEY)); } catch { return null; }
  }

  async function setAdminPass(pass) {
    if (!pass || pass.length < 8) {
      showToast('Use at least 8 characters', 'error');
      return;
    }
    const salt = crypto.randomUUID();
    const hash = await sha256(`${salt}:${pass}`);
    localStorage.setItem(ADMIN_KEY, JSON.stringify({ salt, hash }));
    showToast('Admin lock created');
  }

  async function verifyAdminPass(pass) {
    const cfg = getAdminConfig();
    return cfg && await sha256(`${cfg.salt}:${pass}`) === cfg.hash;
  }

  async function sha256(text) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function requestFileName(defaultName) {
    const modal = $('#filenameModal');
    const input = $('#outputFileNameInput');
    input.value = normalizeFileName(defaultName);
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => { input.focus(); input.select(); }, 0);
    return new Promise(resolve => state.filenameResolver = value => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      state.filenameResolver = null;
      resolve(value);
    });
  }

  function normalizeFileName(name) {
    const safe = String(name || 'download.pdf').trim().replace(/[\\/:*?"<>|]+/g, '-');
    return /\.pdf$/i.test(safe) ? safe : `${safe}.pdf`;
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function bytesToObjectUrl(bytes, type) {
    return URL.createObjectURL(new Blob([bytes], { type }));
  }

  function startsWithBytes(bytes, signature) {
    return signature.every((value, index) => bytes[index] === value);
  }

  function startsWithAscii(bytes, text) {
    return asciiAt(bytes, 0, text.length) === text;
  }

  function asciiAt(bytes, start, end) {
    if (bytes.length < end) return '';
    return String.fromCharCode(...bytes.slice(start, end));
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = src;
    });
  }

  async function imageToPngBytes(src) {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function bindGlobalEvents() {
    $('#brandHome')?.addEventListener('click', () => setRoute('home'));
    $('#toolNav').addEventListener('click', e => {
      const button = e.target.closest('[data-route]');
      if (button) setRoute(button.dataset.route);
    });
    $('#languagePicker').addEventListener('click', e => {
      const button = e.target.closest('[data-lang]');
      if (!button) return;
      state.lang = button.dataset.lang;
      localStorage.setItem('toolkitLang', state.lang);
      render();
    });
    document.querySelector('.footer-links').addEventListener('click', e => {
      const button = e.target.closest('[data-page]');
      if (button) setRoute(button.dataset.page);
    });
    $('#filenameForm').addEventListener('submit', e => {
      e.preventDefault();
      if (state.filenameResolver) state.filenameResolver(normalizeFileName($('#outputFileNameInput').value));
    });
    $('#cancelFileName').addEventListener('click', () => {
      if (state.filenameResolver) state.filenameResolver(null);
    });
    window.addEventListener('popstate', () => {
      state.route = readRoute();
      render();
    });
  }

  bindGlobalEvents();
  state.route = readRoute();
  render();
  track('app_open', state.route);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=20260629-home-nav2', { updateViaCache: 'none' })
        .then(registration => registration.update())
        .catch(error => console.warn('Service worker registration failed:', error));
    });
  }
})();
