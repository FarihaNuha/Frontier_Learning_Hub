const mongoose = require("./node_modules/mongoose");

async function checkDatabases() {
  const conn = await mongoose.createConnection("mongodb://127.0.0.1:27017").asPromise();
  const admin = conn.db.admin();
  const dbs = await admin.listDatabases();
  console.log("Databases on 127.0.0.1:27017:", dbs.databases);

  for (const dbInfo of dbs.databases) {
    if (["admin", "config", "local"].includes(dbInfo.name)) continue;
    const db = conn.useDb(dbInfo.name);
    const cols = await db.db.listCollections().toArray();
    console.log(`DB: ${dbInfo.name}, collections:`, cols.map(c => c.name));
    if (cols.some(c => c.name === "results" || c.name === "cgparecords")) {
      const results = await db.collection("results").find({ studentId: "2202030" }).toArray();
      console.log(`Results in DB ${dbInfo.name} for 2202030 (${results.length}):`, results);
      const allResults = await db.collection("results").find({}).toArray();
      console.log(`Total results in DB ${dbInfo.name}: ${allResults.length}`);
      const allCgpa = await db.collection("cgparecords").find({}).toArray();
      console.log(`Total CGPARecords in DB ${dbInfo.name}: ${allCgpa.length}`);
      if (allCgpa.length > 0) {
        console.log("Sample CGPA Record:", allCgpa[0]);
      }
    }
  }

  await conn.close();
}

checkDatabases().catch(console.error);
