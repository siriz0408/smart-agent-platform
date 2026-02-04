/**
 * Test Data Import Script
 * Seeds the database with realistic test data for Midwest Premier Realty brokerage
 * 
 * Usage: npx tsx scripts/seed-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Reference ID to UUID mapping
const refMap: Record<string, string> = {};

// Test credentials
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test1234';

async function signIn() {
  console.log(`\n🔐 Signing in as ${TEST_EMAIL}...`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  
  if (error) {
    console.error('Sign in error:', error.message);
    console.log('\nTrying to proceed with anonymous access...');
    return false;
  }
  
  console.log('✅ Signed in successfully');
  return true;
}

// Test Data
const CONTACTS = [
  { ref_id: 'MARCUS_CONTACT', first_name: 'Marcus', last_name: 'Johnson', email: 'marcus.johnson@email.com', phone: '(216) 555-1001', contact_type: 'buyer', status: 'active', company: 'Acme Manufacturing', tags: ['first-time-buyer', 'pre-approved', 'motivated', 'expecting-baby'], notes: 'Expecting first baby in 5 months. Very motivated. Pre-approved for $320K conventional.', source: 'website_form' },
  { ref_id: 'KEISHA_CONTACT', first_name: 'Keisha', last_name: 'Johnson', email: 'keisha.johnson@email.com', phone: '(216) 555-1002', contact_type: 'buyer', status: 'active', company: 'Cleveland Clinic', tags: ['first-time-buyer', 'pre-approved'], notes: "Marcus's wife. Works as RN. Decision maker on the home.", source: 'referral' },
  { ref_id: 'DAVID_CONTACT', first_name: 'David', last_name: 'Park', email: 'david.park@techcorp.com', phone: '(206) 555-2001', contact_type: 'buyer', status: 'active', company: 'TechCorp Inc', tags: ['relocation', 'cash-buyer', 'executive', 'fast-timeline'], notes: 'VP relocating from Seattle. Cash buyer. Needs to close in 6 weeks. Company relo package.', source: 'referral_partner' },
  { ref_id: 'JENNIFER_CONTACT', first_name: 'Jennifer', last_name: 'Martinez', email: 'jennifer.martinez.home@email.com', phone: '(216) 555-3001', contact_type: 'buyer', status: 'active', company: '', tags: ['divorce', 'emotional', 'first-solo-purchase', 'needs-patience'], notes: 'Recently divorced. Settlement funds coming. Needs to be out of marital home by March 1. Mom co-signing.', source: 'referral' },
  { ref_id: 'LINDA_CONTACT', first_name: 'Linda', last_name: 'Williams', email: 'linda.williams456@email.com', phone: '(216) 555-4001', contact_type: 'seller', status: 'active', company: 'Retired Teacher', tags: ['downsizer', 'empty-nester', '28-year-homeowner', 'dual-transaction', 'also-buying'], notes: 'Downsizing with husband Tom. Selling 4BR, buying smaller single-story.', source: 'sphere' },
  { ref_id: 'TOM_CONTACT', first_name: 'Tom', last_name: 'Williams', email: 'tom.williams456@email.com', phone: '(216) 555-4002', contact_type: 'seller', status: 'active', company: 'Retired Engineer', tags: ['downsizer', 'empty-nester', 'bad-knees', 'also-buying'], notes: "Linda's husband. Needs single-story due to knee issues.", source: 'sphere' },
  { ref_id: 'STEVEN_CONTACT', first_name: 'Steven', last_name: 'Chen', email: 'steven.chen@email.com', phone: '(415) 555-5001', contact_type: 'seller', status: 'active', company: 'Tech Startup', tags: ['estate', 'probate', 'executor', 'out-of-state'], notes: "Executor of mother Dorothy's estate. Lives in San Francisco. 2 siblings also involved.", source: 'referral' },
  { ref_id: 'CARLOS_CONTACT', first_name: 'Carlos', last_name: 'Santos', email: 'carlos.santos@email.com', phone: '(216) 555-6001', contact_type: 'seller', status: 'active', company: 'Manufacturing Co', tags: ['relocation', 'reluctant-spouse', 'timeline-pressure'], notes: "Got job offer in Phoenix with 40% raise. Wife Maria doesn't want to leave. 8 weeks until job starts.", source: 'website_form' },
  { ref_id: 'MARIA_CONTACT', first_name: 'Maria', last_name: 'Santos', email: 'maria.santos@email.com', phone: '(216) 555-6002', contact_type: 'seller', status: 'active', company: '', tags: ['emotional', 'reluctant', 'elderly-parents-nearby'], notes: "Carlos's wife. Very upset about leaving. Parents are elderly and live nearby.", source: 'website_form' },
  { ref_id: 'FRANK_CONTACT', first_name: 'Frank', last_name: 'Morrison', email: 'frank.morrison555@email.com', phone: '(216) 555-7001', contact_type: 'seller', status: 'active', company: 'Self-Employed', tags: ['fsbo-conversion', 'price-objection', 'stubborn', 'analytical'], notes: 'FSBO for 4 months with no sale. Skeptical of agents. Needs data to be convinced.', source: 'fsbo_outreach' },
  { ref_id: 'MICHAEL_CONTACT', first_name: 'Michael', last_name: 'Thompson-Wright', email: 'michael.tw@investorgroup.com', phone: '(216) 555-8001', contact_type: 'buyer', status: 'active', company: 'TW Investment Group', tags: ['investor', 'repeat-client', 'cash-flow-focused', 'multi-family'], notes: 'Real estate investor. Owns 3 rental properties. Looking to expand portfolio. Very numbers-driven.', source: 'past_client' },
  { ref_id: 'JAMES_CONTACT', first_name: 'James', last_name: 'Thompson-Wright', email: 'james.tw@investorgroup.com', phone: '(216) 555-8002', contact_type: 'buyer', status: 'active', company: 'TW Investment Group', tags: ['investor', 'repeat-client'], notes: "Michael's husband and business partner.", source: 'past_client' },
  { ref_id: 'GARY_CONTACT', first_name: 'Gary', last_name: 'Thompson', email: 'gary.t.ghost@email.com', phone: '(216) 555-9001', contact_type: 'lead', status: 'cold', company: '', tags: ['ghost', 'unresponsive', 'website-lead'], notes: 'Filled out website form 2 weeks ago. No response to any outreach attempts.', source: 'website_form' },
  { ref_id: 'SAMANTHA_CONTACT', first_name: 'Samantha', last_name: 'Peters', email: 'samantha.p.browser@email.com', phone: '(216) 555-9002', contact_type: 'lead', status: 'warm', company: '', tags: ['browser', 'not-ready', 'open-house', '6-month-timeline'], notes: "Open house sign-in. Opens every email, clicks links, but 'just looking, not ready yet.'", source: 'open_house' },
  { ref_id: 'DEREK_CONTACT', first_name: 'Derek', last_name: 'Dawson', email: 'derek.demanding@email.com', phone: '(216) 555-9003', contact_type: 'lead', status: 'unqualified', company: '', tags: ['demanding', 'no-preapproval', 'red-flag', 'zillow-lead'], notes: "Zillow lead. Wants to see 10 homes this weekend but won't get pre-approved.", source: 'zillow' },
  { ref_id: 'PATRICIA_CONTACT', first_name: 'Patricia', last_name: 'Chen', email: 'patricia.chen.aunt@email.com', phone: '(216) 555-5002', contact_type: 'lead', status: 'warm', company: 'Retired', tags: ['estate', 'referral-from-steven', 'future-listing'], notes: "Steven Chen's aunt. May need to sell her home in 6-12 months.", source: 'referral' },
  { ref_id: 'COLLEAGUE1_CONTACT', first_name: 'Robert', last_name: 'Kim', email: 'robert.kim.tech@techcorp.com', phone: '(206) 555-2002', contact_type: 'lead', status: 'warm', company: 'TechCorp Inc', tags: ['relocation', 'referral-from-david', 'q2-timeline'], notes: "David Park's colleague, also relocating. Planning to move Q2 next year.", source: 'referral' },
  { ref_id: 'COLLEAGUE2_CONTACT', first_name: 'Amanda', last_name: 'Foster', email: 'amanda.foster.tech@techcorp.com', phone: '(206) 555-2003', contact_type: 'lead', status: 'warm', company: 'TechCorp Inc', tags: ['relocation', 'referral-from-david', 'q2-timeline'], notes: 'Another TechCorp relocation. Interested in same neighborhoods as David.', source: 'referral' },
];

const PROPERTIES = [
  { ref_id: 'PROP_789_PINE', address: '789 Pine Road', city: 'Lakewood', state: 'TX', zip_code: '44107', property_type: 'single_family', status: 'pending', price: 314000, bedrooms: 3, bathrooms: 2.0, square_feet: 1650, lot_size: 0.18, year_built: 1952, description: 'Charming colonial in prime Lakewood location. Updated kitchen, hardwood floors throughout.', features: ['hardwood floors', 'fenced yard', 'updated kitchen', 'near schools'], mls_number: 'MLS-2026-001234' },
  { ref_id: 'PROP_456_GRANDVIEW', address: '456 Grandview Drive', city: 'Shaker Heights', state: 'TX', zip_code: '44122', property_type: 'single_family', status: 'active', price: 459000, bedrooms: 4, bathrooms: 3.0, square_feet: 2800, lot_size: 0.35, year_built: 1965, description: 'Spacious colonial on tree-lined street. Original owners, well-maintained.', features: ['large lot', 'mature trees', 'spacious rooms'], mls_number: 'MLS-2026-001567' },
  { ref_id: 'PROP_555_LAKEFRONT', address: '555 Lakefront Drive', city: 'Bratenahl', state: 'TX', zip_code: '44108', property_type: 'single_family', status: 'sold', price: 745000, bedrooms: 4, bathrooms: 3.5, square_feet: 3200, lot_size: 0.45, year_built: 2015, description: "Modern executive home with lake views. Open concept, chef's kitchen.", features: ['lake views', 'modern', 'chef kitchen', 'home office'], mls_number: 'MLS-2026-000892' },
  { ref_id: 'PROP_789_MEMORY', address: '789 Memory Lane', city: 'Cleveland', state: 'TX', zip_code: '44111', property_type: 'single_family', status: 'sold', price: 178000, bedrooms: 3, bathrooms: 1.0, square_feet: 1400, lot_size: 0.15, year_built: 1948, description: 'Estate sale. Sold as-is. Original condition throughout.', features: ['estate sale', 'as-is', 'investor opportunity'], mls_number: 'MLS-2026-001890' },
  { ref_id: 'PROP_333_BIRCH', address: '333 Birch Lane', city: 'Parma', state: 'TX', zip_code: '44134', property_type: 'single_family', status: 'pending', price: 258000, bedrooms: 3, bathrooms: 1.5, square_feet: 1450, lot_size: 0.20, year_built: 1958, description: 'Well-maintained ranch in quiet neighborhood. Perfect starter home.', features: ['ranch', 'starter home', 'updated bathroom'], mls_number: 'MLS-2026-002012' },
  { ref_id: 'PROP_222_OAK', address: '222 Oak Street', city: 'Lakewood', state: 'TX', zip_code: '44107', property_type: 'single_family', status: 'pending', price: 352000, bedrooms: 4, bathrooms: 2.0, square_feet: 1850, lot_size: 0.22, year_built: 1945, description: 'Classic Lakewood colonial. Walk to shops and restaurants.', features: ['walkable', 'classic colonial', 'hardwood floors'], mls_number: 'MLS-2026-002234' },
  { ref_id: 'PROP_888_DIVISION', address: '888 Division Street', city: 'Cleveland', state: 'TX', zip_code: '44113', property_type: 'multi_family', status: 'pending', price: 195000, bedrooms: 4, bathrooms: 2.0, square_feet: 2200, lot_size: 0.12, year_built: 1920, description: 'Duplex investment property. Unit A rented at $1,100/mo.', features: ['duplex', 'investment', 'income property'], mls_number: 'MLS-2026-002456' },
  { ref_id: 'PROP_555_INDEPENDENCE', address: '555 Independence Avenue', city: 'Parma Heights', state: 'TX', zip_code: '44130', property_type: 'single_family', status: 'active', price: 305000, bedrooms: 3, bathrooms: 2.0, square_feet: 1600, lot_size: 0.25, year_built: 1972, description: 'Former FSBO listing now professionally marketed. Split-level with updates.', features: ['split-level', 'motivated seller', 'updated'], mls_number: 'MLS-2026-002678' },
  { ref_id: 'PROP_123_MAPLE', address: '123 Maple Street', city: 'Lakewood', state: 'TX', zip_code: '44107', property_type: 'single_family', status: 'active', price: 289000, bedrooms: 2, bathrooms: 1.0, square_feet: 1200, lot_size: 0.12, year_built: 1940, description: 'Cozy bungalow, great starter. Small but efficient layout.', features: ['bungalow', 'starter home', 'cozy'], mls_number: 'MLS-2026-002890' },
  { ref_id: 'PROP_456_OAK', address: '456 Oak Avenue', city: 'Cleveland Heights', state: 'TX', zip_code: '44118', property_type: 'single_family', status: 'active', price: 335000, bedrooms: 3, bathrooms: 2.5, square_feet: 1900, lot_size: 0.20, year_built: 1955, description: 'Beautiful Heights colonial but listed slightly over market for the area.', features: ['colonial', 'cleveland heights', 'good schools'], mls_number: 'MLS-2026-003012' },
  { ref_id: 'PROP_222_ELM', address: '222 Elm Street', city: 'Brook Park', state: 'TX', zip_code: '44142', property_type: 'single_family', status: 'off_market', price: 275000, bedrooms: 3, bathrooms: 2.0, square_feet: 1550, lot_size: 0.18, year_built: 1968, description: 'Near Hopkins Airport. Highway noise is significant.', features: ['near airport', 'highway noise'], mls_number: 'MLS-2026-003234' },
  { ref_id: 'PROP_WILLIAMS_NEW', address: '1842 Sunset Circle', city: 'Lakewood', state: 'TX', zip_code: '44107', property_type: 'single_family', status: 'active', price: 385000, bedrooms: 2, bathrooms: 2.0, square_feet: 1400, lot_size: 0.10, year_built: 2018, description: 'Perfect downsizer! Single-story living, modern finishes.', features: ['single-story', 'modern', 'low-maintenance', 'walkable'], mls_number: 'MLS-2026-003456' },
];

const DEALS = [
  { ref_id: 'DEAL_MARCUS', contact_ref: 'MARCUS_CONTACT', property_ref: 'PROP_789_PINE', deal_type: 'buyer', stage: 'under_contract', estimated_value: 314000, commission_rate: 2.5, expected_close_date: '2026-03-15', notes: 'Pre-approved $320K conventional. Baby due in 5 months - motivated timeline.' },
  { ref_id: 'DEAL_DAVID', contact_ref: 'DAVID_CONTACT', property_ref: 'PROP_555_LAKEFRONT', deal_type: 'buyer', stage: 'closed', estimated_value: 745000, commission_rate: 2.5, expected_close_date: '2026-02-01', actual_close_date: '2026-02-01', notes: 'Cash buyer, 21-day close! Waived inspection contingency.' },
  { ref_id: 'DEAL_JENNIFER', contact_ref: 'JENNIFER_CONTACT', property_ref: 'PROP_333_BIRCH', deal_type: 'buyer', stage: 'under_contract', estimated_value: 258000, commission_rate: 2.5, expected_close_date: '2026-02-28', notes: 'Divorce settlement funds. Must close by March 1 per decree.' },
  { ref_id: 'DEAL_WILLIAMS_SELL', contact_ref: 'LINDA_CONTACT', property_ref: 'PROP_456_GRANDVIEW', deal_type: 'seller', stage: 'under_contract', estimated_value: 452000, commission_rate: 3.0, expected_close_date: '2026-03-20', notes: 'Listed at $475K, reduced to $459K after 2 weeks. Accepted offer at $452K.' },
  { ref_id: 'DEAL_WILLIAMS_BUY', contact_ref: 'LINDA_CONTACT', property_ref: 'PROP_WILLIAMS_NEW', deal_type: 'buyer', stage: 'showing', estimated_value: 385000, commission_rate: 2.5, expected_close_date: '2026-04-15', notes: "Contingent on selling 456 Grandview. Looking for single-story (Tom's knees)." },
  { ref_id: 'DEAL_CHEN_ESTATE', contact_ref: 'STEVEN_CONTACT', property_ref: 'PROP_789_MEMORY', deal_type: 'seller', stage: 'closed', estimated_value: 178000, commission_rate: 3.0, expected_close_date: '2026-01-20', actual_close_date: '2026-01-20', notes: 'Probate sale, as-is. Three siblings had to agree - challenging family dynamics.' },
  { ref_id: 'DEAL_SANTOS', contact_ref: 'CARLOS_CONTACT', property_ref: 'PROP_222_OAK', deal_type: 'seller', stage: 'under_contract', estimated_value: 352000, commission_rate: 2.5, expected_close_date: '2026-02-25', notes: 'Relocation sale. Maria very emotional about leaving.' },
  { ref_id: 'DEAL_FRANK', contact_ref: 'FRANK_CONTACT', property_ref: 'PROP_555_INDEPENDENCE', deal_type: 'seller', stage: 'offer', estimated_value: 298000, commission_rate: 2.25, expected_close_date: '2026-03-10', notes: 'FSBO conversion. Was listed 4 months with no sale.' },
  { ref_id: 'DEAL_INVESTORS', contact_ref: 'MICHAEL_CONTACT', property_ref: 'PROP_888_DIVISION', deal_type: 'buyer', stage: 'under_contract', estimated_value: 195000, commission_rate: 2.5, expected_close_date: '2026-02-20', notes: 'Investment property. Unit A rented $1,100/mo. Unit B needs $8K updates.' },
  { ref_id: 'DEAL_MARCUS_LOST', contact_ref: 'MARCUS_CONTACT', property_ref: 'PROP_456_OAK', deal_type: 'buyer', stage: 'lost', estimated_value: 335000, commission_rate: 2.5, notes: 'Loved this house but $335K was over budget. Found 789 Pine instead.' },
  { ref_id: 'DEAL_GHOST_GARY', contact_ref: 'GARY_CONTACT', property_ref: null, deal_type: 'buyer', stage: 'lead', estimated_value: 0, notes: 'Website lead, no response to any outreach. 5 contact attempts over 2 weeks.' },
  { ref_id: 'DEAL_SAMANTHA', contact_ref: 'SAMANTHA_CONTACT', property_ref: null, deal_type: 'buyer', stage: 'lead', estimated_value: 300000, notes: "Open house lead. Engages with content but 'not ready yet.'", price_min: 250000, price_max: 350000 },
  { ref_id: 'DEAL_DEREK', contact_ref: 'DEREK_CONTACT', property_ref: null, deal_type: 'buyer', stage: 'lead', estimated_value: 0, notes: "Zillow lead. Wants to see 10 homes but won't get pre-approved. Red flag." },
];

async function getTenantId(): Promise<string> {
  // First, try to get tenant from profiles table (most reliable with RLS)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .not('tenant_id', 'is', null)
    .limit(1)
    .maybeSingle();
  
  if (profileData?.tenant_id) {
    return profileData.tenant_id;
  }
  
  // Try to get from contacts (in case profiles is restricted)
  const { data: contactData } = await supabase
    .from('contacts')
    .select('tenant_id')
    .limit(1)
    .maybeSingle();
  
  if (contactData?.tenant_id) {
    return contactData.tenant_id;
  }
  
  // Try tenants table directly
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .maybeSingle();
  
  if (tenantData?.id) {
    return tenantData.id;
  }
  
  console.error('Error: Could not find a tenant. Please ensure you have a tenant set up in your database.');
  console.error('Try logging in to the app first to create a tenant.');
  process.exit(1);
}

async function seedContacts(tenantId: string) {
  console.log('\n📇 Seeding contacts...');
  
  for (const contact of CONTACTS) {
    const { ref_id, source, ...contactData } = contact;
    
    // Check if contact already exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', contactData.email)
      .eq('tenant_id', tenantId)
      .single();
    
    if (existing) {
      refMap[ref_id] = existing.id;
      console.log(`  ⏭️  ${contact.first_name} ${contact.last_name} (already exists)`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...contactData,
        tenant_id: tenantId,
        lead_source: source,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`  ❌ Error creating ${contact.first_name} ${contact.last_name}:`, error.message);
    } else if (data) {
      refMap[ref_id] = data.id;
      console.log(`  ✅ ${contact.first_name} ${contact.last_name}`);
    }
  }
}

async function seedProperties(tenantId: string) {
  console.log('\n🏠 Seeding properties...');
  
  for (const property of PROPERTIES) {
    const { ref_id, features, mls_number, ...propertyData } = property;
    
    // Check if property already exists
    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('address', propertyData.address)
      .eq('tenant_id', tenantId)
      .single();
    
    if (existing) {
      refMap[ref_id] = existing.id;
      console.log(`  ⏭️  ${property.address} (already exists)`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        tenant_id: tenantId,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`  ❌ Error creating ${property.address}:`, error.message);
    } else if (data) {
      refMap[ref_id] = data.id;
      console.log(`  ✅ ${property.address} - $${property.price.toLocaleString()}`);
    }
  }
}

async function seedDeals(tenantId: string) {
  console.log('\n💼 Seeding deals...');
  
  for (const deal of DEALS) {
    const { ref_id, contact_ref, property_ref, price_min, price_max, ...dealData } = deal;
    
    const contactId = refMap[contact_ref];
    const propertyId = property_ref ? refMap[property_ref] : null;
    
    if (!contactId) {
      console.log(`  ⏭️  Deal ${ref_id} - Contact not found: ${contact_ref}`);
      continue;
    }
    
    // Check if deal already exists
    const { data: existing } = await supabase
      .from('deals')
      .select('id')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .eq('stage', dealData.stage)
      .maybeSingle();
    
    if (existing) {
      refMap[ref_id] = existing.id;
      console.log(`  ⏭️  Deal for ${contact_ref} (already exists)`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('deals')
      .insert({
        ...dealData,
        tenant_id: tenantId,
        contact_id: contactId,
        property_id: propertyId,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`  ❌ Error creating deal ${ref_id}:`, error.message);
    } else if (data) {
      refMap[ref_id] = data.id;
      console.log(`  ✅ ${ref_id} - ${deal.deal_type} - ${deal.stage} - $${deal.estimated_value.toLocaleString()}`);
    }
  }
}

async function main() {
  console.log('🚀 Smart Agent Test Data Import');
  console.log('================================');
  
  // Sign in first to get proper RLS access
  await signIn();
  
  const tenantId = await getTenantId();
  console.log(`\n📋 Using tenant: ${tenantId}`);
  
  await seedContacts(tenantId);
  await seedProperties(tenantId);
  await seedDeals(tenantId);
  
  console.log('\n================================');
  console.log('✅ Import complete!');
  console.log(`\nSummary:`);
  console.log(`  - Contacts: ${CONTACTS.length}`);
  console.log(`  - Properties: ${PROPERTIES.length}`);
  console.log(`  - Deals: ${DEALS.length}`);
}

main().catch(console.error);
