import { useState, useEffect } from 'react'
import { IdleAnimator, PosePreset } from '../three/IdleAnimator'
import { FOODS } from '../three/ActionAnimator'
import type { Scene3D } from '../three/Scene3D'
import './SceneControls.css'

interface Props {
  scene: Scene3D | null
  gender: string
  poseIndex: number
  onPoseChange: (index: number) => void
  onResetCamera: () => void
  onEat: (foodId: string) => void
  onStopEating: () => void
  onSleep: () => void
  onWakeUp: () => void
  isEating: boolean
  isSleeping: boolean
}

export function SceneControls({
  scene,
  gender, poseIndex, onPoseChange, onResetCamera,
  onEat, onStopEating, onSleep, onWakeUp,
  isEating, isSleeping,
}: Props) {
  const presets: PosePreset[] = IdleAnimator.getPresets(gender)
  const [showFood, setShowFood] = useState(false)
  const [fps, setFps] = useState(0)

  // Atualiza FPS a cada segundo
  useEffect(() => {
    const t = setInterval(() => {
      if (scene) setFps(scene.getFPS())
    }, 1000)
    return () => clearInterval(t)
  }, [scene])

  const fpsColor = fps === 0 ? '#555' : fps >= 50 ? '#44cc88' : fps >= 30 ? '#ffaa44' : '#ff5555'

  function handleFoodPick(id: string) {
    setShowFood(false)
    onEat(id)
  }

  return (
    <div className="scene-controls">
      {/* FPS counter */}
      <div className="sc-fps" style={{ color: fpsColor }}>
        {fps > 0 ? `${fps} FPS` : '— FPS'}
      </div>

      {/* Poses */}
      <div className="sc-section">
        <span className="sc-label">Pose</span>
        <div className="sc-poses">
          {presets.map((preset, i) => (
            <button
              key={i}
              className={`sc-pose-btn${poseIndex === i ? ' active' : ''}`}
              onClick={() => onPoseChange(i)}
              title={preset.label}
            >
              <span className="sc-pose-icon">{preset.icon}</span>
              <span className="sc-pose-name">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Acoes */}
      <div className="sc-section">
        <span className="sc-label">Acoes</span>
        <div className="sc-actions">
          {isEating ? (
            <button className="sc-action-btn sc-action-active" onClick={onStopEating} title="Parar de comer">
              <span className="sc-pose-icon">&#x1F374;</span>
              <span className="sc-pose-name">Parar</span>
            </button>
          ) : (
            <div className="sc-food-wrap">
              <button
                className={`sc-action-btn${showFood ? ' sc-action-active' : ''}`}
                onClick={() => setShowFood((v) => !v)}
                title="Comer"
              >
                <span className="sc-pose-icon">&#x1F37D;</span>
                <span className="sc-pose-name">Comer</span>
              </button>
              {showFood && (
                <div className="sc-food-menu">
                  {FOODS.map((f) => (
                    <button
                      key={f.id}
                      className="sc-food-item"
                      onClick={() => handleFoodPick(f.id)}
                      title={f.label}
                    >
                      <span>{f.emoji}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className={`sc-action-btn${isSleeping ? ' sc-action-active' : ''}`}
            onClick={isSleeping ? onWakeUp : onSleep}
            title={isSleeping ? 'Acordar' : 'Dormir'}
          >
            <span className="sc-pose-icon">{isSleeping ? '☀️' : '😴'}</span>
            <span className="sc-pose-name">{isSleeping ? 'Acordar' : 'Dormir'}</span>
          </button>
        </div>
      </div>

      {/* Camera */}
      <div className="sc-section sc-row">
        <button className="sc-cam-btn" onClick={onResetCamera} title="Resetar camera">
          &#x21BA; Camera
        </button>
        <span className="sc-hint">Arrastar &middot; Scroll &middot; Ctrl+drag</span>
      </div>
    </div>
  )
}
