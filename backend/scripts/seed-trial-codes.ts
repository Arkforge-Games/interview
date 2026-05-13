import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CODES = [
  'SLAY-CGVR-XX2D',
  'SLAY-R5PT-2XJ7',
  'SLAY-3AP2-R7W5',
  'SLAY-NPWG-3UJA',
  'SLAY-9M2R-F65F',
  'SLAY-NKDX-3EC3',
  'SLAY-P695-9W24',
  'SLAY-4TE9-F8MF',
  'SLAY-DXYZ-X8S3',
  'SLAY-63QG-D86L',
  'SLAY-DKSY-5GCD',
  'SLAY-KDW9-FDFY',
  'SLAY-Q6QR-ZRME',
  'SLAY-UWZ2-AU63',
  'SLAY-NDQM-YEH7',
  'SLAY-S2RA-WQY2',
  'SLAY-DM2W-XFUB',
  'SLAY-XGYQ-QQ8E',
  'SLAY-SSAP-C9LA',
  'SLAY-PE5X-M2LK',
];

async function main() {
  const result = await prisma.trialCode.createMany({
    data: CODES.map((code) => ({
      code,
      trialDays: 3,
      maxUses: 1,
      active: true,
    })),
    skipDuplicates: true,
  });

  console.log(`Inserted ${result.count} trial codes (3-day, single-use).`);
  console.log('Codes:');
  CODES.forEach((c) => console.log('  ' + c));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
