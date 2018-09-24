// LO card sortable
// 2.2.7 公式に組み込み

(function($) {
  const version = '2.2.7';
  const signature = 'LO#A card sortable';
  const stylesheet = 'https://e-ll-c.github.io/scripts/locs/locs.css?' + version;
  const include = '://ykamiya\.ciao\.jp/cgi-bin/rep0\.cgi';

  if (!location.href.match(include)) {
    return;
  }

  if (document.getElementsByClassName('locs-button').length) {
    return;
  }

  let title = document.querySelector('span#ch1');
  let sorting = false;

  if (!title) {
    return;
  }

  title = title.textContent.trim();

  if (title == '対戦整理') {
    initializeCardSortable()
  }
  else if (title == '対戦設定') {
    initializeBattleSettingLoader()
  }
  else {
    return;
  }

  function reNumber() {
    getCardTable().querySelectorAll('input[name *= "SsetNo"]')
      .forEach((elem, index) => { elem.value = (index + 1) * 10 });
  }

  function sortAll(e) {
    e.preventDefault();

    if (sorting) {
      return;
    }

    sorting = true;
    const tbody = getCardTable().querySelector('tbody');

    [].slice.call(tbody.querySelectorAll('tr:nth-child(n+2)'))
      .map(tr => {
        let order = parseInt(tr.querySelector('input[name *= "SsetNo"]').value);
        return { elem: tr, order: order ? order : 0 };
      })
      .sort((a, b) => { return a.order - b.order })
      .forEach((v) => { tbody.appendChild(v.elem) });

    reNumber();
    sorting = false;
  }

  function checkTarget(e) {
    let target = parseInt(this.value);
    let tr = this.parentNode.parentNode;
    let targetName = tr.querySelector('.target-name');

    tr.classList.remove('target-delete', 'target-eno');
    targetName.textContent = '';

    if (target === 0) {
      tr.classList.add('target-delete');
      return;
    }

    if (!target) {
      return;
    }

    fetch('http://ykamiya.ciao.jp/result/result_chara/result_Eno' + target + '.html')
      .then(res => res.text())
      .then(text => new DOMParser().parseFromString(text, 'text/html'))
      .then(dom => {
        try {
          targetName.textContent = dom.getElementsByTagName('title').item(0).textContent;
          tr.classList.add('target-eno');
          return;
        }
        catch (e) {
          targetName.textContent = '';
        }
      });
  }

  function applyStyle() {
    const link = document.createElement('link');
    link.setAttribute('type', 'text/css');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', stylesheet);
    document.getElementsByTagName('head').item(0).appendChild(link);
  }

  function getCardTable() {
    return document.querySelector('form[action = "rep0.cgi"] table.ma');
  }

  function loadLocalStorage() {
    const defaultData = { 'batlle-setting': [] };

    try {
      let data = JSON.parse(localStorage.getItem(signature));
      return data ? data : defaultData;
    }
    catch(e) {
      return defaultData;
    }
  }

  function saveLocalStorage(data) {
    try {
      localStorage.setItem(signature, JSON.stringify(data));
    }
    catch(e) {
      //
    }
  }

  function saveBS(e) {
    e.preventDefault();

    const data = loadLocalStorage();
    const select = document.getElementById('loader-target');
    const name = document.getElementById('loader-name');
    const old = data['batlle-setting'][select.value];
    let settingName;

    if (name.value) {
      settingName = name.value;
    }
    else if (old && old.name) {
      settingName = old.name;
    }
    else {
      settingName = '名称なし';
    }

    data['batlle-setting'][select.value] = {
      name: settingName,
      card: getBSFormData(),
    };

    saveLocalStorage(data);
    updateBSSelect();
  }

  function loadBS(e) {
    e.preventDefault();

    const data = loadLocalStorage();
    const select = document.getElementById('loader-target');
    const setting = data['batlle-setting'][select.value];

    if (!setting) {
      return;
    }

    let cardNames = {};

    getCardTable().querySelectorAll('select[name = "Sset1"] option')
      .forEach(option => {
        let name = getCardName(option.textContent);

        if (name) {
          if (!(name in cardNames)) {
            cardNames[name] = [];
          }

          cardNames[name].push(option.value);
        }
      });

    getCardTable().querySelectorAll('tbody > tr:nth-child(n+2)')
      .forEach((tr, index) => {
        const f = tr.querySelectorAll('input, select');
        const s = setting.card[index];

        if (s) {
          f[0].value = s.act;
          f[1].value = s.timing;
          f[2].value = s.x;
          f[4].value = s.wait;
          f[3].value = (s.cardName in cardNames && cardNames[s.cardName].length)
            ? cardNames[s.cardName].shift() : 0;
        }
      });
  }

  function getCardName(str) {
    const m = str.match(/Sno.+[：:](.+?Lv\d+)/);
    return m ? m[1] : null;
  }

  function clearBSName(e) {
    document.getElementById('loader-name').value = '';
  }

  function getBSFormData() {
    return [].slice.call(getCardTable().querySelectorAll('tbody > tr:nth-child(n+2)'))
      .map(tr => {
        const f = tr.querySelectorAll('input, select');

        return {
          act: f[0].value,
          timing: f[1].value,
          x: f[2].value,
          card: f[3].value,
          cardName: getCardName(f[3].querySelector('option:checked').textContent),
          wait: f[4].value,
        };
      });
  }

  function updateBSSelect() {
    const data = loadLocalStorage();

    document.getElementById('loader-target').childNodes.forEach(option => {
      if (data['batlle-setting'][option.value]) {
        option.textContent = data['batlle-setting'][option.value].name;
      }
    });

    clearBSName();
  }

  function initializeCardSortable() {
    const table = getCardTable();

    if (!table || table.querySelector('input[name ^= "ActSnImg"]')) {
      return;
    }

    applyStyle();

    const div = document.createElement('div');
    table.parentNode.insertBefore(div, table);
    div.insertAdjacentHTML(
      'afterbegin',
      '<p class="note">ドラッグ & ドロップで並び替えると番号が自動で振り直されます。<br />手動で入れた番号がある場合は、並び替え操作の前にソートを実行して下さい。</p>' +
      '<p><a href="#" class="locs-button" id="do-sort">現在の番号でソート</a></p>' );

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

    const sortable = Sortable.create(table.querySelector('tbody'), {
      handle: '.handle-move',
      animation: 150,
      draggable: '.draggable',
      scrollSpeed: 20,
      onUpdate: reNumber,
    });
  }

  function initializeBattleSettingLoader() {
    const table = getCardTable();

    if (!table || !table.querySelector('input[name ^= "SsetNo"]')) {
      return;
    }

    applyStyle();

    const div = document.createElement('div');
    table.parentNode.insertBefore(div, table);
    div.insertAdjacentHTML(
      'afterbegin',
      '<p>' +
      '<a href="#" class="locs-button" id="do-sort">現在の番号でソート</a>' +
      '<select id="loader-target"></select>' +
      '<input type="text" id="loader-name" />' +
      '<a href="#" class="locs-button" id="do-load">読み込み</a>' +
      '<a href="#" class="locs-button" id="do-save">保存</a>' +
      '</p>');

    const select = document.getElementById('loader-target');
    for (let i = 0; i < 10; i++){
      let option = document.createElement('option');
      option.value = i;
      option.textContent = 'no data ' + (i + 1);
      select.appendChild(option);
    }

    updateBSSelect();
    document.getElementById('do-sort').addEventListener('click', sortAll);
    document.getElementById('do-save').addEventListener('click', saveBS);
    document.getElementById('do-load').addEventListener('click', loadBS);
    document.getElementById('loader-target').addEventListener('change', clearBSName);

    table.querySelectorAll('select[name ^= "Stime"]')
      .forEach((elem, index) => {
        let handle = document.createElement('span');
        handle.className = 'handle-move';
        handle.textContent = '↕';
        elem.parentNode.appendChild(handle);
        elem.parentNode.parentNode.classList.add('draggable');
      });

    const sortable = Sortable.create(table.querySelector('tbody'), {
      handle: '.handle-move',
      animation: 150,
      draggable: '.draggable',
      scrollSpeed: 10,
      onUpdate: reNumber,
    });
  }
})();