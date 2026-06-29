(() => {
  'use strict';

  if (window.top !== window.self) {
    try {
      window.top.location = window.location.href;
    } catch (_) {
      document.documentElement.style.display = 'none';
    }
  }

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  }

  const MAX_FILES = 40;
  const MAX_PDF_OR_IMAGE_SIZE = 150 * 1024 * 1024;
  const MAX_TOTAL_PDF_INPUT_SIZE = 500 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 700 * 1024 * 1024;
  const MAX_FRAMES = 30;
  const MAX_IMAGE_PIXELS = 70_000_000;
  const MAX_TEXT_CHARS = 1_000_000;
  const STORE_KEY = 'toolkitStats.v1';
  const ADMIN_KEY = 'toolkitAdmin.v1';
  const ADMIN_UNLOCK_KEY = 'toolkitAdminUnlocked.v1';
  const ADMIN_TOKEN_KEY = 'toolkitAdminToken.v1';
  const CONSENT_KEY = 'toolkitConsent.v1';
  const DEFAULT_LANG = 'ko';
  const ADMIN_PBKDF2_ITERATIONS = 210_000;
  const ADMIN_UNLOCK_MS = 30 * 60 * 1000;
  const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']);
  const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg', 'video/x-m4v']);
  const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp)$/i;
  const VIDEO_EXT_RE = /\.(mp4|m4v|mov|webm|ogv|ogg)$/i;
  const PDF_RISKY_MARKERS = ['/JavaScript', '/JS', '/OpenAction', '/AA', '/Launch', '/EmbeddedFile', '/SubmitForm', '/RichMedia', '/XFA'];
  const CONFIG = window.TOOLKIT_CONFIG || {};
  const CONFIG_BASE_PATH = normalizeBasePath(CONFIG.basePath);
  const SITE_ORIGIN = normalizeSiteOrigin(CONFIG.siteOrigin) || location.origin;
  const BASE_PATH = resolveRuntimeBasePath(CONFIG_BASE_PATH);
  const SITE_ROOT_URL = `${SITE_ORIGIN}${CONFIG_BASE_PATH || BASE_PATH}`;
  const API_BASE_URL = normalizeApiBaseUrl(CONFIG.apiBaseUrl);
  const ADS_CONFIG = normalizeAdsConfig(CONFIG.ads);
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
    { key: 'pdfMerge', route: 'pdf', symbol: 'PDF', category: 'pdf', status: 'ready' },
    { key: 'wordCounter', route: 'word-count', symbol: 'TXT', category: 'text', status: 'ready' },
    { key: 'videoFrames', route: 'video-extractor', symbol: 'VID', category: 'media', status: 'ready' },
    { key: 'pdfSplit', symbol: 'SPL', category: 'pdf', status: 'planned' },
    { key: 'pdfCompress', symbol: 'ZIP', category: 'pdf', status: 'planned' },
    { key: 'pdfRotate', symbol: 'ROT', category: 'pdf', status: 'planned' },
    { key: 'pdfDelete', symbol: 'DEL', category: 'pdf', status: 'planned' },
    { key: 'imageToPdf', symbol: 'I2P', category: 'pdf', status: 'planned' },
    { key: 'pdfToImage', symbol: 'P2I', category: 'pdf', status: 'planned' },
    { key: 'pdfProtect', symbol: 'LCK', category: 'pdf', status: 'planned' },
    { key: 'pdfUnlock', symbol: 'ULK', category: 'pdf', status: 'planned' },
    { key: 'watermark', symbol: 'WMK', category: 'pdf', status: 'planned' },
    { key: 'ocr', symbol: 'OCR', category: 'document', status: 'planned' },
    { key: 'caseConvert', symbol: 'Aa', category: 'text', status: 'planned' },
    { key: 'textDiff', symbol: 'DIF', category: 'text', status: 'planned' },
    { key: 'keywordExtract', symbol: 'KEY', category: 'text', status: 'planned' },
    { key: 'duplicateLines', symbol: 'UNQ', category: 'text', status: 'planned' },
    { key: 'imageResize', symbol: 'IMG', category: 'image', status: 'planned' },
    { key: 'imageCompress', symbol: 'CMP', category: 'image', status: 'planned' },
    { key: 'qrCode', symbol: 'QR', category: 'other', status: 'planned' }
  ];

  const languages = [
    ['ko', '🇰🇷', '한국어'], ['en', '🇺🇸', 'English'], ['ja', '🇯🇵', '日本語'],
    ['zh', '🇨🇳', '中文'], ['es', '🇪🇸', 'Español'], ['fr', '🇫🇷', 'Français'],
    ['de', '🇩🇪', 'Deutsch'], ['pt', '🇧🇷', 'Português'], ['hi', '🇮🇳', 'हिन्दी'],
    ['ar', '🇸🇦', 'العربية']
  ];
  const supportedLanguages = new Set(languages.map(([code]) => code));

  const i18n = {
    ko: {
      brand: '툴킷', brandSub: '빠른 브라우저 도구', admin: '관리', adLabel: '광고 영역', adPending: '광고 준비 영역', adConfigured: '광고 슬롯 설정됨',
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
      adminTitle: '관리 페이지', adminDesc: '이 정적 버전은 개인정보를 수집하지 않는 로컬 집계만 제공합니다. 서버형 분석은 Worker/D1 연결이 필요합니다.',
      fileCount: '파일', pageUnit: '페이지', copyStats: '통계 복사', noKeywords: '아직 주요 단어가 없습니다.',
      statsCopied: '통계를 복사했습니다.', readingSpeed: '읽기 속도', minutesShort: '분',
      analyticsConsentTitle: '분석 사용 동의', analyticsConsentDesc: '접속자 수와 기능 사용 횟수를 집계해 도구를 개선합니다. 파일명과 파일 내용은 전송하지 않습니다.',
      acceptAnalytics: '동의', declineAnalytics: '거절', analyticsEnabled: '분석 동의가 저장되었습니다.', analyticsDisabled: '원격 분석을 사용하지 않습니다.',
      securityGuardrails: '보안 보호 장치', guardClientSide: '브라우저 안에서만 처리', guardFileValidation: '파일 형식과 크기 검증', guardTotalInputLimit: '전체 입력 용량 제한', guardImageMetadata: '이미지 메타데이터 제거', guardNoFileAnalytics: '파일 내용 분석 저장 안 함',
      creatingPdf: 'PDF를 만드는 중...', pdfCreated: 'PDF가 생성되었습니다.', pdfCreationFailed: 'PDF 생성에 실패했습니다.',
      encryptedPdfBlocked: '암호화된 PDF는 안전을 위해 처리하지 않습니다.', unsafePdfBlocked: '자동 실행, 스크립트, 첨부파일 등 위험 요소가 있는 PDF는 처리하지 않습니다.', unsupportedFile: '지원하지 않거나 너무 큰 파일입니다.', totalInputLimitExceeded: '전체 입력 용량은 {size}까지 허용됩니다.', textLimitExceeded: '텍스트는 최대 {count}자까지 계산합니다.', totalLimitLabel: '전체 최대', textLimitLabel: '최대 {count}자까지 브라우저에서 계산합니다.', fileReadFailed: '파일을 읽을 수 없습니다.',
      noFrames: '아직 추출된 프레임이 없습니다.', download: '다운로드', frameInterval: '추출 간격(초)', maxFrames: '최대 프레임 수', videoUnsupported: '지원하지 않거나 너무 큰 동영상입니다.'
    }
  };

  const fallback = {
    brand: 'Toolkit', brandSub: 'Fast browser tools', admin: 'Admin', adLabel: 'Ad space', adPending: 'Ad placeholder', adConfigured: 'Ad slot configured',
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
    adminTitle: 'Admin', adminDesc: 'This static version provides privacy-safe local aggregates only. Server analytics requires Worker/D1 integration.',
    fileCount: 'files', pageUnit: 'page', copyStats: 'Copy stats', noKeywords: 'No keywords yet.',
    statsCopied: 'Stats copied.', readingSpeed: 'Reading speed', minutesShort: 'min',
    analyticsConsentTitle: 'Analytics consent', analyticsConsentDesc: 'Help improve the tools with aggregate visits and feature counts. File names and file contents are never sent.',
    acceptAnalytics: 'Allow', declineAnalytics: 'Decline', analyticsEnabled: 'Analytics consent saved.', analyticsDisabled: 'Remote analytics will stay off.',
    securityGuardrails: 'Security guardrails', guardClientSide: 'Client-side processing only', guardFileValidation: 'File type and size validation', guardTotalInputLimit: 'Total input size limit', guardImageMetadata: 'Image metadata stripping', guardNoFileAnalytics: 'No file content analytics',
    creatingPdf: 'Creating PDF...', pdfCreated: 'PDF created.', pdfCreationFailed: 'PDF creation failed.',
    encryptedPdfBlocked: 'Encrypted PDFs are blocked for safety.', unsafePdfBlocked: 'PDFs with scripts, auto actions, attachments, or rich media are blocked.', unsupportedFile: 'Unsupported or too large.', totalInputLimitExceeded: 'Total input size is limited to {size}.', textLimitExceeded: 'Text is limited to {count} characters.', totalLimitLabel: 'total max', textLimitLabel: 'Up to {count} characters are counted in the browser.', fileReadFailed: 'Could not read file.',
    noFrames: 'No frames extracted yet.', download: 'Download', frameInterval: 'Interval seconds', maxFrames: 'Max frames', videoUnsupported: 'Unsupported video or file too large.'
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

  const categoryTranslations = {
    ko: { all: '전체', pdf: 'PDF', text: '텍스트', media: '미디어', document: '문서', image: '이미지', other: '기타' },
    en: { all: 'All', pdf: 'PDF', text: 'Text', media: 'Media', document: 'Documents', image: 'Images', other: 'Other' },
    ja: { all: 'すべて', pdf: 'PDF', text: 'テキスト', media: 'メディア', document: '文書', image: '画像', other: 'その他' },
    zh: { all: '全部', pdf: 'PDF', text: '文本', media: '媒体', document: '文档', image: '图片', other: '其他' },
    es: { all: 'Todo', pdf: 'PDF', text: 'Texto', media: 'Multimedia', document: 'Documentos', image: 'Imágenes', other: 'Otros' },
    fr: { all: 'Tout', pdf: 'PDF', text: 'Texte', media: 'Média', document: 'Documents', image: 'Images', other: 'Autres' },
    de: { all: 'Alle', pdf: 'PDF', text: 'Text', media: 'Medien', document: 'Dokumente', image: 'Bilder', other: 'Sonstiges' },
    pt: { all: 'Tudo', pdf: 'PDF', text: 'Texto', media: 'Mídia', document: 'Documentos', image: 'Imagens', other: 'Outros' },
    hi: { all: 'सभी', pdf: 'PDF', text: 'टेक्स्ट', media: 'मीडिया', document: 'दस्तावेज़', image: 'इमेज', other: 'अन्य' },
    ar: { all: 'الكل', pdf: 'PDF', text: 'نص', media: 'وسائط', document: 'مستندات', image: 'صور', other: 'أخرى' }
  };

  const toolTranslations = {
    ko: {
      pdfMerge: ['PDF 관리', 'PDF와 이미지를 병합'],
      wordCounter: ['글자수 세기', '글자, 단어, 문장 분석'],
      videoFrames: ['동영상 프레임 추출', '영상에서 PNG 프레임 추출'],
      pdfSplit: ['PDF 분할', '원하는 페이지를 분리'],
      pdfCompress: ['PDF 압축', '용량 줄이기'],
      pdfRotate: ['PDF 회전', '페이지 방향 정리'],
      pdfDelete: ['페이지 삭제', '불필요한 페이지 제거'],
      imageToPdf: ['이미지 PDF 변환', '이미지를 PDF로 저장'],
      pdfToImage: ['PDF 이미지 변환', '페이지를 이미지로 추출'],
      pdfProtect: ['PDF 보호', '암호 설정'],
      pdfUnlock: ['PDF 잠금해제', '권한 있는 문서 해제'],
      watermark: ['워터마크', '문서에 표시 추가'],
      ocr: ['OCR 텍스트 추출', '이미지 문자를 텍스트로'],
      caseConvert: ['대소문자 변환', '영문 서식 변환'],
      textDiff: ['텍스트 비교', '두 문장의 차이 확인'],
      keywordExtract: ['키워드 추출', '반복 단어 요약'],
      duplicateLines: ['중복 줄 제거', '목록 정리'],
      imageResize: ['이미지 리사이즈', '크기와 비율 조정'],
      imageCompress: ['이미지 압축', '이미지 용량 줄이기'],
      qrCode: ['QR 생성', '텍스트를 QR로 변환']
    },
    en: {
      pdfMerge: ['PDF tools', 'Merge PDFs and images'],
      wordCounter: ['Word counter', 'Analyze characters and words'],
      videoFrames: ['Video frame extraction', 'Save frames as PNG'],
      pdfSplit: ['Split PDF', 'Separate selected pages'],
      pdfCompress: ['Compress PDF', 'Reduce file size'],
      pdfRotate: ['Rotate PDF', 'Fix page orientation'],
      pdfDelete: ['Delete pages', 'Remove unwanted pages'],
      imageToPdf: ['Image to PDF', 'Save images as a PDF'],
      pdfToImage: ['PDF to image', 'Extract pages as images'],
      pdfProtect: ['Protect PDF', 'Add a password'],
      pdfUnlock: ['Unlock PDF', 'Open authorized files'],
      watermark: ['Watermark', 'Add marks to documents'],
      ocr: ['OCR text extraction', 'Read text from images'],
      caseConvert: ['Case converter', 'Change English letter case'],
      textDiff: ['Text comparison', 'Find differences'],
      keywordExtract: ['Keyword extraction', 'Summarize repeated words'],
      duplicateLines: ['Remove duplicate lines', 'Clean up lists'],
      imageResize: ['Image resize', 'Adjust size and ratio'],
      imageCompress: ['Image compression', 'Reduce image size'],
      qrCode: ['QR generator', 'Turn text into QR']
    },
    ja: {
      pdfMerge: ['PDF管理', 'PDFと画像を結合'],
      wordCounter: ['文字数カウント', '文字・単語・文を分析'],
      videoFrames: ['動画フレーム抽出', 'PNGフレームを保存'],
      pdfSplit: ['PDF分割', '必要なページを分離'],
      pdfCompress: ['PDF圧縮', 'ファイルサイズを削減'],
      pdfRotate: ['PDF回転', 'ページ向きを調整'],
      pdfDelete: ['ページ削除', '不要なページを削除'],
      imageToPdf: ['画像をPDFへ', '画像をPDFで保存'],
      pdfToImage: ['PDFを画像へ', 'ページを画像で抽出'],
      pdfProtect: ['PDF保護', 'パスワードを追加'],
      pdfUnlock: ['PDF解除', '権限のある文書を解除'],
      watermark: ['透かし', '文書に表示を追加'],
      ocr: ['OCRテキスト抽出', '画像文字をテキスト化'],
      caseConvert: ['大文字小文字変換', '英字表記を変換'],
      textDiff: ['テキスト比較', '違いを確認'],
      keywordExtract: ['キーワード抽出', '頻出語を要約'],
      duplicateLines: ['重複行削除', 'リストを整理'],
      imageResize: ['画像リサイズ', 'サイズと比率を調整'],
      imageCompress: ['画像圧縮', '画像容量を削減'],
      qrCode: ['QR作成', 'テキストをQRへ変換']
    },
    zh: {
      pdfMerge: ['PDF 管理', '合并 PDF 和图片'],
      wordCounter: ['字数统计', '分析字符、单词和句子'],
      videoFrames: ['视频帧提取', '保存 PNG 帧'],
      pdfSplit: ['拆分 PDF', '分离指定页面'],
      pdfCompress: ['压缩 PDF', '减小文件大小'],
      pdfRotate: ['旋转 PDF', '调整页面方向'],
      pdfDelete: ['删除页面', '移除不需要的页面'],
      imageToPdf: ['图片转 PDF', '将图片保存为 PDF'],
      pdfToImage: ['PDF 转图片', '将页面提取为图片'],
      pdfProtect: ['保护 PDF', '添加密码'],
      pdfUnlock: ['解锁 PDF', '打开授权文档'],
      watermark: ['水印', '为文档添加标记'],
      ocr: ['OCR 文字提取', '从图片读取文字'],
      caseConvert: ['大小写转换', '转换英文大小写'],
      textDiff: ['文本比较', '查找差异'],
      keywordExtract: ['关键词提取', '汇总重复词'],
      duplicateLines: ['删除重复行', '整理列表'],
      imageResize: ['图片调整大小', '调整尺寸和比例'],
      imageCompress: ['图片压缩', '减小图片大小'],
      qrCode: ['QR 生成器', '将文本转为 QR']
    },
    es: {
      pdfMerge: ['Herramientas PDF', 'Une PDF e imágenes'],
      wordCounter: ['Contador de palabras', 'Analiza caracteres y palabras'],
      videoFrames: ['Extraer fotogramas', 'Guarda fotogramas PNG'],
      pdfSplit: ['Dividir PDF', 'Separa páginas elegidas'],
      pdfCompress: ['Comprimir PDF', 'Reduce el tamaño'],
      pdfRotate: ['Girar PDF', 'Corrige la orientación'],
      pdfDelete: ['Eliminar páginas', 'Quita páginas innecesarias'],
      imageToPdf: ['Imagen a PDF', 'Guarda imágenes como PDF'],
      pdfToImage: ['PDF a imagen', 'Extrae páginas como imágenes'],
      pdfProtect: ['Proteger PDF', 'Añade una contraseña'],
      pdfUnlock: ['Desbloquear PDF', 'Abre documentos autorizados'],
      watermark: ['Marca de agua', 'Añade marcas al documento'],
      ocr: ['OCR de texto', 'Lee texto desde imágenes'],
      caseConvert: ['Cambiar mayúsculas', 'Convierte texto en inglés'],
      textDiff: ['Comparar texto', 'Encuentra diferencias'],
      keywordExtract: ['Extraer palabras clave', 'Resume palabras repetidas'],
      duplicateLines: ['Eliminar líneas duplicadas', 'Limpia listas'],
      imageResize: ['Redimensionar imagen', 'Ajusta tamaño y proporción'],
      imageCompress: ['Comprimir imagen', 'Reduce el peso de imagen'],
      qrCode: ['Generador QR', 'Convierte texto en QR']
    },
    fr: {
      pdfMerge: ['Outils PDF', 'Fusionner PDF et images'],
      wordCounter: ['Compteur de mots', 'Analyser caractères et mots'],
      videoFrames: ['Extraire des images vidéo', 'Enregistrer en PNG'],
      pdfSplit: ['Diviser PDF', 'Séparer les pages choisies'],
      pdfCompress: ['Compresser PDF', 'Réduire la taille'],
      pdfRotate: ['Faire pivoter PDF', 'Corriger l’orientation'],
      pdfDelete: ['Supprimer des pages', 'Retirer les pages inutiles'],
      imageToPdf: ['Image en PDF', 'Enregistrer des images en PDF'],
      pdfToImage: ['PDF en image', 'Extraire les pages en images'],
      pdfProtect: ['Protéger PDF', 'Ajouter un mot de passe'],
      pdfUnlock: ['Déverrouiller PDF', 'Ouvrir les documents autorisés'],
      watermark: ['Filigrane', 'Ajouter une marque au document'],
      ocr: ['Extraction OCR', 'Lire le texte des images'],
      caseConvert: ['Changer la casse', 'Modifier la casse anglaise'],
      textDiff: ['Comparer du texte', 'Repérer les différences'],
      keywordExtract: ['Extraire les mots-clés', 'Résumer les mots répétés'],
      duplicateLines: ['Supprimer les doublons', 'Nettoyer les listes'],
      imageResize: ['Redimensionner image', 'Ajuster taille et ratio'],
      imageCompress: ['Compresser image', 'Réduire le poids image'],
      qrCode: ['Générateur QR', 'Transformer du texte en QR']
    },
    de: {
      pdfMerge: ['PDF-Werkzeuge', 'PDFs und Bilder zusammenführen'],
      wordCounter: ['Wörter zählen', 'Zeichen und Wörter analysieren'],
      videoFrames: ['Videoframes extrahieren', 'Frames als PNG speichern'],
      pdfSplit: ['PDF teilen', 'Ausgewählte Seiten trennen'],
      pdfCompress: ['PDF komprimieren', 'Dateigröße reduzieren'],
      pdfRotate: ['PDF drehen', 'Seitenausrichtung korrigieren'],
      pdfDelete: ['Seiten löschen', 'Unnötige Seiten entfernen'],
      imageToPdf: ['Bild zu PDF', 'Bilder als PDF speichern'],
      pdfToImage: ['PDF zu Bild', 'Seiten als Bilder exportieren'],
      pdfProtect: ['PDF schützen', 'Passwort hinzufügen'],
      pdfUnlock: ['PDF entsperren', 'Berechtigte Dateien öffnen'],
      watermark: ['Wasserzeichen', 'Markierung hinzufügen'],
      ocr: ['OCR Texterkennung', 'Text aus Bildern lesen'],
      caseConvert: ['Groß-/Kleinschreibung', 'Englische Schreibweise ändern'],
      textDiff: ['Text vergleichen', 'Unterschiede finden'],
      keywordExtract: ['Keywords extrahieren', 'Wiederholte Wörter bündeln'],
      duplicateLines: ['Doppelte Zeilen entfernen', 'Listen bereinigen'],
      imageResize: ['Bildgröße ändern', 'Größe und Verhältnis anpassen'],
      imageCompress: ['Bild komprimieren', 'Bildgröße reduzieren'],
      qrCode: ['QR-Generator', 'Text in QR umwandeln']
    },
    pt: {
      pdfMerge: ['Ferramentas PDF', 'Una PDFs e imagens'],
      wordCounter: ['Contador de palavras', 'Analise caracteres e palavras'],
      videoFrames: ['Extrair quadros', 'Salvar quadros em PNG'],
      pdfSplit: ['Dividir PDF', 'Separe páginas escolhidas'],
      pdfCompress: ['Comprimir PDF', 'Reduza o tamanho'],
      pdfRotate: ['Girar PDF', 'Corrija a orientação'],
      pdfDelete: ['Excluir páginas', 'Remova páginas desnecessárias'],
      imageToPdf: ['Imagem para PDF', 'Salve imagens como PDF'],
      pdfToImage: ['PDF para imagem', 'Extraia páginas como imagens'],
      pdfProtect: ['Proteger PDF', 'Adicione uma senha'],
      pdfUnlock: ['Desbloquear PDF', 'Abra documentos autorizados'],
      watermark: ['Marca d’água', 'Adicione marcas ao documento'],
      ocr: ['Extração OCR', 'Leia texto em imagens'],
      caseConvert: ['Converter maiúsculas', 'Altere texto em inglês'],
      textDiff: ['Comparar texto', 'Encontre diferenças'],
      keywordExtract: ['Extrair palavras-chave', 'Resuma palavras repetidas'],
      duplicateLines: ['Remover linhas duplicadas', 'Limpe listas'],
      imageResize: ['Redimensionar imagem', 'Ajuste tamanho e proporção'],
      imageCompress: ['Comprimir imagem', 'Reduza o tamanho da imagem'],
      qrCode: ['Gerador QR', 'Transforme texto em QR']
    },
    hi: {
      pdfMerge: ['PDF टूल्स', 'PDF और इमेज मिलाएं'],
      wordCounter: ['शब्द गणना', 'अक्षर और शब्द विश्लेषण'],
      videoFrames: ['वीडियो फ़्रेम निकालें', 'PNG फ़्रेम सेव करें'],
      pdfSplit: ['PDF विभाजित करें', 'चुने हुए पेज अलग करें'],
      pdfCompress: ['PDF कंप्रेस करें', 'फ़ाइल आकार घटाएं'],
      pdfRotate: ['PDF घुमाएं', 'पेज दिशा ठीक करें'],
      pdfDelete: ['पेज हटाएं', 'अनचाहे पेज हटाएं'],
      imageToPdf: ['इमेज से PDF', 'इमेज को PDF में सेव करें'],
      pdfToImage: ['PDF से इमेज', 'पेज को इमेज में निकालें'],
      pdfProtect: ['PDF सुरक्षित करें', 'पासवर्ड जोड़ें'],
      pdfUnlock: ['PDF अनलॉक करें', 'अधिकृत दस्तावेज़ खोलें'],
      watermark: ['वॉटरमार्क', 'दस्तावेज़ में निशान जोड़ें'],
      ocr: ['OCR टेक्स्ट निकालें', 'इमेज से टेक्स्ट पढ़ें'],
      caseConvert: ['केस बदलें', 'अंग्रेज़ी अक्षर शैली बदलें'],
      textDiff: ['टेक्स्ट तुलना', 'अंतर खोजें'],
      keywordExtract: ['कीवर्ड निकालें', 'दोहराए शब्दों का सार'],
      duplicateLines: ['डुप्लिकेट लाइन हटाएं', 'सूचियां साफ करें'],
      imageResize: ['इमेज आकार बदलें', 'आकार और अनुपात बदलें'],
      imageCompress: ['इमेज कंप्रेस करें', 'इमेज आकार घटाएं'],
      qrCode: ['QR जनरेटर', 'टेक्स्ट को QR बनाएं']
    },
    ar: {
      pdfMerge: ['أدوات PDF', 'دمج PDF والصور'],
      wordCounter: ['عد الكلمات', 'تحليل الأحرف والكلمات'],
      videoFrames: ['استخراج إطارات الفيديو', 'حفظ الإطارات بصيغة PNG'],
      pdfSplit: ['تقسيم PDF', 'فصل الصفحات المختارة'],
      pdfCompress: ['ضغط PDF', 'تقليل حجم الملف'],
      pdfRotate: ['تدوير PDF', 'تصحيح اتجاه الصفحات'],
      pdfDelete: ['حذف الصفحات', 'إزالة الصفحات غير المطلوبة'],
      imageToPdf: ['صورة إلى PDF', 'حفظ الصور كملف PDF'],
      pdfToImage: ['PDF إلى صورة', 'استخراج الصفحات كصور'],
      pdfProtect: ['حماية PDF', 'إضافة كلمة مرور'],
      pdfUnlock: ['فتح PDF', 'فتح المستندات المصرح بها'],
      watermark: ['علامة مائية', 'إضافة علامة إلى المستند'],
      ocr: ['استخراج النص OCR', 'قراءة النص من الصور'],
      caseConvert: ['تغيير حالة الأحرف', 'تغيير حروف الإنجليزية'],
      textDiff: ['مقارنة النص', 'العثور على الاختلافات'],
      keywordExtract: ['استخراج الكلمات المفتاحية', 'تلخيص الكلمات المتكررة'],
      duplicateLines: ['إزالة الأسطر المكررة', 'تنظيف القوائم'],
      imageResize: ['تغيير حجم الصورة', 'ضبط الحجم والنسبة'],
      imageCompress: ['ضغط الصورة', 'تقليل حجم الصورة'],
      qrCode: ['مولد QR', 'تحويل النص إلى QR']
    }
  };

  const uiTranslations = {
    ja: {
      homeTitle: 'ツールキット', homeDesc: '必要なブラウザツールを選んでください。可能な限りファイルは端末内で処理されます。',
      allTools: 'すべてのツール', availableNow: '利用可能', plannedTools: '準備中', openTool: '開く', comingSoon: '近日公開',
      chooseFiles: 'ファイルを選択', dropPdf: 'PDFまたは画像ファイルをここに置くか選択してください', mergeDownload: 'PDFを結合してダウンロード',
      clear: 'クリア', emptyFiles: 'まだファイルが追加されていません。', settings: '設定', outputName: '出力ファイル名',
      textInput: 'テキスト入力', pasteText: 'ここにテキストを貼り付けてください。', chars: '文字数', charsNoSpace: '空白を除く',
      words: '単語数', sentences: '文', paragraphs: '段落', reading: '読了時間', keywords: '主要単語',
      videoChoose: '動画を選択', extractCurrent: '現在のフレームを抽出', extractInterval: '間隔で抽出', frames: '抽出フレーム',
      adminTitle: '管理ページ', adminDesc: 'この静的版ではプライバシーに配慮したローカル集計のみ提供します。サーバー分析にはWorker/D1接続が必要です。',
      fileCount: 'ファイル', pageUnit: 'ページ', copyStats: '統計をコピー', noKeywords: '主要単語はまだありません。',
      statsCopied: '統計をコピーしました。', readingSpeed: '読書速度', minutesShort: '分',
      analyticsConsentTitle: '分析への同意', analyticsConsentDesc: '訪問数と機能利用回数を集計して改善に役立てます。ファイル名や内容は送信しません。',
      acceptAnalytics: '同意', declineAnalytics: '拒否', analyticsEnabled: '分析への同意を保存しました。', analyticsDisabled: 'リモート分析は使用しません。',
      securityGuardrails: 'セキュリティ保護', guardClientSide: 'ブラウザ内のみで処理', guardFileValidation: 'ファイル形式とサイズを検証', guardTotalInputLimit: '合計入力サイズを制限', guardImageMetadata: '画像メタデータを削除', guardNoFileAnalytics: 'ファイル内容を分析保存しません',
      creatingPdf: 'PDFを作成中...', pdfCreated: 'PDFを作成しました。', pdfCreationFailed: 'PDF作成に失敗しました。',
      encryptedPdfBlocked: '暗号化PDFは安全のため処理しません。', unsafePdfBlocked: 'スクリプト、自動実行、添付ファイル、リッチメディアを含むPDFは処理しません。', unsupportedFile: '未対応または大きすぎるファイルです。', totalInputLimitExceeded: '合計入力サイズは{size}までです。', textLimitExceeded: 'テキストは最大{count}文字まで計算します。', totalLimitLabel: '合計最大', textLimitLabel: 'ブラウザでは最大{count}文字まで計算します。', fileReadFailed: 'ファイルを読み込めません。',
      noFrames: '抽出されたフレームはまだありません。', download: 'ダウンロード', frameInterval: '抽出間隔(秒)', maxFrames: '最大フレーム数', videoUnsupported: '未対応または大きすぎる動画です。'
    },
    zh: {
      homeTitle: '工具箱', homeDesc: '选择需要的浏览器工具。文件会尽可能在你的设备内处理。',
      allTools: '全部工具', availableNow: '可用', plannedTools: '开发中', openTool: '打开', comingSoon: '即将推出',
      chooseFiles: '选择文件', dropPdf: '将 PDF 或图片文件拖到这里，或点击选择', mergeDownload: '合并并下载 PDF',
      clear: '清除', emptyFiles: '尚未添加文件。', settings: '设置', outputName: '输出文件名',
      textInput: '文本输入', pasteText: '在这里粘贴文本。', chars: '字符数', charsNoSpace: '不含空格',
      words: '词数', sentences: '句子', paragraphs: '段落', reading: '阅读时间', keywords: '关键词',
      videoChoose: '选择视频', extractCurrent: '提取当前帧', extractInterval: '按间隔提取', frames: '提取的帧',
      adminTitle: '管理页面', adminDesc: '此静态版本仅提供注重隐私的本地统计。服务器分析需要连接 Worker/D1。',
      fileCount: '个文件', pageUnit: '页', copyStats: '复制统计', noKeywords: '暂无关键词。',
      statsCopied: '统计已复制。', readingSpeed: '阅读速度', minutesShort: '分钟',
      analyticsConsentTitle: '分析同意', analyticsConsentDesc: '通过汇总访问量和功能使用次数改进工具。不会发送文件名或文件内容。',
      acceptAnalytics: '同意', declineAnalytics: '拒绝', analyticsEnabled: '已保存分析同意。', analyticsDisabled: '远程分析将保持关闭。',
      securityGuardrails: '安全防护', guardClientSide: '仅在浏览器内处理', guardFileValidation: '验证文件类型和大小', guardTotalInputLimit: '限制总输入大小', guardImageMetadata: '移除图片元数据', guardNoFileAnalytics: '不保存文件内容分析',
      creatingPdf: '正在创建 PDF...', pdfCreated: 'PDF 已创建。', pdfCreationFailed: 'PDF 创建失败。',
      encryptedPdfBlocked: '出于安全原因，不处理加密 PDF。', unsafePdfBlocked: '包含脚本、自动操作、附件或富媒体的 PDF 会被阻止。', unsupportedFile: '文件不支持或过大。', totalInputLimitExceeded: '总输入大小限制为 {size}。', textLimitExceeded: '文本最多计算 {count} 个字符。', totalLimitLabel: '总上限', textLimitLabel: '浏览器最多计算 {count} 个字符。', fileReadFailed: '无法读取文件。',
      noFrames: '尚未提取帧。', download: '下载', frameInterval: '提取间隔(秒)', maxFrames: '最大帧数', videoUnsupported: '视频不支持或过大。'
    },
    es: {
      homeTitle: 'Kit de herramientas', homeDesc: 'Elige una herramienta del navegador. Los archivos se procesan localmente siempre que sea posible.',
      allTools: 'Todas las herramientas', availableNow: 'Disponible', plannedTools: 'Planificadas', openTool: 'Abrir', comingSoon: 'Próximamente',
      chooseFiles: 'Elegir archivos', dropPdf: 'Suelta PDF o imágenes aquí, o elige archivos', mergeDownload: 'Unir y descargar PDF',
      clear: 'Limpiar', emptyFiles: 'Aún no hay archivos.', settings: 'Ajustes', outputName: 'Nombre del archivo final',
      textInput: 'Entrada de texto', pasteText: 'Pega el texto aquí.', chars: 'Caracteres', charsNoSpace: 'Sin espacios',
      words: 'Palabras', sentences: 'Frases', paragraphs: 'Párrafos', reading: 'Tiempo de lectura', keywords: 'Palabras clave',
      videoChoose: 'Elegir video', extractCurrent: 'Extraer fotograma actual', extractInterval: 'Extraer por intervalo', frames: 'Fotogramas extraídos',
      adminTitle: 'Administración', adminDesc: 'Esta versión estática solo ofrece métricas locales con privacidad. La analítica de servidor requiere Worker/D1.',
      fileCount: 'archivos', pageUnit: 'página', copyStats: 'Copiar estadísticas', noKeywords: 'Aún no hay palabras clave.',
      statsCopied: 'Estadísticas copiadas.', readingSpeed: 'Velocidad de lectura', minutesShort: 'min',
      analyticsConsentTitle: 'Consentimiento de analítica', analyticsConsentDesc: 'Ayuda a mejorar las herramientas con visitas y uso de funciones agregados. No se envían nombres ni contenidos de archivos.',
      acceptAnalytics: 'Permitir', declineAnalytics: 'Rechazar', analyticsEnabled: 'Consentimiento de analítica guardado.', analyticsDisabled: 'La analítica remota seguirá desactivada.',
      securityGuardrails: 'Protecciones de seguridad', guardClientSide: 'Procesamiento solo en el navegador', guardFileValidation: 'Validación de tipo y tamaño', guardTotalInputLimit: 'Límite total de entrada', guardImageMetadata: 'Eliminación de metadatos de imagen', guardNoFileAnalytics: 'Sin análisis de contenido de archivos',
      creatingPdf: 'Creando PDF...', pdfCreated: 'PDF creado.', pdfCreationFailed: 'No se pudo crear el PDF.',
      encryptedPdfBlocked: 'Los PDF cifrados se bloquean por seguridad.', unsafePdfBlocked: 'Se bloquean los PDF con scripts, acciones automáticas, adjuntos o medios enriquecidos.', unsupportedFile: 'Archivo no compatible o demasiado grande.', totalInputLimitExceeded: 'El tamaño total de entrada está limitado a {size}.', textLimitExceeded: 'El texto se limita a {count} caracteres.', totalLimitLabel: 'máximo total', textLimitLabel: 'Se cuentan hasta {count} caracteres en el navegador.', fileReadFailed: 'No se pudo leer el archivo.',
      noFrames: 'Aún no se extrajeron fotogramas.', download: 'Descargar', frameInterval: 'Intervalo en segundos', maxFrames: 'Máximo de fotogramas', videoUnsupported: 'Video no compatible o demasiado grande.'
    },
    fr: {
      homeTitle: 'Boîte à outils', homeDesc: 'Choisissez un outil du navigateur. Les fichiers sont traités localement autant que possible.',
      allTools: 'Tous les outils', availableNow: 'Disponible', plannedTools: 'Prévu', openTool: 'Ouvrir', comingSoon: 'Bientôt',
      chooseFiles: 'Choisir des fichiers', dropPdf: 'Déposez des PDF ou images ici, ou choisissez des fichiers', mergeDownload: 'Fusionner et télécharger le PDF',
      clear: 'Effacer', emptyFiles: 'Aucun fichier ajouté.', settings: 'Réglages', outputName: 'Nom du fichier final',
      textInput: 'Saisie de texte', pasteText: 'Collez le texte ici.', chars: 'Caractères', charsNoSpace: 'Sans espaces',
      words: 'Mots', sentences: 'Phrases', paragraphs: 'Paragraphes', reading: 'Temps de lecture', keywords: 'Mots clés',
      videoChoose: 'Choisir une vidéo', extractCurrent: 'Extraire l’image actuelle', extractInterval: 'Extraire par intervalle', frames: 'Images extraites',
      adminTitle: 'Administration', adminDesc: 'Cette version statique fournit uniquement des métriques locales respectueuses de la vie privée. L’analytique serveur nécessite Worker/D1.',
      fileCount: 'fichiers', pageUnit: 'page', copyStats: 'Copier les statistiques', noKeywords: 'Aucun mot clé pour le moment.',
      statsCopied: 'Statistiques copiées.', readingSpeed: 'Vitesse de lecture', minutesShort: 'min',
      analyticsConsentTitle: 'Consentement aux statistiques', analyticsConsentDesc: 'Aidez à améliorer les outils avec des visites et usages agrégés. Les noms et contenus de fichiers ne sont pas envoyés.',
      acceptAnalytics: 'Accepter', declineAnalytics: 'Refuser', analyticsEnabled: 'Consentement aux statistiques enregistré.', analyticsDisabled: 'Les statistiques distantes restent désactivées.',
      securityGuardrails: 'Protections de sécurité', guardClientSide: 'Traitement uniquement dans le navigateur', guardFileValidation: 'Validation du type et de la taille', guardTotalInputLimit: 'Limite de taille totale', guardImageMetadata: 'Suppression des métadonnées d’image', guardNoFileAnalytics: 'Aucune analyse du contenu des fichiers',
      creatingPdf: 'Création du PDF...', pdfCreated: 'PDF créé.', pdfCreationFailed: 'Échec de la création du PDF.',
      encryptedPdfBlocked: 'Les PDF chiffrés sont bloqués par sécurité.', unsafePdfBlocked: 'Les PDF avec scripts, actions automatiques, pièces jointes ou médias enrichis sont bloqués.', unsupportedFile: 'Fichier non compatible ou trop volumineux.', totalInputLimitExceeded: 'La taille totale des entrées est limitée à {size}.', textLimitExceeded: 'Le texte est limité à {count} caractères.', totalLimitLabel: 'maximum total', textLimitLabel: 'Jusqu’à {count} caractères sont comptés dans le navigateur.', fileReadFailed: 'Impossible de lire le fichier.',
      noFrames: 'Aucune image extraite pour le moment.', download: 'Télécharger', frameInterval: 'Intervalle en secondes', maxFrames: 'Nombre maximal d’images', videoUnsupported: 'Vidéo non compatible ou trop volumineuse.'
    },
    de: {
      homeTitle: 'Werkzeugkasten', homeDesc: 'Wählen Sie ein Browser-Tool. Dateien werden möglichst lokal auf Ihrem Gerät verarbeitet.',
      allTools: 'Alle Werkzeuge', availableNow: 'Verfügbar', plannedTools: 'Geplant', openTool: 'Öffnen', comingSoon: 'Demnächst',
      chooseFiles: 'Dateien wählen', dropPdf: 'PDF- oder Bilddateien hier ablegen oder auswählen', mergeDownload: 'PDF zusammenführen und herunterladen',
      clear: 'Leeren', emptyFiles: 'Noch keine Dateien hinzugefügt.', settings: 'Einstellungen', outputName: 'Ausgabedateiname',
      textInput: 'Texteingabe', pasteText: 'Text hier einfügen.', chars: 'Zeichen', charsNoSpace: 'Ohne Leerzeichen',
      words: 'Wörter', sentences: 'Sätze', paragraphs: 'Absätze', reading: 'Lesezeit', keywords: 'Wichtige Wörter',
      videoChoose: 'Video wählen', extractCurrent: 'Aktuellen Frame extrahieren', extractInterval: 'Nach Intervall extrahieren', frames: 'Extrahierte Frames',
      adminTitle: 'Administration', adminDesc: 'Diese statische Version bietet nur datenschutzfreundliche lokale Auswertungen. Server-Analytik benötigt Worker/D1.',
      fileCount: 'Dateien', pageUnit: 'Seite', copyStats: 'Statistik kopieren', noKeywords: 'Noch keine Keywords.',
      statsCopied: 'Statistik kopiert.', readingSpeed: 'Lesegeschwindigkeit', minutesShort: 'Min.',
      analyticsConsentTitle: 'Analytics-Einwilligung', analyticsConsentDesc: 'Helfen Sie, die Tools mit aggregierten Besuchen und Funktionsnutzung zu verbessern. Dateinamen und Inhalte werden nicht gesendet.',
      acceptAnalytics: 'Erlauben', declineAnalytics: 'Ablehnen', analyticsEnabled: 'Analytics-Einwilligung gespeichert.', analyticsDisabled: 'Remote-Analytics bleibt deaktiviert.',
      securityGuardrails: 'Sicherheitsregeln', guardClientSide: 'Nur im Browser verarbeiten', guardFileValidation: 'Dateityp und Größe prüfen', guardTotalInputLimit: 'Gesamte Eingabegröße begrenzen', guardImageMetadata: 'Bildmetadaten entfernen', guardNoFileAnalytics: 'Keine Inhaltsanalyse speichern',
      creatingPdf: 'PDF wird erstellt...', pdfCreated: 'PDF erstellt.', pdfCreationFailed: 'PDF-Erstellung fehlgeschlagen.',
      encryptedPdfBlocked: 'Verschlüsselte PDFs werden aus Sicherheitsgründen blockiert.', unsafePdfBlocked: 'PDFs mit Skripten, Auto-Aktionen, Anhängen oder Rich Media werden blockiert.', unsupportedFile: 'Nicht unterstützte oder zu große Datei.', totalInputLimitExceeded: 'Die gesamte Eingabegröße ist auf {size} begrenzt.', textLimitExceeded: 'Text ist auf {count} Zeichen begrenzt.', totalLimitLabel: 'gesamt max.', textLimitLabel: 'Bis zu {count} Zeichen werden im Browser gezählt.', fileReadFailed: 'Datei konnte nicht gelesen werden.',
      noFrames: 'Noch keine Frames extrahiert.', download: 'Herunterladen', frameInterval: 'Intervall in Sekunden', maxFrames: 'Maximale Frames', videoUnsupported: 'Nicht unterstütztes oder zu großes Video.'
    },
    pt: {
      homeTitle: 'Kit de ferramentas', homeDesc: 'Escolha uma ferramenta do navegador. Sempre que possível, os arquivos são processados no seu dispositivo.',
      allTools: 'Todas as ferramentas', availableNow: 'Disponível', plannedTools: 'Planejadas', openTool: 'Abrir', comingSoon: 'Em breve',
      chooseFiles: 'Escolher arquivos', dropPdf: 'Solte PDFs ou imagens aqui, ou escolha arquivos', mergeDownload: 'Unir e baixar PDF',
      clear: 'Limpar', emptyFiles: 'Nenhum arquivo adicionado ainda.', settings: 'Configurações', outputName: 'Nome do arquivo final',
      textInput: 'Entrada de texto', pasteText: 'Cole o texto aqui.', chars: 'Caracteres', charsNoSpace: 'Sem espaços',
      words: 'Palavras', sentences: 'Frases', paragraphs: 'Parágrafos', reading: 'Tempo de leitura', keywords: 'Palavras principais',
      videoChoose: 'Escolher vídeo', extractCurrent: 'Extrair quadro atual', extractInterval: 'Extrair por intervalo', frames: 'Quadros extraídos',
      adminTitle: 'Administração', adminDesc: 'Esta versão estática fornece apenas métricas locais com privacidade. A análise no servidor exige Worker/D1.',
      fileCount: 'arquivos', pageUnit: 'página', copyStats: 'Copiar estatísticas', noKeywords: 'Ainda não há palavras principais.',
      statsCopied: 'Estatísticas copiadas.', readingSpeed: 'Velocidade de leitura', minutesShort: 'min',
      analyticsConsentTitle: 'Consentimento de análise', analyticsConsentDesc: 'Ajude a melhorar as ferramentas com visitas e uso de recursos agregados. Nomes e conteúdos de arquivos não são enviados.',
      acceptAnalytics: 'Permitir', declineAnalytics: 'Recusar', analyticsEnabled: 'Consentimento de análise salvo.', analyticsDisabled: 'A análise remota ficará desativada.',
      securityGuardrails: 'Proteções de segurança', guardClientSide: 'Processamento apenas no navegador', guardFileValidation: 'Validação de tipo e tamanho', guardTotalInputLimit: 'Limite total de entrada', guardImageMetadata: 'Remoção de metadados de imagem', guardNoFileAnalytics: 'Sem análise do conteúdo dos arquivos',
      creatingPdf: 'Criando PDF...', pdfCreated: 'PDF criado.', pdfCreationFailed: 'Falha ao criar PDF.',
      encryptedPdfBlocked: 'PDFs criptografados são bloqueados por segurança.', unsafePdfBlocked: 'PDFs com scripts, ações automáticas, anexos ou mídia avançada são bloqueados.', unsupportedFile: 'Arquivo não compatível ou muito grande.', totalInputLimitExceeded: 'O tamanho total de entrada é limitado a {size}.', textLimitExceeded: 'O texto é limitado a {count} caracteres.', totalLimitLabel: 'máximo total', textLimitLabel: 'Até {count} caracteres são contados no navegador.', fileReadFailed: 'Não foi possível ler o arquivo.',
      noFrames: 'Nenhum quadro extraído ainda.', download: 'Baixar', frameInterval: 'Intervalo em segundos', maxFrames: 'Máximo de quadros', videoUnsupported: 'Vídeo não compatível ou muito grande.'
    },
    hi: {
      homeTitle: 'टूलकिट', homeDesc: 'ज़रूरी ब्राउज़र टूल चुनें। जहाँ संभव हो, फ़ाइलें आपके डिवाइस पर ही प्रोसेस होती हैं।',
      allTools: 'सभी टूल', availableNow: 'उपलब्ध', plannedTools: 'योजनाबद्ध', openTool: 'खोलें', comingSoon: 'जल्द',
      chooseFiles: 'फ़ाइलें चुनें', dropPdf: 'PDF या इमेज फ़ाइलें यहाँ छोड़ें, या फ़ाइलें चुनें', mergeDownload: 'PDF मिलाकर डाउनलोड करें',
      clear: 'साफ़ करें', emptyFiles: 'अभी कोई फ़ाइल नहीं जोड़ी गई।', settings: 'सेटिंग्स', outputName: 'आउटपुट फ़ाइल नाम',
      textInput: 'टेक्स्ट इनपुट', pasteText: 'टेक्स्ट यहाँ पेस्ट करें।', chars: 'अक्षर', charsNoSpace: 'स्पेस हटाकर',
      words: 'शब्द', sentences: 'वाक्य', paragraphs: 'पैराग्राफ', reading: 'पढ़ने का समय', keywords: 'मुख्य शब्द',
      videoChoose: 'वीडियो चुनें', extractCurrent: 'मौजूदा फ़्रेम निकालें', extractInterval: 'अंतराल से निकालें', frames: 'निकाले गए फ़्रेम',
      adminTitle: 'एडमिन पेज', adminDesc: 'यह स्थिर संस्करण गोपनीयता-सुरक्षित स्थानीय आँकड़े ही देता है। सर्वर विश्लेषण के लिए Worker/D1 कनेक्शन चाहिए।',
      fileCount: 'फ़ाइलें', pageUnit: 'पेज', copyStats: 'आँकड़े कॉपी करें', noKeywords: 'अभी कोई मुख्य शब्द नहीं।',
      statsCopied: 'आँकड़े कॉपी हो गए।', readingSpeed: 'पढ़ने की गति', minutesShort: 'मिनट',
      analyticsConsentTitle: 'विश्लेषण सहमति', analyticsConsentDesc: 'कुल विज़िट और फ़ीचर उपयोग से टूल सुधारने में मदद करें। फ़ाइल नाम और सामग्री नहीं भेजी जाती।',
      acceptAnalytics: 'अनुमति दें', declineAnalytics: 'अस्वीकार', analyticsEnabled: 'विश्लेषण सहमति सेव हो गई।', analyticsDisabled: 'रिमोट विश्लेषण बंद रहेगा।',
      securityGuardrails: 'सुरक्षा नियंत्रण', guardClientSide: 'केवल ब्राउज़र में प्रोसेसिंग', guardFileValidation: 'फ़ाइल प्रकार और आकार जाँच', guardTotalInputLimit: 'कुल इनपुट आकार सीमा', guardImageMetadata: 'इमेज मेटाडेटा हटाना', guardNoFileAnalytics: 'फ़ाइल सामग्री विश्लेषण सेव नहीं',
      creatingPdf: 'PDF बनाया जा रहा है...', pdfCreated: 'PDF बन गया।', pdfCreationFailed: 'PDF बनाने में विफल।',
      encryptedPdfBlocked: 'सुरक्षा के लिए एन्क्रिप्टेड PDF रोके गए हैं।', unsafePdfBlocked: 'स्क्रिप्ट, ऑटो-एक्शन, अटैचमेंट या रिच मीडिया वाले PDF रोके जाते हैं।', unsupportedFile: 'फ़ाइल समर्थित नहीं या बहुत बड़ी है।', totalInputLimitExceeded: 'कुल इनपुट आकार {size} तक सीमित है।', textLimitExceeded: 'टेक्स्ट अधिकतम {count} अक्षरों तक सीमित है।', totalLimitLabel: 'कुल अधिकतम', textLimitLabel: 'ब्राउज़र में अधिकतम {count} अक्षर गिने जाते हैं।', fileReadFailed: 'फ़ाइल पढ़ी नहीं जा सकी।',
      noFrames: 'अभी कोई फ़्रेम नहीं निकला।', download: 'डाउनलोड', frameInterval: 'अंतराल सेकंड', maxFrames: 'अधिकतम फ़्रेम', videoUnsupported: 'वीडियो समर्थित नहीं या बहुत बड़ा है।'
    },
    ar: {
      homeTitle: 'مجموعة أدوات', homeDesc: 'اختر أداة المتصفح التي تحتاجها. تتم معالجة الملفات على جهازك كلما أمكن.',
      allTools: 'كل الأدوات', availableNow: 'متاح', plannedTools: 'قيد التخطيط', openTool: 'فتح', comingSoon: 'قريباً',
      chooseFiles: 'اختيار ملفات', dropPdf: 'أسقط ملفات PDF أو الصور هنا، أو اختر الملفات', mergeDownload: 'دمج PDF وتنزيله',
      clear: 'مسح', emptyFiles: 'لم تتم إضافة ملفات بعد.', settings: 'الإعدادات', outputName: 'اسم ملف الإخراج',
      textInput: 'إدخال النص', pasteText: 'الصق النص هنا.', chars: 'الأحرف', charsNoSpace: 'بدون مسافات',
      words: 'الكلمات', sentences: 'الجمل', paragraphs: 'الفقرات', reading: 'وقت القراءة', keywords: 'الكلمات المهمة',
      videoChoose: 'اختيار فيديو', extractCurrent: 'استخراج الإطار الحالي', extractInterval: 'استخراج حسب الفاصل', frames: 'الإطارات المستخرجة',
      adminTitle: 'صفحة الإدارة', adminDesc: 'توفر هذه النسخة الثابتة إحصاءات محلية تحافظ على الخصوصية فقط. يتطلب تحليل الخادم ربط Worker/D1.',
      fileCount: 'ملفات', pageUnit: 'صفحة', copyStats: 'نسخ الإحصاءات', noKeywords: 'لا توجد كلمات مهمة بعد.',
      statsCopied: 'تم نسخ الإحصاءات.', readingSpeed: 'سرعة القراءة', minutesShort: 'دقيقة',
      analyticsConsentTitle: 'الموافقة على التحليلات', analyticsConsentDesc: 'ساعد في تحسين الأدوات عبر زيارات واستخدام مجمعين. لا يتم إرسال أسماء الملفات أو محتواها.',
      acceptAnalytics: 'موافقة', declineAnalytics: 'رفض', analyticsEnabled: 'تم حفظ الموافقة على التحليلات.', analyticsDisabled: 'ستبقى التحليلات عن بعد متوقفة.',
      securityGuardrails: 'ضوابط الأمان', guardClientSide: 'المعالجة داخل المتصفح فقط', guardFileValidation: 'التحقق من النوع والحجم', guardTotalInputLimit: 'حد الحجم الإجمالي', guardImageMetadata: 'إزالة بيانات الصور الوصفية', guardNoFileAnalytics: 'لا يتم حفظ تحليل محتوى الملفات',
      creatingPdf: 'جار إنشاء PDF...', pdfCreated: 'تم إنشاء PDF.', pdfCreationFailed: 'فشل إنشاء PDF.',
      encryptedPdfBlocked: 'يتم حظر ملفات PDF المشفرة لأسباب أمنية.', unsafePdfBlocked: 'يتم حظر ملفات PDF التي تحتوي على نصوص أو إجراءات تلقائية أو مرفقات أو وسائط تفاعلية.', unsupportedFile: 'الملف غير مدعوم أو كبير جداً.', totalInputLimitExceeded: 'إجمالي حجم الإدخال محدود بـ {size}.', textLimitExceeded: 'النص محدود بـ {count} حرفاً.', totalLimitLabel: 'الحد الإجمالي', textLimitLabel: 'يتم عد حتى {count} حرفاً في المتصفح.', fileReadFailed: 'تعذرت قراءة الملف.',
      noFrames: 'لم يتم استخراج أي إطارات بعد.', download: 'تنزيل', frameInterval: 'الفاصل بالثواني', maxFrames: 'الحد الأقصى للإطارات', videoUnsupported: 'الفيديو غير مدعوم أو كبير جداً.'
    }
  };

  const legalMetaTranslations = {
    ko: { title: '문의 및 업데이트', contact: '문의', updated: '마지막 업데이트' },
    en: { title: 'Contact And Updates', contact: 'Contact', updated: 'Last updated' },
    ja: { title: '連絡先と更新', contact: '連絡先', updated: '最終更新' },
    zh: { title: '联系与更新', contact: '联系', updated: '最后更新' },
    es: { title: 'Contacto y actualizaciones', contact: 'Contacto', updated: 'Última actualización' },
    fr: { title: 'Contact et mises à jour', contact: 'Contact', updated: 'Dernière mise à jour' },
    de: { title: 'Kontakt und Aktualisierungen', contact: 'Kontakt', updated: 'Zuletzt aktualisiert' },
    pt: { title: 'Contato e atualizações', contact: 'Contato', updated: 'Última atualização' },
    hi: { title: 'संपर्क और अपडेट', contact: 'संपर्क', updated: 'अंतिम अपडेट' },
    ar: { title: 'التواصل والتحديثات', contact: 'التواصل', updated: 'آخر تحديث' }
  };

  const legalTranslations = {
    en: {
      about: {
        title: 'About',
        description: 'Toolkit is a browser-based collection of PDF, text, and media tools.',
        sections: [
          { title: 'Purpose', items: ['The service helps with repeat document, text, and media tasks without installing an app.', 'Ready tools include PDF and image merging, word counting, and video frame extraction.', 'The home screen is structured for about 20 tool slots so more utilities can be added later.'] },
          { title: 'Processing Model', items: ['Supported file work runs in the user browser whenever possible.', 'The static deployment does not upload original files, file names, document contents, text, or video frames to a server.', 'Remote analytics, when connected, is sent only after consent and contains aggregate usage events.'] },
          { title: 'Operating Principles', items: ['The workflow should stay simple, direct, and easy to inspect.', 'Risky file structures and unsupported active formats are blocked before processing.', 'Important documents should be reviewed by the user after download.'] }
        ]
      },
      privacy: {
        title: 'Privacy Policy',
        description: 'Toolkit is designed around not collecting original files or file names.',
        sections: [
          { title: 'Data We Do Not Collect', items: ['PDFs, images, text, and videos are not uploaded to an operator server in the static version.', 'File names, file contents, document personal data, and video frame contents are not stored for analytics.', 'The default GitHub Pages deployment has no central user analytics database.'] },
          { title: 'Browser Storage', items: ['Language preference, local usage counters, analytics consent, and local admin lock data may be stored in localStorage or sessionStorage.', 'This data is used for the current browser experience and can be deleted through browser site data settings.', 'Local admin unlock state stays in the current tab and expires after 30 minutes.'] },
          { title: 'Optional Analytics And Ads', items: ['If Worker/D1 analytics is connected, only consented aggregate events are sent.', 'Daily visitor hashes, route, language, screen size, browser family, and country code may be stored for service improvement.', 'If AdSense or another ad provider is enabled, that provider may use cookies or similar technologies under its own policies.'] },
          { title: 'Rights And Retention', items: ['Local browser data remains until the user deletes site data or the browser removes it.', 'Server aggregate retention should be limited by the operator policy once the backend is enabled.', 'Privacy questions or deletion requests can be sent to the contact email.'] }
        ]
      },
      terms: {
        title: 'Terms Of Use',
        description: 'These terms describe the basic conditions for using Toolkit web tools.',
        sections: [
          { title: 'Service Scope', items: ['Toolkit provides browser-based tools for PDF, text, and media tasks.', 'The service may be free and may later include ads, paid features, or affiliate features.', 'Features, supported formats, limits, and screens may change for security or operational reasons.'] },
          { title: 'User Responsibility', items: ['Users should process only files and text they have the right to use.', 'Users remain responsible for managing sensitive data, trade secrets, personal information, and copyrighted material.', 'Important, legal, contract, or submission files should be reviewed by the user before use.'] },
          { title: 'Prohibited Use', items: ['Do not use the service to process or distribute malware, illegal content, or materials that violate another person’s rights.', 'Do not attempt to bypass security controls, overload the service, or automate abusive traffic.', 'Do not attempt unauthorized access to admin pages, APIs, analytics, or authentication systems.'] },
          { title: 'Results And Liability', items: ['Toolkit creates output from user input but cannot guarantee perfect compatibility in every browser and file format.', 'Encrypted, damaged, special-format, or very large files may fail.', 'Except where prohibited by law, the operator is not responsible for indirect losses from use of downloaded results.'] }
        ]
      },
      security: {
        title: 'Security',
        description: 'Toolkit treats file minimization and input validation as core security principles.',
        sections: [
          { title: 'Client-Side Processing', items: ['PDF, image, text, and video work runs in the browser whenever possible.', 'The static deployment has no endpoint that receives original files.', 'Downloaded results are generated by the user browser.'] },
          { title: 'Input Defenses', items: ['PDF signatures are checked before processing.', 'Encrypted PDFs and PDFs with scripts, auto actions, attachments, rich media, or XFA markers are blocked.', 'SVG and other active image formats are excluded from PDF merging.', 'Images are decoded, size-checked, and re-encoded to strip source metadata.'] },
          { title: 'Browser And Admin Protections', items: ['Content Security Policy blocks external scripts and arbitrary network connections by default.', 'Admin links are not shown in public navigation; direct address access is required.', 'The local admin lock is not a production security boundary; production admin should use the Worker backend or another server-side identity layer.'] }
        ]
      }
    },
    ja: {
      about: {
        title: '概要',
        description: 'ToolkitはPDF、テキスト、メディア作業を行うブラウザベースのツール集です。',
        sections: [
          { title: '目的', items: ['インストールなしで反復的な文書・テキスト・メディア作業を素早く処理できます。', '現在はPDFと画像の結合、文字数カウント、動画フレーム抽出を提供します。', 'ホーム画面は約20個のツール枠を想定しており、後から拡張できます。'] },
          { title: '処理方式', items: ['対応するファイル処理は可能な限り利用者のブラウザ内で実行されます。', '静的配信版では元ファイル、ファイル名、文書内容、動画フレームをサーバーへ送信しません。', 'リモート分析を接続しても、同意後の集計イベントだけを送信します。'] },
          { title: '運営方針', items: ['操作は単純で確認しやすい流れを優先します。', '危険なファイル構造や能動的な形式は処理前にブロックします。', '重要な文書はダウンロード後に利用者が確認してください。'] }
        ]
      },
      privacy: {
        title: 'プライバシーポリシー',
        description: 'Toolkitは元ファイルとファイル名を収集しない設計を基本にしています。',
        sections: [
          { title: '収集しない情報', items: ['静的版ではPDF、画像、テキスト、動画を運営者サーバーへアップロードしません。', 'ファイル名、ファイル内容、文書内の個人情報、動画フレーム内容を分析目的で保存しません。', '標準のGitHub Pages配信では中央の利用者分析データベースはありません。'] },
          { title: 'ブラウザ保存', items: ['言語設定、ローカル利用回数、分析同意、ローカル管理ロック情報がブラウザに保存される場合があります。', 'この情報は同じブラウザでの利用体験のために使われ、サイトデータ削除で消せます。', 'ローカル管理の解除状態は現在のタブだけに保存され、30分で期限切れになります。'] },
          { title: '任意の分析と広告', items: ['Worker/D1分析を接続した場合も、同意した集計イベントだけを送信します。', '日次の訪問者ハッシュ、経路、言語、画面サイズ、ブラウザ種別、国コードが保存される場合があります。', 'AdSenseなどの広告を有効にすると、広告提供者のポリシーに基づきCookie等が使われる場合があります。'] },
          { title: '権利と保存期間', items: ['ブラウザ内データは利用者がサイトデータを削除するまで残る場合があります。', 'サーバー集計データの保存期間はバックエンド有効化時の運営方針で制限すべきです。', '問い合わせや削除依頼は連絡先メールへ送れます。'] }
        ]
      },
      terms: {
        title: '利用規約',
        description: 'この規約はToolkitのウェブツール利用時の基本条件を示します。',
        sections: [
          { title: 'サービス範囲', items: ['ToolkitはPDF、テキスト、メディア作業のためのブラウザツールを提供します。', 'サービスは無料で提供される場合があり、広告、有料機能、提携機能が後から追加される場合があります。', '機能、対応形式、制限、画面は安全性や運営上の理由で変更される場合があります。'] },
          { title: '利用者の責任', items: ['利用者は使用権限のあるファイルとテキストだけを処理してください。', '個人情報、営業秘密、著作物などの管理責任は利用者にあります。', '重要書類、法的文書、契約書、提出用ファイルは利用前に確認してください。'] },
          { title: '禁止行為', items: ['マルウェア、違法コンテンツ、他者の権利を侵害する資料の処理や配布は禁止です。', '安全制御の回避、過剰な自動化、異常なトラフィックは禁止です。', '管理画面、API、分析、認証システムへの無断アクセスは禁止です。'] },
          { title: '結果と責任制限', items: ['Toolkitは入力に基づいて結果を作成しますが、すべての環境で完全な互換性を保証しません。', '暗号化、破損、特殊形式、非常に大きいファイルでは失敗する場合があります。', '法律で禁止される場合を除き、結果利用による間接損害について運営者は責任を負いません。'] }
        ]
      },
      security: {
        title: 'セキュリティ',
        description: 'Toolkitはファイル最小化と入力検証を重要な安全原則としています。',
        sections: [
          { title: 'クライアント処理', items: ['PDF、画像、テキスト、動画処理は可能な限りブラウザ内で実行します。', '静的版には元ファイルを受け取るエンドポイントがありません。', 'ダウンロード結果は利用者のブラウザで生成されます。'] },
          { title: '入力防御', items: ['PDFは署名を確認してから処理します。', '暗号化PDFやスクリプト、自動実行、添付、リッチメディア、XFA標識のあるPDFはブロックします。', 'SVGなど能動的な画像形式はPDF結合対象から除外します。', '画像はデコード、サイズ確認、再エンコードを行い元メタデータを削除します。'] },
          { title: 'ブラウザと管理保護', items: ['CSPにより外部スクリプトと任意のネットワーク接続を既定でブロックします。', '管理リンクは公開ナビゲーションに表示せず、直接URLでのみアクセスします。', 'ローカル管理ロックは本番認証境界ではなく、本番管理にはWorkerなどのサーバー認証が必要です。'] }
        ]
      }
    },
    zh: {
      about: {
        title: '介绍',
        description: 'Toolkit 是一组在浏览器中运行的 PDF、文本和媒体工具。',
        sections: [
          { title: '服务目的', items: ['无需安装即可处理重复的文档、文本和媒体任务。', '当前工具包括 PDF 与图片合并、字数统计、视频帧提取。', '首页按约 20 个工具位设计，后续可以继续扩展。'] },
          { title: '处理方式', items: ['支持的文件处理会尽可能在用户浏览器中完成。', '静态版本不会把原始文件、文件名、文档内容、文本或视频帧上传到服务器。', '连接远程分析后，也只会在用户同意后发送汇总使用事件。'] },
          { title: '运营原则', items: ['流程应保持简单、直接、便于检查。', '危险文件结构和不支持的主动内容格式会在处理前被阻止。', '重要文档下载后应由用户自行复核。'] }
        ]
      },
      privacy: {
        title: '隐私政策',
        description: 'Toolkit 的设计原则是不收集原始文件和文件名。',
        sections: [
          { title: '不收集的信息', items: ['静态版本不会将 PDF、图片、文本或视频上传到运营者服务器。', '不会为了分析而保存文件名、文件内容、文档内个人信息或视频帧内容。', '默认 GitHub Pages 部署没有集中式用户分析数据库。'] },
          { title: '浏览器存储', items: ['语言偏好、本地使用次数、分析同意和本地管理锁信息可能保存在浏览器中。', '这些数据用于当前浏览器体验，可通过浏览器网站数据设置删除。', '本地管理解锁状态只保存在当前标签页，并在 30 分钟后过期。'] },
          { title: '可选分析与广告', items: ['连接 Worker/D1 分析后，只会发送用户同意的汇总事件。', '可能保存每日访客哈希、路径、语言、屏幕尺寸、浏览器类别和国家代码。', '启用 AdSense 等广告后，广告提供商可能按其政策使用 Cookie 或类似技术。'] },
          { title: '权利和保留', items: ['浏览器内数据会保留到用户删除网站数据或浏览器清理为止。', '启用后端后，服务器汇总数据保留期应由运营政策限制。', '隐私问题或删除请求可发送到联系邮箱。'] }
        ]
      },
      terms: {
        title: '服务条款',
        description: '这些条款说明使用 Toolkit 网页工具的基本条件。',
        sections: [
          { title: '服务范围', items: ['Toolkit 提供用于 PDF、文本和媒体任务的浏览器工具。', '服务可以免费提供，之后可能加入广告、付费功能或合作功能。', '功能、支持格式、限制和界面可能因安全或运营原因而变化。'] },
          { title: '用户责任', items: ['用户只应处理自己有权使用的文件和文本。', '个人信息、商业秘密和受版权保护材料的管理责任仍由用户承担。', '重要、法律、合同或提交用文件在使用前应由用户复核。'] },
          { title: '禁止行为', items: ['不得用本服务处理或传播恶意软件、违法内容或侵犯他人权利的材料。', '不得绕过安全控制、过度自动化或制造异常流量。', '不得未经授权访问管理页面、API、分析或认证系统。'] },
          { title: '结果和责任限制', items: ['Toolkit 根据用户输入生成结果，但不保证所有浏览器和文件格式都完全兼容。', '加密、损坏、特殊格式或超大文件可能处理失败。', '除法律禁止限制的情况外，运营者不对下载结果使用造成的间接损失负责。'] }
        ]
      },
      security: {
        title: '安全',
        description: 'Toolkit 将文件最小化和输入验证作为核心安全原则。',
        sections: [
          { title: '客户端处理', items: ['PDF、图片、文本和视频任务尽可能在浏览器中运行。', '静态版本没有接收原始文件的端点。', '下载结果由用户浏览器生成。'] },
          { title: '输入防护', items: ['处理前会检查 PDF 签名。', '加密 PDF 以及含脚本、自动动作、附件、富媒体或 XFA 标记的 PDF 会被阻止。', 'SVG 等主动图片格式不参与 PDF 合并。', '图片会经过解码、尺寸检查和重新编码，以去除源元数据。'] },
          { title: '浏览器和管理保护', items: ['内容安全策略默认阻止外部脚本和任意网络连接。', '管理链接不会出现在公开导航中，需要直接地址访问。', '本地管理锁不是生产级安全边界；生产管理应使用 Worker 后端或其他服务器身份系统。'] }
        ]
      }
    },
    es: {
      about: {
        title: 'Acerca de',
        description: 'Toolkit es un conjunto de herramientas de PDF, texto y medios que funciona en el navegador.',
        sections: [
          { title: 'Propósito', items: ['Ayuda a resolver tareas repetidas de documentos, texto y medios sin instalar una app.', 'Las herramientas disponibles unen PDF e imágenes, cuentan palabras y extraen fotogramas de video.', 'La pantalla inicial está preparada para unos 20 espacios de herramientas y futuras ampliaciones.'] },
          { title: 'Modelo de procesamiento', items: ['El trabajo con archivos se ejecuta en el navegador siempre que sea posible.', 'La versión estática no sube archivos originales, nombres de archivo, contenido de documentos, texto ni fotogramas a un servidor.', 'La analítica remota, si se conecta, solo envía eventos agregados después del consentimiento.'] },
          { title: 'Principios de operación', items: ['El flujo debe ser simple, directo y fácil de revisar.', 'Las estructuras de archivo riesgosas y los formatos activos no admitidos se bloquean antes del procesamiento.', 'Los documentos importantes deben revisarse después de la descarga.'] }
        ]
      },
      privacy: {
        title: 'Política de privacidad',
        description: 'Toolkit está diseñado para no recopilar archivos originales ni nombres de archivo.',
        sections: [
          { title: 'Datos que no recopilamos', items: ['La versión estática no sube PDF, imágenes, texto ni videos al servidor del operador.', 'No se guardan nombres de archivo, contenido, datos personales de documentos ni fotogramas para analítica.', 'La implementación predeterminada en GitHub Pages no tiene una base de datos central de analítica de usuarios.'] },
          { title: 'Almacenamiento del navegador', items: ['La preferencia de idioma, contadores locales, consentimiento de analítica y bloqueo local de administración pueden guardarse en el navegador.', 'Estos datos se usan para la experiencia en ese navegador y se pueden borrar desde los datos del sitio.', 'El desbloqueo local de administración permanece solo en la pestaña actual y expira a los 30 minutos.'] },
          { title: 'Analítica y anuncios opcionales', items: ['Si se conecta Worker/D1, solo se envían eventos agregados con consentimiento.', 'Pueden guardarse hashes diarios de visitantes, ruta, idioma, tamaño de pantalla, familia de navegador y país.', 'Si se habilita AdSense u otro proveedor, ese proveedor puede usar cookies o tecnologías similares según sus políticas.'] },
          { title: 'Derechos y retención', items: ['Los datos locales permanecen hasta que el usuario borra los datos del sitio o el navegador los elimina.', 'La retención de datos agregados del servidor debe limitarse por la política del operador cuando se active el backend.', 'Las consultas de privacidad o solicitudes de eliminación pueden enviarse al correo de contacto.'] }
        ]
      },
      terms: {
        title: 'Términos de uso',
        description: 'Estos términos describen las condiciones básicas para usar las herramientas web de Toolkit.',
        sections: [
          { title: 'Alcance del servicio', items: ['Toolkit ofrece herramientas de navegador para tareas de PDF, texto y medios.', 'El servicio puede ser gratuito y más adelante incluir anuncios, funciones pagas o funciones de afiliación.', 'Las funciones, formatos admitidos, límites y pantallas pueden cambiar por seguridad u operación.'] },
          { title: 'Responsabilidad del usuario', items: ['Los usuarios solo deben procesar archivos y textos que tengan derecho a usar.', 'El usuario sigue siendo responsable de datos sensibles, secretos comerciales, información personal y material protegido.', 'Los archivos importantes, legales, contractuales o de entrega deben revisarse antes de usarse.'] },
          { title: 'Uso prohibido', items: ['No use el servicio para procesar o distribuir malware, contenido ilegal o materiales que vulneren derechos de terceros.', 'No intente evadir controles de seguridad, sobrecargar el servicio ni automatizar tráfico abusivo.', 'No intente acceder sin autorización a páginas de administración, API, analítica o autenticación.'] },
          { title: 'Resultados y responsabilidad', items: ['Toolkit crea resultados a partir de la entrada del usuario, pero no garantiza compatibilidad perfecta en todos los navegadores y formatos.', 'Los archivos cifrados, dañados, especiales o muy grandes pueden fallar.', 'Salvo donde la ley lo prohíba, el operador no responde por pérdidas indirectas derivadas del uso de resultados descargados.'] }
        ]
      },
      security: {
        title: 'Seguridad',
        description: 'Toolkit trata la minimización de archivos y la validación de entrada como principios centrales de seguridad.',
        sections: [
          { title: 'Procesamiento en el cliente', items: ['PDF, imágenes, texto y video se procesan en el navegador siempre que sea posible.', 'La versión estática no tiene un endpoint que reciba archivos originales.', 'Los resultados descargados se generan en el navegador del usuario.'] },
          { title: 'Defensas de entrada', items: ['Se comprueba la firma del PDF antes de procesarlo.', 'Se bloquean PDF cifrados y PDF con scripts, acciones automáticas, adjuntos, medios enriquecidos o XFA.', 'SVG y otros formatos activos de imagen se excluyen de la unión de PDF.', 'Las imágenes se decodifican, se revisa su tamaño y se re-codifican para quitar metadatos de origen.'] },
          { title: 'Protección del navegador y administración', items: ['La política CSP bloquea scripts externos y conexiones arbitrarias por defecto.', 'Los enlaces de administración no aparecen en la navegación pública; se requiere acceso por dirección directa.', 'El bloqueo local de administración no es una frontera de seguridad de producción; la administración real debe usar Worker u otra identidad de servidor.'] }
        ]
      }
    },
    fr: {
      about: {
        title: 'À propos',
        description: 'Toolkit est un ensemble d’outils PDF, texte et média exécutés dans le navigateur.',
        sections: [
          { title: 'Objectif', items: ['Le service aide à traiter des tâches répétitives de documents, textes et médias sans installation.', 'Les outils disponibles fusionnent PDF et images, comptent les mots et extraient des images vidéo.', 'L’accueil est prévu pour environ 20 emplacements d’outils afin de permettre des extensions.'] },
          { title: 'Mode de traitement', items: ['Le travail sur fichiers s’exécute dans le navigateur quand c’est possible.', 'La version statique n’envoie pas les fichiers originaux, noms de fichier, contenus, textes ou images vidéo à un serveur.', 'L’analytique distante, si elle est connectée, envoie seulement des événements agrégés après consentement.'] },
          { title: 'Principes', items: ['Le flux doit rester simple, direct et vérifiable.', 'Les structures risquées et formats actifs non pris en charge sont bloqués avant traitement.', 'Les documents importants doivent être vérifiés après téléchargement.'] }
        ]
      },
      privacy: {
        title: 'Politique de confidentialité',
        description: 'Toolkit est conçu pour ne pas collecter les fichiers originaux ni les noms de fichiers.',
        sections: [
          { title: 'Données non collectées', items: ['La version statique n’envoie pas PDF, images, textes ou vidéos au serveur de l’opérateur.', 'Les noms et contenus de fichiers, données personnelles des documents et images vidéo ne sont pas stockés pour l’analytique.', 'Le déploiement GitHub Pages par défaut n’a pas de base centrale d’analytique utilisateurs.'] },
          { title: 'Stockage du navigateur', items: ['La langue, les compteurs locaux, le consentement analytique et le verrou local d’administration peuvent être stockés dans le navigateur.', 'Ces données servent à l’expérience dans ce navigateur et peuvent être supprimées via les données de site.', 'Le déverrouillage local d’administration reste dans l’onglet courant et expire après 30 minutes.'] },
          { title: 'Analytique et publicités optionnelles', items: ['Si Worker/D1 est connecté, seuls des événements agrégés avec consentement sont envoyés.', 'Des hachages visiteurs quotidiens, route, langue, taille d’écran, famille de navigateur et pays peuvent être stockés.', 'Si AdSense ou un autre fournisseur est activé, ce fournisseur peut utiliser des cookies ou technologies similaires selon ses politiques.'] },
          { title: 'Droits et conservation', items: ['Les données locales restent jusqu’à suppression des données de site ou nettoyage par le navigateur.', 'La conservation des agrégats serveur doit être limitée par la politique de l’opérateur après activation du backend.', 'Les questions de confidentialité ou demandes de suppression peuvent être envoyées à l’adresse de contact.'] }
        ]
      },
      terms: {
        title: 'Conditions d’utilisation',
        description: 'Ces conditions décrivent les règles de base d’utilisation des outils web Toolkit.',
        sections: [
          { title: 'Portée du service', items: ['Toolkit fournit des outils de navigateur pour PDF, texte et médias.', 'Le service peut être gratuit et inclure plus tard publicités, options payantes ou partenariats.', 'Les fonctions, formats, limites et écrans peuvent changer pour des raisons de sécurité ou d’exploitation.'] },
          { title: 'Responsabilité de l’utilisateur', items: ['Les utilisateurs doivent traiter uniquement les fichiers et textes qu’ils ont le droit d’utiliser.', 'La gestion des données sensibles, secrets commerciaux, informations personnelles et contenus protégés reste à leur charge.', 'Les fichiers importants, juridiques, contractuels ou à soumettre doivent être vérifiés avant usage.'] },
          { title: 'Usages interdits', items: ['N’utilisez pas le service pour traiter ou distribuer logiciels malveillants, contenu illégal ou éléments portant atteinte aux droits d’autrui.', 'Ne contournez pas les protections, ne surchargez pas le service et n’automatisez pas de trafic abusif.', 'N’accédez pas sans autorisation aux pages d’administration, API, analytique ou authentification.'] },
          { title: 'Résultats et responsabilité', items: ['Toolkit crée des résultats depuis les entrées utilisateur mais ne garantit pas une compatibilité parfaite partout.', 'Les fichiers chiffrés, endommagés, spéciaux ou très volumineux peuvent échouer.', 'Sauf interdiction légale, l’opérateur n’est pas responsable des pertes indirectes liées aux résultats téléchargés.'] }
        ]
      },
      security: {
        title: 'Sécurité',
        description: 'Toolkit place la minimisation des fichiers et la validation des entrées au cœur de sa sécurité.',
        sections: [
          { title: 'Traitement côté client', items: ['Les PDF, images, textes et vidéos sont traités dans le navigateur quand c’est possible.', 'La version statique ne possède aucun endpoint recevant les fichiers originaux.', 'Les résultats téléchargés sont générés par le navigateur utilisateur.'] },
          { title: 'Défenses d’entrée', items: ['La signature PDF est vérifiée avant traitement.', 'Les PDF chiffrés ou contenant scripts, actions automatiques, pièces jointes, médias enrichis ou XFA sont bloqués.', 'SVG et autres formats actifs sont exclus de la fusion PDF.', 'Les images sont décodées, limitées en taille et ré-encodées pour retirer les métadonnées source.'] },
          { title: 'Protection navigateur et administration', items: ['La CSP bloque par défaut scripts externes et connexions arbitraires.', 'Les liens d’administration ne sont pas affichés dans la navigation publique; l’accès se fait par adresse directe.', 'Le verrou local n’est pas une frontière de sécurité de production; l’administration réelle doit utiliser Worker ou une identité serveur.'] }
        ]
      }
    },
    de: {
      about: {
        title: 'Über',
        description: 'Toolkit ist eine browserbasierte Sammlung für PDF-, Text- und Medienaufgaben.',
        sections: [
          { title: 'Zweck', items: ['Der Dienst hilft bei wiederkehrenden Dokument-, Text- und Medienaufgaben ohne Installation.', 'Verfügbare Werkzeuge führen PDF und Bilder zusammen, zählen Wörter und extrahieren Videoframes.', 'Die Startseite ist für etwa 20 Werkzeugplätze vorbereitet und kann erweitert werden.'] },
          { title: 'Verarbeitung', items: ['Dateiarbeiten laufen möglichst im Browser des Nutzers.', 'Die statische Version lädt Originaldateien, Dateinamen, Dokumentinhalte, Texte oder Videoframes nicht auf einen Server.', 'Remote-Analytics sendet, falls verbunden, nur aggregierte Ereignisse nach Zustimmung.'] },
          { title: 'Betriebsprinzipien', items: ['Der Ablauf soll einfach, direkt und prüfbar bleiben.', 'Risikoreiche Dateistrukturen und nicht unterstützte aktive Formate werden vor der Verarbeitung blockiert.', 'Wichtige Dokumente sollten nach dem Download geprüft werden.'] }
        ]
      },
      privacy: {
        title: 'Datenschutz',
        description: 'Toolkit ist darauf ausgelegt, Originaldateien und Dateinamen nicht zu sammeln.',
        sections: [
          { title: 'Nicht gesammelte Daten', items: ['Die statische Version lädt PDF, Bilder, Texte oder Videos nicht auf den Server des Betreibers.', 'Dateinamen, Inhalte, personenbezogene Dokumentdaten und Videoframes werden nicht für Analytics gespeichert.', 'Die Standardbereitstellung auf GitHub Pages hat keine zentrale Nutzeranalyse-Datenbank.'] },
          { title: 'Browserspeicher', items: ['Spracheinstellung, lokale Zähler, Analytics-Zustimmung und lokale Admin-Sperre können im Browser gespeichert werden.', 'Diese Daten dienen der Erfahrung in diesem Browser und können über Website-Daten gelöscht werden.', 'Die lokale Admin-Entsperrung bleibt nur im aktuellen Tab und läuft nach 30 Minuten ab.'] },
          { title: 'Optionale Analytics und Werbung', items: ['Bei Worker/D1 werden nur zugestimmte aggregierte Ereignisse gesendet.', 'Tägliche Besucher-Hashes, Route, Sprache, Bildschirmgröße, Browserfamilie und Land können gespeichert werden.', 'Bei AdSense oder anderen Anzeigenanbietern können diese Anbieter Cookies oder ähnliche Technologien nach eigenen Richtlinien nutzen.'] },
          { title: 'Rechte und Aufbewahrung', items: ['Lokale Daten bleiben bis zur Löschung der Website-Daten oder Browserbereinigung bestehen.', 'Die Aufbewahrung serverseitiger Aggregate sollte nach Aktivierung des Backends durch Betreiberregeln begrenzt werden.', 'Datenschutzfragen oder Löschanfragen können an die Kontaktadresse gesendet werden.'] }
        ]
      },
      terms: {
        title: 'Nutzungsbedingungen',
        description: 'Diese Bedingungen beschreiben die Grundregeln für die Nutzung der Toolkit-Webwerkzeuge.',
        sections: [
          { title: 'Leistungsumfang', items: ['Toolkit stellt Browserwerkzeuge für PDF-, Text- und Medienaufgaben bereit.', 'Der Dienst kann kostenlos sein und später Werbung, kostenpflichtige Funktionen oder Partnerfunktionen enthalten.', 'Funktionen, Formate, Grenzen und Oberflächen können sich aus Sicherheits- oder Betriebsgründen ändern.'] },
          { title: 'Verantwortung der Nutzer', items: ['Nutzer sollten nur Dateien und Texte verarbeiten, zu deren Nutzung sie berechtigt sind.', 'Die Verantwortung für sensible Daten, Geschäftsgeheimnisse, personenbezogene Daten und urheberrechtliche Inhalte bleibt beim Nutzer.', 'Wichtige, rechtliche, vertragliche oder einzureichende Dateien sollten vor Nutzung geprüft werden.'] },
          { title: 'Verbotene Nutzung', items: ['Der Dienst darf nicht zur Verarbeitung oder Verbreitung von Malware, illegalen Inhalten oder rechtsverletzendem Material genutzt werden.', 'Sicherheitskontrollen dürfen nicht umgangen, der Dienst nicht überlastet und kein missbräuchlicher Traffic automatisiert werden.', 'Unbefugter Zugriff auf Adminseiten, APIs, Analytics oder Authentifizierung ist untersagt.'] },
          { title: 'Ergebnisse und Haftung', items: ['Toolkit erstellt Ergebnisse aus Nutzereingaben, garantiert aber keine perfekte Kompatibilität in allen Umgebungen.', 'Verschlüsselte, beschädigte, spezielle oder sehr große Dateien können fehlschlagen.', 'Soweit gesetzlich zulässig, haftet der Betreiber nicht für indirekte Schäden aus heruntergeladenen Ergebnissen.'] }
        ]
      },
      security: {
        title: 'Sicherheit',
        description: 'Toolkit behandelt Dateiminimierung und Eingabeprüfung als zentrale Sicherheitsprinzipien.',
        sections: [
          { title: 'Clientseitige Verarbeitung', items: ['PDF, Bilder, Text und Video werden möglichst im Browser verarbeitet.', 'Die statische Version hat keinen Endpoint für Originaldateien.', 'Downloads werden im Browser des Nutzers erzeugt.'] },
          { title: 'Eingabeschutz', items: ['PDF-Signaturen werden vor der Verarbeitung geprüft.', 'Verschlüsselte PDFs und PDFs mit Skripten, Auto-Aktionen, Anhängen, Rich Media oder XFA werden blockiert.', 'SVG und andere aktive Bildformate sind von der PDF-Zusammenführung ausgeschlossen.', 'Bilder werden decodiert, größenbegrenzt und neu codiert, um Quellmetadaten zu entfernen.'] },
          { title: 'Browser- und Adminschutz', items: ['CSP blockiert standardmäßig externe Skripte und beliebige Netzwerkverbindungen.', 'Adminlinks erscheinen nicht in der öffentlichen Navigation; Zugriff erfolgt über direkte Adresse.', 'Die lokale Admin-Sperre ist keine Produktions-Sicherheitsgrenze; echte Administration sollte Worker oder serverseitige Identität nutzen.'] }
        ]
      }
    },
    pt: {
      about: {
        title: 'Sobre',
        description: 'Toolkit é um conjunto de ferramentas de PDF, texto e mídia executadas no navegador.',
        sections: [
          { title: 'Objetivo', items: ['O serviço ajuda em tarefas repetidas de documentos, texto e mídia sem instalação.', 'As ferramentas disponíveis unem PDF e imagens, contam palavras e extraem quadros de vídeo.', 'A tela inicial foi preparada para cerca de 20 espaços de ferramentas e expansão futura.'] },
          { title: 'Modelo de processamento', items: ['O trabalho com arquivos roda no navegador sempre que possível.', 'A versão estática não envia arquivos originais, nomes, conteúdos, textos ou quadros de vídeo ao servidor.', 'A análise remota, se conectada, envia apenas eventos agregados após consentimento.'] },
          { title: 'Princípios de operação', items: ['O fluxo deve permanecer simples, direto e verificável.', 'Estruturas arriscadas e formatos ativos não suportados são bloqueados antes do processamento.', 'Documentos importantes devem ser revisados após o download.'] }
        ]
      },
      privacy: {
        title: 'Política de privacidade',
        description: 'Toolkit foi desenhado para não coletar arquivos originais nem nomes de arquivo.',
        sections: [
          { title: 'Dados não coletados', items: ['A versão estática não envia PDF, imagens, textos ou vídeos ao servidor do operador.', 'Nomes, conteúdos, dados pessoais em documentos e quadros de vídeo não são salvos para análise.', 'A implantação padrão no GitHub Pages não possui banco central de análise de usuários.'] },
          { title: 'Armazenamento no navegador', items: ['Idioma, contadores locais, consentimento de análise e bloqueio local de administração podem ser salvos no navegador.', 'Esses dados servem à experiência nesse navegador e podem ser apagados nos dados do site.', 'O desbloqueio local de administração fica apenas na aba atual e expira em 30 minutos.'] },
          { title: 'Análise e anúncios opcionais', items: ['Com Worker/D1, apenas eventos agregados com consentimento são enviados.', 'Hashes diários de visitantes, rota, idioma, tela, família do navegador e país podem ser armazenados.', 'Com AdSense ou outro provedor, cookies ou tecnologias semelhantes podem ser usados segundo as políticas desse provedor.'] },
          { title: 'Direitos e retenção', items: ['Dados locais permanecem até o usuário apagar os dados do site ou o navegador removê-los.', 'A retenção de agregados do servidor deve ser limitada pela política do operador após ativar o backend.', 'Perguntas de privacidade ou pedidos de exclusão podem ser enviados ao e-mail de contato.'] }
        ]
      },
      terms: {
        title: 'Termos de uso',
        description: 'Estes termos descrevem as condições básicas para usar as ferramentas web do Toolkit.',
        sections: [
          { title: 'Escopo do serviço', items: ['Toolkit fornece ferramentas de navegador para PDF, texto e mídia.', 'O serviço pode ser gratuito e futuramente incluir anúncios, recursos pagos ou parcerias.', 'Recursos, formatos, limites e telas podem mudar por segurança ou operação.'] },
          { title: 'Responsabilidade do usuário', items: ['Usuários devem processar apenas arquivos e textos que têm direito de usar.', 'Dados sensíveis, segredos comerciais, informações pessoais e materiais protegidos continuam sob responsabilidade do usuário.', 'Arquivos importantes, legais, contratuais ou de envio devem ser revisados antes do uso.'] },
          { title: 'Uso proibido', items: ['Não use o serviço para processar ou distribuir malware, conteúdo ilegal ou material que viole direitos de terceiros.', 'Não tente contornar controles de segurança, sobrecarregar o serviço ou automatizar tráfego abusivo.', 'Não tente acesso não autorizado a páginas de administração, APIs, análise ou autenticação.'] },
          { title: 'Resultados e responsabilidade', items: ['Toolkit gera resultados a partir da entrada do usuário, mas não garante compatibilidade perfeita em todos os ambientes.', 'Arquivos criptografados, danificados, especiais ou muito grandes podem falhar.', 'Exceto quando a lei proibir, o operador não responde por perdas indiretas do uso de resultados baixados.'] }
        ]
      },
      security: {
        title: 'Segurança',
        description: 'Toolkit trata minimização de arquivos e validação de entrada como princípios centrais de segurança.',
        sections: [
          { title: 'Processamento no cliente', items: ['PDF, imagens, texto e vídeo rodam no navegador sempre que possível.', 'A versão estática não possui endpoint que receba arquivos originais.', 'Os resultados baixados são gerados pelo navegador do usuário.'] },
          { title: 'Defesas de entrada', items: ['Assinaturas de PDF são verificadas antes do processamento.', 'PDFs criptografados ou com scripts, ações automáticas, anexos, mídia rica ou XFA são bloqueados.', 'SVG e outros formatos ativos são excluídos da união de PDF.', 'Imagens são decodificadas, limitadas por tamanho e recodificadas para remover metadados de origem.'] },
          { title: 'Proteções do navegador e administração', items: ['A CSP bloqueia scripts externos e conexões arbitrárias por padrão.', 'Links de administração não aparecem na navegação pública; é necessário acesso por endereço direto.', 'O bloqueio local de administração não é uma fronteira de segurança de produção; a administração real deve usar Worker ou identidade de servidor.'] }
        ]
      }
    },
    hi: {
      about: {
        title: 'परिचय',
        description: 'Toolkit ब्राउज़र में चलने वाले PDF, टेक्स्ट और मीडिया टूल्स का संग्रह है।',
        sections: [
          { title: 'उद्देश्य', items: ['यह सेवा बिना इंस्टॉल किए दस्तावेज़, टेक्स्ट और मीडिया के दोहराए कामों में मदद करती है।', 'उपलब्ध टूल PDF और इमेज मिलाते हैं, शब्द गिनते हैं और वीडियो फ़्रेम निकालते हैं।', 'होम स्क्रीन लगभग 20 टूल स्लॉट और आगे विस्तार के लिए बनाई गई है।'] },
          { title: 'प्रोसेसिंग मॉडल', items: ['समर्थित फ़ाइल कार्य जहाँ संभव हो ब्राउज़र में चलते हैं।', 'स्थिर संस्करण मूल फ़ाइल, फ़ाइल नाम, दस्तावेज़ सामग्री, टेक्स्ट या वीडियो फ़्रेम सर्वर पर अपलोड नहीं करता।', 'रिमोट विश्लेषण जुड़ने पर भी सहमति के बाद केवल समेकित इवेंट भेजे जाते हैं।'] },
          { title: 'संचालन सिद्धांत', items: ['प्रवाह सरल, सीधा और जांचने योग्य रहना चाहिए।', 'जोखिम वाली फ़ाइल संरचनाएँ और असमर्थित सक्रिय फ़ॉर्मैट प्रोसेसिंग से पहले रोके जाते हैं।', 'महत्वपूर्ण दस्तावेज़ डाउनलोड के बाद उपयोगकर्ता को स्वयं जांचने चाहिए।'] }
        ]
      },
      privacy: {
        title: 'गोपनीयता नीति',
        description: 'Toolkit मूल फ़ाइल और फ़ाइल नाम इकट्ठा न करने के सिद्धांत पर बनाया गया है।',
        sections: [
          { title: 'जो डेटा हम नहीं लेते', items: ['स्थिर संस्करण PDF, इमेज, टेक्स्ट या वीडियो ऑपरेटर सर्वर पर अपलोड नहीं करता।', 'फ़ाइल नाम, फ़ाइल सामग्री, दस्तावेज़ का निजी डेटा और वीडियो फ़्रेम विश्लेषण के लिए सेव नहीं होते।', 'डिफ़ॉल्ट GitHub Pages तैनाती में केंद्रीय उपयोगकर्ता विश्लेषण डेटाबेस नहीं है।'] },
          { title: 'ब्राउज़र संग्रह', items: ['भाषा पसंद, स्थानीय उपयोग गिनती, विश्लेषण सहमति और स्थानीय एडमिन लॉक डेटा ब्राउज़र में सेव हो सकते हैं।', 'यह डेटा उसी ब्राउज़र अनुभव के लिए है और साइट डेटा हटाकर मिटाया जा सकता है।', 'स्थानीय एडमिन अनलॉक केवल वर्तमान टैब में रहता है और 30 मिनट बाद समाप्त हो जाता है।'] },
          { title: 'वैकल्पिक विश्लेषण और विज्ञापन', items: ['Worker/D1 जुड़ने पर केवल सहमति वाले समेकित इवेंट भेजे जाते हैं।', 'दैनिक विज़िटर हैश, रूट, भाषा, स्क्रीन आकार, ब्राउज़र परिवार और देश कोड सेव हो सकते हैं।', 'AdSense या अन्य विज्ञापन प्रदाता सक्षम होने पर वे अपनी नीतियों के अनुसार कुकी आदि इस्तेमाल कर सकते हैं।'] },
          { title: 'अधिकार और अवधि', items: ['स्थानीय डेटा तब तक रह सकता है जब तक उपयोगकर्ता साइट डेटा न हटाए या ब्राउज़र उसे साफ न करे।', 'बैकएंड सक्रिय होने पर सर्वर समेकित डेटा की अवधि ऑपरेटर नीति से सीमित होनी चाहिए।', 'गोपनीयता प्रश्न या हटाने के अनुरोध संपर्क ईमेल पर भेजे जा सकते हैं।'] }
        ]
      },
      terms: {
        title: 'उपयोग की शर्तें',
        description: 'ये शर्तें Toolkit वेब टूल्स के उपयोग की मूल शर्तें बताती हैं।',
        sections: [
          { title: 'सेवा का दायरा', items: ['Toolkit PDF, टेक्स्ट और मीडिया कार्यों के लिए ब्राउज़र टूल देता है।', 'सेवा मुफ्त हो सकती है और आगे विज्ञापन, भुगतान सुविधाएँ या साझेदारी सुविधाएँ जोड़ सकती है।', 'सुरक्षा या संचालन कारणों से सुविधाएँ, फ़ॉर्मैट, सीमाएँ और स्क्रीन बदल सकते हैं।'] },
          { title: 'उपयोगकर्ता की जिम्मेदारी', items: ['उपयोगकर्ता केवल वही फ़ाइलें और टेक्स्ट प्रोसेस करें जिनका उपयोग करने का अधिकार है।', 'संवेदनशील डेटा, व्यापार रहस्य, निजी जानकारी और कॉपीराइट सामग्री की जिम्मेदारी उपयोगकर्ता की रहती है।', 'महत्वपूर्ण, कानूनी, अनुबंध या जमा करने वाली फ़ाइलें उपयोग से पहले जांचें।'] },
          { title: 'निषिद्ध उपयोग', items: ['मैलवेयर, अवैध सामग्री या दूसरों के अधिकार तोड़ने वाली सामग्री प्रोसेस या वितरित न करें।', 'सुरक्षा नियंत्रणों को बायपास, सेवा पर अत्यधिक भार या दुरुपयोगी ऑटोमेशन न करें।', 'एडमिन पेज, API, विश्लेषण या प्रमाणीकरण में अनधिकृत प्रवेश न करें।'] },
          { title: 'परिणाम और जिम्मेदारी', items: ['Toolkit उपयोगकर्ता इनपुट से परिणाम बनाता है, पर हर ब्राउज़र और फ़ॉर्मैट में पूर्ण संगतता की गारंटी नहीं देता।', 'एन्क्रिप्टेड, खराब, विशेष या बहुत बड़ी फ़ाइलें विफल हो सकती हैं।', 'कानून जहाँ न रोके, डाउनलोड किए गए परिणामों के अप्रत्यक्ष नुकसान के लिए ऑपरेटर जिम्मेदार नहीं है।'] }
        ]
      },
      security: {
        title: 'सुरक्षा',
        description: 'Toolkit फ़ाइल न्यूनतमकरण और इनपुट सत्यापन को मुख्य सुरक्षा सिद्धांत मानता है।',
        sections: [
          { title: 'क्लाइंट-साइड प्रोसेसिंग', items: ['PDF, इमेज, टेक्स्ट और वीडियो जहाँ संभव हो ब्राउज़र में चलते हैं।', 'स्थिर संस्करण में मूल फ़ाइल लेने वाला endpoint नहीं है।', 'डाउनलोड परिणाम उपयोगकर्ता के ब्राउज़र में बनते हैं।'] },
          { title: 'इनपुट सुरक्षा', items: ['प्रोसेसिंग से पहले PDF signature जांची जाती है।', 'एन्क्रिप्टेड PDF और scripts, auto actions, attachments, rich media या XFA वाले PDF रोके जाते हैं।', 'SVG और अन्य active image formats PDF merging से बाहर हैं।', 'इमेज decode, size-check और re-encode होकर source metadata हटाती हैं।'] },
          { title: 'ब्राउज़र और एडमिन सुरक्षा', items: ['CSP default रूप से external scripts और arbitrary network connections रोकता है।', 'एडमिन links public navigation में नहीं दिखते; direct address access चाहिए।', 'स्थानीय एडमिन lock production security boundary नहीं है; वास्तविक प्रशासन Worker या server identity से होना चाहिए।'] }
        ]
      }
    },
    ar: {
      about: {
        title: 'حول',
        description: 'Toolkit مجموعة أدوات PDF ونصوص ووسائط تعمل داخل المتصفح.',
        sections: [
          { title: 'الغرض', items: ['تساعد الخدمة في مهام المستندات والنصوص والوسائط المتكررة دون تثبيت تطبيق.', 'الأدوات الجاهزة تدمج PDF والصور، وتحسب الكلمات، وتستخرج إطارات الفيديو.', 'صممت الصفحة الرئيسية لحوالي 20 مكاناً للأدوات مع إمكانية التوسع لاحقاً.'] },
          { title: 'نموذج المعالجة', items: ['تعمل معالجة الملفات المدعومة داخل متصفح المستخدم كلما أمكن.', 'النسخة الثابتة لا ترفع الملفات الأصلية أو أسماء الملفات أو محتوى المستندات أو النصوص أو إطارات الفيديو إلى الخادم.', 'عند ربط التحليلات البعيدة، ترسل فقط أحداثاً مجمعة بعد الموافقة.'] },
          { title: 'مبادئ التشغيل', items: ['يجب أن يبقى التدفق بسيطاً ومباشراً وقابلاً للفحص.', 'يتم حظر تراكيب الملفات الخطرة والصيغ النشطة غير المدعومة قبل المعالجة.', 'ينبغي للمستخدم مراجعة المستندات المهمة بعد التنزيل.'] }
        ]
      },
      privacy: {
        title: 'سياسة الخصوصية',
        description: 'صمم Toolkit حول مبدأ عدم جمع الملفات الأصلية أو أسماء الملفات.',
        sections: [
          { title: 'بيانات لا نجمعها', items: ['النسخة الثابتة لا ترفع PDF أو الصور أو النصوص أو الفيديو إلى خادم المشغل.', 'لا يتم حفظ أسماء الملفات أو محتواها أو البيانات الشخصية داخل المستندات أو إطارات الفيديو لأغراض التحليل.', 'نشر GitHub Pages الافتراضي لا يحتوي على قاعدة بيانات مركزية لتحليلات المستخدمين.'] },
          { title: 'تخزين المتصفح', items: ['قد تحفظ تفضيلات اللغة والعدادات المحلية وموافقة التحليلات وبيانات قفل الإدارة المحلي في المتصفح.', 'تستخدم هذه البيانات لتجربة هذا المتصفح ويمكن حذفها من إعدادات بيانات الموقع.', 'تبقى حالة فتح الإدارة المحلية في التبويب الحالي فقط وتنتهي بعد 30 دقيقة.'] },
          { title: 'التحليلات والإعلانات الاختيارية', items: ['عند ربط Worker/D1، ترسل فقط الأحداث المجمعة التي وافق عليها المستخدم.', 'قد تحفظ تجزئات زائر يومية والمسار واللغة وحجم الشاشة ونوع المتصفح ورمز البلد.', 'عند تفعيل AdSense أو مزود إعلانات آخر، قد يستخدم ذلك المزود ملفات تعريف ارتباط أو تقنيات مشابهة وفق سياساته.'] },
          { title: 'الحقوق والاحتفاظ', items: ['تبقى البيانات المحلية حتى يحذف المستخدم بيانات الموقع أو يزيلها المتصفح.', 'يجب أن تحدد سياسة المشغل مدة الاحتفاظ بالبيانات المجمعة عند تفعيل الخلفية.', 'يمكن إرسال أسئلة الخصوصية أو طلبات الحذف إلى بريد التواصل.'] }
        ]
      },
      terms: {
        title: 'شروط الاستخدام',
        description: 'تصف هذه الشروط القواعد الأساسية لاستخدام أدوات Toolkit على الويب.',
        sections: [
          { title: 'نطاق الخدمة', items: ['يوفر Toolkit أدوات متصفح لمهام PDF والنصوص والوسائط.', 'قد تكون الخدمة مجانية وقد تتضمن لاحقاً إعلانات أو ميزات مدفوعة أو شراكات.', 'قد تتغير الميزات والصيغ المدعومة والحدود والواجهات لأسباب أمنية أو تشغيلية.'] },
          { title: 'مسؤولية المستخدم', items: ['يجب على المستخدم معالجة الملفات والنصوص التي يملك حق استخدامها فقط.', 'تبقى مسؤولية البيانات الحساسة والأسرار التجارية والمعلومات الشخصية والمواد المحمية على المستخدم.', 'ينبغي مراجعة الملفات المهمة أو القانونية أو التعاقدية أو ملفات التقديم قبل استخدامها.'] },
          { title: 'الاستخدام المحظور', items: ['لا تستخدم الخدمة لمعالجة أو توزيع برمجيات خبيثة أو محتوى غير قانوني أو مواد تنتهك حقوق الآخرين.', 'لا تحاول تجاوز ضوابط الأمان أو تحميل الخدمة بشكل مفرط أو أتمتة حركة مسيئة.', 'لا تحاول الوصول غير المصرح به إلى صفحات الإدارة أو API أو التحليلات أو أنظمة المصادقة.'] },
          { title: 'النتائج والمسؤولية', items: ['ينشئ Toolkit النتائج من مدخلات المستخدم لكنه لا يضمن توافقاً كاملاً في كل المتصفحات والصيغ.', 'قد تفشل الملفات المشفرة أو التالفة أو الخاصة أو الكبيرة جداً.', 'ما لم يمنع القانون ذلك، لا يتحمل المشغل مسؤولية الخسائر غير المباشرة من استخدام النتائج المنزلة.'] }
        ]
      },
      security: {
        title: 'الأمان',
        description: 'يعامل Toolkit تقليل الملفات والتحقق من المدخلات كمبادئ أمان أساسية.',
        sections: [
          { title: 'المعالجة في المتصفح', items: ['تعمل مهام PDF والصور والنصوص والفيديو في المتصفح كلما أمكن.', 'النسخة الثابتة لا تحتوي على نقطة استقبال للملفات الأصلية.', 'يتم إنشاء نتائج التنزيل داخل متصفح المستخدم.'] },
          { title: 'دفاعات الإدخال', items: ['يتم فحص توقيع PDF قبل المعالجة.', 'يتم حظر ملفات PDF المشفرة أو التي تحتوي على scripts أو auto actions أو attachments أو rich media أو XFA.', 'يتم استبعاد SVG والصيغ النشطة الأخرى من دمج PDF.', 'يتم فك ترميز الصور وفحص حجمها وإعادة ترميزها لإزالة بيانات المصدر الوصفية.'] },
          { title: 'حماية المتصفح والإدارة', items: ['تحظر CSP افتراضياً السكربتات الخارجية والاتصالات الشبكية غير المحددة.', 'لا تظهر روابط الإدارة في التنقل العام؛ يلزم الوصول بالعنوان المباشر.', 'قفل الإدارة المحلي ليس حاجز أمان إنتاجي؛ يجب أن تستخدم الإدارة الفعلية Worker أو هوية خادم.'] }
        ]
      }
    }
  };

  const state = {
    lang: readInitialLang(),
    route: readRoute(),
    pdfItems: [],
    pdfOutputName: 'merged.pdf',
    wordText: '',
    wordSettings: { includeSpaces: true, readingWpm: 250 },
    video: { file: null, url: '', duration: 0, interval: 5, maxFrames: 12, frames: [] },
    homeCategory: 'all',
    filenameResolver: null,
    adminToken: sessionStorage.getItem(ADMIN_TOKEN_KEY) || '',
    analyticsConsent: localStorage.getItem(CONSENT_KEY) || ''
  };

  const $ = selector => document.querySelector(selector);
  const workspace = $('#workspace');
  const settingsPanel = $('#settingsPanel');

  function getBasePath() {
    const marker = '/pdf-image-merger/';
    if (location.pathname.includes(marker)) return marker;
    return '/';
  }

  function normalizeBasePath(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
  }

  function resolveRuntimeBasePath(configBasePath) {
    if (!configBasePath || configBasePath === '/') return configBasePath || getBasePath();
    if (location.origin === SITE_ORIGIN && location.pathname.startsWith(configBasePath)) return configBasePath;
    return getBasePath();
  }

  function normalizeSiteOrigin(value) {
    const raw = String(value || '').trim().replace(/\/+$/g, '');
    if (!raw) return '';
    try {
      return new URL(raw).origin;
    } catch {
      console.warn('Invalid siteOrigin ignored');
      return '';
    }
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

  function normalizeAdsConfig(value) {
    const raw = value && typeof value === 'object' ? value : {};
    const slots = raw.slots && typeof raw.slots === 'object' ? raw.slots : {};
    const clean = input => String(input || '').trim();
    return {
      provider: clean(raw.provider).toLowerCase(),
      client: clean(raw.client),
      slots: {
        leftRail: clean(slots.leftRail || slots['left-rail']),
        settingsRail: clean(slots.settingsRail || slots['settings-rail']),
        footer: clean(slots.footer)
      }
    };
  }

  function normalizeAdPlacement(value) {
    const key = String(value || '')
      .trim()
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return ['leftRail', 'settingsRail', 'footer'].includes(key) ? key : 'settingsRail';
  }

  function adPlacementAttr(value) {
    return normalizeAdPlacement(value).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }

  function hasConfiguredAds() {
    return ADS_CONFIG.provider === 'adsense' && /^ca-pub-\d{10,30}$/.test(ADS_CONFIG.client);
  }

  function adSlotId(placement) {
    return ADS_CONFIG.slots[normalizeAdPlacement(placement)] || '';
  }

  function hasConfiguredAdSlot(placement) {
    return hasConfiguredAds() && /^\d{5,30}$/.test(adSlotId(placement));
  }

  function hasAnalyticsBackend() {
    return Boolean(API_BASE_URL);
  }

  function hasAnalyticsConsent() {
    return state.analyticsConsent === 'granted';
  }

  function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
  }

  function normalizeLang(value) {
    const code = String(value || '').trim().toLowerCase().replace('_', '-').split('-')[0];
    return supportedLanguages.has(code) ? code : '';
  }

  function readUrlLang() {
    return normalizeLang(new URLSearchParams(location.search).get('lang'));
  }

  function readInitialLang() {
    const browserLang = normalizeLang((navigator.languages && navigator.languages[0]) || navigator.language);
    return readUrlLang()
      || normalizeLang(localStorage.getItem('toolkitLang'))
      || browserLang
      || DEFAULT_LANG;
  }

  function languageQuery(lang = state.lang) {
    const code = normalizeLang(lang);
    return code && code !== DEFAULT_LANG ? `?lang=${encodeURIComponent(code)}` : '';
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
    return `${BASE_PATH}${path}${languageQuery()}`;
  }

  function absoluteRouteUrl(route, lang = state.lang) {
    const path = routePaths[route] ?? routePaths.pdf;
    return `${SITE_ROOT_URL}${path}${languageQuery(lang)}`;
  }

  function t(key) {
    const candidates = [
      i18n[state.lang] && i18n[state.lang][key],
      localized[state.lang] && localized[state.lang][key],
      uiTranslations[state.lang] && uiTranslations[state.lang][key],
      fallback[key],
      i18n.ko[key]
    ];
    return candidates.find(value => typeof value === 'string' && value) || key;
  }

  function categoryLabel(category) {
    return (categoryTranslations[state.lang] && categoryTranslations[state.lang][category])
      || (categoryTranslations.en && categoryTranslations.en[category])
      || (categoryTranslations.ko && categoryTranslations.ko[category])
      || category;
  }

  function toolText(tool) {
    const entry = (toolTranslations[state.lang] && toolTranslations[state.lang][tool.key])
      || (toolTranslations.en && toolTranslations.en[tool.key])
      || (toolTranslations.ko && toolTranslations.ko[tool.key])
      || [tool.key, ''];
    return { title: entry[0], desc: entry[1] };
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

  function formatNumber(value) {
    return new Intl.NumberFormat(state.lang || DEFAULT_LANG).format(value);
  }

  function formatTemplate(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
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
    if (!hasAnalyticsConsent()) return;
    if (state.route === 'admin') return;
    const payload = JSON.stringify({
      consent: 'analytics',
      event: eventName,
      tool,
      route: state.route,
      lang: state.lang,
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
    if (`${location.pathname}${location.search}` !== nextUrl) history.pushState({ route: state.route, lang: state.lang }, '', nextUrl);
    render();
    track('route_open', state.route);
  }

  function setLanguage(lang) {
    const nextLang = normalizeLang(lang);
    if (!nextLang) return;
    state.lang = nextLang;
    localStorage.setItem('toolkitLang', state.lang);
    const nextUrl = routeUrl(state.route);
    if (`${location.pathname}${location.search}` !== nextUrl) history.replaceState({ route: state.route, lang: state.lang }, '', nextUrl);
    render();
    track('language_change', 'system');
  }

  function renderChrome() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    updateStaticAssetLinks();
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

  function updateStaticAssetLinks() {
    const manifest = document.querySelector('link[rel="manifest"]');
    const icon = document.querySelector('link[rel="icon"]');
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (manifest) manifest.setAttribute('href', `${BASE_PATH}manifest.webmanifest`);
    if (icon) icon.setAttribute('href', `${BASE_PATH}icons/icon-192.png`);
    if (appleIcon) appleIcon.setAttribute('href', `${BASE_PATH}icons/icon-180.png`);
  }

  function renderHeader(meta) {
    const title = state.route === 'home' ? `${t('homeTitle')} - ${t('brandSub')}` : `${meta.title} - ${t('brand')}`;
    document.title = title;
    const description = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (description) description.setAttribute('content', meta.description);
    if (canonical) canonical.setAttribute('href', absoluteRouteUrl(state.route));
    updateAlternateLanguageLinks();
    $('#toolEyebrow').textContent = meta.eyebrow;
    $('#toolTitle').textContent = meta.title;
    $('#toolDescription').textContent = meta.description;
    $('#noticeBand').textContent = t('localNotice');
  }

  function updateAlternateLanguageLinks() {
    document.querySelectorAll('link[data-language-alternate]').forEach(link => link.remove());
    const canonical = document.querySelector('link[rel="canonical"]');
    const target = canonical || document.querySelector('link[rel="manifest"]');
    const fragment = document.createDocumentFragment();
    for (const [code] of languages) {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = code;
      link.href = absoluteRouteUrl(state.route, code);
      link.dataset.languageAlternate = 'true';
      fragment.append(link);
    }
    const fallback = document.createElement('link');
    fallback.rel = 'alternate';
    fallback.hreflang = 'x-default';
    fallback.href = absoluteRouteUrl(state.route, DEFAULT_LANG);
    fallback.dataset.languageAlternate = 'true';
    fragment.append(fallback);
    if (target) target.after(fragment);
    else document.head.append(fragment);
  }

  function render() {
    renderChrome();
    if (state.route === 'home') renderHomePage();
    else if (state.route === 'word-count') renderWordTool();
    else if (state.route === 'video-extractor') renderVideoTool();
    else if (state.route === 'admin') renderAdminPage();
    else if (['about', 'privacy', 'terms', 'security'].includes(state.route)) renderLegalPage(state.route);
    else renderPdfTool();
    renderConsentBanner();
    refreshAdSlots();
  }

  function renderConsentBanner() {
    const existing = $('#consentBanner');
    if (!hasAnalyticsBackend() || state.analyticsConsent) {
      existing?.remove();
      return;
    }
    const banner = existing || document.createElement('section');
    banner.id = 'consentBanner';
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', t('analyticsConsentTitle'));
    banner.innerHTML = `
      <div>
        <strong>${escapeHtml(t('analyticsConsentTitle'))}</strong>
        <p>${escapeHtml(t('analyticsConsentDesc'))}</p>
      </div>
      <div class="consent-actions">
        <button class="button ghost" type="button" data-consent-choice="denied">${escapeHtml(t('declineAnalytics'))}</button>
        <button class="button primary" type="button" data-consent-choice="granted">${escapeHtml(t('acceptAnalytics'))}</button>
      </div>
    `;
    if (!existing) document.body.append(banner);
  }

  function setAnalyticsConsent(value) {
    state.analyticsConsent = value === 'granted' ? 'granted' : 'denied';
    localStorage.setItem(CONSENT_KEY, state.analyticsConsent);
    renderConsentBanner();
    showToast(state.analyticsConsent === 'granted' ? t('analyticsEnabled') : t('analyticsDisabled'));
    if (state.analyticsConsent === 'granted') track('analytics_consent_granted', 'system');
  }

  function privacyControlsHtml() {
    if (!hasAnalyticsBackend()) return '';
    const status = state.analyticsConsent === 'granted'
      ? t('analyticsEnabled')
      : state.analyticsConsent === 'denied'
        ? t('analyticsDisabled')
        : t('analyticsConsentDesc');
    return `
      <div class="setting-group privacy-control">
        <div class="setting-label">${escapeHtml(t('analyticsConsentTitle'))}</div>
        <p class="file-meta">${escapeHtml(status)}</p>
        <div class="button-row">
          <button class="button ghost" type="button" data-consent-choice="denied">${escapeHtml(t('declineAnalytics'))}</button>
          <button class="button primary" type="button" data-consent-choice="granted">${escapeHtml(t('acceptAnalytics'))}</button>
        </div>
      </div>
    `;
  }

  function renderAdSlot(placement, sizeLabel) {
    const slotKey = normalizeAdPlacement(placement);
    const className = slotKey === 'footer' ? 'footer-ad' : 'rail-ad';
    const configured = hasConfiguredAdSlot(slotKey);
    const detail = `${sizeLabel} · ${configured ? t('adConfigured') : t('adPending')}`;
    const adAttrs = configured
      ? ` data-ad-client="${escapeHtml(ADS_CONFIG.client)}" data-ad-unit="${escapeHtml(adSlotId(slotKey))}"`
      : '';
    return `
      <div class="${className} ${configured ? 'is-configured' : 'is-placeholder'}" aria-label="${escapeHtml(t('adLabel'))}" data-ad-slot="${escapeHtml(adPlacementAttr(slotKey))}" data-ad-size="${escapeHtml(sizeLabel)}" data-ad-provider="${configured ? 'adsense' : 'none'}"${adAttrs}>
        <span>${escapeHtml(t('adLabel'))}</span>
        <small>${escapeHtml(detail)}</small>
      </div>
    `;
  }

  function refreshAdSlots() {
    document.querySelectorAll('[data-ad-slot]').forEach(slot => {
      const placement = slot.dataset.adSlot || 'settings-rail';
      const size = slot.dataset.adSize || (normalizeAdPlacement(placement) === 'footer' ? '970x90' : '300x250');
      slot.outerHTML = renderAdSlot(placement, size);
    });
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
          <div class="category-tabs" id="categoryTabs" aria-label="${escapeHtml(t('allTools'))}">
            ${categories.map(category => `<button class="category-tab ${state.homeCategory === category ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(categoryLabel(category))}</button>`).join('')}
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
      return `<div class="mini-stat"><span>${escapeHtml(categoryLabel(category))}</span><strong>${ready}/${total}</strong></div>`;
    }).join('');
    settingsPanel.innerHTML = `
      <h2>${t('settings')}</h2>
      <div class="setting-group">
        <div class="setting-label">${t('availableNow')}</div>
        <div class="mini-stat-grid">
          <div class="mini-stat"><span>${escapeHtml(categoryLabel('all'))}</span><strong>${readyCount}/${toolCatalog.length}</strong></div>
          ${categoryCounts}
        </div>
      </div>
      ${renderAdSlot('settingsRail', '300x250')}
    `;
    bindHomeEvents();
  }

  function renderToolCard(tool) {
    const disabled = tool.status !== 'ready';
    const text = toolText(tool);
    return `<button class="tool-card ${disabled ? 'is-planned' : 'is-ready'}" type="button" ${disabled ? 'disabled' : `data-route="${tool.route}"`}>
      <span class="tool-symbol">${escapeHtml(tool.symbol)}</span>
      <span class="tool-card-body">
        <strong>${escapeHtml(text.title)}</strong>
        <small>${escapeHtml(text.desc)}</small>
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
                <p>PDF, PNG, JPG, WebP, GIF, BMP · max ${formatSize(MAX_PDF_OR_IMAGE_SIZE)} each · ${t('totalLimitLabel')} ${formatSize(MAX_TOTAL_PDF_INPUT_SIZE)}</p>
              </div>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">${state.pdfItems.length} ${t('fileCount')}</h2>
              <p class="file-meta">${formatSize(currentPdfInputBytes())} / ${formatSize(MAX_TOTAL_PDF_INPUT_SIZE)}</p>
            </div>
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
          <div class="file-meta">${item.kind.toUpperCase()} · ${item.pages} ${t('pageUnit')} · ${formatSize(item.size)}</div>
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
        <div class="setting-label">${t('securityGuardrails')}</div>
        <label class="check-row"><input type="checkbox" checked disabled> ${t('guardClientSide')}</label>
        <label class="check-row"><input type="checkbox" checked disabled> ${t('guardFileValidation')}</label>
        <label class="check-row"><input type="checkbox" checked disabled> ${t('guardTotalInputLimit')} (${formatSize(MAX_TOTAL_PDF_INPUT_SIZE)})</label>
        <label class="check-row"><input type="checkbox" checked disabled> ${t('guardImageMetadata')}</label>
        <label class="check-row"><input type="checkbox" checked disabled> ${t('guardNoFileAnalytics')}</label>
      </div>
      ${renderAdSlot('settingsRail', '300x250')}
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
        showToast(`${file.name}: ${t('unsupportedFile')}`, 'error');
        continue;
      }
      if (currentPdfInputBytes() + file.size > MAX_TOTAL_PDF_INPUT_SIZE) {
        showToast(`${file.name}: ${formatTemplate(t('totalInputLimitExceeded'), { size: formatSize(MAX_TOTAL_PDF_INPUT_SIZE) })}`, 'error');
        continue;
      }
      try {
        if (isPdf(file)) await addPdfFile(file);
        else await addImageFile(file);
      } catch (error) {
        if (!isExpectedFileRejection(error)) console.error(error);
        const message = pdfErrorMessage(error) || t('fileReadFailed');
        showToast(`${file.name}: ${message}`, 'error');
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

  function currentPdfInputBytes() {
    return state.pdfItems.reduce((total, item) => total + (item.size || 0), 0);
  }

  async function addPdfFile(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfSignature(data)) throw new Error('Invalid PDF signature');
    if (includesAscii(data, '/Encrypt')) throw new Error('encrypted_pdf');
    if (hasRiskyPdfFeatures(data)) throw new Error('unsafe_pdf');
    let pdf;
    try {
      pdf = await window.pdfjsLib.getDocument({ data: data.slice() }).promise;
    } catch (error) {
      if (String(error?.name || '').includes('Password') || String(error?.message || '').toLowerCase().includes('password')) {
        throw new Error('encrypted_pdf');
      }
      throw error;
    }
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
    const imageData = stripImageMetadataToPngBytes(info);
    URL.revokeObjectURL(previewUrl);
    state.pdfItems.push({
      id: uid(), kind: 'image', name: file.name, size: file.size, pages: 1,
      imageData, imageKind: 'png', width: info.naturalWidth, height: info.naturalHeight
    });
  }

  function hasPdfSignature(bytes) {
    return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }

  function hasRiskyPdfFeatures(bytes) {
    return PDF_RISKY_MARKERS.some(marker => includesAsciiInsensitive(bytes, marker));
  }

  function pdfErrorMessage(error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('encrypted_pdf') || message.includes('encrypt') || message.includes('password')) return t('encryptedPdfBlocked');
    if (message.includes('unsafe_pdf')) return t('unsafePdfBlocked');
    return '';
  }

  function isExpectedFileRejection(error) {
    return Boolean(pdfErrorMessage(error));
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

  async function hasAllowedVideoSignature(file) {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    return Boolean(detectVideoKind(head));
  }

  function detectVideoKind(bytes) {
    if (startsWithAscii(bytes, 'OggS')) return 'ogg';
    if (startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm';
    if (asciiAt(bytes, 4, 8) === 'ftyp') return 'mp4';
    return '';
  }

  async function mergePdfItems() {
    if (!state.pdfItems.length) return;
    const name = await requestFileName(state.pdfOutputName || 'merged.pdf');
    if (!name) return;
    try {
      showToast(t('creatingPdf'));
      const merged = await window.PDFLib.PDFDocument.create();
      for (const item of state.pdfItems) {
        if (item.kind === 'pdf') {
          const src = await window.PDFLib.PDFDocument.load(item.data);
          const copied = await merged.copyPages(src, src.getPageIndices());
          copied.forEach(page => merged.addPage(page));
        } else {
          await addImagePage(merged, item);
        }
      }
      const bytes = await merged.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), normalizeFileName(name));
      track('pdf_download', 'pdf');
      showToast(t('pdfCreated'));
    } catch (error) {
      console.error(error);
      const message = pdfErrorMessage(error) || t('pdfCreationFailed');
      showToast(message, 'error');
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
            <button class="button" id="copyTextStats" type="button">${t('copyStats')}</button>
            <button class="button ghost" id="clearText" type="button">${t('clear')}</button>
          </div>
        </div>
        <div class="panel-body">
          <textarea class="textarea" id="wordText" maxlength="${MAX_TEXT_CHARS}" placeholder="${t('pasteText')}">${escapeHtml(state.wordText)}</textarea>
        </div>
      </section>
      <section class="panel">
        <div class="panel-body stats-grid">
          ${statBox(t('chars'), metrics.chars)}
          ${statBox(t('charsNoSpace'), metrics.noSpace)}
          ${statBox(t('words'), metrics.words)}
          ${statBox(t('sentences'), metrics.sentences)}
          ${statBox(t('paragraphs'), metrics.paragraphs)}
          ${statBox(t('reading'), `${metrics.readingMinutes} ${t('minutesShort')}`)}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2 class="panel-title">${t('keywords')}</h2></div>
        <div class="panel-body">${metrics.keywords.length ? metrics.keywords.map(([word, count]) => `<span class="button ghost">${escapeHtml(word)} · ${count}</span>`).join(' ') : `<p class="file-meta">${t('noKeywords')}</p>`}</div>
      </section>
    `;
    renderWordSettings();
    $('#wordText').addEventListener('input', e => {
      const nextText = normalizeWordText(e.target.value);
      state.wordText = nextText.text;
      if (nextText.truncated) {
        showToast(formatTemplate(t('textLimitExceeded'), { count: formatNumber(MAX_TEXT_CHARS) }), 'warn');
      }
      renderWordTool();
      $('#wordText').focus();
    });
    $('#clearText').addEventListener('click', () => { state.wordText = ''; renderWordTool(); track('word_clear', 'word'); });
    $('#copyTextStats').addEventListener('click', () => {
      navigator.clipboard?.writeText(JSON.stringify(metrics, null, 2));
      track('word_copy_stats', 'word');
      showToast(t('statsCopied'));
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

  function normalizeWordText(text) {
    const value = String(text || '');
    if (value.length <= MAX_TEXT_CHARS) return { text: value, truncated: false };
    return { text: value.slice(0, MAX_TEXT_CHARS), truncated: true };
  }

  function renderWordSettings() {
    settingsPanel.innerHTML = `
      <h2>${t('settings')}</h2>
      <div class="setting-group">
        <label class="setting-label" for="readingWpm">${t('readingSpeed')}</label>
        <input class="input" id="readingWpm" type="number" min="120" max="800" value="${state.wordSettings.readingWpm}">
        <p class="file-meta">${formatTemplate(t('textLimitLabel'), { count: formatNumber(MAX_TEXT_CHARS) })}</p>
      </div>
      ${renderAdSlot('settingsRail', '300x250')}
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
    if (!state.video.frames.length) return `<p class="file-meta">${t('noFrames')}</p>`;
    return state.video.frames.map((frame, index) => `
      <article class="frame-card">
        <img src="${frame.url}" alt="frame ${index + 1}">
        <footer><span>${frame.time.toFixed(2)}s</span><a class="button" href="${frame.url}" download="frame-${index + 1}.png">${t('download')}</a></footer>
      </article>
    `).join('');
  }

  function renderVideoSettings() {
    settingsPanel.innerHTML = `
      <h2>${t('settings')}</h2>
      <div class="setting-group">
        <label class="setting-label" for="frameInterval">${t('frameInterval')}</label>
        <input class="input" id="frameInterval" type="number" min="1" max="60" value="${state.video.interval}">
      </div>
      <div class="setting-group">
        <label class="setting-label" for="maxFrames">${t('maxFrames')}</label>
        <input class="input" id="maxFrames" type="number" min="1" max="${MAX_FRAMES}" value="${state.video.maxFrames}">
      </div>
      ${renderAdSlot('settingsRail', '300x250')}
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

  async function handleVideoFile(file) {
    if (!file) return;
    const typeOk = ALLOWED_VIDEO_TYPES.has(file.type);
    const extOk = VIDEO_EXT_RE.test(file.name);
    if (!file.size || file.size > MAX_VIDEO_SIZE || (!typeOk && !extOk)) {
      showToast(t('videoUnsupported'), 'error');
      return;
    }
    try {
      if (!await hasAllowedVideoSignature(file)) {
        showToast(t('videoUnsupported'), 'error');
        return;
      }
    } catch {
      showToast(t('fileReadFailed'), 'error');
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
    const meta = legalMetaContent();
    renderHeader({ eyebrow: 'Docs', title: content.title, description: content.description });
    workspace.innerHTML = `<section class="panel legal-page"><div class="panel-body">
      <h2>${escapeHtml(content.title)}</h2>
      <p class="legal-lead">${escapeHtml(content.description)}</p>
      ${content.sections.map(section => `<section class="legal-section"><h3>${escapeHtml(section.title)}</h3><ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`).join('')}
      <section class="legal-section"><h3>${escapeHtml(meta.title)}</h3><ul><li>${escapeHtml(meta.contact)}: apobi812@gmail.com</li><li>${escapeHtml(meta.updated)}: 2026-06-29</li></ul></section>
    </div></section>`;
    settingsPanel.innerHTML = `<h2>${t('settings')}</h2>${privacyControlsHtml()}${renderAdSlot('settingsRail', '300x250')}`;
  }

  function legalContent() {
    if (state.lang !== DEFAULT_LANG && legalTranslations[state.lang]) return legalTranslations[state.lang];
    return {
      about: {
        title: '소개',
        description: '툴킷은 PDF 관리, 글자수 세기, 동영상 프레임 추출을 제공하는 브라우저 기반 도구 모음입니다.',
        sections: [
          { title: '서비스 목적', items: ['반복적인 문서·텍스트·미디어 작업을 설치 없이 빠르게 처리할 수 있도록 돕습니다.', '현재 제공 기능은 PDF와 이미지 병합, 글자수·단어수 계산, 동영상 프레임 추출입니다.', '홈 화면은 약 20개 내외의 도구를 담을 수 있는 구조로 설계되어 향후 기능 확장이 가능합니다.'] },
          { title: '처리 방식', items: ['가능한 작업은 사용자의 브라우저 안에서 실행되며 원본 파일을 서버로 업로드하지 않습니다.', '서버형 분석을 연결하더라도 파일명, 파일 내용, 원본 문서, 원본 동영상은 수집하지 않습니다.', '원격 분석은 API 연결 후에도 사용자가 동의한 경우에만 전송됩니다.', '광고 영역은 운영비를 충당하기 위한 위치이며 실제 광고 코드는 AdSense 승인 이후 별도로 연결합니다.'] },
          { title: '운영 원칙', items: ['기능은 단순하고 명확한 작업 흐름을 우선합니다.', '보안상 위험한 파일 형식은 허용하지 않고, 처리 가능한 형식도 크기와 시그니처를 확인합니다.', '중요한 업무 문서는 결과물을 다운로드한 뒤 사용자가 직접 검수해야 합니다.'] }
        ]
      },
      privacy: {
        title: '개인정보처리방침',
        description: '툴킷은 파일 처리 도구의 특성을 고려해 파일 원본과 파일명을 수집하지 않는 것을 기본 원칙으로 합니다.',
        sections: [
          { title: '수집하지 않는 정보', items: ['PDF, 이미지, 텍스트, 동영상 원본 파일은 서버로 업로드하지 않습니다.', '파일명, 파일 내용, 문서 안의 개인정보, 영상 프레임 내용은 분석 목적으로 저장하지 않습니다.', '기본 GitHub Pages 정적 배포 상태에서는 전체 사용자 분석 데이터베이스가 존재하지 않습니다.'] },
          { title: '브라우저 안에 저장되는 정보', items: ['언어 선택, 로컬 사용 횟수, 로컬 관리자 잠금 설정은 사용자의 브라우저 localStorage 또는 sessionStorage에 저장될 수 있습니다.', '이 정보는 같은 브라우저의 사용자 경험을 유지하기 위한 것이며, 정적 배포 상태에서는 운영자 서버로 전송되지 않습니다.', '사용자는 브라우저 사이트 데이터 삭제 기능으로 이 정보를 삭제할 수 있습니다.'] },
          { title: '서버형 분석 연결 시 수집될 수 있는 정보', items: ['Cloudflare Worker + D1 백엔드를 연결해도 원격 분석은 사용자가 동의한 뒤에만 전송됩니다.', '동의한 경우 이벤트명, 도구명, 경로, 언어, 화면 크기, 브라우저 계열, Cloudflare 국가 코드, 일별 방문자 해시가 저장될 수 있습니다.', '방문자 해시는 원 IP를 저장하지 않고 일 단위로 회전하도록 설계되어 장기 추적을 줄입니다.', '수집 목적은 접속자 수, 기능 사용 횟수, 국가·언어별 사용 통계를 확인하고 서비스를 개선하기 위한 것입니다.'] },
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
          { title: '파일 입력 방어', items: ['PDF는 실제 PDF 시그니처를 확인한 뒤 처리합니다.', '암호화된 PDF와 JavaScript, 자동 실행, 첨부파일, 리치 미디어 같은 위험 구조가 보이는 PDF는 처리하지 않습니다.', '이미지는 PNG, JPG, WebP, GIF, BMP 등 허용 형식만 받고 SVG 같은 능동 콘텐츠 가능성이 있는 형식은 병합 대상에서 제외합니다.', '이미지는 디코딩 후 픽셀 수 제한을 적용해 과도한 메모리 사용을 줄입니다.', '동영상은 MP4, MOV, WebM, OGG 계열의 일반 브라우저 지원 형식으로 제한합니다.'] },
          { title: '브라우저 보안 정책', items: ['Content Security Policy를 적용해 외부 스크립트와 임의 네트워크 연결을 기본 차단합니다.', 'object-src를 차단하고, 지원 호스팅에서는 HTTP 보안 헤더로 frame-ancestors와 X-Frame-Options를 적용합니다.', 'GitHub Pages처럼 보안 헤더를 직접 적용하기 어려운 환경에서는 앱 시작 시 프레임 안 실행을 감지해 탈출하거나 화면을 숨깁니다.', '서비스워커는 앱 셸 캐시를 관리하되 설정 파일과 내비게이션은 새 버전을 우선 확인하도록 설계했습니다.'] },
          { title: '관리자와 분석 보안', items: ['화면에서 관리자 링크를 노출하지 않고, 관리자는 직접 주소를 알고 접근하는 방식으로 분리합니다.', '정적 배포의 로컬 관리자 잠금은 운영 보안 경계가 아니며, 실제 운영용 관리는 Worker 백엔드의 서버 인증을 연결해야 합니다.', '서버형 분석은 사용자 동의가 있는 이벤트만 받으며, 파일명과 파일 내용을 저장하지 않고 집계 통계와 일별 방문자 해시만 저장하도록 설계했습니다.'] },
          { title: '남은 운영 과제', items: ['도메인 연결 후에는 HTTPS, 보안 헤더, 관리자 비밀번호 정책, 백업, 로그 보관 기간을 운영 정책으로 확정해야 합니다.', '광고와 쿠키 기반 분석을 붙이면 동의 배너와 개인정보 고지를 보강해야 합니다.', '법적 문서는 실제 운영 주체, 국가, 수익 귀속 구조에 맞춰 법무·세무 검토가 필요합니다.'] }
        ]
      }
    };
  }

  function legalMetaContent() {
    return legalMetaTranslations[state.lang] || legalMetaTranslations.en;
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
    } else if (!hasLocalAdminUnlock()) {
      workspace.innerHTML = renderAdminLogin();
    } else {
      workspace.innerHTML = renderAdminDashboard();
    }
    settingsPanel.innerHTML = `<h2>${t('settings')}</h2><p class="file-meta">Local admin unlock expires after 30 minutes. Production admin auth should move to Cloudflare Access, GitHub OAuth, or another server-side identity layer.</p>`;
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
    return `<section class="panel admin-lock"><div class="panel-body"><h2>Admin unlock</h2><p class="file-meta">Unlock lasts for 30 minutes in this browser tab.</p><input class="input" id="adminPass" type="password" autocomplete="current-password"><button class="button primary" id="unlockAdmin" type="button">Unlock</button></div></section>`;
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
      <div class="panel"><div class="panel-header"><h2 class="panel-title">Local event counters</h2><div class="button-row"><button class="button" id="exportStats">Export</button><button class="button" id="lockLocalAdmin">Lock</button><button class="button danger" id="resetStats">Reset</button></div></div><div class="panel-body"><table class="data-table"><thead><tr><th>Event</th><th>Count</th></tr></thead><tbody>${rows || '<tr><td colspan="2">No events yet</td></tr>'}</tbody></table></div></div>
    </section>`;
  }

  function bindAdminEvents() {
    const setButton = $('#setAdminPass');
    const unlockButton = $('#unlockAdmin');
    $('#exportStats')?.addEventListener('click', () => downloadBlob(new Blob([JSON.stringify(loadStats(), null, 2)], { type: 'application/json' }), 'toolkit-local-stats.json'));
    $('#resetStats')?.addEventListener('click', () => { localStorage.removeItem(STORE_KEY); renderAdminPage(); });
    $('#lockLocalAdmin')?.addEventListener('click', () => {
      clearLocalAdminUnlock();
      renderAdminPage();
    });
    setButton?.addEventListener('click', async () => {
      await setAdminPass($('#adminPass').value);
      renderAdminPage();
    });
    unlockButton?.addEventListener('click', async () => {
      if (await verifyAdminPass($('#adminPass').value)) {
        setLocalAdminUnlock();
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

  function hasLocalAdminUnlock(now = Date.now()) {
    const unlockedAt = Number(sessionStorage.getItem(ADMIN_UNLOCK_KEY) || 0);
    if (unlockedAt && now - unlockedAt <= ADMIN_UNLOCK_MS) return true;
    clearLocalAdminUnlock();
    return false;
  }

  function setLocalAdminUnlock(now = Date.now()) {
    sessionStorage.setItem(ADMIN_UNLOCK_KEY, String(now));
  }

  function clearLocalAdminUnlock() {
    sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
  }

  function getAdminConfig() {
    try { return JSON.parse(localStorage.getItem(ADMIN_KEY)); } catch { return null; }
  }

  async function setAdminPass(pass) {
    if (!pass || pass.length < 10) {
      showToast('Use at least 10 characters', 'error');
      return;
    }
    await saveAdminPass(pass);
    showToast('Admin lock created');
  }

  async function verifyAdminPass(pass) {
    const cfg = getAdminConfig();
    if (!cfg || !pass) return false;
    if (cfg.kdf === 'pbkdf2-sha256') {
      const hash = await pbkdf2Sha256(pass, cfg.salt, cfg.iterations || ADMIN_PBKDF2_ITERATIONS);
      return timingSafeStringEqual(hash, cfg.hash);
    }

    const legacyOk = cfg.salt && cfg.hash && timingSafeStringEqual(await sha256(`${cfg.salt}:${pass}`), cfg.hash);
    if (legacyOk) await saveAdminPass(pass);
    return legacyOk;
  }

  async function saveAdminPass(pass) {
    const salt = randomHex(16);
    const hash = await pbkdf2Sha256(pass, salt, ADMIN_PBKDF2_ITERATIONS);
    localStorage.setItem(ADMIN_KEY, JSON.stringify({
      kdf: 'pbkdf2-sha256',
      iterations: ADMIN_PBKDF2_ITERATIONS,
      salt,
      hash
    }));
  }

  async function pbkdf2Sha256(pass, saltHex, iterations) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pass),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return hex(new Uint8Array(bits));
  }

  async function sha256(text) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return hex(new Uint8Array(bytes));
  }

  function randomHex(byteLength) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return hex(bytes);
  }

  function hexToBytes(value) {
    const clean = String(value || '').replace(/[^a-f0-9]/gi, '');
    const bytes = new Uint8Array(Math.floor(clean.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  function timingSafeStringEqual(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    if (!left || !right) return false;
    let mismatch = left.length ^ right.length;
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i++) {
      mismatch |= left.charCodeAt(i % left.length) ^ right.charCodeAt(i % right.length);
    }
    return mismatch === 0;
  }

  function hex(bytes) {
    return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
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
    const safe = String(name || '').trim().replace(/[\\/:*?"<>|]+/g, '-').trim() || 'download';
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

  function includesAscii(bytes, text) {
    const needle = [...text].map(char => char.charCodeAt(0));
    if (!needle.length || bytes.length < needle.length) return false;
    for (let i = 0; i <= bytes.length - needle.length; i++) {
      let matched = true;
      for (let j = 0; j < needle.length; j++) {
        if (bytes[i + j] !== needle[j]) {
          matched = false;
          break;
        }
      }
      if (matched) return true;
    }
    return false;
  }

  function includesAsciiInsensitive(bytes, text) {
    const needle = [...text].map(char => char.toLowerCase().charCodeAt(0));
    if (!needle.length || bytes.length < needle.length) return false;
    for (let i = 0; i <= bytes.length - needle.length; i++) {
      let matched = true;
      for (let j = 0; j < needle.length; j++) {
        const code = bytes[i + j];
        const normalized = code >= 0x41 && code <= 0x5a ? code + 0x20 : code;
        if (normalized !== needle[j]) {
          matched = false;
          break;
        }
      }
      if (matched) return true;
    }
    return false;
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

  function stripImageMetadataToPngBytes(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
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
      setLanguage(button.dataset.lang);
    });
    document.querySelector('.footer-links').addEventListener('click', e => {
      const button = e.target.closest('[data-page]');
      if (button) setRoute(button.dataset.page);
    });
    document.addEventListener('click', e => {
      const button = e.target.closest('[data-consent-choice]');
      if (button) setAnalyticsConsent(button.dataset.consentChoice);
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
      state.lang = readInitialLang();
      localStorage.setItem('toolkitLang', state.lang);
      render();
    });
  }

  bindGlobalEvents();
  state.route = readRoute();
  render();
  track('app_open', state.route);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=20260629-filename-guard', { updateViaCache: 'none' })
        .then(registration => registration.update())
        .catch(error => console.warn('Service worker registration failed:', error));
    });
  }
})();
