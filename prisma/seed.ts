import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Resetting CampusLoop database for MIT CSN (mit.asia)...');

  // 1. Clean existing data safely in reverse dependency order
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

  // 2. Create Single College: MIT CSN
  const mitCsn = await prisma.college.create({
    data: {
      name: 'MIT CSN',
      code: 'MIT_CSN',
      emailDomain: 'mit.asia',
      address: 'MIT CSN Campus, Beed Bypass Road',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      country: 'India',
      contactPerson: 'Dr. S. K. Patil',
      contactEmail: 'admin@mit.asia',
      contactPhone: '+91 240 237 5000',
      adminName: 'Prof. A. R. Kulkarni',
      status: 'ACTIVE',
      subscriptionPlan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      circularityScore: 94.5,
      studentCount: 3200,
      listingCount: 6,
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

  // 4. Create MIT CSN College Admin
  const mitAdmin = await prisma.user.create({
    data: {
      name: 'MIT CSN Campus Admin',
      email: 'admin@mit.asia',
      passwordHash: collegeAdminHash,
      role: 'COLLEGE_ADMIN',
      collegeId: mitCsn.id,
      verificationStatus: 'VERIFIED',
      trustRating: 5.0,
    },
  });

  await prisma.collegeAdmin.create({
    data: {
      userId: mitAdmin.id,
      collegeId: mitCsn.id,
      assignedBy: superAdmin.id,
    },
  });

  // 5. Create Students with @mit.asia domain
  const aniket = await prisma.user.create({
    data: {
      name: 'Aniket Sharma',
      email: 'aniket@mit.asia',
      passwordHash: studentHash,
      role: 'STUDENT',
      collegeId: mitCsn.id,
      department: 'Computer Science & Engineering',
      rollNumber: 'MIT-CSN-2022-045',
      academicYear: 'Senior (4th Year)',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      trustRating: 4.9,
      totalTransactions: 18,
      co2SavedKg: 48.5,
      moneySavedUsd: 410.0,
      itemsCirculated: 14,
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@mit.asia',
      passwordHash: studentHash,
      role: 'STUDENT',
      collegeId: mitCsn.id,
      department: 'Electrical Engineering',
      rollNumber: 'MIT-CSN-2023-112',
      academicYear: 'Junior (3rd Year)',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      trustRating: 4.8,
      totalTransactions: 11,
      co2SavedKg: 32.0,
      moneySavedUsd: 260.0,
      itemsCirculated: 8,
    },
  });

  const rahul = await prisma.user.create({
    data: {
      name: 'Rahul Verma',
      email: 'rahul@mit.asia',
      passwordHash: studentHash,
      role: 'STUDENT',
      collegeId: mitCsn.id,
      department: 'Mechanical Engineering',
      rollNumber: 'MIT-CSN-2024-088',
      academicYear: 'Sophomore (2nd Year)',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      trustRating: 5.0,
      totalTransactions: 4,
      co2SavedKg: 12.5,
      moneySavedUsd: 95.0,
      itemsCirculated: 3,
    },
  });

  // 6. Create MIT CSN Campus Pickup Safe Hubs
  const hubMainGate = await prisma.pickupLocation.create({
    data: {
      collegeId: mitCsn.id,
      name: 'MIT CSN Main Gate Security Post',
      building: 'MIT CSN Main Entrance Arch',
      description: 'Right beside the Security Information Desk at the Main Gate on Beed Bypass Road.',
      operatingHours: '24/7 (Recommended: 8:00 AM - 8:30 PM)',
      safetyTips: 'Under 24/7 CCTV surveillance and security guard attendance.',
      isDefault: true,
      status: 'ACTIVE',
    },
  });

  const hubLibrary = await prisma.pickupLocation.create({
    data: {
      collegeId: mitCsn.id,
      name: 'MIT CSN Central Library Ground Floor',
      building: 'Central Knowledge & Library Building',
      description: 'Reference section circulation lobby near the digital catalog terminal.',
      operatingHours: '8:00 AM - 10:00 PM',
      safetyTips: 'Quiet, high-visibility academic space with dedicated indoor seating.',
      isDefault: false,
      status: 'ACTIVE',
    },
  });

  const hubCseBlock = await prisma.pickupLocation.create({
    data: {
      collegeId: mitCsn.id,
      name: 'Computer Science & Engineering Block Atrium',
      building: 'Department of CSE & IT Quad',
      description: 'Central open-air atrium near Lab 4 and the department bulletin board.',
      operatingHours: '8:00 AM - 7:00 PM',
      safetyTips: 'Active engineering student hub with campus Wi-Fi coverage.',
      isDefault: false,
      status: 'ACTIVE',
    },
  });

  const hubCafeteria = await prisma.pickupLocation.create({
    data: {
      collegeId: mitCsn.id,
      name: 'Campus Cafeteria Student Hub',
      building: 'Student Amenities & Dining Complex',
      description: 'Designated CampusLoop circular table near the cafeteria entrance.',
      operatingHours: '8:30 AM - 9:00 PM',
      safetyTips: 'Well-lit dining plaza with high student foot traffic.',
      isDefault: false,
      status: 'ACTIVE',
    },
  });

  // 7. Create Marketplace Items across BUY, SELL, BORROW, EXCHANGE, DONATE, DIGITAL
  // Item 1: SELL (Textbook)
  const itemBook = await prisma.item.create({
    data: {
      title: 'Engineering Mechanics (Statics & Dynamics 14th Ed)',
      description: 'Official textbook for ME 101. Zero missing pages, highlighted chapters on truss analysis and friction. Essential for 1st & 2nd year engineering students at MIT CSN.',
      category: 'Books',
      condition: 'Like New',
      price: 350.0,
      transactionType: 'SELL',
      courseCode: 'ME 101',
      collegeId: mitCsn.id,
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

  // Item 2: SELL (Calculator)
  const itemCalc = await prisma.item.create({
    data: {
      title: 'TI-84 Plus CE Graphing Calculator',
      description: 'High-resolution color screen, rechargeable battery included. Excellent for Linear Algebra, Calculus, and Signal Processing.',
      category: 'Calculators',
      condition: 'Good',
      price: 1200.0,
      transactionType: 'SELL',
      courseCode: 'MATH 51',
      collegeId: mitCsn.id,
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

  // Item 3: BORROW (Lab Kit)
  const itemBorrowKit = await prisma.item.create({
    data: {
      title: 'Arduino Uno Rev 3 & Sensor Experimentation Kit',
      description: 'Full microcontroller kit with breadboard, ultrasonic sensor, servo motors and jumper wires for semester lab projects.',
      category: 'Lab Components',
      condition: 'Like New',
      price: 150.0,
      transactionType: 'BORROW',
      maxBorrowDays: 14,
      courseCode: 'EE 108',
      collegeId: mitCsn.id,
      sellerId: priya.id,
      pickupLocationId: hubCseBlock.id,
      pickupLocationName: hubCseBlock.name,
      isAvailable: true,
      status: 'ACTIVE',
    },
  });
  await prisma.itemImage.create({
    data: { itemId: itemBorrowKit.id, url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76', order: 0 },
  });

  // Item 4: EXCHANGE (Electronics)
  const itemExchangePi = await prisma.item.create({
    data: {
      title: 'Raspberry Pi 4 Model B (4GB RAM)',
      description: 'Works perfectly in aluminum heatsink case with 32GB MicroSD. Looking to exchange for FPGA development board or STM32 kit.',
      category: 'Electronics',
      condition: 'Excellent',
      price: 0.0,
      transactionType: 'EXCHANGE',
      exchangePreferences: 'Basys 3 FPGA Board or STM32 Discovery kit',
      collegeId: mitCsn.id,
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

  // Item 5: DONATE (Drawing Kit - Free)
  const itemDonateTSquare = await prisma.item.create({
    data: {
      title: 'Architectural Drafting T-Square & Acrylic Set Triangles',
      description: 'Graduating senior donating drafting tools. Free to any 1st year MIT CSN engineering student in need.',
      category: 'Drawing Kits',
      condition: 'Good',
      price: 0.0,
      transactionType: 'DONATE',
      courseCode: 'ARCH 101',
      collegeId: mitCsn.id,
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

  // Item 6: DIGITAL (Course Access)
  const itemDigitalCourse = await prisma.item.create({
    data: {
      title: 'Pearson MyLab Engineering Official Access Voucher',
      description: 'Transferable voucher code for Mechanics course portal. Valid through end of academic year.',
      category: 'Digital Courses',
      condition: 'New',
      price: 499.0,
      transactionType: 'SELL',
      isDigital: true,
      digitalProvider: 'Pearson MyLab',
      courseCode: 'ME 201',
      collegeId: mitCsn.id,
      sellerId: priya.id,
      pickupLocationId: hubCafeteria.id,
      pickupLocationName: hubCafeteria.name,
      isAvailable: true,
      status: 'ACTIVE',
    },
  });
  await prisma.itemImage.create({
    data: { itemId: itemDigitalCourse.id, url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3', order: 0 },
  });

  // 8. Create Conversation and Messages between Rahul and Aniket
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
      text: 'Yes Rahul! I have it with me. Can meet at the MIT CSN Central Library Ground Floor today.',
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
      message: 'Would you accept ₹280 for campus pickup today at the Central Library?',
      status: 'ACCEPTED',
      createdAt: new Date(Date.now() - 2500 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: convo.id,
      senderId: rahul.id,
      text: 'Proposed an offer: ₹280.00 - "Would you accept ₹280 for campus pickup today at the Central Library?"',
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
  // Transaction 1: Ready for Pickup (Rahul & Aniket)
  await prisma.transaction.create({
    data: {
      itemId: itemBook.id,
      buyerId: rahul.id,
      sellerId: aniket.id,
      collegeId: mitCsn.id,
      transactionType: 'SELL',
      agreedPrice: 280.0,
      status: 'READY_FOR_PICKUP',
      pickupLocationId: hubLibrary.id,
      pickupLocationName: hubLibrary.name,
      pickupScheduledAt: new Date(Date.now() + 2 * 3600 * 1000),
      qrVerificationCode: 'CL-MIT-TX01-7788',
    },
  });

  // Transaction 2: Completed Borrow (Priya & Aniket)
  await prisma.transaction.create({
    data: {
      itemId: itemBorrowKit.id,
      buyerId: aniket.id,
      sellerId: priya.id,
      collegeId: mitCsn.id,
      transactionType: 'BORROW',
      agreedPrice: 150.0,
      status: 'COMPLETED',
      pickupLocationId: hubCseBlock.id,
      pickupLocationName: hubCseBlock.name,
      borrowStartDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
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
      collegeId: mitCsn.id,
      transactionType: 'SELL',
      agreedPrice: 1100.0,
      status: 'RATED',
      pickupLocationId: hubMainGate.id,
      pickupLocationName: hubMainGate.name,
      completedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
  });

  await prisma.rating.create({
    data: {
      transactionId: tx3.id,
      raterId: aniket.id,
      rateeId: priya.id,
      rating: 5.0,
      review: 'Calculator was in mint condition with fresh batteries. Priya was right on time at the MIT CSN Main Gate!',
    },
  });

  // 11. Create Subscriptions & Revenue for MIT CSN
  await prisma.subscription.create({
    data: {
      collegeId: mitCsn.id,
      plan: 'PREMIUM',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 305 * 24 * 3600 * 1000),
      amount: 99999.0,
      billingCycle: 'ANNUAL',
    },
  });

  await prisma.revenue.createMany({
    data: [
      {
        collegeId: mitCsn.id,
        source: 'SUBSCRIPTION',
        amount: 99999.0,
        description: 'Annual Campus Enterprise Subscription - MIT CSN',
        createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      },
      {
        collegeId: mitCsn.id,
        source: 'TRANSACTION_FEE',
        amount: 35.0,
        description: 'Circulation Service Processing Fee (Tx #tx_mit_01)',
        createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      },
    ],
  });

  // 12. Create Announcements / Notifications
  await prisma.notification.create({
    data: {
      collegeId: mitCsn.id,
      title: 'Welcome to MIT CSN CampusLoop Circular Exchange',
      message: 'Verified campus pickup safe locations are now active at the Main Gate, Central Library, and CSE Block.',
      targetAudience: 'COLLEGE',
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  // 13. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        role: 'SUPER_ADMIN',
        action: 'COLLEGE_CREATED',
        entityType: 'College',
        entityId: mitCsn.id,
        metadata: { name: mitCsn.name, code: mitCsn.code, emailDomain: mitCsn.emailDomain },
        timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      },
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        role: 'SUPER_ADMIN',
        action: 'ADMIN_CREATED',
        entityType: 'CollegeAdmin',
        entityId: mitAdmin.id,
        metadata: { email: mitAdmin.email, college: mitCsn.name },
        timestamp: new Date(Date.now() - 29 * 24 * 3600 * 1000),
      },
    ],
  });

  console.log('MIT CSN Seeding completed successfully!');
  console.log('Credentials:');
  console.log('Super Admin:    superadmin@campusloop.in / SuperAdmin123!');
  console.log('MIT CSN Admin:  admin@mit.asia / CollegeAdmin123!');
  console.log('Student 1:      aniket@mit.asia / Student123!');
  console.log('Student 2:      priya@mit.asia / Student123!');
  console.log('Student 3:      rahul@mit.asia / Student123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
