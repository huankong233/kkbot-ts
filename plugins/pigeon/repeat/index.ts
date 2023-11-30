import { eventReg } from '@/libs/eventReg.ts'
import { randomFloat } from '@/libs/random.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { CQEvent } from 'go-cqwebsocket'

export default async () => {
  init()
  event()
}

function init() {
  const { repeatData } = global.data as { repeatData: repeatData }
  repeatData.repeat = {}
}

function event() {
  eventReg('message', async ({ context }, command) => {
    //屏蔽命令
    if (command) return
    await repeat(context)
  })
}

async function repeat(context: CQEvent<'message'>['context']) {
  if (context.message_type === 'private') return
  const { group_id, user_id, message } = context
  const { repeatConfig } = global.config as { repeatConfig: repeatConfig }
  const { repeatData } = global.data as { repeatData: repeatData }
  const { repeat } = repeatData

  if (!repeat[group_id]) {
    repeat[group_id] = {
      message: message.toString(),
      user_id: [user_id],
      count: 1
    }
  } else {
    if (message !== repeat[group_id].message) {
      //替换
      repeat[group_id] = {
        message: message.toString(),
        user_id: [user_id],
        count: 1
      }
    } else {
      //增加计数(并且不是同一个人)
      if (!repeat[group_id].user_id.includes(user_id)) {
        repeat[group_id].user_id.push(user_id)
        repeat[group_id].count++
        //判断次数
        if (repeat[group_id].count === repeatConfig.times) {
          await replyMsg(context, message)
        }
      }
    }
  }

  //所有规则外还有一定概率触发
  if (randomFloat(0, 100) <= repeatConfig.commonProb) {
    await replyMsg(context, message.toString())
  }
}
