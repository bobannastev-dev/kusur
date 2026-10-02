import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePrice, parseQuantity, parseUnitPrice } from "./parse.ts";

test("parsePrice: формати од ценовниците", () => {
  assert.equal(parsePrice("71 ден."), 71);
  assert.equal(parsePrice("145.00"), 145);
  assert.equal(parsePrice("1.250,50 ден."), 1250.5);
  assert.equal(parsePrice("1.250"), 1250);
  assert.equal(parsePrice("58,9ДЕН"), 58.9);
  assert.equal(parsePrice(""), null);
});

test("parseUnitPrice: се сведува на основна единица", () => {
  assert.deepEqual(parseUnitPrice("1кгр = 142.00 ден."), { unit: "kg", price: 142 });
  assert.deepEqual(parseUnitPrice("100 ГР: =44.9ДЕН"), { unit: "kg", price: 449 });
  assert.deepEqual(parseUnitPrice("100ml = 4.80 ден."), { unit: "l", price: 48 });
  assert.deepEqual(parseUnitPrice("1 ПАРЧЕ =13.5ДЕН"), { unit: "pc", price: 13.5 });
  assert.deepEqual(parseUnitPrice("1par = 7.50 ден."), { unit: "pc", price: 7.5 });
  // Жито понекогаш ја изостава единицата — тогаш не погодуваме.
  assert.equal(parseUnitPrice("100 = 48.90 ден."), null);
  assert.equal(parseUnitPrice("= 31.90 ден."), null);
});

test("parseQuantity: тежина и волумен", () => {
  assert.deepEqual(parseQuantity("МЕГЛЕ МЛЕКО 3.2% MM 1Л", ["l"]), { unit: "l", amount: 1 });
  assert.deepEqual(parseQuantity("ЛЕБ ЖИТО ЛУКС 470гр БЕЛ", ["kg"]), { unit: "kg", amount: 0.47 });
  assert.deepEqual(parseQuantity("Р СОНЧОГЛЕДОВО МАСЛО 905МЛ", ["l"]), { unit: "l", amount: 0.905 });
  assert.deepEqual(parseQuantity("ПЕРСИЛ УНИВЕРЗАЛ 80П 6КГ", ["kg"]), { unit: "kg", amount: 6 });
  assert.deepEqual(parseQuantity("МЛЕКО ЗА КАФЕ 10% 10х10гр.", ["kg"]), { unit: "kg", amount: 0.1 });
  // Јогуртот се пишува и во грамови и во милилитри.
  assert.deepEqual(parseQuantity("ЈОГУРТ БАЛАНС 250мл 0,9%", ["kg", "l"]), { unit: "l", amount: 0.25 });
  // Бренд што личи на количина („5КА") и производ на мерење немаат количина.
  assert.equal(parseQuantity("СИРЕЊЕ 5КА КРАВЈО РЕФУС 25%мм", ["kg"]), null);
  assert.equal(parseQuantity("ЗДРАВЈЕ РАДОВО КРАВЈО СИРЕЊЕ ВАКУМ КГ", ["kg"]), null);
});

test("parseQuantity: парчиња", () => {
  assert.deepEqual(parseQuantity("ЈАЈЦА ШЕСТ БРАЌА Л 10/1", ["pc"]), { unit: "pc", amount: 10 });
  assert.deepEqual(parseQuantity("ВЕЗЕШАРИ ЈАЈЦА М 1/18", ["pc"]), { unit: "pc", amount: 18 });
  assert.deepEqual(parseQuantity("ЈАЈЦА ШЕСТ БРАЌА 30/Л", ["pc"]), { unit: "pc", amount: 30 });
  assert.deepEqual(parseQuantity("ЈАЈЦА КЛАСА М табла 30ком. НАШЕ ЈАЈЦЕ", ["pc"]), { unit: "pc", amount: 30 });
  assert.deepEqual(parseQuantity("ТОАЛЕТ ХАРТИЈА ПРЕМИУМ 3слоја 8+2 СОФТЛИ", ["pc"]), { unit: "pc", amount: 10 });
  // „16рол … 3/1" = 3 пакувања по 16 ролни.
  assert.deepEqual(parseQuantity("ТОАЛЕТ ПЕРФЕКС СОФТ ЛАЈТ 16рол 3сл 3/1", ["pc"]), { unit: "pc", amount: 48 });
  // „8+2" со „/1" од која било страна е пак 10 ролни.
  assert.deepEqual(parseQuantity("ТОАЛЕТ ПЕРФЕКС 8+2/1М 3СЛОЈНА", ["pc"]), { unit: "pc", amount: 10 });
  assert.deepEqual(parseQuantity("ТОАЛЕТ ПЕРФЕКС 8/1+2 БЕЛА КАМИЛИЦА", ["pc"]), { unit: "pc", amount: 10 });
  assert.deepEqual(parseQuantity("ЕВРИ ДЕЈ ВЛОШКИ СЕКОЈДН. 40+20/1", ["pc"]), { unit: "pc", amount: 60 });
  // „15+" е тежина на детето, „+3ГОД" возраст — не се додаваат.
  assert.deepEqual(parseQuantity("ДЕТСКИ ПЕЛЕНИ БР.6 15+ 40/1 БИОБИА", ["pc"]), { unit: "pc", amount: 40 });
  assert.deepEqual(parseQuantity("ЧЕТКА ЗА ЗАБИ ДЕТСКА ДЕНТАМЕД 2/1 +3ГОД", ["pc"]), { unit: "pc", amount: 2 });
  // Ролни без однос; „1/N" значи N парчиња како досега, ролните не го надвладуваат.
  assert.deepEqual(parseQuantity("ТОАЛЕТНА ХАРТИЈА 16 ролни 3сл", ["pc"]), { unit: "pc", amount: 16 });
  assert.deepEqual(parseQuantity("КУЈНСКИ БРИШАЧ 2рол 1/10", ["pc"]), { unit: "pc", amount: 10 });
  // „РОЛЕТИ" е марка, не број на ролни.
  assert.deepEqual(parseQuantity("ТОАЛЕТ ХАРТ.3СЛ 100% ЦЕЛ.16/1 РОЛЕТИ", ["pc"]), { unit: "pc", amount: 16 });
});

test("parseQuantity: пакувања од типот 5+1", () => {
  assert.deepEqual(parseQuantity("ПРАШОК ЗА ПЕЦИВО ПОДРАВКА *12гр 5+1", ["kg"]), { unit: "kg", amount: 0.072 });
  assert.deepEqual(parseQuantity("САПУН 3+1х90гр. ПАЛМОЛИВЕ СОРТНО", ["kg"]), { unit: "kg", amount: 0.36 });
  assert.deepEqual(parseQuantity("СЕТ ВОДА ЕВИНА НЕГАЗИРАНА 1.5л 5+1ГРАТ", ["l"]), { unit: "l", amount: 9 });
  // „+" меѓу количини со единица не е број на парчиња.
  assert.deepEqual(parseQuantity("СЕТ ТЕЧЕН САПУН ПАЛМОЛАЈВ 300мл+300мл", ["l"]), { unit: "l", amount: 0.3 });
});
