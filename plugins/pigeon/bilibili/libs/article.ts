import { retryGet } from '@/libs/axios.ts'
import { humanNum } from '@/libs/humanNum.ts'
import { makeLogger } from '@/libs/logger.ts'
import { CQ } from 'go-cqwebsocket'
import { USER_AGENT } from './const.ts'

const logger = makeLogger({ pluginName: 'bilibili', subModule: 'article' })

export const getArticleInfo = async (id: string) => {
  try {
    const {
      data: { code, message, data }
    } = await retryGet(`https://api.bilibili.com/x/article/viewinfo?id=${id}`, {
      timeout: 10000,
      headers: {
        'User-Agent': USER_AGENT
      }
    })

    if (code !== 0) return `Error: (${code})${message}`

    const {
      stats: { view, reply },
      title,
      author_name,
      origin_image_urls: [img]
    } = data

    return [
      `${CQ.image(img)}`,
      `${CQ.escape(title)}`,
      `UP：${CQ.escape(author_name)}`,
      `${humanNum(view)}阅读 ${humanNum(reply)}评论`,
      `https://www.bilibili.com/read/cv${id}`
    ].join('\n')
  } catch (error) {
    logger.WARNING(`[error] bilibili get article info ${id}`)
    logger.ERROR(error)
    return '获取信息失败~'
  }
}
