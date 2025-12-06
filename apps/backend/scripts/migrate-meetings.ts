/**
 * Migration script to convert existing meetings to new workflow structure
 *
 * This script:
 * 1. Sets meetingNo (sequential per cooperative)
 * 2. Maps existing status to new MeetingStatus enum
 * 3. Sets workflowStatus based on minutesStatus
 * 4. Converts existing attendees JSON to MeetingAttendee records
 * 5. Converts MeetingMinute.agenda to MeetingAgenda items
 *
 * Usage: tsx scripts/migrate-meetings.ts
 */

import { PrismaClient, MeetingStatus, MeetingWorkflowStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateMeetings() {
  try {
    console.log('Starting meeting migration...\n');

    // Get all cooperatives
    const cooperatives = await prisma.cooperative.findMany({
      select: { id: true, name: true },
    });

    for (const coop of cooperatives) {
      console.log(`Processing cooperative: ${coop.name} (${coop.id})`);

      // Get all meetings for this cooperative
      const meetings = await prisma.meeting.findMany({
        where: { cooperativeId: coop.id },
        include: {
          minutes: true,
          committee: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`  Found ${meetings.length} meetings`);

      let meetingNo = 1;

      for (const meeting of meetings) {
        try {
          // 1. Set meetingNo if not already set
          if (!meeting.meetingNo) {
            await prisma.meeting.update({
              where: { id: meeting.id },
              data: { meetingNo },
            });
            console.log(`    Meeting ${meeting.id}: Set meetingNo = ${meetingNo}`);
            meetingNo++;
          } else {
            // Update counter to be higher than existing meetingNo
            meetingNo = Math.max(meetingNo, meeting.meetingNo + 1);
          }

          // 2. Map status to new enum and set workflowStatus
          let newStatus: MeetingStatus = meeting.status;
          let workflowStatus: MeetingWorkflowStatus = MeetingWorkflowStatus.DRAFT;

          // Map old status values to new enum (handle legacy string values)
          // Convert enum to string for comparison (handles both enum and legacy string values)
          const statusStr = String(meeting.status as string | MeetingStatus).toLowerCase();
          if (statusStr === 'scheduled' || statusStr === 'planned') {
            newStatus = MeetingStatus.PLANNED;
          } else if (statusStr === 'ongoing') {
            newStatus = MeetingStatus.SCHEDULED;
          } else if (statusStr === 'completed') {
            newStatus = MeetingStatus.COMPLETED;
            workflowStatus = MeetingWorkflowStatus.MINUTED;
          } else if (statusStr === 'cancelled') {
            newStatus = MeetingStatus.CANCELLED;
          }

          // Set workflowStatus based on minutesStatus
          if (meeting.minutesStatus === 'FINALIZED') {
            workflowStatus = MeetingWorkflowStatus.FINALIZED;
            newStatus = MeetingStatus.COMPLETED;
          } else if (newStatus === MeetingStatus.COMPLETED) {
            workflowStatus = MeetingWorkflowStatus.MINUTED;
          }

          // Update status and workflowStatus
          if (meeting.status !== newStatus || meeting.workflowStatus !== workflowStatus) {
            await prisma.meeting.update({
              where: { id: meeting.id },
              data: {
                status: newStatus,
                workflowStatus: workflowStatus,
                // Set date from scheduledDate if date is not set
                date: meeting.date || meeting.scheduledDate || new Date(),
              },
            });
            console.log(
              `    Meeting ${meeting.id}: Updated status to ${newStatus}, workflowStatus to ${workflowStatus}`
            );
          }

          // 3. Convert attendees JSON to MeetingAttendee records
          if (meeting.attendees && Array.isArray(meeting.attendees)) {
            const existingAttendees = await prisma.meetingAttendee.findMany({
              where: { meetingId: meeting.id },
            });

            if (existingAttendees.length === 0 && meeting.attendees.length > 0) {
              // Try to find committee members for these attendee IDs
              const attendeeIds = meeting.attendees as string[];

              if (meeting.committeeId) {
                // Get committee members
                const committeeMembers = await prisma.committeeMember.findMany({
                  where: {
                    committeeId: meeting.committeeId,
                    memberId: { in: attendeeIds },
                    isActive: true,
                  },
                  include: {
                    member: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        middleName: true,
                        institutionName: true,
                        memberType: true,
                      },
                    },
                  },
                });

                const defaultAllowance =
                  meeting.committee?.defaultAllowanceRate || meeting.baseAllowance || 0;

                // Create MeetingAttendee records for committee members
                for (const cm of committeeMembers) {
                  const memberName =
                    cm.member.memberType === 'INSTITUTION'
                      ? cm.member.institutionName || 'Institution Member'
                      : `${cm.member.firstName || ''} ${cm.member.middleName || ''} ${cm.member.lastName || ''}`.trim() ||
                        'Member';

                  await prisma.meetingAttendee.create({
                    data: {
                      meetingId: meeting.id,
                      committeeMemberId: cm.id,
                      name: memberName,
                      role: 'Member',
                      isPresent: true, // Assume present for migrated meetings
                      allowance: defaultAllowance,
                      tdsAmount: defaultAllowance * 0.15,
                      netAmount: defaultAllowance * 0.85,
                      isPaid: false,
                    },
                  });
                }

                // Create MeetingAttendee records for members not in committee
                const memberIdsInCommittee = new Set(committeeMembers.map((cm) => cm.memberId));
                const remainingIds = attendeeIds.filter((id) => !memberIdsInCommittee.has(id));

                for (const memberId of remainingIds) {
                  const member = await prisma.member.findUnique({
                    where: { id: memberId },
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      middleName: true,
                      institutionName: true,
                      memberType: true,
                    },
                  });

                  if (member) {
                    const memberName =
                      member.memberType === 'INSTITUTION'
                        ? member.institutionName || 'Institution Member'
                        : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
                          'Member';

                    await prisma.meetingAttendee.create({
                      data: {
                        meetingId: meeting.id,
                        name: memberName,
                        role: 'Member',
                        isPresent: true,
                        allowance: defaultAllowance,
                        tdsAmount: defaultAllowance * 0.15,
                        netAmount: defaultAllowance * 0.85,
                        isPaid: false,
                      },
                    });
                  }
                }

                console.log(
                  `    Meeting ${meeting.id}: Created ${committeeMembers.length + remainingIds.length} attendee records`
                );
              }
            }
          }

          // 4. Convert MeetingMinute.agenda to MeetingAgenda items
          if (meeting.minutes && meeting.minutes.length > 0) {
            const minute = meeting.minutes[0];
            if (minute.agenda && minute.agenda.trim()) {
              const existingAgendas = await prisma.meetingAgenda.findMany({
                where: { meetingId: meeting.id },
              });

              if (existingAgendas.length === 0) {
                // Split agenda by newlines and create agenda items
                const agendaLines = minute.agenda.split('\n').filter((line) => line.trim());

                for (let i = 0; i < agendaLines.length; i++) {
                  const line = agendaLines[i].trim();
                  if (line) {
                    await prisma.meetingAgenda.create({
                      data: {
                        meetingId: meeting.id,
                        title: line.length > 100 ? line.substring(0, 100) + '...' : line,
                        description: line.length > 100 ? line : undefined,
                        order: i,
                        decisionStatus: 'PENDING',
                      },
                    });
                  }
                }

                console.log(
                  `    Meeting ${meeting.id}: Created ${agendaLines.length} agenda items from minutes`
                );
              }
            }
          }
        } catch (error: any) {
          console.error(`    Error processing meeting ${meeting.id}:`, error.message);
        }
      }

      console.log(`  Completed cooperative: ${coop.name}\n`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateMeetings()
  .then(() => {
    console.log('\n✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
