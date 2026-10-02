// Каталог на „типови производи" — што мисли купувачот кога ќе напише „млеко".
//
// Кои категории на маркетите спаѓаат во кој тип е запишано во data/category-map.json.
// Тука се правилата по име, за категории што мешаат повеќе типови
// (пр. Стокомак „СИРЕЊЕ вакуум" има и кравјо, и овчо, и биено).
//
// Со големи букви: `require` мора да се најде во името на производот,
// `exclude` не смее да се најде ни во името ни во категоријата.
// Тип без `require` ги зема сите производи од своите категории.

import type { Unit } from "./types.ts";

export interface ProductType {
  id: string;
  label: string;
  /** Зборови по кои типот се препознава во списокот на купувачот. */
  aliases: string[];
  /** Единица во која се мери потребата. */
  unit: Unit;
  /** Единици што се читаат од името како да се исти (јогурт: 1кг ≈ 1л). */
  equivalentUnits?: Unit[];
  /** Колку се купува кога купувачот не кажал количина. */
  defaultAmount: number;
  /** Се продава и на мерење: без количина во името, цената е по килограм. */
  byWeight?: boolean;
  require?: RegExp;
  exclude?: RegExp;
}

const L = String.raw`(?!\p{L})`; // крај на збор (\b не работи за кирилица)
// „ОВЧО", „ОВЧКИ"... но не „ОВЧЕПОЛСКО".
const OVCH = new RegExp(`ОВЧ(О|И|А|КО|КИ|КА)${L}`, "u");

