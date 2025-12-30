'use client'

import React, { useEffect, useRef } from 'react'
import { Renderer, Camera, Transform, Program, Mesh, Vec3 } from 'ogl'

type AnimationType = 'rotate' | '3drotate' | 'oscillate' | 'morph'

type PrismProps = {
  height?: number
  baseWidth?: number
  animationType?: AnimationType
  glow?: number
  noise?: number
  scale?: number
  hueShift?: number
  colorFrequency?: number
  timeScale?: number
  transparent?: boolean
}

export default function Prism({
  height = 3.5,
  baseWidth = 5.5,
  animationType = '3drotate',
  glow = 0.5,
  noise = 0,
  scale = 3.6,
  hueShift = 0,
  colorFrequency = 1,
  timeScale = 0.5,
  transparent = true,
}: PrismProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const renderer = new Renderer({
      alpha: true,
      antialias: true,
    })
    const gl = renderer.gl
    container.appendChild(gl.canvas)
    gl.canvas.style.width = '100%'
    gl.canvas.style.height = '100%'

    const camera = new Camera(gl, { fov: 35 })
    camera.position.set(0, 0, 15)

    function resize() {
      if (!container) return
      renderer.setSize(container.offsetWidth, container.offsetHeight)
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
    }
    window.addEventListener('resize', resize)
    resize()

    const scene = new Transform()

    // Vertex shader
    const vertex = /* glsl */ `
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform mat3 normalMatrix;
      uniform float uTime;
      uniform float uNoise;
      uniform float uAnimationType;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vNoise;

      // Simple noise function
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;

        vec3 pos = position;

        // Apply noise
        if (uNoise > 0.0) {
          float n = noise(position + uTime * 0.5) * uNoise;
          pos += normal * n;
          vNoise = n;
        } else {
          vNoise = 0.0;
        }

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `

    // Fragment shader
    const fragment = /* glsl */ `
      precision highp float;

      uniform float uTime;
      uniform float uGlow;
      uniform float uHueShift;
      uniform float uColorFrequency;
      uniform vec3 uBaseColor;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vNoise;

      // HSV to RGB conversion
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        // Base color with hue shift and color frequency
        float hue = uHueShift + vPosition.y * uColorFrequency * 0.1 + uTime * 0.1;
        hue = fract(hue);
        vec3 color = hsv2rgb(vec3(hue, 0.8, 1.0));

        // Mix with base color
        color = mix(color, uBaseColor, 0.3);

        // Fresnel effect for glow
        vec3 viewDirection = normalize(vec3(0.0, 0.0, 1.0));
        float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 3.0);

        // Apply glow
        color += fresnel * uGlow * vec3(0.5, 0.8, 1.0);

        // Add noise variation
        color += vNoise * 0.2;

        // Edge highlight
        float edge = 1.0 - abs(dot(viewDirection, vNormal));
        color += edge * 0.3 * vec3(0.6, 0.9, 1.0);

        float alpha = transparent ? 0.9 : 1.0;
        gl_FragColor = vec4(color, alpha);
      }
    `

    // Create triangular prism geometry
    function createPrismGeometry(h: number, w: number) {
      const halfW = w / 2
      const halfH = h / 2

      // Vertices for triangular prism (6 vertices total)
      // Front triangle: top, bottom-left, bottom-right
      // Back triangle: same but z-offset
      const positions = [
        // Front face triangle
        0, halfH, halfW, // 0: top
        -halfW, -halfH, halfW, // 1: bottom-left
        halfW, -halfH, halfW, // 2: bottom-right

        // Back face triangle
        0, halfH, -halfW, // 3: top
        -halfW, -halfH, -halfW, // 4: bottom-left
        halfW, -halfH, -halfW, // 5: bottom-right
      ]

      // Indices for triangular faces
      const indices = [
        // Front triangle
        0, 1, 2,

        // Back triangle
        3, 5, 4,

        // Left rectangular face (2 triangles)
        0, 1, 4,
        0, 4, 3,

        // Right rectangular face (2 triangles)
        0, 2, 5,
        0, 5, 3,

        // Bottom rectangular face (2 triangles)
        1, 2, 5,
        1, 5, 4,
      ]

      // Calculate normals
      const normals = []
      for (let i = 0; i < positions.length; i += 3) {
        // Simplified normal calculation - pointing outward from center
        const x = positions[i]
        const y = positions[i + 1]
        const z = positions[i + 2]
        const length = Math.sqrt(x * x + y * y + z * z)
        normals.push(x / length, y / length, z / length)
      }

      return {
        position: { size: 3, data: new Float32Array(positions) },
        normal: { size: 3, data: new Float32Array(normals) },
        index: { data: new Uint16Array(indices) },
      }
    }

    const geometry = createPrismGeometry(height, baseWidth)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uGlow: { value: glow },
        uNoise: { value: noise },
        uHueShift: { value: hueShift },
        uColorFrequency: { value: colorFrequency },
        uAnimationType: { value: animationType === 'rotate' ? 1 : animationType === '3drotate' ? 2 : animationType === 'oscillate' ? 3 : 4 },
        uBaseColor: { value: new Vec3(0.2, 0.6, 1.0) },
      },
      transparent: transparent,
      cullFace: null,
    })

    const mesh = new Mesh(gl, { geometry, program })
    mesh.setParent(scene)
    mesh.scale.set(scale, scale, scale)

    let time = 0
    function update(t: number) {
      rafRef.current = requestAnimationFrame(update)
      time += 0.001 * timeScale

      // Update time uniform
      program.uniforms.uTime.value = time

      // Apply different animations based on type
      switch (animationType) {
        case 'rotate':
          mesh.rotation.y = time
          break
        case '3drotate':
          mesh.rotation.x = time * 0.3
          mesh.rotation.y = time * 0.5
          mesh.rotation.z = time * 0.2
          break
        case 'oscillate':
          mesh.rotation.y = Math.sin(time) * 0.5
          mesh.position.y = Math.sin(time * 0.5) * 0.5
          break
        case 'morph':
          mesh.rotation.y = time * 0.3
          mesh.scale.set(
            scale + Math.sin(time * 2) * 0.2,
            scale + Math.cos(time * 1.5) * 0.2,
            scale + Math.sin(time * 1.8) * 0.2
          )
          break
      }

      renderer.render({ scene, camera })
    }

    rafRef.current = requestAnimationFrame(update)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (container && gl.canvas) {
        container.removeChild(gl.canvas)
      }
    }
  }, [height, baseWidth, animationType, glow, noise, scale, hueShift, colorFrequency, timeScale, transparent])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  )
}
