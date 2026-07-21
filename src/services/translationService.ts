import { useState, useEffect } from 'react';

export type Language = 'en' | 'he';

let currentLanguage: Language = 'en';

// Read initial language selection from LocalStorage if on Web
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('trip_planner_lang');
    if (saved === 'en' || saved === 'he') {
      currentLanguage = saved;
    }
  }
} catch (e) {
  // Safe fallback for React Native mobile environments
}

const listeners = new Set<() => void>();

export const getLanguage = (): Language => currentLanguage;

export const subscribeToLanguageChange = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('trip_planner_lang', lang);
    }
  } catch (e) {
    // Safe fallback
  }
  listeners.forEach((cb) => cb());
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Auth / Login
    'login.title': 'Welcome to Trip Planner',
    'login.subtitle': 'Sign in to access and manage your itineraries',
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.button': 'Sign In',
    'login.switch_signup': "Don't have an account? Sign Up",
    'login.switch_signin': 'Already have an account? Sign In',
    'login.signup_button': 'Sign Up',
    'login.name': 'Display Name',
    
    // Home Screen
    'home.welcome': 'Welcome',
    'home.my_trips': 'My Trips',
    'home.add_trip': 'Add Trip',
    'home.planned': 'planned',
    'home.sign_out': 'Sign Out',
    'home.no_trips': 'No trips found.',
    'home.create_first': 'Create your first trip to get started!',
    
    // Trip Dashboard
    'dashboard.title': 'Trip Details',
    'dashboard.total_spent': 'Total Spent',
    'dashboard.logged_from': 'Logged from {count} expenses',
    'dashboard.daily_checklist': 'Daily Packing & Checklist',
    'dashboard.import_title': 'Import Itinerary from Word',
    'dashboard.import_subtitle': 'Upload a Word document (.docx) to automatically extract event timelines, flights, locations, and booking confirmations.',
    'dashboard.drag_active': 'Drop your file here!',
    'dashboard.drag_idle': 'Drag & Drop your .docx file here, or click to browse',
    'dashboard.choose_doc': 'Choose Word Document (.docx)',
    'dashboard.attached_docs': 'Attached Documents',
    'dashboard.add_doc': '+ Add Doc',
    'dashboard.no_docs': 'No documents attached yet.',
    'dashboard.keep_offline': '↓ Keep Offline',
    'dashboard.offline_badge': '💾 Offline',
    'dashboard.open_btn': 'Open',
    'dashboard.add_event': '+ Add Event',
    'dashboard.add_expense': '+ Add Expense',
    'dashboard.itinerary': 'Daily Itinerary & Events',
    'dashboard.no_events': 'No events added to this trip yet.',
    'dashboard.start_building': 'Start building your itinerary below!',
    'dashboard.offline_mode': 'Offline Mode: Showing cached data. Changes will sync when online.',
    'dashboard.analyzing': 'Analyzing document in the cloud...',
    'dashboard.gemini_extracting': 'Gemini is extracting your itinerary events...',
    'dashboard.ticket_qr': 'Ticket QR',
    'dashboard.komoot_map': 'Komoot Map',
    
    // Add Event Screen
    'event.add_title': 'Add Itinerary Event',
    'event.specify_details': 'Specify the details of your activity',
    'event.title_label': 'Event Title *',
    'event.title_placeholder': 'e.g. Flight to Paris, Check-in at Hilton',
    'event.type_label': 'Event Type *',
    'event.flight': 'Flight',
    'event.hotel': 'Hotel',
    'event.poi': 'POI',
    'event.start_time': 'Start Time *',
    'event.start_placeholder': 'e.g. 08:30 AM, 14:00',
    'event.end_time': 'End Time (Optional)',
    'event.end_placeholder': 'e.g. 11:30 AM, 18:00',
    'event.booking_ref': 'Booking / Ticket Reference (Optional)',
    'event.booking_placeholder': 'e.g. LH123456, BOOKING-ID',
    'event.latitude': 'Latitude (Optional)',
    'event.longitude': 'Longitude (Optional)',
    'event.description': 'Description & Notes (Optional)',
    'event.description_placeholder': 'Enter any additional details, addresses, check-in instructions or notes...',
    'event.pin_location': 'Pin Location on Map',
    'event.pin_instruction': 'Tap the map or drag the pin to set the coordinates',
    'event.save': 'Save Event',
    'event.cancel': 'Cancel',
    'event.required_error': 'Please fill in all required fields (Title, Type, Start Time).',
    'event.lat_error': 'Latitude must be a valid number.',
    'event.lon_error': 'Longitude must be a valid number.',
    
    // Add Expense Screen
    'expense.add_title': 'Add Expense',
    'expense.specify_details': 'Log your travel expenses',
    'expense.amount': 'Amount *',
    'expense.currency': 'Currency *',
    'expense.category': 'Category *',
    'expense.description': 'Description *',
    'expense.description_placeholder': 'e.g. Dinner, Train Ticket',
    'expense.save': 'Save Expense',
    'expense.cancel': 'Cancel',
    'expense.required_error': 'Please fill in all required fields.',
    
    // Preview Confirm Screen
    'preview.title': 'Preview & Confirm Events',
    'preview.subtitle': 'Confirm the events extracted by Gemini before saving',
    'preview.confirm_btn': 'Confirm & Save All Events',
    'preview.cancel_btn': 'Cancel',
  },
  he: {
    // Auth / Login
    'login.title': 'ברוכים הבאים למתכנן הטיולים',
    'login.subtitle': 'התחבר כדי לנהל ולצפות במסלולי הטיול שלך',
    'login.email': 'כתובת אימייל',
    'login.password': 'סיסמה',
    'login.button': 'התחברות',
    'login.switch_signup': 'אין לך חשבון? הרשם כאן',
    'login.switch_signin': 'כבר יש לך חשבון? התחבר כאן',
    'login.signup_button': 'הרשמה',
    'login.name': 'שם תצוגה',

    // Home Screen
    'home.welcome': 'שלום',
    'home.my_trips': 'הטיולים שלי',
    'home.add_trip': 'הוסף טיול',
    'home.planned': 'מתוכנן',
    'home.sign_out': 'התנתקות',
    'home.no_trips': 'לא נמצאו טיולים.',
    'home.create_first': 'צור את הטיול הראשון שלך כדי להתחיל!',

    // Trip Dashboard
    'dashboard.title': 'פרטי טיול',
    'dashboard.total_spent': 'סה"כ הוצאות',
    'dashboard.logged_from': 'מתועד מ-{count} הוצאות',
    'dashboard.daily_checklist': 'רשימת אריזה ומשימות יומית',
    'dashboard.import_title': 'ייבוא מסלול מקובץ Word',
    'dashboard.import_subtitle': 'העלה מסמך Word (.docx) כדי לחלץ אוטומטית לוחות זמנים, טיסות, מיקומים ואישורי הזמנה.',
    'dashboard.drag_active': 'שחרר את הקובץ כאן!',
    'dashboard.drag_idle': 'גרור ושחרר קובץ .docx כאן, או לחץ לבחירת קובץ',
    'dashboard.choose_doc': 'בחר מסמך Word (.docx)',
    'dashboard.attached_docs': 'מסמכים מצורפים',
    'dashboard.add_doc': '+ הוסף מסמך',
    'dashboard.no_docs': 'אין עדיין מסמכים מצורפים.',
    'dashboard.keep_offline': '↓ שמור ללא חיבור',
    'dashboard.offline_badge': '💾 לא מקוון',
    'dashboard.open_btn': 'פתח',
    'dashboard.add_event': '+ הוסף אירוע',
    'dashboard.add_expense': '+ הוסף הוצאה',
    'dashboard.itinerary': 'מסלול יומי ואירועים',
    'dashboard.no_events': 'אין עדיין אירועים בטיול זה.',
    'dashboard.start_building': 'התחל לבנות את מסלול הטיול שלך למטה!',
    'dashboard.offline_mode': 'מצב לא מקוון: מציג נתונים שמורים. שינויים יסונכרנו כשתתחבר.',
    'dashboard.analyzing': 'מנתח את המסמך בענן...',
    'dashboard.gemini_extracting': 'Gemini מחלץ את אירועי המסלול שלך...',
    'dashboard.ticket_qr': 'קוד QR לכרטיס',
    'dashboard.komoot_map': 'מפת Komoot',

    // Add Event Screen
    'event.add_title': 'הוספת אירוע למסלול',
    'event.specify_details': 'פרט את פרטי הפעילות שלך',
    'event.title_label': 'שם האירוע *',
    'event.title_placeholder': 'לדוגמה: טיסה לפריז, צ׳ק-אין במלון הילטון',
    'event.type_label': 'סוג אירוע *',
    'event.flight': 'טיסה',
    'event.hotel': 'מלון',
    'event.poi': 'נקודת עניין',
    'event.start_time': 'שעת התחלה *',
    'event.start_placeholder': 'לדוגמה: 08:30 AM, 14:00',
    'event.end_time': 'שעת סיום (אופציונלי)',
    'event.end_placeholder': 'לדוגמה: 11:30 AM, 18:00',
    'event.booking_ref': 'מספר הזמנה / כרטיס (אופציונלי)',
    'event.booking_placeholder': 'לדוגמה: LH123456, BOOKING-ID',
    'event.latitude': 'קו רוחב (אופציונלי)',
    'event.longitude': 'קו אורך (אופציונלי)',
    'event.description': 'תיאור והערות (אופציונלי)',
    'event.description_placeholder': 'הזן פרטים נוספים, כתובת, הוראות הגעה או הערות...',
    'event.pin_location': 'סמן מיקום על המפה',
    'event.pin_instruction': 'לחץ על המפה או גרור את הנעץ כדי לקבוע את הקואורדינטות',
    'event.save': 'שמור אירוע',
    'event.cancel': 'ביטול',
    'event.required_error': 'אנא מלא את כל שדות החובה (שם, סוג, שעת התחלה).',
    'event.lat_error': 'קו רוחב חייב להיות מספר תקין.',
    'event.lon_error': 'קו אורך חייב להיות מספר תקין.',

    // Add Expense Screen
    'expense.add_title': 'הוספת הוצאה',
    'expense.specify_details': 'מתעד את הוצאות הנסיעה שלך',
    'expense.amount': 'סכום *',
    'expense.currency': 'מטבע *',
    'expense.category': 'קטגוריה *',
    'expense.description': 'תיאור *',
    'expense.description_placeholder': 'לדוגמה: ארוחת ערב, כרטיס רכבת',
    'expense.save': 'שמור הוצאה',
    'expense.cancel': 'ביטול',
    'expense.required_error': 'אנא מלא את כל שדות החובה.',

    // Preview Confirm Screen
    'preview.title': 'תצוגה מקדימה ואישור',
    'preview.subtitle': 'אשר את האירועים שחולצו על ידי Gemini לפני שמירה',
    'preview.confirm_btn': 'אשר ושמור את כל האירועים',
    'preview.cancel_btn': 'ביטול',
  }
};

export const translate = (key: string, lang: Language, params?: Record<string, string>): string => {
  const dictionary = translations[lang] || translations.en;
  let text = dictionary[key] || translations.en[key] || key;
  
  if (params) {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(`{${paramKey}}`, params[paramKey]);
    });
  }
  
  return text;
};

export function useTranslation() {
  const [lang, setLang] = useState<Language>(getLanguage());
  
  useEffect(() => {
    return subscribeToLanguageChange(() => {
      setLang(getLanguage());
    });
  }, []);
  
  return {
    lang,
    isRTL: lang === 'he',
    t: (key: string, params?: Record<string, string>) => translate(key, lang, params),
    setLanguage
  };
}
