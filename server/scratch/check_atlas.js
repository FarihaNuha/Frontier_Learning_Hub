const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");

const atlasUri = "mongodb+srv://farihanuha356_db_user:nuha2202022@cluster01.uchfnx6.mongodb.net/uftb_moodle?retryWrites=true&w=majority";

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
