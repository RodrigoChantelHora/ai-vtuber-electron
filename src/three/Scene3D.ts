import * as THREE from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm'
import { LipSyncController } from './LipSyncController'
import { ExpressionManager } from './ExpressionManager'
import { IdleAnimator } from './IdleAnimator'
import { ActionAnimator, FOODS, type FoodDef } from './ActionAnimator'

const SCENE_STORAGE_KEY = 'ai-vtuber-scene'
const DEFAULT_CAM = { x: 0, y: 1.2, z: -2.5 }
const DEFAULT_TGT = { x: 0, y: 1.1, z: 0 }

export class Scene3D {
  private scene:    THREE.Scene
  private camera:   THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private clock:       THREE.Clock
  private fpsLimit     = 0           // 0 = sem limite
  private lastFrameMs  = 0
  private currentFPS   = 0
  private fpsFrames    = 0
  private fpsClock     = 0
  private vrmUpdateRate = 1          // 1=todo frame, 2=a cada 2 frames
  private frameCount   = 0
  private controls: OrbitControls
  private vrm?:     VRM
  private mixer?:   THREE.AnimationMixer
  private placeholderMeshes: THREE.Object3D[] = []

  lipSync:    LipSyncController
  expressions: ExpressionManager
  private idleAnimator: IdleAnimator
  private actionAnimator: ActionAnimator

  private onReady?: () => void
  private onProgress?: (pct: number, msg: string) => void
  private saveTimer?: ReturnType<typeof setTimeout>

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    this.camera = new THREE.PerspectiveCamera(
      30, container.clientWidth / container.clientHeight, 0.1, 20,
    )
    this.camera.position.set(DEFAULT_CAM.x, DEFAULT_CAM.y, DEFAULT_CAM.z)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // ── OrbitControls ──────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(DEFAULT_TGT.x, DEFAULT_TGT.y, DEFAULT_TGT.z)
    this.controls.enableDamping   = true
    this.controls.dampingFactor   = 0.06
    this.controls.minDistance     = 0.5
    this.controls.maxDistance     = 8
    this.controls.maxPolarAngle   = Math.PI * 0.90
    this.controls.mouseButtons    = {
      LEFT:   THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT:  THREE.MOUSE.PAN,
    }
    this.controls.touches = {
      ONE:   THREE.TOUCH.ROTATE,
      TWO:   THREE.TOUCH.DOLLY_PAN,
    }
    this.controls.addEventListener('change', () => this.scheduleCameraSave())
    this.loadCameraState()

    this.clock       = new THREE.Clock()
    this.lipSync     = new LipSyncController()
    this.expressions = new ExpressionManager()
    this.idleAnimator = new IdleAnimator()
    this.actionAnimator = new ActionAnimator()

    this.setupLights()
    this.setupGround()
    this.startLoop()

