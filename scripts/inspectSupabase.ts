import prisma from '../src/config/db.js';

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  console.log('--- USERS IN SUPABASE ---');
  console.table(users);

  const colleges = await prisma.college.findMany({
    select: { id: true, name: true, code: true, status: true },
  });
  console.log('--- COLLEGES IN SUPABASE ---');
  console.table(colleges);

  const items = await prisma.item.findMany({
    select: { id: true, title: true, price: true, category: true },
  });
  console.log('--- ITEMS IN SUPABASE ---');
  console.table(items);

  await prisma.$disconnect();
}

check().catch(console.error);
