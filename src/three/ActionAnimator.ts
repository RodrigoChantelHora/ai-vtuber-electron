import * as THREE from 'three'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import type { IdleAnimator } from './IdleAnimator'

// ── Definicoes de comida ──────────────────────────────────────────────────────

export interface FoodDef {
  id: string
  label: string
  emoji: string
  buildMesh: () => THREE.Object3D
}

function mat(color: number, rough = 0.7, metal = 0.0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
}

export const FOODS: FoodDef[] = [
  {
    id: 'sandwich', label: 'Sanduiche', emoji: '\u{1F96A}',
    buildMesh: () => {
      const g = new THREE.Group()
      g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.07), mat(0xd4a017)), { position: new THREE.Vector3(0, 0, 0) }))
      g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.065), mat(0x5a8a2a)), { position: new THREE.Vector3(0, 0.016, 0) }))
      g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.008, 0.065), mat(0xf5c518)), { position: new THREE.Vector3(0, 0.026, 0) }))
      const topGeo = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)
      const top = new THREE.Mesh(topGeo, mat(0xc8860a))
      top.scale.set(0.9, 0.7, 0.7); top.position.set(0, 0.036, 0)
      g.add(top)
      return g
    },
  },
  {
    id: 'pizza', label: 'Pizza', emoji: '\u{1F355}',
    buildMesh: () => {
      const g = new THREE.Group()
      const slice = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.005, 3, 1), mat(0xe8a040))
      slice.rotation.y = Math.PI / 6; g.add(slice)
      for (const [x, z] of [[0.01, -0.01], [-0.02, 0.01], [0.02, 0.02]]) {
        const spot = new THREE.Mesh(new THREE.CircleGeometry(0.008, 6), mat(0xcc2222))
        spot.rotation.x = -Math.PI / 2; spot.position.set(x as number, 0.004, z as number)
        g.add(spot)
      }
      return g
    },
  },
  {
    id: 'apple', label: 'Maca', emoji: '\u{1F34E}',
    buildMesh: () => {
      const g = new THREE.Group()
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(0xcc1111))
      body.scale.y = 0.95; g.add(body)
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 4), mat(0x5a3010))
      stem.position.y = 0.048; g.add(stem)
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), mat(0x338833))
      leaf.scale.set(1.8, 0.4, 0.8); leaf.position.set(0.012, 0.052, 0); g.add(leaf)
      return g
    },
  },
  {
    id: 'ramen', label: 'Ramen', emoji: '\u{1F35C}',
    buildMesh: () => {
      const g = new THREE.Group()
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.038, 0.04, 10, 1, true), mat(0xddccbb))
      g.add(bowl)
      const base = new THREE.Mesh(new THREE.CircleGeometry(0.038, 10), mat(0xddccbb))
      base.rotation.x = Math.PI / 2; base.position.y = -0.02; g.add(base)
      const broth = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), mat(0xd4911a))
      broth.rotation.x = -Math.PI / 2; broth.position.y = 0.012; g.add(broth)
      const noodle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 8), mat(0xf5e0a0))
      noodle.rotation.x = Math.PI / 2; noodle.position.y = 0.016; noodle.scale.z = 0.25; g.add(noodle)
      return g
    },
  },
  {
    id: 'cake', label: 'Bolo', emoji: '\u{1F370}',
    buildMesh: () => {
      const g = new THREE.Group()
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), mat(0xf0b0c0)))
      const frst = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.008, 10), mat(0xffffff))
      frst.position.y = 0.029; g.add(frst)
      const ch = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), mat(0xcc1122))
      ch.position.y = 0.045; g.add(ch)
      return g
    },
  },
  {
    id: 'icecream', label: 'Sorvete', emoji: '\u{1F366}',
    buildMesh: () => {
      const g = new THREE.Group()
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), mat(0xe0c080))
      cone.position.y = -0.02; cone.rotation.z = Math.PI; g.add(cone)
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.033, 8, 6), mat(0xffccdd))
      scoop.position.y = 0.022; g.add(scoop)
      return g
    },
  },
]

