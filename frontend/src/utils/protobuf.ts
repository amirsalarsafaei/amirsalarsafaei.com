import { timestampDate } from "@bufbuild/protobuf/wkt";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

/**
 * Convert a protobuf Timestamp message to a JS Date. Returns undefined when the
 * field is unset, which is how ts-proto used to represent absent timestamps.
 */
export function timestampToDate(value?: Timestamp): Date | undefined {
  return value ? timestampDate(value) : undefined;
}