export const CATALOG: ProductType[] = [
  // ── Млечни производи ──
  {
    id: "mleko", label: "Млеко (кравјо, трајно)", aliases: ["млеко", "млека", "трајно млеко"],
    unit: "l", defaultAmount: 1, require: /МЛЕК/,
    exclude: /БЕЗ ЛАКТОЗА|ЗА КАФЕ|ЧОКО|КАКАО|КОЗЈ|ОВЧ|ОВЕС|БАДЕМ|СОЈ|ОРИЗ|ВО ПРАВ|КИСЕЛ|(^| )СЕТ |ВКУС|ЈАГОД|ВАНИЛ|БАНАН|ШЕЈК|КАПУЧИНО|ЛЕДЕНО|ВИТАМИН/,
  },
  { id: "mleko-bez-laktoza", label: "Млеко без лактоза", aliases: ["млеко без лактоза"], unit: "l", defaultAmount: 1, exclude: /ЈОГУРТ|ЧОКО/ },
  { id: "cokoladno-mleko", label: "Чоколадно млеко", aliases: ["чоколадно млеко"], unit: "l", defaultAmount: 0.25, require: /ЧОКО|КАКАО/ },
  { id: "rastitelno-mleko", label: "Растително млеко", aliases: ["растително млеко", "овесно млеко", "бадемово млеко", "сојино млеко"], unit: "l", defaultAmount: 1, exclude: /ВО ПРАВ|ПРОТЕИН|ЧОКО|КАКАО|ВАНИЛ|КАФЕ/ },
  { id: "kiselo-mleko", label: "Кисело млеко (кравјо)", aliases: ["кисело млеко"], unit: "kg", equivalentUnits: ["l"], defaultAmount: 0.4, require: /КИСЕЛ/, exclude: /КОЗЈ[ОИ]|ОВЧ(О|КО)|ПАВЛАК/ },
  {
    id: "jogurt", label: "Јогурт (обичен)", aliases: ["јогурт"], unit: "kg", equivalentUnits: ["l"], defaultAmount: 1, require: /ЈОГУРТ/,
    exclude: /ГРЧКИ|ОВОШ|ПРОТЕИН|БЕЗ ЛАКТОЗА|ПРОБИОТ|БАЛАНС|КОЗЈ(?!АК)|ОВЧ|АКТИВИА|ЦАЦИКИ|ЈАГОД|ВИШН|ШУМСК|БАНАН|ДЕСЕРТ|СПИТИКО|СКИР/,
  },
  { id: "grcki-jogurt", label: "Грчки јогурт", aliases: ["грчки јогурт"], unit: "kg", defaultAmount: 0.15, require: /ГРЧКИ/, exclude: /ЈАГОД|ШУМСК|ОВОШ|ВКУС|ЦАЦИКИ|ВИШН|МАЛИН|БОРОВ|ПРАСК|МЕД|МАНГО|БАНАН|КАЈСИ|ПРОТЕИН/ },
  { id: "ovoshen-jogurt", label: "Овошен јогурт", aliases: ["овошен јогурт"], unit: "kg", defaultAmount: 0.15, exclude: /ПРОТЕИН/ },
  { id: "kefir", label: "Кефир", aliases: ["кефир"], unit: "l", equivalentUnits: ["kg"], defaultAmount: 0.4, require: /КЕФИР/, exclude: /ОВОШ|ЈАГОД|ШУМСК/ },
  { id: "ajran", label: "Ајран", aliases: ["ајран"], unit: "l", equivalentUnits: ["kg"], defaultAmount: 1, require: /АЈРАН/ },
  { id: "kisela-pavlaka", label: "Кисела павлака", aliases: ["павлака", "кисела павлака"], unit: "kg", defaultAmount: 0.4, require: /ПАВЛАКА/, exclude: /ГОТВЕЊЕ|РАСТИТЕЛ|СЛАТКА|ХОПЛА|ПИПЕРК/ },
  { id: "pavlaka-gotvenje", label: "Павлака за готвење", aliases: ["павлака за готвење", "крем за готвење"], unit: "l", equivalentUnits: ["kg"], defaultAmount: 0.5, require: /ГОТВЕЊЕ|ХОПЛА|ПАВЛАКА|КРЕМ/, exclude: /СЛАТКА|ШЛАГ|СО ШЕЌЕР/ },
  { id: "slatka-pavlaka", label: "Слатка павлака", aliases: ["слатка павлака", "шлаг павлака"], unit: "l", equivalentUnits: ["kg"], defaultAmount: 0.5, require: /СЛАТКА|СО ШЕЌЕР|РУДИНЕ|ШЛАГ/ },
  { id: "kajmak", label: "Кајмак", aliases: ["кајмак"], unit: "kg", defaultAmount: 0.25 },
  {
    id: "sirenje", label: "Бело сирење (кравјо)", aliases: ["сирење", "бело сирење", "кравјо сирење"], unit: "kg", defaultAmount: 0.5, byWeight: true,
    require: /КРАВЈ/, exclude: /ТОПЕНО|КРЕМ|ФЕТА|РАСТИТЕЛ|БИЕНО|ЖЕЖЕНО|МЕШАН|НАМАЗ|КАШКАВАЛ|УРДА|КИСЕЛ/,
  },
  { id: "sirenje-ovcho", label: "Бело сирење (овчо)", aliases: ["овчо сирење"], unit: "kg", defaultAmount: 0.5, byWeight: true, require: OVCH, exclude: /МЕШАН|КАШКАВАЛ|КИСЕЛ|УРДА|БИЕНО|КРАВЈ/ },
  { id: "sirenje-meshano", label: "Бело сирење (мешано)", aliases: ["мешано сирење"], unit: "kg", defaultAmount: 0.5, byWeight: true, require: /МЕШАН/, exclude: /КАШКАВАЛ|УРДА/ },
  { id: "sirenje-kozjo", label: "Козјо сирење", aliases: ["козјо сирење"], unit: "kg", defaultAmount: 0.4, byWeight: true, require: new RegExp(`КОЗЈ[ОИ]${L}`, "u"), exclude: /КАШКАВАЛ|КИСЕЛ|МЕШАН/ },
  { id: "bieno-sirenje", label: "Биено сирење", aliases: ["биено сирење"], unit: "kg", defaultAmount: 0.4, byWeight: true, require: /БИЕНО|ЖЕЖЕНО/ },
  { id: "feta", label: "Фета сирење", aliases: ["фета", "фета сирење"], unit: "kg", defaultAmount: 0.25, exclude: /ЈОГУРТ/ },
  { id: "urda", label: "Урда", aliases: ["урда"], unit: "kg", defaultAmount: 0.5, byWeight: true, exclude: /РАСТИТЕЛ|ПИПЕРК|ПРОТЕИН/ },
  { id: "krem-sirenje", label: "Крем сирење / млечен намаз", aliases: ["крем сирење", "млечен намаз", "сирен намаз"], unit: "kg", defaultAmount: 0.2, require: /КРЕМ СИ|НАМАЗ|СИРКО|КАЈМАК/, exclude: /ХУМУС|РАСТИТЕЛ|ЗЕЛЕНЧУК/ },
  { id: "topeno-sirenje", label: "Топено сирење", aliases: ["топено сирење", "зденка"], unit: "kg", defaultAmount: 0.14, require: /ТОПЕНО|ЗДЕНКА|ХЕПИ КАУ/, exclude: /РАСТИТЕЛ|СЛАЈС|ЕДАМ/ },
  {
    id: "kashkaval", label: "Кашкавал (кравји)", aliases: ["кашкавал", "кравји кашкавал"], unit: "kg", defaultAmount: 0.3, byWeight: true,
    require: /КРАВЈ/, exclude: new RegExp(`РАСТИТЕЛ|СЛАЈС|ПОХОВАН|ПАРИЗЕР|ТОСТ|РЕНДАН|МЕШАН|ОВЧ(И|КИ)${L}|КОЗЈ[ОИ]${L}`, "u"),
  },
  { id: "kashkaval-meshan", label: "Кашкавал (мешан)", aliases: ["мешан кашкавал"], unit: "kg", defaultAmount: 0.3, byWeight: true, require: /МЕШАН/ },
  { id: "kashkaval-ovchi", label: "Кашкавал (овчи)", aliases: ["овчи кашкавал"], unit: "kg", defaultAmount: 0.3, byWeight: true, require: OVCH, exclude: /КРАВЈ|МЕШАН/ },
  { id: "gauda", label: "Гауда / едамер", aliases: ["гауда", "едамер", "едам"], unit: "kg", defaultAmount: 0.3, byWeight: true, require: /ГАУДА|ЕДАМ/, exclude: /СЛАЈС|РАСТИТЕЛ|РЕНДАН|ВЕГАН/ },
  { id: "kashkaval-slajs", label: "Кашкавал слајс", aliases: ["кашкавал слајс", "сендвич кашкавал"], unit: "kg", defaultAmount: 0.15, exclude: /РАСТИТЕЛ|ВЕГАН|ВИОЛАЈФ/ },
  { id: "rastitelen-kashkaval", label: "Растителен кашкавал", aliases: ["растителен кашкавал", "кашкавал за пица"], unit: "kg", defaultAmount: 0.5, byWeight: true },
  { id: "mocarela", label: "Моцарела", aliases: ["моцарела"], unit: "kg", defaultAmount: 0.125, require: /МОЦАРЕЛА/, exclude: /СТИК|ПОХОВАН|ВЕГАН|ВИОЛАЈФ|ПРОТЕИН|СЛАЈС/ },
  { id: "parmezan", label: "Пармезан", aliases: ["пармезан"], unit: "kg", defaultAmount: 0.1, require: /ПАРМЕЗАН|ГРАНА/ },
  { id: "puter", label: "Путер", aliases: ["путер"], unit: "kg", defaultAmount: 0.2, exclude: /КИКИРИКИ|ЗА ТЕЛО|КОЛАЧ|ЛУК|МАГДОНОС|КАКАО|КОКОС/ },
  { id: "margarin", label: "Маргарин", aliases: ["маргарин"], unit: "kg", defaultAmount: 0.25 },
  { id: "jajca", label: "Јајца", aliases: ["јајца", "јајце"], unit: "pc", defaultAmount: 10, require: /ЈАЈЦА/, exclude: /БОЈА|УКРАС|ПРЕПЕЛИЧ|ТЕСТЕН|ЈУФКИ|ФИДЕ/ },

  // ── Сувомеснато и месо ──
  { id: "shunka", label: "Шунка (свинска)", aliases: ["шунка"], unit: "kg", defaultAmount: 0.2, byWeight: true, require: /ШУНКА/, exclude: /ПИЛЕШК|МИСИРК|ГОВЕДСК|ТОСТ|ПИЦА|ПАШТЕТ|ВИРШЛ/ },
  { id: "pileshka-shunka", label: "Пилешка шунка / пилешки гради", aliases: ["пилешка шунка", "пилешки гради"], unit: "kg", defaultAmount: 0.2, byWeight: true, require: /ПИЛЕШК|МИСИРК/, exclude: /ЧАДЕН|ПОСЕБНА|САЛАМА|ПАРИЗЕР|ВИРШЛ|ПАШТЕТ|ПАНИР|ЗАМРЗН/ },
  { id: "parizer", label: "Паризер / посебна салама", aliases: ["паризер", "посебна салама", "пилешка салама", "салама"], unit: "kg", defaultAmount: 0.3, byWeight: true, require: /ПАРИЗЕР|ПОСЕБНА|САЛАМА/, exclude: /ЧАЈНА|ПИЦА|ПЕПЕРОНИ|ГОВЕДСК|ДОМАШНА|ЗИМСК|КУЛЕН/ },
  { id: "mortadela", label: "Мортадела", aliases: ["мортадела"], unit: "kg", defaultAmount: 0.2, byWeight: true },
  { id: "chajna", label: "Чајна (трајна) салама", aliases: ["чајна", "чајна салама", "трајна салама", "зимска салама"], unit: "kg", defaultAmount: 0.2, byWeight: true, require: /ЧАЈНА|ЧАЕН|САЛАМА|ЗИМСК/, exclude: /ПИЛЕШК|ПОСЕБНА|СТАПЧИЊА|ПИЦА|КУЛЕН/ },
  { id: "kulen", label: "Кулен", aliases: ["кулен"], unit: "kg", defaultAmount: 0.2, byWeight: true, require: /КУЛЕН/ },
  { id: "slanina", label: "Сланина / панцета", aliases: ["сланина", "бекон", "панцета"], unit: "kg", defaultAmount: 0.2, byWeight: true, require: /СЛАНИНА|БЕКОН|ПАНЦЕТА/ },
  { id: "pechenica", label: "Печеница", aliases: ["печеница"], unit: "kg", defaultAmount: 0.2, byWeight: true, require: /ПЕЧЕНИЦА/ },
  { id: "chaden-vrat", label: "Чаден свински врат", aliases: ["чаден врат", "свински врат"], unit: "kg", defaultAmount: 0.2, byWeight: true, require: /ВРАТ/, exclude: /СВЕЖ|СО КОСКА/ },
  { id: "prshuta", label: "Пршута", aliases: ["пршута", "пршут", "буџола"], unit: "kg", defaultAmount: 0.1, byWeight: true, require: /ПРШУТ|БУЏОЛА/ },
  { id: "virshli", label: "Виршли", aliases: ["виршли", "виршла", "хреновки"], unit: "kg", defaultAmount: 0.2, byWeight: true, require: /ВИРШЛ/ },
  { id: "kolbas", label: "Колбас", aliases: ["колбас", "колбаси", "кобасица"], unit: "kg", defaultAmount: 0.3, byWeight: true, require: /КОЛБАС|КОБАСИЦ/, exclude: /НОВОСАДСК|ЧАЈН|ЧАЕН|ПИКНИК|ПИЛЕШК|СЕНДВИЧ/ },
  { id: "sudzuk", label: "Суџук", aliases: ["суџук"], unit: "kg", defaultAmount: 0.3, byWeight: true, require: /СУЏУК/ },
  { id: "pashteta", label: "Паштета", aliases: ["паштета", "паштети"], unit: "kg", defaultAmount: 0.1, require: /ПАШТ/, exclude: /ВЕГЕТАБ|ВЕГЕТАР|ТУНА|МАЧ|КУЧ|ЗЕЛЕНЧУК|НАМАЗ/ },
  { id: "mesen-narezok", label: "Месен нарезок (конзерва)", aliases: ["месен нарезок", "нарезок"], unit: "kg", defaultAmount: 0.15, require: /НАРЕЗОК/ },
  { id: "chvarki", label: "Чварки", aliases: ["чварки"], unit: "kg", defaultAmount: 0.2, require: /ЧВАРКИ/ },
  { id: "pile", label: "Цело пиле", aliases: ["пиле", "цело пиле"], unit: "kg", defaultAmount: 1.5, byWeight: true, require: new RegExp(`ПИЛЕ${L}`, "u"), exclude: /ПЕЧЕНО/ },
  { id: "pileshko-file", label: "Пилешко филе / стек", aliases: ["пилешко филе", "пилешки стек", "филе"], unit: "kg", defaultAmount: 0.5, byWeight: true, require: /ФИЛЕ|СТЕК|ГРАДИ/, exclude: /ПАНИР|ЧАДЕН|ПОХОВ|МИНИ|ГИРО/ },
  { id: "pileshki-kopan", label: "Пилешки копан", aliases: ["копан", "копани", "пилешки копан", "батак"], unit: "kg", defaultAmount: 1, byWeight: true, require: /КОПАН/ },
  { id: "pileshki-krilca", label: "Пилешки крилца", aliases: ["крилца", "пилешки крилца"], unit: "kg", defaultAmount: 1, byWeight: true, require: /КРИЛЦ/, exclude: /ПЕЧЕН|ПАНИР/ },
  { id: "pileshki-dzhiger", label: "Пилешки џигер", aliases: ["џигер", "пилешки џигер"], unit: "kg", defaultAmount: 0.5, byWeight: true, require: /ЏИГЕР|ЦРН ДРОБ/ },
  { id: "svinsko-meso", label: "Свинско месо", aliases: ["свинско месо", "свинско", "свински бут", "каре"], unit: "kg", defaultAmount: 1, byWeight: true, require: /СВИНСК|КАРЕ|КРЕМЕНДАЛ/, exclude: /ЧАДЕН|ШКЕМБЕ|МЕЛЕН|СЛАНИН|ПОЛУТК/ },
  { id: "meleno-meso", label: "Мелено месо", aliases: ["мелено месо", "мелено"], unit: "kg", defaultAmount: 0.5, require: /МЕЛЕН/ },
  { id: "cebapi", label: "Ќебапи", aliases: ["ќебапи", "ќебапчиња"], unit: "kg", defaultAmount: 0.45, require: /ЌЕБАП|ЌЕВАП/ },
  { id: "panirano-pileshko", label: "Панирано пилешко", aliases: ["панирано пилешко", "пилешки прсти", "нагетси"], unit: "kg", defaultAmount: 0.5, require: /ПИЛЕШК/ },
  { id: "riba", label: "Риба (свежа или замрзната)", aliases: ["риба", "ослич", "пастрмка", "лосос"], unit: "kg", defaultAmount: 0.5, byWeight: true, require: /РИБА|ОСЛИ[ЧЌ]|ПАСТРМК|ЛОСОС|ПАНГА|СКУША|ХЕК|ЦИПУРА|КРАП|ОРАДА|ЛАВРАК/, exclude: /ПАНИР|ПРСТИ|ФИШФИНГ|СУРИМИ/ },
  { id: "tuna", label: "Туна (конзерва)", aliases: ["туна"], unit: "kg", defaultAmount: 0.17, require: /ТУНА/, exclude: /ПАШТЕТ|САЛАТ/ },
  { id: "sardina", label: "Сардина (конзерва)", aliases: ["сардина", "сардини", "скуша"], unit: "kg", defaultAmount: 0.125, require: /САРДИН|СКУША|ХАРИНГ/ },

  // ── Леб и тесто ──
  {
    id: "leb", label: "Леб (бел)", aliases: ["леб", "бел леб"], unit: "kg", defaultAmount: 0.5, require: /ЛЕБ/,
    exclude: /ТОСТ|ИНТЕГРАЛ|РЖАН|Р'ЖАН|БИО|ДИЕТ|БЕЗГЛУТЕН|ГРАХАМ|ПЧЕНКАР|СЕМКИ|СЕМИЊА|ТРОШКИ|БРИОШ|ЛЕБЛЕБИ|СУСАМ|БАВАРСК|НОРДИК|СПЕЛТ|ХЕЉД|КВАСЕЦ|ПОЛНОЗРН|ЦЕЛО ЗРНО|МИНИ|ВАФЛИ|ПАЛАЧИНК|КИФЛИ/,
  },
  { id: "leb-integralen", label: "Интегрален / ржан леб", aliases: ["интегрален леб", "ржан леб", "црн леб"], unit: "kg", defaultAmount: 0.5, require: /ИНТЕГРАЛ|РЖАН|Р'ЖАН|ГРАХАМ|ПОЛНОЗРН|ЦЕЛО ЗРНО/, exclude: /ТОСТ|ДВОПЕК|ТОРТИЉ|КЕКС/ },
  { id: "tost-leb", label: "Тост леб", aliases: ["тост", "тост леб"], unit: "kg", defaultAmount: 0.35, require: /ТОСТ/, exclude: /ТОСТЕР/ },
  { id: "kori", label: "Кори за пита", aliases: ["кори", "кори за пита"], unit: "kg", defaultAmount: 0.5, require: /КОРИ/, exclude: /ТОРТА|РОЗЕН/ },
  { id: "tortilji", label: "Тортиљи", aliases: ["тортиља", "тортиљи"], unit: "kg", defaultAmount: 0.36, require: /ТОРТИЉ/, exclude: /ЧИПС|МИГУЕЛ/ },
  { id: "dvopek", label: "Двопек", aliases: ["двопек"], unit: "kg", defaultAmount: 0.25, require: /ДВОПЕК/ },
  { id: "zamrznato-testo", label: "Замрзнати пецива (погачици, бурек)", aliases: ["погачици", "бурек", "замрзнато тесто", "баничка", "лиснато тесто"], unit: "kg", defaultAmount: 0.5, require: /ПОГАЧ|БУРЕК|БАНИЧ|КИФЛ|ПИТА|МАНТИ|ЛИСНАТО/, exclude: /ТОРТА|ГИРО|ПИЦА/ },
  { id: "pica", label: "Замрзната пица", aliases: ["пица", "замрзната пица"], unit: "kg", defaultAmount: 0.35, require: /ПИЦА/, exclude: /ТЕСТО/ },

  // ── Основни намирници ──
  { id: "brashno", label: "Брашно (бело)", aliases: ["брашно"], unit: "kg", defaultAmount: 1, exclude: /ПЧЕНКАР|ЦАРЕВНО|ИНТЕГРАЛ|РЖАН|Р'ЖАН|БЕЗГЛУТЕН|СПЕЛТ|ОВЕС|ХЕЉД|КОКОС|МАФИН/ },
  { id: "palenta", label: "Палента / пченкарно брашно", aliases: ["палента", "пченкарно брашно"], unit: "kg", defaultAmount: 0.5, require: /ПАЛЕНТА|ПЧЕНКАР|ЦАРЕВН/ },
  { id: "seker", label: "Шеќер (бел)", aliases: ["шеќер"], unit: "kg", defaultAmount: 1, exclude: /КАФЕАВ|ДЕМЕРАРА|ТУРБИНАДО|МУСКОВАДО|КОЦКА|ВО ПРАВ|ВАНИЛ|НЕРАФИНИРАН|ТРСКА|КОКОС|СТЕВИ|ВКУС/ },
  { id: "sol", label: "Сол", aliases: ["сол"], unit: "kg", defaultAmount: 1, require: new RegExp(`СОЛ${L}`, "u"), exclude: /10 ?КГ|ХИМАЛАЈ|ШАРЕНА|МАШИН|БИКАРБОН/ },
  { id: "oriz", label: "Ориз (бел)", aliases: ["ориз"], unit: "kg", defaultAmount: 1, require: /ОРИЗ/, exclude: /ИНТЕГРАЛ|ГАЛЕТ|НУДЛ|РИЖОТО|БАСМАТИ|ЈАСМИН|ПАРБОИЛД|СУШИ|АРБОРИО|ПОЛУПОДГОТВ|ЧИПС|ЕКСПАНД|4X125/ },
  { id: "grav", label: "Грав", aliases: ["грав"], unit: "kg", defaultAmount: 0.5, require: /ГРАВ/, exclude: /ЛИМЕНК|КОНЗЕРВ|ПРЕГО|СЛАНИНА|ПОСЕН|ГУРМЕС|БАЛКО/ },
  { id: "lekja", label: "Леќа", aliases: ["леќа"], unit: "kg", defaultAmount: 0.4, require: /ЛЕЌ/, exclude: /КОНЗЕРВ/ },
  { id: "naut", label: "Наут", aliases: ["наут"], unit: "kg", defaultAmount: 0.4, require: /НАУТ/, exclude: /КОНЗЕРВ|ХУМУС/ },
  { id: "testenini", label: "Тестенини (макарони, шпагети)", aliases: ["тестенини", "макарони", "шпагети", "пене", "фусили"], unit: "kg", defaultAmount: 0.5, exclude: /ФИДЕ|ЛАЗАЊ|ТОРТЕЛ|НУДЛ|БЕЗГЛУТЕН|БЕЗ ГЛУТЕН|ЈУФК|ГНЕЗДО|ТАЛИАТЕЛ|ИНДОМИ|ТАРАНА/ },
  { id: "fide", label: "Фиде", aliases: ["фиде"], unit: "kg", defaultAmount: 0.4, require: /ФИДЕ/ },
  { id: "griz", label: "Гриз", aliases: ["гриз"], unit: "kg", defaultAmount: 0.5, require: /ГРИЗ/ },
  { id: "ovesni", label: "Овесни снегулки", aliases: ["овесни снегулки", "овесни", "овес", "овесна каша"], unit: "kg", defaultAmount: 0.5, require: /ОВЕС/, exclude: /ПЛОЧКА|БАР|КОЛАЧ|КЕКС|НАПИТОК|ЧОКО|МЛЕКО/ },
  { id: "zitarki", label: "Житарки / корнфлекс / мусли", aliases: ["корнфлекс", "житарки", "мусли"], unit: "kg", defaultAmount: 0.375, require: /ФЛЕКС|ЖИТАР|МУСЛИ|СНЕГУЛК|ГРАНОЛ|ТОПЧИЊА|МАКС|МОКА|ЧОКАПИК|НЕСКВИК|ПЕРЛИЦ/, exclude: /ОВЕСН|ОРИЗ|ЧИПС|ГАЛЕТ|ЕКСПАНД|БАР/ },
  { id: "maslo", label: "Масло за јадење (сончогледово)", aliases: ["масло", "зејтин", "сончогледово масло"], unit: "l", defaultAmount: 1, exclude: /ЛАДНО ЦЕДЕНО|МАСЛИНОВ|ЛЕН|СПРЕЈ|АВОКАДО/ },
  { id: "maslinovo-maslo", label: "Маслиново масло", aliases: ["маслиново масло"], unit: "l", defaultAmount: 0.75, require: /МАСЛИНОВ/, exclude: /ПОМАС|АВОКАДО/ },
  { id: "ocet", label: "Оцет", aliases: ["оцет", "сирќе"], unit: "l", defaultAmount: 1, require: /ОЦЕТ/, exclude: /БАЛЗАМ|ПРЕЛИВ|ЛИМОН/ },
  { id: "kvasec-svez", label: "Квасец (свеж)", aliases: ["квасец", "свеж квасец"], unit: "kg", defaultAmount: 0.04, require: /КВАСЕЦ/, exclude: /СУВ|ИНСТАНТ|БРЗО/ },
  { id: "kvasec-suv", label: "Квасец (сув)", aliases: ["сув квасец"], unit: "kg", defaultAmount: 0.007, require: /СУВ|ИНСТАНТ|БРЗО/ },
  { id: "prashok-za-pecivo", label: "Прашок за пециво", aliases: ["прашок за пециво"], unit: "kg", defaultAmount: 0.012, require: /ПРАШОК ЗА ПЕ/ },
  { id: "vanilin-seker", label: "Ванилин шеќер", aliases: ["ванилин шеќер", "ванила шеќер"], unit: "kg", defaultAmount: 0.01, require: /ВАНИЛ/ },
  { id: "puding", label: "Пудинг (прашок)", aliases: ["пудинг"], unit: "kg", defaultAmount: 0.04, require: /ПУДИНГ/, exclude: /ПРОТЕИН/ },
  { id: "kakao", label: "Какао", aliases: ["какао"], unit: "kg", defaultAmount: 0.1, require: /КАКАО/, exclude: /КРЕМ|НАПИТОК|ТАБЛА/ },
  { id: "med", label: "Мед", aliases: ["мед"], unit: "kg", defaultAmount: 0.45, require: new RegExp(`МЕД${L}`, "u"), exclude: /СИРУП/ },
  { id: "marmalad", label: "Мармалад / џем", aliases: ["мармалад", "џем", "слатко"], unit: "kg", defaultAmount: 0.4, require: /МАРМАЛАД|МАРМЕЛАД|ЏЕМ|СЛАТКО/, exclude: /КОМПОТ|ЏЕМФИКС|ПЕКМЕЗ/ },
  { id: "krem-namaz", label: "Чоколаден крем (намаз)", aliases: ["крем", "еурокрем", "нутела", "чоколаден крем"], unit: "kg", defaultAmount: 0.35, require: /КРЕМ|НУТЕЛ/, exclude: /ПРОТЕИН|БИСКВИТ|КАРАМЕЛ|ТУБИЧКА/ },
  { id: "alva", label: "Алва / таан", aliases: ["алва", "таан"], unit: "kg", defaultAmount: 0.5, require: /АЛВА|ТААН/, exclude: /ОБЛАНДА/ },
  { id: "ajvar", label: "Ајвар", aliases: ["ајвар"], unit: "kg", equivalentUnits: ["l"], defaultAmount: 0.55, require: /АЈВ[АЕ]Р/ },
  { id: "kechap", label: "Кечап", aliases: ["кечап"], unit: "kg", equivalentUnits: ["l"], defaultAmount: 0.5, require: /КЕЧАП/ },
  { id: "majonez", label: "Мајонез", aliases: ["мајонез"], unit: "kg", equivalentUnits: ["l"], defaultAmount: 0.28, require: new RegExp(`МАЈОНЕЗ${L}|ВИТАНЕЗ`, "u") },
  { id: "senf", label: "Сенф", aliases: ["сенф"], unit: "kg", defaultAmount: 0.2, require: /СЕНФ/, exclude: /ПЕСТО/ },
  { id: "domaten-sos", label: "Доматен сос / пасата", aliases: ["доматен сос", "пасата", "томатело", "пелати", "доматно пире"], unit: "kg", equivalentUnits: ["l"], defaultAmount: 0.5, require: /ДОМАТ|ТОМАТ|ПАСАТА|ПЕЛАТИ|ПОМОДОР/, exclude: /КЕЧАП|СУШЕН|ПЕЧЕН МОДАР/ },
  { id: "supa", label: "Инстант супа / коцка", aliases: ["супа", "инстант супа", "коцка за супа"], unit: "kg", defaultAmount: 0.06, require: /СУПА|КОЦКА/ },
  { id: "vegeta", label: "Зачин за јадења (вегета)", aliases: ["вегета", "зачин", "дафинка"], unit: "kg", defaultAmount: 0.25, require: /ВЕГЕТА|ДАФИНКА|ЕВРО ЗАЧИН|ЈУМИС|ЗАЧИН ЗА|ДОДАТОК ЗА ЈАДЕЊА/ },
  { id: "biber", label: "Црн бибер", aliases: ["бибер"], unit: "kg", defaultAmount: 0.05, require: /БИБЕР/, exclude: /ЗРНО/ },
  { id: "crven-piper", label: "Црвен пипер (мелен)", aliases: ["црвен пипер", "алева"], unit: "kg", defaultAmount: 0.1, require: /ЦРВЕН ПИПЕР|АЛЕВА|ПАПРИКА/ },
  { id: "maslinki", label: "Маслинки", aliases: ["маслинки"], unit: "kg", defaultAmount: 0.5, byWeight: true, require: /МАСЛИН/, exclude: /МАСЛО|МАРГ|ПАШТЕТ|НАМАЗ/ },
  { id: "kornisoni", label: "Корнишони", aliases: ["корнишони", "кисели краставички"], unit: "kg", defaultAmount: 0.6, require: /КОРНИШОН|КРАСТАВИЧ/ },
  { id: "pechurki", label: "Печурки (конзерва)", aliases: ["печурки", "шампињони"], unit: "kg", defaultAmount: 0.4, require: /ШАМПИЊОН|ПЕЧУРК/, exclude: /СВЕЖ/ },
  { id: "pchenka-konzerva", label: "Пченка (конзерва)", aliases: ["пченка", "слатка пченка"], unit: "kg", defaultAmount: 0.34, require: /ПЧЕНКА/, exclude: /ПУКАНК|ЗАМРЗН|ФРИКОМ|ГАРДЕНИА|БРАШНО/ },
  { id: "grashok", label: "Грашок", aliases: ["грашок"], unit: "kg", defaultAmount: 0.45, require: /ГРАШОК/, exclude: /ПРЕГО|ШНИЦЛ|МЕСО/ },
  { id: "zelenchuk-zamrznat", label: "Замрзнат зеленчук (мешавина)", aliases: ["замрзнат зеленчук", "мешан зеленчук"], unit: "kg", defaultAmount: 0.4, require: /МЕШАВИН|МИКС|САЛАТА|ЗЕЛЕНЧУК/, exclude: /ПОМФРИТ|ГРАШОК|ПЧЕНКА/ },
  { id: "pomfrit", label: "Помфрит", aliases: ["помфрит"], unit: "kg", defaultAmount: 1, require: /ПОМФРИТ/ },

  // ── Свеж зеленчук и овошје ──
  { id: "kompiri", label: "Компири", aliases: ["компири", "компир"], unit: "kg", defaultAmount: 1, byWeight: true, require: /КОМПИР/, exclude: /ЧИПС|ПИРЕ|ПОМФРИТ|СЛАТК|БАТАТ/ },
  { id: "kromid", label: "Кромид", aliases: ["кромид"], unit: "kg", defaultAmount: 1, byWeight: true, require: /КРОМИД/ },
  { id: "luk", label: "Лук", aliases: ["лук", "бел лук"], unit: "kg", defaultAmount: 0.25, byWeight: true, require: new RegExp(`ЛУК${L}`, "u"), exclude: /ГЛАВИЦА|МЛАД|КРОМИД|ПРАЗ/ },
  { id: "domati", label: "Домати", aliases: ["домати", "домат"], unit: "kg", defaultAmount: 1, byWeight: true, require: /ДОМАТ/ },
  { id: "krastavici", label: "Краставици", aliases: ["краставици", "краставица"], unit: "kg", defaultAmount: 1, byWeight: true, require: /КРАСТАВИЦ/ },
  { id: "piperki", label: "Пиперки", aliases: ["пиперки", "пиперка"], unit: "kg", defaultAmount: 1, byWeight: true, require: /ПИПЕР/, exclude: /ЛУТ(?!ЕНИЦ)|ЦРВЕН ПИПЕР|МЕЛЕН/ },
  { id: "morkov", label: "Морков", aliases: ["морков", "моркови"], unit: "kg", defaultAmount: 1, byWeight: true, require: /МОРКОВ/ },
  { id: "zelka", label: "Зелка", aliases: ["зелка"], unit: "kg", defaultAmount: 1, byWeight: true, require: /ЗЕЛКА/, exclude: /КИСЕЛ|РЕЗАНА|ЛИСТ/ },
  { id: "limoni", label: "Лимони", aliases: ["лимони", "лимон"], unit: "kg", defaultAmount: 0.5, byWeight: true, require: /ЛИМОН/, exclude: /СОК/ },
  { id: "banani", label: "Банани", aliases: ["банани", "банана"], unit: "kg", defaultAmount: 1, byWeight: true, require: /БАНАН/ },
  { id: "jabolka", label: "Јаболка", aliases: ["јаболка", "јаболко"], unit: "kg", defaultAmount: 1, byWeight: true, require: /ЈАБОЛК/ },
  { id: "portokali", label: "Портокали", aliases: ["портокали", "портокал"], unit: "kg", defaultAmount: 1, byWeight: true, require: /ПОРТОКАЛ/ },

  // ── Пијалоци ──
  { id: "voda", label: "Вода (негазирана)", aliases: ["вода", "негазирана вода"], unit: "l", defaultAmount: 1.5, exclude: /ВКУС|ЛИМОН|ВИТАМИН|ДЕМИНЕРАЛ|ДЕСТИЛ/ },
  { id: "mineralna-voda", label: "Минерална (газирана) вода", aliases: ["минерална вода", "газирана вода", "кисела вода"], unit: "l", defaultAmount: 1.5, exclude: /ВКУС|ЛИМОН|НЕГАЗИР/ },
  { id: "sok", label: "Сок (негазиран)", aliases: ["сок", "сокови", "нектар"], unit: "l", defaultAmount: 1, exclude: /(?<!НЕ)ГАЗИР|БЕБИ|ХИПП|ЛЕДЕН|ЧАЈ|АЛОЕ|ИСО |ЕНЕРГ|СИРУП|ЛИМОНАДА/ },
  { id: "gaziran-sok", label: "Газиран сок", aliases: ["газиран сок", "кола", "кока кола", "пепси", "фанта", "спрајт"], unit: "l", defaultAmount: 1.5 },
  { id: "leden-chaj", label: "Леден чај", aliases: ["леден чај", "ладен чај"], unit: "l", defaultAmount: 1.5 },
  { id: "energetski", label: "Енергетски пијалок", aliases: ["енергетски пијалок", "ред бул"], unit: "l", defaultAmount: 0.25 },
  { id: "pivo", label: "Пиво", aliases: ["пиво", "пива"], unit: "l", defaultAmount: 0.5, exclude: /БЕЗАЛКОХОЛ|0\.0|(?<![\d.,])0 ?%|ПОВРАТНА АМБ|САЈДЕР/ },
  { id: "vino", label: "Вино", aliases: ["вино"], unit: "l", defaultAmount: 0.75, exclude: /ПУНЧ|КОКТЕЛ|ОВОШН|ВАРЕНО/ },
  { id: "rakija", label: "Ракија", aliases: ["ракија"], unit: "l", defaultAmount: 0.7 },
  {
    id: "kafe", label: "Кафе (турско, мелено)", aliases: ["кафе", "турско кафе", "мелено кафе"], unit: "kg", defaultAmount: 0.2,
    require: /КАФЕ|РИО|БРАВО|МЕРАК|ЕФЕНДИ|ХОРИЗОНТ|ГРАНД/,
    exclude: /ИНСТАНТ|ФРАПЕ|КАПСУЛ|ЕСПРЕСО|НЕСКАФЕ|КАПУЧИНО|\d ?ВО ?\d|МАКИЈАТО|ФИЛТЕР|ЛАВАЦА|ЗРНО|ОБЕЛУВАЧ|ДОЛЧЕ|ЛУНГО|ИЗИ|(?<!ГРАНД )ГОЛД|МЕЛИТА|ЈАКОБС|ЧИБО/,
  },
  { id: "instant-kafe", label: "Инстант кафе", aliases: ["нескафе", "инстант кафе"], unit: "kg", defaultAmount: 0.1, require: /НЕСКАФЕ|ИНСТАНТ|ГОЛД|ЈАКОБС/, exclude: /ЛАДНО|АЈС|\d ?ВО ?\d|КАПУЧИНО|ЛАТЕ|МАКИЈАТО|ФРАПЕ|ВКУС|КАПС/ },
  { id: "chaj", label: "Чај", aliases: ["чај", "чаеви"], unit: "kg", defaultAmount: 0.03, exclude: /ЛЕДЕН|ЛАДЕН|МАЧА/ },

  // ── Слатки и грицки ──
  { id: "cokolado", label: "Чоколадо", aliases: ["чоколадо", "чоколада"], unit: "kg", defaultAmount: 0.1, exclude: /ВО ПРАВ|ГОТВЕЊЕ|ПРЕЛИВ|БОНБОЊ|БОНБОН|ТОПЛО|ДЕСЕРТ|ОРИЗ|РАЈС/ },
  { id: "biskviti", label: "Бисквити / кекс", aliases: ["бисквити", "кекс"], unit: "kg", defaultAmount: 0.3 },
  { id: "napolitanki", label: "Наполитанки / вафли", aliases: ["наполитанки", "вафли"], unit: "kg", defaultAmount: 0.2, exclude: /ШТРУДЛ/ },
  { id: "chips", label: "Чипс", aliases: ["чипс"], unit: "kg", defaultAmount: 0.15, require: /ЧИПС|ПРИНГЛС/, exclude: /ТОРТИЉ|ОРИЗ|КИКИРИТК|МАКАРОНИ|СТАПЧЕ|ФАНКИ/ },
  { id: "flips", label: "Флипс / смоки", aliases: ["флипс", "смоки"], unit: "kg", defaultAmount: 0.08, exclude: /ЧОКО|ПИЦА/ },
  { id: "kikiriki", label: "Кикирики", aliases: ["кикирики"], unit: "kg", defaultAmount: 0.2, require: /КИКИРИ/, exclude: /ПУТЕР|ЧОКО|ЧИПС/ },
  { id: "sladoled", label: "Сладолед (кутија)", aliases: ["сладолед"], unit: "l", equivalentUnits: ["kg"], defaultAmount: 0.9, exclude: /МРАЗ/ },

  // ── Бебе ──
  { id: "peleni", label: "Пелени", aliases: ["пелени", "памперс"], unit: "pc", defaultAmount: 50, require: /ПЕЛЕН|ПАМПЕРС|ГАЌИЧ/, exclude: /ПОДЛОГА|КОНДОМ/ },
  { id: "vlazni-maramici", label: "Влажни марамчиња", aliases: ["влажни марамчиња", "влажни марамици"], unit: "pc", defaultAmount: 72, require: /МАРАМ/, exclude: /ШМИНК|ОЧИЛА|НАОЧАР|ПОВРШИН|ХАРТИЕН|ЏЕБНИ/ },

  // ── Домаќинство ──
  { id: "prashok", label: "Прашок за перење", aliases: ["прашок", "прашок за перење", "детергент за алишта", "детергент за перење"], unit: "kg", defaultAmount: 3, require: /ДЕТЕР|ПРАШОК|ПЕРСИЛ|АРИЕЛ|ФАКС|САВЕКС/, exclude: /ВАНИШ|ВЕНИШ|САПУН|ТЕЧЕН|ГЕЛ|КАПСУЛ|ДИСК|ОМЕК/ },
  { id: "techen-detergent", label: "Течен детергент за алишта", aliases: ["течен детергент", "гел за перење"], unit: "l", defaultAmount: 2, exclude: /САДОВИ|ОМЕКНУВАЧ/ },
  { id: "kapsuli-perenje", label: "Капсули за перење", aliases: ["капсули за перење", "капсули за алишта"], unit: "pc", defaultAmount: 20 },
  { id: "omeknuvac", label: "Омекнувач", aliases: ["омекнувач"], unit: "l", defaultAmount: 2, exclude: /СЕТ|\+|ПЕГЛАЊ/ },
  { id: "detergent-sadovi", label: "Детергент за садови (рачно)", aliases: ["детергент за садови", "средство за садови", "фери"], unit: "l", defaultAmount: 0.5, exclude: /АБРАЗИВ|КРЕМ|МАШИН|СЕТ|БЕБ/ },
  { id: "tableti-masina", label: "Таблети за машина за садови", aliases: ["таблети за машина", "таблети за садови"], unit: "pc", defaultAmount: 50, require: /ТАБЛЕТ|КАПСУЛ/, exclude: /НЕГА|ЧИСТЕЊЕ/ },
  { id: "toaletna-hartija", label: "Тоалетна хартија", aliases: ["тоалетна хартија", "тоалет хартија"], unit: "pc", defaultAmount: 10, require: /ТОАЛЕТ/ },
  { id: "kujnski-brisac", label: "Кујнски бришач", aliases: ["кујнски бришач", "бришач"], unit: "pc", defaultAmount: 2, require: /БРИ[СШ]АЧ/ },
  { id: "salfeti", label: "Салфети", aliases: ["салфети", "салвети"], unit: "pc", defaultAmount: 100, require: /САЛФЕТ|САЛВЕТ/, exclude: /БРИ[СШ]АЧ/ },
  { id: "vrekji", label: "Кеси за ѓубре", aliases: ["кеси за ѓубре", "вреќи за отпад", "кеси за смет"], unit: "pc", defaultAmount: 20, exclude: /ЗАМРЗН/ },
  { id: "sredstvo-pod", label: "Универзално средство (под)", aliases: ["средство за под", "универзално средство", "ајакс"], unit: "l", defaultAmount: 1, require: /УНИВ|ПОД|ПОВРШИН|АЈАКС|ЛИЛАК/, exclude: /СТАКЛ|ДРВЕН|МЕБЕЛ|МАРАМ/ },
  { id: "sredstvo-staklo", label: "Средство за стакло", aliases: ["средство за стакло", "за прозорци"], unit: "l", defaultAmount: 0.75, require: /СТАКЛ|ПРОЗОР/, exclude: /ВЕТРОБРАН/ },
  { id: "sredstvo-wc", label: "Средство за тоалет", aliases: ["средство за тоалет", "доместос"], unit: "l", defaultAmount: 0.75, require: /ТОАЛЕТ|ВЦ|WC|ДОМЕСТОС|ДАК|ШКОЛКА/, exclude: /СОЛНА|ОСВЕЖ/ },
  { id: "varakina", label: "Варакина", aliases: ["варакина", "белило"], unit: "l", defaultAmount: 1, require: /ВАР[АИ]КИН/ },

  // ── Хигиена ──
  { id: "sampon", label: "Шампон", aliases: ["шампон"], unit: "l", defaultAmount: 0.4, exclude: /РЕГ\.|ДЕЦА|БЕБЕ|ДЕТСКИ|КУПКА|РЕГЕНЕРАТОР|СЕТ|БАЛЗАМ|БАЛСАМ|СПРЕЈ|МАСКА/ },
  { id: "regenerator", label: "Регенератор за коса", aliases: ["регенератор", "балсам за коса"], unit: "l", defaultAmount: 0.2 },
  { id: "gel-tus", label: "Гел за туширање", aliases: ["гел за туширање", "туш гел", "купка"], unit: "l", defaultAmount: 0.4, exclude: /ДЕТ|ДЕЦА|СЕТ/ },
  { id: "sapun", label: "Сапун", aliases: ["сапун"], unit: "kg", defaultAmount: 0.09, exclude: /ТЕЧЕН|ПЕРЕЊЕ|ДЕТСК|БЕБ/ },
  { id: "techen-sapun", label: "Течен сапун", aliases: ["течен сапун"], unit: "l", defaultAmount: 0.5 },
  { id: "pasta-zabi", label: "Паста за заби", aliases: ["паста за заби"], unit: "l", defaultAmount: 0.075, exclude: /ДЕЦА|ДЕТСК|ЈУНИОР|ЧЕТК|СЕТ|ИСПЛАКН|ЛИСТЕРИН/ },
  { id: "cetka-zabi", label: "Четка за заби", aliases: ["четка за заби", "четкичка"], unit: "pc", defaultAmount: 1, require: /ЧЕТК/, exclude: /ЕЛ\.|ЕЛЕКТР|ПАСТА|ДЕЦА|ДЕТСК|6\+|ЧЕПКАЛ|КОНЕЦ/ },
  { id: "dezodorans", label: "Дезодоранс", aliases: ["дезодоранс", "део"], unit: "l", defaultAmount: 0.15, exclude: /СЕТ|СТАПАЛА/ },
  { id: "vloski", label: "Хигиенски влошки", aliases: ["влошки", "хигиенски влошки"], unit: "pc", defaultAmount: 10, require: /ВЛОШК|ОЛВЕЈС|ОНА/, exclude: /ПАЗУВ|СЕКОЈДНЕВ|ДНЕВНИ|ЛАЈНЕР/ },
  { id: "dnevni-vloski", label: "Секојдневни влошки", aliases: ["дневни влошки", "секојдневни влошки"], unit: "pc", defaultAmount: 30, require: /СЕКОЈДНЕВ|ДНЕВНИ|ЛАЈНЕР/ },

  // ── Миленици ──
  { id: "hrana-kuce", label: "Храна за куче", aliases: ["храна за куче", "храна за кучиња"], unit: "kg", defaultAmount: 0.4, exclude: /МАЧ|ПЕСОК/ },
  { id: "hrana-mace", label: "Храна за мачка", aliases: ["храна за мачки", "храна за маче", "храна за мачка"], unit: "kg", defaultAmount: 0.1, require: /МАЧ/, exclude: /ПЕСОК/ },
];

export const TYPES_BY_ID = new Map(CATALOG.map((t) => [t.id, t]));
