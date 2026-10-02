// Скрипта за <head>: ја поставува избраната тема пред првото цртање (без блесок на
// погрешната). Обичен модул (не "use client"), за да ја користи серверскиот распоред.
// Клучот мора да одговара на storage.ts (префикс „poevtino:" + KEYS.theme).

export const THEME_BOOT_SCRIPT =
  'try{var t=JSON.parse(localStorage.getItem("poevtino:theme"));if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}';
