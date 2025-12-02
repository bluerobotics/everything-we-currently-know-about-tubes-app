import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useProjectResults, useProjectConfig } from '../stores/appStore'
import { Eye, EyeOff, Box, Cylinder } from 'lucide-react'

const HEX_ROW_SPACING = Math.sqrt(3) / 2
const MAX_RENDERED_CYLINDERS = 1000 // Limit for performance

// Custom axis colors (avoiding red-green spectrum)
const AXIS_COLORS = {
  x: '#339af0', // Bright blue
  y: '#20c997', // Teal
  z: '#b197fc'  // Lavender
}

// Custom colored axes component
function ColoredAxes({ size }: { size: number }) {
  return (
    <group>
      {/* X axis - Blue */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, size, 0, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={AXIS_COLORS.x} linewidth={2} />
      </line>
      {/* Y axis - Teal */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, size, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={AXIS_COLORS.y} linewidth={2} />
      </line>
      {/* Z axis - Lavender */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, 0, size]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={AXIS_COLORS.z} linewidth={2} />
      </line>
    </group>
  )
}

interface CylinderMeshProps {
  outerDiameter: number
  innerDiameter: number
  length: number
  wallThickness: number
  endcapThickness: number
  showTube: boolean
  showEndcaps: boolean
  autoRotate: boolean
}

function SingleCylinder({ 
  outerDiameter, 
  innerDiameter, 
  length, 
  endcapThickness,
  showTube,
  showEndcaps,
  autoRotate
}: CylinderMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  // Slow auto-rotation (only when not interacted)
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.2
    }
  })

  // Scale down for visualization (convert mm to scene units)
  const scale = 0.01
  const outerR = (outerDiameter / 2) * scale
  const innerR = (innerDiameter / 2) * scale
  const len = length * scale
  const capT = endcapThickness * scale
  const tubeLen = len - 2 * capT

  // Create tube geometry (hollow cylinder)
  const tubeGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true)
    shape.holes.push(hole)

    const extrudeSettings = {
      steps: 1,
      depth: tubeLen,
      bevelEnabled: false
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [outerR, innerR, tubeLen])

  // Tube material - blue
  const tubeMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    metalness: 0.1,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  }), [])

  // Endcap material - teal/cyan to differentiate
  const endcapMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#00d4aa',
    metalness: 0.15,
    roughness: 0.25,
    transparent: true,
    opacity: 0.9
  }), [])

  // Inner surface material
  const innerMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1a1a2e',
    metalness: 0,
    roughness: 0.8,
    side: THREE.BackSide
  }), [])

  // Endcap positions
  const topCapY = tubeLen / 2 + capT / 2
  const bottomCapY = -tubeLen / 2 - capT / 2

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Main tube body */}
      {showTube && (
        <>
          <mesh 
            geometry={tubeGeometry} 
            material={tubeMaterial}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, tubeLen / 2, 0]}
          />
          {/* Inner surface (dark) */}
          <mesh material={innerMaterial}>
            <cylinderGeometry args={[innerR - 0.001, innerR - 0.001, tubeLen, 64, 1, true]} />
          </mesh>
        </>
      )}

      {/* Endcaps - outer diameter matches tube OD */}
      {showEndcaps && (
        <>
          {/* Top endcap (solid disc at outer diameter) */}
          <mesh position={[0, topCapY, 0]} material={endcapMaterial}>
            <cylinderGeometry args={[outerR, outerR, capT, 64]} />
          </mesh>

          {/* Bottom endcap (solid disc at outer diameter) */}
          <mesh position={[0, bottomCapY, 0]} material={endcapMaterial}>
            <cylinderGeometry args={[outerR, outerR, capT, 64]} />
          </mesh>
        </>
      )}

      {/* Show tube end rings when tube visible but endcaps hidden */}
      {showTube && !showEndcaps && (
        <>
          <mesh position={[0, tubeLen / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[innerR, outerR, 64]} />
            <meshPhysicalMaterial color="#4a9eff" metalness={0.1} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -tubeLen / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[innerR, outerR, 64]} />
            <meshPhysicalMaterial color="#4a9eff" metalness={0.1} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  )
}

