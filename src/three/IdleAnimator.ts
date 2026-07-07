import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'

export type Gender = 'feminino' | 'masculino' | 'neutro'

// ─── Parâmetros de animação contínua por gênero ───────────────────────────────
// Estes controlam FREQUÊNCIA e AMPLITUDE dos movimentos cíclicos,
// não a posição base (isso fica nos PosePresets).

interface AnimProfile {
  // Respiração
  breathFreq:     number
  breathAmpChest: number   // rad
  breathAmpSpine: number
  // Balanço do corpo
  swayFreq:       number
  swayAmpHips:    number
  swayAmpChest:   number
  // Cabeça
  headSwayFreq:   number
  headSwayAmp:    number
  headNodFreq:    number
  headNodAmp:     number
  // Flutuação dos braços (sobre a pose base)
  armFloatFreq:   number
  armFloatAmp:    number
  // Piscar
  blinkMinInterval: number
  blinkMaxInterval: number
  blinkDuration:    number
}

const PROFILES: Record<Gender, AnimProfile> = {
  feminino: {
    breathFreq: 0.35, breathAmpChest: 0.030, breathAmpSpine: 0.015,
    swayFreq:   0.22, swayAmpHips:   0.055,  swayAmpChest:  0.020,
    headSwayFreq: 0.20, headSwayAmp: 0.035,
    headNodFreq:  0.16, headNodAmp:  0.018,
    armFloatFreq: 0.25, armFloatAmp: 0.025,
    blinkMinInterval: 2.5, blinkMaxInterval: 5.0, blinkDuration: 0.12,
  },
  masculino: {
    breathFreq: 0.25, breathAmpChest: 0.035, breathAmpSpine: 0.018,
    swayFreq:   0.15, swayAmpHips:   0.025,  swayAmpChest:  0.010,
    headSwayFreq: 0.12, headSwayAmp: 0.014,
    headNodFreq:  0.10, headNodAmp:  0.010,
    armFloatFreq: 0.18, armFloatAmp: 0.012,
    blinkMinInterval: 3.5, blinkMaxInterval: 7.0, blinkDuration: 0.10,
  },
  neutro: {
    breathFreq: 0.30, breathAmpChest: 0.028, breathAmpSpine: 0.014,
    swayFreq:   0.18, swayAmpHips:   0.038,  swayAmpChest:  0.015,
    headSwayFreq: 0.16, headSwayAmp: 0.024,
    headNodFreq:  0.13, headNodAmp:  0.013,
    armFloatFreq: 0.22, armFloatAmp: 0.018,
    blinkMinInterval: 3.0, blinkMaxInterval: 6.0, blinkDuration: 0.11,
  },
}

// ─── Presets de pose ──────────────────────────────────────────────────────────
//
// IMPORTANTE — sistema de coordenadas dos ossos normalizados VRM:
//   Postura T-pose = todos os ângulos em ZERO.
//
//   LeftUpperArm.rotation.z  = 0     → braço horizontal (T-pose)
//                            = +1.57 → braço apontando PARA BAIXO (90°)
//   RightUpperArm.rotation.z = 0     → braço horizontal (T-pose)
//                            = -1.57 → braço apontando PARA BAIXO
//
//   LeftLowerArm.rotation.z  positivo → cotovelo dobra para CIMA/frente
//   Head.rotation.z          positivo → cabeça inclina para direita do personagem
//   Spine/Chest.rotation.x   positivo → curvatura para frente
//                            negativo → peito para fora / ombros para trás
//   Hips.rotation.z          positivo → quadril inclina para direita
//   UpperLeg.rotation.z (esq) positivo → perna afasta do corpo

export interface PosePreset {
  label: string
  icon: string
  // Quadril / tronco
  hipsZ:        number
  hipsX:        number
  spineX:       number
  chestX:       number
  // Cabeça e pescoço
  neckZ:        number
  headZ:        number
  headX:        number
  headY:        number
  // Braço esquerdo
  leftArmZ:     number   // ≈ 1.2-1.5 para braço ao lado; < 0.8 = aberto/levantado
  leftArmX:     number   // para frente (+) / para trás (-)
  leftLowerArmZ: number  // dobra cotovelo
  leftLowerArmY: number  // rotação do antebraço
  // Braço direito (espelho)
  rightArmZ:    number
  rightArmX:    number
  rightLowerArmZ: number
  rightLowerArmY: number
  // Pernas superiores (peso / postura)
  leftUpperLegZ:  number
  rightUpperLegZ: number
}

