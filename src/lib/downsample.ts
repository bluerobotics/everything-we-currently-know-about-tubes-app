/**
 * LTTB (Largest Triangle Three Buckets) Downsampling Algorithm
 * 
 * Industry-standard algorithm for downsampling time-series data while
 * preserving visual fidelity. Used by Grafana, InfluxDB, and other
 * enterprise monitoring tools.
 * 
 * Reference: Sveinn Steinarsson's 2013 thesis
 * "Downsampling Time Series for Visual Representation"
 */

export interface DataPoint {
  x: number
  y: number
}

/**
 * Downsample data using the LTTB algorithm.
 * 
 * @param data - Array of {x, y} points (must be sorted by x)
 * @param targetPoints - Desired number of output points
 * @returns Downsampled array of points
 */
export function downsampleLTTB(data: DataPoint[], targetPoints: number): DataPoint[] {
  // Return original if no downsampling needed
  if (targetPoints >= data.length || targetPoints < 3) {
    return data
  }

  const sampled: DataPoint[] = []
  
  // Bucket size (excluding first and last points which are always kept)
  const bucketSize = (data.length - 2) / (targetPoints - 2)
  
  // Always keep the first point
  sampled.push(data[0])
  
  let prevSelectedIndex = 0
  
  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate bucket boundaries
    const bucketStart = Math.floor((i + 0) * bucketSize) + 1
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1
    
    // Calculate average point for the next bucket (used as target)
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1
    const nextBucketEnd = Math.floor((i + 2) * bucketSize) + 1
    const nextBucketEndClamped = Math.min(nextBucketEnd, data.length - 1)
    
    let avgX = 0
    let avgY = 0
    let avgCount = 0
    
    for (let j = nextBucketStart; j < nextBucketEndClamped; j++) {
      avgX += data[j].x
      avgY += data[j].y
      avgCount++
    }
    
    if (avgCount > 0) {
      avgX /= avgCount
      avgY /= avgCount
    } else {
      // Edge case: use last point
      avgX = data[data.length - 1].x
      avgY = data[data.length - 1].y
    }
    
    // Find the point in current bucket that creates largest triangle
    // with the previous selected point and the average of next bucket
    const prevPoint = data[prevSelectedIndex]
    let maxArea = -1
    let selectedIndex = bucketStart
    
    for (let j = bucketStart; j < bucketEnd && j < data.length - 1; j++) {
      const point = data[j]
      
      // Calculate triangle area using cross product
      const area = Math.abs(
        (prevPoint.x - avgX) * (point.y - prevPoint.y) -
        (prevPoint.x - point.x) * (avgY - prevPoint.y)
      )
      
      if (area > maxArea) {
        maxArea = area
        selectedIndex = j
      }
    }
    
    sampled.push(data[selectedIndex])
    prevSelectedIndex = selectedIndex
  }
  
  // Always keep the last point
  sampled.push(data[data.length - 1])
  
  return sampled
}

/**
 * Downsample multiple series efficiently for uPlot format.
 * 
 * uPlot expects data in columnar format: [xValues[], y1Values[], y2Values[], ...]
 * This function downsamples all series together, keeping the same x indices.
 * 
 * @param xValues - Array of x values (time)
 * @param ySeriesArray - Array of y value arrays (one per series)
 * @param targetPoints - Desired number of output points
 * @returns Downsampled data in uPlot format
 */
export function downsampleForUplot(
  xValues: number[],
  ySeriesArray: (number | null)[][],
  targetPoints: number
): [number[], ...(number | null)[][]] {
  console.log('[downsampleForUplot] input - xValues:', xValues.length, 'ySeriesArray:', ySeriesArray.length, 'targetPoints:', targetPoints)
  
  const dataLength = xValues.length
  
  // Return original if no downsampling needed
  if (targetPoints >= dataLength || targetPoints < 3) {
    console.log('[downsampleForUplot] no downsampling needed, returning original')
    return [xValues, ...ySeriesArray]
  }
  
  // Use max absolute value across all series to determine importance
  // This ensures we capture significant points from any series
  const combinedMagnitude = xValues.map((_, i) => {
    let maxMag = 0
    for (const yValues of ySeriesArray) {
      const val = yValues[i]
      if (val !== null && val !== undefined) {
        maxMag = Math.max(maxMag, Math.abs(val))
      }
    }
    return maxMag
  })
  
  // Create combined data points for LTTB
  const combinedData: DataPoint[] = xValues.map((x, i) => ({
    x,
    y: combinedMagnitude[i]
  }))
  
  // Get downsampled indices using LTTB
  const downsampledCombined = downsampleLTTB(combinedData, targetPoints)
  
  // Create a set of selected x values for O(1) lookup
  const selectedXSet = new Set(downsampledCombined.map(p => p.x))
  
  // Filter all arrays to keep only selected indices
  const selectedIndices: number[] = []
  for (let i = 0; i < xValues.length; i++) {
    if (selectedXSet.has(xValues[i])) {
      selectedIndices.push(i)
    }
  }
  
  const newXValues = selectedIndices.map(i => xValues[i])
  const newYSeriesArray = ySeriesArray.map(yValues => 
    selectedIndices.map(i => yValues[i])
  )
  
  return [newXValues, ...newYSeriesArray]
}

/**
 * Calculate optimal target points based on container width.
 * Generally, 2-3 points per pixel is sufficient for smooth appearance.
 * 
 * @param containerWidth - Width of the chart container in pixels
 * @param pointsPerPixel - Points per pixel (default 2)
 * @returns Target number of points
 */
export function calculateTargetPoints(containerWidth: number, pointsPerPixel = 2): number {
  return Math.max(100, Math.floor(containerWidth * pointsPerPixel))
}
