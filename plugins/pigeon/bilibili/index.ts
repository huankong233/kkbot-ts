// 代码来自 : https://github.com/Tsuk1ko/cq-picsearcher-bot
import { retryHead } from '@/libs/axios.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { parseJSON } from '@/libs/praseJSON.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { CQEvent } from 'go-cqwebsocket'
import { CQ } from 'go-cqwebsocket'
import { getArticleInfo } from './libs/article.ts'
import { getDynamicInfo } from './libs/dynamic.ts'
import { getLiveRoomInfo } from './libs/live.ts'
import { getVideoInfo } from './libs/video.ts'

export const logger = makeLogger({ pluginName: 'bilibili' })

export default async () => {
  event()
}

function event() {
  eventReg('message', async ({ context }) => await bilibiliHandler(context))
}

async function bilibiliHandler(context: CQEvent<'message'>['context']) {
  const { bilibiliConfig } = global.config as { bilibiliConfig: bilibiliConfig }
  const { getInfo } = bilibiliConfig
  if (
    !(
      bilibiliConfig.despise ||
      getInfo.getVideoInfo ||
      getInfo.getDynamicInfo ||
      getInfo.getArticleInfo ||
      getInfo.getLiveRoomInfo
    )
  ) {
    return
  }

  let { message } = context
  message = message.toString()

  const { url, isMiniProgram = false } =
    (() => {
      if (message.includes('com.tencent.miniapp_01')) {
        // 小程序
        const data = parseJSON(message)
        return {
          url: data?.meta?.detail_1?.qqdocurl,
          isMiniProgram: true
        }
      } else if (message.includes('com.tencent.structmsg')) {
        // 结构化消息
        const data = parseJSON(message)
        return {
          url: data?.meta?.news?.jumpUrl,
          isMiniProgram: false
        }
      }
    })() || {}

  if (bilibiliConfig.despise && isMiniProgram) {
    await replyMsg(
      context,
      CQ.image('https://i.loli.net/2020/04/27/HegAkGhcr6lbPXv.png').toString()
    )
  }

  const param = await getIdFromMsg(url || message)
  const { avid, bvid, dyid, arid, lrid } = param

  if (getInfo.getVideoInfo && (avid || bvid)) {
    return await reply(context, await getVideoInfo({ aid: avid, bvid }), isMiniProgram)
  }

  if (getInfo.getDynamicInfo && dyid) {
    return await reply(context, await getDynamicInfo(dyid), isMiniProgram)
  }

  if (getInfo.getArticleInfo && arid) {
    return await reply(context, await getArticleInfo(arid), isMiniProgram)
  }

  if (getInfo.getLiveRoomInfo && lrid) {
    return await reply(context, await getLiveRoomInfo(lrid), isMiniProgram)
  }
}

async function reply(
  context: CQEvent<'message'>['context'],
  message: string,
  isMiniProgram: boolean
) {
  await replyMsg(context, message)
  if (isMiniProgram) {
    await bot.delete_msg(context.message_id)
  }
}

const getIdFromMsg = async (msg: string) => {
  const match = /((b23|acg)\.tv|bili2233.cn)\/[0-9a-zA-Z]+/.exec(msg)
  if (match) return getIdFromShortLink(`https://${match[0]}`)
  return getIdFromNormalLink(msg)
}

const getIdFromNormalLink = (link: string) => {
  const searchVideo = /bilibili\.com\/video\/(?:av(\d+)|(bv[\da-z]+))/i.exec(link) || []
  const searchDynamic =
    /t\.bilibili\.com\/(\d+)/i.exec(link) ||
    /m\.bilibili\.com\/dynamic\/(\d+)/i.exec(link) ||
    /www\.bilibili\.com\/opus\/(\d+)/i.exec(link) ||
    []
  const searchArticle = /bilibili\.com\/read\/(?:cv|mobile\/)(\d+)/i.exec(link) || []
  const searchLiveRoom = /live\.bilibili\.com\/(\d+)/i.exec(link) || []
  return {
    avid: searchVideo[1],
    bvid: searchVideo[2],
    dyid: searchDynamic[1],
    arid: searchArticle[1],
    lrid: searchLiveRoom[1]
  }
}

const getIdFromShortLink = async (shortLink: string) => {
  return await retryHead(shortLink, {
    maxRedirects: 0,
    validateStatus: status => status >= 200 && status < 400
  })
    .then(ret => getIdFromNormalLink(ret.headers.location))
    .catch(e => {
      logger.WARNING(`[error] bilibili head short link ${shortLink}`)
      logger.ERROR(e)
      return {
        avid: undefined,
        bvid: undefined,
        dyid: undefined,
        arid: undefined,
        lrid: undefined
      }
    })
}
