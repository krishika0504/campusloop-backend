import app from '../src/app.js';
import prisma from '../src/config/db.js';
import http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  error?: any;
}

const results: TestResult[] = [];

async function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message || error });
    console.error(`  ✗ ${name}:`, error.message || error);
  }
}

async function requestJson(
  server: http.Server,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

import { execSync } from 'child_process';

async function runAll() {
  console.log('\n========================================');
  console.log('RUNNING CAMPUSLOOP BACKEND INTEGRATION & SECURITY TESTS');
  console.log('========================================\n');

  console.log('Resetting and seeding test database state...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'pipe' });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

  let superAdminToken = '';
  let iitbAdminToken = '';
  let studentToken = '';
  let iitbCollegeId = '';
  let stanfordCollegeId = '';
  let stanfordStudentId = '';
  let testItemId = '';

  try {
    // Test 1: Health
    await runTest('Health Check: /health returns 200 and healthy status', async () => {
      const res = await requestJson(server, 'GET', '/health');
      await assert(res.status === 200, `Expected 200 got ${res.status}`);
      await assert(res.body.status === 'healthy', 'Expected status to be healthy');
    });

    // Test 2: Auth Logins
    await runTest('Auth: Super Admin login succeeds with role SUPER_ADMIN', async () => {
      const res = await requestJson(server, 'POST', '/api/auth/admin/login', {}, {
        email: 'superadmin@campusloop.in',
        password: 'SuperAdmin123!',
      });
      await assert(res.status === 200, `Expected 200 got ${res.status}`);
      await assert(res.body.user.role === 'SUPER_ADMIN', 'Expected role SUPER_ADMIN');
      superAdminToken = res.body.tokens.accessToken;
    });

    await runTest('Auth: College Admin (IIT Bombay) login succeeds with role COLLEGE_ADMIN', async () => {
      const res = await requestJson(server, 'POST', '/api/auth/admin/login', {}, {
        email: 'admin.iitb@campusloop.in',
        password: 'CollegeAdmin123!',
      });
      await assert(res.status === 200, `Expected 200 got ${res.status}`);
      await assert(res.body.user.role === 'COLLEGE_ADMIN', 'Expected role COLLEGE_ADMIN');
      iitbAdminToken = res.body.tokens.accessToken;
      iitbCollegeId = res.body.user.collegeId;
    });

    await runTest('Auth: Student (Aniket) login succeeds', async () => {
      const res = await requestJson(server, 'POST', '/api/auth/login', {}, {
        email: 'aniket@iitb.ac.in',
        password: 'Student123!',
      });
      await assert(res.status === 200, `Expected 200 got ${res.status}`);
      await assert(res.body.user.role === 'STUDENT', 'Expected role STUDENT');
      studentToken = res.body.tokens.accessToken;
    });

    await runTest('Auth: Rejects invalid password', async () => {
      const res = await requestJson(server, 'POST', '/api/auth/login', {}, {
        email: 'aniket@iitb.ac.in',
        password: 'WrongPassword!',
      });
      await assert(res.status === 401, `Expected 401 got ${res.status}`);
    });

    await runTest('Auth: Rejects student from admin login', async () => {
      const res = await requestJson(server, 'POST', '/api/auth/admin/login', {}, {
        email: 'aniket@iitb.ac.in',
        password: 'Student123!',
      });
      await assert(res.status === 401, `Expected 401 got ${res.status}`);
    });

    // Test 3: College Data Isolation (Security)
    const stanfordCollege = await prisma.college.findUnique({ where: { code: 'STANFORD' } });
    stanfordCollegeId = stanfordCollege!.id;
    const stanfordStudent = await prisma.user.findFirst({ where: { collegeId: stanfordCollegeId } });
    stanfordStudentId = stanfordStudent!.id;

    await runTest('Security: IIT Bombay Admin CAN access their own college details', async () => {
      const res = await requestJson(server, 'GET', `/api/colleges/${iitbCollegeId}`, {
        Authorization: `Bearer ${iitbAdminToken}`,
      });
      await assert(res.status === 200, `Expected 200 got ${res.status}`);
      await assert(res.body.code === 'IITB', `Expected IITB got ${res.body.code}`);
    });

    await runTest('Security: IIT Bombay Admin CANNOT access Stanford details (MUST return 403 Forbidden)', async () => {
      const res = await requestJson(server, 'GET', `/api/colleges/${stanfordCollegeId}`, {
        Authorization: `Bearer ${iitbAdminToken}`,
      });
      await assert(res.status === 403, `Expected 403 Forbidden got ${res.status}`);
    });

    await runTest('Security: IIT Bombay Admin CANNOT access Stanford student (MUST return 403 Forbidden)', async () => {
      const res = await requestJson(server, 'GET', `/api/students/${stanfordStudentId}`, {
        Authorization: `Bearer ${iitbAdminToken}`,
      });
      await assert(res.status === 403, `Expected 403 Forbidden got ${res.status}`);
    });

    await runTest('Security: Super Admin CAN access Stanford student', async () => {
      const res = await requestJson(server, 'GET', `/api/students/${stanfordStudentId}`, {
        Authorization: `Bearer ${superAdminToken}`,
      });
      await assert(res.status === 200, `Expected 200 got ${res.status}`);
    });

    // Test 4: Marketplace Items
    await runTest('Marketplace: Lists items with category filter', async () => {
      const res = await requestJson(server, 'GET', '/api/items?category=Textbooks');
      await assert(res.status === 200, `Expected 200 got ${res.status}`);
      await assert(Array.isArray(res.body), 'Expected array response');
      await assert(res.body.length > 0, 'Expected at least 1 textbook');
      testItemId = res.body[0].id;
    });

    // Test 5: Bargaining & Offer Price Locking
    await runTest('Bargaining: Creates offer, counteroffer, and locks agreed price on acceptance', async () => {
      const rahulLogin = await requestJson(server, 'POST', '/api/auth/login', {}, {
        email: 'rahul@iitb.ac.in',
        password: 'Student123!',
      });
      const rahulToken = rahulLogin.body.tokens.accessToken;

      // Make offer: 310
      const offerRes = await requestJson(server, 'POST', '/api/offers', {
        Authorization: `Bearer ${rahulToken}`,
      }, {
        itemId: testItemId,
        offeredPrice: 310,
        message: 'Can you do 310 today?',
      });
      await assert(offerRes.status === 201, `Expected 201 got ${offerRes.status}`);
      const offerId = offerRes.body.id;

      // Aniket counters: 330
      const counterRes = await requestJson(server, 'POST', `/api/offers/${offerId}/counter`, {
        Authorization: `Bearer ${studentToken}`,
      }, {
        counterPrice: 330,
        message: '330 is my best price',
      });
      await assert(counterRes.status === 201, `Expected 201 got ${counterRes.status}`);
      const counterOfferId = counterRes.body.id;

      // Rahul accepts counter: 330
      const acceptRes = await requestJson(server, 'PUT', `/api/offers/${counterOfferId}/accept`, {
        Authorization: `Bearer ${rahulToken}`,
      });
      await assert(acceptRes.status === 200, `Expected 200 got ${acceptRes.status}`);
      await assert(acceptRes.body.transaction.agreedPrice === 330, `Expected agreed price 330 got ${acceptRes.body.transaction.agreedPrice}`);
    });

    // Test 6: QR Pickup Verification
    await runTest('QR Verification: Rejects invalid QR and successfully completes on valid QR code', async () => {
      const tx = await prisma.transaction.findFirst({
        where: { status: 'READY_FOR_PICKUP' },
      });
      await assert(Boolean(tx), 'Expected a transaction ready for pickup');

      // Invalid QR
      const failRes = await requestJson(server, 'POST', `/api/transactions/${tx!.id}/verify-qr`, {
        Authorization: `Bearer ${studentToken}`,
      }, {
        qrCode: 'INVALID-QR-CODE-TEST',
      });
      await assert(failRes.status === 400, `Expected 400 got ${failRes.status}`);

      // Valid QR
      const validRes = await requestJson(server, 'POST', `/api/transactions/${tx!.id}/verify-qr`, {
        Authorization: `Bearer ${studentToken}`,
      }, {
        qrCode: tx!.qrVerificationCode,
      });
      await assert(validRes.status === 200, `Expected 200 got ${validRes.status}`);
      await assert(validRes.body.success === true, 'Expected success true');
      await assert(validRes.body.transaction.status === 'COMPLETED', 'Expected status COMPLETED');
    });

    // Test 7: Ratings & Duplicate Prevention
    await runTest('Ratings: Prevents non-participants from rating completed transaction', async () => {
      const tx = await prisma.transaction.findFirst({ where: { status: 'COMPLETED' } });
      await assert(Boolean(tx), 'Expected completed transaction');

      const marcusLogin = await requestJson(server, 'POST', '/api/auth/login', {}, {
        email: 'marcus@stanford.edu',
        password: 'Student123!',
      });
      const marcusToken = marcusLogin.body.tokens.accessToken;

      const rateRes = await requestJson(server, 'POST', '/api/ratings', {
        Authorization: `Bearer ${marcusToken}`,
      }, {
        transactionId: tx!.id,
        rating: 5,
        review: 'Unauthorized rating attempt',
      });
      await assert(rateRes.status === 403, `Expected 403 Forbidden got ${rateRes.status}`);
    });

    // Test 8: Impact Metrics
    await runTest('Impact: Returns verified circular metrics with documented methodology', async () => {
      const res = await requestJson(server, 'GET', '/api/impact', {
        Authorization: `Bearer ${superAdminToken}`,
      });
      await assert(res.status === 200, `Expected 200 got ${res.status}`);
      await assert(res.body.summary.itemsReused >= 1, 'Expected itemsReused >= 1');
      await assert(Boolean(res.body.methodology.co2FactorPerTextbook), 'Expected documented methodology');
    });

  } finally {
    server.close();
  }

  console.log('\n========================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
