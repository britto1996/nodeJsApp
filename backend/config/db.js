const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log(`DB CONNECTED ${conn.connection.host}`);
  } catch (error) {
    console.log(`error ${error}`);
  }
};

module.exports = connectDB;
