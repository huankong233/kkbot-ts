interface setuConfig {
  reg: string
  cd: number
  limit: number
  withdraw: number
  pigeon: number
  antiShieldingMode: 1 | 2 | 3 | 4
  proxy: { enable: boolean; url: string }
  short: { enable: boolean; url: string }
}
