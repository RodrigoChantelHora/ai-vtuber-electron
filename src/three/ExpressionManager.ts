import { VRM } from '@pixiv/three-vrm'
import { VRMExpressionPresetName } from '@pixiv/three-vrm-core'

export class ExpressionManager {
  private vrm?: VRM
  private currentExpression = 'neutral'
  private targetWeights = new Map<string, number>()
  private currentWeights = new Map<string, number>()

  setVRM(vrm: VRM) {
    this.vrm = vrm
  }

  setExpression(name: string) {
    this.currentExpression = name
    const em = this.vrm?.expressionManager
    if (!em) return

    const allShapes: VRMExpressionPresetName[] = ['neutral', 'happy', 'angry', 'sad', 'surprised', 'relaxed']
    allShapes.forEach((shape) => {
      this.targetWeights.set(shape, shape === name ? 1 : 0)
    })
  }

  update(delta: number) {
    const em = this.vrm?.expressionManager
    if (!em) return

    this.targetWeights.forEach((target, name) => {
      let current = this.currentWeights.get(name) || 0
      current += (target - current) * Math.min(1, delta * 8)
      this.currentWeights.set(name, current)
      em.setValue(name as VRMExpressionPresetName, current)
    })
  }

  getCurrentExpression(): string {
    return this.currentExpression
  }

  static mapEmotionTag(tag: string): VRMExpressionPresetName {
    switch (tag) {
      case 'feliz': return 'happy'
      case 'triste': return 'sad'
      case 'surpreso': return 'surprised'
      case 'bravo': return 'angry'
      default: return 'neutral'
    }
  }
}
