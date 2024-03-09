import { getDir } from '@/libs/getDirName.ts'
import { makeSystemLogger } from '@/libs/logger.ts'
import fs from 'fs'
import { jsonc } from 'jsonc'
import path from 'path'

const logger = makeSystemLogger({ pluginName: 'publish' })
const baseDir = getDir(import.meta)

const pluginDirs = ['./plugins/builtInPlugins', './plugins/pigeon', './plugins/tools']
const originPackages = {
  'node-open-shamrock': '^0.0.6',
  axios: '^1.6.7',
  'cli-color': '^2.0.4',
  'compare-versions': '^6.1.0',
  'cz-customizable': '^7.0.0',
  jsonc: '^2.0.0',
  'mime-types': '^2.1.35',
  'node-emoji': '^2.1.3',
  tsx: '^4.7.1'
}

for (const pluginDir of pluginDirs) {
  const plugins = fs.readdirSync(path.join(baseDir, pluginDir))
  for (const plugin of plugins) {
    const manifestPath = path.join(baseDir, pluginDir, plugin, 'manifest.jsonc')
    const manifest = jsonc.parse(fs.readFileSync(manifestPath, 'utf-8'))
    delete manifest.installed
    fs.writeFileSync(manifestPath, jsonc.stringify(manifest))
    logger.SUCCESS(`已删除插件 ${plugin} 的 installed 字段`)
  }
}

const packagePath = path.join(baseDir, 'package.json')
let packageJSON = jsonc.parse(fs.readFileSync(packagePath, { encoding: 'utf-8' }))
packageJSON.dependencies = originPackages
fs.writeFileSync(packagePath, JSON.stringify(packageJSON))
logger.SUCCESS(`package.json 回写完成`)
