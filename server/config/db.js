const mongoose = require("mongoose");

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = "mongodb://127.0.0.1:27017/uftb_moodle";

  try {
    if (primaryUri) {
      try {
        const conn = await mongoose.connect(primaryUri, {
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`✅ MongoDB Primary Connected: ${conn.connection.host}`);
        return;
      } catch (primaryErr) {
        console.warn(`⚠️ Primary MongoDB Connection Failed (${primaryErr.message}). Switching to Local MongoDB...`);
      }
    }

    const conn = await mongoose.connect(fallbackUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Local Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log("🔄 Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on("error", (err) => {
  console.error(`⚠️ MongoDB Runtime Connection Error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB Disconnected. Attempting auto-reconnect...");
});

module.exports = connectDB;