// Pose inicial (braços ao lado, postura neutra) — usada no snap inicial
const NEUTRAL_ARMS: Pick<PosePreset, 'leftArmZ'|'rightArmZ'|'leftArmX'|'rightArmX'|
  'leftLowerArmZ'|'leftLowerArmY'|'rightLowerArmZ'|'rightLowerArmY'> = {
  leftArmZ:  1.20, rightArmZ: -1.20,
  leftArmX:  0.06, rightArmX:  0.06,
  leftLowerArmZ: 0.10, leftLowerArmY:  0.0,
  rightLowerArmZ: 0.10, rightLowerArmY: 0.0,
}

export const POSE_PRESETS: Record<Gender, PosePreset[]> = {

  // ── FEMININO ───────────────────────────────────────────────────────────────
  feminino: [
    {
      label: 'Fofa', icon: '🌸',
      // Braços semi-abertos (≈ 65° abaixo do horizontal), levemente para frente
      hipsZ: 0.03, hipsX: 0,
      spineX: 0.01, chestX: 0.00,
      neckZ: 0.02, headZ: 0.07, headX: 0.00, headY: 0.00,
      leftArmZ:  1.00, rightArmZ: -1.00,
      leftArmX:  0.12, rightArmX:  0.12,
      leftLowerArmZ:  0.20, leftLowerArmY:  0.05,
      rightLowerArmZ: 0.20, rightLowerArmY: -0.05,
      leftUpperLegZ: 0.00, rightUpperLegZ: 0.00,
    },
    {
      label: 'Elegante', icon: '💫',
      // Braços ao lado (≈ 80°), peito para fora, queixo ligeiramente alto
      hipsZ: 0.00, hipsX: 0,
      spineX: -0.02, chestX: -0.05,
      neckZ: 0.00, headZ: 0.00, headX: -0.05, headY: 0.00,
      leftArmZ:  1.35, rightArmZ: -1.35,
      leftArmX:  0.04, rightArmX:  0.04,
      leftLowerArmZ:  0.08, leftLowerArmY:  0.0,
      rightLowerArmZ: 0.08, rightLowerArmY:  0.0,
      leftUpperLegZ: 0.00, rightUpperLegZ: 0.00,
    },
    {
      label: 'Animada', icon: '🎀',
      // Braços mais abertos (≈ 45°), quadril deslocado, cabeça inclinada
      hipsZ: 0.06, hipsX: 0,
      spineX: 0.01, chestX: 0.00,
      neckZ: 0.03, headZ: 0.11, headX: 0.01, headY: 0.02,
      leftArmZ:  0.70, rightArmZ: -0.70,
      leftArmX:  0.06, rightArmX:  0.06,
      leftLowerArmZ:  0.15, leftLowerArmY:  0.0,
      rightLowerArmZ: 0.15, rightLowerArmY:  0.0,
      leftUpperLegZ:  0.03, rightUpperLegZ: -0.03,
    },
  ],

  // ── MASCULINO ──────────────────────────────────────────────────────────────
  masculino: [
    {
      label: 'Firme', icon: '⚡',
      // Braços ao lado (≈ 85°), postura ereta
      hipsZ: 0.00, hipsX: 0,
      spineX: -0.02, chestX: -0.06,
      neckZ: 0.00, headZ: 0.00, headX: -0.01, headY: 0.00,
      leftArmZ:  1.40, rightArmZ: -1.40,
      leftArmX:  0.04, rightArmX:  0.04,
      leftLowerArmZ:  0.06, leftLowerArmY:  0.0,
      rightLowerArmZ: 0.06, rightLowerArmY:  0.0,
      leftUpperLegZ: 0.00, rightUpperLegZ: 0.00,
    },
    {
      label: 'Confiante', icon: '💪',
      // Braços levemente afastados, peito para fora, ombros para trás
      hipsZ: 0.00, hipsX: -0.01,
      spineX: -0.03, chestX: -0.07,
      neckZ: 0.00, headZ: 0.00, headX: -0.03, headY: 0.00,
      leftArmZ:  1.25, rightArmZ: -1.25,
      leftArmX: -0.05, rightArmX: -0.05,
      leftLowerArmZ:  0.10, leftLowerArmY:  0.0,
      rightLowerArmZ: 0.10, rightLowerArmY:  0.0,
      leftUpperLegZ:  0.02, rightUpperLegZ: -0.02,
    },
    {
      label: 'Casual', icon: '😎',
      // Quadril deslocado para um lado, cabeça levemente virada
      hipsZ: 0.07, hipsX: 0,
      spineX: 0.00, chestX: -0.02,
      neckZ: 0.02, headZ: 0.05, headX: 0.00, headY: 0.04,
      leftArmZ:  1.20, rightArmZ: -1.05,
      leftArmX:  0.05, rightArmX:  0.05,
      leftLowerArmZ:  0.12, leftLowerArmY:  0.0,
      rightLowerArmZ: 0.18, rightLowerArmY:  0.0,
      leftUpperLegZ:  0.04, rightUpperLegZ: -0.04,
    },
  ],

  // ── NEUTRO ─────────────────────────────────────────────────────────────────
  neutro: [
    {
      label: 'Natural', icon: '🌿',
      // Simétrico, postura neutra, braços ao lado
      hipsZ: 0.00, hipsX: 0,
      spineX: 0.00, chestX: 0.00,
      neckZ: 0.00, headZ: 0.00, headX: 0.00, headY: 0.00,
      leftArmZ:  1.20, rightArmZ: -1.20,
      leftArmX:  0.06, rightArmX:  0.06,
      leftLowerArmZ:  0.10, leftLowerArmY:  0.0,
      rightLowerArmZ: 0.10, rightLowerArmY:  0.0,
      leftUpperLegZ: 0.00, rightUpperLegZ: 0.00,
    },
    {
      label: 'Aberto', icon: '✨',
      // Braços semi-abertos, postura receptiva
      hipsZ: 0.00, hipsX: 0,
      spineX: 0.01, chestX: 0.01,
      neckZ: 0.00, headZ: 0.00, headX: 0.00, headY: 0.00,
      leftArmZ:  0.90, rightArmZ: -0.90,
      leftArmX:  0.08, rightArmX:  0.08,
      leftLowerArmZ:  0.12, leftLowerArmY:  0.0,
      rightLowerArmZ: 0.12, rightLowerArmY:  0.0,
      leftUpperLegZ: 0.00, rightUpperLegZ: 0.00,
    },
    {
      label: 'Sereno', icon: '🍃',
      // Braços levemente para frente, cabeça ligeiramente para baixo (contemplativo)
      hipsZ: 0.00, hipsX: 0,
      spineX: 0.02, chestX: 0.00,
      neckZ: 0.00, headZ: 0.00, headX: 0.05, headY: 0.00,
      leftArmZ:  1.10, rightArmZ: -1.10,
      leftArmX:  0.18, rightArmX:  0.18,
      leftLowerArmZ:  0.22, leftLowerArmY:  0.0,
      rightLowerArmZ: 0.22, rightLowerArmY:  0.0,
      leftUpperLegZ: 0.00, rightUpperLegZ: 0.00,
    },
  ],
}

