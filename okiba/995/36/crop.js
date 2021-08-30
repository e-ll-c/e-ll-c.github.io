import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const sizes =JSON.parse(fs.readFileSync('grid.json', 'utf-8'))
const image = sharp('all-dpr2.png')

sizes.forEach(e => {
  image.extract({ width: e.width * 2, height: (e.height - 5) * 2, left: 0, top: (e.top + 5) * 2 })
    .toFile(path.join('text-dpr2', e.name))
    .then(info => {
      //console.log(info)
    })
    .catch(err => {
      console.log(e.name)
      console.log(err)
    })
})


sizes.forEach(e => {
  console.log(`img ${e.width} ${e.height - 5} https://e-ll-c.github.io/okiba/995/36/text-dpr2/${e.name}`)
})
