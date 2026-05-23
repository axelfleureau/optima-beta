export class Timestamp {
  seconds: number
  nanoseconds: number

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds
    this.nanoseconds = nanoseconds
  }

  static now() {
    return Timestamp.fromDate(new Date())
  }

  static fromDate(date: Date) {
    const millis = date.getTime()
    return new Timestamp(Math.floor(millis / 1000), (millis % 1000) * 1_000_000)
  }

  toDate() {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000))
  }

  toMillis() {
    return this.toDate().getTime()
  }

  toJSON() {
    return this.toDate().toISOString()
  }
}

type FieldOperation =
  | { __op: "serverTimestamp" }
  | { __op: "arrayUnion"; values: unknown[] }

export const FieldValue = {
  serverTimestamp(): FieldOperation {
    return { __op: "serverTimestamp" }
  },
  arrayUnion(...values: unknown[]): FieldOperation {
    return { __op: "arrayUnion", values }
  },
}

export function isFieldOperation(value: unknown): value is FieldOperation {
  return (
    typeof value === "object" &&
    value !== null &&
    "__op" in value &&
    typeof (value as { __op?: unknown }).__op === "string"
  )
}
