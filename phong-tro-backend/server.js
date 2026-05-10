const path = require('path');
const app = require('./src/app');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('./src/config/db');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server dang chay tai http://localhost:${PORT}`);
});
