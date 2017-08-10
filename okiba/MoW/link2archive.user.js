// ==UserScript==
// @name        霧のアーカイブにリンクするやつ
// @namespace   elltaso
// @description キャラのページにアーカイブへのリンクをつける
// @include     http://blacktea.sakura.ne.jp/mistofwar/RESULT/c*
// @include     http://mistofwar.kitunebi.com/M_o_W_4/*/RESULT/c*
// @updateURL   https://e-ll-c.github.io/okiba/MoW/link2archive.user.js
// @installURL  https://e-ll-c.github.io/okiba/MoW/link2archive.user.js
// @downloadURL https://e-ll-c.github.io/okiba/MoW/link2archive.user.js
// @version     0.0.0
// ==/UserScript==

(function($) {
  if (!getCurrentPage()) {
    return;
  }

  fetchArchiveList();

  function getCurrentPage() {
    try {
      return location.href.match(/RESULT\/(c[^/]+)/)[1];
    }
    catch (e) {
      return null;
    }
  }

  function fetchArchiveList() {
    fetch('http://dp26063111.lolipop.jp/dest/mow/mow_archive.json?' + Date.parse(new Date()), { mode: 'cors' })
      .then(response => response.json())
      .then(json => addLink(json.result))
      .catch(err => {
        console.log('fetch failed: ' + err);
      });
  }

  function addLink(data) {
    const div = document.createElement('div');
    document.getElementById('left_menu').appendChild(div);
    div.id = 'archive-list';

    const currentUrl = location.href.replace(location.hash, '');
    const currentPage = getCurrentPage();

    data.forEach(e => {
      let anchor;
      const href = e.base + 'RESULT/' + currentPage;
      const phase = (e.phase == -1) ? '最新' : e.phase;

      if (href == currentUrl) {
        anchor = document.createTextNode(phase);
      }
      else {
        anchor = document.createElement('a');
        anchor.textContent = phase;
        anchor.setAttribute('href', href);
      }

      div.appendChild(anchor);
      div.appendChild(document.createTextNode('\n'));
    });
  }
})();

