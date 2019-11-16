// ==UserScript==
// @name         Ibara Pop
// @namespace    https://twitter.com/e_ll_c
// @version      1.0.0
// @description  プロフポップアップするやつ
// @author       Ell
// @include      http://lisge.com/ib/chalist.php*
// @require      https://unpkg.com/axios/dist/axios.min.js
// @require      https://cdn.jsdelivr.net/npm/ismobilejs@1/dist/isMobile.min.js
// @updateURL    https://e-ll-c.github.io/scripts/ibpop/ibpop.user.js
// @installURL   https://e-ll-c.github.io/scripts/ibpop/ibpop.user.js
// @downloadURL  https://e-ll-c.github.io/scripts/ibpop/ibpop.user.js
// @grant        none
// ==/UserScript==


(function() {
  'use strict';

  const charaData = {}
  let timeoutId, currentEno

  setStyle()
  makePopup()
  setHandler()

  function setHandler () {
    const anchorList = document.querySelectorAll('td[width = "500"] a[href^="k/now/r"]')

    for (const anchor of anchorList) {
      const m = anchor.href.match(/r(\d+)\.html$/)
      if (!m) {
        return
      }

      const parent = anchor.parentElement
      const eno = ~~ m[1]
      const icon = parent.previousElementSibling.querySelector('a')

      if (icon) {
        //icon.removeAttribute('target')
        icon.setAttribute('href', `${anchor.href}#CHAPIC${eno}`)
      }

      if (isMobile.phone || isMobile.tablet) {
        const enoText = anchor.previousSibling
        const span = document.createElement('span')
        span.textContent = enoText.textContent
        span.dataset.eno = eno
        parent.removeChild(enoText)
        parent.insertBefore(span, anchor)
        span.addEventListener('click', handleEnter, { passive: true })
        document.body.classList.add('nyan-popup--touch')
      }
      else {
        anchor.dataset.eno = eno
        anchor.addEventListener('mouseenter', handleEnter, { passive: true })
        anchor.addEventListener('mouseleave', handleLeave, { passive: true })
      }
    }

    document.getElementById('nyan-popup').addEventListener('click', e => e.stopPropagation())
    document.querySelector('.nyan__nav__close').addEventListener('click', handleClosePopup)
    document.querySelector('.nyan__nav__prev').addEventListener('click', () => handleFetch(null, currentEno - 1))
    document.querySelector('.nyan__nav__next').addEventListener('click', () => handleFetch(null, currentEno + 1))
  }

  function handleEnter (e) {
    window.clearTimeout(timeoutId)
    const delay = (isMobile.phone || isMobile.tablet) ? 100 : 700
    timeoutId = window.setTimeout(() => handleFetch(e.target), delay)
  }

  function handleLeave () {
    window.clearTimeout(timeoutId)
  }

  function renderPopup (data) {
    currentEno = data.eno
    const nyan = document.getElementById('nyan-popup')
    const images = nyan.querySelector('.nyan-popup__images')

    for (const link of data.images) {
      const img = document.createElement('img')
      img.setAttribute('src', link)
      images.appendChild(img)
    }

    nyan.querySelector('.nyan-popup__text').textContent = data.text
    const link = nyan.querySelector('.nyan-popup__title__link')
    link.textContent = `ENo.${data.eno} ${data.name}`
    link.setAttribute('href', `/ib/k/now/r${data.eno}.html#CHAPIC${data.eno}`)

    document.body.classList.toggle('nyan-popup--has-next', true)
    document.body.classList.toggle('nyan-popup--has-prev', data.eno > 1)
  }

  function clearPopup () {
    const nyan = document.getElementById('nyan-popup')
    nyan.querySelector('.nyan-popup__text').textContent = ''
    nyan.querySelector('.nyan-popup__title__link').textContent = ''
    const images = nyan.querySelector('.nyan-popup__images')
    while (images.firstChild) {
      images.removeChild(images.firstChild)
    }
  }

  function handleClosePopup () {
    document.body.removeEventListener('click', handleClosePopup)
    document.body.classList.toggle('nyan-popup--open', false)
  }

  function handleOpenPopup () {
    document.body.classList.toggle('nyan-popup--open', true)
    document.body.addEventListener('click', handleClosePopup)
  }

  async function handleFetch (anchor, eno) {
    if (anchor) {
      eno = ~~ anchor.dataset.eno
    }

    if (isNaN(eno) || eno < 1) {
      return
    }

    if (charaData[eno]) {
      clearPopup ()
      handleOpenPopup()
      renderPopup(charaData[eno])
      return
    }

    if (document.body.classList.contains('nyan-popup--loading')) {
      return
    }

    let res
    const timestamp = Date.now()
    document.body.classList.add('nyan-popup--loading')
    clearPopup ()
    handleOpenPopup()

    try {
      res = await axios.get(`/ib/k/now/r${eno}.html`, { responseType: 'document' })
    }
    catch (e) {
      document.querySelector('#nyan-popup .nyan-popup__text').textContent = e.response ? e.response.statusText : e.message
      document.body.classList.remove('nyan-popup--loading')
      return
    }

    charaData[eno] = {
      eno: eno,
      name: res.data.querySelector('.CNM').textContent,
      text: res.data.querySelector('.CPROF .SCA > span')
        .innerHTML.replace(/<br>/gi, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      images: [],
    }

    const code = res.data.querySelector('.CSEAT').previousElementSibling.textContent
    const m = code.match(/images = \[(.+)];/)
    if (m) {
      for (const link of m[1].split(/[',]/)) {
        if (!link || link === '../../p/nia.png') {
          continue
        }

        charaData[eno].images.push(link)
      }
    }

    renderPopup(charaData[eno])
    const delay = Math.max(0, 500 - (Date.now() - timestamp))
    window.setTimeout(() => document.body.classList.remove('nyan-popup--loading'), delay)
  }

  async function setStyle () {
    let res

    try {
      res = await axios.get('https://e-ll-c.github.io/scripts/ibpop/style.css?2019-11-16-1')
    }
    catch (e) {
      return
    }

    const style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    style.textContent = res.data
    document.getElementsByTagName('head').item(0).appendChild(style)
  }

  function makePopup () {
    document.body.insertAdjacentHTML('beforeend', '<div id="nyan-popup"><header class="nyan-popup__header"><h2 class="nyan-popup__title"><a class="nyan-popup__title__link" href=""></a></h2><nav><span class="nyan__nav__prev">&lt;</span><span class="nyan__nav__next">&gt;</span><span class="nyan__nav__close">×</span></nav></header><div class="nyan-popup__images"></div><div class="nyan-popup__text"></div></div>')
  }
})();
