(async()=>{
  try{
    const pool = require('./src/config/db');
    await pool.query("ALTER TABLE contracts ALTER COLUMN monthly_rent SET DEFAULT 0");
    console.log('Set default on monthly_rent');
    await pool.end();
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();