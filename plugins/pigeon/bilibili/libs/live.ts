import { retryGet } from '@/libs/axios.ts'
import { humanNum } from '@/libs/humanNum.ts'
import { makeLogger } from '@/libs/logger.ts'
import { USER_AGENT } from './const.ts'
import { Image, Text } from 'node-open-shamrock'

const logger = makeLogger({ pluginName: 'bilibili', subModule: 'live' })

export const getLiveRoomInfo = async (id: string) => {
  try {
    const {
      data: { code, message, data }
    } = await retryGet(
      `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${id}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': USER_AGENT
        }
      }
    )

    if (code !== 0) return Text({ text: `Error: (${code})${message}` })

    const {
      room_info: {
        room_id,
        short_id,
        title,
        live_status,
        area_name,
        parent_area_name,
        keyframe,
        online
      },
      anchor_info: {
        base_info: { uname }
      }
    } = data

    return [
      Image({ url: keyframe }),
      Text({
        text: [
          title,
          `主播：${uname}`,
          `房间号：${room_id}${short_id ? `  短号：${short_id}` : ''}`,
          `分区：${parent_area_name}${parent_area_name === area_name ? '' : `-${area_name}`}`,
          live_status ? `直播中  ${humanNum(online)}人气` : '未开播',
          `https://live.bilibili.com/${short_id || room_id}`
        ].join('\n')
      })
    ]
  } catch (error) {
    logger.WARNING(`[error] bilibili get live room info ${id}`)
    logger.ERROR(error)
    return Text({ text: '获取信息失败~' })
  }
}
