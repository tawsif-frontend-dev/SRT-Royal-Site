require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../server/models/User');

async function main() {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must all be set.');
  }
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
  }

  const email = ADMIN_EMAIL.trim().toLowerCase();
  await mongoose.connect(MONGODB_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    if (process.argv.includes('--promote-existing')) {
      existing.role = 'admin';
      existing.isActive = true;
      await existing.save();
      console.log(`Existing account promoted to admin: ${email}`);
    } else {
      throw new Error('An account with this email already exists. Re-run with --promote-existing only after confirming that this is the intended account.');
    }
  } else {
    await User.create({
      name: ADMIN_NAME.trim(),
      email,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'admin',
    });
    console.log(`Admin account created: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(`Admin setup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
