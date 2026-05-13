-- 20 single-use trial codes, 3-day trial each.
-- Run against the SlayJobs PostgreSQL DB (n8n-hobbyland-pg).
-- Idempotent: ON CONFLICT DO NOTHING on the unique `code` column.

INSERT INTO "TrialCode" ("id", "code", "trialDays", "maxUses", "usedCount", "active", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'SLAY-CGVR-XX2D', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-R5PT-2XJ7', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-3AP2-R7W5', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-NPWG-3UJA', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-9M2R-F65F', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-NKDX-3EC3', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-P695-9W24', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-4TE9-F8MF', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-DXYZ-X8S3', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-63QG-D86L', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-DKSY-5GCD', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-KDW9-FDFY', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-Q6QR-ZRME', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-UWZ2-AU63', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-NDQM-YEH7', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-S2RA-WQY2', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-DM2W-XFUB', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-XGYQ-QQ8E', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-SSAP-C9LA', 3, 1, 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SLAY-PE5X-M2LK', 3, 1, 0, true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
