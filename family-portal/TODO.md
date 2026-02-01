# TODO: Fix Child Details Display in Excel Export

## Issue

Child details were not displaying in the Excel sheet export.

## Root Cause

The exportController was using incorrect field names for child data. The children are stored in the `family_members` table with `member_type = 'child'`, and the fields are `name`, `dob`, `gender`, etc., not `child_name`, `date_of_birth`.

## Changes Made

- [x] Updated exportController.js to use Admin.getChildrenByParentId (queries family_members table)
- [x] Changed field names in the child row addition:
  - `child.child_name` → `child.name`
  - `child.date_of_birth` → `child.dob`
  - Kept other fields as is (occupation, gender, photo)

## Testing

- Export to Excel should now include child rows with correct details.
- Verify that the Excel sheet shows children under each family with proper name, DOB, gender, etc.

## Next Steps

- Test the export functionality to confirm children are now displayed.
- If issues persist, check if children exist in the database or if there are other errors.
