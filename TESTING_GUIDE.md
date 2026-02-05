# Contact-User Linking Feature Testing Guide
## Step-by-Step Functional Testing

**Status**: 🟢 Ready for Testing
**Last Updated**: February 6, 2026

---

## Prerequisites

Before testing, ensure:
- ✅ Database migration completed successfully
- ✅ Frontend components built and compiled
- ✅ Local development server running (`npm run dev`) OR
- ✅ Production deployment live

---

## Test Plan Overview

This guide covers testing all aspects of the contact-user linking feature:
1. **Contact Ownership** - Personal vs Workspace toggle
2. **User Linking** - Search and link platform users
3. **User Preferences Display** - View user preferences (read-only)
4. **Unlinking** - Remove user links from contacts
5. **Permissions** - Admin vs regular user access
6. **Edge Cases** - Empty states, errors, etc.

**Estimated Testing Time**: 20-30 minutes

---

## Quick Start Testing

### Fastest Way to Test

1. Start dev server: `npm run dev`
2. Go to http://localhost:8080/contacts
3. Open any contact
4. Look for "Link to Platform User" button at top
5. Try linking a contact!

---

## Detailed Test Cases

See full testing guide in this file for comprehensive test scenarios.

**Key Features to Test:**
- ✅ Contact ownership toggle (Personal/Workspace)
- ✅ Search for platform users by email
- ✅ Link contacts to users
- ✅ View user preferences (read-only)
- ✅ Unlink contacts from users
- ✅ Permission controls (admin vs regular agent)

---

**For complete testing procedures, see sections below.**
