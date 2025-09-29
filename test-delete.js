// Simple test to verify delete functionality
const { deleteTicket } = require('./server/routes/store.ts');

async function testDelete() {
  try {
    console.log('Testing delete functionality...');
    const result = await deleteTicket('test-id');
    console.log('Delete result:', result);
  } catch (error) {
    console.error('Delete error:', error);
  }
}

testDelete();