// ── Fases de animacao ─────────────────────────────────────────────────────────

type Phase =
  | 'none'
  | 'eat_raise'      // braco sobe e cotovelo dobra em direcao ao rosto
  | 'eat_loop'       // mastigando
  | 'eat_lower'      // braco desce
  | 'sleep_sit'      // senta na beira da cama (abaixa corpo, inclina)
  | 'sleep_lay'      // de sentado, deita na cama (rotaciona cena)
  | 'sleep_loop'     // dormindo
  | 'sleep_wake'     // acorda: levanta da posicao deitada para sentado
  | 'sleep_standup'  // de sentado, levanta de pe

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)) }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }
function easeOut(t: number) { return 1 - (1 - t) * (1 - t) }

// ── ActionAnimator ────────────────────────────────────────────────────────────

export class ActionAnimator {
  private vrm?: VRM
  private scene?: THREE.Scene
  private idleAnimator?: IdleAnimator

  private phase: Phase = 'none'
  private phaseTime = 0

  // Props na cena
  private foodMesh?: THREE.Object3D
  private bedMesh?: THREE.Object3D
  private zzz: THREE.Object3D[] = []

  // Rotacoes salvas antes de comer (bracos idle)
  private savedRUA_z = -1.2
  private savedRUA_x = 0.06
  private savedRLA_z = 0.10
  private savedRLA_x = 0.0
  private savedHand_x = 0.0

  // Transform original da cena VRM
  private origScenePosY = 0
  private origScenePosZ = 0
  private origSceneRotX = 0

  // Posicao de transicao para a animacao de dormir
  private sitPosY = 0    // posicao Y durante fase sentado
  private sitPosZ = 0    // posicao Z durante fase sentado

  isActive()   { return this.phase !== 'none' }
  isEating()   { return this.phase === 'eat_raise' || this.phase === 'eat_loop' || this.phase === 'eat_lower' }
  isSleeping() { return ['sleep_sit', 'sleep_lay', 'sleep_loop', 'sleep_wake', 'sleep_standup'].includes(this.phase) }

  setup(vrm: VRM, scene: THREE.Scene, idle: IdleAnimator) {
    this.vrm = vrm
    this.scene = scene
    this.idleAnimator = idle
  }

  teardown() {
    this.stop()
    this.vrm = undefined
    this.scene = undefined
    this.idleAnimator = undefined
  }

  // ── Comer ─────────────────────────────────────────────────────────────────

  startEating(food: FoodDef) {
    if (!this.vrm || !this.scene || !this.idleAnimator) return
    this.stop()
    this.idleAnimator.pause()

    // Salva rotacoes atuais do braco direito
    const hum = this.vrm.humanoid
    const rua = hum.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
    if (rua) { this.savedRUA_z = rua.rotation.z; this.savedRUA_x = rua.rotation.x }
    const rla = hum.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
    if (rla) { this.savedRLA_z = rla.rotation.z; this.savedRLA_x = rla.rotation.x }
    const rhand = hum.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
    if (rhand) { this.savedHand_x = rhand.rotation.x }

    // Cria prop de comida
    this.foodMesh = food.buildMesh()
    this.foodMesh.scale.setScalar(2.2)
    this.scene.add(this.foodMesh)

    this.phase = 'eat_raise'
    this.phaseTime = 0
  }

  // ── Dormir ────────────────────────────────────────────────────────────────

  startSleeping() {
    if (!this.vrm || !this.scene || !this.idleAnimator) return
    this.stop()
    this.idleAnimator.pause()

    this.origScenePosY = this.vrm.scene.position.y
    this.origScenePosZ = this.vrm.scene.position.z
    this.origSceneRotX = this.vrm.scene.rotation.x

    this.createBed()

    this.phase = 'sleep_sit'
    this.phaseTime = 0
  }

