import { prisma } from "../prisma/client";

/**
 * Checks whether a user already has a time entry that overlaps with the given
 * [startTime, endTime] interval.
 *
 * @param userId    - The user whose entries are checked.
 * @param startTime - Start of the interval to check.
 * @param endTime   - End of the interval to check.
 * @param excludeId - Optional time-entry id to exclude (used when updating an
 *                    existing entry so it does not collide with itself).
 */
export async function hasOverlappingEntries(
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string,
): Promise<boolean> {
  const count = await prisma.timeEntry.count({
    where: {
      userId,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      // An entry overlaps when it starts before our end AND ends after our start.
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  return count > 0;
}
