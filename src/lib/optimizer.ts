/**
 * Buoyancy Cylinder Optimizer
 * Uses thin/thick wall pressure vessel equations and flat endcap calculations
 */

export interface Material {
  name: string
  density: number          // kg/m3
  yieldStrength: number    // MPa
  elasticModulus: number   // MPa
  poissonsRatio: number    // dimensionless
  safetyFactor: number     // recommended safety factor
}

// Material categories for UI organization
export const MATERIAL_CATEGORIES = {
  'Aluminum': ['Al 6061-T6', 'Al 7075-T6', 'Al 5052-H32', 'Al 2024-T3'],
  'Stainless Steel': ['SS 304', 'SS 316', 'SS 17-4 PH', 'SS 303'],
  'Unfilled Plastics': ['ABS', 'ASA', 'PC', 'PETG', 'PLA', 'POM', 'PP', 'HDPE', 'UHMWPE', 'PEEK', 'PA6', 'PA66', 'PA12'],
  'Glass Filled': ['ABS-GF30', 'PA6-GF30', 'PA66-GF30', 'PC-GF30', 'PBT-GF30', 'PP-GF30', 'PEEK-GF30'],
  'Carbon Filled': ['ABS-CF20', 'PA6-CF20', 'PA12-CF', 'PC-CF20', 'PEEK-CF30']
}

