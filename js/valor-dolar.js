/* Aporte · valor-dolar.js — formato do valor em US$ da lista Ativos (só exibição): < 1.000 → US$ 987,65 · US$ 4,3 mil · US$ 500 mil (sem decimal a partir de 100 mil, para caber na coluna de 360 px) · US$ 1,23 mi. */
function usdK(v){return v<1e3?usd.format(v):v<1e5?'US$ '+num(v/1e3,1)+' mil':v<999500?'US$ '+num(v/1e3,0)+' mil':'US$ '+num(v/1e6,2)+' mi'}