  wakeUp() {
    if (this.phase !== 'sleep_loop') return
    this.removeZZZ()
    this.phase = 'sleep_wake'
    this.phaseTime = 0
  }

  // ── Parar tudo ────────────────────────────────────────────────────────────

  stop() {
    if (this.vrm) {
      this.vrm.scene.rotation.x = this.origSceneRotX
      this.vrm.scene.position.y = this.origScenePosY
      this.vrm.scene.position.z = this.origScenePosZ
      // Reset expressoes
      const em = this.vrm.expressionManager
      if (em) {
        em.setValue('blinkLeft', 0); em.setValue('blinkRight', 0)
        em.setValue('aa', 0); em.setValue('ou', 0)
        em.update()
      }
      // Reset bones bracos
      this.resetRightArm()
      // Reset bones pernas
      this.resetLegs()
    }
    this.phase = 'none'
    this.phaseTime = 0
    this.removeFoodMesh()
    this.removeBed()
    this.removeZZZ()
    this.idleAnimator?.resume()
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(delta: number) {
    if (this.phase === 'none' || !this.vrm) return
    this.phaseTime += delta
    const t = this.phaseTime
    const hum = this.vrm.humanoid

    // ══ COMER ════════════════════════════════════════════════════════════════

    if (this.phase === 'eat_raise') {
      const prog = easeInOut(clamp01(t / 0.8))
      //
      // POSE ALVO: cotovelo dobrado, mao na frente do rosto
      //   - UpperArm: levanta para frente e ligeiramente para cima
      //   - LowerArm: cotovelo dobra MUITO (z = -1.5 = ~86 graus)
      //   - Hand: pulso inclina para apontar comida a boca
      //
      this.applyRightArm(hum,
        lerp(this.savedRUA_z,  0.40,  prog),  // upper arm Z: levanta lateralmente
        lerp(this.savedRUA_x,  0.90,  prog),  // upper arm X: vai para frente
        lerp(this.savedRLA_z, -1.50,  prog),  // lower arm Z: DOBRA COTOVELO (valor alto)
        lerp(this.savedRLA_x,  0.0,   prog),  // lower arm X: sem rotacao extra
        lerp(this.savedHand_x, -0.35, prog),  // pulso: inclina comida para boca
      )
      this.positionFoodAtFace(prog)
      if (prog >= 1) { this.phase = 'eat_loop'; this.phaseTime = 0 }
      return
    }

    if (this.phase === 'eat_loop') {
      // Movimento leve de mastigacao no braco
      const bob = Math.sin(t * 4.5) * 0.025
      this.applyRightArm(hum, 0.40 + bob, 0.90, -1.50, 0.0, -0.35)
      // Boca abre/fecha
      const chew = Math.max(0, Math.sin(t * 5.0) * 0.6 + 0.05)
      const em = this.vrm.expressionManager
      if (em) { em.setValue('aa', chew * 0.8); em.setValue('ou', chew * 0.2); em.update() }
      this.positionFoodAtFace(1)
      if (t > 4.0) { this.phase = 'eat_lower'; this.phaseTime = 0 }
      return
    }

    if (this.phase === 'eat_lower') {
      const prog = easeInOut(clamp01(t / 0.7))
      this.applyRightArm(hum,
        lerp(0.40,  this.savedRUA_z, prog),
        lerp(0.90,  this.savedRUA_x, prog),
        lerp(-1.50, this.savedRLA_z, prog),
        lerp(0.0,   this.savedRLA_x, prog),
        lerp(-0.35, this.savedHand_x, prog),
      )
      this.positionFoodAtFace(1 - prog)
      const em = this.vrm.expressionManager
      if (em) { em.setValue('aa', 0); em.setValue('ou', 0); em.update() }
      if (prog >= 1) { this.stop() }
      return
    }

    // ══ DORMIR ═══════════════════════════════════════════════════════════════

    if (this.phase === 'sleep_sit') {
      // Fase 1: senta (abaixa o corpo, inclina para frente levemente)
      const DURATION = 1.2
      const prog = easeInOut(clamp01(t / DURATION))

      // Abaixa o centro de massa como se estivesse sentando
      const sitOffsetY = -0.30   // desce 30cm
      const sitOffsetZ =  0.10   // avanca levemente em direcao a cama
      this.vrm.scene.position.y = lerp(this.origScenePosY, this.origScenePosY + sitOffsetY, prog)
      this.vrm.scene.position.z = lerp(this.origScenePosZ, this.origScenePosZ + sitOffsetZ, prog)

      // Inclina ligeiramente para frente (como ao sentar)
      this.vrm.scene.rotation.x = lerp(this.origSceneRotX, this.origSceneRotX + 0.18, prog)

      // Dobra as pernas para pose sentado
      this.applyLegs(hum, lerp(0, 1.3, prog), lerp(0, -1.2, prog))

      // Fecha olhos levemente
      const em = this.vrm.expressionManager
      if (em) {
        em.setValue('blinkLeft',  prog * 0.35)
        em.setValue('blinkRight', prog * 0.35)
        em.update()
      }

      if (prog >= 1) {
        // Salva posicao de transicao para a fase de deitar
        this.sitPosY = this.vrm.scene.position.y
        this.sitPosZ = this.vrm.scene.position.z
        this.phase = 'sleep_lay'
        this.phaseTime = 0
      }
      return
    }

    if (this.phase === 'sleep_lay') {
      // Fase 2: deita (rotaciona a cena inteira)
      const DURATION = 2.2
      const prog = easeInOut(clamp01(t / DURATION))

      const targetRotX = -Math.PI / 2
      const targetPosY = 0.14    // altura da superficie do colchao
      const targetPosZ = this.origScenePosZ - 0.05  // centraliza na cama

      this.vrm.scene.rotation.x = lerp(this.origSceneRotX + 0.18, targetRotX, prog)
      this.vrm.scene.position.y = lerp(this.sitPosY, targetPosY, prog)
      this.vrm.scene.position.z = lerp(this.sitPosZ, targetPosZ, prog)

      // Conforme deita, pernas voltam ao normal (ja estao "deitadas" com a cena)
      this.applyLegs(hum, lerp(1.3, 0, easeOut(prog)), lerp(-1.2, 0, easeOut(prog)))

      // Olhos fecham progressivamente
      const em = this.vrm.expressionManager
      if (em) {
        em.setValue('blinkLeft',  lerp(0.35, 0.95, prog))
        em.setValue('blinkRight', lerp(0.35, 0.95, prog))
        em.update()
      }

      if (prog >= 1) {
        this.phase = 'sleep_loop'
        this.phaseTime = 0
        this.spawnZZZ()
      }
      return
    }

    if (this.phase === 'sleep_loop') {
      // Respiracao lenta deitada
      const breath = Math.sin(t * 0.7) * 0.006
      this.vrm.scene.position.y = 0.14 + breath
      const em = this.vrm.expressionManager
      if (em) { em.setValue('blinkLeft', 0.95); em.setValue('blinkRight', 0.95); em.update() }
      this.updateZZZ(delta)
      return
    }

    if (this.phase === 'sleep_wake') {
      // Fase 3: acorda — volta a posicao sentada
      const DURATION = 2.0
      const prog = easeInOut(clamp01(t / DURATION))

      const targetRotX = this.origSceneRotX + 0.18  // posicao sentada
      this.vrm.scene.rotation.x = lerp(-Math.PI / 2, targetRotX, prog)
      this.vrm.scene.position.y = lerp(0.14, this.origScenePosY + (-0.30), prog)
      this.vrm.scene.position.z = lerp(this.origScenePosZ - 0.05, this.origScenePosZ + 0.10, prog)

      // Pernas voltam a dobrar (pose sentado) conforme levanta
      this.applyLegs(hum, lerp(0, 1.3, prog), lerp(0, -1.2, prog))

      const em = this.vrm.expressionManager
      if (em) {
        em.setValue('blinkLeft',  lerp(0.95, 0.35, prog))
        em.setValue('blinkRight', lerp(0.95, 0.35, prog))
        em.update()
      }

      if (prog >= 1) {
        this.phase = 'sleep_standup'
        this.phaseTime = 0
      }
      return
    }

    if (this.phase === 'sleep_standup') {
      // Fase 4: levanta — de sentado para de pe
      const DURATION = 1.2
      const prog = easeInOut(clamp01(t / DURATION))

      const sitRotX = this.origSceneRotX + 0.18
      this.vrm.scene.rotation.x = lerp(sitRotX, this.origSceneRotX, prog)
      this.vrm.scene.position.y = lerp(this.origScenePosY - 0.30, this.origScenePosY, prog)
      this.vrm.scene.position.z = lerp(this.origScenePosZ + 0.10, this.origScenePosZ, prog)

      // Pernas voltam ao normal
      this.applyLegs(hum, lerp(1.3, 0, prog), lerp(-1.2, 0, prog))

      const em = this.vrm.expressionManager
      if (em) {
        em.setValue('blinkLeft',  lerp(0.35, 0, prog))
        em.setValue('blinkRight', lerp(0, 0, prog))
        em.update()
      }

      if (prog >= 1) { this.stop() }
      return
    }
  }

  // ── Helpers: braco ────────────────────────────────────────────────────────

  private applyRightArm(
    hum: any,
    uaz: number, uax: number,
    laz: number, lax: number,
    handX = 0,
  ) {
    const rua = hum.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
    if (rua) { rua.rotation.z = uaz; rua.rotation.x = uax }
    const rla = hum.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
    if (rla) { rla.rotation.z = laz; rla.rotation.x = lax }
    const rhand = hum.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
    if (rhand) { rhand.rotation.x = handX }
  }

  private resetRightArm() {
    if (!this.vrm) return
    const hum = this.vrm.humanoid
    this.applyRightArm(hum,
      this.savedRUA_z, this.savedRUA_x,
      this.savedRLA_z, this.savedRLA_x,
      this.savedHand_x,
    )
  }

  // ── Helpers: pernas ───────────────────────────────────────────────────────

  // upperX: coxa para frente (+), lowerX: joelho dobra (-)
  private applyLegs(hum: any, upperX: number, lowerX: number) {
    for (const [upper, lower] of [
      [VRMHumanBoneName.LeftUpperLeg,  VRMHumanBoneName.LeftLowerLeg],
      [VRMHumanBoneName.RightUpperLeg, VRMHumanBoneName.RightLowerLeg],
    ] as const) {
      const u = hum.getNormalizedBoneNode(upper)
      if (u) u.rotation.x = upperX
      const l = hum.getNormalizedBoneNode(lower)
      if (l) l.rotation.x = lowerX
    }
  }

  private resetLegs() {
    if (!this.vrm) return
    this.applyLegs(this.vrm.humanoid, 0, 0)
  }

  // ── Helpers: comida ───────────────────────────────────────────────────────

  // Posiciona comida em frente ao rosto, interpolando da mao ate a boca
  private positionFoodAtFace(prog: number) {
    if (!this.foodMesh || !this.vrm) return
    const hum = this.vrm.humanoid

    const headNode = hum.getNormalizedBoneNode(VRMHumanBoneName.Head)
    const handNode = hum.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
    if (!headNode) return

    const headPos = new THREE.Vector3()
    headNode.getWorldPosition(headPos)

    // Direcao "frente" do head (forward = -Z local no VRM)
    const headQuat = new THREE.Quaternion()
    headNode.getWorldQuaternion(headQuat)
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuat)

    // Posicao alvo = na frente da boca
    const mouthPos = headPos.clone().addScaledVector(fwd, 0.11)
    mouthPos.y -= 0.05  // nivel da boca

    if (prog < 1 && handNode) {
      const handPos = new THREE.Vector3()
      handNode.getWorldPosition(handPos)
      this.foodMesh.position.lerpVectors(handPos, mouthPos, prog)
    } else {
      this.foodMesh.position.copy(mouthPos)
    }

    if (this.phase === 'eat_loop') {
      this.foodMesh.position.y += Math.sin(this.phaseTime * 4.5) * 0.004
    }
  }