    window.addEventListener('resize', () => this.handleResize(container))
  }

  // ── Câmera: save / load / reset ───────────────────────────────────────────

  private scheduleCameraSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.saveCameraState(), 800)
  }

  private saveCameraState() {
    const state = {
      camX: this.camera.position.x,
      camY: this.camera.position.y,
      camZ: this.camera.position.z,
      tgtX: this.controls.target.x,
      tgtY: this.controls.target.y,
      tgtZ: this.controls.target.z,
      poseIndex: this.idleAnimator.getPoseIndex(),
    }
    localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(state))
  }

  private loadCameraState() {
    try {
      const raw = localStorage.getItem(SCENE_STORAGE_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      this.camera.position.set(
        s.camX ?? DEFAULT_CAM.x,
        s.camY ?? DEFAULT_CAM.y,
        s.camZ ?? DEFAULT_CAM.z,
      )
      this.controls.target.set(
        s.tgtX ?? DEFAULT_TGT.x,
        s.tgtY ?? DEFAULT_TGT.y,
        s.tgtZ ?? DEFAULT_TGT.z,
      )
      this.controls.update()
      // Pose é restaurada via setPose() depois que o VRM carregar (chamado em App.tsx)
      if (typeof s.poseIndex === 'number') {
        this.idleAnimator.setPose(s.poseIndex)
      }
    } catch { /* ignora estado inválido */ }
  }

  resetCamera() {
    this.camera.position.set(DEFAULT_CAM.x, DEFAULT_CAM.y, DEFAULT_CAM.z)
    this.controls.target.set(DEFAULT_TGT.x, DEFAULT_TGT.y, DEFAULT_TGT.z)
    this.controls.update()
    this.saveCameraState()
  }

  // ── API de gênero / pose ──────────────────────────────────────────────────

  setGender(gender: string) {
    this.idleAnimator.setGender(gender)
  }

  setPose(index: number) {
    this.idleAnimator.setPose(index)
    // Salva imediatamente
    this.saveCameraState()
  }

  getPoseIndex(): number {
    return this.idleAnimator.getPoseIndex()
  }

  // ── Setup de cena ─────────────────────────────────────────────────────────

  private setupLights() {
    this.scene.add(new THREE.AmbientLight(0x404060, 0.6))

    const main = new THREE.DirectionalLight(0xffeedd, 1.5)
    main.position.set(1, 3, 2)
    main.castShadow = true
    this.scene.add(main)

    const fill = new THREE.DirectionalLight(0x4488ff, 0.4)
    fill.position.set(-1, 1, -1)
    this.scene.add(fill)

    const rim = new THREE.DirectionalLight(0x88ddff, 0.6)
    rim.position.set(0, 2, -3)
    this.scene.add(rim)
  }

  private setupGround() {
    const geo   = new THREE.PlaneGeometry(5, 5)
    const mat   = new THREE.ShadowMaterial({ opacity: 0.3 })
    const ground = new THREE.Mesh(geo, mat)
    ground.rotation.x  = -Math.PI / 2
    ground.position.y  = -0.01
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  // ── Carregamento de VRM ───────────────────────────────────────────────────

  async loadVRM(url: string): Promise<void> {
    this.onProgress?.(5, 'Preparando carregador...')
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf: GLTF) => {
          const vrm = (gltf.userData as any).vrm as VRM
          if (!vrm) { reject(new Error('Not a VRM file')); return }

          this.vrm = vrm
          VRMUtils.rotateVRM0(vrm)
          this.scene.add(vrm.scene)

          vrm.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })

          this.expressions.setVRM(vrm)
          this.lipSync.setVRM(vrm)
          this.idleAnimator.setVRM(vrm)
          this.actionAnimator.setup(vrm, this.scene, this.idleAnimator)

          const idleClip = gltf.animations?.find((a) =>
            a.name.toLowerCase().includes('idle'),
          )
          if (idleClip) {
            this.mixer = new THREE.AnimationMixer(vrm.scene)
            this.mixer.clipAction(idleClip).play()
            this.idleAnimator.setEnabled(false)   // usa a animação embutida
          } else {
            this.idleAnimator.setEnabled(true)    // usa animações procedurais
          }

          this.onProgress?.(100, 'Modelo carregado!')
          this.onReady?.()
          resolve()
        },
        (e: ProgressEvent) => {
          if (e.total > 0) {
            this.onProgress?.(Math.round((e.loaded / e.total) * 80) + 10, 'Carregando modelo VRM...')
          }
        },
        reject,
      )
    })
  }

  loadDefaultModel(): void {
    this.clearModel()

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 0.6, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x6688dd, metalness: 0.1, roughness: 0.7 }),
    )
    body.position.y = 0.7
    body.castShadow = true
    this.scene.add(body)
    this.placeholderMeshes.push(body)

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffccaa }),
    )
    head.position.y = 1.1
    head.castShadow = true
    this.scene.add(head)
    this.placeholderMeshes.push(head)

    for (const [x] of [[-0.08], [0.08]]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222 }),
      )
      eye.position.set(x, 1.15, 0.18)
      this.scene.add(eye)
      this.placeholderMeshes.push(eye)
    }
  }

  clearModel(): void {
    if (this.vrm) {
      VRMUtils.deepDispose(this.vrm.scene)
      this.scene.remove(this.vrm.scene)
      this.vrm = undefined
      this.mixer = undefined
    }
    for (const m of this.placeholderMeshes) {
      this.scene.remove(m)
      if (m instanceof THREE.Mesh) {
        m.geometry.dispose()
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose())
        else m.material.dispose()
      }
    }
    this.placeholderMeshes = []
    this.lipSync.setVRM(undefined)
    this.idleAnimator.setVRM(undefined)
    this.idleAnimator.setEnabled(false)
    this.actionAnimator.teardown()
  }

  loadVRMFromData(base64: string): Promise<void> {
    this.clearModel()
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const blob  = new Blob([bytes], { type: 'application/octet-stream' })
    return this.loadVRM(URL.createObjectURL(blob))
  }

  // ── Loop de renderização ──────────────────────────────────────────────────

  private startLoop() {
    const animate = (now: number) => {
      requestAnimationFrame(animate)

      // FPS limiter
      if (this.fpsLimit > 0) {
        const interval = 1000 / this.fpsLimit
        if (now - this.lastFrameMs < interval - 0.5) return
        this.lastFrameMs = now
      }

      this.frameCount++
      this.fpsFrames++
      if (now - this.fpsClock >= 1000) {
        this.currentFPS = this.fpsFrames
        this.fpsFrames = 0
        this.fpsClock = now
      }
      const delta = this.clock.getDelta()

      this.controls.update()
      // VRM update: pode ser a cada N frames para economizar CPU
      if (this.vrm && this.frameCount % this.vrmUpdateRate === 0) this.vrm.update(delta * this.vrmUpdateRate)
      if (this.mixer)  this.mixer.update(delta)
      this.lipSync.update(delta)
      this.expressions.update(delta)
      this.idleAnimator.update(delta)
      this.actionAnimator.update(delta)

      this.renderer.render(this.scene, this.camera)
    }
    requestAnimationFrame(animate)
  }

  private handleResize(container: HTMLElement) {
    const w = container.clientWidth
    const h = container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  setReadyCallback(cb: () => void) { this.onReady = cb }
  setProgressCallback(cb: (pct: number, msg: string) => void) { this.onProgress = cb }

  // ── Configurações de gráficos ─────────────────────────────────────────────

  getFPS(): number { return this.currentFPS }

  setFpsLimit(fps: number) {
    this.fpsLimit = fps
    this.lastFrameMs = 0
  }

  setShadows(enabled: boolean) {
    this.renderer.shadowMap.enabled = enabled
    // Defer the expensive scene.traverse to avoid blocking the first rendered frame
    const doTraverse = () => {
      this.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow    = enabled
          obj.receiveShadow = enabled
        }
        if ((obj as THREE.DirectionalLight).isDirectionalLight ||
            (obj as THREE.SpotLight).isSpotLight) {
          (obj as THREE.Light & { castShadow: boolean }).castShadow = enabled
        }
      })
      this.renderer.shadowMap.needsUpdate = true
    }
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(doTraverse, { timeout: 500 })
    } else {
      setTimeout(doTraverse, 50)
    }
  }

  setPixelRatio(ratio: number) {
    this.renderer.setPixelRatio(Math.max(0.5, Math.min(ratio, 2)))
    const c = this.renderer.domElement.parentElement
    if (c) this.handleResize(c as HTMLElement)
  }

  setVrmUpdateRate(rate: number) {
    this.vrmUpdateRate = Math.max(1, Math.round(rate))
  }

  applyGraphicsPreset(preset: 'low' | 'medium' | 'high') {
    if (preset === 'high') {
      this.setFpsLimit(0)
      this.setShadows(true)
      this.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      this.setVrmUpdateRate(1)
    } else if (preset === 'medium') {
      this.setFpsLimit(0)
      this.setShadows(false)
      this.setPixelRatio(1.0)
      this.setVrmUpdateRate(1)
    } else {
      this.setFpsLimit(30)
      this.setShadows(false)
      this.setPixelRatio(0.75)
      this.setVrmUpdateRate(2)
    }
  }

  // ── Acoes: comer / dormir ─────────────────────────────────────────────────

  startEating(foodId: string) {
    const food = FOODS.find((f) => f.id === foodId)
    if (food) this.actionAnimator.startEating(food)
  }

  stopEating() {
    if (this.actionAnimator.isEating()) this.actionAnimator.stop()
  }

  startSleeping() {
    this.actionAnimator.startSleeping()
  }

  stopSleeping() {
    if (this.actionAnimator.isSleeping()) this.actionAnimator.wakeUp()
  }

  isActionActive(): boolean { return this.actionAnimator.isActive() }


  destroy() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
