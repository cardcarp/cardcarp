<template>
    <canvas 
    ref="canvasRef" 
    class="fixed inset-0 w-full h-full -z-10 block opacity-50"
    ></canvas>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref(null)
let animationFrameId = null

const fragmentShaderSource = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  
  uniform vec2 u_resolution;
  uniform float u_time;
  
  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec3 bgColor = vec3(0.05, 0.05, 0.07);
      
      float waveY = 0.35 + 0.35 * sin(uv.x * 2.5 - 0.8 + u_time * 0.15);
      float dist = uv.y - waveY;
      
      float glow = 0.0;
      if (dist > 0.0) {
          glow = exp(-dist * 12.0) * 0.15;
      } else {
          glow = exp(dist * 3.5) * 0.4;
      }
      
      vec3 glowColor = vec3(0.18, 0.18, 0.22);
      vec3 finalColor = bgColor + (glowColor * glow);
      
      gl_FragColor = vec4(finalColor, 1.0);
  }
  `

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
  }
  `

function compileShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

function buildProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
        return null
    }
    return program
}

function initializeWebGL() {
    const canvas = canvasRef.value
    if (!canvas) return
    
    const gl = canvas.getContext('webgl')
    if (!gl) {
        console.error('WebGL is not supported in this browser.')
        return
    }
    
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    const program = buildProgram(gl, vertexShader, fragmentShader)
    
    gl.useProgram(program)
    
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    
    // Two triangles to cover the entire canvas
    const positions = [
    -1.0, -1.0,
    1.0, -1.0,
    -1.0,  1.0,
    -1.0,  1.0,
    1.0, -1.0,
    1.0,  1.0,
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
    
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const timeLocation = gl.getUniformLocation(program, 'u_time')
    
    function resizeCanvas() {
        const displayWidth = canvas.clientWidth
        const displayHeight = canvas.clientHeight
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth
            canvas.height = displayHeight
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        }
    }
    
    function renderLoop(time) {
        resizeCanvas()
        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height)
        gl.uniform1f(timeLocation, time * 0.001)
        
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        animationFrameId = requestAnimationFrame(renderLoop)
    }
    
    animationFrameId = requestAnimationFrame(renderLoop)
}

onMounted(() => {
    initializeWebGL()
})

onBeforeUnmount(() => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
    }
})
</script>