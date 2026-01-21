import ffmpeg from 'fluent-ffmpeg'
import ffprobeStatic from 'ffprobe-static'

// Configure ffprobe path
ffmpeg.setFfprobePath(ffprobeStatic.path)

export interface MediaMetadata {
  fps: number
  duration: number
  startTc: string
  format: string
}

function parseFrameRate(frameRateStr: string): number {
  if (!frameRateStr) return 0
  const parts = frameRateStr.split('/')
  if (parts.length === 2) {
    const num = parseInt(parts[0], 10)
    const den = parseInt(parts[1], 10)
    if (den !== 0) {
      return num / den
    }
  }
  return parseFloat(frameRateStr) || 0
}

export function analyzeFile(filePath: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('[Forensics] ffprobe error:', err)
        reject(err)
        return
      }

      try {
        // Find video stream for fps
        const videoStream = metadata.streams?.find((s) => s.codec_type === 'video')

        // Extract frame rate from video stream
        let fps = 0
        if (videoStream) {
          // Try avg_frame_rate first, then r_frame_rate
          fps =
            parseFrameRate(videoStream.avg_frame_rate || '') ||
            parseFrameRate(videoStream.r_frame_rate || '')
        }

        // Extract duration
        const duration = parseFloat(metadata.format?.duration || '0')

        // Extract timecode from format tags or video stream tags
        let startTc = '00:00:00:00'
        const formatTags = metadata.format?.tags as Record<string, string> | undefined
        const streamTags = videoStream?.tags as Record<string, string> | undefined

        if (formatTags?.timecode) {
          startTc = formatTags.timecode
        } else if (streamTags?.timecode) {
          startTc = streamTags.timecode
        }

        // Extract format name
        const format = metadata.format?.format_name || 'unknown'

        const result: MediaMetadata = {
          fps: Math.round(fps * 1000) / 1000, // Round to 3 decimal places
          duration,
          startTc,
          format
        }

        console.log(`[Forensics] Analyzed: ${filePath}`, result)
        resolve(result)
      } catch (parseError) {
        console.error('[Forensics] Parse error:', parseError)
        reject(parseError)
      }
    })
  })
}
