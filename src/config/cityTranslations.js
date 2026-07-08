import { CITIES } from './constants';

/* ============================================================
 *  City translations
 *  ----------------------------------------------------------------
 *  The canonical city value is ALWAYS the Arabic string in
 *  `CITIES` (that's what the backend stores / expects). This map
 *  only provides display labels so the dropdown can be localized
 *  without changing the submitted value.
 *
 *  Policy: Arabic shows the Arabic name; every other language
 *  shows the English transliteration (falling back to Arabic if a
 *  transliteration is missing). We deliberately do NOT ship
 *  per-language (zh/ur) city names — mixing localized + English
 *  cities in one list looks broken, so non-Arabic = English.
 *
 *  Use `cityOptions(lang)` to feed <SelectField options={...} />.
 * ============================================================ */

const CITY_EN = {
  // منطقة الرياض
  'الرياض': 'Riyadh',
  'الخرج': 'Al-Kharj',
  'الدوادمي': 'Ad-Dawadmi',
  'المجمعة': "Al-Majma'ah",
  'القويعية': "Al-Quway'iyah",
  'وادي الدواسر': 'Wadi ad-Dawasir',
  'الأفلاج': 'Al-Aflaj',
  'الزلفي': 'Az-Zulfi',
  'شقراء': 'Shaqra',
  'حوطة بني تميم': 'Hotat Bani Tamim',
  'عفيف': 'Afif',
  'السليل': 'As-Sulayyil',
  'ضرما': 'Dhurma',
  'المزاحمية': 'Al-Muzahimiyah',
  'رماح': 'Rumah',
  'ثادق': 'Thadiq',
  'حريملاء': 'Huraymila',
  'الحريق': 'Al-Hariq',
  'الغاط': 'Al-Ghat',
  'مرات': 'Marat',
  'الدلم': 'Ad-Dilam',
  // منطقة مكة المكرمة
  'مكة المكرمة': 'Makkah',
  'جدة': 'Jeddah',
  'الطائف': 'Taif',
  'القنفذة': 'Al-Qunfudhah',
  'الليث': 'Al-Lith',
  'رابغ': 'Rabigh',
  'خليص': 'Khulais',
  'الخرمة': 'Al-Khurmah',
  'رنية': 'Ranyah',
  'تربة': 'Turubah',
  'الجموم': 'Al-Jumum',
  'الكامل': 'Al-Kamil',
  'بحرة': 'Bahrah',
  'أضم': 'Adham',
  'ميسان': 'Maysan',
  'العرضيات': 'Al-Ardiyat',
  // المنطقة الشرقية
  'الدمام': 'Dammam',
  'الخبر': 'Khobar',
  'الظهران': 'Dhahran',
  'الأحساء': 'Al-Ahsa',
  'الجبيل': 'Jubail',
  'القطيف': 'Qatif',
  'حفر الباطن': 'Hafar al-Batin',
  'الخفجي': 'Khafji',
  'رأس تنورة': 'Ras Tanura',
  'بقيق': 'Abqaiq',
  'النعيرية': "An-Nu'ayriyah",
  'قرية العليا': 'Qaryat al-Ulya',
  // منطقة المدينة المنورة
  'المدينة المنورة': 'Madinah',
  'ينبع': 'Yanbu',
  'العلا': 'Al-Ula',
  'بدر': 'Badr',
  'خيبر': 'Khaybar',
  'الحناكية': 'Al-Hanakiyah',
  'وادي الفرع': "Wadi al-Far'",
  // منطقة القصيم
  'بريدة': 'Buraydah',
  'عنيزة': 'Unayzah',
  'الرس': 'Ar-Rass',
  'المذنب': 'Al-Midhnab',
  'البكيرية': 'Al-Bukayriyah',
  'البدائع': 'Al-Badai',
  'الأسياح': 'Al-Asyah',
  'النبهانية': 'An-Nabhaniyah',
  'الشماسية': 'Ash-Shimasiyah',
  'عيون الجواء': 'Uyun al-Jiwa',
  'رياض الخبراء': 'Riyadh al-Khabra',
  'عقلة الصقور': 'Uqlat as-Suqur',
  // منطقة عسير
  'أبها': 'Abha',
  'خميس مشيط': 'Khamis Mushait',
  'بيشة': 'Bisha',
  'محايل عسير': 'Muhayil Asir',
  'أحد رفيدة': 'Ahad Rufaydah',
  'سراة عبيدة': 'Sarat Abidah',
  'رجال ألمع': 'Rijal Alma',
  'المجاردة': 'Al-Majaridah',
  'بلقرن': 'Balqarn',
  'تثليث': 'Tathlith',
  'ظهران الجنوب': 'Dhahran al-Janub',
  'النماص': 'An-Namas',
  'تنومة': 'Tanumah',
  'بارق': 'Bariq',
  // منطقة تبوك
  'تبوك': 'Tabuk',
  'ضباء': 'Duba',
  'الوجه': 'Al-Wajh',
  'أملج': 'Umluj',
  'حقل': 'Haql',
  'تيماء': 'Tayma',
  'البدع': "Al-Bad'",
  // منطقة حائل
  'حائل': 'Hail',
  'بقعاء': 'Baqaa',
  'الغزالة': 'Al-Ghazalah',
  'الشنان': 'Ash-Shinan',
  'سميراء': 'Samira',
  'موقق': 'Mawqaq',
  'الحائط': 'Al-Hait',
  // منطقة الحدود الشمالية
  'عرعر': 'Arar',
  'رفحاء': 'Rafha',
  'طريف': 'Turaif',
  'العويقيلة': 'Al-Uwayqilah',
  // منطقة جازان
  'جازان': 'Jazan',
  'صبيا': 'Sabya',
  'أبو عريش': 'Abu Arish',
  'صامطة': 'Samtah',
  'بيش': 'Baysh',
  'الدرب': 'Ad-Darb',
  'أحد المسارحة': 'Ahad al-Masarihah',
  'العارضة': 'Al-Aridah',
  'ضمد': 'Damad',
  'الريث': 'Ar-Rayth',
  'فيفاء': 'Fayfa',
  'فرسان': 'Farasan',
  'الطوال': 'At-Tuwal',
  'هروب': 'Hurub',
  // منطقة نجران
  'نجران': 'Najran',
  'شرورة': 'Sharurah',
  'حبونا': 'Habuna',
  'بدر الجنوب': 'Badr al-Janub',
  'يدمة': 'Yadamah',
  'ثار': 'Thar',
  'خباش': 'Khubash',
  // منطقة الباحة
  'الباحة': 'Al-Bahah',
  'بلجرشي': 'Baljurashi',
  'المندق': 'Al-Mandaq',
  'المخواة': 'Al-Makhwah',
  'قلوة': 'Qilwah',
  'العقيق': 'Al-Aqiq',
  'القرى': 'Al-Qura',
  'بني حسن': 'Bani Hasan',
  'الحجرة': 'Al-Hajrah',
  'غامد الزناد': 'Ghamid az-Zinad',
  // منطقة الجوف
  'سكاكا': 'Sakaka',
  'القريات': 'Al-Qurayyat',
  'دومة الجندل': 'Dumat al-Jandal',
  'طبرجل': 'Tabarjal',
};

/**
 * Localized display label for a city, keeping the Arabic value as
 * the source of truth. Arabic -> Arabic name; any other language
 * -> English transliteration (falling back to Arabic).
 */
export function cityLabel(city, lang) {
  if (lang === 'ar') return city;
  return CITY_EN[city] ?? city;
}

/**
 * City options for <SelectField>. `value` stays Arabic (backend
 * contract); `label` is Arabic for `ar`, English otherwise.
 */
export function cityOptions(lang) {
  return CITIES.map((c) => ({ value: c, label: cityLabel(c, lang) }));
}
