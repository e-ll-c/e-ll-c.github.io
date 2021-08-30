import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { Command } from 'commander/esm.mjs'


const program = new Command()
program
  .option('--dpr <dpr>', 'dpr', 1)
  .parse(process.argv)
const dpr = program.opts().dpr
const sizes =JSON.parse(fs.readFileSync('grid.json', 'utf-8'))
const image = sharp(`all-dpr${dpr}.png`)


sizes.forEach(e => {
  image.extract({
    width: e.width * dpr,
    height: (e.height - 5) * dpr,
    left: 0,
    top: (e.top + 5) * dpr,
  })
  .toFile(path.join(`text-dpr${dpr}`, e.name))
  .then(info => {
    //console.log(info)
  })
  .catch(err => {
    console.log(e.name)
    console.log(err)
  })
})


sizes.forEach(e => {
  console.log(`img ${e.width} ${e.height - 5} https://e-ll-c.github.io/okiba/995/36/${e.name}`)
})
