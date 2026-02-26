# Clinical Access Fixes - Summary

## Issues Fixed

### 1. Student/Midwife/Nurse going directly to dashboard instead of AwaitingAssignment
**Problem:** Staff users without unit memberships were seeing the dashboard directly.

**Fix:** 
- Added `hasUnitMembership` state check in `app/(app)/(tabs)/index.tsx`
- Checks `unit_memberships` table for approved memberships
- Shows AwaitingAssignment screen when `hasUnitMembership === false`

### 2. `isCreator is not defined` error in emotive-checklist
**Problem:** Line 140 was calling `useClinical().user` instead of using the destructured `user` from context.

**Fix:** 
- Added `user` to the destructured values from `useClinical()` on line 107
- Changed line 140 to use the local `user` variable: `const isCreator = activeProfile?.created_by === user?.id;`

### 3. Normal users can't record vitals
**Problem:** RLS policies didn't properly allow normal users ('user' role) to insert vitals.

**Fix:**
- Updated `vital_signs` INSERT policy to include 'user' role
- Added check for `created_by = auth.uid()` as fallback for viewing own profiles

### 4. "Viewing Case (Creator Only Actions)" showing for creator
**Problem:** The `isCreator` check might fail if `created_by` doesn't match `user.id`.

**Note:** This should now work correctly after fixing the emotive-checklist component. If it still shows incorrectly, check:
- That the profile's `created_by` field matches the user's UUID
- The user is properly authenticated

### 5. Migration error (emergency_contacts already exists)
**Problem:** Trying to run migration with `--include-all` on tables that already exist.

**Fix:**
- Run the NEW migration file directly without `--include-all`:
  ```bash
  npx supabase migrations up
  ```
- OR manually run the SQL in Supabase SQL Editor

## Files Modified

1. **app/(app)/(tabs)/index.tsx**
   - Added `hasUnitMembership` state
   - Added useEffect to check unit_memberships table
   - Updated `needsAssignment` logic

2. **components/clinical/emotive-checklist.tsx**
   - Added `user` to destructured context values
   - Fixed `isCreator` calculation

3. **context/unit.tsx**
   - Reverted to checking unit_memberships for staff
   - Staff without memberships see empty unit list (AwaitingAssignment screen)

4. **context/clinical.tsx** (from previous changes)
   - Allows creating profiles without `unit_id`
   - Fetches user's own created profiles when no unit assigned

5. **supabase/migrations/20260224000000_allow_unassigned_staff_clinical_access.sql**
   - Updated RLS policies for all clinical tables
   - Added 'user' role to allowed roles
   - Added `created_by = auth.uid()` fallback for SELECT policies

## How to Apply

### Step 1: Run the Migration
```bash
# Make sure you're connected to your Supabase instance
npx supabase db push
# OR manually run the SQL file in Supabase SQL Editor
```

### Step 2: Test the Flow

**For Staff (midwife/nurse/student):**
1. Register/login as staff without unit membership
2. Should see **AwaitingAssignment** screen
3. Click **"Open Clinical Mode"** button
4. Create a patient case
5. Verify case appears in Clinical tab
6. Verify you can:
   - Record vitals
   - Use E-MOTIVE bundle checklist
   - View case timeline

**For Normal Users:**
1. Register/login as 'user' role
2. Should see **UserDashboard** with "Start Clinical Mode" card
3. Click **"New Case"**
4. Create a patient case
5. Verify you can record vitals and use E-MOTIVE bundle

### Step 3: Verify Creator Actions
When viewing a case you created:
- Should NOT see "Viewing Case (Creator Only Actions)" badge
- Should be able to:
  - Change case status
  - Set delivery time
  - Record vitals
  - Complete E-MOTIVE checklist steps
  - Close the case

When viewing a case you DIDN'T create:
- SHOULD see "Viewing Case (Creator Only Actions)" badge
- Can view but not modify

## Database Schema Notes

The `maternal_profiles.unit_id` column is nullable (has `ON DELETE SET NULL`), which allows:
- Creating cases without unit assignment
- Cases remain accessible to creator even if unit is deleted
- Supervisor can filter by "No Unit" to see unassigned cases

## RLS Policy Summary

All clinical tables now allow access when:
1. User's facility matches profile's facility, OR
2. User is admin, OR
3. **User created the profile** (`created_by = auth.uid()`) ← This is the key fix!

This ensures unassigned staff and normal users can always access their own created cases.
