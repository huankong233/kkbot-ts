import type { commandFormat } from '@/libs/eventReg.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import type { CQEvent } from 'go-cqwebsocket'
import fs from 'fs'
import { jsonc } from 'jsonc'
import path from 'path'

export default async () => {
  await initial()

  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return

    if (command.name === '帮助' || command.name === 'help') {
      await help(context, command)
    }
  })
}

async function initial() {
  const { plugins } = global
  const { helpData } = global.data as { helpData: helpData }
  const commandList = []

  for (const key in plugins) {
    const element = plugins[key]
    const commandsPath = path.join(element.pluginPath, `commands.jsonc`)
    if (fs.existsSync(commandsPath)) {
      const commands: command[] = jsonc.parse(fs.readFileSync(commandsPath, { encoding: 'utf-8' }))
      commandList.push(...commands)
    }
  }

  helpData['commandList'] = commandList
}

async function help(context: CQEvent<'message'>['context'], command: commandFormat) {
  const { botConfig } = global.config as { botConfig: botConfig }
  const { helpData } = global.data as { helpData: helpData }
  const { user_id } = context
  const { params } = command

  const name = params[0]

  if (name) {
    const command = helpData.commandList.find(item => item.commandName === name)
    if (!command) return await replyMsg(context, '没有这个命令哦~', { reply: true })

    await replyMsg(
      context,
      [
        `命令: ${command.commandName}`,
        `简介([ ] 为必选参数 ( ) 为可选参数): `,
        `${command.commandDescription.join('\n')}`
      ].join('\n'),
      { reply: true }
    )
  } else {
    let str: string[] = []
    helpData.commandList.forEach(command => {
      if (command.admin) {
        if (user_id === botConfig.admin) str.push(command.commandName)
      } else {
        str.push(command.commandName)
      }
    })

    await replyMsg(
      context,
      [`使用"${botConfig.prefix}帮助 命令名称"来获取详情`, `命令列表: `].join('\n') + str.join(','),
      { reply: true }
    )
  }
}
