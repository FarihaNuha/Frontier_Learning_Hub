const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
  const targetEmail = process.argv[2];

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB database successfully.\n");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));

    if (!targetEmail) {
      console.log("=== REGISTERED USERS ===");
      const users = await User.find({}, "name email role department");
      if (users.length === 0) {
        console.log("No users found in database.");
      } else {
        users.forEach((u, i) => {
          console.log(`[${i + 1}] Name: ${u.get("name")} | Email: ${u.get("email")} | Role: ${u.get("role")} | Dept: ${u.get("department") || "N/A"}`);
        });
        console.log("\n--------------------------------------------------");
        console.log("To delete a user, run: node delete_user.js <email>");
        console.log("Example: node delete_user.js farihanuha356@gmail.com");
      }
    } else {
      console.log(`Searching for user with email: "${targetEmail}"...`);
      const userToDelete = await User.findOne({ email: targetEmail.trim() });

      if (!userToDelete) {
        console.log(`Error: User with email "${targetEmail}" not found.`);
      } else {
        const name = userToDelete.get("name");
        const email = userToDelete.get("email");
        
        await User.deleteOne({ _id: userToDelete._id });
        console.log(`Success: User "${name}" (${email}) deleted successfully!`);
      }
    }
  } catch (error) {
    console.error("Error running script:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
