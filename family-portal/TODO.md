t# TODO: Fix Photo Loading 404 Errors in Admin View

## Tasks
- [ ] Update view.ejs to use correct path for children photos (/uploads/children/ instead of /uploads/parents/)
- [ ] Add nophoto.png fallback image to public/images/ directory

## Reverted Changes
- [x] Removed onerror attributes from image tags in view.ejs
- [x] Confirmed nophoto.png was not added, no removal needed
