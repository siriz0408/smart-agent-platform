/**
 * PM-Context: CRM Completeness Audit
 * 
 * Audits CRM data completeness by analyzing:
 * 1. Field completion rates across all contacts
 * 2. Most common missing fields
 * 3. Completeness score distribution
 * 4. Recommendations for UX improvements
 * 
 * Usage:
 *   npx tsx scripts/pm-context-audit-crm-completeness.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.log('⚠️  VITE_SUPABASE_PUBLISHABLE_KEY not set - will only verify code structure');
  console.log('💡 Set TEST_USER_EMAIL and TEST_USER_PASSWORD for full audit\n');
}

interface FieldStats {
  field: string;
  label: string;
  category: 'core' | 'extended' | 'buyer' | 'seller' | 'communication' | 'financial' | 'timeline';
  totalContacts: number;
  filledCount: number;
  completionRate: number;
  missingCount: number;
}

interface CompletenessDistribution {
  scoreRange: string;
  count: number;
  percentage: number;
}

interface AuditResult {
  totalContacts: number;
  fieldStats: FieldStats[];
  completenessDistribution: CompletenessDistribution[];
  averageCompleteness: number;
  recommendations: string[];
  topMissingFields: FieldStats[];
}

const results: AuditResult = {
  totalContacts: 0,
  fieldStats: [],
  completenessDistribution: [],
  averageCompleteness: 0,
  recommendations: [],
  topMissingFields: [],
};

// Field definitions with categories
const FIELD_DEFINITIONS: Array<{
  field: string;
  label: string;
  category: FieldStats['category'];
  isArray?: boolean;
}> = [
  // Core fields
  { field: 'first_name', label: 'First Name', category: 'core' },
  { field: 'last_name', label: 'Last Name', category: 'core' },
  { field: 'email', label: 'Email', category: 'core' },
  { field: 'phone', label: 'Phone', category: 'core' },
  { field: 'company', label: 'Company', category: 'core' },
  
  // Extended fields
  { field: 'contact_type', label: 'Contact Type', category: 'extended' },
  { field: 'notes', label: 'Notes', category: 'extended' },
  { field: 'address_id', label: 'Address', category: 'extended' },
  
  // Buyer preferences
  { field: 'price_min', label: 'Price Min', category: 'buyer' },
  { field: 'price_max', label: 'Price Max', category: 'buyer' },
  { field: 'preferred_beds', label: 'Preferred Beds', category: 'buyer' },
  { field: 'preferred_baths', label: 'Preferred Baths', category: 'buyer' },
  { field: 'preferred_areas', label: 'Preferred Areas', category: 'buyer', isArray: true },
  { field: 'preferred_property_types', label: 'Preferred Property Types', category: 'buyer', isArray: true },
  
  // Seller info
  { field: 'owned_property_address', label: 'Owned Property Address', category: 'seller' },
  { field: 'seller_motivation', label: 'Seller Motivation', category: 'seller' },
  { field: 'listing_timeline', label: 'Listing Timeline', category: 'seller' },
  
  // Communication preferences
  { field: 'preferred_contact_method', label: 'Preferred Contact Method', category: 'communication' },
  { field: 'best_time_to_call', label: 'Best Time to Call', category: 'communication' },
  { field: 'secondary_phone', label: 'Secondary Phone', category: 'communication' },
  { field: 'secondary_email', label: 'Secondary Email', category: 'communication' },
  
  // Lead tracking
  { field: 'lead_source', label: 'Lead Source', category: 'extended' },
  { field: 'referral_source', label: 'Referral Source', category: 'extended' },
  
  // Financial status
  { field: 'pre_approval_status', label: 'Pre-approval Status', category: 'financial' },
  { field: 'pre_approval_amount', label: 'Pre-approval Amount', category: 'financial' },
  { field: 'lender_name', label: 'Lender Name', category: 'financial' },
  
  // Timeline
  { field: 'urgency_level', label: 'Urgency Level', category: 'timeline' },
  { field: 'target_move_date', label: 'Target Move Date', category: 'timeline' },
  { field: 'lease_expiration', label: 'Lease Expiration', category: 'timeline' },
];

async function authenticate() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const email = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
  const password = process.env.TEST_USER_PASSWORD || '';
  
  if (!password) {
    throw new Error('TEST_USER_PASSWORD not set - cannot authenticate');
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    throw new Error(`Authentication failed: ${authError?.message}`);
  }

  return authData.user;
}

async function auditCRMCompleteness() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  console.log('🔍 Starting CRM Completeness Audit...\n');

  // Authenticate
  const user = await authenticate();
  console.log(`✅ Authenticated as: ${user.email}\n`);

  // Get user's tenant_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(`Failed to get profile: ${profileError?.message}`);
  }

  const tenantId = profile.tenant_id;
  console.log(`📊 Analyzing contacts for tenant: ${tenantId}\n`);

  // Fetch all contacts for this tenant
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId);

  if (contactsError) {
    throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
  }

  if (!contacts || contacts.length === 0) {
    console.log('⚠️  No contacts found for this tenant');
    results.totalContacts = 0;
    return;
  }

  results.totalContacts = contacts.length;
  console.log(`📋 Found ${contacts.length} contacts\n`);

  // Calculate field completion stats
  console.log('📈 Calculating field completion rates...\n');
  
  for (const fieldDef of FIELD_DEFINITIONS) {
    let filledCount = 0;
    
    for (const contact of contacts) {
      const value = contact[fieldDef.field];
      let isFilled = false;
      
      if (fieldDef.isArray) {
        isFilled = Array.isArray(value) && value.length > 0;
      } else {
        isFilled = value !== null && value !== undefined && value !== '';
      }
      
      if (isFilled) {
        filledCount++;
      }
    }
    
    const completionRate = (filledCount / contacts.length) * 100;
    const missingCount = contacts.length - filledCount;
    
    results.fieldStats.push({
      field: fieldDef.field,
      label: fieldDef.label,
      category: fieldDef.category,
      totalContacts: contacts.length,
      filledCount,
      completionRate: Math.round(completionRate * 100) / 100,
      missingCount,
    });
  }

  // Calculate completeness scores for each contact
  console.log('🎯 Calculating completeness scores per contact...\n');
  
  const completenessScores: number[] = [];
  
  for (const contact of contacts) {
    // Core fields (50% weight)
    const coreFields = [
      contact.first_name,
      contact.last_name,
      contact.email,
      contact.phone,
      contact.company,
    ];
    const coreScore = (coreFields.filter(Boolean).length / coreFields.length) * 50;
    
    // Extended fields (50% weight)
    const extendedFields = [
      contact.contact_type,
      contact.notes,
      contact.price_min,
      contact.price_max,
      contact.preferred_beds,
      contact.preferred_baths,
      contact.preferred_areas && Array.isArray(contact.preferred_areas) && contact.preferred_areas.length > 0,
      contact.owned_property_address,
      contact.seller_motivation,
    ];
    const extendedScore = (extendedFields.filter(Boolean).length / extendedFields.length) * 50;
    
    const totalScore = Math.round(coreScore + extendedScore);
    completenessScores.push(totalScore);
  }

  // Calculate average completeness
  const sum = completenessScores.reduce((a, b) => a + b, 0);
  results.averageCompleteness = Math.round((sum / completenessScores.length) * 100) / 100;

  // Calculate distribution
  const ranges = [
    { min: 80, max: 100, label: '80-100% (Complete)' },
    { min: 50, max: 79, label: '50-79% (Partial)' },
    { min: 0, max: 49, label: '0-49% (Incomplete)' },
  ];

  for (const range of ranges) {
    const count = completenessScores.filter(s => s >= range.min && s <= range.max).length;
    results.completenessDistribution.push({
      scoreRange: range.label,
      count,
      percentage: Math.round((count / completenessScores.length) * 100 * 100) / 100,
    });
  }

  // Identify top missing fields (excluding required fields)
  const optionalFields = results.fieldStats.filter(f => 
    f.field !== 'first_name' && f.field !== 'last_name' && f.completionRate < 50
  );
  results.topMissingFields = optionalFields
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 10);

  // Generate recommendations
  if (results.averageCompleteness < 50) {
    results.recommendations.push('⚠️  Average completeness is below 50% - consider adding required field indicators in the UI');
  }
  
  if (results.topMissingFields.some(f => f.category === 'core')) {
    results.recommendations.push('📧 Core fields (email, phone) are missing - add inline validation prompts');
  }
  
  if (results.topMissingFields.some(f => f.category === 'buyer')) {
    results.recommendations.push('🏠 Buyer preferences are underutilized - consider progressive disclosure in contact forms');
  }
  
  if (results.topMissingFields.some(f => f.category === 'seller')) {
    results.recommendations.push('🏡 Seller information is sparse - add seller-specific form sections');
  }

  // Print results
  printResults();
  
  // Save report
  saveReport();
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 CRM COMPLETENESS AUDIT RESULTS');
  console.log('='.repeat(80) + '\n');
  
  console.log(`Total Contacts: ${results.totalContacts}`);
  console.log(`Average Completeness: ${results.averageCompleteness}%\n`);
  
  console.log('📈 Completeness Distribution:');
  for (const dist of results.completenessDistribution) {
    const bar = '█'.repeat(Math.round(dist.percentage / 2));
    console.log(`  ${dist.scoreRange.padEnd(25)} ${dist.count.toString().padStart(4)} contacts (${dist.percentage.toFixed(1)}%) ${bar}`);
  }
  
  console.log('\n🔝 Top 10 Missing Fields:');
  for (let i = 0; i < results.topMissingFields.length; i++) {
    const field = results.topMissingFields[i];
    const bar = '░'.repeat(Math.round(field.completionRate / 2));
    console.log(`  ${(i + 1).toString().padStart(2)}. ${field.label.padEnd(30)} ${field.completionRate.toFixed(1)}% ${bar}`);
  }
  
  console.log('\n📋 Field Completion by Category:\n');
  const categories = ['core', 'extended', 'buyer', 'seller', 'communication', 'financial', 'timeline'] as const;
  
  for (const category of categories) {
    const categoryFields = results.fieldStats.filter(f => f.category === category);
    if (categoryFields.length === 0) continue;
    
    const avgCompletion = categoryFields.reduce((sum, f) => sum + f.completionRate, 0) / categoryFields.length;
    console.log(`  ${category.toUpperCase().padEnd(15)}: ${avgCompletion.toFixed(1)}% avg (${categoryFields.length} fields)`);
    
    for (const field of categoryFields.slice(0, 5)) {
      const bar = '█'.repeat(Math.round(field.completionRate / 5));
      console.log(`    • ${field.label.padEnd(30)} ${field.completionRate.toFixed(1)}% ${bar}`);
    }
    if (categoryFields.length > 5) {
      console.log(`    ... and ${categoryFields.length - 5} more fields`);
    }
    console.log();
  }
  
  if (results.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    for (const rec of results.recommendations) {
      console.log(`  ${rec}`);
    }
    console.log();
  }
}

function saveReport() {
  const reportsDir = path.join(process.cwd(), 'docs', 'pm-agents', 'reports', new Date().toISOString().split('T')[0]);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, 'pm-context-crm-completeness-audit.md');
  
  const categories = ['core', 'extended', 'buyer', 'seller', 'communication', 'financial', 'timeline'] as const;
  
  const report = `# PM-Context: CRM Completeness Audit Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Status:** ✅ Complete

---

## Summary

- **Total Contacts Analyzed:** ${results.totalContacts}
- **Average Completeness:** ${results.averageCompleteness}%
- **Target:** >70% (per PM-Context success metrics)

---

## Completeness Distribution

| Score Range | Count | Percentage |
|------------|-------|------------|
${results.completenessDistribution.map(d => `| ${d.scoreRange} | ${d.count} | ${d.percentage.toFixed(1)}% |`).join('\n')}

---

## Top 10 Missing Fields

| Rank | Field | Category | Completion Rate | Missing Count |
|------|-------|----------|-----------------|---------------|
${results.topMissingFields.map((f, i) => `| ${i + 1} | ${f.label} | ${f.category} | ${f.completionRate.toFixed(1)}% | ${f.missingCount} |`).join('\n')}

---

## Field Completion by Category

${categories.map(category => {
  const categoryFields = results.fieldStats.filter(f => f.category === category);
  if (categoryFields.length === 0) return '';
  const avgCompletion = categoryFields.reduce((sum, f) => sum + f.completionRate, 0) / categoryFields.length;
  return `### ${category.toUpperCase()} (${avgCompletion.toFixed(1)}% avg)

| Field | Completion Rate | Filled | Missing |
|-------|----------------|--------|---------|
${categoryFields.map(f => `| ${f.label} | ${f.completionRate.toFixed(1)}% | ${f.filledCount} | ${f.missingCount} |`).join('\n')}
`;
}).filter(Boolean).join('\n')}

---

## Recommendations

${results.recommendations.length > 0 ? results.recommendations.map(r => `- ${r}`).join('\n') : 'None at this time.'}

---

## Next Steps

1. Review top missing fields and consider UX improvements
2. Add field completion indicators in contact forms
3. Consider progressive disclosure for extended fields
4. Monitor completeness trends over time

---

*Report generated by PM-Context CRM Completeness Audit*
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Report saved to: ${reportPath}`);
}

// Run audit
if (require.main === module) {
  auditCRMCompleteness()
    .then(() => {
      console.log('\n✅ CRM Completeness Audit Complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Audit failed:', error);
      process.exit(1);
    });
}

export { auditCRMCompleteness, results };
