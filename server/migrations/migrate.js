const db = require('../database');

async function migrate() {
  try {
    await db.initialize();
    await db.runMigrations();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
