/**
 * Tournament Data Cleanup Script
 * 
 * This script deletes all tournament-related data from the database.
 * It removes data from:
 * - tournament_matches
 * - tournament_participants  
 * - tournaments
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = process.env.DB_PATH || './pong.db';

async function cleanupTournaments() {
  console.log('Starting tournament data cleanup...');
  console.log('Database path:', dbPath);

  let db;
  try {
    // Initialize database connection
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    console.log('Database connection established');

    // Check current tournament data
    console.log('\n=== Current Tournament Data ===');
    
    const tournamentCount = db.prepare('SELECT COUNT(*) as count FROM tournaments').get();
    console.log(`Tournaments: ${tournamentCount.count}`);

    const participantCount = db.prepare('SELECT COUNT(*) as count FROM tournament_participants').get();
    console.log(`Tournament Participants: ${participantCount.count}`);

    const matchCount = db.prepare('SELECT COUNT(*) as count FROM tournament_matches').get();
    console.log(`Tournament Matches: ${matchCount.count}`);

    if (tournamentCount.count === 0) {
      console.log('\nNo tournament data found. Nothing to clean up.');
      return;
    }

    // Show tournament details before deletion
    console.log('\n=== Tournament Details ===');
    const tournaments = db.prepare('SELECT id, name, status, created_at FROM tournaments ORDER BY id').all();
    tournaments.forEach(t => {
      console.log(`ID: ${t.id}, Name: "${t.name}", Status: ${t.status}, Created: ${t.created_at}`);
    });

    // Confirm deletion
    console.log('\n=== Starting Deletion ===');
    
    // Delete in order to respect foreign key constraints
    // 1. Delete tournament matches first
    const deletedMatches = db.prepare('DELETE FROM tournament_matches').run();
    console.log(`Deleted ${deletedMatches.changes} tournament matches`);

    // 2. Delete tournament participants
    const deletedParticipants = db.prepare('DELETE FROM tournament_participants').run();
    console.log(`Deleted ${deletedParticipants.changes} tournament participants`);

    // 3. Delete tournaments
    const deletedTournaments = db.prepare('DELETE FROM tournaments').run();
    console.log(`Deleted ${deletedTournaments.changes} tournaments`);

    // Verify deletion
    console.log('\n=== Verification ===');
    const finalTournamentCount = db.prepare('SELECT COUNT(*) as count FROM tournaments').get();
    const finalParticipantCount = db.prepare('SELECT COUNT(*) as count FROM tournament_participants').get();
    const finalMatchCount = db.prepare('SELECT COUNT(*) as count FROM tournament_matches').get();

    console.log(`Final count - Tournaments: ${finalTournamentCount.count}`);
    console.log(`Final count - Participants: ${finalParticipantCount.count}`);
    console.log(`Final count - Matches: ${finalMatchCount.count}`);

    if (finalTournamentCount.count === 0 && finalParticipantCount.count === 0 && finalMatchCount.count === 0) {
      console.log('\n✅ Tournament data cleanup completed successfully!');
    } else {
      console.log('\n❌ Some tournament data may still remain. Please check manually.');
    }

  } catch (error) {
    console.error('Error during tournament cleanup:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
      console.log('Database connection closed');
    }
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupTournaments()
    .then(() => {
      console.log('Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTournaments };

