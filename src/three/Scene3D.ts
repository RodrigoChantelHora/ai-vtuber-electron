import * as THREE from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm'
import { LipSyncController } from './LipSyncController'
import { ExpressionManager } from './ExpressionManager'

export class Scene3D {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private clock: THREE.Clock
  private vrm?: VRM
  private mixer?: THREE.AnimationMixer
  private placeholderMeshes: THREE.Object3D[] = []

  lipSync: LipSyncController
  expressions: ExpressionManager

  private onReady?: () => void

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    this.camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.1, 20)
    this.camera.position.set(0, 1.2, -2.5)
    this.camera.lookAt(0, 1.1, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.clock = new THREE.Clock()
    this.lipSync = new LipSyncController()
    this.expressions = new ExpressionManager()

    this.setupLights()
    this.setupGround()
    this.startLoop()

    window.addEventListener('resize', () => this.handleResize(container))
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambient)

    const mainLight = new THREE.DirectionalLight(0xffeedd, 1.5)
    mainLight.position.set(1, 3, 2)
    mainLight.castShadow = true
    this.scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4)
    fillLight.position.set(-1, 1, -1)
    this.scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x88ddff, 0.6)
    rimLight.position.set(0, 2, -3)
    this.scene.add(rimLight)
  }

  private setupGround() {
    const geo = new THREE.PlaneGeometry(5, 5)
    const mat = new THREE.ShadowMaterial({ opacity: 0.3 })
    const ground = new THREE.Mesh(geo, mat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  async loadVRM(url: string): Promise<void> {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf: GLTF) => {
          const vrm = (gltf.userData as any).vrm as VRM
          if (!vrm) {
            reject(new Error('Not a VRM file'))
            return
          }

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

          const clips = gltf.animations || []
          const idleClip = clips.find((a) =>
            a.name.toLowerCase().includes('idle')
          )
          if (idleClip) {
            this.mixer = new THREE.AnimationMixer(vrm.scene)
            this.mixer.clipAction(idleClip).play()
          }

          this.onReady?.()
          resolve()
        },
        undefined,
        reject
      )
    })
  }

  loadDefaultModel(): void {
    this.clearModel()

    const geometry = new THREE.CapsuleGeometry(0.3, 0.6, 8, 16)
    const material = new THREE.MeshStandardMaterial({
      color: 0x6688dd,
      metalness: 0.1,
      roughness: 0.7,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 0.7
    mesh.castShadow = true
    this.scene.add(mesh)
    this.placeholderMeshes.push(mesh)

    const headGeo = new THREE.SphereGeometry(0.2, 16, 16)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 1.1
    head.castShadow = true
    this.scene.add(head)
    this.placeholderMeshes.push(head)

    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8)
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
    eyeL.position.set(-0.08, 1.15, 0.18)
    this.scene.add(eyeL)
    this.placeholderMeshes.push(eyeL)
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
    eyeR.position.set(0.08, 1.15, 0.18)
    this.scene.add(eyeR)
    this.placeholderMeshes.push(eyeR)
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
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose())
        } else {
          m.material.dispose()
        }
      }
    }
    this.placeholderMeshes = []
    this.lipSync.setVRM(undefined)
  }

  loadVRMFromData(base64: string): Promise<void> {
    this.clearModel()

    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)

    return this.loadVRM(url)
  }

  private startLoop() {
    const animate = () => {
      requestAnimationFrame(animate)
      const delta = this.clock.getDelta()

      if (this.vrm) {
        this.vrm.update(delta)
      }

      if (this.mixer) {
        this.mixer.update(delta)
      }

      this.lipSync.update(delta)
      this.expressions.update(delta)

      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  private handleResize(container: HTMLElement) {
    const w = container.clientWidth
    const h = container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  setReadyCallback(cb: () => void) {
    this.onReady = cb
  }

  destroy() {
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