export const MATERIALS: Record<string, Material> = {
  // ===== ALUMINUM ALLOYS =====
  'Al 6061-T6': {
    name: 'Aluminum 6061-T6',
    density: 2700,
    yieldStrength: 276,
    elasticModulus: 68900,
    poissonsRatio: 0.33,
    safetyFactor: 2.0
  },
  'Al 7075-T6': {
    name: 'Aluminum 7075-T6 (Aerospace)',
    density: 2810,
    yieldStrength: 503,
    elasticModulus: 71700,
    poissonsRatio: 0.33,
    safetyFactor: 2.0
  },
  'Al 5052-H32': {
    name: 'Aluminum 5052-H32 (Marine)',
    density: 2680,
    yieldStrength: 193,
    elasticModulus: 70300,
    poissonsRatio: 0.33,
    safetyFactor: 2.0
  },
  'Al 2024-T3': {
    name: 'Aluminum 2024-T3 (Aerospace)',
    density: 2780,
    yieldStrength: 345,
    elasticModulus: 73100,
    poissonsRatio: 0.33,
    safetyFactor: 2.0
  },

  // ===== STAINLESS STEELS =====
  'SS 304': {
    name: 'Stainless Steel 304',
    density: 8000,
    yieldStrength: 215,
    elasticModulus: 193000,
    poissonsRatio: 0.29,
    safetyFactor: 2.0
  },
  'SS 316': {
    name: 'Stainless Steel 316 (Marine)',
    density: 8000,
    yieldStrength: 290,
    elasticModulus: 193000,
    poissonsRatio: 0.29,
    safetyFactor: 2.0
  },
  'SS 17-4 PH': {
    name: 'Stainless Steel 17-4 PH',
    density: 7750,
    yieldStrength: 1170,
    elasticModulus: 197000,
    poissonsRatio: 0.27,
    safetyFactor: 2.0
  },
  'SS 303': {
    name: 'Stainless Steel 303 (Free Machining)',
    density: 8000,
    yieldStrength: 240,
    elasticModulus: 193000,
    poissonsRatio: 0.29,
    safetyFactor: 2.0
  },

  // ===== UNFILLED PLASTICS =====
  'ABS': {
    name: 'ABS',
    density: 1050,
    yieldStrength: 40,
    elasticModulus: 2300,
    poissonsRatio: 0.35,
    safetyFactor: 3.0
  },
  'ASA': {
    name: 'ASA (UV Resistant)',
    density: 1070,
    yieldStrength: 45,
    elasticModulus: 2400,
    poissonsRatio: 0.35,
    safetyFactor: 3.0
  },
  'PC': {
    name: 'Polycarbonate',
    density: 1200,
    yieldStrength: 62,
    elasticModulus: 2400,
    poissonsRatio: 0.37,
    safetyFactor: 2.5
  },
  'PETG': {
    name: 'PETG',
    density: 1270,
    yieldStrength: 50,
    elasticModulus: 2100,
    poissonsRatio: 0.38,
    safetyFactor: 3.0
  },
  'PLA': {
    name: 'PLA',
    density: 1240,
    yieldStrength: 60,
    elasticModulus: 3500,
    poissonsRatio: 0.36,
    safetyFactor: 3.0
  },
  'POM': {
    name: 'POM / Delrin / Acetal',
    density: 1410,
    yieldStrength: 65,
    elasticModulus: 2900,
    poissonsRatio: 0.35,
    safetyFactor: 2.5
  },
  'PP': {
    name: 'Polypropylene',
    density: 905,
    yieldStrength: 32,
    elasticModulus: 1500,
    poissonsRatio: 0.42,
    safetyFactor: 3.0
  },
  'HDPE': {
    name: 'HDPE (High Density PE)',
    density: 950,
    yieldStrength: 26,
    elasticModulus: 1100,
    poissonsRatio: 0.42,
    safetyFactor: 3.0
  },
  'UHMWPE': {
    name: 'UHMWPE',
    density: 930,
    yieldStrength: 22,
    elasticModulus: 800,
    poissonsRatio: 0.46,
    safetyFactor: 3.0
  },
  'PEEK': {
    name: 'PEEK',
    density: 1300,
    yieldStrength: 100,
    elasticModulus: 3600,
    poissonsRatio: 0.38,
    safetyFactor: 2.0
  },

  // ===== NYLONS =====
  'PA6': {
    name: 'Nylon PA6',
    density: 1140,
    yieldStrength: 75,
    elasticModulus: 2800,
    poissonsRatio: 0.40,
    safetyFactor: 2.5
  },
  'PA66': {
    name: 'Nylon PA66',
    density: 1140,
    yieldStrength: 82,
    elasticModulus: 3000,
    poissonsRatio: 0.40,
    safetyFactor: 2.5
  },
  'PA12': {
    name: 'Nylon PA12',
    density: 1020,
    yieldStrength: 50,
    elasticModulus: 1600,
    poissonsRatio: 0.40,
    safetyFactor: 2.5
  },

  // ===== GLASS FIBER FILLED (GF30 = 30% glass) =====
  'ABS-GF30': {
    name: 'ABS + 30% Glass Fiber',
    density: 1350,
    yieldStrength: 90,
    elasticModulus: 7500,
    poissonsRatio: 0.35,
    safetyFactor: 2.5
  },
  'PA6-GF30': {
    name: 'Nylon PA6 + 30% Glass Fiber',
    density: 1350,
    yieldStrength: 185,
    elasticModulus: 9500,
    poissonsRatio: 0.38,
    safetyFactor: 2.0
  },
  'PA66-GF30': {
    name: 'Nylon PA66 + 30% Glass Fiber',
    density: 1370,
    yieldStrength: 195,
    elasticModulus: 10000,
    poissonsRatio: 0.38,
    safetyFactor: 2.0
  },
  'PC-GF30': {
    name: 'Polycarbonate + 30% Glass Fiber',
    density: 1430,
    yieldStrength: 110,
    elasticModulus: 7000,
    poissonsRatio: 0.36,
    safetyFactor: 2.0
  },
  'PBT-GF30': {
    name: 'PBT + 30% Glass Fiber',
    density: 1520,
    yieldStrength: 130,
    elasticModulus: 9500,
    poissonsRatio: 0.38,
    safetyFactor: 2.0
  },
  'PP-GF30': {
    name: 'Polypropylene + 30% Glass Fiber',
    density: 1130,
    yieldStrength: 70,
    elasticModulus: 5500,
    poissonsRatio: 0.40,
    safetyFactor: 2.5
  },
  'PEEK-GF30': {
    name: 'PEEK + 30% Glass Fiber',
    density: 1510,
    yieldStrength: 160,
    elasticModulus: 11000,
    poissonsRatio: 0.38,
    safetyFactor: 2.0
  },

  // ===== CARBON FIBER FILLED =====
  'ABS-CF20': {
    name: 'ABS + 20% Carbon Fiber',
    density: 1150,
    yieldStrength: 75,
    elasticModulus: 12000,
    poissonsRatio: 0.35,
    safetyFactor: 2.5
  },
  'PA6-CF20': {
    name: 'Nylon PA6 + 20% Carbon Fiber',
    density: 1200,
    yieldStrength: 170,
    elasticModulus: 17000,
    poissonsRatio: 0.38,
    safetyFactor: 2.0
  },
  'PA12-CF': {
    name: 'Nylon PA12 + Carbon Fiber',
    density: 1100,
    yieldStrength: 85,
    elasticModulus: 8500,
    poissonsRatio: 0.38,
    safetyFactor: 2.0
  },
  'PC-CF20': {
    name: 'Polycarbonate + 20% Carbon Fiber',
    density: 1280,
    yieldStrength: 100,
    elasticModulus: 14000,
    poissonsRatio: 0.36,
    safetyFactor: 2.0
  },
  'PEEK-CF30': {
    name: 'PEEK + 30% Carbon Fiber',
    density: 1400,
    yieldStrength: 230,
    elasticModulus: 24000,
    poissonsRatio: 0.38,
    safetyFactor: 2.0
  }
}

