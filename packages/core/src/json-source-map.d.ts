/**
 * Types for `json-source-map`, which ships none.
 *
 * Declared narrowly — only the surface core actually uses — so that an upstream
 * change we depend on fails to compile rather than silently becoming `any`.
 *
 * Line and column are ZERO-based here. Everything downstream is one-based, and
 * `parse.ts` is the single place that conversion happens.
 */
declare module 'json-source-map' {
  export interface JsonMapLocation {
    line: number;
    column: number;
    pos: number;
  }

  export interface JsonMapPointer {
    key?: JsonMapLocation;
    keyEnd?: JsonMapLocation;
    value?: JsonMapLocation;
    valueEnd?: JsonMapLocation;
  }

  export interface JsonMapParseResult {
    data: unknown;
    pointers: Record<string, JsonMapPointer>;
  }

  /** Throws a SyntaxError on malformed input. */
  export function parse(text: string): JsonMapParseResult;

  const jsonSourceMap: {
    parse: typeof parse;
  };

  export default jsonSourceMap;
}
