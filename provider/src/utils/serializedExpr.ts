import { Expr } from 'faunadb'

export interface SerializedExpr {
  raw: Record<string, unknown>
}

export function recursivelyConstructExpr(serialized: SerializedExpr): Expr {
  return new Expr(recur(serialized.raw) as Expr)
}

function recur(serialized: unknown): Expr | unknown {
  if (serialized == null) {
    return serialized
  }

  const serializedNonNull = serialized as any

  if (Array.isArray(serializedNonNull)) {
    return serializedNonNull.map(element => recur(element))
  }

  if (typeof serializedNonNull !== 'object') {
    return serialized
  }

  // If Object

  if (serializedNonNull.hasOwnProperty('raw')) {
    // Has 'raw' property

    const serializedWithRaw = serializedNonNull as SerializedExpr
    try {
      // Recur construction
      return new Expr(recur(serializedWithRaw.raw) as Expr)
    } catch (_) {
      return iterateOverObject(serializedNonNull)
    }
  }

  return iterateOverObject(serializedNonNull)
}

function iterateOverObject(input: Record<string, unknown>) {
  const obj: { [index: string]: unknown } = {}

  for (const [key, value] of Object.entries(input)) {
    obj[key] = recur(value)
  }

  return obj
}
