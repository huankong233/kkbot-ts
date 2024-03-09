import { retryGet } from '@/libs/axios.ts'
import { humanNum } from '@/libs/humanNum.ts'
import { makeLogger } from '@/libs/logger.ts'
import { USER_AGENT } from './const.ts'
import { purgeLinkInText } from './utils.ts'

const logger = makeLogger({ pluginName: 'bilibili', subModule: 'dynamic' })

const additionalFormatters = {
  // 投票
  ADDITIONAL_TYPE_VOTE: ({
    vote: { desc, end_time, join_num }
  }: JsonResponse['data']['item']['modules']['module_dynamic']['additional']) => [
    Text({
      text: [
        `【投票】${desc}`,
        `截止日期：${new Date(end_time * 1000).toLocaleString()}`,
        `参与人数：${humanNum(join_num)}`,
        '投票详情见原动态'
      ].join('\n')
    })
  ],

  // 预约
  ADDITIONAL_TYPE_RESERVE: ({
    reserve: { title, desc1, desc2 }
  }: JsonResponse['data']['item']['modules']['module_dynamic']['additional']) => {
    const lines = [title]
    const desc = [desc1?.text, desc2?.text].filter(v => v)
    if (desc.length > 0) lines.push(desc.join('  '))
    return [Text({ text: lines.join('\n') })]
  }
}

const majorFormatters = {
  // 图片
  MAJOR_TYPE_DRAW: ({
    draw: { items }
  }: JsonResponse['data']['item']['modules']['module_dynamic']['major']) =>
    items.map(({ src }) => Image({ url: src })),

  // 视频
  MAJOR_TYPE_ARCHIVE: ({
    archive: { cover, aid, bvid, title, stat }
  }: JsonResponse['data']['item']['modules']['module_dynamic']['major']) => [
    Image({ url: cover }),
    Text({
      text: [
        `av${aid}`,
        title?.trim(),
        `${stat.play}播放 ${stat.danmaku}弹幕`,
        `https://www.bilibili.com/video/${bvid}`
      ].join('\n')
    })
  ],

  // 文章
  MAJOR_TYPE_ARTICLE: ({
    article: { covers, id, title, desc }
  }: JsonResponse['data']['item']['modules']['module_dynamic']['major']) => [
    ...(covers.length ? [Image({ url: covers[0] })] : []),
    Text({
      text: [`《${title?.trim()}》`, desc?.trim(), `https://www.bilibili.com/read/cv${id}`].join(
        '\n'
      )
    })
  ],

  // 音乐
  MAJOR_TYPE_MUSIC: ({
    music: { cover, id, title, label }
  }: JsonResponse['data']['item']['modules']['module_dynamic']['major']) => [
    Image({ url: cover }),
    Text({
      text: [
        `au${id}`,
        title?.trim(),
        `分类：${label}`,
        `https://www.bilibili.com/audio/au${id}`
      ].join('\n')
    })
  ],

  // 直播
  MAJOR_TYPE_LIVE: ({
    live: { cover, title, id, live_state, desc_first, desc_second }
  }: JsonResponse['data']['item']['modules']['module_dynamic']['major']) => [
    Image({ url: cover }),
    Text({
      text: [
        title,
        `房间号：${id}`,
        `分区：${desc_first}`,
        live_state ? `直播中  ${desc_second}` : '未开播',
        `https://live.bilibili.com/${id}`
      ].join('\n')
    })
  ],

  // 通用动态？
  MAJOR_TYPE_OPUS: ({
    opus: {
      pics,
      summary: { text },
      title
    }
  }: JsonResponse['data']['item']['modules']['module_dynamic']['major']) => {
    const lines = []
    if (title) lines.push(Text({ text: '' }), Text({ text: `《${title.trim()}》` }))
    if (text) lines.push(Text({ text: '' }), Text({ text: text.trim() }))
    if (pics.length) lines.push(Text({ text: '' }), ...pics.map(({ url }) => Image({ url })))
    return lines.slice(1)
  }
}

import type { JsonResponse } from './dynamicData.d.ts'
import { Image, SendMessageArray, Text } from 'node-open-shamrock'

const formatDynamic = (item: JsonResponse['data']['item']) => {
  const { module_author: author, module_dynamic: dynamic } = item.modules
  const lines: SendMessageArray = [
    Text({ text: `https://t.bilibili.com/${item.id_str} UP：${author.name}` })
  ]

  const desc = dynamic?.desc?.text?.trim()
  if (desc) lines.push(Text({ text: '' }), Text({ text: purgeLinkInText(desc) }))

  const major = dynamic?.major
  if (major && major.type in majorFormatters) {
    lines.push(Text({ text: '' }), ...majorFormatters[major.type](major))
  }

  const additional = dynamic?.additional
  if (additional && additional.type in additionalFormatters) {
    lines.push(Text({ text: '' }), ...additionalFormatters[additional.type](additional))
  }

  if (item.type === 'DYNAMIC_TYPE_FORWARD') {
    if (item.orig.type === 'DYNAMIC_TYPE_NONE') {
      lines.push(Text({ text: '' }), Text({ text: '【转发的源动态已被作者删除】' }))
    } else {
      lines.push(
        Text({ text: '' }),
        ...formatDynamic(item.orig as unknown as JsonResponse['data']['item'])
      )
    }
  }

  return lines
}

export const getDynamicInfo = async (id: string) => {
  try {
    const {
      data: { code, data, message }
    } = await retryGet('https://api.bilibili.com/x/polymer/web-dynamic/v1/detail', {
      timeout: 10000,
      params: {
        timezone_offset: new Date().getTimezoneOffset(),
        id,
        features: 'itemOpusStyle'
      },
      headers: {
        'User-Agent': USER_AGENT
      }
    })

    if (code === 4101131 || code === 4101105) return Text({ text: '动态不存在' })
    if (code !== 0) return Text({ text: `Error: (${code})${message}` })
    if (!data?.item) return Text({ text: 'Error: 无内容' })

    return formatDynamic(data.item)
  } catch (error) {
    logger.WARNING(`[error] bilibili get dynamic new info ${id}`)
    logger.ERROR(error)
    return Text({ text: '获取信息失败~' })
  }
}
