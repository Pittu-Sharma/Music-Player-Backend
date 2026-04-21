const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

console.log('Testing connection to:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB');
    process.exit(0);
  })
  .catch((error) => {
    console.error('FAILURE: Error connecting to MongoDB:', error.message);
    process.exit(1);
  });
