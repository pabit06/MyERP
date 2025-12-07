import { prisma } from '../lib/prisma.js';

/**
 * Get member statistics for a given period
 */
export async function getMemberStatistics(
  cooperativeId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<{
  totalMembers: number;
  newMembers: number;
  closedMembers: number;
  activeMembers: number;
  newMembersList: Array<{
    id: string;
    memberNumber: string | null;
    name: string;
    shareAmount: number;
    joinedDate: Date;
  }>;
  closedMembersList: Array<{
    id: string;
    memberNumber: string | null;
    name: string;
    closedDate: Date;
  }>;
}> {
  // Total members
  const totalMembers = await prisma.member.count({
    where: {
      cooperativeId,
    },
  });

  // Active members
  const activeMembers = await prisma.member.count({
    where: {
      cooperativeId,
      isActive: true,
    },
  });

  // New members in period
  const newMembers = await prisma.member.count({
    where: {
      cooperativeId,
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  // New members list
  const newMembersData = await prisma.member.findMany({
    where: {
      cooperativeId,
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    include: {
      shareAccount: {
        select: {
          totalKitta: true,
          unitPrice: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const newMembersList = newMembersData.map((member) => {
    const memberName =
      member.memberType === 'INSTITUTION'
        ? member.institutionName || 'Institution Member'
        : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
          'Member';
    const shareAmount =
      (member.shareAccount?.totalKitta || 0) * Number(member.shareAccount?.unitPrice || 0);

    return {
      id: member.id,
      memberNumber: member.memberNumber,
      name: memberName,
      shareAmount,
      joinedDate: member.createdAt,
    };
  });

  // Closed members (members marked as inactive in period)
  // Note: This assumes we track when members are closed - may need to add a closedDate field
  const closedMembers = await prisma.member.count({
    where: {
      cooperativeId,
      isActive: false,
      updatedAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  const closedMembersData = await prisma.member.findMany({
    where: {
      cooperativeId,
      isActive: false,
      updatedAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: {
      updatedAt: 'asc',
    },
  });

  const closedMembersList = closedMembersData.map((member) => {
    const memberName =
      member.memberType === 'INSTITUTION'
        ? member.institutionName || 'Institution Member'
        : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
          'Member';

    return {
      id: member.id,
      memberNumber: member.memberNumber,
      name: memberName,
      closedDate: member.updatedAt,
    };
  });

  return {
    totalMembers,
    newMembers,
    closedMembers,
    activeMembers,
    newMembersList,
    closedMembersList,
  };
}

/**
 * Get AML statistics
 */
export async function getAMLStatistics(cooperativeId: string): Promise<{
  highRiskMembers: number;
  strCount: number;
  ttrCount: number;
  copomisStatus: string;
}> {
  // High-risk members (members with AML flags of type HIGH_RISK)
  const highRiskMembers = await prisma.member.count({
    where: {
      cooperativeId,
      amlFlags: {
        some: {
          type: 'HIGH_RISK',
        },
      },
    },
  });

  // STR/TTR counts - count AML flags of type STR and TTR
  const strCount = await prisma.amlFlag.count({
    where: {
      cooperativeId,
      type: 'STR',
    },
  });

  const ttrCount = await prisma.amlFlag.count({
    where: {
      cooperativeId,
      type: 'TTR',
    },
  });

  // COPOMIS status - placeholder (would need to track this separately)
  const copomisStatus = 'Not Implemented'; // Would track actual COPOMIS sync status

  return {
    highRiskMembers,
    strCount,
    ttrCount,
    copomisStatus,
  };
}

/**
 * Get top 20 depositors by balance
 */
export async function getTop20Depositors(
  cooperativeId: string,
  _asOfDate: Date = new Date()
): Promise<
  Array<{
    memberId: string;
    memberNumber: string | null;
    memberName: string;
    accountNumber: string;
    balance: number;
    productName: string;
  }>
> {
  const topDepositors = await prisma.savingAccount.findMany({
    where: {
      cooperativeId,
      status: 'active',
    },
    include: {
      member: {
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          institutionName: true,
          memberType: true,
        },
      },
      product: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      balance: 'desc',
    },
    take: 20,
  });

  return topDepositors.map((account) => {
    const memberName =
      account.member.memberType === 'INSTITUTION'
        ? account.member.institutionName || 'Institution Member'
        : `${account.member.firstName || ''} ${account.member.middleName || ''} ${
            account.member.lastName || ''
          }`.trim() || 'Member';

    return {
      memberId: account.member.id,
      memberNumber: account.member.memberNumber,
      memberName,
      accountNumber: account.accountNumber,
      balance: Number(account.balance),
      productName: account.product.name,
    };
  });
}

/**
 * Calculate Member Centrality Index
 * This is a placeholder - actual calculation would depend on business requirements
 * Could be based on: transaction frequency, account balances, loan activity, etc.
 */
export async function getMemberCentralityIndex(cooperativeId: string): Promise<{
  index: number;
  description: string;
}> {
  // Placeholder implementation
  // In real scenario, would calculate based on:
  // - Number of active accounts per member
  // - Transaction frequency
  // - Account balances
  // - Loan activity
  // - Years of membership

  const totalMembers = await prisma.member.count({
    where: {
      cooperativeId,
      isActive: true,
    },
  });

  const membersWithAccounts = await prisma.member.count({
    where: {
      cooperativeId,
      isActive: true,
      savingAccounts: {
        some: {
          status: 'active',
        },
      },
    },
  });

  // Simple index: percentage of active members with accounts
  const index = totalMembers > 0 ? (membersWithAccounts / totalMembers) * 100 : 0;

  return {
    index: Math.round(index * 100) / 100, // Round to 2 decimal places
    description: `Percentage of active members with savings accounts: ${Math.round(index)}%`,
  };
}

/**
 * Get members with upcoming birthdays
 * @param cooperativeId - The cooperative ID
 * @param daysAhead - Number of days ahead to look (default: 30)
 * @returns List of members with upcoming birthdays
 */
export async function getUpcomingBirthdays(
  cooperativeId: string,
  daysAhead: number = 30
): Promise<
  Array<{
    id: string;
    memberNumber: string | null;
    name: string;
    dateOfBirth: Date | null;
    dateOfBirthBS: string | null;
    birthdayThisYear: Date;
    daysUntil: number;
    age: number | null;
    phone: string | null;
    email: string | null;
  }>
> {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysAhead);

  // Get all active members with date of birth
  const members = await prisma.member.findMany({
    where: {
      cooperativeId,
      isActive: true,
      kyc: {
        dateOfBirth: {
          not: null,
        },
      },
    },
    include: {
      kyc: {
        select: {
          dateOfBirth: true,
          dateOfBirthBS: true,
        },
      },
    },
  });

  const upcomingBirthdays: Array<{
    id: string;
    memberNumber: string | null;
    name: string;
    dateOfBirth: Date | null;
    dateOfBirthBS: string | null;
    birthdayThisYear: Date;
    daysUntil: number;
    age: number | null;
    phone: string | null;
    email: string | null;
  }> = [];

  for (const member of members) {
    if (!member.kyc?.dateOfBirth) continue;

    const birthDate = new Date(member.kyc.dateOfBirth);
    const currentYear = today.getFullYear();

    // Calculate birthday for this year
    const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

    // If birthday already passed this year, use next year
    if (birthdayThisYear < today) {
      birthdayThisYear.setFullYear(currentYear + 1);
    }

    // Check if birthday is within the specified range
    if (birthdayThisYear >= today && birthdayThisYear <= endDate) {
      const daysUntil = Math.ceil(
        (birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate age
      let age: number | null = null;
      if (birthDate) {
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      const memberName =
        member.memberType === 'INSTITUTION'
          ? member.institutionName || 'Institution Member'
          : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
            'Member';

      upcomingBirthdays.push({
        id: member.id,
        memberNumber: member.memberNumber,
        name: memberName,
        dateOfBirth: member.kyc.dateOfBirth,
        dateOfBirthBS: member.kyc.dateOfBirthBS,
        birthdayThisYear,
        daysUntil,
        age,
        phone: member.phone,
        email: member.email,
      });
    }
  }

  // Sort by days until birthday (soonest first)
  upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

  return upcomingBirthdays;
}

/**
 * Get member list with basic information
 * @param cooperativeId - The cooperative ID
 * @param includeInactive - Whether to include inactive members (default: false)
 * @returns List of members with S.N., Membership Number, Name, Temporary Address, Phone Number
 */
export async function getMemberList(
  cooperativeId: string,
  includeInactive: boolean = false
): Promise<
  Array<{
    sn: number;
    memberNumber: string | null;
    name: string;
    temporaryAddress: string;
    phoneNumber: string | null;
  }>
> {
  const members = await prisma.member.findMany({
    where: {
      cooperativeId,
      isActive: includeInactive ? undefined : true,
    },
    include: {
      kyc: {
        select: {
          temporaryProvince: true,
          temporaryMunicipality: true,
          temporaryWard: true,
          temporaryVillageTole: true,
          temporaryHouseNo: true,
          permanentProvince: true,
          permanentMunicipality: true,
          permanentWard: true,
          permanentVillageTole: true,
          permanentHouseNo: true,
          residenceType: true,
          contactNo: true, // Phone number from KYC
        },
      },
    },
    orderBy: [
      { createdAt: 'asc' }, // Sort by creation date first
    ],
  });

  // Sort members: those with memberNumber first (sorted by number), then those without (sorted by createdAt)
  const sortedMembers = [...members].sort((a, b) => {
    // If both have memberNumber, sort by memberNumber
    if (a.memberNumber && b.memberNumber) {
      return a.memberNumber.localeCompare(b.memberNumber);
    }
    // If only a has memberNumber, a comes first
    if (a.memberNumber && !b.memberNumber) {
      return -1;
    }
    // If only b has memberNumber, b comes first
    if (!a.memberNumber && b.memberNumber) {
      return 1;
    }
    // If neither has memberNumber, sort by createdAt
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const memberList = sortedMembers.map((member, index) => {
    // Helper function to remove duplicate text (e.g., "ABC ABC" -> "ABC")
    const deduplicateText = (text: string): string => {
      if (!text) return text;
      const trimmed = text.trim();
      if (!trimmed) return trimmed;

      // Check if the text is exactly duplicated (split in half)
      const halfLength = Math.floor(trimmed.length / 2);
      const firstHalf = trimmed.substring(0, halfLength).trim();
      const secondHalf = trimmed.substring(halfLength).trim();

      // Normalize both halves (remove extra spaces, convert to lowercase for comparison)
      const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();
      const normalizedFirst = normalize(firstHalf);
      const normalizedSecond = normalize(secondHalf);

      // If the two halves are identical or very similar, return the first half
      if (normalizedFirst && normalizedSecond && normalizedFirst === normalizedSecond) {
        return firstHalf;
      }

      // Check if text ends with the same pattern it starts with (e.g., "ABC...ABC")
      // This handles cases where there might be a separator between duplicates
      if (normalizedFirst.length > 10 && normalizedSecond.length > 10) {
        // Check if first 20 chars of second half match first 20 chars of first half
        const first20First = normalizedFirst.substring(0, 20);
        const first20Second = normalizedSecond.substring(0, 20);
        if (first20First === first20Second) {
          return firstHalf;
        }
      }

      return trimmed;
    };

    // Determine member name - prefer institutionName for institutions, fullName for individuals
    let memberName: string;

    if (member.memberType === 'INSTITUTION') {
      // For institutions, prefer institutionName over fullName (to avoid duplicates)
      if (member.institutionName) {
        memberName = member.institutionName.trim();
      } else if (member.fullName) {
        // Use fullName but deduplicate if needed
        memberName = deduplicateText(member.fullName);
      } else {
        memberName = 'Institution Member';
      }
    } else {
      // For individuals, prefer fullName, then construct from parts
      if (member.fullName) {
        // Use fullName but deduplicate if needed
        memberName = deduplicateText(member.fullName);
      } else {
        // Construct from firstName, middleName, lastName
        const constructedName =
          `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim();
        memberName = constructedName || 'Member';
      }
    }

    // Final cleanup: remove any extra whitespace
    memberName = memberName.trim().replace(/\s+/g, ' ');

    // Format address - prefer temporary, fallback to permanent
    const addressParts: string[] = [];

    // Check if we should use temporary or permanent address
    const useTemporary =
      member.kyc?.residenceType === 'TEMPORARY' ||
      member.kyc?.temporaryProvince ||
      member.kyc?.temporaryMunicipality;

    if (useTemporary && member.kyc) {
      if (member.kyc.temporaryProvince) {
        addressParts.push(member.kyc.temporaryProvince);
      }
      if (member.kyc.temporaryMunicipality) {
        addressParts.push(member.kyc.temporaryMunicipality);
      }
      if (member.kyc.temporaryWard) {
        addressParts.push(`Ward ${member.kyc.temporaryWard}`);
      }
      if (member.kyc.temporaryVillageTole) {
        addressParts.push(member.kyc.temporaryVillageTole);
      }
      if (member.kyc.temporaryHouseNo) {
        addressParts.push(`House No. ${member.kyc.temporaryHouseNo}`);
      }
    } else if (member.kyc) {
      // Use permanent address as fallback
      if (member.kyc.permanentProvince) {
        addressParts.push(member.kyc.permanentProvince);
      }
      if (member.kyc.permanentMunicipality) {
        addressParts.push(member.kyc.permanentMunicipality);
      }
      if (member.kyc.permanentWard) {
        addressParts.push(`Ward ${member.kyc.permanentWard}`);
      }
      if (member.kyc.permanentVillageTole) {
        addressParts.push(member.kyc.permanentVillageTole);
      }
      if (member.kyc.permanentHouseNo) {
        addressParts.push(`House No. ${member.kyc.permanentHouseNo}`);
      }
    }

    const temporaryAddress = addressParts.length > 0 ? addressParts.join(', ') : '—';

    // Get phone number - prefer member.phone, fallback to kyc.contactNo
    const phoneNumber = member.phone || member.kyc?.contactNo || null;

    return {
      sn: index + 1,
      memberNumber: member.memberNumber || null,
      name: memberName,
      temporaryAddress,
      phoneNumber,
    };
  });

  return memberList;
}
