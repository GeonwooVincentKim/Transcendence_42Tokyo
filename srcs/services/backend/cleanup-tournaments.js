/**
 * Tournament Cleanup Script
 * 
 * Clears all tournament-related data while preserving user information
 * Usage: node cleanup-tournaments.js
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'services', 'backend', 'pong.db');

console.log('🧹 Starting tournament data cleanup...');
console.log('📂 Database path:', dbPath);

try {
  // Open database connection
  const db = new Database(dbPath);
  
  console.log('✅ Database connection established');
  
  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  
  try {
    // Clear tournament-related tables in correct order (respecting foreign keys)
    console.log('🗑️  Deleting tournament brackets...');
    const bracketsDeleted = db.exec('DELETE FROM tournament_brackets');
    console.log(`   ✅ Cleared tournament_brackets`);
    
    console.log('🗑️  Deleting tournament matches...');
    const matchesDeleted = db.exec('DELETE FROM tournament_matches');
    console.log(`   ✅ Cleared tournament_matches`);
    
    console.log('🗑️  Deleting tournament participants...');
    const participantsDeleted = db.exec('DELETE FROM tournament_participants');
    console.log(`   ✅ Cleared tournament_participants`);
    
    console.log('🗑️  Deleting tournaments...');
    const tournamentsDeleted = db.exec('DELETE FROM tournaments');
    console.log(`   ✅ Cleared tournaments`);
    
    // Reset auto-increment counters
    console.log('🔄 Resetting auto-increment counters...');
    db.exec("DELETE FROM sqlite_sequence WHERE name='tournaments'");
    db.exec("DELETE FROM sqlite_sequence WHERE name='tournament_participants'");
    db.exec("DELETE FROM sqlite_sequence WHERE name='tournament_matches'");
    db.exec("DELETE FROM sqlite_sequence WHERE name='tournament_brackets'");
    console.log('   ✅ Auto-increment counters reset');
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('');
    console.log('✅ Tournament data cleanup completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - Tournament brackets: cleared');
    console.log('   - Tournament matches: cleared');
    console.log('   - Tournament participants: cleared');
    console.log('   - Tournaments: cleared');
    console.log('   - Users: preserved ✓');
    console.log('   - Game statistics: preserved ✓');
    console.log('');
    
    // Verify user data is intact
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`✓ Users table intact: ${userCount.count} users preserved`);
    
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    throw error;
  } finally {
    // Close database connection
    db.close();
    console.log('');
    console.log('📦 Database connection closed');
  }
  
} catch (error) {
  console.error('');
  console.error('❌ Error during tournament cleanup:');
  console.error(error);
  process.exit(1);
}

console.log('');
console.log('🎉 Cleanup process completed!');
console.log('💡 You can now restart the backend to clear in-memory game rooms:');
console.log('   docker-compose restart backend');

