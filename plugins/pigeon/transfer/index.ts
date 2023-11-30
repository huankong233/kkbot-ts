import type { commandFormat } from '@/libs/eventReg.ts'
import { eventReg, missingParams } from '@/libs/eventReg.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import { add, getUserData, reduce } from '@/plugins/pigeon/pigeon/index.ts'
import type { CQEvent } from 'go-cqwebsocket'

export default async () => {
  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return

    if (command.name === '鸽子转账') await transferAccounts(context, command)
  })
}

async function transferAccounts(context: CQEvent<'message'>['context'], command: commandFormat) {
  const { user_id } = context
  const { params } = command

  if (await missingParams(context, command, 2)) return

  const from = user_id
  const to = parseInt(params[0].replace(/[^0-9]/gi, ''))

  if (from === to) return await replyMsg(context, '不可以给自己转账哦~', { reply: true })

  //转账多少只
  const num = parseFloat(params[1].replace(/[^0-9]/gi, ''))

  if (num <= 0) {
    return await replyMsg(context, '转账失败,金额有误', { reply: true })
  }

  const to_data = await getUserData(to)

  if (!to_data) return await replyMsg(context, '转账失败,转账对象不存在~', { reply: true })

  if (!(await reduce(from, num, `转账给${to}`))) {
    return await replyMsg(context, '转账失败,账户鸽子不足~', { reply: true })
  }

  await add(to, num, `转账来自${from}`)
  await replyMsg(context, '转账成功~', { reply: true })
}
