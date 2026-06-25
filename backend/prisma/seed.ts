import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { logger } from '../src/utils/logger.js';

const prisma = new PrismaClient();

async function main() {
  logger.info({ msg: 'Seeding database...' });

  // Create roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'DIRECTOR' },
      update: {},
      create: {
        name: 'DIRECTOR',
        description: 'Director level access',
      },
    }),
    prisma.role.upsert({
      where: { name: 'MANAGER' },
      update: {},
      create: {
        name: 'MANAGER',
        description: 'Manager level access',
      },
    }),
    prisma.role.upsert({
      where: { name: 'FINANCE' },
      update: {},
      create: {
        name: 'FINANCE',
        description: 'Finance team access',
      },
    }),
    prisma.role.upsert({
      where: { name: 'OPERATOR' },
      update: {},
      create: {
        name: 'OPERATOR',
        description: 'Operator access',
      },
    }),
  ]);

  // Create permissions
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { name: 'view_dashboard' },
      update: {},
      create: {
        name: 'view_dashboard',
        resource: 'dashboard',
        action: 'view',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'view_transactions' },
      update: {},
      create: {
        name: 'view_transactions',
        resource: 'transactions',
        action: 'view',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'manage_transactions' },
      update: {},
      create: {
        name: 'manage_transactions',
        resource: 'transactions',
        action: 'manage',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'view_reports' },
      update: {},
      create: {
        name: 'view_reports',
        resource: 'reports',
        action: 'view',
      },
    }),
  ]);

  // Assign permissions to DIRECTOR role
  const directorRole = roles[0];
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: directorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: directorRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mbarep.com' },
    update: {},
    create: {
      email: 'admin@mbarep.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'MBAREP',
      roleId: directorRole.id,
      isActive: true,
    },
  });

  // Create branches
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { code: 'JKT' },
      update: {},
      create: {
        code: 'JKT',
        name: 'Cabang Jakarta',
        city: 'Jakarta',
        address: 'Jl. Sudirman No. 1',
        phone: '021-1234567',
        email: 'jakarta@mbarep.com',
      },
    }),
    prisma.branch.upsert({
      where: { code: 'BJN' },
      update: {},
      create: {
        code: 'BJN',
        name: 'Cabang Banjarnegara',
        city: 'Banjarnegara',
        address: 'Jl. Ratusan No. 1',
        phone: '0286-1234567',
        email: 'banjarnegara@mbarep.com',
      },
    }),
  ]);

  // Create transaction categories
  const categories = await Promise.all([
    prisma.transactionCategory.upsert({
      where: { name: 'Charter' },
      update: {},
      create: { name: 'Charter', color: '#FF6B6B' },
    }),
    prisma.transactionCategory.upsert({
      where: { name: 'Rental' },
      update: {},
      create: { name: 'Rental', color: '#4ECDC4' },
    }),
    prisma.transactionCategory.upsert({
      where: { name: 'Tour' },
      update: {},
      create: { name: 'Tour', color: '#45B7D1' },
    }),
  ]);

  // Create voice packs
  await prisma.voicePack.upsert({
    where: { name: 'Indonesia Standard' },
    update: {},
    create: {
      name: 'Indonesia Standard',
      description: 'Standard voice for Indonesian language',
      category: 'STANDARD',
      language: 'id',
      voiceId: 'default-id',
      provider: 'tts',
      isDefault: true,
      rules: {},
    },
  });

  // Create merchants
  await Promise.all([
    prisma.merchant.upsert({
      where: { code: 'QRIS-001' },
      update: {},
      create: {
        code: 'QRIS-001',
        name: 'MBAREP Main QRIS',
        category: 'Travel',
      },
    }),
  ]);

  logger.info({ msg: 'Database seeded successfully' });
}

main()
  .catch((e) => {
    logger.error({ error: e, msg: 'Seed error' });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
