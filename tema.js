/* Aplica o tema salvo antes da primeira pintura (por isso fica no <head>, sem defer). */
try{var tm=localStorage.getItem("minha-carteira-v1-tema");if(tm==="branco"||tm==="preto"){document.documentElement.setAttribute("data-theme",tm);document.querySelector('meta[name="theme-color"]').content=tm==="preto"?"#000000":"#ffffff"}}catch(e){}
