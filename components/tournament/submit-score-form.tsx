"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, ScanLine } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { parseScoreboardForForm } from "@/lib/parse-scoreline-from-ocr"

type TeamOption = { id: string; name: string }

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-[#090909] px-3 text-sm"

export function SubmitScoreForm({
  teams,
  playerTeamName,
}: {
  teams: TeamOption[]
  playerTeamName: string | null
}) {
  const [homeTeam, setHomeTeam] = useState("")
  const [awayTeam, setAwayTeam] = useState("")
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [scanOpen, setScanOpen] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setScanError(null)
    setCameraReady(false)

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("Camera access is not supported on this device.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch {
      setScanError("Could not access the camera. Allow camera permission and try again.")
    }
  }, [])

  useEffect(() => {
    if (!scanOpen) {
      stopCamera()
      setProcessing(false)
      setScanError(null)
      return
    }

    void startCamera()
    return () => stopCamera()
  }, [scanOpen, startCamera, stopCamera])

  const captureAndRecognize = useCallback(async () => {
    const video = videoRef.current
    if (!video || !cameraReady || video.videoWidth === 0) {
      setScanError("Camera is not ready yet. Hold steady and try again.")
      return
    }

    setProcessing(true)
    setScanError(null)

    try {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not capture image")

      ctx.drawImage(video, 0, 0)
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92)

      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker("eng")
      try {
        const { data } = await worker.recognize(imageDataUrl)
        const filled = parseScoreboardForForm(data.text, teams, playerTeamName)

        if (!filled) {
          setScanError(
            "Could not read the scoreboard bar (TEAM 2 - 1 TEAM). Frame the top scoreline and try again.",
          )
          return
        }

        setHomeTeam(filled.homeTeamId)
        setAwayTeam(filled.awayTeamId)
        setHomeScore(String(filled.homeScore))
        setAwayScore(String(filled.awayScore))
        setScanOpen(false)

        const homeName = teams.find((t) => t.id === filled.homeTeamId)?.name ?? "Home"
        const awayName = teams.find((t) => t.id === filled.awayTeamId)?.name ?? "Away"
        toast.success(`${homeName} ${filled.homeScore} – ${filled.awayScore} ${awayName}`, {
          description: "Double-check teams and scores, then submit.",
        })
      } finally {
        await worker.terminate()
      }
    } catch {
      setScanError("Scan failed. Try again or enter scores manually.")
    } finally {
      setProcessing(false)
    }
  }, [cameraReady, teams, playerTeamName])

  return (
    <form action="/api/matches/submit" method="post" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="homeTeam">Home Team</Label>
          <select
            id="homeTeam"
            name="homeTeam"
            className={SELECT_CLASS}
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            required
          >
            <option value="">Select team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="awayTeam">Away Team</Label>
          <select
            id="awayTeam"
            name="awayTeam"
            className={SELECT_CLASS}
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            required
          >
            <option value="">Select team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">Scores</p>
          <Button
            type="button"
            variant="outline"
            className="w-full border-[#00F081]/40 text-[#00F081] hover:bg-[#00F081]/10 hover:text-[#00F081] sm:w-auto"
            onClick={() => setScanOpen(true)}
          >
            <ScanLine className="size-4" />
            Scan TV Screen
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="homeScore">Home Score</Label>
            <Input
              id="homeScore"
              type="number"
              min={0}
              name="homeScore"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awayScore">Away Score</Label>
            <Input
              id="awayScore"
              type="number"
              min={0}
              name="awayScore"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full bg-[#00F081] text-black hover:bg-[#00d874]">
        Submit result
      </Button>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="border-border bg-[#0a0a0a] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5 text-[#00F081]" />
              Scan TV Screen
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Frame the top scoreboard bar (e.g. MANCHESTER CITY 2 - 1 LIVERPOOL). Teams and scores
              will fill in automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="size-full object-cover"
            />
            {!cameraReady && !scanError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <Spinner className="size-8 text-[#00F081]" />
              </div>
            )}
            {cameraReady && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-1/3 bottom-0 bg-black/45" />
                <div className="absolute inset-x-3 top-0 h-1/3 border border-[#00F081]">
                  <p className="absolute inset-x-2 bottom-2 text-center text-xs font-medium tracking-wide text-[#00F081] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    Align the scoreboard here
                  </p>
                </div>
              </div>
            )}
          </div>

          {scanError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {scanError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScanOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#00F081] text-black hover:bg-[#00d874]"
              onClick={() => void captureAndRecognize()}
              disabled={!cameraReady || processing}
            >
              {processing ? (
                <>
                  <Spinner />
                  Reading score…
                </>
              ) : (
                "Capture & read score"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