interface PackedSceneProps {
  boxWidth: number
  boxHeight: number
  boxDepth: number
  cylinderDiameter: number
  cylinderLength: number
  endcapThickness: number
  orientation: 'x' | 'y' | 'z'
  maxCount: number
  autoRotate: boolean
  paddingMm: number
}

// Use instanced mesh for better performance - renders tubes and endcaps
function PackedCylindersInstanced({ 
  positions, 
  radius, 
  tubeLength,
  endcapThickness
}: { 
  positions: { pos: [number, number, number]; rot: [number, number, number] }[]
  radius: number
  tubeLength: number
  endcapThickness: number
}) {
  const tubeRef = useRef<THREE.InstancedMesh>(null)
  const topCapRef = useRef<THREE.InstancedMesh>(null)
  const bottomCapRef = useRef<THREE.InstancedMesh>(null)
  
  useEffect(() => {
    if (!tubeRef.current || !topCapRef.current || !bottomCapRef.current) return
    
    const tempMatrix = new THREE.Matrix4()
    const tempPosition = new THREE.Vector3()
    const tempQuaternion = new THREE.Quaternion()
    const tempScale = new THREE.Vector3(1, 1, 1)
    const tempEuler = new THREE.Euler()
    
    // For endcap offsets along cylinder axis
    const capOffset = (tubeLength + endcapThickness) / 2
    const tempCapOffset = new THREE.Vector3()
    
    positions.forEach((cyl, i) => {
      tempPosition.set(cyl.pos[0], cyl.pos[1], cyl.pos[2])
      tempEuler.set(cyl.rot[0], cyl.rot[1], cyl.rot[2])
      tempQuaternion.setFromEuler(tempEuler)
      
      // Tube
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale)
      tubeRef.current!.setMatrixAt(i, tempMatrix)
      
      // Calculate endcap positions (offset along cylinder's local Y axis)
      // Top cap
      tempCapOffset.set(0, capOffset, 0)
      tempCapOffset.applyQuaternion(tempQuaternion)
      tempCapOffset.add(tempPosition)
      tempMatrix.compose(tempCapOffset, tempQuaternion, tempScale)
      topCapRef.current!.setMatrixAt(i, tempMatrix)
      
      // Bottom cap
      tempCapOffset.set(0, -capOffset, 0)
      tempCapOffset.applyQuaternion(tempQuaternion)
      tempCapOffset.add(tempPosition)
      tempMatrix.compose(tempCapOffset, tempQuaternion, tempScale)
      bottomCapRef.current!.setMatrixAt(i, tempMatrix)
    })
    
    tubeRef.current.instanceMatrix.needsUpdate = true
    topCapRef.current.instanceMatrix.needsUpdate = true
    bottomCapRef.current.instanceMatrix.needsUpdate = true
  }, [positions, tubeLength, endcapThickness])

  return (
    <>
      {/* Tubes */}
      <instancedMesh ref={tubeRef} args={[undefined, undefined, positions.length]}>
        <cylinderGeometry args={[radius, radius, tubeLength, 12]} />
        <meshStandardMaterial 
          color="#4a9eff" 
          metalness={0.2} 
          roughness={0.5}
        />
      </instancedMesh>
      
      {/* Top endcaps */}
      <instancedMesh ref={topCapRef} args={[undefined, undefined, positions.length]}>
        <cylinderGeometry args={[radius, radius, endcapThickness, 12]} />
        <meshStandardMaterial 
          color="#00d4aa" 
          metalness={0.2} 
          roughness={0.4}
        />
      </instancedMesh>
      
      {/* Bottom endcaps */}
      <instancedMesh ref={bottomCapRef} args={[undefined, undefined, positions.length]}>
        <cylinderGeometry args={[radius, radius, endcapThickness, 12]} />
        <meshStandardMaterial 
          color="#00d4aa" 
          metalness={0.2} 
          roughness={0.4}
        />
      </instancedMesh>
    </>
  )
}