  private removeFoodMesh() {
    if (this.foodMesh && this.scene) {
      this.scene.remove(this.foodMesh)
      this.foodMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) { child.geometry?.dispose() }
      })
      this.foodMesh = undefined
    }
  }

  // ── Helpers: cama ─────────────────────────────────────────────────────────

  private createBed() {
    if (!this.scene) return
    const g = new THREE.Group()

    // Base de madeira
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.08, 1.95),
      new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.8, metalness: 0.1 }),
    )
    frame.position.set(0, 0.01, -0.8)
    g.add(frame)

    // Colchao
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.12, 1.85),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 }),
    )
    mattress.position.set(0, 0.10, -0.8)
    g.add(mattress)

    // Cabeceira
    const headboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.55, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x5a2e1a, roughness: 0.75 }),
    )
    headboard.position.set(0, 0.30, -1.73)
    g.add(headboard)

    // Pe da cama
    const footboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.28, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x5a2e1a, roughness: 0.75 }),
    )
    footboard.position.set(0, 0.18, 0.13)
    g.add(footboard)

    // Travesseiro
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.09, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xddddff, roughness: 0.95 }),
    )
    pillow.position.set(0, 0.175, -1.52)
    g.add(pillow)

    // Cobertor
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.07, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x7799cc, roughness: 0.9 }),
    )
    blanket.position.set(0, 0.18, -1.1)
    g.add(blanket)

    g.traverse((c) => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true } })
    this.scene.add(g)
    this.bedMesh = g
  }

  private removeBed() {
    if (this.bedMesh && this.scene) {
      this.scene.remove(this.bedMesh)
      this.bedMesh.traverse((c) => {
        if (c instanceof THREE.Mesh) { c.geometry?.dispose() }
      })
      this.bedMesh = undefined
    }
  }

  // ── Helpers: ZZZ ─────────────────────────────────────────────────────────

  private spawnZZZ() {
    if (!this.scene) return
    for (let i = 0; i < 3; i++) {
      const sz = 0.03 + i * 0.015
      const geo = new THREE.TorusGeometry(sz, 0.005, 4, 5)
      const zmat = new THREE.MeshStandardMaterial({ color: 0xaaccff, transparent: true, opacity: 0.8 })
      const mesh = new THREE.Mesh(geo, zmat)
      mesh.position.set(0.18 + i * 0.07, 0.5 + i * 0.12, -1.3)
      mesh.userData.startY = mesh.position.y
      mesh.userData.phase = i * 0.7
      this.scene.add(mesh)
      this.zzz.push(mesh)
    }
  }

  private updateZZZ(delta: number) {
    for (const z of this.zzz) {
      z.userData.phase = (z.userData.phase ?? 0) + delta * 0.25
      const p = z.userData.phase % 1.0
      z.position.y = z.userData.startY + p * 0.25
      if (z instanceof THREE.Mesh) {
        (z.material as THREE.MeshStandardMaterial).opacity = 0.8 * Math.sin(p * Math.PI)
      }
    }
  }

  private removeZZZ() {
    for (const z of this.zzz) {
      this.scene?.remove(z)
      if (z instanceof THREE.Mesh) { z.geometry?.dispose() }
    }
    this.zzz = []
  }
}
