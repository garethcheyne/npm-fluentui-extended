# Testing Checklist - QueryBuilder Native API Update

## Build & TypeScript
- [x] `npm run build` - Successful compilation
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `npm run test` - All unit tests pass

## Test Harness - Connection
- [ ] Initial load shows connection status correctly
- [ ] "Connect" button works and establishes connection
- [ ] "Disconnect" button works
- [ ] Connection overlay appears on QueryBuilder when disconnected
- [ ] Connection state persists on page refresh (sessionStorage)

## Test Harness - Lookup Examples
- [ ] **Example 1 (Basic):** Static options work, expandable details show
- [ ] **Example 2 (Header/Footer):** Static options work with header/footer
- [ ] **Example 3 (Dynamic Search):** 
  - [ ] Loads top 5 results on mount (native API)
  - [ ] Search functionality works (native API)
  - [ ] Shows correct badge when connected
  - [ ] Falls back to mock data when disconnected
- [ ] **Example 4 (Live Accounts):** Xrm.WebApi search works when connected
- [ ] **Example 5 (Live Contacts):** Xrm.WebApi search works when connected

## QueryBuilder - Field Loading
- [ ] Fields load from Dynamics 365 when connected
- [ ] Field list is sorted alphabetically
- [ ] Field count is reasonable (300+ fields)
- [ ] Lookup fields have targets metadata populated

## QueryBuilder - Lookup Fields
- [ ] Select a lookup field (e.g., "Created By", "Owner", "Primary Contact")
- [ ] Value input renders as Lookup component (not text input)
- [ ] Lookup shows loading state initially
- [ ] Lookup displays top 5 results on focus/open
- [ ] Search functionality works (filters results)
- [ ] Selecting a value updates the condition
- [ ] Selected value displays correctly
- [ ] FetchXML preview shows correct GUID value
- [ ] OData preview shows correct filter format

## QueryBuilder - Multiple Lookup Types
Test different lookup field types:
- [ ] **systemuser** (Created By, Modified By, Owner)
- [ ] **contact** (Primary Contact, Accounts Payable Contact)
- [ ] **account** (Parent Account)
- [ ] **Multi-target lookups** (if any exist)

## QueryBuilder - Other Field Types
Verify other field types still work:
- [ ] **Text fields** - Input renders correctly
- [ ] **Number fields** - Number input works
- [ ] **Date fields** - DatePicker works
- [ ] **Boolean fields** - Dropdown with Yes/No options
- [ ] **OptionSet fields** - Dropdown with choices

## QueryBuilder - Operators
- [ ] Lookup fields show correct operators (Equals, Not Equals, null, not-null)
- [ ] "null" and "not-null" operators disable value input
- [ ] Changing operators updates the UI correctly

## QueryBuilder - FetchXML/OData Preview
- [ ] FetchXML preview updates in real-time
- [ ] FetchXML syntax is correct for lookup conditions
- [ ] OData preview updates in real-time
- [ ] OData syntax is correct for lookup filters
- [ ] Copy buttons work for both previews

## QueryBuilder - Import/Export
- [ ] Download FetchXML works
- [ ] Import FetchXML works
- [ ] Imported lookup fields render with Lookup component
- [ ] Imported lookup values display correctly

## Error Handling
- [ ] Network errors show appropriate messages
- [ ] Invalid field selections are handled gracefully
- [ ] Empty search results show "No results found"
- [ ] Proxy errors (401, 404, 500) are caught and logged

## Browser Console
- [ ] No errors in console during normal operation
- [ ] No warnings about missing dependencies
- [ ] API requests show correct URLs in Network tab
- [ ] Proxy requests return 200 status codes

## Performance
- [ ] Initial field load completes in reasonable time (< 5 seconds)
- [ ] Lookup searches are responsive (< 1 second)
- [ ] No memory leaks during extended use
- [ ] Multiple lookups can be opened simultaneously

## Cleanup
- [ ] Remove any debug console.log statements
- [ ] Update version number if needed
- [ ] Update README if API changed
- [ ] Update CHANGELOG with new features

## Browser Compatibility
Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

---

## Critical Issues (Must Fix Before Push)
- Network errors that break functionality
- TypeScript compilation errors
- QueryBuilder not loading fields
- Lookup fields not rendering Lookup component
- API proxy not working

## Nice to Have (Can address later)
- Performance optimizations
- Additional field type support
- Better error messages
- Loading state improvements
