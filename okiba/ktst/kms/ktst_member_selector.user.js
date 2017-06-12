// ==UserScript==
// @name        Ktst member selector
// @namespace   elltaso
// @description コトシタのパーティーメンバー選択をちょっとやりやすくする
// @include     http://lisge.com/kk/a_story.php*
// @include     http://lisge.com/kk/a_party.php*
// @updateURL   https://e-ll-c.github.io/okiba/ktst/kms/ktst_member_selector.user.js
// @installURL  https://e-ll-c.github.io/okiba/ktst/kms/ktst_member_selector.user.js
// @downloadURL https://e-ll-c.github.io/okiba/ktst/kms/ktst_member_selector.user.js
// @resource    style https://e-ll-c.github.io/okiba/ktst/kms/style.css?20170612-1
// @version     1.0.0
// @grant       GM_addStyle
// @grant       GM_getResourceText
// ==/UserScript==

(function($) {
  const signature = 'Ktst member selector';
  const profileData = [];
  let dlCount = 0;

  if (!getTable()) {
    return;
  }

  initialize();

  function fetchProfile(eno, callback) {
    dlCount++;
    updateIndicator();
    const url = 'http://lisge.com/kk/?id=' + eno;

    return fetch(url)
      .then(response => response.text())
      .then(text => {
        const dom = (new window.DOMParser()).parseFromString(text, 'text/html');
        const data = parseProfile(dom);

        if (data) {
          profileData[eno] = data;
          callback(data);
        }
      })
      .catch(err => {
        console.log('fetch failed: ' + err);
      })
      .then(() => {
        dlCount--;
        updateIndicator();
      });
  }

  function updateIndicator() {
    document.getElementById('elts-indicator').style.display = dlCount? 'block' : 'none';
    document.getElementById('elts-dl-count').textContent = dlCount;
  }

  function parseProfile(dom, eno) {
    const div = dom.querySelector('.CTT');

    if (!div) {
      return null;
    }

    let m = div.querySelector('.N5').textContent.match(/ENo.(\d+) (.+)/);

    const data = {
      eno: m[1],
      username: m[2],
      image: div.querySelector('.TST2 img.IC').cloneNode(true),
      fav: ~~ div.querySelector('#FAV').textContent,
      skill: {},
      position: {},
    }

    const destination = ['tobatsu', 'ransen', 'rensyu', 'story'];
    destination.forEach((name, i) => {
      const table = div.querySelector('table#CL5' + (i + 1));
      data.skill[name] = parseSkillTable(table, name);

      let position = table.querySelector('.G2').textContent;
      position = position.replace(/[０-９]/g, s => { return String.fromCharCode(s.charCodeAt(0) - 65248) });

      let m = position.match(/隊列:(\d)　射程:(\d)/);
      data.position[name] = { position: ~~ m[1], range: ~~ m[2] };
    });

    const stats = div.querySelectorAll('.TST .T2');
    const params = ['st', 'ag', 'dx', 'in', 'vt', 'mn'];
    params.forEach((name, i) => data[name] = ~~ stats[i].textContent);
    data.total = params.reduce((sum, name) => { return sum + data[name] }, 0);

    return data;
  }

  function parseSkillTable(table, name) {
    const ul = document.createElement('ul');
    ul.classList.add('skill-list', name);

    function makeLi(e, className) {
      const li = document.createElement('li');
      ul.appendChild(li);
      li.className = className;

      let max = e.querySelector('.J7');
      if (max) {
        max = max.textContent.match(/(\d+)/)[1];
        max = '[x' + e.textContent.match(/(\d+)/)[1] + ']';
      }
      else {
        max = '';
      }

      li.insertAdjacentHTML(
        'afterbegin',
        '<span class="max">' + max + '</span>' +
        '<span class="desc">' + e.nextElementSibling.textContent + '</span>'
      );
    }

    table.querySelectorAll('.P2').forEach(e => makeLi(e, 'passive'));
    table.querySelectorAll('.B2').forEach(e => makeLi(e, 'active'));

    return ul;
  }

  function applyStyle() {
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.textContent = GM_getResourceText('style');
    document.getElementsByTagName('head').item(0).appendChild(style);
  }

  function getTable() {
    return isParty() ? document.querySelector('table.LST') : document.querySelector('#Mychk > table');
  }

  function isParty() {
    return document.getElementsByTagName('title').item(0).textContent == 'Party';
  }

  function isTobatsu() {
    return isParty() && document.getElementById('elts-selector').classList.contains('tobatsu');
  }

  function updateMember(e) {
    const table = document.getElementById('elts-member');
    table.childNodes.forEach(tr => tr.className = 'elts-m-hide');
    updateMemberCounter();

    getChecked()
      .forEach(checkbox => {
        const eno = ~~ checkbox.name.match(/(\d+)/)[1];
        const id = 'elts-' + eno;
        let row = document.getElementById(id);

        if (!row) {
          row = createMemberRow(checkbox, id, eno);
        }

        row.className = 'elts-m-show';
        row.querySelector('input').checked = true;
        table.appendChild(row);
      });

    const selector = '.elts-m-show .' + getDestination();

    if (!table.querySelector(selector + '-1')
        || (table.querySelector(selector + '-3') && !table.querySelector(selector + '-2'))) {
      table.className = 'error';
    }
    else {
      table.className = 'ok';
    }

    document.querySelector('.FOOT').style.marginBottom = 30 + document.getElementById('elts-selector').clientHeight + 'px';
  }

  function createMemberRow(checkbox, id, eno) {
    const orig = checkbox.parentNode.parentNode;
    const newCheckbox = document.createElement('input');
    const tr = document.createElement('tr');

    function cloneTd(elem) {
      const td = document.createElement('td');

      if (elem.tagName == 'TD') {
        elem.childNodes.forEach(node => td.appendChild(node.cloneNode(true)));
      }
      else {
        td.appendChild(elem);
      }

      return td;
    }

    tr.id = id;
    tr.dataset.eno = eno;
    tr.appendChild(cloneTd(newCheckbox));
    tr.appendChild(cloneTd(isParty() ? orig.querySelector('img.IS').parentNode : orig.querySelector('td.F2')));
    tr.appendChild(cloneTd(orig.querySelector('td.G2')));
    tr.appendChild(cloneTd(isParty() ? orig.nextElementSibling.querySelector('td.B2') : orig.querySelector('td.B2')));

    newCheckbox.name = id + '-input';
    newCheckbox.setAttribute('type', 'checkbox');
    newCheckbox.addEventListener('change', ev => {
      tr.className = 'elts-m-hide';
      const input = getTable().querySelector('input[name = "' + getCheckboxPrefix() + tr.dataset.eno + '"]');
      input.checked = false;
      updateMember();

      if (!isParty()) {
        input.dispatchEvent(new Event('change'));
      }
    });

    const image = tr.querySelector('td:nth-child(2)');
    const stats = tr.querySelector('td:nth-child(4)').textContent;
    let m;

    if (isParty()) {
      m = stats.match(/討\[(\d)(\d)\]/);
      image.classList.add('tobatsu-' + m[1]);

      m = stats.match(/練\[(\d)(\d)\]/);
      image.classList.add('rensyu-' + m[1]);
    }
    else {
      m = stats.match(/\[(\d)(\d)\]/);
      image.classList.add('story-' + m[1]);
    }

    return tr;
  }

  function createSelfRow(data) {
    const tr = document.createElement('tr');
    const eno = getMyEno();

    function wrap(elem) {
      const td = document.createElement('td');
      td.appendChild(elem);
      return td;
    }

    tr.id = 'elts-self';
    tr.dataset.eno = eno;
    tr.appendChild(document.createElement('td'));
    tr.appendChild(wrap(data.image));
    tr.appendChild(wrap(document.createTextNode(data.username)));

    const params = ['st', 'ag', 'dx', 'in', 'vt', 'mn',];
    const stats = document.createElement('td');
    const width = isParty() ? 252 : 281;

    stats.insertAdjacentHTML(
      'afterbegin',
      params.map(p => { return p.toUpperCase() + ':' + data[p] }).join(' ') + ` 計:${data.total}` +
      '<br>' +
      params.map((p, i) => {
        return `<img src="http://ktst.x0.to/p/s${i + 1}.png" width="${Math.round(width * data[p] / data.total)}" height="2">`;
      }).join('') +
      '<br>' +
      `<span id="elts-p-tobatsu">討[${data.position.tobatsu.position}${data.position.tobatsu.range}]</span>` +
      `<span id="elts-p-rensyu">練[${data.position.rensyu.position}${data.position.rensyu.range}]</span>` +
      `<span id="elts-p-story">[${data.position.story.position}${data.position.story.range}]</span>`);
    tr.appendChild(stats);

    tr.querySelector('td:nth-child(2)')
      .classList.add(
        'tobatsu-' + data.position.tobatsu.position,
        'rensyu-' + data.position.rensyu.position,
        'story-' + data.position.story.position);

    return tr;
  }

  function getMyEno() {
    return ~~ document.cookie.match(/KK_ENO=(\d+)/)[1];
  }

  function updateMemberCounter() {
    let max;

    if (!isParty()) {
      max = document.querySelector('.NG .P3 b').textContent;
    }
    else if (isTobatsu()) {
      let m = document.querySelector('select[name=TBT] option:checked').textContent.match(/【(\d+)人/);
      max = m ? m[1] : '?';
    }
    else {
      max = 5;
    }

    document.getElementById('elts-count').textContent = getChecked().length + 1 + '/' + max;
  }

  function getCheckboxPrefix() {
    if (!isParty()) {
      return 'smsm';
    }
    else if (isTobatsu()) {
      return 'tmtm';
    }
    else {
      return 'rmrm';
    }
  }

  function getDestination() {
    if (!isParty()) {
      return 'story';
    }
    else if (isTobatsu()) {
      return 'tobatsu';
    }
    else {
      return 'rensyu';
    }
  }

  function setDestination(destination) {
    const cl = document.getElementById('elts-selector').classList;
    cl.remove('story', 'tobatsu', 'rensyu');
    cl.add(destination);
    updateMember();
    updateSkillDesc();
  }

  function getChecked() {
    return getTable().querySelectorAll('input[name ^= "' + getCheckboxPrefix() + '"]:checked');
  }

  function handleClickIcon(e) {
    const cl = e.target.classList;

    if (cl.contains('IC') || cl.contains('IS') || cl.contains('IM')) {
      const tr = e.target.parentNode.parentNode;
      let eno = tr.dataset.eno;

      if (!eno) {
        eno = tr.dataset.eno = ~~ tr.querySelector('input[type=checkbox]').name.match(/(\d+)/)[1];
      }

      if (!profileData[eno]) {
        fetchProfile(eno, data => updateSkillDesc(data));
      }
      else {
        updateSkillDesc(profileData[eno]);
      }
    }
  }

  function handleChangeCheckbox(e) {
    if (e.target.getAttribute('type') == 'checkbox') {
      updateMember();
    }
  }

  function updateSkillDesc(data) {
    const div = document.getElementById('elts-skill');

    if (!data) {
      if (div.dataset.eno && profileData[div.dataset.eno]) {
        data = profileData[div.dataset.eno];
      }
      else {
        return;
      }
    }

    const list = div.querySelector('.skill-list');
    if (list) {
      div.removeChild(list);
    }

    div.dataset.eno = data.eno;
    div.classList.add('updated');
    div.querySelector('h2').textContent = 'ENo.' + data.eno + ' ' + data.username;
    div.appendChild(data.skill[getDestination()]);
  }

  function initialize() {
    applyStyle();

    document.querySelector('.MAIN').insertAdjacentHTML(
      'afterbegin',
      '<div id="elts-selector">' +
        '<h2>' +
          '<span class="u-arrow">▲</span><span class="d-arrow">▼</span>' +
          '選択メンバー (<span id="elts-count">0</span>)' +
        '</h2>' +
        '<div id="elts-destination">' +
          '<span id="elts-tobatsu">討伐戦</span><span id="elts-rensyu">練習戦</span>' +
        '</div>' +
        '<div id="elts-indicator">' +
          'Loading ... (<span id="elts-dl-count">0</span>)' +
        '</div>' +
        '<div id="elts-contents">' +
          '<table id="elts-member">' +
          '</table>' +
        '</div>' +
      '</div>');

    document.querySelector('.SUB').insertAdjacentHTML(
      'beforeend',
      '<div id="elts-skill">' +
        '<h2>Skill</h2>' +
        '<p class="note">リンカー一覧及び選択メンバーのアイコンをクリックでスキルをロードします。</p>' +
      '</div>');

    document.querySelector('form[name=act]').addEventListener('change', handleChangeCheckbox);
    document.addEventListener('click', handleClickIcon);

    const div = document.getElementById('elts-selector');
    div.querySelector('h2').addEventListener('click', e => div.classList.toggle('elts-s-hide'));

    if (isParty()) {
      document.querySelector('input[name=tclear]').addEventListener('click', updateMember);
      document.querySelector('select[name=TBT]').addEventListener('change', updateMemberCounter);

      setDestination('tobatsu');
      document.getElementById('elts-tobatsu').addEventListener('click', e => setDestination('tobatsu'));
      document.getElementById('elts-rensyu').addEventListener('click', e => setDestination('rensyu'));
    }
    else {
      document.querySelector('input[name=sclear]').addEventListener('click', updateMember);

      setDestination('story');
      document.getElementById('elts-destination').style.display = 'none';
    }

    fetchProfile(getMyEno(), data => {
      const table = document.getElementById('elts-member');
      table.insertBefore(createSelfRow(data), table.firstChild);
    });
  }
})();

