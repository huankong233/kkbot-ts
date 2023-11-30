interface zaobaoConfig {
  type: '摸鱼人日历' | '每天60秒'
  crontab: string
  groups: number[] | groupConfig[] | [groupConfig[]]
  cd: number
}

interface groupConfig {
  group_id: number
  type?: '摸鱼人日历' | '每天60秒'
  crontab?: string
}
