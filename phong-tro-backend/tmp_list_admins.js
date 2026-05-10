(async()=>{
  try{
    const pool = require('./src/config/db');
    const r = await pool.query("SELECT user_id, email, full_name, role FROM users WHERE role='ADMIN'");
    console.log(JSON.stringify(r.rows, null, 2));
    await pool.end();
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();