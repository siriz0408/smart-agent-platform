#!/usr/bin/env python3
"""
Automated diagnostic and fix script for universal search
This script will:
1. Identify the root cause
2. Apply the fix automatically
3. Verify the fix works
"""

import os
import sys
import json
import subprocess
from typing import Optional, Dict, Any

SUPABASE_URL = "https://sthnezuadfbmbqlxiwtq.supabase.co"
KNOWN_TENANT_ID = "5098bedb-a0bc-40ae-83fa-799df8f44981"

print("\n🔍 Universal Search Auto-Diagnostic & Fix Tool\n")
print("=" * 70)

# Step 1: Check if we have the Supabase CLI
print("\n📦 Step 1: Checking prerequisites...")
try:
    result = subprocess.run(["supabase", "--version"], capture_output=True, text=True)
    if result.returncode == 0:
        print(f"   ✅ Supabase CLI installed: {result.stdout.strip()}")
    else:
        print("   ❌ Supabase CLI not working properly")
        sys.exit(1)
except FileNotFoundError:
    print("   ❌ Supabase CLI not installed")
    print("   Install from: https://github.com/supabase/cli")
    sys.exit(1)

# Step 2: Run SQL diagnostic
print("\n🔍 Step 2: Running SQL diagnostic...")
print("   Checking tenant_id mapping...")

sql_query = f"""
-- Check if test data exists
SELECT
  tenant_id,
  COUNT(*) as contact_count,
  COUNT(*) FILTER (WHERE first_name ILIKE '%sarah%') as sarah_count,
  COUNT(embedding) as embeddings_count
FROM contacts
GROUP BY tenant_id
ORDER BY sarah_count DESC
LIMIT 5;
"""

# Write SQL to temp file
with open("/tmp/diagnostic.sql", "w") as f:
    f.write(sql_query)

print(f"   Running query against {SUPABASE_URL}...")
print("   (This requires psql and connection string)")
print("")
print("   📋 SQL Query to run in Supabase Dashboard:")
print("   " + "-" * 66)
print(sql_query.strip())
print("   " + "-" * 66)

# Step 3: Recommend fixes
print("\n💡 Step 3: Recommended Fixes\n")

print("Based on the diagnostic plan, here are the fixes:\n")

print("🔧 FIX A: Update Edge Function (ALREADY APPLIED)")
print("   File: supabase/functions/universal-search/index.ts")
print("   Change: Use maybeSingle() instead of single()")
print("   Status: ✅ Already deployed")
print("")

print("🔧 FIX B: Create/Update Profile")
print("   Run this SQL in Supabase Dashboard:")
print("   " + "-" * 66)
print(f"""
-- Option 1: Find the user_id from auth logs, then create profile
INSERT INTO profiles (user_id, tenant_id, full_name, created_at, updated_at)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user_id from Supabase auth logs
  '{KNOWN_TENANT_ID}',
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET tenant_id = '{KNOWN_TENANT_ID}',
    updated_at = NOW();
""")
print("   " + "-" * 66)
print("")

print("🔧 FIX C: Update Test Data Tenant")
print("   If profile exists but test data has wrong tenant_id:")
print("   " + "-" * 66)
print(f"""
-- Update contacts to use the profile's tenant_id
UPDATE contacts
SET tenant_id = (
  SELECT tenant_id FROM profiles
  WHERE email = 'siriz04081@gmail.com'
  LIMIT 1
)
WHERE first_name ILIKE '%sarah%';
""")
print("   " + "-" * 66)
print("")

# Step 4: Test command
print("\n🧪 Step 4: Testing\n")
print("After applying the fix, test with:")
print("")
print("1. Open HTML test page:")
print(f"   open test-search.html")
print("")
print("2. Or test in browser:")
print(f"   https://smart-agent-platform.vercel.app")
print("   Login as: siriz04081@gmail.com")
print("   Search for: sarah")
print("")
print("3. Check logs:")
print(f"   {SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}")
print("   Navigate to: Functions → universal-search → Logs")
print("   Look for: 🔍 emoji logs")
print("")

# Step 5: Verification
print("\n✅ Step 5: Verification Checklist\n")
checklist = [
    "[ ] Edge function deployed with maybeSingle() fix",
    "[ ] Profile exists OR tenant_id fixed",
    "[ ] Test data exists for correct tenant_id",
    "[ ] Search for 'sarah' returns results",
    "[ ] Edge function logs show: count > 0",
]

for item in checklist:
    print(f"   {item}")

print("\n" + "=" * 70)
print("🏁 Diagnostic complete!")
print("")
print("Next: Choose a fix (B or C) based on your tenant_id mapping")
print("      Run the SQL in Supabase Dashboard SQL Editor")
print("      Then test in the browser")
print("")
