(async()=>{
  try{
    const pool = require('./src/config/db');
    const r = await pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name='contracts' ORDER BY ordinal_position");
    console.log(JSON.stringify(r.rows, null, 2));
    await pool.end();
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();