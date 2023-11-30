import { replyMsg } from '@/libs/sendMsg.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import type { CQEvent } from 'go-cqwebsocket'
import type { searchImageConfig, searchImageData } from './config.d.ts'

export const searchInitialization = () => {
  const { searchImageData } = global.data as { searchImageData: searchImageData }

  searchImageData.users = []

  //1s运行一次的计时器
  setInterval(async () => {
    searchImageData.users.forEach(async user => {
      if (user.surplus_time <= 0) {
        //退出搜图模式
        await turnOffSearchMode(user.context, false)
      } else {
        user.surplus_time--
      }
    })
  }, 1000)
}

/**
 * 进入搜图模式
 * @param context
 */
export const turnOnSearchMode = async (context: CQEvent<'message'>['context']) => {
  const { botConfig, searchImageConfig } = global.config as {
    botConfig: botConfig
    searchImageConfig: searchImageConfig
  }
  const { searchImageData } = global.data as { searchImageData: searchImageData }

  searchImageData.users.push({
    context,
    surplus_time: searchImageConfig.autoLeave
  })

  await replyMsg(
    context,
    [
      `${searchImageConfig.word.on_reply}`,
      `记得说"${botConfig.prefix}${searchImageConfig.word.off}${botConfig.botName}"来退出搜图模式哦~`
    ].join('\n')
  )
}

/**
 * 退出搜图模式
 * @param context
 * @param manual 是否为手动退出
 */
export const turnOffSearchMode = async (context: CQEvent<'message'>['context'], manual = true) => {
  const { botConfig, searchImageConfig } = global.config as {
    botConfig: botConfig
    searchImageConfig: searchImageConfig
  }
  const { searchImageData } = global.data as { searchImageData: searchImageData }

  searchImageData.users = searchImageData.users.filter(
    user => user.context.user_id !== context.user_id
  )

  if (manual) {
    await replyMsg(context, `${searchImageConfig.word.off_reply}`, { reply: true })
  } else {
    await replyMsg(
      context,
      [
        `已自动退出搜图模式`,
        `下次记得说${botConfig.prefix}${searchImageConfig.word.off}${botConfig.botName}来退出搜图模式哦~`
      ].join('\n')
    )
  }
}

/**
 * 刷新搜图时间
 * @param user_id
 */
export const refreshTimeOfAutoLeave = (user_id: number) => {
  const { searchImageConfig } = global.config as { searchImageConfig: searchImageConfig }
  let user = isSearchMode(user_id)
  if (user) user.surplus_time = searchImageConfig.autoLeave
}

/**
 * 判断是否是搜图模式
 * @param user_id
 * @returns
 */
export const isSearchMode = (user_id: number) => {
  const { searchImageData } = global.data as { searchImageData: searchImageData }
  return searchImageData.users.find(user => user.context.user_id === user_id)
}
