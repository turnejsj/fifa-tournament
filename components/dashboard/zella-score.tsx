"use client"

interface ZellaScoreProps {
  score: number
}

export function ZellaScore({ score }: ZellaScoreProps) {
  const getScoreColor = (value: number) => {
    if (value <= 20) return "bg-red-500"
    if (value <= 40) return "bg-orange-500"
    if (value <= 60) return "bg-yellow-500"
    if (value <= 80) return "bg-lime-500"
    return "bg-green-500"
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        TitanLog Score
      </div>
      <div className="mb-3 text-3xl font-bold text-card-foreground">{score}</div>
      
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 flex w-full">
          <div className="h-full w-1/5 bg-red-500" />
          <div className="h-full w-1/5 bg-orange-500" />
          <div className="h-full w-1/5 bg-yellow-500" />
          <div className="h-full w-1/5 bg-lime-500" />
          <div className="h-full w-1/5 bg-green-500" />
        </div>
        <div
          className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-sm bg-foreground"
          style={{ left: `${score}%` }}
        />
      </div>
      
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span>20</span>
        <span>40</span>
        <span>60</span>
        <span>80</span>
        <span>100</span>
      </div>
    </div>
  )
}
