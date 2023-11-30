import { makeSystemLogger } from '@/libs/logger.ts'
import fs from 'fs'
import { jsonc } from 'jsonc'
import path from 'path'

const logger = makeSystemLogger({
  pluginName: 'loadConfig'
})

/**
 * 加载单个配置文件
 * @param configName 配置文件名称
 * @param RegToGlobal 是否注册到全局变量
 * @param configPath 配置文件所在的位置
 * @param forceOverride 是否强制覆盖原有配置文件
 * @param _pluginName 内部实现使用,请勿传入
 */
export async function loadConfig(
  configName: string,
  RegToGlobal = true,
  configPath = `./config`,
  forceOverride = false,
  _pluginName: string
) {
  const configFullPath = path.join(configPath, `${configName}.jsonc`)
  const defaultConfigFullPath = path.join(configPath, `${configName}.default.jsonc`)

  // 检查配置文件是否存在
  if (!fs.existsSync(configFullPath)) {
    // 检查默认配置文件是否存在
    if (fs.existsSync(defaultConfigFullPath)) {
      logger.WARNING(`插件 ${configPath} 需要手动配置信息`)
    } else {
      logger.WARNING(`插件 ${configPath} 配置的自动加载的配置文件不存在`)
    }
    return 'unloaded'
  }

  try {
    //获取配置文件内容
    const configData = jsonc.parse(fs.readFileSync(configFullPath, { encoding: 'utf-8' }))

    if (RegToGlobal) {
      const { config } = global

      // 优先配置文件中配置的配置文件名 然后是传入的插件名 如果插件名也不存在就直接使用配置文件的名称
      const indexName = configData.configName ?? _pluginName ?? configName
      const oldConfig = config[indexName]

      // 如果存在配置文件
      if (oldConfig) {
        const canOverride = forceOverride ? true : oldConfig['override'] ?? false

        if (!canOverride) {
          if (debug) logger.DEBUG(`配置文件 ${configFullPath} 禁止被重写`)
          return 'unloaded'
        }
      }

      config[`${indexName}Config`] = configData
      plugins[indexName]['configPath'] = configFullPath
    }

    return configData
  } catch (error) {
    logger.WARNING(`配置文件 ${configFullPath} 加载失败,请检查`)
    logger.ERROR(error)
    return 'unloaded'
  }
}