export interface OptimizationResult {
  rank: number
  materialKey: string  // Key in MATERIALS object
  materialName: string // Display name
  diameterMm: number
  lengthMm: number
  wallThicknessMm: number
  endcapThicknessMm: number
  wallMethod: 'stress' | 'buckling' | 'forced'
  innerDiameterMm: number
  innerLengthMm: number
  outerVolumeL: number
  innerVolumeL: number
  materialVolumeL: number
  massKg: number
  displacedWaterKg: number
  netBuoyancyKg: number
  netBuoyancyN: number
  buoyancyRatio: number
  // Failure analysis (optional for backwards compatibility with cached results)
  failureDepthM?: number        // Depth at which failure occurs
  failurePressureMpa?: number   // Pressure at which failure occurs
  failureMode?: 'wall-stress' | 'wall-buckling' | 'endcap-stress' | 'endcap-buckling'
  actualSafetyFactor?: number   // Actual safety factor at operating pressure
  // Packing info (calculated separately if box dimensions provided)
  packingCount?: number
  packingOrientation?: 'x' | 'y' | 'z'
  packingLayers?: number
  packingCirclesPerLayer?: number
  totalBuoyancyKg?: number
  totalMassKg?: number
}

export interface BoxDimensions {
  widthMm: number   // X dimension
  heightMm: number  // Y dimension  
  depthMm: number   // Z dimension
  enabled: boolean
  maxCount: number  // Maximum number of cylinders (0 = unlimited)
  orientation: 'all' | 'x' | 'y' | 'z'  // Cylinder length axis ('all' = try all orientations)
  // Forced cylinder dimensions (for custom packing calculation)
  forcedDiameterMm?: number
  forcedLengthMm?: number
  // Radial padding around each cylinder (creates air gap between cylinders)
  paddingMm: number
}

export interface PackingResult {
  count: number
  orientation: 'x' | 'y' | 'z'
  layersAlongAxis: number
  circlesPerLayer: number
}

export type EndcapConstraint = 'fixed' | 'floating'

export interface OptimizationParams {
  pressureMpa: number
  material: Material
  materialKey: string  // Key in MATERIALS, or 'ALL' for selected materials
  selectedMaterials?: string[]  // List of material keys to compare when materialKey is 'ALL'
  safetyFactor: number
  minDiameterMm: number
  maxDiameterMm: number
  minLengthMm: number
  maxLengthMm: number
  diameterStepMm: number
  lengthStepMm: number
  waterDensity: number
  box?: BoxDimensions
  // Forced thickness overrides
  forcedWallThicknessMm?: number
  forcedEndcapThicknessMm?: number
  endcapConstraint?: EndcapConstraint
}

