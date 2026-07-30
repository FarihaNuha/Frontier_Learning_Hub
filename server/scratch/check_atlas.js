const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");

const atlasUri = process.env.MONGODB_URI;

async function checkAtlas() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(atlasUri);
    console.log("Connected to Atlas!");

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("\n=== ATLAS COLLECTIONS ===");
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Atlas Connection Error:", err.message);
  }
}

checkAtlas();
