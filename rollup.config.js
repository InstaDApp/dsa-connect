import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript2'
import pkg from './package.json'

const banner = `
/*

${pkg.name} v${pkg.version}
${pkg.repository.url}

Copyright (c) ${pkg.author.name}

This source code is licensed under the ${pkg.license} license found in the
LICENSE file in the root directory of this source tree.

@bannerend*/
`

const external = [...Object.keys(pkg.dependencies || {})]
const plugins = [
  typescript({
    typescript: require('typescript'),
  }),
]

if (!process.env.ROLLUP_WATCH)
  plugins.push(
    terser({
      format: {
        // only permit banner comment
        comments: function (node, comment) {
          if (comment.type === 'comment2') {
            // multiline comment
            return /@bannerend/i.test(comment.value)
          }
        },
      },
    })
  )

export default [
  // Create CommonJS and ES Module for Node and modern browsers
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'es',
        banner,
      },
      {
        file: pkg.main_bundle,
        format: 'iife',
        name: 'DSA',
      },
    ],
    external,
    plugins,
  },
]