const GRAVITY = 9.81
const HEX_ROW_SPACING = Math.sqrt(3) / 2  // ~0.866 - ratio of vertical spacing to diameter

export function depthToPressure(depthM: number, waterDensity: number = 1025): number {
  return (waterDensity * GRAVITY * depthM) / 1e6
}

/**
 * Calculate hex packing for a single orientation
 */
function calculateHexPackingForOrientation(
  cylinderDiameterMm: number,
  cylinderLengthMm: number,
  packingWidth: number,  // Width of packing plane
  packingHeight: number, // Height of packing plane
  axisLength: number     // Length along cylinder axis
): { count: number; layers: number; circlesPerLayer: number } {
  if (cylinderDiameterMm <= 0 || cylinderLengthMm <= 0) return { count: 0, layers: 0, circlesPerLayer: 0 }
  if (packingWidth <= 0 || packingHeight <= 0 || axisLength <= 0) return { count: 0, layers: 0, circlesPerLayer: 0 }
  
  const d = cylinderDiameterMm
  const r = d / 2
  
  // How many cylinder layers fit along the axis?
  const layers = Math.floor(axisLength / cylinderLengthMm)
  if (layers === 0) return { count: 0, layers: 0, circlesPerLayer: 0 }
  
  // Hex packing in the packing plane
  const rowSpacing = d * HEX_ROW_SPACING
  
  const circlesPerRow = Math.floor((packingWidth - d) / d) + 1
  if (circlesPerRow <= 0) return { count: 0, layers: 0, circlesPerLayer: 0 }
  
  const numRows = 1 + Math.floor((packingHeight - d) / rowSpacing)
  if (numRows <= 0) return { count: 0, layers: 0, circlesPerLayer: 0 }
  
  let circlesPerLayer = 0
  
  for (let row = 0; row < numRows; row++) {
    const isOddRow = row % 2 === 1
    if (isOddRow) {
      const availableWidth = packingWidth - r
      circlesPerLayer += Math.max(0, Math.floor(availableWidth / d))
    } else {
      circlesPerLayer += circlesPerRow
    }
  }
  
  return { count: circlesPerLayer * layers, layers, circlesPerLayer }
}

/**
 * Calculate how many cylinders can fit in a box using hexagonal circle packing
 * For a specific orientation only
 */
export function calculateHexPackingForAxis(
  cylinderDiameterMm: number,
  cylinderLengthMm: number,
  boxWidthMm: number,
  boxHeightMm: number,
  boxDepthMm: number,
  orientation: 'x' | 'y' | 'z',
  maxCount: number = 0,
  paddingMm: number = 0
): PackingResult {
  // Use padded diameter for packing calculations (creates air gap between cylinders)
  const packingDiameter = cylinderDiameterMm + 2 * paddingMm
  
  let result: ReturnType<typeof calculateHexPackingForOrientation>
  
  switch (orientation) {
    case 'x':
      // X orientation: cylinders along X axis, pack in YZ plane
      result = calculateHexPackingForOrientation(packingDiameter, cylinderLengthMm, boxHeightMm, boxDepthMm, boxWidthMm)
      break
    case 'y':
      // Y orientation: cylinders along Y axis, pack in XZ plane
      result = calculateHexPackingForOrientation(packingDiameter, cylinderLengthMm, boxWidthMm, boxDepthMm, boxHeightMm)
      break
    case 'z':
      // Z orientation: cylinders along Z axis, pack in XY plane
      result = calculateHexPackingForOrientation(packingDiameter, cylinderLengthMm, boxWidthMm, boxHeightMm, boxDepthMm)
      break
  }
  
  let count = result.count
  if (maxCount > 0 && count > maxCount) {
    count = maxCount
  }
  
  return {
    count,
    orientation,
    layersAlongAxis: result.layers,
    circlesPerLayer: result.circlesPerLayer
  }
}

/**
 * Calculate how many cylinders can fit in a box using hexagonal circle packing
 * If 'all' is selected, returns all orientations; otherwise returns just the specified one
 */
