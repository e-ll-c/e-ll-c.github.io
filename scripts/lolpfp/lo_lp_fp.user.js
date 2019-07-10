// ==UserScript==
// @name         Lo Lp Fp
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  なんか Lp Fp だすやつ
// @author       Ell
// @include      http://ykamiya.ciao.jp/result/result_pre/result_Pno*-*.html
// @require      https://unpkg.com/axios/dist/axios.min.js
// @updateURL    https://e-ll-c.github.io/scripts/lolpfp/lo_lp_fp.user.js
// @installURL   https://e-ll-c.github.io/scripts/lolpfp/lo_lp_fp.user.js
// @downloadURL  https://e-ll-c.github.io/scripts/lolpfp/lo_lp_fp.user.js
// @grant        none
// ==/UserScript==


(function() {
  'use strict';

  let stat = 'initial'
  const userList = []
  const nameDict = {}
  const reg = {
    switchUser: /^(.+?\(Pn\d+\))\s*?(の自動効果が発動|Action|の効果が発動|の先発が発動|が先導する|が後に続く|の罠効果が発動|の異常効果が発動|の瀕死効果が発動)/,
    fpDamage: /^(.+) は.*?FPに(\d+)のダメージ/,
    lpDamage: /^(.+) は.*?(\d+)のダメージ/,
    fpHeal: /^(.+) は.*?FPが(\d+)回復/,
    lpHeal: /^(.+) は.*?LPが(\d+)回復/,
    dead: /^(.+) は離脱/,
    chainConstruct: /にChain\d+：\*?(.+?)を構築$/,
    chain: /^Chain\d+：\*?(.+?)！$/,
    skillOnly: /^\*?(.+?)！$/,
  }

  setStyle()
  getUser()
  getEno()
  makeButton()

  async function handleAnalyze () {
    stat = 'analyzing'
    const nyan = document.getElementById('nyan-button')
    nyan.classList.add(stat)

    if (await getBattleSetting()) {
      analyze()
    }
    else {
      alert('なんか戦闘設定とるのにしっぱいしたからやめるね')
    }

    nyan.classList.remove(stat)
    stat = 'done'
    nyan.classList.add(stat)
    window.setTimeout(() => nyan.parentElement.removeChild(nyan), 300)
  }

  function setStyle () {
    const css = document.styleSheets[0]
    css.insertRule('.lpfp { color: #a0a0a0; }', 0)
    css.insertRule('.lpfp-add { color: #00cccc; }', 0)
    css.insertRule('.lpfp-sub { color: #ff3366; }', 0)
    css.insertRule('.lpfp-error { color: #ff0000; font-style: bold; }', 0)
    css.insertRule('#page-top #nyan-button { position: absolute; bottom: 90px; right: 20px; width: 40px; height: 40px; background-color: #666633; border-radius: 50%; color: #fff; cursor: pointer; transition: transform .2s; display: flex; justify-content: center; align-items: center; line-height: 1; }', 0)
    css.insertRule('#page-top #nyan-button:hover { transform: scale(1.1); }', 0)
    css.insertRule('#page-top #nyan-button.analyzing { animation: nyannyan 2s linear infinite; }', 0)
    css.insertRule('#page-top #nyan-button.done { transform: scale(0.1); }', 0)
    css.insertRule('@keyframes nyannyan { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) }}', 0)
    stat = 'styled'
  }

  function makeButton () {
    document.getElementById('page-top')
      .insertAdjacentHTML('beforeend', '<div id="nyan-button">★</div>')
    const nyan = document.getElementById('nyan-button')
    nyan.addEventListener('click', handleAnalyze, { passive: true })
  }

  async function getBattleSetting () {
    let url = 'http://ykamiya.ciao.jp/cgi-bin/command2.cgi'

    for (const pt of [userList.slice(0, 5), userList.slice(5, 10)]) {
      if (!pt.length) {
        break
      }

      const param = {}
      let res

      for (const [i, user] of pt.entries()) {
        param[`searchBefNow${i + 1}`] = '前回'
        param[i === 0 ? 'En_input' : `searchEn${i + 1}`] = user.eno
      }

      try {
        res = await axios.get(url, { params: param, responseType: 'document' })
      }
      catch (e) {
        console.log(e.response ? e.response.statusText : e.message)
        return false
      }

      parseBattleSetting(res.data, pt)
    }

    return true
  }

  function parseBattleSetting (doc, pt) {
    const users = doc.querySelector('table.ma tr:nth-of-type(2)').querySelectorAll('td[width="158"]')
    for (const [i, user] of users.entries()) {
      let skill
      const setting = {}

      for (const line of user.querySelector('table > tbody > tr:last-of-type > td').childNodes) {
        if (line.firstElementChild || line.tagName === 'BR') {
          continue
        }
        else if (line.nodeType === 3) {
          skill = line.textContent.trim()
        }
        else {
          const m = line.textContent.match(/\((\d+)\/(\d+)\)/)
          if (m) {
            setting[skill] = {
              lp: Number(m[1]),
              fp: Number(m[2])
            }
          }
        }
      }

      pt[i].setting = setting
    }
  }

  function getUser (table) {
    if (!table) {
      table = document.querySelector('table[width="698"]')
    }

    const tdList = table.querySelectorAll('td td')
    let user
    let count = 0

    const setLpFp = (user, td, type) => {
      const m = td.textContent.match(/(\d+)\/(\d+)/)
      const n = Number(m[1])

      if (user.hasOwnProperty(type)) {
        if (user[type] !== n) {
          console.log(`${type} ずれてる～: user ${user.pnName} 誤 ${user[type]} 正 ${n}`)
        }
      }

      user[type] = n
      user['m' + type] = Number(m[2])
    }

    for (const [i, td] of tdList.entries()) {
      const n = i - count * 4

      if (td.width === '285') {
        const m = td.querySelector('font').textContent.match(/^(.+?)\(Pn(\d+)\)/)
        const pnName = m[0]

        if (nameDict[pnName]) {
          user = nameDict[pnName]
        }
        else {
          user = {
            pnName: pnName,
            name: m[1],
            pn: Number(m[2]),
          }

          userList.push(user)
          nameDict[pnName] = user
        }
      }
      else if (td.querySelector('font[color="#ff6600"]')) {
        setLpFp(user, td, 'lp')
      }
      if (td.querySelector('font[color="#0066ff"]')) {
        setLpFp(user, td, 'fp')
        count++
      }
    }
  }

  function getEno () {
    const linkList = document.querySelector('#container #header:nth-of-type(2)').lastElementChild
    let index = 0

    for (const [i, anchor] of linkList.querySelectorAll('a').entries()) {
      const m = anchor.textContent.match(/Eno(\d+)/)
      if (!m) {
        console.log('Eno とれねぇ')
        continue
      }

      userList[i].eno = ~~ m[1]
    }

    stat = 'ready'
  }

  function analyze () {
    const battle = document.querySelector('#container #header:nth-of-type(2) > dt:nth-of-type(2)')
    let el = battle.firstElementChild
    let turn = 0

    while (el) {
      if (el.className === 'heading') {
        turn = Number(el.querySelector('b').textContent)
      }
      else if (el.tagName === 'DL' && turn > 0) {
        const newCursor = analyzeTurn(el.firstElementChild)
        if (newCursor) {
          el = newCursor
        }
      }
      else if (el.tagName === 'CENTER' && turn > 0) {
        getUser(el.firstElementChild)
      }

      el = el.nextElementSibling
    }
  }

  function parseSkillAction (el) {
    const i = el.querySelector('font[color="#009999"]:not([size]) i, font[color = "#666600"]:not([size]) i')

    if (!i) {
      return false
    }

    const line = el.textContent.trim()
    let m, result

    if (m = line.match(reg.chainConstruct)) {
      return { type: 'chainConstruct', name: m[1] }
    }
    else if (m = line.match(reg.chain)) {
      return { type: '1chain', name: m[1] }
    }
    else if (el.firstChild.color === '#009999' || el.firstChild.color === '#666600') {
      if (m = line.match(reg.skillOnly)) {
        return { type: 'normal', name: m[1].replace(/\s+/g, '') }
      }
      else {
        console.log(line)
      }
    }

    return false
  }

  function analyzeTurn (el) {
    let user, chain, item

    while (el) {
      if (el.tagName !== 'DD' && el.tagName !== 'DT') {
        return el
      }

      const line = el.textContent
      let m

      if (m = line.match(reg.switchUser)) {
        const action = m[2]
        user = nameDict[m[1]]
        !user && console.log(line)

        if (action === 'が先導する') {
          chain = true
          item = false
          let chainCursor = el.nextElementSibling
          let prev, fireUser

          while (chainCursor) {
            if (m = chainCursor.textContent.match(reg.switchUser)) {
              if (m[2] === 'が後に続く') {
                prev = chainCursor
                fireUser = nameDict[m[1]]
                !fireUser && console.log(chainCursor.textContent)
              }
              else {
                chainCursor = prev
                break
              }
            }

            chainCursor = chainCursor.nextElementSibling
          }

          while (chainCursor) {
            const action = parseSkillAction(chainCursor)
            if (action) {
              action.type = 'fire'
              createSkillIndicator(chainCursor, fireUser, action)
              break
            }

            chainCursor = chainCursor.nextElementSibling
          }
        }
        else if (action === 'が後に続く') {
          chain = true
          item = false
        }
        else if (action === 'の効果が発動') {
          chain = false
          item = true
        }
        else {
          chain = false
          item = false
        }
      }
      else if (m = line.match(reg.fpDamage)) {
        createIndicator(line, el, m[1], 0, ~~ m[2] * -1)
      }
      else if (m = line.match(reg.lpDamage)) {
        createIndicator(line, el, m[1], ~~ m[2] * -1, 0)
      }
      else if (m = line.match(reg.fpHeal)) {
        createIndicator(line, el, m[1], 0, ~~ m[2])
      }
      else if (m = line.match(reg.lpHeal)) {
        createIndicator(line, el, m[1], ~~ m[2], 0)
      }
      else if (m = line.match(reg.dead)) {
        createIndicator(line, el, m[1], 0, 0)
      }
      else if (!chain && !item) {
        const action = parseSkillAction(el)
        action && createSkillIndicator(el, user, action)
      }

      el = el.nextElementSibling
    }
  }

  function lpfp (user, lp, fp) {
    user.lp += lp
    user.fp += fp
    const olp = Math.max(0, user.lp - user.mlp)
    const ofp = Math.max(0, user.fp - user.mfp)
    user.lp = Math.min(user.lp, user.mlp)
    user.fp = Math.min(user.fp, user.mfp)

    return `<span class="lpfp"><span class="${(lp > 0) ? 'lpfp-add' : (lp < 0) ? 'lpfp-sub' : ''}">${user.lp}</span>/${user.mlp}, <span class="${(fp > 0) ? 'lpfp-add' : (fp < 0) ? 'lpfp-sub' : ''}">${user.fp}</span>/${user.mfp} ${olp ? `(over ${olp})` : '' } ${ofp ? `(over ${ofp})` : '' }</span>`
  }

  function createSkillIndicator (el, user, action) {
    const skill = user.setting[action.name]
    let tag

    if (skill) {
      if (user.lp < skill.lp || user.fp < skill.fp) {
        const description = `${user.pnName} ${action.type} ${action.name} (${skill.lp}/${skill.fp})`
        console.log(`消費の計算おかしい: ${description}`)
      }

      const slpfp = []
      skill.lp && slpfp.push(`${skill.lp}LP`)
      skill.fp && slpfp.push(`${skill.fp}FP`)
      tag = `<span class="lpfp">(${slpfp.join(' ')})</span> ${lpfp(user, skill.lp * -1, skill.fp * -1)}`
    }
    else {
      tag = `<span class="lpfp-error">? → ? (ずれた)</span>`
    }

    el.insertAdjacentHTML('beforeend', tag)
  }

  function createIndicator (line, el, userId, lp, fp) {
    const user = nameDict[userId]

    if (!user) {
      console.log(line)
      return
    }

    el.insertAdjacentHTML('beforeend', lpfp(user, lp, fp))
  }


})();