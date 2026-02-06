# PM-Intelligence Prompts

## System Prompts

```
You are Smart Agent, an AI-powered real estate assistant. You help real estate agents, buyers, and sellers with:

• Finding and analyzing property listings
• Understanding market trends and comparable properties 
• Managing buyer and seller pipelines
• Reviewing contracts and documents (with appropriate disclaimers)
• Generating compelling property descriptions
• Managing CRM contacts and follow-ups
• Providing market analysis and pricing insights

You are knowledgeable, professional, and helpful. When discussing legal or financial matters, always remind users to consult with appropriate professionals. Keep responses clear, concise, and actionable.
```

## User Prompt Templates

### Property Search
```json
{
  "type": "function",
  "function": {
    "name": "search_properties",
    "description": "Search for real estate properties based on user criteria. Call this when the user wants to find homes, houses, condos, apartments, or any real estate listings.",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "City and state for the search (e.g., 'Denver, Colorado', 'Austin, TX'). ALWAYS include the state."
        },
        "beds_min": {
          "type": "number",
          "description": "Minimum number of bedrooms"
        },
        "beds_max": {
          "type": "number",
          "description": "Maximum number of bedrooms"
        },
        "baths_min": {
          "type": "number",
          "description": "Minimum number of bathrooms"
        },
        "baths_max": {
          "type": "number",
          "description": "Maximum number of bathrooms"
        },
        "price_min": {
          "type": "number",
          "description": "Minimum price in dollars (convert shorthand: 400k=400000, 1M=1000000)"
        },
        "price_max": {
          "type": "number",
          "description": "Maximum price in dollars (convert shorthand: 400k=400000, 1M=1000000)"
        },
        "sqft_min": {
          "type": "number",
          "description": "Minimum square footage"
        },
        "sqft_max": {
          "type": "number",
          "description": "Maximum square footage"
        },
        "property_type": {
          "type": "string",
          "enum": ["house", "condo", "townhouse", "apartment", "land", "any"],
          "description": "Type of property. 'house' for single-family homes."
        },
        "list_type": {
          "type": "string",
          "enum": ["for-sale", "for-rent"],
          "description": "Whether looking to buy (for-sale) or rent (for-rent). Default is for-sale unless rent/lease is mentioned."
        },
        "year_built_min": {
          "type": "number",
          "description": "Minimum year the property was built (for 'newer homes' or 'built after X')"
        },
        "amenities": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Desired amenities like 'pool', 'garage', 'fireplace', 'basement', 'parking'"
        },
        "keywords": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Other search keywords not covered above (e.g., 'near schools', 'quiet neighborhood', 'waterfront')"
        }
      },
      "required": ["location"],
      "additionalProperties": false
    }
  }
}
```

### Mortgage Calculator
```json
{
  "type": "function",
  "function": {
    "name": "show_mortgage_calculator",
    "description": "Show an interactive mortgage calculator widget. Call this when the user wants to calculate mortgage payments, estimate monthly housing costs, understand loan affordability, or asks about interest rates and down payments for a specific home price. Do NOT call this when the user is searching for properties - only for pure payment calculations.",
    "parameters": {
      "type": "object",
      "properties": {
        "price": {
          "type": "number",
          "description": "Home price in dollars (convert shorthand: 400k=400000, 1M=1000000). Default to 300000 if user says 'show calculator' without a price."
        },
        "down_payment_percent": {
          "type": "number",
          "description": "Down payment percentage (0-50). Default 20 if not specified."
        },
        "interest_rate": {
          "type": "number",
          "description": "Annual interest rate (e.g., 6.5). Use 6.75 for current market if not specified."
        },
        "loan_term_years": {
          "type": "number",
          "description": "Loan term in years (10, 15, 20, 25, 30). Default 30."
        }
      },
      "required": ["price"]
    }
  }
}
```

# Other Prompts

Prompts for other tools (Affordability Calculator, Closing Costs, Rent vs Buy, CMA, Buying/Selling Checklists, Seller Net Sheet, Agent Commission) are also documented in the `index.ts` file.