function PackedScene({ 
  boxWidth, 
  boxHeight, 
  boxDepth, 
  cylinderDiameter,
  cylinderLength,
  endcapThickness,
  orientation,
  maxCount,
  autoRotate,
  paddingMm
}: PackedSceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.1
    }
  })

  const scale = 0.01
  const w = boxWidth * scale
  const h = boxHeight * scale
  const d = boxDepth * scale
  const cylR = (cylinderDiameter / 2) * scale
  const cylL = cylinderLength * scale
  const capT = endcapThickness * scale
  const tubeL = cylL - 2 * capT // Tube length (total length minus two endcaps)

  // Calculate cylinder positions based on hex packing
  const cylinderPositions = useMemo(() => {
    const positions: { pos: [number, number, number]; rot: [number, number, number] }[] = []
    // Use padded diameter for spacing calculations (actual cylinder diameter stays the same)
    const paddedDiameter = (cylinderDiameter + 2 * paddingMm) * scale
    const length = cylinderLength * scale
    const rowSpacing = paddedDiameter * HEX_ROW_SPACING

    // Determine packing plane and axis based on orientation
    let packingW: number, packingH: number, axisLen: number
    if (orientation === 'x') {
      packingW = h
      packingH = d
      axisLen = w
    } else if (orientation === 'y') {
      packingW = w
      packingH = d
      axisLen = h
    } else {
      packingW = w
      packingH = h
      axisLen = d
    }

    const layers = Math.floor(axisLen / length)
    const circlesPerRow = Math.floor((packingW - paddedDiameter) / paddedDiameter) + 1
    const numRows = 1 + Math.floor((packingH - paddedDiameter) / rowSpacing)

    if (layers <= 0 || circlesPerRow <= 0 || numRows <= 0) return positions

    let count = 0
    // Limit rendered cylinders but respect maxCount if set
    const renderLimit = maxCount > 0 ? Math.min(maxCount, MAX_RENDERED_CYLINDERS) : MAX_RENDERED_CYLINDERS

    for (let layer = 0; layer < layers && count < renderLimit; layer++) {
      const layerOffset = (layer + 0.5) * length - axisLen / 2

      for (let row = 0; row < numRows && count < renderLimit; row++) {
        const isOddRow = row % 2 === 1
        const rowY = row * rowSpacing + paddedDiameter / 2 - packingH / 2
        
        const rowCircles = isOddRow
          ? Math.floor((packingW - paddedDiameter / 2) / paddedDiameter)
          : circlesPerRow

        for (let col = 0; col < rowCircles && count < renderLimit; col++) {
          const colX = (col + 0.5) * paddedDiameter - packingW / 2 + (isOddRow ? paddedDiameter / 2 : 0)
          
          let pos: [number, number, number]
          let rot: [number, number, number]

          if (orientation === 'x') {
            pos = [layerOffset, colX, rowY]
            rot = [0, 0, Math.PI / 2]
          } else if (orientation === 'y') {
            pos = [colX, layerOffset, rowY]
            rot = [0, 0, 0]
          } else {
            pos = [colX, rowY, layerOffset]
            rot = [Math.PI / 2, 0, 0]
          }

          positions.push({ pos, rot })
          count++
        }
      }
    }

    return positions
  }, [cylinderDiameter, cylinderLength, paddingMm, w, h, d, orientation, maxCount, scale])

  return (
    <group ref={groupRef}>
      {/* Wireframe box */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#888888" />
      </lineSegments>

      {/* Packed cylinders using instanced mesh (tubes + endcaps) */}
      {cylinderPositions.length > 0 && (
        <PackedCylindersInstanced
          positions={cylinderPositions}
          radius={cylR}
          tubeLength={tubeL}
          endcapThickness={capT}
        />
      )}

      {/* Axis lines */}
      <ColoredAxes size={Math.max(w, h, d) * 0.6} />
    </group>
  )
}

