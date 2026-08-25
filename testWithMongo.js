const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');

async function main() {
    console.log('Starting in-memory MongoDB...');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log(`In-memory MongoDB started at: ${uri}`);

    console.log('\nStarting SecureID server...');
    const serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, MONGO_URI: uri, PORT: 3002 },
        stdio: 'pipe'
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
        const out = data.toString();
        // console.log(`[SERVER] ${out.trim()}`);
        if (out.includes('Connected to MongoDB')) {
            if (!serverReady) {
                serverReady = true;
                runTests();
            }
        }
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER ERROR] ${data}`);
    });

    function runTests() {
        console.log('\nRunning API Test Suite...');
        const testProcess = spawn('node', ['runTests.js'], {
            env: { ...process.env },
            stdio: 'inherit'
        });

        testProcess.on('close', async (code) => {
            console.log(`\nTests finished with exit code ${code}`);
            console.log('Shutting down server and database...');
            serverProcess.kill();
            await mongod.stop();
            process.exit(code);
        });
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
