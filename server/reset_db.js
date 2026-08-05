const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();

async function resetDatabase() {
  console.log("Starting database reset...");
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");

    const db = mongoose.connection.db;

    // Fetch all collections in the database dynamically
    const collections = await db.listCollections().toArray();

    for (const col of collections) {
      const colName = col.name;

      // Skip system collections
      if (colName.startsWith("system.")) {
        continue;
      }

      const collection = db.collection(colName);

      if (colName === "users") {
        // Keep ONLY admin user accounts in the users collection
        const adminCount = await collection.countDocuments({ role: "admin" });
        const nonAdminDeleteResult = await collection.deleteMany({ role: { $ne: "admin" } });
        console.log(`🧹 Cleared ${nonAdminDeleteResult.deletedCount} non-admin user accounts from "${colName}" (Preserved ${adminCount} admin accounts).`);
      } else {
        // Clear all documents in other collections (preserving collections and indexes)
        const count = await collection.countDocuments();
        if (count > 0) {
          await collection.deleteMany({});
          console.log(`🧹 Cleared ${count} documents from collection: "${colName}" (Collection & Indexes preserved).`);
        } else {
          console.log(`ℹ️ Collection "${colName}" is already empty (Collection & Indexes preserved).`);
        }
      }
    }

    console.log("\n✅ Database reset completed successfully!");
    console.log("You can now log in using your admin credentials and import clean CSV/Excel files.");

  } catch (error) {
    console.error("❌ Error resetting database:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetDatabase();
