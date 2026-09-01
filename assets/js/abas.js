// Abas de linguagem. Progressive enhancement: sem JS, todos os painéis ficam
// visíveis um abaixo do outro — o conteúdo nunca some.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.abas').forEach(function (grupo) {
    var paineis = Array.prototype.slice.call(grupo.querySelectorAll('.abas-painel'));
    if (paineis.length < 2) return;

    var barra = document.createElement('div');
    barra.className = 'abas-botoes';
    barra.setAttribute('role', 'tablist');

    paineis.forEach(function (painel, i) {
      var botao = document.createElement('button');
      botao.type = 'button';
      botao.textContent = painel.dataset.lang || 'Exemplo';
      botao.setAttribute('role', 'tab');
      botao.setAttribute('aria-selected', String(i === 0));
      botao.addEventListener('click', function () {
        paineis.forEach(function (p, j) {
          p.hidden = i !== j;
          barra.children[j].setAttribute('aria-selected', String(i === j));
        });
      });
      barra.appendChild(botao);
      painel.hidden = i !== 0;
    });

    grupo.insertBefore(barra, grupo.firstChild);
  });
});
