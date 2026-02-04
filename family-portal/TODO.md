
- [ ] Update adminController.js viewMember function to add husband_gender and wife_gender to the member object
- [ ] Update views/admin/view.ejs to display gender for husband and wife in their respective cards

- [x] Added `compressImageToSize` function to compress images to <= 250KB by reducing quality iteratively, supporting JPEG, PNG, WebP, GIF, and TIFF formats
- [x] Modified `processUpload` function to check file size after resizing
- [x] Implemented compression logic: if file size > 250KB after resizing, compress to <= 250KB
- [x] Expanded allowed image formats to include JPEG, PNG, WebP, GIF, and TIFF
- [x] Images <= 250KB are saved as is, images > 250KB are compressed before saving to DB

The upload middleware now:
1. Accepts JPEG, PNG, WebP, GIF, and TIFF image formats
2. Resizes images to 500x500 pixels (converted to JPEG)
3. Checks the file size after resizing
4. If size <= 250KB, saves as is
5. If size > 250KB, compresses by reducing quality (format-specific) until <= 250KB
6. Saves the processed image to the database

All images are now ensured to be <= 250KB before being stored, regardless of original format.
d

