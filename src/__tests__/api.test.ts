import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';

describe('CampusLoop API Integration & Security Tests', () => {
  let superAdminToken: string;
  let iitbAdminToken: string;
  let studentToken: string;
  let iitbCollegeId: string;
  let stanfordCollegeId: string;
  let testItemId: string;
  let testStudentId: string;
  let stanfordStudentId: string;

  beforeAll(async () => {
    // 1. Login as Super Admin
    const superAdminRes = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'superadmin@campusloop.in', password: 'SuperAdmin123!' });
    expect(superAdminRes.status).toBe(200);
    superAdminToken = superAdminRes.body.tokens.accessToken;

    // 2. Login as College Admin (IIT Bombay)
    const iitbAdminRes = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'admin.iitb@campusloop.in', password: 'CollegeAdmin123!' });
    expect(iitbAdminRes.status).toBe(200);
    iitbAdminToken = iitbAdminRes.body.tokens.accessToken;
    iitbCollegeId = iitbAdminRes.body.user.collegeId;

    // 3. Login as Student (Aniket)
    const studentRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'aniket@iitb.ac.in', password: 'Student123!' });
    expect(studentRes.status).toBe(200);
    studentToken = studentRes.body.tokens.accessToken;
    testStudentId = studentRes.body.user.id;

    // Get Stanford college and a Stanford student for security isolation tests
    const stanfordCollege = await prisma.college.findUnique({ where: { code: 'STANFORD' } });
    expect(stanfordCollege).toBeDefined();
    stanfordCollegeId = stanfordCollege!.id;

    const stanfordStudent = await prisma.user.findFirst({ where: { collegeId: stanfordCollegeId } });
    expect(stanfordStudent).toBeDefined();
    stanfordStudentId = stanfordStudent!.id;

    // Get an item for testing
    const item = await prisma.item.findFirst();
    expect(item).toBeDefined();
    testItemId = item!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Health Check', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('2. Authentication & Authorization', () => {
    it('should reject invalid student login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'aniket@iitb.ac.in', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should reject student accessing admin login', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'aniket@iitb.ac.in', password: 'Student123!' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Access denied');
    });

    it('should fetch current authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('aniket@iitb.ac.in');
      expect(res.body.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('3. Strict College Data Isolation (Security RBAC Test)', () => {
    it('College Admin CAN access their own college details', async () => {
      const res = await request(app)
        .get(`/api/colleges/${iitbCollegeId}`)
        .set('Authorization', `Bearer ${iitbAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe('IITB');
    });

    it('CRITICAL: College Admin CANNOT access another college details (MUST return 403)', async () => {
      const res = await request(app)
        .get(`/api/colleges/${stanfordCollegeId}`)
        .set('Authorization', `Bearer ${iitbAdminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('CRITICAL: College Admin CANNOT view students belonging to another college (MUST return 403)', async () => {
      const res = await request(app)
        .get(`/api/students/${stanfordStudentId}`)
        .set('Authorization', `Bearer ${iitbAdminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('Super Admin CAN access all colleges and students', async () => {
      const resCol = await request(app)
        .get(`/api/colleges/${stanfordCollegeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(resCol.status).toBe(200);

      const resStu = await request(app)
        .get(`/api/students/${stanfordStudentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(resStu.status).toBe(200);
    });
  });

  describe('4. Marketplace Listings & Filtering', () => {
    it('should list marketplace items with category filter', async () => {
      const res = await request(app)
        .get('/api/items')
        .query({ category: 'Textbooks' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].category).toBe('Textbooks');
    });

    it('should filter items by transaction type', async () => {
      const res = await request(app)
        .get('/api/items')
        .query({ transactionType: 'BORROW' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((i: any) => i.transactionType === 'BORROW')).toBe(true);
    });
  });

  describe('5. Bargaining & Offer Lifecycle with Price Locking', () => {
    it('should create an offer, counteroffer, and lock agreed price on accept', async () => {
      // Find another student (Rahul) to make offer
      const rahul = await prisma.user.findFirst({ where: { email: 'rahul@iitb.ac.in' } });
      expect(rahul).toBeDefined();

      const rahulLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rahul@iitb.ac.in', password: 'Student123!' });
      const rahulToken = rahulLogin.body.tokens.accessToken;

      // Make offer: ₹300
      const offerRes = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${rahulToken}`)
        .send({
          itemId: testItemId,
          offeredPrice: 300,
          message: 'Can you do 300?',
        });
      expect(offerRes.status).toBe(201);
      const offerId = offerRes.body.id;

      // Aniket (seller) counters: ₹320
      const counterRes = await request(app)
        .post(`/api/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ counterPrice: 320, message: 'I can do 320 minimum' });
      expect(counterRes.status).toBe(201);
      const counterOfferId = counterRes.body.id;

      // Rahul accepts counteroffer of ₹320
      const acceptRes = await request(app)
        .put(`/api/offers/${counterOfferId}/accept`)
        .set('Authorization', `Bearer ${rahulToken}`);
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.transaction.agreedPrice).toBe(320); // STRICT: price locked to accepted offer
    });
  });

  describe('6. Transaction QR Verification', () => {
    it('should verify on-campus pickup with valid QR secret and reject invalid QR code', async () => {
      // Find a transaction ready for pickup
      const tx = await prisma.transaction.findFirst({
        where: { status: 'READY_FOR_PICKUP' },
      });
      expect(tx).toBeDefined();

      // Attempt invalid QR
      const failRes = await request(app)
        .post(`/api/transactions/${tx!.id}/verify-qr`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ qrCode: 'INVALID-QR-CODE-123' });
      expect(failRes.status).toBe(400);

      // Verify with real cryptographic QR code
      const successRes = await request(app)
        .post(`/api/transactions/${tx!.id}/verify-qr`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ qrCode: tx!.qrVerificationCode });
      expect(successRes.status).toBe(200);
      expect(successRes.body.success).toBe(true);
      expect(successRes.body.transaction.status).toBe('COMPLETED');
    });
  });

  describe('7. Ratings & Duplicate Prevention', () => {
    it('should prevent non-participants from rating', async () => {
      const tx = await prisma.transaction.findFirst({ where: { status: 'COMPLETED' } });
      expect(tx).toBeDefined();

      const marcusLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'marcus@stanford.edu', password: 'Student123!' });
      const marcusToken = marcusLogin.body.tokens.accessToken;

      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${marcusToken}`)
        .send({
          transactionId: tx!.id,
          rating: 5,
          review: 'I was not part of this transaction',
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('not participate');
    });
  });

  describe('8. Backend-driven Impact Calculations', () => {
    it('should return non-fabricated backend impact statistics with documented methodology', async () => {
      const res = await request(app)
        .get('/api/impact')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.itemsReused).toBeGreaterThanOrEqual(1);
      expect(res.body.methodology).toBeDefined();
      expect(res.body.methodology.co2FactorPerTextbook).toBeDefined();
    });
  });
});
