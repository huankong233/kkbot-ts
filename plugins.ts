import { loadPlugin, loadPluginDir } from '@/libs/loadPlugin.ts'

// 加载插件(存在依赖关系在里面)
export default async function () {
  // 初始化机器人
  if ((await loadPlugin('bot', './plugins/builtInPlugins')) !== 'success') {
    throw new Error('机器人加载失败,请检查上方提示!')
  }

  await loadPluginDir('./plugins/builtInPlugins')
  await loadPluginDir('./plugins/tools')
  await loadPlugin('pigeon', './plugins/pigeon')
  await loadPluginDir('./plugins/pigeon')
  await loadPlugin('help', './plugins/tools')
}
