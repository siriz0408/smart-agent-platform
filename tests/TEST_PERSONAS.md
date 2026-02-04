# Smart Agent Test Personas & User Stories

## User Personas

### 1. Sarah - First-Time Buyer Agent
**Role:** Real estate agent helping first-time homebuyers
**Experience:** 2 years in real estate
**Tech Savvy:** Medium

**Goals:**
- Find affordable properties for clients
- Educate clients about the buying process
- Track multiple buyer clients simultaneously
- Use AI to explain documents in simple terms

**User Stories:**
- As Sarah, I want to search for properties under $400k so I can show my first-time buyers affordable options
- As Sarah, I want to create buyer contacts with pre-approval status so I know their budget
- As Sarah, I want to use AI chat to explain settlement statements in plain English
- As Sarah, I want to track deals through the pipeline so I don't miss deadlines

---

### 2. Marcus - Luxury Listing Agent
**Role:** High-end property listing specialist
**Experience:** 10 years in real estate
**Tech Savvy:** High

**Goals:**
- Manage luxury property listings ($1M+)
- Communicate with high-net-worth clients
- Generate professional property descriptions
- Track complex multi-party deals

**User Stories:**
- As Marcus, I want to add properties with detailed HOA and school info so buyers see full value
- As Marcus, I want AI to generate compelling property descriptions
- As Marcus, I want to track earnest money and contingencies for each deal
- As Marcus, I want to search across all my documents for specific contract terms

---

### 3. Elena - Team Lead
**Role:** Managing broker with a team of 5 agents
**Experience:** 15 years in real estate
**Tech Savvy:** Medium

**Goals:**
- Oversee team's deals and contacts
- Monitor pipeline across all agents
- Ensure compliance with document storage
- Train new agents on the platform

**User Stories:**
- As Elena, I want to view all team deals in the pipeline
- As Elena, I want to search documents across all agents' uploads
- As Elena, I want to see contact lists with lead sources for marketing analysis
- As Elena, I want admin controls to manage user access

---

### 4. David - Part-Time Weekend Agent
**Role:** Part-time agent working evenings/weekends
**Experience:** 1 year in real estate
**Tech Savvy:** Low

**Goals:**
- Quick access to client information
- Mobile-friendly interface
- Simple AI assistance for questions
- Easy document uploads from phone

**User Stories:**
- As David, I want to quickly find a contact's phone number on mobile
- As David, I want to upload a photo of a contract from my phone
- As David, I want to ask AI simple questions about real estate terms
- As David, I want the interface to work well on my phone

---

## Test Scenarios by Persona

### Sarah - First-Time Buyer Journey

```gherkin
Feature: First-Time Buyer Agent Workflow
  As Sarah, a first-time buyer agent
  I want to manage buyer clients and find affordable properties
  So that I can close deals efficiently

  Scenario: Complete Buyer Deal Lifecycle
    Given I am logged in as "sarah@smartagent.test"
    
    # Create buyer contact with preferences
    When I navigate to "Contacts"
    And I click "Add Contact"
    And I fill in:
      | First Name | John |
      | Last Name | Smith |
      | Email | john.smith@email.com |
      | Contact Type | buyer |
    And I expand "Buyer Preferences"
    And I fill in:
      | Min Price | 250000 |
      | Max Price | 400000 |
      | Preferred Beds | 3 |
      | Preferred Areas | Austin, Round Rock |
    And I expand "Financial Status"
    And I select "Pre-Approval Status" as "approved"
    And I fill in "Pre-Approval Amount" with "350000"
    And I click "Create Contact"
    Then I should see "Contact created"
    
    # Search for matching properties
    When I navigate to "Properties"
    And I use AI chat to ask "Find 3-bedroom homes under $400k in Austin"
    Then I should see property results matching criteria
    
    # Create deal for buyer
    When I navigate to "Pipeline"
    And I click "Add Deal"
    And I select contact "John Smith"
    And I fill in "Estimated Value" with "375000"
    And I expand "Financials"
    And I fill in "Earnest Money" with "5000"
    And I expand "Contingencies"
    Then contingencies should be checked by default
    
    # Upload and analyze documents
    When I navigate to "Documents"
    And I upload "sample-inspection-report.pdf"
    And I click "Chat with AI" on the document
    And I ask "What are the major issues found?"
    Then I should see AI analysis of inspection findings
```

### Marcus - Luxury Listing Journey

