const http = require('http');

async function request(path, method, body) {
    return new Promise((resolve) => {
        const req = http.request(`http://localhost:3002${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log("1. Test registration locally");
    const regRes = await request('/api/register', 'POST', {
        fullName: 'API Tester', email: `tester${Date.now()}@example.com`, mobile: '1234567890', password: 'Pass1!'
    });
    console.log("Registration Response:", regRes.body);
    if (regRes.body.otp || regRes.body.testOtp) throw new Error("Normal API returned OTP!");
    
    const emailChallengeId = regRes.body.challengeId;

    console.log("\n2. Test email OTP retrieval via evaluator endpoint");
    const testEmailRes = await request(`/api/test/otp/${emailChallengeId}`, 'GET');
    console.log("Evaluator API Response:", testEmailRes.body);
    const emailOtp = testEmailRes.body.otp;

    console.log("\n3. Verify Email OTP (Generating SMS OTP)");
    const verifyEmailRes = await request('/api/otp/verify', 'POST', { challengeId: emailChallengeId, otp: emailOtp });
    console.log("Verify Email Response:", verifyEmailRes.body);
    const smsChallengeId = verifyEmailRes.body.challengeId;

    console.log("\n4. Test SMS OTP retrieval via evaluator endpoint");
    const testSmsRes = await request(`/api/test/otp/${smsChallengeId}`, 'GET');
    console.log("Evaluator API Response:", testSmsRes.body);
    
    console.log("\n5. Test wrong OTP");
    const wrongSmsRes = await request('/api/otp/verify', 'POST', { challengeId: smsChallengeId, otp: '000000' });
    console.log("Wrong OTP Response:", wrongSmsRes.body);
    
    console.log("\n6. Test maximum attempts (2 more wrong tries)");
    await request('/api/otp/verify', 'POST', { challengeId: smsChallengeId, otp: '000000' });
    const maxAttemptsRes = await request('/api/otp/verify', 'POST', { challengeId: smsChallengeId, otp: '000000' });
    console.log("Max Attempts Response:", maxAttemptsRes.body);

    console.log("\n7. Confirm challenge deleted after max attempts");
    const testDeletedRes = await request(`/api/test/otp/${smsChallengeId}`, 'GET');
    console.log("Evaluator API Response (should be 404):", testDeletedRes.body);
}

runTests().catch(console.error);