export function calculateHexPacking(
  cylinderDiameterMm: number,
  cylinderLengthMm: number,
  boxWidthMm: number,
  boxHeightMm: number,
  boxDepthMm: number,
  orientation: 'all' | 'x' | 'y' | 'z' = 'all',
  maxCount: number = 0,
  paddingMm: number = 0
): PackingResult[] {
  const orientations: ('x' | 'y' | 'z')[] = orientation === 'all' ? ['x', 'y', 'z'] : [orientation]
  
  return orientations.map(o => calculateHexPackingForAxis(
    cylinderDiameterMm,
    cylinderLengthMm,
    boxWidthMm,
    boxHeightMm,
    boxDepthMm,
    o,
    maxCount,
    paddingMm
  ))
}

export function pressureToDepth(pressureMpa: number, waterDensity: number = 1025): number {
  return (pressureMpa * 1e6) / (waterDensity * GRAVITY)
}

/**
 * Calculate minimum wall thickness for external pressure
 * Uses both stress-based and buckling-based calculations
 */
function calcWallThickness(
  pressureMpa: number,
  outerDiameterMm: number,
  lengthMm: number,
  material: Material,
  safetyFactor: number
): { thickness: number; method: 'stress' | 'buckling' } {
  if (pressureMpa <= 0) {
    return { thickness: 0.5, method: 'stress' }
  }

  const P = pressureMpa
  const D = outerDiameterMm
  const L = lengthMm
  const E = material.elasticModulus
  const nu = material.poissonsRatio
  const sigmaAllow = material.yieldStrength / safetyFactor

  const Ro = D / 2

  // Method 1: Stress-based (thick wall Lame equations)
  let tStress = 0.5
  for (let i = 0; i < 200; i++) {
    const Ri = Ro - tStress
    if (Ri <= 0) {
      tStress = Ro * 0.9
      break
    }
    const sigmaHoop = P * (Ro ** 2 + Ri ** 2) / (Ro ** 2 - Ri ** 2)
    if (sigmaHoop <= sigmaAllow) {
      break
    }
    tStress += 0.25
  }

  // Method 2: Buckling-based (Von Mises for external pressure)
  // For short cylinders (L/D < 5), they're more resistant to buckling
  // The correction factor reduces required thickness, but since t appears cubed in P formula,
  // we apply the factor inside the cube root
  const lengthRatio = L / D
  let lengthFactor = 1.0
  if (lengthRatio < 5) {
    lengthFactor = Math.max(0.7, Math.sqrt(lengthRatio / 5))
  }
  
  // Include lengthFactor in the cube root so P_fail = P * SF correctly
  const tBuckle = D * Math.pow((P * (1 - nu ** 2) * safetyFactor * lengthFactor) / (2 * E), 1 / 3)

  if (tBuckle > tStress) {
    return { thickness: tBuckle, method: 'buckling' }
  }
  return { thickness: tStress, method: 'stress' }
}

/**
 * Calculate minimum thickness for flat circular endcap
 * @param constraint - 'fixed' (clamped edges) or 'floating' (simply supported)
 */
function calcEndcapThickness(
  pressureMpa: number,
  innerDiameterMm: number,
  material: Material,
  safetyFactor: number,
  constraint: EndcapConstraint = 'fixed'
): number {
  if (pressureMpa <= 0) {
    return 1.0
  }

  const P = pressureMpa
  const R = innerDiameterMm / 2
  const sigmaAllow = material.yieldStrength / safetyFactor
  const E = material.elasticModulus

  // Stress-based calculation depends on constraint type
  // Fixed (clamped): edges cannot rotate - lower stress coefficient
  // Floating (simply supported): edges can rotate - higher stress coefficient
  let tRequired: number
  if (constraint === 'fixed') {
    // Clamped circular plate: σ = (3/4) * P * R² / t²
    tRequired = Math.sqrt((3 * P * R ** 2) / (4 * sigmaAllow))
  } else {
    // Simply supported circular plate: σ = (3/8) * (3 + ν) * P * R² / t²
    // For most materials ν ≈ 0.3-0.4, so (3 + ν) ≈ 3.3-3.4
    // This gives approximately 1.5x higher stress than clamped
    const nu = material.poissonsRatio
    tRequired = Math.sqrt((3 * (3 + nu) * P * R ** 2) / (8 * sigmaAllow))
  }

  // Buckling-based (applies to both constraints, slightly different coefficients)
  const bucklingCoeff = constraint === 'fixed' ? 4.2 : 3.6
  const tBuckle = R * Math.pow((P * safetyFactor) / (bucklingCoeff * E), 1 / 3)

  return Math.max(tRequired, tBuckle, 1.0)
}