```gherkin
Feature: Luxury Listing Agent Workflow
  As Marcus, a luxury listing agent
  I want to manage high-end properties and complex deals
  So that I can serve high-net-worth clients

  Scenario: Complete Listing Deal Lifecycle
    Given I am logged in as "marcus@smartagent.test"
    
    # Create luxury property listing
    When I navigate to "Properties"
    And I click "Add Property"
    And I fill in:
      | Address | 1234 Lakefront Drive |
      | City | Austin |
      | State | TX |
      | Price | 2500000 |
      | Bedrooms | 5 |
      | Bathrooms | 4.5 |
      | Square Feet | 6500 |
    And I expand "HOA & Fees"
    And I fill in:
      | HOA Fee | 850 |
      | HOA Name | Lake Austin Estates HOA |
    And I expand "Schools"
    And I fill in:
      | School District | Lake Travis ISD |
      | Elementary School | Lakeway Elementary |
    And I click "Add Property"
    Then I should see "Property created"
    
    # Generate AI property description
    When I navigate to "Home"
    And I ask AI "Write a luxury property description for 1234 Lakefront Drive"
    Then I should see compelling marketing copy
    
    # Create seller contact and deal
    When I navigate to "Contacts"
    And I click "Add Contact"
    And I fill in contact type as "seller"
    And I expand "Seller Information"
    And I fill in "Owned Property Address" with "1234 Lakefront Drive"
    And I fill in "Listing Timeline" with "List within 30 days"
    Then I should see seller-specific fields
    
    # Track complex deal
    When I navigate to "Pipeline"
    And I switch to "Sellers" tab
    And I click "Add Deal"
    And I fill in deal with:
      | Estimated Value | 2500000 |
      | Earnest Money | 75000 |
      | Option Fee | 5000 |
    And I expand "Lender Information"
    And I fill in:
      | Loan Type | conventional |
      | Lender Name | First Republic Bank |
    And I expand "Title & Escrow"
    And I fill in:
      | Title Company | Stewart Title |
    Then deal should be created with all details
```

### David - Mobile User Journey

```gherkin
Feature: Mobile-First Agent Workflow
  As David, a part-time agent on mobile
  I want to quickly access information on the go
  So that I can serve clients efficiently

  Scenario: Mobile Quick Actions
    Given I am on a mobile device (iPhone viewport)
    And I am logged in as "david@smartagent.test"
    
    # Quick contact lookup
    When I tap the search bar
    And I type "Smith"
    Then I should see matching contacts in dropdown
    When I tap on "John Smith"
    Then I should see contact detail sheet
    And I can tap phone number to call
    
    # Quick AI question
    When I navigate to "Home"
    And I tap chat input
    And I ask "What is earnest money?"
    Then I should see AI explanation
    And response should be readable on mobile
    
    # Mobile document upload
    When I navigate to "Documents"
    And I tap "Upload"
    Then I should see mobile-friendly upload interface
```

---

## E2E Test Matrix

| Test Suite | Sarah | Marcus | Elena | David |
|------------|-------|--------|-------|-------|
| Login/Auth | ✓ | ✓ | ✓ | ✓ |
| Contact CRUD | ✓ | ✓ | ✓ | ✓ |
| Buyer Preferences | ✓ | - | ✓ | - |
| Seller Info | - | ✓ | ✓ | - |
| Property CRUD | ✓ | ✓ | ✓ | - |
| HOA/School Fields | - | ✓ | - | - |
| Deal Pipeline | ✓ | ✓ | ✓ | - |
| Deal Financials | ✓ | ✓ | - | - |
| Contingencies | ✓ | ✓ | - | - |
| Document Upload | ✓ | ✓ | ✓ | ✓ |
| Document AI Chat | ✓ | ✓ | - | - |
| Universal Search | ✓ | ✓ | ✓ | ✓ |
| AI Chat | ✓ | ✓ | - | ✓ |
| Mobile Responsive | - | - | - | ✓ |
| Admin Functions | - | - | ✓ | - |

---

## Test Priority

### P0 - Critical (Run Every Deploy)
1. Login/Authentication
2. Contact creation with basic fields
3. Property creation with basic fields
4. Deal creation with basic fields
5. Document upload
6. AI chat basic query

### P1 - High (Run Daily)
1. Full buyer preferences flow
2. Full seller info flow
3. Deal financials and contingencies
4. Document AI analysis
5. Universal search
6. Pipeline stage transitions

### P2 - Medium (Run Weekly)
1. Property HOA/school/tax fields
2. Deal lender/title information
3. Contact communication preferences
4. Mobile responsive testing
5. Performance testing

### P3 - Low (Run Monthly)
1. Admin panel functions
2. Billing integration
3. Edge cases and error handling
4. Accessibility testing
5. Cross-browser testing

---

## Test Data Requirements

### Test Users
```json
{
  "users": [
    {
      "email": "sarah@smartagent.test",
      "password": "Test1234!",
      "role": "agent",
      "persona": "first-time-buyer-agent"
    },
    {
      "email": "marcus@smartagent.test", 
      "password": "Test1234!",
      "role": "agent",
      "persona": "luxury-listing-agent"
    },
    {
      "email": "elena@smartagent.test",
      "password": "Test1234!",
      "role": "admin",
      "persona": "team-lead"
    },
    {
      "email": "david@smartagent.test",
      "password": "Test1234!",
      "role": "agent",
      "persona": "mobile-user"
    }
  ]
}
```

### Test Fixtures
- `sample-inspection-report.pdf` - Home inspection document
- `sample-contract.pdf` - Purchase agreement
- `sample-settlement.pdf` - Settlement statement (HUD-1)
- `sample-appraisal.pdf` - Property appraisal report

---

## Continuous Testing Schedule

| Frequency | Test Suites | Trigger |
|-----------|-------------|---------|
| On Commit | P0 Critical | Git push to main |
| Hourly | P0 + P1 | Cron job |
| Daily (2am) | P0 + P1 + P2 | Scheduled |
| Weekly (Sun) | All tests | Scheduled |
| On Demand | Selected | Manual trigger |
