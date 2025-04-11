// Internationalization utility file
import { createContext, useContext } from 'react';

export interface LanguageOption {
  name: string;
  code: string;
  flag: string;
}

export const languages: LanguageOption[] = [
  { name: 'English', code: 'en', flag: '🇺🇸' },
  { name: '한국어', code: 'ko', flag: '🇰🇷' },
  { name: '日本語', code: 'ja', flag: '🇯🇵' },
  { name: '中文', code: 'zh', flag: '🇨🇳' },
  { name: 'Español', code: 'es', flag: '🇪🇸' },
  { name: 'Français', code: 'fr', flag: '🇫🇷' },
];

// Define the translation keys type
export type TranslationKey = 
  | 'slotKing'
  | 'cancel'
  | 'confirm'
  | 'delete'
  | 'submit'
  | 'save'
  | 'copy'
  | 'settings'
  | 'noSlotsSelected'
  | 'pleaseSelectSlot'
  | 'createMeeting'
  | 'meetingTitle'
  | 'yourName'
  | 'startDate'
  | 'endDate'
  | 'startTime'
  | 'endTime'
  | 'timeSlotDuration'
  | 'createNewMeeting'
  | 'meetingDetails'
  | 'scheduleMeeting'
  | 'weeklyView'
  | 'gridView'
  | 'participants'
  | 'copyLink'
  | 'shareLink'
  | 'organizedBy'
  | 'tapAvailability'
  | 'joinMeeting'
  | 'enterYourName'
  | 'join'
  | 'available'
  | 'unavailable'
  | 'submitAvailability'
  | 'availabilitySubmitted'
  | 'failedToSubmit'
  | 'privacy'
  | 'terms'
  | 'contact'
  | 'scheduleCreated'
  | 'shareToCollectVotes'
  | 'generateQRCode'
  | 'hideQRCode'
  | 'copied'
  | 'share'
  | 'close'
  | 'linkCopiedToClipboard';

