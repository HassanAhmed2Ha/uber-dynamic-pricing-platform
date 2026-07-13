const axios = require('axios');

async function runTest() {
    console.log("🚀 Starting E2E Integration Test...");
    console.log("Calling local Node.js backend to fetch dynamic pricing (which internally calls Vercel AI Engine)...\n");

    try {
        const response = await axios.get('http://localhost:4000/rides/get-fare', {
            params: {
                pickup: 'Times Square, NY',
                destination: 'Central Park, NY'
            }
        });

        if (response.status === 200) {
            console.log("✅ Success! Status: 200 OK");
            console.log("AI Engine Computed Fare Data:");
            console.log(JSON.stringify(response.data, null, 2));
        } else {
            console.log(`⚠️ Unexpected Status: ${response.status}`);
        }
    } catch (error) {
        console.error("❌ Test Failed!");
        if (error.response) {
            console.error("Response Error Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

runTest();
