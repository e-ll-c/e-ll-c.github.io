// ==UserScript==
// @name        LO card sortable
// @namespace   elltaso
// @description 対戦整理でカードをドラッグで並び替えできるようにする
// @updateURL   https://e-ll-c.github.io/okiba/happa/lo_card_sortable.js
// @include     http://ykamiya.sakura.ne.jp/cgi-bin/rep0.cgi
// @require     http://rubaxa.github.io/Sortable/Sortable.js
// @resource    style https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css
// @version     1
// @grant       none
// ==/UserScript==


(function($) {
  let sorting = false;
  const table = document.querySelector('form[action = "rep0.cgi"] table.ma[width = "878"]');

  if (!table || table.querySelector('input[name ^= "ActSnImg"]')) {
    return;
  }

  css = document.styleSheets.item(0);
  css.insertRule('.handle-move { cursor: move; padding: 0 .5rem; margin-left: .5rem; border: 1px solid #ddd; background: #f8f8f8; font-weight: bold; }', 0);
  css.insertRule('#do-sort:hover { position: static; text-decoration: none; color: #000; border: 1px solid #666; }', 0);
  css.insertRule('#do-sort { color: #666; border: 1px solid #c0c0c0; background: #f8f8f8; font-size: .8rem; padding: .3rem; transition: .2s; margin-bottom: 1rem; display: inline-block; }', 0);
  css.insertRule('.target-delete input { color: #dd008a; }', 0);
  css.insertRule('.target-eno input { color: #0096c1; }', 0);
  css.insertRule('.target-name { font-size: .8rem; display: none; }', 0);
  css.insertRule('.target-eno .target-name { display: block; }', 0);
  css.insertRule('input[name ^=ActSnCall] { width: 270px; }', 0);

  const tbody = table.querySelector('tbody');
  const div = document.createElement('div');
  table.parentNode.insertBefore(div, table);
  div.insertAdjacentHTML(
    'afterbegin',
    '<p class="note">ドラッグ & ドロップで並び替えると番号が自動で振り直されます。手動で入れた番号がある場合は、並び替え操作の前にソートを実行して下さい。</p>' +
    '<a href="#" id="do-sort">現在の番号でソート</a>' );

  function reNumber(e) {
    table.querySelectorAll('input[name ^= "SSsetNo"]')
      .forEach((elem, index) => { elem.value = (index + 1) * 10 });
  }

  function sortAll(e) {
    e.preventDefault();

    if (sorting) {
      return;
    }

    sorting = true;

    [].slice.call(tbody.querySelectorAll('tr:nth-child(n+2)'))
      .map(tr => {
        let value = parseInt(tr.querySelector('input[name ^= "SSsetNo"]').value);
        return { dom: tr, value: value ? value : 0 };
      })
      .sort((a, b) => { return a.value - b.value })
      .forEach((v) => { tbody.appendChild(v.dom) });

    reNumber();
    sorting = false;
  }

  function checkTarget(e) {
    let target = parseInt(this.value);
    let td = this.parentNode;
    let targetName = td.querySelector('.target-name');

    td.className = '';
    targetName.textContent = '';

    if (target === 0) {
      td.className = 'target-delete';
      return;
    }

    if (!target) {
      return;
    }
    else {
      td.className = 'target-eno';
    }

    new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      targetName.textContent = 'loading ...';
      xhr.open('GET', 'http://ykamiya.sakura.ne.jp/result/result_chara/result_Eno' + target + '.html', true);
      xhr.overrideMimeType('text/html; charset=Shift_JIS');
      xhr.responseType = 'document';
      xhr.onload = (e) => resolve(e.target.responseXML);
      xhr.send();
    })
    .then(dom => {
      try {
        targetName.textContent = dom.getElementsByTagName('title').item(0).textContent;
        return;
      }
      catch (e) {
        //
      }

      td.className = '';
    });
  }

  document.getElementById('do-sort').addEventListener('click', sortAll);

  table.querySelectorAll('input[name ^= "ActCardTa"]')
    .forEach((elem, index) => {
      let handle = document.createElement('span');
      handle.className = 'handle-move';
      handle.textContent = '↕';
      elem.parentNode.appendChild(handle);

      let targetName = document.createElement('span');
      targetName.className = 'target-name';
      elem.parentNode.appendChild(targetName);

      elem.parentNode.parentNode.classList.add('draggable');
      elem.addEventListener('change', checkTarget, false, true);
    });

  const sortable = Sortable.create(tbody, {
    handle: '.handle-move',
    animation: 150,
    draggable: '.draggable',
    scrollSpeed: 20,
    onUpdate: reNumber,
  });
})();