// Define translations for the app
export const translations = {
  en: {
    // General
    slotKing: 'SlotKing',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    submit: 'Submit',
    save: 'Save',
    copy: 'Copy',
    settings: 'Settings',
    privacy: 'Privacy',
    terms: 'Terms',
    contact: 'Contact',
    noSlotsSelected: 'No time slots selected',
    pleaseSelectSlot: 'Please select at least one time slot when you\'re available.',
    
    // Meeting creation
    createMeeting: 'Create Meeting',
    meetingTitle: 'Meeting Title',
    yourName: 'Your Name',
    startDate: 'Start Date',
    endDate: 'End Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    timeSlotDuration: 'Time Slot Duration',
    createNewMeeting: 'Create New Meeting',
    meetingDetails: 'Meeting Details',
    
    // Meeting view
    scheduleMeeting: 'Schedule Meeting',
    weeklyView: 'Weekly View',
    gridView: 'Grid View',
    participants: 'Participants',
    copyLink: 'Copy Link',
    shareLink: 'Share link',
    organizedBy: 'Organized by',
    tapAvailability: 'Tap the time slots when you\'re available. Your icon will appear next to the organizer\'s crown.',
    
    // Join meeting
    joinMeeting: 'Join Meeting',
    enterYourName: 'Enter your name',
    join: 'Join',
    
    // Availability
    available: 'Available',
    unavailable: 'Unavailable',
    submitAvailability: 'Submit Availability',
    availabilitySubmitted: 'Availability submitted successfully!',
    failedToSubmit: 'Failed to submit availability. Please try again.',
    
    // Share Modal
    scheduleCreated: '🎉 Schedule Created!',
    shareToCollectVotes: 'Share this link to collect votes.',
    generateQRCode: 'Generate QR Code',
    hideQRCode: 'Hide QR Code',
    copied: 'Copied!',
    share: 'Share',
    close: 'Close',
    linkCopiedToClipboard: 'Link copied to clipboard!',
  },
  ko: {
    // General
    slotKing: '슬롯킹',
    cancel: '취소',
    confirm: '확인',
    delete: '삭제',
    submit: '제출',
    save: '저장',
    copy: '복사',
    settings: '설정',
    privacy: '개인정보',
    terms: '이용약관',
    contact: '문의하기',
    noSlotsSelected: '선택된 시간대가 없습니다',
    pleaseSelectSlot: '가능한 시간을 하나 이상 선택해주세요.',
    
    // Meeting creation
    createMeeting: '미팅 만들기',
    meetingTitle: '미팅 제목',
    yourName: '이름',
    startDate: '시작 날짜',
    endDate: '종료 날짜',
    startTime: '시작 시간',
    endTime: '종료 시간',
    timeSlotDuration: '시간 간격',
    createNewMeeting: '새 미팅 만들기',
    meetingDetails: '미팅 세부 정보',
    
    // Meeting view
    scheduleMeeting: '미팅 일정 잡기',
    weeklyView: '주간 보기',
    gridView: '그리드 보기',
    participants: '참가자',
    copyLink: '링크 복사',
    shareLink: '공유 링크',
    organizedBy: '주최자',
    tapAvailability: '가능한 시간대를 탭하세요. 주최자의 왕관 옆에 아이콘이 나타납니다.',
    
    // Join meeting
    joinMeeting: '미팅 참가하기',
    enterYourName: '이름을 입력하세요',
    join: '참가',
    
    // Availability
    available: '가능함',
    unavailable: '불가능함',
    submitAvailability: '가능 시간 제출',
    availabilitySubmitted: '가능한 시간이 성공적으로 제출되었습니다!',
    failedToSubmit: '가능 시간 제출에 실패했습니다. 다시 시도해주세요.',
    
    // Share Modal
    scheduleCreated: '🎉 일정이 생성되었습니다!',
    shareToCollectVotes: '링크를 공유하여 투표를 수집하세요.',
    generateQRCode: 'QR 코드 생성',
    hideQRCode: 'QR 코드 닫기',
    copied: '복사됨!',
    share: '공유하기',
    close: '닫기',
    linkCopiedToClipboard: '링크가 클립보드에 복사되었습니다!',
  },
  ja: {
    // General
    slotKing: 'スロットキング',
    cancel: 'キャンセル',
    confirm: '確認',
    delete: '削除',
    submit: '提出',
    save: '保存',
    copy: 'コピー',
    settings: '設定',
    privacy: 'プライバシー',
    terms: '利用規約',
    contact: 'お問い合わせ',
    noSlotsSelected: '時間枠が選択されていません',
    pleaseSelectSlot: '利用可能な時間枠を少なくとも1つ選択してください。',
    
    // Meeting creation
    createMeeting: 'ミーティングを作成',
    meetingTitle: 'ミーティングのタイトル',
    yourName: 'お名前',
    startDate: '開始日',
    endDate: '終了日',
    startTime: '開始時間',
    endTime: '終了時間',
    timeSlotDuration: '時間枠の間隔',
    createNewMeeting: '新しいミーティングを作成',
    meetingDetails: 'ミーティングの詳細',
    
    // Meeting view
    scheduleMeeting: 'ミーティングをスケジュール',
    weeklyView: '週間ビュー',
    gridView: 'グリッドビュー',
    participants: '参加者',
    copyLink: 'リンクをコピー',
    shareLink: '共有リンク',
    organizedBy: '主催者',
    tapAvailability: '利用可能な時間枠をタップしてください。主催者の王冠の横にあなたのアイコンが表示されます。',
    
    // Join meeting
    joinMeeting: 'ミーティングに参加',
    enterYourName: 'お名前を入力してください',
    join: '参加',
    
    // Availability
    available: '利用可能',
    unavailable: '利用不可',
    submitAvailability: '利用可能時間を提出',
    availabilitySubmitted: '利用可能時間が正常に提出されました！',
    failedToSubmit: '利用可能時間の提出に失敗しました。もう一度お試しください。',
    
    // Share Modal
    scheduleCreated: '🎉 スケジュールが作成されました！',
    shareToCollectVotes: '投票を集めるためにこのリンクを共有してください。',
    generateQRCode: 'QRコードを生成',
    hideQRCode: 'QRコードを隠す',
    copied: 'コピーしました！',
    share: '共有',
    close: '閉じる',
    linkCopiedToClipboard: 'リンクがクリップボードにコピーされました！',
  },
  zh: {
    // General
    slotKing: '时间王',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    submit: '提交',
    save: '保存',
    copy: '复制',
    settings: '设置',
    privacy: '隐私',
    terms: '条款',
    contact: '联系我们',
    noSlotsSelected: '未选择时间段',
    pleaseSelectSlot: '请至少选择一个您可用的时间段。',
    
    // Meeting creation
    createMeeting: '创建会议',
    meetingTitle: '会议标题',
    yourName: '您的姓名',
    startDate: '开始日期',
    endDate: '结束日期',
    startTime: '开始时间',
    endTime: '结束时间',
    timeSlotDuration: '时间段间隔',
    createNewMeeting: '创建新会议',
    meetingDetails: '会议详情',
    
    // Meeting view
    scheduleMeeting: '安排会议',
    weeklyView: '周视图',
    gridView: '网格视图',
    participants: '参与者',
    copyLink: '复制链接',
    shareLink: '分享链接',
    organizedBy: '组织者',
    tapAvailability: '点击您可用的时间段。您的图标将显示在组织者的皇冠旁边。',
    
    // Join meeting
    joinMeeting: '加入会议',
    enterYourName: '输入您的姓名',
    join: '加入',
    
    // Availability
    available: '可用',
    unavailable: '不可用',
    submitAvailability: '提交可用时间',
    availabilitySubmitted: '可用时间已成功提交！',
    failedToSubmit: '提交可用时间失败。请重试。',
    
    // Share Modal
    scheduleCreated: '🎉 日程已创建！',
    shareToCollectVotes: '分享此链接以收集投票。',
    generateQRCode: '生成二维码',
    hideQRCode: '隐藏二维码',
    copied: '已复制！',
    share: '分享',
    close: '关闭',
    linkCopiedToClipboard: '链接已复制到剪贴板！',
  },
  es: {
    // General
    slotKing: 'ReyDeSlot',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    submit: 'Enviar',
    save: 'Guardar',
    copy: 'Copiar',
    settings: 'Configuración',
    privacy: 'Privacidad',
    terms: 'Términos',
    contact: 'Contacto',
    noSlotsSelected: 'No hay franjas horarias seleccionadas',
    pleaseSelectSlot: 'Por favor, seleccione al menos una franja horaria en la que esté disponible.',
    
    // Meeting creation
    createMeeting: 'Crear Reunión',
    meetingTitle: 'Título de la Reunión',
    yourName: 'Su Nombre',
    startDate: 'Fecha de Inicio',
    endDate: 'Fecha de Fin',
    startTime: 'Hora de Inicio',
    endTime: 'Hora de Fin',
    timeSlotDuration: 'Duración de la Franja Horaria',
    createNewMeeting: 'Crear Nueva Reunión',
    meetingDetails: 'Detalles de la Reunión',
    
    // Meeting view
    scheduleMeeting: 'Programar Reunión',
    weeklyView: 'Vista Semanal',
    gridView: 'Vista de Cuadrícula',
    participants: 'Participantes',
    copyLink: 'Copiar Enlace',
    shareLink: 'Compartir enlace',
    organizedBy: 'Organizado por',
    tapAvailability: 'Toque las franjas horarias cuando esté disponible. Su icono aparecerá junto a la corona del organizador.',
    
    // Join meeting
    joinMeeting: 'Unirse a la Reunión',
    enterYourName: 'Ingrese su nombre',
    join: 'Unirse',
    
    // Availability
    available: 'Disponible',
    unavailable: 'No disponible',
    submitAvailability: 'Enviar Disponibilidad',
    availabilitySubmitted: '¡Disponibilidad enviada con éxito!',
    failedToSubmit: 'No se pudo enviar la disponibilidad. Por favor, inténtelo de nuevo.',
    
    // Share Modal
    scheduleCreated: '🎉 ¡Horario Creado!',
    shareToCollectVotes: 'Comparte este enlace para recoger votos.',
    generateQRCode: 'Generar Código QR',
    hideQRCode: 'Ocultar Código QR',
    copied: '¡Copiado!',
    share: 'Compartir',
    close: 'Cerrar',
    linkCopiedToClipboard: '¡Enlace copiado al portapapeles!',
  },
  fr: {
    // General
    slotKing: 'RoiDeSlot',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    submit: 'Soumettre',
    save: 'Enregistrer',
    copy: 'Copier',
    settings: 'Paramètres',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    contact: 'Contact',
    noSlotsSelected: 'Aucun créneau horaire sélectionné',
    pleaseSelectSlot: 'Veuillez sélectionner au moins un créneau horaire lorsque vous êtes disponible.',
    
    // Meeting creation
    createMeeting: 'Créer une Réunion',
    meetingTitle: 'Titre de la Réunion',
    yourName: 'Votre Nom',
    startDate: 'Date de Début',
    endDate: 'Date de Fin',
    startTime: 'Heure de Début',
    endTime: 'Heure de Fin',
    timeSlotDuration: 'Durée du Créneau Horaire',
    createNewMeeting: 'Créer une Nouvelle Réunion',
    meetingDetails: 'Détails de la Réunion',
    
    // Meeting view
    scheduleMeeting: 'Planifier une Réunion',
    weeklyView: 'Vue Hebdomadaire',
    gridView: 'Vue en Grille',
    participants: 'Participants',
    copyLink: 'Copier le Lien',
    shareLink: 'Lien de partage',
    organizedBy: 'Organisé par',
    tapAvailability: 'Appuyez sur les créneaux horaires lorsque vous êtes disponible. Votre icône apparaîtra à côté de la couronne de l\'organisateur.',
    
    // Join meeting
    joinMeeting: 'Rejoindre la Réunion',
    enterYourName: 'Entrez votre nom',
    join: 'Rejoindre',
    
    // Availability
    available: 'Disponible',
    unavailable: 'Indisponible',
    submitAvailability: 'Soumettre la Disponibilité',
    availabilitySubmitted: 'Disponibilité soumise avec succès !',
    failedToSubmit: 'Échec de la soumission de la disponibilité. Veuillez réessayer.',
    
    // Share Modal
    scheduleCreated: '🎉 Horaire Créé !',
    shareToCollectVotes: 'Partagez ce lien pour recueillir des votes.',
    generateQRCode: 'Générer un Code QR',
    hideQRCode: 'Masquer le Code QR',
    copied: 'Copié !',
    share: 'Partager',
    close: 'Fermer',
    linkCopiedToClipboard: 'Lien copié dans le presse-papiers !',
  }
};

// Type for the Language Context
export interface I18nContextType {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string | TranslationKey) => string;
}

// Create context with default values
export const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

// Custom hook to use the i18n context
export const useI18n = () => useContext(I18nContext);