// ─── Classe principal ─────────────────────────────────────────────────────────

export class IdleAnimator {
  private vrm?: VRM
  private gender: Gender = 'neutro'
  private enabled = false
  private elapsed = 0

  // Pose
  private poseIndex = 0
  private activePose: PosePreset  = { ...POSE_PRESETS.neutro[0] }
  private targetPose: PosePreset  = { ...POSE_PRESETS.neutro[0] }
  private poseSnapped = false   // snaps imediatamente na primeira frame, sem lerp

  // Piscar
  private blinkTimer = 0
  private nextBlink  = 3.0
  private blinkPhase: 'none' | 'closing' | 'opening' = 'none'
  private blinkElapsed = 0

  // ── API pública ───────────────────────────────────────────────────────────

  setVRM(vrm: VRM | undefined) {
    this.vrm = vrm
    this.elapsed    = 0
    this.blinkTimer = 0
    this.blinkPhase = 'none'
    this.nextBlink  = Math.random() * 2 + 1
    this.poseSnapped = false   // força snap na próxima frame
  }

  setGender(gender: string) {
    const g = (gender === 'feminino' || gender === 'masculino') ? gender as Gender : 'neutro'
    this.gender = g
    const presets = POSE_PRESETS[g]
    this.poseIndex = Math.min(this.poseIndex, presets.length - 1)
    this.targetPose = presets[this.poseIndex]
    this.poseSnapped = false   // snapa para nova pose sem animação
  }

