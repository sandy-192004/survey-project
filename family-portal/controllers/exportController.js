const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Admin = require('../models/admin');

exports.exportToExcel = async (req, res) => {
  try {
    // Get all families
    const data = await new Promise((resolve, reject) => {
      Admin.getAll(1, 10000, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Family Data');

    // Add headers
    worksheet.columns = [
      { header: 'Family ID', key: 'family_id', width: 10 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Wife Name', key: 'wife_name', width: 20 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Occupation', key: 'occupation', width: 20 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Photo', key: 'photo', width: 30 },
      { header: 'Door No', key: 'door_no', width: 10 },
      { header: 'Street', key: 'street', width: 20 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 10 }
    ];

    // Process each family
    for (const member of data.results) {
      // Add husband/parent row
      worksheet.addRow({
        family_id: member.id,
        type: 'Husband',
        name: member.name,
        wife_name: '',
        mobile: member.mobile,
        occupation: member.occupation,
        dob: '',
        gender: 'Male',
        photo: member.husband_photo ? `http://localhost:3000/uploads/${member.husband_photo}` : '',
        door_no: member.door_no,
        street: member.street,
        district: member.district,
        state: member.state,
        pincode: member.pincode
      });

      // Add wife row if exists
      if (member.wife_name) {
        worksheet.addRow({
          family_id: member.id,
          type: 'Wife',
          name: member.wife_name,
          wife_name: '',
          mobile: '',
          occupation: '',
          dob: '',
          gender: 'Female',
          photo: member.wife_photo ? `http://localhost:3000/uploads/${member.wife_photo}` : '',
          door_no: member.door_no,
          street: member.street,
          district: member.district,
          state: member.state,
          pincode: member.pincode
        });
      }

      // Get and add children
      const children = await new Promise((resolve, reject) => {
        Admin.getChildrenByParentId(member.id, (err, children) => {
          if (err) reject(err);
          else resolve(children || []);
        });
      });

      for (const child of children) {
        worksheet.addRow({
          family_id: member.id,
          type: 'Child',
          name: child.child_name,
          wife_name: '',
          mobile: '',
          occupation: child.occupation || '',
          dob: child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : '',
          gender: child.gender || '',
          photo: child.photo ? `http://localhost:3000/uploads/children/${child.photo}` : '',
          door_no: member.door_no,
          street: member.street,
          district: member.district,
          state: member.state,
          pincode: member.pincode
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).send('Error exporting data');
  }
};

exports.exportToPdf = (req, res) => {
  // Get all data by setting a very large limit
  Admin.getAll(1, 10000, (err, data) => {
    if (err) {
      console.error('Error fetching data for export:', err);
      return res.status(500).send('Error exporting data');
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Family Data Export', { align: 'center' });
    doc.moveDown();

    data.results.forEach((member, index) => {
      doc.fontSize(12).text(`Family ${index + 1}:`);
      doc.text(`Name: ${member.name}`);
      doc.text(`Wife Name: ${member.wife_name || 'N/A'}`);
      doc.text(`Mobile: ${member.mobile}`);
      doc.text(`Occupation: ${member.occupation}`);
      doc.text(`District: ${member.district}`);
      doc.text(`State: ${member.state}`);
      doc.text(`Children Count: ${member.children_count || 0}`);
      doc.moveDown();
    });

    doc.end();
  });
};
