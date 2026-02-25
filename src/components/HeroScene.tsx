'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Float, Sphere, Stars } from '@react-three/drei'
import * as THREE from 'three'

interface HeartSceneProps {
  reelMode?: boolean
  intensity?: number
}

function FloatingHeart({ reelMode, intensity = 1 }: { reelMode?: boolean; intensity?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  // Create a heart-like geometry using a custom shape
  const heartGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const x = 0, y = 0

    shape.moveTo(x + 0.5, y + 0.5)
    shape.bezierCurveTo(x + 0.5, y + 0.5, x + 0.4, y, x, y)
    shape.bezierCurveTo(x - 0.6, y, x - 0.6, y + 0.7, x - 0.6, y + 0.7)
    shape.bezierCurveTo(x - 0.6, y + 1.1, x - 0.3, y + 1.54, x + 0.5, y + 1.9)
    shape.bezierCurveTo(x + 1.2, y + 1.54, x + 1.6, y + 1.1, x + 1.6, y + 0.7)
    shape.bezierCurveTo(x + 1.6, y + 0.7, x + 1.6, y, x + 1.0, y)
    shape.bezierCurveTo(x + 0.7, y, x + 0.5, y + 0.5, x + 0.5, y + 0.5)

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 8,
    })

    // Center the geometry
    geometry.center()
    return geometry
  }, [])

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return

    const t = state.clock.elapsedTime
    const speed = reelMode ? 0.3 : 0.5

    // Slow rotation
    meshRef.current.rotation.y = Math.sin(t * speed) * 0.3
    meshRef.current.rotation.x = Math.sin(t * speed * 0.7) * 0.15

    // Pulse scale
    const pulse = 1 + Math.sin(t * 1.5) * 0.05 * intensity
    groupRef.current.scale.setScalar(pulse)

    // Camera zoom for reel mode
    if (reelMode) {
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 3, 0.05)
    } else {
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 5, 0.05)
    }
  })

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          geometry={heartGeometry}
          position={[0, 0, 0]}
        >
          <MeshDistortMaterial
            color="#ff2d78"
            emissive="#aa0040"
            emissiveIntensity={0.4}
            distort={0.25}
            speed={1.5}
            roughness={0.1}
            metalness={0.8}
          />
        </mesh>
      </Float>
    </group>
  )
}

function FloatingOrbs() {
  const orbs = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4 - 2,
      ] as [number, number, number],
      size: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.5 + 0.3,
      color: i % 2 === 0 ? '#a855f7' : '#ff2d78',
    })), []
  )

  return (
    <>
      {orbs.map((orb, i) => (
        <Float key={i} speed={orb.speed} floatIntensity={1}>
          <Sphere position={orb.position} args={[orb.size, 16, 16]}>
            <meshStandardMaterial
              color={orb.color}
              emissive={orb.color}
              emissiveIntensity={0.6}
              transparent
              opacity={0.6}
            />
          </Sphere>
        </Float>
      ))}
    </>
  )
}

function GeometricRing() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    meshRef.current.rotation.z = t * 0.2
    meshRef.current.rotation.x = t * 0.1
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -1]}>
      <torusGeometry args={[2.5, 0.02, 8, 100]} />
      <meshStandardMaterial
        color="#a855f7"
        emissive="#a855f7"
        emissiveIntensity={0.8}
        transparent
        opacity={0.4}
      />
    </mesh>
  )
}

export default function HeroScene({ reelMode, intensity }: HeartSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      style={{ background: 'transparent' }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ff2d78" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
      <spotLight
        position={[0, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        color="#e879f9"
      />

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={2}
        saturation={1}
        fade
        speed={0.5}
      />

      <FloatingHeart reelMode={reelMode} intensity={intensity} />
      <FloatingOrbs />
      <GeometricRing />
    </Canvas>
  )
}
