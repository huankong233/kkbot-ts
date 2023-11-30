import { makeLogger } from '@/libs/logger.ts'
import proxy from 'node-global-proxy'

const logger = makeLogger({ pluginName: 'proxy' })

export default function () {
  const { proxyConfig } = global.config as { proxyConfig: proxyConfig }
  if (proxyConfig.enable) {
    const NodeGlobalProxy = proxy.default
    NodeGlobalProxy.setConfig(proxyConfig.proxy)
    NodeGlobalProxy.start()
    logger.NOTICE('代理已启动')
  }
}
