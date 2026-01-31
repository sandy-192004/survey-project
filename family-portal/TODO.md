# Fix Family Form and Backend Issues

## Issues Identified
- Form photo fields use wrong names: `parent[husband_photo]` instead of `members[0][photo]`
- Backend saveFamily uses Person model and persons table instead of direct families/family_members
- myFamily function crashes because Person.getByUserId returns array but code treats it as object
- familyLogic has similar issues

## Tasks
- [ ] Fix photo field names in family-form.ejs
- [ ] Rewrite saveFamily controller to use direct DB queries as per instructions
- [ ] Fix myFamily function to use direct queries
- [ ] Update familyLogic to work with new structure
- [ ] Test the complete flow

## Progress
- [x] Analyzed code and identified issues
- [x] Created plan
