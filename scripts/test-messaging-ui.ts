/**
 * Messaging System UI Test Script
 * 
 * This script tests the full messaging flow via API calls to verify
 * the backend is working correctly before manual UI testing.
 * 
 * Run with: npx tsx scripts/test-messaging-ui.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseAnonKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: unknown;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(message);
}

function logSuccess(test: string, data?: unknown) {
  results.push({ name: test, passed: true, data });
  console.log(`  ✅ ${test}`);
}

function logFailure(test: string, error: string) {
  results.push({ name: test, passed: false, error });
  console.log(`  ❌ ${test}: ${error}`);
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        MESSAGING SYSTEM UI TEST SCRIPT                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Login
  log('🔐 Authenticating...');
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'siriz04081@gmail.com',
    password: 'Test1234'
  });

  if (authError || !session) {
    console.error('Authentication failed:', authError?.message);
    return;
  }
  console.log(`   Logged in as: ${session.user.email}\n`);

  const userId = session.user.id;

  // Get tenant ID
  const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
  const tenantId = tenantData;
  log(`📋 Tenant ID: ${tenantId}\n`);

  // ============================================================
  // TEST 1: Check if contacts exist for testing
  // ============================================================
  log('TEST 1: Check for available contacts');
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, user_id')
    .eq('tenant_id', tenantId)
    .limit(5);

  if (contactsError) {
    logFailure('Fetch contacts', contactsError.message);
    return;
  }
  
  if (!contacts || contacts.length === 0) {
    logFailure('Check contacts', 'No contacts found. Please create contacts first.');
    return;
  }
  
  logSuccess('Found contacts', `${contacts.length} contacts available`);
  contacts.forEach((c, i) => {
    console.log(`     ${i + 1}. ${c.first_name} ${c.last_name} (${c.email || 'no email'})`);
  });

  // Use first contact for testing
  const testContact = contacts[0];
  log(`\n   Using contact: ${testContact.first_name} ${testContact.last_name}\n`);

  // ============================================================
  // TEST 2: Create a conversation with a contact
  // ============================================================
  log('TEST 2: Create conversation with contact');
  
  // Check for existing conversation
  const { data: existingParticipations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('contact_id', testContact.id);

  let testConversationId: string;

  if (existingParticipations && existingParticipations.length > 0) {
    testConversationId = existingParticipations[0].conversation_id;
    logSuccess('Found existing conversation', testConversationId.slice(0, 8));
  } else {
    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        type: 'direct',
        title: `${testContact.first_name} ${testContact.last_name}`
      })
      .select()
      .single();

    if (convError) {
      logFailure('Create conversation', convError.message);
      return;
    }
    testConversationId = newConv.id;
    logSuccess('Created conversation', testConversationId.slice(0, 8));

    // Add agent as participant
    const { error: agentPartError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: testConversationId,
        user_id: userId
      });

    if (agentPartError) {
      logFailure('Add agent participant', agentPartError.message);
    } else {
      logSuccess('Added agent as participant');
    }

    // Add contact as participant
    const { error: contactPartError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: testConversationId,
        contact_id: testContact.id
      });

    if (contactPartError) {
      logFailure('Add contact participant', contactPartError.message);
    } else {
      logSuccess('Added contact as participant');
    }
  }

  // ============================================================
  // TEST 3: Send test messages
  // ============================================================
  log('\nTEST 3: Send test messages');
  
  const testMessages = [
    `Hello ${testContact.first_name}! This is a test message.`,
    'How can I help you with your real estate needs today?',
    'I have some great listings I think you might be interested in.'
  ];

  for (let i = 0; i < testMessages.length; i++) {
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: testConversationId,
        sender_id: userId,
        content: testMessages[i],
        message_type: 'text'
      });

    if (msgError) {
      logFailure(`Send message ${i + 1}`, msgError.message);
    } else {
      logSuccess(`Message ${i + 1} sent`, testMessages[i].slice(0, 30) + '...');
    }
  }

  // ============================================================
  // TEST 4: Read messages back
  // ============================================================
  log('\nTEST 4: Read messages from conversation');
  
  const { data: messages, error: readError } = await supabase
    .from('messages')
    .select('id, content, sender_id, sent_at, message_type')
    .eq('conversation_id', testConversationId)
    .order('sent_at', { ascending: true });

  if (readError) {
    logFailure('Read messages', readError.message);
  } else {
    logSuccess('Read messages', `${messages?.length || 0} messages found`);
    messages?.slice(-3).forEach((m, i) => {
      console.log(`     ${i + 1}. "${m.content.slice(0, 40)}..." (${m.message_type})`);
    });
  }

  // ============================================================
  // TEST 5: Test typing indicators
  // ============================================================
  log('\nTEST 5: Test typing indicators');
  
  const { error: typingSetError } = await supabase
    .from('typing_indicators')
    .upsert({
      conversation_id: testConversationId,
      user_id: userId
    });

  if (typingSetError) {
    logFailure('Set typing indicator', typingSetError.message);
  } else {
    logSuccess('Typing indicator set');
  }

  // Read typing indicators
  const { data: typingData } = await supabase
    .from('typing_indicators')
    .select('user_id, started_at')
    .eq('conversation_id', testConversationId);

  logSuccess('Read typing indicators', `${typingData?.length || 0} active`);

  // Clear typing indicator
  const { error: typingClearError } = await supabase
    .from('typing_indicators')
    .delete()
    .eq('conversation_id', testConversationId)
    .eq('user_id', userId);

  if (typingClearError) {
    logFailure('Clear typing indicator', typingClearError.message);
  } else {
    logSuccess('Typing indicator cleared');
  }

  // ============================================================
  // TEST 6: Test read receipts
  // ============================================================
  log('\nTEST 6: Test read receipts');
  
  const { error: readReceiptError } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', testConversationId)
    .eq('user_id', userId);

  if (readReceiptError) {
    logFailure('Update read receipt', readReceiptError.message);
  } else {
    logSuccess('Read receipt updated');
  }

  // ============================================================
  // TEST 7: Test conversation listing
  // ============================================================
  log('\nTEST 7: List user conversations');
  
  const { data: userParticipations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  const conversationIds = userParticipations?.map(p => p.conversation_id) || [];
  
  if (conversationIds.length === 0) {
    logFailure('List conversations', 'No conversations found');
  } else {
    const { data: convos } = await supabase
      .from('conversations')
      .select('id, title, type, updated_at')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    logSuccess('List conversations', `${convos?.length || 0} conversations`);
    convos?.slice(0, 3).forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.title || 'Untitled'} (${c.type})`);
    });
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n════════════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n✅ ALL TESTS PASSED - Backend is ready for UI testing\n');
    console.log('📱 MANUAL UI TEST CHECKLIST:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('1. NAVIGATION');
    console.log('   [ ] Click "Messages" in sidebar → Messages page loads');
    console.log('   [ ] Page shows conversation list on left');
    console.log('   [ ] Empty state shows "Select a conversation" message\n');
    
    console.log('2. NEW CONVERSATION');
    console.log('   [ ] Click "New" button → Dialog opens');
    console.log('   [ ] Search contacts → Filters correctly');
    console.log('   [ ] Click contact → Creates conversation, navigates to it\n');
    
    console.log('3. CONVERSATION VIEW');
    console.log('   [ ] Select existing conversation → Messages load');
    console.log('   [ ] Messages show in chronological order');
    console.log('   [ ] Sender info displayed correctly\n');
    
    console.log('4. SEND MESSAGES');
    console.log('   [ ] Type message in input field');
    console.log('   [ ] Press Enter or click Send → Message appears');
    console.log('   [ ] Message persists after page refresh\n');
    
    console.log('5. FROM CONTACTS PAGE');
    console.log('   [ ] Go to Contacts page');
    console.log('   [ ] Click message icon on a contact');
    console.log('   [ ] Redirects to Messages with conversation open\n');
    
    console.log('6. MOBILE RESPONSIVE');
    console.log('   [ ] Resize to mobile width');
    console.log('   [ ] List/thread toggle works');
    console.log('   [ ] Back button returns to list\n');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Fix issues before UI testing\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }

  console.log('════════════════════════════════════════════════════════════════\n');
}

runTests().catch(console.error);
