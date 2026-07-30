const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");

const uri = "mongodb+srv://farihanuha356_db_user:nuha2202022@cluster01.uchfnx6.mongodb.net/test?retryWrites=true&w=majority";

async function findDatabases() {
  try {
    await mongoose.connect(uri);
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log("\n=== DATABASES IN ATLAS CLUSTER ===");
    for (const dbInfo of dbs.databases) {
      console.log(`Database: ${dbInfo.name} (${dbInfo.sizeOnDisk} bytes)`);
      const db = mongoose.connection.client.db(dbInfo.name);
      const cols = await db.listCollections().toArray();
      for (const col of cols) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - Collection: ${col.name} (${count} docs)`);
      }
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

findDatabases();
