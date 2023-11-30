interface corpusConfig {
  add: number
  delete: number
}

interface corpusData {
  rules: rule[]
}

interface rule {
  regexp: RegExp
  reply: string
  scene: 'a' | 'g' | 'p'
}
