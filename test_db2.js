const db = require('./config/db');
async function test() {
    for (let table of ['families', 'family_members', 'persons', 'users']) {
        const [c] = await db.query(`SHOW COLUMNS FROM ${table}`);
        console.log(table, c.map(r => r.Field));
    }
    process.exit(0);
}
test();
