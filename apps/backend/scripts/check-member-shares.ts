import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMemberShares() {
  try {
    const memberId = 'cmiacj9eq0025kmqgi9fow2lv'; // MAHESH SHRESTHA
    
    console.log('🔍 Checking shares for member...\n');
    
    // Get member info
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        memberNumber: true,
        fullName: true,
        workflowStatus: true,
      },
    });

    if (!member) {
      console.log('❌ Member not found');
      return;
    }

    console.log(`📋 Member: ${member.fullName} (${member.memberNumber})`);
    console.log(`   Status: ${member.workflowStatus}\n`);

    // Get KYC info
    const kyc = await prisma.memberKYC.findUnique({
      where: { memberId },
      select: {
        initialShareAmount: true,
        initialSavingsAmount: true,
        initialOtherAmount: true,
        approvedAt: true,
      },
    });

    if (kyc) {
      console.log('💰 KYC Payment Info:');
      console.log(`   Initial Share Amount: Rs. ${kyc.initialShareAmount || 0}`);
      console.log(`   Initial Savings Amount: Rs. ${kyc.initialSavingsAmount || 0}`);
      console.log(`   Entry Fee: Rs. ${kyc.initialOtherAmount || 0}`);
      console.log(`   Approved At: ${kyc.approvedAt || 'Not approved'}\n`);
    }

    // Get share account
    const shareAccount = await prisma.shareAccount.findUnique({
      where: { memberId },
      select: {
        id: true,
        certificateNo: true,
        totalKitta: true,
        totalAmount: true,
        unitPrice: true,
      },
    });

    if (shareAccount) {
      console.log('📊 Share Account:');
      console.log(`   Certificate No: ${shareAccount.certificateNo}`);
      console.log(`   Total Kitta: ${shareAccount.totalKitta}`);
      console.log(`   Total Amount: Rs. ${shareAccount.totalAmount}`);
      console.log(`   Unit Price: Rs. ${shareAccount.unitPrice}\n`);
    } else {
      console.log('❌ No share account found!\n');
    }

    // Get share transactions
    const transactions = await prisma.shareTransaction.findMany({
      where: { memberId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        transactionNo: true,
        type: true,
        date: true,
        kitta: true,
        amount: true,
        remarks: true,
      },
    });

    if (transactions.length > 0) {
      console.log(`📜 Share Transactions (${transactions.length}):`);
      for (const tx of transactions) {
        console.log(`   ${tx.transactionNo} - ${tx.type} - ${tx.kitta} kitta - Rs. ${tx.amount}`);
        console.log(`      Date: ${tx.date.toISOString()}`);
        console.log(`      Remarks: ${tx.remarks || 'N/A'}\n`);
      }
    } else {
      console.log('❌ No share transactions found!\n');
    }

    // Check share price
    const sharePriceSetting = await prisma.setting.findFirst({
      where: {
        key: 'share_price',
      },
    });

    if (sharePriceSetting) {
      console.log(`💵 Share Price Setting: Rs. ${sharePriceSetting.value}\n`);
    } else {
      console.log('⚠️  No share price setting found!\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMemberShares()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

