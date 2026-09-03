import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CampusLoop database...');

  // 1. Clean existing data safely
  await prisma.auditLog.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.request.deleteMany();
  await prisma.itemImage.deleteMany();
  await prisma.item.deleteMany();
  await prisma.pickupLocation.deleteMany();
  await prisma.collegeAdmin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.college.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const superAdminHash = await bcrypt.hash('SuperAdmin123!', salt);
  const collegeAdminHash = await bcrypt.hash('CollegeAdmin123!', salt);
  const studentHash = await bcrypt.hash('Student123!', salt);

  // 2. Create Colleges
  const iitb = await prisma.college.create({
    data: {
      name: 'Indian Institute of Technology Bombay',
      code: 'IITB',
      emailDomain: 'iitb.ac.in',
      address: 'Powai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      contactPerson: 'Dr. R. K. Sharma',
      contactEmail: 'campus.admin@iitb.ac.in',
      contactPhone: '+91 22 2576 7000',
      adminName: 'Prof. S. V. Joshi',
      status: 'ACTIVE',
      subscriptionPlan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      circularityScore: 88.5,
      studentCount: 1420,
      listingCount: 385,
    },
  });

  const stanford = await prisma.college.create({
    data: {
      name: 'Stanford University',
      code: 'STANFORD',
      emailDomain: 'stanford.edu',
      address: '450 Jane Stanford Way',
      city: 'Stanford',
      state: 'California',
      country: 'USA',
      contactPerson: 'Elena Rostova',
      contactEmail: 'sustainability@stanford.edu',
      contactPhone: '+1 650 723 2300',
      adminName: 'Dr. Michael Chang',
      status: 'ACTIVE',
      subscriptionPlan: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
      circularityScore: 92.0,
      studentCount: 2150,
      listingCount: 520,
    },
  });

  const du = await prisma.college.create({
    data: {
      name: 'University of Delhi',
      code: 'DU',
      emailDomain: 'du.ac.in',
      address: 'North Campus',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      contactPerson: 'P. N. Mathur',
      contactEmail: 'registrar@du.ac.in',
      contactPhone: '+91 11 2766 7011',
      adminName: 'Dr. Anita Gupta',
      status: 'ACTIVE',
      subscriptionPlan: 'STANDARD',
      subscriptionStatus: 'ACTIVE',
      circularityScore: 76.5,
      studentCount: 3400,
      listingCount: 410,
    },
  });

  // 3. Create Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: 'CampusLoop Super Administrator',
      email: 'superadmin@campusloop.in',
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      verificationStatus: 'VERIFIED',
      trustRating: 5.0,
    },
  });

  // 4. Create College Admins
  const iitbAdmin = await prisma.user.create({
    data: {
      name: 'IIT Bombay Campus Admin',
      email: 'admin.iitb@campusloop.in',
      passwordHash: collegeAdminHash,
      role: 'COLLEGE_ADMIN',
      collegeId: iitb.id,
      verificationStatus: 'VERIFIED',
      trustRating: 5.0,
    },
  });

  await prisma.collegeAdmin.create({
    data: {
      userId: iitbAdmin.id,
      collegeId: iitb.id,
      assignedBy: superAdmin.id,
    },
  });

  const stanfordAdmin = await prisma.user.create({
    data: {
      name: 'Stanford Campus Admin',
      email: 'admin.stanford@campusloop.in',
      passwordHash: collegeAdminHash,
      role: 'COLLEGE_ADMIN',
      collegeId: stanford.id,
      verificationStatus: 'VERIFIED',
      trustRating: 5.0,
    },
  });

  await prisma.collegeAdmin.create({
    data: {
      userId: stanfordAdmin.id,
      collegeId: stanford.id,
      assignedBy: superAdmin.id,
    },
  });

  // 5. Create Students
  const aniket = await prisma.user.create({
    data: {
      name: 'Aniket Sharma',
      email: 'aniket@iitb.ac.in',
      passwordHash: studentHash,
      role: 'STUDENT',
      collegeId: iitb.id,
      department: 'Computer Science & Engineering',
      rollNumber: '210050012',
      academicYear: 'Senior (4th Year)',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      trustRating: 4.9,
      totalTransactions: 16,
      co2SavedKg: 42.5,
      moneySavedUsd: 380.0,
      itemsCirculated: 12,
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@iitb.ac.in',
      passwordHash: studentHash,
      role: 'STUDENT',
      collegeId: iitb.id,
      department: 'Electrical Engineering',
      rollNumber: '220070045',
      academicYear: 'Junior (3rd Year)',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      trustRating: 4.8,
      totalTransactions: 9,
      co2SavedKg: 28.0,
      moneySavedUsd: 210.0,
      itemsCirculated: 7,
    },
  });

  const rahul = await prisma.user.create({
    data: {
      name: 'Rahul Verma',
      email: 'rahul@iitb.ac.in',
      passwordHash: studentHash,
      role: 'STUDENT',
      collegeId: iitb.id,
      department: 'Mechanical Engineering',
      rollNumber: '230100088',
      academicYear: 'Sophomore (2nd Year)',
      verificationStatus: 'ID_PENDING',
      verificationNote: 'Student ID card submitted for batch 2023',
      trustRating: 5.0,
      totalTransactions: 2,
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: 'Marcus Chen',
      email: 'marcus@stanford.edu',
      passwordHash: studentHash,
      role: 'STUDENT',
      collegeId: stanford.id,
      department: 'Electrical & Computer Engineering',
      rollNumber: 'ST-99482',
      academicYear: 'Senior (4th Year)',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      trustRating: 5.0,
      totalTransactions: 14,
      co2SavedKg: 54.0,
      moneySavedUsd: 490.0,
      itemsCirculated: 11,
    },
  });

  const sophia = await prisma.user.create({
    data: {
      name: 'Sophia Patel',
      email: 'sophia@stanford.edu',
      passwordHash: studentHash,
      role: 'STUDENT',
      collegeId: stanford.id,
      department: 'Bioengineering',
      rollNumber: 'ST-88192',
      academicYear: 'Junior (3rd Year)',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      trustRating: 4.9,
      totalTransactions: 8,
      co2SavedKg: 22.0,
      moneySavedUsd: 195.0,
      itemsCirculated: 6,
    },
  });

  // 6. Create Campus Pickup Hubs
  const hubMainGate = await prisma.pickupLocation.create({
    data: {
      collegeId: iitb.id,
      name: 'Main Gate Security Hub',
      building: 'IIT Bombay Main Entrance Gate',
      description: 'Right beside the Security Information Desk at the Main Gate.',
      operatingHours: '24/7 (Recommended: 8:00 AM - 9:00 PM)',
      safetyTips: 'Well-lit area under campus security camera coverage.',
      isDefault: true,
      status: 'ACTIVE',
    },
  });

  const hubLibrary = await prisma.pickupLocation.create({
    data: {
      collegeId: iitb.id,
      name: 'Central Library Lounge',
      building: 'Central University Library',
      description: '1st Floor Study Lounge near the Reference Circulation Counter.',
      operatingHours: '8:00 AM - 11:00 PM',
      safetyTips: 'Quiet high-traffic study area with secure indoor seating.',
      isDefault: false,
      status: 'ACTIVE',
    },
  });

  const hubHostelQuad = await prisma.pickupLocation.create({
    data: {
      collegeId: iitb.id,
      name: 'Hostel 12 Central Quad',
      building: 'Hostel Complex Quadrangle',
      description: 'Benches near the student activity center and cafeteria.',
      operatingHours: '9:00 AM - 10:00 PM',
      safetyTips: 'Popular open public quad for evening handoffs.',
      isDefault: false,
      status: 'ACTIVE',
    },
  });

  const hubStanfordQuad = await prisma.pickupLocation.create({
    data: {
      collegeId: stanford.id,
      name: 'Engineering Quad Bench A',
      building: 'Packard Electrical Engineering Quad',
      description: 'Outdoor benches near the Packard Quad fountain and cafe.',
      operatingHours: '8:00 AM - 8:00 PM',
      safetyTips: 'High-visibility campus quad with campus safety escort available.',
      isDefault: true,
      status: 'ACTIVE',
    },
  });

  // 7. Create Marketplace Items across BUY, SELL, BORROW, EXCHANGE, DONATE, DIGITAL
  const itemBook = await prisma.item.create({
    data: {
      title: 'Engineering Mechanics (Statics & Dynamics 14th Ed)',
      description: 'Official textbook for ME 101. Zero missing pages, highlighted chapters on truss analysis and friction.',
      category: 'Textbooks',
      condition: 'Like New',
      price: 350.0,
      transactionType: 'SELL',
      courseCode: 'ME 101',
      collegeId: iitb.id,
      sellerId: aniket.id,
      pickupLocationId: hubLibrary.id,
      pickupLocationName: hubLibrary.name,
      isAvailable: true,
      isRecommended: true,
      status: 'ACTIVE',
    },
  });
  await prisma.itemImage.create({
    data: { itemId: itemBook.id, url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c', order: 0 },
  });

  const itemCalc = await prisma.item.create({
    data: {
      title: 'TI-84 Plus CE Graphing Calculator',
      description: 'Color screen, rechargeable battery included. Excellent for Linear Algebra, Calculus and Signal Processing.',
      category: 'Electronics',
      condition: 'Good',
      price: 1200.0,
      transactionType: 'SELL',
      collegeId: iitb.id,
      sellerId: priya.id,
      pickupLocationId: hubMainGate.id,
      pickupLocationName: hubMainGate.name,
      isAvailable: true,
      isRecommended: true,
      status: 'ACTIVE',
    },
  });
  await prisma.itemImage.create({
    data: { itemId: itemCalc.id, url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd', order: 0 },
  });

  const itemBorrowKit = await prisma.item.create({
    data: {
      title: 'Arduino Uno Rev 3 & Sensor Experimentation Kit',
      description: 'Full microcontroller kit with breadboard, ultrasonic sensor, motors and jumper wires for semester lab project.',
      category: 'Lab Equipment',
      condition: 'Like New',
      price: 150.0,
      transactionType: 'BORROW',
      maxBorrowDays: 14,
      collegeId: iitb.id,
      sellerId: priya.id,
      pickupLocationId: hubHostelQuad.id,
      pickupLocationName: hubHostelQuad.name,
      isAvailable: true,
      status: 'ACTIVE',
    },
  });
  await prisma.itemImage.create({
    data: { itemId: itemBorrowKit.id, url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76', order: 0 },
  });

  const itemExchangePi = await prisma.item.create({
    data: {
      title: 'Raspberry Pi 4 Model B (4GB RAM)',
      description: 'Works perfectly in aluminum heatsink case with 32GB MicroSD. Looking to exchange for FPGA development board.',
      category: 'Electronics',
      condition: 'Excellent',
      price: 0.0,
      transactionType: 'EXCHANGE',
      exchangePreferences: 'Basys 3 FPGA Board or STM32 Discovery kit',
      collegeId: iitb.id,
      sellerId: aniket.id,
      pickupLocationId: hubLibrary.id,
      pickupLocationName: hubLibrary.name,
      isAvailable: true,
      status: 'ACTIVE',
    },
  });
  await prisma.itemImage.create({
    data: { itemId: itemExchangePi.id, url: 'https://images.unsplash.com/photo-1517055729441-db3a681329a2', order: 0 },
  });

  const itemDonateTSquare = await prisma.item.create({
    data: {
      title: 'Architectural Drafting T-Square & Acrylic Set Triangles',
      description: 'Graduating senior donating drafting tools. Passing on to 1st year engineering student.',
      category: 'Notes & Study Material',
      condition: 'Good',
      price: 0.0,
      transactionType: 'DONATE',
      collegeId: iitb.id,
      sellerId: aniket.id,
      pickupLocationId: hubMainGate.id,
      pickupLocationName: hubMainGate.name,
      isAvailable: true,
      status: 'ACTIVE',
    },
  });
  await prisma.itemImage.create({
    data: { itemId: itemDonateTSquare.id, url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e', order: 0 },
  });

  const itemDigitalCourse = await prisma.item.create({
    data: {
      title: 'Pearson MyLab Engineering Official Access Voucher',
      description: 'Officially transferable voucher code for Mechanics course portal. Valid through end of academic year.',
      category: 'Digital Courses',
      condition: 'New',
      price: 499.0,
      transactionType: 'SELL',
      isDigital: true,
      digitalProvider: 'Pearson MyLab',
      courseCode: 'ME 201',
      collegeId: iitb.id,
      sellerId: priya.id,
      isAvailable: true,
      status: 'ACTIVE',
    },
  });
  await prisma.itemImage.create({
    data: { itemId: itemDigitalCourse.id, url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3', order: 0 },
  });

  // 8. Create Conversation and Messages
  const convo = await prisma.conversation.create({
    data: {
      itemId: itemBook.id,
      participantAId: rahul.id, // Buyer
      participantBId: aniket.id, // Seller
    },
  });

  await prisma.message.create({
    data: {
      conversationId: convo.id,
      senderId: rahul.id,
      text: 'Hi Aniket! Is the ME 101 mechanics book still available for pickup at the Central Library?',
      type: 'TEXT',
      createdAt: new Date(Date.now() - 3600 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: convo.id,
      senderId: aniket.id,
      text: 'Yes Rahul! I have it with me. Can meet at the 1st floor study lounge today.',
      type: 'TEXT',
      createdAt: new Date(Date.now() - 3000 * 1000),
    },
  });

  // 9. Create Offer & Counteroffer flow
  const offer = await prisma.offer.create({
    data: {
      itemId: itemBook.id,
      conversationId: convo.id,
      buyerId: rahul.id,
      sellerId: aniket.id,
      originalPrice: 350.0,
      offeredPrice: 280.0,
      message: 'Would you accept ₹280 for campus pickup today?',
      status: 'ACCEPTED',
      createdAt: new Date(Date.now() - 2500 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: convo.id,
      senderId: rahul.id,
      text: 'Proposed an offer: ₹280.00 - "Would you accept ₹280 for campus pickup today?"',
      type: 'OFFER',
      metadata: { offerId: offer.id, offeredPrice: 280.0, status: 'ACCEPTED' },
      createdAt: new Date(Date.now() - 2500 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: convo.id,
      senderId: aniket.id,
      text: 'Offer ACCEPTED at ₹280.00! Transaction confirmed.',
      type: 'OFFER',
      metadata: { offerId: offer.id, agreedPrice: 280.0, status: 'ACCEPTED' },
      createdAt: new Date(Date.now() - 2000 * 1000),
    },
  });

  // 10. Create Active and Completed Transactions
  // Transaction 1: Agreed & Scheduled for Pickup (Rahul & Aniket)
  const tx1 = await prisma.transaction.create({
    data: {
      itemId: itemBook.id,
      buyerId: rahul.id,
      sellerId: aniket.id,
      collegeId: iitb.id,
      transactionType: 'SELL',
      agreedPrice: 280.0, // LOCKED to accepted offer price!
      status: 'READY_FOR_PICKUP',
      pickupLocationId: hubLibrary.id,
      pickupLocationName: hubLibrary.name,
      pickupScheduledAt: new Date(Date.now() + 2 * 3600 * 1000),
      qrVerificationCode: 'CL-TX1-994821AB084',
    },
  });

  // Transaction 2: Completed Borrow Transaction (Priya & Aniket)
  const tx2 = await prisma.transaction.create({
    data: {
      itemId: itemBorrowKit.id,
      buyerId: aniket.id,
      sellerId: priya.id,
      collegeId: iitb.id,
      transactionType: 'BORROW',
      agreedPrice: 150.0,
      status: 'COMPLETED',
      pickupLocationId: hubHostelQuad.id,
      pickupLocationName: hubHostelQuad.name,
      borrowStartDate: new Date(Date.now() - 12 * 24 * 3600 * 1000),
      expectedReturnDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      actualReturnDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
  });

  // Transaction 3: Rated completed transaction with review
  const tx3 = await prisma.transaction.create({
    data: {
      itemId: itemCalc.id,
      buyerId: aniket.id,
      sellerId: priya.id,
      collegeId: iitb.id,
      transactionType: 'SELL',
      agreedPrice: 1100.0,
      status: 'RATED',
      pickupLocationId: hubMainGate.id,
      pickupLocationName: hubMainGate.name,
      completedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
  });

  await prisma.rating.create({
    data: {
      transactionId: tx3.id,
      raterId: aniket.id,
      rateeId: priya.id,
      rating: 5.0,
      review: 'Calculator was in mint condition with fresh batteries. Priya was right on time at the Main Gate!',
    },
  });

  // 11. Create Sample Reports
  await prisma.report.create({
    data: {
      reporterId: rahul.id,
      reportedUserId: priya.id,
      listingId: itemCalc.id,
      reason: 'Transaction dispute inquiry',
      description: 'Minor dispute regarding battery charging cable resolved amicably.',
      status: 'RESOLVED',
      priority: 'LOW',
      notes: 'Both students verified exchange completed.',
      resolvedById: iitbAdmin.id,
      resolvedAt: new Date(),
    },
  });

  // 12. Create Subscriptions
  await prisma.subscription.create({
    data: {
      collegeId: iitb.id,
      plan: 'PREMIUM',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 305 * 24 * 3600 * 1000),
      amount: 99999.0,
      billingCycle: 'ANNUAL',
    },
  });

  await prisma.subscription.create({
    data: {
      collegeId: stanford.id,
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 90 * 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 275 * 24 * 3600 * 1000),
      amount: 149999.0,
      billingCycle: 'ANNUAL',
    },
  });

  // 13. Create Revenue records
  await prisma.revenue.createMany({
    data: [
      {
        collegeId: iitb.id,
        source: 'SUBSCRIPTION',
        amount: 99999.0,
        description: 'Annual Campus Enterprise Subscription - IIT Bombay',
        createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      },
      {
        collegeId: stanford.id,
        source: 'SUBSCRIPTION',
        amount: 149999.0,
        description: 'Annual Campus Sustainability Partner License - Stanford University',
        createdAt: new Date(Date.now() - 90 * 24 * 3600 * 1000),
      },
      {
        collegeId: iitb.id,
        source: 'TRANSACTION_FEE',
        amount: 35.0,
        description: 'Circulation Service Processing Fee (Tx #tx_001)',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      },
      {
        collegeId: iitb.id,
        source: 'PARTNERSHIP',
        amount: 25000.0,
        description: 'Campus Bookstore Circular Sponsorship Grant',
        createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
      },
    ],
  });

  // 14. Create Notifications / Announcements
  await prisma.notification.create({
    data: {
      title: 'Welcome to CampusLoop Fall 2026 Circular Exchange',
      message: 'Verified campus pickup locations are now live across all quads and central libraries.',
      targetAudience: 'ALL',
      status: 'SENT',
      sentAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      collegeId: iitb.id,
      title: 'IIT Bombay Library Pickups Active',
      message: 'Central Library 1st Floor Study Lounge is the designated safety hub for all academic textbook handoffs.',
      targetAudience: 'COLLEGE',
      status: 'SENT',
      sentAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
  });

  // 15. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        role: 'SUPER_ADMIN',
        action: 'COLLEGE_CREATED',
        entityType: 'College',
        entityId: iitb.id,
        metadata: { name: iitb.name, code: iitb.code },
        timestamp: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      },
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        role: 'SUPER_ADMIN',
        action: 'ADMIN_CREATED',
        entityType: 'CollegeAdmin',
        entityId: iitbAdmin.id,
        metadata: { email: iitbAdmin.email, college: iitb.name },
        timestamp: new Date(Date.now() - 59 * 24 * 3600 * 1000),
      },
      {
        adminId: iitbAdmin.id,
        adminName: iitbAdmin.name,
        role: 'COLLEGE_ADMIN',
        action: 'STUDENT_VERIFIED',
        entityType: 'User',
        entityId: aniket.id,
        metadata: { rollNumber: aniket.rollNumber, department: aniket.department },
        timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      },
      {
        adminId: iitbAdmin.id,
        adminName: iitbAdmin.name,
        role: 'COLLEGE_ADMIN',
        action: 'PICKUP_LOCATION_CREATED',
        entityType: 'PickupLocation',
        entityId: hubLibrary.id,
        metadata: { name: hubLibrary.name },
        timestamp: new Date(Date.now() - 25 * 24 * 3600 * 1000),
      },
    ],
  });

  console.log('Seeding completed successfully!');
  console.log('Credentials:');
  console.log('Super Admin: superadmin@campusloop.in / SuperAdmin123!');
  console.log('IITB Admin:  admin.iitb@campusloop.in / CollegeAdmin123!');
  console.log('Stanford Admin: admin.stanford@campusloop.in / CollegeAdmin123!');
  console.log('Student (Aniket): aniket@iitb.ac.in / Student123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
