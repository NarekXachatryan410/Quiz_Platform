const { User } = require("./models");
const sessionLoader = require('./utils/sessionLoader');
const bcrypt = require('bcrypt');

(async () => {
  try {
    // Load and validate session template
    await sessionLoader.loadSessionTemplate();
    
    // Create admin account
    const adminUsername = 'quizadmin';
    const adminPassword = 'admin123';
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { username: adminUsername } });
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists');
      console.log('📝 Login Credentials:');
      console.log(`   Username: ${adminUsername}`);
      console.log(`   Password: ${adminPassword}`);
      return;
    }
    
    const admin = await User.create({
      username: adminUsername,
      password: await bcrypt.hash(adminPassword, 10)
    });

    console.log('✅ Admin account created successfully!');
    console.log('');
    console.log('📝 Login Credentials:');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');
    console.log('🌐 Use these credentials to log in to the admin panel');
  } catch (err) {
    console.error("❌ Error seeding database:", err.message);
    if (err.errors) {
      console.error("Validation errors:", err.errors);
    }
  }
})();