/**
 * Calculate buoyancy parameters
 */
function calcBuoyancy(
  outerDiameterMm: number,
  lengthMm: number,
  wallThicknessMm: number,
  endcapThicknessMm: number,
  material: Material,
  waterDensity: number
): {
  outerVolumeL: number
  innerVolumeL: number
  materialVolumeL: number
  massKg: number
  displacedWaterKg: number
  netBuoyancyKg: number
  netBuoyancyN: number
  buoyancyRatio: number
} {
  // Convert to meters
  const Do = outerDiameterMm / 1000
  const Di = (outerDiameterMm - 2 * wallThicknessMm) / 1000
  const L = lengthMm / 1000
  const tEnd = endcapThicknessMm / 1000

  // Volumes in m3
  const vOuter = Math.PI * (Do / 2) ** 2 * L
  const vWall = Math.PI * ((Do / 2) ** 2 - (Di / 2) ** 2) * (L - 2 * tEnd)
  const vEndcaps = 2 * Math.PI * (Di / 2) ** 2 * tEnd
  const vMaterial = vWall + vEndcaps
  const vInner = Math.PI * (Di / 2) ** 2 * (L - 2 * tEnd)

  // Mass calculations
  const massMaterial = vMaterial * material.density
  const massWaterDisplaced = vOuter * waterDensity

  const netBuoyancyKg = massWaterDisplaced - massMaterial
  const netBuoyancyN = netBuoyancyKg * GRAVITY

  return {
    outerVolumeL: vOuter * 1000,
    innerVolumeL: vInner * 1000,
    materialVolumeL: vMaterial * 1000,
    massKg: massMaterial,
    displacedWaterKg: massWaterDisplaced,
    netBuoyancyKg,
    netBuoyancyN,
    buoyancyRatio: massMaterial > 0 ? massWaterDisplaced / massMaterial : 0
  }
}

/**
 * Calculate failure pressure and mode for a cylinder
 * Returns the lowest failure pressure and its mode
 */
