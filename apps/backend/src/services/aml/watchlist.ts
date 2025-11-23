import { prisma } from '../../lib/prisma.js';

/**
 * Screen a member against watchlists
 */
export async function screenMember(
  memberId: string,
  cooperativeId: string
): Promise<{
  matches: Array<{
    listType: 'UN' | 'HOME_MINISTRY';
    sanctionId: string;
    matchScore: number;
  }>;
}> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      kyc: true,
    },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  const matches: Array<{
    listType: 'UN' | 'HOME_MINISTRY';
    sanctionId: string;
    matchScore: number;
  }> = [];

  // Check UN list
  const unMatches = await checkUnList(member, cooperativeId);
  matches.push(...unMatches);

  // Check Home Ministry list
  const homeMinistryMatches = await checkHomeMinistryList(member, cooperativeId);
  matches.push(...homeMinistryMatches);

  return { matches };
}

/**
 * Check member against UN sanction list
 */
async function checkUnList(member: any, cooperativeId: string) {
  const matches: Array<{
    listType: 'UN' | 'HOME_MINISTRY';
    sanctionId: string;
    matchScore: number;
  }> = [];

  // Get all UN sanctions
  const unSanctions = await prisma.sanctionListUN.findMany({
    where: { cooperativeId },
  });

  const memberFullName = `${member.firstName} ${member.lastName}`.toLowerCase();
  const memberAliases = member.familyDetails
    ? (member.familyDetails as any).map((f: any) => `${f.firstName} ${f.lastName}`.toLowerCase())
    : [];

  for (const sanction of unSanctions) {
    // Check if already whitelisted
    const whitelisted = await prisma.whitelistedMatch.findUnique({
      where: {
        memberId_sanctionListId_sanctionListType: {
          memberId: member.id,
          sanctionListId: sanction.id,
          sanctionListType: 'UN',
        },
      },
    });

    if (whitelisted) {
      continue; // Skip whitelisted matches
    }

    // Exact name match
    if (sanction.fullName.toLowerCase() === memberFullName) {
      matches.push({
        listType: 'UN',
        sanctionId: sanction.id,
        matchScore: 100,
      });
      continue;
    }

    // Check aliases
    const sanctionAliases = (sanction.aliases as string[]) || [];
    for (const alias of sanctionAliases) {
      if (alias.toLowerCase() === memberFullName) {
        matches.push({
          listType: 'UN',
          sanctionId: sanction.id,
          matchScore: 90,
        });
        break;
      }
    }

    // Check family members
    for (const memberAlias of memberAliases) {
      if (sanction.fullName.toLowerCase() === memberAlias) {
        matches.push({
          listType: 'UN',
          sanctionId: sanction.id,
          matchScore: 85,
        });
        break;
      }
    }
  }

  return matches;
}

/**
 * Check member against Home Ministry list
 */
async function checkHomeMinistryList(member: any, cooperativeId: string) {
  const matches: Array<{
    listType: 'UN' | 'HOME_MINISTRY';
    sanctionId: string;
    matchScore: number;
  }> = [];

  // Get all Home Ministry sanctions
  const homeMinistrySanctions = await prisma.sanctionListHomeMinistry.findMany({
    where: { cooperativeId },
  });

  const memberFullName = `${member.firstName} ${member.lastName}`.toLowerCase();
  const memberNationalId = member.kyc?.citizenshipNumber?.toLowerCase();

  for (const sanction of homeMinistrySanctions) {
    // Check if already whitelisted
    const whitelisted = await prisma.whitelistedMatch.findUnique({
      where: {
        memberId_sanctionListId_sanctionListType: {
          memberId: member.id,
          sanctionListId: sanction.id,
          sanctionListType: 'HOME_MINISTRY',
        },
      },
    });

    if (whitelisted) {
      continue; // Skip whitelisted matches
    }

    // Exact name match
    if (sanction.fullName.toLowerCase() === memberFullName) {
      matches.push({
        listType: 'HOME_MINISTRY',
        sanctionId: sanction.id,
        matchScore: 100,
      });
      continue;
    }

    // National ID match (if available)
    if (
      sanction.nationalId &&
      memberNationalId &&
      sanction.nationalId.toLowerCase() === memberNationalId
    ) {
      matches.push({
        listType: 'HOME_MINISTRY',
        sanctionId: sanction.id,
        matchScore: 100,
      });
      continue;
    }

    // Check aliases
    const sanctionAliases = (sanction.aliases as string[]) || [];
    for (const alias of sanctionAliases) {
      if (alias.toLowerCase() === memberFullName) {
        matches.push({
          listType: 'HOME_MINISTRY',
          sanctionId: sanction.id,
          matchScore: 90,
        });
        break;
      }
    }
  }

  return matches;
}

/**
 * Re-screen all members against updated watchlist
 */
export async function rescreenAllMembers(
  cooperativeId: string,
  listType: 'UN' | 'HOME_MINISTRY'
): Promise<void> {
  const members = await prisma.member.findMany({
    where: { cooperativeId, isActive: true },
  });

  for (const member of members) {
    try {
      const { matches } = await screenMember(member.id, cooperativeId);
      if (matches.length > 0) {
        // Create AML flags for matches
        for (const match of matches) {
          if (match.listType === listType) {
            await prisma.amlFlag.create({
              data: {
                memberId: member.id,
                cooperativeId,
                type: 'HIGH_RISK',
                details: {
                  watchlistMatch: true,
                  listType: match.listType,
                  sanctionId: match.sanctionId,
                  matchScore: match.matchScore,
                },
                status: 'pending',
              },
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error screening member ${member.id}:`, error);
    }
  }
}
