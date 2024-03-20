import { eventReg, haveAt } from '@/libs/eventReg.ts'
import { quickOperation } from '@/libs/sendMsg.ts'

export default function event() {
  //判断用户是否注册过了
  eventReg(
    'message',
    async (context, command) => {
      const { user_id } = context

      const at = haveAt(context)
      const notHaveAccount = !(await getUserData(user_id))
      const isCommand = command && command.name.search('咕咕') === -1 && notHaveAccount
      const isAt = at && notHaveAccount

      if (isCommand || isAt) {
        await quickOperation({
          context,
          operation: {
            reply: `请先使用"${global.config.botConfig.prefix}咕咕"注册账户`
          }
        })
        return 'quit'
      }
    },
    101
  )
}

/**
 * 获取用户信息
 * @param user_id qq号
 */
export async function getUserData(
  user_id: number
): Promise<{ user_id: number; pigeon_num: number; update_time: number } | false> {
  const data = await database.select('*').where('user_id', user_id).from('pigeon').first()
  return data ?? false
}

/**
 * 增加鸽子
 */
export async function add(user_id: number, number: number, reason: string, extra?: any) {
  //不允许增加负数的鸽子
  if (number <= 0) return false

  let userData = await getUserData(user_id)
  if (!userData) throw new Error('user not found')

  //获取拥有的鸽子数
  let origin_pigeon = userData.pigeon_num
  let now_pigeon = origin_pigeon + number

  //更新数据库
  await database
    .update({
      pigeon_num: now_pigeon,
      ...extra
    })
    .where('user_id', user_id)
    .from('pigeon')

  //插入历史记录
  await database
    .insert({
      user_id,
      operation: number,
      origin_pigeon,
      now_pigeon,
      update_time: Date.now(),
      reason: reason ?? '没有指定原因'
    })
    .into('pigeon_history')

  return true
}

/**
 * 减少鸽子
 */
export async function reduce(user_id: number, number: number, reason: string, extra?: any) {
  //不允许减少负数的鸽子
  if (number <= 0) return false

  let userData = await getUserData(user_id)
  if (!userData) throw new Error('user not found')

  //获取拥有的鸽子数
  let origin_pigeon = userData.pigeon_num
  let now_pigeon = origin_pigeon - number
  if (now_pigeon < 0) {
    //无法扣除
    return false
  } else {
    //更新数据库
    await database
      .update({
        pigeon_num: now_pigeon,
        ...extra
      })
      .from('pigeon')
      .where('user_id', user_id)

    //插入历史记录
    await database
      .insert({
        user_id,
        operation: -number,
        origin_pigeon,
        now_pigeon,
        update_time: Date.now(),
        reason: reason ?? '没有指定原因'
      })
      .into('pigeon_history')

    return true
  }
}