function SingleScene({ showTube, showEndcaps, autoRotate }: { showTube: boolean; showEndcaps: boolean; autoRotate: boolean }) {
  const { results, selectedResultIndex } = useProjectResults()
  
  const selectedResult = selectedResultIndex !== null && results[selectedResultIndex]
    ? results[selectedResultIndex]
    : null

  if (!selectedResult) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3c3c3c" wireframe />
      </mesh>
    )
  }

  return (
    <SingleCylinder
      outerDiameter={selectedResult.diameterMm}
      innerDiameter={selectedResult.innerDiameterMm}
      length={selectedResult.lengthMm}
      wallThickness={selectedResult.wallThicknessMm}
      endcapThickness={selectedResult.endcapThicknessMm}
      showTube={showTube}
      showEndcaps={showEndcaps}
      autoRotate={autoRotate}
    />
  )
}

// Component to detect user interaction with OrbitControls
function ControlsWithInteractionDetection({ onInteraction }: { onInteraction: () => void }) {
  const controlsRef = useRef<any>(null)
  
  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current
      const handleStart = () => onInteraction()
      
      controls.addEventListener('start', handleStart)
      return () => controls.removeEventListener('start', handleStart)
    }
  }, [onInteraction])

  return (
    <OrbitControls 
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={0.5}
      maxDistance={50}
    />
  )
}

interface CylinderViewerProps {
  width?: number
  onWidthChange?: (width: number) => void
}