function calcFailure(
  outerDiameterMm: number,
  lengthMm: number,
  wallThicknessMm: number,
  endcapThicknessMm: number,
  innerDiameterMm: number,
  material: Material,
  endcapConstraint: EndcapConstraint = 'fixed'
): {
  failurePressureMpa: number
  failureMode: 'wall-stress' | 'wall-buckling' | 'endcap-stress' | 'endcap-buckling'
} {
  const D = outerDiameterMm
  const L = lengthMm
  const t = wallThicknessMm
  const tEnd = endcapThicknessMm
  const Di = innerDiameterMm
  const E = material.elasticModulus
  const nu = material.poissonsRatio
  const sigmaY = material.yieldStrength

  const Ro = D / 2
  const Ri = Di / 2

  // Wall stress failure (thick wall Lame equation, solved for P)
  // σ = P * (Ro² + Ri²) / (Ro² - Ri²)
  // P = σ * (Ro² - Ri²) / (Ro² + Ri²)
  const pWallStress = sigmaY * (Ro ** 2 - Ri ** 2) / (Ro ** 2 + Ri ** 2)

  // Wall buckling failure (Von Mises for external pressure)
  // Base formula: P = 2 * E * (t/D)³ / (1 - ν²)
  // Short cylinders are stronger - divide by lengthFactor to get higher failure pressure
  const lengthRatio = L / D
  let lengthFactor = 1.0
  if (lengthRatio < 5) {
    lengthFactor = Math.max(0.7, Math.sqrt(lengthRatio / 5))
  }
  const pWallBuckle = 2 * E * Math.pow(t / D, 3) / (1 - nu ** 2) / lengthFactor

  // Endcap stress failure
  // For fixed: σ = (3/4) * P * R² / t²  =>  P = (4/3) * σ * t² / R²
  // For floating: σ = (3/8) * (3+ν) * P * R² / t²  =>  P = (8/3) * σ * t² / ((3+ν) * R²)
  let pEndcapStress: number
  if (endcapConstraint === 'fixed') {
    pEndcapStress = (4 / 3) * sigmaY * tEnd ** 2 / Ri ** 2
  } else {
    pEndcapStress = (8 / 3) * sigmaY * tEnd ** 2 / ((3 + nu) * Ri ** 2)
  }

  // Endcap buckling failure
  // t = R * (P / (k * E))^(1/3)  =>  P = k * E * (t/R)³
  const bucklingCoeff = endcapConstraint === 'fixed' ? 4.2 : 3.6
  const pEndcapBuckle = bucklingCoeff * E * Math.pow(tEnd / Ri, 3)

  // Find minimum failure pressure and mode
  const failures: { pressure: number; mode: 'wall-stress' | 'wall-buckling' | 'endcap-stress' | 'endcap-buckling' }[] = [
    { pressure: pWallStress, mode: 'wall-stress' },
    { pressure: pWallBuckle, mode: 'wall-buckling' },
    { pressure: pEndcapStress, mode: 'endcap-stress' },
    { pressure: pEndcapBuckle, mode: 'endcap-buckling' }
  ]

  const minFailure = failures.reduce((min, f) => f.pressure < min.pressure ? f : min)

  return {
    failurePressureMpa: minFailure.pressure,
    failureMode: minFailure.mode
  }
}

/**
 * Optimize for a single material
 */
