import * as React from "react"
import { TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface FunnelStep {
  id: string
  label: string
  value: number
  color?: string
  subtext?: string
}

interface FunnelAnalyticsProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  steps: FunnelStep[]
  showDropoff?: boolean
  conversionBadgeText?: string
}

export function FunnelAnalytics({
  title = "Commercial Conversion Funnel",
  description = "Stage-by-stage discovery and conversion performance",
  steps,
  showDropoff = true,
  conversionBadgeText,
  className,
  ...props
}: FunnelAnalyticsProps) {
  const initialValue = steps[0]?.value && steps[0].value > 0 ? steps[0].value : 1
  const finalValue = steps[steps.length - 1]?.value ?? 0
  const netConversionPct = ((finalValue / initialValue) * 100).toFixed(1)

  const processedSteps = steps.map((step, index) => {
    const percentageFromTop = ((step.value / initialValue) * 100).toFixed(1)

    let dropoffRate: string | null = null
    if (index > 0) {
      const prevValue = steps[index - 1].value
      if (prevValue > 0) {
        const diff = ((prevValue - step.value) / prevValue) * 100
        dropoffRate = diff.toFixed(1)
      } else {
        dropoffRate = "0.0"
      }
    }

    const widthPercentage = Math.max((step.value / initialValue) * 100, 4)

    return {
      ...step,
      percentageFromTop,
      dropoffRate,
      widthPercentage,
    }
  })

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 flex flex-col gap-4 text-xs shadow-xs", className)} {...props}>
      {/* Funnel Header */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            {title}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
            {description}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
          {conversionBadgeText ?? `${netConversionPct}% Net CVR`}
        </Badge>
      </div>

      {/* Funnel Steps */}
      <div className="flex flex-col gap-3">
        {processedSteps.map((step, index) => (
          <div key={step.id} className="flex flex-col gap-1">
            {/* Step Label & Value Line */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-muted-foreground">0{index + 1}</span>
                <span>{step.label}</span>
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-muted-foreground">{step.value.toLocaleString()}</span>
                <span className="font-bold text-foreground bg-muted/40 px-1.5 py-0.2 rounded text-[11px]">
                  {step.percentageFromTop}%
                </span>
              </div>
            </div>

            {/* Horizontal Progress Bar */}
            <div className="h-6 w-full rounded-md bg-muted/20 border border-border/50 p-0.5 flex items-center relative overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-xs transition-all duration-500 flex items-center justify-end px-2 text-[10px] font-mono text-white",
                  step.color ?? "bg-primary"
                )}
                style={{ width: `${step.widthPercentage}%` }}
              >
                {Number(step.widthPercentage) > 20 && (
                  <span className="truncate opacity-90">{step.percentageFromTop}%</span>
                )}
              </div>
            </div>

            {/* Step Subtext if present */}
            {step.subtext && (
              <span className="text-[10px] text-muted-foreground">{step.subtext}</span>
            )}

            {/* Drop-off Indicator to Next Step */}
            {showDropoff && index < processedSteps.length - 1 && step.dropoffRate && (
              <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground pt-0.5 pr-1">
                <TrendingDown className="size-2.5 text-rose-400" />
                <span>Drop-off:</span>
                <span className="font-mono text-rose-400 font-medium">-{step.dropoffRate}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
