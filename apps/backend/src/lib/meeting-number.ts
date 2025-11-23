import { prisma } from './prisma.js';

/**
 * Generate the next meeting number for a cooperative
 * Returns sequential number starting from 1
 */
export async function generateMeetingNumber(cooperativeId: string): Promise<number> {
  // Find the highest meeting number for this cooperative
  const lastMeeting = await prisma.meeting.findFirst({
    where: {
      cooperativeId,
      meetingNo: {
        not: null,
      },
    },
    orderBy: {
      meetingNo: 'desc',
    },
  });

  let nextNumber = 1;

  if (lastMeeting && lastMeeting.meetingNo) {
    nextNumber = lastMeeting.meetingNo + 1;
  }

  return nextNumber;
}
