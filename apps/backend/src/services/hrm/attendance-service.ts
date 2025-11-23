import { prisma } from '../../lib/prisma.js';

/**
 * Calculate if employee is late based on check-in time and shift
 */
export function calculateLateStatus(
  checkIn: Date,
  expectedCheckIn: Date,
  graceMinutes: number = 5
): { isLate: boolean; lateMinutes: number } {
  const checkInTime = checkIn.getTime();
  const expectedTime = expectedCheckIn.getTime();
  const graceMs = graceMinutes * 60 * 1000;

  if (checkInTime <= expectedTime + graceMs) {
    return { isLate: false, lateMinutes: 0 };
  }

  const lateMs = checkInTime - (expectedTime + graceMs);
  const lateMinutes = Math.floor(lateMs / (60 * 1000));

  return { isLate: true, lateMinutes };
}

/**
 * Get expected check-in/out times for an employee on a given date
 */
export async function getExpectedTimes(
  employeeId: string,
  date: Date,
  shiftId?: string
): Promise<{ expectedCheckIn: Date; expectedCheckOut: Date } | null> {
  let shift;

  if (shiftId) {
    shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });
  } else {
    // Get employee's default shift
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { defaultShift: true },
    });

    if (!employee?.defaultShift) {
      return null;
    }

    shift = employee.defaultShift;
  }

  if (!shift) {
    return null;
  }

  // Combine date with shift times
  const expectedCheckIn = new Date(date);
  expectedCheckIn.setHours(
    shift.expectedCheckIn.getHours(),
    shift.expectedCheckIn.getMinutes(),
    0,
    0
  );

  const expectedCheckOut = new Date(date);
  expectedCheckOut.setHours(
    shift.expectedCheckOut.getHours(),
    shift.expectedCheckOut.getMinutes(),
    0,
    0
  );

  return { expectedCheckIn, expectedCheckOut };
}

/**
 * Mark attendance for an employee
 */
export async function markAttendance(
  employeeId: string,
  date: Date,
  checkIn?: Date,
  checkOut?: Date,
  shiftId?: string
): Promise<{
  id: string;
  status: string;
  isLate: boolean;
  lateMinutes: number;
}> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  // Get expected times
  const expectedTimes = await getExpectedTimes(employeeId, date, shiftId);

  // Get shift for grace minutes
  const shift = shiftId
    ? await prisma.shift.findUnique({ where: { id: shiftId } })
    : employee.defaultShiftId
      ? await prisma.shift.findUnique({ where: { id: employee.defaultShiftId } })
      : null;

  let status = 'PRESENT';
  let isLate = false;
  let lateMinutes = 0;

  if (checkIn && expectedTimes) {
    const graceMinutes = shift?.graceMinutes || 5;
    const lateStatus = calculateLateStatus(checkIn, expectedTimes.expectedCheckIn, graceMinutes);
    isLate = lateStatus.isLate;
    lateMinutes = lateStatus.lateMinutes;

    if (isLate) {
      status = 'LATE';
    }
  }

  if (!checkIn) {
    status = 'ABSENT';
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId,
        date: new Date(date.setHours(0, 0, 0, 0)),
      },
    },
    create: {
      employeeId,
      cooperativeId: employee.cooperativeId,
      date: new Date(date.setHours(0, 0, 0, 0)),
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      status,
      shiftId: shiftId || employee.defaultShiftId || null,
      expectedCheckIn: expectedTimes?.expectedCheckIn || null,
      expectedCheckOut: expectedTimes?.expectedCheckOut || null,
    },
    update: {
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      status,
      shiftId: shiftId || undefined,
      expectedCheckIn: expectedTimes?.expectedCheckIn || undefined,
      expectedCheckOut: expectedTimes?.expectedCheckOut || undefined,
    },
  });

  return {
    id: attendance.id,
    status: attendance.status,
    isLate,
    lateMinutes,
  };
}
