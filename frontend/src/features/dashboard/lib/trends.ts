import { formatDate } from '../../../lib/dates'
import type {
  ComplaintTrends as Trends,
  TrendBucket,
  TrendGranularity,
} from '../../../types/dashboard'

/** Shared by the Trends view and the Dashboard printout, so both name periods and clusters alike. */

export function bucketName(bucket: TrendBucket, granularity: TrendGranularity): string {
  if (granularity === 'hour') return bucket.label
  if (granularity === 'day') return formatDate(bucket.from)
  if (granularity === 'week') return `Week of ${formatDate(bucket.from)}`
  if (granularity === 'year') return formatDate(bucket.from, { year: 'numeric' })
  return formatDate(bucket.from, { month: 'long', year: 'numeric' })
}

export interface ClusterNote {
  complaint: string
  bucketIndex: number
  count: number
}

export function findClusters(trends: Trends): ClusterNote[] {
  return [...trends.series, ...trends.otherComplaints].flatMap((s) =>
    s.clusterBuckets.map((i) => ({ complaint: s.complaint, bucketIndex: i, count: s.counts[i] })),
  )
}

/** Visits plus incidents per bucket, summed across every complaint. */
export function bucketTotals(trends: Trends): number[] {
  const all = [...trends.series, ...trends.otherComplaints]
  return trends.buckets.map((_, i) => all.reduce((sum, s) => sum + s.counts[i], 0))
}
