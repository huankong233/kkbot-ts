import { loadConfig } from '@/libs/loadConfig.ts'
import { makeSystemLogger } from '@/libs/logger.ts'
import { execSync } from 'child_process'
import { compare } from 'compare-versions'
import fs from 'fs'
import { jsonc } from 'jsonc'
import path from 'path'
import url from 'url'

const logger = makeSystemLogger({ pluginName: 'loadPlugin' })

export interface manifest {
  name: string
  description: string
  author: { name: string; link: string }[]
  version: string
  plguinVersion: string
  dependPackages?: { [key: string]: string }
  dependPlugins?: { [key: string]: string }
  installed?: boolean
  disableAutoLoadConfig?: boolean
  disableLoadInDir?: boolean
  configName?: string
}

/**
 * 加载单个插件
 * @param pluginName 插件名
 * @param pluginDir 插件路径
 * @param _loadFromDir 是否是使用文件夹加载的
 */
export async function loadPlugin(pluginName: string, pluginDir = 'plugins', _loadFromDir = false) {
  const { plugins, data, baseDir, packageData } = global

  // 插件绝对路径
  const pluginAbsoluteDir = path.join(baseDir, pluginDir, pluginName)

  if (!fs.existsSync(pluginAbsoluteDir)) return logger.WARNING(`插件 ${pluginName} 文件夹不存在`)

  // 插件manifest路径
  let manifestPath = path.join(pluginAbsoluteDir, `manifest.jsonc`)

  if (!fs.existsSync(manifestPath))
    return logger.WARNING(`插件 ${pluginName} mainifest.jsonc 不存在`)

  let manifest: manifest

  // 检查插件兼容情况
  try {
    manifest = jsonc.parse(fs.readFileSync(manifestPath, { encoding: 'utf-8' }))
  } catch (error) {
    logger.WARNING(`插件 ${pluginName} manifest.jsonc 加载失败`)
    logger.ERROR(error)
    return
  }

  const {
    plguinVersion = '0.0.0',
    dependPackages = {},
    dependPlugins = {},
    installed = false,
    disableAutoLoadConfig = false,
    disableLoadInDir = false,
    configName = 'config'
  } = manifest

  if (disableLoadInDir && _loadFromDir) {
    if (debug) logger.DEBUG(`插件 ${pluginName} 禁止在文件夹中自动加载`)
    return
  }

  if (compare(plguinVersion, packageData.plguinVersion, '<')) {
    logger.NOTICE(
      `插件 ${pluginName}@${plguinVersion} 兼容的插件系统版本低于当前插件系统版本，可能有兼容问题`
    )
  }

  // 如果还没安装就安装一次
  if (!installed) {
    // 如果还没安装
    let installCommand = 'pnpm install'

    for (const key in dependPackages) {
      const value = dependPackages[key]
      installCommand += ` ${key}@${value}`
    }

    if (installCommand !== 'pnpm install') {
      try {
        execSync(installCommand)
      } catch (error) {
        logger.WARNING(`插件 ${pluginName} 依赖的包安装失败`)
        logger.ERROR(error)
        return
      }
    }

    // 回写manifest文件
    manifest.installed = true
    fs.writeFileSync(manifestPath, jsonc.stringify(manifest))
  }

  // 检查是否存在依赖
  const dependPluginsKeys = Object.keys(dependPlugins)
  if (dependPluginsKeys.length !== 0) {
    for (const key in dependPlugins) {
      const requireVersion = dependPlugins[key]
      const depend = plugins[key]

      if (!depend)
        return logger.WARNING(
          `插件 ${pluginName} 缺少依赖,所依赖的插件有:`,
          dependPluginsKeys.toString()
        )

      const dependVersion = depend.manifest.version

      if (compare(dependVersion, requireVersion, '!=')) {
        logger.NOTICE(`插件 ${pluginName} 所依赖的插件 ${key} 版本不一致,可能存在兼容性问题`)
      }
    }
  }

  const filePath = path.join(pluginAbsoluteDir, 'index.ts')

  if (!fs.existsSync(filePath)) return logger.WARNING(`插件 ${pluginName} 的 index.ts 文件不存在`)

  let program

  try {
    program = await import(url.pathToFileURL(filePath).toString())
  } catch (error) {
    logger.WARNING(`插件 ${pluginName} 代码有误,导入失败`)
    logger.ERROR(error)
    return
  }

  if (program.enable === false) return logger.NOTICE(`插件 ${pluginName} 未启用`)

  plugins[pluginName] = { manifest, pluginPath: pluginAbsoluteDir, configPath: null, loaded: false }

  // 自动加载配置文件
  if (!disableAutoLoadConfig) {
    // 加载配置文件
    if ((await loadConfig(configName, true, pluginAbsoluteDir, false, pluginName)) === 'unloaded')
      return logger.WARNING(`加载 ${pluginName} 插件的配置文件出错`)
  }

  data[`${pluginName}Data`] = {}

  // 循环检查是否存在
  if (plugins[pluginName]?.loaded) return logger.WARNING(`插件 ${pluginName} 已经加载过了`)
  if (!program.default) return logger.WARNING(`加载插件 ${pluginName} 失败，插件不存在默认导出函数`)

  try {
    global.nowLoadPluginName = pluginName
    await program.default()
    logger.SUCCESS(`加载插件 ${pluginName} 成功`)
  } catch (error) {
    logger.WARNING(`加载插件 ${pluginName} 失败,失败日志:`)
    logger.ERROR(error)
    return
  }

  plugins[pluginName].loaded = true

  return 'success'
}

/**
 * 加载多个插件
 * @param plugins 插件名
 * @param pluginDir 插件路径
 * @param _loadFromDir 是否是使用文件夹加载的
 */
export async function loadPlugins(plugins: string[], pluginDir = 'plugins', _loadFromDir = false) {
  for (const pluginName of plugins) {
    await loadPlugin(pluginName, pluginDir, _loadFromDir)
  }
}

/**
 * 加载指定文件夹中的所有插件
 * @param pluginDir
 */
export async function loadPluginDir(pluginDir: string) {
  //获取文件夹内文件
  let plugins

  if (!fs.existsSync(pluginDir)) return logger.WARNING(`文件夹 ${pluginDir} 不存在`)
  plugins = fs.readdirSync(pluginDir)
  await loadPlugins(plugins, pluginDir, true)
  if (debug) logger.DEBUG(`文件夹: ${pluginDir} 中的插件已全部加载!`)
}
