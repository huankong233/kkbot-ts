import { retryGet } from '@/libs/axios.ts'
import { humanNum } from '@/libs/humanNum.ts'
import { makeLogger } from '@/libs/logger.ts'
import { Image, Text } from 'node-open-shamrock'

const logger = makeLogger({ pluginName: 'bilibili', subModule: 'video' })

export const getVideoInfo = async (params: { aid?: string; bvid?: string }) => {
  try {
    const {
      data: { code, message, data }
    } = await retryGet(`https://api.bilibili.com/x/web-interface/view`, {
      params,
      timeout: 10000
    })

    if (code === -404) return Text({ text: '该视频已被删除' })
    if (code !== 0) return Text({ text: `Error: (${code})${message}` })

    const {
      bvid,
      aid,
      pic,
      title,
      owner: { name },
      stat: { view, danmaku }
    } = data

    return [
      Image({ url: pic }),
      Text({
        text: [
          `av${aid}`,
          title,
          `UP：${name}`,
          `${humanNum(view)}播放 ${humanNum(danmaku)}弹幕`,
          `https://www.bilibili.com/video/${bvid}`
        ].join('\n')
      })
    ]
  } catch (error) {
    logger.WARNING(`[error] bilibili get video info ${JSON.stringify(params)}`)
    logger.ERROR(error)
    return Text({ text: '获取信息失败~' })
  }
}
