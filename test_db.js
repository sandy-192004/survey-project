const db = require('./config/db');
async function test() {
    const [rows] = await db.query('SHOW TABLES');
    console.log(rows);
    const [cols] = await db.query('SHOW COLUMNS FROM family_members');
    console.log(cols.map(c => c.Field));
    process.exit(0);
}
test();
