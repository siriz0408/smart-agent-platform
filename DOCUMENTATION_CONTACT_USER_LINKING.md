# Contact-User Linking Documentation
## User Guide & Technical Reference

**Feature**: Contact-to-User Linking with User Preferences
**Version**: 1.0
**Date**: February 6, 2026

---

## Table of Contents

1. [For End Users](#for-end-users)
   - [Agent Guide](#agent-guide)
   - [Client Guide](#client-guide)
   - [Admin Guide](#admin-guide)
2. [For Developers](#for-developers)
   - [Technical Overview](#technical-overview)
   - [API Reference](#api-reference)
3. [In-App Help Content](#in-app-help-content)

---

## For End Users

### Agent Guide

#### What is Contact-User Linking?

Contact-User Linking allows you to connect your CRM contacts to actual platform users. This gives you a unified view of client information while maintaining data privacy.

**Key Benefits**:
- See client's real-time preferences (budget, property needs, timeline)
- Clients control their own data - always up-to-date
- Multiple agents can work with the same client without duplicating data
- Communicate directly through the platform

---

#### How to Link a Contact to a Platform User

**Step 1: Create or Open a Contact**
1. Go to **Contacts** page
2. Either create a new contact or open an existing one
3. Click on the contact to open their detail sheet

**Step 2: Search for Existing User**
1. In the contact detail sheet, look for "Link to Platform User" button
2. Click the button
3. The system searches for a user with the contact's email

**Step 3: Review and Confirm**
1. If a user is found, you'll see their profile preview:
   - Name and avatar
   - Current preferences (budget, beds, areas)
   - Number of other agents also working with them
2. Click "Link Contact" to confirm

**Step 4: View Linked User's Preferences**

Once linked, the contact detail sheet will show two sections:

**✏️ Your CRM Notes (Editable)**:
- Your private notes and tags
- Deal status and stage
- Agent-specific ratings
- Last contact date

**🔒 User's Preferences (Read-Only)**:
- Budget range
- Preferred bedrooms/bathrooms
- Target areas and property types
- Move timeline
- Pre-approval status

**Important**: User preferences are controlled by the client. You can see them but cannot edit them. This ensures clients always have accurate data.

---

#### When to Use Contact Linking

**✅ Link a Contact When**:
- Client has signed up for the platform
- You want to see their real-time preferences
- You need to invite them to a deal workspace
- You want to enable direct messaging

**❌ Don't Need to Link When**:
- Contact is just a lead (not yet a client)
- Contact doesn't have a platform account
- You just need basic CRM tracking

---

#### What If the Contact Isn't a Platform User Yet?

If the email search doesn't find a user:

1. Click "Invite to Platform" button
2. System sends them an email invitation
3. When they sign up, the link will be created automatically
4. You'll see their preferences once they set them up

---

#### Multiple Agents, One Client

It's common for multiple agents to work with the same client (e.g., buyer's agent and listing agent on same deal).

**How it works**:
- Each agent has their own contact entry in their CRM
- Both contacts link to the same user account
- Each agent sees the user's preferences (read-only)
- Each agent has their own private notes (not visible to other agents)

**Example**:
- Agent Jane has "John Smith" as a contact (buyer)
- Agent Mike has "John Smith" as a contact (buyer on different deal)
- Both link to the same John Smith user account
- John's preferences appear in both agents' CRMs
- Jane's notes are private to Jane
- Mike's notes are private to Mike

---

#### Contact Ownership: Personal vs. Workspace

When you create a contact, you can choose who owns it:

**Personal Contact** 🔐:
- Belongs to you
- Travels with you if you leave the brokerage
- Only you can edit (unless you assign to another agent)
- Brokerage admin can view but not edit

**Workspace Contact** 🏢:
- Belongs to the brokerage/team
- Stays with the brokerage if you leave
- Brokerage admin can edit
- Shared resource for the team

**How to Set Ownership**:
1. Open contact detail sheet
2. Look for "Ownership" toggle
3. Switch between "Personal" and "Workspace"
4. Only you (contact creator) or admin can change this

**Pro Tip**: If you're unsure, use "Personal" by default. You can always change it later.

---

### Client Guide

#### Setting Up Your Preferences

As a client on the platform, you control your own preferences. Agents who work with you can see these preferences to better serve you.

**Step 1: Access Settings**
1. Click your avatar in the top right
2. Select "Settings"
3. Go to "My Preferences" tab

**Step 2: Set Your Search Criteria**

**Budget**:
- Minimum and maximum price range
- This helps agents find properties in your range

**Property Requirements**:
- Number of bedrooms
- Number of bathrooms
- Property types you're interested in (house, condo, townhome)
- Preferred neighborhoods or areas

**Timeline**:
- When you're planning to move
- Urgency level (low, medium, high)

**Financial Status**:
- Pre-approval status
- Pre-approval amount (optional)
- Lender name (optional)

**Communication Preferences**:
- Preferred contact method (email, phone, text)
- Best time to call
- Secondary contact information

**Step 3: Save**
- Click "Save Preferences"
- Your agents will see the updated information immediately

---

#### Privacy & Control

**What Agents Can See**:
- ✅ Your preferences (budget, property needs, timeline)
- ✅ Basic profile info (name, contact info)

**What Agents CANNOT See**:
- ❌ Preferences from your work with OTHER agents
- ❌ Your private messages with other agents
- ❌ Other deals you're involved in

**What You Control**:
- ✅ All your preferences and profile data
- ✅ Which agents can add you to deals
- ✅ Whether to accept deal invitations

**Data Privacy**: Your data belongs to you. Agents can only see what you explicitly share through your preferences.

---

#### Viewing Your Agents

To see which agents have you in their CRM:

1. Go to "My Agents" page (in navigation menu)
2. You'll see a list of all agents who have linked contacts to your account
3. Click on an agent to see:
   - Their profile
   - Deals you're working on together
   - Shared documents
   - Conversation history

---

#### Managing Deal Invitations

When an agent invites you to a deal:

1. You'll receive a notification
2. Click to view deal details:
   - Property address
   - Your role (buyer, seller)
   - Other participants
   - Documents attached
3. Accept or decline the invitation
4. If accepted, you'll see the deal in your dashboard

---

### Admin Guide

#### Admin Access to Contacts

As a workspace admin (brokerage owner/manager), you have special visibility:

**What You Can See**:
- ✅ ALL contacts in your workspace (from all agents)
- ✅ Deal pipeline across the entire team
- ✅ Team performance metrics

**What You Can Edit**:
- ✅ Workspace-owned contacts (full edit access)
- ⚠️ Personal contacts (view-only, cannot edit)
- ✅ Contact ownership (can reassign contacts)

---

#### Managing Contact Ownership

**Scenario 1: Agent Leaves, Takes Contacts**

When an agent leaves your brokerage:
- Their "Personal" contacts move with them to their new workspace
- "Workspace" contacts remain with your brokerage
- Admin can reassign workspace contacts to other agents

**Scenario 2: Agent Joins Team, Brings Contacts**

When a new agent joins:
- They can mark their existing contacts as "Personal"
- Contacts they create in your workspace default to "Workspace"
- Admin can set workspace policy for default ownership

**Best Practice**: Discuss ownership expectations during onboarding.

---

#### Workspace Policies

As admin, you can set policies for your workspace:

**Contact Ownership Policy**:
- Default all new contacts to "Workspace" (recommended for brokerages)
- Default all new contacts to "Personal" (recommended for solo agents)

**Contact Visibility**:
- Admins always see all contacts
- Agents only see their own contacts (default)
- Or enable "shared contacts" so agents can see team contacts

**Data Retention**:
- What happens to contacts when agent leaves
- How to handle contact ownership disputes

---

## For Developers

### Technical Overview

#### Architecture Summary

**Data Model**:
```
User (auth.users) ──1:1── Profiles ──1:1── User Preferences
                      │
                      │
                      ▼
                 Contacts (many)
                      │
                      └── contacts.user_id → User (optional link)
```

**Key Tables**:
1. `user_preferences` - User-owned preference data (new)
2. `contacts` - Agent-owned CRM data (extended)
3. `profiles` - User account metadata (unchanged)

**New Columns on `contacts`**:
- `user_id` (uuid) - Links to auth.users
- `ownership_type` (text) - 'personal' | 'workspace'
- `linked_from_user` (boolean) - UI indicator flag

---

#### RLS Policy Changes

**Before**:
```sql
-- Agents could see ALL contacts in workspace
CREATE POLICY contacts_select_policy ON public.contacts
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
```

**After**:
```sql
-- Agents see only own contacts + assigned contacts
CREATE POLICY "contacts_select_by_workspace"
ON public.contacts FOR SELECT
USING (
  public.is_super_admin() OR
  (tenant_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')
  )) OR
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND (
    created_by = auth.uid() OR
    id IN (
      SELECT contact_id FROM public.contact_agents WHERE agent_user_id = auth.uid()
    )
  ))
);

-- NEW: Users can see contacts linked to them
CREATE POLICY "users_view_own_linked_contacts"
ON public.contacts FOR SELECT
USING (user_id = auth.uid());
```

**Impact**:
- ✅ Tighter security (agent-level isolation)
- ✅ Cross-workspace access for linked users
- ✅ Admin visibility maintained

---

#### API Reference

**Helper Functions**:

```sql
-- Search for platform user by email
SELECT * FROM public.find_user_by_email('john@example.com');

-- Returns:
-- - user_id
-- - full_name
-- - avatar_url
-- - is_platform_user
-- - primary_role
-- - linked_contact_count (how many agents have this user as contact)
```

```sql
-- Get contact ownership metadata
SELECT * FROM public.get_contact_ownership_info('<contact-uuid>');

-- Returns:
-- - is_personal (boolean)
-- - created_by_name (text)
-- - is_linked_user (boolean)
-- - user_name (text)
-- - linked_agent_count (bigint)
```

---

#### Frontend Hooks

**useContactUserLink**:
```typescript
import { useContactUserLink } from '@/hooks/useContactUserLink';

const { searchUser, linkContactToUser } = useContactUserLink();

// Search for user
const user = await searchUser('john@example.com');

// Link contact to user
await linkContactToUser(contactId, userId);
```

**useUserPreferences**:
```typescript
import { useUserPreferences } from '@/hooks/useUserPreferences';

const { data: preferences, isLoading } = useUserPreferences(userId);

// Access preferences
preferences?.price_min
preferences?.preferred_beds
preferences?.preferred_areas
```

---

### Database Schema

**user_preferences Table**:
```sql
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,

  -- Search criteria
  price_min NUMERIC(12, 2),
  price_max NUMERIC(12, 2),
  preferred_beds INT,
  preferred_baths NUMERIC(3, 1),
  preferred_areas TEXT[],
  preferred_property_types TEXT[],
  target_move_date DATE,
  urgency_level TEXT,

  -- Financial
  pre_approval_status TEXT,
  pre_approval_amount NUMERIC(12, 2),
  lender_name TEXT,

  -- Communication
  preferred_contact_method TEXT,
  best_time_to_call TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes**:
```sql
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_contacts_created_by ON contacts(created_by);
CREATE INDEX idx_contacts_ownership_type ON contacts(ownership_type);
```

---

## In-App Help Content

The following content should be added to `/src/pages/Help.tsx`:

### New Category: "Contact Management" (Updated)

```javascript
{
  id: "contact-linking",
  title: "Contact-User Linking",
  icon: Link,
  description: "Link CRM contacts to platform users",
  articles: [
    {
      id: "what-is-linking",
      title: "What is Contact-User Linking?",
      content: `Contact-User Linking connects your CRM contacts to actual platform users.

**Why Link Contacts?**
• See client's real-time preferences (budget, property needs)
• Clients control their own data - always accurate
• Multiple agents can work with same client
• Enable direct platform messaging

**When a contact is linked:**
• You see their preferences (read-only)
• You keep your private CRM notes (editable)
• Client can update their info anytime
• No duplicate data entry

**Who should I link?**
Only link contacts who have signed up for the platform. Leads and prospects who aren't users yet don't need linking.`,
    },
    {
      id: "how-to-link",
      title: "How to Link a Contact",
      content: `Follow these steps to link a contact:

1. **Open contact detail sheet**
   - Go to Contacts page
   - Click on the contact

2. **Click "Link to Platform User"**
   - System searches by email address
   - Shows preview if user found

3. **Review user profile**
   - Name and avatar
   - Current preferences
   - Other agents working with them

4. **Confirm link**
   - Click "Link Contact"
   - You'll now see their preferences

**What if user not found?**
Click "Invite to Platform" to send them an email invitation. Link will be created automatically when they sign up.`,
    },
    {
      id: "user-preferences",
      title: "Understanding User Preferences",
      content: `When a contact is linked, you see two sections:

**Your CRM Notes (Editable)** ✏️
• Your private notes and tags
• Deal status and stage
• Agent-specific ratings
• Last contact date
• Next follow-up date

**User's Preferences (Read-Only)** 🔒
• Budget range
• Preferred beds/baths
• Target areas
• Property types
• Move timeline
• Pre-approval status

**Important:** User preferences are controlled by the client. You can view them but cannot edit. This ensures data is always accurate and up-to-date.

Clients update their own preferences in Settings → My Preferences.`,
    },
    {
      id: "contact-ownership",
      title: "Contact Ownership Explained",
      content: `Contacts can be owned two ways:

**Personal Contact** 🔐
• Belongs to you
• Travels with you if you leave brokerage
• Only you can edit
• Admin can view but not edit

**Workspace Contact** 🏢
• Belongs to brokerage/team
• Stays with brokerage if you leave
• Admin can edit and reassign
• Shared team resource

**How to set ownership:**
1. Open contact detail
2. Find "Ownership" toggle
3. Switch between Personal/Workspace
4. Save changes

**Pro tip:** Default to "Personal" unless it's a team lead or shared client.`,
    },
  ],
},
```

### New FAQ Entries

```javascript
{
  question: "Can multiple agents have the same contact?",
  answer: "Yes! Multiple agents can each have a contact for the same person. Each agent has their own contact entry with private notes, but both can link to the same platform user to see their preferences. This is common in deals where multiple agents collaborate."
},
{
  question: "What happens to contacts when I leave a brokerage?",
  answer: "It depends on ownership. Personal contacts travel with you to your new workspace. Workspace-owned contacts remain with the brokerage and can be reassigned to other agents."
},
{
  question: "Can clients see my CRM notes about them?",
  answer: "No. Your CRM notes (tags, ratings, private notes) are only visible to you and workspace admins. Clients only control their own preferences section."
},
{
  question: "How do I invite someone to the platform?",
  answer: "When creating or editing a contact, click 'Invite to Platform' if they're not a user yet. They'll receive an email invitation. Once they sign up, the contact will be linked automatically."
},
```

---

## Migration Guide for Existing Users

### What's Changing

**For Agents**:
- You'll now only see contacts you created or were assigned
- You can link contacts to platform users to see their preferences
- New ownership options (personal vs workspace)

**For Admins**:
- You still see all workspace contacts
- New contact ownership management features

**For Clients**:
- New "My Preferences" settings page
- Control your own property search criteria
- See which agents have you in their CRM

### Action Items After Migration

1. **Review your contacts** - Check which are important to link
2. **Set ownership** - Mark contacts as personal or workspace
3. **Link active clients** - Connect contacts who are platform users
4. **Update preferences** - If you're a client, set your preferences

---

## Troubleshooting

### "Link to Platform User" button is disabled

**Cause**: Contact doesn't have an email address

**Solution**: Add an email to the contact, then the button will activate

---

### User found but link fails

**Cause**: RLS policy issue or duplicate link

**Solution**:
1. Refresh the page
2. Check if contact is already linked (look for user preferences section)
3. Contact support if issue persists

---

### Can't see other agents' contacts

**This is expected behavior!** For privacy, agents only see:
- Contacts they created
- Contacts assigned to them via contact_agents table

Workspace admins see all contacts.

---

### User preferences not showing

**Check**:
1. Is contact linked? (Look for "Linked User" badge)
2. Has user set their preferences? (They may not have filled it out yet)
3. Try refreshing the page

---

## Support

**Questions?** Contact support at support@smartagent.ai

**Bug Reports**: Use the "Report Issue" button in Settings

**Feature Requests**: Share feedback in Settings → Feedback

---

**Document Version**: 1.0
**Last Updated**: February 6, 2026
**Maintained By**: Smart Agent Platform Team