export function CylinderViewer({ onWidthChange }: CylinderViewerProps) {
  const { results, selectedResultIndex } = useProjectResults()
  const config = useProjectConfig()
  const [showTube, setShowTube] = useState(true)
  const [showEndcaps, setShowEndcaps] = useState(true)
  const [viewMode, setViewMode] = useState<'single' | 'packed'>('single')
  const [autoRotate, setAutoRotate] = useState(true)
  const [isResizing, setIsResizing] = useState(false)
  
  const selectedResult = selectedResultIndex !== null && results[selectedResultIndex]
    ? results[selectedResultIndex]
    : null

  const boxEnabled = config.box?.enabled
  const showPackedOption = boxEnabled && selectedResult && selectedResult.packingCount && selectedResult.packingCount > 0

  // Auto-switch to packed view when box packing is enabled with results
  useEffect(() => {
    if (showPackedOption) {
      setViewMode('packed')
    }
  }, [showPackedOption])

  // Stop auto-rotation when user interacts
  const handleUserInteraction = () => {
    setAutoRotate(false)
  }

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && onWidthChange) {
        const newWidth = window.innerWidth - e.clientX
        onWidthChange(Math.max(200, Math.min(800, newWidth)))
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, onWidthChange])

  // Calculate camera distance based on view mode
  const cameraDistance = useMemo(() => {
    if (viewMode === 'packed' && config.box) {
      const maxDim = Math.max(config.box.widthMm, config.box.heightMm, config.box.depthMm)
      return maxDim * 0.02
    }
    return selectedResult 
      ? Math.max(selectedResult.diameterMm, selectedResult.lengthMm) * 0.015
      : 5
  }, [viewMode, config.box, selectedResult])

  return (
    <div className="h-full bg-vsc-bg-darker relative flex">
      {/* Resize handle */}
      {onWidthChange && (
        <div
          className="w-1 bg-vsc-border hover:bg-vsc-accent cursor-col-resize flex-shrink-0 transition-colors"
          onMouseDown={() => setIsResizing(true)}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        {/* Controls */}
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-vsc-border bg-vsc-bg-dark flex-wrap">
          {/* View mode toggle */}
          {showPackedOption && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === 'single'
                    ? 'bg-vsc-accent text-white'
                    : 'bg-vsc-input text-vsc-fg-dim hover:text-vsc-fg'
                }`}
                title="Single cylinder view"
              >
                <Cylinder size={12} />
              </button>
              <button
                onClick={() => setViewMode('packed')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === 'packed'
                    ? 'bg-vsc-accent text-white'
                    : 'bg-vsc-input text-vsc-fg-dim hover:text-vsc-fg'
                }`}
                title="Packed cylinders view"
              >
                <Box size={12} />
              </button>
            </div>
          )}

          {viewMode === 'single' && (
            <>
              <button
                onClick={() => setShowTube(!showTube)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                  showTube 
                    ? 'bg-vsc-accent/20 text-vsc-info' 
                    : 'bg-vsc-input text-vsc-fg-dim hover:text-vsc-fg'
                }`}
                title={showTube ? 'Hide tube' : 'Show tube'}
              >
                {showTube ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>Tube</span>
              </button>
              <button
                onClick={() => setShowEndcaps(!showEndcaps)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                  showEndcaps 
                    ? 'bg-vsc-success/20 text-vsc-success' 
                    : 'bg-vsc-input text-vsc-fg-dim hover:text-vsc-fg'
                }`}
                title={showEndcaps ? 'Hide endcaps' : 'Show endcaps'}
              >
                {showEndcaps ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>Caps</span>
              </button>
            </>
          )}
        </div>

        {/* 3D Canvas */}
        <div className="flex-1">
          <Canvas>
            <PerspectiveCamera makeDefault position={[cameraDistance, cameraDistance * 0.5, cameraDistance]} />
            <ControlsWithInteractionDetection onInteraction={handleUserInteraction} />
            
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <directionalLight position={[-5, 3, -5]} intensity={0.4} />
            <pointLight position={[0, 10, 0]} intensity={0.3} />
            
            {/* Environment for reflections */}
            <Environment preset="city" />
            
            {/* Grid helper */}
            <gridHelper args={[10, 20, '#3c3c3c', '#2a2a2a']} position={[0, -3, 0]} />
            
            {viewMode === 'packed' && selectedResult && config.box ? (
              <PackedScene
                boxWidth={config.box.widthMm}
                boxHeight={config.box.heightMm}
                boxDepth={config.box.depthMm}
                cylinderDiameter={selectedResult.diameterMm}
                cylinderLength={selectedResult.lengthMm}
                endcapThickness={selectedResult.endcapThicknessMm}
                orientation={selectedResult.packingOrientation || 'z'}
                maxCount={config.box.maxCount || 0}
                autoRotate={autoRotate}
                paddingMm={config.box.paddingMm || 0}
              />
            ) : (
              <SingleScene showTube={showTube} showEndcaps={showEndcaps} autoRotate={autoRotate} />
            )}
          </Canvas>
        </div>

        {/* Overlay info */}
        <div className="absolute bottom-2 left-2 text-xs text-vsc-fg-dim bg-vsc-bg/80 px-2 py-1 rounded">
          Drag to rotate / Scroll to zoom
        </div>

        {selectedResult && (
          <div className="absolute bottom-2 right-2 text-xs font-mono text-vsc-fg-dim bg-vsc-bg/80 px-2 py-1 rounded flex items-center gap-2">
            {viewMode === 'packed' && selectedResult.packingCount ? (
              <>
                <span>
                  {selectedResult.packingCount} × {selectedResult.diameterMm.toFixed(0)}×{selectedResult.lengthMm.toFixed(0)}mm
                </span>
                <span 
                  className="text-base font-bold"
                  style={{ 
                    color: selectedResult.packingOrientation === 'x' ? '#339af0' 
                         : selectedResult.packingOrientation === 'y' ? '#20c997' 
                         : '#b197fc' 
                  }}
                >
                  {selectedResult.packingOrientation?.toUpperCase()}
                </span>
              </>
            ) : (
              `${selectedResult.diameterMm.toFixed(1)} × ${selectedResult.lengthMm.toFixed(1)} mm`
            )}
          </div>
        )}

        {/* Color legend */}
        <div className="absolute top-12 right-2 text-[10px] bg-vsc-bg/80 px-2 py-1 rounded space-y-0.5">
          {viewMode === 'single' ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#4a9eff]"></div>
                <span className="text-vsc-fg-dim">Tube</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#00d4aa]"></div>
                <span className="text-vsc-fg-dim">Endcaps</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#4a9eff]"></div>
                <span className="text-vsc-fg-dim">Tubes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#00d4aa]"></div>
                <span className="text-vsc-fg-dim">Endcaps</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 border border-[#888888]"></div>
                <span className="text-vsc-fg-dim">Box</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