function optimizeForMaterial(
  params: Omit<OptimizationParams, 'materialKey'>,
  materialKey: string,
  material: Material
): OptimizationResult[] {
  const results: OptimizationResult[] = []
  
  // Use forced dimensions if specified, otherwise use the range
  const forcedDiameter = params.box?.forcedDiameterMm
  const forcedLength = params.box?.forcedLengthMm
  
  const minD = forcedDiameter ?? params.minDiameterMm
  const maxD = forcedDiameter ?? params.maxDiameterMm
  const minL = forcedLength ?? params.minLengthMm
  const maxL = forcedLength ?? params.maxLengthMm
  
  let d = minD
  while (d <= maxD) {
    let L = minL
    while (L <= maxL) {
      // Calculate or use forced wall thickness
      let wallT: number
      let method: 'stress' | 'buckling' | 'forced'
      
      if (params.forcedWallThicknessMm !== undefined) {
        wallT = params.forcedWallThicknessMm
        method = 'forced'
      } else {
        const calc = calcWallThickness(
          params.pressureMpa,
          d,
          L,
          material,
          params.safetyFactor
        )
        wallT = calc.thickness
        method = calc.method
      }

      // Check feasibility
      const innerD = d - 2 * wallT
      if (innerD < 5) {
        L += params.lengthStepMm
        continue
      }

      // Calculate or use forced endcap thickness
      let endcapT: number
      if (params.forcedEndcapThicknessMm !== undefined) {
        endcapT = params.forcedEndcapThicknessMm
      } else {
        endcapT = calcEndcapThickness(
          params.pressureMpa, 
          innerD, 
          material, 
          params.safetyFactor,
          params.endcapConstraint || 'fixed'
        )
      }

      // Check if endcaps fit
      if (2 * endcapT >= L * 0.8) {
        L += params.lengthStepMm
        continue
      }

      // Calculate buoyancy
      const buoyancy = calcBuoyancy(d, L, wallT, endcapT, material, params.waterDensity)

      // Calculate failure analysis
      const failure = calcFailure(d, L, wallT, endcapT, innerD, material, params.endcapConstraint || 'fixed')
      const failureDepthM = pressureToDepth(failure.failurePressureMpa, params.waterDensity)
      const actualSafetyFactor = params.pressureMpa > 0 ? failure.failurePressureMpa / params.pressureMpa : Infinity

      if (buoyancy.netBuoyancyKg > 0) {
        // Calculate packing if box dimensions provided
        if (params.box?.enabled) {
          // Get packing for all requested orientations
          const packingResults = calculateHexPacking(
            d, L,
            params.box.widthMm,
            params.box.heightMm,
            params.box.depthMm,
            params.box.orientation || 'all',
            0,  // No cap - get the true count first
            params.box.paddingMm || 0
          )
          
          const maxCount = params.box.maxCount || 0
          
          // Create a result for each orientation
          for (const packing of packingResults) {
            // If maxCount is set and uncapped count exceeds it, skip this result
            if (maxCount > 0 && packing.count > maxCount) {
              continue
            }
            
            const count = packing.count
            
            const result: OptimizationResult = {
              rank: 0,
              materialKey,
              materialName: material.name,
              diameterMm: d,
              lengthMm: L,
              wallThicknessMm: wallT,
              endcapThicknessMm: endcapT,
              wallMethod: method,
              innerDiameterMm: innerD,
              innerLengthMm: L - 2 * endcapT,
              ...buoyancy,
              failureDepthM,
              failurePressureMpa: failure.failurePressureMpa,
              failureMode: failure.failureMode,
              actualSafetyFactor,
              packingCount: count,
              packingOrientation: packing.orientation,
              packingLayers: packing.layersAlongAxis,
              packingCirclesPerLayer: packing.circlesPerLayer,
              totalBuoyancyKg: count * buoyancy.netBuoyancyKg,
              totalMassKg: count * buoyancy.massKg
            }
            
            results.push(result)
          }
        } else {
          // No box packing - just add the result
          const result: OptimizationResult = {
            rank: 0,
            materialKey,
            materialName: material.name,
            diameterMm: d,
            lengthMm: L,
            wallThicknessMm: wallT,
            endcapThicknessMm: endcapT,
            wallMethod: method,
            innerDiameterMm: innerD,
            innerLengthMm: L - 2 * endcapT,
            ...buoyancy,
            failureDepthM,
            failurePressureMpa: failure.failurePressureMpa,
            failureMode: failure.failureMode,
            actualSafetyFactor
          }
          results.push(result)
        }
      }

      L += params.lengthStepMm
    }
    d += params.diameterStepMm
  }
  
  return results
}

/**
 * Run optimization to find best cylinder dimensions
 * If materialKey is 'ALL', optimizes across all materials
 */
export function optimize(params: OptimizationParams): OptimizationResult[] {
  let allResults: OptimizationResult[] = []
  
  if (params.materialKey === 'ALL') {
    // Optimize across selected materials (or all if none specified)
    const materialsToCompare = params.selectedMaterials && params.selectedMaterials.length > 0
      ? params.selectedMaterials
      : Object.keys(MATERIALS)
    
    for (const key of materialsToCompare) {
      const material = MATERIALS[key]
      if (material) {
        const materialResults = optimizeForMaterial(params, key, material)
        allResults = allResults.concat(materialResults)
      }
    }
  } else {
    // Optimize for single material
    allResults = optimizeForMaterial(params, params.materialKey, params.material)
  }

  // Sort by total buoyancy if packing enabled, otherwise by single cylinder buoyancy
  if (params.box?.enabled) {
    allResults.sort((a, b) => (b.totalBuoyancyKg || 0) - (a.totalBuoyancyKg || 0))
  } else {
    allResults.sort((a, b) => b.netBuoyancyKg - a.netBuoyancyKg)
  }
  
  // Assign ranks and limit results
  allResults.forEach((r, i) => { r.rank = i + 1 })

  return allResults.slice(0, 1000)  // Limit to 1000 results for performance
}