  setPose(index: number) {
    const presets = POSE_PRESETS[this.gender]
    this.poseIndex  = Math.max(0, Math.min(index, presets.length - 1))
    this.targetPose = presets[this.poseIndex]
    // NÃO reseta poseSnapped — troca de pose usa lerp suave
  }

  getPoseIndex(): number { return this.poseIndex }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) this.resetBones()
  }

  pause()  { this.enabled = false }
  resume() { this.enabled = true; this.poseSnapped = false }

  static getPresets(gender: string): PosePreset[] {
    const g = (gender === 'feminino' || gender === 'masculino') ? gender as Gender : 'neutro'
    return POSE_PRESETS[g]
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(delta: number) {
    if (!this.enabled || !this.vrm) return

    this.elapsed += delta
    const t   = this.elapsed
    const p   = PROFILES[this.gender]
    const hum = this.vrm.humanoid

    // Snap ou lerp da pose ativa
    if (!this.poseSnapped) {
      this.activePose  = { ...this.targetPose }
      this.poseSnapped = true
    } else {
      const k = Math.min(1, delta * 5)   // lerp suave ao trocar de pose
      const a = this.activePose
      const tgt = this.targetPose
      for (const key of Object.keys(tgt) as Array<keyof PosePreset>) {
        if (typeof tgt[key] === 'number') {
          (a as any)[key] += ((tgt as any)[key] - (a as any)[key]) * k
        }
      }
    }

    const pose  = this.activePose
    const breath = Math.sin(t * Math.PI * 2 * p.breathFreq)
    const sway   = Math.sin(t * Math.PI * 2 * p.swayFreq)
    const swayOff = Math.sin(t * Math.PI * 2 * p.swayFreq + Math.PI) // fase oposta

    // ── Quadril ────────────────────────────────────────────────────────────
    const hipsNode = hum.getNormalizedBoneNode(VRMHumanBoneName.Hips)
    if (hipsNode) {
      hipsNode.rotation.z = pose.hipsZ + sway * p.swayAmpHips
      hipsNode.rotation.x = pose.hipsX
      hipsNode.rotation.y = sway * 0.01   // leve rotação do quadril
    }

    // ── Coluna ─────────────────────────────────────────────────────────────
    const spineNode = hum.getNormalizedBoneNode(VRMHumanBoneName.Spine)
    if (spineNode) {
      spineNode.rotation.x = pose.spineX + breath * p.breathAmpSpine
      spineNode.rotation.z = swayOff * p.swayAmpHips * 0.3  // contrapeso ao quadril
    }

    // ── Tórax ──────────────────────────────────────────────────────────────
    const chestNode = hum.getNormalizedBoneNode(VRMHumanBoneName.Chest)
    if (chestNode) {
      chestNode.rotation.x = pose.chestX + breath * p.breathAmpChest
      chestNode.rotation.z = swayOff * p.swayAmpChest
    }

    const upperChestNode = hum.getNormalizedBoneNode(VRMHumanBoneName.UpperChest)
    if (upperChestNode) {
      upperChestNode.rotation.x = breath * p.breathAmpChest * 0.4
      upperChestNode.rotation.z = swayOff * p.swayAmpChest * 0.5
    }

    // ── Pescoço ────────────────────────────────────────────────────────────
    const neckNode = hum.getNormalizedBoneNode(VRMHumanBoneName.Neck)
    if (neckNode) {
      const headSway = Math.sin(t * Math.PI * 2 * p.headSwayFreq + 0.8)
      neckNode.rotation.z = pose.neckZ + headSway * p.headSwayAmp * 0.3
      neckNode.rotation.x = breath * p.breathAmpSpine * 0.3
    }

    // ── Cabeça ─────────────────────────────────────────────────────────────
    const headSway = Math.sin(t * Math.PI * 2 * p.headSwayFreq + 0.8)
    const headNod  = Math.sin(t * Math.PI * 2 * p.headNodFreq  + 1.5)
    const headNode = hum.getNormalizedBoneNode(VRMHumanBoneName.Head)
    if (headNode) {
      headNode.rotation.z = pose.headZ + headSway * p.headSwayAmp
      headNode.rotation.x = pose.headX + headNod  * p.headNodAmp
      headNode.rotation.y = pose.headY
    }

    // ── Braço esquerdo ─────────────────────────────────────────────────────
    const armFloat = Math.sin(t * Math.PI * 2 * p.armFloatFreq + 0.3) * p.armFloatAmp

    const leftArm = hum.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
    if (leftArm) {
      leftArm.rotation.z = pose.leftArmZ  + armFloat
      leftArm.rotation.x = pose.leftArmX  + breath * p.breathAmpChest * 0.15
    }

    const leftForearm = hum.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm)
    if (leftForearm) {
      leftForearm.rotation.z = pose.leftLowerArmZ
      leftForearm.rotation.y = pose.leftLowerArmY
    }

    // ── Braço direito ──────────────────────────────────────────────────────
    const rightArm = hum.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
    if (rightArm) {
      rightArm.rotation.z = pose.rightArmZ - armFloat
      rightArm.rotation.x = pose.rightArmX + breath * p.breathAmpChest * 0.15
    }

    const rightForearm = hum.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
    if (rightForearm) {
      rightForearm.rotation.z = pose.rightLowerArmZ
      rightForearm.rotation.y = pose.rightLowerArmY
    }

    // ── Pernas superiores (ajuste de peso / postura) ────────────────────────
    const leftUpperLeg = hum.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperLeg)
    if (leftUpperLeg) {
      leftUpperLeg.rotation.z  = pose.leftUpperLegZ  - sway * 0.02
      leftUpperLeg.rotation.x  = 0.01   // leve inclinação anterior natural
    }

    const rightUpperLeg = hum.getNormalizedBoneNode(VRMHumanBoneName.RightUpperLeg)
    if (rightUpperLeg) {
      rightUpperLeg.rotation.z = pose.rightUpperLegZ + sway * 0.02
      rightUpperLeg.rotation.x = 0.01
    }

    // ── Piscar ─────────────────────────────────────────────────────────────
    this.updateBlink(delta, p)
  }

  // ── Piscar ────────────────────────────────────────────────────────────────

  private updateBlink(delta: number, p: AnimProfile) {
    const em = this.vrm?.expressionManager
    if (!em) return

    if (this.blinkPhase === 'none') {
      this.blinkTimer += delta
      if (this.blinkTimer >= this.nextBlink) {
        this.blinkTimer = 0
        this.nextBlink  = Math.random() * (p.blinkMaxInterval - p.blinkMinInterval) + p.blinkMinInterval
        this.blinkPhase  = 'closing'
        this.blinkElapsed = 0
      }
      return
    }

    this.blinkElapsed += delta
    const half = p.blinkDuration / 2

    if (this.blinkPhase === 'closing') {
      this.setBlinkWeight(em, Math.min(1, this.blinkElapsed / half))
      if (this.blinkElapsed >= half) { this.blinkPhase = 'opening'; this.blinkElapsed = 0 }
    } else {
      this.setBlinkWeight(em, Math.max(0, 1 - this.blinkElapsed / half))
      if (this.blinkElapsed >= half) {
        this.setBlinkWeight(em, 0)
        this.blinkPhase   = 'none'
        this.blinkElapsed = 0
      }
    }
  }

  private setBlinkWeight(em: NonNullable<VRM['expressionManager']>, w: number) {
    em.setValue('blink'      as any, w)
    em.setValue('blinkLeft'  as any, w)
    em.setValue('blinkRight' as any, w)
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  private resetBones() {
    if (!this.vrm) return
    const hum = this.vrm.humanoid
    const bones = [
      VRMHumanBoneName.Hips,   VRMHumanBoneName.Spine,       VRMHumanBoneName.Chest,
      VRMHumanBoneName.UpperChest, VRMHumanBoneName.Neck,    VRMHumanBoneName.Head,
      VRMHumanBoneName.LeftUpperArm,  VRMHumanBoneName.RightUpperArm,
      VRMHumanBoneName.LeftLowerArm,  VRMHumanBoneName.RightLowerArm,
      VRMHumanBoneName.LeftUpperLeg,  VRMHumanBoneName.RightUpperLeg,
    ] as const
    for (const name of bones) {
      const node = hum.getNormalizedBoneNode(name)
      if (node) node.rotation.set(0, 0, 0)
    }
    const em = this.vrm.expressionManager
    if (em) {
      em.setValue('blink'      as any, 0)
      em.setValue('blinkLeft'  as any, 0)
      em.setValue('blinkRight' as any, 0)
    }
  }
}
