export const getAspectTitle = (aspect: string) => {
  switch (aspect) {
    case 'cct':
      return 'チェンジトーク促進'
    case 'sst':
      return '維持トーク限弱'
    case 'empathy':
      return '共感'
    case 'partnership':
      return 'パートナーシップ'
    default:
      return aspect
  }
}

export const getAspectShortTitle = (aspect: string) => {
  switch (aspect) {
    case 'cct':
      return 'チェンジ\nトーク促進'
    case 'sst':
      return '維持トーク\n限弱'
    case 'empathy':
      return '共感'
    case 'partnership':
      return 'パートナー\nシップ'
    default:
      return aspect
  }
}