import fs from 'fs'
import readline from 'readline'
import path from 'path'
import ejs from 'ejs'
import urljoin from 'url-join'
import { JSDOM } from 'jsdom'
import { Command } from 'commander/esm.mjs';


const program = new Command()
program
  .option('--path <path>', 'path', '.')
  .option('--webroot <webroot>', 'webroot', '/okiba/sola/')
  .option('--force', 'force update')
  .parse(process.argv)
const options = program.opts()

main()



async function main () {
  const dir = options.path

  const days = fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(({ name }) => name)
    .filter(day => /^[-_\d]+$/.test(day))
    .sort()
    .reverse()

  const data = await Promise.all(days.map(async day => {
      const dataPath = path.join(dir, day, 'data.json'),
            indexPath = path.join(dir, day, 'index.html')

      const result = (!fs.existsSync(dataPath) || options.force) ?
        await createFloorData(dir, day, dataPath) : JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

      if (!fs.existsSync(indexPath) || options.force) {
        render(result, './template/floor.ejs', indexPath)
      }

      return result
    }))

  render({ data }, './template/index.ejs', path.join(dir, 'index.html'))
}


function render (data, template, output) {
  data.webroot = options.webroot

  ejs.renderFile(template, data, (err, html) => {
    if (err) {
      console.log(err)
    }
    else {
      try {
        fs.writeFileSync(output, html, 'utf8')
        console.log('create: ' + output)
      }
      catch (err) {
        throw err
      }
    }
  })
}


async function createFloorData (dir, day, dataPath) {
  const filenames = fs.readdirSync(path.join(dir, day), { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(({ name }) => name)
    .filter(name => /^[-_\d]+\.html$/.test(name))
    .sort()

  const floors = await Promise.all(filenames.map(async name => await readLogfile(dir, day, name)))
  const floorData = {
    floors: floors.filter(floor => Boolean(floor)),
    date: day,
  }

  fs.writeFile(dataPath, JSON.stringify(floorData, null, 2), err => {
    if (err) {
      throw err
    }
    else {
      console.log('create: ' + dataPath)
    }
  })

  return floorData
}


function createPlayerData(el) {
  const roleIcon = el.nextElementSibling.querySelector('img')
  const enoAnchor = el.querySelector('a')

  let icon = el.querySelector('img').src
  if (icon.match(/^\./)) {
    icon = urljoin(options.webroot, 'img', path.basename(icon))
  }

  return {
    eno: enoAnchor ? enoAnchor.href.match(/\d+/)[0] : null,
    icon,
    name: roleIcon.nextSibling.textContent.trim(),
    role: roleIcon.src.match(/(\w+)\.png$/)[1],
  }
}


async function readLogfile(dir, day, name) {
  const fullpath = path.join(dir, day, name)
  const readStream = readline.createInterface({ input: fs.createReadStream(fullpath) })
  let numlines = 0,
      html = '',
      success = false

  for await (const line of readStream) {
    numlines++
    html += line

    if (numlines > 500) {
      readStream.close()
    }

    if (line.indexOf('<div class="start">') != -1) {
      success = true
      readStream.close()
    }
  }

  if (success) {
    console.log('read: ' + fullpath)
  }
  else {
    console.log('failed: ' + fullpath)
    return
  }

  const dom = new JSDOM(html),
        doc = dom.window.document

  const party = Array.from(doc.querySelector('.teamleft').querySelectorAll('th[width="60"]'))
    .map(el => createPlayerData(el))

  const enemy = Array.from(doc.querySelector('.teamright').querySelectorAll('th[width="60"]'))
    .map(el => createPlayerData(el))

  return {
    path: urljoin(options.webroot, 'challedun', day, name),
    floor: path.basename(name, '.html'),
    party,
    enemy,
  }
}

