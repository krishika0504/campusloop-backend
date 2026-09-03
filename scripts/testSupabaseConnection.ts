import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing connection with DIRECT_URL...');
  console.log('DIRECT_URL:', process.env.DIRECT_URL?.replace(/:[^:@]+@/, ':****@'));

  const prismaDirect = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL,
      },
    },
  });

  try {
    await prismaDirect.$connect();
    console.log('Direct connection successful!');
    const userCount = await prismaDirect.user.count();
    console.log('Current user count in Supabase:', userCount);
    await prismaDirect.$disconnect();
  } catch (err: any) {
    console.error('Direct connection failed:', err.message || err);
  }

  console.log('\nTesting connection with DATABASE_URL (pooler)...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  const prismaPooler = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    await prismaPooler.$connect();
    console.log('Pooler connection successful!');
    const colCount = await prismaPooler.college.count();
    console.log('Current college count in Supabase:', colCount);
    await prismaPooler.$disconnect();
  } catch (err: any) {
    console.error('Pooler connection failed:', err.message || err);
  }
}

test();
