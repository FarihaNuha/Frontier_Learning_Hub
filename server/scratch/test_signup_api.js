const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const axios = require("axios");

async function testSignup() {
  try {
    console.log("Testing POST to http://localhost:5000/api/auth/register with prachurjo@gmail.com and DSE...");
    const response = await axios.post("http://localhost:5000/api/auth/register", {
      name: "Prachurjo",
      email: "prachurjo@gmail.com",
      password: "password123",
      role: "student",
      department: "DSE",
      studentId: "2404003"
    });
    console.log("✅ Registration SUCCESS!", response.data);
  } catch (err) {
    console.error("❌ Registration ERROR:", err.response?.data || err.message);
  }
}

testSignup();
